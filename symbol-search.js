/**
 * 证券代码检索（原型本地库）：仅按代码数字匹配；失焦后展示「代码 + 名称」，编辑时仅输入 6 位数字
 */
(function (global) {
  /** type：stock 股票 / etf 场内基金 / index 指数（不可交易）；etfType 决定 T+0/T+1 与税费 */
  /** @type {Array<{code:string,name:string,digits:string,type?:string,etfType?:string}>} */
  const UNIVERSE = [
    { code: "000001.SZ", name: "平安银行", digits: "000001" },
    { code: "000001.SH", name: "上证综合指数", digits: "000001", type: "index" },
    { code: "000002.SZ", name: "万科A", digits: "000002" },
    { code: "000063.SZ", name: "中兴通讯", digits: "000063" },
    { code: "000333.SZ", name: "美的集团", digits: "000333" },
    { code: "000858.SZ", name: "五粮液", digits: "000858" },
    { code: "002594.SZ", name: "比亚迪", digits: "002594" },
    { code: "300750.SZ", name: "宁德时代", digits: "300750" },
    { code: "600000.SH", name: "浦发银行", digits: "600000" },
    { code: "600036.SH", name: "招商银行", digits: "600036" },
    { code: "600519.SH", name: "贵州茅台", digits: "600519" },
    { code: "601318.SH", name: "中国平安", digits: "601318" },
    { code: "601398.SH", name: "工商银行", digits: "601398" },
    { code: "688981.SH", name: "中芯国际", digits: "688981" },
    { code: "510300.SH", name: "沪深300ETF", digits: "510300", type: "etf", etfType: "equity" },
    { code: "510050.SH", name: "上证50ETF", digits: "510050", type: "etf", etfType: "equity" },
    { code: "510500.SH", name: "中证500ETF", digits: "510500", type: "etf", etfType: "equity" },
    { code: "159915.SZ", name: "创业板ETF", digits: "159915", type: "etf", etfType: "equity" },
    { code: "588000.SH", name: "科创50ETF", digits: "588000", type: "etf", etfType: "equity" },
    { code: "512880.SH", name: "证券ETF", digits: "512880", type: "etf", etfType: "equity" },
    { code: "513100.SH", name: "纳指ETF", digits: "513100", type: "etf", etfType: "cross" },
    { code: "159920.SZ", name: "恒生ETF", digits: "159920", type: "etf", etfType: "cross" },
    { code: "518880.SH", name: "黄金ETF", digits: "518880", type: "etf", etfType: "gold" },
    { code: "511010.SH", name: "国债ETF", digits: "511010", type: "etf", etfType: "bond" },
  ];

  /** @type {{code:string,name:string,digits:string}} */
  let selected = UNIVERSE[0];
  let editing = false;

  function lookupByCode(code) {
    const c = String(code || "").toUpperCase().trim();
    return UNIVERSE.find((r) => r.code.toUpperCase() === c) || null;
  }

  function normalizeQuery(raw) {
    return String(raw || "")
      .replace(/\s/g, "")
      .replace(/[^\d]/g, "");
  }

  function parseCodeToken(raw) {
    const t = String(raw || "").trim().toUpperCase();
    const m = t.match(/^(\d{6})\.(SZ|SH)/);
    if (m) return `${m[1]}.${m[2]}`;
    return "";
  }

  function searchSymbols(query) {
    const q = normalizeQuery(query);
    if (!q) return [];
    return UNIVERSE.filter((row) => row.digits.includes(q) || row.code.replace(".", "").includes(q)).slice(0, 12);
  }

  function displayText(row) {
    return `${row.code} ${row.name}`;
  }

  function setSelected(row, opts = {}) {
    if (!row) return;
    selected = row;
    const input = document.getElementById("input-symbol");
    if (input && !opts.editMode) {
      input.value = displayText(row);
      input.dataset.symbolCode = row.code;
    }
  }

  function resolveFromDigits(digits) {
    const d = normalizeQuery(digits).slice(0, 6);
    if (d.length < 6) return null;
    const matches = UNIVERSE.filter((r) => r.digits === d);
    if (!matches.length) return null;
    if (selected && matches.some((m) => m.code === selected.code)) return selected;
    return matches[0];
  }

  function commitFromInput(input) {
    const raw = input.value.trim();
    let row = null;
    const codeTok = parseCodeToken(raw.split(/\s+/)[0] || raw);
    if (codeTok) row = lookupByCode(codeTok);
    if (!row) {
      const digits = normalizeQuery(raw);
      if (digits.length >= 6) row = resolveFromDigits(digits);
    }
    if (!row && selected) row = selected;
    if (row) {
      setSelected(row);
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    setSelected(selected);
    return false;
  }

  function getSymbolCode() {
    return selected?.code || "000001.SZ";
  }

  function getSymbolName() {
    return selected?.name || "";
  }

  function getSelected() {
    return selected ? { ...selected } : null;
  }

  function setSymbolByCode(code) {
    const row = lookupByCode(code) || UNIVERSE[0];
    setSelected(row);
  }

  function initSymbolSearch() {
    const input = /** @type {HTMLInputElement} */ (document.getElementById("input-symbol"));
    const list = document.getElementById("symbol-search-list");
    if (!input || !list) return;

    const initial = lookupByCode(input.value) || lookupByCode("000001.SZ") || UNIVERSE[0];
    setSelected(initial);

    let results = [];
    let active = -1;
    let listOpen = false;

    const setListOpen = (on) => {
      listOpen = on;
      list.hidden = !on;
      input.setAttribute("aria-expanded", on ? "true" : "false");
    };

    const renderList = () => {
      if (!results.length) {
        list.innerHTML = "";
        setListOpen(false);
        return;
      }
      list.innerHTML = results
        .map(
          (r, i) =>
            `<li class="symbol-search-item${i === active ? " active" : ""}" role="option" data-idx="${i}" aria-selected="${i === active}"><span class="mono symbol-search-code">${r.code}</span><span class="symbol-search-name">${r.name}</span></li>`
        )
        .join("");
      setListOpen(true);
      list.querySelectorAll(".symbol-search-item").forEach((el) => {
        el.addEventListener("mousedown", (e) => {
          e.preventDefault();
          const idx = parseInt(el.getAttribute("data-idx") || "-1", 10);
          if (idx >= 0) pickIndex(idx);
        });
      });
    };

    const pickIndex = (idx) => {
      const row = results[idx];
      if (!row) return;
      editing = false;
      setSelected(row);
      setListOpen(false);
      active = -1;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const refresh = () => {
      const q = input.value.trim();
      if (!q) {
        results = [];
        active = -1;
        setListOpen(false);
        return;
      }
      results = searchSymbols(q);
      active = results.length ? 0 : -1;
      renderList();
    };

    input.addEventListener("focus", () => {
      editing = true;
      input.value = selected.digits;
      input.setAttribute("maxlength", "6");
      requestAnimationFrame(() => input.select());
      if (input.value.trim()) refresh();
    });

    input.addEventListener("blur", () => {
      setTimeout(() => {
        setListOpen(false);
        editing = false;
        input.setAttribute("maxlength", "40");
        commitFromInput(input);
      }, 160);
    });

    input.addEventListener("input", () => {
      if (editing) {
        input.value = normalizeQuery(input.value).slice(0, 6);
      }
      refresh();
    });

    input.addEventListener("keydown", (e) => {
      if (!listOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        refresh();
      }
      if (e.key === "Enter") {
        if (listOpen && active >= 0) {
          e.preventDefault();
          pickIndex(active);
          input.blur();
          return;
        }
        e.preventDefault();
        commitFromInput(input);
        setListOpen(false);
        input.blur();
        return;
      }
      if (!results.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        active = Math.min(results.length - 1, active + 1);
        renderList();
        list.querySelector(".symbol-search-item.active")?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        active = Math.max(0, active - 1);
        renderList();
        list.querySelector(".symbol-search-item.active")?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Escape") {
        setListOpen(false);
      }
    });
  }

  global.SymbolSearch = {
    init: initSymbolSearch,
    search: searchSymbols,
    UNIVERSE,
    getSymbolCode,
    getSymbolName,
    getSelected,
    setSymbolByCode,
    lookupByCode,
  };
})(typeof window !== "undefined" ? window : globalThis);
