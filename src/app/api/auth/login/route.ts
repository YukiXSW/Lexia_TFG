import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { comparePassword, generateToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email o usuario requerido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, field: validation.error.issues[0].path[0] },
        { status: 400 }
      );
    }

    const { identifier, password } = validation.data;

    const rows = await query(
      'SELECT * FROM users WHERE email = ? OR name = ?',
      [identifier, identifier]
    ) as any[];

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    const user = rows[0];
    const valid = await comparePassword(password, user.password);

    if (!valid) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Error al iniciar sesión' },
      { status: 500 }
    );
  }
}
