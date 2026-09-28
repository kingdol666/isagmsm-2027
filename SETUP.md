# SETUP — 上线配置指南

本文说明如何填入**高德地图 Key** 与**邮箱 SMTP 配置**，让系统具备真实地图渲染与真实邮件发送能力。所有配置都填写在项目根目录的 `.env` 文件中（复制 `.env.example` 为起点），填写后重启 `pnpm dev` 生效。启动日志会打印配置自检报告，`GET /api/health` 可随时查看当前状态。

---

## 1. 高德地图 Key（酒店 / 会场交通真实地图）

### 申请步骤

1. 打开 [https://lbs.amap.com/](https://lbs.amap.com/)，注册/登录高德开放平台（支付宝或手机号即可）
2. 进入 **控制台 → 应用管理 → 创建新应用**（名称随意，如「ISAGMSM 会议」）
3. 在应用下 **添加 Key**：
   - 服务平台选择 **「Web端(JS API)」**
   - 勾选同意服务协议并提交
4. 得到两个值：
   - **Key**（32 位字符串）
   - **安全密钥 securityJsCode**（2021 年 12 月后申请的 Key 必须配合使用，在 Key 的「设置」里可查看）

### 填入 `.env`

```bash
NUXT_PUBLIC_AMAP_KEY=你的Key
NUXT_PUBLIC_AMAP_SECURITY_KEY=你的安全密钥
```

重启后，「酒店预定」页渲染真实地图（三家酒店标记 + 点击弹窗），「会场交通」页点击左侧列表即可切换地图到对应位置。

### 校准酒店 / 会场坐标

当前坐标为示例值。用高德[坐标拾取器](https://lbs.amap.com/tools/picker)搜索真实酒店名，把得到的经纬度填入 `shared/content/site.ts`：

```ts
// hotels（酒店预定页）
{ name: '会议主酒店', lng: 117.2897, lat: 31.7165, ... }
// transportationContent.transit（会场交通页）
{ code: '机场', name: '合肥新桥国际机场', lng: 116.6455, lat: 31.9835, ... }
```

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
  deadline: '银行转账截止：2026年4月15日',
},
```

缴费页会自动展示并生成「参会ID-姓名」格式的转账附言。

---

## 4. 其他上线前清单

- [ ] `NUXT_SESSION_SECRET`：改为随机长字符串（`openssl rand -hex 32`）
- [ ] `ADMIN_PASSWORD` / `STAFF_PASSWORD`：设置强密码后重新 `pnpm db:seed`（或直接改库）
- [ ] `NUXT_PUBLIC_SITE_URL`：改为正式域名（影响二维码内容、验证链接、邮件链接）
- [ ] 生产环境务必不要设置 `RATE_LIMIT_DISABLED=1`
- [ ] 检查 `GET /api/health`：payments 应显示 wechat/alipay 中已配置者，mail 应显示 smtp
