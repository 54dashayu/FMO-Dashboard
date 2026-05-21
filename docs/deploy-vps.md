# VPS 部署说明

本文档说明如何将 FMO仪表盘 部署到自己的 VPS。不要在仓库中保存服务器密码、私钥或面板登录信息。

## 当前线上信息

当前维护中的公开站点：

- `https://fmo.bh1jss.net/`
- `https://fmolog.bh1jss.net/`

当前 VPS 项目目录：

```text
/var/www/fmologs
```

当前部署方式：

- VPS 上拉取 GitHub 仓库。
- 执行 `npm install`。
- 执行 `npm run build`。
- Nginx 指向 `dist/` 目录。
- HTTPS 由 VPS 上的 Nginx/证书配置提供。

## 首次部署思路

1. 在 VPS 安装 Node.js、npm、git、nginx。
2. 拉取仓库：

```bash
git clone https://github.com/54dashayu/FMO-Dashboard.git /var/www/fmologs
```

3. 安装依赖并构建：

```bash
cd /var/www/fmologs
npm install
npm run build
```

4. 配置 Nginx，将域名根目录指向：

```text
/var/www/fmologs/dist
```

5. 配置 HTTPS 证书。
6. 检查并重载 Nginx：

```bash
nginx -t
systemctl reload nginx
```

## 日常更新部署

在 VPS 上执行：

```bash
cd /var/www/fmologs
git fetch origin main
git reset --hard origin/main
npm install
npm run build
nginx -t
systemctl reload nginx
```

建议更新前保留上一版 `dist`：

```bash
if [ -d dist ]; then rm -rf dist.prev && cp -a dist dist.prev; fi
```

## 注意事项

- 不要把 root 密码写入仓库。
- 不要把 VPS 私有配置、证书私钥、面板 Cookie 写入仓库。
- Trajan、其他静态站点或面板配置可能与 Nginx 域名配置共存，修改前先检查当前 vhost 文件。
- 如果域名变更，例如 `fmolog.bh1jss.net` 改为 `fmo.bh1jss.net`，需要同时检查 DNS A 记录和 Nginx server_name。
- Web 版通过 HTTPS 访问时，浏览器对访问局域网 FMO 地址的安全策略可能更严格；用户侧仍需要正确配置 FMO 地址和网络连通性。

## 统计页

访问统计相关说明见：

```text
docs/vps-stats.md
```

统计页属于 VPS 私有部署能力，不应在公开仓库中保存真实密码。
