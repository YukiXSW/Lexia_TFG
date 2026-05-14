import { query } from '@/lib/db';
import type { LegalDocument } from './documents';
import { searchLegal as searchLocal } from './searcher';
import { ensureLegalDocuments } from './loader';

let cachedDocuments: LegalDocument[] | null = null;

const CATEGORY_LABELS: Record<string, string> = {
  constitucional: 'Constitucional',
  civil: 'Civil',
  penal: 'Penal',
  laboral: 'Laboral',
  procesal: 'Procesal',
  administrativo: 'Administrativo',
  mercantil: 'Mercantil',
  fiscal: 'Fiscal',
  familia: 'Familia',
  inmobiliario: 'Inmobiliario',
  extranjeria: 'Extranjería',
  digital: 'Digital',
  'proteccion-datos': 'Protección de Datos',
};

const ACTIVE_SITUATION_KEYWORDS = [
  'me han', 'me despid', 'tengo un problema', 'he sufrido', 'me hicieron',
  'me deben', 'no me pagan', 'me echaron', 'demandar', 'denunciar',
  'reclamar', 'impugnar', 'recurrir', 'qué puedo hacer', 'cómo puedo',
  'mis derechos', 'vulnerado', 'incumplimiento', 'acoso', 'discriminación',
  'desahucio', 'ejecución', 'embargo', 'multa', 'sanción',
];

async function loadDocuments(): Promise<LegalDocument[]> {
  await ensureLegalDocuments();

  const rows = await query('SELECT * FROM legal_documents') as any[];
  cachedDocuments = rows.map((r: any) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    article: r.article,
    content: r.content,
    keywords: r.keywords.split(','),
    source: r.source,
  }));

  return cachedDocuments;
}

export async function searchLegalContext(query: string, maxResults: number = 5): Promise<LegalDocument[]> {
  const docs = cachedDocuments ?? await loadDocuments();
  return searchLocal(query, docs, maxResults);
}

export function buildRAGContext(results: LegalDocument[]): string {
  if (results.length === 0) return '';

  const fragments = results.map((doc, i) =>
    `[${i + 1}] ${doc.source}\n${doc.content}`
  );

  return `A continuación se presentan fragmentos de legislación relevante para la consulta del usuario:\n\n${fragments.join('\n\n')}`;
}

export function classifyQuery(query: string, legalResults: LegalDocument[]): { type: string | null; status: string } {
  let type: string | null = null;

  if (legalResults.length > 0) {
    const categoryCount: Record<string, number> = {};
    for (const doc of legalResults) {
      categoryCount[doc.category] = (categoryCount[doc.category] || 0) + 1;
    }
    const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    type = topCategory || null;
  }

  const lower = query.toLowerCase();
  const isActiveSituation = ACTIVE_SITUATION_KEYWORDS.some(kw => lower.includes(kw));
  const status = isActiveSituation ? 'activa' : 'resuelta';

  return { type, status };
}
