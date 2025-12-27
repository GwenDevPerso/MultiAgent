import {computed, Injectable, signal} from '@angular/core';
import {streamFlow} from 'genkit/beta/client';
import {ChatMessage} from '../models/chat.model';

interface ChatOutput {
  response: string;
}

/**
 * Service de gestion du chat IA
 * 
 * Gère l'état des messages et la communication avec l'API Genkit
 */
@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly API_URL = '/api/principal';
  
  // État privé
  private readonly _messages = signal<ChatMessage[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _currentStreamText = signal('');

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
      timestamp: new Date()
    };

    this._messages.update(msgs => [...msgs, userMessage]);
    this._error.set(null);
    this._isLoading.set(true);
    this._currentStreamText.set('');

    // Créer le message assistant (en streaming)
    const assistantMessage: ChatMessage = {
      id: this.generateId(),
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isStreaming: true
    };

    this._messages.update(msgs => [...msgs, assistantMessage]);

    try {
      const result = streamFlow({
        url: this.API_URL,
        input: { message: content }
      });

      let accumulatedText = '';

      // Traiter le stream
      for await (const chunk of result.stream) {
        accumulatedText += chunk;
        this._currentStreamText.set(accumulatedText);
        
        // Mettre à jour le message assistant
        this._messages.update(msgs => 
          msgs.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: accumulatedText }
              : msg
          )
        );
      }

      // Finaliser avec la réponse complète
      const finalOutput = await result.output as ChatOutput;

      this._messages.update(msgs => 
        msgs.map(msg => 
          msg.id === assistantMessage.id 
            ? { ...msg, content: finalOutput.response, isStreaming: false }
            : msg
        )
      );

    } catch (err) {
      this._error.set('Une erreur est survenue. Veuillez réessayer.');
      // Supprimer le message assistant en cas d'erreur
      this._messages.update(msgs => 
        msgs.filter(msg => msg.id !== assistantMessage.id)
      );
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
  }
}

