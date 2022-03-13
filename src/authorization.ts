import ReconnectingWebSocket from 'reconnecting-websocket';
import pako from 'pako';
import { v4 as uuidv4 } from 'uuid';

declare let window: any;

class Authorization {
    handled: boolean = false;
    endpoint: string = 'wss://blaze.mixin.one';
    ws: any;

    send(msg: any) {
        try {
            this.ws.send(pako.gzip(JSON.stringify(msg)));
        } catch (e) {
            console.error(e);
        }
    }

    sendRefreshCode(clientId: string, scope: string, codeChallenge: string, authorizationId: string) {
        if (this.handled) {
            return;
        }

        this.send({
            id: uuidv4().toUpperCase(),
            action: 'REFRESH_OAUTH_CODE',
            params: {
                'client_id': clientId,
                scope,
                'code_challenge': codeChallenge,
                'authorization_id': authorizationId,
            }
        });
    }

    connect(callback: any, clientId: string, scope: string, codeChallenge: string) {
        this.handled = false;
        this.ws = new ReconnectingWebSocket(this.endpoint, 'Mixin-OAuth-1', {
            maxReconnectionDelay: 5000,
            minReconnectionDelay: 1000,
            reconnectionDelayGrowFactor: 1.2,
            connectionTimeout: 8000,
            maxRetries: Infinity,
            debug: false
        });

        this.ws.addEventListener('message', (event: any) => {
            console.log("+++++++++message:", event.data)
            if (this.handled) {
                return;
            }

            event.data.arrayBuffer().then((value: any) => {
                console.log("++++++value:", value);
                const msg = pako.ungzip(value, { to: 'string' });
                console.log("+++++msg:", msg);
                const authorization = JSON.parse(msg);
                console.log("+++++msg:", authorization);
                if (callback(authorization)) {
                    this.handled = true;
                    return;
                }
                // setTimeout(() => {
                //     this.sendRefreshCode(clientId, scope, codeChallenge, authorization.data);
                // }, 1000);
            }).catch((err: any) => {
                console.log("++++++++err:", err);
            })
        });

        this.ws.addEventListener('open', (event: any) => {
            this.sendRefreshCode(clientId, scope, codeChallenge, '');
        });
    }
}

export default Authorization;
