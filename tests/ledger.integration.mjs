import assert from 'node:assert/strict';
import {balances,pending,today,prepare,inventory} from '../lib/domain.ts';
const base=process.env.ABASTO_TEST_URL || 'http://localhost:5174/api/abasto';
// Inicia sesión como administrador (ADMIN_EMAIL / ADMIN_PASSWORD del .env) para obtener la cookie real.
const login=await fetch(new URL('/api/auth',base),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:process.env.ADMIN_EMAIL||'rafadonte@gmail.com',password:process.env.ADMIN_PASSWORD})});
if(login.status!==200)throw new Error('No se pudo iniciar sesión: define ADMIN_PASSWORD al ejecutar la prueba.');
const cookie=login.headers.get('set-cookie').split(';')[0];
async function get(){const r=await fetch(base,{headers:{cookie}});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;}
async function post(body,expected=200){const r=await fetch(base,{method:'POST',headers:{cookie,'content-type':'application/json',origin:new URL(base).origin},body:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));return data;}
const draft=(type,quantity,price=1,extra={})=>({action:'register',id:crypto.randomUUID(),type,date:today(),destination:'Almacén',reference:'',supplier:'Proveedor de prueba local',notes:'Prueba local: no se publica',lines:[{code:'P001',quantity,price}],...extra});
let s=await get();assert.equal(s.operations.length,0,'Esta prueba debe ejecutarse sólo sobre una base local vacía.');
assert.equal((await fetch(base)).status,401);
await post({action:'initialize',id:crypto.randomUUID()});s=await get();assert.equal(s.products.length,310);
await post(draft('Traspaso',1,1,{destination:'María Victoria'}),400);
await post(draft('Apertura',100,2));await post(draft('Apertura',0,2),400);
const order=await post(draft('Pedido de compra',100,4));
const receipt=await post(draft('Recepción',40,4,{reference:order.folio,supplier:'No debe usarse'}));
s=await get();assert.equal(s.operations.find(o=>o.folio===receipt.folio).supplier,'Proveedor de prueba local');assert.equal(pending(s,order.folio,'P001'),60);assert.deepEqual(balances(s).P001,{quantity:140,value:360});
const deliver=draft('Traspaso',70,999,{destination:'María Victoria'});const saved=await post(deliver);const repeated=await post(deliver);assert.equal(saved.folio,repeated.folio);
s=await get();assert.deepEqual(balances(s).P001,{quantity:70,value:180});assert.equal(s.lines.filter(l=>l.seq===s.operations.find(o=>o.folio===saved.folio).seq).length,1);
await post(draft('Traspaso',71,0,{destination:'Chan Chan'}),400);
await post(draft('Devolución cocina',10,99,{reference:saved.folio,destination:'María Victoria'}));
await post(draft('Devolución cocina',61,99,{reference:saved.folio,destination:'María Victoria'}),400);
await post(draft('Recepción',20,6,{reference:order.folio}));
await post(draft('Cancelar compra',40,0,{reference:order.folio}));
s=await get();assert.equal(pending(s,order.folio,'P001'),0);assert.equal(balances(s).P001.quantity,100);assert.ok(Math.abs(balances(s).P001.value-325.71429)<.0001);
const historical=JSON.stringify(s.lines);const p=s.products.find(p=>p.code==='P001');await post({action:'product',id:crypto.randomUUID(),product:{...p,price:9}});s=await get();assert.equal(JSON.stringify(s.lines),historical);
assert.throws(()=>prepare(s,draft('Traspaso',1,1,{destination:'María Victoria'}),'cocina_mv'),/acceso/);
assert.throws(()=>prepare(s,draft('Solicitud cocina',1,0,{destination:'Chan Chan'}),'cocina_mv'),/tu cocina/);
assert.throws(()=>prepare(s,draft('Recepción',1,1,{reference:order.folio}),'compras'),/acceso/);
const req=await post(draft('Solicitud cocina',10,0,{destination:'Chan Chan'}));await post(draft('Traspaso',4,0,{destination:'Chan Chan',reference:req.folio}));s=await get();assert.equal(pending(s,req.folio,'P001'),6);
const before=balances(s).P001.quantity;const competing=await Promise.all([draft('Traspaso',60,0,{destination:'Chan Chan'}),draft('Traspaso',60,0,{destination:'María Victoria'})].map(body=>fetch(base,{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify(body)})));
assert.equal(competing.filter(r=>r.status===200).length,1);s=await get();assert.equal(balances(s).P001.quantity,before-60);assert.ok(balances(s).P001.quantity>=0);
const row=inventory(s,today(),today()).find(p=>p.code==='P001');assert.equal(round6(row.initial+row.entries-row.exits),row.final);
function round6(n){return Math.round(n*1e6)/1e6}
console.log('PASS: catálogo 310, autenticación, apertura única, proveedor heredado, recepción parcial, precios históricos, devolución, cancelación, solicitud parcial, permisos, idempotencia y salidas concurrentes sin saldo negativo.');
