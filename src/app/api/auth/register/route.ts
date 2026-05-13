import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const registerSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Contraseña debe tener al menos 8 caracteres'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, field: validation.error.issues[0].path[0] },
        { status: 400 }
      );
    }

    const { name, email, password } = validation.data;

    const nameExists = await query('SELECT id FROM users WHERE name = ?', [name]);
    if (Array.isArray(nameExists) && nameExists.length > 0) {
      return NextResponse.json(
        { error: 'El nombre de usuario ya está registrado', field: 'name' },
        { status: 409 }
      );
    }

    const emailExists = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (Array.isArray(emailExists) && emailExists.length > 0) {
      return NextResponse.json(
        { error: 'El email ya está registrado', field: 'email' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const result = await query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    ) as any;

    const insertId = result.insertId;
    const token = generateToken({ id: insertId, email, name, role: 'user' });
    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return NextResponse.json({
      user: { id: insertId, name, email, role: 'user' },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Error al registrar usuario' },
      { status: 500 }
    );
  }
}
