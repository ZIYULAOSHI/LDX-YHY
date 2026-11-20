/**
 * 指标管理后台（原型）
 * 列表（筛选 / 分页 / 右侧固定操作列）· 上架（勾选应用）/ 下架 · 查看抽屉（源码 + 图表预览）· 编辑抽屉 · 操作日志
 */
(function () {
  const R = window.IndicatorRegistry;
  const F = window.IndicatorForm;
  const $ = (id) => document.getElementById(id);
  const esc = F.esc;

  const PREVIEW_BARS = 500;
  const PREVIEW_SYMBOL = { code: "000001", name: "平安银行" };

  window.toast = function (message, type = "info") {
    const region = $("toast-region");
    if (!region) return;
    const el = document.createElement("div");
    el.className = `toast${type === "success" ? " success" : ""}${type === "warn" ? " warn" : ""}`;
    el.textContent = message;
    region.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  };
  const toast = window.toast;

  /** 指标互相引用时按编码解析 */
  window.getFormulaRefLib = () =>
    R.list().map((ind) => ({ name: ind.code, code: ind.source || "", params: [], type: "tech", dialect: "tdx" }));

  const ui = {
    sort: { key: "updatedAt", dir: "desc" },
    list: { page: 1, size: 10 },
    logs: { page: 1, size: 20 },
    drawer: null, // { mode: 'view' | 'edit', id }
  };

  // ---------- 通用 ----------

  const statusTag = (ind) =>
    `<span class="status-tag" data-on="${ind.status === "on"}">${R.STATUS[ind.status]}</span>`;

  const typeTag = (ind) => `<span class="type-tag" data-type="${ind.type}">${esc(R.typeLabel(ind.type))}</span>`;

  function appsCell(ind) {
    if (ind.status !== "on" || !ind.apps.length) return `<span class="muted">—</span>`;
    return `<span class="app-chips">${R.APPS.filter((a) => ind.apps.includes(a.key))
      .map((a) => `<i>${esc(a.label)}</i>`)
      .join("")}</span>`;
  }

  function fillSelect(el, allLabel, entries) {
    el.innerHTML = `<option value="">${allLabel}</option>` + entries.map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("");
  }

  function renderPager(box, total, st, onChange) {
    const pages = Math.max(1, Math.ceil(total / st.size));
    if (st.page > pages) st.page = pages;
    const cur = st.page;
    const nums = [];
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - cur) <= 2) nums.push(i);
      else if (nums[nums.length - 1] !== "…") nums.push("…");
    }
    box.innerHTML = `
      <span class="pager-total">共 ${total} 条</span>
      <span class="spacer"></span>
      <select class="pager-size" aria-label="每页条数">${[10, 20, 50]
        .map((n) => `<option value="${n}"${n === st.size ? " selected" : ""}>${n} 条/页</option>`)
        .join("")}</select>
      <button type="button" class="pager-btn" data-go="${cur - 1}" ${cur <= 1 ? "disabled" : ""} aria-label="上一页">‹</button>
      ${nums
        .map((n) =>
          n === "…"
            ? `<span class="pager-ellipsis">…</span>`
            : `<button type="button" class="pager-btn${n === cur ? " active" : ""}" data-go="${n}">${n}</button>`
        )
        .join("")}
      <button type="button" class="pager-btn" data-go="${cur + 1}" ${cur >= pages ? "disabled" : ""} aria-label="下一页">›</button>
      <span class="pager-jump">前往 <input type="number" min="1" max="${pages}" value="${cur}" aria-label="页码" /> 页</span>`;
    box.querySelectorAll("[data-go]").forEach((b) =>
      b.addEventListener("click", () => {
        st.page = Number(b.dataset.go);
        onChange();
      })
    );
    box.querySelector(".pager-size").addEventListener("change", (e) => {
      st.size = Number(e.target.value);
      st.page = 1;
      onChange();
    });
    box.querySelector(".pager-jump input").addEventListener("change", (e) => {
      const n = Math.min(pages, Math.max(1, Math.round(Number(e.target.value) || 1)));
      st.page = n;
      onChange();
    });
  }

  // ---------- 指标列表 ----------

  function filters() {
    return {
      kw: $("f-keyword").value.trim().toLowerCase(),
      type: $("f-type").value,
      status: $("f-status").value,
      app: $("f-app").value,
      pricing: $("f-pricing").value,
    };
  }

  function filteredIndicators() {
    const f = filters();
    const { key, dir } = ui.sort;
    const sign = dir === "asc" ? 1 : -1;
    return R.list()
      .sort((a, b) => sign * ((a[key] || 0) - (b[key] || 0)))
      .filter((ind) => {
      if (f.kw && !`${ind.code} ${ind.name} ${ind.desc}`.toLowerCase().includes(f.kw)) return false;
      if (f.type && ind.type !== f.type) return false;
      if (f.status && ind.status !== f.status) return false;
      if (f.app && !(ind.status === "on" && ind.apps.includes(f.app))) return false;
      if (f.pricing && ind.pricing !== f.pricing) return false;
      return true;
    });
  }

  function renderList() {
    const all = R.list();
    document.querySelectorAll("#ind-table th[data-sort]").forEach((th) => {
      th.dataset.dir = th.dataset.sort === ui.sort.key ? ui.sort.dir : "";
      th.title = th.dataset.sort === ui.sort.key ? (ui.sort.dir === "desc" ? "当前倒序，点击改为正序" : "当前正序，点击改为倒序") : "点击排序";
    });
    const rows = filteredIndicators();
    const on = all.filter((x) => x.status === "on").length;
    $("f-summary").textContent = `已上架 ${on} · 已下架 ${all.length - on}`;
    const st = ui.list;
    renderPager($("ind-pager"), rows.length, st, renderList);
    const pageRows = rows.slice((st.page - 1) * st.size, st.page * st.size);
    $("ind-tbody").innerHTML = pageRows.length
      ? pageRows
          .map(
            (ind) => `<tr data-id="${ind.id}">
        <td class="col-code mono">${esc(ind.code)}</td>
        <td class="col-name"><b>${esc(ind.name)}</b></td>
        <td class="col-desc" title="${esc(ind.desc)}">${esc(ind.desc) || '<span class="muted">—</span>'}</td>
        <td>${typeTag(ind)}</td>
        <td>${esc(R.DRAW_METHODS[ind.drawMethod] || "—")}</td>
        <td class="col-periods">${esc(R.periodsLabel(ind.periods))}</td>
        <td>${esc(R.marketsLabel(ind.markets))}</td>
        <td>${ind.pricing === "paid" ? '<span class="price-tag">付费</span>' : "免费"}</td>
        <td>${statusTag(ind)}</td>
        <td class="col-apps">${appsCell(ind)}</td>
        <td>${esc(ind.createdBy)}</td>
        <td class="col-time">${R.fmtTime(ind.createdAt)}</td>
        <td class="col-time">${R.fmtTime(ind.updatedAt)}</td>
        <td class="col-ops">
          <button type="button" class="link-btn" data-act="view">查看</button>
          <button type="button" class="link-btn" data-act="edit">编辑</button>
          ${
            ind.status === "on"
              ? `<button type="button" class="link-btn danger" data-act="off">下架</button>`
              : `<button type="button" class="link-btn strong" data-act="on">上架</button>`
          }
        </td>
      </tr>`
          )
          .join("")
      : `<tr><td colspan="14" class="admin-empty">没有符合条件的指标</td></tr>`;
  }

  $("ind-tbody").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const id = btn.closest("tr").dataset.id;
    const act = btn.dataset.act;
    if (act === "view") openDrawer("view", id);
    else if (act === "edit") openDrawer("edit", id);
    else if (act === "on") openOnDialog(id);
    else if (act === "off") openOffDialog(id);
  });

  // ---------- 上架 / 下架 ----------

  let actHandler = null;

  function openAct(title, meta, body, okText, okClass, handler) {
    $("act-title").textContent = title;
    $("act-meta").textContent = meta;
    $("act-body").innerHTML = body;
    const ok = $("act-ok");
    ok.textContent = okText;
    ok.className = okClass;
    actHandler = handler;
    const m = $("act-mask");
    m.hidden = false;
    requestAnimationFrame(() => m.classList.add("show"));
  }

  function closeAct() {
    const m = $("act-mask");
    m.classList.remove("show");
    m.hidden = true;
    actHandler = null;
  }

  $("act-cancel").addEventListener("click", closeAct);
  $("act-mask").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeAct();
  });
  $("act-ok").addEventListener("click", () => actHandler && actHandler());

  /** @param {{ beforeOn?: () => {ok:boolean, reason?:string}, title?: string, okText?: string }} [opts] */
  function openOnDialog(id, opts = {}) {
    const ind = R.get(id);
    if (!ind) return;
    const pre = ind.lastApps?.length ? ind.lastApps : [];
    openAct(
      opts.title || "上架指标",
      `${ind.name} · ${ind.code}`,
      `<p class="act-lead">选择要上架的应用，上架后对应端的用户即可在指标列表中看到并使用该指标。</p>
       <div class="app-pick">${R.APPS.map(
         (a) => `<label class="app-pick-item"><input type="checkbox" value="${a.key}"${pre.includes(a.key) ? " checked" : ""} /><span>${esc(a.label)}</span></label>`
       ).join("")}</div>
       <p class="act-hint muted">指标类型：${esc(R.typeLabel(ind.type))} · ${ind.pricing === "paid" ? "付费指标，仅付费用户可用" : "免费指标"} · 适用 ${esc(R.marketsLabel(ind.markets))}</p>
       <p class="act-err" id="act-err" hidden></p>`,
      opts.okText || "确认上架",
      "primary",
      () => {
        const apps = [...$("act-body").querySelectorAll("input:checked")].map((x) => x.value);
        const err = $("act-err");
        if (!apps.length) {
          err.textContent = "至少勾选 1 个应用";
          err.hidden = false;
          return;
        }
        if (opts.beforeOn) {
          const saved = opts.beforeOn();
          if (!saved.ok) {
            err.textContent = saved.reason;
            err.hidden = false;
            return;
          }
        }
        R.setOn(id, apps);
        closeAct();
        toast(`「${R.get(id).name}」已${opts.beforeOn ? "保存并" : ""}上架至 ${R.appsLabel(apps)}`, "success");
        if (opts.beforeOn) closeDrawer();
        refresh();
      }
    );
  }

  function openOffDialog(id) {
    const ind = R.get(id);
    if (!ind) return;
    openAct(
      "下架指标",
      `${ind.name} · ${ind.code}`,
      `<p class="act-lead">下架后，<b>${esc(R.appsLabel(ind.apps))}</b> 的用户将无法再看到和使用该指标，已添加到图表的也会被移除。</p>
       <p class="act-hint muted">下架不会删除指标，可随时重新上架。</p>`,
      "确认下架",
      "danger",
      () => {
        R.setOff(id);
        closeAct();
        toast(`「${ind.name}」已下架`, "success");
        refresh();
      }
    );
  }

  // ---------- 抽屉：查看 / 编辑 ----------

  function openDrawer(mode, id) {
    const ind = R.get(id);
    if (!ind) {
      toast("指标不存在", "warn");
      return;
    }
    ui.drawer = { mode, id };
    const ov = $("drawer-overlay");
    ov.hidden = false;
    requestAnimationFrame(() => ov.classList.add("show"));
    renderDrawer();
  }

  function closeDrawer() {
    const ov = $("drawer-overlay");
    ov.classList.remove("show");
    ov.hidden = true;
    ui.drawer = null;
  }

  $("drawer-close").addEventListener("click", closeDrawer);
  $("drawer-overlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeDrawer();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("act-mask").hidden) closeAct();
    else if (!$("logs-mask").hidden) closeLogs();
    else if (ui.drawer) closeDrawer();
  });

  const workbenchHref = (ind) => `./index.html?indicator=${encodeURIComponent(ind.id)}`;

  function renderDrawer() {
    const d = ui.drawer;
    if (!d) return;
    const ind = R.get(d.id);
    if (!ind) return closeDrawer();
    $("drawer-title").textContent = d.mode === "edit" ? `编辑指标 · ${ind.name}` : ind.name;
    $("drawer-meta").innerHTML = `<span class="mono">${esc(ind.code)}</span>${statusTag(ind)}${typeTag(ind)}<span class="muted">更新于 ${R.fmtTime(ind.updatedAt)} · ${esc(ind.updatedBy)}</span>`;
    if (d.mode === "edit") renderEdit(ind);
    else renderView(ind);
  }

  function kv(label, value, wide) {
    return `<div class="kv${wide ? " kv-wide" : ""}"><span>${label}</span><b>${value}</b></div>`;
  }

  function renderView(ind) {
    const params = Object.entries(ind.params || {});
    const logs = R.logs().filter((l) => l.indId === ind.id).slice(0, 6);
    $("drawer-body").innerHTML = `
      <section class="drawer-sec">
        <h4>基本信息</h4>
        <div class="kv-grid">
          ${kv("指标编码", `<span class="mono">${esc(ind.code)}</span>`)}
          ${kv("指标名称", esc(ind.name))}
          ${kv("指标描述", esc(ind.desc) || "—", true)}
          ${kv("指标类型", esc(R.typeLabel(ind.type)))}
          ${kv("画线方法", esc(R.DRAW_METHODS[ind.drawMethod]))}
          ${kv("适用周期", esc(R.periodsLabel(ind.periods)), true)}
          ${kv("适用范围", esc(R.marketsLabel(ind.markets)))}
          ${kv("免费 / 付费", esc(R.PRICING[ind.pricing]))}
          ${kv("上下架状态", statusTag(ind))}
          ${kv("应用", appsCell(ind))}
          ${kv("创建", `${esc(ind.createdBy)} · ${R.fmtTime(ind.createdAt)}`)}
          ${kv("最近更新", `${esc(ind.updatedBy)} · ${R.fmtTime(ind.updatedAt)}`)}
        </div>
      </section>
      <section class="drawer-sec">
        <h4>公式参数</h4>
        ${
          params.length
            ? `<table class="drawer-table"><thead><tr><th>参数</th><th>默认值</th><th>最小值</th><th>最大值</th><th>步长</th></tr></thead><tbody>${params
                .map(
                  ([k, p]) =>
                    `<tr><td class="mono">${esc(k)}</td><td>${p.value}</td><td>${p.min}</td><td>${p.max}</td><td>${p.step}</td></tr>`
                )
                .join("")}</tbody></table>`
            : `<p class="muted">无可调参数</p>`
        }
      </section>
      <details class="drawer-fold" id="fold-source">
        <summary><b>公式源码</b><span class="muted">通达信语法 · ${ind.source.split("\n").length} 行</span></summary>
        <pre class="source-view">${esc(ind.source)}</pre>
      </details>
      <details class="drawer-fold" id="fold-preview">
        <summary><b>图表预览</b><span class="muted">${PREVIEW_SYMBOL.name} ${PREVIEW_SYMBOL.code} · 日线近 ${PREVIEW_BARS} 根 K 线 · 按「${esc(R.DRAW_METHODS[ind.drawMethod])}」加载</span></summary>
        <div class="preview-box" id="preview-box"></div>
      </details>
      <section class="drawer-sec">
        <h4>最近操作</h4>
        ${
          logs.length
            ? `<ul class="mini-logs">${logs
                .map((l) => `<li><span class="muted">${R.fmtTime(l.ts)}</span><b>${esc(R.LOG_ACTIONS[l.action] || l.action)}</b><span>${esc(l.user)}</span><span class="muted">${esc(l.detail)}</span></li>`)
                .join("")}</ul>`
            : `<p class="muted">暂无记录</p>`
        }
      </section>`;
    const fold = $("fold-preview");
    fold.addEventListener("toggle", () => {
      if (fold.open && !fold.dataset.loaded) {
        fold.dataset.loaded = "1";
        renderPreview(ind);
      }
    });
    $("drawer-foot").innerHTML = `
      <span class="spacer"></span>
      <button type="button" data-foot="close">关闭</button>`;
  }

  function renderEdit(ind) {
    $("drawer-body").innerHTML = `
      <p class="drawer-tip">修改指标信息与参数默认值；如需修改公式源码，请
        <a href="${workbenchHref(ind)}">到指标工作台编辑公式</a>。${ind.status === "on" ? "该指标已上架，保存后各端同步生效。" : ""}</p>
      <div id="edit-form"></div>`;
    F.render($("edit-form"), ind, { codeEditable: false });
    $("drawer-foot").innerHTML = `
      <a class="btn-link" href="${workbenchHref(ind)}">去工作台编辑公式</a>
      <span class="spacer"></span>
      <button type="button" data-foot="close">取消</button>
      ${
        ind.status === "on"
          ? `<button type="button" class="primary" data-foot="save">保存</button>`
          : `<button type="button" data-foot="save">仅保存</button>
      <button type="button" class="primary" data-foot="saveOn">保存并上架</button>`
      }`;
  }

  $("drawer-foot").addEventListener("click", (e) => {
    const b = e.target.closest("[data-foot]");
    if (!b || !ui.drawer) return;
    const { id } = ui.drawer;
    const act = b.dataset.foot;
    if (act === "close") closeDrawer();
    else if (act === "save") {
      const r = R.save({ ...F.read($("edit-form")), id }, "edit");
      if (!r.ok) {
        toast(r.reason, "warn");
        return;
      }
      toast(`已保存「${r.indicator.name}」${r.indicator.status === "on" ? "，各端同步生效" : "（仍为下架状态）"}`, "success");
      closeDrawer();
      refresh();
    } else if (act === "saveOn") {
      const payload = { ...F.read($("edit-form")), id };
      const err = R.validate(payload, "edit");
      if (err) {
        toast(err, "warn");
        return;
      }
      openOnDialog(id, { title: "保存并上架", okText: "保存并上架", beforeOn: () => R.save(payload, "edit") });
    }
  });

  // ---------- 图表预览 ----------

  function renderPreview(ind) {
    const box = $("preview-box");
    const bars = (window.MarketData?.BARS || []).slice(-PREVIEW_BARS);
    if (!bars.length || !window.TdxFormulaRuntime || !window.MaiChart) {
      box.innerHTML = `<p class="preview-status err">行情或绘图组件未加载，无法预览</p>`;
      return;
    }
    const pv = {};
    Object.entries(ind.params || {}).forEach(([k, p]) => (pv[k] = pv[k.toUpperCase()] = Number(p.value)));
    const t0 = performance.now();
    let plot;
    try {
      plot = window.TdxFormulaRuntime.chartPlotFromTdx(bars, ind.source, window.TdxFormulaEngine.parse, pv, PREVIEW_SYMBOL);
    } catch (err) {
      box.innerHTML = `<p class="preview-status err">加载失败：${esc(err?.message || err)}</p>`;
      return;
    }
    const ms = Math.round(performance.now() - t0);
    const lines = [...plot.mainLineSeries, ...plot.subLineSeries].map((s) => ({ name: s.name, data: s.data, style: s.style }));
    const draws = plot.mainDrawings || [];
    const trades = plot.tradeDrawings || [];
    const method = ind.drawMethod;
    const empty = !lines.length && !draws.length && !trades.length;
    const tradeN = plot.tradeStats ? plot.tradeStats.buy + plot.tradeStats.sell : 0;
    const first = bars[0].t;
    const last = bars[bars.length - 1].t;
    const fmtD = (t) => {
      const d = new Date(typeof t === "number" && t < 1e12 ? t * 1000 : t);
      return Number.isNaN(d.getTime()) ? String(t) : R.fmtTime(d.getTime()).slice(0, 10);
    };
    box.innerHTML = `
      <div class="preview-status ${empty ? "warn" : "ok"}">
        ${empty ? "公式已执行，但没有可绘制的输出" : "加载成功"} · 输出 ${lines.length} 条线${draws.length ? `、${draws.length} 组绘图` : ""}${tradeN ? `、${tradeN} 个买卖信号` : ""} · 耗时 ${ms} ms
      </div>
      <div class="preview-caption">${PREVIEW_SYMBOL.name} ${PREVIEW_SYMBOL.code} · 日线 · 近 ${bars.length} 根 K 线（${fmtD(first)} ~ ${fmtD(last)}）· ${esc(R.DRAW_METHODS[method])}</div>
      <div class="preview-legend">${lines
        .map((s) => `<span><i style="background:${s.style.color}"></i>${esc(s.name)}</span>`)
        .join("")}</div>
      <div class="preview-pane"><canvas class="pv-main"></canvas></div>
      ${method === "sub" ? `<div class="preview-sub-head">副图 · ${esc(ind.code)}</div><div class="preview-pane"><canvas class="pv-sub"></canvas></div>` : ""}
      <canvas class="pv-axis"></canvas>`;
    const n = bars.length;
    const K = window.MaiChart.barsToK(bars);
    const mainCv = box.querySelector(".pv-main");
    if (method === "main") {
      window.MaiChart.renderPane(mainCv, 300, n, K, { candles: true, series: lines, draws: draws.concat(trades), bg: "#ffffff" });
    } else if (method === "main_axis") {
      window.MaiChart.renderPane(mainCv, 300, n, K, { candles: true, overlaySeries: lines, overlayDraws: draws, draws: trades, bg: "#ffffff" });
    } else {
      window.MaiChart.renderPane(mainCv, 240, n, K, { candles: true, draws: trades, bg: "#ffffff" });
      window.MaiChart.renderPane(box.querySelector(".pv-sub"), 150, n, K, { zero: true, series: lines, draws, bg: "#f6f8fb" });
    }
    window.MaiChart.renderTimeAxis(box.querySelector(".pv-axis"), n, bars, { padR: 56 });
  }

  // ---------- 操作日志 ----------

  function openLogs() {
    const m = $("logs-mask");
    m.hidden = false;
    requestAnimationFrame(() => m.classList.add("show"));
    renderLogs();
  }

  function closeLogs() {
    const m = $("logs-mask");
    m.classList.remove("show");
    m.hidden = true;
  }

  function renderLogs() {
    const kw = $("log-keyword").value.trim().toLowerCase();
    const act = $("log-action").value;
    const rows = R.logs().filter((l) => {
      if (act && l.action !== act) return false;
      if (kw && !`${l.code} ${l.name} ${l.detail}`.toLowerCase().includes(kw)) return false;
      return true;
    });
    const st = ui.logs;
    renderPager($("log-pager"), rows.length, st, renderLogs);
    const pageRows = rows.slice((st.page - 1) * st.size, st.page * st.size);
    $("log-tbody").innerHTML = pageRows.length
      ? pageRows
          .map(
            (l) => `<tr>
        <td class="col-time">${R.fmtTime(l.ts)}</td>
        <td class="mono">${esc(l.code)}</td>
        <td>${l.indId && R.get(l.indId) ? `<button type="button" class="link-btn" data-view="${l.indId}">${esc(l.name)}</button>` : esc(l.name)}</td>
        <td><span class="log-act" data-act="${l.action}">${esc(R.LOG_ACTIONS[l.action] || l.action)}</span></td>
        <td>${esc(l.user)}</td>
        <td class="log-detail">${esc(l.detail)}</td>
      </tr>`
          )
          .join("")
      : `<tr><td colspan="6" class="admin-empty">暂无操作日志</td></tr>`;
  }

  $("log-tbody").addEventListener("click", (e) => {
    const b = e.target.closest("[data-view]");
    if (!b) return;
    closeLogs();
    openDrawer("view", b.dataset.view);
  });

  // ---------- 页面 ----------

  function refresh() {
    renderList();
    if (!$("logs-mask").hidden) renderLogs();
    if (ui.drawer) renderDrawer();
  }

  function init() {
    R.load();
    fillSelect($("f-type"), "全部类型", Object.entries(R.TYPES));
    fillSelect($("f-status"), "全部状态", Object.entries(R.STATUS));
    fillSelect($("f-app"), "全部应用", R.APPS.map((a) => [a.key, a.label]));
    fillSelect($("f-pricing"), "免费 / 付费", Object.entries(R.PRICING));
    fillSelect($("log-action"), "全部操作", Object.entries(R.LOG_ACTIONS));

    ["f-keyword", "f-type", "f-status", "f-app", "f-pricing"].forEach((id) =>
      $(id).addEventListener(id === "f-keyword" ? "input" : "change", () => {
        ui.list.page = 1;
        renderList();
      })
    );
    $("f-reset").addEventListener("click", () => {
      ["f-keyword", "f-type", "f-status", "f-app", "f-pricing"].forEach((id) => ($(id).value = ""));
      ui.list.page = 1;
      renderList();
    });
    ["log-keyword", "log-action"].forEach((id) =>
      $(id).addEventListener(id === "log-keyword" ? "input" : "change", () => {
        ui.logs.page = 1;
        renderLogs();
      })
    );
    document.querySelectorAll("#ind-table th[data-sort]").forEach((th) =>
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        ui.sort = { key, dir: ui.sort.key === key && ui.sort.dir === "desc" ? "asc" : "desc" };
        ui.list.page = 1;
        renderList();
      })
    );
    $("btn-logs").addEventListener("click", openLogs);
    $("logs-close").addEventListener("click", closeLogs);
    $("logs-mask").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeLogs();
    });
    window.addEventListener("storage", (e) => {
      if (e.key !== R.STORAGE_KEY) return;
      R.reload();
      refresh();
    });

    renderList();
    const qid = new URLSearchParams(location.search).get("indicator");
    if (qid && R.get(qid)) openDrawer("view", qid);
  }

  init();
})();
