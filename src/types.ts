// Source from 0x/Subproviders
import HDNode from 'hdkey';

export interface JSONRPCRequestPayload {
    params: any[];
    method: string;
    id: number;
    jsonrpc: string;
}

/**
 * Elliptic Curve signature
 */
 export interface ECSignature {
    v: number;
    r: string;
    s: string;
}

export interface ECSignatureString {
    v: string;
    r: string;
    s: string;
}

/**
 * addressSearchLimit: The maximum number of addresses to search through, defaults to 1000
 * numAddressesToReturn: Number of addresses to return from 'eth_accounts' call
 * shouldAskForOnDeviceConfirmation: Whether you wish to prompt the user on their Ledger
 *                                   before fetching their addresses
 */
export interface AccountFetchingConfigs {
    addressSearchLimit?: number;
    numAddressesToReturn?: number;
    shouldAskForOnDeviceConfirmation?: boolean;
}

/**
 * mnemonic: The string mnemonic seed
 * addressSearchLimit: The maximum number of addresses to search through, defaults to 1000
 * baseDerivationPath: The base derivation path (e.g 44'/60'/0'/0)
 */
export interface MnemonicWalletSubproviderConfigs {
    mnemonic: string;
    addressSearchLimit?: number;
    baseDerivationPath?: string;
}

export interface SignatureData {
    hash: string;
    r: string;
    s: string;
    v: number;
}

export interface PartialTxParams {
    nonce: string;
    // gasPrice?: string;
    maxPriorityFeePerGas?: string;
    maxFeePerGas?: string;
    gasLimit?: string;
    gasPrice?: string;
    gas: string;
    to: string;
    from: string;
    value?: string;
    data?: string;
    type?: string;
    v?: string;      // EIP155 bits for signature
    chainId: number; // EIP 155 chainId - mainnet: 1, ropsten: 3
}

export type DoneCallback = (err?: Error) => void;

export interface ResponseWithTxParams {
    raw: string;
    tx: PartialTxParams;
}

export enum WalletSubproviderErrors {
    AddressNotFound = 'ADDRESS_NOT_FOUND',
    DataMissingForSignPersonalMessage = 'DATA_MISSING_FOR_SIGN_PERSONAL_MESSAGE',
    DataMissingForSignTypedData = 'DATA_MISSING_FOR_SIGN_TYPED_DATA',
    SenderInvalidOrNotSupplied = 'SENDER_INVALID_OR_NOT_SUPPLIED',
    FromAddressMissingOrInvalid = 'FROM_ADDRESS_MISSING_OR_INVALID',
    MethodNotSupported = 'METHOD_NOT_SUPPORTED',
}
export enum NonceSubproviderErrors {
    EmptyParametersFound = 'EMPTY_PARAMETERS_FOUND',
    CannotDetermineAddressFromPayload = 'CANNOT_DETERMINE_ADDRESS_FROM_PAYLOAD',
}
export interface DerivedHDKeyInfo {
    address: string;
    baseDerivationPath: string;
    derivationPath: string;
    hdKey: HDNode;
}

export type ErrorCallback = (err: Error | null, data?: any) => void;
export type Callback = () => void;
export type OnNextCompleted = (err: Error | null, result: any, cb: Callback) => void;
export type NextCallback = (callback?: OnNextCompleted) => void;

export interface JSONRPCRequestPayloadWithMethod extends JSONRPCRequestPayload {
    method: string;
}

/**
 * addressSearchLimit: The maximum number of addresses to search through, defaults to 1000
 * numAddressesToReturn: Number of addresses to return from 'eth_accounts' call
 * shouldAskForOnDeviceConfirmation: Whether you wish to prompt the user on their Ledger
 *                                   before fetching their addresses
 */
 export interface AccountFetchingConfigs {
    addressSearchLimit?: number;
    numAddressesToReturn?: number;
    shouldAskForOnDeviceConfirmation?: boolean;
}

export interface DerivedHDKeyInfo {
    address: string;
    baseDerivationPath: string;
    derivationPath: string;
    hdKey: HDNode;
}

export interface TrezorSubproviderConfig {
    accountFetchingConfigs: AccountFetchingConfigs;
    trezorConnectClientApi: any;
    networkId: number;
}

export interface TrezorGetPublicKeyResponsePayload {
    path: {
        [index: number]: number;
    };
    serializedPath: string;
    childNumb: number;
    xpub: string;
    chainCode: string;
    publicKey: string;
    fingerprint: number;
    depth: number;
}

export interface TrezorSignTxResponsePayload {
    v: string;
    r: string;
    s: string;
}

export interface TrezorSignMsgResponsePayload {
    address: string;
    signature: string;
}

export interface TrezorResponseErrorPayload {
    error: string;
}

export interface TrezorConnectResponse {
    payload: any;
    id: number;
    success: boolean;
}