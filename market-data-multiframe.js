/** 多周期 K 线：1m/30m 本地缓存，5m/10m/1h 合成，周/月/年由日线合成 */
(function (g) {
  const MS_5M = 5 * 60 * 1000;
  const MS_10M = 10 * 60 * 1000;
  const MS_SESSION_GAP = 90 * 60 * 1000;

  /** 按周期结束时刻分桶；K 线时间 t 为周期结束（如 5min 为 9:35、9:40） */
  function aggregateByPeriodMs(bars, periodMs) {
    if (!bars?.length || periodMs < 1) return bars?.slice() || [];
    const map = new Map();
    for (const b of bars) {
      const endT = Math.floor((b.t + periodMs - 1) / periodMs) * periodMs;
      if (!map.has(endT)) map.set(endT, []);
      map.get(endT).push(b);
    }
    return [...map.keys()]
      .sort((a, b) => a - b)
      .map((endT) => {
        const chunk = map.get(endT);
        return {
          t: endT,
          o: chunk[0].o,
          h: Math.max(...chunk.map((x) => x.h)),
          l: Math.min(...chunk.map((x) => x.l)),
          c: chunk[chunk.length - 1].c,
          v: chunk.reduce((s, x) => s + (x.v || 0), 0),
        };
      });
  }

  /** 1hour：相邻两根 30min 合成，时间为第二根结束时刻（如 10:30、11:30、14:00、15:00）；午休不跨组合并 */
  function aggregate30mTo1h(bars) {
    if (!bars?.length) return [];
    const out = [];
    for (let i = 0; i < bars.length; ) {
      const a = bars[i];
      const b = bars[i + 1];
      if (!b || b.t - a.t > MS_SESSION_GAP) {
        i += 1;
        continue;
      }
      out.push({
        t: b.t,
        o: a.o,
        h: Math.max(a.h, b.h),
        l: Math.min(a.l, b.l),
        c: b.c,
        v: (a.v || 0) + (b.v || 0),
      });
      i += 2;
    }
    return out;
  }

  function weekBucketStart(ms) {
    const d = new Date(ms);
    const monOffset = (d.getDay() + 6) % 7;
    const mon = new Date(d);
    mon.setDate(d.getDate() - monOffset);
    mon.setHours(0, 0, 0, 0);
    return mon.getTime();
  }

  function aggregateCalendar(bars, unit) {
    const map = new Map();
    const keys = [];
    for (const b of bars) {
      let key;
      if (unit === "week") key = weekBucketStart(b.t);
      else if (unit === "month") {
        const d = new Date(b.t);
        key = d.getFullYear() * 100 + (d.getMonth() + 1);
      } else if (unit === "year") key = new Date(b.t).getFullYear();
      else continue;
      if (!map.has(key)) {
        map.set(key, []);
        keys.push(key);
      }
      map.get(key).push(b);
    }
    return keys.map((k) => {
      const chunk = map.get(k);
      return {
        t: chunk[chunk.length - 1].t,
        o: chunk[0].o,
        h: Math.max(...chunk.map((x) => x.h)),
        l: Math.min(...chunk.map((x) => x.l)),
        c: chunk[chunk.length - 1].c,
        v: chunk.reduce((s, x) => s + (x.v || 0), 0),
      };
    });
  }

  /** 000001 日线缓存固定 500 根，原始周期不按工具栏日期裁剪 */
  function fullDailyBars(sym) {
    if (!g.MarketData?.isRealSymbol?.(sym)) return null;
    const dr = g.MarketData.defaultRange?.();
    const bars = dr?.bars?.length ? dr.bars : g.MarketData.BARS;
    return bars?.length ? bars.slice() : null;
  }

  function bars1m() {
    const raw = g.MarketIntraday?.BARS_1M;
    return raw?.length ? raw.slice() : null;
  }

  function bars30m() {
    const raw = g.MarketIntraday?.BARS_30M;
    return raw?.length ? raw.slice() : null;
  }

  /**
   * @param {string} sym
   * @param {string} period 1m|5m|10m|30m|1h|day|week|month|year
   * @param {number} startMs
   * @param {number} endMs
   * @param {'default'|'all'|'range'} [dailyScope]
   */
  function resolve(sym, period, startMs, endMs, dailyScope) {
    const p = period || "day";
    if (!g.MarketData?.isRealSymbol?.(sym)) return null;

    function pickDailyBars() {
      const scope = dailyScope || "default";
      if (scope === "all" && g.MarketData.BARS?.length) {
        return g.MarketData.BARS.slice();
      }
      if (scope === "range") {
        let bars = g.MarketData.barsInRange(sym, startMs, endMs);
        return bars?.length ? bars.slice() : [];
      }
      return fullDailyBars(sym) || [];
    }

    if (p === "1m") {
      const bars = bars1m();
      return bars?.length ? { bars, source: "1m" } : null;
    }
    if (p === "5m") {
      const base = bars1m();
      return base?.length ? { bars: aggregateByPeriodMs(base, MS_5M), source: "1m" } : null;
    }
    if (p === "10m") {
      const base = bars1m();
      return base?.length ? { bars: aggregateByPeriodMs(base, MS_10M), source: "1m" } : null;
    }
    if (p === "30m") {
      const bars = bars30m();
      return bars?.length ? { bars, source: "30m" } : null;
    }
    if (p === "1h") {
      const base = bars30m();
      return base?.length ? { bars: aggregate30mTo1h(base), source: "30m" } : null;
    }

    if (p === "day") {
      const bars = pickDailyBars();
      return bars?.length ? { bars, source: "day" } : null;
    }

    const daily = pickDailyBars();
    if (!daily?.length) return null;
    if (p === "week") return { bars: aggregateCalendar(daily, "week"), source: "day" };
    if (p === "month") return { bars: aggregateCalendar(daily, "month"), source: "day" };
    if (p === "year") return { bars: aggregateCalendar(daily, "year"), source: "day" };
    return null;
  }

  g.MarketFrames = {
    resolve,
    aggregateByPeriodMs,
    aggregate30mTo1h,
    aggregateCalendar,
  };
})(typeof window !== "undefined" ? window : globalThis);
