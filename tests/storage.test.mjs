// Prueba la base SQLite y la seguridad de sesiones sin levantar el servidor.
import assert from 'node:assert/strict';
import {rmSync} from 'node:fs';
process.env.DATABASE_PATH='.data/test-storage.sqlite';
process.env.SESSION_SECRET='una-llave-de-prueba-suficientemente-larga';
for(const f of ['','-wal','-shm'])rmSync(process.env.DATABASE_PATH+f,{force:true});
const {database}=await import('../lib/db.ts');
const {hashPassword,verifyPassword,signSession,readSession}=await import('../lib/auth-core.ts');
const db=database();
await db.batch([db.prepare('INSERT INTO products (code,data) VALUES (?,?)').bind('P001','{"code":"P001"}'),
 db.prepare('INSERT INTO operations (seq,id,folio,type,date,destination,reference,supplier,notes,actor,actor_id,timestamp) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(1,'a','MOV-1','Apertura','2026-09-30','Almacén','','','','x','u','t'),
 db.prepare('INSERT INTO lines (seq,code,quantity,price,delta,value) VALUES (?,?,?,?,?,?)').bind(1,'P001',5,2,5,10)]);
let r=await db.batch([db.prepare('SELECT quantity,value FROM lines'),db.prepare('SELECT data FROM products')]);
assert.equal(r[0].results[0].value,10);assert.equal(r[1].results.length,1);
await assert.rejects(()=>db.batch([db.prepare('INSERT INTO products (code,data) VALUES (?,?)').bind('P002','{}'),db.prepare('INSERT INTO products (code,data) VALUES (?,?)').bind('P001','{}')]));
r=await db.batch([db.prepare('SELECT code FROM products')]);assert.equal(r[0].results.length,1,'el lote fallido debe revertirse completo');
console.log('PASS: SQLite guarda, consulta y revierte lotes completos.');
const h=hashPassword('secreta123');assert.ok(verifyPassword('secreta123',h));assert.ok(!verifyPassword('otra',h));assert.ok(!verifyPassword('x',null));
const t=signSession('rafadonte@gmail.com','Admin');assert.equal(readSession(t)?.email,'rafadonte@gmail.com');
assert.equal(readSession(t.slice(0,-2)+'xx'),null);assert.equal(readSession('basura'),null);assert.equal(readSession(undefined),null);
console.log('PASS: contraseñas con hash y sesiones firmadas a prueba de alteración.');
for(const f of ['','-wal','-shm'])rmSync(process.env.DATABASE_PATH+f,{force:true});
