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
  type: 'laboral' | 'civil' | null;
  status: 'activa' | 'resuelta' | null;
  createdAt: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
}
