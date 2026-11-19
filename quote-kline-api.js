/**
 * 测试环境 K 线接口（http://180.166.36.250:8003/quote/kline）
 * 带内存缓存与 in-flight 去重，避免频繁请求。
 */
(function (global) {
  const BASE = "http://180.166.36.250:8003/quote/kline";
  const CACHE_TTL_MS = 5 * 60 * 1000;
  /** 默认加载最近 N 根；上市以来用较大 count 拉全历史（接口上限约 1 万） */
  const DEFAULT_RECENT_COUNT = 500;
  const LISTING_MAX_COUNT = 10000;

  /** @type {Map<string, {ts:number, bars:any[]}>} */
  const cache = new Map();
  /** @type {Map<string, Promise<any[]|null>>} */
  const inflight = new Map();

  const PERIOD_MAP = {
    "1m": "1min",
    "5m": "5min",
    "10m": "5min",
    "30m": "30min",
    "1h": "60min",
    day: "1day",
    week: "week",
    month: "month",
    year: "year",
  };

  /** 接口 split：0 除权 / 1 前复权 / 2 后复权 */
  const DEFAULT_API_SPLIT = "1";
  const SPLIT_BY_CHART_ADJ = { none: "0", qfq: "1", hfq: "2" };

  function splitForChartAdj(chartAdj) {
    return SPLIT_BY_CHART_ADJ[chartAdj] ?? DEFAULT_API_SPLIT;
  }

  /** 000001.SZ → SZ000001 */
  function toQuoteObj(sym) {
    const raw = String(sym || "")
      .trim()
      .toUpperCase();
    const dot = raw.match(/^(\d{6})\.([A-Z]{2})$/);
    if (dot) return `${dot[2]}${dot[1]}`;
    const rev = raw.match(/^([A-Z]{2})(\d{6})$/);
    if (rev) return raw;
    return raw.replace(/\./g, "");
  }

  function fmtDayParam(ms) {
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}${m}${day}`;
  }

  function cacheKey(params) {
    return JSON.stringify(params);
  }

  function extractKlineTable(json) {
    if (!json || json.Err !== 0) return null;
    const chain = json?.Data?.JsonTbl?.data;
    if (!Array.isArray(chain) || !chain.length) return null;
    let table = chain[0];
    if (Array.isArray(table)) table = table[0];
    if (!table?.data?.[0]) return null;
    const pair = table.data[0];
    if (!Array.isArray(pair) || pair.length < 2) return null;
    const payload = pair[1];
    if (!payload?.data || !Array.isArray(payload.data)) return null;
    return payload.data;
  }

  /** @param {any[][]} rows */
  function rowsToBars(rows) {
    if (!rows?.length) return [];
    return rows
      .map((row) => {
        if (!row || row.length < 6) return null;
        const tSec = Number(row[0]);
        const o = Number(row[1]);
        const h = Number(row[2]);
        const l = Number(row[3]);
        const c = Number(row[4]);
        const v = Number(row[5]);
        if (!Number.isFinite(tSec) || !Number.isFinite(c)) return null;
        return {
          t: tSec < 1e12 ? tSec * 1000 : tSec,
          o,
          h,
          l,
          c,
          v: Number.isFinite(v) ? v : 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.t - b.t);
  }

  /**
   * @param {object} opt
   * @param {string} opt.obj
   * @param {string} opt.period API period
   * @param {string} [opt.split] 0|1|2
   * @param {string} [opt.begin_time]
   * @param {string} [opt.end_time]
   * @param {number} [opt.count]
   * @param {string} [opt.start]
   */
  async function fetchKlineRaw(opt) {
    const q = new URLSearchParams();
    q.set("obj", opt.obj);
    q.set("period", opt.period);
    q.set("output", "json");
    q.set("split", opt.split != null && opt.split !== "" ? String(opt.split) : DEFAULT_API_SPLIT);
    if (opt.begin_time) q.set("begin_time", opt.begin_time);
    if (opt.end_time) q.set("end_time", opt.end_time);
    if (opt.count != null && opt.count > 0) q.set("count", String(opt.count));
    if (opt.start != null && opt.start !== "") q.set("start", String(opt.start));
    const url = `${BASE}?${q.toString()}`;
    const res = await fetch(url, { method: "GET", credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let json;
    try {
      json = await res.json();
    } catch {
      const text = await res.text();
      json = JSON.parse(text);
    }
    if (json.Err !== 0) throw new Error(json.Msg || `Err ${json.Err}`);
    const rows = extractKlineTable(json);
    return rowsToBars(rows);
  }

  async function cachedFetch(params) {
    const key = cacheKey(params);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.bars.slice();

    if (inflight.has(key)) return inflight.get(key);

    const p = fetchKlineRaw(params)
      .then((bars) => {
        if (bars?.length) cache.set(key, { ts: Date.now(), bars });
        return bars;
      })
      .finally(() => inflight.delete(key));

    inflight.set(key, p);
    return p;
  }

  function trimBarsByRange(bars, startMs, endMs) {
    if (!bars?.length) return [];
    return bars.filter((b) => b.t >= startMs && b.t <= endMs);
  }

  function aggregate10mFrom5m(bars) {
    if (!global.MarketFrames?.aggregateByPeriodMs) return bars;
    return MarketFrames.aggregateByPeriodMs(bars, 10 * 60 * 1000);
  }

  function peekCachedBars(params) {
    const key = cacheKey(params);
    const hit = cache.get(key);
    if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.bars.slice();
    return null;
  }

  function buildFetchParams(ctx) {
    const { sym, chartPeriod, chartAdj, startMs, endMs, dailyScope } = ctx;
    const obj = toQuoteObj(sym);
    if (!obj || !/^(SH|SZ)\d{6}$/.test(obj)) return { error: "UNSUPPORTED_SYMBOL" };

    const uiPeriod = chartPeriod || "day";
    const apiPeriod = PERIOD_MAP[uiPeriod] || "1day";
    const split = splitForChartAdj(chartAdj);
    const params = { obj, period: apiPeriod, split };
    const useRange = dailyScope === "range" || dailyScope === "sim-range";
    const useListingAll = dailyScope === "all" || dailyScope === "sim-listing";
    if (useRange && startMs && endMs) {
      params.begin_time = fmtDayParam(startMs);
      params.end_time = fmtDayParam(endMs);
    } else if (useListingAll) {
      params.count = LISTING_MAX_COUNT;
      params.start = `-${LISTING_MAX_COUNT}`;
    } else {
      params.count = DEFAULT_RECENT_COUNT;
      params.start = `-${DEFAULT_RECENT_COUNT}`;
    }
    return { params, uiPeriod, useRange, startMs, endMs };
  }

  function finalizeBars(bars, uiPeriod, useRange, startMs, endMs) {
    if (!bars?.length) return [];
    let out = bars;
    if (uiPeriod === "10m") out = aggregate10mFrom5m(out);
    if (useRange && startMs && endMs) out = trimBarsByRange(out, startMs, endMs);
    return out;
  }

  /** 仅读内存缓存，不发起网络请求 */
  function fetchForChartFromCache(ctx) {
    const built = buildFetchParams(ctx);
    if (built.error) return { bars: [], error: built.error };
    const cached = peekCachedBars(built.params);
    if (!cached?.length) return null;
    const bars = finalizeBars(cached, built.uiPeriod, built.useRange, built.startMs, built.endMs);
    return bars.length ? { bars } : { bars: [], error: "EMPTY" };
  }

  /**
   * 按图表上下文拉取 K 线（已映射周期 / 复权）；缓存 key 含 split，切换复权后再次切回命中缓存
   * @returns {Promise<{bars:Array, error?:string}|null>}
   */
  async function fetchForChart(ctx) {
    const built = buildFetchParams(ctx);
    if (built.error) return { bars: [], error: built.error };

    let bars = await cachedFetch(built.params);
    if (!bars?.length) return { bars: [], error: "EMPTY" };

    bars = finalizeBars(bars, built.uiPeriod, built.useRange, built.startMs, built.endMs);
    return bars.length ? { bars } : { bars: [], error: "EMPTY" };
  }

  global.QuoteKlineApi = {
    toQuoteObj,
    fetchForChart,
    fetchForChartFromCache,
    splitForChartAdj,
    peekCachedBars,
    /** 测试 / 调试 */
    _fetchKlineRaw: fetchKlineRaw,
  };
})(typeof window !== "undefined" ? window : globalThis);
