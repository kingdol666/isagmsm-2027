# ISAGMSM 2027 · 组织委员会管理台（独立应用）

与会议官网（`../`，端口 3000）**完全解耦**的独立 Nuxt 4 应用：独立端口（**3001**）、
独立会话（cookie `pps_console`，密钥 `NUXT_CONSOLE_SESSION_SECRET`）、独立构建与部署。
两者唯一的数据通道是共享的 PostgreSQL —— 门户被入侵不影响管理台凭据，反之亦然。

## 运行

```bash
pnpm install                 # 仓库根目录（workspace 会一并安装 admin/）
pnpm dev:admin               # http://localhost:3001
```

首次使用复制 `admin/.env.example` 为 `admin/.env` 填入 `DATABASE_URL` 与
`NUXT_CONSOLE_SESSION_SECRET`（务必与门户的 `NUXT_SESSION_SECRET` 不同）。

登录账号来自 `admin_users` 表（门户种子创建）：

| 账号 | 默认密码 | 权限 |
|---|---|---|
| `admin` | `ADMIN_PASSWORD` 环境变量或 `pps26-admin` | 管理台全部操作 |
| `staff` | `STAFF_PASSWORD` 环境变量或 `pps26-staff` | **不能**登录管理台（仅供官网 /scan 扫码） |

## 职责范围

| 页面 | 能力 |
|---|---|
| 仪表盘 | 参会/会员/待审转账/待审稿件/缴费总额/签到数 |
| 参会管理 | 搜索筛选、**会员开关**（含取消会员自动吊销凭证）、收款确认、凭证下发/撤销/恢复、查看 QR |
| 缴费审批 | 待支付/审核中订单队列、通过/驳回（附原因） |
| 稿件审稿 | 全部投稿、历史、接收/返稿（意见邮件通知投稿人注册邮箱） |

## 会员-凭证绑定规则（核心不变量）

1. **凭证只发给会员**：收款确认与手动下发凭证都要求 `is_member = true`；
   非会员完成缴费不自动发证，设为会员后由管理员下发。
2. **取消会员 = 自动销毁凭证**：同一事务内摘除会员标识并吊销其全部有效凭证，
   旧 QR / token 在官网扫码端立即失效（`credentials.status = 'revoked'`）。
3. **仅管理员可操作入会**：管理台登录与全部 API 仅接受 `admin` 角色。

## 与门户的边界

- 门户（3000）没有任何管理页面与管理 API，也不认识 `pps_console` cookie；
- 门户只保留扫码端（`/scan` + `/api/staff/*` + `/api/checkin/*`，cookie `pps_staff`）；
- 数据库迁移只由门户拥有（`pnpm db:migrate`），管理台以只连库的方式工作。

## 数据库备份

- **定时**：`BACKUP_INTERVAL_HOURS`（默认 24，0 关闭）——启动 30 秒后做一次基线备份，之后按间隔执行；
- **手动**：管理台「数据库备份」页 → 立即备份；
- **保留**：`BACKUP_KEEP`（默认 14 份），超出自动清理最旧备份；
- **产物**：`pg_dump -Fc` 自定义格式，默认落盘 `admin/backups/`（已 gitignore），
  通过 `docker exec <BACKUP_DOCKER_CONTAINER> pg_dump` 执行（参数数组、无 shell、无用户输入）；
- **下载**：仅限 admin 会话；文件名严格白名单 `backup-YYYY-MM-DD-HHMMSS.dump` + resolve 前缀校验（路径穿越被 400 拒绝）；
- **恢复**（不在网页暴露，运维手工执行）：

```bash
docker exec -i pps-postgres pg_restore -U pps -d pps2026 --clean --if-exists < admin/backups/<file>.dump
```
