import { supported_asset_ids, MAIN_CONTRACT, TOKEN_CONTRACT } from "./constants";

import { Api } from 'eosjs/dist/eosjs-api';
import { JsSignatureProvider } from "eosjs/dist/eosjs-jssig";
import { JsonRpc } from "eosjs/dist/eosjs-jsonrpc";
import { Signature } from "eosjs/dist/eosjs-key-conversions"
import { convertLegacyPublicKey, binaryToDecimal } from 'eosjs/dist/eosjs-numeric'

import { sha256 as eosjs_sha256 } from 'eosjs/dist/eosjs-key-conversions';


import { BigNumber } from "bignumber.js";
import { v4 } from 'uuid';
import sha256 from 'crypto-js/sha256';
import * as CryptoJS from "crypto-js";

import * as _swal from 'sweetalert';
import { SweetAlert } from 'sweetalert/typings/core';
const swal: SweetAlert = _swal as any;

import * as QRCode from 'qrcode'
import * as copy from 'copy-to-clipboard';

import {
    generateDepositTx,
    generateWithdrawTx,
    generateCreateAccountTx,
    generateBindAccountTx
} from './tx_generator'

import {
    replaceAll,
    base64URLEncode,
    generateChallenge,
    mobileAndTabletCheck,
    delay,
    fromHexString,
    toHexString,
    int2Hex
} from './utils'

declare let window: any;
declare let document: any;


const CHAIN_ID = 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906';

const CLIENT_ID = '49b00892-6954-4826-aaec-371ca165558a';
// const AUTH_SERVER = 'https://dex.uuos.io:2053'
const AUTH_SERVER = 'http://192.168.1.3:2053'

// const paymentUrl = 'https://mixin-api.zeromesh.net/payments'
// const paymentUrl = `${AUTH_SERVER}/request_payment`

const oauthUrl = "https://mixin-api.zeromesh.net/oauth/token"
const cnb_asset_id = "965e5c6e-434c-3fa9-b780-c50f43cd955c";


class MixinEos {
    api: Api;
    jsonRpc: JsonRpc;
    threshold: number;
    signers: any;
    payment_canceled: boolean;
    client_id: string;
    main_contract: any;
    multisig_perm: any;
    auth_proxy: boolean;
    show_qrcode: boolean;
    constructor(url: string, client_id: string, auth_proxy: boolean=false) {
        const signatureProvider = new JsSignatureProvider([]);

        this.jsonRpc = new JsonRpc(url);
        this.api = new Api({
            rpc: this.jsonRpc, signatureProvider, chainId: CHAIN_ID, textDecoder: new TextDecoder(), textEncoder: new TextEncoder()
        });
        this.threshold = 0;
        this.payment_canceled = false;
        this.client_id = client_id;
        this.main_contract = null;
        this.multisig_perm = null;
        this.auth_proxy = auth_proxy;
        this.show_qrcode = false;
    }

    requestSigners = async (): Promise<[number, Array<any>]> => {
        var singer_count = this.multisig_perm.required_auth.keys.length;
        var params = {
            json: true,
            code: MAIN_CONTRACT,
            scope: MAIN_CONTRACT,
            table: 'signers',
            lower_bound: '',
            upper_bound: '',
            limit: singer_count,
            key_type: 'i64',
            index_position: '2',
            reverse :  true,
            show_payer :  true
        }
        var r = await this.jsonRpc.get_table_rows(params);
        // console.log("++++++++get_table_rows:", r);
        let rows = r.rows.map((x: any) => {
            if (x.data) {
                x.data.client_id = int2Hex(x.data.client_id);
                return x.data;
            }
            x.client_id = int2Hex(x.client_id);
            return x;
        });
        // console.log('+++rows after filter out learnfortest:', rows);
    
        return rows;
    }
    
    requestReceiver = async () => {
        return this.signers.map((x:any) => x.client_id);
    }

    _requestPaymentFromProxy = async (payment: any) => {        
        const user_id = localStorage.getItem('user_id');
        const paymentUrl = `${AUTH_SERVER}/request_payment`
        const ret = await fetch(paymentUrl, {
            method: "POST",
            headers: {
                "Content-type": "application/json",
            },
            body: JSON.stringify({payment: payment, user_id: user_id}),
        });
        return await ret.json();            
    }

    _requestPayment = async (payment: any) => {
        let ret: any;
        if (this.auth_proxy) {
            ret = await this._requestPaymentFromProxy(payment);          
        } else {
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
        }
        if (ret.error && ret.error.code == 401) {
            //{error: {status: 202, code: 401, description: "Unauthorized, maybe invalid token."}} (eosjs-multisig_wallet.js, line 47304)
            await this.requestAuthorization();
            return "";
        }
        return ret;
    }

    requestPayment = async (trace_id: string, asset_id: string, amount: string, memo: string) => {
        var payment = {
            "asset_id": asset_id,
            "amount": amount,
            "trace_id": trace_id,
            "memo": memo,
            "opponent_multisig": {
                "receivers": await this.requestReceiver(),
                "threshold": this.multisig_perm.required_auth.threshold
            }
        }

        const ret2 = await this._requestPayment(payment);
        // console.log("+++++++++payment return:", ret2);
        // TODO check error details
        if (ret2.error) {
            throw Error(ret2.error);
        }
        return ret2.data;
    }
    
    request_signature = async (key_type: number, url: string, user_id: string, trace_id: string, trx: any, payment: any) => {
        for (var i=0;i<60;i++) {
            var full_url: any
            if (key_type == 0) {
                full_url = `${url}/request_signer_signature`;
            } else {
                full_url = `${url}/request_manager_signature`;
            }
            console.log("++++++url:", full_url);
            let r = await fetch(full_url, {
                method: "POST",
                headers: {
                    "Content-type": "application/json",
                },
                body: JSON.stringify({
                    user_id: user_id,
                    trace_id: trace_id,
                    trx: trx,
                    payment: payment
                }),
                // credentials: 'include'
            });
            let r2 = await r.json();
            if (r2.error) {
                return null;
            }
            if (r2.data) {
                return r2.data;
            }
            await delay(2000);
        }
        return null;
    }

    requestSignatures = (key_type: number, user_id: string, trace_id: string, transaction: any, payment: any) => {
        return new Promise((resove, reject) => {
            setTimeout(() => reject('time out'), 120000);
            let signatures: string[] = [];
            const trx = this.api.deserializeTransaction(transaction.serializedTransaction);
            console.log("++++++requestSignatures:", trx);
            let success_return = this.signers.length;
            this.signers.forEach((signer: any) => {
                const url = signer.url;
                // console.log("++++++signer url:", url);
                this.request_signature(key_type, url, user_id, trace_id, trx, payment).then(data => {
                    if (!data) {
                        success_return -= 1;
                        if (success_return < this.threshold) {
                            reject("request error");
                        }
                        return;
                    }
                    // console.log("+++++request_signature return:", data);
                    const sig = Signature.fromString(data.signatures[0]);
        //                const pub_key = sig.recover(fromHexString(tx_id), false);
                    let trx_data = CHAIN_ID;
                    // console.log("++++transaction.serializedTransaction:", transaction.serializedTransaction.constructor);
                    if (transaction.serializedTransaction instanceof Uint8Array) {
                        trx_data += toHexString(transaction.serializedTransaction);
                    } else {
                        trx_data += transaction.serializedTransaction;
                    }
                    //(transaction.serializedTransaction instanceof String)
                    // } else {
                    //     throw Error("unknown serialized transaction type");
                    // }
                    if (transaction.serializedContextFreeData) {
                        trx_data += toHexString(sha256(transaction.serializedContextFreeData));
                    } else {
                        trx_data += '0000000000000000000000000000000000000000000000000000000000000000';
                    }
                    // console.log("+++++++trx_data:", trx_data);
                    const sign_data = fromHexString(trx_data);
                    const recovered_pub_key = sig.recover(sign_data, true);
                    let pub_key;
                    if (key_type === 0) {
                        pub_key = signer.signer_key;
                    } else {
                        pub_key = signer.manager_key;
                    }
                    if (recovered_pub_key.toString() !== convertLegacyPublicKey(pub_key)) {
                        //TODO: report misbehavior of signer
                        console.error("++++++++++++bad signature:", data.signatures[0]);
                        return;
                    }

                    if (signatures.length < this.threshold) {
                        signatures.push(...data.signatures);
                    }
                    this.setReminder(`正在请求多重签名(${signatures.length}/${this.threshold})`);
                    // console.log('++++signatures is:', signatures);
                    if (signatures.length >= this.threshold) {
                        signatures.sort();
                        resove(signatures);
                    }
                }).catch(e => {
                    console.log(e);
                });
            });
        });
    }


    _requestSignatureWithTraceId = async (key_type: number, url: string, trace_id: string) => {
        for (var i=0;i<120;i++) {
            var full_url: any
            if (key_type == 0) {
                full_url = `${url}/request_signer_signature`;
            } else {
                full_url = `${url}/request_manager_signature`;
            }
            console.log("++++++url:", full_url);
            let r = await fetch(full_url, {
                method: "POST",
                headers: {
                    "Content-type": "application/json",
                },
                body: JSON.stringify({
                    trace_id: trace_id,
                }),
                // credentials: 'include'
            });
            let r2 = await r.json();
            if (r2.error) {
                return null;
            }
            if (r2.data) {
                return r2.data;
            }
            await delay(1000);
        }
        return null;
    }

    _requestSignaturesWithTraceId = (trace_id: string) => {
        return new Promise((resove, reject) => {
            let signatures: string[] = [];
            this.signers.forEach((signer: any) => {
                const url = signer.url;
                this._requestSignatureWithTraceId(1, url, trace_id).then(data => {
                    if (!data) {
                        return;
                    }
                    if (signatures.length < this.threshold) {
                        signatures.push(...data.signatures);
                    }
                    if (signatures.length >= this.threshold) {
                        signatures.sort();
                        resove(signatures);
                    }
                }).catch(e => {
                    console.log(e);
                });
            });
        });
    }

    requestSignaturesWithTraceId = async (trace_id: string) => {
        await this.prepare();
        return await this._requestSignaturesWithTraceId(trace_id)
    }
    
    prepare = async () => {
        this.payment_canceled = false;
        this.main_contract = await this.jsonRpc.get_account(MAIN_CONTRACT);
        this.multisig_perm = this.main_contract.permissions.find((x: any) => x.perm_name === 'multisig');
        this.threshold = this.multisig_perm.required_auth.threshold;
        this.signers = await this.requestSigners();
    }

    finish = () => {
        swal.close && swal.close();
    }

    closeAlert = () => {
        swal.close && swal.close();
    }
    
    showReminder = (text: string, show_progress=true) => {
        if (show_progress) {
            return swal({
                text: text,
                closeOnClickOutside: false,
                buttons: [false],
                icon:'https://mixin-www.zeromesh.net/assets/fb6f3c230cb846e25247dfaa1da94d8f.gif'
            });    
        } else {
            return swal({
                text: text,
                closeOnClickOutside: false,
                buttons: [false]
            });
        }
    }

    showConfirm = (text: string, icon: string = 'warning') => {
        return swal({
            text: text,
            closeOnClickOutside: false,
            buttons: {
                defeat: {
                    text: "确定",
                    value: "bind",
                }
            },
            icon: icon
        });
    }

    setReminder = (text: string) => {
        let elements = document.getElementsByClassName('swal-text');
        if (elements.length === 0) {
            return;
        }
        elements[0].innerHTML = text;    
    }

    showPaymentCheckingReminder = () => {
        return swal({
            text: '正在检查支付结果...',
            closeOnClickOutside: false,
            button: {
                text: "取消",
                closeModal: false,
            },
            icon:'https://mixin-www.zeromesh.net/assets/fb6f3c230cb846e25247dfaa1da94d8f.gif'
        } as any)
    }

    _sendTransaction = async (signatures: any, transaction: any) => {
        this.setReminder('正在发送...');
        const r2 = await this.jsonRpc.push_transaction({
            signatures: signatures as string[],
            compression: transaction.compression,
            serializedTransaction: transaction.serializedTransaction,
            serializedContextFreeData: transaction.serializedContextFreeData
        });
        // this.closeAlert();

        this.setReminder('发送成功...');
        await delay(1000);
        // setTimeout(() => {
        //     this.closeAlert();
        // }, 2000);
        return r2;
    }

    _requestDeposit = async (account: string, amount: string, user_id: string, token_name: string) => {
        await this.prepare();

        const trace_id = v4();
    //   const asset_id = '965e5c6e-434c-3fa9-b780-c50f43cd955c';
    //   const token_name = supported_mixin_ids[asset_id];
        const asset_id = supported_asset_ids[token_name];

        if (!asset_id) {
            throw Error("asset id not supported currently");
        }
        const [tx, transaction] = await generateDepositTx(this.api, account, amount, token_name, user_id, asset_id);

        const expiration = tx.expiration
        const ref_block_num = tx.ref_block_num
        const ref_block_prefix = tx.ref_block_prefix

        // asset_id="965e5c6e-434c-3fa9-b780-c50f43cd955c"
        const memo = `deposit|${user_id}|${trace_id}|${account}|${amount}|${token_name}|${expiration}|${ref_block_num}|${ref_block_prefix}`
        try {
            const signatures = await this._requestSignaturesWithPayment(1, transaction, user_id, trace_id, asset_id, amount, memo);
            const ret = await this._sendTransaction(signatures, transaction);
            this.finish();
            return ret;
        } catch (e) {
            this.finish();
            throw e;
        }
    }

    requestDeposit = (account: string, amount: string, user_id: string, token_name: string) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                this.payment_canceled = true;
                this.closeAlert();
                reject('time out');
            }, 120000);

            this._requestDeposit(account, amount, user_id, token_name).then(r => {
                swal.close && swal.close();
                resolve(r);
            }).catch(e => {
                swal.close && swal.close();
                reject(e);
            });
        });
    }

    _requestWithdraw = async (amount: string, token_name: string) => {
        await this.prepare();
        const asset_id = supported_asset_ids[token_name];
        const account = await this.getBindAccount();

        if (!asset_id) {
            throw Error("asset id not supported currently");
        }
        const [tx, transaction] = await generateWithdrawTx(this.api, account, amount, token_name);
        const signatures = await this.signTransaction(transaction);

        const ret = await this._sendTransaction(signatures, transaction);
        this.finish();
        return ret;
        // return await this.jsonRpc.push_transaction({...transaction, signatures});    
    }

    requestWithdraw = (amount: string, token_name: string) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                this.payment_canceled = true;
                this.closeAlert();
                reject('time out');
            }, 120000);
            // this.showPaymentCheckingReminder().then((value) => {
            //     this.payment_canceled = true;
            //     reject(value);
            //     swal.close && swal.close();
            // });
            this._requestWithdraw(amount, token_name).then(r => {
                swal.close && swal.close();
                resolve(r);
            }).catch(e => {
                swal.close && swal.close();
                reject(e);
            });
        });
    }

    _requestCreateAccount = async (user_id: string, new_account: string, amount: string) => {
        await this.prepare();
        const [tx, transaction] = await generateCreateAccountTx(this.api, user_id, new_account, amount);

        const expiration = tx.expiration
        const ref_block_num = tx.ref_block_num
        const ref_block_prefix = tx.ref_block_prefix

        // asset_id="965e5c6e-434c-3fa9-b780-c50f43cd955c"
        const trace_id = v4();
        const asset_id = supported_asset_ids['MEOS'];
        const memo = `createacc|${user_id}|${trace_id}|${new_account}|${amount}|${expiration}|${ref_block_num}|${ref_block_prefix}`
        try {
            const signatures = await this._requestSignaturesWithPayment(1, transaction, user_id, trace_id, asset_id, amount, memo);
            const ret = await this._sendTransaction(signatures, transaction);
            this.finish();
            return ret;
        } catch (e) {
            this.finish();
            throw e;
        }
    }

    requestCreateAccount = (user_id: string, new_account: string, amount: string) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                this.payment_canceled = true;
                this.closeAlert();
                reject('time out');
            }, 120000);
            // this.showPaymentCheckingReminder().then((value) => {
            //     this.payment_canceled = true;
            //     reject(value);
            //     swal.close && swal.close();
            // });
            this._requestCreateAccount(user_id, new_account, amount).then((r: any) => {
                swal.close && swal.close();
                resolve(r);
            }).catch(e => {
                swal.close && swal.close();
                reject(e);
            });
        });
    }

    _requestBindAccount = async (user_id: string, account: string) => {
        await this.prepare();
        const amount = "0.1"
        const trace_id = v4();
        const asset_id = '965e5c6e-434c-3fa9-b780-c50f43cd955c';
        // const token_name = supported_mixin_ids[asset_id];
        // const asset_id = supported_asset_ids[token_name];
        if (!asset_id) {
            throw Error("asset id not supported currently");
        }

        const [tx, transaction] = await generateBindAccountTx(this.api, user_id, account);
        console.log(JSON.stringify(tx))

        const expiration = tx.expiration
        const ref_block_num = tx.ref_block_num
        const ref_block_prefix = tx.ref_block_prefix

        // asset_id="965e5c6e-434c-3fa9-b780-c50f43cd955c"
        const memo = `bindacc|${user_id}|${trace_id}|${account}|${expiration}|${ref_block_num}|${ref_block_prefix}`
        try {
            const signatures = await this._requestSignaturesWithPayment(1, transaction, user_id, trace_id, asset_id, amount, memo);
            this.finish();
            return trace_id;
        } catch (e) {
            this.finish();
            throw e;
        }
    }

    requestBindAccount = async (user_id: string, account: string) => {
        return this._requestBindAccount(user_id, account);
    }

    _showPaymentQrcode = async (payment_link: string) => {
        let qrcodeUrl = await QRCode.toDataURL(payment_link);
        console.log("++++++QRCode.toDataURL", qrcodeUrl);

        let ret = await swal({
            text: '正在检查支付结果...',
            closeOnClickOutside: false,
            closeOnEsc: false,
            buttons: {
                cancel: "取消" as any,
                // catch: {
                //     text: "拷贝支付链接",
                //     value: "copy",
                //     closeModal: false
                // }
            },
            icon: qrcodeUrl
        });
        switch (ret) {
            case "copy":
                copy(payment_link);
                break;
            default:
                this.payment_canceled = true;
        }
        // swal.close && swal.close();
    }

    _requestSignaturesWithPayment = async (key_type: number, transaction: any, user_id: string, trace_id: string, asset_id: string, amount: string, memo: string) => {
        // const signer_urls = signers.map((x:any) => x.url);
        await this.prepare();
        let payment: any = null;
        for (var i=0;i<3;i++) {
            try {
                payment = await this.requestPayment(trace_id, asset_id, amount, memo);
                break;
            } catch (e) {
                console.error(e);
            }
            if (this.payment_canceled) {
                console.log('payment canceled');
                throw Error('canceled');
            }
            await delay(1000);
        }
        if (!payment) {
            throw Error("payment request failed!");
        }

        var pay_link = `mixin://codes/${payment.code_id}`;
        console.log('+++payment link:', pay_link);
        if (mobileAndTabletCheck() && !this.show_qrcode) {
            this.showPaymentCheckingReminder().then((value) => {
                if (value) {
                    this.payment_canceled = true;
                    // swal.close();
                }
            });
            window.open(pay_link, "_blank");
        } else {
            this._showPaymentQrcode(pay_link);
        }

        var paid = false;
        for (var i=0;i<90;i++) {
            await delay(1000);
            if (this.payment_canceled) {
                console.log('payment canceled...');
                throw Error('canceled');
            }
            payment = await this.requestPayment(trace_id, asset_id, amount, memo);
            if (payment.error) {
                continue;
            }
            if (payment.status === 'paid') {
                paid = true;
                // console.log("++++++paid", payment);
                break;
            }
        };
    
        if (!paid) {
            throw Error('payment timeout');
        }

        this.showReminder(`正在请求多重签名(0/${this.threshold})`);
    
        let _signatures = await this.requestSignatures(key_type, user_id, trace_id, transaction, payment);
        let signatures = _signatures as Array<string>;
        // console.log("++++++signatures after sort:", signatures);
    
        // swal.close && swal.close();
    
        return signatures;
    }

    signTransaction = async (transaction: any) => {
        await this.prepare();
        const trace_id = v4();
        const user_id = localStorage.getItem('user_id');
        var serializedTransaction = transaction.serializedTransaction;
        var tx_id = toHexString(eosjs_sha256(Buffer.from(serializedTransaction)));
        
        const asset_id = "965e5c6e-434c-3fa9-b780-c50f43cd955c";
        var _tx_id = Buffer.from(fromHexString(tx_id)).toString('base64');
        var memo = `multisig|${user_id}|${trace_id}|${_tx_id}`;
        try {
            const ret = await this._requestSignaturesWithPayment(0, transaction, user_id, trace_id, asset_id, "0.1", memo);
            this.finish();
            return ret;
        } catch (e) {
            this.finish();
            throw e;
        }
    }

    getBalance = async (account: string, symbol: string) => {
        try {
            const r = await this.jsonRpc.get_currency_balance('mixinwtokens', account, symbol);
            if (r.length === 0) {
                return "0";
            }
            // console.log(r);
            return r[0].split(' ')[0];
        } catch(e) {
            console.log(e);
            return "0";
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

    _getUserIdFromProxy = async () => {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        let user_id = urlParams.get('user_id');
        if (!user_id) {
            user_id = localStorage.getItem('user_id');
            if (!user_id) {
                await this.requestAuthorization();
                return "";    
            }
        } else {
            localStorage.setItem('user_id', user_id);
        }
        console.log("+++++++++userid", user_id);
        try {
            const url = `${AUTH_SERVER}/me?user_id=${user_id}`;
            console.log(url);
            const r = await fetch(url, {
                method: "GET",
            });
            const r2 = await r.json();
            // console.log('+++my profile:', r2);
//            if (r2.error && r2.error.code == 401) {
            if (r2.error) {
                //{error: {status: 202, code: 401, description: "Unauthorized, maybe invalid token."}} (eosjs-multisig_wallet.js, line 47304)
                await this.requestAuthorization();
                return "";
            }
            // console.log("++++++got user_id:", r2.data.user_id);
            localStorage.setItem('user_id', r2.data.user_id);
            return r2.data.user_id;
        } catch (e) {
            console.error(e);
            await this.requestAuthorization();
        }
        return "";
    }

    getUserId = async () => {
        console.log("++++++=getUserId");
        if (window.location.pathname === '/auth') {
            while(true) {
                console.log("++++++++getUserId: onAuth...");
                await delay(1000);
            }
            return "";
        }
        let ret;
        if (this.auth_proxy) {
            ret = await this._getUserIdFromProxy();
        } else {
            ret = await this._getUserId();
        }
        // if (!window.wallet.identity) {
        //     window.wallet.getIdentity();
        // }
        return ret;
    }

    getBindAccount = async () => {
        let user_id = localStorage.getItem('user_id') as any;
        if (!user_id) {
            user_id = await this.getUserId();
            localStorage.setItem('binded_account', "");
        }

        let account = localStorage.getItem('binded_account') as any;
        if (account) {
            return account;
        }
    
        const _user_id = replaceAll(user_id, "-", "");
        let user_id_dec = binaryToDecimal(fromHexString(_user_id));
    
        //    user_id = '0x' + _user_id.join('');
        var params = {
            json: true,
            code: 'mixincrossss',
            scope: 'mixincrossss',
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
        // console.log("+++get table: bindaccounts:", r); 
    
        if (r.rows.length !== 0) {
            account = r.rows[0].account;
            localStorage.setItem('binded_account', account);
            return account;
        }
    
        let ret = await swal({
            text: '未绑定EOS账号，需要创建吗？',
            closeOnClickOutside: false,
            buttons: {
                cancel: "谢谢，不用!" as any,
                catch: {
                    text: "好的，帮我创建",
                    value: "create",
                },
                defeat: {
                    text: "我已经有EOS账号",
                    value: "bind",
                }
            }
        });
        console.log(ret);
        // TODO fix url
        switch (ret) {
            case "create":
    //                return await create_account(user_id);
                window.location.replace("http://192.168.1.8011");
                throw Error("creating...");
                break;
            case "bind":
                window.location.replace("http://192.168.1.8011");
                throw Error("binding...");
            default:
                throw Error('user canceled');
        }
        throw Error('account not found!');
    }

    requestAuthorization = async () => {
        // console.trace();
        // alert("requestAuthorization" + this.auth_proxy);
        localStorage.setItem('access_token', "");
        localStorage.setItem('user_id', "");
        localStorage.setItem('binded_account', "");
        if (this.auth_proxy) {
            const url = `${AUTH_SERVER}?ref=${window.location.href}`
            console.log(url);
            window.location.replace(url);
        } else {
            localStorage.setItem('href_save', window.location.href);
            const scope = 'PROFILE:READ';
            const challenge = generateChallenge();
            const url = `https://mixin-www.zeromesh.net/oauth/authorize?client_id=${this.client_id}&scope=${scope}&response_type=code&code_challenge=${challenge}`;
            window.location.replace(url);
        }
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
        var args = {
            "client_id": this.client_id,
            "code": authorizationCode,
            "code_verifier": localStorage.getItem("verifier")
        };
        const ret = await fetch(oauthUrl, {
            method: "POST",
            headers: {
                "Content-type": "application/json",
            },
            body: JSON.stringify(args),
        });
        const ret2 = await ret.json();
        if (ret2.error) {
            await this.requestAuthorization();
        }
        localStorage.setItem('access_token', ret2.data.access_token);
        await this._getUserId();
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
        await this.getUserId();
    }
}

export { MixinEos }
