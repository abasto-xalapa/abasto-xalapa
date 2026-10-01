// Base de datos SQLite local (archivo). Usa el módulo integrado de Node 22 (node:sqlite),
// así que no necesita compilar nada nativo. Expone la misma interfaz mínima que usaba la
// app original (prepare().bind() y batch()), para conservar intacta la lógica de negocio.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

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

const g = globalThis as unknown as { __abastoDb?: Db };

export function database(): Db {
  if (g.__abastoDb) return g.__abastoDb;
  const sqlite = (process as any).getBuiltinModule('node:sqlite') as { DatabaseSync: new (p: string) => any };
 
  const file = process.env.DATABASE_PATH ? path.resolve(process.env.DATABASE_PATH) : path.join('/tmp', '.data', 'abasto.sqlite');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  
  const raw = new sqlite.DatabaseSync(file);
  raw.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  raw.exec(SCHEMA);
  const cols = raw.prepare('PRAGMA table_info(members)').all() as { name: string }[];
  if (!cols.some(c => c.name === 'password_hash')) raw.exec('ALTER TABLE members ADD COLUMN password_hash TEXT');

  // --- Crear admin automáticamente ---
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'rafadonte@gmail.com';
    const adminPass = process.env.ADMIN_PASSWORD || 'Abasto2026';
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(adminPass, salt, 64) as Buffer;
    const hash = `scrypt$${salt}$${derived.toString('hex')}`;

    // Para tabla members (que usa tu app)
    const existsMember = raw.prepare('SELECT email FROM members WHERE email = ?').get(adminEmail) as any;
    if (!existsMember) {
      raw.prepare("INSERT INTO members (email, name, role, password_hash) VALUES (?, ?, 'admin', ?)").run(adminEmail, 'Admin', hash);
    } else {
      raw.prepare("UPDATE members SET password_hash = ?, role = 'admin' WHERE email = ?").run(hash, adminEmail);
    }

    // Para tabla users (compatibilidad)
    const existsUser = raw.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail) as any;
    if (!existsUser) {
      raw.prepare("INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, 'admin', datetime('now'))").run(crypto.randomUUID(), adminEmail, hash);
    } else {
      raw.prepare("UPDATE users SET password_hash = ? WHERE email = ?").run(hash, adminEmail);
    }
    console.log(`Admin asegurado: ${adminEmail}`);
  } catch (e) {
    console.log('Error creando admin', e);
  }

  const isRead = (sql: string) => /^\s*(select|pragma)/i.test(sql);
  g.__abastoDb = {
    raw,
    prepare: (sql: string) => new Statement(sql),
    async batch(statements: Statement[]) {
      raw.exec('BEGIN IMMEDIATE');
      try {
        const out = statements.map(s => {
          const st = raw.prepare(s.sql);
          if (isRead(s.sql)) return { results: (st.all(...s.args) as Row[]).map(r => ({ ...r })) };
          st.run(...s.args);
          return { results: [] as Row[] };
        });
        raw.exec('COMMIT');
        return out;
      } catch (e) {
        try { raw.exec('ROLLBACK'); } catch { /* ya revertido */ }
        throw e;
      }
    },
  };
  return g.__abastoDb;
}
