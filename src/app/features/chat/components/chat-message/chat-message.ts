import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {ChatMessage} from '../../../../core/models/chat.model';
import {ChatService} from '../../../../core/services/chat.service';
import {PhantomService} from '../../../../core/services/phantom.service';

/**
 * Bulle de message avec style futuriste
 */
@Component({
  selector: 'app-chat-message',
  templateUrl: './chat-message.html',
  styleUrl: './chat-message.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessageComponent {
  private readonly chatService = inject(ChatService);
  protected readonly phantomService = inject(PhantomService);

  readonly message = input.required<ChatMessage>();

  protected readonly isUser = computed(() => this.message().role === 'user');

  protected readonly hasTransaction = computed(() => !!this.message().transactionAction);
  
  protected readonly isPending = computed(() => this.message().actionStatus === 'pending');
  
  protected readonly isExecuted = computed(() => this.message().actionStatus === 'executed');
  
  protected readonly isFailed = computed(() => this.message().actionStatus === 'failed');
  
  protected readonly isRejected = computed(() => this.message().actionStatus === 'rejected');

  protected readonly formattedContent = computed(() => {
    let content = this.message().content;
    // Convertir **text** en <strong>text</strong>
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return content;
  });

  protected readonly formattedTime = computed(() => {
    const date = new Date(this.message().timestamp);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  });

  async confirmTransaction(): Promise<void> {
    await this.chatService.confirmTransaction(this.message().id);
  }

  rejectTransaction(): void {
    this.chatService.rejectTransaction(this.message().id);
  }
}
