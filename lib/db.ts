// Base de datos Turso (permanente) + fallback local /tmp
// Mantiene la misma interfaz: prepare().bind() y batch() para no romper tu app
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@libsql/client';

type Row = Record<string, unknown>;
export class Statement {
  sql: string;
  args: unknown[];
  constructor(sql: string, args: unknown[] = []) { this.sql = sql; this.args = args; }
  bind(...args: unknown[]) { return new Statement(this.sql, args); }
}
export type Db = {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<{ results: Row[] }[]>;
  raw: any;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS products (code TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS members (email TEXT PRIMARY KEY NOT NULL, user_id TEXT, role TEXT NOT NULL, name TEXT NOT NULL, password_hash TEXT);
CREATE TABLE IF NOT EXISTS operations (
  seq INTEGER PRIMARY KEY NOT NULL, id TEXT NOT NULL, folio TEXT NOT NULL, type TEXT NOT NULL, date TEXT NOT NULL,
  destination TEXT NOT NULL, reference TEXT NOT NULL, supplier TEXT NOT NULL, notes TEXT NOT NULL,
  actor TEXT NOT NULL, actor_id TEXT NOT NULL, timestamp TEXT NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS operations_id_unique ON operations (id);
CREATE UNIQUE INDEX IF NOT EXISTS operations_folio_unique ON operations (folio);
CREATE INDEX IF NOT EXISTS idx_operations_date ON operations (date);
CREATE INDEX IF NOT EXISTS idx_operations_reference ON operations (reference);
CREATE TABLE IF NOT EXISTS lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, seq INTEGER NOT NULL REFERENCES operations(seq), code TEXT NOT NULL REFERENCES products(code),
  quantity REAL NOT NULL, price REAL NOT NULL, delta REAL NOT NULL, value REAL NOT NULL);
CREATE INDEX IF NOT EXISTS idx_lines_code ON lines (code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lines_operation_code ON lines (seq, code);
CREATE TABLE IF NOT EXISTS openings (code TEXT PRIMARY KEY NOT NULL REFERENCES products(code), seq INTEGER NOT NULL REFERENCES operations(seq));
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL
);
`;

const g = globalThis as unknown as { __abastoDb?: Db, __abastoInit?: Promise<void> };

export function database(): Db {
  if (g.__abastoDb) return g.__abastoDb;

  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  // ===== 1. MODO TURSO (PERMANENTE) =====
  if (tursoUrl && tursoToken) {
    const client = createClient({ url: tursoUrl, authToken: tursoToken });

    const init = async () => {
      // Crear tablas
      await client.executeMultiple(SCHEMA);
      try {
        // Verificar columna password_hash
        const cols = await client.execute('PRAGMA table_info(members)');
        const hasHash = (cols.rows as any[]).some((c: any) => c.name === 'password_hash');
        if (!hasHash) await client.execute('ALTER TABLE members ADD COLUMN password_hash TEXT');
      } catch {}

      // Crear admin
      try {
        const adminEmail = process.env.ADMIN_EMAIL || 'rafadonte@gmail.com';
        const adminPass = process.env.ADMIN_PASSWORD || 'Abasto2026';
        const salt = crypto.randomBytes(16).toString('hex');
        const derived = crypto.scryptSync(adminPass, salt, 64) as Buffer;
        const hash = `scrypt$${salt}$${derived.toString('hex')}`;

        const existsMember = await client.execute({ sql: 'SELECT email FROM members WHERE email =?', args: [adminEmail] });
        if (existsMember.rows.length === 0) {
          await client.execute({ sql: "INSERT INTO members (email, name, role, password_hash) VALUES (?,?, 'admin',?)", args: [adminEmail, 'Admin', hash] });
        } else {
          await client.execute({ sql: "UPDATE members SET password_hash =?, role = 'admin' WHERE email =?", args: [hash, adminEmail] });
        }

        const existsUser = await client.execute({ sql: 'SELECT id FROM users WHERE email =?', args: [adminEmail] });
        if (existsUser.rows.length === 0) {
          await client.execute({ sql: "INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?,?,?, 'admin', datetime('now'))", args: [crypto.randomUUID(), adminEmail, hash] });
        } else {
          await client.execute({ sql: "UPDATE users SET password_hash =? WHERE email =?", args: [hash, adminEmail] });
        }
        console.log(`[TURSO] Admin asegurado: ${adminEmail}`);
      } catch (e) {
        console.log('[TURSO] Error creando admin', e);
      }
    };

    g.__abastoInit = init();

    const isRead = (sql: string) => /^\s*(select|pragma)/i.test(sql);

    g.__abastoDb = {
      raw: client,
      prepare: (sql: string) => new Statement(sql),
      async batch(statements: Statement[]) {
        if (g.__abastoInit) await g.__abastoInit;
        const results: { results: Row[] }[] = [];
        for (const s of statements) {
          if (isRead(s.sql)) {
            const res = await client.execute({ sql: s.sql, args: s.args as any });
            results.push({ results: res.rows as unknown as Row[] });
          } else {
            await client.execute({ sql: s.sql, args: s.args as any });
            results.push({ results: [] });
          }
        }
        return results;
      },
    };
    return g.__abastoDb;
  }

  // ===== 2. MODO LOCAL (SOLO RESPALDO) =====
  console.log('[DB] Usando SQLite local en /tmp - NO permanente');
  const sqlite = (process as any).getBuiltinModule('node:sqlite') as { DatabaseSync: new (p: string) => any };
  const file = process.env.DATABASE_PATH? path.resolve(process.env.DATABASE_PATH) : path.join('/tmp', '.data', 'abasto.sqlite');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const raw = new sqlite.DatabaseSync(file);
  raw.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  raw.exec(SCHEMA);
  const cols = raw.prepare('PRAGMA table_info(members)').all() as { name: string }[];
  if (!cols.some(c => c.name === 'password_hash')) raw.exec('ALTER TABLE members ADD COLUMN password_hash TEXT');
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'rafadonte@gmail.com';
    const adminPass = process.env.ADMIN_PASSWORD || 'Abasto2026';
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(adminPass, salt, 64) as Buffer;
    const hash = `scrypt$${salt}$${derived.toString('hex')}`;
    const existsMember = raw.prepare('SELECT email FROM members WHERE email =?').get(adminEmail) as any;
    if (!existsMember) raw.prepare("INSERT INTO members (email, name, role, password_hash) VALUES (?,?, 'admin',?)").run(adminEmail, 'Admin', hash);
    else raw.prepare("UPDATE members SET password_hash =?, role = 'admin' WHERE email =?").run(hash, adminEmail);
    const existsUser = raw.prepare('SELECT id FROM users WHERE email =?').get(adminEmail) as any;
    if (!existsUser) raw.prepare("INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?,?,?, 'admin', datetime('now'))").run(crypto.randomUUID(), adminEmail, hash);
    else raw.prepare("UPDATE users SET password_hash =? WHERE email =?").run(hash, adminEmail);
  } catch {}
  const isRead = (sql: string) => /^\s*(select|pragma)/i.test(sql);
  g.__abastoDb = {
    raw,
    prepare: (sql: string) => new Statement(sql),
    async batch(statements: Statement[]) {
      raw.exec('BEGIN IMMEDIATE');
      try {
        const out = statements.map(s => {
          const st = raw.prepare(s.sql);
          if (isRead(s.sql)) return { results: (st.all(...s.args) as Row[]).map(r => ({...r })) };
          st.run(...s.args);
          return { results: [] as Row[] };
        });
        raw.exec('COMMIT');
        return out;
      } catch (e) {
        try { raw.exec('ROLLBACK'); } catch {}
        throw e;
      }
    },
  };
  return g.__abastoDb;
}
