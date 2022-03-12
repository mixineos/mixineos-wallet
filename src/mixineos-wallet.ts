import { JsSignatureProvider } from "eosjs/dist/eosjs-jssig";
import { JsonRpc } from "eosjs/dist/eosjs-jsonrpc";
import { Api } from 'eosjs/dist/eosjs-api';
import { MixinEos } from "./mixineos"
import { NODE_URL } from "./constants"

let CHAIN_ID = 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906'
let jsonRpc = new JsonRpc(NODE_URL);
let mixineos: MixinEos = null;

const signatureProvider = new JsSignatureProvider([
]);

const PUBLIC_KEY = 'EOS7NqmJvt93T4y31b2Qba1sxoiTRR7Q3vQZwHjdPQh4gEq5BzaZ6'
// const PUBLIC_KEY = 'EOS6GcXh1mgpGvmBWrF1wWQZxH7RWxF4TMnLQkbLMp2AYHfHJRdT2'

const api = new Api({
    rpc: jsonRpc, signatureProvider, chainId: CHAIN_ID, textDecoder: new TextDecoder(), textEncoder: new TextEncoder()
});

console.log('+++++++++wallet init!');

declare let window: any;
declare let document: any;

const toHexString = (bytes: any) =>
    bytes.reduce((str: string, byte: number) => str + byte.toString(16).padStart(2, '0'), '');

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
            console.log("+++++++++_eos:", _eos);
            return proxy(new _eos({httpEndpoint,chainId}), {
                get(eosInstance: any, method: any) {
                    console.log('+++++method', method, eosInstance);
                    let returnedFields: any = null;
                    return (...args: any[]) => {
                        console.log(args);
                        if (method == "transact") {
                            return window.mixineos.pushTransaction(args[0]);
                        }
                        return new Promise((resolve, reject) => {
                            reject(false);
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
            return window.scatter.getIdentity();
        } else if (request.type === 'getOrRequestIdentity') {
            return window.scatter.getIdentity();
        } else if (request.type === 'getPublicKey') {
            return new Promise((resolve, reject) => {
                resolve(PUBLIC_KEY);
            });
        } else if (request.type === 'requestSignature') {
            return new Promise((resolve, reject) => {
                //fake signature
                resolve({signatures:"SIG_K1_KXdabr1z4G6e2o2xmi7jPhzxH3Lj5igjR5v3q9LY7KbLWyXBZyES748bPzfM2MhQQVsLrouJzXT9YFfw1CywzMVCcNVMGH"});
            });
        } else if (request.type === 'authenticate') {
            return new Promise((resolve, reject) => {
                window.scatter.authenticate().then((r: any) => {
                    resolve(r);
                }).catch((e: any) => {
                    reject(e);
                })
            });
        }
    }

    login(requiredFields: any) {
        return window.scatter.getIdentity(requiredFields);
    }

    getIdentity(requiredFields: any) {
        console.log("++++++++++getIdentity:", requiredFields);
        return new Promise((resolve, reject) => {
            mixineos.getEosAccount().then((account: any) => {
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
                ],
                    kyc: false
                };
                window.scatter.identity = ids;
                resolve(ids);
            }).catch((e: any) => {
                console.log("+++_getBindAccount error:", e)
                reject(e)
            });
        })
    }

    useIdentity(id: any) {
        console.log("+++++++useIdentity:", id);
    }

    getIdentityFromPermissions() {
        return window.scatter.getIdentity();
    }

    forgetIdentity() {
        return new Promise((resolve, reject) => {
            this.identity = null;
            resolve(true)
        })
    }
    
    authenticate(nonce: any) {
        return window.scatter.getIdentity();
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

window.scatter = new Index();
window.scatter.loadPlugin(new ScatterEOS());
console.log("++++++++window.scatter.loadPlugin(new ScatterEOS())");
console.log("++++++++window.scatter.getIdentity", window.scatter.getIdentity);

const InitWallet = ({
        node_url,
        client_id,
        mainContract,
        mixinWrapTokenContract,
        contractProcessId,
        members,
        debug = false,
        inject = false
    } : {
        node_url: string,
        client_id: string,
        mainContract: string,
        mixinWrapTokenContract: string,
        contractProcessId: string,
        members: string[],
        debug?: boolean,
        inject?: boolean
    }) => {
    console.log("+++++++++++++InitWallet");
    if (!!window.mixineos) {
        return;
    }

    mixineos = new MixinEos({
        node_url: node_url,
        client_id,
        mainContract,
        mixinWrapTokenContract,
        contractProcessId,
        members,
        debug: debug
    });

    window.mixineos = mixineos;
    localStorage.setItem('mainContract', mainContract);

    // window.wallet = new Index();
    // window.wallet.loadPlugin(new ScatterEOS());

    document.addEventListener('scatterLoaded', (event: any) => {
        console.log("++++++++++scatterLoaded", event);
    });

    document.dispatchEvent(new CustomEvent('scatterLoaded'));
    // document.dispatchEvent(new CustomEvent('walletLoaded'));

    (async () => {
        // document.dispatchEvent(new CustomEvent('scatterLoaded'));
        await mixineos.onLoad();
        const info = await jsonRpc.get_info();
        CHAIN_ID = info.chain_id;
        // console.log("+++++++++CHAIN_ID:", CHAIN_ID);
        if (!inject) {
            return;
        }

        document.addEventListener('walletLoaded', (event: any) => {
            console.log("++++++++++walletLoaded", event);
        });
        
        // document.dispatchEvent(new CustomEvent('scatterLoaded'));
        console.log('+++++++++wallet v2 init done!!!');
        // document.dispatchEvent(new CustomEvent('scatterLoaded'));

    })();
    return mixineos;
}

export { InitWallet };
