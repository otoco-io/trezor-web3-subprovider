// Based on source from:
// https://github.com/0xProject/0x-monorepo/blob/development/packages/subproviders/src/subproviders/trezor.ts
// Package update and code upgrade by: Filipe Soccol

import TrezorConnect from 'trezor-connect';
import Web3ProviderEngine from 'web3-provider-engine';
// @ts-ignore
import CacheSubprovider from 'web3-provider-engine/subproviders/cache.js';
import { TrezorSubprovider } from './trezorSubprovider';
import RPCSubprovider from 'web3-provider-engine/subproviders/rpc.js';

export interface ITrezorProviderOptions {
  manifestEmail: string;
  manifestAppUrl: string;
  rpcUrl: string;
  config?: any;
  pollingInterval?: any;
  requestTimeoutMs?: any;
}

class TrezorProvider extends Web3ProviderEngine {
  constructor(opts: ITrezorProviderOptions) {
    super({
      pollingInterval: opts.pollingInterval,
    });
    TrezorConnect.manifest({
      email: opts.manifestEmail,
      appUrl: opts.manifestAppUrl,
    });
    this.addProvider(
      new TrezorSubprovider({
        trezorConnectClientApi: TrezorConnect,
        ...opts.config,
      })
    );
    this.addProvider(new CacheSubprovider());
    this.addProvider(new RPCSubprovider(opts.rpcUrl, opts.requestTimeoutMs));

    this.start();
  }
}

export default TrezorProvider;