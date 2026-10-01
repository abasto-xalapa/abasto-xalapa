import { cookies } from 'next/headers';
import { readSession, SESSION_COOKIE } from './auth-core';

export type SessionUser = { userId: string; email: string; displayName: string };

function toUser(d: { email: string; name: string } | null): SessionUser | null {
  if (!d) return null;
  return { userId: d.email, email: d.email, displayName: d.name };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const c = await cookies();
  const t = c.get(SESSION_COOKIE)?.value;
  if (!t) return null;
  return toUser(readSession(t));
}
export async function getSessionUser() { return getCurrentUser(); }
export async function getSession() { return getCurrentUser(); }
export async function requireUser() {
  const u = await getCurrentUser();
  if (!u) throw new Error('No auth');
  return u;
}
export const getUser = getCurrentUser;
export const getLoggedUser = getCurrentUser;
