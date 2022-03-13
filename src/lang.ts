export type Item = {
    [key: string]: string
}

const lang_en: Item = {
    "Awaiting confirmation...": "Awaiting confirmation...",
    "Confirm": 'Confirm',
    "Cancel": "Cancel",
    text_1: "You don't have an EOS account yet, do you need to create one?",
    "Payment successful!": "Payment successful!",
}

const lang_cn: Item = {
    "Awaiting confirmation...": "'正在等待确认...'",
    "Confirm": '确定',
    "Cancel": "取消",
    text_1: "'你还没有EOS账号，需要创建吗?'",
    "Payment successful!": "付款成功!",
}

let currentLang: Item = lang_en;

export function changeLang(lang: string) {
    if (lang == "en") {
        currentLang = lang_en;
    } else if (lang == "cn") {
        currentLang = lang_cn;
    } else {
        throw Error(`Unsupported language: ${lang}`)
    }
}

export function tr(key: string) {
    return currentLang[key];
}
