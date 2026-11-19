/**
 * 麦语言 · 前端语法高亮与校验（原型）
 * 规则对齐「量化策略生产平台」中 dialect=my 的约定；兼容通达信「名称:表达式[,线型属性];」画线输出。
 */
(function (global) {
  const FULLWIDTH = {
    "；": ";",
    "，": ",",
    "（": "(",
    "）": ")",
    "：": ":",
    "＝": "=",
    "＞": ">",
    "＜": "<",
    "＋": "+",
    "－": "-",
    "＊": "*",
    "／": "/",
  };

  const MAI_FUNCS = new Set([
    "MA",
    "EMA",
    "SMA",
    "STD",
    "STDDEV",
    "SUM",
    "HHV",
    "LLV",
    "REF",
    "CROSS",
    "CROSSUP",
    "CROSSDOWN",
    "IF",
    "MAX",
    "MIN",
    "ABS",
    "NOT",
    "AND",
    "OR",
    "PLOT",
    "DRAWICON",
    "STICKLINE",
    "OPEN",
    "HIGH",
    "LOW",
    "CLOSE",
    "VOL",
    "O",
    "H",
    "L",
    "C",
    "V",
  ]);

  const MAI_ATTRS = new Set([
    "ON_MAIN",
    "ON_SUB",
    "COLOR",
    "LABEL",
    "LINETHICK",
    "NODRAW",
    "DOTLINE",
    "COLORSTICK",
    "VOLSTICK",
  ]);

  const MAI_SIGNALS = new Set(["BUY", "SELL", "BK", "SK", "BP", "SP"]);

  /** 通达信画线输出：名称:表达式（单冒号，非 :=） */
  const TDX_COLON_OUTPUT = /^\s*[A-Za-z_\u4e00-\u9fa5][\w\u4e00-\u9fa5]*\s*:(?!=)/u;

  /** 通达信行末颜色 / 线型（非 PLOT 内 COLOR="..." 形式） */
  const TDX_TRAIL_ATTR =
    /,\s*(COLOR(?:RED|GREEN|BLUE|YELLOW|WHITE|BLACK|GRAY|GREY|MAGENTA|CYAN|BROWN|LIGHTGRAY|LIGHTRED|LIGHTGREEN|LIGHTBLUE|LIGHTMAGENTA|LIGHTCYAN)\d*|LINETHICK\d+|DOTLINE|VOLSTICK|COLORSTICK|STICK|LINESTICK|DRAWABOVE|NODRAW|NOTEXT|CROSSDOT|POINTDOT|CIRCLEDOT)\b/i;

  /** 兼容的通达信绘图函数（允许行末 ,COLORxxx 等属性） */
  const DRAW_FUNCS = new Set([
    "DRAWICON",
    "DRAWTEXT",
    "DRAWTEXT_FIX",
    "DRAWNUMBER",
    "DRAWKLINE",
    "STICKLINE",
    "PLOYLINE",
  ]);

  /** PLOT / MARK / PARAM 语句关键字 */
  const MAI_KEYWORDS = new Set(["PLOT", "MARK", "PARAM"]);
  const MAI_OPTION_WORDS = new Set([
    "ON",
    "MAIN",
    "SUB",
    "ON_MAIN",
    "ON_SUB",
    "COLOR",
    "WIDTH",
    "LABEL",
    "STYLE",
    "SOLID",
    "DASH",
    "DOT",
    "POSITION",
    "ABOVE",
    "BELOW",
    "INT",
    "FLOAT",
  ]);

  /** 麦语言函数 ∪ 兼容的通达信函数 */
  let tdxFnNames = null;
  function isKnownFn(name) {
    if (MAI_FUNCS.has(name)) return true;
    if (!tdxFnNames) {
      const cat = global.TdxFuncCatalog;
      if (!cat || !cat.TDX_FUNCS) return false;
      tdxFnNames = new Set(cat.TDX_FUNCS.filter((f) => !(f.f || "").includes("A")).map((f) => String(f.n).toUpperCase()));
    }
    return tdxFnNames.has(name);
  }

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function lexMai(src) {
    const toks = [];
    const cmts = [];
    const errors = [];
    const warns = [];
    let i = 0;
    let line = 1;
    let col = 1;
    const adv = (n) => {
      for (let k = 0; k < n; k++) {
        if (src[i] === "\n") {
          line++;
          col = 1;
        } else col++;
        i++;
      }
    };
    const pos = () => ({ line, col, s: i });

    while (i < src.length) {
      const ch = src[i];
      if (/\s/.test(ch)) {
        adv(1);
        continue;
      }
      const p = pos();
      if (ch === "{") {
        const j = src.indexOf("}", i);
        if (j < 0) {
          errors.push({ ...p, e: src.length, msg: "块注释未闭合：缺少「}」（麦语言推荐改用 // 行注释）" });
          cmts.push({ s: i, e: src.length });
          adv(src.length - i);
          break;
        }
        warns.push({ ...p, e: j + 1, msg: "检测到通达信块注释 { }；本平台为麦语言，建议使用 // 注释" });
        cmts.push({ s: i, e: j + 1 });
        adv(j - i + 1);
        continue;
      }
      if (ch === "/" && src[i + 1] === "/") {
        let j = src.indexOf("\n", i);
        if (j < 0) j = src.length;
        cmts.push({ s: i, e: j });
        adv(j - i);
        continue;
      }
      let m;
      if ((m = /^(\d+\.?\d*|\.\d+)/.exec(src.slice(i)))) {
        toks.push({ ...p, t: "num", v: parseFloat(m[1]), e: i + m[1].length });
        adv(m[1].length);
        continue;
      }
      if ((m = /^[A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\u4e00-\u9fa5]*/.exec(src.slice(i)))) {
        toks.push({
          ...p,
          t: "id",
          v: m[0].toUpperCase(),
          raw: m[0],
          e: i + m[0].length,
        });
        adv(m[0].length);
        continue;
      }
      if (ch === '"' || ch === "'") {
        const j = src.indexOf(ch, i + 1);
        if (j < 0 || src.slice(i, j).includes("\n")) {
          errors.push({ ...p, e: i + 1, msg: `字符串缺少结束引号「${ch}」` });
          adv(1);
          continue;
        }
        toks.push({ ...p, t: "str", v: src.slice(i + 1, j), e: j + 1 });
        adv(j - i + 1);
        continue;
      }
      const two = src.substr(i, 2);
      if ([":=", ">=", "<=", "<>", "!=", "==", "&&", "||"].includes(two)) {
        toks.push({ ...p, t: "op", v: two, e: i + 2 });
        adv(2);
        continue;
      }
      if ("+-*/><=(),;:#".includes(ch)) {
        toks.push({ ...p, t: "op", v: ch, e: i + 1 });
        adv(1);
        continue;
      }
      if (FULLWIDTH[ch]) {
        errors.push({
          ...p,
          e: i + 1,
          msg: `检测到中文全角符号「${ch}」，请改为半角「${FULLWIDTH[ch]}」`,
        });
      } else {
        errors.push({ ...p, e: i + 1, msg: `非法字符「${ch}」` });
      }
      adv(1);
    }
    toks.push({ t: "eof", line, col, s: src.length, e: src.length });
    return { toks, cmts, errors, warns };
  }

  function checkMai(src) {
    const diagnostics = [];
    const lx = lexMai(src);
    lx.errors.forEach((e) =>
      diagnostics.push({
        level: "error",
        line: e.line,
        col: e.col,
        s: e.s,
        e: e.e,
        text: e.msg,
      })
    );
    lx.warns.forEach((w) =>
      diagnostics.push({
        level: "warn",
        line: w.line,
        col: w.col,
        s: w.s,
        e: w.e,
        text: w.msg,
      })
    );

    const stripLineComment = (s) => s.replace(/\/\/.*$/, "").trim();

    const lines = src.split("\n");
    let hasPlotOnMain = false;
    let tdxColonPlots = 0;

    lines.forEach((raw, idx) => {
      const lineNo = idx + 1;
      const line = stripLineComment(raw);
      if (!line || line.startsWith("{")) return;

      const isColonPlot = TDX_COLON_OUTPUT.test(line);
      if (isColonPlot) tdxColonPlots++;

      const head = line.match(/^\s*([A-Za-z_\u4e00-\u9fa5][\w\u4e00-\u9fa5]*)\s*\(/u);
      const isDrawFn = !!head && DRAW_FUNCS.has(head[1].toUpperCase());
      if (TDX_TRAIL_ATTR.test(line) && !isDrawFn && !/^\s*PLOT\s*\(/i.test(line) && !isColonPlot) {
        diagnostics.push({
          level: "error",
          line: lineNo,
          text: "行末颜色 / 线型（如 ,COLORRED）只能跟在通达信绘图函数之后；普通输出请用 PLOT … COLOR \"#RRGGBB\" WIDTH 2;",
        });
      }

      if (!/^PARAM\b/i.test(line) && !/[;,(+\-*/=<>]$/.test(line) && !/^(AND|OR)\b/i.test(line)) {
        diagnostics.push({
          level: "warn",
          line: lineNo,
          text: "语句建议以分号「;」结束（麦语言约定）",
        });
      }

      if (/^PLOT\b[\s\S]*\b(ON\s+MAIN|ON_MAIN)\b/i.test(line)) hasPlotOnMain = true;
    });

    const pre = global.MaiCompile ? global.MaiCompile.preprocess(src) : null;
    const plots = pre ? pre.directives.filter((d) => d.kind === "plot").length : 0;
    const marks = pre ? pre.directives.filter((d) => d.kind === "mark").length : 0;
    const drawCalls = (src.match(/\b(STICKLINE|DRAWTEXT|DRAWICON|DRAWNUMBER|PLOYLINE|DRAWKLINE|DRAWTEXT_FIX)\s*\(/gi) || []).length;
    const upper = src.toUpperCase();
    const stats = {
      params: pre ? pre.params.length : (src.match(/^\s*PARAM\b/gim) || []).length,
      plots: plots + tdxColonPlots,
      tdxColonPlots,
      marks,
      plotMain: hasPlotOnMain || tdxColonPlots > 0,
      signals: (["BUY", "SELL"].filter((k) => new RegExp(`\\b${k}\\s*:=`).test(upper)) || []).length,
    };

    if (!plots && !marks && !drawCalls && !tdxColonPlots) {
      diagnostics.push({
        level: "warn",
        text: "未声明图表输出；可用 PLOT … ON MAIN …;、MARK …;，或通达信写法「MA5:MA(CLOSE,5),COLORRED;」",
      });
    }

    const ok = !diagnostics.some((d) => d.level === "error");
    return { ok, diagnostics, stats, lx };
  }

  function lineRangeInSrc(src, lineNo) {
    if (!lineNo || lineNo < 1) return null;
    const lines = src.split("\n");
    if (lineNo > lines.length) return null;
    let s = 0;
    for (let i = 0; i < lineNo - 1; i++) s += lines[i].length + 1;
    const e = s + lines[lineNo - 1].length;
    return { s, e };
  }

  function errRangesFromCheck(checkResult, src) {
    const seen = new Set();
    const ranges = [];
    (checkResult?.diagnostics || []).forEach((d) => {
      if (d.level !== "error") return;
      let r = null;
      if (d.line) r = lineRangeInSrc(src, d.line);
      else if (d.s != null) {
        r = {
          s: d.s,
          e: typeof d.e === "number" && d.e > d.s ? d.e : d.s + 1,
        };
      }
      if (!r) return;
      const key = `${r.s}:${r.e}`;
      if (seen.has(key)) return;
      seen.add(key);
      ranges.push(r);
    });
    return ranges;
  }

  function appendErrGapParts(parts, errRanges) {
    errRanges.forEach((r) => {
      if (!parts.some((p) => p.s < r.e && p.e > r.s)) {
        parts.push({ s: r.s, e: r.e, errGap: true });
      }
    });
    parts.sort((a, b) => a.s - b.s || (a.errGap ? 1 : -1));
    return parts;
  }

  function paintMai(src, checkResult) {
    const lx = lexMai(src);
    const errRanges = errRangesFromCheck(checkResult, src);
    const assigns = new Set();
    lx.toks.forEach((t, i) => {
      const nx = lx.toks[i + 1];
      if (t.t === "id" && nx && nx.t === "op" && (nx.v === ":=" || nx.v === ":")) {
        if (nx.v === ":=") assigns.add(t.v);
      }
    });

    let parts = lx.toks
      .filter((t) => t.t !== "eof")
      .map((t) => ({ s: t.s, e: t.e, t }))
      .concat(lx.cmts.map((c) => ({ s: c.s, e: c.e, cmt: true })));
    parts = appendErrGapParts(parts, errRanges);

    let html = "";
    let p = 0;
    parts.forEach((x) => {
      if (x.s < p) return;
      html += esc(src.slice(p, x.s));
      if (x.errGap) {
        html += `<span class="hl-err">${esc(src.slice(x.s, x.e))}</span>`;
        p = x.e;
        return;
      }
      let cls = "";
      if (x.cmt) cls = "hl-cmt";
      else if (x.t.t === "num") cls = "hl-num";
      else if (x.t.t === "str") cls = "hl-str";
      else if (x.t.t === "id") {
        if (assigns.has(x.t.v) || MAI_SIGNALS.has(x.t.v)) cls = "hl-out";
        else if (MAI_KEYWORDS.has(x.t.v)) cls = "hl-param";
        else if (MAI_OPTION_WORDS.has(x.t.v) || MAI_ATTRS.has(x.t.v)) cls = "hl-attr";
        else if (isKnownFn(x.t.v)) cls = "hl-fn";
      }
      const overlaps = errRanges.filter((r) => r.s < x.e && r.e > x.s);
      if (!overlaps.length) {
        const txt = esc(src.slice(x.s, x.e));
        html += cls ? `<span class="${cls}">${txt}</span>` : txt;
      } else {
        let c = x.s;
        let inner = "";
        overlaps
          .slice()
          .sort((a, b) => a.s - b.s)
          .forEach((r) => {
            const rs = Math.max(r.s, x.s);
            const re = Math.min(r.e, x.e);
            if (rs > c) inner += esc(src.slice(c, rs));
            if (re > rs) inner += `<span class="hl-err">${esc(src.slice(rs, re))}</span>`;
            c = Math.max(c, re);
          });
        if (c < x.e) inner += esc(src.slice(c, x.e));
        html += cls ? `<span class="${cls}">${inner}</span>` : inner;
      }
      p = x.e;
    });
    html += esc(src.slice(p)) + "\n ";

    const errLines = new Set(
      (checkResult?.diagnostics || [])
        .filter((d) => d.level === "error" && d.line)
        .map((d) => d.line)
    );
    const lineCount = Math.max(1, src.split("\n").length);
    const gutter = Array.from({ length: lineCount }, (_, i) => {
      const n = i + 1;
      return errLines.has(n) ? `<span class="err">${n}</span>` : String(n);
    }).join("\n");

    return { html, gutter };
  }

  function caretInfo(src, pos) {
    const before = src.slice(0, pos);
    const ln = before.split("\n").length;
    const col = pos - before.lastIndexOf("\n");
    const word =
      (/[A-Za-z0-9_]*$/.exec(before)?.[0] || "") +
      (/^[A-Za-z0-9_]*/.exec(src.slice(pos))?.[0] || "");
    const w = word.toUpperCase();
    let hint = "";
    if (w === "PARAM") hint = "声明可调参数：PARAM N INT = 20; / PARAM K FLOAT = 2.0;";
    else if (w === "PLOT") hint = "绘制曲线：PLOT 表达式 ON MAIN|SUB [COLOR \"#hex\"] [WIDTH n] [LABEL \"…\"] [STYLE SOLID|DASH|DOT];";
    else if (w === "MARK") hint = "标记信号：MARK 条件 [LABEL \"…\"] [POSITION ABOVE|BELOW] [COLOR \"#hex\"];";
    else if (MAI_OPTION_WORDS.has(w)) hint = `PLOT / MARK 选项 ${w}`;
    else if (MAI_FUNCS.has(w)) hint = `麦语言函数 ${w}`;
    else if (isKnownFn(w)) hint = `通达信兼容函数 ${w}`;
    else if (MAI_ATTRS.has(w)) hint = `绘图属性 ${w}`;
    else if (MAI_SIGNALS.has(w)) hint = `交易信号 ${w}（回测门控）`;
    else hint = "使用 // 注释，语句以 ; 结束，赋值使用 :=";
    return { line: ln, col, chars: src.length, hint };
  }

  global.MaiLang = { lexMai, checkMai, paintMai, caretInfo };
})(window);
