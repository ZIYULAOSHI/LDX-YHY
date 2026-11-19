/**
 * 指标注册表（原型数据层）· 工作台与指标管理后台共用
 * 量产时由服务端承载；此处以 localStorage 模拟，行为（状态机、权限、日志）与规格一致。
 */
(function (global) {
  const STORAGE_KEY = "qlab_indicator_registry_v2";
  const STORAGE_USER = "qlab_current_user_v1";

  const USERS = [
    { id: "u_author", name: "张研", role: "author", team: "量化研究组" },
    { id: "u_author2", name: "陈策", role: "author", team: "量化研究组" },
    { id: "u_reviewer", name: "李审", role: "reviewer", team: "投研风控" },
    { id: "u_engineer", name: "王工", role: "engineer", team: "指标研发" },
    { id: "u_operator", name: "赵运营", role: "operator", team: "产品运营" },
    { id: "u_admin", name: "平台管理员", role: "admin", team: "平台" },
  ];

  const ROLES = {
    author: { label: "指标研究员", desc: "编写调试指标、保存版本、提交审核" },
    reviewer: { label: "审核员", desc: "审核指标版本的逻辑与合规性" },
    engineer: { label: "研发工程师", desc: "语义转换、云端计算接入，回填接入结果" },
    operator: { label: "发布运营", desc: "设定生产版本、各渠道上下架与灰度" },
    admin: { label: "平台管理员", desc: "全部能力 + 成员与权限配置" },
    viewer: { label: "只读访客", desc: "仅查看已公开指标" },
  };

  /** 平台级能力矩阵（指标级 ACL 在 can() 中叠加判断） */
  const CAPS = {
    create: ["author", "admin"],
    edit: ["author", "admin"],
    submit: ["author", "admin"],
    withdraw: ["author", "admin"],
    review: ["reviewer", "admin"],
    integrate: ["engineer", "admin"],
    setProd: ["operator", "admin"],
    channel: ["operator", "admin"],
    rollback: ["operator", "admin"],
    acl: ["author", "admin"],
    archive: ["admin"],
    members: ["admin"],
    viewSource: ["author", "reviewer", "engineer", "admin"],
  };

  const CAP_LABELS = {
    create: "新建指标",
    edit: "编辑 / 保存版本",
    submit: "提交审核",
    withdraw: "撤回审核",
    review: "审核通过 / 驳回",
    integrate: "回填接入结果",
    setProd: "设为生产版本",
    channel: "渠道上架 / 下架 / 灰度",
    rollback: "版本回滚",
    acl: "指标协作者与可见范围",
    archive: "归档指标",
    members: "成员与角色管理",
    viewSource: "查看公式源码",
  };

  const VERSION_STATUS = {
    draft: { label: "草稿", tone: "neutral" },
    reviewing: { label: "待审核", tone: "warn" },
    rejected: { label: "已驳回", tone: "danger" },
    integrating: { label: "接入中", tone: "info" },
    ready: { label: "待发布", tone: "teal" },
    online: { label: "生产中", tone: "online" },
    retired: { label: "历史版本", tone: "neutral" },
  };

  const CHANNELS = [
    { key: "app", label: "手机 App", desc: "iOS / Android 行情图表" },
    { key: "pc", label: "PC 客户端", desc: "桌面端 K 线指标" },
    { key: "web", label: "网页版", desc: "Web 行情页" },
    { key: "mini", label: "小程序", desc: "微信小程序" },
    { key: "openapi", label: "开放接口", desc: "机构 / 合作方 API 订阅" },
  ];

  const CHANNEL_STATUS = {
    off: { label: "未上架", tone: "neutral" },
    gray: { label: "灰度中", tone: "warn" },
    on: { label: "已上架", tone: "online" },
    down: { label: "已下架", tone: "danger" },
  };

  const CATEGORIES = ["趋势", "震荡", "量能", "资金", "波动", "形态", "择时策略", "其他"];

  const PERIODS = [
    { key: "1m", label: "1分" },
    { key: "5m", label: "5分" },
    { key: "15m", label: "15分" },
    { key: "30m", label: "30分" },
    { key: "60m", label: "60分" },
    { key: "day", label: "日线" },
    { key: "week", label: "周线" },
    { key: "month", label: "月线" },
  ];

  const UNIVERSES = {
    a_share: "全部 A 股",
    etf: "场内 ETF",
    index: "指数",
    a_etf_index: "A 股 + ETF + 指数",
    custom: "自定义标的池",
  };

  const TRIGGERS = {
    eod: "收盘后批量计算（T 日 15:30 后）",
    realtime: "盘中实时计算（随最新 Bar 增量）",
  };

  const VISIBILITY = {
    private: "仅负责人与协作者",
    team: "本团队可见",
    public: "平台内全员可见",
  };

  // ---------- 工具 ----------

  const now = () => Date.now();
  const DAY = 86400000;

  function uid(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
  }

  function hash(s) {
    let h = 2166136261;
    const str = String(s || "");
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, "0");
  }

  function userById(id) {
    return USERS.find((u) => u.id === id) || { id, name: id || "—", role: "viewer", team: "" };
  }

  function fmtTime(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  /**
   * 从源码解析输出字段：通达信 `名称:表达式`（非 :=）、麦语言 PLOT、以及 BUY(条件,位置)/SELL(条件,位置) 交易信号。
   * 输出字段即「下发契约」——C 端与云端计算按字段 key 对齐。
   */
  function parseOutputs(source) {
    const src = String(source || "").replace(/\{[^}]*\}/g, "").replace(/\/\/.*$/gm, "");
    const out = [];
    const seen = new Set();
    const push = (key, o) => {
      const k = key.toUpperCase();
      if (seen.has(k)) return;
      seen.add(k);
      out.push({ key: k, label: o.label || k, kind: o.kind || "line", pane: o.pane || "main", precision: 2, publish: true });
    };
    let m;
    const reTdx = /^\s*([A-Za-z_\u4e00-\u9fa5][\w\u4e00-\u9fa5]*)\s*:(?!=)\s*[^;]+/gm;
    while ((m = reTdx.exec(src))) push(m[1], {});
    const rePlot = /\bPLOT\s+([A-Za-z_][\w]*)\s+ON\s+(MAIN|SUB)(?:[^;]*?LABEL\s+"([^"]+)")?/gi;
    while ((m = rePlot.exec(src))) push(m[1], { pane: m[2].toUpperCase() === "SUB" ? "sub" : "main", label: m[3] });
    ["BUY", "SELL"].forEach((sig) => {
      if (new RegExp(`(^|[^\\w])${sig}\\s*(\\(|:=?)`, "im").test(src)) push(sig, { kind: "signal", label: sig === "BUY" ? "买入信号" : "卖出信号" });
    });
    return out;
  }

  /** 两个版本输出字段差异：删除/改类型为破坏性变更 */
  function diffOutputs(prev, next) {
    const pk = new Map((prev || []).filter((o) => o.publish).map((o) => [o.key, o]));
    const nk = new Map((next || []).filter((o) => o.publish).map((o) => [o.key, o]));
    const removed = [...pk.keys()].filter((k) => !nk.has(k));
    const added = [...nk.keys()].filter((k) => !pk.has(k));
    const changed = [...nk.keys()].filter((k) => pk.has(k) && (pk.get(k).kind !== nk.get(k).kind || pk.get(k).pane !== nk.get(k).pane));
    return { removed, added, changed, breaking: removed.length > 0 || changed.length > 0 };
  }

  function diffParams(prev, next) {
    const a = prev || {};
    const b = next || {};
    const removed = Object.keys(a).filter((k) => !(k in b));
    const added = Object.keys(b).filter((k) => !(k in a));
    const changed = Object.keys(b).filter((k) => k in a && (a[k].def !== b[k].def || a[k].min !== b[k].min || a[k].max !== b[k].max));
    return { removed, added, changed };
  }

  /** 简易逐行 diff（LCS），供版本对比展示 */
  function lineDiff(a, b) {
    const A = String(a || "").split("\n");
    const B = String(b || "").split("\n");
    const n = A.length;
    const m = B.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const res = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (A[i] === B[j]) {
        res.push({ t: "=", s: A[i] });
        i++;
        j++;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) res.push({ t: "-", s: A[i++] });
      else res.push({ t: "+", s: B[j++] });
    }
    while (i < n) res.push({ t: "-", s: A[i++] });
    while (j < m) res.push({ t: "+", s: B[j++] });
    return res;
  }

  // ---------- 存储 ----------

  let db = null;

  function emptyChannels() {
    const c = {};
    CHANNELS.forEach((ch) => (c[ch.key] = { status: "off", grayPct: 0, whitelist: "", downMode: "", reason: "", updatedAt: 0, updatedBy: "" }));
    return c;
  }

  function seed() {
    const t = now();
    const mk = (o) => ({
      id: o.id,
      code: o.code,
      name: o.name,
      displayName: o.displayName || o.name,
      category: o.category,
      summary: o.summary,
      tags: o.tags || [],
      owner: o.owner,
      collaborators: o.collaborators || [],
      visibility: o.visibility || "team",
      archived: false,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      prodVersion: o.prodVersion ?? null,
      versions: o.versions,
      channels: Object.assign(emptyChannels(), o.channels || {}),
      logs: o.logs || [],
    });
    const calcDay = { periods: ["day", "week"], universe: "a_etf_index", trigger: "eod", lookback: 500 };
    const macdSrc = `SHORT:=12;\nLONG:=26;\nMID:=9;\nDIF:EMA(CLOSE,SHORT)-EMA(CLOSE,LONG);\nDEA:EMA(DIF,MID);\nMACD:(DIF-DEA)*2,COLORSTICK;`;
    const macdSrcV2 = `SHORT:=12;\nLONG:=26;\nMID:=9;\nDIF:EMA(CLOSE,SHORT)-EMA(CLOSE,LONG);\nDEA:EMA(DIF,MID);\nMACD:(DIF-DEA)*2,COLORSTICK;\n金叉:CROSS(DIF,DEA),NODRAW;`;
    const macdParams = {
      SHORT: { type: "INT", def: 12, value: 12, min: 5, max: 30, step: 1 },
      LONG: { type: "INT", def: 26, value: 26, min: 13, max: 60, step: 1 },
      MID: { type: "INT", def: 9, value: 9, min: 3, max: 20, step: 1 },
    };
    const sub = (arr) => arr.map((o) => ({ ...o, pane: "sub" }));
    const trendSrc = `N:=20;\nM:=60;\n多空线:EMA(CLOSE,N);\n生命线:MA(CLOSE,M);\nBUY(CROSS(多空线,生命线),LOW);\nSELL(CROSS(生命线,多空线),HIGH);`;
    const trendParams = {
      N: { type: "INT", def: 20, value: 20, min: 5, max: 60, step: 1 },
      M: { type: "INT", def: 60, value: 60, min: 20, max: 250, step: 5 },
    };
    const volSrc = `N:=5;\n量比:VOL/REF(MA(VOL,N),1);\n放量:IF(量比>2,量比,0),COLORSTICK;`;
    const volParams = { N: { type: "INT", def: 5, value: 5, min: 3, max: 20, step: 1 } };
    const fundSrc = `N:=10;\n主力净额:SUM((CLOSE-OPEN)/(HIGH-LOW+0.01)*AMOUNT,N)/10000;\n主力强度:EMA(主力净额,3);`;
    const fundParams = { N: { type: "INT", def: 10, value: 10, min: 5, max: 30, step: 1 } };

    const v = (no, status, source, params, outputs, extra = {}) => ({
      no,
      status,
      source,
      dialect: "tdx",
      paramMeta: params,
      outputs,
      calc: extra.calc || calcDay,
      note: extra.note || "",
      createdBy: extra.by || "u_author",
      createdAt: extra.at || t - 10 * DAY,
      review: extra.review || null,
      integration: extra.integration || null,
      publishedAt: extra.publishedAt || 0,
      hash: hash(source),
    });
    const log = (at, user, action, detail) => ({ ts: at, user, action, detail });

    return {
      seq: 100026,
      indicators: [
        mk({
          id: "ind_macd_plus",
          code: "IND_100021",
          name: "MACD 增强",
          displayName: "MACD 金叉增强",
          category: "趋势",
          summary: "在经典 MACD 基础上增加金叉信号字段，便于 C 端直接标注。",
          tags: ["经典", "信号"],
          owner: "u_author",
          collaborators: [{ userId: "u_author2", role: "editor" }],
          visibility: "public",
          createdAt: t - 40 * DAY,
          updatedAt: t - 2 * DAY,
          prodVersion: 2,
          versions: [
            v(1, "retired", macdSrc, macdParams, sub(parseOutputs(macdSrc)), {
              note: "首版：经典 MACD 三线",
              at: t - 40 * DAY,
              review: { by: "u_reviewer", at: t - 39 * DAY, result: "pass", comment: "逻辑与通达信一致" },
              integration: { by: "u_engineer", at: t - 37 * DAY, result: "done", note: "历史回算 2015 至今完成" },
              publishedAt: t - 36 * DAY,
            }),
            v(2, "online", macdSrcV2, macdParams, sub(parseOutputs(macdSrcV2)), {
              note: "新增「金叉」信号字段",
              at: t - 9 * DAY,
              review: { by: "u_reviewer", at: t - 8 * DAY, result: "pass", comment: "新增字段为增量变更，可直接发布" },
              integration: { by: "u_engineer", at: t - 6 * DAY, result: "done", note: "新增字段已回算" },
              publishedAt: t - 5 * DAY,
            }),
          ],
          channels: {
            app: { status: "on", grayPct: 100, whitelist: "", updatedAt: t - 30 * DAY, updatedBy: "u_operator" },
            pc: { status: "on", grayPct: 100, whitelist: "", updatedAt: t - 30 * DAY, updatedBy: "u_operator" },
            web: { status: "gray", grayPct: 20, whitelist: "内测用户组", updatedAt: t - 3 * DAY, updatedBy: "u_operator" },
          },
          logs: [
            log(t - 40 * DAY, "u_author", "创建指标", "从工作台保存 v1"),
            log(t - 39 * DAY, "u_reviewer", "审核通过", "v1 · 逻辑与通达信一致"),
            log(t - 37 * DAY, "u_engineer", "接入完成", "v1 · 历史回算 2015 至今完成"),
            log(t - 36 * DAY, "u_operator", "设为生产版本", "v1"),
            log(t - 30 * DAY, "u_operator", "渠道上架", "手机 App、PC 客户端 · 全量"),
            log(t - 9 * DAY, "u_author", "保存版本并提交审核", "v2 · 新增「金叉」信号字段"),
            log(t - 8 * DAY, "u_reviewer", "审核通过", "v2"),
            log(t - 6 * DAY, "u_engineer", "接入完成", "v2"),
            log(t - 5 * DAY, "u_operator", "设为生产版本", "v2（v1 转为历史版本，已上架渠道自动切换）"),
            log(t - 3 * DAY, "u_operator", "渠道灰度", "网页版 · 20% · 内测用户组"),
          ],
        }),
        mk({
          id: "ind_trend_life",
          code: "IND_100022",
          name: "多空生命线",
          category: "择时策略",
          summary: "EMA 多空线与 MA 生命线交叉择时，含 BUY / SELL 信号。",
          tags: ["择时"],
          owner: "u_author",
          visibility: "team",
          createdAt: t - 6 * DAY,
          updatedAt: t - 1 * DAY,
          versions: [
            v(1, "reviewing", trendSrc, trendParams, parseOutputs(trendSrc), {
              note: "首版，日线回测夏普 1.12",
              at: t - 1 * DAY,
              calc: { periods: ["day"], universe: "a_share", trigger: "eod", lookback: 500 },
            }),
          ],
          logs: [log(t - 1 * DAY, "u_author", "保存版本并提交审核", "v1 · 首版，日线回测夏普 1.12")],
        }),
        mk({
          id: "ind_vol_ratio",
          code: "IND_100023",
          name: "放量量比",
          category: "量能",
          summary: "量比与放量柱，识别异常放量。",
          owner: "u_author2",
          visibility: "public",
          createdAt: t - 12 * DAY,
          updatedAt: t - 2 * DAY,
          versions: [
            v(1, "integrating", volSrc, volParams, sub(parseOutputs(volSrc)), {
              by: "u_author2",
              note: "首版",
              at: t - 4 * DAY,
              calc: { periods: ["5m", "30m", "day"], universe: "a_share", trigger: "realtime", lookback: 500 },
              review: { by: "u_reviewer", at: t - 2 * DAY, result: "pass", comment: "盘中实时计算，请研发评估算力" },
            }),
          ],
          logs: [
            log(t - 4 * DAY, "u_author2", "保存版本并提交审核", "v1"),
            log(t - 2 * DAY, "u_reviewer", "审核通过", "v1 · 盘中实时计算，请研发评估算力"),
          ],
        }),
        mk({
          id: "ind_main_fund",
          code: "IND_100024",
          name: "主力强度",
          category: "资金",
          summary: "基于价量估算的主力资金净额与强度。",
          owner: "u_author",
          visibility: "public",
          createdAt: t - 60 * DAY,
          updatedAt: t - 7 * DAY,
          prodVersion: 1,
          versions: [
            v(1, "online", fundSrc, fundParams, sub(parseOutputs(fundSrc)), {
              note: "首版",
              at: t - 60 * DAY,
              review: { by: "u_reviewer", at: t - 59 * DAY, result: "pass", comment: "" },
              integration: { by: "u_engineer", at: t - 57 * DAY, result: "done", note: "" },
              publishedAt: t - 56 * DAY,
            }),
          ],
          channels: {
            app: { status: "down", grayPct: 0, downMode: "soft", reason: "口径与 Level-2 资金流存在偏差，待优化", updatedAt: t - 7 * DAY, updatedBy: "u_operator" },
            pc: { status: "down", grayPct: 0, downMode: "soft", reason: "口径与 Level-2 资金流存在偏差，待优化", updatedAt: t - 7 * DAY, updatedBy: "u_operator" },
          },
          logs: [
            log(t - 56 * DAY, "u_operator", "设为生产版本", "v1"),
            log(t - 50 * DAY, "u_operator", "渠道上架", "手机 App、PC 客户端 · 全量"),
            log(t - 7 * DAY, "u_operator", "渠道下架", "手机 App、PC 客户端 · 软下架 · 口径与 Level-2 资金流存在偏差，待优化"),
          ],
        }),
        mk({
          id: "ind_boll_draft",
          code: "IND_100025",
          name: "布林收口",
          category: "波动",
          summary: "布林带宽度收窄识别变盘。",
          owner: "u_author",
          visibility: "private",
          createdAt: t - 3 * DAY,
          updatedAt: t - 3 * DAY,
          versions: [
            v(1, "rejected", `N:=20;\nMID:MA(CLOSE,N);\nUPPER:MID+2*STD(CLOSE,N);\nLOWER:MID-2*STD(CLOSE,N);\n带宽:(UPPER-LOWER)/MID;`, { N: { type: "INT", def: 20, value: 20, min: 10, max: 60, step: 1 } }, parseOutputs(`MID:1;UPPER:1;LOWER:1;\n带宽:1;`), {
              note: "首版",
              at: t - 3 * DAY,
              review: { by: "u_reviewer", at: t - 2 * DAY, result: "reject", comment: "「带宽」字段请补充精度与单位说明；MID 未做停牌处理" },
            }),
          ],
          logs: [
            log(t - 3 * DAY, "u_author", "保存版本并提交审核", "v1"),
            log(t - 2 * DAY, "u_reviewer", "审核驳回", "v1 · 「带宽」字段请补充精度与单位说明；MID 未做停牌处理"),
          ],
        }),
      ],
    };
  }

  function load() {
    if (db) return db;
    try {
      db = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      db = null;
    }
    if (!db || !Array.isArray(db.indicators)) {
      db = seed();
      persist();
    }
    Object.entries(db.userRoles || {}).forEach(([id, role]) => {
      const u = USERS.find((x) => x.id === id);
      if (u) u.role = role;
    });
    return db;
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      /* ignore */
    }
  }

  function reload() {
    db = null;
    return load();
  }

  const DEFAULT_ROLES = Object.fromEntries(USERS.map((u) => [u.id, u.role]));

  function resetDemo() {
    USERS.forEach((u) => (u.role = DEFAULT_ROLES[u.id]));
    db = seed();
    persist();
    return db;
  }

  // ---------- 当前用户 ----------

  function currentUser() {
    load();
    let id = "u_author";
    try {
      id = localStorage.getItem(STORAGE_USER) || id;
    } catch {
      /* ignore */
    }
    return userById(id);
  }

  function setCurrentUser(id) {
    try {
      localStorage.setItem(STORAGE_USER, id);
    } catch {
      /* ignore */
    }
  }

  // ---------- 查询 ----------

  function list() {
    return load().indicators;
  }

  function get(id) {
    return load().indicators.find((x) => x.id === id) || null;
  }

  function latestVersion(ind) {
    return ind.versions[ind.versions.length - 1] || null;
  }

  function prodVersionOf(ind) {
    return ind.prodVersion ? ind.versions.find((v) => v.no === ind.prodVersion) || null : null;
  }

  /** 在途版本：草稿/待审核/接入中/待发布（同一时刻最多 1 个，避免并行发布互相覆盖） */
  function pendingVersion(ind) {
    return ind.versions.find((v) => ["draft", "reviewing", "integrating", "ready", "rejected"].includes(v.status)) || null;
  }

  function liveChannels(ind) {
    return CHANNELS.filter((c) => ["on", "gray"].includes(ind.channels[c.key]?.status));
  }

  /** 指标整体状态（列表展示用，由版本状态与渠道状态推导） */
  function overallStatus(ind) {
    if (ind.archived) return { key: "archived", label: "已归档", tone: "neutral" };
    if (liveChannels(ind).length) return { key: "online", label: "已上架", tone: "online" };
    const p = pendingVersion(ind);
    if (!ind.prodVersion) {
      if (!p) return { key: "draft", label: "草稿", tone: "neutral" };
      return { key: p.status, label: VERSION_STATUS[p.status].label, tone: VERSION_STATUS[p.status].tone };
    }
    const everDown = CHANNELS.some((c) => ind.channels[c.key]?.status === "down");
    if (everDown) return { key: "down", label: "已下架", tone: "danger" };
    return { key: "ready_to_list", label: "待上架", tone: "teal" };
  }

  function visibleTo(ind, user) {
    if (user.role === "admin" || user.role === "reviewer" || user.role === "engineer" || user.role === "operator") return true;
    if (ind.owner === user.id || ind.collaborators.some((c) => c.userId === user.id)) return true;
    if (ind.visibility === "public") return true;
    if (ind.visibility === "team") return userById(ind.owner).team === user.team;
    return false;
  }

  /**
   * 权限判断：平台角色能力 ∩ 指标级 ACL ∩ 状态前置条件
   * @returns {{ok:boolean, reason?:string}}
   */
  function can(user, action, ind, version) {
    const roles = CAPS[action] || [];
    if (!roles.includes(user.role)) return { ok: false, reason: `需要「${roles.map((r) => ROLES[r].label).join(" / ")}」角色` };
    if (!ind || user.role === "admin") return precheck(action, ind, version, user);
    const isOwner = ind.owner === user.id;
    const isEditor = ind.collaborators.some((c) => c.userId === user.id && c.role === "editor");
    if (["edit", "submit", "withdraw"].includes(action) && !isOwner && !isEditor) return { ok: false, reason: "仅负责人或编辑协作者可操作" };
    if (action === "acl" && !isOwner) return { ok: false, reason: "仅负责人可修改协作者与可见范围" };
    return precheck(action, ind, version, user);
  }

  function precheck(action, ind, version, user) {
    if (!ind) return { ok: true };
    if (ind.archived && action !== "archive") return { ok: false, reason: "指标已归档" };
    const st = version?.status;
    switch (action) {
      case "submit":
        return st === "draft" || st === "rejected" ? { ok: true } : { ok: false, reason: "仅草稿或已驳回的版本可提交" };
      case "withdraw":
        return st === "reviewing" ? { ok: true } : { ok: false, reason: "仅待审核版本可撤回" };
      case "review":
        if (st !== "reviewing") return { ok: false, reason: "该版本不在待审核状态" };
        if (version.createdBy === user.id) return { ok: false, reason: "不能审核自己提交的版本" };
        return { ok: true };
      case "integrate":
        return st === "integrating" ? { ok: true } : { ok: false, reason: "该版本不在接入中" };
      case "setProd":
        return st === "ready" ? { ok: true } : { ok: false, reason: "仅「待发布」版本可设为生产" };
      case "rollback":
        return st === "retired" && version.integration?.result === "done" ? { ok: true } : { ok: false, reason: "仅已接入过的历史版本可回滚" };
      case "channel":
        return ind.prodVersion ? { ok: true } : { ok: false, reason: "尚无生产版本，无法上架" };
      default:
        return { ok: true };
    }
  }

  // ---------- 变更 ----------

  function addLog(ind, user, action, detail) {
    ind.logs.push({ ts: now(), user: user.id, action, detail: detail || "" });
    ind.updatedAt = now();
  }

  function nextCode() {
    const d = load();
    d.seq = (d.seq || 100000) + 1;
    return `IND_${d.seq}`;
  }

  /**
   * 工作台保存版本：无 indicatorId 则新建指标；有则追加版本。
   * 若已存在在途的草稿/驳回版本，覆盖之（避免版本号膨胀）；待审核/接入中/待发布时拒绝。
   */
  function saveVersion(payload, user, opts = {}) {
    const d = load();
    let ind = payload.indicatorId ? get(payload.indicatorId) : null;
    const meta = payload.meta;
    if (!ind) {
      const c = can(user, "create");
      if (!c.ok) return { ok: false, reason: c.reason };
      ind = {
        id: uid("ind"),
        code: nextCode(),
        name: meta.name,
        displayName: meta.displayName || meta.name,
        category: meta.category,
        summary: meta.summary,
        tags: meta.tags || [],
        owner: user.id,
        collaborators: [],
        visibility: meta.visibility || "team",
        archived: false,
        createdAt: now(),
        updatedAt: now(),
        prodVersion: null,
        versions: [],
        channels: emptyChannels(),
        logs: [],
      };
      d.indicators.unshift(ind);
      addLog(ind, user, "创建指标", `编码 ${ind.code}`);
    } else {
      const c = can(user, "edit", ind);
      if (!c.ok) return { ok: false, reason: c.reason };
      Object.assign(ind, {
        name: meta.name,
        displayName: meta.displayName || meta.name,
        category: meta.category,
        summary: meta.summary,
        tags: meta.tags || ind.tags,
      });
    }
    const pend = pendingVersion(ind);
    if (pend && ["reviewing", "integrating", "ready"].includes(pend.status)) {
      return { ok: false, reason: `v${pend.no} 正在「${VERSION_STATUS[pend.status].label}」，请等待流转完成或先撤回` };
    }
    const ver = {
      no: pend ? pend.no : (ind.versions.reduce((mx, x) => Math.max(mx, x.no), 0) + 1),
      status: "draft",
      source: payload.source,
      dialect: payload.dialect || "tdx",
      paramMeta: payload.paramMeta || {},
      outputs: payload.outputs || [],
      calc: payload.calc,
      note: payload.note || "",
      createdBy: user.id,
      createdAt: now(),
      review: null,
      integration: null,
      publishedAt: 0,
      hash: hash(payload.source),
      evidence: payload.evidence || null,
    };
    if (pend) ind.versions[ind.versions.indexOf(pend)] = ver;
    else ind.versions.push(ver);
    if (opts.submit) {
      ver.status = "reviewing";
      addLog(ind, user, "保存版本并提交审核", `v${ver.no}${ver.note ? " · " + ver.note : ""}`);
    } else {
      addLog(ind, user, pend ? "覆盖草稿版本" : "保存版本", `v${ver.no}${ver.note ? " · " + ver.note : ""}`);
    }
    persist();
    return { ok: true, indicator: ind, version: ver };
  }

  function transition(indId, versionNo, action, user, data = {}) {
    const ind = get(indId);
    if (!ind) return { ok: false, reason: "指标不存在" };
    const ver = ind.versions.find((v) => v.no === versionNo);
    const c = can(user, action, ind, ver);
    if (!c.ok) return c;
    const tag = `v${versionNo}`;
    switch (action) {
      case "submit":
        ver.status = "reviewing";
        ver.review = null;
        ver.integration = null;
        addLog(ind, user, "提交审核", tag);
        break;
      case "withdraw":
        ver.status = "draft";
        addLog(ind, user, "撤回审核", tag);
        break;
      case "review":
        ver.review = { by: user.id, at: now(), result: data.pass ? "pass" : "reject", comment: data.comment || "" };
        ver.status = data.pass ? "integrating" : "rejected";
        addLog(ind, user, data.pass ? "审核通过" : "审核驳回", `${tag}${data.comment ? " · " + data.comment : ""}`);
        break;
      case "integrate":
        ver.integration = { by: user.id, at: now(), result: data.done ? "done" : "failed", note: data.note || "" };
        ver.status = data.done ? "ready" : "rejected";
        addLog(ind, user, data.done ? "接入完成" : "接入失败退回", `${tag}${data.note ? " · " + data.note : ""}`);
        break;
      case "setProd":
      case "rollback": {
        const prev = prodVersionOf(ind);
        if (prev) prev.status = "retired";
        ver.status = "online";
        ver.publishedAt = now();
        ind.prodVersion = ver.no;
        const live = liveChannels(ind).map((x) => x.label);
        addLog(
          ind,
          user,
          action === "rollback" ? "版本回滚" : "设为生产版本",
          `${tag}${prev ? `（v${prev.no} 转为历史版本）` : ""}${live.length ? ` · 已上架渠道自动切换：${live.join("、")}` : ""}${data.comment ? " · " + data.comment : ""}`
        );
        break;
      }
      default:
        return { ok: false, reason: "未知操作" };
    }
    persist();
    return { ok: true, indicator: ind, version: ver };
  }

  /**
   * 渠道上下架
   * @param {{channels:string[], op:'on'|'gray'|'down', grayPct?:number, whitelist?:string, downMode?:'soft'|'hard', reason?:string}} data
   */
  function setChannels(indId, data, user) {
    const ind = get(indId);
    if (!ind) return { ok: false, reason: "指标不存在" };
    const c = can(user, "channel", ind);
    if (!c.ok) return c;
    if (data.op === "down" && !String(data.reason || "").trim()) return { ok: false, reason: "下架须填写原因" };
    data.channels.forEach((k) => {
      const ch = ind.channels[k];
      ch.status = data.op;
      ch.grayPct = data.op === "on" ? 100 : data.op === "gray" ? Number(data.grayPct) || 10 : 0;
      ch.whitelist = data.op === "gray" ? data.whitelist || "" : "";
      ch.downMode = data.op === "down" ? data.downMode || "soft" : "";
      ch.reason = data.op === "down" ? data.reason : "";
      ch.updatedAt = now();
      ch.updatedBy = user.id;
    });
    const names = data.channels.map((k) => CHANNELS.find((x) => x.key === k)?.label).join("、");
    const opLabel = { on: "渠道上架", gray: "渠道灰度", down: "渠道下架" }[data.op];
    const detail =
      data.op === "on"
        ? `${names} · 全量 · 生产版本 v${ind.prodVersion}`
        : data.op === "gray"
          ? `${names} · ${data.grayPct}%${data.whitelist ? " · " + data.whitelist : ""}`
          : `${names} · ${data.downMode === "hard" ? "硬下架" : "软下架"} · ${data.reason}`;
    addLog(ind, user, opLabel, detail);
    persist();
    return { ok: true, indicator: ind };
  }

  function updateAcl(indId, data, user) {
    const ind = get(indId);
    if (!ind) return { ok: false, reason: "指标不存在" };
    const c = can(user, "acl", ind);
    if (!c.ok) return c;
    const parts = [];
    if (data.visibility && data.visibility !== ind.visibility) {
      parts.push(`可见范围 → ${VISIBILITY[data.visibility]}`);
      ind.visibility = data.visibility;
    }
    if (data.addCollaborator) {
      const { userId, role } = data.addCollaborator;
      if (userId === ind.owner) return { ok: false, reason: "负责人无需添加为协作者" };
      const ex = ind.collaborators.find((x) => x.userId === userId);
      if (ex) ex.role = role;
      else ind.collaborators.push({ userId, role });
      parts.push(`协作者 ${userById(userId).name}（${role === "editor" ? "可编辑" : "只读"}）`);
    }
    if (data.removeCollaborator) {
      ind.collaborators = ind.collaborators.filter((x) => x.userId !== data.removeCollaborator);
      parts.push(`移除协作者 ${userById(data.removeCollaborator).name}`);
    }
    if (data.transferOwner && data.transferOwner !== ind.owner) {
      const old = ind.owner;
      ind.owner = data.transferOwner;
      ind.collaborators = ind.collaborators.filter((x) => x.userId !== data.transferOwner);
      ind.collaborators.push({ userId: old, role: "editor" });
      parts.push(`负责人移交 ${userById(old).name} → ${userById(data.transferOwner).name}`);
    }
    if (parts.length) addLog(ind, user, "权限变更", parts.join("；"));
    persist();
    return { ok: true, indicator: ind };
  }

  function updateBasic(indId, data, user) {
    const ind = get(indId);
    if (!ind) return { ok: false, reason: "指标不存在" };
    const c = can(user, "edit", ind);
    const c2 = can(user, "channel", ind);
    if (!c.ok && !c2.ok) return c;
    Object.assign(ind, data);
    addLog(ind, user, "修改展示信息", `展示名「${ind.displayName}」· 分类「${ind.category}」`);
    persist();
    return { ok: true, indicator: ind };
  }

  function archive(indId, user) {
    const ind = get(indId);
    if (!ind) return { ok: false, reason: "指标不存在" };
    const c = can(user, "archive", ind);
    if (!c.ok) return c;
    if (liveChannels(ind).length) return { ok: false, reason: "仍有渠道在架，请先全部下架" };
    ind.archived = true;
    addLog(ind, user, "归档指标", "");
    persist();
    return { ok: true, indicator: ind };
  }

  // 演示：成员角色可在后台调整
  function setUserRole(userId, role, actor) {
    if (!CAPS.members.includes(actor.role)) return { ok: false, reason: "仅平台管理员可调整角色" };
    const u = USERS.find((x) => x.id === userId);
    if (!u) return { ok: false, reason: "成员不存在" };
    u.role = role;
    const d = load();
    d.userRoles = { ...(d.userRoles || {}), [userId]: role };
    persist();
    return { ok: true };
  }

  global.IndicatorRegistry = {
    USERS,
    ROLES,
    CAPS,
    CAP_LABELS,
    VERSION_STATUS,
    CHANNELS,
    CHANNEL_STATUS,
    CATEGORIES,
    PERIODS,
    UNIVERSES,
    TRIGGERS,
    VISIBILITY,
    load,
    reload,
    resetDemo,
    list,
    get,
    latestVersion,
    prodVersionOf,
    pendingVersion,
    liveChannels,
    overallStatus,
    visibleTo,
    can,
    currentUser,
    setCurrentUser,
    userById,
    saveVersion,
    transition,
    setChannels,
    updateAcl,
    updateBasic,
    archive,
    setUserRole,
    parseOutputs,
    diffOutputs,
    diffParams,
    lineDiff,
    fmtTime,
    hash,
  };
})(typeof window !== "undefined" ? window : globalThis);
