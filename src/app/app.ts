import {ChangeDetectionStrategy, Component} from '@angular/core';
import {ChatContainerComponent} from './features/chat/components/chat-container/chat-container';

/**
 * Composant racine de l'application NeoChef AI
 */
@Component({
  selector: 'app-root',
  imports: [ChatContainerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-chat-container />`,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class App {}
