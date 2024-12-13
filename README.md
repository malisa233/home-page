# 个人主页项目
## 项目介绍
个人主页项目是一个基于Node.js和EJS引擎的项目

## 项目第三方服务

本项目使用了讯飞科大大模型api和极验的行为验证4.0api。
在主页中还对接了韩小韩的情话api。

## 项目的使用方法

1. 安装Node.js及其包管理器 npm。
2. 克隆项目到本地：
   ```bash
   git clone https://github.com/malisa233/home-page.git
   ```
3. 安装项目依赖：
   ```bash
   npm install
   ```
4. 运行项目：
   ```bash
   node index.js
   ```
5. 打开浏览器，访问 http://localhost:3000 即可看到项目的首页。  

## 项目配置

打开根目录下的index.js文件，往下翻，可以看到如下配置：

```javascript
//配置区-->
const SPARK_TOKEN = `wZoywWrKlBKXBbzdaYHu:JmYCNiAscbiLsPNiUGSs`;
const GEE_CAPTCHA_KEY = `9f13430d7105b3bcefdc765f5538585f`;
//<--配置区
```

这里的配置主要是为了接入第三方服务，包括讯飞科大的大模型api和极验的行为验证4.0api。
你可以更改为自己的配置，也可以继续使用malisa233的配置。
使用你自己的配置可以更好的协助你监视和管理你的网站。

## 更新日志

- 2024-12-13 ：发布1.0 Beta版本。

- 2024-12-5：项目开源。

## 项目开源协议

本项目使用MIT协议开源。

## 注意事项

在运行时如果报错，请检查是否配置了正确的配置。
或者使用一下命令重新运行：
```bash
node index.js
```