import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';
import {ChatMessage} from '../../../../core/models/chat.model';

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
  readonly message = input.required<ChatMessage>();

  protected readonly isUser = computed(() => this.message().role === 'user');

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
}
