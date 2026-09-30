export type Product={code:string;name:string;unit:string;category:string;presentation:number;presentationPrice:number;price:number;yieldRate:number;usableCost:number;supplier:string;minimum:number;maximum:number;leadDays:number;active:boolean;notes:string};
export type Role='admin'|'almacen'|'compras'|'cocina_mv'|'cocina_cc';
export type Op={seq:number;id:string;folio:string;type:string;date:string;destination:string;reference:string;supplier:string;notes:string;actor:string;actorId:string;timestamp:string};
export type Line={seq:number;code:string;quantity:number;price:number;delta:number;value:number};
export type State={products:Product[];operations:Op[];lines:Line[];openings:{code:string;seq:number}[];members:{email:string;userId:string|null;role:Role;name:string;hasPassword?:boolean}[]};
export const kitchen=(role:Role)=>role==='cocina_mv'?'María Victoria':role==='cocina_cc'?'Chan Chan':'';
export const roleLabels:Record<Role,string>={admin:'Administración',almacen:'Almacén',compras:'Compras',cocina_mv:'Cocina · María Victoria',cocina_cc:'Cocina · Chan Chan'};
export const types=['Apertura','Recepción','Traspaso','Devolución cocina','Devolución proveedor','Merma','Pedido de compra','Solicitud cocina','Cancelar compra'] as const;
export const round=(n:number)=>Math.round((n+Number.EPSILON)*1e6)/1e6;
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function balances(s:State,until='9999-12-31'){const dates=new Map(s.operations.map(o=>[o.seq,o.date]));const b:Record<string,{quantity:number;value:number}>={};for(const l of s.lines){if((dates.get(l.seq)??'')>until)continue;const v=b[l.code]??={quantity:0,value:0};v.quantity=round(v.quantity+l.delta);v.value=round(v.value+l.value);}return b;}
export function pending(s:State,folio:string,code:string){const op=s.operations.find(o=>o.folio===folio);if(!op)return 0;const q=s.lines.find(l=>l.seq===op.seq&&l.code===code)?.quantity??0;const children=new Set(s.operations.filter(o=>o.reference===folio&&(['Recepción','Cancelar compra','Traspaso'].includes(o.type))).map(o=>o.seq));return round(q-s.lines.filter(l=>children.has(l.seq)&&l.code===code).reduce((a,l)=>a+l.quantity,0));}
export function inventory(s:State,from:string,until:string){const b=balances(s,until),before=balances(s,from);const ops=new Map(s.operations.map(o=>[o.seq,o]));return s.products.map(p=>{let initial=0,entries=0,exits=0;for(const l of s.lines.filter(l=>l.code===p.code)){const o=ops.get(l.seq)!;if(o.date>until)continue;if(o.date<from||o.type==='Apertura')initial+=l.delta;else if(l.delta>0)entries+=l.delta;else exits-=l.delta;}const orders=s.operations.filter(o=>o.type==='Pedido de compra'&&o.date<=until);let due=0;const ps={...s,operations:s.operations.filter(o=>o.date<=until)};for(const o of orders)due+=pending(ps,o.folio,p.code);const v=b[p.code]??{quantity:0,value:0};const opened=s.openings.some(x=>x.code===p.code&&(ops.get(x.seq)?.date??'')<=until);return {...p,initial:round(initial),entries:round(entries),exits:round(exits),final:v.quantity,value:v.value,pending:round(due),suggested:opened&&p.active&&p.maximum>=p.minimum&&p.minimum>0&&v.quantity+due<p.minimum?round(Math.max(0,p.maximum-v.quantity-due)):0,opened};});}
export type Draft={id:string;type:string;date:string;destination:string;reference:string;supplier:string;notes:string;lines:{code:string;quantity:number;price:number}[]};
export function prepare(s:State,d:Draft,role:Role){
 const fail=(m:string):never=>{throw new Error(m)};
 if(!types.includes(d.type as typeof types[number]))fail('Selecciona una operación válida.');
 const allowed=role==='admin'?types:role==='almacen'?types.filter(t=>t!=='Pedido de compra'):role==='compras'?['Pedido de compra','Cancelar compra']:['Solicitud cocina'];
 if(!allowed.includes(d.type as never))fail('Tu acceso no permite registrar esta operación.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||!Number.isFinite(Date.parse(d.date+'T12:00:00Z'))||new Date(d.date+'T12:00:00Z').toISOString().slice(0,10)!==d.date)fail('Escribe una fecha válida.');
 if(d.date>today())fail('La fecha no puede ser posterior a hoy.');
 const last=s.operations.filter(o=>!['Configuración','Catálogo','Equipo','Solicitud cocina'].includes(o.type)).reduce((a,o)=>o.date>a?o.date:a,'');
 if(d.type!=='Solicitud cocina'&&d.date<last)fail('Ya existen operaciones del '+last+'. Usa esa fecha o una posterior.');
 if(!d.lines.length||d.lines.length>40)fail('Agrega de 1 a 40 productos.');
 if(new Set(d.lines.map(l=>l.code)).size!==d.lines.length)fail('Hay un producto repetido; reúne su cantidad en una sola línea.');
 if(['Traspaso','Solicitud cocina','Devolución cocina'].includes(d.type)){if(!['María Victoria','Chan Chan'].includes(d.destination))fail('Selecciona la cocina de destino.');if(kitchen(role)&&d.destination!==kitchen(role))fail('Sólo puedes solicitar para tu cocina.');}else d.destination='Almacén';
 if(['Merma','Devolución proveedor','Cancelar compra'].includes(d.type)&&!d.notes.trim())fail('Escribe el motivo en Notas.');
 if(d.type==='Pedido de compra'&&!d.supplier.trim())fail('Escribe el proveedor del pedido.');
 const ref=s.operations.find(o=>o.folio===d.reference);
 if(['Recepción','Cancelar compra'].includes(d.type)){if(ref?.type!=='Pedido de compra')fail('Selecciona un pedido de compra COM válido.');d.supplier=ref!.supplier;if(d.date<ref!.date)fail('La fecha debe ser igual o posterior al pedido.');}
 if(d.type==='Devolución cocina'){if(ref?.type!=='Traspaso'||ref.destination!==d.destination)fail('Selecciona el MOV de la entrega a esa cocina.');if(d.date<ref!.date)fail('La devolución debe ser posterior a la entrega.');}
 if(d.type==='Traspaso'&&d.reference&&(ref?.type!=='Solicitud cocina'||ref.destination!==d.destination))fail('La referencia debe ser una solicitud de esa cocina o quedar vacía para una entrega directa.');
 const b=balances(s);const result:Omit<Line,'seq'>[]=[];
 for(const l of d.lines){const p=s.products.find(p=>p.code===l.code);if(!p||!p.active||!p.name?.trim()||!p.unit?.trim())fail('Selecciona un producto activo: '+l.code);if(!Number.isFinite(l.quantity)||l.quantity<0||(d.type!=='Apertura'&&l.quantity===0)||l.quantity>1e9)fail('Revisa la cantidad de '+l.code+'.');if(Math.abs(l.quantity-round(l.quantity))>1e-8)fail('Usa hasta seis decimales en '+l.code+'.');if(p!.unit==='pieza'&&!Number.isInteger(l.quantity))fail(l.code+': las piezas deben ser enteras.');const stock=b[l.code]??{quantity:0,value:0};let price=l.price,delta=0,value=0;
 if(!['Apertura','Pedido de compra','Solicitud cocina','Cancelar compra'].includes(d.type)&&!s.openings.some(x=>x.code===l.code))fail('Registra primero la apertura de '+l.code+' en Almacén, incluso si es cero.');
 if(d.type==='Apertura'&&s.openings.some(x=>x.code===l.code))fail(l.code+' ya tiene apertura. Registra la entrada o salida correspondiente.');
 if(d.type!=='Apertura'&&round(l.quantity)<=0)fail('La cantidad mínima es 0.000001 en '+l.code+'.');
 if(['Recepción','Cancelar compra'].includes(d.type)||(d.type==='Traspaso'&&d.reference)){const remain=pending(s,d.reference,l.code);if(round(l.quantity)>remain)fail(l.code+': sólo quedan '+remain+' pendientes en '+d.reference+'.');}
 if(['Traspaso','Merma','Devolución proveedor'].includes(d.type)){if(round(l.quantity)>stock.quantity)fail(l.code+': sólo hay '+stock.quantity+' '+p!.unit+' en Almacén.');price=stock.quantity>0?stock.value/stock.quantity:0;delta=-l.quantity;value=l.quantity===stock.quantity?-stock.value:-round(l.quantity*price);}
 if(['Apertura','Recepción'].includes(d.type)){if(!Number.isFinite(price)||price<=0||price>1e7)fail('Captura un precio por '+p!.unit+' mayor a cero en '+l.code+'.');delta=l.quantity;value=round(l.quantity*price);}
 if(d.type==='Devolución cocina'){const original=s.lines.find(x=>x.seq===ref!.seq&&x.code===l.code);const returns=new Set(s.operations.filter(o=>o.type==='Devolución cocina'&&o.reference===d.reference).map(o=>o.seq));const returned=s.lines.filter(x=>returns.has(x.seq)&&x.code===l.code).reduce((a,x)=>a+x.quantity,0);if(!original||round(l.quantity)>round(original.quantity-returned))fail(l.code+': la devolución supera lo entregado pendiente de devolver.');price=original!.price;delta=l.quantity;value=round(l.quantity*price);}
 if(d.type==='Pedido de compra'&&(!Number.isFinite(price)||price<=0||price>1e7))fail('Revisa el precio unitario de '+l.code+'.');
 if(d.type==='Solicitud cocina')price=0;if(d.type==='Cancelar compra')price=s.lines.find(x=>x.seq===ref!.seq&&x.code===l.code)?.price??0;
 result.push({code:l.code,quantity:round(l.quantity),price:round(price),delta:round(delta),value:round(value)});
 }return result;
}
