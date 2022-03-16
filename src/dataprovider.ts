import { JsSignatureProvider } from "eosjs/dist/eosjs-jssig";
import { JsonRpc } from "eosjs/dist/eosjs-jsonrpc";
import { Api } from 'eosjs/dist/eosjs-api';
import { arrayToHex, hexToUint8Array } from 'eosjs/dist/eosjs-serialize'
import { binaryToDecimal } from 'eosjs/dist/eosjs-numeric'
import { createHash } from "sha256-uint8array"
import { CHAIN_ID } from "./constants"
import { delay } from "./utils";

interface DataProvider {
    get(hash: string): Promise<string>
    post(nonce: number, data: Uint8Array): Promise<boolean>
    getDataUrl(data: Uint8Array): Promise<string>
}

class ExtraDataProvider implements DataProvider {
    dataServerUrl: string;

    constructor({
        dataServerUrl,
    }:
    {
        dataServerUrl: string
    }) {
        this.dataServerUrl = dataServerUrl;
    }

    async get(hash: string) {
        return "";
    }

    async post(nonce: number, data: Uint8Array) {
        let body = JSON.stringify({
            nonce: nonce,
            extra: arrayToHex(data)
        });
        const r = await fetch(`${this.dataServerUrl}/push`, {
            method: "POST",
            headers: {
                "Content-type": "application/json",
            },
            body: body,
        });
        let r2 = await r.json();
        if (r2.data) {
            return true
        }
        return false
    }

    async getDataUrl(data: Uint8Array) {
        const hash = createHash().update(data).digest();
        let h = arrayToHex(hash);
        return `eos://${h}`
    }
}

export { DataProvider, ExtraDataProvider }