/**
 * 量研工作台 · 可交互前端原型
 * 无后端：行情、绩效、流水均为确定性/随机模拟，用于完整 UI 与状态流转。
 */

const STORAGE_DRAFT = "qlab_formula_draft_v2";
const STORAGE_DRAFT_LEGACY = "qlab_formula_draft_v1";
const STORAGE_LIBRARY = "qlab_formula_library_v1";
const STORAGE_HISTORY = "qlab_research_history_v2";
const STORAGE_DEMO_FORMULAS = "qlab_demo_formulas_seeded_v1";

/** @type {Array<{id:string,name:string,note:string,source:string,dialect:'my'|'tdx',ts:number}>} */
const DEMO_FORMULA_SEED = [
  {
    id: "demo_my_dual_ma",
    name: "双均线趋势",
    note: "麦语言 · 演示公式",
    dialect: "my",
    source: `PARAM N_FAST INT = 5;
PARAM N_SLOW INT = 20;
FAST := EMA(CLOSE, N_FAST);
SLOW := EMA(CLOSE, N_SLOW);
BUY := CROSS(FAST, SLOW);
SELL := CROSSDOWN(FAST, SLOW);
PLOT FAST ON MAIN COLOR "#d97706" WIDTH 2 LABEL "快线";
PLOT SLOW ON MAIN COLOR "#0f766e" WIDTH 2 LABEL "慢线";
MARK BUY LABEL "买入信号" POSITION BELOW COLOR "#dc2626";
MARK SELL LABEL "卖出信号" POSITION ABOVE COLOR "#16a34a";`,
    ts: 0,
  },
  {
    id: "demo_my_vol_channel",
    name: "波动通道",
    note: "麦语言 · 演示公式",
    dialect: "my",
    source: `PARAM N INT = 20;
PARAM K FLOAT = 2;
MID := MA(CLOSE, N);
UPPER := MID + STD(CLOSE, N) * K;
LOWER := MID - STD(CLOSE, N) * K;
BUY := CROSS(CLOSE, LOWER);
SELL := CROSSDOWN(CLOSE, UPPER);
PLOT MID ON MAIN COLOR "#0f766e";
PLOT UPPER ON MAIN COLOR "#dc2626" STYLE DASH;
PLOT LOWER ON MAIN COLOR "#2563eb" STYLE DASH;`,
    ts: 0,
  },
  {
    id: "demo_tdx_huoyanshan",
    name: "火焰山",
    note: "通达信 · 演示公式",
    dialect: "tdx",
    source: `VAR13:=IF(YEAR>=2018 AND MONTH>=11 AND DAY>=1,0,1);
AA:=(MA(C,1)+MA(C,3)+MA(C,5)+MA(C,7)+MA(C,9))/5;
BB:=(MA(C,2)+MA(C,4)+MA(C,6)+MA(C,8)+MA(C,10))/5;
CC:=EMA(AA,2);
DD:=EMA(BB,5);
VAR14:=MAX(EMA(AA,2)-EMA(BB,5),0)*1.2;
VAR15:=EMA(VAR14,5);
SS:=EMA(VAR15,2);
风险系数:=(VAR15-SS)/10*VAR13;
波浪系数:VAR15*VAR13,STICK,COLORFF00FF;
A10:=波浪系数,LINETHICK1 ;
B:MA(A10,3),COLORYELLOW,LINETHICK2;
B2:=MA(B,2)*2-B;
STICKLINE(B>B2,1.5*B,B2,3,0),COLOR0000FF;
STICKLINE(B<B2,1.5*B,B2,3,0),COLORBLUE;
STICKLINE(VAR15>REF(VAR15,1) AND VAR13,VAR15,0,2,0),COLOR0099FF;
STICKLINE(VAR15>REF(VAR15,1) AND VAR13,VAR15,SS,3.5,0),COLORYELLOW;
STICKLINE(VAR15<REF(VAR15,1) AND VAR13,0,VAR15,2,0),COLORGREEN;
STICKLINE(VAR15<REF(VAR15,1) AND VAR13,VAR15,SS,3.5,0),COLORFFCC33;
升跌:=EMA((C/MA((2*C+H+L)/4,8)-1)*100,3);0;`,
    ts: 0,
  },
  {
    id: "demo_tdx_dayangbupo",
    name: "大阳不破",
    note: "通达信 · 演示公式",
    dialect: "tdx",
    source: `成交额:=V*C/100,NODRAW;
{万元}
A2:=SUM((IF(((成交额/7>20) AND (CLOSE>(REF(CLOSE,1)))),成交额,0)),0);
A3:=SUM((IF(((成交额/7>20) AND (CLOSE<(REF(CLOSE,1)))),成交额,0)),0);
A4:=SUM((IF(((成交额/7<20) AND (CLOSE>(REF(CLOSE,1)))),成交额,0)),0);
A5:=SUM((IF(((成交额/7<20) AND (CLOSE<(REF(CLOSE,1)))),成交额,0)),0);
A6:=((A2+A3)+A4)+A5,NOTITLE;
A7:=IF((ISLASTBAR),((100*A2)/A6),0);
A8:=IF((ISLASTBAR),((100*A3)/A6),0);
A9:=IF((ISLASTBAR),((100*A4)/A6),0);
A10:=IF((ISLASTBAR),((100*A5)/A6),0);
机构买:(A2),LINETHICK2,COLORRED;
机构卖:(A3),LINETHICK2,COLORGREEN;
机构进出:=机构买-机构卖,NODRAW,NOTITLE;
散户买:(A4),DOTLINE,COLOR5555FF;
{细红线}
散户卖:(A5),DOTLINE,COLOR55FF55;
{细绿线}
强势:=((100*A2)/A6>50),NOTITLE;
STICKLINE(强势,机构买*1.02,机构买*1.1,1,0),COLOR0088FF,NOTITLE;
拉升:=((100*A2)/A6-(100*A3)/A6)>18 AND (100*A2)/A6-(100*A5)/A6>18,NOTITLE;
STICKLINE(拉升,机构买*1.1,机构买*1.2,1,0),COLOR00FFFF,NOTITLE;
DRAWTEXT(ISLASTBAR=1,机构买*0.95,'●机构买入量能'),LINETHICK2,COLORRED,NOTITLE;
DRAWTEXT(ISLASTBAR=1,机构卖*0.95,'○机构卖出量能'),LINETHICK2,COLORGREEN,NOTITLE;
DRAWICON(机构进出<0 AND REF(机构进出,1)>=0,机构买*0.98,39),NOTITLE;
DRAWICON(机构进出>0 AND REF(机构进出,1)<=0,机构买*1.02,38),NOTITLE;
DD1:=1,NOTITLE;
AAA1:=STRCAT(STRCAT('机构量能',CON2STR((100*A2)/A6-(100*A3)/A6,0)),'%'),NOTITLE;
AAA3:=STRCAT(STRCAT('散户量能',CON2STR((100*A4)/A6-(100*A5)/A6,0)),'%'),NOTITLE;
DRAWTEXT_FIX(DD1=1,0,0.02,0,AAA1),COLORRED,NOTITLE;
DRAWTEXT_FIX(DD1=1,0,0.13,0,AAA3),COLOR0088FF,NOTITLE;
STICKLINE(机构进出>=0,机构买,机构卖,1,1),COLORRED,NOTITLE;
STICKLINE(机构进出<0,机构买,机构卖,1,1),COLORGREEN,NOTITLE;`,
    ts: 0,
  },
];

const TEMPLATES = {
  ma: `// 麦语言：// 注释 · := 赋值 · ; 结束 · PARAM 声明参数 · PLOT 画线 · MARK 标记信号
// 可直接使用通达信函数（HHV、LLV、SMA、BARSLAST…）；需回测时再声明 BUY 与 SELL
PARAM N INT = 20;
MA20 := MA(CLOSE, N);
PLOT MA20 ON MAIN COLOR "#0d9488" WIDTH 2 LABEL "20日均线";`,
  macd: `// 内置 MACD：参数在「策略回测 › 公式参数」调整（不编辑此处源码）`,
  empty: `// 麦语言：// 注释 · := 赋值 · ; 结束 · PARAM 声明参数 · PLOT 画线 · MARK 标记信号
// 需回测与参数优化时声明 BUY := 条件; 与 SELL := 条件;
`,
  tdx_empty: `{公式说明}
{需回测时：BUY(买入条件,LOW); SELL(卖出条件,HIGH); 买入按持仓上限开仓，卖出全部平仓}
`,
  tdx_boll: `N:=20;
M:=2;
MID:MA(CLOSE,N);
UPPER:MID+M*STD(CLOSE,N);
LOWER:MID-M*STD(CLOSE,N);
BUY(CROSS(CLOSE,LOWER),LOW);
SELL(CROSS(UPPER,CLOSE),HIGH);`,
  tdx_ma: `N:=20;
MA5:MA(CLOSE,N);
MA10:MA(CLOSE,10);
MA20:MA(CLOSE,20);`,
  research_demo: `PARAM N INT = 20;
PARAM K FLOAT = 2.0;
MID := MA(CLOSE, N);
UPPER := MID + K * STDDEV(CLOSE, N);
LOWER := MID - K * STDDEV(CLOSE, N);
BUY := CROSS(CLOSE, LOWER);
SELL := CROSS(UPPER, CLOSE);
PLOT MID ON MAIN COLOR "#0d9488" LABEL "中轨";
PLOT UPPER ON MAIN COLOR "#94a3b8" STYLE DASH LABEL "上轨";
PLOT LOWER ON MAIN COLOR "#94a3b8" STYLE DASH LABEL "下轨";
MARK BUY LABEL "买" POSITION BELOW;
MARK SELL LABEL "卖" POSITION ABOVE;`,
};

const CUSTOM_TEMPLATE_OPTIONS = [
  { value: "ma", label: "基础模板（均线示例）" },
  { value: "boll_mai", label: "布林带交易策略（BUY / SELL 示例）" },
  { value: "empty", label: "空白草稿" },
];

/** @type {{
 *  bars: Array<{t:number,o:number,h:number,l:number,c:number,v:number}>,
 *  dataLoaded: boolean,
 *  formulaKind: 'custom'|'builtin',
 *  formulaTemplate: string,
 *  validated: boolean,
 *  diagnostics: Array<{level:'error'|'warn',text:string}>,
 *  formulaCollapsed: boolean,
 *  chartTab: 'main'|'trades',
 *  researchTab: string,
 *  lastEstimate: null | { raw: number, valid: number, evaluate: number },
 *  latestRunId: null | string,
 *  viewRunId: null | string,
 *  selectedCandidateId: null | string,
 *  detailsDataset: 'train'|'test',
 *  ledgerTab: 'trades'|'orders',
 *  history: any[],
 *  library: Array<{id:string,name:string,note:string,source:string,ts:number}>,
 *  running: boolean,
 *  runCancel: boolean,
 *  rngSeed: number,
 * }} */
const state = {
  bars: [],
  dataLoaded: false,
  formulaKind: "builtin",
  formulaTemplate: "MA",
  validated: false,
  diagnostics: [],
  formulaCollapsed: false,
  chartTab: "main",
  researchTab: "backtest",
  /** @type {'list'|'detail'} 优化结果：列表 / 候选详情 */
  resultsView: "list",
  /** 「策略回测」最近一次结果（当前参数 · 全样本） */
  backtest: null,
  lastEstimate: null,
  latestRunId: null,
  viewRunId: null,
  selectedCandidateId: null,
  detailsDataset: "train",
  ledgerTab: "trades",
  resultsSort: { key: "rank", dir: 1 },
  resultsPage: 0,
  resultsOnlyEligible: false,
  /** 确认弹窗打开时锁定的请求快照 */
  pendingRequest: null,
  /** 研究运行中的任务（含行情快照） */
  activeRun: null,
  /** 参数空间的优化区间按参数名保留，编辑公式时不丢失 */
  paramRangeCache: {},
  history: [],
  library: [],
  running: false,
  runCancel: false,
  rngSeed: 1,
  chartView: { start: 0, count: 90, hoverIndex: null, drag: null },
  /** @type {null | { title: string, outputs: any[], mainLineSeries: any[] }} */
  chartPlot: null,
  /** 主图 / 副图各至多一个：内置指标或已提交公式（与编辑区隔离） */
  chartMount: { main: null, sub: null },
  /** 最近一次提交绘图的求值结果（挂到 chartFormulaPane 对应窗格） */
  chartFormulaPlot: null,
  /** @type {null | 'main' | 'sub'} */
  chartFormulaPane: null,
  /** 图表上存在已加载的指标（内置或公式） */
  chartIndicatorActive: false,
  /** 公式区有改动尚未再次「提交绘图」 */
  chartPlotStale: false,
  marketBarsMixed: false,
  marketLoadInFlight: false,
  /** @type {'qfq'|'hfq'|'none'} */
  chartAdj: "qfq",
  /** @type {'1m'|'5m'|'10m'|'30m'|'1h'|'day'|'week'|'month'|'year'} */
  chartPeriod: "day",
  workspace: {
    name: "未命名公式",
    savedSource: "",
    libraryId: null,
    dirty: false,
  },
  /** @type {null | { name: string, params: Record<string, number>, outputs: Array<{ line: string, var: string, enabled: boolean }> }} */
  indicatorBindings: null,
  /** @type {'my'|'tdx'} */
  formulaDialect: "tdx",
  /** @type {'main'|'sub'|'main_axis'} 画线方法：主图共用 K 线 Y 轴 / 副图 / 主图独立坐标叠层 */
  plotDrawMethod: "main",
};

const CHART_ADJ_LABEL = { qfq: "前复权", hfq: "后复权", none: "除权" };
const CHART_PERIOD_LABEL = {
  "1m": "1min",
  "5m": "5min",
  "10m": "10min",
  "30m": "30min",
  "1h": "1hour",
  day: "日线",
  week: "周线",
  month: "月线",
  year: "年线",
};
const INTRADAY_CHART_PERIODS = new Set(["1m", "5m", "10m", "30m", "1h"]);
/** 本地缓存原始 K 线（非合成），固定 500 根 */
const RAW_CHART_PERIODS = new Set(["1m", "30m", "day"]);
const MARKET_DATA_SCOPE_LABEL = {
  default: "默认（推荐）",
  listing: "上市以来",
  range: "指定区间",
};

function getMarketDataScope() {
  const v = /** @type {HTMLSelectElement} */ ($("select-market-data-scope"))?.value;
  if (v === "listing" || v === "range") return v;
  return "default";
}

/** @returns {'dynamic'|'static'} */
function getMarketStreamMode() {
  const v = /** @type {HTMLSelectElement} */ ($("select-market-stream"))?.value;
  return v === "dynamic" ? "dynamic" : "static";
}

function isDynamicMarketEnabled() {
  return getMarketStreamMode() === "dynamic";
}

/** 仅在「读取行情」成功加载后更新右侧标识；切换下拉不触发。 */
function syncMarketStreamIndicator() {
  const el = $("mode-indicator");
  const title = $("mode-indicator-title");
  const sub = $("mode-indicator-sub");
  if (!el || !title || !sub) return;
  if (isDynamicMarketEnabled()) {
    el.className = "mode-indicator dynamic";
    el.setAttribute("data-mode", "dynamic");
    title.textContent = "动态行情";
    sub.textContent = "实时获取最新数据";
  } else {
    el.className = "mode-indicator static";
    el.setAttribute("data-mode", "static");
    title.textContent = "静态行情";
    sub.textContent = "仅加载历史 K 线数据";
  }
  layoutMarketToolbar();
}

/*
 * —— 动态行情（未接入本原型交互，仅供后续实现参考）——
 * 读取动态行情（select-market-stream = dynamic）时：
 *   以 wss 订阅当前标的盘口；最新 K 线推送更新；分钟 K 线增量绘制；指标按最新 bar 重算。
 * 不读取动态行情（static）时：
 *   按「标的设置」一次性拉取/组装历史 K 线，无实时增量与 wss。
 */

function syncMarketDataScopeUI() {
  const scope = getMarketDataScope();
  const wrap = $("market-range-fields");
  if (wrap) wrap.hidden = scope !== "range";
  const hint = $("market-scope-hint");
  if (hint) hint.hidden = scope === "default";
  syncMarketRangeEndDateUI();
  syncMarketStreamAvailability();
  layoutMarketToolbar();
}

/**
 * 标的设置按「组」折行，不用 flex 随便换行。
 * wide：一行；split：行情类型+读取行情下移；dates：日期区间再下移；stack：状态与说明沉底。
 * 未选「指定区间」时跳过 dates。
 */
function layoutMarketToolbar() {
  const bar = document.querySelector(".market-toolbar");
  if (!bar) return;
  const primary = bar.querySelector(".market-cluster-primary");
  const range = bar.querySelector(".market-cluster-range");
  const actions = bar.querySelector(".market-cluster-actions");
  const status = bar.querySelector(".mode-indicator");
  if (!primary || !actions || !status) return;

  const cs = getComputedStyle(bar);
  const gap = parseFloat(cs.columnGap) || 13;
  const inner = bar.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
  const hasRange = !!(range && !range.hidden);
  const widthOf = (el) => (!el || el.hidden ? 0 : Math.ceil(el.getBoundingClientRect().width));
  const wP = widthOf(primary);
  const wR = hasRange ? widthOf(range) : 0;
  const wA = widthOf(actions);
  const wS = widthOf(status);
  const row = (parts) => parts.reduce((sum, n) => sum + n, 0) + gap * Math.max(0, parts.filter((n) => n > 0).length - 1);
  const needs = {
    wide: row([wP, wR, wA, wS]),
    split: row([wP, wR, wS]),
    dates: row([wP, wS]),
  };
  const ladder = hasRange ? ["wide", "split", "dates", "stack"] : ["wide", "split", "stack"];
  const current = bar.getAttribute("data-layout") || "wide";
  const rank = (name) => {
    const i = ladder.indexOf(name);
    return i < 0 ? ladder.length : i;
  };
  let next = "stack";
  for (const name of ladder) {
    if (name === "stack") break;
    const expanding = rank(name) < rank(current);
    const slack = expanding ? 16 : 1;
    if (needs[name] + slack <= inner) {
      next = name;
      break;
    }
  }
  if (current !== next) bar.setAttribute("data-layout", next);
}

function bindMarketToolbarLayout() {
  const bar = document.querySelector(".market-toolbar");
  if (!bar || bar.dataset.layoutBound) return;
  bar.dataset.layoutBound = "1";
  const run = () => layoutMarketToolbar();
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(run);
    ro.observe(bar);
  } else {
    window.addEventListener("resize", run);
  }
  run();
}

/** 公式工具栏：放不下时将画线方法 + 保存/另存为整组换到第二行 */
function layoutFormulaToolbar() {
  const bar = document.querySelector(".formula-toolbar-v2");
  if (!bar) return;
  const ops = bar.querySelector(".formula-cluster-ops");
  const plot = bar.querySelector(".formula-cluster-plot");
  const save = bar.querySelector(".formula-cluster-save");
  if (!ops || !plot || !save) return;

  const cs = getComputedStyle(bar);
  const gap = parseFloat(cs.columnGap) || 12;
  const inner = bar.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
  const widthOf = (el) => Math.ceil(el.getBoundingClientRect().width);
  const wO = widthOf(ops);
  const wP = widthOf(plot);
  const wS = widthOf(save);
  const wideNeed = wO + wP + wS + gap * 2;
  const current = bar.getAttribute("data-layout") || "wide";
  const slack = current === "split" ? 16 : 1;
  const next = wideNeed + slack <= inner ? "wide" : "split";
  if (current !== next) bar.setAttribute("data-layout", next);
}

function bindFormulaToolbarLayout() {
  const bar = document.querySelector(".formula-toolbar-v2");
  if (!bar || bar.dataset.layoutBound) return;
  bar.dataset.layoutBound = "1";
  const run = () => layoutFormulaToolbar();
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(run);
    ro.observe(bar);
  } else {
    window.addEventListener("resize", run);
  }
  run();
}

function measureClusterWidth(el) {
  if (!el) return 0;
  const cs = getComputedStyle(el);
  if (cs.display !== "none" && cs.visibility !== "hidden") {
    return Math.ceil(el.getBoundingClientRect().width);
  }
  const prev = { display: el.style.display, visibility: el.style.visibility, position: el.style.position };
  try {
    el.style.display = cs.display === "none" ? "flex" : cs.display;
    el.style.visibility = "hidden";
    el.style.position = "absolute";
    return Math.ceil(el.getBoundingClientRect().width);
  } finally {
    el.style.display = prev.display;
    el.style.visibility = prev.visibility;
    el.style.position = prev.position;
  }
}

function innerWidthExPadding(el) {
  const cs = getComputedStyle(el);
  return el.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
}

/** 组内子项横向占位之和（避免 compact 下容器被撑满 100% 导致量到整行宽、无法回到 wide） */
function intrinsicHBoxWidth(el) {
  if (!el) return 0;
  const cs = getComputedStyle(el);
  const gap = parseFloat(cs.columnGap) || parseFloat(cs.gap) || 0;
  const kids = [...el.children].filter((c) => {
    const s = getComputedStyle(c);
    return s.display !== "none" && s.visibility !== "hidden";
  });
  if (!kids.length) return Math.ceil(el.getBoundingClientRect().width);
  return kids.reduce((sum, c) => sum + Math.ceil(c.getBoundingClientRect().width), 0) + gap * Math.max(0, kids.length - 1);
}

function chartToolbarWideNeedWidth(toolbar, period, trailing) {
  const adj = toolbar.querySelector(".chart-adj-switch");
  const refresh = toolbar.querySelector(".chart-cluster-refresh");
  const wTrail =
    adj && refresh
      ? Math.ceil(adj.getBoundingClientRect().width) + Math.ceil(refresh.getBoundingClientRect().width) + 8
      : Math.ceil(trailing.getBoundingClientRect().width);
  const sw = period.querySelector(".chart-period-switch");
  let wPeriod;
  if (sw) {
    const prev = sw.style.flexWrap;
    try {
      sw.style.flexWrap = "nowrap";
      wPeriod = Math.ceil(sw.getBoundingClientRect().width);
    } finally {
      sw.style.flexWrap = prev;
    }
  } else {
    wPeriod = Math.ceil(period.getBoundingClientRect().width);
  }
  return wPeriod + wTrail;
}

/** 图表面板变窄：隐藏模块标题，行情靠左；周期条保持一行，复权与重置分处次行左右 */
function layoutChartPanel() {
  const panel = $("chart-panel") || document.querySelector(".chart-panel");
  if (!panel) return;
  const head = panel.querySelector(".chart-panel-heading");
  const title = panel.querySelector(".chart-heading-title");
  const quote = panel.querySelector(".chart-heading-quote");
  const toolbar = panel.querySelector(".chart-period-toolbar");
  const period = panel.querySelector(".chart-cluster-period");
  const trailing = panel.querySelector(".chart-toolbar-trailing");
  if (!head || !quote || !toolbar || !period || !trailing) return;

  const current = panel.getAttribute("data-layout") || "wide";
  const slack = current === "compact" ? 16 : 1;
  const headInner = innerWidthExPadding(head);
  const headWideNeed = measureClusterWidth(title) + intrinsicHBoxWidth(quote) + 14;
  const headFits = headWideNeed + slack <= headInner;

  const tbInner = innerWidthExPadding(toolbar);
  const tbWideNeed = chartToolbarWideNeedWidth(toolbar, period, trailing) + 10;
  const tbFits = tbWideNeed + slack <= tbInner;

  const next = headFits && tbFits ? "wide" : "compact";
  if (panel.getAttribute("data-layout") !== next) {
    panel.setAttribute("data-layout", next);
    requestAnimationFrame(() => layoutChartPanel());
  }
}

function bindChartPanelLayout() {
  const panel = $("chart-panel") || document.querySelector(".chart-panel");
  if (!panel || panel.dataset.layoutBound) return;
  panel.dataset.layoutBound = "1";
  const run = () => layoutChartPanel();
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(run);
    ro.observe(panel);
  } else {
    window.addEventListener("resize", run);
  }
  run();
}

function localTodayDateValue() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return formatDateValue(d.getTime());
}

function isMarketRangeEndToday() {
  const v = /** @type {HTMLInputElement} */ ($("input-date-end"))?.value?.trim();
  if (!v) return false;
  return v === localTodayDateValue();
}

/** 指定区间 · 结束日为当天时，日期控件展示「今天」 */
function syncMarketRangeEndDateUI() {
  const wrap = $("date-end-wrap");
  const badge = $("date-end-today-badge");
  const endEl = /** @type {HTMLInputElement} */ ($("input-date-end"));
  if (!wrap || !endEl) return;
  const showToday = getMarketDataScope() === "range" && isMarketRangeEndToday();
  wrap.classList.toggle("is-today", showToday);
  if (badge) badge.hidden = !showToday;
}

/** 指定区间且结束日非当天：仅允许静态行情 */
function syncMarketStreamAvailability() {
  const stream = /** @type {HTMLSelectElement} */ ($("select-market-stream"));
  const field = document.querySelector(".market-stream-field");
  if (!stream) return;
  const lockStatic = getMarketDataScope() === "range" && !isMarketRangeEndToday();
  stream.disabled = lockStatic;
  field?.classList.toggle("market-stream-locked", lockStatic);
  if (lockStatic && stream.value !== "static") stream.value = "static";
}

function resolveEffectiveMarketScope(period) {
  const requested = getMarketDataScope();
  const dailyOrHigher = !INTRADAY_CHART_PERIODS.has(period);
  if ((requested === "listing" || requested === "range") && !dailyOrHigher) {
    return { scope: "default", dailyScope: "default", scopeIgnored: true, requested };
  }
  if (requested === "default") {
    return { scope: "default", dailyScope: "default", scopeIgnored: false, requested };
  }
  if (requested === "listing") {
    return { scope: "listing", dailyScope: "all", scopeIgnored: false, requested };
  }
  return { scope: "range", dailyScope: "range", scopeIgnored: false, requested };
}

/**
 * @param {string} sym
 * @param {string} period
 * @param {{ scope: string, dailyScope: string }} effective
 * @returns {{ start: number, end: number, dailyScope: string } | null}
 */
function computeLoadRange(sym, period, effective) {
  const { scope } = effective;
  if (scope === "default") {
    if (isSz000001Symbol(sym) && typeof MarketData !== "undefined") {
      const dr = MarketData.defaultRange();
      return { start: dr.start, end: dr.end, dailyScope: "default" };
    }
    if (typeof MarketData !== "undefined" && MarketData.defaultRange) {
      const dr = MarketData.defaultRange();
      return { start: dr.start, end: dr.end, dailyScope: "default" };
    }
    const end = Date.now();
    const start = end - Math.round(500 * 1.6 * 86400000);
    return { start, end, dailyScope: "default" };
  }
  if (scope === "listing") {
    if (isSz000001Symbol(sym) && typeof MarketData !== "undefined" && MarketData.BARS?.length) {
      const b = MarketData.BARS;
      return { start: b[0].t, end: b[b.length - 1].t, dailyScope: "all" };
    }
    const end = Date.now();
    const start = end - Math.round(8 * 365.25 * 86400000);
    return { start, end, dailyScope: "sim-listing" };
  }
  const r = readMarketDateRangeUI({ fillDefaultIfEmpty: true });
  if (!r) return null;
  const ds = isSz000001Symbol(sym) ? "range" : "sim-range";
  return { start: r.start, end: r.end, dailyScope: ds };
}

let lastMaiCheck = null;
let syntaxCheckTimer = null;

function getFormulaDialect() {
  return state.formulaDialect === "my" ? "my" : "tdx";
}

function getPlotDrawMethod() {
  const v = /** @type {HTMLSelectElement} */ ($("select-plot-draw-method"))?.value;
  if (v === "sub" || v === "main_axis") return v;
  return "main";
}

function syncPlotDrawMethodUI() {
  const sel = /** @type {HTMLSelectElement} */ ($("select-plot-draw-method"));
  if (sel && sel.value !== state.plotDrawMethod) sel.value = state.plotDrawMethod;
}

function seriesAsLegendOutputs(list) {
  return (list || []).map((s) => {
    const hideTitle = !!s.hideTitle;
    const name = s.name;
    const label = hideTitle ? "" : s.label || s.name;
    return {
      name,
      label,
      hideTitle,
      color: s.style?.color || s.color || "#2f7de1",
      data: s.data,
      digits: s.digits ?? 2,
    };
  });
}

/** 按「画线方法」重排主/副图序列、图元与坐标模式 */
function applyPlotDrawLayout(plot, method) {
  if (!plot) return plot;
  const methodUse = method || "main";
  const series = [
    ...(plot.mainLineSeries || []),
    ...(plot.subLineSeries || []),
    ...(plot.mainOverlaySeries || []),
  ];
  const rawDraws = [...(plot.mainDrawings || []), ...(plot.subDrawings || [])];
  const base = {
    ...plot,
    mainOverlaySeries: [],
    mainDrawings: [],
    overlayDrawings: [],
    subDrawings: [],
    scaleMode: "shared",
  };
  if (!series.length && !rawDraws.length) {
    return { ...base, draw: plot.draw || "none" };
  }
  if (methodUse === "sub") {
    return {
      ...base,
      draw: "sub",
      mainLineSeries: [],
      subLineSeries: series,
      subDrawings: rawDraws,
      mainOutputs: [],
      subOutputs: seriesAsLegendOutputs(series),
    };
  }
  if (methodUse === "main_axis") {
    return {
      ...base,
      draw: "main",
      scaleMode: "overlay",
      mainLineSeries: [],
      mainOverlaySeries: series,
      overlayDrawings: rawDraws,
      subLineSeries: [],
      mainOutputs: seriesAsLegendOutputs(series),
      subOutputs: [],
    };
  }
  return {
    ...base,
    draw: "main",
    mainLineSeries: series,
    mainDrawings: rawDraws,
    subLineSeries: [],
    mainOutputs: seriesAsLegendOutputs(series),
    subOutputs: [],
  };
}

function finalizeChartPlot(plot) {
  return applyPlotDrawLayout(plot, getPlotDrawMethod());
}

function syncFormulaDialectUI() {
  state.formulaDialect = "tdx";
  const sel = /** @type {HTMLSelectElement} */ ($("select-formula-dialect"));
  if (sel) {
    sel.value = "tdx";
    sel.disabled = true;
    sel.title = "通达信语法（名称:表达式; · 大括号注释 · 参数 N:5;）";
    const myOpt = sel.querySelector('option[value="my"]');
    if (myOpt) myOpt.hidden = true;
  }
}

function setFormulaDialect(mode) {
  if (mode === "my") return;
  const next = "tdx";
  if (state.formulaDialect === next) {
    syncFormulaDialectUI();
    return;
  }
  state.formulaDialect = next;
  syncFormulaDialectUI();
  resetSyntaxCheckIdle();
  saveDraft();
  paintEditor();
  if (typeof FormulaEditorUI !== "undefined") {
    if (FormulaEditorUI.onDialectChange) FormulaEditorUI.onDialectChange();
    else if (FormulaEditorUI.updateFilebarPath) FormulaEditorUI.updateFilebarPath();
  }
}

/** 编辑后清空上次校验结果；仅点「校验公式」时才跑检测 */
function resetSyntaxCheckIdle() {
  if (/** @type {HTMLSelectElement} */ ($("select-formula-kind"))?.value === "builtin") {
    state.diagnostics = [];
    state.validated = false;
    renderSyntaxPanel();
    return;
  }
  clearTimeout(syntaxCheckTimer);
  state.validated = false;
  state.diagnostics = [];
  lastMaiCheck = null;
  setFormulaStatus(false);
  renderSyntaxPanel();
  paintEditor();
}

// --- DOM refs (lazy)
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

function toast(message, type = "info") {
  const region = $("toast-region");
  if (!region) return;
  const el = document.createElement("div");
  el.className = `toast${type === "success" ? " success" : ""}${type === "warn" ? " warn" : ""}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 3200);
}

function formatNum(n, digits = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatDateValue(ms) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSz000001Symbol(sym) {
  if (typeof MarketData !== "undefined" && MarketData.isRealSymbol(sym)) return true;
  const raw = (sym || "").toUpperCase().trim();
  const compact = raw.replace(/\./g, "");
  return raw === "000001.SZ" || compact === "SZ000001" || compact === "000001SZ" || compact === "000001";
}

function getMarketSymbolCode() {
  if (typeof SymbolSearch !== "undefined" && SymbolSearch.getSymbolCode) return SymbolSearch.getSymbolCode();
  const raw = /** @type {HTMLInputElement} */ ($("input-symbol"))?.value?.trim() || "";
  const tok = (raw.split(/\s+/)[0] || raw).toUpperCase();
  const m = tok.match(/^(\d{6}\.[A-Z]{2})/);
  return m ? m[1] : tok || "000001.SZ";
}

function getMarketSymbolName() {
  if (typeof SymbolSearch !== "undefined" && SymbolSearch.getSymbolName) return SymbolSearch.getSymbolName();
  return isSz000001Symbol(getMarketSymbolCode()) ? "平安银行" : "模拟标的";
}

function syncChartSymbolHeading(sym) {
  const code = sym || getMarketSymbolCode();
  let name = getMarketSymbolName();
  if (!name && typeof SymbolSearch !== "undefined" && SymbolSearch.lookupByCode) {
    name = SymbolSearch.lookupByCode(code)?.name || "";
  }
  const nameEl = $("chart-symbol-name");
  const codeEl = $("chart-symbol-code");
  if (nameEl) nameEl.textContent = name;
  if (codeEl) codeEl.textContent = code;
  layoutChartPanel();
}

function applyMarketSymbolCode(code) {
  if (typeof SymbolSearch !== "undefined" && SymbolSearch.setSymbolByCode) SymbolSearch.setSymbolByCode(code);
  else {
    const el = /** @type {HTMLInputElement} */ ($("input-symbol"));
    if (el) el.value = code;
  }
}

function setChartPlaceholderLoading(loading) {
  const ph = $("chart-placeholder");
  const strong = ph?.querySelector("strong");
  if (!strong) return;
  strong.textContent = loading ? "行情加载中…" : "尚未加载行情";
}

function initDefaultMarketDates() {
  const sym = getMarketSymbolCode();
  if (isSz000001Symbol(sym) && typeof MarketData !== "undefined") {
    const dr = MarketData.defaultRange();
    const s = /** @type {HTMLInputElement} */ ($("input-date-start"));
    const e = /** @type {HTMLInputElement} */ ($("input-date-end"));
    if (s) s.value = formatDateValue(dr.start);
    if (e) e.value = formatDateValue(dr.end);
  }
}

/** 指定区间默认：结束日为最近交易日/今日，开始日为两年前 */
function resolveRangePickerEndMs(sym) {
  if (isSz000001Symbol(sym) && typeof MarketData !== "undefined" && MarketData.BARS?.length) {
    return MarketData.BARS[MarketData.BARS.length - 1].t;
  }
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function initRangeMarketDates() {
  const sym = getMarketSymbolCode();
  const endMs = resolveRangePickerEndMs(sym);
  const startMs = endMs - Math.round(2 * 365.25 * 86400000);
  const s = /** @type {HTMLInputElement} */ ($("input-date-start"));
  const e = /** @type {HTMLInputElement} */ ($("input-date-end"));
  if (s) s.value = formatDateValue(startMs);
  if (e) e.value = formatDateValue(endMs);
}

function initDefaultMarketDatesIfEmpty() {
  const s = /** @type {HTMLInputElement} */ ($("input-date-start"));
  const e = /** @type {HTMLInputElement} */ ($("input-date-end"));
  if (s?.value?.trim() && e?.value?.trim()) return;
  if (getMarketDataScope() === "range") initRangeMarketDates();
  else initDefaultMarketDates();
}

/** @param {HTMLInputElement|null|undefined} el @param {boolean} [endOfDay] */
function msFromDateInputEl(el, endOfDay = false) {
  const raw = el?.value?.trim();
  if (!raw) return null;
  const parts = raw.split("-").map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [y, m, d] = parts;
  if (endOfDay) return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

/**
 * 读取工具栏日期；缺省或只填一侧时不改写已有输入
 * @param {{ fillDefaultIfEmpty?: boolean }} [opts]
 * @returns {{start:number,end:number}|null}
 */
function readMarketDateRangeUI(opts = {}) {
  const { fillDefaultIfEmpty = false } = opts;
  const sym = getMarketSymbolCode();
  const startEl = /** @type {HTMLInputElement} */ ($("input-date-start"));
  const endEl = /** @type {HTMLInputElement} */ ($("input-date-end"));
  let hasStart = !!startEl?.value?.trim();
  let hasEnd = !!endEl?.value?.trim();

  if (!hasStart && !hasEnd) {
    if (!fillDefaultIfEmpty) return null;
    if (getMarketDataScope() === "range") {
      initRangeMarketDates();
    } else if (isSz000001Symbol(sym) && typeof MarketData !== "undefined") {
      initDefaultMarketDates();
    }
    hasStart = !!startEl?.value?.trim();
    hasEnd = !!endEl?.value?.trim();
    if (!hasStart || !hasEnd) return null;
  }

  if (!hasStart || !hasEnd) return null;

  const start = msFromDateInputEl(startEl, false);
  const end = msFromDateInputEl(endEl, true);
  if (start == null || end == null || end < start) return null;
  return { start, end };
}

/** @returns {{start:number,end:number}|null} */
function ensureMarketDateInputs(_sym) {
  return readMarketDateRangeUI({ fillDefaultIfEmpty: true });
}

/** 原型演示：000001 缓存为前复权；后复权/除权为相对缩放（非交易所真实序列） */
function applyBarsAdjustment(bars, mode) {
  if (!bars.length || mode === "qfq") return bars;
  const n = bars.length;
  return bars.map((b, i) => {
    const t = n <= 1 ? 0 : i / (n - 1);
    const m = mode === "hfq" ? 1 + (1 - t) * 0.055 : 1 / (1 + t * 0.042);
    return {
      ...b,
      o: +(b.o * m).toFixed(4),
      h: +(b.h * m).toFixed(4),
      l: +(b.l * m).toFixed(4),
      c: +(b.c * m).toFixed(4),
    };
  });
}

function syncChartAdjButtons() {
  document.querySelectorAll("[data-chart-adj]").forEach((btn) => {
    const on = btn.getAttribute("data-chart-adj") === state.chartAdj;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
}

function syncChartPeriodButtons() {
  const p = state.chartPeriod || "day";
  document.querySelectorAll("[data-chart-period]").forEach((btn) => {
    const on = btn.getAttribute("data-chart-period") === p;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
}

function chartPeriodDisplayLabel() {
  return CHART_PERIOD_LABEL[state.chartPeriod] || CHART_PERIOD_LABEL.day;
}

function chartSymbolExtraLabel(real, mixed) {
  const adj = CHART_ADJ_LABEL[state.chartAdj] || "前复权";
  const period = chartPeriodDisplayLabel();
  if (mixed) return `${period} · 真实+模拟补齐`;
  return real ? `${period} · ${adj}` : `${period} · 模拟`;
}

function tdxBarsMeta() {
  const sym = getMarketSymbolCode();
  const name = getMarketSymbolName() || (isSz000001Symbol(sym) ? "平安银行" : "模拟标的");
  return { code: sym, name };
}

function syncTdxFormulaRuntimeBars() {
  if (!window.TdxFormulaRuntime) return;
  if (state.bars?.length) window.TdxFormulaRuntime.setBars(state.bars, tdxBarsMeta());
  else window.TdxFormulaRuntime.ensureRuntime();
}

/** 指定区间：真实缓存前/后缺口用模拟日 K 补齐 */
function msLastTradingDayBefore(barOpenMs) {
  const d = new Date(barOpenMs);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function msFirstTradingDayAfter(barMs) {
  const d = new Date(barMs);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * @param {string} sym
 * @param {number} startMs
 * @param {number} endMs
 * @param {Array<{t:number,o:number,h:number,l:number,c:number,v:number}>} realDaily
 */
function mergeDailyRangeWithSimFill(sym, startMs, endMs, realDaily) {
  const gen = typeof MaiChart !== "undefined" ? MaiChart.generateBars.bind(MaiChart) : null;
  if (!gen) return { daily: [], mixed: false, hasReal: false };

  const real = (realDaily || []).slice().sort((a, b) => a.t - b.t);
  if (!real.length) {
    return { daily: gen(sym, startMs, endMs), mixed: false, hasReal: false };
  }

  const realAdj = applyBarsAdjustment(real, state.chartAdj);
  const out = [];
  let mixed = false;
  const firstT = realAdj[0].t;
  const lastT = realAdj[realAdj.length - 1].t;

  if (startMs < firstT) {
    const prefixEnd = msLastTradingDayBefore(firstT);
    if (prefixEnd >= startMs) {
      const prefix = gen(sym, startMs, Math.min(prefixEnd, endMs));
      const slice = prefix.filter((b) => b.t < firstT);
      if (slice.length) {
        out.push(...slice);
        mixed = true;
      }
    }
  }

  out.push(...realAdj);

  if (endMs > lastT) {
    const suffixStart = msFirstTradingDayAfter(lastT);
    if (suffixStart <= endMs) {
      const suffix = gen(sym, Math.max(suffixStart, startMs), endMs);
      const slice = suffix.filter((b) => b.t > lastT);
      if (slice.length) {
        out.push(...slice);
        mixed = true;
      }
    }
  }

  out.sort((a, b) => a.t - b.t);
  return { daily: out, mixed, hasReal: true };
}

function dailyBarsToChartPeriod(dailyBars, period) {
  const p = period || "day";
  if (!dailyBars?.length) return [];
  if (p === "day") return dailyBars;
  if (typeof MarketFrames === "undefined") return dailyBars;
  if (p === "week" || p === "month" || p === "year") {
    return MarketFrames.aggregateCalendar(dailyBars, p);
  }
  if (p === "1m" || p === "5m" || p === "10m" || p === "30m" || p === "1h") {
    const framed = MarketFrames.resolve(
      "000001.SZ",
      p,
      dailyBars[0].t,
      dailyBars[dailyBars.length - 1].t,
      "default"
    );
    return framed?.bars?.length ? framed.bars : [];
  }
  return dailyBars;
}

/** 模拟行情按品种调整价位与最小变动价位（ETF 价格量级约 1~5 元、报价到 0.001） */
function adaptSimBarsToInstrument(sym, bars) {
  if (!bars.length || typeof ResearchEngine === "undefined") return bars;
  const rules = getInstrumentRules(sym);
  if (rules.kind !== "etf") return bars;
  const target = 1 + (parseInt(hashString(sym).slice(0, 4), 16) % 400) / 100;
  const k = target / bars[0].c;
  const r = (v) => +(v * k).toFixed(3);
  return bars.map((b) => ({ ...b, o: r(b.o), h: r(b.h), l: r(b.l), c: r(b.c), v: b.v * 20 }));
}

function resolveMarketBars(sym, startMs, endMs, dailyScope) {
  const period = state.chartPeriod || "day";
  const frameScope =
    dailyScope === "all" ? "all" : dailyScope === "range" ? "range" : "default";
  const rangeFillMode = dailyScope === "range" || dailyScope === "sim-range";

  if (isSz000001Symbol(sym) && typeof MarketFrames !== "undefined") {
    if (rangeFillMode) {
      const dailyFramed = MarketFrames.resolve(sym, "day", startMs, endMs, "range");
      const { daily, mixed, hasReal } = mergeDailyRangeWithSimFill(
        sym,
        startMs,
        endMs,
        dailyFramed?.bars || []
      );
      if (daily.length) {
        const bars = dailyBarsToChartPeriod(daily, period);
        if (bars.length) {
          return { bars, real: hasReal && !mixed, mixed: mixed && hasReal };
        }
      }
    } else {
      const framed = MarketFrames.resolve(sym, period, startMs, endMs, frameScope);
      if (framed?.bars?.length) {
        let bars = applyBarsAdjustment(framed.bars, state.chartAdj);
        return { bars, real: true, mixed: false };
      }
    }
  }

  const sim = adaptSimBarsToInstrument(
    sym,
    typeof MaiChart !== "undefined" ? MaiChart.generateBars(sym, startMs, endMs) : []
  );
  if (period !== "day" && sim.length) {
    if (typeof MarketFrames !== "undefined") {
      if (period === "week") return { bars: MarketFrames.aggregateCalendar(sim, "week"), real: false, mixed: false };
      if (period === "month") return { bars: MarketFrames.aggregateCalendar(sim, "month"), real: false, mixed: false };
      if (period === "year") return { bars: MarketFrames.aggregateCalendar(sim, "year"), real: false, mixed: false };
    }
  }
  return { bars: sim, real: false, mixed: false };
}

function formatDateLabel(ms) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 当前图表是否为日线以下周期（分钟/小时） */
function isChartIntraday() {
  return INTRADAY_CHART_PERIODS.has(state.chartPeriod || "day");
}

function isChartPeriodDailyOrHigher() {
  return !isChartIntraday();
}

/** 十字光标时间：日线及以上 yyyy/mm/dd，日线以下 yyyy/mm/dd hh:mm:ss */
function formatCrosshairTime(ms) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  if (!isChartIntraday()) return `${y}/${m}/${day}`;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${y}/${m}/${day} ${hh}:${mm}:${ss}`;
}

function relToMarketChart(el) {
  const root = document.querySelector(".market-chart");
  if (!root || !el) return null;
  const a = el.getBoundingClientRect();
  const b = root.getBoundingClientRect();
  return { left: a.left - b.left, top: a.top - b.top, width: a.width, height: a.height };
}

function hideCrosshairAxisLabels() {
  const tip = $("chart-hover-tip");
  if (tip) tip.hidden = true;
  const priceEl = $("crosshair-label-price");
  const timeEl = $("crosshair-label-time");
  if (priceEl) priceEl.hidden = true;
  if (timeEl) {
    timeEl.hidden = true;
    timeEl.setAttribute("hidden", "");
  }
}

/** 时间气泡：放在时间轴容器内，与刻度横向对齐 */
function crosshairTimeBadgePosition(cx) {
  const mainCv = /** @type {HTMLCanvasElement} */ ($("chart-canvas-main"));
  const timeFoot = $("chart-time-foot");
  const timeCv = /** @type {HTMLCanvasElement} */ ($("chart-canvas-time"));
  if (!mainCv || !timeFoot || !timeCv) return null;
  const layout = mainCv.__layout;
  const padR = layout?.padR ?? 56;
  const plotW = layout?.plotW ?? Math.max(1, mainCv.clientWidth - padR);
  if (!plotW || plotW <= 0) return null;
  const footW = timeFoot.clientWidth;
  const timePlotW = Math.max(1, footW - padR);
  const left = Math.max(0, Math.min(footW - padR, (cx / plotW) * timePlotW));
  return {
    left,
    top: timeFoot.clientHeight / 2,
  };
}

function updateCrosshairAxisLabels(cx, closeY, bar, layout) {
  const mainCv = /** @type {HTMLCanvasElement} */ ($("chart-canvas-main"));
  const priceEl = $("crosshair-label-price");
  const timeEl = $("crosshair-label-time");
  if (!bar || !layout || !mainCv || !priceEl || !timeEl) {
    hideCrosshairAxisLabels();
    return;
  }
  const mainR = relToMarketChart(mainCv);
  if (!mainR) {
    hideCrosshairAxisLabels();
    return;
  }
  const plotW = layout.plotW;
  priceEl.textContent = formatNum(bar.c, 2);
  priceEl.hidden = false;
  priceEl.style.left = `${mainR.left + plotW + 4}px`;
  priceEl.style.top = `${mainR.top + closeY}px`;

  const timePos = crosshairTimeBadgePosition(cx);
  if (!timePos) {
    timeEl.hidden = true;
    timeEl.setAttribute("hidden", "");
    return;
  }
  timeEl.textContent = formatCrosshairTime(bar.t);
  timeEl.removeAttribute("hidden");
  timeEl.style.left = `${timePos.left}px`;
  timeEl.style.top = `${timePos.top}px`;
}

/** 确定性 xorshift32 */
function xorshift32(seed) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

function hashString(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function parseParamsFromSource(text) {
  const params = {};
  parseParamDefsFromSource(text).forEach((d) => {
    const v = d.type === "INT" ? Math.round(d.value) : d.value;
    params[d.key] = v;
    params[d.key.toUpperCase()] = v;
  });
  return params;
}

function hasTokens(text, tokens) {
  const upper = text.toUpperCase();
  return tokens.every((t) => upper.includes(t));
}

function getFormulaSource() {
  return /** @type {HTMLTextAreaElement} */ ($("textarea-formula"))?.value || "";
}

function markWorkspaceBaseline(source) {
  const src = source ?? getFormulaSource();
  state.workspace.savedSource = src;
  state.workspace.dirty = false;
  if (typeof FormulaEditorUI !== "undefined") FormulaEditorUI.updateFilebarPath();
}

function syncWorkspaceDirty() {
  if (!isCustomFormulaMode()) {
    state.workspace.dirty = false;
    return;
  }
  state.workspace.dirty = getFormulaSource() !== state.workspace.savedSource;
  if (typeof FormulaEditorUI !== "undefined") FormulaEditorUI.updateFilebarPath();
}

/** 界面展示用工作区名称（去掉历史 .mai / .qlab 后缀） */
function formatWorkspaceLabel(name) {
  const s = String(name || "")
    .replace(/\.sys\.mai$/i, "")
    .replace(/\.(mai|qlab)$/i, "")
    .trim();
  return s || "未命名公式";
}

/** 根据当前来源/模板同步工作区显示名（避免内置 MA 仍显示「未命名公式」） */
function syncWorkspaceMeta() {
  const kind = /** @type {HTMLSelectElement} */ ($("select-formula-kind"))?.value;
  const tpl = /** @type {HTMLSelectElement} */ ($("select-formula-template"))?.value || "ma";
  if (kind === "builtin") {
    const ind = typeof SysInd !== "undefined" ? SysInd.getByName(tpl) : null;
    state.workspace.name = ind ? ind.name : tpl;
    state.workspace.libraryId = null;
    state.workspace.dirty = false;
  } else if (!state.workspace.libraryId) {
    const byTpl = { ma: "均线示例", empty: "未命名公式", boll_mai: "布林示例", macd: "MACD示例" };
    state.workspace.name = byTpl[tpl] || "未命名公式";
  }
  if (typeof FormulaEditorUI !== "undefined") FormulaEditorUI.updateFilebarPath();
}

function isCustomFormulaMode() {
  return /** @type {HTMLSelectElement} */ ($("select-formula-kind"))?.value !== "builtin";
}

/** 单一入口：自定义 = 可编辑源码；内置 = 只读占位 */
function setFormulaEditorMode(kind) {
  const mode = kind === "builtin" ? "builtin" : "custom";
  const host = $("editor-host");
  const ta = /** @type {HTMLTextAreaElement} */ ($("textarea-formula"));
  const codeWrap = $("code-wrap");
  const statusBar = $("formula-editor-statusbar");
  const builtinBox = $("builtin-placeholder");
  if (host) host.dataset.editorMode = mode;
  if (mode === "builtin") {
    if (ta) {
      ta.hidden = true;
      ta.blur();
    }
    if (codeWrap) codeWrap.hidden = true;
    if (statusBar) statusBar.hidden = true;
    if (builtinBox) {
      builtinBox.hidden = false;
      builtinBox.removeAttribute("aria-hidden");
    }
  } else {
    if (ta) {
      ta.hidden = false;
      ta.removeAttribute("disabled");
      ta.readOnly = false;
    }
    if (codeWrap) codeWrap.hidden = false;
    if (statusBar) statusBar.hidden = false;
    if (builtinBox) {
      builtinBox.hidden = true;
      builtinBox.setAttribute("aria-hidden", "true");
    }
  }
}

function paintEditor() {
  const wrap = $("code-wrap");
  const ta = /** @type {HTMLTextAreaElement} */ ($("textarea-formula"));
  const bar = $("formula-editor-statusbar");
  if (!ta || !wrap) return;
  if (isCustomFormulaMode()) {
    setFormulaEditorMode("custom");
  } else {
    setFormulaEditorMode("builtin");
    return;
  }
  wrap.hidden = false;
  if (bar) bar.hidden = false;
  const src = ta.value;
  const dialect = getFormulaDialect();
  const painted =
    dialect === "tdx" && window.TdxFormulaEngine
      ? window.TdxFormulaEngine.paintTdx(src, lastMaiCheck)
      : window.MaiLang
        ? window.MaiLang.paintMai(src, lastMaiCheck)
        : { html: src.replace(/</g, "&lt;"), gutter: "1" };
  const hl = $("formula-highlight");
  const gut = $("code-gutter");
  if (hl) hl.innerHTML = painted.html;
  if (gut) gut.innerHTML = painted.gutter;
  if (hl && ta) {
    hl.scrollTop = ta.scrollTop;
    hl.scrollLeft = ta.scrollLeft;
  }
  if (gut) gut.scrollTop = ta.scrollTop;
  updateCaretBar();
}

function caretWordAt(ta, pos) {
  const before = ta.value.slice(0, pos);
  const after = ta.value.slice(pos);
  return (
    (/[A-Za-z0-9_\u4e00-\u9fa5]*$/.exec(before)?.[0] || "") +
    (/^[A-Za-z0-9_\u4e00-\u9fa5]*/.exec(after)?.[0] || "")
  );
}

function updateCaretBar() {
  const ta = /** @type {HTMLTextAreaElement} */ ($("textarea-formula"));
  if (!ta || ta.hidden) return;
  const pos = $("formula-caret-pos");
  const hint = $("formula-caret-hint");
  const before = ta.value.slice(0, ta.selectionStart);
  const ln = before.split("\n").length;
  const col = ta.selectionStart - (before.lastIndexOf("\n") + 1);
  if (pos) pos.textContent = `行 ${ln}，列 ${col}　|　${ta.value.length} 字符`;
  const word = caretWordAt(ta, ta.selectionStart);
  const wu = word.toUpperCase();
  if (window.FormulaCaretTools?.lookupFunc) {
    const f = window.FormulaCaretTools.lookupFunc(wu);
    if (f && hint) {
      hint.textContent = `${wu} · ${f.t || ""} — ${(f.u || f.b || "").split("\n")[0].slice(0, 80)}`;
      return;
    }
  }
  const dialect = getFormulaDialect();
  if (dialect === "tdx" && window.TdxFormulaEngine && hint) {
    hint.textContent = window.TdxFormulaEngine.caretHint(wu);
    return;
  }
  if (window.MaiLang) {
    const info = window.MaiLang.caretInfo(ta.value, ta.selectionStart);
    if (hint) hint.textContent = info.hint;
  }
}

function formulaLibraryRefName(name) {
  const raw = String(name || "FORMULA")
    .replace(/[^\w]/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  return raw || "FORMULA";
}

/** 引入指标语法检测用：自定义公式库（内置指标由 TdxFormulaEngine 自动并入） */
function buildFormulaRefLib() {
  return (state.library || []).map((item) => ({
    name: formulaLibraryRefName(item.name),
    code: item.source || "",
    params: [],
    type: "tech",
    dialect: item.dialect === "tdx" ? "tdx" : "my",
  }));
}

function ensureDemoFormulas() {
  let seeded = false;
  try {
    seeded = localStorage.getItem(STORAGE_DEMO_FORMULAS) === "1";
  } catch {
    seeded = false;
  }
  const byId = new Map((state.library || []).map((x) => [x.id, x]));
  let changed = false;
  DEMO_FORMULA_SEED.forEach((demo) => {
    const existing = byId.get(demo.id);
    if (!existing) {
      state.library.unshift({ ...demo, ts: demo.ts || Date.now() });
      changed = true;
      return;
    }
    if (!seeded) {
      existing.name = demo.name;
      existing.note = demo.note;
      existing.source = demo.source;
      existing.dialect = demo.dialect;
      changed = true;
    }
  });
  if (changed) {
    try {
      localStorage.setItem(STORAGE_LIBRARY, JSON.stringify(state.library));
    } catch {
      /* ignore */
    }
  }
  if (!seeded) {
    try {
      localStorage.setItem(STORAGE_DEMO_FORMULAS, "1");
    } catch {
      /* ignore */
    }
  }
}

if (typeof window !== "undefined") {
  window.getFormulaRefLib = buildFormulaRefLib;
  window.resetSyntaxCheckIdle = resetSyntaxCheckIdle;
}

function validateFormulaInner() {
  const diagnostics = [];
  const source = getFormulaSource();
  const kind = /** @type {HTMLSelectElement} */ ($("select-formula-kind")).value;
  const tpl = /** @type {HTMLSelectElement} */ ($("select-formula-template")).value;

  if (kind === "builtin") {
    lastMaiCheck = { ok: true, diagnostics, stats: {} };
    return { ok: true, diagnostics, mode: "builtin" };
  }

  if (!source.trim()) {
    lastMaiCheck = { ok: true, diagnostics: [], stats: {} };
    return { ok: true, diagnostics: [], mode: "custom", empty: true };
  }

  const dialect = getFormulaDialect();
  if (dialect === "tdx" && window.TdxFormulaEngine) {
    syncTdxFormulaRuntimeBars();
    const r = window.TdxFormulaEngine.checkTdx(source);
    lastMaiCheck = r;
    r.diagnostics.forEach((d) =>
      diagnostics.push({
        level: d.level,
        text: d.line
          ? d.col
            ? `第 ${d.line} 行第 ${d.col} 列：${d.text}`
            : `第 ${d.line} 行：${d.text}`
          : d.text,
        line: d.line,
        col: d.col,
        s: d.s,
        e: d.e,
      })
    );
  } else if (window.MaiLang) {
    const r = window.MaiLang.checkMai(source);
    lastMaiCheck = r;
    r.diagnostics.forEach((d) =>
      diagnostics.push({
        level: d.level,
        text: d.line
          ? d.col
            ? `第 ${d.line} 行第 ${d.col} 列：${d.text}`
            : `第 ${d.line} 行：${d.text}`
          : d.text,
        line: d.line,
        col: d.col,
        s: d.s,
        e: d.e,
      })
    );
    if (window.TdxFormulaEngine?.checkFormula) {
      const sem = window.TdxFormulaEngine.checkFormula(source, "my", buildFormulaRefLib());
      sem.diagnostics.forEach((d) => {
        const text = d.line
          ? d.col
            ? `第 ${d.line} 行第 ${d.col} 列：${d.text}`
            : `第 ${d.line} 行：${d.text}`
          : d.text;
        if (diagnostics.some((x) => x.text === text)) return;
        diagnostics.push({
          level: d.level,
          text,
          line: d.line,
          col: d.col,
          s: d.s,
          e: d.e,
        });
      });
    }
  } else if (!source.trim()) {
    diagnostics.push({ level: "error", text: "公式为空" });
  }

  const ok = !diagnostics.some((d) => d.level === "error");
  lastMaiCheck = { ok, diagnostics, stats: lastMaiCheck?.stats };
  return { ok, diagnostics, mode: "custom" };
}

/**
 * 执行校验并刷新语法检测区
 * @param {{ silent?: boolean }} [opts] silent 为 true 时不弹出 toast（提交绘图等场景）
 */
function runFormulaValidation(opts = {}) {
  const { silent = false } = opts;
  const v = validateFormulaInner();
  state.diagnostics = v.diagnostics;
  state.validated = v.ok;
  setFormulaStatus(v.ok);
  renderSyntaxPanel();
  paintEditor();
  updateResearchBlockedHint();
  if (!silent) {
    if (v.ok) toast("公式校验通过", "success");
    else toast("公式校验未通过，请查看语法列表", "warn");
  }
  return v;
}

function renderSyntaxPanel() {
  const list = $("formula-syntax-list");
  const summary = $("formula-syntax-summary");
  if (!list) return;
  list.innerHTML = "";
  const kind = $("select-formula-kind")?.value;
  if (kind === "builtin") {
    if (summary) summary.textContent = "内置指标 · 只读";
    list.innerHTML = '<li class="hint">当前为系统指标，参数在「策略回测 › 公式参数」中调整；无需编辑源码。</li>';
    return;
  }
  if (!state.diagnostics.length && !state.validated) {
    if (summary) summary.textContent = "等待检测";
    list.innerHTML = '<li class="hint">点击「校验公式」进行语法检测</li>';
    return;
  }
  if (!state.diagnostics.length && state.validated) {
    if (summary) summary.textContent = "通过";
    list.innerHTML = `<li class="ok">✔ ${getFormulaDialect() === "tdx" ? "通达信" : "麦语言"}语法检测通过</li>`;
    return;
  }
  const errN = state.diagnostics.filter((d) => d.level === "error").length;
  const warnN = state.diagnostics.filter((d) => d.level === "warn").length;
  if (summary) {
    summary.textContent =
      errN > 0 ? `错误 ${errN} 条` + (warnN ? ` · 警告 ${warnN} 条` : "") : warnN ? `警告 ${warnN} 条` : "通过";
  }
  if (errN === 0 && warnN === 0 && (state.validated || lastMaiCheck?.ok)) {
    const ok = document.createElement("li");
    ok.className = "ok";
    ok.textContent = `✔ ${getFormulaDialect() === "tdx" ? "通达信" : "麦语言"}语法检测通过`;
    list.appendChild(ok);
  }
  state.diagnostics.forEach((d) => {
    const li = document.createElement("li");
    li.className = d.level === "error" ? "err" : d.level === "warn" ? "warn" : "";
    li.textContent = d.text;
    list.appendChild(li);
  });
}

function renderDiagnostics() {
  renderSyntaxPanel();
  const list = $("formula-diagnostics");
  if (!list) return;
  list.innerHTML = "";
  list.classList.add("ie-panel-messages");
  if (!state.diagnostics.length) {
    list.hidden = true;
    return;
  }
  list.hidden = false;
  const hasErr = state.diagnostics.some((d) => d.level === "error");
  if (hasErr) {
    const head = document.createElement("li");
    head.className = "msg err";
    const dialectLabel = getFormulaDialect() === "tdx" ? "通达信" : "麦语言";
    head.textContent = `✖ 校验未通过（${dialectLabel}）`;
    list.appendChild(head);
  } else if (state.validated) {
    const head = document.createElement("li");
    head.className = "msg ok";
    head.textContent = `✔ ${getFormulaDialect() === "tdx" ? "通达信" : "麦语言"}语法校验通过`;
    list.appendChild(head);
  }
  state.diagnostics.forEach((d) => {
    const li = document.createElement("li");
    li.className = `msg ${d.level === "error" ? "err" : "warn"}`;
    li.textContent = (d.level === "error" ? "✖ " : "⚠ ") + d.text;
    list.appendChild(li);
  });
}

function setFormulaStatus(_valid) {
  /* 标题区不再展示校验状态标签；见「语法检测」面板 */
}

/** @param {string} [preferred] 强制选中的模板（如新建公式时的 empty） */
function syncFormulaTemplateSelect(preferred) {
  const kind = /** @type {HTMLSelectElement} */ ($("select-formula-kind"))?.value;
  const sel = /** @type {HTMLSelectElement} */ ($("select-formula-template"));
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = "";
  if (kind === "builtin" && typeof SysInd !== "undefined") {
    SysInd.SYSTEM_LIB.forEach((ind) => {
      const o = document.createElement("option");
      o.value = ind.name;
      o.textContent = `${ind.name}　${ind.desc}`;
      sel.appendChild(o);
    });
    if (preferred && SysInd.SYSTEM_LIB.some((x) => x.name === preferred)) {
      sel.value = preferred;
    } else {
      sel.value = SysInd.SYSTEM_LIB.some((x) => x.name === prev) ? prev : "MA";
    }
  } else {
    CUSTOM_TEMPLATE_OPTIONS.forEach((t) => {
      const o = document.createElement("option");
      o.value = t.value;
      o.textContent = t.label;
      sel.appendChild(o);
    });
    if (preferred && CUSTOM_TEMPLATE_OPTIONS.some((t) => t.value === preferred)) {
      sel.value = preferred;
    } else {
      const legacy = prev === "macd" ? "boll_mai" : prev;
      sel.value = CUSTOM_TEMPLATE_OPTIONS.some((t) => t.value === legacy) ? legacy : "ma";
    }
  }
}

const FORMULA_PARAM_MAX = 16;
if (typeof window !== "undefined") window.FORMULA_PARAM_MAX = FORMULA_PARAM_MAX;

const TDX_PARAM_NAME = /^[A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\u4e00-\u9fa5]*$/;

function inferParamTypeFromLiteral(lit) {
  return /^-?\d+\.\d+/.test(String(lit).trim()) ? "FLOAT" : "INT";
}

/** 通达信风格行参：N1:=5; 或 N1:5,NODRAW;（兼容旧 PARAM 行便于迁移） */
function isTdxParamDeclLine(line) {
  const t = String(line || "").trim();
  if (!t || /^\/\//.test(t)) return false;
  if (/^PARAM\s+\w+\s+(?:INT|FLOAT)\s*=/i.test(t)) return true;
  if (/^\{[\s\S]*\}$/.test(t)) return false;
  const mAssign = t.match(
    /^([A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\u4e00-\u9fa5]*)\s*:=\s*(-?\d+(?:\.\d+)?)\s*(?:,\s*NODRAW)?\s*;?\s*$/i
  );
  if (mAssign) return true;
  const mColon = t.match(
    /^([A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\u4e00-\u9fa5]*)\s*:\s*(-?\d+(?:\.\d+)?)\s*(?:,\s*NODRAW)?\s*;?\s*$/i
  );
  return !!mColon;
}

function parseParamDefsFromSource(text) {
  const defs = [];
  const seen = new Set();
  const push = (key, type, value) => {
    if (!key || !TDX_PARAM_NAME.test(key) || seen.has(key)) return;
    seen.add(key);
    defs.push({ key, type: type === "FLOAT" ? "FLOAT" : "INT", value });
  };
  const src = String(text || "");
  const reParam = /PARAM\s+(\w+)\s+(INT|FLOAT)\s*=\s*(-?\d+(?:\.\d+)?)/gi;
  let m;
  while ((m = reParam.exec(src)) !== null) {
    push(m[1], m[2].toUpperCase(), parseFloat(m[3]));
  }
  const lines = src.split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      if (defs.length) continue;
      continue;
    }
    if (/^\/\//.test(t) || t.startsWith("{")) {
      if (defs.length) break;
      continue;
    }
    const legacy = t.match(/^PARAM\s+(\w+)\s+(INT|FLOAT)\s*=\s*(-?\d+(?:\.\d+)?)/i);
    if (legacy) {
      push(legacy[1], legacy[2].toUpperCase(), parseFloat(legacy[3]));
      continue;
    }
    const mAssign = t.match(/^([A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\u4e00-\u9fa5]*)\s*:=\s*(-?\d+(?:\.\d+)?)/i);
    if (mAssign) {
      push(mAssign[1], inferParamTypeFromLiteral(mAssign[2]), parseFloat(mAssign[2]));
      continue;
    }
    const mColon = t.match(/^([A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\u4e00-\u9fa5]*)\s*:\s*(-?\d+(?:\.\d+)?)/i);
    if (mColon) {
      push(mColon[1], inferParamTypeFromLiteral(mColon[2]), parseFloat(mColon[2]));
      continue;
    }
    if (seen.size > 0) break;
  }
  return defs;
}

function stripParamLinesFromSource(text) {
  let lines = String(text || "").split(/\r?\n/);
  lines = lines.filter((line) => {
    const t = line.trim();
    return t && !/^PARAM\s+\w+\s+(?:INT|FLOAT)\s*=/i.test(t);
  });
  while (lines.length && isTdxParamDeclLine(lines[0])) lines.shift();
  while (lines.length && !lines[0].trim()) lines.shift();
  return lines.join("\n");
}

function formatParamLineForSource(p) {
  const key = String(p.key || "").trim();
  if (!key || !TDX_PARAM_NAME.test(key)) return "";
  const type = p.type === "FLOAT" ? "FLOAT" : "INT";
  const raw = Number(p.value);
  const val = Number.isFinite(raw) ? raw : type === "INT" ? 0 : 0;
  const out = type === "INT" ? String(Math.round(val)) : String(val);
  return `${key}:=${out};\n`;
}

/** 用弹窗中的参数列表重写源码顶部通达信参数字句（保留其余源码） */
function rewriteSourceWithParams(src, rows) {
  const body = stripParamLinesFromSource(src);
  const lines = (rows || [])
    .map((p) => formatParamLineForSource(p))
    .filter(Boolean)
    .slice(0, FORMULA_PARAM_MAX);
  return lines.length ? `${lines.join("")}\n${body}` : body;
}

function formatParamDisplayValue(m) {
  const type = m.type === "FLOAT" ? "FLOAT" : "INT";
  const v = Number(m.value);
  if (!Number.isFinite(v)) return "—";
  return type === "INT" ? String(Math.round(v)) : String(Number(v.toFixed(4)).replace(/\.?0+$/, "") || "0");
}

/** 文件栏展示用：当前公式参数行（含缓存中的当前值） */
function getFormulaParamRowsForDisplay() {
  if (typeof syncParamModel === "function") syncParamModel();
  return parseParamDefsFromSource(getFormulaSource()).map((d) => {
    const m = state.paramRangeCache[d.key];
    return {
      key: d.key,
      type: d.type,
      value: m && Number.isFinite(m.value) ? m.value : d.value,
    };
  });
}

function formatFilebarParamSummary(rows) {
  return (rows || [])
    .filter((p) => p.key)
    .map((p) => `${p.key}=${formatParamDisplayValue(p)}`)
    .join("，");
}

function buildFilebarSummaryText() {
  const kind = /** @type {HTMLSelectElement} */ ($("select-formula-kind"))?.value;
  if (kind === "builtin") {
    const tpl = /** @type {HTMLSelectElement} */ ($("select-formula-template"))?.value || "MA";
    const ind = typeof SysInd !== "undefined" ? SysInd.getByName(tpl) : null;
    const name = ind ? ind.name : tpl;
    const params = formatFilebarParamSummary(getParamModel());
    return params ? `${name} · ${params}` : name;
  }
  const name =
    typeof formatWorkspaceLabel === "function"
      ? formatWorkspaceLabel(state.workspace?.name)
      : state.workspace?.name || "未命名公式";
  const params = formatFilebarParamSummary(getFormulaParamRowsForDisplay());
  let line = params ? `${name} · ${params}` : name;
  if (isCustomFormulaMode() && state.workspace?.dirty) line += " · 未保存";
  return line;
}

/**
 * @param {string} name
 * @param {Array<{key:string,type:'INT'|'FLOAT',value:number}>} rows
 */
function applyFormulaMetaFromDialog(name, rows) {
  if (!isCustomFormulaMode()) return false;
  const trimmed = String(name ?? "").trim();
  state.workspace.name = trimmed || "未命名公式";
  const ta = /** @type {HTMLTextAreaElement} */ ($("textarea-formula"));
  const cleaned = (rows || [])
    .map((p) => {
      const value = Number(p.value);
      const type =
        Number.isFinite(value) && !Number.isInteger(value)
          ? "FLOAT"
          : typeof inferParamTypeFromLiteral === "function" && Number.isFinite(value)
            ? inferParamTypeFromLiteral(String(value))
            : "INT";
      return {
        key: String(p.key || "").trim(),
        type,
        value,
      };
    })
    .filter((p) => p.key)
    .slice(0, FORMULA_PARAM_MAX);
  if (ta) {
    ta.value = rewriteSourceWithParams(ta.value, cleaned);
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }
  if (typeof syncParamModel === "function") syncParamModel();
  cleaned.forEach((p) => {
    const m = state.paramRangeCache[p.key];
    if (m && Number.isFinite(p.value)) m.value = p.type === "INT" ? Math.round(p.value) : p.value;
  });
  if (typeof renderParameterTable === "function") renderParameterTable();
  if (typeof paintEditor === "function") paintEditor();
  if (typeof syncWorkspaceDirty === "function") syncWorkspaceDirty();
  if (typeof saveDraft === "function") saveDraft();
  if (typeof FormulaEditorUI !== "undefined" && FormulaEditorUI.updateFilebarPath) FormulaEditorUI.updateFilebarPath();
  return true;
}

function getParameterDefinitions() {
  const kind = /** @type {HTMLSelectElement} */ ($("select-formula-kind")).value;
  const tpl = /** @type {HTMLSelectElement} */ ($("select-formula-template")).value;
  if (kind === "builtin" && typeof SysInd !== "undefined") {
    const ind = SysInd.getByName(tpl);
    if (ind) return SysInd.paramDefs(ind);
  }
  const src = /** @type {HTMLTextAreaElement} */ ($("textarea-formula")).value;
  return parseParamDefsFromSource(src).map((d) => {
    const isInt = d.type === "INT";
    const lo = isInt ? Math.max(1, Math.floor(d.value * 0.5)) : +(d.value * 0.5).toFixed(2);
    const hi = isInt ? Math.max(lo + 1, Math.ceil(d.value * 2)) : +(d.value * 2).toFixed(2);
    return { ...d, opt: false, min: lo, max: hi, step: isInt ? 1 : 0.1 };
  });
}

/**
 * 公式参数模型（按参数名保存在 state.paramRangeCache）：
 *  value 当前值 · min/max/step 允许范围（随公式保存，下发到各端后用户只能在此范围内调整）
 *  opt/smin/smax/sstep 参数优化的扫描区间（仅研究使用，需落在允许范围内）
 */
function syncParamModel() {
  const defs = getParameterDefinitions();
  const builtin = !isCustomFormulaMode();
  return defs.map((d) => {
    const old = state.paramRangeCache[d.key];
    let m;
    if (old && old.type === d.type) {
      m = old.def === d.value || builtin ? old : { ...old, def: d.value, value: d.value };
    } else {
      m = { key: d.key, type: d.type, def: d.value, value: d.value, min: d.min, max: d.max, step: d.step, opt: false };
    }
    if (builtin) m = { ...m, min: d.min, max: d.max, step: d.step };
    if (!Number.isFinite(m.smin)) m = { ...m, smin: m.min, smax: m.max, sstep: m.step };
    m = { ...m, key: d.key, type: d.type };
    state.paramRangeCache[d.key] = m;
    return m;
  });
}

function getParamModel() {
  return getParameterDefinitions()
    .map((d) => state.paramRangeCache[d.key])
    .filter(Boolean);
}

/** 公式的参数元数据（当前值与允许范围），随草稿 / 我的公式 / 指标版本保存 */
function collectParamMeta() {
  const meta = {};
  syncParamModel().forEach((m) => {
    meta[m.key] = { type: m.type, def: m.def, value: m.value, min: m.min, max: m.max, step: m.step };
  });
  return meta;
}

function restoreParamMeta(meta) {
  if (!meta || typeof meta !== "object") return;
  Object.entries(meta).forEach(([key, m]) => {
    if (m && typeof m === "object") state.paramRangeCache[key] = { ...state.paramRangeCache[key], ...m, key };
  });
}

function applyParameterValues(vals) {
  if (!vals) return;
  syncParamModel();
  Object.entries(vals).forEach(([key, val]) => {
    const m = state.paramRangeCache[key];
    if (m && Number.isFinite(val)) m.value = val;
  });
  renderParameterTable();
}

function applyIndicatorOutputFilter(ev, bindings) {
  if (!bindings?.outputs?.length) return ev;
  const enabled = bindings.outputs.filter((o) => o.enabled);
  if (!enabled.length) return ev;
  const allowed = new Set(enabled.map((o) => o.line));
  const labels = Object.fromEntries(enabled.map((o) => [o.line, (o.var || o.line).trim() || o.line]));
  const patch = (list) =>
    (list || [])
      .filter((s) => allowed.has(s.name))
      .map((s) => ({ ...s, label: labels[s.name] || s.label || s.name }));
  const outputs = patch(ev.outputs).map((o) => ({ ...o, label: labels[o.name] || o.label }));
  return {
    ...ev,
    outputs,
    mainLineSeries: patch(ev.mainLineSeries),
    subLineSeries: patch(ev.subLineSeries),
  };
}

function paramTypeLabel(m) {
  return `<span class="mono">${m.key}</span><span class="type-label">${m.type === "INT" ? "整数" : "小数"}</span>`;
}

function fmtParamRange(m) {
  return `${m.min} ~ ${m.max} · 步长 ${m.step}`;
}

/** 「策略回测 › 公式参数」与「参数优化 › 优化参数」两张表都从参数模型渲染 */
function renderParameterTable() {
  const defTbody = $("param-def-tbody");
  const optTbody = $("param-opt-tbody");
  if (!defTbody || !optTbody) return;
  const list = syncParamModel();
  const builtin = !isCustomFormulaMode();
  if (!list.length) {
    defTbody.innerHTML = `<tr><td colspan="5" class="empty-row">当前公式没有可调参数（源码顶部 N1:= 缺省值 形式）。</td></tr>`;
    optTbody.innerHTML = `<tr><td colspan="8" class="empty-row">没有可优化的参数，开始优化将只评估一组（等同一次回测）。</td></tr>`;
    updateResearchBlockedHint();
    return;
  }
  defTbody.innerHTML = list
    .map((m) => {
      const st = m.type === "INT" ? "1" : "any";
      const ro = builtin ? "disabled" : "";
      return `<tr data-param="${m.key}">
        <td>${paramTypeLabel(m)}</td>
        <td><input class="mono" type="number" step="${st}" data-field="value" value="${m.value}" aria-label="${m.key} 当前值" /></td>
        <td><input type="number" step="${st}" data-field="min" value="${m.min}" ${ro} aria-label="${m.key} 最小值" /></td>
        <td><input type="number" step="${st}" data-field="max" value="${m.max}" ${ro} aria-label="${m.key} 最大值" /></td>
        <td><input type="number" step="${st}" data-field="step" value="${m.step}" ${ro} aria-label="${m.key} 步长" /></td>
      </tr>`;
    })
    .join("");
  optTbody.innerHTML = list
    .map((m) => {
      const st = m.type === "INT" ? "1" : "any";
      return `<tr data-param="${m.key}">
        <td>${paramTypeLabel(m)}</td>
        <td class="mono" data-cell="value">${m.value}</td>
        <td class="muted" data-cell="range">${fmtParamRange(m)}</td>
        <td><input type="checkbox" data-field="opt" ${m.opt ? "checked" : ""} aria-label="参与优化 ${m.key}" /></td>
        <td><input type="number" step="${st}" data-field="smin" value="${m.smin}" aria-label="${m.key} 扫描最小" /></td>
        <td><input type="number" step="${st}" data-field="smax" value="${m.smax}" aria-label="${m.key} 扫描最大" /></td>
        <td><input type="number" step="${st}" data-field="sstep" value="${m.sstep}" aria-label="${m.key} 扫描步长" /></td>
        <td class="mono" data-cell="count">—</td>
      </tr>`;
    })
    .join("");
  updateResearchBlockedHint();
  if (typeof FormulaEditorUI !== "undefined" && FormulaEditorUI.updateFilebarPath) FormulaEditorUI.updateFilebarPath();
}

/** 两张参数表的输入统一回写参数模型（不重绘表格，保留输入焦点） */
function onParamTableInput(e) {
  const t = /** @type {HTMLInputElement} */ (e.target);
  const field = t.getAttribute("data-field");
  const tr = t.closest("tr[data-param]");
  if (!field || !tr) return;
  const m = state.paramRangeCache[tr.getAttribute("data-param")];
  if (!m) return;
  if (field === "opt") m.opt = t.checked;
  else m[field] = t.value === "" ? NaN : Number(t.value);
  if (field === "value") invalidateChartSubmission();
  if (isCustomFormulaMode()) saveDraft();
  updateResearchBlockedHint();
  if (typeof FormulaEditorUI !== "undefined" && FormulaEditorUI.updateFilebarPath) FormulaEditorUI.updateFilebarPath();
}

function renderConstraints() {
  const empty = $("constraints-empty");
  const list = $("constraints-list");
  const rows = list.querySelectorAll(".constraint-row");
  if (!rows.length) {
    empty.hidden = false;
  } else {
    empty.hidden = true;
  }
}

function collectConstraints() {
  return Array.from(document.querySelectorAll("#constraints-list .constraint-row")).map((row) => {
    const selects = row.querySelectorAll("select");
    const inp = row.querySelector("input");
    return {
      left: selects[0]?.value,
      op: selects[1]?.value,
      right: selects[2]?.value,
      label: inp?.value?.trim() || "",
    };
  });
}

function addConstraintRow(preset) {
  const list = $("constraints-list");
  const empty = $("constraints-empty");
  const row = document.createElement("div");
  row.className = "constraint-row";
  const paramKeys = getParameterDefinitions().map((p) => p.key);
  const opts = paramKeys.map((k) => `<option value="${k}">${k}</option>`).join("");
  row.innerHTML = `
    <select class="mono">${opts}</select>
    <select><option value="<">&lt;</option><option value="<=">&lt;=</option><option value=">">&gt;</option><option value=">=">&gt;=</option></select>
    <select class="mono">${opts}</select>
    <input type="text" placeholder="备注（可选）" style="min-width:120px" value="${preset?.label || ""}" />
    <button type="button" class="text-button rm">移除</button>
  `;
  if (preset) {
    const s = row.querySelectorAll("select");
    s[0].value = preset.left;
    s[1].value = preset.op;
    s[2].value = preset.right;
  }
  row.querySelector(".rm").addEventListener("click", () => {
    row.remove();
    renderConstraints();
    updateResearchBlockedHint();
  });
  list.appendChild(row);
  empty.hidden = true;
  updateResearchBlockedHint();
}

function computeMA(bars, period) {
  const out = new Array(bars.length).fill(null);
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    sum += bars[i].c;
    if (i >= period) sum -= bars[i - period].c;
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/** @type {{ mainH: number, volH: number, subH: number }} */
let chartPaneLayout = { mainH: 268, volH: 72, subH: 100 };

/**
 * @param {{ showSub: boolean, showVol: boolean }} opts
 */
function measureChartPaneHeights(opts) {
  const stage = $("chart-stage");
  const lowerHead = $("chart-lower-head");
  const total = Math.max(280, stage?.clientHeight || 360);
  const headBarH = lowerHead ? lowerHead.offsetHeight || 26 : 26;
  const volHeadH = opts.showVol ? headBarH : 0;
  const subHeadH = opts.showSub ? headBarH : 0;

  if (opts.showSub) {
    const body = total - subHeadH;
    const subH = Math.max(68, Math.min(112, Math.round(body * 0.22)));
    const mainH = Math.max(180, body - subH);
    return { mainH, volH: 0, subH, volHeadH: 0, subHeadH };
  }
  if (opts.showVol) {
    const body = total - volHeadH;
    const volH = Math.max(68, Math.min(100, Math.round(body * 0.21)));
    const mainH = Math.max(180, body - volH);
    return { mainH, volH, subH: 0, volHeadH, subHeadH: 0 };
  }
  return { mainH: total, volH: 0, subH: 0, volHeadH: 0, subHeadH: 0 };
}

/** 与首次加载行情后主/副图默认可见区间一致 */
function resetChartViewRange() {
  const n = state.bars.length;
  if (!n) {
    state.chartView.start = 0;
    state.chartView.count = 90;
  } else {
    state.chartView.count = Math.min(120, n);
    state.chartView.start = Math.max(0, n - state.chartView.count);
  }
  state.chartView.hoverIndex = null;
  state.chartView.drag = null;
}

/** 重置 K 线为未叠加任何指标：仅 K 线 + 成交量，视窗与十字线恢复默认 */
function resetChartPanesToDefault() {
  if (!state.dataLoaded) {
    toast("请先加载行情", "warn");
    return;
  }
  resetChartViewRange();
  state.chartPlot = null;
  state.chartIndicatorActive = false;
  if (typeof ChartPaneInd !== "undefined" && ChartPaneInd.resetChartMounts) {
    ChartPaneInd.resetChartMounts();
  } else {
    state.chartFormulaPlot = null;
    state.chartFormulaPane = null;
    state.chartMount = { main: null, sub: null };
  }
  const cross = $("chart-crosshair");
  const tip = $("chart-hover-tip");
  if (cross) cross.hidden = true;
  hideCrosshairAxisLabels();
  updatePlotLegend(null);
  updateSubPlotLegend(null);
  drawCandleChart();
  toast("已重置图表（公式编辑与校验未改动）", "success");
}

function clampChartView() {
  const n = state.bars.length;
  if (!n) return;
  state.chartView.count = Math.max(20, Math.min(n, Math.round(state.chartView.count)));
  const maxStart = Math.max(0, n - state.chartView.count);
  state.chartView.start = Math.max(0, Math.min(maxStart, Math.round(state.chartView.start)));
}

/**
 * 滚轮缩放：优先以十字光标所在 K 线为锚点；无十字线时用指针下 K 线，否则以视窗中心
 * @param {number} deltaY wheel deltaY
 * @param {number} [clientX] 指针视口 X，用于无 hoverIndex 时定位
 */
function applyChartZoom(deltaY, clientX) {
  if (!state.dataLoaded || !state.bars.length) return;
  const n = state.bars.length;
  const mainCv = /** @type {HTMLCanvasElement} */ ($("chart-canvas-main"));
  const layout = mainCv?.__layout;
  const step = deltaY > 0 ? 6 : -6;
  const oldStart = state.chartView.start;
  const oldCount = state.chartView.count;
  const newCount = Math.max(20, Math.min(n, oldCount + step));
  if (newCount === oldCount) return;

  let anchor = state.chartView.hoverIndex;
  const cross = $("chart-crosshair");
  const crossOn = cross && !cross.hidden;
  if (crossOn && anchor != null) {
    /* 十字光标已调出：固定以该 K 线为缩放中心 */
  } else if (layout && mainCv && clientX != null) {
    const rect = mainCv.getBoundingClientRect();
    anchor = chartIndexAtX(clientX - rect.left, layout);
  }
  if (anchor == null || anchor < 0) {
    anchor = oldStart + Math.floor(oldCount / 2);
  }

  const li = anchor - oldStart;
  const frac = Math.max(0, Math.min(1, (li + 0.5) / oldCount));
  state.chartView.count = newCount;
  state.chartView.start = Math.round(anchor - frac * newCount + 0.5);
  clampChartView();
}

function chartIndexAtX(x, layout) {
  const { plotW, step, count, start } = layout;
  if (x < 0 || x > plotW) return null;
  return Math.max(start, Math.min(start + count - 1, start + Math.floor(x / step)));
}

function getChartFormulaTitle() {
  const kind = /** @type {HTMLSelectElement} */ ($("select-formula-kind"))?.value;
  const tplSel = /** @type {HTMLSelectElement} */ ($("select-formula-template"));
  if (kind === "builtin") {
    const ind = typeof SysInd !== "undefined" ? SysInd.getByName(tplSel?.value) : null;
    if (ind) return `${ind.name} · ${ind.desc}`;
  }
  const part =
    (typeof formatWorkspaceLabel === "function"
      ? formatWorkspaceLabel(state.workspace?.name)
      : state.workspace?.name) ||
    $("editor-filebar-label")?.getAttribute("title")?.split("·")[0]?.trim() ||
    "";
  if (part) return part;
  const src = getFormulaSource();
  const labelM = src.match(/LABEL\s*=\s*["']([^"']+)["']/i);
  if (labelM) return labelM[1];
  return tplSel?.selectedOptions?.[0]?.textContent?.trim() || "自定义公式";
}

/** 图表指标区展示名（有名称用名称，否则「自编公式」） */
function getChartFormulaDisplayName() {
  const ws = formatWorkspaceLabel(state.workspace?.name);
  if (ws && ws !== "未命名公式") return ws;
  const part =
    (typeof formatWorkspaceLabel === "function"
      ? formatWorkspaceLabel(state.workspace?.name)
      : state.workspace?.name) ||
    $("editor-filebar-label")?.getAttribute("title")?.split("·")[0]?.trim() ||
    "";
  if (part && !part.includes("系统指标") && part !== "custom.qlab") return formatWorkspaceLabel(part);
  const labelM = getFormulaSource().match(/LABEL\s*=\s*["']([^"']+)["']/i);
  if (labelM?.[1]) return labelM[1];
  return "自编公式";
}

function chartMountDisplayName(pane) {
  const m = state.chartMount?.[pane];
  if (!m) return "";
  if (m.kind === "builtin" && typeof SysInd !== "undefined") {
    const ind = SysInd.getByName(m.name);
    return ind ? `${ind.name} · ${ind.desc}` : m.name;
  }
  if (m.kind === "formula") return getChartFormulaDisplayName();
  return "";
}

function paneHasChartMount(pane) {
  return !!state.chartMount?.[pane];
}

/** 副图指标栏：成交量行（无副图窗格）或副图窗格顶栏（有副图指标时） */
function syncChartLowerHead(showSub) {
  const head = $("chart-lower-head");
  const subBox = $("chart-sub-box");
  const volBox = $("chart-vol-box");
  const volCv = $("chart-canvas-vol");
  const title = $("chart-lower-pane-title");
  const tag = $("chart-lower-pane-tag");
  if (!head) return;
  if (showSub && subBox) {
    subBox.insertBefore(head, subBox.firstChild);
    head.classList.add("chart-lower-head--sub-pane");
    if (title) title.textContent = chartMountDisplayName("sub") || "副图";
    if (tag) tag.hidden = true;
  } else if (volBox && volCv) {
    volBox.insertBefore(head, volCv);
    head.classList.remove("chart-lower-head--sub-pane");
    if (title) title.textContent = "成交量";
    if (tag) {
      tag.hidden = false;
      tag.textContent = "VOL";
    }
  }
}

function uiParamsForPlot() {
  const out = {};
  getParamModel().forEach((r) => {
    out[r.key] = r.value;
    out[r.key.toUpperCase()] = r.value;
  });
  return out;
}

/** 仅根据公式编辑区求值，不直接写入 state.chartPlot */
function computeFormulaChartPlot() {
  if (!state.dataLoaded) return null;
  const kind = /** @type {HTMLSelectElement} */ ($("select-formula-kind")).value;
  const template = /** @type {HTMLSelectElement} */ ($("select-formula-template")).value;
  const uiParams = uiParamsForPlot();

  if (kind === "builtin" && typeof SysInd !== "undefined") {
    const ind = SysInd.getByName(template);
    if (!ind) return null;
    let ev = SysInd.evaluate(ind.name, state.bars, uiParams);
    if (state.indicatorBindings?.name === ind.name) {
      ev = applyIndicatorOutputFilter(ev, state.indicatorBindings);
    }
    return finalizeChartPlot({
      title: `${ind.name} · ${ind.desc}`,
      draw: ev.draw,
      indicatorName: ind.name,
      mainLineSeries: ev.mainLineSeries,
      subLineSeries: ev.subLineSeries,
      outputs: ev.outputs,
      mainOutputs: ev.outputs,
      subOutputs: ev.outputs,
    });
  }

  if (getFormulaDialect() === "tdx" && window.TdxFormulaRuntime && window.TdxFormulaEngine?.parse) {
    const p = window.TdxFormulaRuntime.chartPlotFromTdx(
      state.bars,
      getFormulaSource(),
      window.TdxFormulaEngine.parse,
      uiParams,
      tdxBarsMeta()
    );
    return finalizeChartPlot({
      title: p.title || getChartFormulaTitle(),
      draw: p.draw || "main",
      indicatorName: null,
      mainLineSeries: p.mainLineSeries || [],
      subLineSeries: p.subLineSeries || [],
      mainDrawings: p.mainDrawings || [],
      tradeDrawings: p.tradeDrawings || [],
      tradeStats: p.tradeStats || null,
      outputs: p.outputs || [],
      mainOutputs: p.mainOutputs || p.outputs || [],
      subOutputs: p.subOutputs || [],
    });
  }

  if (typeof MaiPlot === "undefined") return null;
  const plotDrawMethod = getPlotDrawMethod();
  const p = MaiPlot.buildChartPlot(state.bars, {
    source: getFormulaSource(),
    kind: "custom",
    template,
    title: getChartFormulaTitle(),
    uiParams,
    plotDrawMethod,
  });
  const hasPlot =
    (p.mainLineSeries?.length || 0) + (p.subLineSeries?.length || 0) + (p.mainDrawings?.length || 0) > 0;
  if (!hasPlot) return null;
  return finalizeChartPlot({
    title: p.title,
    draw: p.subLineSeries?.length && !p.mainLineSeries?.length && !p.mainDrawings?.length ? "sub" : "main",
    indicatorName: null,
    mainLineSeries: p.mainLineSeries || [],
    subLineSeries: p.subLineSeries || [],
    mainDrawings: p.mainDrawings || [],
    outputs: p.outputs,
    mainOutputs: (p.outputs || []).filter((o) => o.onMain),
    subOutputs: (p.outputs || []).filter((o) => !o.onMain),
  });
}

function refreshChartPlot() {
  const plot = computeFormulaChartPlot();
  state.chartFormulaPlot = plot;
}

function mergeMountBuiltinEval(pane, mount) {
  if (!mount || mount.kind !== "builtin" || typeof SysInd === "undefined") return null;
  return SysInd.evaluate(mount.name, state.bars, mount.params || {});
}

/** 合并主/副图窗格挂载，生成用于绘制的 chartPlot */
function rebuildEffectiveChartPlot() {
  if (!state.dataLoaded) {
    state.chartPlot = null;
    state.chartIndicatorActive = false;
    return;
  }
  const mainM = state.chartMount?.main;
  const subM = state.chartMount?.sub;
  let mainLineSeries = [];
  let subLineSeries = [];
  let mainOutputs = [];
  let subOutputs = [];
  let mainDrawings = [];
  let subDrawings = [];
  let mainOverlaySeries = [];
  let overlayDrawings = [];
  let tradeDrawings = [];
  let scaleMode = "shared";

  if (state.chartFormulaPlot && (mainM?.kind === "formula" || subM?.kind === "formula")) {
    tradeDrawings = state.chartFormulaPlot.tradeDrawings || [];
  }

  if (mainM?.kind === "builtin") {
    const ev = mergeMountBuiltinEval("main", mainM);
    if (ev) {
      mainLineSeries = ev.mainLineSeries || [];
      mainOutputs = (ev.outputs || []).filter((o) => o.onMain !== false);
    }
  } else if (mainM?.kind === "formula" && state.chartFormulaPane === "main" && state.chartFormulaPlot) {
    const fp = state.chartFormulaPlot;
    mainLineSeries = fp.mainLineSeries || [];
    mainOverlaySeries = fp.mainOverlaySeries || [];
    mainDrawings = fp.mainDrawings || [];
    overlayDrawings = fp.overlayDrawings || [];
    mainOutputs = fp.mainOutputs || [];
    scaleMode = fp.scaleMode || "shared";
  }

  if (subM?.kind === "builtin") {
    const ev = mergeMountBuiltinEval("sub", subM);
    if (ev) {
      subLineSeries = ev.subLineSeries || [];
      subOutputs = ev.outputs || [];
    }
  } else if (subM?.kind === "formula" && state.chartFormulaPane === "sub" && state.chartFormulaPlot) {
    const fp = state.chartFormulaPlot;
    subLineSeries = fp.subLineSeries || [];
    subDrawings = fp.subDrawings || [];
    subOutputs = fp.subOutputs || [];
  }

  const active =
    paneHasChartMount("main") ||
    paneHasChartMount("sub") ||
    mainLineSeries.length ||
    subLineSeries.length ||
    mainOverlaySeries.length;

  if (!active) {
    state.chartPlot = null;
    state.chartIndicatorActive = false;
    return;
  }

  const showSubPane = paneHasChartMount("sub") && (subLineSeries.length > 0 || (subDrawings?.length || 0) > 0);

  state.chartPlot = {
    title: chartMountDisplayName("main") || chartMountDisplayName("sub"),
    draw: showSubPane ? "sub" : "main",
    indicatorName: null,
    mainLineSeries,
    subLineSeries,
    mainOutputs,
    subOutputs,
    mainDrawings,
    subDrawings,
    mainOverlaySeries,
    overlayDrawings,
    tradeDrawings,
    scaleMode,
    outputs: [...mainOutputs, ...subOutputs],
  };
  state.chartIndicatorActive = true;
  if (typeof ChartPaneInd !== "undefined" && ChartPaneInd.syncChartMountUI) ChartPaneInd.syncChartMountUI();
}

/** 公式/参数/画线方法等有改动：标记未提交，但不改动当前 K 线（须点「提交绘图」才更新图表） */
function invalidateChartSubmission() {
  state.chartPlotStale = true;
}

/** 行情变更后：已提交的指标公式按新 K 线重算并刷新图例 */
function reconcileChartPlotAfterMarketChange() {
  if (!state.dataLoaded || !state.bars.length) return;
  syncTdxFormulaRuntimeBars();
  if (!state.chartIndicatorActive && !paneHasChartMount("main") && !paneHasChartMount("sub")) return;
  if (state.chartFormulaPane && state.chartMount?.[state.chartFormulaPane]?.kind === "formula") {
    state.chartFormulaPlot = computeFormulaChartPlot();
  }
  rebuildEffectiveChartPlot();
  const idx =
    state.chartView.hoverIndex != null && state.chartView.hoverIndex >= 0
      ? state.chartView.hoverIndex
      : state.bars.length - 1;
  updatePlotLegend(idx);
  updateSubPlotLegend(idx);
}

function escLegendText(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function plotLegendFormulaLabel() {
  if (!paneHasChartMount("main") && !state.chartIndicatorActive) return "";
  return chartMountDisplayName("main");
}

function updatePlotLegend(barIndex) {
  const titleEl = $("plot-legend-title");
  const itemsEl = $("plot-legend-items");
  if (!titleEl || !itemsEl) return;

  const hintSubmit = '<span class="plot-legend-hint muted">提交绘图后显示各输出变量数值</span>';
  const hintLoad = '<span class="plot-legend-hint muted">请先读取行情</span>';

  if (!state.dataLoaded) {
    titleEl.textContent = "";
    itemsEl.innerHTML = hintLoad;
    updateSubPlotLegend(barIndex);
    if (typeof ChartPaneInd !== "undefined" && ChartPaneInd.syncChartMountUI) ChartPaneInd.syncChartMountUI();
    return;
  }

  if (!paneHasChartMount("main")) {
    titleEl.textContent = "";
    itemsEl.innerHTML = hintSubmit;
    updateSubPlotLegend(barIndex);
    if (typeof ChartPaneInd !== "undefined" && ChartPaneInd.syncChartMountUI) ChartPaneInd.syncChartMountUI();
    return;
  }

  const plot = state.chartPlot;
  if (!plot) {
    titleEl.textContent = chartMountDisplayName("main");
    itemsEl.innerHTML = hintSubmit;
    updateSubPlotLegend(barIndex);
    if (typeof ChartPaneInd !== "undefined" && ChartPaneInd.syncChartMountUI) ChartPaneInd.syncChartMountUI();
    return;
  }
  const n = state.bars.length;
  let idx = n - 1;
  if (barIndex != null && barIndex >= 0 && barIndex < n) idx = barIndex;

  const renderItems = (outputs) =>
    (outputs || [])
      .map((o) => {
        const v = o.data[idx];
        const digits = o.digits ?? 2;
        let show = "—";
        if (v != null && Number.isFinite(v)) {
          show = digits === 0 ? String(Math.round(v)) : formatNum(v, digits);
        }
        const color = o.color || "#2f7de1";
        const showName = !o.hideTitle && (o.label || o.name);
        const nameHtml = showName
          ? `<span class="plot-legend-var">${escLegendText(showName)}</span>`
          : "";
        return `<span class="plot-legend-item" style="--series-color:${color}">${nameHtml}<b class="plot-legend-val">${show}</b></span>`;
      })
      .join("");

  titleEl.textContent = plotLegendFormulaLabel();

  if (plot.mainOutputs?.length) {
    itemsEl.innerHTML = renderItems(plot.mainOutputs);
  } else {
    itemsEl.innerHTML = "";
  }
  updateSubPlotLegend(barIndex);
  if (typeof ChartPaneInd !== "undefined" && ChartPaneInd.syncChartMountUI) ChartPaneInd.syncChartMountUI();
}

function updateSubPlotLegend(barIndex) {
  const subLegend = $("plot-sub-legend");
  const titleEl = $("plot-sub-legend-title");
  const itemsEl = $("plot-sub-legend-items");
  const plot = state.chartPlot;
  if (!itemsEl) return;
  if (titleEl) titleEl.textContent = "";
  if (!paneHasChartMount("sub") || !plot?.subOutputs?.length) {
    itemsEl.innerHTML = "";
    if (typeof ChartPaneInd !== "undefined" && ChartPaneInd.syncChartMountUI) ChartPaneInd.syncChartMountUI();
    return;
  }
  const n = state.bars.length;
  let idx = n - 1;
  if (barIndex != null && barIndex >= 0 && barIndex < n) idx = barIndex;
  itemsEl.innerHTML = plot.subOutputs
    .map((o) => {
      const v = o.data[idx];
      const digits = o.digits ?? 2;
      let show = "—";
      if (v != null && Number.isFinite(v)) {
        show = digits === 0 ? String(Math.round(v)) : formatNum(v, digits);
      }
      const color = o.color || "#2f7de1";
      const showName = !o.hideTitle && (o.label || o.name);
      const nameHtml = showName
        ? `<span class="plot-legend-var">${escLegendText(showName)}</span>`
        : "";
      return `<span class="plot-legend-item" style="--series-color:${color}">${nameHtml}<b class="plot-legend-val">${show}</b></span>`;
    })
    .join("");
}

function updateOhlcStrip(b, idx) {
  const ohlc = $("chart-ohlc");
  const dd = $("chart-last-date");
  if (ohlc && b) {
    ohlc.innerHTML = `
      <span>开 <b>${formatNum(b.o, 2)}</b></span>
      <span>高 <b>${formatNum(b.h, 2)}</b></span>
      <span>低 <b>${formatNum(b.l, 2)}</b></span>
      <span>收 <b>${formatNum(b.c, 2)}</b></span>`;
  }
  if (dd && b) dd.textContent = `${formatDateLabel(b.t)} · #${idx + 1}`;
}

function sliceTdxDrawings(draws, start, count) {
  if (!draws?.length) return [];
  const sl = (arr) => (Array.isArray(arr) ? arr.slice(start, start + count) : arr);
  return draws.map((d) => ({
    ...d,
    cond: sl(d.cond),
    p: d.p ? sl(d.p) : undefined,
    p1: d.p1 ? sl(d.p1) : undefined,
    p2: d.p2 ? sl(d.p2) : undefined,
    num: d.num ? sl(d.num) : undefined,
    h: d.h ? sl(d.h) : undefined,
    o: d.o ? sl(d.o) : undefined,
    l: d.l ? sl(d.l) : undefined,
    c: d.c ? sl(d.c) : undefined,
  }));
}

function positionCrosshair(cx, cy) {
  const cross = $("chart-crosshair");
  if (!cross) return;
  cross.hidden = false;
  const v = cross.querySelector(".chart-crosshair-v");
  const h = cross.querySelector(".chart-crosshair-h");
  if (v) v.style.left = `${cx}px`;
  if (h) h.style.top = `${cy}px`;
}

function drawCandleChart() {
  const mainCv = /** @type {HTMLCanvasElement} */ ($("chart-canvas-main"));
  const subCv = /** @type {HTMLCanvasElement} */ ($("chart-canvas-sub"));
  const volCv = /** @type {HTMLCanvasElement} */ ($("chart-canvas-vol"));
  const timeCv = /** @type {HTMLCanvasElement} */ ($("chart-canvas-time"));
  const subBox = $("chart-sub-box");
  const volBox = $("chart-vol-box");
  const placeholder = $("chart-placeholder");
  const cross = $("chart-crosshair");
  if (!mainCv || !volCv || !state.dataLoaded || !state.bars.length || typeof MaiChart === "undefined") {
    if (placeholder) placeholder.classList.remove("hidden");
    setChartPlaceholderLoading(!!state.marketLoadInFlight);
    if (cross) cross.hidden = true;
    hideCrosshairAxisLabels();
    if (timeCv && typeof MaiChart !== "undefined") MaiChart.renderTimeAxis(timeCv, 0, [], { padR: 56 });
    updatePlotLegend(null);
    return;
  }
  if (placeholder) placeholder.classList.add("hidden");
  clampChartView();

  const stage = $("chart-stage") || mainCv.parentElement;
  const bars = state.bars;
  const count = state.chartView.count;
  const start = state.chartView.start;
  const slice = bars.slice(start, start + count);
  const K = MaiChart.barsToK(slice);

  const plot = state.chartPlot;
  const lineSeries = (plot?.mainLineSeries || []).map((s) => ({
    name: s.name,
    data: s.data.slice(start, start + count),
    style: s.style,
  }));
  const overlaySeries = (plot?.mainOverlaySeries || []).map((s) => ({
    name: s.name,
    data: s.data.slice(start, start + count),
    style: s.style,
  }));

  const showSub =
    paneHasChartMount("sub") &&
    ((plot?.subLineSeries?.length || 0) > 0 || (plot?.subDrawings?.length || 0) > 0);
  const showVol = !showSub;
  if (subBox) subBox.hidden = !showSub;
  if (volBox) volBox.hidden = !showVol;
  syncChartLowerHead(showSub);
  chartPaneLayout = measureChartPaneHeights({ showSub, showVol });
  const { mainH, volH, subH, volHeadH, subHeadH } = chartPaneLayout;
  const mainPane = mainCv.parentElement;
  if (mainPane?.classList.contains("chart-main-pane")) {
    mainPane.style.height = `${mainH}px`;
    mainPane.style.minHeight = `${mainH}px`;
    mainPane.style.maxHeight = `${mainH}px`;
    mainPane.style.flex = "0 0 auto";
  }

  const overlayMode = plot?.scaleMode === "overlay";
  const mainDraws =
    showSub || overlayMode ? [] : sliceTdxDrawings(plot?.mainDrawings, start, count);
  const overlayDraws = overlayMode
    ? sliceTdxDrawings(plot?.overlayDrawings, start, count)
    : [];
  const mainMeta = MaiChart.renderPane(mainCv, mainH, count, K, {
    candles: true,
    series: lineSeries,
    overlaySeries: overlayMode ? overlaySeries : [],
    overlayDraws,
    draws: mainDraws.concat(sliceTdxDrawings(plot?.tradeDrawings, start, count)),
    bg: "#ffffff",
  });

  if (showSub && subCv && subBox) {
    subBox.style.height = `${subH + (subHeadH || 0)}px`;
    subCv.style.height = `${subH}px`;
    const subSeries = (plot.subLineSeries || []).map((s) => ({
      name: s.name,
      data: s.data.slice(start, start + count),
      style: s.style,
    }));
    const subDraws = sliceTdxDrawings(plot?.subDrawings, start, count);
    MaiChart.renderPane(subCv, subH, count, K, {
      zero: true,
      series: subSeries,
      draws: subDraws,
      bg: "#f6f8fb",
    });
  }

  if (showVol) {
    const volBoxEl = $("chart-vol-box");
    if (volBoxEl) {
      volBoxEl.style.height = `${volH + (volHeadH || 0)}px`;
    }
    volCv.style.height = `${volH}px`;
    MaiChart.renderPane(volCv, volH, count, K, {
      zero: true,
      bg: "#f3f6f9",
      series: [{ name: "VOLUME", data: K.V, style: { color: "#e53935", kind: "VOLSTICK" } }],
    });
  }

  const plotW = mainMeta.plotW;
  const step = mainMeta.step;
  mainCv.__layout = { W: mainMeta.w, plotW, step, count, start };
  if (timeCv) {
    MaiChart.renderTimeAxis(timeCv, count, slice, { padR: mainMeta.padR });
  }

  const hover = state.chartView.hoverIndex;
  if (hover != null && hover >= start && hover < start + count) {
    const b = bars[hover];
    const local = hover - start;
    const cx = local * step + step / 2;
    const ctx = mainCv.getContext("2d");
    const dpr = 2;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = "rgba(47,125,225,0.35)";
    ctx.beginPath();
    ctx.moveTo(cx, mainMeta.top);
    ctx.lineTo(cx, chartPaneLayout.mainH - mainMeta.bottom);
    ctx.stroke();
    ctx.restore();

    if (showSub && subCv) {
      const subCtx = subCv.getContext("2d");
      subCtx.save();
      subCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      subCtx.strokeStyle = "rgba(47,125,225,0.35)";
      subCtx.beginPath();
      subCtx.moveTo(cx, 10);
      subCtx.lineTo(cx, chartPaneLayout.subH - 14);
      subCtx.stroke();
      subCtx.restore();
    }
    if (showVol) {
      const volCtx = volCv.getContext("2d");
      volCtx.save();
      volCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      volCtx.strokeStyle = "rgba(47,125,225,0.35)";
      volCtx.beginPath();
      volCtx.moveTo(cx, 10);
      volCtx.lineTo(cx, chartPaneLayout.volH - 14);
      volCtx.stroke();
      volCtx.restore();
    }

    updateOhlcStrip(b, hover);
    const mainTop = mainCv.offsetTop;
    const closeY = mainMeta.y(b.c);
    positionCrosshair(cx, mainTop + closeY);
    updateCrosshairAxisLabels(cx, closeY, b, mainMeta);
    updatePlotLegend(hover);
  } else {
    updateOhlcStrip(bars[bars.length - 1], bars.length - 1);
    if (cross) cross.hidden = true;
    hideCrosshairAxisLabels();
    updatePlotLegend(bars.length - 1);
  }

}

function bindChartInteraction() {
  const stage = $("chart-stage");
  const mainCv = /** @type {HTMLCanvasElement} */ ($("chart-canvas-main"));
  if (!stage || !mainCv || stage.dataset.bound) return;
  stage.dataset.bound = "1";

  const onMove = (clientX) => {
    const layout = mainCv.__layout;
    if (!layout || !state.dataLoaded) return;
    const rect = mainCv.getBoundingClientRect();
    const x = clientX - rect.left;
    const idx = chartIndexAtX(x, layout);
    if (idx == null) {
      state.chartView.hoverIndex = null;
      drawCandleChart();
      return;
    }
    state.chartView.hoverIndex = idx;
    drawCandleChart();
  };

  stage.addEventListener("mousemove", (e) => {
    if (state.chartView.drag) return;
    onMove(e.clientX);
  });
  stage.addEventListener("mouseleave", () => {
    state.chartView.hoverIndex = null;
    drawCandleChart();
  });
  stage.addEventListener(
    "wheel",
    (e) => {
      if (!state.dataLoaded) return;
      e.preventDefault();
      applyChartZoom(e.deltaY, e.clientX);
      drawCandleChart();
    },
    { passive: false }
  );

  stage.addEventListener("mousedown", (e) => {
    if (!state.dataLoaded) return;
    state.chartView.drag = { x0: e.clientX, start0: state.chartView.start };
    stage.classList.add("chart-pan-active");
  });
  const endPan = () => {
    state.chartView.drag = null;
    stage.classList.remove("chart-pan-active");
  };
  window.addEventListener("mouseup", endPan);
  window.addEventListener("blur", endPan);
  window.addEventListener("mousemove", (e) => {
    const d = state.chartView.drag;
    if (!d || !mainCv.__layout) return;
    const layout = mainCv.__layout;
    const dx = e.clientX - d.x0;
    const barsPerPx = layout.count / layout.plotW;
    state.chartView.start = d.start0 + Math.round(-dx * barsPerPx);
    clampChartView();
    drawCandleChart();
  });
}

function getChartMAPeriod() {
  const kind = /** @type {HTMLSelectElement} */ ($("select-formula-kind")).value;
  const tpl = /** @type {HTMLSelectElement} */ ($("select-formula-template")).value;
  if (kind === "builtin" && tpl === "MA") {
    const rows = getParamModel();
    const m3 = rows.find((r) => r.key === "M3");
    return Math.max(2, Math.round(m3?.value ?? 20));
  }
  const src = getFormulaSource();
  const p = parseParamsFromSource(src);
  if (p.N) return Math.max(2, Math.round(p.N));
  const m = src.match(/MA\s*\(\s*CLOSE\s*,\s*(\d+)\s*\)/i);
  if (m) return Math.max(2, parseInt(m[1], 10));
  return 20;
}

function applyLoadedMarketBars(sym, start, end, bars, opts) {
  state.bars = bars;
  state.rngSeed =
    parseInt(
      hashString(`${sym}|${start}|${end}|${state.chartAdj}|${state.chartPeriod}|${getMarketDataScope()}`).slice(0, 8),
      16
    ) >>> 0;
  state.dataLoaded = true;
  resetChartViewRange();
  const startEl = /** @type {HTMLInputElement} */ ($("input-date-start"));
  const endEl = /** @type {HTMLInputElement} */ ($("input-date-end"));
  const scopeUi = getMarketDataScope();
  if (isChartPeriodDailyOrHigher() && scopeUi !== "range") {
    if (startEl) startEl.value = formatDateValue(state.bars[0].t);
    if (endEl) endEl.value = formatDateValue(state.bars[state.bars.length - 1].t);
  }
  state.marketLoadInFlight = false;
  if ($("chart-loading")) $("chart-loading").hidden = true;
  setChartPlaceholderLoading(false);
  syncChartSymbolHeading(sym);
  syncMarketStreamIndicator();
  reconcileChartPlotAfterMarketChange();
  drawCandleChart();
  if (!opts.skipRedrawFrame) requestAnimationFrame(() => drawCandleChart());
  updateResearchBlockedHint();
  return true;
}

function loadMarket(opts = {}) {
  const sym = getMarketSymbolCode();
  const period = state.chartPeriod || "day";
  const effective = resolveEffectiveMarketScope(period);
  const range = computeLoadRange(sym, period, effective);
  if (!range) {
    state.marketLoadInFlight = false;
    setChartPlaceholderLoading(false);
    if (!opts.quiet) toast("日期范围无效", "warn");
    return false;
  }
  const { start, end, dailyScope } = range;

  const finishLocal = () => {
    const { bars, real, mixed } = resolveMarketBars(sym, start, end, dailyScope);
    state.marketBarsMixed = !!mixed;
    state.marketBarsReal = !!real;
    if (!bars.length) {
      state.marketLoadInFlight = false;
      if ($("chart-loading")) $("chart-loading").hidden = true;
      state.dataLoaded = false;
      setChartPlaceholderLoading(false);
      if (!opts.quiet) toast("所选日期区间内无 K 线", "warn");
      return false;
    }
    return applyLoadedMarketBars(sym, start, end, bars, opts);
  };

  const run = async () => {
    state.marketLoadInFlight = true;
    setChartPlaceholderLoading(true);
    if (effective.scopeIgnored && !opts.quiet) {
      toast("上市以来、指定区间仅对日线及以上周期生效；当前仍按默认 500 根加载", "warn");
    }

    let apiFailed = false;
    if (!opts.sync && typeof QuoteKlineApi !== "undefined") {
      const chartCtx = {
        sym,
        chartPeriod: state.chartPeriod,
        chartAdj: state.chartAdj,
        startMs: start,
        endMs: end,
        dailyScope,
      };
      const applyApiBars = (bars) => {
        state.marketBarsMixed = false;
        state.marketBarsReal = true;
        applyLoadedMarketBars(sym, start, end, bars, opts);
        return true;
      };
      try {
        const cached = QuoteKlineApi.fetchForChartFromCache?.(chartCtx);
        if (cached?.bars?.length) return applyApiBars(cached.bars);

        const r = await QuoteKlineApi.fetchForChart(chartCtx);
        if (r?.bars?.length) return applyApiBars(r.bars);
        if (r?.error && r.error !== "UNSUPPORTED_SYMBOL") {
          apiFailed = true;
          console.warn("[QuoteKlineApi] 接口未返回可用 K 线:", r.error, { sym, split: QuoteKlineApi.splitForChartAdj(state.chartAdj) });
        }
      } catch (e) {
        apiFailed = true;
        console.warn("[QuoteKlineApi] 请求失败:", e?.message || e, { sym });
      }
    }

    const ok = finishLocal();
    if (apiFailed && ok) toast("行情接口获取失败，已使用本地行情数据", "warn");
    return ok;
  };

  if (opts.sync) return finishLocal();
  const loadingEl = $("chart-loading");
  if (loadingEl) loadingEl.hidden = false;
  requestAnimationFrame(() => {
    run();
  });
  return true;
}

/**
 * @param {{ forceTemplate?: string, blank?: boolean }} [opts]
 */
function applyFormulaTemplate(opts = {}) {
  if (opts.forceTemplate) {
    const kindEl = /** @type {HTMLSelectElement} */ ($("select-formula-kind"));
    if (kindEl) kindEl.value = "custom";
  }
  syncFormulaTemplateSelect(opts.forceTemplate);
  const kind = /** @type {HTMLSelectElement} */ ($("select-formula-kind")).value;
  const tpl = /** @type {HTMLSelectElement} */ ($("select-formula-template")).value;
  const ta = /** @type {HTMLTextAreaElement} */ ($("textarea-formula"));
  state.paramRangeCache = {};
  state.formulaKind = kind;
  state.formulaTemplate = tpl;

  setFormulaEditorMode(kind);
  syncFormulaDialectUI();

  if (kind === "builtin") {
    const ind = typeof SysInd !== "undefined" ? SysInd.getByName(tpl) : null;
    if (ind) {
      $("builtin-title").textContent = ind.name;
      $("builtin-desc").innerHTML = `${ind.note}<br /><span class="muted">${ind.wizard}</span><br />系统公式只读；参数当前值在下方「策略回测 › 公式参数」中调整。`;
      $("builtin-params-tag").textContent = `${ind.params.length} 个声明参数`;
    }
  } else {
    const dialect = getFormulaDialect();
    if (opts.blank) ta.value = "";
    else if (tpl === "ma") ta.value = dialect === "tdx" ? TEMPLATES.tdx_ma : TEMPLATES.ma;
    else if (tpl === "empty") ta.value = dialect === "tdx" ? TEMPLATES.tdx_empty : TEMPLATES.empty;
    else if (tpl === "boll_mai" || tpl === "macd") ta.value = dialect === "tdx" ? TEMPLATES.tdx_boll : TEMPLATES.research_demo;
    lastMaiCheck = null;
    paintEditor();
    requestAnimationFrame(() => ta?.focus());
  }
  state.validated = false;
  invalidateChartSubmission();
  resetSyntaxCheckIdle();
  renderParameterTable();
  updateResearchBlockedHint();
  syncWorkspaceMeta();
  syncWorkspaceDirty();
}

/** 无本地草稿时的首屏：内置 MA（与图表默认均线一致），非自定义示例源码 */
function applyDefaultFormulaWorkspace() {
  const kindEl = /** @type {HTMLSelectElement} */ ($("select-formula-kind"));
  if (kindEl) kindEl.value = "builtin";
  syncFormulaTemplateSelect("MA");
  const tplEl = /** @type {HTMLSelectElement} */ ($("select-formula-template"));
  if (tplEl && [...tplEl.options].some((o) => o.value === "MA")) tplEl.value = "MA";
  if (typeof SysInd !== "undefined") {
    const ind = SysInd.getByName("MA");
    const params = {};
    (ind?.params || []).forEach((p) => {
      params[p.n] = p.def;
    });
    state.indicatorBindings = {
      name: "MA",
      params,
      outputs: SysInd.defaultImportBindings("MA"),
    };
  }
  applyFormulaTemplate();
  if (state.indicatorBindings?.params) applyParameterValues(state.indicatorBindings.params);
}

function syncLineNumbers() {
  paintEditor();
}

// ---------------------------------------------------------------------------
// 研究工作台：策略回测 → 参数优化（确认 → 运行）→ 优化结果（列表 / 候选详情）→ 研究历史
// ---------------------------------------------------------------------------

const OBJECTIVE_LABEL = { sharpe: "夏普比率", annual_return: "年化收益率", calmar: "卡玛比率" };
const ALGO_LABEL = { grid: "网格搜索", single: "单次回测", genetic: "遗传算法" };
const ENGINE_LABEL = { vectorbt: "VectorBT", legacy: "传统引擎" };
const RUN_STATUS = {
  running: ["运行中", "neutral"],
  completed: ["已完成", "teal"],
  cancelled: ["已取消", "neutral"],
  failed: ["失败", "danger"],
};
/** 原型的网格评估预算；正式环境由服务端估算返回 */
const GRID_BUDGET = 300;
const RESULTS_PAGE_SIZE = 20;
const HISTORY_CANDIDATE_LIMIT = 100;
const BARS_PER_YEAR = {
  "1m": 244 * 240,
  "5m": 244 * 48,
  "10m": 244 * 24,
  "30m": 244 * 8,
  "1h": 244 * 4,
  day: 244,
  week: 52,
  month: 12,
  year: 1,
};
const PERCENT_RISK_FIELDS = new Set([
  "fixedStop.pct",
  "fixedTake.pct",
  "trailStop.pct",
  "trailTake.activate",
  "trailTake.callback",
  "breakeven.trigger",
  "breakeven.offset",
  "timeStop.minRet",
]);
const RISK_RULE_LABEL = {
  fixedStop: "固定止损",
  fixedTake: "固定止盈",
  trailStop: "移动止损",
  trailTake: "移动止盈",
  breakeven: "保本止损",
  timeStop: "时间止损",
};
const RISK_RULES = Object.keys(RISK_RULE_LABEL);

const fmtPct = (v, d = 2) => (v == null || !Number.isFinite(v) ? "—" : `${(v * 100).toFixed(d)}%`);
const fmtFix = (v, d = 2) => (v == null || !Number.isFinite(v) ? "—" : Number(v).toFixed(d));
const escHtml = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const paramsHtml = (params) =>
  Object.entries(params || {})
    .map(([k, v]) => `<span>${escHtml(k)}=<b>${v}</b></span>`)
    .join("") || "无参数";

function getInstrumentRules(code) {
  const sym = code || getMarketSymbolCode();
  const meta = (typeof SymbolSearch !== "undefined" && SymbolSearch.lookupByCode?.(sym)) || {};
  return ResearchEngine.classify(sym, meta.name || "", meta);
}

function stripFormulaComments(src) {
  return String(src || "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{[^}]*\}/g, "");
}

function hasSignalAssign(src, name) {
  if (getFormulaDialect() === "tdx") return new RegExp(`(^|[;\\s,(])${name}\\s*\\(`, "i").test(src);
  return new RegExp(`(^|[;\\s])${name}\\s*:=`, "i").test(src);
}

/** 只有调用了 BUY(条件,位置) 和 SELL(条件,位置) 的公式才需要回测与参数优化 */
function getResearchCapability() {
  if (!isCustomFormulaMode()) {
    return {
      researchable: false,
      title: "系统指标 · 仅绘图",
      desc: "系统内置指标不含 BUY / SELL 交易信号，无需回测。可调整参数当前值，取值范围由系统定义。",
    };
  }
  const src = stripFormulaComments(getFormulaSource());
  const missing = ["BUY", "SELL"].filter((t) => !hasSignalAssign(src, t));
  if (missing.length) {
    return {
      researchable: false,
      title: "纯绘图公式 · 无需回测",
      desc: `未使用 ${missing.join(" 和 ")} 函数（例：BUY(CROSS(快线,慢线),LOW); SELL(CROSS(慢线,快线),HIGH);），公式仅用于绘图。保存前请设置参数的取值范围与步长：公式下发到各端后，用户只能在此范围内调整参数。`,
    };
  }
  return {
    researchable: true,
    title: "交易策略 · 已识别 BUY 和 SELL",
    desc: "BUY 按「持仓上限」开仓（默认 100% 即全仓），SELL 全部平仓；信号按先买后卖、一买一卖自动配对。先用当前参数回测，结果满意即可提交发布，不满意再到「参数优化」扫描参数。",
  };
}

function currentDatasetId() {
  if (!state.dataLoaded || !state.bars.length) return null;
  const b = state.bars;
  const key = `${getMarketSymbolCode()}|${state.chartPeriod}|${state.chartAdj}|${b.length}|${b[0].t}|${b[b.length - 1].t}|${b[0].c}|${b[b.length - 1].c}`;
  return hashString(key) + hashString(`${key}#`);
}

function marketSnapshot() {
  const b = state.bars;
  const sym = getMarketSymbolCode();
  return {
    symbol: sym,
    name: getMarketSymbolName(),
    period: state.chartPeriod,
    adj: state.chartAdj,
    scope: getMarketDataScope(),
    dateStart: /** @type {HTMLInputElement} */ ($("input-date-start")).value,
    dateEnd: /** @type {HTMLInputElement} */ ($("input-date-end")).value,
    barCount: b.length,
    first: b.length ? formatDateLabel(b[0].t) : "—",
    last: b.length ? formatDateLabel(b[b.length - 1].t) : "—",
    real: isSz000001Symbol(sym) && !state.marketBarsMixed,
    datasetId: currentDatasetId(),
  };
}

function marketLabel(m) {
  return `${m.symbol} ${m.name || ""} · ${CHART_PERIOD_LABEL[m.period] || m.period} · ${CHART_ADJ_LABEL[m.adj] || m.adj}`;
}

// ---------- 表单读写 ----------

function readRisk() {
  const risk = {
    enabled: /** @type {HTMLInputElement} */ ($("research-risk")).checked,
    trigger: /** @type {HTMLSelectElement} */ ($("risk-trigger")).value,
  };
  document.querySelectorAll("[data-risk-on]").forEach((cb) => {
    risk[cb.getAttribute("data-risk-on")] = { on: /** @type {HTMLInputElement} */ (cb).checked };
  });
  document.querySelectorAll("[data-risk]").forEach((el) => {
    const path = el.getAttribute("data-risk");
    const [rule, field] = path.split(".");
    const isSelect = el.tagName === "SELECT";
    const raw = isSelect ? /** @type {HTMLSelectElement} */ (el).value : parseFloat(/** @type {HTMLInputElement} */ (el).value);
    risk[rule] = risk[rule] || { on: false };
    risk[rule][field] = !isSelect && PERCENT_RISK_FIELDS.has(path) ? raw / 100 : raw;
  });
  return risk;
}

/** 「策略回测」中的回测条件；参数优化沿用同一套条件 */
function readBacktestConditions() {
  const num = (id) => parseFloat(/** @type {HTMLInputElement} */ ($(id)).value);
  return {
    execution: {
      capital: num("exec-capital"),
      positionPct: num("exec-position") / 100,
      commission: num("exec-commission") / 100,
      minCommission: num("exec-min-commission"),
      slippage: num("exec-slippage") / 100,
      fillMode: /** @type {HTMLSelectElement} */ ($("exec-fill-mode")).value,
    },
    rules: { ...getInstrumentRules(), limitRule: /** @type {HTMLInputElement} */ ($("rules-limit")).checked },
    risk: readRisk(),
  };
}

/** 研究请求中的参数：min / max / step 为扫描区间，allowed 为公式允许范围 */
function researchParams() {
  return getParamModel().map((m) => ({
    key: m.key,
    type: m.type,
    value: m.value,
    opt: !!m.opt,
    min: m.smin,
    max: m.smax,
    step: m.sstep,
    allowed: { min: m.min, max: m.max, step: m.step },
  }));
}

function readResearchForm() {
  const num = (id) => parseFloat(/** @type {HTMLInputElement} */ ($(id)).value);
  return {
    engine: /** @type {HTMLSelectElement} */ ($("research-engine")).value,
    algorithm: /** @type {HTMLSelectElement} */ ($("research-algorithm")).value,
    objective: /** @type {HTMLSelectElement} */ ($("research-objective")).value,
    trainRatio: Number(/** @type {HTMLSelectElement} */ ($("research-train-ratio")).value),
    minTrades: num("research-min-trades"),
    maxDD: num("research-max-dd") / 100,
    ga: { population: num("ga-population"), generations: num("ga-generations"), seed: num("ga-seed") },
    params: researchParams(),
    constraints: collectConstraints(),
    ...readBacktestConditions(),
  };
}

function writeResearchForm(cfg) {
  const set = (id, v) => {
    const el = /** @type {HTMLInputElement} */ ($(id));
    if (el && v != null && !(typeof v === "number" && !Number.isFinite(v))) el.value = String(v);
  };
  const pct = (v) => (v == null ? v : +(v * 100).toFixed(6));
  set("research-engine", cfg.engine);
  set("research-algorithm", cfg.algorithm === "single" ? "grid" : cfg.algorithm);
  set("research-objective", cfg.objective);
  set("research-train-ratio", cfg.trainRatio);
  set("research-min-trades", cfg.minTrades);
  set("research-max-dd", pct(cfg.maxDD));
  set("ga-population", cfg.ga?.population);
  set("ga-generations", cfg.ga?.generations);
  set("ga-seed", cfg.ga?.seed);
  const ex = cfg.execution || {};
  set("exec-capital", ex.capital);
  set("exec-position", pct(ex.positionPct));
  set("exec-commission", pct(ex.commission));
  set("exec-min-commission", ex.minCommission);
  set("exec-slippage", pct(ex.slippage));
  set("exec-fill-mode", ex.fillMode);
  if (cfg.rules) /** @type {HTMLInputElement} */ ($("rules-limit")).checked = cfg.rules.limitRule !== false;
  const risk = cfg.risk || {};
  /** @type {HTMLInputElement} */ ($("research-risk")).checked = !!risk.enabled;
  set("risk-trigger", risk.trigger);
  document.querySelectorAll("[data-risk-on]").forEach((cb) => {
    const r = risk[cb.getAttribute("data-risk-on")];
    if (r) /** @type {HTMLInputElement} */ (cb).checked = !!r.on;
  });
  document.querySelectorAll("[data-risk]").forEach((el) => {
    const path = el.getAttribute("data-risk");
    const [rule, field] = path.split(".");
    const v = risk[rule]?.[field];
    if (v == null) return;
    /** @type {HTMLInputElement} */ (el).value = String(PERCENT_RISK_FIELDS.has(path) ? pct(v) : v);
  });

  syncParamModel();
  (cfg.params || []).forEach((p) => {
    const m = state.paramRangeCache[p.key];
    if (!m) return;
    Object.assign(m, { value: p.value, opt: cfg.algorithm !== "single" && !!p.opt, smin: p.min, smax: p.max, sstep: p.step });
    if (p.allowed && isCustomFormulaMode()) Object.assign(m, { min: p.allowed.min, max: p.allowed.max, step: p.allowed.step });
  });
  renderParameterTable();
  $("constraints-list").innerHTML = "";
  (cfg.constraints || []).forEach((c) => addConstraintRow(c));
  renderConstraints();
}

// ---------- 校验 ----------

/** 公式参数：当前值与允许范围（纯绘图公式同样需要） */
function validateParamModel(list) {
  const errs = [];
  const builtin = !isCustomFormulaMode();
  list.forEach((m) => {
    const isInt = m.type === "INT";
    const intOk = (v) => !isInt || Number.isInteger(v);
    const kind = isInt ? "整数" : "数字";
    if (!isNum(m.value) || !intOk(m.value)) {
      errs.push(`${m.key} 当前值需要是有效${kind}`);
      return;
    }
    if (!builtin) {
      if (![m.min, m.max, m.step].every(isNum) || ![m.min, m.max, m.step].every(intOk)) {
        errs.push(`${m.key} 的最小值、最大值、步长需要是有效${kind}`);
        return;
      }
      if (m.min > m.max) {
        errs.push(`${m.key} 最小值不能大于最大值`);
        return;
      }
      if (m.step <= 0) {
        errs.push(`${m.key} 步长必须大于 0`);
        return;
      }
      if (m.max > m.min && m.step > m.max - m.min) errs.push(`${m.key} 步长不能大于取值范围（${m.max - m.min}）`);
    }
    if (isNum(m.min) && isNum(m.max) && (m.value < m.min || m.value > m.max)) {
      errs.push(`${m.key} 当前值 ${m.value} 超出允许范围 ${m.min} ~ ${m.max}`);
    }
  });
  return errs;
}

/** 回测条件：资金、成本与风控 */
function validateConditions(c) {
  const errs = [];
  const ex = c.execution;
  if (!isNum(ex.capital) || ex.capital <= 0 || ex.capital > 1e12) errs.push("初始资金必须大于 0 且不超过 1 万亿元");
  if (!isNum(ex.positionPct) || ex.positionPct <= 0 || ex.positionPct > 1) errs.push("持仓上限必须大于 0% 且不超过 100%");
  if (!isNum(ex.commission) || ex.commission < 0 || ex.commission > 0.1) errs.push("佣金费率必须在 0% 至 10% 之间");
  if (!isNum(ex.minCommission) || ex.minCommission < 0) errs.push("最低佣金不能为负数");
  if (!isNum(ex.slippage) || ex.slippage < 0 || ex.slippage > 0.1) errs.push("滑点必须在 0% 至 10% 之间");
  const r = c.risk;
  if (r.enabled) {
    const pos = (v) => isNum(v) && v > 0;
    if (r.fixedStop.on && !(pos(r.fixedStop.pct) && r.fixedStop.pct < 1)) errs.push("固定止损比例必须大于 0% 且小于 100%");
    if (r.fixedTake.on && !(pos(r.fixedTake.pct) && r.fixedTake.pct <= 10)) errs.push("固定止盈比例必须大于 0% 且不超过 1000%");
    if (r.trailStop.on && !(pos(r.trailStop.pct) && r.trailStop.pct < 1)) errs.push("移动止损回落比例必须大于 0% 且小于 100%");
    if (r.trailTake.on && !(pos(r.trailTake.activate) && pos(r.trailTake.callback) && r.trailTake.callback < 1))
      errs.push("移动止盈的启动盈利与回落比例必须大于 0%");
    if (r.breakeven.on && !(pos(r.breakeven.trigger) && isNum(r.breakeven.offset) && r.breakeven.offset >= 0))
      errs.push("保本止损的触发盈利必须大于 0%，上移幅度不能为负");
    if (r.timeStop.on && !(Number.isInteger(r.timeStop.bars) && r.timeStop.bars >= 1 && isNum(r.timeStop.minRet)))
      errs.push("时间止损的持仓 K 线数必须是正整数");
    if (!RISK_RULES.some((k) => r[k]?.on)) errs.push("已启用风控，请至少勾选一条风控规则");
  }
  return errs;
}

/** 参数优化：扫描区间、算法与训练集筛选 */
function validateOptimization(cfg) {
  const errs = [];
  cfg.params.forEach((p) => {
    if (!p.opt) return;
    const isInt = p.type === "INT";
    const bad =
      ![p.min, p.max, p.step].every(isNum) || p.min > p.max || p.step <= 0 || (isInt && ![p.min, p.max, p.step].every(Number.isInteger));
    if (bad) {
      errs.push(`${p.key} 扫描区间无效，请检查扫描最小、最大与步长`);
      return;
    }
    const a = p.allowed;
    if (isNum(a.min) && isNum(a.max) && (p.min < a.min || p.max > a.max)) {
      errs.push(`${p.key} 扫描区间 ${p.min} ~ ${p.max} 超出公式允许范围 ${a.min} ~ ${a.max}`);
    }
  });
  if (cfg.engine === "vectorbt" && cfg.algorithm === "genetic") errs.push("VectorBT 不支持遗传算法");
  if (cfg.engine === "vectorbt" && cfg.risk.enabled) errs.push("回测条件启用了风控，VectorBT 不支持，请切换到传统引擎");
  if (cfg.algorithm === "genetic" && !cfg.params.some((p) => p.opt)) errs.push("遗传算法需要至少一个参与优化的参数");
  if (!Number.isInteger(cfg.minTrades) || cfg.minTrades < 0 || cfg.minTrades > 10000) errs.push("最少交易数必须是 0 至 10000 的整数");
  if (!isNum(cfg.maxDD) || cfg.maxDD <= 0 || cfg.maxDD > 1) errs.push("最大回撤上限必须大于 0% 且不超过 100%");
  if (cfg.algorithm === "genetic") {
    if (!Number.isInteger(cfg.ga.population) || cfg.ga.population < 4 || cfg.ga.population > 200) errs.push("种群大小必须是 4 至 200 的整数");
    if (!Number.isInteger(cfg.ga.generations) || cfg.ga.generations < 1 || cfg.ga.generations > 100) errs.push("迭代代数必须是 1 至 100 的整数");
    if (!Number.isInteger(cfg.ga.seed) || cfg.ga.seed < 0 || cfg.ga.seed > 2 ** 32 - 1) errs.push("随机种子必须是 0 至 4294967295 的整数");
  }
  const keys = new Set(cfg.params.map((p) => p.key));
  cfg.constraints.forEach((c) => {
    if (!keys.has(c.left) || !keys.has(c.right)) errs.push("约束必须选择有效参数");
    else if (c.left === c.right) errs.push(`约束 ${c.left} ${c.op} ${c.right} 两侧是同一参数`);
  });
  return [...new Set(errs)];
}

// ---------- 组合估算（随配置实时刷新） ----------

function buildSearchSpace(cfg) {
  const fixed = {};
  cfg.params.forEach((p) => {
    fixed[p.key] = p.value;
  });
  const axes =
    cfg.algorithm === "single"
      ? []
      : cfg.params.filter((p) => p.opt).map((p) => ({ key: p.key, values: ResearchEngine.rangeValues(p) }));
  return ResearchEngine.createSpace(axes, fixed, cfg.constraints);
}

function computeResearchEstimate(cfg) {
  const space = buildSearchSpace(cfg);
  if (!space.axes.length) {
    const ok = space.ok(space.decode(0));
    return { space, raw: 1, valid: ok ? 1 : 0, evaluate: ok ? 1 : 0, approx: false };
  }
  const est = ResearchEngine.estimate(space, cfg.ga.seed || 1);
  let evaluate = est.valid;
  if (cfg.algorithm === "grid") evaluate = Math.min(est.valid, GRID_BUDGET);
  if (cfg.algorithm === "genetic") evaluate = Math.min(est.valid, cfg.ga.population * cfg.ga.generations);
  return { space, ...est, evaluate };
}

/** 用当前公式在当前行情上实测一次「求信号 + 回测」的耗时，作为单组评估成本 */
const evalCostCache = { key: null, ms: null };
function measureEvalCostMs() {
  if (!state.dataLoaded || !state.bars.length) return null;
  const src = getFormulaSource();
  const key = `${hashString(normalizeFormulaSource(src))}|${currentDatasetId()}`;
  if (evalCostCache.key === key) return evalCostCache.ms;
  const t0 = performance.now();
  try {
    const sig = computeSignals({ dialect: getFormulaDialect(), source: src }, state.bars, uiParamsForPlot());
    ResearchEngine.backtest(state.bars, sig, { ...readBacktestConditions(), barsPerYear: 244, intraday: false }, { start: 0, end: state.bars.length });
  } catch {
    return null;
  }
  evalCostCache.key = key;
  evalCostCache.ms = Math.max(0.3, performance.now() - t0);
  return evalCostCache.ms;
}

function fmtDuration(ms) {
  if (!isNum(ms)) return "—";
  if (ms < 1000) return "不到 1 秒";
  if (ms < 60000) return `约 ${Math.ceil(ms / 1000)} 秒`;
  return `约 ${(ms / 60000).toFixed(1)} 分钟`;
}

function estimateView(cfg, est) {
  const n = (v) => Number(v).toLocaleString("zh-CN");
  if (!est) return { level: "idle", count: "—", time: "—", head: "组合规模待估算", detail: "修正上方提示的问题后自动估算" };
  const cost = measureEvalCostMs();
  const timeMs = cost == null ? null : est.evaluate * cost * 2;
  const time = fmtDuration(timeMs);
  let level = timeMs != null && timeMs > 300000 ? "danger" : timeMs != null && timeMs > 60000 ? "warn" : "ok";
  if (!est.space.axes.length) {
    return {
      level: est.valid ? "ok" : "danger",
      count: String(est.evaluate),
      time,
      head: est.valid ? "未勾选参与优化的参数" : "当前值不满足参数约束",
      detail: est.valid ? "只评估当前值一组，相当于一次带训练 / 测试划分的回测" : "请调整当前值或参数约束",
    };
  }
  const removed = est.raw - est.valid;
  const head = `${est.approx ? "约 " : ""}${n(est.valid)} 个有效组合`;
  let detail = `扫描 ${est.space.axes.map((a) => `${a.key} ${a.values.length} 个取值`).join(" × ")} = ${n(est.raw)}${removed > 0 ? `，约束剔除 ${n(removed)}` : ""}`;
  if (cfg.algorithm === "grid") {
    if (est.valid > GRID_BUDGET) {
      level = level === "danger" ? "danger" : "warn";
      detail += `；超出评估预算，将均匀抽样 ${n(GRID_BUDGET)} 组。缩小扫描区间或增大步长可完整遍历`;
    } else detail += "；全部评估";
  } else if (cfg.algorithm === "genetic") {
    detail += `；种群 ${cfg.ga.population} × ${cfg.ga.generations} 代，最多评估 ${n(est.evaluate)} 组`;
  }
  if (!est.valid) level = "danger";
  return { level, count: n(est.evaluate), time, head, detail };
}

function renderEstimate(cfg, est) {
  const v = estimateView(cfg, est);
  $("estimate-box").dataset.level = v.level;
  $("estimate-count").textContent = v.count;
  $("estimate-time").textContent = v.time;
  $("estimate-line1").textContent = v.head;
  $("estimate-line2").textContent = v.detail;
}

// ---------- 界面同步 ----------

function syncInstrumentRulesUI(rules) {
  $("rules-instrument-tag").textContent = rules.tradable ? `${rules.kindLabel} · ${rules.boardLabel}` : "指数 · 不可交易";
  const rows = rules.tradable
    ? [
        ["交易方向", "仅做多（A 股与 ETF 不支持融券做空）"],
        ["交易制度", rules.tPlus === 0 ? "T+0（当日买入可当日卖出）" : "T+1（当日买入次日可卖）"],
        ["最小交易单位", `${rules.lot} ${rules.lotUnit}（整手买入）`],
        ["涨跌幅限制", rules.limitPct ? `±${Math.round(rules.limitPct * 100)}%` : "无"],
        ["价格精度", rules.tick < 0.01 ? "0.001 元" : "0.01 元"],
        ["税费", rules.stampDuty ? "卖出印花税 0.05%，双向过户费 0.001%" : "免印花税、免过户费"],
      ]
    : [["说明", "指数不可直接交易，请选择个股或 ETF 进行回测"]];
  $("rules-grid").innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
  /** @type {HTMLInputElement} */ ($("exec-stamp")).value = String(+(rules.stampDuty * 100).toFixed(4));
  /** @type {HTMLInputElement} */ ($("exec-transfer")).value = String(+(rules.transferFee * 100).toFixed(4));
  $("fee-hint").textContent = rules.kind === "etf" ? "ETF 免征印花税与过户费" : "印花税、过户费按交易所标准自动计入";
}

function syncParameterRowsUI(cfg) {
  document.querySelectorAll("#param-opt-tbody tr[data-param]").forEach((tr) => {
    const key = tr.getAttribute("data-param");
    const m = state.paramRangeCache[key];
    const p = cfg.params.find((x) => x.key === key);
    if (!m || !p) return;
    tr.querySelector('[data-cell="value"]').textContent = String(m.value);
    tr.querySelector('[data-cell="range"]').textContent = fmtParamRange(m);
    const on = !!m.opt;
    tr.querySelectorAll('[data-field="smin"], [data-field="smax"], [data-field="sstep"]').forEach((el) => {
      /** @type {HTMLInputElement} */ (el).disabled = !on;
    });
    const cnt = on ? ResearchEngine.rangeValues(p).length : 1;
    tr.querySelector('[data-cell="count"]').textContent = on ? (cnt ? String(cnt) : "无效") : "1";
    tr.classList.toggle("is-optimized", on);
  });
}

function syncRiskUI() {
  const on = /** @type {HTMLInputElement} */ ($("research-risk")).checked;
  $("risk-panel").classList.toggle("is-off", !on);
  /** @type {HTMLSelectElement} */ ($("risk-trigger")).disabled = !on;
  document.querySelectorAll(".risk-rule").forEach((box) => {
    const cb = /** @type {HTMLInputElement} */ (box.querySelector("[data-risk-on]"));
    cb.disabled = !on;
    const ruleOn = on && cb.checked;
    box.classList.toggle("is-active", ruleOn);
    box.querySelectorAll("[data-risk]").forEach((el) => {
      /** @type {HTMLInputElement} */ (el).disabled = !ruleOn;
    });
  });
}

function riskSummary(risk) {
  if (!risk.enabled) return "未启用";
  const parts = [];
  if (risk.fixedStop.on) parts.push(`固定止损 ${fmtPct(risk.fixedStop.pct, 1)}`);
  if (risk.fixedTake.on) parts.push(`固定止盈 ${fmtPct(risk.fixedTake.pct, 1)}`);
  if (risk.trailStop.on) parts.push(`移动止损 回落 ${fmtPct(risk.trailStop.pct, 1)}`);
  if (risk.trailTake.on) parts.push(`移动止盈 盈利 ${fmtPct(risk.trailTake.activate, 1)} 后回落 ${fmtPct(risk.trailTake.callback, 1)}`);
  if (risk.breakeven.on) parts.push(`保本止损 盈利 ${fmtPct(risk.breakeven.trigger, 1)} 后`);
  if (risk.timeStop.on) parts.push(`时间止损 ${risk.timeStop.bars} 根`);
  return `${risk.trigger === "intraday" ? "盘中触价" : "收盘触发、次根开盘执行"} · ${parts.join("；")}`;
}

function conditionRows(c) {
  const r = c.rules;
  const ex = c.execution;
  return [
    ["资金 / 持仓上限", `${formatNum(ex.capital, 2)} 元 / ${fmtPct(ex.positionPct, 0)}`],
    ["成本", `佣金 ${fmtPct(ex.commission, 3)}（最低 ${ex.minCommission} 元）· 印花税 ${fmtPct(r.stampDuty, 3)} · 过户费 ${fmtPct(r.transferFee, 4)} · 滑点 ${fmtPct(ex.slippage, 2)}`],
    ["成交规则", `${ex.fillMode === "close" ? "信号当根收盘价" : "信号次根开盘价"} · T+${r.tPlus} · ${r.lot} ${r.lotUnit}/手 · ${r.limitRule ? `涨跌停 ±${Math.round((r.limitPct || 0) * 100)}% 不成交` : "忽略涨跌停"}`],
    ["风控", riskSummary(c.risk)],
  ];
}

function showErrorList(id, errs) {
  const box = $(id);
  if (!box) return;
  box.hidden = !errs.length;
  box.innerHTML = errs.map((e) => `<li>${escHtml(e)}</li>`).join("");
}

function commonBlockedReason(rules) {
  if (state.running) return "参数优化任务运行中，请等待完成。";
  if (!rules.tradable) return "指数不可交易，请在「标的设置」中选择个股或 ETF。";
  if (!state.dataLoaded) return "请先读取行情。";
  if (state.diagnostics.some((d) => d.level === "error")) return "公式存在错误，请先修正。";
  if (!state.validated) return "请先「校验公式」并通过校验。";
  return "";
}

function backtestWarmup(n) {
  return computeWarmup({ params: researchParams().map((p) => ({ ...p, opt: false })), algorithm: "grid" }, n);
}

function backtestRangeText() {
  if (!state.dataLoaded || !state.bars.length) return "尚未读取行情";
  const n = state.bars.length;
  const w = backtestWarmup(n);
  return `${formatDateLabel(state.bars[w].t)} — ${formatDateLabel(state.bars[n - 1].t)} · 共 ${n} 根 K 线，前 ${w} 根用于指标预热、不买入`;
}

/** 回测结果对应的输入指纹：公式、参数当前值、回测条件与行情 */
function backtestInputKey() {
  const values = getParamModel().map((m) => [m.key, m.value]);
  return hashString(JSON.stringify([normalizeFormulaSource(getFormulaSource()), values, readBacktestConditions(), currentDatasetId()]));
}

/** 研究区的统一刷新入口（任何影响回测 / 优化的状态变化后调用） */
function updateResearchBlockedHint() {
  const panel = $("research-panel");
  if (!panel || typeof ResearchEngine === "undefined" || !$("param-def-tbody")) return;
  const cap = getResearchCapability();
  const box = $("research-capability");
  box.dataset.state = cap.researchable ? "ok" : "plot";
  $("research-capability-title").textContent = cap.title;
  $("research-capability-desc").textContent = cap.desc;
  panel.classList.toggle("is-plot-only", !cap.researchable);

  const rules = getInstrumentRules();
  syncInstrumentRulesUI(rules);
  $("research-dataset-line").textContent = state.dataLoaded
    ? `回测行情：${marketLabel(marketSnapshot())} · ${formatDateLabel(state.bars[0].t)} — ${formatDateLabel(state.bars[state.bars.length - 1].t)} · ${state.bars.length} 根 K 线（取自上方图表，切换标的、周期或复权会改变回测样本）`
    : "回测行情：尚未读取行情";

  // 策略回测
  const paramErrs = validateParamModel(getParamModel());
  showErrorList("param-def-errors", paramErrs);
  $("param-def-hint").textContent = !isCustomFormulaMode()
    ? "系统指标的取值范围由系统定义，只能调整当前值"
    : "当前值用于绘图与回测；取值范围随公式保存，下发到各端后用户只能在范围内调整";
  syncRiskUI();
  const cond = readBacktestConditions();
  const condErrs = cap.researchable ? validateConditions(cond) : [];
  showErrorList("backtest-errors", condErrs);
  const btReason = cap.researchable
    ? commonBlockedReason(rules) || (paramErrs.length || condErrs.length ? "请先修正上方参数或回测条件中的错误。" : "")
    : "";
  $("backtest-blocked-reason").textContent = btReason;
  /** @type {HTMLButtonElement} */ ($("btn-run-backtest")).disabled = !cap.researchable || !!btReason;
  $("backtest-range-line").textContent = backtestRangeText();
  $("plot-only-save-hint").textContent = paramErrs.length ? "参数取值范围有误，修正后再保存" : "公式与参数取值范围将一起保存";
  /** @type {HTMLButtonElement} */ ($("btn-plot-only-save")).disabled = !!paramErrs.length;
  syncBacktestStale();

  // 参数优化
  $("optimize-unavailable").hidden = cap.researchable;
  const cfg = readResearchForm();
  const genetic = /** @type {HTMLOptionElement} */ ($("research-algorithm").querySelector('option[value="genetic"]'));
  genetic.disabled = cfg.engine === "vectorbt";
  $("genetic-settings").hidden = cfg.algorithm !== "genetic";
  $("engine-note").textContent =
    cfg.engine === "vectorbt"
      ? "VectorBT：向量化批量评估，速度快；不支持风控规则与遗传算法。"
      : "传统引擎：逐笔撮合，支持风控规则与遗传算法；评估速度较慢。";
  syncParameterRowsUI(cfg);
  $("optimize-cond-summary").innerHTML = conditionRows(cfg)
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${escHtml(v)}</dd></div>`)
    .join("");
  $("risk-engine-notice").hidden = !(cfg.engine === "vectorbt" && cfg.risk.enabled);
  /** @type {HTMLFieldSetElement} */ ($("research-form")).disabled = state.running;

  const upstream = paramErrs.length || condErrs.length ? ["公式参数或回测条件有误，请先在「策略回测」中修正"] : [];
  const optErrs = cap.researchable ? [...upstream, ...validateOptimization(cfg)] : [];
  showErrorList("research-errors", optErrs);
  const est = cap.researchable && !optErrs.length ? computeResearchEstimate(cfg) : null;
  state.lastEstimate = est ? { raw: est.raw, valid: est.valid, evaluate: est.evaluate } : null;
  renderEstimate(cfg, est);

  let reason = "";
  if (cap.researchable) {
    reason = commonBlockedReason(rules) || (optErrs.length ? "请先修正上方提示的问题。" : "") || (!est || est.valid === 0 ? "没有满足参数约束的有效组合。" : "");
  }
  $("research-blocked-reason").textContent = reason;
  /** @type {HTMLButtonElement} */ ($("btn-start-research")).disabled = !cap.researchable || !!reason;
}

// ---------- 信号与回测 ----------

function proxySignals(bars, params) {
  const vals = Object.values(params)
    .filter((v) => Number.isFinite(v) && v >= 2)
    .sort((a, b) => a - b);
  const fast = Math.round(vals.length >= 2 ? vals[0] : 5);
  const slow = Math.round(vals.length >= 2 ? vals[vals.length - 1] : vals[0] || 20);
  const ma = (p) => {
    const out = new Array(bars.length).fill(null);
    let s = 0;
    for (let i = 0; i < bars.length; i++) {
      s += bars[i].c;
      if (i >= p) s -= bars[i - p].c;
      if (i >= p - 1) out[i] = s / p;
    }
    return out;
  };
  const a = vals.length >= 2 ? ma(fast) : bars.map((b) => b.c);
  const b = ma(Math.max(2, slow));
  const buy = new Array(bars.length).fill(0);
  const sell = new Array(bars.length).fill(0);
  for (let i = 1; i < bars.length; i++) {
    if ([a[i - 1], b[i - 1], a[i], b[i]].some((v) => v == null)) continue;
    if (a[i - 1] <= b[i - 1] && a[i] > b[i]) buy[i] = 1;
    if (a[i - 1] >= b[i - 1] && a[i] < b[i]) sell[i] = 1;
  }
  return { buy, sell, source: "proxy" };
}

/**
 * 用公式源码与参数计算 BUY / SELL。
 * 通达信：只认 BUY(条件,位置) / SELL(条件,位置)，并按开平配对过滤；求值失败时不产生信号（不做近似）。
 */
function computeSignals(formula, bars, params) {
  if (formula.dialect === "tdx") {
    const n = bars.length;
    const none = { buy: new Array(n).fill(0), sell: new Array(n).fill(0), source: "error", stats: null };
    if (!window.TdxFormulaRuntime?.tradeSignalsFromTdx || !window.TdxFormulaEngine?.parse) return none;
    const pv = {};
    Object.entries(params || {}).forEach(([k, v]) => {
      pv[k] = v;
      pv[k.toUpperCase()] = v;
    });
    try {
      const t = window.TdxFormulaRuntime.tradeSignalsFromTdx(bars, formula.source, window.TdxFormulaEngine.parse, pv, tdxBarsMeta());
      if (t && t.hasBuy && t.hasSell) return { buy: t.buy, sell: t.sell, source: "formula", stats: t.stats };
    } catch {
      /* 求值失败 */
    }
    return none;
  }
  if (typeof MaiPlot !== "undefined") {
    try {
      const p = MaiPlot.buildChartPlot(bars, { source: formula.source, kind: "custom", uiParams: params });
      const buy = p.signals?.BUY;
      const sell = p.signals?.SELL;
      if (Array.isArray(buy) && Array.isArray(sell)) {
        return { buy: buy.map((v) => (v ? 1 : 0)), sell: sell.map((v) => (v ? 1 : 0)), source: "formula" };
      }
    } catch {
      /* 回退近似信号 */
    }
  }
  return proxySignals(bars, params);
}

function backtestConfig(run) {
  const cfg = run.request.cfg;
  return {
    execution: cfg.execution,
    rules: cfg.rules,
    risk: { ...cfg.risk, enabled: cfg.risk.enabled && cfg.engine === "legacy" },
    barsPerYear: BARS_PER_YEAR[run.request.market.period] || 244,
    intraday: INTRADAY_CHART_PERIODS.has(run.request.market.period),
  };
}

function evaluateSegments(run, bars, params) {
  const signals = computeSignals(run.request.formula, bars, params);
  const bt = backtestConfig(run);
  const train = ResearchEngine.backtest(bars, signals, bt, { start: run.warmup, end: run.trainEnd });
  const test = run.trainEnd < bars.length ? ResearchEngine.backtest(bars, signals, bt, { start: run.trainEnd, end: bars.length }) : null;
  return { train, test, signalSource: signals.source };
}

function objectiveValue(m, objective) {
  if (!m) return null;
  if (objective === "annual_return") return m.ann;
  if (objective === "calmar") return m.calmar;
  return m.sharpe;
}

function evaluateCandidate(run, bars, params, seq) {
  const cfg = run.request.cfg;
  const ev = evaluateSegments(run, bars, params);
  const m = ev.train.metrics;
  const reasons = [];
  if (m.trades < cfg.minTrades) reasons.push(`交易数 ${m.trades} < ${cfg.minTrades}`);
  if (m.mdd > cfg.maxDD) reasons.push(`回撤 ${fmtPct(m.mdd, 1)} > ${fmtPct(cfg.maxDD, 0)}`);
  const score = objectiveValue(m, cfg.objective);
  if (ev.signalSource === "proxy") run.signalSource = "proxy";
  return {
    id: `c${String(seq).padStart(6, "0")}`,
    params: { ...params },
    train: m,
    test: ev.test ? ev.test.metrics : null,
    eligible: !reasons.length,
    reason: reasons.join("；"),
    score: score == null ? null : score,
  };
}

function rankCandidates(run) {
  const val = (c) => (c.score == null ? -Infinity : c.score);
  run.candidates.sort((a, b) => Number(b.eligible) - Number(a.eligible) || val(b) - val(a));
  run.candidates.forEach((c, i) => {
    c.rank = i + 1;
  });
  run.bestId = run.candidates.find((c) => c.eligible)?.id || null;
}

function computeWarmup(cfg, n) {
  let maxParam = 0;
  cfg.params.forEach((p) => {
    const hi = p.opt && cfg.algorithm !== "single" ? p.max : p.value;
    if (p.type === "INT" && Number.isFinite(hi)) maxParam = Math.max(maxParam, hi);
  });
  return Math.min(Math.max(20, Math.ceil(maxParam)), Math.floor(n * 0.3));
}

// ---------- 策略回测（当前参数 · 全样本） ----------

function runBacktest(opts = {}) {
  updateResearchBlockedHint();
  if (/** @type {HTMLButtonElement} */ ($("btn-run-backtest")).disabled) {
    toast($("backtest-blocked-reason").textContent || "当前无法回测", "warn");
    return false;
  }
  const bars = state.bars;
  const n = bars.length;
  const params = researchParams();
  const values = Object.fromEntries(params.map((p) => [p.key, p.value]));
  const cond = readBacktestConditions();
  const warmup = backtestWarmup(n);
  const signals = computeSignals({ dialect: getFormulaDialect(), source: getFormulaSource() }, bars, values);
  const seg = ResearchEngine.backtest(
    bars,
    signals,
    { ...cond, barsPerYear: BARS_PER_YEAR[state.chartPeriod] || 244, intraday: INTRADAY_CHART_PERIODS.has(state.chartPeriod) },
    { start: warmup, end: n }
  );
  state.backtest = {
    key: backtestInputKey(),
    ts: Date.now(),
    seg,
    values,
    warmup,
    signalSource: signals.source,
    signalCount: { buy: signals.buy.filter(Boolean).length, sell: signals.sell.filter(Boolean).length },
    signalStats: signals.stats || null,
    market: marketSnapshot(),
    period: `${formatDateLabel(bars[warmup].t)} — ${formatDateLabel(bars[n - 1].t)}`,
  };
  renderBacktestResult();
  requestAnimationFrame(() => $("backtest-result").scrollIntoView({ behavior: "smooth", block: "start" }));
  if (!opts.quiet) toast(`回测完成 · ${seg.metrics.trades} 笔完整交易`, "success");
  return true;
}

function syncBacktestStale() {
  const bt = state.backtest;
  const el = $("backtest-stale");
  if (!el) return;
  el.hidden = !bt || bt.key === backtestInputKey();
}

function renderBacktestResult() {
  const bt = state.backtest;
  $("backtest-result").hidden = !bt;
  if (!bt) return;
  const m = bt.seg.metrics;
  $("backtest-result-meta").innerHTML = `
    <span>行情：<b>${escHtml(marketLabel(bt.market))}</b></span>
    <span>回测区间：<b>${bt.period}</b>（预热 ${bt.warmup} 根）</span>
    <span>参数：<span class="parameter-values">${paramsHtml(bt.values)}</span></span>
    <span>信号：<b>BUY ${bt.signalCount.buy} 次 · SELL ${bt.signalCount.sell} 次</b></span>`;
  const notes = [];
  if (bt.signalSource === "proxy") notes.push("公式 BUY / SELL 无法求值，本次使用参数驱动的均线交叉近似信号，结果仅供交互演示。");
  if (bt.signalSource === "error") notes.push("公式中的 BUY / SELL 求值失败，本次没有产生任何交易信号；请先通过语法检测并提交绘图确认信号。");
  const ss = bt.signalStats;
  if (ss) {
    const dropped = [];
    if (ss.leadingSell) dropped.push(`首个 BUY 之前的 SELL ${ss.leadingSell} 次`);
    if (ss.repeatBuy) dropped.push(`持仓中重复的 BUY ${ss.repeatBuy} 次`);
    if (ss.repeatSell) dropped.push(`空仓中重复的 SELL ${ss.repeatSell} 次`);
    if (dropped.length) notes.push(`信号按「先买后卖、一买一卖」配对，已过滤：${dropped.join(" · ")}（公式原始 BUY ${ss.rawBuy} 次 · SELL ${ss.rawSell} 次）。`);
    if (ss.open) notes.push("最后一个 BUY 尚无对应 SELL，回测末尾按最新收盘价计浮动盈亏，交易明细中标记为「未卖出」。");
  }
  if (!bt.market.real) notes.push("当前行情为模拟序列，绩效仅供交互演示。");
  if (m.trades < 3) notes.push(`只有 ${m.trades} 笔完整交易，统计意义有限；可检查信号条件，或加载更长的行情区间。`);
  const n = bt.seg.notes || {};
  const extra = [];
  if (n.limitUpSkip) extra.push(`涨停未买入 ${n.limitUpSkip} 次`);
  if (n.limitDownDelay) extra.push(`跌停顺延卖出 ${n.limitDownDelay} 次`);
  if (n.lotSkip) extra.push(`资金不足一手 ${n.lotSkip} 次`);
  if (extra.length) notes.push(`成交约束：${extra.join(" · ")}`);
  const noteBox = $("backtest-notes");
  noteBox.hidden = !notes.length;
  noteBox.innerHTML = notes.map((t) => `<li>${escHtml(t)}</li>`).join("");
  renderReport("backtest-report", bt.seg, m, "单一样本：使用全部 K 线（扣除预热期），不划分训练 / 测试");
  syncBacktestStale();
}

function saveFormulaFromResearch() {
  if (!isCustomFormulaMode()) {
    toast("系统指标为只读，无需保存", "warn");
    return;
  }
  const errs = validateParamModel(getParamModel());
  if (errs.length) {
    toast(`参数设置有误：${errs[0]}`, "warn");
    return;
  }
  if (typeof FormulaEditorUI !== "undefined" && FormulaEditorUI.saveWorkspace) FormulaEditorUI.saveWorkspace();
  else saveDraft();
}

// ---------- 回测报告组件（策略回测与候选详情共用） ----------

const REPORT_ROOTS = ["backtest-report", "candidate-report"];
const reportPart = (root, k) => /** @type {HTMLElement} */ (root.querySelector(`[data-r="${k}"]`));

function mountReport(id) {
  const root = /** @type {HTMLElement & { _seg?: any, _ledgerTab?: string }} */ ($(id));
  if (!root || root.dataset.mounted) return root;
  root.dataset.mounted = "1";
  root._ledgerTab = "trades";
  root.innerHTML = `
    <div class="metric-strip" data-r="metrics"></div>
    <div class="equity-legend" data-r="legend">
      <span><i class="legend-line" style="background: #0d9488" aria-hidden="true"></i>策略资金</span>
      <span><i class="legend-line" style="background: #94a3b8" aria-hidden="true"></i>基准（买入持有）</span>
      <span><i class="legend-line" style="background: #cf7880" aria-hidden="true"></i>回撤</span>
      <span><i class="legend-line" style="background: #a88d55" aria-hidden="true"></i>持仓比例</span>
      <span class="muted" data-r="note"></span>
    </div>
    <div class="equity-chart" data-r="chart">
      <canvas data-r="canvas" aria-label="资金、基准、回撤与持仓"></canvas>
      <div class="equity-tip" data-r="tip" hidden></div>
    </div>
    <div class="execution-tables" data-r="ledger">
      <div class="segmented" role="group" aria-label="交易记录类型">
        <button type="button" data-ledger="trades" aria-pressed="true">完整交易</button>
        <button type="button" data-ledger="orders" aria-pressed="false">成交订单</button>
      </div>
      <div class="table-scroll ledger">
        <table><thead data-r="thead"></thead><tbody data-r="tbody"></tbody></table>
      </div>
    </div>`;
  root.querySelectorAll("[data-ledger]").forEach((b) =>
    b.addEventListener("click", () => {
      root._ledgerTab = b.getAttribute("data-ledger") || "trades";
      if (root._seg) renderLedger(root);
    })
  );
  const canvas = reportPart(root, "canvas");
  canvas.addEventListener("mousemove", (e) => {
    const seg = root._seg;
    if (!seg) return;
    const rect = canvas.getBoundingClientRect();
    const plotW = rect.width - 74;
    const i = Math.round(((e.clientX - rect.left - 10) / plotW) * (seg.equity.length - 1));
    drawEquityChart(root, Math.max(0, Math.min(seg.equity.length - 1, i)));
  });
  canvas.addEventListener("mouseleave", () => {
    if (root._seg) drawEquityChart(root, null);
  });
  return root;
}

function renderReport(id, seg, metrics, note) {
  const root = mountReport(id);
  if (!root) return;
  root._seg = seg;
  reportPart(root, "metrics").innerHTML = metrics
    ? detailMetricCells(metrics)
        .map(([k, v]) => `<div class="metric"><span>${k}</span><strong>${v}</strong></div>`)
        .join("")
    : "";
  reportPart(root, "note").textContent = note || "";
  ["legend", "chart", "ledger"].forEach((k) => {
    reportPart(root, k).hidden = !seg;
  });
  if (seg) {
    drawEquityChart(root, null);
    renderLedger(root);
  }
}

function redrawReports() {
  REPORT_ROOTS.forEach((id) => {
    const root = /** @type {any} */ ($(id));
    if (root?._seg && root.offsetParent) drawEquityChart(root, null);
  });
}

function detailMetricCells(m) {
  return [
    ["累计收益", fmtPct(m.cumRet)],
    ["年化收益", fmtPct(m.ann)],
    ["超额收益", fmtPct(m.excess)],
    ["最大回撤", fmtPct(m.mdd)],
    ["夏普比率", fmtFix(m.sharpe)],
    ["卡玛比率", fmtFix(m.calmar)],
    ["交易次数", String(m.trades)],
    ["胜率", fmtPct(m.win)],
    ["平均每笔盈亏", fmtFix(m.avgPnl)],
    ["期末资金", formatNum(m.equity, 2)],
  ];
}

function drawEquityChart(root, hoverIdx) {
  const seg = root._seg;
  if (!seg) return;
  const canvas = /** @type {HTMLCanvasElement} */ (reportPart(root, "canvas"));
  const wrap = canvas.parentElement;
  const W = wrap.clientWidth;
  const H = 360;
  if (!W) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#fbfcfd";
  ctx.fillRect(0, 0, W, H);

  const n = seg.equity.length;
  if (n < 2) return;
  const pad = { l: 10, r: 64, t: 10, b: 22 };
  const plotW = W - pad.l - pad.r;
  const panes = [
    { top: pad.t, h: 200 },
    { top: pad.t + 212, h: 60 },
    { top: pad.t + 284, h: 44 },
  ];
  const xAt = (i) => pad.l + (i / (n - 1)) * plotW;
  ctx.font = "10px -apple-system, BlinkMacSystemFont, sans-serif";

  const drawAxis = (pane, min, max, fmt, ticks = 3) => {
    ctx.strokeStyle = "#eef2f4";
    ctx.fillStyle = "#8b9ba7";
    ctx.lineWidth = 1;
    for (let k = 0; k <= ticks; k++) {
      const v = min + ((max - min) * k) / ticks;
      const y = pane.top + pane.h - ((v - min) / (max - min || 1)) * pane.h;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(pad.l + plotW, y);
      ctx.stroke();
      ctx.fillText(fmt(v), pad.l + plotW + 6, y + 3);
    }
  };
  const line = (arr, pane, min, max, color, width) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    arr.forEach((v, i) => {
      const y = pane.top + pane.h - ((v - min) / (max - min || 1)) * pane.h;
      if (i === 0) ctx.moveTo(xAt(i), y);
      else ctx.lineTo(xAt(i), y);
    });
    ctx.stroke();
  };
  const area = (arr, pane, min, max, stroke, fill) => {
    ctx.beginPath();
    const y0 = pane.top + pane.h - ((0 - min) / (max - min || 1)) * pane.h;
    ctx.moveTo(xAt(0), y0);
    arr.forEach((v, i) => ctx.lineTo(xAt(i), pane.top + pane.h - ((v - min) / (max - min || 1)) * pane.h));
    ctx.lineTo(xAt(n - 1), y0);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    line(arr, pane, min, max, stroke, 1);
  };

  let eMin = Math.min(...seg.equity, ...seg.bench);
  let eMax = Math.max(...seg.equity, ...seg.bench);
  const padE = (eMax - eMin) * 0.06 || eMax * 0.01;
  eMin -= padE;
  eMax += padE;
  drawAxis(panes[0], eMin, eMax, (v) => formatNum(v, 0));
  line(seg.bench, panes[0], eMin, eMax, "#94a3b8", 1.2);
  line(seg.equity, panes[0], eMin, eMax, "#0d9488", 1.8);

  const ddMin = Math.min(-0.01, ...seg.drawdown);
  drawAxis(panes[1], ddMin, 0, (v) => `${(v * 100).toFixed(1)}%`, 2);
  area(seg.drawdown, panes[1], ddMin, 0, "#cf7880", "#f7e1e3");

  drawAxis(panes[2], 0, 1, (v) => `${Math.round(v * 100)}%`, 1);
  area(seg.position, panes[2], 0, 1, "#a88d55", "#f3ecdc");

  ctx.fillStyle = "#8b9ba7";
  const intraday = INTRADAY_CHART_PERIODS.has(state.chartPeriod);
  const ticks = Math.min(6, n - 1);
  for (let k = 0; k <= ticks; k++) {
    const i = Math.round(((n - 1) * k) / ticks);
    const label = intraday ? formatCrosshairTime(seg.times[i]) : formatDateLabel(seg.times[i]);
    const w = ctx.measureText(label).width;
    ctx.fillText(label, Math.min(Math.max(pad.l, xAt(i) - w / 2), pad.l + plotW - w), H - 6);
  }

  const tip = reportPart(root, "tip");
  if (hoverIdx == null || hoverIdx < 0 || hoverIdx >= n) {
    tip.hidden = true;
    return;
  }
  const x = xAt(hoverIdx);
  ctx.strokeStyle = "rgba(47,125,225,0.45)";
  ctx.beginPath();
  ctx.moveTo(x, pad.t);
  ctx.lineTo(x, panes[2].top + panes[2].h);
  ctx.stroke();
  tip.hidden = false;
  tip.innerHTML = `<b>${intraday ? formatCrosshairTime(seg.times[hoverIdx]) : formatDateLabel(seg.times[hoverIdx])}</b>
    <span>策略资金 ${formatNum(seg.equity[hoverIdx], 2)}</span>
    <span>基准 ${formatNum(seg.bench[hoverIdx], 2)}</span>
    <span>回撤 ${fmtPct(seg.drawdown[hoverIdx])}</span>
    <span>持仓 ${fmtPct(seg.position[hoverIdx], 0)}</span>`;
  tip.style.left = `${x > W / 2 ? x - tip.offsetWidth - 12 : x + 12}px`;
}

function renderLedger(root) {
  const seg = root._seg;
  const tab = root._ledgerTab || "trades";
  const btnTrades = root.querySelector('[data-ledger="trades"]');
  const btnOrders = root.querySelector('[data-ledger="orders"]');
  btnTrades.textContent = `完整交易（${seg.trades.length}）`;
  btnOrders.textContent = `成交订单（${seg.orders.length}）`;
  btnTrades.setAttribute("aria-pressed", String(tab === "trades"));
  btnOrders.setAttribute("aria-pressed", String(tab === "orders"));
  const thead = reportPart(root, "thead");
  const tbody = reportPart(root, "tbody");
  const pxDigits = seg.orders.some((o) => Math.abs(Math.round(o.price * 100) - o.price * 100) > 1e-6) ? 3 : 2;
  if (tab === "trades") {
    thead.innerHTML = `<tr><th>买入日期</th><th>卖出日期</th><th>买入价</th><th>卖出价</th><th>数量</th><th>持仓 K 线</th><th>盈亏</th><th>收益率</th><th>费用</th><th>退出原因</th></tr>`;
    tbody.innerHTML = seg.trades.length
      ? seg.trades
          .map(
            (t) => `<tr>
          <td>${t.entry_date}</td><td>${t.exit_date || "未卖出"}</td>
          <td>${fmtFix(t.entry_price, pxDigits)}</td><td>${fmtFix(t.exit_price, pxDigits)}</td>
          <td>${t.quantity.toLocaleString("zh-CN")}</td><td>${t.bars_held}</td>
          <td class="${t.pnl >= 0 ? "text-up" : "text-down"}">${formatNum(t.pnl, 2)}</td>
          <td class="${t.pnl >= 0 ? "text-up" : "text-down"}">${fmtPct(t.return_pct)}</td>
          <td>${formatNum(t.fees, 2)}</td>
          <td>${t.exit_reason in RISK_REASON_TONE ? `<span class="tag ${RISK_REASON_TONE[t.exit_reason]}">${t.exit_reason}</span>` : t.exit_reason}</td>
        </tr>`
          )
          .join("")
      : `<tr><td colspan="10" class="empty-row">本评估区间没有完整交易</td></tr>`;
  } else {
    thead.innerHTML = `<tr><th>日期</th><th>方向</th><th>成交价</th><th>数量</th><th>成交额</th><th>费用</th><th>原因</th></tr>`;
    tbody.innerHTML = seg.orders.length
      ? seg.orders
          .map(
            (o) => `<tr>
          <td>${o.date}</td>
          <td><span class="${o.side === "buy" ? "text-up" : "text-down"}">${o.side === "buy" ? "买入" : "卖出"}</span></td>
          <td>${fmtFix(o.price, pxDigits)}</td><td>${o.qty.toLocaleString("zh-CN")}</td>
          <td>${formatNum(o.price * o.qty, 2)}</td><td>${formatNum(o.fee, 2)}</td><td>${o.reason}</td>
        </tr>`
          )
          .join("")
      : `<tr><td colspan="7" class="empty-row">本评估区间没有成交订单</td></tr>`;
  }
}

const RISK_REASON_TONE = {
  固定止损: "danger",
  移动止损: "danger",
  保本止损: "neutral",
  时间止损: "neutral",
  固定止盈: "teal",
  移动止盈: "teal",
};

// ---------- 参数优化：确认与运行 ----------

function openConfirmDialog() {
  updateResearchBlockedHint();
  if (/** @type {HTMLButtonElement} */ ($("btn-start-research")).disabled) {
    toast($("research-blocked-reason").textContent || "当前无法开始优化", "warn");
    return;
  }
  const cfg = readResearchForm();
  const est = computeResearchEstimate(cfg);
  const market = marketSnapshot();
  const source = getFormulaSource();
  state.pendingRequest = {
    cfg,
    est: { raw: est.raw, valid: est.valid, evaluate: est.evaluate, approx: est.approx },
    market,
    bars: state.bars.slice(),
    formula: {
      name: formatWorkspaceLabel(state.workspace?.name),
      dialect: getFormulaDialect(),
      source,
      sourceHash: hashString(normalizeFormulaSource(source)),
    },
  };
  const r = cfg.rules;
  const ev = estimateView(cfg, est);
  const items = [
    ["证券 / 品种", `${market.symbol} ${market.name} · ${r.kindLabel} ${r.boardLabel}`],
    ["回测行情", `${CHART_PERIOD_LABEL[market.period]} · ${CHART_ADJ_LABEL[market.adj]} · ${market.first} — ${market.last} · ${market.barCount} 根 · ${market.real ? "真实行情" : "模拟数据（非真实历史业绩）"}`],
    ["公式", `${state.pendingRequest.formula.name} · 源码指纹 ${state.pendingRequest.formula.sourceHash}`],
    ["引擎 / 算法", `${ENGINE_LABEL[cfg.engine]} · ${ALGO_LABEL[cfg.algorithm]}`],
    ["评估规模", `${ev.head}，将评估 ${ev.count} 组 · 预计 ${ev.time}`],
    ["训练集目标 / 筛选", `${OBJECTIVE_LABEL[cfg.objective]} · 最少 ${cfg.minTrades} 笔交易 · 最大回撤 ≤ ${fmtPct(cfg.maxDD, 0)}`],
    ["训练 / 测试", cfg.trainRatio >= 1 ? "100% 训练 · 无样本外检验" : `${Math.round(cfg.trainRatio * 100)}% / ${Math.round((1 - cfg.trainRatio) * 100)}% · 预热后按时间顺序划分，测试集独立资金、空仓开始`],
    ...conditionRows(cfg),
  ];
  if (cfg.algorithm === "genetic") items.push(["遗传设置", `种群 ${cfg.ga.population} · 代数 ${cfg.ga.generations} · 随机种子 ${cfg.ga.seed}`]);
  $("confirm-summary-grid").innerHTML = items.map(([dt, dd]) => `<div><dl><dt>${dt}</dt><dd>${escHtml(dd)}</dd></dl></div>`).join("");
  $("confirm-param-tbody").innerHTML = cfg.params.length
    ? cfg.params
        .map((p) => {
          const scan = p.opt ? `${p.min} ~ ${p.max} · 步长 ${p.step} · ${ResearchEngine.rangeValues(p).length} 个取值` : "固定当前值（不扫描）";
          return `<tr><td class="mono">${p.key}</td><td>${p.value}</td><td>${p.allowed.min} ~ ${p.allowed.max}</td><td>${scan}</td></tr>`;
        })
        .join("")
    : `<tr><td colspan="4" class="muted">无参数，只评估一组</td></tr>`;
  $("confirm-constraints-line").textContent = cfg.constraints.length
    ? `参数约束：${cfg.constraints.map((c) => `${c.left} ${c.op} ${c.right}`).join("；")}`
    : "参数约束：无";
  $("confirm-source-pre").textContent = source;
  const dlg = /** @type {HTMLDialogElement} */ ($("dialog-confirm-research"));
  if (!dlg.showModal) {
    alert("当前浏览器不支持 dialog.showModal，请升级浏览器。");
    return;
  }
  dlg.showModal();
}

function startResearchRun() {
  const req = state.pendingRequest;
  if (!req || state.running) return;
  state.pendingRequest = null;
  const bars = req.bars;
  const n = bars.length;
  const cfg = req.cfg;
  const warmup = computeWarmup(cfg, n);
  const trainEnd = cfg.trainRatio >= 1 ? n : warmup + Math.floor((n - warmup) * cfg.trainRatio);
  const run = {
    id: hashString(`${Date.now()}|${Math.random()}`).slice(0, 8),
    ts: Date.now(),
    status: "running",
    request: { cfg, market: req.market, formula: req.formula, estimate: req.est },
    warmup,
    trainEnd,
    dates: {
      evalStart: formatDateLabel(bars[warmup].t),
      trainEnd: formatDateLabel(bars[trainEnd - 1].t),
      testStart: trainEnd < n ? formatDateLabel(bars[trainEnd].t) : null,
      testEnd: formatDateLabel(bars[n - 1].t),
    },
    signalSource: "formula",
    planned: req.est.evaluate,
    evaluated: 0,
    candidates: [],
    bestId: null,
  };

  const space = buildSearchSpace(cfg);
  let queue = [];
  let genetic = null;
  let genBatch = [];
  if (cfg.algorithm === "genetic") {
    genetic = ResearchEngine.createGenetic(space, cfg.ga);
  } else if (!space.axes.length) {
    queue = [space.decode(0)];
  } else {
    queue = ResearchEngine.planGrid(space, GRID_BUDGET, cfg.ga.seed || 1);
  }
  run.planned = genetic ? req.est.evaluate : queue.length;

  state.running = true;
  state.runCancel = false;
  state.activeRun = { run, bars };
  state.viewRunId = null;
  state.resultsView = "list";
  $("run-progress").hidden = false;
  switchResearchTab("results");
  updateResearchBlockedHint();

  const setProgress = () => {
    const pct = run.planned ? Math.min(99, (run.evaluated / run.planned) * 100) : 50;
    $("run-progress-bar").style.width = `${Math.max(3, pct)}%`;
    $("run-progress-label").textContent = `研究 ${run.id} 运行中 · 已评估 ${run.evaluated} / ${run.planned} 组`;
  };
  setProgress();

  const finish = (status) => {
    run.status = status;
    if (status === "completed") rankCandidates(run);
    if (status === "completed" && genetic) run.planned = run.evaluated;
    state.running = false;
    state.activeRun = null;
    $("run-progress").hidden = true;
    pushHistory(run);
    if (status === "completed") {
      state.latestRunId = run.id;
      state.viewRunId = run.id;
      state.selectedCandidateId = run.bestId || run.candidates[0]?.id || null;
      state.detailsDataset = "train";
      state.resultsPage = 0;
      state.resultsSort = { key: "rank", dir: 1 };
      state.resultsView = "list";
      toast(`优化完成 · 评估 ${run.evaluated} 组，${run.bestId ? `训练最优 ${run.bestId}` : "没有合格候选"}`, run.bestId ? "success" : "warn");
    } else {
      toast("任务已取消，不会生成完整研究结果。", "warn");
    }
    renderResults();
    refreshHistoryTable();
    updateResearchBlockedHint();
  };

  const tick = () => {
    if (state.runCancel) {
      finish("cancelled");
      return;
    }
    const t0 = performance.now();
    while (performance.now() - t0 < 30) {
      if (genetic) {
        if (!genBatch.length) {
          const next = genetic.nextBatch();
          if (!next) {
            finish("completed");
            return;
          }
          genBatch = next.map((x) => ({ ...x, done: false }));
          if (!genBatch.length) {
            genetic.report([]);
            continue;
          }
        }
        const item = genBatch.find((x) => !x.done);
        const c = evaluateCandidate(run, bars, item.combo, run.evaluated + 1);
        run.candidates.push(c);
        run.evaluated++;
        item.done = true;
        item.fitness = (c.score ?? -1e6) - (c.eligible ? 0 : 1000);
        if (genBatch.every((x) => x.done)) {
          genetic.report(genBatch);
          genBatch = [];
        }
      } else {
        const combo = queue.shift();
        if (!combo) {
          finish("completed");
          return;
        }
        run.candidates.push(evaluateCandidate(run, bars, combo, run.evaluated + 1));
        run.evaluated++;
      }
    }
    setProgress();
    setTimeout(tick, 0);
  };
  setTimeout(tick, 60);
}

// ---------- 历史存储 ----------

function compactNumber(v) {
  return typeof v === "number" && Number.isFinite(v) && !Number.isInteger(v) ? +v.toPrecision(6) : v;
}

function compactRunForStorage(run) {
  const ranked = run.candidates.slice(0, HISTORY_CANDIDATE_LIMIT);
  return JSON.parse(JSON.stringify({ ...run, candidates: ranked, storedCandidates: ranked.length, totalCandidates: run.candidates.length }), (k, v) =>
    compactNumber(v)
  );
}

function persistHistory() {
  let list = state.history.slice(0, 50);
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      localStorage.setItem(STORAGE_HISTORY, JSON.stringify(list));
      return;
    } catch {
      list = list.slice(0, Math.max(5, Math.floor(list.length / 2)));
    }
  }
}

function pushHistory(run) {
  state.history.unshift(compactRunForStorage(run));
  state.history = state.history.slice(0, 50);
  state.runCache = state.runCache || {};
  state.runCache[run.id] = run;
  persistHistory();
  $("count-history").textContent = String(state.history.length);
  $("history-title-count").textContent = String(state.history.length);
}

function getRun(id) {
  return state.runCache?.[id] || state.history.find((h) => h.id === id && h.request) || null;
}

// ---------- 优化结果：列表 → 候选详情 ----------

const RESULT_COLUMNS = [
  { key: "rank", label: "候选 / 资格" },
  { key: "params", label: "参数组合", sortable: false },
  { key: "train.ann", label: "训练年化" },
  { key: "train.sharpe", label: "训练夏普" },
  { key: "train.calmar", label: "训练卡玛" },
  { key: "train.mdd", label: "训练回撤" },
  { key: "train.trades", label: "训练交易数" },
  { key: "train.win", label: "训练胜率" },
  { key: "test.ann", label: "测试年化", test: true },
  { key: "test.sharpe", label: "测试夏普", test: true },
  { key: "test.mdd", label: "测试回撤", test: true },
  { key: "test.trades", label: "测试交易数", test: true },
  { key: "decay", label: "夏普衰减", test: true, title: "测试夏普 − 训练夏普；明显为负提示过拟合" },
];

function candidateValue(c, key) {
  if (key === "rank") return c.rank;
  if (key === "decay") return c.test?.sharpe != null && c.train?.sharpe != null ? c.test.sharpe - c.train.sharpe : null;
  const [seg, f] = key.split(".");
  return c[seg]?.[f] ?? null;
}

function visibleCandidates(run) {
  let list = run.candidates.slice();
  if (state.resultsOnlyEligible) list = list.filter((c) => c.eligible);
  const { key, dir } = state.resultsSort;
  list.sort((a, b) => {
    const x = candidateValue(a, key);
    const y = candidateValue(b, key);
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return (x - y) * dir;
  });
  return list;
}

function findCandidate(run, cid) {
  return run?.candidates.find((x) => x.id === cid) || null;
}

function renderResults() {
  const run = state.viewRunId ? getRun(state.viewRunId) : null;
  $("count-results").textContent = run ? String(run.candidates.length) : "0";
  $("results-empty").hidden = !!run;
  $("results-body").hidden = !run;
  if (!run) {
    const active = state.running && state.activeRun?.run;
    $("results-empty-title").textContent = active ? "参数优化进行中…" : "暂无优化结果";
    $("results-empty-desc").textContent = active
      ? `研究 ${active.id} 正在评估参数组合，完成后自动在这里展示每组参数的训练 / 测试表现。`
      : "在「参数优化」中设置扫描区间并开始优化，或在「研究历史」中查看以往的研究。";
    return;
  }
  const detail = state.resultsView === "detail" && !!findCandidate(run, state.selectedCandidateId);
  $("results-list-view").hidden = detail;
  $("results-detail-view").hidden = !detail;
  renderResultsHeader(run);
  if (detail) renderCandidateDetail(run);
  else renderResultsList(run);
}

function renderResultsHeader(run) {
  const cfg = run.request.cfg;
  const m = run.request.market;
  const hasTest = !!run.dates.testStart;
  const [statusText, statusTone] = RUN_STATUS[run.status] || ["—", "neutral"];
  $("results-run-id").textContent = `研究 ${run.id}`;
  const statusTag = $("results-run-status");
  statusTag.textContent = statusText;
  statusTag.className = `tag ${statusTone}`;
  $("results-meta").textContent = `${new Date(run.ts).toLocaleString("zh-CN", { hour12: false })} · ${ENGINE_LABEL[cfg.engine]} · ${ALGO_LABEL[cfg.algorithm]} · 训练目标：${OBJECTIVE_LABEL[cfg.objective]}`;
  const histNotice = $("results-history-notice");
  const isLatest = run.id === state.latestRunId;
  histNotice.hidden = isLatest;
  histNotice.innerHTML = isLatest
    ? ""
    : `正在查看历史研究 <b class="mono">${run.id}</b> 的锁定快照（${escHtml(run.request.formula.name)} · ${escHtml(marketLabel(m))}），不代表当前草稿。`;
  $("results-eval-period").innerHTML = `
    <span>训练集：<b>${run.dates.evalStart} — ${run.dates.trainEnd}</b></span>
    <span>${hasTest ? `测试集：<b>${run.dates.testStart} — ${run.dates.testEnd}</b>` : "无测试集"}</span>
    <span>信号：<b>${run.signalSource === "proxy" ? "近似信号（公式无法求值）" : "公式 BUY / SELL"}</b></span>
    <span class="muted">${m.real ? "真实行情" : "模拟行情，仅供交互演示"} · 回测为历史模拟，不代表实盘业绩</span>`;
}

function renderResultsList(run) {
  const cfg = run.request.cfg;
  const hasTest = !!run.dates.testStart;
  const best = findCandidate(run, run.bestId);
  const eligibleN = run.candidates.filter((c) => c.eligible).length;
  const stored = run.storedCandidates && run.totalCandidates > run.storedCandidates ? `（历史仅保留排名前 ${run.storedCandidates} 组）` : "";

  const bestBox = $("results-best");
  if (best) {
    const cells = [
      [`训练${OBJECTIVE_LABEL[cfg.objective]}`, cfg.objective === "annual_return" ? fmtPct(best.score) : fmtFix(best.score)],
      ["训练年化", fmtPct(best.train.ann)],
      ["训练回撤", fmtPct(best.train.mdd)],
      ["训练交易", String(best.train.trades)],
    ];
    if (hasTest && best.test) cells.push(["测试年化", fmtPct(best.test.ann)], ["测试夏普", fmtFix(best.test.sharpe)], ["测试回撤", fmtPct(best.test.mdd)]);
    bestBox.innerHTML = `
      <div class="best-head">
        <span class="tag teal">训练最优</span><strong class="mono">${best.id}</strong>
        <span class="parameter-values">${paramsHtml(best.params)}</span>
      </div>
      <div class="best-metrics">${cells.map(([k, v]) => `<div><span>${k}</span><strong>${v}</strong></div>`).join("")}</div>
      <div class="inline-actions">
        <button type="button" class="btn-sm" data-act="detail" data-cid="${best.id}">查看详情</button>
        <button type="button" class="primary btn-sm" data-act="apply" data-cid="${best.id}">应用参数并回测</button>
      </div>`;
  } else {
    bestBox.innerHTML = `<p class="text-warn">没有满足筛选条件的候选。请查看下表的不合格原因，放宽最少交易数 / 最大回撤，或调整扫描区间后重新优化。</p>`;
  }

  $("results-summary").innerHTML = `共评估 ${run.totalCandidates || run.candidates.length} 组${stored} · 合格 ${eligibleN} 组`;
  /** @type {HTMLInputElement} */ ($("results-only-eligible")).checked = state.resultsOnlyEligible;

  const cols = RESULT_COLUMNS.filter((c) => hasTest || !c.test);
  $("results-thead").innerHTML = `<tr>${cols
    .map((c) => {
      if (c.sortable === false) return `<th>${c.label}</th>`;
      const active = state.resultsSort.key === c.key;
      const arrow = active ? (state.resultsSort.dir > 0 ? " ↑" : " ↓") : "";
      return `<th class="sortable${active ? " active" : ""}" data-sort="${c.key}" ${c.title ? `title="${c.title}"` : ""}>${c.label}${arrow}</th>`;
    })
    .join("")}<th>操作</th></tr>`;
  $("results-thead").querySelectorAll("th[data-sort]").forEach((th) =>
    th.addEventListener("click", () => {
      const key = th.getAttribute("data-sort");
      const lowerBetter = key === "rank" || key.endsWith(".mdd");
      state.resultsSort =
        state.resultsSort.key === key ? { key, dir: -state.resultsSort.dir } : { key, dir: lowerBetter ? 1 : -1 };
      state.resultsPage = 0;
      renderResults();
    })
  );

  const list = visibleCandidates(run);
  const pages = Math.max(1, Math.ceil(list.length / RESULTS_PAGE_SIZE));
  state.resultsPage = Math.min(state.resultsPage, pages - 1);
  const pageItems = list.slice(state.resultsPage * RESULTS_PAGE_SIZE, (state.resultsPage + 1) * RESULTS_PAGE_SIZE);
  const cell = (c, key) => {
    const v = candidateValue(c, key);
    if (key.endsWith(".ann") || key.endsWith(".mdd") || key.endsWith(".win")) return fmtPct(v);
    if (key.endsWith(".trades")) return v == null ? "—" : String(v);
    if (key === "decay") return v == null ? "—" : `<span class="${v < -0.5 ? "text-down" : ""}">${v > 0 ? "+" : ""}${fmtFix(v)}</span>`;
    return fmtFix(v);
  };
  $("results-table-body").innerHTML = pageItems.length
    ? pageItems
        .map((c) => {
          const badge = c.id === run.bestId ? ["训练最优", "teal"] : c.eligible ? ["合格", "neutral"] : ["不合格", "danger"];
          const cls = [c.id === run.bestId ? "best-row" : "", c.id === state.selectedCandidateId ? "selected-row" : "", c.eligible ? "" : "ineligible-row"].join(" ");
          return `<tr class="${cls}" data-cid="${c.id}" tabindex="0">
            <td><strong class="mono">${c.id}</strong> <span class="tag ${badge[1]}">${badge[0]}</span>${c.reason ? `<small class="reason">${escHtml(c.reason)}</small>` : ""}</td>
            <td class="parameter-values">${paramsHtml(c.params)}</td>
            ${cols.slice(2).map((col) => `<td>${cell(c, col.key)}</td>`).join("")}
            <td><button type="button" class="text-button" data-act="detail" data-cid="${c.id}">查看详情</button></td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="${cols.length + 1}" class="empty-row">${state.resultsOnlyEligible ? "没有合格候选" : "该任务没有候选结果"}</td></tr>`;

  $("results-pager").innerHTML =
    pages > 1
      ? `<button type="button" class="btn-sm" data-page="-1" ${state.resultsPage === 0 ? "disabled" : ""}>上一页</button>
         <span class="muted small">第 ${state.resultsPage + 1} / ${pages} 页 · ${list.length} 组</span>
         <button type="button" class="btn-sm" data-page="1" ${state.resultsPage >= pages - 1 ? "disabled" : ""}>下一页</button>`
      : "";
  $("results-pager").querySelectorAll("[data-page]").forEach((b) =>
    b.addEventListener("click", () => {
      state.resultsPage += Number(b.getAttribute("data-page"));
      renderResults();
    })
  );
  $("results-footnote").textContent = `每一行都是该组参数的完整回测指标，无需写入当前值即可比较。仅按训练集${OBJECTIVE_LABEL[cfg.objective]}排序与选优，测试列只用于独立观察。点击行或「查看详情」查看资金曲线与交易明细。`;
}

function openCandidateDetail(cid) {
  state.selectedCandidateId = cid;
  state.resultsView = "detail";
  renderResults();
  $("pane-results").scrollIntoView({ behavior: "smooth", block: "start" });
}

function backToResultsList() {
  state.resultsView = "list";
  renderResults();
}

const detailCache = new Map();

function getCandidateEvaluation(run, c) {
  const key = `${run.id}|${c.id}`;
  if (detailCache.has(key)) return detailCache.get(key);
  if (run.request.market.datasetId !== currentDatasetId()) return null;
  const ev = evaluateSegments(run, state.bars, c.params);
  detailCache.set(key, ev);
  return ev;
}

function renderCandidateDetail(run) {
  const c = findCandidate(run, state.selectedCandidateId);
  if (!c) return;
  const order = visibleCandidates(run);
  const idx = order.findIndex((x) => x.id === c.id);
  /** @type {HTMLButtonElement} */ ($("btn-cand-prev")).disabled = idx <= 0;
  /** @type {HTMLButtonElement} */ ($("btn-cand-next")).disabled = idx < 0 || idx >= order.length - 1;
  $("details-position").textContent = idx >= 0 ? `第 ${idx + 1} / ${order.length} 个` : "";

  $("details-title").textContent = `候选 ${c.id}`;
  const badge = $("details-badge");
  badge.textContent = c.id === run.bestId ? "训练最优" : c.eligible ? "合格" : `不合格 · ${c.reason}`;
  badge.className = `tag ${c.id === run.bestId ? "teal" : c.eligible ? "neutral" : "danger"}`;
  $("details-params-inline").innerHTML = paramsHtml(c.params);

  const hasTest = !!run.dates.testStart;
  const rows = [
    ["年化收益", (m) => fmtPct(m?.ann)],
    ["夏普比率", (m) => fmtFix(m?.sharpe)],
    ["最大回撤", (m) => fmtPct(m?.mdd)],
    ["交易次数", (m) => (m ? String(m.trades) : "—")],
    ["胜率", (m) => fmtPct(m?.win)],
  ];
  $("details-compare").innerHTML = `<tr><th></th>${rows.map(([k]) => `<th>${k}</th>`).join("")}</tr>
    <tr><td>训练集</td>${rows.map(([, f]) => `<td>${f(c.train)}</td>`).join("")}</tr>
    ${hasTest ? `<tr><td>测试集</td>${rows.map(([, f]) => `<td>${f(c.test)}</td>`).join("")}</tr>` : ""}`;

  if (!hasTest) state.detailsDataset = "train";
  const isTrain = state.detailsDataset === "train";
  $("seg-train").setAttribute("aria-pressed", String(isTrain));
  $("seg-test").setAttribute("aria-pressed", String(!isTrain));
  /** @type {HTMLButtonElement} */ ($("seg-test")).disabled = !hasTest;

  const ev = getCandidateEvaluation(run, c);
  const stale = $("details-stale");
  stale.hidden = !!ev;
  if (!ev) {
    stale.innerHTML = `该研究的行情快照（${escHtml(marketLabel(run.request.market))} · ${run.request.market.first} — ${run.request.market.last}）与当前图表行情不一致，无法重算资金曲线与成交明细。
      <button type="button" class="text-button" id="btn-detail-load-snapshot">加载此研究配置</button>`;
    $("btn-detail-load-snapshot").addEventListener("click", () => loadRunSnapshot(run));
  }
  const seg = ev ? (isTrain ? ev.train : ev.test) : null;
  const metrics = seg ? seg.metrics : isTrain ? c.train : c.test;
  let period = isTrain
    ? `训练集 ${run.dates.evalStart} — ${run.dates.trainEnd}`
    : `测试集 ${run.dates.testStart} — ${run.dates.testEnd} · 独立资金、空仓开始`;
  if (seg) {
    const n = seg.notes;
    const extra = [];
    if (n.limitUpSkip) extra.push(`涨停未买入 ${n.limitUpSkip} 次`);
    if (n.limitDownDelay) extra.push(`跌停顺延卖出 ${n.limitDownDelay} 次`);
    if (n.lotSkip) extra.push(`资金不足一手 ${n.lotSkip} 次`);
    if (extra.length) period += ` · ${extra.join(" · ")}`;
  }
  $("details-period-text").textContent = period;
  renderReport("candidate-report", seg, metrics, "训练与测试独立评估（各自初始资金、空仓开始），不拼接净值");

  const sameFormula = isCustomFormulaMode() && hashString(normalizeFormulaSource(getFormulaSource())) === run.request.formula.sourceHash;
  const applyBtn = /** @type {HTMLButtonElement} */ ($("btn-apply-to-chart"));
  applyBtn.disabled = !sameFormula;
  applyBtn.title = sameFormula
    ? "把候选参数写入公式参数当前值，并用全部 K 线重新回测"
    : "当前公式与该研究的公式快照不一致，请先在研究历史中「加载配置」";
}

// ---------- 与图表联动 ----------

/** 把公式参数当前值同步到已挂载的公式绘图（未挂载时不自动挂载） */
function submitFormulaPlot(opts = {}) {
  if (!state.dataLoaded) {
    const ok = loadMarket({ quiet: true, sync: true });
    if (!ok || !state.dataLoaded) {
      toast("行情未就绪", "warn");
      return false;
    }
  }
  const formulaKind = /** @type {HTMLSelectElement} */ ($("select-formula-kind"))?.value;
  if (formulaKind !== "builtin" && !state.validated) {
    const v = runFormulaValidation({ silent: true });
    if (!v.ok) return false;
  }
  const plot = computeFormulaChartPlot();
  const hasLines =
    plot &&
    ((plot.mainLineSeries?.length || 0) > 0 ||
      (plot.subLineSeries?.length || 0) > 0 ||
      (plot.mainOverlaySeries?.length || 0) > 0 ||
      (plot.mainDrawings?.length || 0) > 0 ||
      (plot.subDrawings?.length || 0) > 0 ||
      (plot.overlayDrawings?.length || 0) > 0 ||
      (plot.tradeDrawings?.length || 0) > 0 ||
      (plot.mainOutputs?.length || 0) > 0 ||
      (plot.subOutputs?.length || 0) > 0);
  if (!hasLines) {
    if (!opts.quiet) toast("当前公式无可绘制输出", "warn");
    return false;
  }
  if (typeof ChartPaneInd !== "undefined" && ChartPaneInd.applyFormulaToChartMount) {
    ChartPaneInd.applyFormulaToChartMount(plot);
  } else {
    state.chartFormulaPlot = plot;
    state.chartFormulaPane = getPlotDrawMethod() === "sub" ? "sub" : "main";
    state.chartMount[state.chartFormulaPane] = { kind: "formula" };
    rebuildEffectiveChartPlot();
  }
  state.chartPlotStale = false;
  drawCandleChart();
  if (!opts.quiet) toast("已提交绘图（本地）", "success");
  return true;
}

function isFormulaMountedOnChart() {
  const pane = state.chartFormulaPane;
  return !!pane && state.chartMount?.[pane]?.kind === "formula";
}

/** 候选参数写入当前值 → 重绘 → 回到「策略回测」用全部 K 线复核 */
function applyCandidateToFormula(cid) {
  const run = getRun(state.viewRunId);
  const c = findCandidate(run, cid || state.selectedCandidateId);
  if (!run || !c) return;
  if (!isCustomFormulaMode() || hashString(normalizeFormulaSource(getFormulaSource())) !== run.request.formula.sourceHash) {
    toast("当前公式与该研究的公式快照不一致，已拒绝应用。请先在研究历史中「加载配置」。", "warn");
    return;
  }
  const outOfRange = Object.entries(c.params).filter(([k, v]) => {
    const m = state.paramRangeCache[k];
    return m && isNum(m.min) && isNum(m.max) && (v < m.min || v > m.max);
  });
  if (outOfRange.length) {
    toast(`参数 ${outOfRange.map(([k]) => k).join("、")} 超出当前允许范围，请先调整允许范围`, "warn");
    return;
  }
  applyParameterValues(c.params);
  saveDraft();
  invalidateChartSubmission();
  if (isFormulaMountedOnChart()) submitFormulaPlot({ quiet: true });
  switchResearchTab("backtest");
  const ok = runBacktest({ quiet: true });
  toast(
    ok
      ? `已将候选 ${c.id} 的参数写入当前值，并用全部 K 线重新回测；满意即可保存公式`
      : `已将候选 ${c.id} 的参数写入当前值`,
    "success"
  );
}

// ---------- 研究历史 ----------

function refreshHistoryTable() {
  const tb = $("history-table-body");
  $("history-empty").hidden = state.history.length > 0;
  $("count-history").textContent = String(state.history.length);
  $("history-title-count").textContent = String(state.history.length);
  tb.innerHTML = state.history
    .filter((h) => h.request)
    .map((h) => {
      const cfg = h.request.cfg;
      const m = h.request.market;
      const best = h.candidates.find((c) => c.id === h.bestId);
      const [statusText, tone] = RUN_STATUS[h.status] || ["—", "neutral"];
      const bestText = best ? `${fmtFix(objectiveValue(best.train, cfg.objective))}（${h.bestId}）` : h.status === "completed" ? "无合格候选" : "—";
      return `<tr>
        <td class="mono">${h.id}</td>
        <td>${new Date(h.ts).toLocaleString("zh-CN", { hour12: false })}</td>
        <td>${escHtml(h.request.formula.name)}</td>
        <td>${escHtml(m.symbol)} ${escHtml(m.name || "")} · ${CHART_PERIOD_LABEL[m.period] || m.period}</td>
        <td>${ENGINE_LABEL[cfg.engine]} / ${ALGO_LABEL[cfg.algorithm]}</td>
        <td>${OBJECTIVE_LABEL[cfg.objective]} · ${bestText}</td>
        <td><span class="tag ${tone}">${statusText}</span></td>
        <td>${h.evaluated} / ${h.planned}</td>
        <td class="inline-actions">
          <button type="button" class="text-button hist-view" data-id="${h.id}" ${h.status === "completed" ? "" : "disabled"}>查看结果</button>
          <button type="button" class="hist-load btn-sm" data-id="${h.id}">加载配置</button>
        </td>
      </tr>`;
    })
    .join("");
  tb.querySelectorAll(".hist-view").forEach((b) =>
    b.addEventListener("click", () => {
      const run = getRun(b.getAttribute("data-id"));
      if (!run) return;
      state.viewRunId = run.id;
      state.selectedCandidateId = run.bestId || run.candidates[0]?.id || null;
      state.detailsDataset = "train";
      state.resultsPage = 0;
      state.resultsSort = { key: "rank", dir: 1 };
      state.resultsView = "list";
      switchResearchTab("results");
    })
  );
  tb.querySelectorAll(".hist-load").forEach((b) =>
    b.addEventListener("click", () => {
      const run = getRun(b.getAttribute("data-id"));
      if (run) loadRunSnapshot(run);
    })
  );
}

/** 用历史快照覆盖当前草稿：公式源码、行情口径与全部研究配置 */
function loadRunSnapshot(run) {
  if (state.running) {
    toast("研究运行中，无法加载配置", "warn");
    return;
  }
  const { formula, market, cfg } = run.request;
  const kindEl = /** @type {HTMLSelectElement} */ ($("select-formula-kind"));
  kindEl.value = "custom";
  syncFormulaTemplateSelect("empty");
  applyFormulaTemplate({ blank: true });
  /** @type {HTMLTextAreaElement} */ ($("textarea-formula")).value = formula.source;
  state.workspace.name = formula.name;
  state.workspace.libraryId = null;
  markWorkspaceBaseline(formula.source);
  paintEditor();

  applyMarketSymbolCode(market.symbol);
  state.chartPeriod = market.period;
  state.chartAdj = market.adj;
  syncChartPeriodButtons();
  syncChartAdjButtons();
  const scopeEl = /** @type {HTMLSelectElement} */ ($("select-market-data-scope"));
  if (scopeEl && market.scope) scopeEl.value = market.scope;
  syncMarketDataScopeUI();
  if (market.dateStart) /** @type {HTMLInputElement} */ ($("input-date-start")).value = market.dateStart;
  if (market.dateEnd) /** @type {HTMLInputElement} */ ($("input-date-end")).value = market.dateEnd;
  syncMarketRangeEndDateUI();
  syncChartSymbolHeading(market.symbol);
  loadMarket({ quiet: true, sync: true });

  writeResearchForm(cfg);
  saveDraft();
  state.validated = false;
  resetSyntaxCheckIdle();
  switchResearchTab("config");
  updateResearchBlockedHint();
  if (currentDatasetId() !== market.datasetId) {
    toast("已加载源码与配置，但行情快照与当时不一致（数据源已更新），历史详情无法重算。", "warn");
  } else {
    toast(`已加载研究 ${run.id} 的源码、行情与配置快照，覆盖当前草稿。请重新校验公式；历史结果仍属于原研究。`, "success");
  }
}

const RESEARCH_TABS = ["backtest", "config", "results", "history"];

function switchResearchTab(tab) {
  state.researchTab = tab;
  RESEARCH_TABS.forEach((k) => {
    $(`tab-${k}`)?.setAttribute("aria-selected", k === tab ? "true" : "false");
    const pane = $(`pane-${k}`);
    if (pane) pane.hidden = k !== tab;
  });
  $("research-context").hidden = !(tab === "backtest" || tab === "config");
  if (tab === "backtest") renderBacktestResult();
  if (tab === "config") updateResearchBlockedHint();
  if (tab === "results") renderResults();
  if (tab === "history") refreshHistoryTable();
}

function exportCandidatesCsv() {
  const run = getRun(state.viewRunId);
  if (!run) return;
  const keys = [...new Set(run.candidates.flatMap((c) => Object.keys(c.params)))];
  const head = ["候选", "资格", "不合格原因", ...keys, "训练年化", "训练夏普", "训练卡玛", "训练回撤", "训练交易数", "测试年化", "测试夏普", "测试回撤", "测试交易数"];
  const rows = visibleCandidates(run).map((c) => [
    c.id,
    c.id === run.bestId ? "训练最优" : c.eligible ? "合格" : "不合格",
    c.reason || "",
    ...keys.map((k) => c.params[k] ?? ""),
    c.train.ann, c.train.sharpe, c.train.calmar, c.train.mdd, c.train.trades,
    c.test?.ann ?? "", c.test?.sharpe ?? "", c.test?.mdd ?? "", c.test?.trades ?? "",
  ]);
  const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  downloadBlob(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }), `research-${run.id}-candidates.csv`);
  toast("已导出候选 CSV", "success");
}

function downloadBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function normalizeFormulaSource(s) {
  return String(s ?? "").replace(/\r\n/g, "\n").trim();
}

/** 旧版首屏误存的「自定义均线示例」草稿，应恢复为内置 MA */
function isDefaultCustomMaDraft(d) {
  if (!d || d.kind === "builtin") return false;
  const tpl = d.template === "macd" ? "boll_mai" : d.template;
  if (tpl !== "ma") return false;
  const src = normalizeFormulaSource(d.source);
  return src === normalizeFormulaSource(TEMPLATES.ma) || !src;
}

function readDraftPayload() {
  try {
    const rawV2 = localStorage.getItem(STORAGE_DRAFT);
    if (rawV2) return JSON.parse(rawV2);
    const rawV1 = localStorage.getItem(STORAGE_DRAFT_LEGACY);
    if (!rawV1) return null;
    const d = JSON.parse(rawV1);
    if (isDefaultCustomMaDraft(d)) {
      localStorage.removeItem(STORAGE_DRAFT_LEGACY);
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

function saveDraft() {
  try {
    localStorage.setItem(
      STORAGE_DRAFT,
      JSON.stringify({
        source: $("textarea-formula").value,
        kind: $("select-formula-kind").value,
        template: $("select-formula-template").value,
        dialect: getFormulaDialect(),
        plotDrawMethod: getPlotDrawMethod(),
        paramModel: state.paramRangeCache,
        workspaceName: state.workspace?.name,
      })
    );
    localStorage.removeItem(STORAGE_DRAFT_LEGACY);
    $("formula-draft-saved-hint").textContent = "浏览器草稿已保存";
  } catch {
    $("formula-draft-saved-hint").textContent = "无法写入本地存储";
  }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_DRAFT);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d.kind) $("select-formula-kind").value = d.kind;
    syncFormulaTemplateSelect();
    if (d.template) {
      const leg = d.template === "macd" && d.kind !== "builtin" ? "boll_mai" : d.template;
      const sel = /** @type {HTMLSelectElement} */ ($("select-formula-template"));
      if (sel && [...sel.options].some((o) => o.value === leg)) sel.value = leg;
    }
    if (d.source && d.kind !== "builtin") $("textarea-formula").value = d.source;
    if (d.workspaceName && state.workspace) state.workspace.name = d.workspaceName;
    state.formulaDialect = "tdx";
    if (d.plotDrawMethod === "sub" || d.plotDrawMethod === "main_axis" || d.plotDrawMethod === "main") {
      state.plotDrawMethod = d.plotDrawMethod;
    }
    syncPlotDrawMethodUI();
    applyFormulaTemplate();
    if (d.paramModel) {
      restoreParamMeta(d.paramModel);
      renderParameterTable();
    }
    syncFormulaDialectUI();
  } catch {
    /* ignore */
  }
}

function loadLibrary() {
  try {
    state.library = JSON.parse(localStorage.getItem(STORAGE_LIBRARY) || "[]");
  } catch {
    state.library = [];
  }
  ensureDemoFormulas();
}

/** 「我的公式」：另存为写入、编辑公式选取、引入指标引用；删除入口在「编辑公式」弹窗 */
function removeLibraryFormula(id) {
  state.library = (state.library || []).filter((x) => x.id !== id);
  localStorage.setItem(STORAGE_LIBRARY, JSON.stringify(state.library));
  if (state.workspace?.libraryId === id) state.workspace.libraryId = null;
}

function bindResearchEvents() {
  ["pane-backtest", "pane-config"].forEach((id) => {
    const pane = $(id);
    pane.addEventListener("input", () => updateResearchBlockedHint());
    pane.addEventListener("change", (e) => {
      const t = /** @type {HTMLElement} */ (e.target);
      if (t.id === "research-engine") {
        const algo = /** @type {HTMLSelectElement} */ ($("research-algorithm"));
        if (/** @type {HTMLSelectElement} */ (t).value === "vectorbt" && algo.value === "genetic") algo.value = "grid";
      }
      updateResearchBlockedHint();
    });
  });
  ["param-def-tbody", "param-opt-tbody"].forEach((id) => {
    $(id).addEventListener("input", onParamTableInput);
    $(id).addEventListener("change", onParamTableInput);
  });
  RESEARCH_TABS.forEach((k) => $(`tab-${k}`).addEventListener("click", () => switchResearchTab(k)));

  // 策略回测
  $("btn-run-backtest").addEventListener("click", () => runBacktest());
  $("btn-backtest-rerun").addEventListener("click", () => runBacktest());
  $("btn-backtest-save").addEventListener("click", saveFormulaFromResearch);
  $("btn-plot-only-save").addEventListener("click", saveFormulaFromResearch);
  $("btn-goto-optimize").addEventListener("click", () => {
    switchResearchTab("config");
    $("research-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // 参数优化
  $("btn-switch-legacy").addEventListener("click", () => {
    /** @type {HTMLSelectElement} */ ($("research-engine")).value = "legacy";
    updateResearchBlockedHint();
  });
  $("btn-edit-conditions").addEventListener("click", () => {
    switchResearchTab("backtest");
    $("backtest-conditions").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("btn-add-constraint").addEventListener("click", () => {
    const defs = getParameterDefinitions();
    if (defs.length >= 2) addConstraintRow({ left: defs[0].key, op: "<", right: defs[1].key, label: "" });
    else addConstraintRow();
  });
  $("btn-start-research").addEventListener("click", openConfirmDialog);
  $("confirm-cancel").addEventListener("click", () => {
    state.pendingRequest = null;
    $("dialog-confirm-research").close();
  });
  $("confirm-ok").addEventListener("click", () => {
    $("dialog-confirm-research").close();
    startResearchRun();
  });
  $("btn-cancel-run").addEventListener("click", () => {
    state.runCancel = true;
    $("run-progress-label").textContent = "正在取消…";
  });

  // 优化结果
  $("results-only-eligible").addEventListener("change", (e) => {
    state.resultsOnlyEligible = /** @type {HTMLInputElement} */ (e.target).checked;
    state.resultsPage = 0;
    renderResults();
  });
  $("results-list-view").addEventListener("click", (e) => {
    const t = /** @type {HTMLElement} */ (e.target);
    const act = t.closest("[data-act]");
    if (act) {
      const cid = act.getAttribute("data-cid");
      if (act.getAttribute("data-act") === "apply") applyCandidateToFormula(cid);
      else openCandidateDetail(cid);
      return;
    }
    const tr = t.closest("tr[data-cid]");
    if (tr) openCandidateDetail(tr.getAttribute("data-cid"));
  });
  $("results-list-view").addEventListener("keydown", (e) => {
    const tr = /** @type {HTMLElement} */ (e.target).closest?.("tr[data-cid]");
    if (tr && e.key === "Enter") openCandidateDetail(tr.getAttribute("data-cid"));
  });
  $("btn-detail-back").addEventListener("click", backToResultsList);
  const step = (d) => {
    const run = getRun(state.viewRunId);
    if (!run) return;
    const order = visibleCandidates(run);
    const i = order.findIndex((x) => x.id === state.selectedCandidateId);
    const next = order[i + d];
    if (!next) return;
    state.resultsPage = Math.floor((i + d) / RESULTS_PAGE_SIZE);
    state.selectedCandidateId = next.id;
    renderResults();
  };
  $("btn-cand-prev").addEventListener("click", () => step(-1));
  $("btn-cand-next").addEventListener("click", () => step(1));
  $("seg-train").addEventListener("click", () => {
    state.detailsDataset = "train";
    renderResults();
  });
  $("seg-test").addEventListener("click", () => {
    state.detailsDataset = "test";
    renderResults();
  });
  $("btn-apply-to-chart").addEventListener("click", () => applyCandidateToFormula());
  // 研究历史
  $("btn-refresh-history").addEventListener("click", () => {
    try {
      state.history = JSON.parse(localStorage.getItem(STORAGE_HISTORY) || "[]").filter((h) => h.request);
    } catch {
      /* 保留内存中的列表 */
    }
    refreshHistoryTable();
    toast("历史列表已刷新", "success");
  });
  $("btn-export-snapshot").addEventListener("click", () => {
    const run = getRun(state.viewRunId);
    if (!run) return;
    downloadBlob(new Blob([JSON.stringify(compactRunForStorage(run), null, 2)], { type: "application/json" }), `research-snapshot-${run.id}.json`);
    toast("已导出 JSON", "success");
  });
  $("btn-export-csv").addEventListener("click", exportCandidatesCsv);
}

function init() {
  loadLibrary();
  try {
    state.history = JSON.parse(localStorage.getItem(STORAGE_HISTORY) || "[]").filter((h) => h.request);
  } catch {
    state.history = [];
  }
  bindResearchEvents();
  refreshHistoryTable();

  syncFormulaTemplateSelect();
  syncMarketDataScopeUI();
  bindMarketToolbarLayout();
  bindFormulaToolbarLayout();
  bindChartPanelLayout();
  initDefaultMarketDates();
  syncMarketRangeEndDateUI();
  syncMarketStreamAvailability();
  const draft = readDraftPayload();
  if (!draft || isDefaultCustomMaDraft(draft)) {
    applyDefaultFormulaWorkspace();
    saveDraft();
  } else {
    loadDraft();
  }
  paintEditor();
  bindChartInteraction();
  updatePlotLegend(null);
  syncChartAdjButtons();
  syncChartPeriodButtons();
  // 首屏仅此一次自动加载：000001 · 默认 · 500 根日线；标的设置变更后须点「读取行情」
  requestAnimationFrame(() => {
    loadMarket({ quiet: true, sync: true, skipRedrawFrame: true });
  });
  resetSyntaxCheckIdle();
  markWorkspaceBaseline(getFormulaSource());
  syncFormulaDialectUI();
  syncPlotDrawMethodUI();
  $("select-formula-dialect")?.addEventListener("change", (e) => {
    const v = /** @type {HTMLSelectElement} */ (e.target).value;
    setFormulaDialect(v === "tdx" ? "tdx" : "my");
    invalidateChartSubmission();
  });
  $("select-plot-draw-method")?.addEventListener("change", (e) => {
    const v = /** @type {HTMLSelectElement} */ (e.target).value;
    state.plotDrawMethod = v === "sub" || v === "main_axis" ? v : "main";
    invalidateChartSubmission();
    saveDraft();
  });
  if (typeof FormulaEditorUI !== "undefined") FormulaEditorUI.init();
  if (typeof ChartPaneInd !== "undefined") ChartPaneInd.init();
  if (typeof FormulaCaretTools !== "undefined") FormulaCaretTools.init();
  if (typeof SymbolSearch !== "undefined") SymbolSearch.init();
  syncChartSymbolHeading(getMarketSymbolCode());

  const taFormula = /** @type {HTMLTextAreaElement} */ ($("textarea-formula"));
  taFormula.addEventListener("input", () => {
    state.validated = false;
    invalidateChartSubmission();
    lastMaiCheck = null;
    setFormulaStatus(false);
    paintEditor();
    renderParameterTable();
    saveDraft();
    syncWorkspaceDirty();
    resetSyntaxCheckIdle();
    updateResearchBlockedHint();
  });
  taFormula.addEventListener("scroll", () => {
    const pre = $("formula-highlight");
    const gut = $("code-gutter");
    if (pre) {
      pre.scrollTop = taFormula.scrollTop;
      pre.scrollLeft = taFormula.scrollLeft;
    }
    if (gut) gut.scrollTop = taFormula.scrollTop;
  });
  taFormula.addEventListener("keyup", updateCaretBar);
  taFormula.addEventListener("click", updateCaretBar);

  $("select-formula-kind").addEventListener("change", () => {
    syncFormulaTemplateSelect();
    applyFormulaTemplate();
    saveDraft();
  });
  $("select-formula-template").addEventListener("change", () => {
    applyFormulaTemplate();
    saveDraft();
  });

  $("btn-load-market").addEventListener("click", () => loadMarket());
  $("btn-chart-refresh").addEventListener("click", () => resetChartPanesToDefault());

  const symInput = $("input-symbol");
  $("select-market-data-scope")?.addEventListener("change", () => {
    syncMarketDataScopeUI();
    if (getMarketDataScope() === "range") initRangeMarketDates();
    syncMarketRangeEndDateUI();
    syncMarketStreamAvailability();
  });
  $("input-date-end")?.addEventListener("change", () => {
    syncMarketRangeEndDateUI();
    syncMarketStreamAvailability();
  });
  $("input-date-start")?.addEventListener("change", () => {
    syncMarketRangeEndDateUI();
    syncMarketStreamAvailability();
  });

  $("btn-validate-formula").addEventListener("click", () => {
    runFormulaValidation();
  });

  document.querySelectorAll("[data-chart-adj]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-chart-adj");
      if (!mode || mode === state.chartAdj) return;
      state.chartAdj = /** @type {'qfq'|'hfq'|'none'} */ (mode);
      syncChartAdjButtons();
      if (state.dataLoaded) loadMarket({ quiet: true });
    });
  });

  document.querySelectorAll("[data-chart-period]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = btn.getAttribute("data-chart-period");
      if (!p || p === state.chartPeriod) return;
      state.chartPeriod = /** @type {typeof state.chartPeriod} */ (p);
      syncChartPeriodButtons();
      loadMarket({ quiet: true });
    });
  });

  $("btn-submit-chart").addEventListener("click", () => submitFormulaPlot());

  const chartStage = $("chart-stage");
  if (chartStage && typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => {
      if (state.dataLoaded) drawCandleChart();
    });
    ro.observe(chartStage);
  }

  window.addEventListener("resize", () => {
    drawCandleChart();
    redrawReports();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const metaM = $("formula-meta-mask");
      const fnM = $("fn-dialog-mask");
      const indM = $("ind-dialog-mask");
      if (metaM && !metaM.hidden) {
        metaM.hidden = true;
        metaM.classList.remove("show");
        return;
      }
      if (fnM && !fnM.hidden) {
        fnM.hidden = true;
        fnM.classList.remove("show");
        return;
      }
      if (indM && !indM.hidden) {
        indM.hidden = true;
        indM.classList.remove("show");
        return;
      }
      const dlg = /** @type {HTMLDialogElement} */ ($("dialog-confirm-research"));
      if (dlg.open) {
        state.pendingRequest = null;
        dlg.close();
      }
    }
  });

  updateResearchBlockedHint();
}

init();
