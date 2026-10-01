import { cookies } from 'next/headers';
import { readSession, SESSION_COOKIE } from './auth-core';

export type SessionUser = { userId: string; email: string; displayName: string }

function toSessionUser(data: { email: string; name: string } | null): SessionUser | null {
  if (!data) return null;
  return { userId: data.email, email: data.email, displayName: data.name };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const data = readSession(token);
  return toSessionUser(data);
}

// Alias que pide lib/server.ts - ESTE ERA EL QUE FALTABA
export async function getSessionUser(): Promise<SessionUser | null> {
  return getCurrentUser();
}

export async function getSession(): Promise<SessionUser | null> {
  return getCurrentUser();
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  return user;
}

// Para compatibilidad con otros archivos
export const getUser = getCurrentUser;
export const getLoggedUser = getCurrentUser;
