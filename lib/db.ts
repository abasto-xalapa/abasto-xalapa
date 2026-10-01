import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, scryptSync } from 'node:crypto';

let dbInstance: DatabaseSync | null = null;

function getDbPath() {
  // En Vercel solo se puede escribir en /tmp
  if (process.env.VERCEL) {
    const tmpDir = '/tmp/data';
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    return path.join(tmpDir, 'abasto.sqlite');
  }
  // Local
  const localDir = path.join(process.cwd(), '.data');
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
  return path.join(localDir, 'abasto.sqlite');
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dbPath = getDbPath();
  dbInstance = new DatabaseSync(dbPath);

  // Crear tablas si no existen
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      password TEXT,
      password_hash TEXT,
      role TEXT DEFAULT 'ADMIN'
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      price REAL,
      stock REAL
    );
  `);

  // SEED ADMIN - rafadonte@gmail.com / Abasto2026
  try {
    const row = dbInstance.prepare("SELECT id FROM users WHERE email =?").get('rafadonte@gmail.com') as any;
    if (!row) {
      const hashed = hashPassword('Abasto2026');
      // intentamos insertar en ambas columnas por compatibilidad
      try {
        dbInstance.prepare("INSERT INTO users (email, name, password, password_hash, role) VALUES (?,?,?,?,?)").run('rafadonte@gmail.com', 'Rafa', hashed, hashed, 'ADMIN');
      } catch {
        dbInstance.prepare("INSERT INTO users (email, name, password, role) VALUES (?,?,?,?)").run('rafadonte@gmail.com', 'Rafa', hashed, 'ADMIN');
      }
      console.log('Admin seeded: rafadonte@gmail.com / Abasto2026');
    }
  } catch (e) {
    console.error('Seed error', e);
  }

  return dbInstance;
}

export const db = new Proxy({} as DatabaseSync, {
  get(_, prop) {
    const realDb = getDb();
    const value = (realDb as any)[prop];
    return typeof value === 'function'? value.bind(realDb) : value;
  }
});
