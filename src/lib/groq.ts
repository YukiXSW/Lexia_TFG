import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const LEGAL_SYSTEM_PROMPT = `Eres Lexia, un asistente legal inteligente y profesional. 
Tus funciones son:
- Proporcionar información legal general y educativa
- Explicar conceptos jurídicos de forma clara y accesible
- Ayudar a entender procesos legales comunes
- Siempre aclarar que NO eres un abogado y que tus respuestas no constituyen asesoría legal profesional
- Recomendar consultar con un abogado certificado para casos específicos
- Responder SOLO en español
- Ser preciso, objetivo y ético`;

export async function getGroqResponse(messages: { role: 'user' | 'assistant'; content: string }[]) {
  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: LEGAL_SYSTEM_PROMPT },
      ...messages,
    ] as any,
    model: 'llama-3.1-8b-instant',
    temperature: 0.3,
    max_tokens: 1024,
  });

  return completion.choices[0]?.message?.content || 'Lo siento, no pude procesar tu consulta.';
}

export async function* streamGroqResponse(messages: { role: 'user' | 'assistant'; content: string }[]) {
  const stream = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: LEGAL_SYSTEM_PROMPT },
      ...messages,
    ] as any,
    model: 'llama-3.1-8b-instant',
    temperature: 0.3,
    max_tokens: 1024,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) yield content;
  }
}
