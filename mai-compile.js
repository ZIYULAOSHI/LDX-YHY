/**
 * 麦语言编译层：识别 PARAM / PLOT / MARK 指令，其余表达式交给通达信解析器与运行时。
 *
 *   PARAM N INT = 20;            PARAM K FLOAT = 2.0;
 *   PLOT FAST ON MAIN COLOR "#2563eb" WIDTH 2 LABEL "快线" STYLE DASH;
 *   PLOT(FAST, ON_MAIN, COLOR="#2563eb", LABEL="快线");     // 函数写法
 *   MARK BUY LABEL "买" POSITION BELOW COLOR "#dc2626";
 *
 * preprocess(src) → { params, directives, checkCode, evalCode, errors }
 *   checkCode：与源码等长，指令仅保留表达式部分（供语义检测定位行列）
 *   evalCode ：指令改写为 __PLOTk / __MARKk 输出语句，BUY/SELL 改写为 __SIG_BUY / __SIG_SELL
 * evaluate(bars, src, paramVals) → { plots, marks, drawings, signals, params, errors }
 */
(function (global) {
  const PLOT_OPTS = ["COLOR", "WIDTH", "LABEL", "STYLE"];
  const MARK_OPTS = ["LABEL", "POSITION", "COLOR"];
  const STYLES = ["SOLID", "DASH", "DOT"];
  const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
  const COLOR_WORDS = {
    RED: "#e53935",
    GREEN: "#2e9d43",
    BLUE: "#2f7de1",
    YELLOW: "#e6b800",
    ORANGE: "#f08c00",
    PURPLE: "#7c4dff",
    CYAN: "#0aa5b5",
    MAGENTA: "#c2185b",
    GRAY: "#8a8a8a",
    GREY: "#8a8a8a",
    BLACK: "#222222",
    WHITE: "#ffffff",
  };
  const TDX_COLOR_ATTR = {
    COLORRED: "#e53935",
    COLORGREEN: "#2e9d43",
    COLORBLUE: "#2f7de1",
    COLORYELLOW: "#e6b800",
    COLORWHITE: "#ffffff",
    COLORBLACK: "#222222",
    COLORGRAY: "#8a8a8a",
    COLORMAGENTA: "#c2185b",
    COLORCYAN: "#0aa5b5",
    COLORLIGHTRED: "#ff7b7b",
    COLORLIGHTGREEN: "#6fcf7f",
    COLORLIGHTBLUE: "#7fb2f0",
    COLORLIGHTGRAY: "#c0c0c0",
    COLORBROWN: "#8d5a2b",
  };
  const PALETTE = ["#2563eb", "#f59e0b", "#0d9488", "#bd4c59", "#7c3aed", "#64748b"];
  const SIGNAL_NAMES = ["BUY", "SELL"];

  /** 通达信 COLORBBGGRR → #RRGGBB */
  function tdxAttrColor(attrs) {
    let color = null;
    (attrs || []).forEach((a) => {
      if (TDX_COLOR_ATTR[a]) color = TDX_COLOR_ATTR[a];
      const m = /^COLOR([0-9A-F]{6})$/.exec(a);
      if (m) color = `#${m[1].slice(4, 6)}${m[1].slice(2, 4)}${m[1].slice(0, 2)}`;
    });
    return color;
  }

  function lineColOf(src, idx) {
    let line = 1;
    let last = -1;
    for (let i = 0; i < idx && i < src.length; i++) {
      if (src[i] === "\n") {
        line++;
        last = i;
      }
    }
    return { line, col: idx - last };
  }

  /** 注释替换为空格（保留换行与长度） */
  function blankComments(src) {
    const out = src.split("");
    let i = 0;
    while (i < src.length) {
      const ch = src[i];
      if (ch === '"' || ch === "'") {
        let j = i + 1;
        while (j < src.length && src[j] !== ch && src[j] !== "\n") j++;
        i = j + 1;
        continue;
      }
      if (ch === "/" && src[i + 1] === "/") {
        while (i < src.length && src[i] !== "\n") out[i++] = " ";
        continue;
      }
      if (ch === "{") {
        let j = src.indexOf("}", i);
        if (j < 0) j = src.length - 1;
        for (let k = i; k <= j; k++) if (out[k] !== "\n") out[k] = " ";
        i = j + 1;
        continue;
      }
      i++;
    }
    return out.join("");
  }

  function splitStatements(clean) {
    const stmts = [];
    let s = 0;
    let i = 0;
    while (i < clean.length) {
      const ch = clean[i];
      if (ch === '"' || ch === "'") {
        let j = i + 1;
        while (j < clean.length && clean[j] !== ch && clean[j] !== "\n") j++;
        i = j + 1;
        continue;
      }
      if (ch === ";") {
        stmts.push({ s, e: i, semi: i });
        s = i + 1;
      }
      i++;
    }
    if (clean.slice(s).trim()) stmts.push({ s, e: clean.length, semi: -1 });
    return stmts;
  }

  function tokenize(clean, s, e) {
    const out = [];
    let i = s;
    let depth = 0;
    while (i < e) {
      const ch = clean[i];
      if (/\s/.test(ch)) {
        i++;
        continue;
      }
      if (ch === '"' || ch === "'") {
        let j = i + 1;
        while (j < e && clean[j] !== ch && clean[j] !== "\n") j++;
        out.push({ t: "str", v: clean.slice(i + 1, Math.min(j, e)), s: i, e: Math.min(j + 1, e), depth, closed: clean[j] === ch });
        i = j + 1;
        continue;
      }
      const rest = clean.slice(i, e);
      let m = /^[A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\u4e00-\u9fa5]*/.exec(rest);
      if (m) {
        out.push({ t: "id", v: m[0].toUpperCase(), raw: m[0], s: i, e: i + m[0].length, depth });
        i += m[0].length;
        continue;
      }
      m = /^(\d+\.?\d*|\.\d+)/.exec(rest);
      if (m) {
        out.push({ t: "num", v: parseFloat(m[1]), s: i, e: i + m[1].length, depth });
        i += m[1].length;
        continue;
      }
      if (ch === "(") {
        out.push({ t: "op", v: "(", s: i, e: i + 1, depth });
        depth++;
        i++;
        continue;
      }
      if (ch === ")") {
        depth = Math.max(0, depth - 1);
        out.push({ t: "op", v: ")", s: i, e: i + 1, depth });
        i++;
        continue;
      }
      const two = clean.substr(i, 2);
      if ([":=", ">=", "<=", "<>", "!=", "==", "&&", "||"].includes(two)) {
        out.push({ t: "op", v: two, s: i, e: i + 2, depth });
        i += 2;
        continue;
      }
      out.push({ t: "op", v: ch, s: i, e: i + 1, depth });
      i++;
    }
    return out;
  }

  function isNamed(tk) {
    return tk[1] && tk[1].t === "op" && (tk[1].v === ":" || tk[1].v === ":=");
  }

  function readColor(tok) {
    if (!tok) return null;
    if (tok.t === "str" && HEX.test(tok.v.trim())) return tok.v.trim();
    if (tok.t === "str" && COLOR_WORDS[tok.v.trim().toUpperCase()]) return COLOR_WORDS[tok.v.trim().toUpperCase()];
    if (tok.t === "id" && COLOR_WORDS[tok.v]) return COLOR_WORDS[tok.v];
    return null;
  }

  /**
   * 解析「KEY [=] VALUE」形式的选项序列
   * @returns {Record<string, any>}
   */
  function readOptions(tk, from, allowed, kw, err) {
    const opts = {};
    let i = from;
    while (i < tk.length) {
      const key = tk[i];
      if (key.t !== "id" || !allowed.includes(key.v)) {
        err(key, `${kw} 不支持「${key.t === "str" ? `"${key.v}"` : key.v}」，可用选项：${allowed.join(" / ")}`);
        return opts;
      }
      i++;
      if (tk[i] && tk[i].t === "op" && tk[i].v === "=") i++;
      const val = tk[i];
      if (!val) {
        err(key, `选项 ${key.v} 缺少取值`);
        return opts;
      }
      i++;
      if (!applyOption(opts, key, val, err)) return opts;
    }
    return opts;
  }

  function applyOption(opts, key, val, err) {
    switch (key.v) {
      case "COLOR": {
        const c = readColor(val);
        if (!c) {
          err(val, `颜色格式应为 "#RRGGBB"（例如 COLOR "#2563eb"）`);
          return false;
        }
        opts.color = c;
        return true;
      }
      case "WIDTH":
        if (val.t !== "num" || val.v <= 0 || val.v > 6) {
          err(val, "WIDTH 应为 0~6 之间的数字（线宽像素）");
          return false;
        }
        opts.width = val.v;
        return true;
      case "LABEL":
        if (val.t !== "str") {
          err(val, `LABEL 需用引号包裹，例如 LABEL "快线"`);
          return false;
        }
        if (!val.closed) {
          err(val, "LABEL 字符串缺少结束引号");
          return false;
        }
        opts.label = val.v;
        return true;
      case "STYLE":
        if (val.t !== "id" || !STYLES.includes(val.v)) {
          err(val, `STYLE 可选 ${STYLES.join(" / ")}`);
          return false;
        }
        opts.style = val.v.toLowerCase();
        return true;
      case "POSITION":
        if (val.t !== "id" || (val.v !== "ABOVE" && val.v !== "BELOW")) {
          err(val, "POSITION 可选 ABOVE（K 线上方）/ BELOW（K 线下方）");
          return false;
        }
        opts.position = val.v.toLowerCase();
        return true;
      default:
        return false;
    }
  }

  /** PLOT(expr, ON_MAIN, COLOR="…", LABEL="…", WIDTH=2, STYLE=DASH) */
  function parsePlotCall(tk, err) {
    const open = tk[1];
    let close = -1;
    for (let i = 2; i < tk.length; i++) {
      if (tk[i].t === "op" && tk[i].v === ")" && tk[i].depth === open.depth) {
        close = i;
        break;
      }
    }
    if (close < 0) {
      err(open, "PLOT( 缺少「)」");
      return null;
    }
    const args = [];
    let cur = [];
    for (let i = 2; i < close; i++) {
      const t = tk[i];
      if (t.t === "op" && t.v === "," && t.depth === open.depth + 1) {
        args.push(cur);
        cur = [];
      } else cur.push(t);
    }
    args.push(cur);
    const exprToks = args[0] || [];
    if (!exprToks.length) {
      err(open, "PLOT 缺少要绘制的表达式");
      return null;
    }
    const d = { kind: "plot", exprS: exprToks[0].s, exprE: exprToks[exprToks.length - 1].e };
    for (let a = 1; a < args.length; a++) {
      const arg = args[a];
      if (!arg.length) {
        err(tk[close], "PLOT 参数为空");
        return null;
      }
      const t0 = arg[0];
      if (arg.length === 1 && t0.t === "id") {
        if (t0.v === "ON_MAIN" || t0.v === "MAIN") d.where = "main";
        else if (t0.v === "ON_SUB" || t0.v === "SUB") d.where = "sub";
        else if (/^LINETHICK[1-9]$/.test(t0.v)) d.width = +t0.v.slice(9);
        else if (t0.v === "DOTLINE") d.style = "dash";
        else if (tdxAttrColor([t0.v])) d.color = tdxAttrColor([t0.v]);
        else {
          err(t0, `PLOT 参数「${t0.raw}」无法识别，位置用 ON_MAIN / ON_SUB`);
          return null;
        }
        continue;
      }
      const opts = readOptions(arg, 0, PLOT_OPTS, "PLOT", err);
      if (opts === null) return null;
      Object.assign(d, opts);
    }
    if (close !== tk.length - 1) {
      err(tk[close + 1], `PLOT(...) 之后不应再出现「${tk[close + 1].v}」`);
      return null;
    }
    if (!d.where) {
      err(tk[0], "PLOT 缺少输出位置：在参数中加入 ON_MAIN（主图）或 ON_SUB（副图）");
      return null;
    }
    return d;
  }

  /** PLOT expr ON MAIN|SUB [COLOR "#hex"] [WIDTH n] [LABEL "…"] [STYLE SOLID|DASH|DOT] */
  function parsePlotStatement(tk, err) {
    let on = -1;
    let where = null;
    let optFrom = -1;
    for (let i = 1; i < tk.length; i++) {
      const t = tk[i];
      if (t.depth !== 0 || t.t !== "id") continue;
      if (t.v === "ON" && tk[i + 1] && tk[i + 1].t === "id" && (tk[i + 1].v === "MAIN" || tk[i + 1].v === "SUB")) {
        on = i;
        where = tk[i + 1].v === "MAIN" ? "main" : "sub";
        optFrom = i + 2;
        break;
      }
      if (t.v === "ON_MAIN" || t.v === "ON_SUB") {
        on = i;
        where = t.v === "ON_MAIN" ? "main" : "sub";
        optFrom = i + 1;
        break;
      }
    }
    if (on < 0) {
      err(tk[0], "PLOT 语句缺少输出位置，应写作：PLOT 表达式 ON MAIN（或 ON SUB）[COLOR …] [LABEL …];");
      return null;
    }
    if (on === 1) {
      err(tk[0], "PLOT 缺少要绘制的表达式");
      return null;
    }
    const d = { kind: "plot", where, exprS: tk[1].s, exprE: tk[on - 1].e };
    Object.assign(d, readOptions(tk, optFrom, PLOT_OPTS, "PLOT", err));
    return d;
  }

  /** MARK expr [LABEL "…"] [POSITION ABOVE|BELOW] [COLOR "#hex"] */
  function parseMark(tk, err) {
    let optFrom = tk.length;
    for (let i = 1; i < tk.length; i++) {
      if (tk[i].depth === 0 && tk[i].t === "id" && MARK_OPTS.includes(tk[i].v)) {
        optFrom = i;
        break;
      }
    }
    if (optFrom === 1) {
      err(tk[0], "MARK 缺少标记条件，例如：MARK BUY LABEL \"买\" POSITION BELOW;");
      return null;
    }
    const d = { kind: "mark", exprS: tk[1].s, exprE: tk[optFrom - 1].e };
    Object.assign(d, readOptions(tk, optFrom, MARK_OPTS, "MARK", err));
    return d;
  }

  function parseParam(tk, err, seen) {
    const [, nameT, typeT, eqT] = tk;
    const fmt = "PARAM 声明格式：PARAM 名称 INT = 20; 或 PARAM 名称 FLOAT = 2.0;";
    if (!nameT || nameT.t !== "id" || !typeT || typeT.t !== "id" || !eqT || eqT.v !== "=") {
      err(tk[0], fmt);
      return null;
    }
    if (typeT.v !== "INT" && typeT.v !== "FLOAT") {
      err(typeT, `参数类型只能是 INT 或 FLOAT，不支持「${typeT.raw}」`);
      return null;
    }
    let k = 4;
    let sign = 1;
    if (tk[k] && tk[k].t === "op" && tk[k].v === "-") {
      sign = -1;
      k++;
    }
    const numT = tk[k];
    if (!numT || numT.t !== "num" || tk.length > k + 1) {
      err(numT || eqT, fmt);
      return null;
    }
    const def = sign * numT.v;
    if (typeT.v === "INT" && !Number.isInteger(def)) {
      err(numT, `INT 参数「${nameT.raw}」的默认值必须是整数`);
      return null;
    }
    if (seen.has(nameT.v)) {
      err(nameT, `参数「${nameT.raw}」重复声明`);
      return null;
    }
    seen.add(nameT.v);
    return { name: nameT.raw, key: nameT.v, type: typeT.v, def };
  }

  function blankRange(arr, s, e) {
    for (let i = s; i < e; i++) if (arr[i] !== "\n") arr[i] = " ";
  }

  const preCache = new Map();

  function preprocess(src) {
    src = src || "";
    if (preCache.has(src)) return preCache.get(src);
    const clean = blankComments(src);
    const stmts = splitStatements(clean);
    const params = [];
    const directives = [];
    const errors = [];
    const check = src.split("");
    const evalParts = [];
    const assigned = new Set();
    const seenParams = new Set();
    let plotN = 0;
    let markN = 0;

    stmts.forEach((st) => {
      const tk = tokenize(clean, st.s, st.e);
      if (!tk.length) return;
      const head = tk[0];
      const err = (tok, msg) => {
        const lc = lineColOf(src, tok.s);
        errors.push({ line: lc.line, col: lc.col, s: tok.s, e: tok.e, msg });
      };
      if (head.t === "id" && isNamed(tk)) {
        assigned.add(head.v);
        evalParts.push(`${clean.slice(st.s, st.e)};`);
        return;
      }
      const kw = head.t === "id" ? head.v : "";
      if (kw === "PARAM" && tk[1] && tk[1].t === "id") {
        blankRange(check, st.s, st.semi >= 0 ? st.semi + 1 : st.e);
        const p = parseParam(tk, err, seenParams);
        if (p) params.push(p);
        return;
      }
      if ((kw === "PLOT" || kw === "MARK") && tk.length > 1) {
        let d = null;
        if (kw === "MARK") d = parseMark(tk, err);
        else if (tk[1].t === "op" && tk[1].v === "(" && hasTopLevelComma(tk)) d = parsePlotCall(tk, err);
        else d = parsePlotStatement(tk, err);
        if (!d) {
          blankRange(check, st.s, st.e);
          return;
        }
        d.line = lineColOf(src, head.s).line;
        d.exprText = clean.slice(d.exprS, d.exprE).trim();
        blankRange(check, st.s, d.exprS);
        blankRange(check, d.exprE, st.e);
        d.id = d.kind === "plot" ? `__PLOT${plotN++}` : `__MARK${markN++}`;
        directives.push(d);
        evalParts.push(`${d.id}: ${d.exprText};`);
        return;
      }
      evalParts.push(`${clean.slice(st.s, st.e)};`);
    });

    SIGNAL_NAMES.forEach((n) => {
      if (assigned.has(n)) evalParts.push(`__SIG_${n}: ${n};`);
    });

    const out = {
      params,
      directives,
      errors,
      checkCode: check.join(""),
      evalCode: evalParts.join("\n"),
      signalNames: SIGNAL_NAMES.filter((n) => assigned.has(n)),
    };
    if (preCache.size > 40) preCache.clear();
    preCache.set(src, out);
    return out;
  }

  /** PLOT( … ) 中出现顶层逗号即视为函数写法 */
  function hasTopLevelComma(tk) {
    const d = tk[1].depth + 1;
    return tk.some((t) => t.t === "op" && t.v === "," && t.depth === d);
  }

  function evaluate(bars, src, paramVals) {
    const RT = global.TdxFormulaRuntime;
    const Engine = global.TdxFormulaEngine;
    const pre = preprocess(src);
    const empty = { plots: [], marks: [], drawings: [], signals: null, params: pre.params, errors: pre.errors, directives: pre.directives };
    if (!RT || !RT.evaluateWithParams || !Engine || !Engine.parse || !bars || !bars.length) return empty;
    RT.setBars(bars);
    const pv = {};
    pre.params.forEach((p) => {
      const raw = paramVals ? (paramVals[p.key] ?? paramVals[p.name]) : undefined;
      const v = raw === undefined || raw === null || raw === "" ? NaN : Number(raw);
      pv[p.key] = Number.isFinite(v) ? v : p.def;
    });
    const r = RT.evaluateWithParams(
      pre.evalCode,
      pre.params.map((p) => ({ n: p.key, def: p.def })),
      pv,
      "my",
      Engine.parse
    );
    const byName = {};
    (r.outputs || []).forEach((o) => {
      if (o.name) byName[o.name] = o.v;
    });
    let ci = 0;
    const plots = [];
    const marks = [];
    pre.directives.forEach((d) => {
      const data = byName[d.id];
      if (d.kind === "plot") {
        const color = d.color || PALETTE[ci % PALETTE.length];
        ci++;
        plots.push({
          id: d.id,
          label: d.label || d.exprText,
          exprText: d.exprText,
          where: d.where || "main",
          color,
          width: d.width || 1.5,
          style: d.style || "solid",
          data: Array.isArray(data) ? data : new Array(bars.length).fill(Number.isFinite(data) ? data : null),
        });
      } else {
        const cond = Array.isArray(data) ? data : new Array(bars.length).fill(data ? 1 : 0);
        const isSell = /^SELL$/i.test(d.exprText);
        const position = d.position || (isSell ? "above" : "below");
        marks.push({
          id: d.id,
          label: d.label || "",
          exprText: d.exprText,
          position,
          color: d.color || (position === "above" ? "#16a34a" : "#dc2626"),
          cond,
        });
      }
    });
    let signals = null;
    if (pre.signalNames.length) {
      signals = {};
      pre.signalNames.forEach((n) => {
        const v = byName[`__SIG_${n}`];
        signals[n] = Array.isArray(v) ? v.map((x) => (x ? 1 : 0)) : new Array(bars.length).fill(v ? 1 : 0);
      });
    }
    const drawings = (r.drawings || []).map((dr) => Object.assign({}, dr, { color: tdxAttrColor(dr.attrs) || "#e53935" }));
    return { plots, marks, drawings, signals, params: pre.params, errors: pre.errors, directives: pre.directives };
  }

  global.MaiCompile = { preprocess, evaluate, tdxAttrColor };
})(typeof window !== "undefined" ? window : globalThis);
