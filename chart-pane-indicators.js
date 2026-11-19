/**
 * K 线主图 / 副图 · 内置指标（搜索列表选择，与公式编辑区隔离）
 */
(function (global) {
  /** @type {'main'|'sub'|null} */
  let paramsPane = null;
  /** @type {'main'|'sub'|null} */
  let pickerPane = null;

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function builtinsForPane(pane) {
    if (typeof SysInd === "undefined") return [];
    return (SysInd.SYSTEM_LIB || []).filter((ind) => ind.draw === pane);
  }

  function defaultParams(ind) {
    const out = {};
    (ind?.params || []).forEach((p) => {
      out[p.n] = p.def;
      out[p.n.toUpperCase()] = p.def;
    });
    return out;
  }

  function ensureMountState() {
    if (typeof state === "undefined") return;
    if (!state.chartMount) state.chartMount = { main: null, sub: null };
  }

  function formulaDisplayName() {
    if (typeof getChartFormulaDisplayName === "function") return getChartFormulaDisplayName();
    return "自编公式";
  }

  function mountSummaryLabel(pane) {
    ensureMountState();
    const m = state.chartMount[pane];
    if (!m) return "—";
    if (m.kind === "builtin") {
      const ind = typeof SysInd !== "undefined" ? SysInd.getByName(m.name) : null;
      return ind ? `${ind.name} · ${ind.desc || ind.name}` : m.name;
    }
    if (m.kind === "formula") return formulaDisplayName();
    return "—";
  }

  function syncParamsButtons() {
    ensureMountState();
    ["main", "sub"].forEach((pane) => {
      const btn = $(`btn-chart-mount-${pane}-params`);
      const m = state.chartMount[pane];
      const show = m?.kind === "builtin";
      if (btn) btn.hidden = !show;
    });
  }

  function syncChartMountUI() {
    ensureMountState();
    syncParamsButtons();
  }

  function setBuiltinMount(pane, name) {
    ensureMountState();
    if (typeof SysInd === "undefined") return;
    const ind = SysInd.getByName(name);
    if (!ind) return;
    state.chartMount[pane] = { kind: "builtin", name: ind.name, params: defaultParams(ind) };
    if (pane === state.chartFormulaPane) {
      state.chartFormulaPane = null;
      state.chartFormulaPlot = null;
    }
    if (typeof rebuildEffectiveChartPlot === "function") rebuildEffectiveChartPlot();
    if (typeof drawCandleChart === "function") drawCandleChart();
    syncChartMountUI();
    if (typeof saveDraft === "function") saveDraft();
  }

  function clearPaneMount(pane) {
    ensureMountState();
    state.chartMount[pane] = null;
    if (pane === state.chartFormulaPane) {
      state.chartFormulaPane = null;
      state.chartFormulaPlot = null;
    }
    if (typeof rebuildEffectiveChartPlot === "function") rebuildEffectiveChartPlot();
    if (typeof drawCandleChart === "function") drawCandleChart();
    syncChartMountUI();
    if (typeof saveDraft === "function") saveDraft();
  }

  function closePicker() {
    pickerPane = null;
    const mask = $("chart-ind-picker-mask");
    if (mask) mask.hidden = true;
    const q = $("chart-ind-picker-search");
    if (q) q.value = "";
  }

  function renderPickerList() {
    const list = $("chart-ind-picker-list");
    if (!list || !pickerPane) return;
    const q = ($("chart-ind-picker-search")?.value || "").trim().toLowerCase();
    const rows = builtinsForPane(pickerPane);
    const m = state.chartMount?.[pickerPane];
    let html = "";

    if (m?.kind === "formula") {
      html += `<div class="chart-ind-picker-formula-hint">
        <span class="chart-ind-picker-formula-badge">公式</span>
        <span>当前为 <b>${esc(formulaDisplayName())}</b>（由公式工作区提交绘图）</span>
      </div>`;
    }

    const noneActive = !m;
    html += `<button type="button" class="chart-ind-picker-row ${noneActive ? "active" : ""}" data-pick="none" role="option" aria-selected="${noneActive}">
      <b>无指标</b><span class="muted">不叠加内置指标</span>
    </button>`;

    const filtered = rows.filter((ind) => {
      if (!q) return true;
      const blob = `${ind.name} ${ind.desc} ${ind.note}`.toLowerCase();
      return blob.includes(q);
    });

    if (!filtered.length) {
      html += `<p class="muted chart-ind-picker-empty">无匹配的${pickerPane === "main" ? "主图" : "副图"}指标</p>`;
    } else {
      html += filtered
        .map((ind) => {
          const active = m?.kind === "builtin" && m.name === ind.name;
          return `<button type="button" class="chart-ind-picker-row ${active ? "active" : ""}" data-pick="builtin:${esc(ind.name)}" role="option" aria-selected="${active}">
            <b>${esc(ind.name)}</b><span class="muted">${esc(ind.desc || ind.note || "")}</span>
          </button>`;
        })
        .join("");
    }

    list.innerHTML = html;
    list.querySelectorAll(".chart-ind-picker-row").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pick = btn.getAttribute("data-pick");
        if (!pickerPane) return;
        if (pick === "none") clearPaneMount(pickerPane);
        else if (pick?.startsWith("builtin:")) setBuiltinMount(pickerPane, pick.slice(8));
        closePicker();
        if (typeof toast === "function" && pick !== "none") toast("已切换图表指标", "success");
      });
    });
  }

  function openPicker(pane) {
    if (!state?.dataLoaded) {
      if (typeof toast === "function") toast("请先读取行情", "warn");
      return;
    }
    pickerPane = pane;
    const title = $("chart-ind-picker-title");
    const meta = $("chart-ind-picker-meta");
    if (title) title.textContent = pane === "main" ? "选择主图指标" : "选择副图指标";
    if (meta) {
      meta.textContent =
        pane === "main"
          ? "主图叠加类指标；支持搜索。自编公式请在工作区提交绘图。"
          : "副图类指标；支持搜索。自编公式请在工作区提交绘图。";
    }
    const q = $("chart-ind-picker-search");
    if (q) q.value = "";
    renderPickerList();
    const mask = $("chart-ind-picker-mask");
    if (mask) mask.hidden = false;
    setTimeout(() => q?.focus(), 40);
  }

  function readChartParamsForm() {
    const out = {};
    document.querySelectorAll("#chart-ind-param-fields [data-chart-ind-param]").forEach((inp) => {
      const key = inp.getAttribute("data-chart-ind-param");
      if (!key) return;
      const v = parseFloat(/** @type {HTMLInputElement} */ (inp).value);
      out[key] = v;
      out[key.toUpperCase()] = v;
    });
    return out;
  }

  function renderChartParamsForm(pane) {
    ensureMountState();
    const box = $("chart-ind-param-fields");
    const title = $("chart-ind-params-title");
    const m = state.chartMount[pane];
    if (!box || !m || m.kind !== "builtin") return;
    const ind = SysInd.getByName(m.name);
    if (!ind) return;
    if (title) title.textContent = `${ind.name} · ${ind.desc || "参数"}`;
    box.innerHTML = (ind.params || [])
      .map((p) => {
        const val = m.params[p.n] ?? m.params[p.n.toUpperCase()] ?? p.def;
        return `<label class="ind-param-row">
          <span class="ind-param-key">${esc(p.n)}</span>
          <input type="number" class="ind-param-input" data-chart-ind-param="${esc(p.n)}" min="${p.min}" max="${p.max}" step="${p.step || 1}" value="${val}" />
        </label>`;
      })
      .join("");
  }

  function openParamsDialog(pane) {
    ensureMountState();
    const m = state.chartMount[pane];
    if (!m || m.kind !== "builtin") return;
    paramsPane = pane;
    renderChartParamsForm(pane);
    const mask = $("chart-ind-params-mask");
    if (mask) mask.hidden = false;
  }

  function closeParamsDialog() {
    paramsPane = null;
    const mask = $("chart-ind-params-mask");
    if (mask) mask.hidden = true;
  }

  function confirmParamsDialog() {
    if (!paramsPane) return;
    ensureMountState();
    const m = state.chartMount[paramsPane];
    if (!m || m.kind !== "builtin") return;
    m.params = { ...m.params, ...readChartParamsForm() };
    closeParamsDialog();
    if (typeof rebuildEffectiveChartPlot === "function") rebuildEffectiveChartPlot();
    if (typeof drawCandleChart === "function") drawCandleChart();
    if (typeof toast === "function") toast("已更新图表指标参数", "success");
    if (typeof saveDraft === "function") saveDraft();
  }

  function applyFormulaToChartMount(plot) {
    ensureMountState();
    if (!plot) return;
    const pane = typeof getPlotDrawMethod === "function" && getPlotDrawMethod() === "sub" ? "sub" : "main";
    state.chartFormulaPlot = plot;
    state.chartFormulaPane = pane;
    state.chartMount[pane] = { kind: "formula" };
    if (typeof rebuildEffectiveChartPlot === "function") rebuildEffectiveChartPlot();
    syncChartMountUI();
  }

  function resetChartMounts() {
    ensureMountState();
    state.chartMount = { main: null, sub: null };
    state.chartFormulaPlot = null;
    state.chartFormulaPane = null;
    syncChartMountUI();
  }

  function bind() {
    if (bind._done) return;
    bind._done = true;
    $("btn-chart-ind-picker-main")?.addEventListener("click", () => openPicker("main"));
    $("btn-chart-ind-picker-sub")?.addEventListener("click", () => openPicker("sub"));
    $("btn-chart-mount-main-params")?.addEventListener("click", () => openParamsDialog("main"));
    $("btn-chart-mount-sub-params")?.addEventListener("click", () => openParamsDialog("sub"));
    $("chart-ind-picker-close")?.addEventListener("click", closePicker);
    $("chart-ind-picker-search")?.addEventListener("input", renderPickerList);
    $("chart-ind-picker-mask")?.addEventListener("click", (e) => {
      if (e.target?.id === "chart-ind-picker-mask") closePicker();
    });
    $("chart-ind-params-close")?.addEventListener("click", closeParamsDialog);
    $("chart-ind-params-ok")?.addEventListener("click", confirmParamsDialog);
    $("chart-ind-params-mask")?.addEventListener("click", (e) => {
      if (e.target?.id === "chart-ind-params-mask") closeParamsDialog();
    });
  }

  function init() {
    ensureMountState();
    bind();
    syncChartMountUI();
  }

  global.ChartPaneInd = {
    init,
    syncChartMountUI,
    applyFormulaToChartMount,
    resetChartMounts,
    formulaDisplayName,
  };
})(typeof window !== "undefined" ? window : globalThis);
