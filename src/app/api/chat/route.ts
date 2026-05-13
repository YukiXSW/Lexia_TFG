import { NextRequest, NextResponse } from 'next/server';
import { streamAI } from '@/backend/ai/proxy';
import { filterPrompt } from '@/backend/security/promptFilter';
import { moderateContent } from '@/backend/security/moderation';
import { checkRateLimit, getRateLimitKey } from '@/backend/security/rateLimiter';
import { log } from '@/backend/security/logger';
import { searchLegalContext, buildRAGContext, classifyQuery } from '@/backend/rag';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

const GUEST_LIMIT = 5;

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  try {
    const { message, sessionId, userId } = await req.json();
    const sid = sessionId || 'unknown';

    if (!message) {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 });
    }

    const session = await getSession();
    const effectiveUserId = session?.id || userId;

    const rateKey = session ? `ratelimit:user:${session.id}` : getRateLimitKey(req);
    const rateCheck = checkRateLimit(rateKey);
    if (!rateCheck.allowed) {
      log({ ip, userId: effectiveUserId, sessionId: sid, action: 'blocked', reason: 'Rate limit excedido' });
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) } }
      );
    }

    const injectionCheck = filterPrompt(message);
    if (injectionCheck.blocked) {
      log({ ip, userId: effectiveUserId, sessionId: sid, action: 'blocked', message, reason: injectionCheck.reason });
      return NextResponse.json({ error: 'Tu consulta no puede ser procesada por razones de seguridad.' }, { status: 403 });
    }

    const moderationCheck = moderateContent(message);
    if (moderationCheck.blocked) {
      log({ ip, userId: effectiveUserId, sessionId: sid, action: 'blocked', message, reason: moderationCheck.reason });
      return NextResponse.json({ error: 'Tu consulta contiene contenido inapropiado.' }, { status: 403 });
    }

    if (!session) {
      const guestQueries = parseInt(req.cookies.get('guest_queries')?.value || '0');
      if (guestQueries >= GUEST_LIMIT) {
        log({ ip, userId: null, sessionId: sid, action: 'blocked', message, reason: 'Límite de consultas de invitado alcanzado' });
        return NextResponse.json(
          { error: 'Has alcanzado el límite de 5 consultas. Regístrate para acceso ilimitado.', limitReached: true },
          { status: 429 }
        );
      }
    }

    // RAG: buscar fragmentos legales relevantes
    const legalResults = await searchLegalContext(message);
    const ragContext = buildRAGContext(legalResults);
    const { type, status } = classifyQuery(message, legalResults);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = '';

        try {
          for await (const chunk of streamAI(
            [{ role: 'user', content: message }],
            ragContext
          )) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
          }

          if (effectiveUserId) {
            await query(
              'INSERT INTO chats (user_id, message, response, type, status) VALUES (?, ?, ?, ?, ?)',
              [effectiveUserId, message, fullResponse, type, status]
            );
          }

          log({ ip, userId: effectiveUserId, sessionId: sid, action: 'chat', message, model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant' });

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Error al generar respuesta' })}\n\n`));
          controller.close();
        }
      },
    });

    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    if (!session) {
      const current = parseInt(req.cookies.get('guest_queries')?.value || '0');
      headers.append('Set-Cookie', `guest_queries=${current + 1}; Path=/; Max-Age=${31536000}; SameSite=Lax`);
    }

    return new Response(stream, { headers });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Error al procesar la consulta' }, { status: 500 });
  }
}
