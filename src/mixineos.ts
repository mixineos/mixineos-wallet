import "./styles.css"
import { Api } from 'eosjs/dist/eosjs-api';
import { JsSignatureProvider } from "eosjs/dist/eosjs-jssig";
import { JsonRpc } from "eosjs/dist/eosjs-jsonrpc";
import { binaryToDecimal } from 'eosjs/dist/eosjs-numeric'
import { SerialBuffer, serializeActionData, hexToUint8Array } from 'eosjs/dist/eosjs-serialize'
import { v4 } from 'uuid';
import Swal from 'sweetalert2'
import * as QRCode from 'qrcode'

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
    DEBUG_SIGNER_NODES
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
    threshold: number;
    signers: any;
    payment_canceled: boolean;
    client_id: string;
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
        node_url,
        client_id,
        mainContract,
        mixinWrapTokenContract,
        contractProcessId,
        members,
        debug = false
    } : {
        node_url: string;
        client_id: string;
        mainContract: string;
        mixinWrapTokenContract: string;
        contractProcessId: string;
        members: string[];
        debug?: boolean;
    }) {
        const signatureProvider = new JsSignatureProvider([]);
        
        this.jsonRpc = new JsonRpc(node_url);
        this.api = new Api({
            rpc: this.jsonRpc, signatureProvider, chainId: CHAIN_ID, textDecoder: new TextDecoder(), textEncoder: new TextEncoder()
        });
        this.threshold = 0;
        this.payment_canceled = false;
        this.client_id = client_id;
        this.mainContract = mainContract;
        this.mixinWrapTokenContract = mixinWrapTokenContract;
        this.contractProcessId = contractProcessId;
        this.members = members;
        this.show_qrcode = false;
        this.start = false;

        this.signer_urls = null;
        this.debug = debug;

        this.isRequestingAuthorization = false;
    }

    _requestPayment = async (payment: any) => {
        let ret: any;
        const paymentUrl = 'https://mixin-api.zeromesh.net/payments';
        const r = await fetch(paymentUrl, {
            method: "POST",
            headers: {
                "Content-type": "application/json",
                'Authorization' : 'Bearer ' + await this.getAccessToken(),
                // "X-Request-Id": v4()
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

    requestPayment = async (asset_id: string, amount: string, memo: string, trace_id: string = "") => {
        if (!trace_id) {
            trace_id = v4();
        }
        var payment = {
            "asset_id": asset_id,
            "amount": amount,
            "trace_id": trace_id,
            "memo": memo,
            "opponent_multisig": {
                "receivers": this.members,
                "threshold": Math.trunc(this.members.length * 2 / 3 + 1)
            }
        }
        console.log("++++++++payment:", payment);

        const ret2 = await this._requestPayment(payment);
        console.log("+++++++++payment return:", ret2);
        // TODO check error details
        if (ret2.error) {
            throw new Error(ret2.error);
        }
        return ret2.data;
    }

    _requestTransferPayment = async (trace_id: string, asset_id: string, amount: string, memo: string) => {
        // const signer_urls = signers.map((x:any) => x.url);
        // await this.prepare();
        let payment: any = null;
        for (var i=0;i<3;i++) {
            try {
                payment = await this.requestPayment(asset_id, amount, memo, trace_id);
                break;
            } catch (e) {
                console.error(e);
            }

            if (this.isCanceled()) {
                console.log('payment canceled');
                throw new Error('canceled');
            }
            await delay(1000);
        }
        if (!payment) {
            throw new Error("payment request failed!");
        }

        var pay_link = `mixin://codes/${payment.code_id}`;
        console.log('+++payment link:', pay_link);
        if (mobileAndTabletCheck() && !this.show_qrcode) {
            this.showPaymentCheckingReminder().then((value) => {
                if (value) {
                    this.cancel();
                }
            });
            window.open(pay_link, "_blank");
        } else {
            this._showPaymentQrcode(pay_link);
        }

        var paid = false;
        for (var i=0;i<90;i++) {
            await delay(1000);
            if (this.isCanceled()) {
                return false;
            }
            payment = await this.requestPayment(asset_id, amount, memo, trace_id);
            if (payment.error) {
                continue;
            }
            if (payment.status === 'paid') {
                paid = true;
                console.log("++++++paid", payment);
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
        if (this.debug) {
            this.signer_urls = DEBUG_SIGNER_NODES;
        } else {
            this.signer_urls = this.signers.map((x: any) => x.url);
        }
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
            text: '正在等待确认...',
            imageUrl: 'https://mixineos.uuos.io/1488.png',
            imageWidth: 60,
            imageHeight: 60,
            imageAlt: 'image',
            allowOutsideClick: false,
            allowEscapeKey: false,
        })
    }

    _showPaymentQrcode = async (payment_link: string) => {
        let qrcodeUrl = await QRCode.toDataURL(payment_link);
        let ret = await Swal.fire({
            text: '正在等待确认...',
            imageUrl: qrcodeUrl,
            confirmButtonText: '取消',
        });
        if (ret.isConfirmed) {
            await this.cancel();
        }
    }

    getBalance = async (account: string, symbol: string) => {
        try {
            const r = await this.jsonRpc.get_currency_balance('mixinwtokens', account, symbol);
            if (r.length === 0) {
                return 0.0;
            }
            // console.log(r);
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
            // console.log('+++my profile:', r2);
            if (r2.error && r2.error.code == 401) {
                //{error: {status: 202, code: 401, description: "Unauthorized, maybe invalid token."}} (eosjs-multisig_wallet.js, line 47304)
                await this.requestAuthorization();
                return "";
            }
            // console.log("++++++got user_id:", r2.data.user_id);
            localStorage.setItem('user_id', r2.data.user_id);
            return r2.data.user_id;
        } catch (e) {
            console.error(e);
            // await this.requestAuthorization();
        }

        return "";
    }

    getUserId = async () => {
        // console.log("++++++=getUserId");
        if (window.location.pathname === '/auth') {
            while(true) {
                console.log("++++++++getUserId: onAuth...");
                await delay(1000);
            }
            return "";
        }
        let ret = await this._getUserId();
        // if (!window.wallet.identity) {
        //     window.wallet.getIdentity();
        // }
        return ret;
    }

    _getBindAccount = async (user_id: string) => {
        const _user_id = replaceAll(user_id, "-", "");
        let user_id_dec = binaryToDecimal(fromHexString(_user_id));
        var params = {
            json: true,
            code: this.mainContract,
            scope: this.mainContract,
            table: 'bindaccounts',
            lower_bound: user_id_dec,
            upper_bound: user_id_dec,
            limit: 1,
            key_type: 'i128',
            index_position: '2',
            reverse :  false,
            show_payer :  false
        }
        var r = await this.jsonRpc.get_table_rows(params);
        console.log("+++get table: bindaccounts:", r); 
    
        if (r.rows.length !== 0) {
            const account = r.rows[0].eos_account;
            console.log("+++++++++account:", account);
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


        localStorage.setItem('href_save', window.location.href);
        const scope = 'PROFILE:READ';
        const challenge = generateChallenge();
        const url = `https://mixin-www.zeromesh.net/oauth/authorize?client_id=${this.client_id}&scope=${scope}&response_type=code&code_challenge=${challenge}`;
        window.location.replace(url);

        while (true) {
            console.log('zzz...');
            await delay(1000);
        }
    }

    onAuth = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const authorizationCode = urlParams.get('code');
        if (!authorizationCode) {
            console.log("+++++++=bad request");
            return;
        }
        console.log("++++++++++authorizationCode:", authorizationCode, this.client_id);
        var args = {
            "client_id": this.client_id,
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
        localStorage.setItem('access_token', ret2.data.access_token);
        await this._getUserId();
        let account = await this.getEosAccount();
        if (!account) {
            let ret = await Swal.fire({
                title: '你还没有EOS账号，需要创建吗?',
                showDenyButton: true,
                confirmButtonText: '确定',
                denyButtonText: `取消`,
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
            window.location.replace(window.location.origin);
        }
    }

    _buildMemo = async (extra: Uint8Array | null = null) => {
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
        return base64UrlEncodeUInt8Array(buffer.asUint8Array());
    }
    
    _pushAction = async (account: string, actionName: string, args: any) => {
        if (account != this.mixinWrapTokenContract) {
            throw Error(`Invalid account name ${account}`);
        }
        let buffer = new SerialBuffer();

        buffer.pushName(account);
        buffer.pushName(actionName);

        // this.jsonRpc.
        const contract = await this.api.getContract(account);

        let hexData = serializeActionData(contract, account, actionName, args, buffer.textEncoder, buffer.textDecoder);
        let rawData = hexToUint8Array(hexData);
        buffer.pushArray(rawData);
        let rawAction = buffer.asUint8Array();
        let memo = await this._buildMemo(rawAction);

        let asset_id;
        let quantity = args.quantity.split(' ');
        let amount = quantity[0];
        let trace_id = v4();
        let symbol = quantity[1];
        asset_id = assetMap[symbol];
        if (!asset_id) {
            throw Error(`Invalid Symbol ${symbol}`);
        }
        return await this._requestTransferPayment(trace_id, asset_id, amount, memo);
    }

    pushAction = async (account: string, actionName: string, data: any, call_finish: boolean=true) => {
        await this.prepare();
        try {
            const ret = await this._pushAction(account, actionName, data);
            if (ret) {
                Swal.fire('付款成功!');
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

    createEosAccount = async () => {
        await this.prepare();
        try {
            let asset_id = "6cfe566e-4aad-470b-8c9a-2fd35b49c68d";
            let amount = "0.0886";
            let memo = await this._buildMemo();
            let trace_id = v4();
            await this._requestTransferPayment(trace_id, asset_id, amount, memo);
            Swal.fire('付款成功!');
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
            return await this.onAuth();
        }

        const user_id = await this.getUserId();
        console.log("+++++++++++user_id:", user_id);
        if (!user_id) {
            return;
        }
        let account = await this.getEosAccount();
        if (!account) {
            let ret = await Swal.fire({
                title: '你还没有EOS账号，需要创建吗?',
                showDenyButton: true,
                confirmButtonText: '确定',
                denyButtonText: `取消`,
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
