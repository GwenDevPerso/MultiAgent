import {afterNextRender, Component, inject} from '@angular/core';
import {AddressType} from '@phantom/browser-sdk';
import {PhantomService} from '../../../core/services/phantom.service';

@Component({
  selector: 'app-wallet-connect',
  standalone: true,
  templateUrl: './wallet-connect.html',
  styleUrl: './wallet-connect.css'
})
export class WalletConnectComponent {
  readonly phantomService = inject(PhantomService);

  constructor() {
    // Initialiser uniquement côté client après le rendu
    afterNextRender(() => {
      this.phantomService.initialize({
        providers: ['injected'],
        addressTypes: [AddressType.solana, AddressType.ethereum],
        autoConnect: true,
        appId: '54e15864-1df9-4f87-97ae-f8a5d05587dd',
      });
    });
  }

  async connect(): Promise<void> {
    await this.phantomService.connect('injected');
  }

  async disconnect(): Promise<void> {
    await this.phantomService.disconnect();
  }

  protected truncateAddress(address: string | null): string {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }
}

