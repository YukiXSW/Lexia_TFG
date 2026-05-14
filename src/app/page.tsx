'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import lexiaLogo from '@/app/images/Lexialogo.png';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [welcome, setWelcome] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const userData = JSON.parse(stored);
      setUser(userData);
      if (localStorage.getItem('_welcome')) {
        setWelcome(true);
        localStorage.removeItem('_welcome');
      }
      setReady(true);
    } else {
      router.replace('/consulta');
    }
  }, [router]);

  if (!ready || !user) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
      <Image src={lexiaLogo} alt="Lexia" className="w-20 h-20 rounded-2xl mb-6" />
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
        {welcome ? 'Bienvenido a Lexia' : 'Bienvenido de nuevo, ' + user.name}
      </h1>
      {welcome && (
        <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-1">{user.name}</p>
      )}
      <p className="text-zinc-500 dark:text-zinc-400 max-w-md mt-2 mb-8">
        {welcome
          ? 'Tu cuenta ha sido creada con éxito. Ya puedes realizar consultas legales ilimitadas.'
          : 'Realiza una consulta legal y obtén una respuesta basada en la legislación vigente.'}
      </p>
      <button
        onClick={() => router.push('/consulta')}
        className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium text-lg"
      >
        Realizar Consulta
      </button>
    </div>
  );
}
