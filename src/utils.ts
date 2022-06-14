// Source from 0x/Subproviders

import HDNode = require('hdkey');
import ethUtil, { addHexPrefix, isValidChecksumAddress, stripHexPrefix } from 'ethereumjs-util';
import * as _ from 'lodash';

import { DerivedHDKeyInfo } from './types';

const BASIC_ADDRESS_REGEX = /^(0x)?[0-9a-f]{40}$/i;
const SAME_CASE_ADDRESS_REGEX = /^(0x)?([0-9a-f]{40}|[0-9A-F]{40})$/;
const ADDRESS_LENGTH = 40;

const DEFAULT_ADDRESS_SEARCH_LIMIT = 1000;

class DerivedHDKeyInfoIterator implements IterableIterator<DerivedHDKeyInfo> {
    private readonly _parentDerivedKeyInfo: DerivedHDKeyInfo;
    private readonly _searchLimit: number;
    private _index: number;

    constructor(initialDerivedKey: DerivedHDKeyInfo, searchLimit: number = DEFAULT_ADDRESS_SEARCH_LIMIT) {
        this._searchLimit = searchLimit;
        this._parentDerivedKeyInfo = initialDerivedKey;
        this._index = 0;
    }

    public next(): IteratorResult<DerivedHDKeyInfo> {
        const baseDerivationPath = this._parentDerivedKeyInfo.baseDerivationPath;
        const derivationIndex = this._index;
        const fullDerivationPath = `m/${baseDerivationPath}/${derivationIndex}`;
        const path = `m/${derivationIndex}`;
        const hdKey = this._parentDerivedKeyInfo.hdKey.derive(path);
        const address = walletUtils.addressOfHDKey(hdKey);
        const derivedKey: DerivedHDKeyInfo = {
            address,
            hdKey,
            baseDerivationPath,
            derivationPath: fullDerivationPath,
        };
        const isDone = this._index === this._searchLimit;
        this._index++;
        return {
            done: isDone,
            value: derivedKey,
        };
    }

    public [Symbol.iterator](): IterableIterator<DerivedHDKeyInfo> {
        return this;
    }
}

export const walletUtils = {
    calculateDerivedHDKeyInfos(parentDerivedKeyInfo: DerivedHDKeyInfo, numberOfKeys: number): DerivedHDKeyInfo[] {
        const derivedKeys: DerivedHDKeyInfo[] = [];
        const derivedKeyIterator = new DerivedHDKeyInfoIterator(parentDerivedKeyInfo, numberOfKeys);
        for (const key of derivedKeyIterator) {
            derivedKeys.push(key);
        }
        return derivedKeys;
    },
    findDerivedKeyInfoForAddressIfExists(
        address: string,
        parentDerivedKeyInfo: DerivedHDKeyInfo,
        searchLimit: number,
    ): DerivedHDKeyInfo | undefined {
        const lowercaseAddress = address.toLowerCase();
        let matchedKey: DerivedHDKeyInfo | undefined;
        const derivedKeyIterator = new DerivedHDKeyInfoIterator(parentDerivedKeyInfo, searchLimit);
        for (const key of derivedKeyIterator) {
            if (key.address === lowercaseAddress) {
                matchedKey = key;
                break;
            }
        }
        return matchedKey;
    },
    addressOfHDKey(hdKey: HDNode): string {
        const shouldSanitizePublicKey = true;
        const derivedPublicKey = hdKey.publicKey;
        const ethereumAddressUnprefixed = ethUtil
            .publicToAddress(derivedPublicKey, shouldSanitizePublicKey)
            .toString('hex');
        const address = ethUtil.addHexPrefix(ethereumAddressUnprefixed).toLowerCase();
        return address;
    },
};

export const addressUtils = {
    isChecksumAddress(address: string): boolean {
        return isValidChecksumAddress(address);
    },
    isAddress(address: string): boolean {
        if (!BASIC_ADDRESS_REGEX.test(address)) {
            // Check if it has the basic requirements of an address
            return false;
        } else if (SAME_CASE_ADDRESS_REGEX.test(address)) {
            // If it's all small caps or all all caps, return true
            return true;
        } else {
            // Otherwise check each case
            const isValidChecksummedAddress = addressUtils.isChecksumAddress(address);
            return isValidChecksummedAddress;
        }
    },
    padZeros(address: string): string {
        return addHexPrefix(_.padStart(stripHexPrefix(address), ADDRESS_LENGTH, '0'));
    }
};