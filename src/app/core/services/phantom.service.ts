import {computed, Injectable, signal} from '@angular/core';
import type {WalletAddress} from '@phantom/browser-sdk';
import {AddressType, BrowserSDK} from '@phantom/browser-sdk';
import {getTransferSolInstruction} from '@solana-program/system';
import {
    address,
    appendTransactionMessageInstructions,
    compileTransaction,
    createNoopSigner,
    createSolanaRpc,
    createTransactionMessage,
    getBase64EncodedWireTransaction,
    lamports,
    pipe,
    setTransactionMessageFeePayer,
    setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/kit';
import {VersionedTransaction} from '@solana/web3.js';
import {PhantomConfig, PhantomProvider} from '../models/phantom.model';

@Injectable({
  providedIn: 'root',
})
export class PhantomService {
  private sdk: BrowserSDK | null = null;

  //   private readonly rpc = createSolanaRpc('https://api.mainnet-beta.solana.com'); //METTRE un RPC CORS aller sur alchemy
  private readonly rpc = createSolanaRpc('https://api.devnet.solana.com');
  private readonly LAMPORTS_PER_SOL = 1_000_000_000n;

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
    const addr = this._addresses().find((a) => a.addressType === AddressType.solana);
    return addr?.address ?? null;
  });

  readonly ethereumAddress = computed(() => {
    const addr = this._addresses().find((a) => a.addressType === AddressType.ethereum);
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

  /**
   * Envoie des SOL à une adresse
   * @param to - Adresse du destinataire
   * @param amount - Montant en SOL
   * @returns La signature de la transaction
   */
  async sendSol(to: string, amount: number): Promise<string> {
    if (!this._isConnected()) {
      throw new Error('Wallet not connected');
    }

    const from = this.solanaAddress();
    if (!from) {
      throw new Error('Solana address not available');
    }

    // Récupérer le blockhash récent (expire après ~1 minute)
    const { value: latestBlockhash } = await this.rpc.getLatestBlockhash().send();

    // Convertir les adresses en format @solana/kit
    const sourceAddress = address(from);
    const sourceSigner = createNoopSigner(sourceAddress);
    const destinationAddress = address(to);

    // Convertir le montant en lamports (BigInt)
    const transferAmount = lamports(BigInt(Math.floor(amount * Number(this.LAMPORTS_PER_SOL))));

    // Créer l'instruction de transfert SOL
    const transferInstruction = getTransferSolInstruction({
      source: sourceSigner,
      destination: destinationAddress,
      amount: transferAmount,
    });

    // Construire le message de transaction avec pipe (approche fonctionnelle)
    // Ref: https://www.solanakit.com/docs/getting-started/build-transaction
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayer(sourceAddress, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      (tx) => appendTransactionMessageInstructions([transferInstruction], tx)
    );

    // Compiler la transaction (sans signatures)
    const compiledTransaction = compileTransaction(transactionMessage);
    console.log('compiledTransaction', compiledTransaction);

    // Encoder en base64 pour obtenir les bytes de la transaction
    const base64Transaction = getBase64EncodedWireTransaction(compiledTransaction);
    console.log('base64Transaction', base64Transaction);
    // Convertir le base64 en Uint8Array puis en VersionedTransaction pour Phantom
    const transactionBytes = Uint8Array.from(atob(base64Transaction), (c) => c.charCodeAt(0));
    const versionedTransaction = VersionedTransaction.deserialize(transactionBytes);
    console.log('versionedTransaction', versionedTransaction);
    // Signer et envoyer via Phantom SDK
    // Ref: https://www.solanakit.com/docs/getting-started/send-transaction
    const result = await this.signAndSendTransaction(versionedTransaction);
    console.log('result', result);
    return result.signature;
  }

  /**
   * Signe et envoie une transaction via Phantom SDK
   * @param transaction - Transaction au format VersionedTransaction de @solana/web3.js
   * @returns La signature de la transaction
   */
  async signAndSendTransaction(transaction: VersionedTransaction): Promise<{ signature: string }> {
    if (!this.sdk || !this._isConnected()) {
      throw new Error('Wallet not connected');
    }

    try {
      const result = await this.sdk.solana.signAndSendTransaction(transaction);
      return result;
    } catch (error) {
      console.error('Phantom signAndSendTransaction error:', error);
      throw error;
    }
  }
}
