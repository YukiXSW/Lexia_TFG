export interface LogEntry {
  timestamp?: string;
  ip: string;
  userId: number | string | null;
  sessionId: string | null;
  action: 'chat' | 'login' | 'register' | 'blocked';
  message?: string;
  reason?: string | null;
  model?: string;
}

const MAX_LOG_ENTRIES = 1000;
const logBuffer: LogEntry[] = [];

export function log(entry: LogEntry): void {
  const full: LogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  logBuffer.push(full);

  if (process.env.NODE_ENV === 'development') {
    const prefix = full.action === 'blocked' ? '[BLOQUEADO]' : '[INFO]';
    console.log(`${prefix} [${full.timestamp}] ${full.action} | IP: ${full.ip} | User: ${full.userId ?? 'guest'}`);
    if (full.reason) console.log(`  Razón: ${full.reason}`);
  }

  if (logBuffer.length > MAX_LOG_ENTRIES) {
    logBuffer.splice(0, logBuffer.length - MAX_LOG_ENTRIES);
  }
}

export function getRecentLogs(count: number = 50): LogEntry[] {
  return logBuffer.slice(-count);
}
