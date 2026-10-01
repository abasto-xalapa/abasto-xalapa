import crypto from 'node:crypto';
import { database } from './db';

function verifyScrypt(password: string, hash: string): boolean {
  try {
    if (!hash.startsWith('scrypt$')) return false;
    const [_, salt, keyHex] = hash.split('$');
    if (!salt || !keyHex) return false;
    const derived = crypto.scryptSync(password, salt, 64) as Buffer;
    const key = Buffer.from(keyHex, 'hex');
    if (derived.length !== key.length) return false;
    return crypto.timingSafeEqual(derived, key);
  } catch { return false; }
}

export async function verifyUser(email: string, password: string) {
  const db = database();
  // busca en members y en users
  let row: any = null;
  try {
    row = db.raw.prepare('SELECT email, password_hash, role, name FROM members WHERE email = ?').get(email);
  } catch {}
  if (!row) {
    try {
      const u = db.raw.prepare('SELECT email, password_hash, role FROM users WHERE email = ?').get(email) as any;
      if (u) row = { email: u.email, password_hash: u.password_hash, role: u.role, name: 'Admin' };
    } catch {}
  }
  if (!row || !row.password_hash) return null;

  const ok = verifyScrypt(password, row.password_hash);
  if (!ok) return null;

  return { email: row.email, role: row.role, name: row.name || 'Admin' };
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${derived.toString('hex')}`;
}
