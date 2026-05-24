import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import AdminPanel from './AdminPanel';

export default async function AdminPage() {
  const session = await getSession();

  if (!session || session.role !== 'admin') {
    redirect('/');
  }

  const users = await query(`
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u.created_at as createdAt,
      COUNT(c.id) as totalChats,
      (SELECT c2.type FROM chats c2 WHERE c2.user_id = u.id ORDER BY c2.created_at DESC LIMIT 1) as lastType,
      (SELECT c3.status FROM chats c3 WHERE c3.user_id = u.id ORDER BY c3.created_at DESC LIMIT 1) as lastStatus
    FROM users u
    LEFT JOIN chats c ON c.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `) as any[];

  const totalChats = (await query('SELECT COUNT(*) as total FROM chats')) as any[];
  const totalChatsCount = totalChats[0]?.total || 0;

  return <AdminPanel users={users} totalChats={totalChatsCount} currentUserId={session.id} />;
}
