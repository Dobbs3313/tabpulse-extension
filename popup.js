import { BillingManager } from "./lib/billing.js";
import { BILLING_CONFIG } from "./lib/billing-config.js";

const billing = new BillingManager(BILLING_CONFIG);
const GROUP_COLORS = ["blue", "purple", "cyan", "green", "orange", "pink", "yellow", "red"];
let allTabs = [];
let filteredTabs = [];
let selectedIdx = 0;
let toastTimer = null;

function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

function switchTab(name) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", p.id === `panel-${name}`));
}

function requirePro(label) {
  if (billing.isPro()) return true;
  showToast(`${label} requires TabPulse Pro.`);
  switchTab("pro");
  return false;
}

function getDuplicates(tabs) {
  const seen = new Map();
  const dupes = [];
  for (const t of tabs) {
    const key = (t.url || "").split("#")[0];
    if (!key) continue;
    if (seen.has(key)) {
      const prev = seen.get(key);
      if (t.active || t.pinned) {
        dupes.push(prev);
        seen.set(key, t);
      } else {
        dupes.push(t);
      }
    } else {
      seen.set(key, t);
    }
  }
  return dupes;
}

function fuzzyMatch(haystack, query) {
  if (!query) return true;
  const h = haystack.toLowerCase();
  const q = query.toLowerCase().trim();
  if (h.includes(q)) return true;
  let qi = 0;
  for (let i = 0; i < h.length && qi < q.length; i++) {
    if (h[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

function renderList(autoScrollActive = false) {
  const query = document.getElementById("searchInput").value;
  filteredTabs = allTabs.filter(t => fuzzyMatch(`${t.title || ""} ${t.url || ""}`, query));
  if (selectedIdx >= filteredTabs.length) selectedIdx = Math.max(0, filteredTabs.length - 1);

  const list = document.getElementById("tabList");
  list.innerHTML = "";
  let activeEl = null;

  filteredTabs.forEach((t, idx) => {
    const row = document.createElement("div");
    row.className = `tab-row${t.active ? " active-tab" : ""}${idx === selectedIdx ? " selected" : ""}`;
    let host = "";
    try { host = new URL(t.url).hostname; } catch { host = t.url || ""; }

    row.innerHTML = `
      <img src="${t.favIconUrl || "icons/icon16.png"}" alt="">
      <div class="tab-meta">
        <div class="truncate" style="font-weight:600;">${t.pinned ? "📌 " : ""}${t.title || "Untitled"}</div>
        <div class="muted truncate">${host}</div>
      </div>
      <div class="tab-actions">
        <button class="icon-btn" data-act="pin" title="Pin/Unpin">${t.pinned ? "📍" : "📌"}</button>
        <button class="icon-btn" data-act="close" title="Close tab">✕</button>
      </div>
    `;
    row.querySelector("img").addEventListener("error", e => { e.target.src = "icons/icon16.png"; });
    row.addEventListener("click", async (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "close") {
        e.stopPropagation();
        await chrome.tabs.remove(t.id);
        await refreshTabs(false);
        return;
      }
      if (act === "pin") {
        e.stopPropagation();
        await chrome.tabs.update(t.id, { pinned: !t.pinned });
        await refreshTabs(false);
        return;
      }
      await chrome.windows.update(t.windowId, { focused: true });
      await chrome.tabs.update(t.id, { active: true });
      window.close();
    });
    if (t.active) activeEl = row;
    list.appendChild(row);
  });

  if (autoScrollActive && activeEl) {
    activeEl.scrollIntoView({ block: "center" });
  }
}

async function refreshTabs(autoScroll = true) {
  allTabs = await chrome.tabs.query({});
  const winCount = new Set(allTabs.map(t => t.windowId)).size;
  const dupes = getDuplicates(allTabs);
  document.getElementById("summaryLine").textContent = `${allTabs.length} tabs · ${winCount} window${winCount === 1 ? "" : "s"}`;
  document.getElementById("dupeCount").textContent = String(dupes.length);

  // Domain stats
  const counts = {};
  for (const t of allTabs) {
    try {
      const h = new URL(t.url).hostname.replace(/^www\./, "");
      if (h) counts[h] = (counts[h] || 0) + 1;
    } catch { /* ignore */ }
  }
  const dsEl = document.getElementById("domainStats");
  dsEl.innerHTML = "";
  Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([dom, cnt]) => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `<span class="truncate">${dom}</span><strong>${cnt}</strong>`;
    dsEl.appendChild(div);
  });

  const activeIdx = allTabs.findIndex(t => t.active);
  if (autoScroll && activeIdx >= 0) selectedIdx = activeIdx;
  renderList(autoScroll);
}

async function init() {
  await billing.init();
  const syncTier = () => {
    const pill = document.getElementById("tierPill");
    pill.textContent = billing.isPro() ? "PRO" : "FREE";
    pill.classList.toggle("pro", billing.isPro());
  };
  syncTier();

  document.querySelectorAll(".tab-btn").forEach(b => b.addEventListener("click", () => switchTab(b.dataset.tab)));
  document.getElementById("tierPill").addEventListener("click", () => switchTab("pro"));
  billing.mountProPanel(document.getElementById("panel-pro"), { onToast: showToast, onTierChange: syncTier });

  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", () => { selectedIdx = 0; renderList(false); });
  searchInput.addEventListener("keydown", async (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); selectedIdx = Math.min(filteredTabs.length - 1, selectedIdx + 1); renderList(false); }
    else if (e.key === "ArrowUp") { e.preventDefault(); selectedIdx = Math.max(0, selectedIdx - 1); renderList(false); }
    else if (e.key === "Enter" && filteredTabs[selectedIdx]) {
      const t = filteredTabs[selectedIdx];
      await chrome.windows.update(t.windowId, { focused: true });
      await chrome.tabs.update(t.id, { active: true });
      window.close();
    }
  });

  document.getElementById("dedupeBtn").addEventListener("click", async () => {
    const dupes = getDuplicates(allTabs);
    if (!dupes.length) return showToast("No duplicate tabs found!");
    await chrome.tabs.remove(dupes.map(d => d.id));
    showToast(`Closed ${dupes.length} duplicate tab${dupes.length === 1 ? "" : "s"}.`);
    await refreshTabs(false);
  });

  document.getElementById("autoGroupBtn").addEventListener("click", async () => {
    if (!requirePro("Smart Auto-Group by Domain")) return;
    const curWin = await chrome.windows.getCurrent();
    const winTabs = allTabs.filter(t => t.windowId === curWin.id && !t.pinned);
    const byHost = {};
    for (const t of winTabs) {
      try {
        const h = new URL(t.url).hostname.replace(/^www\./, "");
        if (h) (byHost[h] ||= []).push(t.id);
      } catch { /* ignore */ }
    }
    let grouped = 0;
    let ci = 0;
    for (const [host, ids] of Object.entries(byHost)) {
      if (ids.length < 2) continue;
      const gid = await chrome.tabs.group({ tabIds: ids });
      await chrome.tabGroups.update(gid, { title: host.split(".")[0], color: GROUP_COLORS[ci++ % GROUP_COLORS.length] });
      grouped++;
    }
    showToast(grouped ? `Created ${grouped} domain tab groups!` : "Need 2+ tabs on a domain to group.");
    await refreshTabs(false);
  });

  async function runRegexAction(mode) {
    if (!requirePro("Bulk Regex Actions")) return;
    const pat = document.getElementById("regexInput").value.trim();
    if (!pat) return showToast("Enter a regex pattern.");
    let re;
    try { re = new RegExp(pat, "i"); } catch { return showToast("Invalid regex."); }
    const hits = allTabs.filter(t => re.test(`${t.title || ""} ${t.url || ""}`));
    if (!hits.length) return showToast("No tabs matched.");
    if (mode === "close") {
      await chrome.tabs.remove(hits.map(t => t.id));
      showToast(`Closed ${hits.length} matching tabs.`);
    } else {
      const nw = await chrome.windows.create({ tabId: hits[0].id });
      if (hits.length > 1) await chrome.tabs.move(hits.slice(1).map(t => t.id), { windowId: nw.id, index: -1 });
      showToast(`Moved ${hits.length} tabs to a new window.`);
    }
    await refreshTabs(false);
  }

  document.getElementById("regexCloseBtn").addEventListener("click", () => runRegexAction("close"));
  document.getElementById("regexMoveBtn").addEventListener("click", () => runRegexAction("move"));

  function exportWorkspace(fmt) {
    if (!requirePro("Workspace Export")) return;
    const content = fmt === "md"
      ? allTabs.map(t => `- [${t.title || t.url}](${t.url})`).join("\n")
      : JSON.stringify(allTabs.map(t => ({ title: t.title, url: t.url, pinned: t.pinned })), null, 2);
    const blob = new Blob([content], { type: fmt === "md" ? "text/markdown" : "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tabpulse-workspace.${fmt}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${allTabs.length} tabs.`);
  }

  document.getElementById("exportMdBtn").addEventListener("click", () => exportWorkspace("md"));
  document.getElementById("exportJsonBtn").addEventListener("click", () => exportWorkspace("json"));

  await refreshTabs(true);
}

init();
