const base = 'http://localhost:3000';
const stamp = Date.now();
const email = 'member-' + stamp + '@example.test';
const password = 'member-' + stamp + '-pass!';

// 1. 注册账号
const code = await fetch(base + '/api/auth/send-code', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ email, purpose: 'signup' }) }).then(r => r.json());
await fetch(base + '/api/auth/register', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ email, code: code.devCode, password, fullName: '会员验证' }) });

// 2. 登录并创建会议报名
const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ email, password }) });
const userCookie = login.headers.get('set-cookie').split(';')[0];
const types = await fetch(base + '/api/registration-types').then(r => r.json());
const created = await fetch(base + '/api/registrations', { method: 'POST', headers: {'content-type':'application/json', cookie: userCookie}, body: JSON.stringify({ participant: { typeId: types.find(t => t.code === 'student').id, fullName: '会员验证', email, phone: '13800000000', affiliation: '会员测试大学', country: '中国' } }) }).then(r => r.json());
console.log('registration:', created.registration.displayId);

// 3. 已注册邮箱 send-code 拦截
const again = await fetch(base + '/api/auth/send-code', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ email, purpose: 'signup' }) });
const body = await again.json().catch(() => ({}));
console.log('1) registered-email blocked:', again.status === 409 && /已经完成注册|直接登录/.test(body.statusMessage || '') ? 'PASS' : 'FAIL ' + again.status + ' ' + (body.statusMessage || ''));

// 4. admin 赋予会员标识
const adminLogin = await fetch(base + '/api/admin/login', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ username: 'admin', password: 'pps26-admin' }) });
const adminCookie = adminLogin.headers.get('set-cookie').split(';')[0];
const adminRegs = await fetch(base + '/api/admin/participants?search=' + encodeURIComponent(email), { headers: { cookie: adminCookie } }).then(r => r.json());
const target = adminRegs.rows[0];
const toggle = await fetch(`${base}/api/admin/participants/${target.registrationId}/membership`, { method: 'POST', headers: {'content-type':'application/json', cookie: adminCookie}, body: JSON.stringify({ isMember: true }) });
console.log('2) admin membership toggle:', toggle.status === 200 ? 'PASS' : 'FAIL ' + toggle.status);
console.log('REG_ID=' + target.registrationId);
