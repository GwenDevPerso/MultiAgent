import {computed, inject, Injectable, signal} from '@angular/core';
import {streamFlow} from 'genkit/beta/client';
import {ACTION, ActionStatus, ChatMessage, TransactionAction} from '../models/chat.model';
import {PhantomService} from './phantom.service';

interface ChatOutput {
  response: string;
}

const ACTION_JSON_REGEX = /\{[\s\S]*"action"\s*:\s*"(SEND_TRANSACTION)"[\s\S]*\}/;

/**
 * Service de gestion du chat IA
 *
 * Gère l'état des messages et la communication avec l'API Genkit
 */
@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly API_URL = '/api/principal';
  private readonly phantomService = inject(PhantomService);

  // État privé
  private readonly _messages = signal<ChatMessage[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _currentStreamText = signal('');
  private readonly _pendingTransaction = signal<{
    messageId: string;
    action: TransactionAction;
  } | null>(null);

  // Signal pour les transactions en attente
  readonly pendingTransaction = this._pendingTransaction.asReadonly();

  // Sélecteurs publics (lecture seule)
  readonly messages = this._messages.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly currentStreamText = this._currentStreamText.asReadonly();

  // Computed
  readonly hasMessages = computed(() => this._messages().length > 0);
  readonly lastMessage = computed(() => {
    const msgs = this._messages();
    return msgs.length > 0 ? msgs[msgs.length - 1] : null;
  });

  /**
   * Génère un identifiant unique pour les messages
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Ajoute un message utilisateur et génère une réponse IA
   */
  async sendMessage(content: string): Promise<void> {
    if (!content.trim() || this._isLoading()) {
      return;
    }

    // Ajouter le message utilisateur
    const userMessage: ChatMessage = {
      id: this.generateId(),
      content: content.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    this._messages.update((msgs) => [...msgs, userMessage]);
    this._error.set(null);
    this._isLoading.set(true);
    this._currentStreamText.set('');

    // Créer le message assistant (en streaming)
    const assistantMessage: ChatMessage = {
      id: this.generateId(),
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isStreaming: true,
    };

    this._messages.update((msgs) => [...msgs, assistantMessage]);

    try {
      const result = streamFlow({
        url: this.API_URL,
        input: { message: content },
      });

      let accumulatedText = '';

      // Traiter le stream
      for await (const chunk of result.stream) {
        accumulatedText += chunk;
        this._currentStreamText.set(accumulatedText);

        // Mettre à jour le message assistant
        this._messages.update((msgs) =>
          msgs.map((msg) =>
            msg.id === assistantMessage.id ? { ...msg, content: accumulatedText } : msg
          )
        );
      }

      // Finaliser avec la réponse complète
      const finalOutput = (await result.output) as ChatOutput;

      // Détecter si la réponse contient une action de transaction
      const transactionAction = this.extractTransactionAction(finalOutput.response);

      this._messages.update((msgs) =>
        msgs.map((msg) =>
          msg.id === assistantMessage.id
            ? {
                ...msg,
                content: transactionAction
                  ? this.formatTransactionMessage(transactionAction)
                  : finalOutput.response,
                isStreaming: false,
                transactionAction,
                actionStatus: transactionAction ? 'pending' : undefined,
              }
            : msg
        )
      );

      // Stocker la transaction en attente
      if (transactionAction) {
        this._pendingTransaction.set({
          messageId: assistantMessage.id,
          action: transactionAction,
        });
      }
    } catch (err) {
      this._error.set('Une erreur est survenue. Veuillez réessayer.');
      // Supprimer le message assistant en cas d'erreur
      this._messages.update((msgs) => msgs.filter((msg) => msg.id !== assistantMessage.id));
    } finally {
      this._isLoading.set(false);
      this._currentStreamText.set('');
    }
  }

  /**
   * Efface tous les messages
   */
  clearMessages(): void {
    this._messages.set([]);
    this._error.set(null);
    this._pendingTransaction.set(null);
  }

  /**
   * Extrait une action de transaction du contenu de la réponse
   */
  private extractTransactionAction(content: string): TransactionAction | undefined {
    const match = content.match(ACTION_JSON_REGEX);
    if (!match) return undefined;
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed.action === ACTION && parsed.amount && parsed.to && parsed.crypto) {
        return {
          action: parsed.action,
          amount: parsed.amount,
          to: parsed.to,
          crypto: parsed.crypto,
        };
      }
    } catch {
      console.error('Invalid JSON:', content);
    }
    return undefined;
  }

  /**
   * Formate un message lisible pour une transaction
   */
  private formatTransactionMessage(action: TransactionAction): string {
    return `Je vais envoyer **${action.amount} ${action.crypto.toUpperCase()}** à l'adresse **${
      action.to
    }**. Veuillez confirmer cette transaction.`;
  }

  /**
   * Met à jour le statut d'une action dans un message
   */
  private updateMessageActionStatus(messageId: string, status: ActionStatus): void {
    this._messages.update((msgs) =>
      msgs.map((msg) => (msg.id === messageId ? { ...msg, actionStatus: status } : msg))
    );
  }

  /**
   * Confirme et exécute une transaction en attente
   */
  /**
   * Confirme et exécute une transaction en attente
   */
  async confirmTransaction(messageId: string): Promise<void> {
    const pending = this._pendingTransaction();
    if (!pending || pending.messageId !== messageId) {
      throw new Error('No pending transaction found');
    }

    if (!this.phantomService.isConnected()) {
      this._error.set('Veuillez connecter votre wallet Phantom avant de confirmer.');
      return;
    }

    this.updateMessageActionStatus(messageId, 'confirmed');

    try {
      const { amount, to, crypto } = pending.action;
      console.log('amount', amount);
      console.log('to', to);
      console.log('crypto', crypto);
      // Vérifier que c'est bien du SOL
      if (crypto.toLowerCase() !== 'sol') {
        throw new Error(`Seul SOL est supporté pour le moment. Token "${crypto}" non disponible.`);
      }

      // Envoyer la transaction via PhantomService
      const signature = await this.phantomService.sendSol(to, amount);

      this.updateMessageActionStatus(messageId, 'executed');
      this._pendingTransaction.set(null);

      // Ajouter un message de confirmation avec lien Solscan
      const confirmMessage: ChatMessage = {
        id: this.generateId(),
        content: `✅ Transaction confirmée !\n\n**${amount} SOL** envoyé à \`${to}\`\n\n🔗 [Voir sur Solscan](https://solscan.io/tx/${signature})`,
        role: 'assistant',
        timestamp: new Date(),
      };
      this._messages.update((msgs) => [...msgs, confirmMessage]);
    } catch (error) {
      this.updateMessageActionStatus(messageId, 'failed');
      const errorMsg = error instanceof Error ? error.message : 'Transaction failed';
      this._error.set(errorMsg);
    }
  }

  /**
   * Rejette une transaction en attente
   */
  rejectTransaction(messageId: string): void {
    const pending = this._pendingTransaction();
    if (!pending || pending.messageId !== messageId) {
      return;
    }

    this.updateMessageActionStatus(messageId, 'rejected');
    this._pendingTransaction.set(null);

    // Ajouter un message de rejet
    const rejectMessage: ChatMessage = {
      id: this.generateId(),
      content: '❌ Transaction annulée.',
      role: 'assistant',
      timestamp: new Date(),
    };
    this._messages.update((msgs) => [...msgs, rejectMessage]);
  }
}
