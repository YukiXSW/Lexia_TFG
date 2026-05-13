import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    await query('SELECT 1');
    return NextResponse.json({
      success: true,
      message: 'Base de datos configurada correctamente',
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Error al configurar la base de datos' },
      { status: 500 }
    );
  }
}
