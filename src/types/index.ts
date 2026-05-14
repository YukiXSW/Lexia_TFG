export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ChatHistoryItem {
  id: number;
  message: string;
  response: string;
  type: QueryType;
  status: 'activa' | 'resuelta' | null;
  createdAt: string;
}

export type QueryType = 'laboral' | 'civil' | 'penal' | 'administrativo' | 'mercantil' | 'fiscal' | 'familia' | 'inmobiliario' | 'extranjeria' | 'digital' | 'constitucional' | 'procesal' | 'proteccion-datos' | null;

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
}
