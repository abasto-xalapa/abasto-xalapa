import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const dbPath = process.env.DATABASE_PATH || '/tmp/data/abasto.sqlite';
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

export const database = new DatabaseSync(dbPath);

database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL
  );
`);

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

const adminEmail = process.env.ADMIN_EMAIL || 'rafadonte@gmail.com';
const adminPass = process.env.ADMIN_PASSWORD || 'Abasto2026';

const existing = database.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail) as any;

if (!existing) {
  database.prepare('DELETE FROM users').run();
  const hash = hashPassword(adminPass);
  database.prepare(
    "INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, 'admin', datetime('now'))"
  ).run(crypto.randomUUID(), adminEmail, hash);
}
