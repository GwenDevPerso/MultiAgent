import {ChangeDetectionStrategy, Component, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
import {ChatService} from '../../../../core/services/chat.service';
import {NeoButton} from '../../../../shared/components/neo-button/neo-button';
import {NeoInput} from '../../../../shared/components/neo-input/neo-input';
import {WalletConnectComponent} from '../../../../shared/components/wallet-connect/wallet-connect';
import {ChatMessageComponent} from '../chat-message/chat-message';

/**
 * Container principal du chat IA futuriste
 */
@Component({
  selector: 'app-chat-container',
  imports: [ChatMessageComponent, NeoInput, NeoButton, WalletConnectComponent],
  templateUrl: './chat-container.html',
  styleUrl: './chat-container.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatContainerComponent {
  protected readonly chatService = inject(ChatService);
  protected readonly inputValue = signal('');

  private readonly messagesContainer = viewChild<ElementRef<HTMLElement>>('messagesContainer');

  constructor() {
    // Auto-scroll quand les messages changent
    effect(() => {
      this.chatService.messages();
      this.scrollToBottom();
    });
  }

  protected sendMessage(): void {
    const value = this.inputValue().trim();
    if (!value) return;

    this.chatService.sendMessage(value);
    this.inputValue.set('');
  }

  protected sendSuggestion(suggestion: string): void {
    this.chatService.sendMessage(suggestion);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = this.messagesContainer()?.nativeElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 50);
  }
}
