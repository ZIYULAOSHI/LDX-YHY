/**
 * 工作台 · 保存即发布到指标库
 * 「保存」：已关联指标 → 更新该指标；未关联 → 新建指标（默认下架）。「另存为」：始终新建指标。
 * 两者都先弹出指标信息弹窗。「编辑公式」带入指标后未做任何修改时「保存」置灰。
 * 依赖 app.js 全局：state, $, toast, getFormulaSource, isCustomFormulaMode, runFormulaValidation,
 * collectParamMeta, getParamModel, validateParamModel, getResearchCapability, getPlotDrawMethod,
 * restoreParamMeta, renderParameterTable, applyFormulaTemplate, markWorkspaceBaseline, saveDraft 等。
 */
(function () {
  const R = window.IndicatorRegistry;
  const F = window.IndicatorForm;
  if (!R || !F) return;
  const STORAGE_LINK = "qlab_workbench_indicator_link_v2";
  const el = (id) => document.getElementById(id);
  const esc = F.esc;

  /** @type {null | {indicatorId:string, baseline:string}} */
  let link = null;

  function readLink() {
    try {
      link = JSON.parse(localStorage.getItem(STORAGE_LINK) || "null");
    } catch {
      link = null;
    }
    if (link && !R.get(link.indicatorId)) link = null;
  }

  function writeLink(next) {
    link = next;
    try {
      if (next) localStorage.setItem(STORAGE_LINK, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_LINK);
    } catch {
      /* ignore */
    }
    syncSaveButtons();
  }

  const linkedIndicator = () => (link ? R.get(link.indicatorId) : null);

  /** 工作区可保存内容的签名：源码 + 画线方法 + 参数（默认值与范围） */
  function signature() {
    const pm = typeof collectParamMeta === "function" ? collectParamMeta() : {};
    const params = Object.keys(pm)
      .sort()
      .map((k) => [k.toUpperCase(), pm[k].value, pm[k].min, pm[k].max, pm[k].step]);
    return JSON.stringify([getFormulaSource(), getPlotDrawMethod(), params]);
  }

  // ---------- 保存按钮可用性 ----------

  function syncSaveButtons() {
    const save = /** @type {HTMLButtonElement} */ (el("btn-save-workspace"));
    const saveAs = /** @type {HTMLButtonElement} */ (el("btn-save-as-workspace"));
    if (!save || !saveAs) return;
    const custom = typeof isCustomFormulaMode === "function" && isCustomFormulaMode();
    const hasSrc = custom && getFormulaSource().trim().length > 0;
    const unchanged = !!linkedIndicator() && link.baseline === signature();
    save.disabled = !hasSrc || unchanged;
    save.title = !custom ? "系统指标只读" : !hasSrc ? "公式为空" : unchanged ? "未做任何修改，无需保存" : linkedIndicator() ? "保存并更新当前指标" : "保存为新指标";
    saveAs.disabled = !hasSrc;
    saveAs.title = hasSrc ? "另存为新指标（默认下架）" : "公式为空";
  }

  let syncTimer = 0;
  const scheduleSync = () => {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncSaveButtons, 30);
  };

  // ---------- 指标 → 编辑器 ----------

  function loadIndicator(id) {
    const ind = R.get(id);
    if (!ind) {
      toast("指标不存在或已删除", "warn");
      return false;
    }
    $("select-formula-kind").value = "custom";
    $("select-formula-template").value = "empty";
    state.indicatorBindings = null;
    applyFormulaTemplate();
    const ta = /** @type {HTMLTextAreaElement} */ ($("textarea-formula"));
    ta.value = ind.source;
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    const drawSel = /** @type {HTMLSelectElement} */ ($("select-plot-draw-method"));
    if (drawSel && drawSel.value !== ind.drawMethod) {
      drawSel.value = ind.drawMethod;
      drawSel.dispatchEvent(new Event("change", { bubbles: true }));
    }
    applyParamsToWorkbench(ind.params);
    markWorkspaceBaseline(ind.source);
    state.workspace.name = ind.name;
    state.workspace.libraryId = null;
    if (typeof invalidateChartSubmission === "function") invalidateChartSubmission();
    if (typeof saveDraft === "function") saveDraft();
    if (typeof FormulaEditorUI !== "undefined") FormulaEditorUI.updateFilebarPath();
    writeLink({ indicatorId: ind.id, baseline: signature() });
    toast(`已带入「${ind.name}」（${R.STATUS[ind.status]}），修改后可保存`, "success");
    return true;
  }

  /** 指标参数（默认值 / 范围）写回「策略回测 › 公式参数」 */
  function applyParamsToWorkbench(params) {
    if (typeof getParamModel !== "function") return;
    const byUpper = Object.fromEntries(Object.entries(params || {}).map(([k, p]) => [k.toUpperCase(), p]));
    const meta = {};
    syncParamModel().forEach((m) => {
      const p = byUpper[m.key.toUpperCase()];
      if (p) meta[m.key] = { type: m.type, def: m.def, value: p.value, min: p.min, max: p.max, step: p.step, smin: p.min, smax: p.max, sstep: p.step };
    });
    restoreParamMeta(meta);
    if (typeof renderParameterTable === "function") renderParameterTable();
  }

  function loadFromQuery() {
    const qs = new URLSearchParams(location.search);
    const id = qs.get("indicator");
    const isNew = qs.get("new") === "1";
    if (!id && !isNew) return;
    history.replaceState(null, "", location.pathname);
    if (id) loadIndicator(id);
    else el("btn-new-formula")?.click();
  }

  // ---------- 保存弹窗 ----------

  /** @type {null | {mode:'create'|'saveAs'|'update', ind:any}} */
  let ctx = null;

  function openSave(intent) {
    if (!isCustomFormulaMode()) {
      toast("系统指标为只读，请新建或编辑自定义公式后保存", "warn");
      return;
    }
    if (!getFormulaSource().trim()) {
      toast("公式为空，无法保存", "warn");
      return;
    }
    const v = runFormulaValidation({ silent: true });
    if (!v.ok) {
      toast("语法检测未通过，请先修正公式后再保存", "warn");
      return;
    }
    const paramErrs = validateParamModel(getParamModel());
    if (paramErrs.length) {
      toast(`参数设置有误：${paramErrs[0]}`, "warn");
      return;
    }
    R.reload();
    const ind = linkedIndicator();
    if (intent !== "saveAs" && ind && link.baseline === signature()) {
      toast("公式未做任何修改，无需保存；如需生成新指标请用「另存为」", "warn");
      return;
    }
    const mode = intent === "saveAs" ? "saveAs" : ind ? "update" : "create";
    ctx = { mode, ind };

    const params = collectParamMeta();
    const drawMethod = getPlotDrawMethod();
    const defaultType = getResearchCapability().researchable ? "strategy" : "draw";
    const wsName = (state.workspace?.name || "").replace(/^未命名公式$/, "");
    const data =
      mode === "update"
        ? { ...ind, drawMethod, params }
        : {
            code: R.suggestCode(),
            name: ind && mode === "saveAs" ? `${ind.name} 副本`.slice(0, 24) : wsName,
            desc: ind?.desc || "",
            type: ind?.type || defaultType,
            drawMethod,
            periods: ind?.periods || ["day"],
            markets: ind?.markets || ["a", "etf"],
            pricing: ind?.pricing || "free",
            params,
          };

    el("save-title").textContent = mode === "update" ? `保存指标 · ${ind.name}` : mode === "saveAs" ? "另存为新指标" : "保存为新指标";
    el("save-meta").textContent =
      mode === "update"
        ? `${ind.code} · ${R.STATUS[ind.status]}${ind.status === "on" ? ` · 应用：${R.appsLabel(ind.apps)}` : ""} · 最近保存 ${R.fmtTime(ind.updatedAt)}`
        : `保存人 ${R.currentUser().name} · 保存后进入「指标管理」，默认为下架状态`;
    const notice = el("save-notice");
    if (mode === "update" && ind.status === "on") {
      notice.hidden = false;
      notice.className = "save-notice warn";
      notice.textContent = `该指标已在 ${R.appsLabel(ind.apps)} 上架，保存后各端立即使用最新的公式、参数与信息。`;
    } else if (mode === "update") {
      notice.hidden = false;
      notice.className = "save-notice";
      notice.textContent = "该指标当前为下架状态，保存后仍为下架，可在「指标管理」中上架。";
    } else {
      notice.hidden = false;
      notice.className = "save-notice";
      notice.textContent = mode === "saveAs" && ind ? `将基于「${ind.name}」生成一个新指标，原指标不受影响；新指标默认为下架状态。` : "新指标默认为下架状态，在「指标管理」上架并勾选应用后，各端才可见。";
    }
    F.render(el("save-form"), data, { codeEditable: mode !== "update" });
    el("save-foot-hint").textContent = "";
    const mask = el("save-mask");
    mask.hidden = false;
    mask.classList.add("show");
    setTimeout(() => el("save-form").querySelector(mode === "update" ? '[data-f="name"]' : '[data-f="code"]')?.focus(), 30);
  }

  function closeSave() {
    const mask = el("save-mask");
    mask.hidden = true;
    mask.classList.remove("show");
    ctx = null;
  }

  function doSave() {
    if (!ctx) return;
    const form = F.read(el("save-form"));
    const res = R.save(
      {
        ...form,
        id: ctx.mode === "update" ? ctx.ind.id : undefined,
        fromId: ctx.mode === "saveAs" ? ctx.ind?.id : undefined,
        source: getFormulaSource(),
      },
      ctx.mode
    );
    if (!res.ok) {
      el("save-foot-hint").textContent = res.reason;
      toast(res.reason, "warn");
      return;
    }
    const ind = res.indicator;
    const drawSel = /** @type {HTMLSelectElement} */ ($("select-plot-draw-method"));
    if (drawSel && drawSel.value !== ind.drawMethod) {
      drawSel.value = ind.drawMethod;
      drawSel.dispatchEvent(new Event("change", { bubbles: true }));
    }
    applyParamsToWorkbench(ind.params);
    state.workspace.name = ind.name;
    markWorkspaceBaseline(getFormulaSource());
    if (typeof saveDraft === "function") saveDraft();
    if (typeof FormulaEditorUI !== "undefined") FormulaEditorUI.updateFilebarPath();
    writeLink({ indicatorId: ind.id, baseline: signature() });
    closeSave();
    toast(
      res.created
        ? `已保存为指标 ${ind.code}（下架状态），可在「指标管理」上架`
        : `已保存「${ind.name}」${ind.status === "on" ? "，各端已同步更新" : ""}`,
      "success"
    );
  }

  function bind() {
    el("btn-save-workspace")?.addEventListener("click", () => openSave("save"));
    el("btn-save-as-workspace")?.addEventListener("click", () => openSave("saveAs"));
    el("save-cancel")?.addEventListener("click", closeSave);
    el("save-ok")?.addEventListener("click", doSave);
    el("save-form")?.addEventListener("input", () => (el("save-foot-hint").textContent = ""));
    el("btn-new-formula")?.addEventListener("click", () => setTimeout(() => !getFormulaSource().trim() && writeLink(null), 0));
    el("select-formula-kind")?.addEventListener("change", () => isCustomFormulaMode() || writeLink(null));
    document.addEventListener("input", scheduleSync);
    document.addEventListener("change", scheduleSync);
    document.addEventListener("click", scheduleSync);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !el("save-mask").hidden) closeSave();
    });
    window.addEventListener("storage", (e) => {
      if (e.key === R.STORAGE_KEY) {
        R.reload();
        if (link && !R.get(link.indicatorId)) writeLink(null);
      }
    });
  }

  readLink();
  bind();
  loadFromQuery();
  syncSaveButtons();

  window.WorkbenchPublish = { openSave, loadIndicator, syncSaveButtons };
})();
