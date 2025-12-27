import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';

/**
 * Bouton futuriste avec effet néon
 *
 * @example
 * ```html
 * <app-neo-button
 *   [disabled]="isLoading()"
 *   variant="primary"
 *   (clicked)="onSubmit()">
 *   Envoyer
 * </app-neo-button>
 * ```
 */
@Component({
  selector: 'app-neo-button',
  templateUrl: './neo-button.html',
  styleUrl: './neo-button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'neo-button-host',
  },
})
export class NeoButton {
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input(false);
  readonly variant = input<'primary' | 'secondary' | 'ghost'>('primary');

  readonly clicked = output<void>();

  protected buttonClasses(): string {
    return `neo-button neo-button--${this.variant()}`;
  }

  protected handleClick(): void {
    if (!this.disabled()) {
      this.clicked.emit();
    }
  }
}
