export interface ModerationResult {
  blocked: boolean;
  reason: string | null;
}

const BLOCKED_PATTERNS: { regex: RegExp; reason: string }[] = [
  {
    regex: /\b(puto|puta|mierda|coño|concha\s*sum|carajo|verga|culo|pendejo|guey|gilipollas|cabrón|cabron|hijueputa|hp)\b/i,
    reason: 'Lenguaje ofensivo detectado',
  },
  {
    regex: /\b(nazi|neonazi|supremacía|supremacia|blanca|genocidio|limpieza\s*étnica)\b/i,
    reason: 'Contenido de odio detectado',
  },
  {
    regex: /\b(cómo\s*matar|cómo\s*asesinar|cómo\s*hacer\s*una\s*bomba|arma\s*química|arma\s*biológica)\b/i,
    reason: 'Contenido violento detectado',
  },
  {
    regex: /\b(how\s*to\s*kill|how\s*to\s*make\s*a\s*bomb|weapon|explosive|chemical\s*weapon)\b/i,
    reason: 'Violent content detected',
  },
  {
    regex: /\b(menor\s*de\s*edad|pornografía|pornografia|contenido\s*sexual|desnudo)\b.*\b(legal|derecho|abogado|consulta)\b/i,
    reason: 'Contenido inapropiado para un asistente legal',
  },
];

export function moderateContent(message: string): ModerationResult {
  for (const { regex, reason } of BLOCKED_PATTERNS) {
    if (regex.test(message)) {
      return { blocked: true, reason };
    }
  }
  return { blocked: false, reason: null };
}
