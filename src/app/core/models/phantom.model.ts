import {AddressType} from '@phantom/browser-sdk';

export type PhantomProvider = 'injected' | 'google' | 'apple' | 'deeplink';

export interface PhantomConfig {
  providers: PhantomProvider[];
  addressTypes: AddressType[];
  appId?: string;
  autoConnect?: boolean;
}

