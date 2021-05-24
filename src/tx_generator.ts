import { supported_asset_ids, MAIN_CONTRACT, TOKEN_CONTRACT } from "./constants";
import { replaceAll } from './utils'

const generateDepositTx = async(api: any, account: string, amount: string, token_name: string, user_id: string, asset_id: string) => {
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
    // console.log("++++trx:", trx);
    return [trx, transaction];
}

const generateWithdrawTx = async(api: any, account: string, amount: string, token_name: string) => {
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
                memo: "withdraw"
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

export { generateDepositTx, generateWithdrawTx }
