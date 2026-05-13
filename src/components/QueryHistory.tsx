'use client';

import { useEffect, useState } from 'react';
import type { ChatHistoryItem } from '@/types';

const typeLabels: Record<string, string> = {
  laboral: 'Laboral',
  civil: 'Civil',
};

const statusStyles: Record<string, string> = {
  activa: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  resuelta: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
};

const statusLabels: Record<string, string> = {
  activa: 'Activa',
  resuelta: 'Resuelta',
};

export default function QueryHistory() {
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm('¿Eliminar todo el historial?')) return;
    try {
      await fetch('/api/history', { method: 'DELETE' });
      setHistory([]);
    } catch {
      // error
    }
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-lexia-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const headers = ['ID', 'Consulta', 'Respuesta', 'Tipo', 'Estado', 'Fecha'];
    const rows = history.map(item => [
      item.id,
      `"${item.message.replace(/"/g, '""')}"`,
      `"${(item.response || '').replace(/"/g, '""')}"`,
      item.type || '',
      item.status || '',
      new Date(item.createdAt).toLocaleString('es-ES'),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-lexia-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-20">
        <svg className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 className="text-lg font-medium text-zinc-600 dark:text-zinc-400">No hay consultas</h3>
        <p className="text-zinc-400 dark:text-zinc-500 mt-1">Tus consultas aparecerán aquí.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          Historial ({history.length})
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 dark:text-zinc-500 mr-1">Descargar</span>
          <button
            onClick={downloadJSON}
            className="text-xs px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            JSON
          </button>
          <button
            onClick={downloadCSV}
            className="text-xs px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            CSV
          </button>
          <button
            onClick={clearHistory}
            className="text-sm text-red-500 hover:text-red-600 transition-colors"
          >
            Eliminar todo
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {history.map(item => (
          <div
            key={item.id}
            className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              className="w-full text-left px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                {item.type && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                    {typeLabels[item.type] || item.type}
                  </span>
                )}
                {item.status && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[item.status] || ''}`}>
                    {statusLabels[item.status] || item.status}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                {item.message}
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                {new Date(item.createdAt).toLocaleString('es-ES')}
              </p>
            </button>
            {expanded === item.id && (
              <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-700">
                <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                  {item.response}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
