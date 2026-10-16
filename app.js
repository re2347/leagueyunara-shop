"use strict";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.documentElement.classList.add("js");

/* ===== 1. 主题开关 ===== */
const THEME_KEY = "yunara-site-theme";
const root = document.documentElement;
const themeButton = document.querySelector(".theme-toggle");

function applyTheme(theme) {
  root.setAttribute("data-theme", theme);
  if (themeButton) themeButton.setAttribute("aria-pressed", String(theme === "dark"));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#0b0b0d" : "#a83d94");
}

if (themeButton) {
  themeButton.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* 隐私模式下写入会抛错，忽略即可 */
    }
  });
}

/* ===== 2. 移动端菜单 ===== */
const menuButton = document.querySelector(".menu-btn");
const siteNav = document.querySelector("#site-nav");

menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!open));
  siteNav?.classList.toggle("is-open", !open);
});

siteNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuButton?.setAttribute("aria-expanded", "false");
    siteNav.classList.remove("is-open");
  });
});

/* ===== 3. toast 与复制 ===== */
let toastTimer;

function showToast(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 4600);
}

function copyWithSelection(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  area.remove();
  return copied;
}

async function copyText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return copyWithSelection(text);
    }
  }
  return copyWithSelection(text);
}

/* 备用下载 = 复制群号并拉起 QQ。没装 QQ 时群号也已经在剪贴板里了。 */
const QQ_GROUP = "712178830";

async function openQQGroup() {
  const copied = await copyText(QQ_GROUP);
  showToast(
    copied
      ? `群号 ${QQ_GROUP} 已复制，正在打开 QQ，进群取备用包`
      : `复制群号失败，请手动添加 QQ 群 ${QQ_GROUP}`
  );
  window.location.href = `tencent://message/?Menu=1&uin=${QQ_GROUP}&sitename=League%20Yunara`;
}

document.querySelector("#backup-download")?.addEventListener("click", openQQGroup);
document.querySelector("[data-copy-qq]")?.addEventListener("click", openQQGroup);

/* 下载走蓝奏云，提取码顺手复制掉，省得用户回来翻页面 */
const LANZOU_CODE = "c1le";

document.querySelectorAll("[data-lanzou-download], [data-copy-password]").forEach((el) => {
  el.addEventListener("click", async () => {
    const copied = await copyText(LANZOU_CODE);
    showToast(copied ? `蓝奏云提取码 ${LANZOU_CODE} 已复制` : `蓝奏云提取码：${LANZOU_CODE}`);
  });
});

/* ===== 4. 价格与库存实时下发 ===== */
const STOCK_URL =
  "https://kzqgphxrghdclkwneqyn.supabase.co/functions/v1/auth/v1/orders/stock";
const STOCK_LABEL = {
  ok: ["现货充足", "pill-ok"],
  low: ["库存紧张", "pill-low"],
  out: ["暂时售罄", "pill-out"],
};

function formatYuan(cents) {
  const yuan = cents / 100;
  return Number.isInteger(yuan) ? String(yuan) : yuan.toFixed(2).replace(/0$/, "");
}

async function loadPlans() {
  const response = await fetch(STOCK_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (!data?.ok) throw new Error("endpoint returned not-ok");

  document.querySelectorAll(".plan").forEach((plan) => {
    const pill = plan.querySelector("[data-stock]");
    const days = pill?.dataset.stock;
    if (!days) return;

    const cents = data.prices?.[days];
    const price = plan.querySelector("[data-price]");
    if (price && Number.isFinite(cents)) price.textContent = formatYuan(cents);

    const label = STOCK_LABEL[data.stock?.[days]];
    if (pill && label) {
      pill.textContent = label[0];
      pill.classList.add(label[1]);
    }
  });
}

loadPlans().catch(() => {
  /* 读不到就用 HTML 里写死的价格，并把库存位标成未知 */
  document.querySelectorAll("[data-stock]").forEach((pill) => {
    pill.textContent = "以付款页为准";
  });
});

/* ===== 5. 版本号：从 GitCode releases 取，失败就留 HTML 里的兜底值 ===== */
const RELEASES_URL = "https://api.gitcode.com/api/v5/repos/Re2347/LeagueYunara/releases";

async function loadVersion() {
  const response = await fetch(RELEASES_URL, { cache: "default" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const list = await response.json();
  if (!Array.isArray(list) || !list.length) throw new Error("empty release list");
  /* /releases/latest 端点会返回旧版，所以从列表里挑被标成 latest 的那条 */
  const release = list.find((r) => r.release_status === "latest") ?? list[list.length - 1];
  const tag = String(release.tag_name ?? "").trim();
  if (!tag) throw new Error("release without tag_name");
  const tagEl = document.querySelector("#release-tag");
  const dateEl = document.querySelector("#release-date");
  if (tagEl) tagEl.textContent = tag.startsWith("v") ? tag : `v${tag}`;
  if (dateEl && release.created_at) dateEl.textContent = String(release.created_at).slice(0, 10);
}

loadVersion().catch(() => {
  /* 取不到不影响下载与购买入口，保留写死的版本行 */
});

/* ===== 6. 入场 ===== */
const revealItems = [...document.querySelectorAll(".reveal, .reveal-group")];

if ("IntersectionObserver" in window && !reduceMotion) {
  const observer = new IntersectionObserver(
    (entries, instance) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        instance.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  revealItems.forEach((el) => observer.observe(el));
} else {
  revealItems.forEach((el) => el.classList.add("in"));
}
