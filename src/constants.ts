const supported_mixin_ids = {
    "MBTC": "fe6b7788944d328778f98e3e81588215b5a07de4f9a4a7de4db4535b404e65db",
    "MXIN": "a99c2e0e2b1da4d648755ef19bd95139acbbe6564cfb06dec7cd34931ca72cdc",
    "MBOX": "da5f6dbd3102cd89b1b040c6b61e5f2b696bcb989dff7d8ecee8872aacf65592",
    "METH": "8dd50817c082cdcdd6f167514928767a4b52426997bd6d4930eca101c5ff8a27",
    "MMOB": "2dc0ab2919c77daea5cfc0b37a2beea02142e8fdc4f60409fd40b256bb13ea29",
    "MUSDT":"d4c304ffc3270ee0f3468913bd8027225201f0eccd336d47062d76c6e2b6bb27",
    "MEOS": "6ac4cbffda9952e7f0d924e4cfb6beb29d21854ac00bfbf749f086302d0f7e5d"
} as any

const supported_mixin_tokens = {
    "c6d0c728-2624-429b-8e0d-d9d19b6592fa": "MBTC",
    "c94ac88f-4671-3976-b60a-09064f1811e8": "MXIN",
    "f5ef6b5d-cc5a-3d90-b2c0-a2fd386e7a3c": "MBOX",
    "43d61dcd-e413-450d-80b8-101d5e903357": "METH",
    "eea900a8-b327-488c-8d8d-1428702fe240": "MMOB",
    "4d8c508b-91c5-375b-92b0-ee702ed2dac5": "MUSDT",
    "6cfe566e-4aad-470b-8c9a-2fd35b49c68d": "MEOS"
} as any;

const supported_asset_ids = {
    "MBTC": "c6d0c728-2624-429b-8e0d-d9d19b6592fa",
    "MXIN": "c94ac88f-4671-3976-b60a-09064f1811e8",
    "MBOX": "f5ef6b5d-cc5a-3d90-b2c0-a2fd386e7a3c",
    "METH": "43d61dcd-e413-450d-80b8-101d5e903357",
    "MMOB": "eea900a8-b327-488c-8d8d-1428702fe240",
    "MUSDT": "4d8c508b-91c5-375b-92b0-ee702ed2dac5",
    "MEOS": "6cfe566e-4aad-470b-8c9a-2fd35b49c68d"
} as any;

// helloworld6
const CLIENT_ID = '3e72ca0c-1bab-49ad-aa0a-4d8471d375e7';

const NODE_URL = 'https://api.eosn.io';

const PROXY_AUTH_SERVER = 'http://192.168.1.3:8081'

const VALID_ACCOUNT_CHARS = 'abcdefghijklmnopqrstuvwxyz12345';

const CHAIN_ID = 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906';

const OAUTH_URL = "https://mixin-api.zeromesh.net/oauth/token"

const SIGN_ASSET_TOKEN_ID = "965e5c6e-434c-3fa9-b780-c50f43cd955c"; //CNB

const DEBUG_SIGNER_NODES = [
    "http://192.168.1.3:2053",
    "http://192.168.1.3:2083",
    "http://192.168.1.3:2087",
]

export {
    supported_asset_ids,
    supported_mixin_ids,
    supported_mixin_tokens,
    CLIENT_ID,
    NODE_URL,
    PROXY_AUTH_SERVER,
    VALID_ACCOUNT_CHARS,
    CHAIN_ID,
    OAUTH_URL,
    SIGN_ASSET_TOKEN_ID,
    DEBUG_SIGNER_NODES
}
