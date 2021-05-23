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
import * as CryptoJS from "crypto-js";

import * as _swal from 'sweetalert';
import { SweetAlert } from 'sweetalert/typings/core';
const swal: SweetAlert = _swal as any;

import * as QRCode from 'qrcode'


declare let window: any;
declare let document: any;


const CHAIN_ID = 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906';
const MAIN_CONTRACT = 'mixincrossss';

const CLIENT_ID = '49b00892-6954-4826-aaec-371ca165558a';
// const auth_server = 'https://dex.uuos.io:2053'
const auth_server = 'http://192.168.1.3:2053'

// const paymentUrl = 'https://mixin-api.zeromesh.net/payments'
// const paymentUrl = `${auth_server}/request_payment`

const oauthUrl = "https://mixin-api.zeromesh.net/oauth/token"

const base64URLEncode = (str: string) => {
    return CryptoJS.enc.Base64.stringify(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
}

const generateChallenge = () => {
    var wordArray = CryptoJS.lib.WordArray.random(32);
    var verifier = base64URLEncode(wordArray);
    var challenge = base64URLEncode(CryptoJS.SHA256(wordArray));
    window.localStorage.setItem('verifier', verifier);
    return challenge;
}

const mobileAndTabletCheck = () => {
    let check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
};

// {"ancestorOrigins":{},"href":"https://defis.uuos.io/swap","origin":"https://defis.uuos.io","protocol":"https:","host":"defis.uuos.io","hostname":"defis.uuos.io","port":"","pathname":"/swap","search":"","hash":""}

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

const int2Hex = (n: any) => {
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
        const paymentUrl = `${auth_server}/request_payment`
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

    requestPayment = async (amount: string, trace_id: string, memo: string, asset_id: string) => {
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

    requestSignatures = (key_type: number, user_id: string, trace_id: string, transaction: any, payment: any, deposit: boolean=false) => {
        return new Promise((resove, reject) => {
            setTimeout(() => reject('time out'), 120000);
            let signatures: string[] = [];
            const trx = this.api.deserializeTransaction(transaction.serializedTransaction);
            console.log("++++++requestSignatures:", trx);
            const request_signature = async (url: string) => {
                for (var i=0;i<120;i++) {
                    var full_url: any
                    if (deposit) {
                        full_url = `${url}/request_deposit_signature`;
                    } else {
                        full_url = `${url}/request_signature`;
                    }
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

    requestDepositsignatures = async (user_id: string, trace_id: string, transaction: any) => {
        return await this.requestSignatures(1, user_id, trace_id, transaction, {}, true);
    }

    prepare = async () => {
        this.payment_canceled = false;
        this.main_contract = await this.jsonRpc.get_account(MAIN_CONTRACT);
        this.multisig_perm = this.main_contract.permissions.find((x: any) => x.perm_name === 'multisig');
        this.threshold = this.multisig_perm.required_auth.threshold;
        this.signers = await this.requestSigners();
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

    setReminder = (text: string) => {
        let elements = document.getElementsByClassName('swal-text');
        if (elements.length === 0) {
            return;
        }
        elements[0].innerHTML = text;    
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
            await delay(2000);
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

        this.showReminder(`正在请求多重签名(0/${this.threshold})`, true);

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
            await delay(1000);
        }
        if (!payment) {
            throw Error("payment request failed!");
        }

        var pay_link = `mixin://codes/${payment.code_id}`;
        console.log('+++payment link:', pay_link);
        if (mobileAndTabletCheck()) {
            this.showPaymentCheckingReminder().then((value) => {
                if (value) {
                    this.payment_canceled = true;
                    // swal.close();
                }
            });  
            window.open(pay_link, "_blank");  
        } else {
            let qrcodeUrl = await QRCode.toDataURL(pay_link);
            console.log("++++++QRCode.toDataURL", qrcodeUrl);
            swal({
                text: '正在检查支付结果...',
                closeOnClickOutside: false,
                button: {
                    text: "取消",
                    closeModal: false,
                },
                icon: qrcodeUrl
            } as any).then((value:any) => {
                this.payment_canceled = true;
            });
        }

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
    
        this.showReminder(`正在请求多重签名(0/${this.threshold})`);
    
        let _signatures = await this.requestSignatures(0, user_id, trace_id, transaction, payment);
        let signatures = _signatures as Array<string>;
        // console.log("++++++signatures after sort:", signatures);
    
        swal.close && swal.close();
    
        return signatures;
    }
    
    signTransaction = (transaction: any) => {
        return new Promise((resolve, reject) => {
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

    _requestUserIdFromProxy = async () => {
        localStorage.setItem('user_id', "");
        localStorage.setItem('binded_account', "");
        window.location.replace(`${auth_server}?ref=${window.location.href}`);
        await delay(3000);
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
                await this._requestUserIdFromProxy();
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
                await this._requestUserIdFromProxy();
                return "";
            }
            // console.log("++++++got user_id:", r2.data.user_id);
            localStorage.setItem('user_id', r2.data.user_id);
            return r2.data.user_id;
        } catch (e) {
            console.error(e);
            await this._requestUserIdFromProxy();
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
        if (!window.wallet.identity) {
            window.wallet.getIdentity();
        }
        return ret;
    }

    requestAuthorization = async () => {
        localStorage.setItem('access_token', "");
        localStorage.setItem('user_id', "");
        localStorage.setItem('binded_account', "");
        if (this.auth_proxy) {
            window.location.replace(`${auth_server}?ref=${window.location.href}`);
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
