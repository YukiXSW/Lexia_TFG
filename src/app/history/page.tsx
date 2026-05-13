import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import QueryHistory from '@/components/QueryHistory';

export default async function HistoryPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <section className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Historial de consultas</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
          Revisa tus consultas legales anteriores.
        </p>
      </div>
      <QueryHistory />
    </section>
  );
}
