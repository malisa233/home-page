const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs');

const secretKey = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);
const GEE_CAPTCHA_KEY = `9f13430d7105b3bcefdc765f5538585f`;
const SERVER_PORT = 3000;
const version = `v1.0.0 Beta`
const admin_link = crypto.randomBytes(16).toString('hex');
console.log(`
███╗   ███╗ █████╗ ██╗     ██╗███████╗ █████╗     ██╗     ██╗████████╗███████╗
████╗ ████║██╔══██╗██║     ██║██╔════╝██╔══██╗    ██║     ██║╚══██╔══╝██╔════╝
██╔████╔██║███████║██║     ██║███████╗███████║    ██║     ██║   ██║   █████╗  
██║╚██╔╝██║██╔══██║██║     ██║╚════██║██╔══██║    ██║     ██║   ██║   ██╔══╝  
██║ ╚═╝ ██║██║  ██║███████╗██║███████║██║  ██║    ███████╗██║   ██║   ███████╗
╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚═╝╚══════╝╚═╝  ╚═╝    ╚══════╝╚═╝   ╚═╝   ╚══════╝

GeeTest Key: ${GEE_CAPTCHA_KEY}
Secret Key: ${secretKey.toString('hex')}
IV: ${iv.toString('hex')}

后台管理地址: http://localhost:${SERVER_PORT}/admin/${admin_link}
请不要泄露上述信息，否则可能导致您的账号被盗用。
版本号: ${version}
`
);

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

app.get('/captcha', (req, res) => {
    try {
        const info_decrypted = JSON.parse(decryptAES(req.cookies.info))
        res.render('captcha', { redirectUrl: info_decrypted.redirectUrl });
    } catch {
        return res.status(404).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
            <meta charset="utf-8">
            <title>Error</title>
            </head>
            <body>
            <pre>Cannot ${req.method} /captcha</pre>
            </body>
        </html>`
        );
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

app.post('/api/chat/completions', checkIllegal, (req, res) => {
    const { text } = req.body;
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
    res.render('index', JSON.parse(fs.readFileSync('config.json', 'utf8')));
});

app.get('/admin/' + admin_link, checkIllegal, (req, res) => {
    res.cookie('check2key', hmac_sha256_encode(secretKey+'admin'+iv, GEE_CAPTCHA_KEY), { maxAge: 600000, httpOnly: true });
    res.render('admin', JSON.parse(fs.readFileSync('config.json', 'utf8')));
});

app.post('/admin/config', checkIllegal, (req, res) => {
    const check2key = req.cookies.check2key;
    const hmac_token = hmac_sha256_encode(secretKey+'admin'+iv, GEE_CAPTCHA_KEY);
    if (check2key !== hmac_token) {
        return res.status(403).json({ code: -1, message: '身份校验失败' });
    }
    const { title, description, ischeckIllegal, isuseHVHsentence, footer_text, link1_text, link1_url, link2_text, link2_url, link3_text, link3_url, link4_text, link4_url } = req.body;
    const json = JSON.parse(fs.readFileSync('config.json', 'utf8'));    

    json.title = title;
    json.description = description;
    json.ischeckIllegal = ischeckIllegal;
    json.isuseHVHsentence = isuseHVHsentence;
    json.footer_text = footer_text;
    json.link1_text = link1_text;
    json.link1_url = link1_url;
    json.link2_text = link2_text;
    json.link2_url = link2_url;
    json.link3_text = link3_text;
    json.link3_url = link3_url;
    json.link4_text = link4_text;
    json.link4_url = link4_url;

    fs.writeFileSync('config.json', JSON.stringify(json));
    res.status(200).json({ code: 0, message: '保存成功' });
});

app.listen(SERVER_PORT, () => {
    console.log(`[DEBUG] 客户端开放在 http://localhost:${SERVER_PORT}/`);
});

