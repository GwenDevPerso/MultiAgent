import {ChangeDetectionStrategy, Component, ElementRef, input, model, output, viewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';

/**
 * Input futuriste avec effet néon
 */
@Component({
  selector: 'app-neo-input',
  imports: [FormsModule],
  templateUrl: './neo-input.html',
  styleUrl: './neo-input.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NeoInput {
  readonly type = input<'text' | 'email' | 'password'>('text');
  readonly placeholder = input('');
  readonly disabled = input(false);
  readonly value = model('');
  readonly onEnter = output<void>();

  protected isFocused = false;
  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('inputRef');

  focus(): void {
    this.inputRef()?.nativeElement.focus();
  }
}
