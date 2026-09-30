import {NextResponse} from 'next/server';
import {z} from 'zod';
import {database} from '@/lib/db';
import {verifyPassword,safeEqual,signSession,SESSION_COOKIE,SESSION_SECONDS} from '@/lib/auth-core';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const attempts=new Map<string,{n:number;until:number}>();
const body=z.object({email:z.string().email().max(200),password:z.string().min(1).max(200)});
function secure(req:Request){return process.env.COOKIE_SECURE==='true'||req.headers.get('x-forwarded-proto')==='https';}
function sameOrigin(req:Request){const o=req.headers.get('origin');if(!o)return true;try{return new URL(o).host===(req.headers.get('x-forwarded-host')||req.headers.get('host'));}catch{return false;}}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Solicitud no permitida.'},403);
 let email='',password='';
 try{({email,password}=body.parse(await req.json()));}catch{return json({error:'Escribe tu correo y tu contraseña.'},400);}
 email=email.trim().toLowerCase();
 const key=email+'|'+(req.headers.get('x-forwarded-for')||'local');const a=attempts.get(key);
 if(a&&a.n>=6&&a.until>Date.now())return json({error:'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'},429);
 const admin=(process.env.ADMIN_EMAIL||'').trim().toLowerCase(),adminPassword=process.env.ADMIN_PASSWORD||'';
 let name='';
 if(admin&&email===admin&&adminPassword&&safeEqual(password,adminPassword))name=process.env.ADMIN_NAME||'Administración';
 else{const m=database().raw.prepare('SELECT name,role,password_hash FROM members WHERE email=?').get(email) as {name:string;role:string;password_hash:string|null}|undefined;
  if(m&&m.role!=='disabled'&&verifyPassword(password,m.password_hash))name=m.name;
  else if(!m)verifyPassword(password,'scrypt$00$00');}
 if(!name){attempts.set(key,{n:(a&&a.until>Date.now()?a.n:0)+1,until:Date.now()+15*60*1000});return json({error:'Correo o contraseña incorrectos.'},401);}
 attempts.delete(key);
 const res=json({ok:true});
 res.cookies.set(SESSION_COOKIE,signSession(email,name),{httpOnly:true,sameSite:'lax',secure:secure(req),path:'/',maxAge:SESSION_SECONDS});
 return res;
}
export async function DELETE(req:Request){
 if(!sameOrigin(req))return json({error:'Solicitud no permitida.'},403);
 const res=json({ok:true});res.cookies.set(SESSION_COOKIE,'',{httpOnly:true,sameSite:'lax',secure:secure(req),path:'/',maxAge:0});return res;
}
