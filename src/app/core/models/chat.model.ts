/**
 * Représente un message dans le chat
 */
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
}

/**
 * Réponse de l'API de génération de menu
 */
export interface MenuOutput {
  menuItem: string;
  description: string;
  price: string;
}

/**
 * État du chat
 */
export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

