/**
 * 系统内置技术指标（与「量化策略生产平台-原型」lib 对齐）
 */
(function (global) {
  const PALETTE = ["#f0a020", "#2f7de1", "#9b59b6", "#1a9d49", "#d64545", "#0f8a9c"];
  const COLOR_MAP = {
    COLORRED: "#e53935",
    COLORGREEN: "#2e9d43",
    COLORBLUE: "#2f7de1",
    COLORYELLOW: "#e6b800",
    COLORGRAY: "#8a8a8a",
  };

  const P = (n, min, max, def, step) => ({ n, min, max, def, step: step || 1 });

  /** 内置指标输出线（引入指标时配置变量赋值） */
  const BUILTIN_OUTPUTS = {
    MA: [
      { name: "MA1", hint: "第 1 条均线" },
      { name: "MA2", hint: "第 2 条均线" },
      { name: "MA3", hint: "第 3 条均线" },
      { name: "MA4", hint: "第 4 条均线" },
    ],
    MACD: [
      { name: "DIF", hint: "快线 DIF" },
      { name: "DEA", hint: "信号线 DEA" },
      { name: "MACD", hint: "MACD 柱" },
    ],
    KDJ: [
      { name: "K", hint: "K 值" },
      { name: "D", hint: "D 值" },
      { name: "J", hint: "J 值" },
    ],
    RSI: [
      { name: "RSI1", hint: "RSI 周期 1" },
      { name: "RSI2", hint: "RSI 周期 2" },
      { name: "RSI3", hint: "RSI 周期 3" },
    ],
    BOLL: [
      { name: "BOLL", hint: "中轨" },
      { name: "UB", hint: "上轨" },
      { name: "LB", hint: "下轨" },
    ],
    VOL: [
      { name: "VOLUME", hint: "成交量柱" },
      { name: "MAVOL1", hint: "均量线 1" },
      { name: "MAVOL2", hint: "均量线 2" },
    ],
  };

  const SYSTEM_LIB = [
    {
      name: "MA",
      desc: "均线",
      draw: "main",
      params: [P("M1", 1, 250, 5), P("M2", 1, 250, 10), P("M3", 1, 250, 20), P("M4", 1, 250, 60)],
      note: "收盘价的简单移动平均，用于判断趋势方向。",
      wizard: "均线周期：Param#1、Param#2、Param#3、Param#4 日",
    },
    {
      name: "MACD",
      desc: "平滑异同平均",
      draw: "sub",
      params: [P("SHORT", 2, 200, 12), P("LONG", 2, 200, 26), P("MID", 2, 200, 9)],
      note: "DIF 上穿 DEA 为金叉；MACD 柱红绿反映多空力量。",
      wizard: "短周期、长周期、平滑周期",
    },
    {
      name: "KDJ",
      desc: "随机指标",
      draw: "sub",
      params: [P("N", 1, 100, 9), P("M1", 2, 100, 3), P("M2", 2, 100, 3)],
      note: "K、D 在 20 以下超卖，80 以上超买。",
      wizard: "计算周期 N，K/D 平滑",
    },
    {
      name: "RSI",
      desc: "相对强弱指标",
      draw: "sub",
      params: [P("N1", 2, 120, 6), P("N2", 2, 250, 12), P("N3", 2, 500, 24)],
      note: "RSI 高于 70 超买，低于 30 超卖。",
      wizard: "周期 Param#1 / #2 / #3",
    },
    {
      name: "BOLL",
      desc: "布林带",
      draw: "main",
      params: [P("M", 2, 120, 20)],
      note: "触及上/下轨表示偏强/偏弱。",
      wizard: "计算周期 M",
    },
    {
      name: "VOL",
      desc: "成交量",
      draw: "sub",
      params: [P("M1", 1, 500, 5), P("M2", 1, 500, 10)],
      note: "成交量柱与均量线。",
      wizard: "均量周期 M1、M2",
    },
  ];

  function closes(bars) {
    return bars.map((b) => b.c);
  }
  function highs(bars) {
    return bars.map((b) => b.h);
  }
  function lows(bars) {
    return bars.map((b) => b.l);
  }
  function vols(bars) {
    return bars.map((b) => b.v);
  }

  function maSeries(series, period) {
    const p = Math.max(1, Math.floor(period));
    const out = new Array(series.length).fill(null);
    let sum = 0;
    for (let i = 0; i < series.length; i++) {
      const v = series[i];
      if (v == null || !isFinite(v)) continue;
      sum += v;
      if (i >= p) sum -= series[i - p];
      if (i >= p - 1) out[i] = sum / p;
    }
    return out;
  }

  function emaSeries(series, period) {
    const p = Math.max(1, Math.floor(period));
    const out = new Array(series.length).fill(null);
    let y = null;
    for (let i = 0; i < series.length; i++) {
      const v = series[i];
      if (v == null || !isFinite(v)) continue;
      if (y == null) {
        if (i < p - 1) continue;
        let s = 0;
        for (let j = i - p + 1; j <= i; j++) s += series[j];
        y = s / p;
        out[i] = y;
      } else {
        y = (2 * v + (p - 1) * y) / (p + 1);
        out[i] = y;
      }
    }
    return out;
  }

  function smaTdx(x, n, m) {
    n = Math.max(1, Math.floor(n));
    m = Math.max(1, Math.floor(m));
    const out = new Array(x.length).fill(null);
    let y = null;
    for (let i = 0; i < x.length; i++) {
      const v = x[i];
      if (v == null || !isFinite(v)) continue;
      y = y == null ? v : (m * v + (n - m) * y) / n;
      out[i] = y;
    }
    return out;
  }

  function llv(series, n) {
    n = Math.max(1, Math.floor(n));
    const out = new Array(series.length).fill(null);
    for (let i = 0; i < series.length; i++) {
      let mn = Infinity;
      let ok = false;
      for (let j = Math.max(0, i - n + 1); j <= i; j++) {
        const v = series[j];
        if (v == null || !isFinite(v)) continue;
        ok = true;
        mn = Math.min(mn, v);
      }
      if (ok) out[i] = mn;
    }
    return out;
  }

  function hhv(series, n) {
    n = Math.max(1, Math.floor(n));
    const out = new Array(series.length).fill(null);
    for (let i = 0; i < series.length; i++) {
      let mx = -Infinity;
      let ok = false;
      for (let j = Math.max(0, i - n + 1); j <= i; j++) {
        const v = series[j];
        if (v == null || !isFinite(v)) continue;
        ok = true;
        mx = Math.max(mx, v);
      }
      if (ok) out[i] = mx;
    }
    return out;
  }

  function ref(series, k) {
    k = Math.floor(k);
    const out = new Array(series.length).fill(null);
    for (let i = 0; i < series.length; i++) {
      const j = i - k;
      if (j >= 0) out[i] = series[j];
    }
    return out;
  }

  function stdSeries(series, period) {
    const p = Math.max(2, Math.floor(period));
    const out = new Array(series.length).fill(null);
    for (let i = p - 1; i < series.length; i++) {
      let s = 0;
      let ok = true;
      for (let j = i - p + 1; j <= i; j++) {
        if (series[j] == null) {
          ok = false;
          break;
        }
        s += series[j];
      }
      if (!ok) continue;
      const mean = s / p;
      let v = 0;
      for (let j = i - p + 1; j <= i; j++) v += (series[j] - mean) ** 2;
      out[i] = Math.sqrt(v / (p - 1));
    }
    return out;
  }

  function binOp(a, b, op) {
    const n = a.length;
    const out = new Array(n).fill(null);
    for (let i = 0; i < n; i++) {
      const x = a[i];
      const y = b[i];
      if (x == null || y == null) continue;
      if (op === "+") out[i] = x + y;
      else if (op === "-") out[i] = x - y;
      else if (op === "*") out[i] = x * y;
      else if (op === "/") out[i] = y === 0 ? null : x / y;
    }
    return out;
  }

  function scaleConst(a, k) {
    return a.map((v) => (v == null ? null : v * k));
  }

  function styleOutput(name, attrs, i) {
    const s = { color: PALETTE[i % PALETTE.length], thick: 1.4, kind: "line", dash: false, nodraw: false };
    (attrs || []).forEach((a) => {
      if (COLOR_MAP[a]) s.color = COLOR_MAP[a];
      else if (a === "DOTLINE") s.dash = true;
      else if (a === "VOLSTICK" || a === "COLORSTICK") s.kind = a;
      else if (a === "NODRAW") s.nodraw = true;
    });
    return { name, style: s };
  }

  function buildOutputs(outputs) {
    return outputs
      .filter((o) => !o.nodraw)
      .map((o, i) => ({
        name: o.name,
        label: o.label || o.name,
        color: o.style.color,
        data: o.data,
        digits: o.digits ?? (o.style.kind === "COLORSTICK" ? 3 : 2),
        onMain: o.onMain,
        style: o.style,
      }));
  }

  function evaluate(name, bars, paramVals) {
    const n = bars.length;
    const C = closes(bars);
    const H = highs(bars);
    const L = lows(bars);
    const V = vols(bars);
    const p = (k, d) => paramVals[k] ?? paramVals[k.toUpperCase()] ?? d;

    if (name === "MA") {
      const series = [
        { name: "MA1", data: maSeries(C, p("M1", 5)), attrs: [], onMain: true },
        { name: "MA2", data: maSeries(C, p("M2", 10)), attrs: [], onMain: true },
        { name: "MA3", data: maSeries(C, p("M3", 20)), attrs: [], onMain: true },
        { name: "MA4", data: maSeries(C, p("M4", 60)), attrs: [], onMain: true },
      ].map((o, i) => Object.assign(o, styleOutput(o.name, o.attrs, i)));
      return {
        draw: "main",
        indicatorName: "MA",
        mainLineSeries: series.filter((s) => !s.style.nodraw),
        subLineSeries: [],
        outputs: buildOutputs(series),
      };
    }

    if (name === "MACD") {
      const dif = binOp(emaSeries(C, p("SHORT", 12)), emaSeries(C, p("LONG", 26)), "-");
      const dea = emaSeries(dif, p("MID", 9));
      const macd = scaleConst(binOp(dif, dea, "-"), 2);
      const series = [
        Object.assign(styleOutput("DIF", ["COLORBLUE"], 0), { data: dif, onMain: false }),
        Object.assign(styleOutput("DEA", ["COLORYELLOW"], 1), { data: dea, onMain: false }),
        Object.assign(styleOutput("MACD", ["COLORSTICK"], 2), { data: macd, onMain: false, digits: 3 }),
      ];
      return {
        draw: "sub",
        indicatorName: "MACD",
        mainLineSeries: [],
        subLineSeries: series,
        outputs: buildOutputs(series),
      };
    }

    if (name === "KDJ") {
      const nn = p("N", 9);
      const lowN = llv(L, nn);
      const highN = hhv(H, nn);
      const rsv = new Array(n).fill(null);
      for (let i = 0; i < n; i++) {
        const lo = lowN[i];
        const hi = highN[i];
        if (lo == null || hi == null || hi === lo) continue;
        rsv[i] = ((C[i] - lo) / (hi - lo)) * 100;
      }
      const k = smaTdx(rsv, p("M1", 3), 1);
      const d = smaTdx(k, p("M2", 3), 1);
      const j = binOp(scaleConst(k, 3), scaleConst(d, 2), "-");
      const series = [
        Object.assign(styleOutput("K", [], 0), { data: k, onMain: false }),
        Object.assign(styleOutput("D", [], 1), { data: d, onMain: false }),
        Object.assign(styleOutput("J", ["COLORRED"], 2), { data: j, onMain: false }),
      ];
      return {
        draw: "sub",
        indicatorName: "KDJ",
        mainLineSeries: [],
        subLineSeries: series,
        outputs: buildOutputs(series),
      };
    }

    if (name === "RSI") {
      const lc = ref(C, 1);
      const diff = binOp(C, lc, "-");
      const gain = diff.map((v) => (v == null ? null : Math.max(v, 0)));
      const absd = diff.map((v) => (v == null ? null : Math.abs(v)));
      const mk = (N) => {
        const num = smaTdx(gain, N, 1);
        const den = smaTdx(absd, N, 1);
        const out = new Array(n).fill(null);
        for (let i = 0; i < n; i++) {
          if (den[i] == null || den[i] === 0) continue;
          out[i] = (num[i] / den[i]) * 100;
        }
        return out;
      };
      const series = [
        Object.assign(styleOutput("RSI1", ["COLORRED"], 0), { data: mk(p("N1", 6)), onMain: false }),
        Object.assign(styleOutput("RSI2", ["COLORYELLOW"], 1), { data: mk(p("N2", 12)), onMain: false }),
        Object.assign(styleOutput("RSI3", ["COLORBLUE"], 2), { data: mk(p("N3", 24)), onMain: false }),
      ];
      return {
        draw: "sub",
        indicatorName: "RSI",
        mainLineSeries: [],
        subLineSeries: series,
        outputs: buildOutputs(series),
      };
    }

    if (name === "BOLL") {
      const m = p("M", 20);
      const boll = maSeries(C, m);
      const std = stdSeries(C, m);
      const twoStd = scaleConst(std, 2);
      const ub = binOp(boll, twoStd, "+");
      const lb = binOp(boll, twoStd, "-");
      const series = [
        Object.assign(styleOutput("BOLL", ["COLORYELLOW"], 0), { data: boll, onMain: true }),
        Object.assign(styleOutput("UB", ["COLORRED"], 1), { data: ub, onMain: true }),
        Object.assign(styleOutput("LB", ["COLORGREEN"], 2), { data: lb, onMain: true }),
      ];
      return {
        draw: "main",
        indicatorName: "BOLL",
        mainLineSeries: series,
        subLineSeries: [],
        outputs: buildOutputs(series),
      };
    }

    if (name === "VOL") {
      const vol = V.slice();
      const mav1 = maSeries(vol, p("M1", 5));
      const mav2 = maSeries(vol, p("M2", 10));
      const series = [
        Object.assign(styleOutput("VOLUME", ["VOLSTICK"], 0), { data: vol, onMain: false }),
        Object.assign(styleOutput("MAVOL1", ["COLORBLUE"], 1), { data: mav1, onMain: false }),
        Object.assign(styleOutput("MAVOL2", ["COLORYELLOW"], 2), { data: mav2, onMain: false }),
      ];
      return {
        draw: "sub",
        indicatorName: "VOL",
        mainLineSeries: [],
        subLineSeries: series,
        outputs: buildOutputs(series),
      };
    }

    return { draw: "main", indicatorName: name, mainLineSeries: [], subLineSeries: [], outputs: [] };
  }

  function getByName(name) {
    return SYSTEM_LIB.find((x) => x.name === name);
  }

  function paramDefs(ind) {
    if (!ind) return [];
    return ind.params.map((p) => ({
      key: p.n,
      type: "INT",
      value: p.def,
      opt: false,
      min: p.min,
      max: p.max,
      step: p.step,
    }));
  }

  function outputDefs(name) {
    return (BUILTIN_OUTPUTS[name] || []).slice();
  }

  function defaultImportBindings(name) {
    return outputDefs(name).map((o) => ({
      line: o.name,
      var: o.name,
      enabled: true,
    }));
  }

  global.SysInd = { SYSTEM_LIB, BUILTIN_OUTPUTS, getByName, paramDefs, outputDefs, defaultImportBindings, evaluate };
})(typeof window !== "undefined" ? window : globalThis);
