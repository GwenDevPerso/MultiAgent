import {computed, inject, Injectable, PLATFORM_ID, signal} from '@angular/core';
import type {WalletAddress} from '@phantom/browser-sdk';
import {AddressType, BrowserSDK} from '@phantom/browser-sdk';
import {PhantomConfig, PhantomProvider} from '../models/phantom.model';

@Injectable({
  providedIn: 'root'
})
export class PhantomService {
  private sdk: BrowserSDK | null = null;
  private readonly platformId = inject<string>(PLATFORM_ID);

  // Reactive state using Angular signals
  private readonly _addresses = signal<WalletAddress[]>([]);
  private readonly _isConnected = signal<boolean>(false);
  private readonly _isConnecting = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  readonly isConnected = this._isConnected.asReadonly();
  readonly isConnecting = this._isConnecting.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed signals
  readonly solanaAddress = computed(() => {
    const addr = this._addresses().find(a => a.addressType === AddressType.solana);
    return addr?.address ?? null;
  });

  readonly ethereumAddress = computed(() => {
    const addr = this._addresses().find(a => a.addressType === AddressType.ethereum);
    return addr?.address ?? null;
  });

  initialize(config: PhantomConfig): void {
  
    this.sdk = new BrowserSDK({
      providers: config.providers,
      addressTypes: config.addressTypes,
      appId: config.appId,
    });

    this.setupEventListeners();

    if (config.autoConnect) {
      this.sdk.autoConnect().catch(() => {
        // Auto-connect failed silently, user will need to connect manually
      });
    }
  }

  private setupEventListeners(): void {
    if (!this.sdk) return;

    this.sdk.on('connect_start', () => {
      this._isConnecting.set(true);
      this._error.set(null);
    });

    this.sdk.on('connect', (data) => {
      this._isConnecting.set(false);
      this._isConnected.set(true);
      this._addresses.set(data.addresses);
    });

    this.sdk.on('connect_error', (data) => {
      this._isConnecting.set(false);
      this._error.set(data.error?.message ?? 'Connection failed');
    });

    this.sdk.on('disconnect', () => {
      this._isConnected.set(false);
      this._addresses.set([]);
    });
  }

  async connect(provider: PhantomProvider = 'injected'): Promise<void> {

    if (!this.sdk) {
      throw new Error('Phantom SDK not initialized. Call initialize() first.');
    }

    this._isConnecting.set(true);
    this._error.set(null);

    try {
      const result = await this.sdk.connect({ provider });
      this._addresses.set(result.addresses);
      this._isConnected.set(true);
      this._isConnecting.set(false);
    } catch (error) {
      this._isConnecting.set(false);
      const message = error instanceof Error ? error.message : 'Failed to connect';
      this._error.set(message);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.sdk) return;

    await this.sdk.disconnect();
    this._isConnected.set(false);
    this._addresses.set([]);
  }

  async signMessage(message: string) {
    if (!this.sdk || !this._isConnected()) {
      throw new Error('Wallet not connected');
    }

    return this.sdk.solana.signMessage(message);
  }

  async signAndSendTransaction<T>(transaction: T) {
    if (!this.sdk || !this._isConnected()) {
      throw new Error('Wallet not connected');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.sdk.solana.signAndSendTransaction(transaction as any);
  }
}

