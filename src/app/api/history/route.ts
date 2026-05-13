import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const rows = await query(
      'SELECT id, message, response, type, status, created_at as createdAt FROM chats WHERE user_id = ? ORDER BY created_at DESC',
      [session.id]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error('History error:', error);
    return NextResponse.json(
      { error: 'Error al obtener historial' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await query('DELETE FROM chats WHERE user_id = ?', [session.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete history error:', error);
    return NextResponse.json(
      { error: 'Error al eliminar historial' },
      { status: 500 }
    );
  }
}
