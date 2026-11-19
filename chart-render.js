/**
 * K 线绘制与示例行情（摘自「量化策略生产平台-原型.html」renderPane + 示例行情逻辑）
 */
(function (global) {
  const isNull = (v) =>
    v === null || v === undefined || (typeof v === "number" && !isFinite(v));

  function hashString(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(16);
  }

  /** @param {string} symbol @param {number} startMs @param {number} endMs */
  function generateBars(symbol, startMs, endMs) {
    let seed = (20261013 ^ parseInt(hashString(`${symbol}|${startMs}|${endMs}`).slice(0, 8), 16)) >>> 0;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

    const days = [];
    const d = new Date(endMs);
    d.setHours(12, 0, 0, 0);
    while (d.getTime() >= startMs) {
      const w = d.getDay();
      if (w !== 0 && w !== 6) days.unshift(new Date(d.getTime()));
      d.setDate(d.getDate() - 1);
    }
    if (!days.length) return [];

    const bars = [];
    let c = 12.5;
    for (let i = 0; i < days.length; i++) {
      const drift = Math.sin(i / 9) * 0.012 + (rnd() - 0.48) * 0.035;
      const o = +(c * (1 + (rnd() - 0.5) * 0.01)).toFixed(2);
      const cl = +(o * (1 + drift)).toFixed(2);
      const hi = +(Math.max(o, cl) * (1 + rnd() * 0.015)).toFixed(2);
      const lo = +(Math.min(o, cl) * (1 - rnd() * 0.015)).toFixed(2);
      const vol = Math.round((60000 + rnd() * 120000) * (1 + Math.abs(drift) * 12));
      bars.push({ t: days[i].getTime(), o, h: hi, l: lo, c: cl, v: vol });
      c = cl;
    }
    return bars;
  }

  /** @param {Array<{o,h,l,c,v}>} bars */
  function barsToK(bars) {
    const n = bars.length;
    return {
      n,
      O: bars.map((b) => b.o),
      H: bars.map((b) => b.h),
      L: bars.map((b) => b.l),
      C: bars.map((b) => b.c),
      V: bars.map((b) => b.v),
      idx: Array.from({ length: n }, (_, i) => i),
    };
  }

  /**
   * @param {HTMLCanvasElement} cv
   * @param {number} h
   * @param {number} barN
   * @param {{ O,H,L,C,V,idx:number[] }} K
   * @param {object} spec
   */
  function scaleRange(vals) {
    if (!vals.length) vals.push(0, 1);
    let mx = Math.max(...vals);
    let mn = Math.min(...vals);
    if (mx === mn) {
      mx += 1;
      mn -= 1;
    }
    const pad = (mx - mn) * 0.06;
    mx += pad;
    mn -= pad;
    return { mn, mx };
  }

  function pushDrawVals(draws, out) {
    (draws || []).forEach((d) => {
      if (d.draw === "stick") {
        d.p1?.forEach((v, i) => {
          if (d.cond[i] && !isNull(v) && typeof v === "number") out.push(v);
        });
        d.p2?.forEach((v, i) => {
          if (d.cond[i] && !isNull(v) && typeof v === "number") out.push(v);
        });
      } else if (d.draw === "kline") {
        (d.h || []).forEach((v) => {
          if (!isNull(v)) out.push(v);
        });
        (d.l || []).forEach((v) => {
          if (!isNull(v)) out.push(v);
        });
      } else if (d.p) {
        d.p.forEach((v, i) => {
          if (d.cond[i] && !isNull(v) && typeof v === "number") out.push(v);
        });
      }
      if (d.num) {
        d.num.forEach((v, i) => {
          if (d.cond[i] && !isNull(v)) out.push(v);
        });
      }
    });
  }

  function drawDrawings(ctx, draws, yFn, x, K, step, layout) {
    layout = layout || {};
    const atDraw = (v, i) => (Array.isArray(v) ? v[i] : v);
    (draws || []).forEach((d) => {
      ctx.strokeStyle = ctx.fillStyle = d.color || "#e53935";
      ctx.lineWidth = 1.2;
      if (d.draw === "text_fix") {
        const px0 = layout.plotX0 ?? 0;
        const pw = layout.plotW ?? (ctx.canvas.width / (ctx.getTransform?.()?.[0] || 1));
        const tp = layout.top ?? 0;
        const plotH = (layout.h ?? 0) - tp - (layout.bottom ?? 0);
        const lines = String(d.text ?? "").split("&");
        K.idx.forEach((i) => {
          if (!d.cond[i]) return;
          const fx = +atDraw(d.x, i) || 0;
          const fy = +atDraw(d.y, i) || 0;
          const align = Math.floor(+atDraw(d.type, i) || 0);
          const px = px0 + fx * pw;
          const py = tp + fy * plotH + 12;
          ctx.font = 'bold 11px "Microsoft YaHei", system-ui';
          ctx.fillStyle = d.color || "#333";
          ctx.textAlign = align === 1 ? "right" : "left";
          lines.forEach((line, li) => {
            ctx.fillText(line, px, py + li * 14);
          });
          ctx.textAlign = "start";
        });
        return;
      }
      if (d.draw === "kline") {
        const cw = Math.max(1.5, step * 0.6);
        K.idx.forEach((i) => {
          if ([d.h[i], d.o[i], d.l[i], d.c[i]].some(isNull)) return;
          const up = d.c[i] >= d.o[i];
          ctx.strokeStyle = ctx.fillStyle = up ? "#e53935" : "#2e9d43";
          ctx.beginPath();
          ctx.moveTo(x(i), yFn(d.h[i]));
          ctx.lineTo(x(i), yFn(d.l[i]));
          ctx.stroke();
          ctx.fillRect(
            x(i) - cw / 2,
            yFn(Math.max(d.o[i], d.c[i])),
            cw,
            Math.max(1, Math.abs(yFn(d.o[i]) - yFn(d.c[i])))
          );
        });
        return;
      }
      if (d.draw === "mark") {
        const s = Math.max(3.5, Math.min(6, step * 0.45));
        const above = d.position === "above";
        K.idx.forEach((i) => {
          if (!d.cond[i] || isNull(d.p[i])) return;
          const X = x(i);
          const tip = yFn(d.p[i]) + (above ? -5 : 5);
          const base = above ? tip - s * 1.4 : tip + s * 1.4;
          ctx.fillStyle = d.color || "#dc2626";
          ctx.beginPath();
          ctx.moveTo(X, tip);
          ctx.lineTo(X - s, base);
          ctx.lineTo(X + s, base);
          ctx.closePath();
          ctx.fill();
          if (d.label) {
            ctx.font = '11px "Microsoft YaHei", system-ui';
            ctx.textAlign = "center";
            ctx.textBaseline = above ? "bottom" : "top";
            ctx.fillText(d.label, X, above ? base - 2 : base + 2);
            ctx.textBaseline = "alphabetic";
            ctx.textAlign = "start";
          }
        });
        return;
      }
      if (d.draw === "trade") {
        const buy = d.side === "BUY";
        const s = Math.max(4, Math.min(7, step * 0.5));
        K.idx.forEach((i) => {
          if (!d.cond[i] || !d.p || isNull(d.p[i])) return;
          const X = x(i);
          const tip = yFn(d.p[i]) + (buy ? 4 : -4);
          const dir = buy ? 1 : -1;
          ctx.fillStyle = d.color;
          ctx.beginPath();
          ctx.moveTo(X, tip);
          ctx.lineTo(X - s, tip + dir * s * 1.2);
          ctx.lineTo(X - s * 0.4, tip + dir * s * 1.2);
          ctx.lineTo(X - s * 0.4, tip + dir * s * 2.2);
          ctx.lineTo(X + s * 0.4, tip + dir * s * 2.2);
          ctx.lineTo(X + s * 0.4, tip + dir * s * 1.2);
          ctx.lineTo(X + s, tip + dir * s * 1.2);
          ctx.closePath();
          ctx.fill();
          ctx.font = 'bold 11px "Microsoft YaHei", system-ui';
          ctx.textAlign = "center";
          ctx.textBaseline = buy ? "top" : "bottom";
          ctx.fillText(buy ? "B" : "S", X, tip + dir * (s * 2.2 + 2));
          ctx.textBaseline = "alphabetic";
          ctx.textAlign = "start";
        });
        return;
      }
      if (d.draw === "ploy") {
        ctx.beginPath();
        let pen = false;
        K.idx.forEach((i) => {
          if (!d.cond[i] || isNull(d.p[i])) return;
          if (!pen) {
            ctx.moveTo(x(i), yFn(d.p[i]));
            pen = true;
          } else ctx.lineTo(x(i), yFn(d.p[i]));
        });
        ctx.stroke();
        return;
      }
      K.idx.forEach((i) => {
        if (!d.cond[i]) return;
        if (d.draw === "stick") {
          if (isNull(d.p1[i]) || isNull(d.p2[i])) return;
          const bw = Math.max(1, step * ((d.w || 1) / 4) * 0.9);
          const y1 = yFn(Math.max(d.p1[i], d.p2[i]));
          const hh = Math.max(1, Math.abs(yFn(d.p1[i]) - yFn(d.p2[i])));
          if (d.empty) ctx.strokeRect(x(i) - bw / 2, y1, bw, hh);
          else ctx.fillRect(x(i) - bw / 2, y1, bw, hh);
          return;
        }
        if (d.draw === "number" && d.num && !isNull(d.num[i])) {
          const X = x(i);
          const Y = yFn(d.num[i]);
          ctx.font = 'bold 11px "Microsoft YaHei", system-ui';
          ctx.textAlign = "center";
          ctx.fillText((+d.num[i]).toFixed(2), X, Y);
          ctx.textAlign = "start";
          return;
        }
        if (isNull(d.p[i])) return;
        const X = x(i);
        const Y = yFn(d.p[i]);
        ctx.font = 'bold 11px "Microsoft YaHei", system-ui';
        ctx.textAlign = "center";
        if (d.draw === "text") {
          const t = atDraw(d.text, i);
          ctx.fillText(typeof t === "string" ? t : String(t ?? ""), X, Y);
        } else if (d.draw === "number") {
          ctx.fillText(isNull(d.num[i]) ? "" : (+d.num[i]).toFixed(2), X, Y);
        } else if (d.draw === "icon") {
          const t = +d.type;
          const upIcon = t !== 2;
          ctx.fillStyle = d.color || (upIcon ? "#e53935" : "#2e9d43");
          const glyph = iconGlyph(t, upIcon);
          const yOff = d.attrs && d.attrs.includes("DRAWABOVE") ? -6 : upIcon ? 10 : 0;
          ctx.fillText(glyph, X, Y + yOff);
        }
        ctx.textAlign = "start";
      });
    });
  }

  function drawSeriesList(ctx, series, y, x, y0, K, step) {
    (series || []).forEach((s) => {
      if (s.style.nodraw || !s.data) return;
      const st = s.style;
      const d = s.data;
      ctx.lineWidth = st.thick || 1.5;
      ctx.strokeStyle = ctx.fillStyle = st.color;
      if (["STICK", "COLORSTICK", "VOLSTICK", "LINESTICK"].includes(st.kind)) {
        d.forEach((v, i) => {
          if (isNull(v)) return;
          if (st.kind === "COLORSTICK") ctx.strokeStyle = v >= 0 ? "#e53935" : "#2e9d43";
          if (st.kind === "VOLSTICK") {
            const up = K.C[i] >= K.O[i];
            const bw = Math.max(1.5, step * 0.6);
            ctx.strokeStyle = ctx.fillStyle = up ? "#e53935" : "#2e9d43";
            ctx.lineWidth = 1;
            if (up) ctx.strokeRect(x(i) - bw / 2, y(v), bw, y0 - y(v));
            else ctx.fillRect(x(i) - bw / 2, y(v), bw, y0 - y(v));
            return;
          }
          ctx.beginPath();
          ctx.moveTo(x(i), y0);
          ctx.lineTo(x(i), y(v));
          ctx.stroke();
        });
        if (st.kind !== "LINESTICK") return;
        ctx.strokeStyle = st.color;
      }
      ctx.setLineDash(Array.isArray(st.dash) ? st.dash : st.dash ? [4, 3] : []);
      ctx.beginPath();
      let pen = false;
      d.forEach((v, i) => {
        if (isNull(v)) {
          pen = false;
          return;
        }
        if (!pen) {
          ctx.moveTo(x(i), y(v));
          pen = true;
        } else ctx.lineTo(x(i), y(v));
      });
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  function renderPane(cv, h, barN, K, spec) {
    const dpr = 2;
    const w = cv.clientWidth || 800;
    cv.width = w * dpr;
    cv.height = h * dpr;
    cv.style.height = `${h}px`;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const padR = 56;
    /** 主图独立坐标：公式全部内容（线+图元）用独立 Y，仅与 K 线共用 X；K 线仍用价格 Y */
    const overlayActive =
      (spec.overlaySeries || []).length > 0 || (spec.overlayDraws || []).length > 0;
    const top = 10;
    const bottom = 14;
    const plotW = w - padR;
    const plotX0 = 0;
    const step = plotW / barN;
    const vals = [];
    const push = (a) =>
      (a || []).forEach((v) => {
        if (!isNull(v) && typeof v === "number") vals.push(v);
      });
    if (spec.candles) {
      push(K.H);
      push(K.L);
    }
    if (!overlayActive) {
      (spec.series || []).forEach((s) => {
        if (!s.style.nodraw) push(s.data);
      });
    }
    if (!overlayActive) {
      (spec.draws || []).forEach((d) => {
        if (d.draw === "stick") {
          push(d.p1.filter((_, i) => d.cond[i]));
          push(d.p2.filter((_, i) => d.cond[i]));
        } else if (d.draw === "kline") {
          push(d.h);
          push(d.l);
        } else if (d.p) push(d.p.filter((_, i) => d.cond[i]));
      });
    }
  if (
      spec.zero &&
      (spec.series || []).some((s) =>
        ["STICK", "COLORSTICK", "VOLSTICK", "LINESTICK"].includes(s.style.kind)
      )
    ) {
      vals.push(0);
    }
    const { mn, mx } = scaleRange(vals);
    const y = (v) => top + ((mx - v) / (mx - mn)) * (h - top - bottom);
    const x = (i) => plotX0 + i * step + step / 2;

    let oMn = mn;
    let oMx = mx;
    let yOv = y;
    if (overlayActive) {
      const oVals = [];
      (spec.overlaySeries || []).forEach((s) => {
        if (s.style?.nodraw) return;
        (s.data || []).forEach((v) => {
          if (!isNull(v) && typeof v === "number") oVals.push(v);
        });
      });
      pushDrawVals(spec.overlayDraws, oVals);
      const oR = scaleRange(oVals.length ? oVals : [0, 1]);
      oMn = oR.mn;
      oMx = oR.mx;
      yOv = (v) => top + ((oMx - v) / (oMx - oMn)) * (h - top - bottom);
    }

    ctx.fillStyle = spec.bg || "#fbfcfd";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#eef0f5";
    ctx.fillStyle = "#8a94a6";
    ctx.font = "10px Consolas, system-ui";
    ctx.lineWidth = 1;
    const fmtAxis = (v) => (Math.abs(v) >= 10000 ? (v / 10000).toFixed(1) + "万" : v.toFixed(2));
    for (let g = 0; g <= 4; g++) {
      const v = mn + ((mx - mn) * g) / 4;
      const yy = y(v);
      ctx.strokeStyle = "#eef0f5";
      ctx.beginPath();
      ctx.moveTo(plotX0, yy);
      ctx.lineTo(plotX0 + plotW, yy);
      ctx.stroke();
      ctx.fillStyle = "#8a94a6";
      ctx.fillText(fmtAxis(v), plotX0 + plotW + 4, yy + 3);
    }

    if (spec.candles) {
      const cw = Math.max(1.5, step * 0.6);
      K.idx.forEach((i) => {
        const up = K.C[i] >= K.O[i];
        const color =
          spec.colorK && spec.colorK[i] ? "#e6b800" : up ? "#e53935" : "#2e9d43";
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(x(i), y(K.H[i]));
        ctx.lineTo(x(i), y(K.L[i]));
        ctx.stroke();
        const yt = y(Math.max(K.O[i], K.C[i]));
        const hh = Math.max(1, Math.abs(y(K.O[i]) - y(K.C[i])));
        if (up && !(spec.colorK && spec.colorK[i])) {
          ctx.fillStyle = "#fff";
          ctx.fillRect(x(i) - cw / 2, yt, cw, hh);
          ctx.strokeStyle = color;
          ctx.strokeRect(x(i) - cw / 2, yt, cw, hh);
        } else {
          ctx.fillStyle = color;
          ctx.fillRect(x(i) - cw / 2, yt, cw, hh);
        }
      });
    }

    const y0 = y(Math.min(Math.max(0, mn), mx));
    drawSeriesList(ctx, spec.series, y, x, y0, K, step);
    drawSeriesList(
      ctx,
      spec.overlaySeries,
      yOv,
      x,
      yOv(Math.min(Math.max(0, oMn), oMx)),
      K,
      step
    );

    const drawLayout = { plotX0, plotW, top, bottom, h };
    drawDrawings(ctx, spec.draws, y, x, K, step, drawLayout);
    drawDrawings(ctx, spec.overlayDraws, yOv, x, K, step, drawLayout);

    (spec.marks || []).forEach((m) => {
      ctx.font = 'bold 11px "Microsoft YaHei", system-ui';
      ctx.textAlign = "center";
      if (m.up) {
        ctx.fillStyle = "#e53935";
        ctx.fillText("▲" + (m.text ? m.text : ""), x(m.i), y(K.L[m.i]) + 12);
      } else {
        ctx.fillStyle = "#2e9d43";
        ctx.fillText("▼" + (m.text ? m.text : ""), x(m.i), y(K.H[m.i]) - 4);
      }
      ctx.textAlign = "start";
    });

    return { w, h, plotW, step, top, bottom, padR, barN, mn, mx, y };
  }

  /** 按可见宽度挑选年月日刻度，避免重叠 */
  function pickTimeAxisTicks(bars, plotW) {
    if (!bars?.length || plotW <= 0) return [];
    const step = plotW / bars.length;
    const minGap = Math.max(44, step * 4);
    const raw = [];
    let prevY = -1;
    let prevM = -1;

    for (let i = 0; i < bars.length; i++) {
      const dt = new Date(bars[i].t);
      const y = dt.getFullYear();
      const m = dt.getMonth() + 1;
      const d = dt.getDate();
      if (y !== prevY) {
        raw.push({ i, text: `${y}年`, bold: true, prio: 3 });
        prevY = y;
        prevM = m;
        continue;
      }
      if (m !== prevM) {
        raw.push({ i, text: `${m}月`, bold: false, prio: 2 });
        prevM = m;
      }
    }

    if (step >= 9) {
      for (let i = 1; i < bars.length; i++) {
        const dt = new Date(bars[i].t);
        const prevDt = new Date(bars[i - 1].t);
        if (dt.getMonth() !== prevDt.getMonth()) continue;
        if (dt.getDate() === prevDt.getDate()) continue;
        raw.push({ i, text: `${dt.getDate()}日`, bold: false, prio: 1 });
      }
    }

    const best = new Map();
    raw.forEach((t) => {
      const old = best.get(t.i);
      if (!old || t.prio > old.prio) best.set(t.i, t);
    });
    const sorted = [...best.values()].sort((a, b) => a.i - b.i);
    const out = [];
    let lastX = -Infinity;
    sorted.forEach((t) => {
      const px = (t.i + 0.5) * step;
      if (px - lastX >= minGap) {
        out.push(t);
        lastX = px;
      }
    });
    return out;
  }

  /**
   * @param {HTMLCanvasElement} cv
   * @param {number} barN
   * @param {Array<{t:number}>} bars 与当前视窗一致的 K 线切片
   * @param {{ padR?: number }} opts
   */
  function renderTimeAxis(cv, barN, bars, opts) {
    const h = 26;
    const dpr = 2;
    const w = cv.clientWidth || 800;
    cv.width = w * dpr;
    cv.height = h * dpr;
    cv.style.height = `${h}px`;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const padR = opts?.padR ?? 56;
    const plotW = w - padR;
    if (!bars?.length || barN <= 0) return { w, plotW, padR };

    ctx.fillStyle = "#f7f9fa";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#e3eaee";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0.5);
    ctx.lineTo(plotW, 0.5);
    ctx.stroke();

    const step = plotW / barN;
    const ticks = pickTimeAxisTicks(bars, plotW);
    const yText = h - 4;
    ticks.forEach((t) => {
      const x = t.i * step + step / 2;
      ctx.fillStyle = "#7a8794";
      ctx.font = `${t.bold ? "600 " : ""}10px Inter, "PingFang SC", "Microsoft YaHei", system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(t.text, x, yText);
    });
    ctx.textAlign = "start";
    return { w, plotW, padR, step };
  }

  function iconGlyph(type, upIcon) {
    const t = Math.floor(type);
    if (t === 1 || t === 7) return upIcon ? "▲" : "●";
    if (t === 2) return "▼";
    if (t === 3 || t === 8) return "★";
    if (t === 4) return "◇";
    if (t === 5) return "×";
    if (t >= 9 && t <= 12) return String(t - 8);
    return upIcon ? "▲" : "▼";
  }

  global.MaiChart = {
    isNull,
    generateBars,
    barsToK,
    renderPane,
    renderTimeAxis,
  };
})(typeof window !== "undefined" ? window : globalThis);
