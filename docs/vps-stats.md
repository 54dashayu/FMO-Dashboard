# VPS 访问统计页部署说明

本文档说明如何在自己的 VPS 上为 FMO仪表盘 增加一个私有访问统计页。它适合站点管理员了解访问数量、终端 IP、粗略地区、约略流量和可识别到的 FMO 机主呼号。

> 这不是通联日志采集功能。统计页只读取 Web 服务器访问日志和网页端的极简统计心跳，不保存完整通联内容。

## 统计内容

统计页建议展示以下信息：

- 总请求数
- 独立 IP 数量
- 粗略地区：由公网 IP 查询得到，仅供参考
- 估算下行流量：来自 Nginx access log 的返回字节数
- 设备和浏览器类型
- 访问路径和主要静态资源流量
- 可识别到的 FMO 呼号、FMO 地址和协议

## 呼号识别逻辑

网页端会在用户访问公开站点时，尝试读取用户本地配置的 FMO 地址，并通过 FMO API 获取设备用户信息。若成功读取到机主呼号，网页会向同站点发送一个很小的统计请求：

```text
/__fmo_stats.gif?callsign=BH1JSS&fmo=192.168.31.146&protocol=ws
```

服务器不需要真的返回图片，只需要让 Nginx 记录这条访问即可。统计脚本再从 Nginx 日志中提取 `callsign`、`fmo`、`protocol` 等字段。

为了避免频繁写日志，网页端应做节流处理。例如同一个 FMO 地址每 30 分钟最多上报一次；如果一开始未读取到呼号，后续读取成功后可以补发一次带呼号的心跳。

## Nginx 配置示例

以下示例假设站点目录为 `/var/www/fmologs/dist`，统计页输出目录为 `/var/www/fmologs/stats`。

```nginx
location = /__fmo_stats.gif {
    access_log /var/log/nginx/fmologs.access.log;
    add_header Cache-Control "no-store";
    return 204;
}

location /stats/ {
    alias /var/www/fmologs/stats/;
    index index.html;
    auth_basic "FMO Dashboard Stats";
    auth_basic_user_file /etc/nginx/fmologs-stats.htpasswd;
    add_header Cache-Control "no-store";
}

location / {
    try_files $uri $uri/ /index.html;
}
```

部署后建议执行：

```bash
nginx -t
systemctl reload nginx
```

## 密码保护

统计页应设置 HTTP Basic Auth，避免公开暴露 IP、呼号等访问统计信息。

可以使用 `htpasswd` 生成认证文件：

```bash
htpasswd -c /etc/nginx/fmologs-stats.htpasswd admin
```

如果系统没有 `htpasswd`，可以安装 Apache 工具包：

```bash
apt install apache2-utils
```

不要把真实密码、认证文件内容、服务器私有路径写入公开仓库。

## 统计脚本

统计脚本可以定期读取 Nginx access log，生成一个静态 HTML 页面到 `/var/www/fmologs/stats/index.html`。脚本建议只做聚合统计，不输出完整访问日志。

建议保留的字段：

- IP
- 粗略地区
- 呼号
- FMO 地址
- 请求数
- 估算流量
- 首次访问时间
- 最近访问时间
- 设备和浏览器

## 定时更新

可以用 cron 每 5 分钟刷新一次统计页：

```cron
*/5 * * * * root /usr/bin/python3 /usr/local/bin/fmolog-stats-report.py >/dev/null 2>&1
```

## 隐私和安全注意事项

- 统计页会显示访问 IP 和可能识别到的呼号，应只提供给管理员查看。
- 如果站点仍使用 HTTP，Basic Auth 密码在网络中不是加密传输；建议尽快启用 HTTPS。
- IP 归属地只能粗略判断。移动网络、代理、公司出口、云服务器出口都可能导致地区不准确。
- 流量统计是服务器返回给浏览器的 Web 流量约数，不包含用户本地 FMO 设备产生的实际音频或 WebSocket 流量。
- 建议只保存聚合统计，避免公开或长期保存不必要的个人访问明细。
