import { v4 } from 'uuid';
import { JsonRpc } from "eosjs/dist/eosjs-jsonrpc";
const mixincross = {
    "rows":[
        {
            "account":"learnforlove",
            "client_id":"185839900793592757838563894564469246679",
            "signer_key":"EOS6SD6yzqaZhdPHw2LUVmZxWLeWxnp76KLnnBbqP94TsDsjNLosG",
            "manager_key":"EOS74feUjsXwbdSBCwo6w18CriBdYWF7imPpC2F1iGYw3rUAxARv1",
            "total_stake":"0.1000 EOS",
            "last_unstake_quantity":"0 ",
            "last_unstake_time":"1970-01-01T00:00:00.000",
            "url":"http://192.168.1.3:9803"
        },
        {
            "account":"learnfortest",
            "client_id":"183876869939131173236693101619586838601",
            "signer_key":"EOS4vtCi4jbaVCLVJ9Moenu9j7caHeoNSWgWY65bJgEW8MupWsRMo",
            "manager_key":"EOS55EmA6UGahjU2GcPHE6Y57Yp6LFQT2hF7h6Qh2bNsNFRdkKB14",
            "total_stake":"0.1000 EOS",
            "last_unstake_quantity":"0 ",
            "last_unstake_time":"1970-01-01T00:00:00.000",
            "url":"http://192.168.1.3:9801"
        },
        {
            "account":"learntotest1",
            "client_id":"307663454340918035044272996255493943870",
            "signer_key":"EOS82JTja1SbcUjSUCK8SNLLMcMPF8W5fwUYRXmX32obtjsZMW9nx",
            "manager_key":"EOS7kknXw8jBz9DfFJAxq5S1qf1nZRes1cz1zCocnT1nmS2Z1QNW5",
            "total_stake":"0.2000 EOS",
            "last_unstake_quantity":"0 ",
            "last_unstake_time":"1970-01-01T00:00:00.000",
            "url":"http://192.168.1.3:9805"
        }
    ],
    "more":false,
    "next_key":""
}

describe('mixineos', () => {
    let api: any;
    let rpc: any;

    const getAccessToken = () => {
        return "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJhaWQiOiJiYzhjMGY5NC0xNjQ0LTQ2ZDItODkzYy1mOTYyZTU5NmI2ZTMiLCJleHAiOjE2NTI0MzI0MjEsImlhdCI6MTYyMDg5NjQyMSwiaXNzIjoiNDliMDA4OTItNjk1NC00ODI2LWFhZWMtMzcxY2ExNjU1NThhIiwic2NwIjoiUFJPRklMRTpSRUFEIn0.GwrfEQeWMRFkhsIe85YlyGaAQzPChnWE9fZ7Tsapa2EmVnZHK-rq16T6uTUxA1x2awYDDEa-NNxZQmdn0LBT6rlZzMxMPPSRjdEvO-Ty3ZylfMuA3EwZA19SMwE2Y3YmA9Dnc3TfeTw9-TgpRVozmeg50LczpS-kJVOSEdltj90";
    }

    const request_payment = async (amount: string, trace_id: string, receivers: string[], memo: string, asset_id: string) => {
        const account = await rpc.get_account('mixincrossss');
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
                "receivers": receivers,
                "threshold": multisig.required_auth.threshold
            }
        }
    
        const ret = await fetch("https://mixin-api.zeromesh.net/payments", {
            method: "POST",
            headers: {
                "Content-type": "application/json",
                'Authorization' : 'Bearer ' + getAccessToken(),
                // "X-Request-Id": v4()
            },
            body: JSON.stringify(payment),
        });
    
        const ret2 = await ret.json();
        console.log("+++++++++payment return:", ret2);
        // TODO check error details
        if (ret2.error) {
            // request_access_token();
            throw Error(ret2.error);
        }
        return ret2.data;
    }


    const fetch = async (input: any, init: any): Promise<any> => ({
        ok: true,
        json: async () => {
            if (input === '/v1/chain/get_raw_code_and_abi') {
                return {
                    account_name: 'testeostoken',
                    abi: 'DmVvc2lvOjphYmkvMS4wAQxhY2NvdW50X25hbWUEbmFtZQUIdHJhbnNmZXIABARmcm9tDGFjY291bnRfbmFtZQJ0bwxhY2NvdW50X25hbWUIcXVhbnRpdHkFYXNzZXQEbWVtbwZzdHJpbmcGY3JlYXRlAAIGaXNzdWVyDGFjY291bnRfbmFtZQ5tYXhpbXVtX3N1cHBseQVhc3NldAVpc3N1ZQADAnRvDGFjY291bnRfbmFtZQhxdWFudGl0eQVhc3NldARtZW1vBnN0cmluZwdhY2NvdW50AAEHYmFsYW5jZQVhc3NldA5jdXJyZW5jeV9zdGF0cwADBnN1cHBseQVhc3NldAptYXhfc3VwcGx5BWFzc2V0Bmlzc3VlcgxhY2NvdW50X25hbWUDAAAAVy08zc0IdHJhbnNmZXLnBSMjIFRyYW5zZmVyIFRlcm1zICYgQ29uZGl0aW9ucwoKSSwge3tmcm9tfX0sIGNlcnRpZnkgdGhlIGZvbGxvd2luZyB0byBiZSB0cnVlIHRvIHRoZSBiZXN0IG9mIG15IGtub3dsZWRnZToKCjEuIEkgY2VydGlmeSB0aGF0IHt7cXVhbnRpdHl9fSBpcyBub3QgdGhlIHByb2NlZWRzIG9mIGZyYXVkdWxlbnQgb3IgdmlvbGVudCBhY3Rpdml0aWVzLgoyLiBJIGNlcnRpZnkgdGhhdCwgdG8gdGhlIGJlc3Qgb2YgbXkga25vd2xlZGdlLCB7e3RvfX0gaXMgbm90IHN1cHBvcnRpbmcgaW5pdGlhdGlvbiBvZiB2aW9sZW5jZSBhZ2FpbnN0IG90aGVycy4KMy4gSSBoYXZlIGRpc2Nsb3NlZCBhbnkgY29udHJhY3R1YWwgdGVybXMgJiBjb25kaXRpb25zIHdpdGggcmVzcGVjdCB0byB7e3F1YW50aXR5fX0gdG8ge3t0b319LgoKSSB1bmRlcnN0YW5kIHRoYXQgZnVuZHMgdHJhbnNmZXJzIGFyZSBub3QgcmV2ZXJzaWJsZSBhZnRlciB0aGUge3t0cmFuc2FjdGlvbi5kZWxheX19IHNlY29uZHMgb3Igb3RoZXIgZGVsYXkgYXMgY29uZmlndXJlZCBieSB7e2Zyb219fSdzIHBlcm1pc3Npb25zLgoKSWYgdGhpcyBhY3Rpb24gZmFpbHMgdG8gYmUgaXJyZXZlcnNpYmx5IGNvbmZpcm1lZCBhZnRlciByZWNlaXZpbmcgZ29vZHMgb3Igc2VydmljZXMgZnJvbSAne3t0b319JywgSSBhZ3JlZSB0byBlaXRoZXIgcmV0dXJuIHRoZSBnb29kcyBvciBzZXJ2aWNlcyBvciByZXNlbmQge3txdWFudGl0eX19IGluIGEgdGltZWx5IG1hbm5lci4KAAAAAAClMXYFaXNzdWUAAAAAAKhs1EUGY3JlYXRlAAIAAAA4T00RMgNpNjQBCGN1cnJlbmN5AQZ1aW50NjQHYWNjb3VudAAAAAAAkE3GA2k2NAEIY3VycmVuY3kBBnVpbnQ2NA5jdXJyZW5jeV9zdGF0cwAAAA===', // eslint-disable-line
                };
            } else if (input === '/v1/chain/get_account') {
                return mixincross;
            }

            return mixincross;
        },
    });

    beforeEach(() => {
        rpc = new JsonRpc('', { fetch });
    });

    it('Doesnt crash', async () => {
        const trace_id = v4();
        try {
            const account = await rpc.get_account('mixincrossss');
            console.log(account);
        } catch (e) {
            console.log(e);
        }
        // = "965e5c6e-434c-3fa9-b780-c50f43cd955c"
        // const request_payment("1.0", trace_id, receivers: string[], memo: string, asset_id: string = "965e5c6e-434c-3fa9-b780-c50f43cd955c") => {

        // expect(api).toBeTruthy();
    });
});
