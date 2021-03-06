import { Api } from 'eosjs/dist/eosjs-api';
import { JsSignatureProvider } from "eosjs/dist/eosjs-jssig";
import { JsonRpc } from "eosjs/dist/eosjs-jsonrpc";
import { binaryToDecimal, decimalToBinary } from 'eosjs/dist/eosjs-numeric'
import { SerialBuffer, serializeActionData, arrayToHex, hexToUint8Array } from 'eosjs/dist/eosjs-serialize'
import { createHash } from "sha256-uint8array"
import * as uuid from 'uuid';
import Swal from 'sweetalert2'
import * as QRCode from 'qrcode'

import { tr, changeLang } from "./lang"
import Authorization from './authorization';
import { DataProvider, EosExtraDataProvider } from "./dataprovider"

import {
    replaceAll,
    base64UrlEncodeUInt8Array,
    generateChallenge,
    mobileAndTabletCheck,
    delay,
    fromHexString,
} from './utils'

import {
    CHAIN_ID,
    OAUTH_URL,
} from "./constants";


declare let window: any;

export type Item = {
    [key: string]: string
}

export const assetMap: Item = {
    "MEOS": "6cfe566e-4aad-470b-8c9a-2fd35b49c68d",
    "MXIN": "c94ac88f-4671-3976-b60a-09064f1811e8",
    "METH": "43d61dcd-e413-450d-80b8-101d5e903357"
}

class MixinEos {
    api: Api;
    jsonRpc: JsonRpc;
    dataProvider: DataProvider;
    threshold: number;
    signers: any;
    payment_canceled: boolean;
    appId: string;
    mainContract: string;
    mixinWrapTokenContract: string;
    contractProcessId: string;
    members: string[];
    show_qrcode: boolean;
    start: boolean;

    signer_urls: string[];
    debug: boolean;

    isRequestingAuthorization: boolean;

    constructor({
        eosRpcUrl,
        dataProvider,
        appId,
        mainContract,
        mixinWrapTokenContract,
        contractProcessId,
        members,
        lang,
        debug = false
    } : {
        eosRpcUrl: string;
        dataProvider: DataProvider | null;
        appId: string;
        mainContract: string;
        mixinWrapTokenContract: string;
        contractProcessId: string;
        members: string[];
        lang: string,
        debug?: boolean;
    }) {
        const signatureProvider = new JsSignatureProvider([]);
        
        this.jsonRpc = new JsonRpc(eosRpcUrl);
        this.dataProvider = dataProvider;
        this.api = new Api({
            rpc: this.jsonRpc, signatureProvider, chainId: CHAIN_ID, textDecoder: new TextDecoder(), textEncoder: new TextEncoder()
        });
        this.threshold = 0;
        this.payment_canceled = false;
        this.appId = appId;
        this.mainContract = mainContract;
        this.mixinWrapTokenContract = mixinWrapTokenContract;
        this.contractProcessId = contractProcessId;
        this.members = members;
        this.show_qrcode = false;
        this.start = false;

        this.debug = debug;
        changeLang(lang);

        this.isRequestingAuthorization = false;
    }

    codeId: string = "";
    authFinished: boolean = false;
    authorize(clientId: string, scope: string, codeChallenge: string, state: string) {
        this.authFinished = false;
        const auth = new Authorization();
        auth.connect((resp: any) => {
            if (this.authFinished) {
                return true;
            }

            if (resp.error) {
                return false;
            }

            const data = resp.data;
            if (!data) {
                return false;
            }

            if (data.authorization_code.length > 16) {
                // handle data.authorization_code here
                this.onAuth(data.authorization_code);
                return true;
            }

            if (this.codeId == data.code_id) {
                return false;
            }
            this.codeId = data.code_id;

            let url = 'https://mixin.one/codes/' + data.code_id;
            if (mobileAndTabletCheck()) {
                window.open(url, "_blank");
            } else {
                (async () => {
                    console.log("++++++++url:", url);
                    let qrcodeUrl = await QRCode.toDataURL(url);
                    let ret = await Swal.fire({
                        text: tr("Use Mixin on your phone to scan the code"),
                        imageUrl: qrcodeUrl,
                        showConfirmButton: true,
                        confirmButtonText: tr("Cancel"),
                    });
                    if (ret.isDismissed || ret.isConfirmed) {
                        this.authFinished = true;
                    }
                })();
            }
          return false
        }, clientId, scope, codeChallenge);
    }

    getTableRows = async (table: string, lowerBound: string, upperBound: string, limit: number=1, keyType: string = "i64", indexPosition: string="1") => {
        var params = {
            json: true,
            code: this.mainContract,
            scope: this.mainContract,
            table: table,
            lower_bound: lowerBound,
            upper_bound: upperBound,
            limit: limit,
            key_type: keyType,
            index_position: indexPosition,
            reverse :  false,
            show_payer :  false
        }
        return await this.jsonRpc.get_table_rows(params);
    }

    _requestPayment = async (payment: any) => {
        let ret: any;
        const paymentUrl = 'https://mixin-api.zeromesh.net/payments';
        const r = await fetch(paymentUrl, {
            method: "POST",
            headers: {
                "Content-type": "application/json",
                'Authorization' : 'Bearer ' + await this.getAccessToken(),
                // "X-Request-Id": uuid.v4()
            },
            body: JSON.stringify(payment),
        });
        ret = await r.json();
        
        if (ret.error && ret.error.code == 401) {
            //{error: {status: 202, code: 401, description: "Unauthorized, maybe invalid token."}} (eosjs-multisig_wallet.js, line 47304)
            await this.requestAuthorization();
            return "";
        }
        return ret;
    }

    requestPayment = async (asset_id: string, amount: string, memo: string, traceId: string = "") => {
        if (!traceId) {
            traceId = uuid.v4();
        }
        var payment = {
            "asset_id": asset_id,
            "amount": amount,
            "trace_id": traceId,
            "memo": memo,
            "opponent_multisig": {
                "receivers": this.members,
                "threshold": Math.trunc(this.members.length * 2 / 3 + 1)
            }
        }
        const ret2 = await this._requestPayment(payment);
        if (ret2.error) {
            throw new Error(JSON.stringify(ret2));
        }
        return ret2.data;
    }

    _requestTransferPayment = async (traceId: string, asset_id: string, amount: string, memo: string) => {
        let payment: any = null;
        for (var i=0;i<3;i++) {
            try {
                payment = await this.requestPayment(asset_id, amount, memo, traceId);
                break;
            } catch (e) {
                console.error("+++++payment error:", e);
            }

            if (this.isCanceled()) {
                throw new Error('canceled');
            }
            await delay(1000);
        }
        if (!payment) {
            throw new Error("payment request failed!");
        }

        var payLink = `mixin://codes/${payment.code_id}`;
        if (mobileAndTabletCheck() && !this.show_qrcode) {
            this.showPaymentCheckingReminder().then((value) => {
                if (value) {
                    this.cancel();
                }
            });
            window.open(payLink, "_blank");
        } else {
            this._showPaymentQrcode(payLink);
        }

        var paid = false;
        for (var i=0;i<90;i++) {
            await delay(1000);
            if (this.isCanceled()) {
                return false;
            }
            payment = await this.requestPayment(asset_id, amount, memo, traceId);
            if (payment.error) {
                continue;
            }
            if (payment.status === 'paid') {
                paid = true;
                break;
            }
        };
    
        if (!paid) {
            return false;
        }
        return true;
    }
    
    prepare = async () => {
        if (this.start) {
            console.trace('call prepare more than once!');
        }
        this.start = true;
        this.payment_canceled = false;
        this.signers = this.members;
    }

    cancel = () => {
        this.payment_canceled = true;
    }

    isCanceled = () => {
        return this.payment_canceled;
    }

    finish = () => {
        this.start = false;
        Swal.close();
    }

    closeAlert = () => {
        Swal.close();
    }
    
    showPaymentCheckingReminder = () => {
        return Swal.fire({
            title: '',
            text: tr("Awaiting confirmation..."),
            imageUrl: 'https://mixineos.uuos.io/1488.png',
            imageWidth: 60,
            imageHeight: 60,
            imageAlt: 'image',
            allowOutsideClick: false,
            allowEscapeKey: false,
            confirmButtonText: tr("Cancel"),
        })
    }

    _showPaymentQrcode = async (payment_link: string) => {
        let qrcodeUrl = await QRCode.toDataURL(payment_link);
        let ret = await Swal.fire({
            text: tr("Awaiting confirmation..."),
            imageUrl: qrcodeUrl,
            confirmButtonText: tr("Cancel"),
        });
        if (ret.isConfirmed || ret.isDismissed) {
            await this.cancel();
        }
    }

    getBalance = async (account: string, symbol: string) => {
        try {
            const r = await this.jsonRpc.get_currency_balance(this.mixinWrapTokenContract, account, symbol);
            if (r.length === 0) {
                return 0.0;
            }
            return parseFloat(r[0].split(' ')[0]);
        } catch(e) {
            console.log(e);
            return 0.0;
        }
    }

    _getUserId = async () => {
        const access_token = await this.getAccessToken();
        if (!access_token) {
            return "";
        }
        try {
            const r = await fetch("https://mixin-api.zeromesh.net/me", {
                method: "GET",
                headers: {
                    "Content-type": "application/json",
                    'Authorization' : 'Bearer ' + access_token,
                }
            });
            const r2 = await r.json();
            if (r2.error && r2.error.code == 401) {
                await this.requestAuthorization();
                return "";
            }
            localStorage.setItem('user_id', r2.data.user_id);
            return r2.data.user_id;
        } catch (e) {
            console.error(e);
        }

        return "";
    }

    getUserId = async () => {
        if (window.location.pathname === '/auth') {
            while(true) {
                console.log("++++++++getUserId: onAuth...");
                await delay(1000);
            }
            return "";
        }
        let ret = await this._getUserId();
        return ret;
    }

    _getBindAccount = async (user_id: string) => {
        const _user_id = replaceAll(user_id, "-", "");
        let user_id_dec = binaryToDecimal(fromHexString(_user_id));
        let r = await this.getTableRows('bindaccounts', user_id_dec, user_id_dec, 1, 'i128', '2');    
        if (r.rows.length !== 0) {
            const account = r.rows[0].eos_account;
            localStorage.setItem('binded_account', account);
            return account;
        }
        return "";
    }

    getEosAccount = async () => {
        let user_id = localStorage.getItem('user_id') as any;
        if (!user_id) {
            user_id = await this.getUserId();
            localStorage.setItem('binded_account', "");
        }

        let account = localStorage.getItem('binded_account') as any;
        if (account) {
            return account;
        }
    
        return this._getBindAccount(user_id);
    }

    requestAuthorization = async () => {
        localStorage.setItem('access_token', "");
        localStorage.setItem('user_id', "");
        localStorage.setItem('binded_account', "");

        if (this.isRequestingAuthorization) {
            return;
        }
        this.isRequestingAuthorization = true;


        // localStorage.setItem('href_save', window.location.href);
        // const scope = 'PROFILE:READ';
        // const challenge = generateChallenge();
        // const url = `https://mixin-www.zeromesh.net/oauth/authorize?client_id=${this.client_id}&scope=${scope}&response_type=code&code_challenge=${challenge}`;
        // window.location.replace(url);

        // while (true) {
        //     console.log('zzz...');
        //     await delay(1000);
        // }

        const scope = 'PROFILE:READ';
        const codeChallenge = generateChallenge();
        this.authorize(this.appId, scope, codeChallenge, "")
    }

    onAuth = async (authorizationCode: string) => {
        if (!authorizationCode) {
            console.log("+++++++=bad request");
            return;
        }
        var args = {
            "client_id": this.appId,
            "code": authorizationCode,
            "code_verifier": localStorage.getItem("verifier")
        };
        const ret = await fetch(OAUTH_URL, {
            method: "POST",
            headers: {
                "Content-type": "application/json",
            },
            body: JSON.stringify(args),
        });
        const ret2 = await ret.json();
        console.log("++++error:", JSON.stringify(ret2));

        if (!ret2.data) {
            await this.requestAuthorization();
        }

        Swal.close();

        localStorage.setItem('access_token', ret2.data.access_token);
        await this._getUserId();
        let account = await this.getEosAccount();
        if (!account) {
            let ret = await Swal.fire({
                title: tr("text_1"),
                showDenyButton: true,
                confirmButtonText: tr("Confirm"),
                denyButtonText: tr("Cancel"),
                allowOutsideClick: false,
                allowEscapeKey: false,
            });
            if (ret.isConfirmed) {
                await this.createEosAccount();
            }
        }

        const hrefSave = localStorage.getItem('href_save');
        if (hrefSave) {
            const url = new URL(hrefSave);
            localStorage.setItem('href_save', "");
            if (url.pathname !== '/auth') {
                window.location.replace(hrefSave);    
            } else {
                window.location.replace(window.location.origin);
            }
        } else {
            //Set UAL wallet type to Scatter
            // localStorage.setItem('UALLoggedInAuthType', 'Scatter');
            window.location.replace(window.location.origin);
        }
    }

    _buildMemo = (extra: Uint8Array | null = null) => {
        let array = new Uint8Array(1024);
        let length = 0;
        
        let buffer = new SerialBuffer();
        buffer.push(0, 1); //Purpose: 1

        let id = replaceAll(this.contractProcessId, "-", "");
        let rawId = fromHexString(id);
        buffer.pushArray(rawId);

        let value = buffer.textEncoder.encode("eos");
        buffer.push((value.length >> 8) & 0xff, value.length & 0xff);
        buffer.pushArray(value); //Platform

        value = buffer.textEncoder.encode(this.mainContract);
        buffer.push((value.length >> 8) & 0xff, value.length & 0xff);
        buffer.pushArray(value);//Address

        if (extra) {
            buffer.push((extra.length >> 8) & 0xff, extra.length & 0xff);
            buffer.pushArray(extra);    
        } else {
            buffer.push(0, 0);
        }
        return buffer.asUint8Array()
    }

    _buildMemoBase64 = (data: Uint8Array | null = null) => {
        let memo = this._buildMemo(data)
        return base64UrlEncodeUInt8Array(memo);
    }

    getAssetId = async (symbol: string) => {
        let r = await this.getTableRows('mixinassets', symbol, symbol)
        if (r.rows.length == 0) {
            return null
        }
        let assetId = decimalToBinary(16, r.rows[0].asset_id);
        return uuid.stringify(assetId);
    }

    getTransferFee = async (symbol: string) => {
        let ret = await this.getTableRows('transferfees', symbol, symbol, 1)
        if (ret.rows.length == 0) {
            return 0.0;
        }
        return parseFloat(ret.rows[0].fee.split(' ')[0])
    }

    _pushAction = async (account: string, actionName: string, args: any) => {
        let buffer = new SerialBuffer();
        buffer.push(0) //data type: original
        buffer.pushName(account);
        buffer.pushName(actionName);

        const contract = await this.api.getContract(account);

        let hexData = serializeActionData(contract, account, actionName, args, buffer.textEncoder, buffer.textDecoder);
        let rawData = hexToUint8Array(hexData);
        buffer.pushArray(rawData);
        let rawAction = buffer.asUint8Array();
        let originMemo = this._buildMemo(rawAction);
        let memoBase64 = base64UrlEncodeUInt8Array(originMemo);
        let extraExceedLimit = false;
        if (memoBase64.length > 200) {
            extraExceedLimit = true;
            let memoBuffer = new SerialBuffer();
            memoBuffer.push(1) //data type: provided by data source
            const hash = createHash().update(originMemo).digest();
            memoBuffer.pushArray(hash);
            let enc = new TextEncoder();
            let rawUrl = enc.encode(await this.dataProvider.getDataUrl(originMemo));
            memoBuffer.pushArray(rawUrl)
            let newMemo = this._buildMemo(memoBuffer.asUint8Array());
            memoBase64 = base64UrlEncodeUInt8Array(newMemo);
        }

        let assetId;
        let quantity;
        let amount;
        let traceId;

        traceId = uuid.v4();
        if (account == this.mixinWrapTokenContract) {
            let symbol;
            quantity = args.quantity.split(' ');
            amount = quantity[0];
            symbol = quantity[1];
            assetId = assetMap[symbol];
            let fee = await this.getTransferFee(symbol);
            amount = (parseFloat(amount) + fee).toFixed(8)
            if (!assetId) {
                assetId = await this.getAssetId(symbol);
                if (!assetId) {
                    throw Error(`Invalid Symbol ${symbol}`);
                }
                assetMap[symbol] = assetId;
            }
        } else {
            let fee = await this.getTransferFee("MEOS")
            amount = fee.toString();
            assetId = "6cfe566e-4aad-470b-8c9a-2fd35b49c68d";
        }

        if (extraExceedLimit) {
            await this.dataProvider.push(0, originMemo);
        }
        let ret = await this._requestTransferPayment(traceId, assetId, amount, memoBase64);
        // if (extraExceedLimit) {
        //     let account = await this.getEosAccount();
        //     for (var i=0; i<20; i++) {
        //         let r = await this.getTableRows('pendingevts', account, account, 10, 'i64', '2')
        //         if (this.debug) {
        //             console.log(r);
        //         }
        //         if (r.rows.length != 0) {
        //             this.dataProvider.push(r.rows[0].event.nonce, originMemo)
        //             break;
        //         }
        //         if (this.isCanceled()) {
        //             throw new Error('canceled');
        //         }
        //         await delay(3000);
        //     }
        // }
        return ret
    }

    pushAction = async (account: string, actionName: string, data: any, call_finish: boolean=true) => {
        await this.prepare();
        try {
            const ret = await this._pushAction(account, actionName, data);
            if (ret) {
                Swal.fire(tr("Payment successful!"));
            }
            await delay(1500);
            if (call_finish) {
                this.finish();
            }
            return ret;
        } catch (e) {
            this.finish();
            throw e;
        }
    }

    pushTransaction = async (tx: any) => {
        if (tx.actions.length != 1) {
            throw Error("transaction can only contain one action.");
        }

        let action = tx.actions[0];
        // if (action.account != this.mixinWrapTokenContract) {
        //     throw Error(`action account must be ${this.mixinWrapTokenContract}`);
        // }

        if (action.authorization.length != 1) {
            throw Error("transaction can only contain one authorization.");
        }

        let auth = action.authorization[0];
        if (auth.actor != await this.getEosAccount()) {
            throw Error(`Invalid actor ${auth.actor}`);
        }

        if (auth.permission != "active") {
            throw Error(`Invalid permission ${auth.permission}`);
        }
        return await this.pushAction(action.account, action.name, action.data);
    }

    createEosAccount = async () => {
        await this.prepare();
        try {
            let asset_id = "6cfe566e-4aad-470b-8c9a-2fd35b49c68d";
            let amount = "0.0886";
            let memo = await this._buildMemoBase64();
            let traceId = uuid.v4();
            await this._requestTransferPayment(traceId, asset_id, amount, memo);
            Swal.fire(tr("Payment successful!"));
            await delay(1500);
            this.finish();
        } catch (e) {
            this.finish();
            throw e;
        }
    }

    getAccessToken = async () => {
        const access_token = localStorage.getItem('access_token');
        if (access_token) {
            return access_token;
        }
        await this.requestAuthorization();
        return "";
    }

    onLoad = async () => {
        if (window.location.pathname === '/auth') {
            const urlParams = new URLSearchParams(window.location.search);
            const authorizationCode = urlParams.get('code');    
            return await this.onAuth(authorizationCode);
        }

        const user_id = await this.getUserId();
        console.log("+++++++++++user_id:", user_id);
        if (!user_id) {
            return;
        }
        let account = await this.getEosAccount();
        if (!account) {
            let ret = await Swal.fire({
                title: tr("text_1"),
                showDenyButton: true,
                confirmButtonText: tr("Confirm"),
                denyButtonText: tr("Cancel"),
                allowOutsideClick: false,
                allowEscapeKey: false,
            });
            if (ret.isConfirmed) {
                await this.createEosAccount();
            }
        }
    }
}

export { MixinEos }
