import { JsSignatureProvider } from "eosjs/dist/eosjs-jssig";
import { JsonRpc } from "eosjs/dist/eosjs-jsonrpc";
import { Api } from 'eosjs/dist/eosjs-api';
import { binaryToDecimal } from 'eosjs/dist/eosjs-numeric'


import * as _swal from 'sweetalert';
import { SweetAlert } from 'sweetalert/typings/core';
const swal: SweetAlert = _swal as any;

import { MixinEos } from "./mixineos"
import { NODE_URL } from "./constants"

let CHAIN_ID = 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906'
let jsonRpc = new JsonRpc(NODE_URL);
let mixineos: any = null;

// let jsonRpc = new JsonRpc('http://192.168.1.3:9000');
// let CHAIN_ID = '8a34ec7df1b8cd06ff4a8abbaa7cc50300823350cadc59ab296cb00d104d2b8f'


const signatureProvider = new JsSignatureProvider([
]);

const PUBLIC_KEY = 'EOS4vtCi4jbaVCLVJ9Moenu9j7caHeoNSWgWY65bJgEW8MupWsRMo'
// const PUBLIC_KEY = 'EOS6GcXh1mgpGvmBWrF1wWQZxH7RWxF4TMnLQkbLMp2AYHfHJRdT2'

const api = new Api({
    rpc: jsonRpc, signatureProvider, chainId: CHAIN_ID, textDecoder: new TextDecoder(), textEncoder: new TextEncoder()
});

console.log('+++++++++wallet init!');

declare let window: any;
declare let document: any;


const getCookieValue = (name: string) => {
    const values = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)")
    if (values) {
        return values.pop();
    }
    return "";
//    ?.pop() || ''
}

const replaceAll = (s: string, search: string, replace: string) => {
    return s.split(search).join(replace);
}

const fromHexString = (hexString: string) =>
  new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

//   const toHexString = (bytes: Uint8Array) =>
//     bytes.reduce((str: string, byte: number) => str + byte.toString(16).padStart(2, '0'), '');

const toHexString = (bytes: any) =>
    bytes.reduce((str: string, byte: number) => str + byte.toString(16).padStart(2, '0'), '');

const _getBindAccount = async () => {
    // console.log("+++++_getBindAccount:");
    let user_id = localStorage.getItem('user_id') as any;
    if (!user_id) {
        user_id = await mixineos.getUserId();
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
    var r = await jsonRpc.get_table_rows(params);
    // console.log("+++get table: bindaccounts:", r); 

    if (r.rows.length !== 0) {
        account = r.rows[0].account;
        localStorage.setItem('binded_account', account);
        return account;
    }

    let ret = await swal({
        text: '未关联EOS账号，需要创建吗？',
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

const BLOCKCHAIN_SUPPORT = 'blockchain_support';

const Blockchains = {
    EOS: 'eos',
};

class Network {
    name: string
    protocol: string
    host: string
    port: number
    blockchain: string
    chainId: string

    constructor(_name = '', _protocol = 'https', _host = '', _port = 0, blockchain = Blockchains.EOS, chainId = '') {
        this.name = _name;
        this.protocol = _protocol;
        this.host = _host;
        this.port = _port;
        this.blockchain = blockchain;
        this.chainId = chainId
    }

    static placeholder() {
        return new Network()
    }

    static fromJson(json: any) {
        const p = Object.assign(Network.placeholder(), json);
        p.chainId = p.chainId ? p.chainId.toString() : '';
        return p
    }

    isValid() {
        return (this.protocol.length && this.host.length && this.port) || this.chainId.length
    };

    hostport() {
        return `${this.host}${this.port?':':''}${this.port}`
    }
}

class Plugin {
    name: string
    type: string
    [key: string]: any;

    constructor(_name = '', _type = '') {
        this.name = _name;
        this.type = _type
    }

    static placeholder() {
        return new Plugin()
    }

    static fromJson(json: any) {
        return Object.assign(Plugin.placeholder(), json)
    }

    isSignatureProvider() {
        return this.type === BLOCKCHAIN_SUPPORT
    }
}

class PluginRepositorySingleton {
    plugins: Array<Plugin>;
    constructor() {
        this.plugins = []
    }

    loadPlugin(plugin: Plugin) {
        if (!this.plugin(plugin.name)) this.plugins.push(plugin)
    }

    signatureProviders() {
        return this.plugins.filter(plugin => plugin.type === BLOCKCHAIN_SUPPORT)
    }

    supportedBlockchains() {
        return this.signatureProviders().map(plugin => name)
    }

    plugin(name: string) {
        return this.plugins.find(plugin => plugin.name === name)
    }
}

const PluginRepository = new PluginRepositorySingleton();

const proxy = (dummy: any, handler: any) => new Proxy(dummy, handler);

class ScatterEOS extends Plugin {
    constructor() {
        super(Blockchains.EOS, BLOCKCHAIN_SUPPORT)
    }

    signatureProvider(...args: any[]) {
        const throwIfNoIdentity = args[0];
        return (network: Network, _eos: any, _options: any = {}) => {
            // console.log('++++network:', network);
            // console.log('++++_eos:', _eos);
            // console.log('++++_options:', _options);
            var url = `${network.protocol}://${network.host}:${network.port}`
            jsonRpc.endpoint = url;

            network = Network.fromJson(network);
            if (!network.isValid()) throw Error('noNetwork');
            const httpEndpoint = `${network.protocol}` + '://' + `${network.hostport()}`;
            const chainId = network.hasOwnProperty('chainId') && network.chainId.length ? network.chainId : _options.chainId;
            return proxy(_eos({
                httpEndpoint,
                chainId
            }), {
                get(eosInstance: any, method: any) {
                    // console.log('+++++method', method, eosInstance);
                    let returnedFields: any = null;
                    return (...args: any[]) => {
                        if (args.find(arg => arg.hasOwnProperty('keyProvider'))) throw Error('keyProvider');
                        const signProvider = async (signargs: any) => {
                            // console.log("++++++++signargs:", signargs);
                            throwIfNoIdentity();
                            const requiredFields = args.find(arg => arg.hasOwnProperty('requiredFields')) || {
                                requiredFields: {}
                            };
                            var chainId = toHexString(signargs.buf.subarray(0, 32));
                            var serializedTransaction = signargs.buf.subarray(32, signargs.buf.length-32);
                            var signProviderArgs = {
                                chainId: chainId,
                                requiredKeys: [PUBLIC_KEY],
                                serializedTransaction,
                                abis: signargs.abis
//                                serializedContextFreeData: null
                            };
                            return await mixineos.signTransaction(signProviderArgs);
                            // return await signatureProvider.sign(signProviderArgs)
                        };

                        return new Promise((resolve, reject) => {
                            _eos(Object.assign(_options, {
                                httpEndpoint,
                                signProvider,
                                chainId
                            }))[method](...args).then((result: any) => {
                                if (!result.hasOwnProperty('fc')) {
                                    result = Object.assign(result, {
                                        returnedFields
                                    });
                                    resolve(result);
                                    return
                                }
                                const contractProxy = proxy(result, {
                                    get(instance: any, method: any) {
                                        if (method === 'then') return instance[method];
                                        return (...args: any[]) => {
                                            return new Promise(async (res, rej) => {
                                                instance[method](...args).then((actionResult: any) => {
                                                    res(Object.assign(actionResult, {
                                                        returnedFields
                                                    }))
                                                }).catch(rej)
                                            })
                                        }
                                    }
                                });
                                resolve(contractProxy)
                            }).catch((error: any) => reject(error))
                        })
                    }
                }
            })
        }
    }
}

export class Index {
    identity: any;
    isExtension: boolean;
    [key: string]: any;
    constructor() {
        this.isExtension = true;
        this.identity = null
        this.getIdentity = this.getIdentity.bind(this);
    }

    loadPlugin(plugin: Plugin) {
        console.log("++++++loadPlugin:", plugin);
        const noIdFunc = () => {
            if (!this.identity) throw new Error('No IIIIdentity')
        };

        PluginRepository.loadPlugin(plugin);
        if (plugin.isSignatureProvider()) {
            this[plugin.name] = plugin['signatureProvider'](noIdFunc);
            this[plugin.name + 'Hook'] = plugin['hookProvider']
        }
    }

    async connect(pluginName: string, options: any) {
        console.log("++++++++Index.connect:", pluginName, options);
        return Promise.resolve(!0);
    }

    disconnect() {}
    
    sendApiRequest(request: any){
        console.log("++++sendApiRequest:", request);
        if (request.type === 'identityFromPermissions') {
            return window.wallet.getIdentity();
        } else if (request.type === 'getOrRequestIdentity') {
            return window.wallet.getIdentity();
        } else if (request.type === 'getPublicKey') {
            return new Promise((resolve, reject) => {
                resolve(PUBLIC_KEY);
            });
        } else if (request.type === 'requestSignature') {
            return new Promise((resolve, reject) => {
                // console.log('++++request.payload:', request.payload);
                mixineos.signTransaction(request.payload.transaction).then((s: any) => {
                    resolve({signatures:s});
                }).catch((e: any) => {
                    reject(e);
                })
            });
        } else if (request.type === 'authenticate') {
            return new Promise((resolve, reject) => {
                window.wallet.authenticate().then((r: any) => {
                    resolve(r);
                }).catch((e: any) => {
                    reject(e);
                })
            });
        }
    }

    login(requiredFields: any) {
        return window.wallet.getIdentity(requiredFields);
    }

    getIdentity(requiredFields: any) {
        console.log("++++++++++getIdentity");
        return new Promise((resolve, reject) => {
            _getBindAccount().then((account: any) => {
                console.log("++++getIdentity:", account);
                const ids = {
                    hash: '1df7bb65ad53a9eb89b4327a56b1200f3abaf085ffec00af222b9eb7622b0734',
                    publicKey: PUBLIC_KEY,
                    name: 'InjectedWallet-'+account,
                    accounts: [{
                        name: account,
                        authority: 'active',
                        blockchain: 'eos',
                        publicKey: PUBLIC_KEY,
                        "isHardware":false
                    },
                    {
                        name: 'learnfortest',
                        authority: 'active',
                        blockchain: 'eos',
                        publicKey: 'EOS4vtCi4jbaVCLVJ9Moenu9j7caHeoNSWgWY65bJgEW8MupWsRMo',
                        "isHardware":false
                    },
                    {
                        name: 'learnforlove',
                        authority: 'active',
                        blockchain: 'eos',
                        publicKey: 'EOS6SD6yzqaZhdPHw2LUVmZxWLeWxnp76KLnnBbqP94TsDsjNLosG',
                        "isHardware":false
                    },
                    {
                        name: 'learntotest1',
                        authority: 'active',
                        blockchain: 'eos',
                        publicKey: 'EOS82JTja1SbcUjSUCK8SNLLMcMPF8W5fwUYRXmX32obtjsZMW9nx',
                        "isHardware":false
                    }
                ],
                    kyc: false
                };
                window.wallet.identity = ids;
                resolve(ids);
            }).catch((e: any) => {
                console.log("+++_getBindAccount error:", e)
                reject(e)
            });
        })
    }

    getIdentityFromPermissions() {
        return window.wallet.getIdentity();
    }

    forgetIdentity() {
        return new Promise((resolve, reject) => {
            this.identity = null;
            resolve(true)
        })
    }
    
    authenticate(nonce: any) {
        return window.wallet.getIdentity();
    }

    getArbitrarySignature(publicKey: string, data: any, whatfor = '', isHash = false) {
        // console.log("+++++getArbitrarySignature");
        let params = {
            publicKey: publicKey,
            data: data,
            whatfor: whatfor,
            isHash: isHash
        };
        return new Promise((resolve, reject) => {
            let jsonParams = JSON.stringify(params);
            let signature;
            console.log('++++', jsonParams);
            // pe.requestMsgSignature(jsonParams).then((res) => {
            //     signature = res.data;
            //     resolve(signature)
            // })
        })
    }

    getPublicKey(blockchain: any) {
        throw Error('not implemented');
        return 0
    }

    linkAccount(publicKey: any, network: any) {
        throw Error('not implemented');
        return 0
    }

    hasAccountFor(network: any) {
        throw Error('not implemented');
        return 0
    }

    suggestNetwork(network: any) {
        throw Error('not implemented');
        return 0
    }

    requestTransfer(network: any, to: any, amount: any, options = {}) {
        throw Error('not implemented');
        const payload = {
            network,
            to,
            amount,
            options
        };
        return 0
    }

    requestSignature(payload: any) {
        throw Error('not implemented');
        return 0
    }

    createTransaction(blockchain: any, actions: any, account: any, network: any) {
        throw Error('not implemented');
        return 0
    }
}

// console.log('+++++++++wallet init done!');

// window.wallet = new Index();

// document.addEventListener('walletLoaded', (event) => {
//     console.log("++++++++++walletLoaded", event);
// });
// document.dispatchEvent(new CustomEvent('walletLoaded'));

const InitWallet = ({
        node_url,
        client_id,
        auth_proxy = false,
        debug = false,
        inject = false
    } : {
        node_url: string,
        client_id: string,
        auth_proxy?: boolean,
        debug?: boolean,
        inject?: boolean
    }) => {

    if (!!window.mixineos) {
        return;
    }

    mixineos = new MixinEos({
        node_url: node_url,
        client_id,
        auth_proxy,
        debug: false
    });

    window.mixineos = mixineos;

    (async () => {
        await mixineos.onLoad();
        const info = await jsonRpc.get_info();
        CHAIN_ID = info.chain_id;
        console.log("+++++++++CHAIN_ID:", CHAIN_ID);
        if (!inject) {
            return;
        }
        window.wallet = new Index();
        window.scatter = window.wallet;
    
        window.scatter.loadPlugin(new ScatterEOS());
    
        document.addEventListener('walletLoaded', (event: any) => {
            console.log("++++++++++walletLoaded", event);
        });
        
        document.addEventListener('scatterLoaded', (event: any) => {
            console.log("++++++++++scatterLoaded", event);
        });
        // document.dispatchEvent(new CustomEvent('scatterLoaded'));
        console.log('+++++++++wallet v2 init done!!!');
        document.dispatchEvent(new CustomEvent('walletLoaded'));
        document.dispatchEvent(new CustomEvent('scatterLoaded'));
    })();
}

const showAlert = (options: any)  => {
    return swal(options);
}

const closeAlert = ()  => {
    swal.close && swal.close();
}

// InitWallet(NODE_URL, CLIENT_ID);

export { InitWallet, showAlert, closeAlert };
