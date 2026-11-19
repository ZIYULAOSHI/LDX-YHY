/**
 * 公式工作区工具栏 · 新建 / 插入函数 / 引入指标 / 保存
 */
(function (global) {
  let fnCat = "全部";
  let fnSel = 0;
  let indTab = "builtin";
  /** @type {"import"|"pick"} */
  let indDialogPurpose = "import";
  /** @type {null | {type:string,key:string}} */
  let indPick = null;
  let lastIndDetailKey = "";

  function parseCustomOutputs(source) {
    const names = [];
    const reAssign = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:=/gm;
    let m;
    while ((m = reAssign.exec(source || ""))) {
      const n = m[1].toUpperCase();
      if (!names.includes(n)) names.push(n);
    }
    const rePlot = /\bPLOT\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/gi;
    while ((m = rePlot.exec(source || ""))) {
      const n = m[1].toUpperCase();
      if (!names.includes(n)) names.push(n);
    }
    return names.map((name) => ({ name, hint: "公式输出" }));
  }

  function parseCustomParams(source) {
    if (typeof parseParamDefsFromSource !== "function") return [];
    return parseParamDefsFromSource(source).map((d) => {
      const isInt = d.type === "INT";
      return {
        n: d.key.toUpperCase(),
        def: d.value,
        min: isInt ? Math.max(1, Math.floor(d.value * 0.5)) : +(d.value * 0.5).toFixed(2),
        max: isInt ? Math.max(2, Math.ceil(d.value * 2)) : +(d.value * 2).toFixed(2),
        step: isInt ? 1 : 0.1,
      };
    });
  }

  function readIndConfigForm() {
    const params = {};
    document.querySelectorAll("#ind-param-fields [data-ind-param]").forEach((inp) => {
      const key = inp.getAttribute("data-ind-param");
      if (!key) return;
      params[key] = parseFloat(/** @type {HTMLInputElement} */ (inp).value);
    });
    const outputs = [];
    document.querySelectorAll("#ind-output-fields .ind-out-row").forEach((row) => {
      const line = row.getAttribute("data-line") || "";
      const en = /** @type {HTMLInputElement} */ (row.querySelector(".ind-out-en"))?.checked;
      const varInp = /** @type {HTMLInputElement} */ (row.querySelector(".ind-out-var"));
      const v = (varInp?.value || "").trim().toUpperCase() || line;
      outputs.push({ line, var: v, enabled: !!en });
    });
    return { params, outputs };
  }

  function validateIndConfig(outputs) {
    const enabled = outputs.filter((o) => o.enabled);
    if (!enabled.length) return "请至少勾选一条输出指标线";
    const seen = new Set();
    for (const o of enabled) {
      if (!/^[A-Z][A-Z0-9_]*$/.test(o.var)) return `变量「${o.var}」格式不合法（字母数字下划线，建议大写）`;
      if (seen.has(o.var)) return `变量名「${o.var}」重复`;
      seen.add(o.var);
    }
    return "";
  }

  function renderBuiltinIndDetail(ind) {
    const detail = $("ind-detail");
    if (!detail || !ind) return;
    const detailKey = `builtin:${ind.name}:${indDialogPurpose}`;
    const usePrev = detailKey === lastIndDetailKey;
    lastIndDetailKey = detailKey;
    const showOutputs = indDialogPurpose === "import";
    const outs = typeof SysInd !== "undefined" ? SysInd.outputDefs(ind.name) : [];
    const prev = usePrev ? readIndConfigForm() : { params: {}, outputs: [] };
    const prevByLine = Object.fromEntries((prev.outputs || []).map((o) => [o.line, o]));
    const paramRows = (ind.params || [])
      .map((p) => {
        const val = usePrev ? prev.params[p.n] ?? prev.params[p.n.toUpperCase()] ?? p.def : p.def;
        return `<label class="ind-param-row">
          <span class="ind-param-key">${esc(p.n)}</span>
          <input type="number" class="ind-param-input" data-ind-param="${esc(p.n)}" min="${p.min}" max="${p.max}" step="${p.step || 1}" value="${val}" />
        </label>`;
      })
      .join("");
    const outRows = outs
      .map((o) => {
        const pv = usePrev ? prevByLine[o.name] : null;
        const checked = pv ? pv.enabled : true;
        const varName = pv?.var || o.name;
        return `<div class="ind-out-row" data-line="${esc(o.name)}">
          <label class="ind-out-check"><input type="checkbox" class="ind-out-en" ${checked ? "checked" : ""} /><span class="ind-out-name">${esc(o.name)}</span></label>
          <span class="ind-out-hint muted">${esc(o.hint || "")}</span>
          <span class="ind-out-arrow muted">→</span>
          <input type="text" class="ind-out-var" value="${esc(varName)}" placeholder="变量名" spellcheck="false" autocomplete="off" />
        </div>`;
      })
      .join("");
    const introBlock =
      indDialogPurpose === "pick"
        ? `<section class="ind-config-block ind-pick-intro-block">
        <div class="ind-pick-intro">
          <h4 class="ind-pick-title">${esc(ind.name)}${ind.desc ? `<span class="muted"> · ${esc(ind.desc)}</span>` : ""}</h4>
          <p class="ind-pick-note">${esc(ind.note || "")}</p>
          ${ind.wizard ? `<p class="muted small">${esc(ind.wizard)}</p>` : ""}
        </div>
      </section>`
        : "";
    const outputBlock = showOutputs
      ? `<section class="ind-config-block">
        <h4 class="ind-config-title">输出指标线 · 赋值变量</h4>
        <p class="muted small ind-config-tip">勾选要引入的输出线，每条线可单独指定变量名；确定后在公式末尾追加赋值语句。</p>
        <div class="ind-out-list" id="ind-output-fields">${outRows || '<p class="muted">无输出线</p>'}</div>
      </section>`
      : "";
    detail.innerHTML = `<div class="ind-config">
      ${introBlock}
      <section class="ind-config-block">
        <h4 class="ind-config-title">参数调整</h4>
        <div class="ind-param-grid" id="ind-param-fields">${paramRows || '<p class="muted">无参数</p>'}</div>
      </section>
      ${outputBlock}
    </div>`;
  }

  function renderCustomIndDetail(item) {
    const detail = $("ind-detail");
    if (!detail || !item) return;
    if (indDialogPurpose === "pick") {
      detail.innerHTML = `<section class="ind-config-block ind-pick-source-block">
        <h4 class="ind-config-title">公式源码</h4>
        <pre class="ind-formula-source-pre mono">${esc(item.source || "")}</pre>
      </section>`;
      return;
    }
    const params = parseCustomParams(item.source);
    const outs = parseCustomOutputs(item.source);
    const paramRows = params
      .map((p) => {
        return `<label class="ind-param-row">
          <span class="ind-param-key">${esc(p.n)}</span>
          <input type="number" class="ind-param-input" data-ind-param="${esc(p.n)}" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.def}" />
        </label>`;
      })
      .join("");
    const outRows = outs
      .map((o) => {
        return `<div class="ind-out-row" data-line="${esc(o.name)}">
          <label class="ind-out-check"><input type="checkbox" class="ind-out-en" checked /><span class="ind-out-name">${esc(o.name)}</span></label>
          <span class="ind-out-hint muted">${esc(o.hint)}</span>
          <span class="ind-out-arrow muted">→</span>
          <input type="text" class="ind-out-var" value="${esc(o.name)}" placeholder="变量名" spellcheck="false" autocomplete="off" />
        </div>`;
      })
      .join("");
    const showOutputs = indDialogPurpose === "import";
    const introBlock =
      indDialogPurpose === "pick"
        ? `<section class="ind-config-block ind-pick-intro-block">
        <div class="ind-pick-intro">
          <h4 class="ind-pick-title">${esc(item.name)}</h4>
          <p class="ind-pick-note muted">${esc(item.note || "自定义公式")}</p>
        </div>
      </section>`
        : "";
    const outputBlock = showOutputs
      ? `<section class="ind-config-block">
        <h4 class="ind-config-title">输出指标线 · 赋值变量</h4>
        <p class="muted small ind-config-tip">勾选输出线并指定变量名；确定后在当前公式末尾追加 <code>变量:=公式名.输出线;</code>。</p>
        <div class="ind-out-list" id="ind-output-fields">${outRows || '<p class="muted">未识别输出线，无法引入</p>'}</div>
      </section>`
      : "";
    detail.innerHTML = `<div class="ind-config">
      ${introBlock}
      <section class="ind-config-block">
        <h4 class="ind-config-title">参数调整</h4>
        <div class="ind-param-grid" id="ind-param-fields">${paramRows || '<p class="muted">未识别 PARAM，可在源码中查看</p>'}</div>
      </section>
      ${outputBlock}
    </div>`;
  }

  function $(id) {
    return document.getElementById(id);
  }

  function getDialect() {
    return typeof getFormulaDialect === "function" ? getFormulaDialect() : "tdx";
  }

  function activeFuncCatalog() {
    if (getDialect() === "tdx" && global.TdxFuncCatalog) return global.TdxFuncCatalog;
    return global.MaiFuncCatalog;
  }

  function syncFnDialogChrome() {
    const meta = $("fn-dialog-meta");
    if (meta) meta.textContent = "双击列表项或点「插入」写入光标处";
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function insertAtCaret(text, selectInner) {
    const ta = /** @type {HTMLTextAreaElement} */ ($("textarea-formula"));
    if (!ta || ta.hidden) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = ta.value.slice(0, start);
    const after = ta.value.slice(end);
    ta.value = before + text + after;
    let selStart = start + text.length;
    let selEnd = selStart;
    if (selectInner && typeof selectInner.a === "number" && typeof selectInner.b === "number") {
      selStart = start + selectInner.a;
      selEnd = start + selectInner.b;
    }
    ta.selectionStart = selStart;
    ta.selectionEnd = selEnd;
    ta.focus();
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function workspaceStatus() {
    if (typeof getFormulaSource !== "function" || typeof isCustomFormulaMode !== "function") return "clean";
    if (!isCustomFormulaMode()) return "builtin";
    const src = getFormulaSource().trim();
    if (!src) return "empty";
    if (typeof state !== "undefined" && state.workspace && !state.workspace.dirty) return "clean";
    if (typeof state !== "undefined" && state.workspace && getFormulaSource() === state.workspace.savedSource) return "saved";
    return "dirty";
  }

  function newFormulaWorkspace() {
    const st = workspaceStatus();
    if (st === "dirty") {
      if (!window.confirm("当前公式有未保存的修改，新建将放弃这些修改。是否继续？")) return;
    }
    if (typeof applyFormulaTemplate === "function") {
      applyFormulaTemplate({ forceTemplate: "empty", blank: true });
    }
    if (typeof markWorkspaceBaseline === "function") markWorkspaceBaseline("");
    if (typeof resetSyntaxCheckIdle === "function") resetSyntaxCheckIdle();
    if (typeof state !== "undefined" && state.workspace) {
      state.workspace.name = "未命名公式";
      state.workspace.libraryId = null;
    }
    updateFilebarPath();
    if (typeof toast === "function") toast("已新建空白公式", "success");
  }

  const PARAM_MAX =
    typeof window !== "undefined" && window.FORMULA_PARAM_MAX ? window.FORMULA_PARAM_MAX : 16;

  function updateFilebarPath() {
    const label = $("editor-filebar-label");
    const gear = $("btn-formula-meta");
    if (!label) return;
    const st = workspaceStatus();
    const line =
      typeof buildFilebarSummaryText === "function" ? buildFilebarSummaryText() : state?.workspace?.name || "未命名公式";
    label.textContent = line;
    label.title = line;
    if (gear) {
      const custom = st !== "builtin";
      gear.hidden = !custom;
      gear.disabled = !custom;
    }
  }

  function defaultParamRow() {
    return { key: "", value: "" };
  }

  function renderFormulaMetaRows(rows) {
    const box = $("formula-meta-params");
    const addBtn = $("formula-meta-add");
    if (!box) return;
    const list = rows.length ? rows : [defaultParamRow()];
    box.innerHTML = list
      .map((p, i) => {
        const val = p.value === "" || p.value == null ? "" : p.value;
        return `<div class="formula-meta-param-row" data-i="${i}">
          <input type="text" class="mono" data-field="key" value="${esc(String(p.key || ""))}" maxlength="24" />
          <input type="number" data-field="value" value="${esc(String(val))}" step="any" />
          <button type="button" class="icon-button formula-meta-param-remove" data-remove="${i}" title="移除此行" aria-label="移除参数">×</button>
        </div>`;
      })
      .join("");
    box.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = +btn.getAttribute("data-remove");
        const next = collectFormulaMetaRowsFromDom().filter((_, j) => j !== idx);
        renderFormulaMetaRows(next.length ? next : [defaultParamRow()]);
        syncFormulaMetaAddBtn();
      });
    });
    if (addBtn) addBtn.disabled = list.length >= PARAM_MAX;
  }

  function collectFormulaMetaRowsFromDom() {
    const box = $("formula-meta-params");
    if (!box) return [];
    return [...box.querySelectorAll(".formula-meta-param-row")].map((row) => {
      const key = row.querySelector('[data-field="key"]')?.value?.trim() || "";
      const raw = row.querySelector('[data-field="value"]')?.value;
      const value = raw === "" || raw == null ? NaN : Number(raw);
      return { key, value };
    });
  }

  function syncFormulaMetaAddBtn() {
    const addBtn = $("formula-meta-add");
    const n = $("formula-meta-params")?.querySelectorAll(".formula-meta-param-row").length || 0;
    if (addBtn) addBtn.disabled = n >= PARAM_MAX;
  }

  function openFormulaMetaDialog() {
    if (!isCustomFormulaMode || !isCustomFormulaMode()) return;
    const nameEl = $("formula-meta-name");
    const wsName =
      typeof formatWorkspaceLabel === "function"
        ? formatWorkspaceLabel(state?.workspace?.name)
        : state?.workspace?.name || "";
    if (nameEl) {
      nameEl.value = wsName === "未命名公式" ? "" : wsName;
    }
    const rows =
      typeof getFormulaParamRowsForDisplay === "function"
        ? getFormulaParamRowsForDisplay()
        : [];
    renderFormulaMetaRows(rows.length ? rows.map((p) => ({ ...p })) : [defaultParamRow()]);
    openModal("formula-meta-mask");
    setTimeout(() => nameEl?.focus(), 40);
  }

  function confirmFormulaMetaDialog() {
    const name = $("formula-meta-name")?.value ?? "";
    const rows = collectFormulaMetaRowsFromDom();
    if (typeof applyFormulaMetaFromDialog === "function") applyFormulaMetaFromDialog(name, rows);
    closeModal("formula-meta-mask");
    if (typeof toast === "function") toast("已更新公式名称与参数", "success");
  }

  function openModal(id) {
    const m = $(id);
    if (m) {
      m.hidden = false;
      m.classList.add("show");
    }
  }

  function closeModal(id) {
    const m = $(id);
    if (m) {
      m.hidden = true;
      m.classList.remove("show");
    }
  }

  const FN_DLG_STACK_MIN_DETAIL = 200;

  function layoutFnDialog() {
    const dlg = $("fn-dlg") || document.querySelector(".fn-dlg");
    const mask = $("fn-dialog-mask");
    if (!dlg || !mask || mask.hidden) return;
    const current = dlg.getAttribute("data-layout") || "wide";
    const slack = current === "stack" ? 20 : 1;
    const needWide = 148 + 260 + FN_DLG_STACK_MIN_DETAIL + 10 * 2 + slack;
    const next = dlg.clientWidth >= needWide ? "wide" : "stack";
    if (dlg.getAttribute("data-layout") !== next) dlg.setAttribute("data-layout", next);
  }

  function bindFnDialogLayout() {
    const dlg = $("fn-dlg") || document.querySelector(".fn-dlg");
    if (!dlg || dlg.dataset.layoutBound) return;
    dlg.dataset.layoutBound = "1";
    const run = () => layoutFnDialog();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(run);
      ro.observe(dlg);
    } else {
      window.addEventListener("resize", run);
    }
  }

  function openFnDialog() {
    if (!isCustomFormulaMode || !isCustomFormulaMode()) {
      if (typeof toast === "function") toast("内置指标模式不可插入函数，请新建公式", "warn");
      return;
    }
    const s = $("fn-search");
    if (s) s.value = "";
    fnCat = "全部";
    fnSel = 0;
    renderFnCats();
    renderFnList();
    syncFnDialogChrome();
    openModal("fn-dialog-mask");
    layoutFnDialog();
    setTimeout(() => s?.focus(), 40);
  }

  function fnMatches(f) {
    const cat = activeFuncCatalog();
    if (!cat) return false;
    const kw = $("fn-search")?.value || "";
    return cat.match(f, kw);
  }

  function renderFnCats() {
    const el = $("fn-cats");
    const cat = activeFuncCatalog();
    if (!el || !cat) return;
    const cats = cat.categories();
    el.innerHTML = cats
      .map((c) => {
        const n = cat.FUNCS.filter((f) => (c === "全部" || f.c === c) && fnMatches(f)).length;
        return `<div class="${c === fnCat ? "active" : ""}" data-cat="${esc(c)}" role="button" tabindex="0"><span>${esc(c)}</span><span class="muted">${n}</span></div>`;
      })
      .join("");
    el.querySelectorAll("[data-cat]").forEach((node) => {
      node.addEventListener("click", () => {
        fnCat = node.getAttribute("data-cat") || "全部";
        renderFnCats();
        renderFnList();
      });
    });
  }

  function renderFnList() {
    const el = $("fn-list");
    const cat = activeFuncCatalog();
    if (!el || !cat) return;
    const list = cat.FUNCS.map((f, i) => [f, i]).filter(([f]) => (fnCat === "全部" || f.c === fnCat) && fnMatches(f));
    el.innerHTML = list.length
      ? list
          .map(([f, i]) => {
            const active = i === fnSel ? "active" : "";
            const src = f.tdx ? '<i class="fn-src-tdx" title="通达信兼容函数">通</i>' : "";
            return `<div class="${active}" data-idx="${i}" title="${esc(f.t)}"><b>${esc(f.n)}${src}</b><span class="muted">${esc(f.t)}</span></div>`;
          })
          .join("")
      : '<div class="muted fn-empty">无匹配函数</div>';
    el.querySelectorAll("[data-idx]").forEach((node) => {
      const i = +node.getAttribute("data-idx");
      node.addEventListener("click", () => showFnDetail(i));
      node.addEventListener("dblclick", () => {
        showFnDetail(i);
        insertSelectedFn();
      });
    });
    if (!list.some(([, i]) => i === fnSel)) {
      fnSel = list.length ? list[0][1] : -1;
    }
    if (fnSel >= 0) showFnDetail(fnSel);
    else if ($("fn-detail")) $("fn-detail").innerHTML = "";
    layoutFnDialog();
  }

  function showFnDetail(i) {
    fnSel = i;
    const cat = activeFuncCatalog();
    const f = cat?.getByIndex(i);
    const el = $("fn-list");
    el?.querySelectorAll("[data-idx]").forEach((n) => n.classList.toggle("active", +n.getAttribute("data-idx") === i));
    const box = $("fn-detail");
    if (!box || !f) return;
    const d = getDialect();
    let calc = "";
    if (d === "my") {
      const can = cat.calcable ? cat.calcable(f) : f.calc;
      calc = can
        ? '<span class="fn-badge fn-badge-calc">绘图 / 回测可计算</span>'
        : '<span class="fn-badge fn-badge-nocalc">仅语法支持（依赖原型外数据）</span>';
      if (f.tdx) calc = `<span class="fn-badge fn-badge-tdx">通达信兼容</span>${calc}`;
    } else if (cat.calcable && cat.calcable(f)) {
      calc = '<span class="fn-badge fn-badge-calc">预览可计算</span>';
    } else {
      calc = '<span class="fn-badge fn-badge-nocalc">仅语法支持</span>';
    }
    const flagF = (f.f || "").includes("F") ? '<span class="fn-badge fn-badge-future">未来函数</span>' : "";
    const flagA = (f.f || "").includes("A") && !f.tdx ? '<span class="fn-badge fn-badge-mai">麦语言</span>' : "";
    box.innerHTML = `<h4>${esc(f.n)} <span class="fn-title-cn">${esc(f.t)}</span> ${flagF}${flagA} ${calc}</h4>
      <div class="muted small">分类：${esc(f.c)}</div>
      <p><strong>简介</strong> ${esc(f.b)}</p>
      <p><strong>用法</strong></p>
      <pre class="fn-usage">${esc(f.u)}</pre>`;
  }

  function insertSelectedFn() {
    const cat = activeFuncCatalog();
    const f = cat?.getByIndex(fnSel);
    if (!f) return;
    const text = cat.insertSnippet(f);
    const range = cat.selectRange(f, text);
    closeModal("fn-dialog-mask");
    insertAtCaret(text, range);
  }

  function syncIndDialogChrome() {
    const title = $("ind-dialog-title");
    const ok = $("ind-dialog-ok");
    const modal = document.querySelector("#ind-dialog-mask .modal-ind-import");
    const tabs = $("ind-import-tabs");
    if (indDialogPurpose === "pick") {
      if (title) title.textContent = "编辑公式";
      if (ok) ok.textContent = "确定";
      modal?.classList.add("ind-dialog-pick");
      if (tabs) {
        tabs.hidden = true;
        tabs.setAttribute("aria-hidden", "true");
      }
    } else {
      if (title) title.textContent = "引入指标";
      if (ok) ok.textContent = "引入";
      modal?.classList.remove("ind-dialog-pick");
      if (tabs) {
        tabs.hidden = false;
        tabs.setAttribute("aria-hidden", "false");
      }
    }
  }

  function indDetailEmptyHtml() {
    return indDialogPurpose === "pick"
      ? '<p class="muted ind-config-empty">选择左侧公式名称，在右侧预览公式源码</p>'
      : '<p class="muted ind-config-empty">选择左侧指标后，在右侧调整参数并配置输出线变量</p>';
  }

  function openIndDialog() {
    indDialogPurpose = "import";
    indTab = "builtin";
    indPick = null;
    lastIndDetailKey = "";
    const q = $("ind-search");
    if (q) q.value = "";
    const detail = $("ind-detail");
    if (detail) detail.innerHTML = indDetailEmptyHtml();
    syncIndDialogChrome();
    syncIndTabs();
    renderIndList();
    openModal("ind-dialog-mask");
    setTimeout(() => q?.focus(), 40);
  }

  function openPickDialog() {
    indDialogPurpose = "pick";
    indTab = "custom";
    indPick = null;
    lastIndDetailKey = "";
    const q = $("ind-search");
    if (q) q.value = "";
    const detail = $("ind-detail");
    if (detail) detail.innerHTML = indDetailEmptyHtml();
    syncIndDialogChrome();
    syncIndTabs();
    renderIndList();
    openModal("ind-dialog-mask");
    setTimeout(() => q?.focus(), 40);
  }

  function syncIndTabs() {
    document.querySelectorAll("[data-ind-tab]").forEach((b) => {
      const on = b.getAttribute("data-ind-tab") === indTab;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function builtinRows() {
    if (typeof SysInd === "undefined") return [];
    return (SysInd.SYSTEM_LIB || []).map((ind) => ({
      type: "builtin",
      key: ind.name,
      name: ind.name,
      desc: ind.desc || ind.note || "",
      sub: ind.note || "",
    }));
  }

  function formulaDialectOf(item) {
    return item?.dialect === "tdx" ? "tdx" : "my";
  }

  function customRows() {
    const lib = typeof state !== "undefined" ? state.library || [] : [];
    const dialect = getDialect();
    const filtered =
      indDialogPurpose === "pick" ? lib.filter((x) => formulaDialectOf(x) === dialect) : lib;
    return filtered.map((x) => ({
      type: "custom",
      key: x.id,
      name: x.name,
      desc: x.note || "自定义公式",
      sub: indDialogPurpose === "pick" ? "" : new Date(x.ts).toLocaleString("zh-CN"),
    }));
  }

  function renderIndList() {
    const el = $("ind-list");
    if (!el) return;
    const q = ($("ind-search")?.value || "").trim().toLowerCase();
    const rows = indDialogPurpose === "pick" ? customRows() : indTab === "builtin" ? builtinRows() : customRows();
    const filtered = rows.filter((r) => {
      if (!q) return true;
      const blob = `${r.name} ${r.desc} ${r.sub}`.toLowerCase();
      return blob.includes(q);
    });
    if (!filtered.length) {
      const emptyHint =
        indDialogPurpose === "pick"
          ? "当前语法模式下暂无可用公式"
          : "无匹配的指标或公式";
      el.innerHTML = `<p class="muted ind-empty">${esc(emptyHint)}</p>`;
      const detail = $("ind-detail");
      if (detail) detail.innerHTML = indDetailEmptyHtml();
      indPick = null;
      return;
    }
    el.innerHTML = filtered
      .map((r) => {
        const active = indPick && indPick.type === r.type && indPick.key === r.key ? "active" : "";
        const del =
          indDialogPurpose === "pick" && r.type === "custom"
            ? `<button type="button" class="text-button ind-del" data-key="${esc(r.key)}" title="从我的公式中删除">删除</button>`
            : "";
        return `<div class="ind-row ${active}" data-type="${esc(r.type)}" data-key="${esc(r.key)}">
          <b>${esc(r.name)}</b><span class="muted">${esc(r.desc)}</span>
          ${r.sub ? `<span class="ind-sub muted">${esc(r.sub)}</span>` : ""}${del}
        </div>`;
      })
      .join("");
    el.querySelectorAll(".ind-del").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const key = b.getAttribute("data-key");
        const item = (state.library || []).find((x) => x.id === key);
        if (!item || typeof removeLibraryFormula !== "function") return;
        if (!window.confirm(`删除「${item.name}」？删除后不可恢复。`)) return;
        removeLibraryFormula(key);
        if (indPick && indPick.key === key) indPick = null;
        renderIndList();
        if (typeof toast === "function") toast(`已删除「${item.name}」`, "success");
      })
    );
    el.querySelectorAll(".ind-row").forEach((row) => {
      row.addEventListener("click", () => selectIndRow(row));
      row.addEventListener("dblclick", () => {
        selectIndRow(row);
        confirmIndDialogOk();
      });
    });
    if (!indPick || !filtered.some((r) => r.type === indPick.type && r.key === indPick.key)) {
      selectIndRow(el.querySelector(".ind-row"));
    }
  }

  function selectIndRow(row) {
    if (!row) return;
    indPick = { type: row.getAttribute("data-type") || "", key: row.getAttribute("data-key") || "" };
    $("ind-list")?.querySelectorAll(".ind-row").forEach((n) => n.classList.toggle("active", n === row));
    if (indDialogPurpose !== "pick" && indTab === "builtin") {
      const ind = typeof SysInd !== "undefined" ? SysInd.getByName(indPick.key) : null;
      if (!ind) return;
      renderBuiltinIndDetail(ind);
    } else {
      const item = (state.library || []).find((x) => x.id === indPick.key);
      if (!item) return;
      renderCustomIndDetail(item);
    }
  }

  function formulaRefName(item) {
    const raw = String(item?.name || "FORMULA")
      .replace(/[^\w]/g, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase();
    return raw || "FORMULA";
  }

  function appendFormulaLines(text) {
    const ta = /** @type {HTMLTextAreaElement} */ ($("textarea-formula"));
    if (!ta) return false;
    if (typeof isCustomFormulaMode === "function" && !isCustomFormulaMode()) {
      if (typeof toast === "function") toast("请先「新建公式」或「选择公式」为自定义后再引入指标线", "warn");
      return false;
    }
    const block = String(text || "").trim();
    if (!block) return false;
    let src = ta.value.replace(/\s+$/, "");
    if (src) src += "\n";
    src += block.endsWith("\n") ? block : `${block}\n`;
    ta.value = src;
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  function confirmIndImport() {
    if (!indPick) {
      if (typeof toast === "function") toast("请先选择一项", "warn");
      return;
    }
    const cfg = readIndConfigForm();
    const enabled = (cfg.outputs || []).filter((o) => o.enabled);
    if (!enabled.length) {
      if (typeof toast === "function") toast("请至少勾选一条输出指标线", "warn");
      return;
    }
    const err = validateIndConfig(enabled);
    if (err) {
      if (typeof toast === "function") toast(err, "warn");
      return;
    }
    let indName = "";
    if (indPick.type === "builtin") {
      indName = indPick.key;
    } else {
      const item = (typeof state !== "undefined" ? state.library || [] : []).find((x) => x.id === indPick.key);
      if (!item) return;
      indName = formulaRefName(item);
    }
    const lines = enabled.map((o) => `${o.var}:=${indName}.${o.line};`).join("\n");
    if (!appendFormulaLines(lines)) return;
    closeModal("ind-dialog-mask");
    updateFilebarPath();
    if (typeof toast === "function") toast("已在公式末尾追加指标线赋值", "success");
  }

  function confirmPickFormula() {
    if (!indPick) {
      if (typeof toast === "function") toast("请先选择一项", "warn");
      return;
    }
    if (indPick.type !== "custom") {
      if (typeof toast === "function") toast("请选择自定义公式", "warn");
      return;
    }
    const item = (typeof state !== "undefined" ? state.library || [] : []).find((x) => x.id === indPick.key);
    if (!item) return;
    const src = item.source || "";
    const itemDialect = formulaDialectOf(item);
    const curDialect = getDialect();
    if (itemDialect !== curDialect) {
      if (typeof toast === "function") toast("当前语法模式与公式不一致，请切换后重试", "warn");
      return;
    }
    $("select-formula-kind").value = "custom";
    $("select-formula-template").value = "empty";
    if (typeof state !== "undefined") state.indicatorBindings = null;
    if (typeof applyFormulaTemplate === "function") applyFormulaTemplate();
    if (typeof restoreParamMeta === "function") restoreParamMeta(item.paramMeta);
    const ta = /** @type {HTMLTextAreaElement} */ ($("textarea-formula"));
    if (ta) {
      ta.value = src;
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (typeof markWorkspaceBaseline === "function") markWorkspaceBaseline(src);
    if (state.workspace) {
      state.workspace.name = item.name;
      state.workspace.libraryId = item.id;
    }
    if (typeof invalidateChartSubmission === "function") invalidateChartSubmission();
    closeModal("ind-dialog-mask");
    updateFilebarPath();
    if (typeof toast === "function") toast("已选择公式", "success");
  }

  function confirmIndDialogOk() {
    if (indDialogPurpose === "pick") confirmPickFormula();
    else confirmIndImport();
  }

  function saveWorkspace() {
    if (typeof saveDraft === "function") saveDraft();
    if (typeof markWorkspaceBaseline === "function") markWorkspaceBaseline(getFormulaSource());
    updateFilebarPath();
    if (typeof toast === "function") toast("已保存到浏览器草稿", "success");
  }

  function saveWorkspaceAs() {
    if (!isCustomFormulaMode()) {
      if (typeof toast === "function") toast("内置指标为只读，不能另存为公式", "warn");
      return;
    }
    const def = state.workspace?.name?.replace(/\.mai$/, "") || "我的公式";
    const name = window.prompt("另存为公式名称", def);
    if (!name || !name.trim()) return;
    const item = {
      id: (typeof hashString === "function" ? hashString(`${name}|${Date.now()}`).slice(0, 12) : String(Date.now())),
      name: name.trim(),
      note: "",
      source: getFormulaSource(),
      paramMeta: typeof collectParamMeta === "function" ? collectParamMeta() : undefined,
      ts: Date.now(),
    };
    state.library.unshift(item);
    localStorage.setItem(
      typeof STORAGE_LIBRARY !== "undefined" ? STORAGE_LIBRARY : "qlab_formula_library_v1",
      JSON.stringify(state.library)
    );
    if (state.workspace) {
      state.workspace.name = item.name;
      state.workspace.libraryId = item.id;
    }
    if (typeof markWorkspaceBaseline === "function") markWorkspaceBaseline(item.source);
    if (typeof saveDraft === "function") saveDraft();
    updateFilebarPath();
    if (typeof toast === "function") toast("已另存为「" + item.name + "」", "success");
  }

  function bind() {
    if (bind._done) return;
    bind._done = true;
    $("btn-new-formula")?.addEventListener("click", newFormulaWorkspace);
    $("btn-insert-fn")?.addEventListener("click", openFnDialog);
    $("btn-pick-formula")?.addEventListener("click", openPickDialog);
    $("btn-import-indicator")?.addEventListener("click", openIndDialog);
    $("btn-save-workspace")?.addEventListener("click", saveWorkspace);
    $("btn-save-as-workspace")?.addEventListener("click", saveWorkspaceAs);
    $("btn-formula-meta")?.addEventListener("click", openFormulaMetaDialog);
    $("formula-meta-cancel")?.addEventListener("click", () => closeModal("formula-meta-mask"));
    $("formula-meta-ok")?.addEventListener("click", confirmFormulaMetaDialog);
    $("formula-meta-add")?.addEventListener("click", () => {
      const rows = collectFormulaMetaRowsFromDom();
      if (rows.length >= PARAM_MAX) return;
      rows.push(defaultParamRow());
      renderFormulaMetaRows(rows);
    });

    $("fn-dialog-close")?.addEventListener("click", () => closeModal("fn-dialog-mask"));
    $("fn-dialog-insert")?.addEventListener("click", insertSelectedFn);
    $("fn-search")?.addEventListener("input", () => {
      renderFnCats();
      renderFnList();
    });

    $("ind-dialog-close")?.addEventListener("click", () => closeModal("ind-dialog-mask"));
    $("ind-dialog-ok")?.addEventListener("click", confirmIndDialogOk);
    $("ind-search")?.addEventListener("input", renderIndList);
    document.querySelectorAll("[data-ind-tab]").forEach((b) =>
      b.addEventListener("click", () => {
        indTab = b.getAttribute("data-ind-tab") || "builtin";
        indPick = null;
        syncIndTabs();
        renderIndList();
      })
    );

    document.querySelectorAll(".modal-mask").forEach((mask) => {
      mask.addEventListener("click", (e) => {
        if (e.target === mask) closeModal(mask.id);
      });
    });

    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        openFnDialog();
      }
    });
  }

  function onDialectChange() {
    updateFilebarPath();
    syncFnDialogChrome();
    const mask = $("fn-dialog-mask");
    if (mask && !mask.hidden) {
      fnCat = "全部";
      fnSel = 0;
      renderFnCats();
      renderFnList();
    }
    const indMask = $("ind-dialog-mask");
    if (indMask && !indMask.hidden && indDialogPurpose === "pick") {
      indPick = null;
      lastIndDetailKey = "";
      const detail = $("ind-detail");
      if (detail) detail.innerHTML = indDetailEmptyHtml();
      renderIndList();
    }
  }

  function init() {
    bind();
    bindFnDialogLayout();
    syncFnDialogChrome();
    updateFilebarPath();
  }

  global.FormulaEditorUI = {
    init,
    updateFilebarPath,
    workspaceStatus,
    newFormulaWorkspace,
    onDialectChange,
    saveWorkspace,
    openFormulaMetaDialog,
  };
})(typeof window !== "undefined" ? window : globalThis);
