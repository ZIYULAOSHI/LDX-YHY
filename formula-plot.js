/**
 * 麦语言主图输出 · 轻量求值（图例数值 + 主图叠加线）
 */
(function (global) {
  const PALETTE = ["#2f7de1", "#0d9488", "#94a3b8", "#e6b800", "#bd4c59", "#6b5ce6"];

  function stripComments(src) {
    return src
      .replace(/\/\/[^\n]*/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .trim();
  }

  function maFromSeries(series, period) {
    const p = Math.max(1, Math.floor(period));
    const out = new Array(series.length).fill(null);
    let sum = 0;
    for (let i = 0; i < series.length; i++) {
      const v = series[i];
      if (v == null || !isFinite(v)) continue;
      sum += v;
      if (i >= p) {
        const old = series[i - p];
        if (old != null && isFinite(old)) sum -= old;
      }
      if (i >= p - 1) out[i] = sum / p;
    }
    return out;
  }

  function stddevFromSeries(series, period) {
    const p = Math.max(2, Math.floor(period));
    const out = new Array(series.length).fill(null);
    for (let i = p - 1; i < series.length; i++) {
      let s = 0;
      let ok = true;
      for (let j = i - p + 1; j <= i; j++) {
        if (series[j] == null || !isFinite(series[j])) {
          ok = false;
          break;
        }
        s += series[j];
      }
      if (!ok) continue;
      const mean = s / p;
      let v = 0;
      for (let j = i - p + 1; j <= i; j++) v += (series[j] - mean) ** 2;
      out[i] = Math.sqrt(v / p);
    }
    return out;
  }

  function emaFromSeries(series, period) {
    const p = Math.max(1, Math.floor(period));
    const k = 2 / (p + 1);
    const out = new Array(series.length).fill(null);
    let prev = null;
    for (let i = 0; i < series.length; i++) {
      const v = series[i];
      if (v == null || !isFinite(v)) continue;
      if (prev == null) {
        if (i < p - 1) continue;
        let s = 0;
        for (let j = i - p + 1; j <= i; j++) s += series[j];
        prev = s / p;
        out[i] = prev;
      } else {
        prev = v * k + prev * (1 - k);
        out[i] = prev;
      }
    }
    return out;
  }

  function binOp(a, b, op) {
    const n = Math.max(a.length, b.length);
    const out = new Array(n).fill(null);
    for (let i = 0; i < n; i++) {
      const x = a[i];
      const y = b[i];
      if (x == null || y == null || !isFinite(x) || !isFinite(y)) continue;
      if (op === "+") out[i] = x + y;
      else if (op === "-") out[i] = x - y;
      else if (op === "*") out[i] = x * y;
      else if (op === "/") out[i] = y === 0 ? null : x / y;
    }
    return out;
  }

  function splitTopLevel(expr, chars) {
    let depth = 0;
    for (let i = expr.length - 1; i >= 0; i--) {
      const ch = expr[i];
      if (ch === ")") depth++;
      else if (ch === "(") depth--;
      else if (depth === 0) {
        for (const op of chars) {
          if (expr.slice(i, i + op.length) === op) {
            const left = expr.slice(0, i).trim();
            const right = expr.slice(i + op.length).trim();
            if (!left || !right) continue;
            return { op, left, right };
          }
        }
      }
    }
    return null;
  }

  function resolveScalar(token, env) {
    token = token.trim();
    if (/^\d+(\.\d+)?$/.test(token)) return parseFloat(token);
    const key = token.toUpperCase();
    if (typeof env[key] === "number") return env[key];
    return null;
  }

  function builtinIndParams(ind, uiParams) {
    const out = { ...(uiParams || {}) };
    (ind.params || []).forEach((p) => {
      const k = p.n.toUpperCase();
      if (out[k] == null) out[k] = p.def;
      if (out[p.n] == null) out[p.n] = p.def;
    });
    return out;
  }

  function evalBuiltinIndicatorRef(indName, outName, bars, uiParams) {
    const SysInd = global.SysInd;
    if (!SysInd || !bars?.length) return null;
    const ind = SysInd.getByName(String(indName || "").toUpperCase());
    if (!ind) return null;
    const pvals = builtinIndParams(ind, uiParams);
    const ev = SysInd.evaluate(ind.name, bars, pvals);
    const row = (ev.outputs || []).find((o) => String(o.name).toUpperCase() === String(outName).toUpperCase());
    return row?.data ? row.data.slice() : null;
  }

  /**
   * @param {string} expr
   * @param {Record<string, *>} env
   * @param {number} n
   * @param {{ bars?: Array, uiParams?: Record<string,number> }} ctx
   */
  function evalSeries(expr, env, n, ctx) {
    expr = expr.trim();
    if (!expr) return new Array(n).fill(null);

    const indRef = expr.match(/^([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\s*$/);
    if (indRef) {
      const data = evalBuiltinIndicatorRef(indRef[1], indRef[2], ctx?.bars, ctx?.uiParams);
      if (data && data.length) return data;
    }

    const addSub = splitTopLevel(expr, ["+", "-"]);
    if (addSub) return binOp(evalSeries(addSub.left, env, n, ctx), evalSeries(addSub.right, env, n, ctx), addSub.op);

    const mulDiv = splitTopLevel(expr, ["*", "/"]);
    if (mulDiv) return binOp(evalSeries(mulDiv.left, env, n, ctx), evalSeries(mulDiv.right, env, n, ctx), mulDiv.op);

    const ma = expr.match(/^MA\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)$/i);
    if (ma) {
      const s = evalSeries(ma[1], env, n, ctx);
      const per = resolveScalar(ma[2], env);
      if (per == null) return new Array(n).fill(null);
      return maFromSeries(s, per);
    }

    const sd = expr.match(/^STD(?:DEV)?\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)$/i);
    if (sd) {
      const s = evalSeries(sd[1], env, n, ctx);
      const per = resolveScalar(sd[2], env);
      if (per == null) return new Array(n).fill(null);
      return stddevFromSeries(s, per);
    }

    const ema = expr.match(/^EMA\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)$/i);
    if (ema) {
      const s = evalSeries(ema[1], env, n, ctx);
      const per = resolveScalar(ema[2], env);
      if (per == null) return new Array(n).fill(null);
      return emaFromSeries(s, per);
    }

    const ref = expr.match(/^REF\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)$/i);
    if (ref) {
      const s = evalSeries(ref[1], env, n, ctx);
      const k = resolveScalar(ref[2], env);
      if (k == null) return new Array(n).fill(null);
      const out = new Array(n).fill(null);
      const shift = Math.floor(k);
      for (let i = 0; i < n; i++) {
        const j = i - shift;
        if (j >= 0 && j < n) out[i] = s[j];
      }
      return out;
    }

    const cross = expr.match(/^CROSS(DOWN)?\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)$/i);
    if (cross) {
      const down = !!cross[1];
      const a = evalSeries(down ? cross[3] : cross[2], env, n, ctx);
      const b = evalSeries(down ? cross[2] : cross[3], env, n, ctx);
      const out = new Array(n).fill(0);
      for (let i = 1; i < n; i++) {
        const x0 = a[i - 1];
        const y0 = b[i - 1];
        const x1 = a[i];
        const y1 = b[i];
        if ([x0, y0, x1, y1].some((v) => v == null || !isFinite(v))) continue;
        if (x0 <= y0 && x1 > y1) out[i] = 1;
      }
      return out;
    }

    if (/^\d+(\.\d+)?$/.test(expr)) {
      const v = parseFloat(expr);
      return new Array(n).fill(v);
    }

    const id = expr.replace(/\s/g, "");
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(id)) {
      const key = id.toUpperCase();
      if (Array.isArray(env[key])) return env[key];
      if (typeof env[key] === "number") return new Array(n).fill(env[key]);
    }

    if (expr.startsWith("(") && expr.endsWith(")")) return evalSeries(expr.slice(1, -1), env, n, ctx);

    return new Array(n).fill(null);
  }

  function parsePlotDirectives(source) {
    /** @type {Map<string,{onMain:boolean,color?:string,label?:string}>} */
    const plots = new Map();
    const re = /PLOT\s*\(\s*([\w.]+)\s*,\s*(\w+)\s*([^);]*)\)/gi;
    let m;
    while ((m = re.exec(source)) !== null) {
      const varName = m[1].split(".").pop().toUpperCase();
      const where = m[2].toUpperCase();
      const rest = m[3] || "";
      const colorM = rest.match(/COLOR\s*=\s*["']([^"']+)["']/i);
      const labelM = rest.match(/LABEL\s*=\s*["']([^"']+)["']/i);
      plots.set(varName, {
        onMain: where === "ON_MAIN",
        color: colorM ? colorM[1] : undefined,
        label: labelM ? labelM[1] : undefined,
      });
    }
    return plots;
  }

  function parseAssignments(clean) {
    const list = [];
    const re = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:=\s*([^;]+);/gm;
    let m;
    while ((m = re.exec(clean)) !== null) {
      list.push({ name: m[1].toUpperCase(), expr: m[2].trim() });
    }
    return list;
  }

  const TDX_OUTPUT_TAIL =
    /,\s*(COLOR(?:RED|GREEN|BLUE|YELLOW|WHITE|BLACK|GRAY|GREY|MAGENTA|CYAN|BROWN|LIGHTGRAY|LIGHTRED|LIGHTGREEN|LIGHTBLUE|LIGHTMAGENTA|LIGHTCYAN|[0-9A-F]{6})|LINETHICK[1-9]|DOTLINE|VOLSTICK|COLORSTICK|STICK|LINESTICK|DRAWABOVE|NODRAW|NOTEXT|CROSSDOT|POINTDOT|CIRCLEDOT)\s*$/i;

  /** 从通达信输出表达式尾部剥掉 ,COLORRED / ,LINETHICK2 等属性 */
  function splitTdxOutputTail(rawExpr) {
    let expr = String(rawExpr || "").trim();
    const attrs = [];
    for (;;) {
      const m = expr.match(TDX_OUTPUT_TAIL);
      if (!m) break;
      attrs.unshift(m[1].toUpperCase());
      expr = expr.slice(0, m.index).trim();
    }
    return { expr, attrs };
  }

  /** 输出线：单冒号「名称:表达式[,属性…];」（非 :=） */
  function parseColonOutputs(clean) {
    const list = [];
    const re = /^\s*([A-Za-z_\u4e00-\u9fa5][\w\u4e00-\u9fa5]*)\s*:(?!=)\s*([^;]+);/gmu;
    let m;
    while ((m = re.exec(clean)) !== null) {
      const tail = splitTdxOutputTail(m[2]);
      if (tail.attrs.some((a) => a === "NODRAW")) continue;
      list.push({ name: m[1].toUpperCase(), expr: tail.expr, attrs: tail.attrs });
    }
    return list;
  }

  function parseParamsFromSource(text, uiParams) {
    const params = { ...uiParams };
    const parse = global.parseParamDefsFromSource;
    if (typeof parse !== "function") return params;
    parse(text).forEach((d) => {
      const k = d.key.toUpperCase();
      if (params[k] != null) return;
      params[k] = d.type === "INT" ? Math.round(d.value) : d.value;
    });
    return params;
  }

  /**
   * @param {Array<{o,h,l,c,v}>} bars
   * @param {{ source: string, kind: string, template: string, title: string, uiParams: Record<string,number> }} opt
   */
  function resolveAssignOnMain(expr, meta, plotPrefer) {
    if (meta) return !!meta.onMain;
    const m = String(expr || "").match(/^([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\s*$/);
    if (m && global.SysInd) {
      const ind = SysInd.getByName(m[1].toUpperCase());
      if (ind) return ind.draw !== "sub";
    }
    if (plotPrefer === "sub") return false;
    if (plotPrefer === "main" || plotPrefer === "main_axis") return true;
    return true;
  }

  /** PLOT / MARK 语句经 MaiCompile 编译后由通达信运行时求值 */
  function buildFromCompiled(bars, r, opt) {
    const outputs = r.plots.map((p) => ({
      name: p.label,
      label: p.label,
      color: p.color,
      data: p.data,
      onMain: p.where === "main",
      digits: p.data.every((v) => v == null || Number.isInteger(v)) ? 0 : 3,
    }));
    const toSeries = (p) => ({
      name: p.label,
      data: p.data,
      style: { color: p.color, thick: p.width, dash: p.style === "dash" ? [6, 4] : p.style === "dot" ? [2, 3] : null },
    });
    const H = bars.map((b) => b.h);
    const L = bars.map((b) => b.l);
    const markDrawings = r.marks.map((m) => ({
      draw: "mark",
      cond: m.cond,
      p: m.position === "above" ? H : L,
      position: m.position,
      color: m.color,
      label: m.label,
    }));
    return {
      title: opt.title || "自定义公式",
      outputs,
      mainLineSeries: r.plots.filter((p) => p.where === "main").map(toSeries),
      subLineSeries: r.plots.filter((p) => p.where !== "main").map(toSeries),
      mainDrawings: markDrawings.concat(r.drawings || []),
      signals: {
        BUY: r.signals?.BUY || null,
        SELL: r.signals?.SELL || null,
      },
      compiled: true,
    };
  }

  function buildChartPlot(bars, opt) {
    if (!bars.length) return { title: opt.title || "—", outputs: [], mainLineSeries: [], subLineSeries: [] };

    if (global.MaiCompile) {
      const r = global.MaiCompile.evaluate(bars, opt.source || "", opt.uiParams || {});
      if (r.directives.length || r.signals || (r.drawings && r.drawings.length)) return buildFromCompiled(bars, r, opt);
    }

    const clean = stripComments(opt.source || "");
    const n = bars.length;
    const params = parseParamsFromSource(clean, opt.uiParams || {});
    Object.entries(opt.uiParams || {}).forEach(([k, v]) => {
      params[k.toUpperCase()] = v;
    });
    const evalCtx = { bars, uiParams: params };
    const plotPrefer = opt.plotDrawMethod || "main";

    const env = {
      CLOSE: bars.map((b) => b.c),
      OPEN: bars.map((b) => b.o),
      HIGH: bars.map((b) => b.h),
      LOW: bars.map((b) => b.l),
      VOL: bars.map((b) => b.v),
      VOLUME: bars.map((b) => b.v),
      ...params,
    };

    const assigns = parseAssignments(clean);
    const colonOuts = parseColonOutputs(clean);
    const plots = parsePlotDirectives(opt.source || "");

    for (let pass = 0; pass < 8; pass++) {
      let any = false;
      for (const a of assigns) {
        if (Array.isArray(env[a.name])) continue;
        const series = evalSeries(a.expr, env, n, evalCtx);
        if (series.some((v) => v != null && isFinite(v))) {
          env[a.name] = series;
          any = true;
        }
      }
      for (const o of colonOuts) {
        if (Array.isArray(env[o.name])) continue;
        const series = evalSeries(o.expr, env, n, evalCtx);
        if (series.some((v) => v != null && isFinite(v))) {
          env[o.name] = series;
          any = true;
        }
      }
      if (!any) break;
    }

    const outputs = [];
    let colorIx = 0;
    for (const o of colonOuts) {
      const data = env[o.name];
      if (!Array.isArray(data)) continue;
      if (!data.some((v) => v != null && isFinite(v))) continue;
      const meta = plots.get(o.name);
      const isSignal = /^(BUY|SELL|SHORT|COVER)$/.test(o.name);
      const onMain = isSignal ? false : resolveAssignOnMain(o.expr, meta, plotPrefer);
      const tdxColor = global.MaiCompile && o.attrs?.length ? global.MaiCompile.tdxAttrColor(o.attrs) : null;
      const thickM = (o.attrs || []).map((a) => /^LINETHICK(\d)$/.exec(a)).find(Boolean);
      const dash = (o.attrs || []).some((a) => a === "DOTLINE");
      outputs.push({
        name: o.name,
        label: meta?.label || o.name,
        color: meta?.color || tdxColor || PALETTE[colorIx++ % PALETTE.length],
        data,
        onMain,
        digits: isSignal ? 0 : data.every((v) => v == null || Number.isInteger(v)) ? 0 : 3,
        _thick: thickM ? parseInt(thickM[1], 10) : 1.5,
        _dash: dash,
      });
    }

    const toSeries = (o) => ({
      name: o.label || o.name,
      data: o.data,
      style: { color: o.color, thick: o._thick ?? 1.5, dash: o._dash ? [6, 4] : null },
    });

    const mainLineSeries = outputs.filter((o) => o.onMain).map(toSeries);
    const subLineSeries = outputs.filter((o) => !o.onMain && !/^(BUY|SELL|SHORT|COVER)$/.test(o.name)).map(toSeries);

    return {
      title: opt.title || "自定义公式",
      outputs,
      mainLineSeries,
      subLineSeries,
      signals: {
        BUY: Array.isArray(env.BUY) ? env.BUY : null,
        SELL: Array.isArray(env.SELL) ? env.SELL : null,
      },
    };
  }

  global.MaiPlot = { buildChartPlot };
})(typeof window !== "undefined" ? window : globalThis);
