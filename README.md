# mixineos-wallet

# Demo of mixineos wallet

See [demo](https://github.com/mixineos/mixineos-wallet-demo)

# How to use

```
yarn add mixineos-wallet
```

## Initialization

```javascript
import { InitWallet } from "mixineos-wallet"

const members = [
    "e07c06fa-084c-4ce1-b14a-66a9cb147b9e",
    "e0148fc6-0e10-470e-8127-166e0829c839",
    "18a62033-8845-455f-bcde-0e205ef4da44",
    "49b00892-6954-4826-aaec-371ca165558a"
];

InitWallet({
  eosRpcUrl: "https://api.eosn.io",
  dataProvider: null,
  appId: "d78a6e9e-5d23-4b24-8bf3-05dc8576cf8b",
  mainContract: "mixincrossss",
  mixinWrapTokenContract: "mixinwtokens",
  contractProcessId: "e0148fc6-0e10-470e-8127-166e0829c839",
  members,
  lang: "en",
  debug: false,
  inject: true
});

```

## APIs

### MixinEos.getEOSAccount
get mixin user associated EOS account

```javascript
let account = await mixineos.getEOSAccount();
allert(account);
```

### MixinEos.pushAction
```javascript
let account = await mixineos.getEOSAccount();
let args = {
    'from': account,
    'to': 'helloworld',
    'quantity': "0.00000001 MEOS",
    'memo': 'hello,world'
}

await mixineos.pushAction("mixinwtokens", "transfer", args);
```
