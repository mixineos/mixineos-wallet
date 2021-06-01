import { Api } from 'eosjs/dist/eosjs-api';

import { supported_asset_ids, MAIN_CONTRACT, TOKEN_CONTRACT } from "./constants";
import { replaceAll } from './utils'

const generateDepositTx = async(api: Api, account: string, amount: string, token_name: string, user_id: string, asset_id: string) => {
    const _user_id = '0x' + replaceAll(user_id, "-", "");
    const str_amount = parseFloat(amount).toFixed(8);

    let transaction = await api.transact(
        {
        actions: [
            {
                account: MAIN_CONTRACT,
                name: "deposit",
                authorization: [
                    {
                        actor: MAIN_CONTRACT,
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
    const trx = api.deserializeTransaction(transaction.serializedTransaction);
    console.log("++++deposit trx:", JSON.stringify(trx));
    return [trx, transaction];
}

const generateWithdrawTx = async(api: Api, user_id: string, account: string, amount: string, token_name: string) => {
    const _user_id = replaceAll(user_id, "-", "");

    let transaction = await api.transact(
    {
        actions: [
        {
            account: MAIN_CONTRACT,
            name: "openwithdraw",
            authorization: [
                {
                actor: account,
                permission: "active"
                }
            ],
            data: {
                account: account,
                symbol: `8,${token_name}`
            }
        },
        {
            account: TOKEN_CONTRACT,
            name: "transfer",
            authorization: [
                {
                actor: account,
                permission: "active"
                }
            ],
            data: {
                from: account,
                to: MAIN_CONTRACT,
                quantity: `${amount} ${token_name}`,
                memo: `withdraw:${_user_id}`
            }
        }
        ]
    },
    {
        broadcast: false,
        sign: false,
        blocksBehind: 3,
        expireSeconds: 60*10
    });

    // console.log("++++transaction:", transaction);
    const trx = api.deserializeTransaction(transaction.serializedTransaction);
    // console.log("++++trx:", trx);
    return [trx, transaction];
}

const generateCreateAccountTx = async(api: Api, user_id: string, new_account: string, amount: string) => {
    const _user_id = '0x' + replaceAll(user_id, "-", "");
    const str_amount = parseFloat(amount).toFixed(4);

    let transaction = await api.transact(
        {
          actions: [
            {
                account: MAIN_CONTRACT,
                name: "createacc",
                authorization: [
                    {
                        actor: MAIN_CONTRACT,
                        permission: "active"
                    }
                ],
                data: {
                   new_account_name: new_account,
                   user_id: _user_id,
                   paid: `${str_amount} EOS`
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
    const trx = api.deserializeTransaction(transaction.serializedTransaction);
    console.log("++++trx:", trx);
    return [trx, transaction];
}

const generateBindAccountTx = async(api: Api, user_id: string, account: string) => {
    const info = await api.rpc.get_account(account);
    const active_perm = info.permissions.find((x: any) => x.perm_name == 'active');

    if (active_perm.required_auth.keys.length !== 1) {
        throw Error("unsupported account permission!");
    }

    if (active_perm.required_auth.accounts.length !== 0) {
        throw Error("unsupported account permission!");
    }
    
    if (active_perm.required_auth.threshold !== 1) {
        throw Error("unsupported account permission!");
    }

    const pub_key = active_perm.required_auth.keys[0].key

    active_perm.required_auth.accounts = [
        {
            permission: {
                actor: 'mixincrossss',
                permission: 'multisig'
            },
            weight: 1
        }
    ];

    const auth = {
        account: account,
        permission: "active",
        parent: "owner",
        auth: active_perm.required_auth
        // auth: {
        //     threshold: 1,
        //     keys: [
        //         {
        //             key: "EOS7t7CbbYcu3mMjDnWmg4meCNqTbNfUpdWKxNErMFWMcyuzdyzSB",
        //             weight: 1
        //         },
        //     ],
        //     accounts: [] as any[],
        //     waits: [] as any[]
        // }
    }    

    const _user_id = '0x' + replaceAll(user_id, "-", "");

    let transaction = await api.transact(
        {
          actions: [
            {
                account: 'eosio',
                name: "updateauth",
                authorization: [
                    {
                        actor: account,
                        permission: "active"
                    }
                ],
                data: auth
            },
            {
                account: MAIN_CONTRACT,
                name: "bindacc",
                authorization: [
                    {
                        actor: MAIN_CONTRACT,
                        permission: "active"
                    },
                    {
                        actor: account,
                        permission: "active"
                    }
                ],
                data: {
                    account: account,
                    user_id: _user_id,
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
    const trx = api.deserializeTransaction(transaction.serializedTransaction);
    // console.log("++++trx:", trx);
    return [trx, transaction];
}

const generateChangePermTx = async(api: Api, user_id: string, account: string, owner_key: string, active_key: string, remove_multisig: boolean) => {
    const info = await api.rpc.get_account(account);
    const active_perm = info.permissions.find((x: any) => x.perm_name == 'active');

    if (active_perm.required_auth.keys.length !== 0) {
        throw Error("unsupported account permission!");
    }

    if (active_perm.required_auth.accounts.length !== 1) {
        throw Error("unsupported account permission!");
    }

    const account_perm = active_perm.required_auth.accounts[0].permission;
    if (account_perm.actor === MAIN_CONTRACT && account_perm.permission === 'multisig') {
        //
    } else {
        throw Error("unsupported account permission!");
    }
    
    if (active_perm.required_auth.threshold !== 1) {
        throw Error("unsupported account permission!");
    }

    const pub_key = active_perm.required_auth.keys[0].key

    active_perm.required_auth.accounts = [
        {
            permission: {
                actor: 'mixincrossss',
                permission: 'multisig'
            },
            weight: 1
        }
    ];

    let active_auth: any
    if (remove_multisig) {
        active_auth = {
            threshold: 1,
            keys: [
                {
                    key: active_key,
                    weight: 1
                },
            ],
            accounts: [] as any[],
            waits: [] as any[]
        }
    } else {
        active_auth = {
            threshold: 1,
            keys: [
                {
                    key: active_key,
                    weight: 1
                },
            ],
            accounts: [
                {
                    'permission': {
                        'actor': MAIN_CONTRACT,
                        'permission': 'multisig'
                    },
                    'weight': 1
                }
            ],
            waits: [] as any[]
        }
    }

    const auth = {
        account: account,
        permission: "active",
        parent: "owner",
        auth: active_auth
    }

    const _user_id = '0x' + replaceAll(user_id, "-", "");

    let transaction = await api.transact(
        {
          actions: [
            {
                account: 'eosio',
                name: "updateauth",
                authorization: [
                    {
                        actor: account,
                        permission: "active"
                    }
                ],
                data: auth
            },
            {
                account: MAIN_CONTRACT,
                name: "changeperm",
                authorization: [
                    {
                        actor: MAIN_CONTRACT,
                        permission: "active"
                    },
                    {
                        actor: account,
                        permission: "active"
                    }
                ],
                data: {
                    account: account,
                    owner_key: owner_key,
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
    const trx = api.deserializeTransaction(transaction.serializedTransaction);
    // console.log("++++trx:", trx);
    return [trx, transaction];
}

const generateRemoveMultisigTx = async(api: Api, account: string) => {
    const info = await api.rpc.get_account(account);
    const active_perm = info.permissions.find((x: any) => x.perm_name == 'active');

    if (active_perm.required_auth.keys.length !== 0) {
        throw Error("unsupported account permission!");
    }

    if (active_perm.required_auth.accounts.length !== 1) {
        throw Error("unsupported account permission!");
    }

    const account_perm = active_perm.required_auth.accounts[0].permission;
    if (account_perm.actor === MAIN_CONTRACT && account_perm.permission === 'multisig') {
        //
    } else {
        throw Error("unsupported account permission!");
    }
    
    if (active_perm.required_auth.threshold !== 1) {
        throw Error("unsupported account permission!");
    }

    active_perm.required_auth.accounts = [];

    const auth = {
        account: account,
        permission: "active",
        parent: "owner",
        auth: active_perm.required_auth
    }

    let transaction = await api.transact(
        {
          actions: [
            {
                account: 'eosio',
                name: "updateauth",
                authorization: [
                    {
                        actor: account,
                        permission: "active"
                    }
                ],
                data: auth
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
    const trx = api.deserializeTransaction(transaction.serializedTransaction);
    // console.log("++++trx:", trx);
    return [trx, transaction];
}

export {
    generateDepositTx,
    generateWithdrawTx,
    generateCreateAccountTx,
    generateBindAccountTx,
    generateChangePermTx,
    generateRemoveMultisigTx
}
