/**
 * Action de transaction crypto
 */
export const ACTION = 'SEND_TRANSACTION';

/**
 * Action de transaction crypto demandée par l'agent
 */
export interface TransactionAction {
  action: typeof ACTION;
  amount: number;
  to: string;
  crypto: string;
}

/**
 * État d'une action en attente de confirmation
 */
export type ActionStatus = 'pending' | 'confirmed' | 'rejected' | 'executed' | 'failed';

/**
 * Représente un message dans le chat
 */
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
  /** Action de transaction en attente de confirmation */
  transactionAction?: TransactionAction;
  /** Statut de l'action si présente */
  actionStatus?: ActionStatus;
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

