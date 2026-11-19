/**
 * 工作台 · 指标登记与提交发布
 * 依赖 app.js 全局：state, $, toast, getFormulaSource, isCustomFormulaMode, runFormulaValidation,
 * collectParamMeta, getParamModel, validateParamModel, getResearchCapability, markWorkspaceBaseline 等。
 */
(function () {
  const R = window.IndicatorRegistry;
  if (!R) return;
  const STORAGE_LINK = "qlab_workbench_indicator_link_v1";
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const el = (id) => document.getElementById(id);

  /** 当前工作区关联的指标 */
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
    renderChip();
  }

  function linkedIndicator() {
    return link ? R.get(link.indicatorId) : null;
  }

  // ---------- 顶栏身份 ----------

  function renderIdentity() {
    const sel = /** @type {HTMLSelectElement} */ (el("identity-select"));
    if (!sel) return;
    const me = R.currentUser();
    sel.innerHTML = R.USERS.map((u) => `<option value="${u.id}"${u.id === me.id ? " selected" : ""}>${esc(u.name)} · ${esc(R.ROLES[u.role].label)}</option>`).join("");
  }

  // ---------- 文件栏指标标识 ----------

  function renderChip() {
    const chip = el("filebar-indicator-chip");
    if (!chip) return;
    const ind = linkedIndicator();
    if (!ind) {
      chip.dataset.tone = "none";
      chip.textContent = "未登记为指标";
      chip.title = "提交发布后生成指标编码，进入审核与上架流程";
      return;
    }
    const latest = R.latestVersion(ind);
    const st = latest ? R.VERSION_STATUS[latest.status] : null;
    const live = R.liveChannels(ind).length;
    chip.dataset.tone = st ? st.tone : "neutral";
    chip.textContent = `${ind.code} · v${latest?.no ?? "-"} ${st ? st.label : ""}${live ? ` · ${live} 渠道在架` : ""}`;
    chip.title = "在「指标管理」中查看版本、审核与上架情况";
  }

  // ---------- 从后台「在工作台编辑」进入 ----------

  function loadFromQuery() {
    const qs = new URLSearchParams(location.search);
    const id = qs.get("indicator");
    if (!id) return false;
    const ind = R.get(id);
    if (!ind) {
      toast("指标不存在或已删除", "warn");
      return false;
    }
    const no = Number(qs.get("v")) || R.latestVersion(ind)?.no;
    const ver = ind.versions.find((v) => v.no === no) || R.latestVersion(ind);
    if (!ver) return false;
    $("select-formula-kind").value = "custom";
    $("select-formula-template").value = "empty";
    applyFormulaTemplate();
    restoreParamMeta(ver.paramMeta);
    const ta = /** @type {HTMLTextAreaElement} */ ($("textarea-formula"));
    ta.value = ver.source;
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    markWorkspaceBaseline(ver.source);
    state.workspace.name = ind.name;
    state.workspace.libraryId = null;
    if (typeof renderParameterTable === "function") renderParameterTable();
    if (typeof saveDraft === "function") saveDraft();
    if (typeof FormulaEditorUI !== "undefined") FormulaEditorUI.updateFilebarPath();
    writeLink({ indicatorId: ind.id, baseVersion: ver.no });
    history.replaceState(null, "", location.pathname);
    toast(`已载入 ${ind.name} v${ver.no}，修改后「提交发布」将生成新版本`, "success");
    return true;
  }

  /** 新建公式 / 从「我的公式」载入其它公式后，解除与原指标的关联 */
  function bindUnlinkTriggers() {
    let before = "";
    const capture = () => (before = getFormulaSource());
    const check = () =>
      setTimeout(() => {
        if (link && getFormulaSource() !== before) writeLink(null);
      }, 0);
    ["btn-new-formula", "ind-dialog-ok"].forEach((id) => {
      el(id)?.addEventListener("click", capture, true);
      el(id)?.addEventListener("click", check);
    });
    el("select-formula-kind")?.addEventListener("change", () => isCustomFormulaMode() || writeLink(null));
  }

  // ---------- 发布弹窗 ----------

  let draft = null;

  function collectChecks(ind, outputs) {
    const me = R.currentUser();
    const checks = [];
    const add = (level, text) => checks.push({ level, text });
    const perm = ind ? R.can(me, "edit", ind) : R.can(me, "create");
    if (!perm.ok) add("block", `当前身份无权保存：${perm.reason}`);
    const pend = ind ? R.pendingVersion(ind) : null;
    if (pend && ["reviewing", "integrating", "ready"].includes(pend.status)) {
      add("block", `v${pend.no} 正在「${R.VERSION_STATUS[pend.status].label}」，同一指标同时只允许一个在途版本`);
    } else if (pend) {
      add("warn", `将覆盖 v${pend.no}（${R.VERSION_STATUS[pend.status].label}），不新增版本号`);
    }
    const v = runFormulaValidation({ silent: true });
    if (v.ok) add("ok", "语法校验通过");
    else add("block", "语法校验未通过，请先在「语法检测」中修正");
    const errs = validateParamModel(getParamModel());
    if (errs.length) add("block", `参数范围有误：${errs[0]}`);
    else add("ok", "参数默认值与 C 端可调范围合法");
    if (!outputs.length) add("block", "未识别到输出字段（通达信 `名称:表达式;`），无可下发结果");
    else add("ok", `识别到 ${outputs.length} 个输出字段`);
    if (isFormulaMountedOnChart() && !state.chartPlotStale) add("ok", "已在 K 线上提交绘图核对");
    else add("warn", "当前公式尚未提交绘图核对，建议先在图表上确认曲线与信号");
    const cap = getResearchCapability();
    if (cap.researchable) {
      if (state.backtest && state.backtest.key === backtestInputKey()) add("ok", "已用当前参数完成回测，结果将作为审核附件");
      else add("warn", "含 BUY / SELL 交易信号的策略建议先回测，审核员会参考回测结果");
    }
    return checks;
  }

  function evidence() {
    const bt = state.backtest;
    if (!bt || bt.key !== backtestInputKey()) return null;
    const m = bt.seg.metrics;
    return { sharpe: m.sharpe, ann: m.ann, mdd: m.mdd, trades: m.trades, period: bt.period, symbol: getMarketSymbolCode?.() };
  }

  function mergeOutputs(parsed, prev) {
    const pm = new Map((prev || []).map((o) => [o.key, o]));
    const drawSub = (typeof getPlotDrawMethod === "function" ? getPlotDrawMethod() : "main") === "sub";
    return parsed.map((o) => {
      const p = pm.get(o.key);
      return p ? { ...o, label: p.label, precision: p.precision, publish: p.publish, pane: p.pane } : { ...o, pane: drawSub && o.kind !== "signal" ? "sub" : o.pane };
    });
  }

  function openPublish() {
    if (!isCustomFormulaMode()) {
      toast("内置指标由系统提供，无需发布；请新建或载入自定义公式", "warn");
      return;
    }
    R.reload();
    const ind = linkedIndicator();
    const prod = ind ? R.prodVersionOf(ind) : null;
    const base = ind ? R.latestVersion(ind) : null;
    const source = getFormulaSource();
    const outputs = mergeOutputs(R.parseOutputs(source), base?.outputs);
    const paramMeta = collectParamMeta();
    const checks = collectChecks(ind, outputs);
    draft = { ind, prod, base, source, outputs, paramMeta, checks };

    const me = R.currentUser();
    const nextNo = ind ? (R.pendingVersion(ind)?.no ?? ind.versions.reduce((mx, x) => Math.max(mx, x.no), 0) + 1) : 1;
    el("publish-title").textContent = ind ? `提交发布 · ${ind.name}` : "提交发布 · 登记为新指标";
    el("publish-meta").textContent = ind
      ? `${ind.code} · 将保存为 v${nextNo}${prod ? `（当前生产版本 v${prod.no}）` : ""} · 提交人 ${me.name}`
      : `保存后生成唯一指标编码，C 端与云端计算按编码 + 版本号识别 · 提交人 ${me.name}`;

    el("publish-checks").innerHTML = checks
      .map((c) => `<li data-level="${c.level}"><i aria-hidden="true">${c.level === "ok" ? "✓" : c.level === "warn" ? "!" : "✕"}</i>${esc(c.text)}</li>`)
      .join("");

    // 指标信息
    el("pub-name").value = ind?.name || state.workspace?.name?.replace(/^未命名公式$/, "") || "";
    el("pub-code").value = ind?.code || "保存后自动生成";
    el("pub-category").innerHTML = R.CATEGORIES.map((c) => `<option${(ind?.category || (getResearchCapability().researchable ? "择时策略" : "趋势")) === c ? " selected" : ""}>${c}</option>`).join("");
    el("pub-display").value = ind?.displayName || "";
    el("pub-summary").value = ind?.summary || "";
    el("pub-visibility").innerHTML = Object.entries(R.VISIBILITY).map(([k, v]) => `<option value="${k}"${(ind?.visibility || "team") === k ? " selected" : ""}>${v}</option>`).join("");
    el("pub-visibility").disabled = !!ind;

    renderOutputs();
    renderParams();
    renderDiff();

    // 计算配置
    const calc = base?.calc || { periods: [state.chartPeriod === "day" ? "day" : "day"], universe: "a_etf_index", trigger: "eod", lookback: 500 };
    el("pub-periods").innerHTML = R.PERIODS.map(
      (p) => `<label class="pub-check"><input type="checkbox" value="${p.key}"${calc.periods.includes(p.key) ? " checked" : ""} />${p.label}</label>`
    ).join("");
    el("pub-universe").innerHTML = Object.entries(R.UNIVERSES).map(([k, v]) => `<option value="${k}"${calc.universe === k ? " selected" : ""}>${v}</option>`).join("");
    el("pub-trigger").innerHTML = Object.entries(R.TRIGGERS)
      .map(([k, v]) => `<label class="pub-radio"><input type="radio" name="pub-trigger" value="${k}"${calc.trigger === k ? " checked" : ""} />${v}</label>`)
      .join("");
    el("pub-lookback").value = calc.lookback || 500;
    el("pub-note").value = "";

    el("publish-form").hidden = false;
    el("publish-done").hidden = true;
    el("publish-foot-form").hidden = false;
    el("publish-foot-done").hidden = true;
    syncButtons();
    const mask = el("publish-mask");
    mask.hidden = false;
    mask.classList.add("show");
    setTimeout(() => el("pub-name").focus(), 30);
  }

  function renderOutputs() {
    el("pub-outputs").innerHTML = draft.outputs.length
      ? draft.outputs
          .map(
            (o, i) => `<tr>
        <td><input type="checkbox" data-o="${i}" data-f="publish"${o.publish ? " checked" : ""} aria-label="下发 ${esc(o.key)}" /></td>
        <td class="mono">${esc(o.key)}</td>
        <td><input type="text" data-o="${i}" data-f="label" value="${esc(o.label)}" maxlength="16" /></td>
        <td>${o.kind === "signal" ? '<span class="tag pub-tag-signal">信号</span>' : '<span class="tag neutral">数值</span>'}</td>
        <td><select data-o="${i}" data-f="pane"><option value="main"${o.pane === "main" ? " selected" : ""}>主图</option><option value="sub"${o.pane === "sub" ? " selected" : ""}>副图</option></select></td>
        <td><select data-o="${i}" data-f="precision">${[0, 1, 2, 3, 4].map((p) => `<option value="${p}"${o.precision === p ? " selected" : ""}>${p} 位</option>`).join("")}</select></td>
      </tr>`
          )
          .join("")
      : `<tr><td colspan="6" class="muted">未识别到输出字段</td></tr>`;
  }

  function renderParams() {
    const rows = Object.entries(draft.paramMeta);
    el("pub-params").innerHTML = rows.length
      ? rows
          .map(
            ([k, m]) => `<tr><td class="mono">${esc(k)}</td><td>${m.type === "FLOAT" ? "浮点" : "整数"}</td><td>${m.def}</td><td>${m.min} ~ ${m.max}</td><td>${m.step}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="5" class="muted">无可调参数，C 端仅展示固定结果</td></tr>`;
  }

  function renderDiff() {
    const box = el("pub-diff");
    const ref = draft.prod || draft.base;
    if (!ref) {
      box.hidden = true;
      return;
    }
    const od = R.diffOutputs(ref.outputs, draft.outputs);
    const pd = R.diffParams(ref.paramMeta, draft.paramMeta);
    const srcSame = R.hash(draft.source) === ref.hash;
    const parts = [];
    if (srcSame) parts.push("源码与对比版本一致");
    if (od.added.length) parts.push(`新增字段 ${od.added.join("、")}`);
    if (od.removed.length) parts.push(`删除字段 ${od.removed.join("、")}`);
    if (od.changed.length) parts.push(`字段类型/窗格变化 ${od.changed.join("、")}`);
    if (pd.added.length || pd.removed.length || pd.changed.length)
      parts.push(`参数变化：${[...pd.added.map((x) => "+" + x), ...pd.removed.map((x) => "-" + x), ...pd.changed.map((x) => "~" + x)].join(" ")}`);
    if (!parts.length) parts.push("仅公式逻辑变化，输出字段与参数不变");
    box.hidden = false;
    box.className = `notice ${od.breaking ? "warning" : "info"} pub-diff`;
    box.innerHTML = `<strong>与 v${ref.no}${draft.prod ? "（生产）" : ""}对比：</strong>${esc(parts.join("；"))}${
      od.breaking ? "<br />含<b>破坏性变更</b>：已上架渠道的 C 端可能依赖被删除/变更的字段，审核与研发接入时需评估兼容方案。" : ""
    }`;
  }

  function onOutputsInput(e) {
    const t = /** @type {HTMLInputElement} */ (e.target);
    const i = Number(t.dataset.o);
    if (!Number.isInteger(i) || !draft) return;
    const f = t.dataset.f;
    const o = draft.outputs[i];
    if (f === "publish") o.publish = t.checked;
    else if (f === "precision") o.precision = Number(t.value);
    else if (f === "label") o.label = t.value.trim() || o.key;
    else if (f === "pane") o.pane = t.value;
    renderDiff();
    syncButtons();
  }

  function formMeta() {
    return {
      name: el("pub-name").value.trim(),
      displayName: el("pub-display").value.trim(),
      category: el("pub-category").value,
      summary: el("pub-summary").value.trim(),
      visibility: el("pub-visibility").value,
    };
  }

  function formCalc() {
    return {
      periods: [...el("pub-periods").querySelectorAll("input:checked")].map((x) => x.value),
      universe: el("pub-universe").value,
      trigger: el("pub-trigger").querySelector("input:checked")?.value || "eod",
      lookback: Math.max(60, Math.min(5000, Number(el("pub-lookback").value) || 500)),
    };
  }

  function formErrors() {
    const errs = [];
    if (draft.checks.some((c) => c.level === "block")) errs.push("发布前检查未通过");
    const m = formMeta();
    if (!m.name) errs.push("请填写指标名称");
    if (!draft.outputs.some((o) => o.publish)) errs.push("至少勾选 1 个下发字段");
    if (!formCalc().periods.length) errs.push("至少选择 1 个适用周期");
    if (!el("pub-note").value.trim()) errs.push("请填写版本说明");
    return errs;
  }

  function syncButtons() {
    if (!draft) return;
    const errs = formErrors();
    el("publish-foot-hint").textContent = errs[0] || "提交后进入审核，审核通过由研发接入云端计算";
    el("publish-foot-hint").dataset.level = errs.length ? "warn" : "ok";
    el("btn-publish-save").disabled = !!errs.length;
    el("btn-publish-submit").disabled = !!errs.length;
  }

  function doSave(submit) {
    const errs = formErrors();
    if (errs.length) {
      toast(errs[0], "warn");
      return;
    }
    const me = R.currentUser();
    const res = R.saveVersion(
      {
        indicatorId: draft.ind?.id,
        meta: formMeta(),
        source: draft.source,
        dialect: "tdx",
        paramMeta: draft.paramMeta,
        outputs: draft.outputs,
        calc: formCalc(),
        note: el("pub-note").value.trim(),
        evidence: evidence(),
      },
      me,
      { submit }
    );
    if (!res.ok) {
      toast(res.reason, "warn");
      return;
    }
    writeLink({ indicatorId: res.indicator.id, baseVersion: res.version.no });
    state.workspace.name = res.indicator.name;
    if (typeof FormulaEditorUI !== "undefined") FormulaEditorUI.saveWorkspace();
    showDone(res.indicator, res.version, submit);
  }

  function showDone(ind, ver, submitted) {
    const steps = [
      { k: "save", t: "保存版本", d: `v${ver.no}` },
      { k: "review", t: "审核", d: "审核员校验逻辑与合规" },
      { k: "integrate", t: "研发接入", d: "语义转换 · 云端计算 · 历史回算" },
      { k: "prod", t: "设为生产版本", d: "发布运营确认" },
      { k: "channel", t: "渠道上架", d: "按渠道全量 / 灰度" },
    ];
    const cur = submitted ? 1 : 0;
    el("publish-done-title").textContent = submitted ? "已提交审核" : "已保存为草稿版本";
    el("publish-done-desc").innerHTML = `${esc(ind.name)} · <span class="mono">${esc(ind.code)}</span> · v${ver.no}${
      submitted ? "，审核结果会同步到「指标管理」" : "，可随时在「指标管理」中提交审核"
    }`;
    el("publish-done-steps").innerHTML = steps
      .map((s, i) => `<li data-state="${i < cur ? "done" : i === cur ? "current" : "todo"}"><b>${s.t}</b><span>${s.d}</span></li>`)
      .join("");
    el("btn-publish-goto").dataset.id = ind.id;
    el("publish-form").hidden = true;
    el("publish-done").hidden = false;
    el("publish-foot-form").hidden = true;
    el("publish-foot-done").hidden = false;
  }

  function closePublish() {
    const mask = el("publish-mask");
    mask.hidden = true;
    mask.classList.remove("show");
    draft = null;
    renderChip();
  }

  function gotoAdmin(id) {
    location.href = `./admin.html${id ? `?indicator=${encodeURIComponent(id)}` : ""}`;
  }

  function bind() {
    el("btn-publish")?.addEventListener("click", openPublish);
    el("publish-cancel")?.addEventListener("click", closePublish);
    el("btn-publish-close")?.addEventListener("click", closePublish);
    el("btn-publish-save")?.addEventListener("click", () => doSave(false));
    el("btn-publish-submit")?.addEventListener("click", () => doSave(true));
    el("btn-publish-goto")?.addEventListener("click", (e) => gotoAdmin(/** @type {HTMLElement} */ (e.currentTarget).dataset.id));
    el("pub-outputs")?.addEventListener("input", onOutputsInput);
    el("pub-outputs")?.addEventListener("change", onOutputsInput);
    el("publish-form")?.addEventListener("input", syncButtons);
    el("publish-form")?.addEventListener("change", syncButtons);
    el("filebar-indicator-chip")?.addEventListener("click", () => {
      const ind = linkedIndicator();
      if (ind) gotoAdmin(ind.id);
      else openPublish();
    });
    el("identity-select")?.addEventListener("change", (e) => {
      R.setCurrentUser(/** @type {HTMLSelectElement} */ (e.target).value);
      const me = R.currentUser();
      toast(`已切换为 ${me.name}（${R.ROLES[me.role].label}）`, "success");
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !el("publish-mask").hidden) closePublish();
    });
    window.addEventListener("storage", (e) => {
      if (e.key && e.key.startsWith("qlab_indicator_registry")) {
        R.reload();
        renderChip();
      }
    });
  }

  readLink();
  bind();
  renderIdentity();
  bindUnlinkTriggers();
  loadFromQuery();
  renderChip();
})();
