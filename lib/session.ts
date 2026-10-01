import { cookies } from 'next/headers';
import { readSession, SESSION_COOKIE } from './auth-core';

export type SessionUser = { userId: string; email: string; displayName: string }

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const data = readSession(token);
  if (!data) return null;
  return { userId: data.email, email: data.email, displayName: data.name };
}

export async function getSession() {
  return getCurrentUser();
}
