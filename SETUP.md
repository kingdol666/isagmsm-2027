# SETUP — 上线配置指南

本文说明如何配置**邮箱 SMTP**，让系统具备真实邮件发送能力（地图已使用 MapLibre GL + OpenStreetMap 免费渲染，无需任何 Key）。所有配置都填写在项目根目录的 `.env` 文件中（复制 `.env.example` 为起点），填写后重启 `pnpm dev` 生效。启动日志会打印配置自检报告，`GET /api/health` 可随时查看当前状态。

---

## 1. 地图（无需配置）

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

## 2. 邮箱 SMTP（真实发送验证码邮件）

### 准备 SMTP 账号

常见邮箱的 SMTP 参数（其他服务商同理，在邮箱设置里开启 SMTP 服务）：

| 服务商 | SMTP 服务器 | 端口 | 加密 | 密码说明 |
|---|---|---|---|---|
| 腾讯企业邮 | smtp.exmail.qq.com | 465 | SSL | 邮箱登录密码 |
| QQ 邮箱 | smtp.qq.com | 465 | SSL | 必须用**授权码**（设置→账户→开启 SMTP→生成授权码） |
| 网易 163 | smtp.163.com | 465 | SSL | 必须用**授权码** |
| 阿里云邮 | smtp.qiye.aliyun.com | 465 | SSL | 邮箱登录密码 |

> 建议使用会议组织的专属邮箱（如 no-reply@你的域名），发件人更可信。

### 填入 `.env`

```bash
MAIL_SMTP_HOST=smtp.exmail.qq.com
MAIL_SMTP_PORT=465
MAIL_SMTP_SECURE=true
MAIL_SMTP_USER=no-reply@你的域名
MAIL_SMTP_PASS=密码或授权码
MAIL_FROM="ISAGMSM 会议 <no-reply@你的域名>"
```

重启后**自动切换为真实发信**：注册验证码 / 找回密码码将通过邮件发送（10 分钟有效，品牌化 HTML 模板），页面上不再显示 devCode。启动配置报告会显示 `mail : SMTP delivery active`。

> 未配置 SMTP 时系统处于 DEV 模式：验证码打印在服务端日志并直接显示在注册页（devCode），方便本地演示——这也是自动化测试依赖的模式。

---

## 3. 对公转账账户（缴费页展示）

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

## 4. 其他上线前清单

- [ ] `NUXT_SESSION_SECRET`：改为随机长字符串（`openssl rand -hex 32`）
- [ ] `ADMIN_PASSWORD` / `STAFF_PASSWORD`：设置强密码后重新 `pnpm db:seed`（或直接改库）
- [ ] `NUXT_PUBLIC_SITE_URL`：改为正式域名（影响二维码内容、验证链接、邮件链接）
- [ ] **管理台（admin/）**：复制 `admin/.env.example` 为 `admin/.env`，填 `DATABASE_URL` 与
      `NUXT_CONSOLE_SESSION_SECRET`（**必须与门户的 NUXT_SESSION_SECRET 不同**）；审稿邮件按需填 `MAIL_SMTP_*`
- [ ] **备份**：管理台 `.env` 里 `BACKUP_INTERVAL_HOURS=24`（默认开启）、`BACKUP_KEEP=14`、
      `BACKUP_DOCKER_CONTAINER=pps-postgres`；备份目录默认 `admin/backups/`（务必纳入服务器备份/异地容灾）
- [ ] 生产环境务必不要设置 `RATE_LIMIT_DISABLED=1` / `MAIL_DRIVER=test`（门户与管理台都是）
- [ ] 生产以 HTTPS 运行（自动获得 HSTS 与 CSP；CSP 也可用 `NUXT_CSP=1` 提前启用）

## 5. 安全机制一览（已内建）

| 层 | 机制 |
|---|---|
| 注入 | Drizzle 全参数化；管理台搜索 LIKE 通配符转义；注入回归测试（单测 + E2E） |
| 反爬 | 分端点限流 + 429/Retry-After（按连接级 IP 分桶，默认不信任 X-Forwarded-For；部署在 nginx 等可信代理后请设 `TRUST_PROXY=1`）；robots.txt Crawl-delay + 敏感路径禁爬 |
| 反作弊 | 蜜罐字段（注册/报名/投稿）；一账号一有效报名；投稿数量上限；管理台登录锁定 |
| 传输 | nosniff / DENY framing / Referrer-Policy / Permissions-Policy / COOP；生产 CSP + HSTS |
| 支付 | 服务端计价、签名验证、幂等 webhook、状态机守卫（伪造请求不影响订单） |
| 备份 | 管理台 pg_dump 定时/手动/保留策略/白名单下载（路径穿越防护） |
- [ ] 检查 `GET /api/health`：payments 应显示 wechat/alipay 中已配置者，mail 应显示 smtp
