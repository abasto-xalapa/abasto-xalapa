"use client";

import {useRef} from 'react';
import {Combobox as Primitive} from '@base-ui/react';
import {Combobox,ComboboxInput,ComboboxList,ComboboxItem} from '@/components/ui/combobox';
import type {Product} from '@/lib/domain';

export function ProductPicker({products,code,label,onChange}:{products:Product[];code:string;label:string;onChange:(product:Product|null)=>void}){
 const container=useRef<HTMLDivElement>(null);
 const options=products.filter(p=>p.active&&p.name.trim()&&p.unit.trim());
 const selected=options.find(p=>p.code===code);
 const labelFor=(p:Product)=>p.code+' · '+p.name;
 return <div ref={container}>
  <Combobox modal={false} openOnInputClick items={options.map(labelFor)} value={selected?labelFor(selected):null} onValueChange={value=>onChange(options.find(p=>labelFor(p)===value)??null)}>
   <ComboboxInput aria-label={label} placeholder="Escribe la clave o el nombre…"/>
   {/* Keep options inside the capture dialog's focus and pointer boundary. */}
   <Primitive.Portal container={container}>
    <Primitive.Positioner sideOffset={4} className="z-[60]">
     <Primitive.Popup className="w-[var(--anchor-width)] max-w-[var(--available-width)] rounded-md border bg-popover text-popover-foreground shadow-lg">
      <Primitive.Empty className="p-3 text-sm">No se encontró el producto.</Primitive.Empty>
      <ComboboxList className="max-h-60">{(item:string)=><ComboboxItem key={item} value={item}>{item}</ComboboxItem>}</ComboboxList>
     </Primitive.Popup>
    </Primitive.Positioner>
   </Primitive.Portal>
  </Combobox>
 </div>;
}
