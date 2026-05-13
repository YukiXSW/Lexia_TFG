export interface FilterResult {
  blocked: boolean;
  reason: string | null;
}

const INJECTION_PATTERNS: { regex: RegExp; reason: string }[] = [
  {
    regex: /ignora\s*(instrucciones|órdenes|ordenes|lo\s*anterior|tus\s*instrucciones)/i,
    reason: 'Intento de inyección: ignorar instrucciones',
  },
  {
    regex: /olvida\s*(instrucciones|órdenes|ordenes|lo\s*anterior|tu\s*propósito|propósito)/i,
    reason: 'Intento de inyección: olvidar instrucciones',
  },
  {
    regex: /dime\s*tu\s*(prompt|system\s*prompt|instrucción|instruccion|systemp|system_prompt)/i,
    reason: 'Intento de obtener el prompt del sistema',
  },
  {
    regex: /muéstrame\s*tu\s*(prompt|instrucción|instruccion|código|codigo|system)/i,
    reason: 'Intento de obtener el prompt del sistema',
  },
  {
    regex: /reveal\s*(your|the)\s*(system\s*prompt|prompt|instructions)/i,
    reason: 'Attempt to reveal system prompt',
  },
  {
    regex: /ignore\s*(previous|all|above)\s*(instructions|prompts|directives)/i,
    reason: 'Prompt injection: ignore instructions',
  },
  {
    regex: /forget\s*(all|everything|your)\s*(instructions|rules|prompts|training)/i,
    reason: 'Prompt injection: forget instructions',
  },
  {
    regex: /eres\s*(un\s*asistente\s*diferente|ahora\s*eres|ahora\s*actúa|actua\s*como)/i,
    reason: 'Intento de cambiar el rol del asistente',
  },
  {
    regex: /you\s*are\s*(now|a\s*different|an?\s*AI\s*that)/i,
    reason: 'Attempt to change assistant role',
  },
  {
    regex: /reset\s*(conversation|chat|memory|everything)/i,
    reason: 'Attempt to reset conversation context',
  },
  {
    regex: /dame\s*tu\s*(api\s*key|token|contraseña|password|secret|clave)/i,
    reason: 'Intento de obtener credenciales',
  },
  {
    regex: /how\s*(do\s*you\s*work|are\s*you\s*build|is\s*your\s*architecture)/i,
    reason: 'Attempt to probe system architecture',
  },
  {
    regex: /cómo\s*(funcionas|estás\s*construido|estás\s*hecho|estás\s*programado)/i,
    reason: 'Intento de sondear la arquitectura del sistema',
  },
  {
    regex: /accede\s*a\s*(la\s*base\s*de\s*datos|los\s*archivos|al\s*sistema)/i,
    reason: 'Intento de acceder a recursos del sistema',
  },
  {
    regex: /access\s*(the\s*database|files|system|api)/i,
    reason: 'Attempt to access system resources',
  },
  {
    regex: /sqlmap|union\s*select|DROP\s*TABLE|DELETE\s*FROM/i,
    reason: 'Posible intento de SQL injection',
  },
  {
    regex: /<\s*script|javascript:|onerror=|onload=/i,
    reason: 'Posible intento de XSS',
  },
];

export function filterPrompt(message: string): FilterResult {
  for (const { regex, reason } of INJECTION_PATTERNS) {
    if (regex.test(message)) {
      return { blocked: true, reason };
    }
  }
  return { blocked: false, reason: null };
}
