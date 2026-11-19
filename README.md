# 量研 · 策略研究工作台（可交互 HTML 原型）

本目录提供两套入口：

## 1. 可维护原型（推荐）`index.html`

单页应用式原型：**`index.html` + `styles.css` + `app.js`**

- 覆盖主要布局：顶栏、行情工具栏、公式工作区、双画布行情图、研究四 Tab、确认弹窗、提交发布弹窗等。
- **交互**：行情（本地模拟 K 线）、公式校验（回测门控：公式需调用 `BUY(条件,位置)` 与 `SELL(条件,位置)`，信号自动配对并在 K 线上画买卖标记）、估算组合、确认发起研究、进度条、研究结果/候选详情/历史、参数应用回图表、我的公式 localStorage、导出研究快照 JSON 等。
- **非目标**：不接真实行情/公式引擎；绩效与委托流水为前端占位算法。

### 双击打开（无需起端口）

`app.js` 已改为**非 module 脚本**，一般可在 Finder 中**双击 `index.html`**，用系统默认浏览器以 `file://` 打开，**不必**再开 `python -m http.server`。

注意：

- **请保持 `index.html` 与 `app.js`、`styles.css` 在同一文件夹**（不要只拷贝单个文件）。
- 若个别浏览器对 `file://` 限制较严，可换用 Chrome / Edge；**我的公式 / 指标注册表**依赖 `localStorage`，绝大多数浏览器在本地文件下仍可用。
- 原版镜像 **`mirror-spa.html`** 仍为打包后的 SPA，建议仍用 HTTP 访问。

### 可选：本地 HTTP 预览

```bash
cd /Users/user/Projects/indicator-research-platform-prototype
python3 -m http.server 8080 --bind 127.0.0.1
```

浏览器访问：<http://127.0.0.1:8080/>

### 最小操作路径

1. 点击 **读取行情**（生成模拟 K 线）。
2. **校验公式**（均线模板：`选择「搜索算法」→「单次」可不要求 BUY/SELL；网格搜索需要 BUY+SELL，可切换模板为「MACD」旁自定义或选用内置 MACD）。内置 MACD 不走编辑器 DSL。
3. **估算组合**（可选）→ **开始研究（需确认）** → **确认并发起研究**。
4. 在 **研究结果** 打开表格，**业务详情** 进 **候选详情**；**研究历史** 可 **加载配置**。

## 2. 原版构建镜像 `mirror-spa.html`

从 `http://10.0.0.80:9002/` 拉取的 **Vite 打包产物**（`assets/index-*.js/css`），入口为 **`mirror-spa.html`**。仅作视觉对照，不适合二次开发。

## 文件说明

| 文件 | 说明 |
|------|------|
| `index.html` | 可维护原型入口 |
| `styles.css` | 样式（参考 demo 设计 token） |
| `app.js` | 全部交互逻辑 |
| `admin.html` / `admin.js` | 指标管理后台：列表、详情（版本 / 分发上下架 / 权限 / 日志）、待办、权限管理 |
| `indicator-registry.js` | 指标注册表（版本状态机、渠道、权限、日志），工作台与后台共用，localStorage 模拟服务端 |
| `workbench-publish.js` | 工作台「提交发布」弹窗与指标标识、从后台回到工作台编辑 |
| `platform.css` | 平台导航、状态标签、发布弹窗与后台样式 |
| `SPEC-指标保存-后台管理-分发上下架-权限.md` | 保存 → 审核 → 接入 → 发布 → 上下架 → 权限的产品规格 |
| `mirror-spa.html` | 原版 SPA 镜像入口 |
| `assets/index-*.js` / `*.css` | 原版打包资源 |
