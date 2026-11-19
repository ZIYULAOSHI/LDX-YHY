/**
 * 指标管理后台 · 列表 / 详情（概览、版本、分发、权限、日志）/ 待办 / 权限管理 / 日志
 */
(function () {
  const R = window.IndicatorRegistry;
  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const st = (o) => `<span class="st" data-tone="${o.tone}">${esc(o.label)}</span>`;
  const vst = (s) => st(R.VERSION_STATUS[s]);
  const uname = (id) => esc(R.userById(id).name);
  const pct = (x) => (Number.isFinite(x) ? `${(x * 100).toFixed(1)}%` : "—");

  const ui = {
    tab: "list",
    detailId: null,
    dtab: "overview",
    expanded: new Set(),
    kpi: "all",
    chSel: new Set(),
  };

  function me() {
    return R.currentUser();
  }

  function toast(msg, type = "info") {
    const box = $("toast-region");
    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), 2400);
  }

  function result(res, okMsg) {
    if (!res.ok) {
      toast(res.reason || "操作失败", "warn");
      return false;
    }
    if (okMsg) toast(okMsg, "success");
    renderAll();
    return true;
  }

  /** 权限受控按钮：无权限时禁用并以 title 说明原因 */
  function actBtn(label, action, ind, ver, attrs, cls = "") {
    const c = R.can(me(), action, ind, ver);
    return `<button type="button" class="${cls}" ${attrs}${c.ok ? "" : ` disabled title="${esc(c.reason)}"`}>${label}</button>`;
  }

  // ---------- 身份 ----------

  function renderIdentity() {
    const u = me();
    $("identity-select").innerHTML = R.USERS.map(
      (x) => `<option value="${x.id}"${x.id === u.id ? " selected" : ""}>${esc(x.name)} · ${esc(R.ROLES[x.role].label)}</option>`
    ).join("");
    const caps = Object.entries(R.CAPS)
      .filter(([, roles]) => roles.includes(u.role))
      .map(([k]) => R.CAP_LABELS[k]);
    $("identity-banner").innerHTML = `<span>当前身份 <b>${esc(u.name)}</b>（${esc(R.ROLES[u.role].label)} · ${esc(u.team)}）· 可执行：${
      caps.length ? esc(caps.join("、")) : "仅查看"
    }</span><span class="muted small">原型演示：右上角切换身份可体验不同角色</span>`;
  }

  // ---------- 列表 ----------

  const KPIS = [
    { key: "all", label: "全部指标", test: () => true },
    { key: "online", label: "已上架", test: (i) => R.overallStatus(i).key === "online" },
    { key: "reviewing", label: "待审核", test: (i) => R.pendingVersion(i)?.status === "reviewing" },
    { key: "integrating", label: "接入中 / 待发布", test: (i) => ["integrating", "ready"].includes(R.pendingVersion(i)?.status) },
    { key: "down", label: "已下架", test: (i) => R.overallStatus(i).key === "down" },
  ];

  function visibleList() {
    const u = me();
    return R.list().filter((i) => R.visibleTo(i, u));
  }

  function renderFilters() {
    const statusOpts = [
      ["", "全部状态"],
      ["online", "已上架"],
      ["ready_to_list", "待上架"],
      ["down", "已下架"],
      ["reviewing", "待审核"],
      ["integrating", "接入中"],
      ["ready", "待发布"],
      ["rejected", "已驳回"],
      ["draft", "草稿"],
      ["archived", "已归档"],
    ];
    $("f-status").innerHTML = statusOpts.map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
    $("f-category").innerHTML = `<option value="">全部分类</option>` + R.CATEGORIES.map((c) => `<option>${c}</option>`).join("");
    $("f-channel").innerHTML = `<option value="">全部渠道</option>` + R.CHANNELS.map((c) => `<option value="${c.key}">${c.label} 在架</option>`).join("");
  }

  function renderList() {
    const all = visibleList();
    $("kpi-row").innerHTML = KPIS.map(
      (k) => `<button type="button" class="panel kpi" data-kpi="${k.key}" aria-pressed="${ui.kpi === k.key}"><span>${k.label}</span><strong>${all.filter(k.test).length}</strong></button>`
    ).join("");
    const kw = $("f-keyword").value.trim().toLowerCase();
    const fs = $("f-status").value;
    const fc = $("f-category").value;
    const fch = $("f-channel").value;
    const mine = $("f-mine").checked;
    const u = me();
    const kpi = KPIS.find((k) => k.key === ui.kpi) || KPIS[0];
    const rows = all.filter((i) => {
      if (!kpi.test(i)) return false;
      if (kw && !`${i.name} ${i.code} ${i.summary} ${i.displayName}`.toLowerCase().includes(kw)) return false;
      if (fs && R.overallStatus(i).key !== fs) return false;
      if (fc && i.category !== fc) return false;
      if (fch && !["on", "gray"].includes(i.channels[fch]?.status)) return false;
      if (mine && i.owner !== u.id && !i.collaborators.some((c) => c.userId === u.id)) return false;
      return true;
    });
    $("f-summary").textContent = `共 ${rows.length} 个`;
    $("ind-tbody").innerHTML = rows.length
      ? rows
          .map((i) => {
            const prod = R.prodVersionOf(i);
            const latest = R.latestVersion(i);
            return `<tr data-open="${i.id}">
          <td><div class="ind-name"><strong>${esc(i.name)}</strong><small class="mono">${esc(i.code)}</small></div></td>
          <td>${esc(i.category)}</td>
          <td>${st(R.overallStatus(i))}</td>
          <td>${prod ? `<b>v${prod.no}</b>` : '<span class="muted">—</span>'}</td>
          <td>${latest ? `v${latest.no} ${latest.no !== prod?.no ? vst(latest.status) : ""}` : "—"}</td>
          <td><div class="ch-dots">${R.CHANNELS.map(
            (c) => `<span class="ch-dot" data-st="${i.channels[c.key].status}" title="${c.label}：${R.CHANNEL_STATUS[i.channels[c.key].status].label}">${c.label.replace(/^手机 |客户端|版$/g, "").replace("开放接口", "API")}</span>`
          ).join("")}</div></td>
          <td>${uname(i.owner)}</td>
          <td class="muted">${R.fmtTime(i.updatedAt)}</td>
        </tr>`;
          })
          .join("")
      : `<tr><td colspan="8" class="empty-cell">没有符合条件的指标</td></tr>`;
  }

  // ---------- 待办 ----------

  function todoGroups() {
    const u = me();
    const list = visibleList().filter((i) => !i.archived);
    const groups = [
      {
        key: "review",
        title: "待审核",
        role: "reviewer",
        items: list.filter((i) => R.pendingVersion(i)?.status === "reviewing"),
        act: (i) => actBtn("审核", "review", i, R.pendingVersion(i), `data-act="review" data-id="${i.id}" data-v="${R.pendingVersion(i).no}"`, "primary btn-sm"),
      },
      {
        key: "integrate",
        title: "待研发接入",
        role: "engineer",
        items: list.filter((i) => R.pendingVersion(i)?.status === "integrating"),
        act: (i) => actBtn("回填接入结果", "integrate", i, R.pendingVersion(i), `data-act="integrate" data-id="${i.id}" data-v="${R.pendingVersion(i).no}"`, "primary btn-sm"),
      },
      {
        key: "prod",
        title: "待设为生产版本",
        role: "operator",
        items: list.filter((i) => R.pendingVersion(i)?.status === "ready"),
        act: (i) => actBtn("设为生产", "setProd", i, R.pendingVersion(i), `data-act="setProd" data-id="${i.id}" data-v="${R.pendingVersion(i).no}"`, "primary btn-sm"),
      },
      {
        key: "list",
        title: "有生产版本但未上架",
        role: "operator",
        items: list.filter((i) => i.prodVersion && !R.liveChannels(i).length),
        act: (i) => actBtn("去上架", "channel", i, null, `data-act="channel" data-id="${i.id}" data-op="on"`, "btn-sm"),
      },
      {
        key: "rejected",
        title: "被驳回待修改",
        role: "author",
        items: list.filter((i) => R.pendingVersion(i)?.status === "rejected" && (i.owner === u.id || i.collaborators.some((c) => c.userId === u.id && c.role === "editor"))),
        act: (i) => `<a href="./index.html?indicator=${i.id}&v=${R.pendingVersion(i).no}"><button type="button" class="btn-sm">在工作台修改</button></a>`,
      },
    ];
    return groups.map((g) => ({ ...g, mine: u.role === g.role || u.role === "admin" }));
  }

  function renderTodo() {
    const groups = todoGroups();
    const mineCount = groups.filter((g) => g.mine).reduce((s, g) => s + g.items.length, 0);
    $("todo-count").textContent = mineCount;
    $("todo-count").classList.toggle("hot", mineCount > 0);
    const ordered = [...groups.filter((g) => g.mine), ...groups.filter((g) => !g.mine)];
    $("pane-todo").innerHTML = ordered
      .map(
        (g) => `<div class="card todo-group">
        <div class="card-head"><h3>${g.title} <span class="count">${g.items.length}</span></h3><span class="muted">${g.mine ? "当前身份负责" : `由「${R.ROLES[g.role].label}」处理`}</span></div>
        ${
          g.items.length
            ? `<div class="table-scroll"><table><thead><tr><th>指标</th><th>版本</th><th>说明</th><th>提交人</th><th>时间</th><th>操作</th></tr></thead><tbody>${g.items
                .map((i) => {
                  const v = g.key === "list" ? R.prodVersionOf(i) : R.pendingVersion(i);
                  return `<tr><td><a href="#" data-open-link="${i.id}"><div class="ind-name"><strong>${esc(i.name)}</strong><small class="mono">${esc(i.code)}</small></div></a></td>
                  <td>v${v.no} ${vst(v.status)}</td>
                  <td style="white-space:normal;max-width:320px">${esc(v.review?.result === "reject" ? "驳回意见：" + v.review.comment : v.note)}</td>
                  <td>${uname(v.createdBy)}</td><td class="muted">${R.fmtTime(v.createdAt)}</td><td>${g.act(i)}</td></tr>`;
                })
                .join("")}</tbody></table></div>`
            : `<p class="muted small">暂无</p>`
        }
      </div>`
      )
      .join("");
  }

  // ---------- 权限管理 ----------

  function renderPerm() {
    const roles = Object.keys(R.ROLES);
    $("perm-matrix").innerHTML = `<thead><tr><th>能力</th>${roles.map((r) => `<th>${R.ROLES[r].label}</th>`).join("")}</tr></thead><tbody>${Object.entries(R.CAPS)
      .map(
        ([k, rs]) => `<tr><td>${R.CAP_LABELS[k]}</td>${roles.map((r) => `<td>${rs.includes(r) ? '<span class="perm-yes">✓</span>' : '<span class="perm-no">—</span>'}</td>`).join("")}</tr>`
      )
      .join("")}</tbody>`;
    const canEdit = R.CAPS.members.includes(me().role);
    $("member-table").innerHTML = `<thead><tr><th>成员</th><th>团队</th><th>角色</th><th>职责</th></tr></thead><tbody>${R.USERS.map(
      (u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.team)}</td><td><select data-role-user="${u.id}"${canEdit ? "" : ' disabled title="仅平台管理员可调整角色"'}>${roles
        .map((r) => `<option value="${r}"${u.role === r ? " selected" : ""}>${R.ROLES[r].label}</option>`)
        .join("")}</select></td><td class="muted" style="white-space:normal">${esc(R.ROLES[u.role].desc)}</td></tr>`
    ).join("")}</tbody>`;
  }

  // ---------- 日志 ----------

  function renderLogs() {
    const list = visibleList();
    const all = list.flatMap((i) => i.logs.map((l) => ({ ...l, ind: i }))).sort((a, b) => b.ts - a.ts);
    const actSel = $("log-filter-action");
    const indSel = $("log-filter-ind");
    const curA = actSel.value;
    const curI = indSel.value;
    const actions = [...new Set(all.map((l) => l.action))];
    actSel.innerHTML = `<option value="">全部操作</option>` + actions.map((a) => `<option${a === curA ? " selected" : ""}>${esc(a)}</option>`).join("");
    indSel.innerHTML = `<option value="">全部指标</option>` + list.map((i) => `<option value="${i.id}"${i.id === curI ? " selected" : ""}>${esc(i.name)}</option>`).join("");
    const rows = all.filter((l) => (!curA || l.action === curA) && (!curI || l.ind.id === curI));
    $("log-tbody").innerHTML = rows.length
      ? rows
          .map(
            (l) => `<tr><td class="muted">${R.fmtTime(l.ts)}</td><td><a href="#" data-open-link="${l.ind.id}">${esc(l.ind.name)}</a></td><td><b>${esc(l.action)}</b></td><td>${uname(l.user)}</td><td style="white-space:normal">${esc(l.detail)}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="5" class="empty-cell">暂无日志</td></tr>`;
  }

  // ---------- 详情 ----------

  function openDetail(id, tab) {
    ui.detailId = id;
    ui.dtab = tab || "overview";
    ui.expanded = new Set();
    ui.chSel = new Set();
    $("detail-overlay").hidden = false;
    renderDetail();
  }

  function closeDetail() {
    ui.detailId = null;
    $("detail-overlay").hidden = true;
    history.replaceState(null, "", location.pathname);
  }

  function renderDetail() {
    if (!ui.detailId) return;
    const ind = R.get(ui.detailId);
    if (!ind) return closeDetail();
    const prod = R.prodVersionOf(ind);
    $("detail-title").innerHTML = `${esc(ind.name)} ${st(R.overallStatus(ind))}`;
    $("detail-meta").innerHTML = `<span class="mono">${esc(ind.code)}</span><span>负责人 ${uname(ind.owner)}</span><span>生产版本 ${
      prod ? "v" + prod.no : "—"
    }</span><span>在架渠道 ${R.liveChannels(ind).length} / ${R.CHANNELS.length}</span><span>更新于 ${R.fmtTime(ind.updatedAt)}</span>`;
    const latest = R.latestVersion(ind);
    const editC = R.can(me(), "edit", ind);
    $("detail-actions").innerHTML = `${
      editC.ok
        ? `<a href="./index.html?indicator=${ind.id}&v=${latest?.no || ""}"><button type="button" class="primary btn-sm">在工作台编辑</button></a>`
        : `<button type="button" class="btn-sm" disabled title="${esc(editC.reason)}">在工作台编辑</button>`
    }${actBtn("归档", "archive", ind, null, `data-act="archive" data-id="${ind.id}"`, "btn-sm danger-button")}`;
    document.querySelectorAll("[data-dtab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.dtab === ui.dtab)));
    const body = $("detail-body");
    body.innerHTML = { overview: overviewHtml, versions: versionsHtml, channels: channelsHtml, acl: aclHtml, logs: logsHtml }[ui.dtab](ind);
  }

  function flowHtml(ind) {
    const p = R.pendingVersion(ind);
    const v = p || R.prodVersionOf(ind) || R.latestVersion(ind);
    if (!v) return "";
    const live = R.liveChannels(ind).length;
    const order = ["draft", "reviewing", "integrating", "ready", "online"];
    let idx = order.indexOf(v.status);
    if (v.status === "retired") idx = 4;
    const failAt = v.status === "rejected" ? (v.integration?.result === "failed" ? 2 : 1) : -1;
    if (failAt > 0) idx = failAt;
    const steps = [
      { t: "保存版本", d: `${uname(v.createdBy)} · ${R.fmtTime(v.createdAt)}` },
      { t: "审核", d: v.review ? `${uname(v.review.by)} · ${v.review.result === "pass" ? "通过" : "驳回"}` : "审核员" },
      { t: "研发接入", d: v.integration ? `${uname(v.integration.by)} · ${v.integration.result === "done" ? "完成" : "失败"}` : "语义转换 · 云端计算" },
      { t: "设为生产", d: v.publishedAt ? R.fmtTime(v.publishedAt) : "发布运营" },
      { t: "渠道上架", d: live ? `${live} 个渠道在架` : "按渠道全量 / 灰度" },
    ];
    const stateOf = (i) => {
      if (i === failAt) return "fail";
      if (i === 4) return live && v.status === "online" ? "done" : idx >= 4 ? "current" : "todo";
      if (i < idx || (i === idx && v.status === "online")) return "done";
      return i === idx ? "current" : "todo";
    };
    let next = "";
    const tag = `data-id="${ind.id}" data-v="${v.no}"`;
    if (v.status === "draft") next = `等待提交审核 · ${actBtn("提交审核", "submit", ind, v, `data-act="submit" ${tag}`, "primary btn-sm")}`;
    else if (v.status === "rejected")
      next = `<span style="color:#bd4c59">${v.integration?.result === "failed" ? "研发接入失败" : "审核驳回"}：${esc(v.integration?.result === "failed" ? v.integration.note : v.review?.comment)}</span> · 修改后重新提交`;
    else if (v.status === "reviewing") next = `等待审核员处理 · ${actBtn("审核", "review", ind, v, `data-act="review" ${tag}`, "primary btn-sm")} ${actBtn("撤回", "withdraw", ind, v, `data-act="withdraw" ${tag}`, "btn-sm")}`;
    else if (v.status === "integrating") next = `等待研发完成语义转换与历史回算 · ${actBtn("回填接入结果", "integrate", ind, v, `data-act="integrate" ${tag}`, "primary btn-sm")}`;
    else if (v.status === "ready") next = `接入完成，等待设为生产版本 · ${actBtn("设为生产", "setProd", ind, v, `data-act="setProd" ${tag}`, "primary btn-sm")}`;
    else if (!live) next = `已是生产版本，尚未上架任何渠道 · ${actBtn("去上架", "channel", ind, null, `data-act="channel" data-id="${ind.id}" data-op="on"`, "primary btn-sm")}`;
    else next = `生产运行中，修改公式请在工作台生成新版本`;
    return `<div class="card">
      <div class="card-head"><h3>发布流转 · v${v.no}</h3>${vst(v.status)}<span class="muted">${esc(v.note)}</span></div>
      <ol class="flow-track">${steps.map((s, i) => `<li data-state="${stateOf(i)}"><b>${s.t}</b>${s.d}</li>`).join("")}</ol>
      <div class="hint-banner" style="margin:12px 0 0">${next}</div>
    </div>`;
  }

  function outputsTable(v) {
    return `<div class="table-scroll"><table><thead><tr><th>字段编码</th><th>展示名</th><th>类型</th><th>窗格</th><th>精度</th><th>下发</th></tr></thead><tbody>${(v.outputs || [])
      .map(
        (o) => `<tr><td class="mono">${esc(o.key)}</td><td>${esc(o.label)}</td><td>${o.kind === "signal" ? "信号" : "数值"}</td><td>${o.pane === "sub" ? "副图" : "主图"}</td><td>${o.precision}</td><td>${
          o.publish ? '<span class="perm-yes">✓</span>' : '<span class="perm-no">—</span>'
        }</td></tr>`
      )
      .join("")}</tbody></table></div>`;
  }

  function paramsTable(v) {
    const rows = Object.entries(v.paramMeta || {});
    return rows.length
      ? `<div class="table-scroll"><table><thead><tr><th>参数</th><th>默认值</th><th>C 端可调范围</th><th>步长</th></tr></thead><tbody>${rows
          .map(([k, m]) => `<tr><td class="mono">${esc(k)}</td><td>${m.def}</td><td>${m.min} ~ ${m.max}</td><td>${m.step}</td></tr>`)
          .join("")}</tbody></table></div>`
      : `<p class="muted small">无可调参数</p>`;
  }

  function overviewHtml(ind) {
    const prod = R.prodVersionOf(ind);
    const v = prod || R.latestVersion(ind);
    const canBasic = R.can(me(), "edit", ind).ok || R.can(me(), "channel", ind).ok;
    const calc = v?.calc || {};
    const ev = v?.evidence;
    return `${flowHtml(ind)}
      <div class="card">
        <div class="card-head"><h3>基本信息与 C 端展示</h3><div class="actions">${
          canBasic ? `<button type="button" class="btn-sm" data-act="basic" data-id="${ind.id}">编辑展示信息</button>` : ""
        }</div></div>
        <dl class="kv">
          <div><dt>指标编码</dt><dd class="mono">${esc(ind.code)}</dd></div>
          <div><dt>C 端展示名</dt><dd>${esc(ind.displayName)}</dd></div>
          <div><dt>分类</dt><dd>${esc(ind.category)}</dd></div>
          <div><dt>负责人</dt><dd>${uname(ind.owner)}</dd></div>
          <div><dt>可见范围</dt><dd>${esc(R.VISIBILITY[ind.visibility])}</dd></div>
          <div><dt>创建时间</dt><dd>${R.fmtTime(ind.createdAt)}</dd></div>
          <div style="grid-column:1/-1"><dt>简介</dt><dd>${esc(ind.summary) || '<span class="muted">未填写</span>'}</dd></div>
        </dl>
      </div>
      ${
        v
          ? `<div class="grid-2">
        <div class="card"><div class="card-head"><h3>下发契约 · 输出字段</h3><span class="muted">v${v.no}${prod ? "（生产）" : "（未发布）"}</span></div>${outputsTable(v)}</div>
        <div class="card"><div class="card-head"><h3>参数</h3><span class="muted">C 端用户仅能在范围内调整</span></div>${paramsTable(v)}</div>
      </div>
      <div class="grid-2">
        <div class="card"><div class="card-head"><h3>云端计算配置</h3></div>
          <dl class="kv" style="grid-template-columns:repeat(2,minmax(0,1fr))">
            <div><dt>适用周期</dt><dd>${(calc.periods || []).map((p) => R.PERIODS.find((x) => x.key === p)?.label || p).join("、")}</dd></div>
            <div><dt>标的范围</dt><dd>${esc(R.UNIVERSES[calc.universe] || "—")}</dd></div>
            <div><dt>计算方式</dt><dd>${esc(R.TRIGGERS[calc.trigger] || "—")}</dd></div>
            <div><dt>历史回溯</dt><dd>${calc.lookback || "—"} 根</dd></div>
          </dl>
        </div>
        <div class="card"><div class="card-head"><h3>分发标识</h3><span class="muted">接口协议由研发定义，此处仅约定标识</span></div>
          <dl class="kv" style="grid-template-columns:repeat(2,minmax(0,1fr))">
            <div><dt>订阅标识</dt><dd class="mono">${esc(ind.code)}${prod ? "@v" + prod.no : ""}</dd></div>
            <div><dt>版本策略</dt><dd>C 端默认跟随生产版本；可锁定版本号</dd></div>
            <div style="grid-column:1/-1"><dt>回测附件</dt><dd>${
              ev ? `夏普 ${ev.sharpe != null ? ev.sharpe.toFixed(2) : "—"} · 年化 ${pct(ev.ann)} · 最大回撤 ${pct(ev.mdd)} · ${ev.trades} 笔 · ${esc(ev.symbol || "")} ${esc(ev.period || "")}` : '<span class="muted">无</span>'
            }</dd></div>
          </dl>
        </div>
      </div>`
          : ""
      }`;
  }

  function versionsHtml(ind) {
    const prod = R.prodVersionOf(ind);
    const rows = [...ind.versions].reverse();
    return `<div class="hint-banner">版本保存后<b>不可修改</b>；同一指标同时只允许 1 个在途版本（草稿 / 待审核 / 接入中 / 待发布）。生产版本被替换后转为历史版本，可回滚。</div>
    <div class="card" style="padding:0"><div class="table-scroll" style="border:0"><table>
      <thead><tr><th>版本</th><th>状态</th><th>说明</th><th>提交人</th><th>提交时间</th><th>审核</th><th>接入</th><th>操作</th></tr></thead>
      <tbody>${rows
        .map((v) => {
          const tag = `data-id="${ind.id}" data-v="${v.no}"`;
          const acts = [];
          acts.push(`<button type="button" data-act="expand" ${tag}>${ui.expanded.has(v.no) ? "收起" : "源码 / 对比"}</button>`);
          if (["draft", "rejected"].includes(v.status)) acts.push(actBtn("提交审核", "submit", ind, v, `data-act="submit" ${tag}`, "primary"));
          if (v.status === "reviewing") {
            acts.push(actBtn("审核", "review", ind, v, `data-act="review" ${tag}`, "primary"));
            acts.push(actBtn("撤回", "withdraw", ind, v, `data-act="withdraw" ${tag}`));
          }
          if (v.status === "integrating") acts.push(actBtn("回填接入", "integrate", ind, v, `data-act="integrate" ${tag}`, "primary"));
          if (v.status === "ready") acts.push(actBtn("设为生产", "setProd", ind, v, `data-act="setProd" ${tag}`, "primary"));
          if (v.status === "retired") acts.push(actBtn("回滚到此版本", "rollback", ind, v, `data-act="rollback" ${tag}`));
          const main = `<tr>
            <td><b>v${v.no}</b>${v.no === prod?.no ? ' <span class="tag teal">生产</span>' : ""}</td>
            <td>${vst(v.status)}</td>
            <td style="white-space:normal;max-width:220px">${esc(v.note)}</td>
            <td>${uname(v.createdBy)}</td>
            <td class="muted">${R.fmtTime(v.createdAt)}</td>
            <td>${v.review ? `${uname(v.review.by)} ${v.review.result === "pass" ? "通过" : '<span style="color:#bd4c59">驳回</span>'}` : '<span class="muted">—</span>'}</td>
            <td>${v.integration ? `${uname(v.integration.by)} ${v.integration.result === "done" ? "完成" : '<span style="color:#bd4c59">失败</span>'}` : '<span class="muted">—</span>'}</td>
            <td><div class="ver-actions">${acts.join("")}</div></td>
          </tr>`;
          if (!ui.expanded.has(v.no)) return main;
          return main + `<tr class="ver-row-expand"><td colspan="8">${versionExpandHtml(ind, v, prod)}</td></tr>`;
        })
        .join("")}</tbody></table></div></div>`;
  }

  function versionExpandHtml(ind, v, prod) {
    const canSrc = R.can(me(), "viewSource", ind).ok || ind.owner === me().id;
    const notes = [];
    if (v.review?.comment) notes.push(`<b>审核意见</b>（${uname(v.review.by)}）：${esc(v.review.comment)}`);
    if (v.integration?.note) notes.push(`<b>接入备注</b>（${uname(v.integration.by)}）：${esc(v.integration.note)}`);
    const cmp = prod && prod.no !== v.no ? prod : null;
    let diffBlock = "";
    if (cmp && canSrc) {
      const od = R.diffOutputs(cmp.outputs, v.outputs);
      const lines = R.lineDiff(cmp.source, v.source);
      diffBlock = `<div><div class="card-head" style="margin:0 0 6px"><h3>与生产 v${cmp.no} 对比</h3>${
        od.breaking ? '<span class="st" data-tone="danger">含破坏性字段变更</span>' : '<span class="st" data-tone="teal">字段兼容</span>'
      }<span class="muted">${[od.added.length ? "新增 " + od.added.join("、") : "", od.removed.length ? "删除 " + od.removed.join("、") : ""].filter(Boolean).join("；")}</span></div>
      <div class="diff-block mono">${lines.map((l) => `<div data-t="${l.t}">${l.t === "=" ? "  " : l.t + " "}${esc(l.s)}</div>`).join("")}</div></div>`;
    }
    return `${notes.length ? `<p class="small" style="margin-bottom:8px">${notes.join("<br />")}</p>` : ""}
      <div class="grid-2">
        <div><div class="card-head" style="margin:0 0 6px"><h3>v${v.no} 源码</h3><span class="muted mono">hash ${esc(v.hash)}</span></div>${
          canSrc ? `<pre class="code-block mono">${esc(v.source)}</pre>` : `<p class="muted small">当前身份无权查看源码</p>`
        }</div>
        ${diffBlock || `<div><div class="card-head" style="margin:0 0 6px"><h3>输出字段</h3></div>${outputsTable(v)}</div>`}
      </div>`;
  }

  function channelsHtml(ind) {
    const prod = R.prodVersionOf(ind);
    const canCh = R.can(me(), "channel", ind);
    const sel = [...ui.chSel];
    const batch = canCh.ok
      ? `<div class="actions"><span class="muted small">已选 ${sel.length} 个</span>
          <button type="button" class="btn-sm primary" data-act="channel" data-id="${ind.id}" data-op="on" data-batch="1"${sel.length ? "" : " disabled"}>批量上架</button>
          <button type="button" class="btn-sm" data-act="channel" data-id="${ind.id}" data-op="gray" data-batch="1"${sel.length ? "" : " disabled"}>批量灰度</button>
          <button type="button" class="btn-sm danger-button" data-act="channel" data-id="${ind.id}" data-op="down" data-batch="1"${sel.length ? "" : " disabled"}>批量下架</button></div>`
      : `<div class="actions"><span class="muted small">${esc(canCh.reason)}</span></div>`;
    return `<div class="hint-banner">渠道上架的始终是<b>生产版本${prod ? " v" + prod.no : ""}</b>；设新生产版本后，在架渠道自动切换。下架分「软下架」（已添加用户继续可用、新用户不可见）与「硬下架」（立即停止下发、C 端隐藏）。</div>
    <div class="card" style="padding:0">
      <div class="card-head" style="padding:12px 16px 0"><h3>渠道分发</h3>${batch}</div>
      <div class="table-scroll" style="border:0;border-top:1px solid var(--border);margin-top:10px"><table class="ch-table">
        <thead><tr><th style="width:30px"></th><th>渠道</th><th>状态</th><th>线上版本</th><th>放量范围</th><th>最近变更</th><th>操作</th></tr></thead>
        <tbody>${R.CHANNELS.map((c) => {
          const ch = ind.channels[c.key];
          const live = ["on", "gray"].includes(ch.status);
          const range =
            ch.status === "on"
              ? "全量"
              : ch.status === "gray"
                ? `<span class="gray-bar"><i style="width:${ch.grayPct}%"></i></span>${ch.grayPct}%${ch.whitelist ? " · " + esc(ch.whitelist) : ""}`
                : ch.status === "down"
                  ? `${ch.downMode === "hard" ? "硬下架" : "软下架"} · ${esc(ch.reason)}`
                  : '<span class="muted">—</span>';
          const tag = `data-act="channel" data-id="${ind.id}" data-ch="${c.key}"`;
          const ops = canCh.ok
            ? [
                ch.status !== "on" ? `<button type="button" class="btn-sm" ${tag} data-op="on">全量上架</button>` : "",
                ch.status !== "on" ? `<button type="button" class="btn-sm" ${tag} data-op="gray">${ch.status === "gray" ? "调整灰度" : "灰度"}</button>` : "",
                live ? `<button type="button" class="btn-sm danger-button" ${tag} data-op="down">下架</button>` : "",
              ].join("")
            : "";
          return `<tr>
            <td><input type="checkbox" data-ch-sel="${c.key}"${ui.chSel.has(c.key) ? " checked" : ""}${canCh.ok ? "" : " disabled"} aria-label="选择 ${c.label}" /></td>
            <td class="ch-name"><strong>${c.label}</strong><small>${c.desc}</small></td>
            <td>${st(R.CHANNEL_STATUS[ch.status])}</td>
            <td>${live && prod ? "v" + prod.no : '<span class="muted">—</span>'}</td>
            <td style="white-space:normal;max-width:260px">${range}</td>
            <td class="muted">${ch.updatedAt ? `${R.fmtTime(ch.updatedAt)} · ${uname(ch.updatedBy)}` : "—"}</td>
            <td><div class="ver-actions">${ops || '<span class="muted small">—</span>'}</div></td>
          </tr>`;
        }).join("")}</tbody>
      </table></div>
    </div>
    <div class="kill-switch">
      <p><b>全渠道紧急下架</b>：发现计算错误或合规风险时使用，所有在架渠道立即硬下架、停止下发。</p>
      ${actBtn("紧急下架", "channel", ind, null, `data-act="kill" data-id="${ind.id}"${R.liveChannels(ind).length ? "" : " disabled"}`, "danger-button")}
    </div>`;
  }

  function aclHtml(ind) {
    const c = R.can(me(), "acl", ind);
    const dis = c.ok ? "" : ` disabled title="${esc(c.reason)}"`;
    const others = R.USERS.filter((u) => u.id !== ind.owner);
    return `${c.ok ? "" : `<div class="hint-banner">${esc(c.reason)}，以下为只读视图</div>`}
    <div class="grid-2">
      <div class="card">
        <div class="card-head"><h3>负责人</h3></div>
        <p style="margin-bottom:10px"><b>${uname(ind.owner)}</b> <span class="muted small">${esc(R.userById(ind.owner).team)} · ${esc(R.ROLES[R.userById(ind.owner).role].label)}</span></p>
        <div style="display:flex;gap:8px">
          <select id="acl-transfer"${dis}>${others.map((u) => `<option value="${u.id}">${esc(u.name)}（${esc(R.ROLES[u.role].label)}）</option>`).join("")}</select>
          <button type="button" class="btn-sm" data-act="transfer" data-id="${ind.id}"${dis}>移交负责人</button>
        </div>
        <p class="muted small" style="margin-top:6px">移交后原负责人自动成为编辑协作者。</p>
      </div>
      <div class="card">
        <div class="card-head"><h3>可见范围</h3></div>
        <div class="radio-row">${Object.entries(R.VISIBILITY)
          .map(([k, v]) => `<label class="radio-card"><input type="radio" name="acl-vis" value="${k}"${ind.visibility === k ? " checked" : ""}${dis} /><span><b>${v}</b></span></label>`)
          .join("")}</div>
        <button type="button" class="btn-sm" style="margin-top:10px" data-act="visibility" data-id="${ind.id}"${dis}>保存可见范围</button>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><h3>协作者</h3><span class="muted">编辑：可保存版本并提交审核；只读：可看源码与版本</span></div>
      <div class="table-scroll"><table><thead><tr><th>成员</th><th>平台角色</th><th>指标权限</th><th>操作</th></tr></thead><tbody>${
        ind.collaborators.length
          ? ind.collaborators
              .map(
                (x) => `<tr><td>${uname(x.userId)}</td><td>${esc(R.ROLES[R.userById(x.userId).role].label)}</td><td>${x.role === "editor" ? "可编辑" : "只读"}</td><td><button type="button" class="btn-sm danger-button" data-act="rmcollab" data-id="${ind.id}" data-u="${x.userId}"${dis}>移除</button></td></tr>`
              )
              .join("")
          : `<tr><td colspan="4" class="muted">暂无协作者</td></tr>`
      }</tbody></table></div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <select id="acl-add-user"${dis}>${others.map((u) => `<option value="${u.id}">${esc(u.name)}</option>`).join("")}</select>
        <select id="acl-add-role"${dis}><option value="editor">可编辑</option><option value="viewer">只读</option></select>
        <button type="button" class="btn-sm primary" data-act="addcollab" data-id="${ind.id}"${dis}>添加协作者</button>
      </div>
    </div>`;
  }

  function logsHtml(ind) {
    return `<div class="card"><ul class="timeline">${[...ind.logs]
      .reverse()
      .map((l) => `<li><div class="tl-head"><b>${esc(l.action)}</b><span>${uname(l.user)}</span><span class="muted small">${R.fmtTime(l.ts)}</span></div><div class="tl-detail">${esc(l.detail)}</div></li>`)
      .join("")}</ul></div>`;
  }

  // ---------- 操作弹窗 ----------

  let actOk = null;

  function openAct({ title, meta, body, okText = "确定", danger = false, onOk }) {
    $("act-title").textContent = title;
    $("act-meta").textContent = meta || "";
    $("act-body").innerHTML = body;
    const ok = $("act-ok");
    ok.textContent = okText;
    ok.className = danger ? "danger-button" : "primary";
    actOk = onOk;
    $("act-mask").hidden = false;
  }

  function closeAct() {
    $("act-mask").hidden = true;
    actOk = null;
  }

  function versionSummary(ind, v) {
    const prod = R.prodVersionOf(ind);
    const od = prod && prod.no !== v.no ? R.diffOutputs(prod.outputs, v.outputs) : null;
    const ev = v.evidence;
    return `<dl class="kv" style="margin-bottom:12px">
      <div><dt>版本</dt><dd>v${v.no} · ${uname(v.createdBy)}</dd></div>
      <div><dt>版本说明</dt><dd>${esc(v.note) || "—"}</dd></div>
      <div><dt>输出字段</dt><dd>${v.outputs.filter((o) => o.publish).map((o) => esc(o.key)).join("、")}</dd></div>
      <div><dt>计算</dt><dd>${(v.calc?.periods || []).join("/")} · ${esc(R.UNIVERSES[v.calc?.universe] || "")} · ${v.calc?.trigger === "realtime" ? "盘中实时" : "收盘批量"}</dd></div>
      <div><dt>与生产对比</dt><dd>${od ? (od.breaking ? '<span style="color:#bd4c59">含破坏性字段变更</span>' : "字段兼容") : "首个生产版本"}</dd></div>
      <div><dt>回测附件</dt><dd>${ev ? `夏普 ${ev.sharpe != null ? ev.sharpe.toFixed(2) : "—"} · 回撤 ${pct(ev.mdd)}` : "—"}</dd></div>
    </dl>
    <details><summary class="small" style="cursor:pointer;color:var(--teal)">查看源码</summary><pre class="code-block mono" style="margin-top:6px">${esc(v.source)}</pre></details>`;
  }

  function handleAct(btn) {
    const act = btn.dataset.act;
    const id = btn.dataset.id;
    const ind = id ? R.get(id) : null;
    const vno = Number(btn.dataset.v);
    const v = ind && vno ? ind.versions.find((x) => x.no === vno) : null;
    const u = me();

    switch (act) {
      case "expand":
        ui.expanded.has(vno) ? ui.expanded.delete(vno) : ui.expanded.add(vno);
        renderDetail();
        return;
      case "submit":
        return result(R.transition(id, vno, "submit", u), `v${vno} 已提交审核`);
      case "withdraw":
        return result(R.transition(id, vno, "withdraw", u), `v${vno} 已撤回为草稿`);
      case "review":
        openAct({
          title: `审核 · ${ind.name} v${vno}`,
          meta: "审核员确认公式逻辑、输出字段与合规性；通过后进入研发接入",
          body: `${versionSummary(ind, v)}
            <div class="form-grid" style="margin-top:12px">
              <div class="radio-row">
                <label class="radio-card"><input type="radio" name="rv" value="pass" checked /><span><b>通过</b>进入研发接入</span></label>
                <label class="radio-card"><input type="radio" name="rv" value="reject" /><span><b>驳回</b>退回提交人修改</span></label>
              </div>
              <label class="field"><span>审核意见（驳回时必填）</span><textarea id="rv-comment" rows="2"></textarea></label>
            </div>`,
          okText: "提交审核结果",
          onOk: () => {
            const pass = document.querySelector('input[name="rv"]:checked').value === "pass";
            const comment = $("rv-comment").value.trim();
            if (!pass && !comment) return toast("驳回须填写意见", "warn"), false;
            return result(R.transition(id, vno, "review", u, { pass, comment }), pass ? "审核通过，已流转至研发接入" : "已驳回");
          },
        });
        return;
      case "integrate":
        openAct({
          title: `回填接入结果 · ${ind.name} v${vno}`,
          meta: "研发完成语义转换、云端计算任务与历史回算后回填；失败将退回提交人",
          body: `${versionSummary(ind, v)}
            <div class="form-grid" style="margin-top:12px">
              <div class="radio-row">
                <label class="radio-card"><input type="radio" name="ig" value="done" checked /><span><b>接入完成</b>计算结果已入库，可发布</span></label>
                <label class="radio-card"><input type="radio" name="ig" value="failed" /><span><b>接入失败</b>语义不支持或算力不足，退回</span></label>
              </div>
              <label class="field"><span>备注（回算区间、失败原因等）</span><textarea id="ig-note" rows="2" placeholder="例如：历史回算 2015-01 至今完成，字段与工作台结果抽样一致"></textarea></label>
            </div>`,
          okText: "提交",
          onOk: () => {
            const done = document.querySelector('input[name="ig"]:checked').value === "done";
            const note = $("ig-note").value.trim();
            if (!done && !note) return toast("失败须填写原因", "warn"), false;
            return result(R.transition(id, vno, "integrate", u, { done, note }), done ? "已标记接入完成，等待设为生产" : "已退回提交人");
          },
        });
        return;
      case "setProd":
      case "rollback": {
        const prod = R.prodVersionOf(ind);
        const live = R.liveChannels(ind);
        const od = prod ? R.diffOutputs(prod.outputs, v.outputs) : null;
        openAct({
          title: `${act === "rollback" ? "回滚" : "设为生产版本"} · ${ind.name} v${vno}`,
          meta: prod ? `当前生产 v${prod.no} 将转为历史版本` : "首个生产版本，设定后可上架渠道",
          body: `<div class="form-grid">
            ${live.length ? `<div class="notice info">在架渠道将<b>自动切换</b>到 v${vno}：${live.map((c) => c.label).join("、")}</div>` : `<div class="notice info">当前无在架渠道，设定后需到「分发与上下架」上架。</div>`}
            ${od?.breaking ? `<div class="notice warning">v${vno} 相对 v${prod.no} 删除或变更了下发字段（${[...od.removed, ...od.changed].join("、")}），请确认各端已兼容。</div>` : ""}
            <label class="field"><span>${act === "rollback" ? "回滚原因 *" : "发布备注"}</span><textarea id="sp-comment" rows="2"></textarea></label>
          </div>`,
          okText: act === "rollback" ? "确认回滚" : "确认发布",
          danger: act === "rollback",
          onOk: () => {
            const comment = $("sp-comment").value.trim();
            if (act === "rollback" && !comment) return toast("请填写回滚原因", "warn"), false;
            return result(R.transition(id, vno, act, u, { comment }), act === "rollback" ? `已回滚到 v${vno}` : `v${vno} 已设为生产版本`);
          },
        });
        return;
      }
      case "channel":
        openChannelDialog(ind, btn);
        return;
      case "kill": {
        const live = R.liveChannels(ind);
        openAct({
          title: `全渠道紧急下架 · ${ind.name}`,
          meta: `将硬下架：${live.map((c) => c.label).join("、")}`,
          body: `<label class="field"><span>原因 *</span><textarea id="kill-reason" rows="2" placeholder="例如：盘中计算结果异常"></textarea></label>`,
          okText: "立即下架",
          danger: true,
          onOk: () => {
            const reason = $("kill-reason").value.trim();
            return result(R.setChannels(id, { channels: live.map((c) => c.key), op: "down", downMode: "hard", reason }, u), "已全渠道下架");
          },
        });
        return;
      }
      case "basic":
        openAct({
          title: `编辑展示信息 · ${ind.name}`,
          meta: "展示信息不影响计算，修改即时生效，不产生新版本",
          body: `<div class="form-grid">
            <label class="field"><span>C 端展示名</span><input type="text" id="b-display" value="${esc(ind.displayName)}" maxlength="16" /></label>
            <label class="field"><span>分类</span><select id="b-cat">${R.CATEGORIES.map((c) => `<option${c === ind.category ? " selected" : ""}>${c}</option>`).join("")}</select></label>
            <label class="field"><span>简介</span><textarea id="b-summary" rows="2" maxlength="80">${esc(ind.summary)}</textarea></label>
          </div>`,
          onOk: () =>
            result(R.updateBasic(id, { displayName: $("b-display").value.trim() || ind.name, category: $("b-cat").value, summary: $("b-summary").value.trim() }, u), "已保存"),
        });
        return;
      case "archive":
        openAct({
          title: `归档 · ${ind.name}`,
          meta: "归档后不可编辑与上架，版本与日志保留可查",
          body: `<p>确认归档该指标？须先下架全部渠道。</p>`,
          okText: "归档",
          danger: true,
          onOk: () => result(R.archive(id, u), "已归档"),
        });
        return;
      case "transfer":
        return result(R.updateAcl(id, { transferOwner: $("acl-transfer").value }, u), "负责人已移交");
      case "visibility":
        return result(R.updateAcl(id, { visibility: document.querySelector('input[name="acl-vis"]:checked')?.value }, u), "可见范围已更新");
      case "addcollab":
        return result(R.updateAcl(id, { addCollaborator: { userId: $("acl-add-user").value, role: $("acl-add-role").value } }, u), "已添加协作者");
      case "rmcollab":
        return result(R.updateAcl(id, { removeCollaborator: btn.dataset.u }, u), "已移除");
      default:
    }
  }

  function openChannelDialog(ind, btn) {
    const prod = R.prodVersionOf(ind);
    const initial = btn.dataset.batch ? [...ui.chSel] : btn.dataset.ch ? [btn.dataset.ch] : R.CHANNELS.filter((c) => !["on"].includes(ind.channels[c.key].status)).map((c) => c.key);
    const op = btn.dataset.op || "on";
    const cur = btn.dataset.ch ? ind.channels[btn.dataset.ch] : null;
    openAct({
      title: `渠道上下架 · ${ind.name}`,
      meta: prod ? `生效版本：生产 v${prod.no}` : "尚无生产版本",
      body: `<div class="form-grid">
        <div class="field"><span>渠道</span><div class="ch-pick">${R.CHANNELS.map(
          (c) => `<label class="pub-check"><input type="checkbox" name="cp" value="${c.key}"${initial.includes(c.key) ? " checked" : ""} />${c.label} <span class="muted small">${R.CHANNEL_STATUS[ind.channels[c.key].status].label}</span></label>`
        ).join("")}</div></div>
        <div class="field"><span>操作</span><div class="radio-row">
          <label class="radio-card"><input type="radio" name="cop" value="on"${op === "on" ? " checked" : ""} /><span><b>全量上架</b>所有用户可见可用</span></label>
          <label class="radio-card"><input type="radio" name="cop" value="gray"${op === "gray" ? " checked" : ""} /><span><b>灰度</b>按比例或白名单放量</span></label>
          <label class="radio-card"><input type="radio" name="cop" value="down"${op === "down" ? " checked" : ""} /><span><b>下架</b>停止对新用户 / 全部用户提供</span></label>
        </div></div>
        <div id="cop-gray" class="pub-grid" style="grid-template-columns:120px 1fr">
          <label class="field"><span>放量比例 %</span><input type="number" id="cop-pct" min="1" max="99" value="${cur?.status === "gray" ? cur.grayPct : 10}" /></label>
          <label class="field"><span>白名单（用户组 / 机构，可选）</span><input type="text" id="cop-wl" value="${esc(cur?.whitelist || "")}" placeholder="例如：内测用户组、VIP 客户" /></label>
        </div>
        <div id="cop-down" class="form-grid">
          <div class="radio-row">
            <label class="radio-card"><input type="radio" name="cdm" value="soft" checked /><span><b>软下架</b>新用户不可见；已添加的用户继续可用</span></label>
            <label class="radio-card"><input type="radio" name="cdm" value="hard" /><span><b>硬下架</b>立即停止下发，C 端隐藏</span></label>
          </div>
          <label class="field"><span>下架原因 *</span><textarea id="cop-reason" rows="2"></textarea></label>
        </div>
      </div>`,
      okText: "确认",
      onOk: () => {
        const channels = [...document.querySelectorAll('input[name="cp"]:checked')].map((x) => x.value);
        if (!channels.length) return toast("请选择渠道", "warn"), false;
        const o = document.querySelector('input[name="cop"]:checked').value;
        const data = { channels, op: o };
        if (o === "gray") {
          data.grayPct = Math.max(1, Math.min(99, Number($("cop-pct").value) || 10));
          data.whitelist = $("cop-wl").value.trim();
        }
        if (o === "down") {
          data.downMode = document.querySelector('input[name="cdm"]:checked').value;
          data.reason = $("cop-reason").value.trim();
        }
        const ok = result(R.setChannels(ind.id, data, me()), { on: "已上架", gray: "已开启灰度", down: "已下架" }[o]);
        if (ok) ui.chSel.clear();
        return ok;
      },
    });
    const sync = () => {
      const o = document.querySelector('input[name="cop"]:checked')?.value;
      $("cop-gray").hidden = o !== "gray";
      $("cop-down").hidden = o !== "down";
    };
    document.querySelectorAll('input[name="cop"]').forEach((r) => r.addEventListener("change", sync));
    sync();
  }

  // ---------- 总渲染与事件 ----------

  function switchTab(tab) {
    ui.tab = tab;
    document.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    ["list", "todo", "perm", "logs"].forEach((k) => ($(`pane-${k}`).hidden = k !== tab));
  }

  function renderAll() {
    renderIdentity();
    renderList();
    renderTodo();
    renderPerm();
    renderLogs();
    renderDetail();
  }

  function bind() {
    document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));
    document.querySelectorAll("[data-dtab]").forEach((b) =>
      b.addEventListener("click", () => {
        ui.dtab = b.dataset.dtab;
        renderDetail();
      })
    );
    ["f-keyword", "f-status", "f-category", "f-channel", "f-mine"].forEach((id) => $(id).addEventListener("input", renderList));
    ["log-filter-action", "log-filter-ind"].forEach((id) => $(id).addEventListener("change", renderLogs));
    $("kpi-row").addEventListener("click", (e) => {
      const k = /** @type {HTMLElement} */ (e.target).closest("[data-kpi]");
      if (!k) return;
      ui.kpi = k.dataset.kpi;
      renderList();
    });
    $("ind-tbody").addEventListener("click", (e) => {
      const tr = /** @type {HTMLElement} */ (e.target).closest("[data-open]");
      if (tr) openDetail(tr.dataset.open);
    });
    document.addEventListener("click", (e) => {
      const t = /** @type {HTMLElement} */ (e.target);
      const link = t.closest("[data-open-link]");
      if (link) {
        e.preventDefault();
        openDetail(link.dataset.openLink);
        return;
      }
      const btn = t.closest("button[data-act]");
      if (btn && !btn.disabled) handleAct(btn);
    });
    document.addEventListener("change", (e) => {
      const t = /** @type {HTMLInputElement} */ (e.target);
      if (t.dataset.chSel) {
        t.checked ? ui.chSel.add(t.dataset.chSel) : ui.chSel.delete(t.dataset.chSel);
        renderDetail();
      }
      if (t.dataset.roleUser) result(R.setUserRole(t.dataset.roleUser, t.value, me()), "角色已更新");
    });
    $("detail-close").addEventListener("click", closeDetail);
    $("detail-overlay").addEventListener("click", (e) => e.target === $("detail-overlay") && closeDetail());
    $("act-cancel").addEventListener("click", closeAct);
    $("act-mask").addEventListener("click", (e) => e.target === $("act-mask") && closeAct());
    $("act-ok").addEventListener("click", () => {
      if (actOk && actOk() !== false) closeAct();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!$("act-mask").hidden) closeAct();
      else if (!$("detail-overlay").hidden) closeDetail();
    });
    $("identity-select").addEventListener("change", (e) => {
      R.setCurrentUser(/** @type {HTMLSelectElement} */ (e.target).value);
      const u = me();
      toast(`已切换为 ${u.name}（${R.ROLES[u.role].label}）`, "success");
      renderAll();
    });
    $("btn-reset-demo").addEventListener("click", () => {
      if (!confirm("恢复演示数据？在工作台提交的指标与所有操作记录将被清除。")) return;
      R.resetDemo();
      toast("已恢复演示数据", "success");
      renderAll();
    });
    window.addEventListener("storage", (e) => {
      if (e.key && e.key.startsWith("qlab_indicator_registry")) {
        R.reload();
        renderAll();
      }
    });
  }

  R.load();
  renderFilters();
  bind();
  renderAll();
  const qid = new URLSearchParams(location.search).get("indicator");
  if (qid && R.get(qid)) openDetail(qid);
})();
