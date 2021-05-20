import { supported_asset_ids } from "./constants";

import { Api } from 'eosjs/dist/eosjs-api';
import { JsSignatureProvider } from "eosjs/dist/eosjs-jssig";
import { JsonRpc } from "eosjs/dist/eosjs-jsonrpc";
import { Signature } from "eosjs/dist/eosjs-key-conversions"
import { convertLegacyPublicKey, binaryToDecimal } from 'eosjs/dist/eosjs-numeric'

import { sha256 as eosjs_sha256 } from 'eosjs/dist/eosjs-key-conversions';


import { BigNumber } from "bignumber.js";
import { v4 } from 'uuid';
import sha256 from 'crypto-js/sha256';

import * as _swal from 'sweetalert';
import { SweetAlert } from 'sweetalert/typings/core';
const swal: SweetAlert = _swal as any;



declare let window: any;


const CHAIN_ID = 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906';
const MAIN_CONTRACT = 'mixincrossss';
const auth_server = 'https://dex.uuos.io:2053'
// const auth_server = 'http://192.168.1.3:2053'

const replaceAll = (s: string, search: string, replace: string) => {
    return s.split(search).join(replace);
}

const delay = (ms: number) => {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

const fromHexString = (hexString: string) => {
    const arr = hexString.match(/.{1,2}/g) || []
    return  new Uint8Array(arr.map(byte => parseInt(byte, 16)));
}

const toHexString = (bytes: any) =>
    bytes.reduce((str: string, byte: number) => str + byte.toString(16).padStart(2, '0'), '');

const int_to_hex = (n: any) => {
    let x = new BigNumber(n);
    let user_id = x.toString(16);
    user_id = user_id.padStart(32, '0');
    var _user_id: string[] = [];
    for (var i=user_id.length-2;i>=0;i-=2) {
        _user_id.push(user_id.substr(i, 2));
    }
    user_id = _user_id.join('');
    let r = user_id.substr(0, 8) + '-' + user_id.substr(8, 4) + '-' + user_id.substr(12, 4) + '-' + user_id.substr(16, 4) + '-' + user_id.substr(20, 12);
    // console.log(r);
    return r;
}

const getCookieValue = (name: string) => {
    const values = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)")
    if (values) {
        return values.pop();
    }
    return "";
//    ?.pop() || ''
}

class MixinEos {
    api: Api;
    jsonRpc: JsonRpc;
    threshold: number;
    signers: any;
    payment_canceled: boolean;
    constructor(url: string) {
        const signatureProvider = new JsSignatureProvider([
        ]);

        this.jsonRpc = new JsonRpc(url);
        this.api = new Api({
            rpc: this.jsonRpc, signatureProvider, chainId: CHAIN_ID, textDecoder: new TextDecoder(), textEncoder: new TextEncoder()
        });
        this.threshold = 0;
        this.payment_canceled = false;
    }
    
    requestSigners = async (): Promise<[number, Array<any>]> => {
        var account = await this.jsonRpc.get_account(MAIN_CONTRACT);
        var multisig_permission = account.permissions.find((x: any) => x.perm_name === 'multisig');
        var _threshold = multisig_permission.required_auth.threshold;
        var singer_count = multisig_permission.required_auth.keys.length || multisig_permission.required_auth.accounts.length;
        // singers = singers.filter((x: any) => {
        //     console.log(x);
        //     return x != 'learnfortest'
        // })
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
                x.data.client_id = int_to_hex(x.data.client_id);
                return x.data;
            }
            x.client_id = int_to_hex(x.client_id);
            return x;
        });
        // console.log('+++rows after filter out learnfortest:', rows);
    
        return [_threshold, rows];
    }
    
    requestReceiver = async () => {
        return this.signers.map((x:any) => x.client_id);
    }
    
    requestPayment = async (amount: string, trace_id: string, memo: string, asset_id: string) => {
        const account = await this.jsonRpc.get_account(MAIN_CONTRACT);
        const [multisig] = account.permissions.filter((x:any) => {
            return x.perm_name === 'multisig';
        });
        // console.log(multisig);
    
        var payment = {
            "asset_id": asset_id,
            "amount": amount,
            "trace_id": trace_id,
            "memo": memo,
            "opponent_multisig": {
                "receivers": await this.requestReceiver(),
                "threshold": multisig.required_auth.threshold
            }
        }

        // console.log('++++++++payment:', payment);
        const user_id = localStorage.getItem('user_id');
        const ret = await fetch(`${auth_server}/request_payment`, {
            method: "POST",
            headers: {
                "Content-type": "application/json",
                // 'Authorization' : 'Bearer ' + await this.getAccessToken(),
                // "X-Request-Id": v4()
            },
            body: JSON.stringify({payment:payment, user_id:user_id}),
        });
    
        const ret2 = await ret.json();
        // console.log("+++++++++payment return:", ret2);
        // TODO check error details
        if (ret2.error) {
            throw Error(ret2.error);
        }
        return ret2.data;
    }
    
    generateDepositTx = async(account: string, amount: string, token_name: string, user_id: string, asset_id: string) => {
        const _user_id = '0x' + replaceAll(user_id, "-", "");
        const str_amount = parseFloat(amount).toFixed(8);

        let transaction = await this.api.transact(
            {
            actions: [
                {
                    account: "mixincrossss",
                    name: "deposit",
                    authorization: [
                        {
                            actor: "mixincrossss",
                            permission: "active"
                        }
                    ],
                    data: {
                        account: account,
                        quantity: `${str_amount} ${token_name}`
                    }
                }
            ]
            },
            {
                broadcast: false,
                sign: false,
                blocksBehind: 3,
                expireSeconds: 60*60
            }
        );
        // console.log("++++transaction:", transaction);
        const trx = this.api.deserializeTransaction(transaction.serializedTransaction);
        // console.log("++++trx:", trx);
        return [trx, transaction];
    }

    requestSignatures = (key_type: number, user_id: string, trace_id: string, transaction: any, payment: any) => {
        return new Promise((resove, reject) => {
            setTimeout(() => reject('time out'), 120000);
            let signatures: string[] = [];
            const trx = this.api.deserializeTransaction(transaction.serializedTransaction);
            const request_signature = async (url: string) => {
                for (var i=0;i<120;i++) {
                    let r = await fetch(`${url}/request_signature`, {
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
                    await delay(1000);
                }
                return null;
            }
            this.signers.map((signer: any) => {
                const url = signer.url;
                // console.log("++++++signer url:", url);
                request_signature(url).then(data => {
                    if (!data) {
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

    requestDepositsignatures = async (user_id: string, trace_id: string, transaction: any) => {
        return await this.requestSignatures(1, user_id, trace_id, transaction, {})
    }

    prepare = async () => {
        this.payment_canceled = false;
        [this.threshold, this.signers] = await this.requestSigners();
    }

    closeAlert = () => {
        swal.close && swal.close();
    }
    
    showReminder = (text: string, show_progress=true) => {
        if (show_progress) {
            swal({
                text: text,
                closeOnClickOutside: false,
                buttons: [false],
                icon:'https://mixin-www.zeromesh.net/assets/fb6f3c230cb846e25247dfaa1da94d8f.gif'
            });    
        } else {
            swal({
                text: text,
                closeOnClickOutside: false,
                buttons: [false]
            });
        }
    }

    _requestDeposit = async (account: string, amount: string, user_id: string, token_name: string) => {
        await this.prepare();

        const trace_id = v4();
    //   const asset_id = '965e5c6e-434c-3fa9-b780-c50f43cd955c';
    //   const token_name = supported_mixin_ids[asset_id];
        const asset_id = supported_asset_ids[token_name];

        if (!token_name) {
            throw Error("asset id not supported currently");
        }
        const [tx, transaction] = await this.generateDepositTx(account, amount, token_name, user_id, asset_id);

        const expiration = tx.expiration
        const ref_block_num = tx.ref_block_num
        const ref_block_prefix = tx.ref_block_prefix

        // asset_id="965e5c6e-434c-3fa9-b780-c50f43cd955c"
        const memo = `deposit|${user_id}|${trace_id}|${account}|${amount}|${token_name}|${expiration}|${ref_block_num}|${ref_block_prefix}`
        let payment = await this.requestPayment(amount, trace_id, memo, asset_id);
        const payment_link = `mixin://codes/${payment.code_id}`;
        console.log("+++++++payment_link:", payment_link);
        window.open(payment_link, '_blank');

        var timeout = true;
        for (var i=0;i<60;i++) {
            delay(2000);
            if (this.payment_canceled) {
                return null;
            }
            payment = await this.requestPayment(amount, trace_id, memo, asset_id);
            if (payment.status === 'paid') {
                timeout = false;
                break;
            }
        }
        if (timeout) {
            return null;
        }

        this.showReminder('正在请求签名...', true);

        const signatures = await this.requestDepositsignatures(user_id, trace_id, transaction);
        console.log("++++++=signatures:", signatures);
        
        this.closeAlert();

        this.showReminder('正在发送...');

        const r2 = await this.jsonRpc.push_transaction({
            signatures: signatures as string[],
            compression: transaction.compression,
            serializedTransaction: transaction.serializedTransaction,
            serializedContextFreeData: transaction.serializedContextFreeData
        });
        this.closeAlert();

        this.showReminder('操作成功...');

        setTimeout(() => {
            this.closeAlert();
        }, 2000);
        return r2;
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

    requestDeposit = (account: string, amount: string, user_id: string, token_name: string) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                this.payment_canceled = true;
                this.closeAlert();
                reject('time out');
            }, 120000);

            this.showPaymentCheckingReminder().then((value) => {
                this.payment_canceled = true;
                reject(value);
                swal.close && swal.close();
            });

            this._requestDeposit(account, amount, user_id, token_name).then(r => {
                swal.close && swal.close();
                resolve(r);
            }).catch(e => {
                swal.close && swal.close();
                reject(e);
            });
        });
    }

    _requestCrossTransfer = async (user_id: string, trace_id: string, tx_id: string) => {
        const asset_id = "965e5c6e-434c-3fa9-b780-c50f43cd955c";
        var _tx_id = Buffer.from(fromHexString(tx_id)).toString('base64');
        
        var memo = `multisig|${user_id}|${trace_id}|${_tx_id}`;
        return await this.requestPayment("0.1", trace_id, memo, asset_id);
    }
    
    _signTransaction = async (transaction: any) => {
        // const signer_urls = signers.map((x:any) => x.url);
        await this.prepare();

        const trace_id = v4();
        // console.log("++++++++trace_id:", trace_id);
        const user_id = localStorage.getItem('user_id');
    
        var serializedTransaction = transaction.serializedTransaction;
        var tx_id = toHexString(eosjs_sha256(Buffer.from(serializedTransaction)));
    
        // alert(JSON.stringify(trx));
    
        let payment: any = null;
        for (var i=0;i<3;i++) {
            try {
                payment = await this._requestCrossTransfer(user_id, trace_id, tx_id);
                // console.log("+++++++_requestCrossTransfer:", payment);
                break;
            } catch (e) {
                console.error(e);
            }
            if (this.payment_canceled) {
                console.log('payment canceled');
                throw Error('canceled');
            }
            delay(1000);
        }
        if (!payment) {
            throw Error("payment request failed!");
        }
    
        var pay_link = `mixin://codes/${payment.code_id}`;
        console.log('+++payment link:', pay_link);
        window.open(pay_link, "_blank");  
        
        var paid = false;
        for (var i=0;i<90;i++) {
            await delay(1000);
            if (this.payment_canceled) {
                console.log('payment canceled...');
                throw Error('canceled');
            }
            payment = await this._requestCrossTransfer(user_id, trace_id, tx_id);
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
    
        let promises: Array<Promise<any>> = [];
        // TODO
        let packed_transaction: any = null;
    
        this.showReminder('正在请求多重签名...');
    
        let _signatures = await this.requestSignatures(0, user_id, trace_id, transaction, payment);
        let signatures = _signatures as Array<string>;
        // console.log("++++++signatures after sort:", signatures);
    
        swal.close && swal.close();
    
        return signatures;
    }
    
    signTransaction = (transaction: any) => {
        return new Promise((resolve, reject) => {
            this.showPaymentCheckingReminder().then((value) => {
                if (value) {
                    this.payment_canceled = true;
                    // swal.close();
                    reject({error:'canceled'});
                }
            });

            this._signTransaction(transaction).then(r => {
                swal.close && swal.close();
                resolve(r);
            }).catch(e => {
                swal.close && swal.close();
                reject(e);
            });
        });
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

    _requestUserId = async () => {
        localStorage.setItem('user_id', "");
        localStorage.setItem('binded_account', "");
        window.location.replace(`${auth_server}?ref=${window.location.href}`);
        await delay(3000);
    }

    getUserId = async () => {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        let user_id = urlParams.get('user_id');
        if (!user_id) {
            user_id = localStorage.getItem('user_id');
            if (!user_id) {
                await this._requestUserId();
                return "";    
            }
        } else {
            localStorage.setItem('user_id', user_id);
        }
        console.log("+++++++++userid", user_id);
        try {
            const url = `${auth_server}/me?user_id=${user_id}`;
            console.log(url);
            const r = await fetch(url, {
                method: "GET",
            });
            const r2 = await r.json();
            // console.log('+++my profile:', r2);
            if (r2.error && r2.error.code == 401) {
                //{error: {status: 202, code: 401, description: "Unauthorized, maybe invalid token."}} (eosjs-multisig_wallet.js, line 47304)
                await this._requestUserId();
                return "";
            }
            // console.log("++++++got user_id:", r2.data.user_id);
            localStorage.setItem('user_id', r2.data.user_id);
            return r2.data.user_id;
        } catch (e) {
            console.error(e);
            await this._requestUserId();
        }
        return "";
    }
    
}

export { MixinEos }
