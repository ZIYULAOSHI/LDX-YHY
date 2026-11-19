/**
 * 通达信公式预览求值 · 移植自量化策略生产平台原型（IMPL + evaluate）
 */
(function (global) {
  let K = null;
  let BARS = [];
  let BAR_N = 0;
  let IMPL = null;
  let evaluateFn = null;
  const MY_SIGNALS = {};
  const cat = global.TdxFuncCatalog;
  if (cat && cat.TDX_FUNCS) {
    cat.TDX_FUNCS.forEach((f) => {
      if ((f.f || "").includes("A")) MY_SIGNALS[f.n] = f;
    });
  }

  function buildK(bars, meta) {
    const n = bars.length;
    const k = {
      n,
      meta: meta || {},
      O: [],
      H: [],
      L: [],
      C: [],
      V: [],
      AMO: [],
      DATE: [],
      YEAR: [],
      MONTH: [],
      DAY: [],
      WEEKDAY: [],
      idx: [],
    };
    for (let i = 0; i < n; i++) {
      const b = bars[i];
      k.O.push(b.o);
      k.H.push(b.h);
      k.L.push(b.l);
      k.C.push(b.c);
      k.V.push(b.v);
      k.AMO.push(Math.round((b.v || 0) * 100 * ((b.o + b.c) / 2)));
      const dt = new Date(b.t);
      k.YEAR.push(dt.getFullYear());
      k.MONTH.push(dt.getMonth() + 1);
      k.DAY.push(dt.getDate());
      k.WEEKDAY.push(dt.getDay());
      k.DATE.push((dt.getFullYear() - 1900) * 10000 + (dt.getMonth() + 1) * 100 + dt.getDate());
      k.idx.push(i);
    }
    return k;
  }

  function bindRuntime() {
  /* ---------- 序列运算工具 ---------- */
  const isNull = v => v === null || v === undefined || (typeof v === 'number' && !isFinite(v));
  const ser = x => Array.isArray(x) ? x : new Array(BAR_N).fill(x === undefined ? null : x);
  const at = (x, i) => Array.isArray(x) ? x[i] : x;
  const m1 = (x, f) => ser(x).map(v => isNull(v) ? null : f(v));
  const m2 = (x, y, f) => { const a = ser(x), b = ser(y); return a.map((v, i) => isNull(v) || isNull(b[i]) ? null : f(v, b[i])); };
  const b01 = v => v ? 1 : 0;
  const sum = s => s.reduce((p, q) => p + q, 0);
  function win(x, nArg, f, partial) {
    const a = ser(x);
    return a.map((_, i) => {
      let n = at(nArg, i);
      if (isNull(n)) return null;
      n = Math.floor(n);
      let s;
      if (n <= 0) s = a.slice(0, i + 1).filter(v => !isNull(v));
      else {
        if (i < n - 1 && !partial) return null;
        s = a.slice(Math.max(0, i - n + 1), i + 1);
        if (partial) s = s.filter(v => !isNull(v)); else if (s.some(isNull)) return null;
      }
      return s.length ? f(s, i) : null;
    });
  }
  function rec(x, step) {
    let y = null;
    return ser(x).map((v, i) => { if (isNull(v)) return y; y = y === null ? v : step(v, y, i); return y; });
  }
  function shift(x, nArg, dir) {
    const a = ser(x);
    return a.map((_, i) => { const k = at(nArg, i); if (isNull(k)) return null; const j = i - dir * Math.floor(k); return j >= 0 && j < BAR_N ? a[j] : null; });
  }
  function streak(test) { let cnt = 0; return K.idx.map(i => { cnt = test(i) ? cnt + 1 : 0; return cnt; }); }
  const variance = (s, pop) => { const m = sum(s) / s.length; const d = sum(s.map(v => (v - m) ** 2)); return pop ? d / s.length : (s.length > 1 ? d / (s.length - 1) : null); };
  function regress(s) {
    const n = s.length; if (n < 2) return null;
    const xs = s.map((_, k) => k), mx = (n - 1) / 2, my = sum(s) / n;
    const b = sum(xs.map((x, k) => (x - mx) * (s[k] - my))) / sum(xs.map(x => (x - mx) ** 2));
    return { b, a: my - b * mx, n };
  }
  const cross = (a, b) => { const A = ser(a), B = ser(b); return K.idx.map(i => i > 0 && !isNull(A[i]) && !isNull(B[i]) && !isNull(A[i - 1]) && !isNull(B[i - 1]) && A[i] > B[i] && A[i - 1] <= B[i - 1] ? 1 : 0); };
  function lastScalar(x) {
    const a = ser(x);
    for (let i = BAR_N - 1; i >= 0; i--) {
      if (!isNull(a[i])) return a[i];
    }
    return null;
  }
  function strScalar(x) {
    if (typeof x === 'string') return x;
    if (Array.isArray(x)) {
      for (let i = BAR_N - 1; i >= 0; i--) {
        if (!isNull(x[i])) return typeof x[i] === 'string' ? x[i] : String(x[i]);
      }
      return '';
    }
    if (isNull(x)) return '';
    return String(x);
  }

  /* ---------- 预览可计算的函数（[最少参数, 最多参数, 实现]） ---------- */
  IMPL = {
    /*IMPL_BEGIN*/
    OPEN: [0, 0, () => K.O], O: [0, 0, () => K.O],
    HIGH: [0, 0, () => K.H], H: [0, 0, () => K.H],
    LOW: [0, 0, () => K.L], L: [0, 0, () => K.L],
    CLOSE: [0, 0, () => K.C], C: [0, 0, () => K.C],
    VOL: [0, 0, () => K.V], V: [0, 0, () => K.V],
    AMOUNT: [0, 0, () => K.AMO], AMO: [0, 0, () => K.AMO],
    PERIOD: [0, 0, () => 5],
    DATE: [0, 0, () => K.DATE],
    TIME: [0, 0, () => 0],
    YEAR: [0, 0, () => K.YEAR],
    MONTH: [0, 0, () => K.MONTH],
    DAY: [0, 0, () => K.DAY],
    WEEKDAY: [0, 0, () => K.WEEKDAY],
    HOUR: [0, 0, () => 0],
    MINUTE: [0, 0, () => 0],
    CAPITAL: [0, 0, () => 1200000],
    TOTALCAPITAL: [0, 0, () => 1500000],
    DRAWNULL: [0, 0, () => null],
    BACKSET: [2, 2, (x, n) => { const out = new Array(BAR_N).fill(0); ser(x).forEach((v, i) => { if (v) { const k = Math.floor(at(n, i)); for (let j = Math.max(0, i - k + 1); j <= i; j++) out[j] = 1; } }); return out; }],
    BARSCOUNT: [1, 1, x => { let f = null; return ser(x).map((v, i) => { if (f === null && !isNull(v)) f = i; return f === null ? null : i - f + 1; }); }],
    BARSTATUS: [0, 0, () => K.idx.map(i => i === 0 ? 1 : i === BAR_N - 1 ? 2 : 0)],
    CURRBARSCOUNT: [0, 0, () => K.idx.map(i => BAR_N - i)],
    TOTALBARSCOUNT: [0, 0, () => BAR_N],
    ISLASTBAR: [0, 0, () => K.idx.map(i => b01(i === BAR_N - 1))],
    BARSLAST: [1, 1, x => { let last = null; return ser(x).map((v, i) => { if (v) last = i; return last === null ? null : i - last; }); }],
    BARSNEXT: [1, 1, x => { const a = ser(x); let next = null; const out = new Array(BAR_N); for (let i = BAR_N - 1; i >= 0; i--) { if (a[i]) next = i; out[i] = next === null ? null : next - i; } return out; }],
    BARSSINCE: [1, 1, x => { let f = null; return ser(x).map((v, i) => { if (f === null && v) f = i; return f === null ? null : i - f; }); }],
    BARSSINCEN: [2, 2, (x, n) => { const a = ser(x); return K.idx.map(i => { const k = Math.floor(at(n, i)); for (let j = Math.max(0, i - k + 1); j <= i; j++) if (a[j]) return i - j; return null; }); }],
    COUNT: [2, 2, (x, n) => win(x, n, s => s.filter(v => v).length, true)],
    BARSLASTCOUNT: [1, 1, x => { const a = ser(x); return streak(i => !!a[i]); }],
    HHV: [2, 2, (x, n) => win(x, n, s => Math.max(...s), true)],
    HHVBARS: [2, 2, (x, n) => win(x, n, s => s.length - 1 - s.lastIndexOf(Math.max(...s)), true)],
    LLV: [2, 2, (x, n) => win(x, n, s => Math.min(...s), true)],
    LLVBARS: [2, 2, (x, n) => win(x, n, s => s.length - 1 - s.lastIndexOf(Math.min(...s)), true)],
    HOD: [2, 2, (x, n) => win(x, n, s => 1 + s.filter(v => v > s[s.length - 1]).length, true)],
    LOD: [2, 2, (x, n) => win(x, n, s => 1 + s.filter(v => v < s[s.length - 1]).length, true)],
    REVERSE: [1, 1, x => m1(x, v => -v)],
    REF: [2, 2, (x, n) => shift(x, n, 1)],
    REFV: [2, 2, (x, n) => shift(x, n, 1)],
    REFX: [2, 2, (x, n) => shift(x, n, -1)],
    REFXV: [2, 2, (x, n) => shift(x, n, -1)],
    SUM: [2, 2, (x, n) => win(x, n, sum, true)],
    MULAR: [2, 2, (x, n) => win(x, n, s => s.reduce((p, q) => p * q, 1), true)],
    FILTER: [2, 2, (x, n) => { let until = -1; return ser(x).map((v, i) => { if (i <= until) return 0; if (v) { until = i + Math.floor(at(n, i)); return 1; } return 0; }); }],
    TR: [0, 0, () => K.idx.map(i => i === 0 ? K.H[i] - K.L[i] : Math.max(K.H[i] - K.L[i], Math.abs(K.H[i] - K.C[i - 1]), Math.abs(K.L[i] - K.C[i - 1])))],
    MA: [2, 2, (x, n) => win(x, n, s => sum(s) / s.length)],
    SMA: [3, 3, (x, n, m) => rec(x, (v, y, i) => (at(m, i) * v + (at(n, i) - at(m, i)) * y) / at(n, i))],
    TMA: [3, 3, (x, a, b) => rec(x, (v, y, i) => at(a, i) * y + at(b, i) * v)],
    MEMA: [2, 2, (x, n) => rec(x, (v, y, i) => (v + (at(n, i) - 1) * y) / at(n, i))],
    EMA: [2, 2, (x, n) => rec(x, (v, y, i) => (2 * v + (at(n, i) - 1) * y) / (at(n, i) + 1))],
    EXPMA: [2, 2, (x, n) => rec(x, (v, y, i) => (2 * v + (at(n, i) - 1) * y) / (at(n, i) + 1))],
    EXPMEMA: [2, 2, (x, n) => rec(x, (v, y, i) => (2 * v + (at(n, i) - 1) * y) / (at(n, i) + 1))],
    WMA: [2, 2, (x, n) => win(x, n, s => { let w = 0, t = 0; s.forEach((v, k) => { w += k + 1; t += v * (k + 1); }); return t / w; })],
    DMA: [2, 2, (x, a) => rec(x, (v, y, i) => at(a, i) * v + (1 - at(a, i)) * y)],
    RANGE: [3, 3, (a, b, c) => { const A = ser(a); return A.map((v, i) => isNull(v) ? null : b01(v > at(b, i) && v < at(c, i))); }],
    CONST: [1, 1, x => { const a = ser(x); return a[a.length - 1]; }],
    ZTPRICE: [2, 2, (p, r) => m2(p, r, (a, b) => Math.round(a * (1 + b) * 100) / 100)],
    DTPRICE: [2, 2, (p, r) => m2(p, r, (a, b) => Math.round(a * (1 - b) * 100) / 100)],
    CROSS: [2, 2, (a, b) => cross(a, b)],
    LONGCROSS: [3, 3, (a, b, n) => { const A = ser(a), B = ser(b), X = cross(a, b); return K.idx.map(i => { if (!X[i]) return 0; const k = Math.floor(at(n, i)); for (let j = 1; j <= k; j++) if (i - j < 0 || !(A[i - j] < B[i - j])) return 0; return 1; }); }],
    UPDOWN: [1, 1, x => { const a = ser(x); return K.idx.map(i => i === 0 || isNull(a[i]) || isNull(a[i - 1]) ? null : Math.sign(a[i] - a[i - 1])); }],
    UPNDAY: [2, 2, (x, m) => { const a = ser(x); const s = streak(i => i > 0 && a[i] > a[i - 1]); return s.map((v, i) => b01(v >= at(m, i))); }],
    DOWNNDAY: [2, 2, (x, m) => { const a = ser(x); const s = streak(i => i > 0 && a[i] < a[i - 1]); return s.map((v, i) => b01(v >= at(m, i))); }],
    NDAY: [3, 3, (x, y, n) => { const a = ser(x), b = ser(y); const s = streak(i => a[i] > b[i]); return s.map((v, i) => b01(v >= at(n, i))); }],
    EXIST: [2, 2, (x, n) => win(x, n, s => b01(s.some(v => v)), true)],
    EVERY: [2, 2, (x, n) => win(x, n, s => b01(s.every(v => v)))],
    LAST: [3, 3, (x, a, b) => { const X = ser(x); return K.idx.map(i => { const A = Math.floor(at(a, i)), B = Math.floor(at(b, i)); const from = A === 0 ? 0 : i - A, to = i - B; if (from < 0) return 0; for (let j = from; j <= to; j++) if (!X[j]) return 0; return 1; }); }],
    NOT: [1, 1, x => m1(x, v => b01(!v))],
    ISVALID: [1, 1, x => ser(x).map(v => b01(!isNull(v)))],
    IF: [3, 3, (x, a, b) => ser(x).map((v, i) => isNull(v) ? null : (v ? at(a, i) : at(b, i)))],
    IFF: [3, 3, (x, a, b) => ser(x).map((v, i) => isNull(v) ? null : (v ? at(a, i) : at(b, i)))],
    IFN: [3, 3, (x, a, b) => ser(x).map((v, i) => isNull(v) ? null : (v ? at(b, i) : at(a, i)))],
    VALUEWHEN: [2, 2, (cond, x) => { let y = null; return ser(cond).map((v, i) => { if (v) y = at(x, i); return y; }); }],
    MAX: [2, 2, (a, b) => m2(a, b, Math.max)],
    MIN: [2, 2, (a, b) => m2(a, b, Math.min)],
    MAX6: [2, 6, (...xs) => xs.reduce((p, q) => m2(p, q, Math.max))],
    MIN6: [2, 6, (...xs) => xs.reduce((p, q) => m2(p, q, Math.min))],
    ACOS: [1, 1, x => m1(x, Math.acos)], ASIN: [1, 1, x => m1(x, Math.asin)], ATAN: [1, 1, x => m1(x, Math.atan)],
    COS: [1, 1, x => m1(x, Math.cos)], SIN: [1, 1, x => m1(x, Math.sin)], TAN: [1, 1, x => m1(x, Math.tan)],
    EXP: [1, 1, x => m1(x, Math.exp)],
    LN: [1, 1, x => m1(x, v => v > 0 ? Math.log(v) : null)],
    LOG: [1, 1, x => m1(x, v => v > 0 ? Math.log10(v) : null)],
    SQRT: [1, 1, x => m1(x, v => v >= 0 ? Math.sqrt(v) : null)],
    ABS: [1, 1, x => m1(x, Math.abs)],
    POW: [2, 2, (a, b) => m2(a, b, Math.pow)],
    CEILING: [1, 1, x => m1(x, Math.ceil)],
    FLOOR: [1, 1, x => m1(x, Math.floor)],
    INTPART: [1, 1, x => m1(x, Math.trunc)],
    BETWEEN: [3, 3, (a, b, c) => ser(a).map((v, i) => { const lo = Math.min(at(b, i), at(c, i)), hi = Math.max(at(b, i), at(c, i)); return isNull(v) ? null : b01(v >= lo && v <= hi); })],
    FRACPART: [1, 1, x => m1(x, v => v - Math.trunc(v))],
    ROUND: [1, 1, x => m1(x, Math.round)],
    ROUND2: [2, 2, (x, n) => m2(x, n, (v, k) => Math.round(v * 10 ** k) / 10 ** k)],
    SIGN: [1, 1, x => m1(x, Math.sign)],
    SGN: [1, 1, x => m1(x, Math.sign)],
    MOD: [2, 2, (a, b) => m2(a, b, (p, q) => q === 0 ? null : p % q)],
    AVEDEV: [2, 2, (x, n) => win(x, n, s => { const m = sum(s) / s.length; return sum(s.map(v => Math.abs(v - m))) / s.length; })],
    DEVSQ: [2, 2, (x, n) => win(x, n, s => { const m = sum(s) / s.length; return sum(s.map(v => (v - m) ** 2)); })],
    FORCAST: [2, 2, (x, n) => win(x, n, s => { const r = regress(s); return r ? r.a + r.b * (r.n - 1) : null; })],
    SLOPE: [2, 2, (x, n) => win(x, n, s => { const r = regress(s); return r ? r.b : null; })],
    STD: [2, 2, (x, n) => win(x, n, s => { const v = variance(s, false); return v === null ? null : Math.sqrt(v); })],
    STDP: [2, 2, (x, n) => win(x, n, s => Math.sqrt(variance(s, true)))],
    STDDEV: [2, 2, (x, n) => win(x, n, s => { const v = variance(s, false); return v === null ? null : Math.sqrt(v); })],
    VAR: [2, 2, (x, n) => win(x, n, s => variance(s, false))],
    VARP: [2, 2, (x, n) => win(x, n, s => variance(s, true))],
    PLOYLINE: [2, 2, (cond, p) => ({ draw: 'ploy', cond: ser(cond), p: ser(p) })],
    DRAWKLINE: [4, 4, (h, o, l, c) => ({ draw: 'kline', h: ser(h), o: ser(o), l: ser(l), c: ser(c) })],
    STICKLINE: [5, 5, (cond, p1, p2, w, empty) => ({ draw: 'stick', cond: ser(cond), p1: ser(p1), p2: ser(p2), w: at(w, BAR_N - 1), empty: at(empty, BAR_N - 1) })],
    DRAWICON: [3, 3, (cond, p, type) => ({ draw: 'icon', cond: ser(cond), p: ser(p), type: at(type, BAR_N - 1) })],
    DRAWTEXT: [3, 3, (cond, p, text) => ({ draw: 'text', cond: ser(cond), p: ser(p), text })],
    DRAWTEXT_FIX: [5, 5, (cond, x, y, type, text) => ({
      draw: 'text_fix',
      cond: ser(cond),
      x: at(x, BAR_N - 1),
      y: at(y, BAR_N - 1),
      type: at(type, BAR_N - 1),
      text: strScalar(text).slice(0, 250),
    })],
    DRAWNUMBER: [3, 3, (cond, p, num) => ({ draw: 'number', cond: ser(cond), p: ser(p), num: ser(num) })],
    CODE: [0, 0, () => (K.meta && K.meta.code) || '000000'],
    STKNAME: [0, 0, () => (K.meta && K.meta.name) || '标的'],
    CON2STR: [2, 2, (a, n) => {
      const v = lastScalar(a);
      const d = Math.max(0, Math.floor(+at(n, BAR_N - 1) || 0));
      if (isNull(v)) return '';
      if (typeof v === 'string') return v;
      return (+v).toFixed(d);
    }],
    VAR2STR: [2, 2, (a, n) => ser(a).map((v, i) => {
      if (isNull(v)) return null;
      const d = Math.max(0, Math.floor(+at(n, i) || 0));
      return typeof v === 'string' ? v : (+v).toFixed(d);
    })],
    STR2CON: [1, 1, s => {
      const x = parseFloat(strScalar(s));
      return isFinite(x) ? x : null;
    }],
    STRLEN: [1, 1, s => strScalar(s).length],
    STRCAT: [2, 2, (a, b) => strScalar(a) + strScalar(b)],
    STRSPACE: [1, 1, a => strScalar(a) + ' '],
    SUBSTR: [3, 3, (s, pos, len) => {
      const S = strScalar(s);
      let p = Math.floor(+at(pos, BAR_N - 1) || 1);
      let n = Math.floor(+at(len, BAR_N - 1) || 0);
      if (p < 1) p = 1;
      return S.slice(p - 1, p - 1 + Math.max(0, n));
    }],
    VARCAT: [2, 2, (a, b) => {
      const A = ser(a), B = ser(b);
      return A.map((v, i) => strScalar(v) + strScalar(B[i]));
    }],
    STRCMP: [2, 2, (a, b) => b01(strScalar(a) === strScalar(b))],
    FINDSTR: [2, 2, (a, b) => b01(strScalar(a).includes(strScalar(b)))],
    HV: [2, 2, (x, n) => shift(win(x, n, s => Math.max(...s), true), 1, 1)],
    LV: [2, 2, (x, n) => shift(win(x, n, s => Math.min(...s), true), 1, 1)],
    CROSSUP: [2, 2, (a, b) => cross(a, b)],
    CROSSDOWN: [2, 2, (a, b) => cross(b, a)],
    ISUP: [0, 0, () => K.idx.map(i => b01(K.C[i] > K.O[i]))],
    ISDOWN: [0, 0, () => K.idx.map(i => b01(K.C[i] < K.O[i]))],
    ISEQUAL: [0, 0, () => K.idx.map(i => b01(K.C[i] === K.O[i]))],
    BARPOS: [0, 0, () => K.idx.map(i => i + 1)],
    BUY: [2, 2, (cond, p) => ({ trade: 'BUY', cond: ser(cond), p: ser(p) })],
    SELL: [2, 2, (cond, p) => ({ trade: 'SELL', cond: ser(cond), p: ser(p) })],
    AUTOFILTER: [0, 0, () => null]
    /*IMPL_END*/
  };
  evaluateFn = function evaluate(f, paramVals, lib, stack, dialect, parseFn, sigMap) {
    sigMap = sigMap || MY_SIGNALS;
    stack = stack || [];
    const P = parseFn(f.code, dialect || f.dialect || 'tdx');
    const vars = {}, outputs = [], drawings = [], signals = [], trades = [];
    const pv = {};
    (f.params || []).forEach(p => { const nm = p.n.toUpperCase(); pv[nm] = paramVals && paramVals[nm] !== undefined ? paramVals[nm] : +p.def; });
    function ev(n) {
      switch (n.k) {
        case 'num': return n.v;
        case 'str': return n.v;
        case 'id':
          if (n.name in vars) return vars[n.name];
          if (n.name in pv) return pv[n.name];
          if (IMPL[n.name]) return IMPL[n.name][2]();
          return null;
        case 'call': {
          const args = n.args.map(ev);
          return IMPL[n.name] ? IMPL[n.name][2](...args) : null;
        }
        case 'neg': { const v = ev(n.e); return n.sign === '-' ? m1(v, x => -x) : v; }
        case 'xp': return ev(n.e);
        case 'ext': return null;
        case 'ref': {
          if (stack.includes(n.ind)) return null;
          const SysInd = global.SysInd;
          if (SysInd && SysInd.getByName && BARS.length) {
            const bi = SysInd.getByName(n.ind);
            if (bi) {
              const pvals = {};
              (bi.params || []).forEach((p) => {
                pvals[p.n.toUpperCase()] = p.def;
              });
              n.args.forEach((a, i) => {
                const p = bi.params[i];
                if (p) {
                  const v = ev(a);
                  pvals[p.n.toUpperCase()] = Array.isArray(v) ? v[v.length - 1] : v;
                }
              });
              if (paramVals && typeof paramVals === "object") {
                Object.entries(paramVals).forEach(([k, v]) => {
                  pvals[String(k).toUpperCase()] = v;
                });
              }
              const evInd = SysInd.evaluate(bi.name, BARS, pvals);
              const o = (evInd.outputs || []).find((x) => String(x.name).toUpperCase() === String(n.out).toUpperCase());
              if (o && o.data) return o.data;
            }
          }
          const tgt = lib.find(x => x.name.toUpperCase() === n.ind);
          if (!tgt) return null;
          const pvals = {};
          n.args.forEach((a, i) => { const p = tgt.params[i]; if (p) { const v = ev(a); pvals[p.n.toUpperCase()] = Array.isArray(v) ? v[v.length - 1] : v; } });
          const r = evaluateFn(tgt, pvals, lib, stack.concat(n.ind), dialect, parseFn, sigMap);
          const o = r.outputs.find(x => x.name === n.out);
          return o ? o.v : null;
        }
        case 'bin': {
          const l = ev(n.l), r = ev(n.r);
          switch (n.op) {
            case '+': return m2(l, r, (a, b) => a + b);
            case '-': return m2(l, r, (a, b) => a - b);
            case '*': return m2(l, r, (a, b) => a * b);
            case '/': return m2(l, r, (a, b) => b === 0 ? null : a / b);
            case '>': return m2(l, r, (a, b) => b01(a > b));
            case '<': return m2(l, r, (a, b) => b01(a < b));
            case '>=': return m2(l, r, (a, b) => b01(a >= b));
            case '<=': return m2(l, r, (a, b) => b01(a <= b));
            case '=': case '==': return m2(l, r, (a, b) => b01(Math.abs(a - b) < 1e-9));
            case '<>': case '!=': return m2(l, r, (a, b) => b01(Math.abs(a - b) >= 1e-9));
            case 'AND': case '&&': return m2(l, r, (a, b) => b01(a && b));
            case 'OR': case '||': return m2(l, r, (a, b) => b01(a || b));
          }
        }
      }
      return null;
    }
    P.stmts.forEach(st => {
      let v;
      try { v = ev(st.e); } catch (e) { v = null; }
      const isConst = st.e && (st.e.k === 'num' || (st.e.k === 'neg' && st.e.e && st.e.e.k === 'num'));
      if (st.name && st.assign === ':=' && isConst && paramVals && paramVals[st.name] !== undefined && isFinite(+paramVals[st.name])) v = +paramVals[st.name];
      const attrs = st.attrs.map(a => a.v);
      const sig = attrs.find(a => sigMap[a]);
      if (sig) { signals.push({ type: sig, cond: ser(v) }); return; }
      if (st.e && st.e.k === 'id' && st.e.name === 'AUTOFILTER') return;
      if (v && typeof v === 'object' && !Array.isArray(v) && v.trade) { trades.push(v); return; }
      if (v && typeof v === 'object' && !Array.isArray(v) && v.draw) { drawings.push(Object.assign(v, { attrs })); if (st.name) vars[st.name] = null; return; }
      if (st.name) vars[st.name] = v;
      if (!st.name || st.assign === ':') {
        outputs.push({ name: st.name || '', label: st.raw || f.code.slice(st.tok.s, st.endS).replace(/[;,].*$/s, '').trim().slice(0, 24), v: typeof v === 'string' ? null : ser(v), attrs });
      }
    });
    return { outputs, drawings, signals, trades };
  };
  }

  /**
   * BUY / SELL 开平配对（多头、全仓或按持仓上限）：
   * 历史首个有效信号必须是 BUY；持仓中只认 SELL，空仓中只认 BUY；
   * 同一根 K 线 BUY 与 SELL 同时成立时，按当前持仓状态只取一个。
   */
  function pairTradeSignals(trades, n) {
    const isNull = (v) => v === null || v === undefined || (typeof v === "number" && !isFinite(v));
    const merge = (side) => {
      const out = new Array(n).fill(0);
      const pos = new Array(n).fill(null);
      trades.filter((t) => t.trade === side).forEach((t) => {
        for (let i = 0; i < n; i++) {
          if (t.cond[i] && !isNull(t.cond[i]) && !out[i]) {
            out[i] = 1;
            pos[i] = t.p[i];
          }
        }
      });
      return { out, pos };
    };
    const B = merge('BUY'), S = merge('SELL');
    const buy = new Array(n).fill(0), sell = new Array(n).fill(0);
    const stats = { rawBuy: 0, rawSell: 0, buy: 0, sell: 0, leadingSell: 0, repeatBuy: 0, repeatSell: 0, sameBar: 0, open: false };
    let holding = false, any = false;
    for (let i = 0; i < n; i++) {
      const b = B.out[i], s = S.out[i];
      if (b) stats.rawBuy++;
      if (s) stats.rawSell++;
      if (b && s) stats.sameBar++;
      if (!holding) {
        if (b) { buy[i] = 1; stats.buy++; holding = true; any = true; }
        else if (s) { if (any) stats.repeatSell++; else stats.leadingSell++; }
      } else {
        if (s) { sell[i] = 1; stats.sell++; holding = false; }
        else if (b) stats.repeatBuy++;
      }
    }
    stats.open = holding;
    return { buy, sell, buyPos: B.pos, sellPos: S.pos, stats };
  }

  function tradeDrawingsOf(paired) {
    return [
      { draw: 'trade', side: 'BUY', cond: paired.buy, p: paired.buyPos, color: '#e53935' },
      { draw: 'trade', side: 'SELL', cond: paired.sell, p: paired.sellPos, color: '#2e9d43' },
    ];
  }

  /** 回测与图表共用：公式中的 BUY / SELL 调用 → 配对后的信号；未写 BUY/SELL 时返回 null */
  function tradeSignalsFromTdx(bars, source, parseFn, uiParams, meta) {
    setBars(bars, meta);
    return tradeSignalsOf(evaluateFormula(source, parseFn, uiParams), bars.length);
  }

  function tradeSignalsOf(r, n) {
    const trades = (r && r.trades) || [];
    const hasBuy = trades.some((t) => t.trade === 'BUY');
    const hasSell = trades.some((t) => t.trade === 'SELL');
    if (!hasBuy && !hasSell) return null;
    const paired = pairTradeSignals(trades, n);
    return Object.assign(paired, { hasBuy, hasSell, drawings: tradeDrawingsOf(paired) });
  }

  function ensureRuntime(bars) {
    if (bars && bars.length) {
      setBars(bars);
      return;
    }
    if (IMPL && Object.keys(IMPL).length && evaluateFn) return;
    const t = Date.now();
    const dummy = Array.from({ length: 120 }, (_, i) => ({
      o: 10,
      h: 11,
      l: 9,
      c: 10 + (i % 5) * 0.05,
      v: 1000 + i,
      t: t - (120 - i) * 86400000,
    }));
    setBars(dummy);
  }

  function setBars(bars, meta) {
    if (!bars || !bars.length) {
      BARS = [];
      K = null;
      BAR_N = 0;
      IMPL = {};
      return;
    }
    BARS = bars;
    K = buildK(bars, meta);
    BAR_N = K.n;
    bindRuntime();
  }

  function getImpl() {
    return IMPL || {};
  }

  function resolveEvalLib() {
    const lib = [];
    if (typeof global.getFormulaRefLib === "function") lib.push(...(global.getFormulaRefLib() || []));
    return lib;
  }

  function evaluateFormula(code, parseFn, paramVals, lib) {
    if (!evaluateFn || !K) return { outputs: [], drawings: [], signals: [] };
    const useLib = lib && lib.length ? lib : resolveEvalLib();
    return evaluateFn({ code, params: [] }, paramVals, useLib, [], "tdx", parseFn, MY_SIGNALS);
  }

  /** 带参数声明求值（麦语言 PARAM 预处理后调用） */
  function evaluateWithParams(code, params, paramVals, dialect, parseFn) {
    if (!evaluateFn || !K) return { outputs: [], drawings: [], signals: [] };
    return evaluateFn({ code, params: params || [] }, paramVals, resolveEvalLib(), [], dialect || "my", parseFn, MY_SIGNALS);
  }

  function chartPlotFromTdx(bars, source, parseFn, uiParams, meta) {
    setBars(bars, meta);
    const r = evaluateFormula(source, parseFn, uiParams);
    const PALETTE = ["#2f7de1", "#0d9488", "#e6b800", "#bd4c59", "#6b5ce6", "#94a3b8"];
    const COLOR_MAP = {
      COLORRED: "#e53935",
      COLORGREEN: "#2e9d43",
      COLORBLUE: "#2f7de1",
      COLORYELLOW: "#e6b800",
      COLORWHITE: "#fff",
      COLORBLACK: "#000",
      COLORGRAY: "#8a8a8a",
    };
    const mainLineSeries = [];
    const subLineSeries = [];
    let ci = 0;
    (r.outputs || []).forEach((o) => {
      if (!o || !o.v || !Array.isArray(o.v)) return;
      const attrs = o.attrs || [];
      if (attrs.includes("NODRAW")) return;
      let color = PALETTE[ci++ % PALETTE.length];
      attrs.forEach((a) => {
        if (COLOR_MAP[a]) color = COLOR_MAP[a];
      });
      const onMain = !attrs.includes("COLORSTICK") && !attrs.includes("VOLSTICK");
      const outName = (o.name || "").trim();
      const notitle = !!outName && attrs.includes("NOTITLE");
      const series = {
        name: outName || `OUT${ci + 1}`,
        label: notitle ? "" : outName || (o.label || "OUT"),
        hideTitle: notitle,
        data: o.v,
        style: { color, thick: attrs.some((x) => /^LINETHICK/.test(x)) ? 2 : 1.4, kind: attrs.includes("COLORSTICK") ? "COLORSTICK" : "line" },
      };
      if (onMain) mainLineSeries.push(series);
      else subLineSeries.push(series);
    });
    const styleOfAttrs = (attrs) => {
      let color = "#e53935";
      (attrs || []).forEach((a) => {
        if (COLOR_MAP[a]) color = COLOR_MAP[a];
      });
      return color;
    };
    const mainDrawings = (r.drawings || []).map((d) =>
      Object.assign({}, d, { color: styleOfAttrs(d.attrs) })
    );
    const trade = tradeSignalsOf(r, bars.length);
    const tradeDrawings = trade ? trade.drawings : [];
    const hasLines = mainLineSeries.length > 0 || subLineSeries.length > 0;
    const hasDraws = mainDrawings.length > 0 || tradeDrawings.length > 0;
    let draw = "main";
    if (subLineSeries.length && !mainLineSeries.length && !hasDraws) draw = "sub";
    else if (!hasLines && !hasDraws) draw = "none";
    return {
      title: "通达信公式",
      draw,
      mainLineSeries,
      subLineSeries,
      mainDrawings,
      tradeDrawings,
      tradeStats: trade ? trade.stats : null,
      outputs: r.outputs,
      mainOutputs: mainLineSeries,
      subOutputs: subLineSeries,
    };
  }

  ensureRuntime();
  global.TdxFormulaRuntime = {
    setBars,
    getImpl,
    ensureRuntime,
    evaluateFormula,
    evaluateWithParams,
    chartPlotFromTdx,
    tradeSignalsFromTdx,
    pairTradeSignals,
    buildK,
  };
})(typeof window !== "undefined" ? window : globalThis);
