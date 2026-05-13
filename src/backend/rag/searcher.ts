import type { LegalDocument } from './documents';

const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'lo', 'un', 'una', 'unos', 'unas',
  'y', 'e', 'o', 'u', 'a', 'ante', 'bajo', 'con', 'contra', 'de',
  'del', 'desde', 'en', 'entre', 'hacia', 'hasta', 'para', 'por',
  'según', 'segun', 'sin', 'sobre', 'tras', 'que', 'es', 'su',
  'le', 'se', 'no', 'me', 'te', 'nos', 'os', 'les', 'sus',
  'este', 'esta', 'esto', 'esta', 'estos', 'estas', 'ese', 'esa',
  'eso', 'esos', 'esas', 'aquel', 'aquella', 'aquello', 'aquellos',
  'aquellas', 'al', 'cómo', 'como', 'cuando', 'donde', 'qué',
  'quien', 'cual', 'cuya', 'cuyo', 'más', 'mas', 'pero', 'sino',
  'también', 'tambien', 'muy', 'mucho', 'poco', 'todo', 'nada',
  'si', 'fue', 'era', 'ser', 'ha', 'han', 'has', 'había', 'habia',
  'hay', 'hubo', 'haya', 'sea', 'sido', 'son', 'eres', 'somos',
  'sois', 'son', 'está', 'esta', 'estan', 'estoy', 'estamos',
  'estais', 'están', 'estar', 'tiene', 'tienen', 'tengo', 'tener',
  'hace', 'hacer', 'puede', 'pueden', 'poder', 'debe', 'deben',
  'deber', 'va', 'van', 'ir', 'vamos', 'voy', 'vas', 'va',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-záéíóúñü0-9\s]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

export function searchLegal(
  query: string,
  documents: LegalDocument[],
  maxResults: number = 5
): LegalDocument[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const scored = documents.map(doc => {
    const titleTokens = tokenize(doc.title);
    const contentTokens = tokenize(doc.content);
    const keywordTokens = doc.keywords.flatMap(k => tokenize(k));

    let score = 0;

    for (const qt of queryTokens) {
      if (keywordTokens.includes(qt)) score += 3;
      if (titleTokens.includes(qt)) score += 2;
      if (contentTokens.includes(qt)) score += 1;
    }

    return { doc, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(s => s.doc);
}
