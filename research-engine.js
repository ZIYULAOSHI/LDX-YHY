/**
 * 研究引擎（前端原型）：标的交易规则、逐 K 回测（含风控）、绩效统计、参数组合搜索。
 * 正式环境由后端计算引擎完成，这里保证交互与数据结构可完整演示。
 */
(function (global) {
  const ETF_TYPE_LABEL = {
    equity: "股票型 ETF",
    cross: "跨境 ETF",
    bond: "债券 ETF",
    gold: "黄金 ETF",
    money: "货币 ETF",
  };

  /** 交易所法定费用（原型取值）：印花税仅股票卖出征收，过户费仅股票双向收取 */
  const STOCK_STAMP_DUTY = 0.0005;
  const STOCK_TRANSFER_FEE = 0.00001;

  /**
   * @param {string} code 例如 000001.SZ
   * @param {string} [name]
   * @param {{type?:string, etfType?:string}} [meta]
   */
  function classify(code, name = "", meta = {}) {
    const [digits = "", ex = ""] = String(code || "").toUpperCase().split(".");
    let kind = meta.type || "";
    if (!kind) {
      if ((ex === "SH" && /^5[0-8]/.test(digits)) || (ex === "SZ" && /^1[56]/.test(digits))) kind = "etf";
      else if (ex === "SH" && /^000/.test(digits)) kind = "index";
      else kind = "stock";
    }

    if (kind === "index") {
      return {
        kind,
        tradable: false,
        kindLabel: "指数",
        boardLabel: "指数",
        limitPct: 0,
        tPlus: 1,
        lot: 100,
        lotUnit: "份",
        tick: 0.01,
        stampDuty: 0,
        transferFee: 0,
      };
    }

    if (kind === "etf") {
      let etfType = meta.etfType || "";
      if (!etfType) {
        if (/^511[89]/.test(digits)) etfType = "money";
        else if (/^511/.test(digits)) etfType = "bond";
        else if (/^518/.test(digits)) etfType = "gold";
        else if (/^513/.test(digits)) etfType = "cross";
        else etfType = "equity";
      }
      const tPlus = etfType === "equity" ? 1 : 0;
      const limitPct = etfType === "money" || etfType === "bond" ? 0.1 : /^588|^159915/.test(digits) ? 0.2 : 0.1;
      return {
        kind,
        tradable: true,
        etfType,
        kindLabel: "ETF",
        boardLabel: ETF_TYPE_LABEL[etfType],
        limitPct,
        tPlus,
        lot: 100,
        lotUnit: "份",
        tick: 0.001,
        stampDuty: 0,
        transferFee: 0,
      };
    }

    let boardLabel = "主板";
    let limitPct = 0.1;
    if (/^688/.test(digits)) {
      boardLabel = "科创板";
      limitPct = 0.2;
    } else if (/^30[01]/.test(digits)) {
      boardLabel = "创业板";
      limitPct = 0.2;
    } else if (ex === "BJ" || /^[48]/.test(digits)) {
      boardLabel = "北交所";
      limitPct = 0.3;
    }
    if (/ST/i.test(name) && limitPct === 0.1) {
      boardLabel = "主板 ST";
      limitPct = 0.05;
    }
    return {
      kind: "stock",
      tradable: true,
      kindLabel: "A 股",
      boardLabel,
      limitPct,
      tPlus: 1,
      lot: /^688/.test(digits) ? 200 : 100,
      lotUnit: "股",
      tick: 0.01,
      stampDuty: STOCK_STAMP_DUTY,
      transferFee: STOCK_TRANSFER_FEE,
    };
  }

  function roundTick(p, tick) {
    const digits = tick < 0.01 ? 3 : 2;
    return +(Math.round(p / tick) * tick).toFixed(digits);
  }

  function sameDay(a, b) {
    const x = new Date(a);
    const y = new Date(b);
    return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
  }

  function fmtDate(ms, intraday) {
    const d = new Date(ms);
    const p = (n) => String(n).padStart(2, "0");
    const day = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    return intraday ? `${day} ${p(d.getHours())}:${p(d.getMinutes())}` : day;
  }

  /**
   * 逐 K 回测（只做多）。信号在 K 线收盘确认，按 fillMode 成交。
   * @param {Array<{t:number,o:number,h:number,l:number,c:number}>} bars
   * @param {{buy:number[], sell:number[]}} signals
   * @param {any} cfg 见 app.js readResearchForm().execution / rules / risk
   * @param {{start:number,end:number}} seg end 为开区间
   */
  function backtest(bars, signals, cfg, seg) {
    const { start, end } = seg;
    const ex = cfg.execution;
    const rules = cfg.rules;
    const risk = cfg.risk || { enabled: false };
    const tick = rules.tick;
    const intraday = !!cfg.intraday;
    const capital = ex.capital;

    let cash = capital;
    /** @type {null | {entryIdx:number, entryPrice:number, qty:number, entryAmt:number, entryFee:number, peak:number, ttArmed:boolean, beArmed:boolean}} */
    let pos = null;
    /** @type {null | {side:'buy'|'sell', reason:string}} */
    let pending = null;

    const equity = [];
    const bench = [];
    const drawdown = [];
    const position = [];
    const times = [];
    const trades = [];
    const orders = [];
    const notes = { limitUpSkip: 0, limitDownDelay: 0, lotSkip: 0 };
    let turnover = 0;
    let feesTotal = 0;
    let peakEq = capital;

    const base = bars[start]?.c || 1;

    const limitPrice = (i, up) => {
      if (i <= 0 || !rules.limitRule || !rules.limitPct) return null;
      return roundTick(bars[i - 1].c * (1 + (up ? rules.limitPct : -rules.limitPct)), tick);
    };

    const canSellAt = (i) => {
      if (!pos) return false;
      if (rules.tPlus === 1 && (i === pos.entryIdx || sameDay(bars[i].t, bars[pos.entryIdx].t))) return false;
      return true;
    };

    const fillBuy = (i, raw, reason) => {
      const up = limitPrice(i, true);
      if (up != null && raw >= up - tick / 2) {
        notes.limitUpSkip++;
        return false;
      }
      const px = roundTick(raw * (1 + ex.slippage), tick);
      const budget = cash * ex.positionPct;
      const lots = Math.floor(budget / (px * (1 + ex.commission + rules.transferFee)) / rules.lot);
      const qty = lots * rules.lot;
      if (qty <= 0) {
        notes.lotSkip++;
        return false;
      }
      const amt = px * qty;
      const fee = Math.max(ex.minCommission, amt * ex.commission) + amt * rules.transferFee;
      if (amt + fee > cash) return false;
      cash -= amt + fee;
      turnover += amt;
      feesTotal += fee;
      pos = {
        entryIdx: i,
        entryPrice: px,
        qty,
        entryAmt: amt,
        entryFee: fee,
        peak: px,
        ttArmed: false,
        beArmed: false,
      };
      orders.push({ date: fmtDate(bars[i].t, intraday), t: bars[i].t, side: "buy", price: px, qty, fee, reason });
      return true;
    };

    const fillSell = (i, raw, reason) => {
      if (!pos) return false;
      const down = limitPrice(i, false);
      if (down != null && raw <= down + tick / 2) {
        notes.limitDownDelay++;
        return false;
      }
      const px = roundTick(raw * (1 - ex.slippage), tick);
      const amt = px * pos.qty;
      const fee = Math.max(ex.minCommission, amt * ex.commission) + amt * rules.transferFee + amt * rules.stampDuty;
      cash += amt - fee;
      turnover += amt;
      feesTotal += fee;
      const cost = pos.entryAmt + pos.entryFee;
      const pnl = amt - fee - cost;
      trades.push({
        entry_date: fmtDate(bars[pos.entryIdx].t, intraday),
        exit_date: fmtDate(bars[i].t, intraday),
        entry_t: bars[pos.entryIdx].t,
        exit_t: bars[i].t,
        entry_price: pos.entryPrice,
        exit_price: px,
        quantity: pos.qty,
        pnl,
        return_pct: pnl / cost,
        fees: pos.entryFee + fee,
        bars_held: i - pos.entryIdx,
        exit_reason: reason,
      });
      orders.push({ date: fmtDate(bars[i].t, intraday), t: bars[i].t, side: "sell", price: px, qty: pos.qty, fee, reason });
      pos = null;
      return true;
    };

    /** 当前有效止损价与对应原因（取最高者） */
    const stopLevel = (i) => {
      if (!pos || !risk.enabled) return null;
      const cands = [];
      const e = pos.entryPrice;
      if (risk.fixedStop?.on) cands.push([e * (1 - risk.fixedStop.pct), "固定止损"]);
      if (risk.trailStop?.on) cands.push([pos.peak * (1 - risk.trailStop.pct), "移动止损"]);
      if (risk.breakeven?.on && pos.beArmed) cands.push([e * (1 + risk.breakeven.offset), "保本止损"]);
      if (risk.trailTake?.on && pos.ttArmed) cands.push([pos.peak * (1 - risk.trailTake.callback), "移动止盈"]);
      if (!cands.length) return null;
      cands.sort((x, y) => y[0] - x[0]);
      return { price: cands[0][0], reason: cands[0][1] };
    };

    const takeLevel = () => {
      if (!pos || !risk.enabled || !risk.fixedTake?.on) return null;
      return { price: pos.entryPrice * (1 + risk.fixedTake.pct), reason: "固定止盈" };
    };

    const updatePeak = (i) => {
      if (!pos) return;
      const ref = risk.trigger === "intraday" ? bars[i].h : bars[i].c;
      pos.peak = Math.max(pos.peak, ref);
      const gain = pos.peak / pos.entryPrice - 1;
      if (risk.trailTake?.on && gain >= risk.trailTake.activate) pos.ttArmed = true;
      if (risk.breakeven?.on && gain >= risk.breakeven.trigger) pos.beArmed = true;
    };

    for (let i = start; i < end; i++) {
      const b = bars[i];

      if (pending) {
        if (pending.side === "buy") {
          if (!pos) fillBuy(i, b.o, pending.reason);
          pending = null;
        } else if (pos && canSellAt(i)) {
          if (fillSell(i, b.o, pending.reason)) pending = null;
        } else if (!pos) {
          pending = null;
        }
      }

      if (pos && risk.enabled && !pending && canSellAt(i)) {
        const stop = stopLevel(i);
        const take = takeLevel();
        if (risk.trigger === "intraday") {
          if (stop && b.l <= stop.price) fillSell(i, Math.min(b.o, stop.price), stop.reason);
          else if (take && b.h >= take.price) fillSell(i, Math.max(b.o, take.price), take.reason);
        } else {
          if (stop && b.c <= stop.price) pending = { side: "sell", reason: stop.reason };
          else if (take && b.c >= take.price) pending = { side: "sell", reason: take.reason };
        }
        if (pos && !pending && risk.timeStop?.on && i - pos.entryIdx >= risk.timeStop.bars) {
          if (b.c / pos.entryPrice - 1 < risk.timeStop.minRet) pending = { side: "sell", reason: "时间止损" };
        }
      }
      updatePeak(i);

      if (pos && !pending && signals.sell[i]) {
        if (ex.fillMode === "close" && canSellAt(i)) {
          if (!fillSell(i, b.c, "信号卖出")) pending = { side: "sell", reason: "信号卖出" };
        } else if (i + 1 < end) {
          pending = { side: "sell", reason: "信号卖出" };
        }
      } else if (!pos && !pending && signals.buy[i]) {
        if (ex.fillMode === "close") fillBuy(i, b.c, "信号买入");
        else if (i + 1 < end) pending = { side: "buy", reason: "信号买入" };
      }

      const eq = cash + (pos ? pos.qty * b.c : 0);
      peakEq = Math.max(peakEq, eq);
      equity.push(eq);
      bench.push((capital * b.c) / base);
      drawdown.push(eq / peakEq - 1);
      position.push(pos ? (pos.qty * b.c) / eq : 0);
      times.push(b.t);
    }

    if (pos) {
      const last = bars[end - 1];
      const mv = pos.qty * last.c;
      const cost = pos.entryAmt + pos.entryFee;
      trades.push({
        entry_date: fmtDate(bars[pos.entryIdx].t, intraday),
        exit_date: null,
        entry_t: bars[pos.entryIdx].t,
        exit_t: null,
        entry_price: pos.entryPrice,
        exit_price: last.c,
        quantity: pos.qty,
        pnl: mv - cost,
        return_pct: (mv - cost) / cost,
        fees: pos.entryFee,
        bars_held: end - 1 - pos.entryIdx,
        exit_reason: "未卖出",
      });
    }

    const metrics = computeMetrics({ equity, bench, trades, capital, turnover, feesTotal, barsPerYear: cfg.barsPerYear });
    return { equity, bench, drawdown, position, times, trades, orders, notes, metrics };
  }

  function computeMetrics({ equity, bench, trades, capital, turnover, feesTotal, barsPerYear }) {
    const n = equity.length;
    if (!n) {
      return { cumRet: 0, ann: 0, benchRet: 0, excess: 0, mdd: 0, sharpe: null, calmar: null, trades: 0, win: null, equity: capital, avgPnl: null, fees: 0, turnover: 0 };
    }
    const last = equity[n - 1];
    const cumRet = last / capital - 1;
    const years = n / barsPerYear;
    const ann = cumRet <= -1 ? -1 : years > 0 ? Math.pow(1 + cumRet, 1 / years) - 1 : 0;
    let peak = capital;
    let mdd = 0;
    const rets = [];
    for (let i = 0; i < n; i++) {
      peak = Math.max(peak, equity[i]);
      mdd = Math.max(mdd, 1 - equity[i] / peak);
      if (i > 0) rets.push(equity[i] / equity[i - 1] - 1);
    }
    const mean = rets.reduce((a, b) => a + b, 0) / (rets.length || 1);
    const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length || 1));
    const sharpe = sd > 1e-12 ? (mean / sd) * Math.sqrt(barsPerYear) : null;
    const calmar = mdd > 1e-9 ? ann / mdd : null;
    const closed = trades.filter((t) => t.exit_date);
    const wins = closed.filter((t) => t.pnl > 0).length;
    const benchRet = bench[n - 1] / capital - 1;
    const avgEq = equity.reduce((a, b) => a + b, 0) / n;
    return {
      cumRet,
      ann,
      benchRet,
      excess: cumRet - benchRet,
      mdd,
      sharpe,
      calmar,
      trades: trades.length,
      win: closed.length ? wins / closed.length : null,
      equity: last,
      avgPnl: closed.length ? closed.reduce((a, t) => a + t.pnl, 0) / closed.length : null,
      fees: feesTotal,
      turnover: avgEq > 0 ? turnover / avgEq : 0,
    };
  }

  // ---------- 参数组合 ----------

  function rangeValues(r) {
    const out = [];
    if (!(r.step > 0) || r.max < r.min) return out;
    const digits = Math.max(0, (String(r.step).split(".")[1] || "").length, (String(r.min).split(".")[1] || "").length);
    const cnt = Math.floor((r.max - r.min) / r.step + 1e-9) + 1;
    for (let k = 0; k < cnt && k < 100000; k++) out.push(+(r.min + k * r.step).toFixed(digits));
    return out;
  }

  /**
   * @param {Array<{key:string, values:number[]}>} axes 参与优化的参数
   * @param {Record<string, number>} fixed 不参与优化的参数当前值
   */
  function createSpace(axes, fixed, constraints) {
    const radix = axes.map((a) => a.values.length);
    const raw = radix.reduce((a, b) => a * b, 1);
    const decode = (idx) => {
      const combo = { ...fixed };
      let k = idx;
      for (let j = axes.length - 1; j >= 0; j--) {
        const r = radix[j];
        combo[axes[j].key] = axes[j].values[k % r];
        k = Math.floor(k / r);
      }
      return combo;
    };
    const ok = (combo) =>
      constraints.every((c) => {
        const l = combo[c.left];
        const r = combo[c.right];
        if (l == null || r == null) return true;
        if (c.op === "<") return l < r;
        if (c.op === "<=") return l <= r;
        if (c.op === ">") return l > r;
        if (c.op === ">=") return l >= r;
        return true;
      });
    return { axes, radix, raw, decode, ok };
  }

  const EXACT_LIMIT = 200000;

  function estimate(space, seed) {
    if (space.raw <= EXACT_LIMIT) {
      let valid = 0;
      for (let i = 0; i < space.raw; i++) if (space.ok(space.decode(i))) valid++;
      return { raw: space.raw, valid, approx: false };
    }
    const rand = rng(seed);
    const N = 20000;
    let hit = 0;
    for (let i = 0; i < N; i++) if (space.ok(space.decode(Math.floor(rand() * space.raw)))) hit++;
    return { raw: space.raw, valid: Math.round((hit / N) * space.raw), approx: true };
  }

  /** 网格搜索的评估计划：有效组合超出预算时均匀抽样 */
  function planGrid(space, budget, seed) {
    if (space.raw <= EXACT_LIMIT) {
      const valid = [];
      for (let i = 0; i < space.raw; i++) {
        const c = space.decode(i);
        if (space.ok(c)) valid.push(c);
      }
      if (valid.length <= budget) return valid;
      const out = [];
      const stride = valid.length / budget;
      for (let k = 0; k < budget; k++) out.push(valid[Math.floor(k * stride)]);
      return out;
    }
    const rand = rng(seed);
    const seen = new Set();
    const out = [];
    let guard = 0;
    while (out.length < budget && guard++ < budget * 50) {
      const idx = Math.floor(rand() * space.raw);
      if (seen.has(idx)) continue;
      seen.add(idx);
      const c = space.decode(idx);
      if (space.ok(c)) out.push(c);
    }
    return out;
  }

  function rng(seed) {
    let x = (seed >>> 0) || 1;
    return () => {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return (x >>> 0) / 4294967296;
    };
  }

  /**
   * 遗传搜索：按代给出待评估个体，report 回填适应度后进化。
   * @returns {{ nextBatch: () => any[] | null, report: (items: Array<{combo:any, fitness:number}>) => void }}
   */
  function createGenetic(space, { population, generations, seed }) {
    const rand = rng(seed);
    const axes = space.axes;
    const key = (genes) => genes.join(",");
    const toCombo = (genes) => {
      let idx = 0;
      for (let j = 0; j < axes.length; j++) idx = idx * space.radix[j] + genes[j];
      return space.decode(idx);
    };
    const randomGenes = () => axes.map((a) => Math.floor(rand() * a.values.length));
    const validGenes = (make) => {
      for (let t = 0; t < 20; t++) {
        const g = make();
        if (space.ok(toCombo(g))) return g;
      }
      return null;
    };
    const fitness = new Map();
    let gen = 0;
    let pop = [];
    for (let i = 0; i < population * 3 && pop.length < population; i++) {
      const g = validGenes(randomGenes);
      if (g && !pop.some((p) => key(p) === key(g))) pop.push(g);
    }

    return {
      nextBatch() {
        if (gen >= generations || !pop.length) return null;
        return pop.filter((g) => !fitness.has(key(g))).map((g) => ({ genes: g, combo: toCombo(g) }));
      },
      report(items) {
        items.forEach((it) => fitness.set(key(it.genes), it.fitness));
        gen++;
        if (gen >= generations) return;
        const ranked = pop.slice().sort((a, b) => (fitness.get(key(b)) ?? -Infinity) - (fitness.get(key(a)) ?? -Infinity));
        const elite = ranked.slice(0, Math.max(2, Math.ceil(population / 2)));
        const next = elite.slice();
        let guard = 0;
        while (next.length < population && guard++ < population * 20) {
          const pa = elite[Math.floor(rand() * elite.length)];
          const pb = elite[Math.floor(rand() * elite.length)];
          const child = validGenes(() =>
            axes.map((a, j) => {
              let v = rand() < 0.5 ? pa[j] : pb[j];
              if (rand() < 0.25) v = Math.min(a.values.length - 1, Math.max(0, v + (rand() < 0.5 ? -1 : 1) * (1 + Math.floor(rand() * 2))));
              return v;
            })
          );
          if (child && !next.some((p) => key(p) === key(child))) next.push(child);
        }
        pop = next;
      },
    };
  }

  global.ResearchEngine = {
    ETF_TYPE_LABEL,
    classify,
    roundTick,
    backtest,
    computeMetrics,
    rangeValues,
    createSpace,
    estimate,
    planGrid,
    createGenetic,
    rng,
  };
})(typeof window !== "undefined" ? window : globalThis);
