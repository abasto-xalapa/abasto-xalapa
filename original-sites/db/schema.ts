// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {sqliteTable,text,integer,real,index,uniqueIndex} from 'drizzle-orm/sqlite-core';
export const products=sqliteTable('products',{code:text('code').primaryKey(),data:text('data').notNull()});
export const members=sqliteTable('members',{email:text('email').primaryKey(),userId:text('user_id'),role:text('role').notNull(),name:text('name').notNull()});
export const operations=sqliteTable('operations',{seq:integer('seq').primaryKey(),id:text('id').notNull().unique(),folio:text('folio').notNull().unique(),type:text('type').notNull(),date:text('date').notNull(),destination:text('destination').notNull(),reference:text('reference').notNull(),supplier:text('supplier').notNull(),notes:text('notes').notNull(),actor:text('actor').notNull(),actorId:text('actor_id').notNull(),timestamp:text('timestamp').notNull()},t=>[index('idx_operations_date').on(t.date),index('idx_operations_reference').on(t.reference)]);
export const lines=sqliteTable('lines',{id:integer('id').primaryKey({autoIncrement:true}),seq:integer('seq').notNull().references(()=>operations.seq),code:text('code').notNull().references(()=>products.code),quantity:real('quantity').notNull(),price:real('price').notNull(),delta:real('delta').notNull(),value:real('value').notNull()},t=>[index('idx_lines_code').on(t.code),uniqueIndex('idx_lines_operation_code').on(t.seq,t.code)]);
export const openings=sqliteTable('openings',{code:text('code').primaryKey().references(()=>products.code),seq:integer('seq').notNull().references(()=>operations.seq)});
