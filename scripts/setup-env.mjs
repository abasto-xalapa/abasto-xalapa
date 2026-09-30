// Prepara el archivo .env la primera vez: correo del administrador, contraseña y llave de sesión.
// No sobrescribe nada que ya exista. Se ejecuta solo antes de "npm run dev".
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {networkInterfaces} from 'node:os';

const quiet=process.argv.includes('--quiet');
const file='.env';
const ADMIN='rafadonte@gmail.com';
let text=existsSync(file)?readFileSync(file,'utf8'):readFileSync('.env.example','utf8');
const has=k=>new RegExp('^'+k+'=.+$','m').test(text);
const set=(k,v)=>{text=new RegExp('^'+k+'=.*$','m').test(text)?text.replace(new RegExp('^'+k+'=.*$','m'),k+'='+v):text.replace(/\s*$/,'\n')+k+'='+v+'\n'};
let created=false,password='';
if(!has('ADMIN_EMAIL'))set('ADMIN_EMAIL',ADMIN);
if(!has('SESSION_SECRET'))set('SESSION_SECRET',randomBytes(32).toString('hex'));
if(!has('ADMIN_PASSWORD')){password=randomBytes(6).toString('base64url');set('ADMIN_PASSWORD',password);created=true}
writeFileSync(file,text);
if(quiet)process.exit(0);
const email=(text.match(/^ADMIN_EMAIL=(.+)$/m)||[])[1]||ADMIN;
const ips=Object.values(networkInterfaces()).flat().filter(n=>n&&n.family==='IPv4'&&!n.internal).map(n=>n.address);
console.log('\n══════════════════════════════════════════════');
console.log('  ABASTO XALAPA · sistema de restaurantes');
console.log('══════════════════════════════════════════════');
console.log('  En esta computadora:  http://localhost:3000');
for(const ip of ips)console.log('  En tu celular (misma WiFi):  http://'+ip+':3000');
console.log('  Correo:      '+email);
console.log(created?'  Contraseña:  '+password+'   (guárdala; también está en el archivo .env)':'  Contraseña:  la que está en ADMIN_PASSWORD del archivo .env');
console.log('══════════════════════════════════════════════\n');
