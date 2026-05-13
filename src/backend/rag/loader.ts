import { query } from '@/lib/db';
import { SEED_DOCUMENTS } from './documents';

export async function ensureLegalDocuments(): Promise<void> {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS legal_documents (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        article VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        keywords TEXT NOT NULL,
        source VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch {
    /* table already exists */
  }

  const existing = await query('SELECT COUNT(*) as count FROM legal_documents') as any[];
  const count = existing[0]?.count ?? 0;

  if (count === 0 && SEED_DOCUMENTS.length > 0) {
    for (const doc of SEED_DOCUMENTS) {
      try {
        await query(
          `INSERT INTO legal_documents (id, title, category, article, content, keywords, source)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [doc.id, doc.title, doc.category, doc.article, doc.content, doc.keywords.join(','), doc.source]
        );
      } catch {
        /* ignore duplicates */
      }
    }
    console.log(`[RAG] Se insertaron ${SEED_DOCUMENTS.length} documentos legales`);
  }
}
