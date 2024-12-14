# 个人主页项目
## 项目介绍
个人主页项目是一个基于Node.js和EJS引擎的项目

## 项目第三方服务

1. 极验的行为验证4.0api。
2. 韩小韩的情话api。

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
6. 访问 http://localhost:3000/admin 即可看到管理后台，开源进行网站的管理。

## 更新日志

- 2024-12-14 ：发布1.0版本。增加管理后台。
   1. 增加管理后台，可以对网站的设置、内容进行管理。
   2. 删除了对讯飞科大大模型的支持。关闭chat接口。
   3. 优化了部分代码。更加流畅。
   4. 修复了一些已知问题。

- 2024-12-13 ：发布1.0 Beta版本。

- 2024-12-5：项目开源。

## 项目开源协议

本项目使用[MIT](https://opensource.org/license/MIT)协议开源。

## 注意事项

在运行时如果报错，请检查是否配置了正确的配置。
或者使用一下命令重新运行：
```bash
node index.js
```