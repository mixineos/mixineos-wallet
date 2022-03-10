import Authorization from './authorization';
import QRious from 'qrious';

class OAuth {
    authorize(clientId: string, scope: string, codeChallenge: string, state: string) {
        const auth = new Authorization();
        auth.connect((resp: any) => {
            if (resp.error) {
                return;
            }

            const data = resp.data;
            if (!data) {
                return false;
            }

            if (data.authorization_code.length > 16) {
                // handle data.authorization_code here
            }

            // display qrcode
            new QRious({
                element: document.getElementById('mixin-code'),
                backgroundAlpha: 0,
                foreground: '#00B0E9',
                value: 'https://mixin.one/codes/' + data.code_id,
                level: 'H',
                size: 500
            });
        }, clientId, scope, codeChallenge);
    }
}

export default OAuth;
