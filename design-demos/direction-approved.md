# Direction Approved · PPS 2026

- 日期：2026-09-28
- 三方向稿：design-demos/compare.html（A 轮盘 Neo-Brutalism / B 参照 ecsymposium / C Müller-Brockmann Swiss Grid）
- **用户选择原话**：「按照C的风格，注意footer的内容被侧边栏挡住了，请你给我按照C风格优化渲染后给我直接用nuxt4开发」
- 结论：以 **C（Swiss Grid / Müller-Brockmann）** 为最终视觉方向；**必修 bug：footer 内容被左侧固定索引栏遮挡**；并按 C 风格整体优化渲染。
- 附加需求（本轮开发范围）：
  1. Nuxt 4 全栈落地（按 PLAN Milestone 0-9）
  2. 支付功能完整：邮箱注册 → 订单 → 缴费（Mock 全链路，真实 WeChat/Alipay 适配器接口+webhook 就绪，密钥后续提供）
  3. 支付成功获取 QR code 凭证 → QR 验证参会
  4. 现场工作人员扫描 QR 签到：做成**独立扫码端**（V1 为移动优先的独立 web app /scan，可 PWA 安装；API 按可复用设计，未来微信小程序可直接调用同一套 /api/checkin 接口）
