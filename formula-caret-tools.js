/**
 * 公式编辑器 · 函数悬停说明 + 输入联想补全（麦语言 / 通达信）
 */
(function (global) {
  let acIndex = 0;
  let acItems = [];
  let acPrefix = null;
  let measureCanvas = null;

  const $ = (id) => document.getElementById(id);

  function getDialect() {
    if (typeof getFormulaDialect === "function") return getFormulaDialect();
    const v = /** @type {HTMLSelectElement} */ ($("select-formula-dialect"))?.value;
    return v === "my" ? "my" : "tdx";
  }

  function activeCatalog() {
    const d = getDialect();
    if (d === "tdx" && global.TdxFuncCatalog) return global.TdxFuncCatalog;
    if (global.MaiFuncCatalog) return global.MaiFuncCatalog;
    return null;
  }

  function funcBaseName(f) {
    return (f.n || "").replace(/\(.*$/, "").replace(/\(\d+\)$/, "").toUpperCase();
  }

  function buildFnMap() {
    const cat = activeCatalog();
    const map = new Map();
    if (!cat) return map;
    (cat.FUNCS || []).forEach((f) => {
      const b = funcBaseName(f);
      if (b && !map.has(b)) map.set(b, f);
    });
    return map;
  }

  function lookupFunc(word) {
    const w = (word || "").toUpperCase();
    if (!w) return null;
    return buildFnMap().get(w) || null;
  }

  /** 从用法括号内切分形参名，支持嵌套括号如 MA(CLOSE,5) */
  function splitUsageArgList(inner) {
    if (inner == null) return null;
    const s = String(inner).trim();
    if (!s) return [];
    if (s.includes("...") || s.includes("…")) return null;
    const out = [];
    let depth = 0;
    let cur = "";
    for (const ch of s) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      else if (ch === "," && depth === 0) {
        const t = cur.trim();
        if (t) out.push(t);
        cur = "";
        continue;
      }
      cur += ch;
    }
    const tail = cur.trim();
    if (tail) out.push(tail);
    return out;
  }

  /** 解析用法/说明中的「函数名(形参…)」形参名列表 */
  function usageParamNames(f) {
    const base = funcBaseName(f);
    const u = f.u || "";
    const esc = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(
      "(?:^|[^A-Z0-9_])" + esc + "\\s*\\(([^()]*(?:\\([^()]*\\)[^()]*)*)\\)",
      "i"
    );
    let m = u.match(re);
    if (!m) {
      m = u.match(/\(([^()]*(?:\([^()]*\)[^()]*)*)\)/);
      if (!m) return null;
    }
    return splitUsageArgList(m[1]);
  }

  function guessArgCount(f) {
    const names = usageParamNames(f);
    if (names) return names.length;
    if (f.n.includes("()")) return 0;
    return null;
  }

  /** 无法从用法解析时，按个数生成 P1,P2… */
  function placeholderArgsByCount(n) {
    return Array.from({ length: n }, (_, i) => `P${i + 1}`).join(", ");
  }

  function usageHead(f) {
    return (f.u || "")
      .replace(/^用法[:：]?/i, "")
      .trim()
      .split(/\n|例如/)[0]
      .trim();
  }

  /** 用法为「用法:CLOSE」等，不带括号 */
  function usageIsBareIdentifier(f) {
    const base = funcBaseName(f);
    const head = usageHead(f);
    if (!head) return false;
    const esc = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp("^" + esc + "\\s*\\(", "i").test(head)) return false;
    return new RegExp("^" + esc + "\\b", "i").test(head);
  }

  function autocompleteInsertText(f) {
    const cat = activeCatalog();
    const base = funcBaseName(f);
    if (f.c === "操作符") return cat?.insertSnippet ? cat.insertSnippet(f) : f.n;
    if (f.c === "线形和资源" || (f.f || "").includes("A")) {
      return cat?.insertSnippet ? cat.insertSnippet(f) : `,${f.n}`;
    }
    if (f.insert) return f.insert;

    if (usageIsBareIdentifier(f)) return base;

    const snip = cat?.insertSnippet?.(f);
    if (snip && !snip.startsWith(",") && funcBaseName({ n: snip.split("(")[0] }) === base) {
      if (!snip.includes("(")) return base;
      if (/^[A-Za-z_][A-Za-z0-9_]*\(/.test(snip)) return snip;
    }

    const names = usageParamNames(f);
    if (names && names.length) return `${base}(${names.join(", ")})`;
    if (names && names.length === 0) return `${base}()`;

    const argc = guessArgCount(f);
    if (argc === 0 && f.n.includes("()")) return `${base}()`;
    if (argc > 0) return `${base}(${placeholderArgsByCount(argc)})`;
    return base;
  }

  function selectInnerRange(text) {
    const a = text.indexOf("(") + 1;
    const b = text.lastIndexOf(")");
    if (b > a) return { a, b };
    return null;
  }

  function measureCtx() {
    if (!measureCanvas) measureCanvas = document.createElement("canvas");
    const ctx = measureCanvas.getContext("2d");
    ctx.font = '11px SFMono-Regular, Consolas, ui-monospace, monospace';
    return ctx;
  }

  function getOffsetFromPoint(ta, clientX, clientY) {
    const rect = ta.getBoundingClientRect();
    const padX = 10;
    const padY = 8;
    const lh = 20;
    const x = clientX - rect.left + ta.scrollLeft - padX;
    const y = clientY - rect.top + ta.scrollTop - padY;
    const lines = ta.value.split("\n");
    const lineIdx = Math.max(0, Math.min(lines.length - 1, Math.floor(y / lh)));
    const line = lines[lineIdx] || "";
    const ctx = measureCtx();
    let col = line.length;
    for (let i = 0; i <= line.length; i++) {
      if (ctx.measureText(line.slice(0, i)).width >= x) {
        col = i;
        break;
      }
    }
    let off = 0;
    for (let i = 0; i < lineIdx; i++) off += lines[i].length + 1;
    return Math.min(ta.value.length, off + col);
  }

  function wordAt(src, pos) {
    const re = /[A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\u4e00-\u9fa5]*/g;
    let m;
    while ((m = re.exec(src))) {
      if (m.index <= pos && m.index + m[0].length >= pos) return m[0];
    }
    return "";
  }

  function inLineString(src, pos) {
    const lineStart = src.lastIndexOf("\n", pos - 1) + 1;
    const line = src.slice(lineStart, pos);
  const dq = (line.match(/"/g) || []).length;
    const sq = (line.match(/'/g) || []).length;
    return dq % 2 === 1 || sq % 2 === 1;
  }

  function partialBeforeCursor(src, pos) {
    if (inLineString(src, pos)) return null;
    const before = src.slice(0, pos);
    const m = /[A-Za-z_\u4e00-\u9fa5][A-Za-z0-9_\u4e00-\u9fa5]*$/.exec(before);
    if (!m || m[0].length < 1) return null;
    const start = pos - m[0].length;
    const prev = start > 0 ? before[start - 1] : "";
    if (/[A-Za-z0-9_\u4e00-\u9fa5]/.test(prev)) return null;
    return { prefix: m[0], start, end: pos };
  }

  function suggestFunctions(prefix) {
    const cat = activeCatalog();
    if (!cat) return [];
    const q = prefix.toUpperCase();
    const list = (cat.FUNCS || []).filter((f) => {
      const b = funcBaseName(f);
      if (f.c === "操作符" && f.n.length <= 2) return false;
      return b.startsWith(q) || b.includes(q);
    });
    list.sort((a, b) => {
      const ba = funcBaseName(a);
      const bb = funcBaseName(b);
      const ea = ba.startsWith(q) ? 0 : 1;
      const eb = bb.startsWith(q) ? 0 : 1;
      if (ea !== eb) return ea - eb;
      return ba.length - bb.length || ba.localeCompare(bb);
    });
    return list.slice(0, 14);
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderTooltip(f) {
    const title = `${funcBaseName(f)} · ${f.t || ""}`;
    const body = f.b ? `<p>${esc(f.b)}</p>` : "";
    const usage = f.u ? `<p class="formula-fn-tooltip-u">${esc(f.u).replace(/\n/g, "<br>")}</p>` : "";
    return `<strong>${esc(title)}</strong>${body}${usage}`;
  }

  function showTooltip(f, clientX, clientY) {
    const el = $("formula-fn-tooltip");
    if (!el || !f) return;
    el.innerHTML = renderTooltip(f);
    el.hidden = false;
    const pad = 12;
    let left = clientX + pad;
    let top = clientY + pad;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      if (r.right > window.innerWidth - 8) left = Math.max(8, clientX - r.width - pad);
      if (r.bottom > window.innerHeight - 8) top = Math.max(8, clientY - r.height - pad);
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    });
  }

  function hideTooltip() {
    const el = $("formula-fn-tooltip");
    if (el) el.hidden = true;
  }

  function hideAutocomplete() {
    acItems = [];
    acPrefix = null;
    const el = $("formula-ac-list");
    if (el) {
      el.hidden = true;
      el.innerHTML = "";
    }
  }

  function positionAcList(ta) {
    const list = $("formula-ac-list");
    if (!list || !ta) return;
    const coords = caretCoords(ta, ta.selectionStart);
    const lh = 22;
    const pad = 8;
    let left = coords.left;
    let top = coords.top + lh;
    list.style.left = `${left}px`;
    list.style.top = `${top}px`;
    list.style.minWidth = `${Math.max(200, coords.width + 48)}px`;
    requestAnimationFrame(() => {
      const r = list.getBoundingClientRect();
      if (r.bottom > window.innerHeight - pad) {
        top = Math.max(pad, coords.top - r.height - 4);
      }
      if (r.right > window.innerWidth - pad) {
        left = Math.max(pad, window.innerWidth - pad - r.width);
      }
      list.style.left = `${left}px`;
      list.style.top = `${top}px`;
    });
  }

  function caretCoords(ta, pos) {
    const rect = ta.getBoundingClientRect();
    const padX = 10;
    const padY = 8;
    const lh = 20;
    const before = ta.value.slice(0, pos);
    const lines = before.split("\n");
    const lineIdx = lines.length - 1;
    const col = lines[lineIdx].length;
    const ctx = measureCtx();
    const w = ctx.measureText(lines[lineIdx]).width;
    return {
      left: rect.left + padX + w - ta.scrollLeft,
      top: rect.top + padY + lineIdx * lh - ta.scrollTop,
      width: w,
    };
  }

  function renderAutocomplete() {
    const list = $("formula-ac-list");
    const ta = /** @type {HTMLTextAreaElement} */ ($("textarea-formula"));
    if (!list || !ta || !acItems.length || !acPrefix) {
      hideAutocomplete();
      return;
    }
    list.hidden = false;
    list.innerHTML = acItems
      .map((f, i) => {
        const name = funcBaseName(f);
        const sub = f.t ? `<span class="muted">${esc(f.t)}</span>` : "";
        return `<li class="formula-ac-item${i === acIndex ? " active" : ""}" role="option" data-i="${i}"><b>${esc(
          name
        )}</b>${sub}</li>`;
      })
      .join("");
    positionAcList(ta);
    list.querySelectorAll(".formula-ac-item").forEach((node) => {
      node.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const i = +node.getAttribute("data-i");
        if (!Number.isNaN(i)) acceptAutocomplete(i);
      });
    });
  }

  function refreshAutocomplete() {
    const ta = /** @type {HTMLTextAreaElement} */ ($("textarea-formula"));
    if (!ta || ta.hidden || !acCatalogReady()) {
      hideAutocomplete();
      return;
    }
    const part = partialBeforeCursor(ta.value, ta.selectionStart);
    if (!part || part.prefix.length < 1) {
      hideAutocomplete();
      return;
    }
    const items = suggestFunctions(part.prefix);
    if (!items.length) {
      hideAutocomplete();
      return;
    }
    acPrefix = part;
    acItems = items;
    acIndex = 0;
    renderAutocomplete();
  }

  function acCatalogReady() {
    if (typeof isCustomFormulaMode === "function" && !isCustomFormulaMode()) return false;
    return !!activeCatalog();
  }

  function replaceRange(ta, from, to, text, innerSel) {
    const before = ta.value.slice(0, from);
    const after = ta.value.slice(to);
    ta.value = before + text + after;
    let selStart = from + text.length;
    let selEnd = selStart;
    if (innerSel) {
      selStart = from + innerSel.a;
      selEnd = from + innerSel.b;
    }
    ta.selectionStart = selStart;
    ta.selectionEnd = selEnd;
    ta.focus();
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function acceptAutocomplete(index) {
    const ta = /** @type {HTMLTextAreaElement} */ ($("textarea-formula"));
    if (!ta || !acPrefix || !acItems[index]) return;
    const f = acItems[index];
    const insert = autocompleteInsertText(f);
    const inner = selectInnerRange(insert);
    replaceRange(ta, acPrefix.start, acPrefix.end, insert, inner);
    hideAutocomplete();
    if (typeof paintEditor === "function") paintEditor();
    if (typeof resetSyntaxCheckIdle === "function") resetSyntaxCheckIdle();
  }

  function bind() {
    if (bind._done) return;
    bind._done = true;
    const ta = /** @type {HTMLTextAreaElement} */ ($("textarea-formula"));
    const wrap = $("code-wrap");
    if (!ta) return;

    let tipTimer = null;
    wrap?.addEventListener("mousemove", (e) => {
      if (!acCatalogReady()) {
        hideTooltip();
        return;
      }
      clearTimeout(tipTimer);
      tipTimer = window.setTimeout(() => {
        const pos = getOffsetFromPoint(ta, e.clientX, e.clientY);
        const w = wordAt(ta.value, pos);
        const f = lookupFunc(w);
        if (f && w.length >= 2) showTooltip(f, e.clientX, e.clientY);
        else hideTooltip();
      }, 120);
    });
    wrap?.addEventListener("mouseleave", () => {
      clearTimeout(tipTimer);
      hideTooltip();
    });

    ta.addEventListener("input", () => {
      refreshAutocomplete();
    });
    ta.addEventListener("click", () => {
      refreshAutocomplete();
      hideTooltip();
    });
    ta.addEventListener("keyup", (e) => {
      if (!["ArrowDown", "ArrowUp", "Enter", "Escape", "Tab"].includes(e.key)) refreshAutocomplete();
    });
    ta.addEventListener("keydown", (e) => {
      if (!acItems.length || !acPrefix) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        acIndex = (acIndex + 1) % acItems.length;
        renderAutocomplete();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        acIndex = (acIndex - 1 + acItems.length) % acItems.length;
        renderAutocomplete();
        return;
      }
      if (e.key === "Escape") {
        hideAutocomplete();
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        acceptAutocomplete(acIndex);
      }
    });
    ta.addEventListener("blur", () => {
      window.setTimeout(hideAutocomplete, 150);
    });
    ta.addEventListener("scroll", () => {
      if (acItems.length) positionAcList(ta);
    });
  }

  function init() {
    bind();
  }

  function refreshCatalogHint(word) {
    const f = lookupFunc(word);
    const hint = $("formula-caret-hint");
    if (!hint) return;
    if (!f) {
      if (typeof updateCaretBar === "function") updateCaretBar();
      return;
    }
    hint.textContent = `${funcBaseName(f)}：${f.t || ""} — ${(f.u || "").split("\n")[0].slice(0, 72)}`;
  }

  global.FormulaCaretTools = { init, refreshCatalogHint, lookupFunc };
})(typeof window !== "undefined" ? window : globalThis);
