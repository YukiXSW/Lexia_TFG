import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    let chats;
    if (userId) {
      chats = await query(
        `SELECT c.id, c.user_id, u.name as userName, u.email as userEmail,
                c.message, c.response, c.type, c.status, c.created_at as createdAt
         FROM chats c
         JOIN users u ON u.id = c.user_id
         WHERE c.user_id = ?
         ORDER BY c.created_at DESC`,
        [Number(userId)]
      );
    } else {
      chats = await query(
        `SELECT c.id, c.user_id, u.name as userName, u.email as userEmail,
                c.message, c.response, c.type, c.status, c.created_at as createdAt
         FROM chats c
         JOIN users u ON u.id = c.user_id
         ORDER BY c.created_at DESC
         LIMIT 200`
      );
    }

    return NextResponse.json(chats);
  } catch (error) {
    console.error('Admin chats error:', error);
    return NextResponse.json(
      { error: 'Error al obtener consultas' },
      { status: 500 }
    );
  }
}
