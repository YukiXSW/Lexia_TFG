import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { query } from '@/lib/db';
import AdminPanel from './AdminPanel';

export default async function AdminPage() {
  const session = await getSession();

  if (!session || session.role !== 'admin') {
    redirect('/');
  }

  const users = await query(
    'SELECT id, name, email, role, created_at as createdAt FROM users ORDER BY created_at DESC'
  ) as any[];

  const stats = await query(
    'SELECT COUNT(*) as totalChats FROM chats'
  ) as any[];

  const totalChats = stats[0]?.totalChats || 0;

  return <AdminPanel users={users} totalChats={totalChats} />;
}
