"use client";
import {useState} from 'react';
import {UtensilsCrossed} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
export default function LoginForm(){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');
  try{const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});const v=await r.json() as {error?:string};
   if(!r.ok)throw Error(v.error||'No se pudo entrar.');window.location.href='/';}
  catch(err){setError(err instanceof Error?err.message:'No se pudo entrar.');setBusy(false);}};
 return <main className="login-page"><div className="login-hero"><div className="login-mark"><UtensilsCrossed size={34}/></div><p className="eyebrow">CORPORATIVO LOIS</p><h1>Abasto Xalapa</h1><p>Costos, inventario, compras y abasto a cocinas, en un solo lugar.</p></div>
 <form className="login-card" onSubmit={submit}><h2>Iniciar sesión</h2>
  <label className="field"><span>Correo</span><Input type="email" autoComplete="username" inputMode="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@correo.com"/></label>
  <label className="field"><span>Contraseña</span><Input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
  {error&&<p role="alert" className="login-error">{error}</p>}
  <Button className="login-submit" disabled={busy}>{busy?'Entrando…':'Entrar'}</Button>
  <small>¿No tienes acceso? Pídelo a la administración.</small></form></main>;
}
