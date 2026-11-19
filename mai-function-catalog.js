/**
 * 麦语言函数目录（原型 · 插入函数面板）
 * 覆盖平台校验/绘图/回测所支持的函数与约定；对齐「量化策略生产平台」插入函数交互。
 */
(function (global) {
  /** @type {Array<{c:string,n:string,t:string,b:string,u:string,insert?:string,calc?:boolean,f?:string}>} */
  const FUNCS = [
    { c: "行情数据", n: "OPEN", t: "开盘价序列", b: "当前品种每根 K 线的开盘价。", u: "用法:OPEN 或 O", insert: "OPEN", calc: true },
    { c: "行情数据", n: "HIGH", t: "最高价序列", b: "最高价。", u: "用法:HIGH 或 H", insert: "HIGH", calc: true },
    { c: "行情数据", n: "LOW", t: "最低价序列", b: "最低价。", u: "用法:LOW 或 L", insert: "LOW", calc: true },
    { c: "行情数据", n: "CLOSE", t: "收盘价序列", b: "收盘价。", u: "用法:CLOSE 或 C", insert: "CLOSE", calc: true },
    { c: "行情数据", n: "VOL", t: "成交量序列", b: "成交量。", u: "用法:VOL 或 V", insert: "VOL", calc: true },
    { c: "行情数据", n: "O", t: "开盘价简写", b: "同 OPEN。", u: "用法:O", insert: "O", calc: true },
    { c: "行情数据", n: "H", t: "最高价简写", b: "同 HIGH。", u: "用法:H", insert: "H", calc: true },
    { c: "行情数据", n: "L", t: "最低价简写", b: "同 LOW。", u: "用法:L", insert: "L", calc: true },
    { c: "行情数据", n: "C", t: "收盘价简写", b: "同 CLOSE。", u: "用法:C", insert: "C", calc: true },
    { c: "行情数据", n: "V", t: "成交量简写", b: "同 VOL。", u: "用法:V", insert: "V", calc: true },

    { c: "引用与统计", n: "REF", t: "向前引用", b: "引用若干周期前的序列值。", u: "用法:REF(X, N)\n例: REF(CLOSE, 1) 为昨收", insert: "REF(CLOSE, 1)", calc: true },
    { c: "引用与统计", n: "HHV", t: "最高值", b: "N 周期内最高。", u: "用法:HHV(X, N)", insert: "HHV(HIGH, 20)", calc: false },
    { c: "引用与统计", n: "LLV", t: "最低值", b: "N 周期内最低。", u: "用法:LLV(X, N)", insert: "LLV(LOW, 20)", calc: false },
    { c: "引用与统计", n: "SUM", t: "累和", b: "N 周期求和。", u: "用法:SUM(X, N)", insert: "SUM(VOL, 5)", calc: false },
    { c: "引用与统计", n: "COUNT", t: "计数", b: "N 周期内满足条件的周期数。", u: "用法:COUNT(条件, N)", insert: "COUNT(CLOSE>OPEN, 10)", calc: false },
    { c: "引用与统计", n: "BARSCOUNT", t: "有效周期数", b: "序列有效数据个数。", u: "用法:BARSCOUNT(X)", insert: "BARSCOUNT(CLOSE)", calc: false },
    { c: "引用与统计", n: "BARSLAST", t: "上次条件成立", b: "距离上次条件成立的周期数。", u: "用法:BARSLAST(条件)", insert: "BARSLAST(CROSS(CLOSE, OPEN))", calc: false },
    { c: "引用与统计", n: "BARSSINCE", t: "条件持续", b: "第一次条件成立距今周期数。", u: "用法:BARSSINCE(条件)", insert: "BARSSINCE(CLOSE>OPEN)", calc: false },

    { c: "移动平均", n: "MA", t: "简单移动平均", b: "算术均线。", u: "用法:MA(X, N)\n例: MA(CLOSE, 20)", insert: "MA(CLOSE, 20)", calc: true },
    { c: "移动平均", n: "EMA", t: "指数移动平均", b: "指数加权均线。", u: "用法:EMA(X, N)", insert: "EMA(CLOSE, 12)", calc: true },
    { c: "移动平均", n: "SMA", t: "通达信 SMA", b: "加权移动平均（麦语言兼容名）。", u: "用法:SMA(X, N, M)", insert: "SMA(CLOSE, 20, 1)", calc: false },
    { c: "移动平均", n: "STD", t: "标准差", b: "N 周期标准差。", u: "用法:STD(X, N)", insert: "STD(CLOSE, 20)", calc: false },
    { c: "移动平均", n: "STDDEV", t: "标准差", b: "N 周期标准差（与 STD 同义）。", u: "用法:STDDEV(X, N)", insert: "STDDEV(CLOSE, 20)", calc: true },
    { c: "移动平均", n: "AVEDEV", t: "平均绝对偏差", b: "N 周期平均绝对离差。", u: "用法:AVEDEV(X, N)", insert: "AVEDEV(CLOSE, 10)", calc: false },
    { c: "移动平均", n: "SLOPE", t: "线性回归斜率", b: "N 周期线性回归斜率。", u: "用法:SLOPE(X, N)", insert: "SLOPE(CLOSE, 20)", calc: false },

    { c: "逻辑与条件", n: "IF", t: "条件取值", b: "条件为真取 A，否则取 B。", u: "用法:IF(条件, A, B)", insert: "IF(CLOSE>OPEN, 1, 0)", calc: false },
    { c: "逻辑与条件", n: "CROSS", t: "上穿", b: "A 从下向上穿过 B。", u: "用法:CROSS(A, B)", insert: "CROSS(CLOSE, MA(CLOSE, 20))", calc: true },
    { c: "逻辑与条件", n: "CROSSUP", t: "上穿", b: "同 CROSS。", u: "用法:CROSSUP(A, B)", insert: "CROSSUP(CLOSE, MA(CLOSE, 20))", calc: false },
    { c: "逻辑与条件", n: "CROSSDOWN", t: "下穿", b: "A 从上向下穿过 B。", u: "用法:CROSSDOWN(A, B)", insert: "CROSSDOWN(CLOSE, MA(CLOSE, 20))", calc: false },
    { c: "逻辑与条件", n: "LONGCROSS", t: "长期交叉", b: "满足周期数后交叉。", u: "用法:LONGCROSS(A, B, N)", insert: "LONGCROSS(CLOSE, MA(CLOSE, 20), 3)", calc: false },
    { c: "逻辑与条件", n: "BETWEEN", t: "区间", b: "A 介于 B 与 C 之间。", u: "用法:BETWEEN(A, B, C)", insert: "BETWEEN(CLOSE, LOW, HIGH)", calc: false },
    { c: "逻辑与条件", n: "EVERY", t: "一直满足", b: "N 周期内条件一直成立。", u: "用法:EVERY(条件, N)", insert: "EVERY(CLOSE>OPEN, 5)", calc: false },
    { c: "逻辑与条件", n: "EXIST", t: "存在满足", b: "N 周期内存在条件成立。", u: "用法:EXIST(条件, N)", insert: "EXIST(CROSS(CLOSE, OPEN), 10)", calc: false },
    { c: "逻辑与条件", n: "NOT", t: "逻辑非", b: "条件取反。", u: "用法:NOT(条件)", insert: "NOT(CLOSE>OPEN)", calc: false },
    { c: "逻辑与条件", n: "AND", t: "逻辑与", b: "两条件同时成立。", u: "用法:(条件1) AND (条件2)", insert: "(CLOSE>OPEN) AND (VOL>1000)", calc: false },
    { c: "逻辑与条件", n: "OR", t: "逻辑或", b: "任一条件成立。", u: "用法:(条件1) OR (条件2)", insert: "(CLOSE>OPEN) OR (HIGH>REF(HIGH,1))", calc: false },

    { c: "数学函数", n: "MAX", t: "较大值", b: "两序列逐点较大。", u: "用法:MAX(A, B)", insert: "MAX(CLOSE, OPEN)", calc: false },
    { c: "数学函数", n: "MIN", t: "较小值", b: "两序列逐点较小。", u: "用法:MIN(A, B)", insert: "MIN(CLOSE, OPEN)", calc: false },
    { c: "数学函数", n: "ABS", t: "绝对值", b: "绝对值。", u: "用法:ABS(X)", insert: "ABS(CLOSE-OPEN)", calc: false },
    { c: "数学函数", n: "POW", t: "幂", b: "X 的 N 次方。", u: "用法:POW(X, N)", insert: "POW(CLOSE, 2)", calc: false },
    { c: "数学函数", n: "SQRT", t: "平方根", b: "平方根。", u: "用法:SQRT(X)", insert: "SQRT(VOL)", calc: false },
    { c: "数学函数", n: "LOG", t: "对数", b: "对数。", u: "用法:LOG(X)", insert: "LOG(VOL)", calc: false },
    { c: "数学函数", n: "LN", t: "自然对数", b: "自然对数。", u: "用法:LN(X)", insert: "LN(CLOSE)", calc: false },
    { c: "数学函数", n: "EXP", t: "指数", b: "e 的 X 次方。", u: "用法:EXP(X)", insert: "EXP(1)", calc: false },
    { c: "数学函数", n: "ROUND", t: "四舍五入", b: "四舍五入。", u: "用法:ROUND(X, N)", insert: "ROUND(CLOSE, 2)", calc: false },
    { c: "数学函数", n: "CEILING", t: "向上取整", b: "向绝对值变大取整。", u: "用法:CEILING(X)", insert: "CEILING(CLOSE)", calc: false },
    { c: "数学函数", n: "FLOOR", t: "向下取整", b: "向绝对值变小取整。", u: "用法:FLOOR(X)", insert: "FLOOR(CLOSE)", calc: false },
    { c: "数学函数", n: "INTPART", t: "整数部分", b: "取整。", u: "用法:INTPART(X)", insert: "INTPART(CLOSE)", calc: false },
    { c: "数学函数", n: "FRACPART", t: "小数部分", b: "小数部分。", u: "用法:FRACPART(X)", insert: "FRACPART(CLOSE)", calc: false },
    { c: "数学函数", n: "SIGN", t: "符号", b: "符号函数。", u: "用法:SIGN(X)", insert: "SIGN(CLOSE-REF(CLOSE,1))", calc: false },
    { c: "数学函数", n: "MOD", t: "取模", b: "取余数。", u: "用法:MOD(A, B)", insert: "MOD(VOL, 100)", calc: false },

    { c: "绘图与输出", n: "PLOT", t: "画线输出", b: "把表达式画成一条线，输出到主图（ON MAIN）或副图（ON SUB）。COLOR / WIDTH / LABEL / STYLE 均可省略。也兼容函数写法 PLOT(表达式, ON_MAIN, COLOR=\"#…\", LABEL=\"…\");", u: "用法:PLOT 表达式 ON MAIN|SUB [COLOR \"#RRGGBB\"] [WIDTH 线宽] [LABEL \"名称\"] [STYLE SOLID|DASH|DOT];\n例如:PLOT FAST ON MAIN COLOR \"#2563eb\" WIDTH 2 LABEL \"快线\";", insert: "PLOT MA(CLOSE, 20) ON MAIN COLOR \"#0d9488\" WIDTH 2 LABEL \"MA20\";", calc: true, f: "A" },
    { c: "绘图与输出", n: "MARK", t: "信号标记", b: "条件成立的 K 线上画三角标记，常用于在图上核对 BUY / SELL 信号。POSITION 缺省时 SELL 在上方、其余在下方。", u: "用法:MARK 条件 [LABEL \"文字\"] [POSITION ABOVE|BELOW] [COLOR \"#RRGGBB\"];\n例如:MARK BUY LABEL \"买\" POSITION BELOW COLOR \"#dc2626\";", insert: "MARK BUY LABEL \"买\" POSITION BELOW COLOR \"#dc2626\";", calc: true, f: "A" },

    { c: "线形与属性", n: "ON MAIN", t: "主图", b: "PLOT 输出到 K 线主图（函数写法为 ON_MAIN）。", u: "PLOT X ON MAIN;", insert: "ON MAIN", calc: true },
    { c: "线形与属性", n: "ON SUB", t: "副图", b: "PLOT 输出到副图（函数写法为 ON_SUB）。", u: "PLOT X ON SUB;", insert: "ON SUB", calc: true },
    { c: "线形与属性", n: "COLOR", t: "颜色", b: "PLOT / MARK 的颜色，十六进制色值。", u: 'COLOR "#0d9488"', insert: 'COLOR "#0d9488"', calc: true },
    { c: "线形与属性", n: "WIDTH", t: "线宽", b: "PLOT 线宽（像素，0~6）。", u: "WIDTH 2", insert: "WIDTH 2", calc: true },
    { c: "线形与属性", n: "LABEL", t: "图例名 / 标记文字", b: "PLOT 的图例名称，或 MARK 旁显示的文字。", u: 'LABEL "MA20"', insert: 'LABEL "MA20"', calc: true },
    { c: "线形与属性", n: "STYLE", t: "线型", b: "SOLID 实线 / DASH 虚线 / DOT 点线。", u: "STYLE DASH", insert: "STYLE DASH", calc: true },
    { c: "线形与属性", n: "POSITION", t: "标记位置", b: "MARK 画在 K 线上方（ABOVE）或下方（BELOW）。", u: "POSITION BELOW", insert: "POSITION BELOW", calc: true },

    { c: "麦语言交易", n: "BUY", t: "买入信号", b: "回测/网格研究买入条件。", u: "BUY := 条件;", insert: "BUY := CROSS(CLOSE, MA(CLOSE, 20));", calc: true, f: "A" },
    { c: "麦语言交易", n: "SELL", t: "卖出信号", b: "回测/网格研究卖出条件。", u: "SELL := 条件;", insert: "SELL := CROSS(MA(CLOSE, 20), CLOSE);", calc: true, f: "A" },
    { c: "麦语言交易", n: "BK", t: "买入", b: "买入（扩展指令，等价 BUY）。", u: "BK := 条件;", insert: "BK := BUY;", calc: false, f: "A" },
    { c: "麦语言交易", n: "SK", t: "卖开", b: "开空（扩展指令）。", u: "SK := 条件;", insert: "SK := 0;", calc: false, f: "A" },
    { c: "麦语言交易", n: "BP", t: "买平", b: "平空。", u: "BP := 条件;", insert: "BP := 0;", calc: false, f: "A" },
    { c: "麦语言交易", n: "SP", t: "卖出", b: "卖出（扩展指令，等价 SELL）。", u: "SP := 条件;", insert: "SP := SELL;", calc: false, f: "A" },

    { c: "语句与参数", n: "PARAM", t: "声明参数", b: "声明可调参数（整数 INT 或小数 FLOAT），等号后为默认值。取值范围与步长在「策略回测 › 公式参数」中设置，并随公式一起保存。", u: "用法:PARAM 名称 INT = 默认值; / PARAM 名称 FLOAT = 默认值;\n例如:PARAM N INT = 20;  PARAM K FLOAT = 2.0;", insert: "PARAM N INT = 20;", calc: true },
    { c: "语句与参数", n: ":=", t: "赋值", b: "麦语言赋值运算符。", u: "变量名 := 表达式;", insert: " := ", calc: true },
    { c: "语句与参数", n: ";", t: "语句结束", b: "语句以分号结束。", u: "表达式;", insert: ";", calc: true },
    { c: "语句与参数", n: "//", t: "行注释", b: "单行注释至行尾。", u: "// 说明文字", insert: "// ", calc: true },

    { c: "操作符", n: "+", t: "加", b: "加法。", u: "A + B", insert: " + ", calc: true },
    { c: "操作符", n: "-", t: "减", b: "减法。", u: "A - B", insert: " - ", calc: true },
    { c: "操作符", n: "*", t: "乘", b: "乘法。", u: "A * B", insert: " * ", calc: true },
    { c: "操作符", n: "/", t: "除", b: "除法。", u: "A / B", insert: " / ", calc: true },
    { c: "操作符", n: ">", t: "大于", b: "比较运算符。", u: "A > B", insert: " > ", calc: true },
    { c: "操作符", n: "<", t: "小于", b: "比较运算符。", u: "A < B", insert: " < ", calc: true },
    { c: "操作符", n: ">=", t: "大于等于", b: "比较运算符。", u: "A >= B", insert: " >= ", calc: true },
    { c: "操作符", n: "<=", t: "小于等于", b: "比较运算符。", u: "A <= B", insert: " <= ", calc: true },
    { c: "操作符", n: "=", t: "等于", b: "相等比较。", u: "A = B", insert: " = ", calc: true },
    { c: "操作符", n: "<>", t: "不等", b: "不等于。", u: "A <> B", insert: " <> ", calc: true },
    { c: "操作符", n: "(", t: "左括号", b: "分组。", u: "(表达式)", insert: "(", calc: true },
    { c: "操作符", n: ")", t: "右括号", b: "分组。", u: "(表达式)", insert: ")", calc: true },
  ];

  /* ---------- 兼容通达信函数：并入麦语言目录 ---------- */
  const TDX_CAT_MAP = {
    行情函数: "行情数据",
    引用函数: "引用与统计",
    统计函数: "引用与统计",
    逻辑函数: "逻辑与条件",
    选择函数: "逻辑与条件",
    麦语言兼容: "逻辑与条件",
    数学函数: "数学函数",
    绘图函数: "绘图与输出",
  };
  /** 交易指令、行末属性、账户与外部 DLL 不纳入麦语言 */
  const TDX_EXCLUDED = new Set(["操作符", "线形和资源", "交易信号函数", "账户函数", "外部DLL函数"]);
  const tdxFuncs = global.TdxFuncCatalog?.TDX_FUNCS || [];
  const seen = new Set(FUNCS.map((f) => f.n.toUpperCase()));
  let tdxCount = 0;
  tdxFuncs.forEach((tf) => {
    if (TDX_EXCLUDED.has(tf.c) || (tf.f || "").includes("A")) return;
    const key = tf.n.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    tdxCount++;
    FUNCS.push({ c: TDX_CAT_MAP[tf.c] || tf.c, n: tf.n, t: tf.t, b: tf.b, u: tf.u, f: tf.f, tdx: tf });
  });
  const CAT_ORDER = ["行情数据", "移动平均", "引用与统计", "逻辑与条件", "数学函数", "绘图与输出", "线形与属性", "麦语言交易", "语句与参数"];

  function baseName(f) {
    return f.n.replace(/\(.*$/, "").toUpperCase();
  }

  /** 是否可在本原型内计算（以通达信运行时实现为准） */
  function calcable(f) {
    if (f.c === "线形与属性" || f.c === "语句与参数" || f.c === "操作符" || f.c === "麦语言交易") return true;
    if (f.n === "PLOT" || f.n === "MARK") return true;
    const impl = global.TdxFormulaRuntime?.getImpl?.() || {};
    return !!impl[baseName(f)];
  }

  global.MaiFuncCatalog = {
    FUNCS,
    tdxCount,
    calcable,
    categories() {
      const cats = [...new Set(FUNCS.map((f) => f.c))];
      cats.sort((a, b) => {
        const ia = CAT_ORDER.indexOf(a);
        const ib = CAT_ORDER.indexOf(b);
        if (a === "操作符") return 1;
        if (b === "操作符") return -1;
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });
      return ["全部", ...cats];
    },
    getByIndex(i) {
      return FUNCS[i] ?? null;
    },
    match(f, kw, opts = {}) {
      const q = (kw || "").trim().toUpperCase();
      if (q && !f.n.toUpperCase().includes(q) && !f.t.includes(kw) && !(f.b || "").toUpperCase().includes(q) && !(f.u || "").toUpperCase().includes(q))
        return false;
      if (opts.onlyCalc && !calcable(f)) return false;
      return true;
    },
    insertSnippet(f) {
      if (!f) return "";
      if (f.tdx && global.TdxFuncCatalog) return global.TdxFuncCatalog.insertSnippet(f.tdx);
      if (f.c === "操作符" && f.n === "{") return "{}";
      return f.insert || f.n;
    },
    selectRange(f, text) {
      if (f.tdx && global.TdxFuncCatalog) return global.TdxFuncCatalog.selectRange(f.tdx, text);
      const op = f.c === "操作符";
      if (op || f.c === "线形与属性" || f.c === "语句与参数" || f.n === "PLOT" || f.n === "MARK") return null;
      const m = text.match(/\([^)]*\)/);
      if (!m) return null;
      const a = text.indexOf("(") + 1;
      const b = text.lastIndexOf(")");
      if (b > a) return { a, b };
      return null;
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
