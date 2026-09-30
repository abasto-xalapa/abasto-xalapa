import { cookies } from 'next/headers';
import { readSession, SESSION_COOKIE } from './auth-core';

export type SessionUser = { userId: string; email: string; displayName: string };

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const s = readSession(jar.get(SESSION_COOKIE)?.value);
  if (!s) return null;
  return { userId: 'user:' + s.email, email: s.email, displayName: s.name };
}
