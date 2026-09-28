# PPS 2026 落地页设计 Spec（三方向稿唯一共同输入）

> 本文件是三个设计方向 subagent 的唯一共同输入。三个版本使用**完全相同的内容与品牌资产**，只允许设计诠释不同。禁止参考其他版本。

## 1. 项目是什么

**Polymer Processing Symposium 2026（PPS 2026）**——高分子成型加工领域国际学术研讨会的官方网站落地页。会议主题：

> Materials · Processing · Manufacturing · Intelligence

三个方向稿是设计探索（design comps），最终将落地为 Nuxt 4 工程里的真实首页。本轮只需交付单文件 HTML，但要按"这就是正式首页"的标准做。

**受众**：全球高分子加工领域的研究者（流变学、加工工程、仿真、AI）、高校师生、产业界工程师与研发负责人。英文为主要语言。

**使用场景**：桌面/笔记本浏览为主（1m 距离），手机是一等公民（25cm 距离）。用户进来要在 5 秒内知道：这是什么会、谁参加、研究什么、什么时候、在哪里、如何报名。

**情感基调关键词**：
```
Editorial（编辑部级排版）
Academic（学术权威）
Industrial（工业感——高分子加工是制造业）
Materials Science（材料科学）
Minimal（克制）
Premium（高级）
International（国际会议气质）
Technical（技术严谨）
```

## 2. 内容（三个版本必须使用完全相同的文案，一字不差的英文 copy）

### Navigation
锚点导航：Symposium / Themes / Speakers / Program / Venue / **Register**（CTA 按钮样式）。品牌标识写法：`PPS·26` 或 `PPS 2026`（各版本可自定排版处理）。

### Hero
```
POLYMER
PROCESSING

SYMPOSIUM 2026

Materials · Processing · Manufacturing · Intelligence

15—17 OCTOBER 2026
HEFEI · CHINA

[ REGISTER NOW ]  [ VIEW PROGRAM ]
```
Hero 不要堆文字。强 Editorial Typography。第一屏必须同时有明确视觉锚点。

### About
标题：About the Symposium（可变措辞）

正文 P1:
> PPS 2026 is an international symposium dedicated to polymer processing — the science and engineering that turns polymer materials into real products. Over three days, researchers and engineers from academia and industry will gather in Hefei to exchange the latest advances across extrusion, molding, rheology, additive manufacturing and process simulation.

正文 P2:
> Polymer processing is entering a new era: materials, process engineering, computation and intelligent manufacturing are converging. PPS 2026 provides a forum for this convergence — where rheologists meet data scientists, where simulation meets the production line, and where fundamental insight becomes industrial practice.

### Research Themes（必须 editorial/typographic 排版，禁止做成 SaaS 六宫格卡片墙）
01 Extrusion — Single- and twin-screw extrusion, reactive processing, compounding
02 Injection Molding — Precision molding, micro-injection, process control
03 Film Processing — Blown and cast film, flexible packaging, multilayer structures
04 Fiber Spinning — Melt spinning, nanofibers, structure formation in fibers
05 Polymer Rheology — Extensional rheology, viscoelasticity, flow characterization
06 Additive Manufacturing — 3D printing polymers, sintering, printed functional devices
07 Process Simulation — Finite element flow modeling, numerical process design
08 AI & Digital Twins — Machine learning for processing, virtual process lines

### Keynote Speakers（4 位，示例数据，头像用姓名首字母 monogram 占位，禁止使用真实照片）
1. Prof. Elena Marchetti — Politecnico di Torino, Italy — "Reactive Extrusion: Where Materials Chemistry Meets Process Engineering"
2. Prof. Hiroshi Tanaka — Tokyo Institute of Technology, Japan — "Precision Injection Molding for Micro-Optical Components"
3. Prof. Sarah Chen — Massachusetts Institute of Technology, USA — "Machine Learning Models for Polymer Process Simulation"
4. Prof. Lars Johansson — KTH Royal Institute of Technology, Sweden — "Fiber Spinning at the Nanoscale: Structure Control in Processing"

布局要求（计划硬性）：Desktop 4 列 / Tablet 2 列 / Mobile 1 列。图片必须防止 CLS（monogram 块用固定 aspect-ratio）。

### Program（3 天，tab/segmented 切换）
Day 1 — 15 Oct:
- 08:30–09:00 Opening Ceremony — Main Hall
- 09:00–10:00 Keynote: Reactive Extrusion — E. Marchetti — Main Hall
- 10:30–12:00 Session A: Advances in Extrusion — Hall A
- 13:30–15:00 Session B: Rheology & Characterization — Hall A
- 15:30–17:00 Session C: Polymer Processing Simulation — Hall B
- 17:30–18:30 Welcome Reception — Lobby

Day 2 — 16 Oct:
- 09:00–10:00 Keynote: Machine Learning for Process Simulation — S. Chen — Main Hall
- 10:30–12:00 Session D: Injection Molding — Hall A
- 13:30–15:00 Session E: Film Processing & Flexible Packaging — Hall B
- 15:30–17:00 Session F: Additive Manufacturing — Hall A
- 17:00–18:00 Poster Session I — Exhibition Area

Day 3 — 17 Oct:
- 09:00–10:00 Keynote: Fiber Spinning at the Nanoscale — L. Johansson — Main Hall
- 10:30–12:00 Session G: AI & Digital Twins — Hall B
- 13:30–15:00 Session H: Fiber Spinning & Textile Materials — Hall A
- 15:30–16:30 Closing Remarks & Awards — Main Hall

桌面呈现 Time / Session / Speaker / Room 列结构；移动端按日期分组卡片。tab 切换可用少量原生 JS。

### Important Dates
- Call for Abstracts — 01 MAY 2026
- Early Registration Deadline — 01 AUG 2026
- Regular Registration Deadline — 01 SEP 2026
- Symposium — 15—17 OCT 2026

### Venue（示例数据）
- 名称：Hefei Binhu International Convention & Exhibition Centre（示例，待确认）
- Address: Binhu International Convention & Exhibition Centre, Hefei, Anhui Province, China
- Transportation:
  - Hefei Xinqiao International Airport — approx. 40 min by car
  - Hefei South Railway Station (High-Speed) — approx. 25 min by car
  - Metro Line 1 — Binhu Convention Centre Station
- Hotels: Partner hotel list to be announced.
- 地图：用 CSS/SVG 做抽象化风格地图占位块（标注 "Map — to be embedded"），禁止用假地图截图。

### Registration（4 种类型，示例价格）
- Student — ¥1,600 — For undergraduate & graduate students (valid ID required) — Available
- Academic — ¥2,400 — Faculty & research staff of universities and institutes — Available
- Industry — ¥3,600 — Professionals & engineers from industry — Available
- Invited Speaker — ¥0 — By invitation of the organising committee — On invitation

CTA: Register Now。价格旁小字标注 "Prices in CNY. Sample data."（一行小字，诚实标注）。

### Sponsors（示例 wordmark，全部虚构，禁止使用真实公司 logo/名称）
- PolyNova Materials（Platinum）
- RheoTech Instruments（Gold）
- FilaForm Systems（Gold）
- MesoScale Labs（Silver）
- Anhui Polymer Society（Academic Partner — 示例）

排版处理为 typographic wordmark（纯文字标），不要画假 logo。

### Footer
- PPS 2026 — Polymer Processing Symposium
- 15—17 October 2026 · Hefei, China
- Secretariat: secretariat@pps2026-conf.org（示例）
- Host organisation: to be confirmed
- 锚点链接 + 版权行 "© 2026 PPS 2026 Organising Committee"

## 3. 品牌资产（三个版本共享，必须遵守）

**色板**：
- Warm White `#F7F6F2`（主底色）
- Ink `#111111`（主文字/深色区）
- Secondary Grey `#6B6B66`（辅助文字）
- Polymer Copper `#B45F3A`（唯一 accent 主色）
- 各版本可在保持以上四色为骨架的前提下，按自己的设计逻辑微调明度层次或引入至多**一个**辅助色（禁止紫/品红/霓虹/科技蓝模板感）。

**字体**：
- Heading: **Instrument Serif**（Google Fonts）
- Body: **Inter**（Google Fonts）
- 系统兜底栈必须写好（Georgia/serif；-apple-system/sans-serif）
- 各版本可按设计逻辑增加**一个**辅助字（如等宽字用于编号/标签/工业批号感），但 Instrument Serif + Inter 必须仍是主角。

## 4. 视觉母题假设（form 从内容里长出来的种子）

高分子加工的独有意象（别的行业不会有的）：**挤出线（extrusion line）的连续流程、薄膜截面的平行细线层（film strata）、工业批号/料号编号（PPS26—xx）、螺杆螺纹的螺旋线、熔体从无序到有序的流动**。

母题假设：**"连续加工线 + 工业编号系统 + 薄膜层线"**——每个版本必须把这个母题以自己的方式用起来（例如：贯穿页面的连续细线、section 编号采用工业批号风格 PPS26—01、分隔线用多根平行细线模拟薄膜截面等），并在 HTML 注释里写一句"我的 form 来自内容的哪里"。

## 5. 硬禁区（违反即返工）

- 大量紫色渐变 / 品红 / 霓虹发光 / AI 发光球
- 玻璃拟态（glassmorphism / backdrop blur 卡片）
- 科技蓝 SaaS 模板感、满屏圆角卡片墙、圆角卡片+左彩色边框组合
- 过度 3D / 粒子背景 / 大量浮动动画 / 无限旋转 / 过度视差
- emoji 当图标、每个标题都配装饰 icon、编造的 stats 数据装饰
- 传统政府会议网站风（红色横幅、金色大字、密集表格）
- 赛博朋克 / 像素风 / 孟菲斯撞色

**动画**：只允许 fade / reveal / hover / 微量滚动交互，服务于层级不服务于装饰。移动端降低动画强度。

**可读性硬底线**：正文 ≥14px（建议 15-17px）、标签/注释 ≥12px、正文对比度 ≥4.5:1。留白必须是构图（首屏有明确视觉锚点），不是内容缺席。

**诚实原则**：没有的数据不编造（不放假 stats、不放假地图、不放假照片）。占位处用设计过的排版处理（monogram、文字标、抽象占位块），并在 HTML 注释里标注 placeholder 性质。

## 6. 输出格式与尺寸（必填）

- **单文件 HTML**（内联 CSS；tab 切换等允许少量原生 JS，禁止外部 JS 库）
- 响应式完整可用：≥4 个断点（375 / 768 / 1024 / 1440+），移动端必须有真实移动布局（汉堡导航、堆叠 section、表格转卡片）
- 字体通过 Google Fonts CDN 引入（demo 阶段允许），必须带 `display=swap` 与系统兜底
- 所有 section 顺序必须遵守：Navigation → Hero → About → Research Themes → Keynote Speakers → Program → Important Dates → Venue → Registration → Sponsors → Footer
- 英文 copy 按本 spec 第 2 节，一字不改（section 标题措辞可按设计语言微调）

## 7. 验收清单

- [ ] 11 个 section 全部呈现，顺序正确
- [ ] 375px 宽度下无横向滚动、无文字截断
- [ ] 桌面首屏有明确视觉锚点，hero 不堆文字
- [ ] Themes 是 editorial/typographic 排版而非卡片墙
- [ ] Program 桌面表格/移动卡片 + tab 可切换
- [ ] Speaker 桌面 4 列/平板 2 列/手机 1 列，monogram 占位
- [ ] 禁区清单零违反
- [ ] 对比度、字号达标
- [ ] HTML 注释含 assumptions + "form 来自内容的哪里"
