'use client';

import { useState } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  totalChats: number;
  lastType: string | null;
  lastStatus: string | null;
}

interface Props {
  users: User[];
  totalChats: number;
}

const typeLabels: Record<string, string> = {
  laboral: 'Laboral',
  civil: 'Civil',
  penal: 'Penal',
  administrativo: 'Administrativo',
  mercantil: 'Mercantil',
  fiscal: 'Fiscal',
  familia: 'Familia',
  inmobiliario: 'Inmobiliario',
  extranjeria: 'Extranjería',
  digital: 'Digital',
  constitucional: 'Constitucional',
  procesal: 'Procesal',
  'proteccion-datos': 'Protección de Datos',
};

const statusStyles: Record<string, string> = {
  activa: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  resuelta: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
};

const statusLabels: Record<string, string> = {
  activa: 'Activa',
  resuelta: 'Resuelta',
};

export default function AdminPanel({ users: initialUsers, totalChats }: Props) {
  const [users, setUsers] = useState(initialUsers);

  const toggleRole = async (userId: number, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (res.ok) {
        setUsers(prev =>
          prev.map(u => u.id === userId ? { ...u, role: newRole as 'user' | 'admin' } : u)
        );
      }
    } catch {
      // error
    }
  };

  const deleteUser = async (userId: number) => {
    if (!confirm('¿Eliminar este usuario y todas sus consultas?')) return;

    try {
      const res = await fetch(`/api/admin/users`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
      }
    } catch {
      // error
    }
  };

  return (
    <section className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Panel de Administración</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Gestiona usuarios y visualiza estadísticas.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Usuarios totales</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{users.length}</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Consultas totales</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{totalChats}</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Administradores</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
            {users.filter(u => u.role === 'admin').length}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="font-semibold text-zinc-900 dark:text-white">Usuarios</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                <th className="text-left px-5 py-3 text-zinc-500 dark:text-zinc-400 font-medium">Nombre</th>
                <th className="text-left px-5 py-3 text-zinc-500 dark:text-zinc-400 font-medium">Email</th>
                <th className="text-left px-5 py-3 text-zinc-500 dark:text-zinc-400 font-medium">Rol</th>
                <th className="text-center px-3 py-3 text-zinc-500 dark:text-zinc-400 font-medium">Consultas</th>
                <th className="text-left px-3 py-3 text-zinc-500 dark:text-zinc-400 font-medium">Tipo</th>
                <th className="text-left px-3 py-3 text-zinc-500 dark:text-zinc-400 font-medium">Estado</th>
                <th className="text-left px-5 py-3 text-zinc-500 dark:text-zinc-400 font-medium">Registro</th>
                <th className="text-right px-5 py-3 text-zinc-500 dark:text-zinc-400 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                  <td className="px-5 py-3 text-zinc-900 dark:text-zinc-100">{user.name}</td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">{user.email}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                        : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center text-zinc-900 dark:text-zinc-100 font-medium text-sm">
                    {user.totalChats}
                  </td>
                  <td className="px-3 py-3">
                    {user.lastType ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                        {typeLabels[user.lastType] || user.lastType}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {user.lastStatus ? (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[user.lastStatus] || ''}`}>
                        {statusLabels[user.lastStatus] || user.lastStatus}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400 text-xs">
                    {new Date(user.createdAt).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => toggleRole(user.id, user.role)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mr-3"
                    >
                      Cambiar rol
                    </button>
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
