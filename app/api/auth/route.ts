import { NextRequest, NextResponse } from 'next/server';
import { signSession, SESSION_COOKIE, SESSION_SECONDS } from '@/lib/auth-core';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'Falta ADMIN_EMAIL en Vercel' }, { status: 500 });
    }

    if (email !== adminEmail || password !== adminPassword) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const token = signSession(email, 'Admin Abasto');
    const res = NextResponse.json({ ok: true });

    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_SECONDS,
    });

    return res;
  } catch (e) {
    return NextResponse.json({ error: 'Error en login' }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
