import crypto from 'node:crypto';

export const SESSION_COOKIE = 'abasto_session';
export const SESSION_SECONDS = 60 * 60 * 24 * 7;

function getSecret(): string {
  return process.env.AUTH_SECRET || process.env.SESSION_SECRET || 'abasto-secret-xalapa-2026';
}

export function safeEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length!== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return a === b;
  }
}

function verifyScrypt(password: string, hash: string): boolean {
  try {
    if (!hash.startsWith('scrypt$')) return false;
    const parts = hash.split('$');
    const salt = parts[1];
    const keyHex = parts[2];
    if (!salt ||!keyHex) return false;
    const derived = crypto.scryptSync(password, salt, 64) as Buffer;
    const key = Buffer.from(keyHex, 'hex');
    if (derived.length!== key.length) return false;
    return crypto.timingSafeEqual(derived, key);
  } catch {
    return false;
  }
}

export function verifyPassword(password: string, hash: string): boolean {
  if (!hash || hash === 'scrypt$08$00') return false;
  return verifyScrypt(password, hash);
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

export function signSession(email: string, name: string): string {
  const payload = Buffer.from(JSON.stringify({ email, name, exp: Date.now() + SESSION_SECONDS * 1000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function parseSession(token: string): { email: string; name: string } | null {
  try {
    const [payload, sig] = token.split('.');
    if (!payload ||!sig) return null;
    const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
    if (!safeEqual(sig, expected)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (data.exp && Date.now() > data.exp) return null;
    return { email: data.email, name: data.name };
  } catch {
    return null;
  }
}

// Alias para compatibilidad con tu session.ts y server.ts
export const readSession = parseSession;
export const getSession = parseSession;
export const verifySession = parseSession;
