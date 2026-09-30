# SETUP — 部署与配置指南

本指南覆盖：**pm2 一键生产部署（阿里云）**、环境变量配置与生效方式、默认账号、
SMTP 邮件、对公转账、地图等。两种运行方式：

| 方式 | 命令 | 用途 |
|---|---|---|
| **生产部署（pm2 托管）** | `pnpm deploy:pm2` | 阿里云/服务器正式运行，后台守护、开机自启 |
| 开发模式（前台） | `pnpm start` | 本地开发调试，真实 SMTP，Ctrl+C 退出 |

---

## 1. pm2 一键部署（阿里云 / 任意服务器）

### 1.1 前置要求

```bash
# Node.js ≥ 20（含 npm）；pnpm；Docker（运行 PostgreSQL 与 对象存储 容器）
node -v && npm i -g pnpm
# Docker 安装（阿里云 Linux）：
#   dnf install -y docker-ce docker-ce-cli containerd.io   或 yum install docker && systemctl enable --now docker
```

> **Docker Hub 拉取失败时**（国内网络）：配置镜像加速器——编辑 `/etc/docker/daemon.json`
> 加入 `{"registry-mirrors": ["https://<你的阿里云加速器ID>.mirror.aliyuncs.com"]}`，
> 然后 `systemctl restart docker`（加速器地址在阿里云控制台「容器镜像服务 → 镜像加速器」获取）。

### 1.2 一条命令部署

```bash
pnpm deploy:pm2
```

自动完成（每一步均幂等，重复执行安全）：

1. 检查并按需全局安装 pm2
2. 首次部署自动生成 `.env` 与 `admin/.env`（**会话密钥随机生成**；SMTP 留空 = 验证码走屏显 devCode）
3. Docker 拉起 **PostgreSQL**（`pps-postgres`，端口 5433）与**对象存储 OSS**（`pps-minio`，S3 兼容，端口 9100）——运行中跳过 / 停止即启动 / 缺失则自动拉取创建
4. 等待双容器就绪 → 幂等数据库迁移 → **空库自动写入种子数据**（默认账号 + 会议展示数据）
5. `pnpm install` → 生产构建门户与管理台
6. **pm2 后台托管启动**双应用（门户 :3000 + 管理台 :3001，监听 `0.0.0.0`）
7. 健康检查 + 打印访问地址、局域网 IP、默认账号

数据（数据库与附件）保存在 Docker 卷 `pps_pgdata` / `pps_ossdata` 中——重启容器/服务器不丢失；
只有 `docker compose down -v` 或手动 `pnpm db:seed` 才会清空。

### 1.3 pm2 日常管理命令

| 命令 | 作用 |
|---|---|
| `pnpm pm2:status` | 查看两个应用的运行状态 |
| `pnpm pm2:logs` | 实时日志（`~/.pm2/logs/`） |
| `pnpm pm2:stop` | **停止门户与管理台**（数据不受影响） |
| `pnpm pm2:start` | 启动（已配置时；首次请用 `pnpm deploy:pm2`） |
| `pnpm pm2:restart` | 重启（改完环境变量后执行即可生效） |
| `pnpm pm2:delete` | 从 pm2 列表移除（进程停止且不再托管） |
| `pnpm pm2:save` | 保存当前进程列表（配合开机自启） |

原生 pm2 亦可用：`pm2 monit`（资源监控）、`pm2 show isagmsm-portal`。

### 1.3.1 日志轮转（建议一次性配置）

pm2 日志默认无限增长，建议部署后执行一次：

```bash
pm2 install pm2-logrotate      # 默认每 10MB 轮转，保留 30 份
```

### 1.4 开机自启（服务器重启后自动拉起）

```bash
pnpm pm2:save          # 保存当前进程列表
pm2 startup            # 按打印出的提示执行那条命令（root 会自动注册 systemd 服务）
# Docker 容器本身是 restart: unless-stopped，重启服务器后也会自动恢复
```

### 1.5 更新部署（代码更新后）

```bash
git pull
pnpm deploy:pm2        # 幂等：重建 → pm2 热重载，数据不受影响
# 只改了 .env 的话无需重建：pnpm pm2:restart 即可
```

### 1.6 公网访问（阿里云）

1. **安全组放行**：ECS 控制台 → 安全组 → 入方向规则：
   - TCP **3000**（门户 + 扫码端）→ 源 `0.0.0.0/0`
   - TCP **3001**（管理台）→ **建议只放行管理员自己的出口 IP**，不要对公网全开
2. 系统防火墙（如启用）：`firewall-cmd --permanent --add-port=3000/tcp --add-port=3001/tcp && firewall-cmd --reload`
3. **设置外网站点地址**（影响二维码、邮件里的链接）：编辑 `.env` 的 `NUXT_PUBLIC_SITE_URL`
   与 `admin/.env` 的 `NUXT_PUBLIC_PORTAL_URL` 为 `http://<公网IP>:3000`（或域名），然后 `pnpm pm2:restart`
4. 已绑定 `0.0.0.0`，局域网内直接 `http://<内网IP>:3000` 访问
5. 正式域名建议加 nginx 反向代理 + HTTPS：`proxy_pass http://127.0.0.1:3000;` 并在 .env 设 `TRUST_PROXY=1`（限流分桶信任 X-Forwarded-For）

### 1.7 小内存服务器构建 OOM（exit 134/137）

`nuxt build` 需要约 1.5GB+ 内存；2G 内存 ECS 构建会以 exit 134（SIGABRT）失败。
`pnpm deploy:pm2` 已自动处理：内存 <4G 时构建自动加 `NODE_OPTIONS=--max-old-space-size=1536`
（实测下限），并在无 swap 的机器上打印预警。若仍失败：

```bash
# 给服务器加 2G swap（一次性，root 执行；重启后仍生效）
dd if=/dev/zero of=/swapfile bs=1M count=2048
chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 然后重新部署
pnpm deploy:pm2
```

查看真实构建报错：部署脚本已直接透传构建输出（不再吞错）。

---

## 2. 默认账号

| 系统 | 地址 | 账号 | 密码 | 说明 |
|---|---|---|---|---|
| **管理台** | `http://<IP>:3001` | `admin` | `pps26-admin` | 审稿/收款/会员/凭证/备份（staff 角色不能登录管理台） |
| **扫码核验端** | `http://<IP>:3000/scan` | `staff` | `pps26-staff` | 现场签到（扫凭证 QR 或手输编号） |
| **门户（演示账号）** | `http://<IP>:3000/login` | `demo.user@example.test` | `Demo-2027-Pass!` | 种子内置的可登录演示账号 |
| **门户（真实用户）** | `http://<IP>:3000/sign-up` | 邮箱 + 验证码 | 自设密码（≥8 位） | 正式注册流程；SMTP 未配置时验证码屏显 |

> **修改默认密码**：在 `.env` 设置 `ADMIN_PASSWORD` / `STAFF_PASSWORD` / `DEMO_PASSWORD`
> （首次部署前设置最简单）；部署后修改需要重跑 `pnpm db:seed`——**该命令会清空全部业务数据**，
> 生产环境请谨慎（或直接在数据库层更新）。

---

## 3. 环境变量总表

门户配置在仓库根 **`.env`**，管理台在 **`admin/.env`**（首次 `pnpm deploy:pm2` 自动生成，
缺失时也可从 `.env.example` / `admin/.env.example` 复制）。改完执行 `pnpm pm2:restart` 生效；
标注「重建」的项需重新 `pnpm deploy:pm2`。

### 3.1 门户 `.env`

| 变量 | 必填 | 默认 | 说明 |
|---|---|---|---|
| `NUXT_PUBLIC_SITE_URL` | 公网必改 | `http://localhost:3000` | 站点对外地址（二维码/邮件链接） |
| `DATABASE_URL` | ✓（默认值即 compose 配置） | `postgresql://pps:pps_dev_pw@localhost:5433/pps2026` | PostgreSQL 连接串 |
| `NUXT_SESSION_SECRET` | 生产必改（自动随机生成） | — | 参会人会话签名密钥 |
| `NUXT_MOCK_PAYMENT_SECRET` | 生产必改（自动随机生成） | — | 模拟支付 webhook 签名 |
| `ADMIN_PASSWORD` / `STAFF_PASSWORD` / `DEMO_PASSWORD` | 建议 | 未设 = 见默认账号表 | **仅 seed 时生效**（见第 2 节修改说明） |
| `MAIL_SMTP_HOST` `MAIL_SMTP_PORT` `MAIL_SMTP_SECURE` `MAIL_SMTP_USER` `MAIL_SMTP_PASS` `MAIL_FROM` | 生产建议 | 空 = 开发模式（验证码屏显 devCode） | 见第 5 节；填齐自动真实发信 |
| `OSS_ENDPOINT` `OSS_PORT` `OSS_USE_SSL` | 默认即可 | `localhost` / `9100` / `false` | 对象存储（投稿附件）连接 |
| `OSS_ACCESS_KEY` `OSS_SECRET_KEY` `OSS_BUCKET` | 生产必改 | `ppsoss` / `pps-oss-dev-pw` / `pps-abstracts` | 与 docker-compose 的 `OSS_ROOT_USER`/`OSS_ROOT_PASSWORD` 保持一致 |
| `WECHAT_MCH_ID` `WECHAT_APP_ID` `WECHAT_PRIVATE_KEY` `WECHAT_CERT_SERIAL` `WECHAT_API_V3_KEY` `WECHAT_PLATFORM_CERTS` `WECHAT_NOTIFY_URL` | 可选 | 空 = 微信支付关闭 | 全部填齐自动启用（见 PAYMENT.md） |
| `ALIPAY_APP_ID` `ALIPAY_PRIVATE_KEY` `ALIPAY_PUBLIC_KEY` `ALIPAY_NOTIFY_URL` | 可选 | 空 = 支付宝关闭 | 同上 |
| `RATE_LIMIT_SCALE` | 可选 | `1` | 接口限流整体倍率（只放大不缩小） |
| `COOKIE_SECURE` | HTTPS 部署设 `1` | 按请求协议自动 | 会话 cookie 的 Secure 标志；已按请求协议自动（HTTPS 自动开启，HTTP 不加）；nginx 终止 TLS 时建议显式 `1` |
| `TRUST_PROXY` | 反代时设 `1` | 不信任 XFF | nginx 等可信代理后开启 |

### 3.2 管理台 `admin/.env`

| 变量 | 必填 | 默认 | 说明 |
|---|---|---|---|
| `DATABASE_URL` | ✓（默认值即 compose 配置） | 同上 | 与门户共用同一个 PostgreSQL |
| `NUXT_CONSOLE_SESSION_SECRET` | 生产必改（自动随机生成） | — | 管理台会话密钥，**必须与门户不同** |
| `NUXT_PUBLIC_PORTAL_URL` | 公网必改 | `http://localhost:3000` | 凭证「查看 QR」跳转的门户地址 |
| `BACKUP_INTERVAL_HOURS` / `BACKUP_KEEP` | 可选 | `24` / `14` | 数据库定时备份间隔（小时）/ 保留份数；`0` = 关闭定时 |
| `BACKUP_DIR` / `BACKUP_DOCKER_CONTAINER` | 可选 | `admin/backups` / `pps-postgres` | 备份输出目录 / 供 pg_dump 的容器名 |
| `MAIL_SMTP_*` `MAIL_FROM` | 建议 | 空 = 审稿结果仅日志 | 审稿接收/返稿邮件发送 |
| `OSS_*` | 与门户一致 | 同上 | 管理台附件下载使用 |

> **生效方式速查**：环境变量/密钥/SMTP/备份/OSS → `pnpm pm2:restart`；
> 代码、依赖、`nuxt.config.ts` → `pnpm deploy:pm2`（自动重建 + 热重载）。

---

## 4. 地图（无需配置）

地图使用 **MapLibre GL JS（WebGL）+ OpenStreetMap 免费瓦片**渲染，`pnpm install` 后开箱即用，无需申请任何 Key。

- 酒店预定页：三家酒店标记 + 点击弹窗
- 会场交通页：点击左侧交通节点，右侧地图飞行聚焦到对应位置

### 校准酒店 / 会场坐标

当前坐标为示例值。用高德[坐标拾取器](https://lbs.amap.com/tools/picker)搜索真实酒店名，把得到的经纬度填入 `shared/content/site.ts`：

```ts
// hotels（酒店预定页）
{ name: '会议主酒店', lng: 117.2897, lat: 31.7165, ... }
// transportationContent.transit（会场交通页）
{ code: '机场', name: '合肥新桥国际机场', lng: 116.6455, lat: 31.9835, ... }
```

> 生产大流量提示：OpenStreetMap 公共瓦片有[使用政策](https://operations.osmfoundation.org/policies/tiles/)限制，正式上线可替换为自建瓦片或 Carto 等免费源（改 `app/components/site/MapLibreView.vue` 的 `sources`）。

---

## 5. 邮箱 SMTP（真实发送验证码邮件）

常见邮箱的 SMTP 参数（其他服务商同理，在邮箱设置里开启 SMTP 服务）：

| 服务商 | SMTP 服务器 | 端口 | 加密 | 密码说明 |
|---|---|---|---|---|
| 腾讯企业邮 | smtp.exmail.qq.com | 465 | SSL | 邮箱登录密码 |
| QQ 邮箱 | smtp.qq.com | 465 | SSL | 必须用**授权码**（设置→账户→开启 SMTP→生成授权码） |
| 网易 163 | smtp.163.com | 465 | SSL | 必须用**授权码** |
| 阿里云邮 | smtp.qiye.aliyun.com | 465 | SSL | 邮箱登录密码 |

> 建议使用会议组织的专属邮箱（如 no-reply@你的域名），发件人更可信。门户与管理台的
> `.env` 各填一份（管理台用于审稿结果邮件）。

填入门户 `.env`：

```bash
MAIL_SMTP_HOST=smtp.exmail.qq.com
MAIL_SMTP_PORT=465
MAIL_SMTP_SECURE=true
MAIL_SMTP_USER=no-reply@你的域名
MAIL_SMTP_PASS=密码或授权码
MAIL_FROM="ISAGMSM 会议 <no-reply@你的域名>"
```

`pnpm pm2:restart` 后**自动切换为真实发信**：注册验证码 / 找回密码码将通过邮件发送
（10 分钟有效，品牌化 HTML 模板），页面上不再显示 devCode。启动配置报告会显示
`mail : SMTP delivery active`。

> 未配置 SMTP 时系统处于 DEV 模式：验证码打印在服务端日志（`pnpm pm2:logs`）并显示在
> 注册页（devCode）——这也是自动化测试依赖的模式。

---

## 6. 对公转账账户（缴费页展示）

在 `shared/content/site.ts` 的 `registrationInfoContent.bank` 中填写：

```ts
bank: {
  accountName: '会议组委会对公账户户名',
  bank: '开户银行（如：中国银行合肥滨湖支行）',
  accountNumber: '银行账号',
  remarkFormat: '参会ID-姓名',
  deadline: '银行转账截止：2027年4月15日',
},
```

缴费页会自动展示并生成「参会ID-姓名」格式的转账附言。

---

## 7. 其他上线前清单

- [ ] `NUXT_SESSION_SECRET` / `NUXT_CONSOLE_SESSION_SECRET`：`pnpm deploy:pm2` 已自动随机生成；泄露时更换后 `pnpm pm2:restart`
- [ ] `ADMIN_PASSWORD` / `STAFF_PASSWORD`：**首次部署前**在 `.env` 设置强密码（seed 自动采用）；部署后修改需重跑 seed（会清空业务数据）
- [ ] `NUXT_PUBLIC_SITE_URL` 与 `NUXT_PUBLIC_PORTAL_URL`：改为正式域名/IP（影响二维码内容、验证链接、邮件链接）
- [ ] `OSS_ACCESS_KEY` / `OSS_SECRET_KEY`：生产必改（与 docker-compose 的 `OSS_ROOT_USER`/`OSS_ROOT_PASSWORD` 同步修改）
- [ ] **备份**：管理台默认每日 pg_dump 到 `admin/backups/`（`BACKUP_KEEP=14`）——务必纳入服务器备份/异地容灾
- [ ] 生产环境不要设置 `RATE_LIMIT_DISABLED=1` / `MAIL_DRIVER=test`（门户与管理台都是）
- [ ] 生产以 HTTPS 运行（自动获得 HSTS 与 CSP；CSP 也可用 `NUXT_CSP=1` 提前启用）
- [ ] 检查 `GET /api/health`：payments 应显示已配置的渠道，mail 应显示 smtp

## 8. 安全机制一览（已内建）

| 层 | 机制 |
|---|---|
| 注入 | Drizzle 全参数化；管理台搜索 LIKE 通配符转义；注入回归测试（单测 + E2E） |
| 反爬 | 分端点限流 + 429/Retry-After（按连接级 IP 分桶，默认不信任 X-Forwarded-For；nginx 后设 `TRUST_PROXY=1`）；robots.txt Crawl-delay + 敏感路径禁爬 |
| 反作弊 | 蜜罐字段（注册/报名/投稿）；一账号一有效报名；投稿数量上限；管理台登录锁定 |
| 传输 | nosniff / DENY framing / Referrer-Policy / Permissions-Policy / COOP；生产 CSP + HSTS |
| 支付 | 服务端计价、签名验证、幂等 webhook、状态机守卫（伪造请求不影响订单） |
| 附件 | 扩展名白名单 + 魔数嗅探 + 10MB 上限；对象存 OSS（S3 兼容），下载按版本鉴权 |
| 备份 | 管理台 pg_dump 定时/手动/保留策略/白名单下载（路径穿越防护） |
