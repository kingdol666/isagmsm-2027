/* eslint-disable no-console */
/**
 * HTTPS 适配（自签名证书 + nginx 双协议代理）—— 在阿里云服务器上以 root 执行：
 *
 *   pnpm https:setup --ip <公网IP>          # 80/443 → 门户 + 8443(HTTPS) → 管理台（默认全含）
 *   pnpm https:setup --ip <IP> --no-console # 不暴露管理台的 8443
 *
 * 行为：
 *   1. 生成自签名证书（SAN 含 IP/localhost，10 年）→ /etc/nginx/ssl/
 *   2. 写入 /etc/nginx/conf.d/isagmsm.conf：80(HTTP) 与 443(HTTPS) 同时代理门户 :3000；
 *      默认 8443(HTTPS) 代理管理台 :3001（生产建议安全组把 8443 限制到管理员 IP）。
 *      HTTP 不强制跳转（双协议并存）。
 *   3. nginx -t 校验并 reload
 *
 * 说明：自签名证书浏览器会提示"不安全"，点「高级 → 继续前往」一次即可（连接已加密）；
 *       要无警告的 HTTPS 需要域名 + Let's Encrypt（见 SETUP.md 1.6.1）。
 * 非 Linux / 未装 nginx 的环境：文件生成到 ./deploy-nginx/ 供手动部署。
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import os from 'node:os'

const IS_WIN = process.platform === 'win32'
const IS_LINUX = process.platform === 'linux'
const ROOT = process.cwd()

const WITH_CONSOLE = !process.argv.includes('--no-console')

function shOut(command, args) {
  const r = spawnSync(command, args, { stdio: 'pipe', shell: IS_WIN, encoding: 'utf8' })
  return { status: r.status, stdout: String(r.stdout ?? ''), stderr: String(r.stderr ?? '') }
}

function run(label, command, args) {
  process.stdout.write(`[https] ${label} … `)
  const r = shOut(command, args)
  if (r.status !== 0) {
    console.log('失败')
    console.error(r.stderr || r.stdout)
    throw new Error(label)
  }
  console.log('完成')
  return r
}

function detectIps() {
  const ips = []
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address)
    }
  }
  return ips
}

const NGINX_CONF = (sslDir, consoleBlock) => `# ISAGMSM 2027 —— 由 pnpm https:setup 生成（重新执行会覆盖）
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
${consoleBlock ? `
# 管理台（HTTPS :8443）—— 生产建议用安全组把 8443 限制到管理员 IP
server {
    listen 8443 ssl;
    server_name _;

    ssl_certificate ${sslDir}/isagmsm.crt;
    ssl_certificate_key ${sslDir}/isagmsm.key;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
` : ''}server {
    listen 443 ssl;
    server_name _;

    ssl_certificate ${sslDir}/isagmsm.crt;
    ssl_certificate_key ${sslDir}/isagmsm.key;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
`

function main() {
  console.log('── ISAGMSM 2027 · HTTPS 适配（自签名 + nginx 双协议） ──────────')

  /* 1. 收集要写进证书 SAN 的 IP（--ip 121.x.x.x 或 --ip=121.x.x.x 均可；服务器公网 IP 建议显式传入） */
  const argIp = (process.argv.find(a => a.startsWith('--ip=')) || '').split('=')[1]
    || process.argv[process.argv.indexOf('--ip') + 1]
    || ''
  const ips = [...new Set([...(argIp ? [argIp] : []), ...detectIps(), '127.0.0.1'])]
  console.log(`[https] 证书 SAN IP：${ips.join(', ')}`)
  const san = [...ips.map(ip => `IP:${ip}`), 'DNS:localhost'].join(',')

  /* 2. 生成自签名证书（10 年） */
  const certOut = IS_LINUX ? { dir: '/etc/nginx/ssl', root: true } : { dir: `${ROOT}/deploy-nginx`, root: false }
  mkdirSync(certOut.dir, { recursive: true })
  // -subj 的引号按平台区分：Windows cmd 需要引号包住 /CN=...；Linux 无 shell 时引号会被当成长名的一部分
  const subj = IS_WIN ? '"/CN=ISAGMSM"' : '/CN=ISAGMSM'
  run(
    '生成自签名证书（SAN 含 IP，10 年）',
    'openssl',
    ['req', '-x509', '-nodes', '-days', '3650', '-newkey', 'rsa:2048',
      '-keyout', `${certOut.dir}/isagmsm.key`, '-out', `${certOut.dir}/isagmsm.crt`,
      '-subj', subj, '-addext', `subjectAltName=${san}`],
  )

  const conf = NGINX_CONF(certOut.dir, WITH_CONSOLE)

  /* 3. Linux + nginx：直接安装配置并重载；其他环境：落到 ./deploy-nginx/ 供手动部署 */
  const nginxReady = shOut('nginx', ['-v']).status === 0
  if (IS_LINUX && nginxReady) {
    writeFileSync('/etc/nginx/conf.d/isagmsm.conf', conf)
    run('nginx 配置校验（nginx -t）', 'nginx', ['-t'])
    run('nginx 重载', 'systemctl', ['reload', 'nginx'])
    console.log('[https] nginx 已启用 80(HTTP) / 443(HTTPS)' + (WITH_CONSOLE ? ' / 8443(管理台 HTTPS)' : ''))
  }
  else {
    writeFileSync(`${ROOT}/deploy-nginx/isagmsm.conf`, conf)
    console.log('[https] 非 Linux/未装 nginx —— 配置与证书已生成到 ./deploy-nginx/：')
    console.log('        isagmsm.conf · isagmsm.crt · isagmsm.key')
    console.log('        手动部署：拷贝 conf 到 /etc/nginx/conf.d/，证书到 /etc/nginx/ssl/，然后 nginx -t && systemctl reload nginx')
  }

  /* 4. 提示 */
  console.log('')
  console.log('── HTTPS 适配完成 ──────────────────────────────────────────')
  console.log(`  HTTP  : http://<你的IP>/            （继续可用）`)
  console.log(`  HTTPS : https://<你的IP>/            （自签名：浏览器首次访问点「高级 → 继续前往」）`)
  if (WITH_CONSOLE) console.log('  管理台 : https://<你的IP>:8443/      （安全组放行 8443 并建议限管理员 IP）')
  console.log('  阿里云安全组：放行 TCP 443（如启用 8443 一并放行）')
  console.log('  要无警告的 HTTPS：注册域名 → DNS 解析到服务器 → 用 certbot 签发 Let\'s Encrypt 证书替换自签名')
  console.log('────────────────────────────────────────────────────────────')
}

main()
