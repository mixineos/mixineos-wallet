import { arrayToHex } from 'eosjs/dist/eosjs-serialize'
import { createHash } from "sha256-uint8array"

interface DataProvider {
    push(nonce: number, data: Uint8Array): Promise<boolean>
    getDataUrl(data: Uint8Array): Promise<string>
}

class HttpExtraDataProvider implements DataProvider {
    dataServerUrl: string;

    constructor({
        dataServerUrl,
    }:
    {
        dataServerUrl: string
    }) {
        this.dataServerUrl = dataServerUrl;
    }

    async push(nonce: number, data: Uint8Array) {
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
        return `${this.dataServerUrl}/pull`
    }
}

class EosExtraDataProvider implements DataProvider {
    dataServerUrl: string;

    constructor({
        dataServerUrl,
    }:
    {
        dataServerUrl: string
    }) {
        this.dataServerUrl = dataServerUrl;
    }

    async push(nonce: number, data: Uint8Array) {
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

export { DataProvider, EosExtraDataProvider, HttpExtraDataProvider }
