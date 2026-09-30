// Utilidades de seguridad (sin dependencias de Next): contraseñas y sesiones firmadas.
import { createHmac, randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

export const SESSION_COOKIE = 'abasto_session';
export const SESSION_SECONDS = 60 * 60 * 24 * 14; // 14 días

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [kind, salt, hash] = stored.split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const a = Buffer.from(hash, 'hex'), b = scryptSync(password, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function safeEqual(a: string, b: string): boolean {
  const x = createHash('sha256').update(a).digest(), y = createHash('sha256').update(b).digest();
  return timingSafeEqual(x, y);
}
function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('Falta SESSION_SECRET en el archivo .env (ejecuta npm run dev para generarlo).');
  return s;
}
export type Session = { email: string; name: string; exp: number };
export function signSession(email: string, name: string): string {
  const body = Buffer.from(JSON.stringify({ email, name, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS } satisfies Session)).toString('base64url');
  return body + '.' + createHmac('sha256', secret()).update(body).digest('base64url');
}
export function readSession(token: string | undefined): Session | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', secret()).update(body).digest('base64url');
  if (!safeEqual(sig, expected)) return null;
  try {
    const s = JSON.parse(Buffer.from(body, 'base64url').toString()) as Session;
    return s.exp > Date.now() / 1000 && s.email ? s : null;
  } catch { return null; }
}
