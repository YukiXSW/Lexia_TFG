'use client';

import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function getGuestQueries(): number {
  if (typeof document === 'undefined') return 0;
  const match = document.cookie.match(/(?:^|;\s*)guest_queries=([^;]+)/);
  if (!match) return 0;
  const parts = match[1].split('_');
  if (parts.length !== 2) return 0;
  const [cookieDate, countStr] = parts;
  const today = new Date().toISOString().slice(0, 10);
  if (cookieDate !== today) return 0;
  return parseInt(countStr) || 0;
}

const GUEST_LIMIT = 5;

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ id: number } | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });
  const guestCount = typeof window !== 'undefined' ? getGuestQueries() : 0;
  const [blocked, setBlocked] = useState(() =>
    user ? false : guestCount >= GUEST_LIMIT
  );
  const [queriesUsed, setQueriesUsed] = useState(guestCount);
  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sessionId');
      if (stored) return stored;
      const newId = uuidv4();
      localStorage.setItem('sessionId', newId);
      return newId;
    }
    return uuidv4();
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const guestCount = getGuestQueries();
    setQueriesUsed(guestCount);

    if (stored) {
      setUser(JSON.parse(stored));
      setBlocked(false);
    } else if (guestCount >= GUEST_LIMIT) {
      setBlocked(true);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const faqs = [
    '¿Cuáles son los pasos para presentar una demanda laboral?',
    '¿Qué tipos de contratos laborales existen en España?',
    '¿Cómo se calcula la indemnización por despido improcedente?',
    '¿Qué derechos tengo como inquilino?',
    '¿Cuánto tiempo prescribe una deuda?',
    '¿Cómo solicitar el divorcio de mutuo acuerdo?',
  ];

  const sendMessage = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const messageText = overrideText ?? input.trim();
    if (!messageText || loading || blocked) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: messageText,
    };

    const assistantId = uuidv4();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInput('');
    setLoading(true);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId,
          userId: user?.id || null,
        }),
        signal: abortController.signal,
      });

      if (res.status === 429) {
        setBlocked(true);
        setMessages(prev => prev.slice(0, -2));
        return;
      }

      if (!res.ok) throw new Error('Error en la respuesta');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No se pudo leer el stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantId
                      ? { ...m, content: m.content + data.content }
                      : m
                  )
                );
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }

      const newCount = getGuestQueries();
      setQueriesUsed(newCount);
      if (!user && newCount >= GUEST_LIMIT) setBlocked(true);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: 'Lo siento, ocurrió un error al procesar tu consulta.' }
            : m
        )
      );
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const clearChat = () => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    localStorage.removeItem('chatMessages');
  };

  const isAtLimit = !user && blocked;
  const queriesLeft = GUEST_LIMIT - queriesUsed;

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L3 7l9 5 9-5-9-5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v5l9 5 9-5V7" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 22h8" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
              ¿En qué puedo ayudarte?
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-md">
              Soy Lexia, tu asistente legal inteligente. Consulta términos legales, procesos judiciales o conceptos de derecho.
            </p>
            {!user && !blocked && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-4">
                Consultas sin registro: {queriesUsed}/{GUEST_LIMIT}
              </p>
            )}
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-indigo-600 text-white rounded-br-md'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-md'
            }`}>
              <p className="text-sm whitespace-pre-wrap">
                {msg.content}
                {msg.role === 'assistant' && msg.content === '' && loading && (
                  <span className="inline-flex gap-1 ml-1">
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </p>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm px-4 py-3">
        {!isAtLimit && (
          <div className="mb-3">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Preguntas frecuentes
            </p>
            <div className="flex flex-wrap gap-2">
              {faqs.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(undefined, q)}
                  disabled={loading}
                  className="text-xs px-3 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 dark:hover:bg-indigo-900/20 dark:hover:border-indigo-700 dark:hover:text-indigo-400 disabled:opacity-50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isAtLimit ? 'Has alcanzado el límite de consultas' : 'Escribe tu consulta legal...'}
            disabled={loading || isAtLimit}
            className="flex-1 px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || isAtLimit}
            className="px-5 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          </button>
          {messages.length > 0 && !isAtLimit && (
            <button
              type="button"
              onClick={clearChat}
              className="px-3 py-3 text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title="Limpiar chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </form>

        {isAtLimit && (
          <div className="mt-3 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg text-center">
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
              Has alcanzado el límite de {GUEST_LIMIT} consultas gratuitas.
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              <a href="/register" className="font-semibold underline hover:text-amber-900 dark:hover:text-amber-100">
                Regístrate gratis
              </a>{' '}
              para acceso ilimitado a Lexia.
            </p>
          </div>
        )}

        {!user && !blocked && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 text-center">
            Consultas restantes: {queriesLeft}/{GUEST_LIMIT}
          </p>
        )}
      </div>
    </div>
  );
}
