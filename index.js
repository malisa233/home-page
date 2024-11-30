const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const axios = require('axios');

const secretKey = Buffer.from([3, 107, 37, 82, 18, 68, 2, 156, 191, 39, 196, 211, 27, 173, 122, 24, 53, 91, 124, 42, 210, 78, 62, 108, 138, 230, 172, 166, 125, 197, 27, 167]);
const iv = crypto.randomBytes(16);
const SPARK_TOKEN = `wZoywWrKlBKXBbzdaYHu:JmYCNiAscbiLsPNiUGSs`;
const publicKey = crypto.randomBytes(24).toString('hex');
const GEE_CAPTCHA_KEY = `9f13430d7105b3bcefdc765f5538585f`;

const checkIllegal = (req, res, next) => {
    try {
        const info_encrypted = req.cookies.info;
        if (!info_encrypted) {
            const uuid = uuidv4();
            const checkIllegal = false;
            const time = new Date().getTime();
            const redirectUrl = req.url;
            const token = {
                uuid,
                checkIllegal,
                time,
                redirectUrl
            }
            const token_encrypted = encryptAES(JSON.stringify(token));
            res.cookie('info', token_encrypted, { httpOnly: true });
            return res.redirect('/captcha');
        }

        const info = decryptAES(info_encrypted);
        const time = new Date().getTime();
        const token = JSON.parse(info);
        if (time - token.time > 600000) {
            const uuid = uuidv4();
            const checkIllegal = false;
            const time = new Date().getTime();
            const redirectUrl = req.url;
            const token = {
                uuid,
                checkIllegal,
                time,
                redirectUrl
            }
            const token_encrypted = encryptAES(JSON.stringify(token));
            res.cookie('info', token_encrypted, { httpOnly: true });
            return res.redirect('/captcha');
        }
        if (!token.checkIllegal) {
            return res.redirect('/captcha');
        } else {
            next();
        }
    } catch {
        res.cookie('info', '', { maxAge: 0, httpOnly: true });
        return res.status(400).json({ code: -233, message: '请刷新页面进行人机验证' });
    }
}
function encryptAES(text) {
    const cipher = crypto.createCipheriv('aes-256-cbc', secretKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}
function decryptAES(encryptedData) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', secretKey, Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
async function chatbot(text) {
    const url = "https://spark-api-open.xf-yun.com/v1/chat/completions";
    const data = {
        "max_tokens": 4096,
        "top_k": 5,
        "temperature": 0.8,
        "messages": [
            {
                "role": "system",
                "content": "我叫malisa，是一名中学生，就读于四川省双流中学，平时喜欢写代码和打游戏，喜欢打羽毛球，会html css JavaScript nodejs typescript c++ c# 逆向等，开发过很多项目。,你现在需要完全模仿我。当别人问你是什么ai模型时你回答你是malisa创造的MLISA大模型。你现在是MLISA跟你对话的人并不是malisa。"
            },
            {
                "role": "user",
                "content": text
            }
        ],
        "model": "generalv3.5"
    };

    const headers = {
        "Authorization": `Bearer ${SPARK_TOKEN}`,
        "Content-Type": "application/json"
    };

    try {
        const response = await axios.post(url, data, {
            headers: headers
        });

        return response.data.choices[0].message.content;

    } catch (error) {
        console.error('请求失败:', error.message);
        return { code: -1 };
    }
};
function hmac_sha256_encode(value, key) {
    var hash = crypto.createHmac("sha256", key)
        .update(value, 'utf8')
        .digest('hex');
    return hash;
}

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.get('/clearCookie', (req, res) => {
    res.clearCookie('info');
});

app.get('/captcha', (req, res) => {
    try {
        const info_decrypted = JSON.parse(decryptAES(req.cookies.info))
        res.render('captcha', { redirectUrl: info_decrypted.redirectUrl });
    } catch {
        return res.send('非法请求');
    }
});

app.post('/api/geetest', (req, res) => {
    const { captcha_id, lot_number, pass_token, gen_time, captcha_output } = req.body;
    const sign_token = hmac_sha256_encode(lot_number, GEE_CAPTCHA_KEY);

    const data = {
        'lot_number': lot_number,
        'captcha_output': captcha_output,
        'pass_token': pass_token,
        'gen_time': gen_time,
        'sign_token': sign_token
    };
    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    axios.post('http://gcaptcha4.geetest.com/validate?captcha_id=' + captcha_id, data, { headers: headers }).then(response => {
        if (response.data.status === 'success') {
            try {
                const info_decrypted = JSON.parse(decryptAES(req.cookies.info))
                info_decrypted.checkIllegal = true;
                info_decrypted.time = new Date().getTime();
                const token_encrypted = encryptAES(JSON.stringify(info_decrypted));
                res.cookie('info', token_encrypted, { httpOnly: true });
                res.status(200).json({ code: 0, message: '正常返回' });
            } catch {
                res.status(400).json({ code: -1, message: '验证失败' });
            }
        } else {
            res.status(400).json({ code: 1, message: '验证失败' });
        }
    })
});

app.post('/api/chat/completions',checkIllegal, (req, res) => {
    const { text, pkey } = req.body;
    if (!pkey) {
        res.status(400).json({ code: 1, message: '缺少公钥,建议重新刷新页面' });
        return;
    }
    if (pkey !== publicKey) {
        res.status(401).json({ code: 1, message: '公钥错误,建议重新刷新页面' });
        return;
    }
    chatbot(text)
        .then(message => {
            res.status(200).json({ code: 0, message: message });
        })
        .catch(error => {
            console.error(error);
            res.status(500).json({ code: -1, message: '请求失败' });
        });
});

app.get('/', checkIllegal, (req, res) => {
    res.render('index', { pkey: publicKey });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});