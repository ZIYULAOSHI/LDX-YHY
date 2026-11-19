/**
 * 通达信公式语法检测 · 移植自量化策略生产平台原型（lex / parse / check）
 */
(function (global) {
  const cat = global.TdxFuncCatalog;
  if (!cat) return;
  const TDX_FUNCS = cat.TDX_FUNCS || cat.FUNCS;

/* ---------- 函数库索引 ---------- */
const FN = {};
const ATTR = {};
const MY_SIGNALS = {};
const MY_SIGNAL_VARS = new Set(['BUY', 'SELL', 'BK', 'SK', 'BP', 'SP']);
TDX_FUNCS.forEach(f => {
  if (f.c === '操作符') return;
  if (f.c === '线形和资源') { ATTR[f.n] = f; return; }
  if ((f.f || '').includes('A')) { MY_SIGNALS[f.n] = f; return; }
  const base = f.n.replace(/\(.*$/, '');
  if (!/^[A-Z_][A-Z0-9_]*$/.test(base)) return;
  if (!FN[base]) FN[base] = Object.assign({}, f, { base });
});
const isAttr = (name, dialect) => !!ATTR[name] || /^LINETHICK[1-9]$/.test(name) || /^COLOR[0-9A-F]{6}$/.test(name) || (dialect === 'my' && !!MY_SIGNALS[name]);
function sigArgc(f) {
  if (/\(\d+\)$/.test(f.n)) return 1;
  const m = (f.u || '').match(new RegExp('(?:^|[^A-Z0-9_])' + f.base + '\\(([^()]*(?:\\([^()]*\\)[^()]*)*)\\)'));
  if (!m) return null;
  const inner = m[1].trim();
  if (!inner) return 0;
  if (inner.includes('...') || inner.includes('…')) return null;
  let depth = 0, cnt = 1;
  for (const ch of inner) { if (ch === '(') depth++; else if (ch === ')') depth--; else if (ch === ',' && depth === 0) cnt++; }
  return cnt;
}

function implForCheck() {
  const RT = global.TdxFormulaRuntime;
  if (!RT) return {};
  if (RT.getImpl && Object.keys(RT.getImpl()).length) return RT.getImpl();
  if (RT.ensureRuntime) RT.ensureRuntime();
  return RT.getImpl ? RT.getImpl() : {};
}

function systemIndicatorLib() {
  const SysInd = global.SysInd;
  if (!SysInd || !SysInd.SYSTEM_LIB) return [];
  return SysInd.SYSTEM_LIB.map((ind) => ({
    name: ind.name,
    params: (ind.params || []).map((p) => ({ n: p.n, min: p.min, max: p.max, def: p.def, step: p.step })),
    code: "",
    dialect: "tdx",
    type: "tech",
    __builtin: true,
  }));
}

function resolveCheckLib(extraLib) {
  const seen = new Set();
  const lib = [];
  const add = (f) => {
    if (!f || !f.name) return;
    const key = String(f.name).toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    lib.push(f);
  };
  systemIndicatorLib().forEach(add);
  if (typeof global.getFormulaRefLib === "function") {
    (global.getFormulaRefLib() || []).forEach(add);
  }
  (extraLib || []).forEach(add);
  return lib;
}

function outputNames(formula, lib) {
  if (formula && formula.__builtin && global.SysInd && global.SysInd.outputDefs) {
    return global.SysInd.outputDefs(formula.name).map((o) => String(o.name).toUpperCase());
  }
  try {
    const assigns = parse(formula.code, formula.dialect || "tdx")
      .stmts.filter((s) => s.name && (s.assign === ":" || s.assign === ":="))
      .map((s) => s.name);
    return assigns;
  } catch {
    return [];
  }
}

function firstUsage(fn) {
  const u = (fn.u || "").replace(/^用法[:：]?/, "");
  return u.split(/\n|例如/)[0].slice(0, 80);
}

/* ---------- 词法分析 ---------- */
const FULLWIDTH = { '；': ';', '，': ',', '（': '(', '）': ')', '：': ':', '＝': '=', '＞': '>', '＜': '<', '＋': '+', '－': '-', '＊': '*', '／': '/', '“': '"', '”': '"', '‘': "'", '’': "'" };
function lex(src, dialect) {
  const toks = [], cmts = [], errors = [], warns = [];
  let i = 0, line = 1, col = 1;
  const adv = n => { for (let k = 0; k < n; k++) { if (src[i] === '\n') { line++; col = 1; } else col++; i++; } };
  const pos = () => ({ line, col, s: i });
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { adv(1); continue; }
    const p = pos();
    if (ch === '{') {
      const j = src.indexOf('}', i);
      if (j < 0) { errors.push(Object.assign(p, { e: src.length, msg: '注释未闭合：缺少「}」' })); cmts.push({ s: i, e: src.length }); adv(src.length - i); break; }
      if (src.slice(i + 1, j).includes('{')) errors.push(Object.assign(p, { e: j + 1, msg: '注释中不能再嵌套注释' }));
      cmts.push({ s: i, e: j + 1 }); adv(j - i + 1); continue;
    }
    if (ch === '/' && src[i + 1] === '/') {
      let j = src.indexOf('\n', i); if (j < 0) j = src.length;
      cmts.push({ s: i, e: j }); adv(j - i); continue;
    }
    let m;
    if ((m = /^(\d+\.?\d*|\.\d+)/.exec(src.slice(i)))) { toks.push(Object.assign(p, { t: 'num', v: parseFloat(m[1]), e: i + m[1].length })); adv(m[1].length); continue; }
    if ((m = /^[A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\u4e00-\u9fa5]*/.exec(src.slice(i)))) { toks.push(Object.assign(p, { t: 'id', v: m[0].toUpperCase(), raw: m[0], e: i + m[0].length })); adv(m[0].length); continue; }
    if (ch === "'" || ch === '"') {
      const j = src.indexOf(ch, i + 1);
      if (j < 0 || src.slice(i, j).includes('\n')) { errors.push(Object.assign(p, { e: i + 1, msg: `字符串缺少结束引号「${ch}」` })); adv(1); continue; }
      toks.push(Object.assign(p, { t: ch === "'" ? 'str' : 'qstr', v: src.slice(i + 1, j), e: j + 1 })); adv(j - i + 1); continue;
    }
    const two = src.substr(i, 2);
    if ([':=', '>=', '<=', '<>', '!=', '==', '&&', '||'].includes(two)) { toks.push(Object.assign(p, { t: 'op', v: two, e: i + 2 })); adv(2); continue; }
    if ('+-*/><=(),;:#$.'.includes(ch)) { toks.push(Object.assign(p, { t: 'op', v: ch, e: i + 1 })); adv(1); continue; }
    if (FULLWIDTH[ch]) errors.push(Object.assign(p, { e: i + 1, msg: `检测到中文全角符号「${ch}」，请改为半角「${FULLWIDTH[ch]}」` }));
    else errors.push(Object.assign(p, { e: i + 1, msg: `非法字符「${ch}」` }));
    adv(1);
  }
  toks.push({ t: 'eof', line, col, s: src.length, e: src.length });
  return { toks, cmts, errors, warns };
}

/* ---------- 语法分析（语句 / 表达式 → AST） ---------- */
function parse(src, dialect) {
  const lx = lex(src, dialect);
  const toks = lx.toks, errors = lx.errors.slice(), stmts = [];
  let k = 0;
  const peek = (o = 0) => toks[Math.min(k + o, toks.length - 1)];
  const isOp = (t, v) => t.t === 'op' && t.v === v;
  const fail = (t, msg) => { const err = new Error(msg); err.tok = t; throw err; };
  const expect = (v, msg) => { const t = peek(); if (!isOp(t, v)) fail(t, msg || `缺少「${v}」`); k++; return t; };

  function primary() {
    const t = peek();
    if (t.t === 'num') { k++; return { k: 'num', v: t.v, tok: t }; }
    if (t.t === 'str') { k++; return { k: 'str', v: t.v, tok: t }; }
    if (t.t === 'qstr') {
      k++;
      const ref = /^([A-Za-z0-9_\u4e00-\u9fa5]+)\.([A-Za-z0-9_\u4e00-\u9fa5]+)$/.exec(t.v);
      if (ref) {
        let args = [];
        if (isOp(peek(), '(')) args = callArgs();
        return { k: 'ref', ind: ref[1].toUpperCase(), out: ref[2].toUpperCase(), args, tok: t };
      }
      if (t.v.includes('$')) return { k: 'ext', v: t.v, tok: t };
      fail(t, `无法识别的引用「"${t.v}"」，指标引用格式为 "指标名.输出线"`);
    }
    if (isOp(t, '(')) { k++; const e = expr(); expect(')', '括号不匹配：缺少「)」'); return e; }
    if (t.t === 'id') {
      k++;
      if (isOp(peek(), '(')) return { k: 'call', name: t.v, args: callArgs(), tok: t };
      if (isOp(peek(), '.') && peek(1).t === 'id') { k++; const o = peek(); k++; return { k: 'ref', ind: t.v, out: o.v, args: [], tok: t }; }
      return { k: 'id', name: t.v, tok: t };
    }
    if (t.t === 'eof') fail(t, '表达式不完整：语句提前结束');
    fail(t, `此处不应出现「${t.v}」`);
  }
  function callArgs() {
    expect('(');
    const args = [];
    if (isOp(peek(), ')')) { k++; return args; }
    for (;;) {
      args.push(expr());
      if (isOp(peek(), ',')) { k++; continue; }
      expect(')', '函数参数缺少「)」或「,」');
      return args;
    }
  }
  function postfix() {
    let e = primary();
    while (isOp(peek(), '#')) {
      k++;
      const t = peek();
      if (t.t !== 'id' || !/^(MIN1|MIN5|MIN15|MIN30|MIN60|DAY|WEEK|MONTH|SEASON|YEAR)$/.test(t.v)) fail(t, '跨周期引用「#」后只能跟 MIN1/MIN5/MIN15/MIN30/MIN60/DAY/WEEK/MONTH/SEASON/YEAR');
      k++;
      const node = { k: 'xp', e, period: t.v, tok: t };
      if (e.k === 'ref' && isOp(peek(), '(')) e.args = callArgs();
      e = node;
    }
    return e;
  }
  function unary() {
    const t = peek();
    if (isOp(t, '-') || isOp(t, '+')) { k++; return { k: 'neg', sign: t.v, e: unary(), tok: t }; }
    return postfix();
  }
  function binLevel(next, ops) {
    return function () {
      let l = next();
      for (;;) {
        const t = peek();
        const v = t.t === 'op' ? t.v : (t.t === 'id' && (t.v === 'AND' || t.v === 'OR') ? t.v : null);
        if (!v || !ops.includes(v)) return l;
        k++;
        l = { k: 'bin', op: v, l, r: next(), tok: t };
      }
    };
  }
  const mul = binLevel(unary, ['*', '/']);
  const add = binLevel(mul, ['+', '-']);
  const cmp = binLevel(add, ['>', '<', '>=', '<=', '=', '==', '<>', '!=']);
  const and = binLevel(cmp, ['AND', '&&']);
  const expr = binLevel(and, ['OR', '||']);

  while (peek().t !== 'eof') {
    if (isOp(peek(), ';')) { k++; continue; }
    const start = peek();
    try {
      const st = { tok: start, attrs: [], line: start.line };
      if (start.t === 'id' && (isOp(peek(1), ':') || isOp(peek(1), ':='))) { st.name = start.v; st.raw = start.raw; st.assign = peek(1).v; k += 2; }
      st.e = expr();
      while (isOp(peek(), ',')) {
        k++;
        const a = peek();
        if (a.t !== 'id') fail(a, '「,」后应为画线属性（如 COLORRED、LINETHICK2、NODRAW）');
        k++;
        st.attrs.push({ v: a.v, tok: a });
      }
      const end = peek();
      if (!isOp(end, ';') && end.t !== 'eof') fail(end, `语句缺少「;」或此处不应出现「${end.v}」`);
      st.endS = end.e;
      stmts.push(st);
      if (isOp(end, ';')) k++;
    } catch (err) {
      if (!err.tok) throw err;
      errors.push({ line: err.tok.line, col: err.tok.col, s: err.tok.s, e: err.tok.e, msg: err.message });
      while (peek().t !== 'eof' && !isOp(peek(), ';')) k++;
      if (isOp(peek(), ';')) k++;
    }
  }
  return { stmts, errors, warns: lx.warns, toks, cmts: lx.cmts };
}

/* ---------- 语法检测（语义层） ---------- */
const TRADE_FNS = new Set(['BUY', 'SELL']);
const UNSUPPORTED_TRADE_FNS = new Set(['SELLSHORT', 'BUYSHORT', 'BUYSHORT_BUY', 'SELL_SELLSHORT', 'CLOSEALLD', 'CLOSEALLK', 'ORDERBUY', 'ORDERSELL']);
const DRAW_FNS = ['STICKLINE', 'DRAWTEXT', 'DRAWICON', 'DRAWNUMBER', 'PLOYLINE', 'DRAWKLINE', 'DRAWLINE', 'DRAWBAND', 'DRAWTEXT_FIX', 'DRAWNUMBER_FIX', 'DRAWSL', 'PARTLINE', 'DRAWGBK', 'DRAWBMP', 'DRAWRECTREL'];
function check(f, dialect, lib) {
  const IMPL = implForCheck();
  const P = parse(f.code, dialect);
  const errors = P.errors.slice(), warns = P.warns.slice();
  const at2 = (tok, msg, list) => list.push({ line: tok.line, col: tok.col, s: tok.s, e: tok.e, msg });
  const params = {};
  (f.params || []).forEach((p, i) => {
    const nm = (p.n || '').toUpperCase();
    const tag = `参数 ${i + 1}「${p.n || ''}」`;
    if (!/^[A-Z_\u4e00-\u9fa5][A-Z0-9_\u4e00-\u9fa5]*$/.test(nm)) errors.push({ line: 0, msg: `${tag}：参数名不合法（字母开头，只含字母 / 数字 / 下划线）` });
    else if (FN[nm]) errors.push({ line: 0, msg: `${tag}：参数名不能与系统函数「${nm}」重名` });
    else if (params[nm]) errors.push({ line: 0, msg: `${tag}：参数名重复` });
    if (!(+p.min <= +p.def && +p.def <= +p.max)) errors.push({ line: 0, msg: `${tag}：需满足 最小 ≤ 缺省 ≤ 最大` });
    params[nm] = { p, used: false };
  });
  const defs = {};
  const used = new Set(), warned = new Set();
  let outputs = 0, draws = 0;
  let topTrade = null;
  const tradeCount = { BUY: 0, SELL: 0 };
  const later = {};
  P.stmts.forEach((st, si) => { if (st.name && later[st.name] === undefined) later[st.name] = si; });
  function walk(n, si) {
    if (!n) return;
    switch (n.k) {
      case 'id': {
        if (defs[n.name] !== undefined) return;
        if (params[n.name]) { params[n.name].used = true; return; }
        const fn = FN[n.name];
        if (fn) {
          const need = IMPL[n.name] ? IMPL[n.name][0] : sigArgc(fn);
          if (need && need > 0) at2(n.tok, `函数「${n.name}」缺少参数，用法：${firstUsage(fn)}`, errors);
          noteFn(fn, n.tok);
          return;
        }
        if (later[n.name] !== undefined) { at2(n.tok, `变量「${n.raw || n.name}」在定义之前被使用（第 ${P.stmts[later[n.name]].line} 行才定义）`, errors); return; }
        if (isAttr(n.name, dialect)) { at2(n.tok, `「${n.name}」是画线属性，只能写在语句末尾的「,」之后`, errors); return; }
        at2(n.tok, `未知字符串「${n.tok.raw || n.name}」：既不是函数、参数，也不是已定义的变量`, errors);
        return;
      }
      case 'call': {
        n.args.forEach(a => walk(a, si));
        if (defs[n.name] !== undefined || params[n.name]) { at2(n.tok, `「${n.name}」是变量 / 参数，不能当作函数调用`, errors); return; }
        const fn = FN[n.name];
        if (!fn) { at2(n.tok, `未知函数「${n.tok.raw || n.name}」，可通过「插入函数」查找可用函数`, errors); return; }
        if (dialect !== 'my' && UNSUPPORTED_TRADE_FNS.has(n.name)) {
          at2(n.tok, `「${n.name}」暂不支持：当前仅支持 BUY / SELL（多头开平，一买一卖），加减仓与空头信号后续开放`, errors);
          return;
        }
        if (dialect !== 'my' && TRADE_FNS.has(n.name)) {
          const pos = n.name === 'BUY' ? 'LOW' : 'HIGH';
          if (n !== topTrade) at2(n.tok, `「${n.name}」是交易信号函数，须单独成句，例：${n.name}(条件,${pos});`, errors);
          else {
            tradeCount[n.name]++;
            if (n.args.length > 2) at2(n.tok, `「${n.name}」不支持设置手数：只需 ${n.name}(条件,标记位置)，${n.name === 'BUY' ? '买入按回测设置中的「持仓上限」开仓（默认全仓）' : '卖出全部平仓'}`, errors);
            else if (n.args.length < 2) at2(n.tok, `「${n.name}」需要 2 个参数：${n.name}(条件,标记位置)，例：${n.name}(CROSS(A,B),${pos});`, errors);
          }
          noteFn(fn, n.tok);
          return;
        }
        if (IMPL[n.name]) {
          const [mn, mx] = IMPL[n.name];
          if (n.args.length < mn || n.args.length > mx) at2(n.tok, `函数「${n.name}」参数个数不正确：应为 ${mn === mx ? mn : mn + '~' + mx} 个，实际 ${n.args.length} 个。用法：${firstUsage(fn)}`, errors);
        } else {
          const need = sigArgc(fn);
          if (need !== null && need !== n.args.length) at2(n.tok, `函数「${n.name}」参数个数可能不正确（用法：${firstUsage(fn)}）`, warns);
        }
        if (DRAW_FNS.includes(n.name)) draws++;
        noteFn(fn, n.tok);
        return;
      }
      case 'ref': {
        n.args.forEach(a => walk(a, si));
        const tgt = lib.find(x => x.name.toUpperCase() === n.ind);
        if (!tgt) { at2(n.tok, `引用的指标「${n.ind}」不存在`, errors); return; }
        if (tgt.name.toUpperCase() === (f.name || '').toUpperCase()) { at2(n.tok, '公式不能引用自身', errors); return; }
        const outs = outputNames(tgt, lib);
        if (!outs.includes(n.out)) at2(n.tok, `指标「${n.ind}」没有输出线「${n.out}」，可用：${outs.join('、') || '无'}`, errors);
        if (n.args.length > (tgt.params || []).length) at2(n.tok, `指标「${n.ind}」只有 ${(tgt.params || []).length} 个参数`, errors);
        return;
      }
      case 'xp': walk(n.e, si); if (!warned.has('xp')) { warned.add('xp'); at2(n.tok, '跨周期引用在预览中按当前周期近似计算；实盘计算时可能引用到未来数据', warns); } return;
      case 'ext': if (!warned.has('ext')) { warned.add('ext'); at2(n.tok, '跨品种引用（$）需本地下载对应品种数据，预览中按无效值处理', warns); } return;
      case 'bin': walk(n.l, si); walk(n.r, si); return;
      case 'neg': walk(n.e, si); return;
      default: return;
    }
  }
  function noteFn(fn, tok) {
    used.add(fn.base);
    if (warned.has(fn.base)) return;
    if ((fn.f || '').includes('F')) { warned.add(fn.base); at2(tok, `「${fn.base}」为未来函数，历史信号可能随新数据变化，用于选股 / 交易需谨慎`, warns); return; }
    if (fn.c === '麦语言兼容' && dialect === 'tdx') { warned.add(fn.base); at2(tok, `「${fn.base}」是麦语言函数，通达信客户端不支持；如需兼容请切换到麦语言模式`, warns); return; }
    if (!IMPL[fn.base]) { warned.add(fn.base); at2(tok, `「${fn.base}」（${fn.c}）依赖原型外的数据，语法有效，预览中按无效值处理`, warns); }
  }
  P.stmts.forEach((st, si) => {
    const isTradeStmt = dialect !== 'my' && !st.name && st.e && st.e.k === 'call' && TRADE_FNS.has(st.e.name);
    topTrade = isTradeStmt ? st.e : null;
    if (dialect !== 'my' && st.e && st.e.k === 'id' && st.e.name === 'AUTOFILTER' && !st.name) {
      at2(st.e.tok, '平台已默认按「先买后卖、一买一卖」配对过滤信号，AUTOFILTER 可删除', warns);
      return;
    }
    walk(st.e, si);
    st.attrs.forEach(a => {
      if (!isAttr(a.v, dialect)) {
        if (MY_SIGNALS[a.v]) at2(a.tok, `「${a.v}」是麦语言交易指令，请切换到「麦语言（兼容模式）」`, errors);
        else at2(a.tok, `未知的画线属性「${a.v}」`, errors);
      }
    });
    if (isTradeStmt) { draws++; return; }
    if (st.name) {
      if (dialect !== 'my' && TRADE_FNS.has(st.name)) at2(st.tok, `「${st.raw}」是交易信号函数，不能作为变量名；请写成 ${st.name}(条件,${st.name === 'BUY' ? 'LOW' : 'HIGH'});`, errors);
      else if (FN[st.name] && !(dialect === 'my' && MY_SIGNAL_VARS.has(st.name))) at2(st.tok, `变量名「${st.raw}」与系统函数重名`, errors);
      else if (params[st.name]) at2(st.tok, `变量名「${st.raw}」与参数重名`, errors);
      else if (defs[st.name] !== undefined) at2(st.tok, `变量「${st.raw}」重复定义（第 ${P.stmts[defs[st.name]].line} 行已定义）`, errors);
      defs[st.name] = si;
      if (st.assign === ':') outputs++;
    } else if (!(st.e && st.e.k === 'call' && DRAW_FNS.includes(st.e.name)) && !st.attrs.some(a => MY_SIGNALS[a.v])) outputs++;
    if (st.attrs.some(a => MY_SIGNALS[a.v])) draws++;
  });
  Object.entries(params).forEach(([nm, x]) => { if (!x.used) warns.push({ line: 0, msg: `参数「${x.p.n}」未在公式中使用` }); });
  if (tradeCount.BUY && !tradeCount.SELL) warns.push({ line: 0, msg: '只有 BUY 没有 SELL：交易信号必须一买一卖配对，缺少 SELL 无法回测' });
  if (tradeCount.SELL && !tradeCount.BUY) warns.push({ line: 0, msg: '只有 SELL 没有 BUY：历史首个信号必须是 BUY，缺少 BUY 无法回测' });
  if (!P.stmts.length && !errors.length && String(f.code || "").trim()) {
    errors.push({ line: 1, col: 1, s: 0, e: 0, msg: "公式内容为空" });
  }
  if (f.type !== 'tech' && P.stmts.length && !outputs) errors.push({ line: 0, msg: (f.type === 'xg' ? '条件选股' : '五彩K线') + '公式必须有输出（取最后一条输出作为条件）' });
  if (f.type === "tech" && dialect !== "my" && P.stmts.length && !outputs && !draws) {
    warns.push({ line: 0, msg: "公式没有输出线（「:」）或绘图语句，画线时不会显示内容" });
  }
  return { P, errors, warns, stats: { stmts: P.stmts.length, outputs, vars: Object.keys(defs).length - outputs, draws, fns: used.size } };
}

  function formatCheckResult(r) {
    const diagnostics = [];
    r.errors.forEach((e) =>
      diagnostics.push({
        level: "error",
        line: e.line,
        col: e.col,
        s: e.s,
        e: e.e,
        text: e.msg,
      })
    );
    r.warns.forEach((w) =>
      diagnostics.push({
        level: "warn",
        line: w.line,
        col: w.col,
        s: w.s,
        e: w.e,
        text: w.msg,
      })
    );
    const ok = !diagnostics.some((d) => d.level === "error");
    return { ok, diagnostics, stats: r.stats, parse: r.P, errors: r.errors, warns: r.warns };
  }

  function checkFormula(src, dialect, lib) {
    const d = dialect === "my" ? "my" : "tdx";
    let code = src || "";
    let params = [];
    let preErrors = [];
    if (d === "my" && global.MaiCompile) {
      const pre = global.MaiCompile.preprocess(code);
      code = pre.checkCode;
      params = pre.params.map((p) => ({ n: p.key, def: p.def, min: p.def, max: p.def }));
      preErrors = pre.errors;
    }
    const f = { code, params, type: "tech", name: "EDITOR", dialect: d };
    const r = check(f, d, resolveCheckLib(lib));
    if (preErrors.length) r.errors = preErrors.concat(r.errors);
    return formatCheckResult(r);
  }

  function checkTdx(src) {
    return checkFormula(src, "tdx");
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

  function paintTdx(src, checkResult) {
    const lx = lex(src, "tdx");
    const errRanges = errRangesFromCheck(checkResult, src);
    const errLines = new Set(
      (checkResult?.diagnostics || [])
        .filter((d) => d.level === "error" && d.line)
        .map((d) => d.line)
    );
    const fnSet = new Set(Object.keys(FN));
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
      else if (x.t.t === "str" || x.t.t === "qstr") cls = "hl-str";
      else if (x.t.t === "id") {
        if (fnSet.has(x.t.v)) cls = "hl-fn";
        else if (ATTR[x.t.v] || /^COLOR[A-Z0-9]+$/i.test(x.t.v) || /^LINETHICK\d$/i.test(x.t.v)) cls = "hl-attr";
        else cls = "hl-out";
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
    const lineCount = Math.max(1, src.split("\n").length);
    const gutter = Array.from({ length: lineCount }, (_, i) => {
      const n = i + 1;
      return errLines.has(n) ? `<span class="err">${n}</span>` : String(n);
    }).join("\n");
    return { html, gutter };
  }

  function caretHint(word) {
    const w = (word || "").toUpperCase();
    const fn = FN[w];
    if (fn) return `通达信 ${fn.n}：${fn.t}`;
    if (ATTR[w]) return `画线属性 ${w}`;
    return "使用 // 或 { } 注释，语句以 ; 结束，赋值使用 :=";
  }

  global.TdxFormulaEngine = { checkTdx, checkFormula, paintTdx, caretHint, lex, parse };
})(typeof window !== "undefined" ? window : globalThis);
