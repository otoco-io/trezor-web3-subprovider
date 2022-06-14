// Based on source from:
// https://github.com/0xProject/0x-monorepo/blob/development/packages/subproviders/src/subproviders/subprovider.ts
// Package update and code upgrade by: Filipe Soccol

import Web3 from 'web3';
import Web3ProviderEngine from 'web3-provider-engine';
import { JSONRPCRequestPayload, JSONRPCResponsePayload } from 'ethereum-types';
import { 
    Callback,
    ErrorCallback,
    PartialTxParams,
    WalletSubproviderErrors,
    JSONRPCRequestPayloadWithMethod
} from './types';

/**
 * A altered version of the base class Subprovider found in [web3-provider-engine](https://github.com/MetaMask/provider-engine).
 * This one has an async/await `emitPayloadAsync` and also defined types.
 */
export abstract class Subprovider {
    // tslint:disable-next-line:underscore-private-and-protected
    private engine!: Web3ProviderEngine;
    protected static _createFinalPayload(
        payload: Partial<JSONRPCRequestPayloadWithMethod>,
    ): Partial<JSONRPCRequestPayloadWithMethod> {
        const finalPayload = {
            // defaults
            id: Subprovider._getRandomId(),
            jsonrpc: '2.0',
            params: [],
            ...payload,
        };
        return finalPayload;
    }
    // Ported from: https://github.com/MetaMask/provider-engine/blob/master/util/random-id.js
    private static _getRandomId(): number {
        const extraDigits = 3;
        const baseTen = 10;
        // 13 time digits
        const datePart = new Date().getTime() * Math.pow(baseTen, extraDigits);
        // 3 random digits
        const extraPart = Math.floor(Math.random() * Math.pow(baseTen, extraDigits));
        // 16 digits
        return datePart + extraPart;
    }
    /**
     * @param payload JSON RPC request payload
     * @param next A callback to pass the request to the next subprovider in the stack
     * @param end A callback called once the subprovider is done handling the request
     */
    // tslint:disable-next-line:async-suffix
    public abstract handleRequest(
        payload: JSONRPCRequestPayload,
        next: Callback,
        end: ErrorCallback,
    ): Promise<void>;

    /**
     * Emits a JSON RPC payload that will then be handled by the ProviderEngine instance
     * this subprovider is a part of. The payload will cascade down the subprovider middleware
     * stack until finding the responsible entity for handling the request.
     * @param payload JSON RPC payload
     * @returns JSON RPC response payload
     */
    public async emitPayloadAsync(payload: Partial<JSONRPCRequestPayloadWithMethod>): Promise<JSONRPCResponsePayload> {
        const finalPayload = Subprovider._createFinalPayload(payload);
        // Promisify does the binding internally and `this` is supplied as a second argument
        // tslint:disable-next-line:no-unbound-method
        return new Promise( (resolve, reject) => {
            this.engine.sendAsync(finalPayload as JSONRPCRequestPayload, (error: any, response) => {
                if (error) reject(error)
                else resolve(response) 
            })
        })
    }
    /**
     * Set's the subprovider's engine to the ProviderEngine it is added to.
     * This is only called within the ProviderEngine source code, do not call
     * directly.
     * @param engine The ProviderEngine this subprovider is added to
     */
    public setEngine(engine: Web3ProviderEngine): void {
        this.engine = engine;
    }
}

export abstract class BaseWalletSubprovider extends Subprovider {
    protected static _validateTxParams(txParams: PartialTxParams): void {
        if (txParams.to !== undefined) {
            if (!Web3.utils.isAddress(txParams.to)) throw new Error('Transaction parameter TO is not a valid address.');
        }
        if (txParams.nonce == null) throw new Error('Nonce not present on transaction.');
    }
    private static _validateSender(sender: string): void {
        if (sender === undefined || !Web3.utils.isAddress(sender)) {
            throw new Error(WalletSubproviderErrors.SenderInvalidOrNotSupplied);
        }
    }

    public abstract getAccountsAsync(): Promise<string[]>;
    public abstract signTransactionAsync(txParams: PartialTxParams): Promise<string>;
    public abstract signPersonalMessageAsync(data: string, address: string): Promise<string>;
    public abstract signTypedDataAsync(address: string, typedData: any): Promise<string>;

    /**
     * This method conforms to the web3-provider-engine interface.
     * It is called internally by the ProviderEngine when it is this subproviders
     * turn to handle a JSON RPC request.
     * @param payload JSON RPC payload
     * @param next Callback to call if this subprovider decides not to handle the request
     * @param end Callback to call if subprovider handled the request and wants to pass back the request.
     */
    // tslint:disable-next-line:async-suffix
    public async handleRequest(payload: JSONRPCRequestPayload, next: Callback, end: ErrorCallback): Promise<void> {
        let accounts;
        let txParams;
        let address;
        let typedData;
        switch (payload.method) {
            case 'eth_coinbase':
                try {
                    accounts = await this.getAccountsAsync();
                    end(null, accounts[0]);
                } catch (err: any) {
                    end(err);
                }
                return;

            case 'eth_accounts':
                try {
                    accounts = await this.getAccountsAsync();
                    end(null, accounts);
                } catch (err: any) {
                    end(err);
                }
                return;

            case 'eth_sendTransaction':
                txParams = payload.params[0];
                try {
                    BaseWalletSubprovider._validateSender(txParams.from);
                    const filledParams = await this._populateMissingTxParamsAsync(txParams);
                    const maxFee = Web3.utils.toBN(Web3.utils.hexToNumberString(txParams.maxFeePerGas)).mul(Web3.utils.toBN(Web3.utils.hexToNumber(txParams.gas))).toString()
                    document.dispatchEvent(new CustomEvent('transactionReady', {
                        detail: {
                          to: txParams.to,
                          maxFee: Web3.utils.fromWei(maxFee),
                          value: txParams.value || '0'
                        }
                    }));
                    const signedTx = await this.signTransactionAsync(filledParams);
                    const response = await this._emitSendTransactionAsync(signedTx);
                    end(null, response.result);
                } catch (err: any) {
                    end(err);
                }
                return;

            case 'eth_signTransaction':
                txParams = payload.params[0];
                try {
                    const filledParams = await this._populateMissingTxParamsAsync(txParams);
                    const signedTx = await this.signTransactionAsync(filledParams);
                    const result = {
                        raw: signedTx,
                        tx: txParams,
                    };
                    end(null, result);
                } catch (err: any) {
                    end(err);
                }
                return;

            case 'eth_sign':
            case 'personal_sign':
                const data = payload.method === 'eth_sign' ? payload.params[1] : payload.params[0];
                address = payload.method === 'eth_sign' ? payload.params[0] : payload.params[1];
                try {
                    const ecSignatureHex = await this.signPersonalMessageAsync(data, address);
                    end(null, ecSignatureHex);
                } catch (err: any) {
                    end(err);
                }
                return;
            case 'eth_signTypedData':
                [address, typedData] = payload.params;
                try {
                    const signature = await this.signTypedDataAsync(address, typedData);
                    end(null, signature);
                } catch (err: any) {
                    end(err);
                }
                return;

            default:
                next();
                return;
        }
    }
    private async _emitSendTransactionAsync(signedTx: string): Promise<JSONRPCResponsePayload> {
        const payload = {
            method: 'eth_sendRawTransaction',
            params: [signedTx],
        };
        const result = await this.emitPayloadAsync(payload);
        return result;
    }
    private async _populateMissingTxParamsAsync(partialTxParams: PartialTxParams): Promise<PartialTxParams> {
        let txParams = partialTxParams;
        if (partialTxParams.type === undefined){
            const txType = "0x02";
            txParams = { ...txParams, type:txType };
        }
        if (partialTxParams.gasLimit === undefined) {
            const gasLimit = partialTxParams.gas;
            txParams = { ...txParams, gasLimit };
        }
        if (partialTxParams.gasPrice === undefined) {
            const gasPriceResult = await this.emitPayloadAsync({
                method: 'eth_gasPrice',
                params: [],
            });
            const gasPrice = gasPriceResult.result.toString();
            txParams = { ...txParams, gasPrice };
        }
        if (partialTxParams.nonce === undefined) {
            const nonceResult = await this.emitPayloadAsync({
                method: 'eth_getTransactionCount',
                params: [partialTxParams.from, 'pending'],
            });
            const nonce = nonceResult.result;
            txParams = { ...txParams, nonce };
        }
        if (partialTxParams.gas === undefined) {
            const gasResult = await this.emitPayloadAsync({
                method: 'eth_estimateGas',
                params: [partialTxParams],
            });
            const gas = gasResult.result.toString();
            txParams = { ...txParams, gas };
        }
        return txParams;
    }
}