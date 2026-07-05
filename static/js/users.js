const host = (window.GS_API_BASE || "http://127.0.0.1:5000").replace(/\/+$/, "");
const url = `${host}/profile/all`;
let cardsData = [];

/** Токен читаем при каждом запросе — не кэшировать в const (иначе после входа/обновления сессии остаётся пусто). */
function getJwtToken() {
  if (typeof getCookie !== "function") return "";
  return (getCookie("jwt_token") || "").trim();
}

/** @type {{ userId: number | null, mode: 'add' | 'subtract' | null, currentBalance: number }} */
let balanceModalContext = {
  userId: null,
  mode: null,
  currentBalance: 0,
};

function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return unsafe
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createElement(tag, attributes = {}, textContent = "") {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === "class") element.className = value;
    else if (value !== false && value != null) element.setAttribute(key, value);
  }
  if (textContent) element.textContent = textContent;
  return element;
}

function initials(item) {
  const a = (item.first_name || "?").trim()[0] || "?";
  const b = (item.last_name || "").trim()[0] || "";
  return (a + b).toUpperCase();
}

/**
 * Пополнение / списание на введённую сумму (руб., целое ≥ 1).
 * На сервер уходит поле amount — дельта; текущий баланс берётся только из БД (нет рассинхрона с карточкой).
 */
async function adjustBalance(userId, amountRubles, operation, paymentMethod) {
  const token = getJwtToken();
  if (!token) {
    throw new Error(
      "Нет сессии (jwt). Обновите страницу или войдите в аккаунт снова."
    );
  }
  const amt = Math.floor(Math.abs(Number(amountRubles)));
  if (!Number.isFinite(amt) || amt < 1) {
    throw new Error("Некорректная сумма");
  }
  const body = {
    user_id: Number(userId),
    amount: amt,
    operation,
  };
  if (operation === "add") {
    body.payment_method = paymentMethod === "card" ? "card" : "cash";
  }
  const response = await fetch(`${host}/admin/balance`, {
    method: "POST",
    mode: "cors",
    credentials: "omit",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const rawText = await response.text();
  let data = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = { error: rawText.slice(0, 200) || response.statusText };
  }
  if (!response.ok) {
    throw new Error(
      data.error || `${response.status} ${response.statusText}`
    );
  }
  const userIndex = cardsData.findIndex(
    (u) => Number(u.id) === Number(userId)
  );
  if (userIndex !== -1 && data.balance !== undefined) {
    cardsData[userIndex].balance = data.balance;
  }
  return data;
}

async function refetchClients() {
  const token = getJwtToken();
  if (!token) throw new Error("Нет сессии. Войдите снова.");
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Не удалось обновить список (${response.status})`);
  }
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error("Неверный ответ сервера");
  cardsData = data;
  refreshView();
}

function getModalEls() {
  return {
    root: document.getElementById("balanceModal"),
    title: document.getElementById("balanceModalTitle"),
    current: document.getElementById("balanceModalCurrent"),
    hint: document.getElementById("balanceModalHint"),
    amount: document.getElementById("balanceModalAmount"),
    payWrap: document.getElementById("balanceModalPayWrap"),
    confirm: document.getElementById("balanceModalConfirm"),
    cancel: document.getElementById("balanceModalCancel"),
    backdrop: document.querySelector("[data-balance-modal-close]"),
  };
}

function openBalanceModal(item, mode) {
  const els = getModalEls();
  if (!els.root || !els.amount) return;

  const id = Number(item?.id);
  if (!Number.isFinite(id)) {
    alert("Не удалось определить клиента. Обновите страницу.");
    return;
  }

  const currentBal = Math.floor(Number(item.balance ?? 0));
  balanceModalContext = {
    userId: id,
    mode,
    currentBalance: Number.isFinite(currentBal) ? currentBal : 0,
  };

  if (els.current) {
    els.current.textContent = `${balanceModalContext.currentBalance.toLocaleString("ru-RU")} ₽`;
  }

  if (mode === "add") {
    if (els.title) els.title.textContent = "Пополнение баланса";
    if (els.hint) {
      els.hint.textContent =
        "Укажите сумму, которая прибавится к уже имеющемуся балансу.";
    }
    if (els.payWrap) els.payWrap.hidden = false;
    const cash = els.root.querySelector('input[name="modalPay"][value="cash"]');
    if (cash) {
      cash.checked = true;
    }
  } else {
    if (els.title) els.title.textContent = "Списание с баланса";
    if (els.hint) {
      els.hint.textContent =
        "Укажите сумму, которая будет списана с текущего баланса.";
    }
    if (els.payWrap) els.payWrap.hidden = true;
  }

  els.amount.value = "";
  els.root.hidden = false;
  els.root.setAttribute("aria-hidden", "false");
  setTimeout(() => els.amount.focus(), 50);
}

function closeBalanceModal() {
  const els = getModalEls();
  if (!els.root) return;
  els.root.hidden = true;
  els.root.setAttribute("aria-hidden", "true");
  balanceModalContext = { userId: null, mode: null, currentBalance: 0 };
  if (els.amount) els.amount.value = "";
}

function clickTargetElement(e) {
  const t = e && e.target;
  if (!t) return null;
  if (t.nodeType === 1) return t;
  return t.parentElement;
}

async function handleBalanceModalSubmit() {
  const m = getModalEls();
  const { userId, mode } = balanceModalContext;

  if (mode !== "add" && mode !== "subtract") {
    alert("Ошибка режима. Закройте окно и откройте снова.");
    return;
  }
  if (userId === undefined || userId === null || !Number.isFinite(Number(userId))) {
    alert("Не выбран клиент. Закройте окно и нажмите «Пополнить» или «Списать» ещё раз.");
    return;
  }

  const rawStr = String(m.amount?.value ?? "")
    .replace(/\s/g, "")
    .replace(",", ".");
  const raw = Math.floor(parseFloat(rawStr));
  if (!Number.isFinite(raw) || raw < 1) {
    alert("Введите сумму не менее 1 ₽");
    return;
  }

  const uid = Number(userId);

  const btn = m.confirm;
  if (btn) btn.disabled = true;
  try {
    if (mode === "add") {
      const pm = m.root?.querySelector('input[name="modalPay"]:checked');
      const method = pm && pm.value === "card" ? "card" : "cash";
      await adjustBalance(uid, raw, "add", method);
      alert("Баланс пополнен");
    } else {
      await adjustBalance(uid, raw, "subtract", null);
      alert("Списание выполнено");
    }
    closeBalanceModal();
    await refetchClients();
  } catch (e) {
    alert(e.message || String(e));
  } finally {
    if (btn) btn.disabled = false;
  }
}

function setupBalanceModalOnce() {
  const root = document.getElementById("balanceModal");
  if (!root || root.dataset.modalBound === "1") return;
  root.dataset.modalBound = "1";

  const onRootClick = (e) => {
    const el = clickTargetElement(e);
    if (!el || !el.closest) return;
    if (el.closest("#balanceModalConfirm")) {
      e.preventDefault();
      e.stopPropagation();
      void handleBalanceModalSubmit();
      return;
    }
    if (el.closest("#balanceModalCancel")) {
      e.preventDefault();
      closeBalanceModal();
      return;
    }
    if (el.matches("[data-balance-modal-close]")) {
      closeBalanceModal();
    }
  };

  root.addEventListener("click", onRootClick, false);

  const confirmBtn = document.getElementById("balanceModalConfirm");
  if (confirmBtn && confirmBtn.dataset.directBound !== "1") {
    confirmBtn.dataset.directBound = "1";
    confirmBtn.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        void handleBalanceModalSubmit();
      },
      true
    );
  }

  document.getElementById("balanceModalAmount")?.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      void handleBalanceModalSubmit();
    }
  });

  document.addEventListener("keydown", (ev) => {
    const modal = document.getElementById("balanceModal");
    if (ev.key === "Escape" && modal && !modal.hidden) {
      closeBalanceModal();
    }
  });

  window.gameSenseConfirmBalance = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    void handleBalanceModalSubmit();
  };
}

function buildClientRow(item, isBlocked) {
  const row = createElement("div", {
    class: "clients-row" + (isBlocked ? " is-blocked" : ""),
  });

  const av = createElement("div", { class: "clients-avatar" }, initials(item));

  const info = createElement("div", { class: "clients-info" });
  const fullName = `${escapeHtml(item.first_name || "")} ${escapeHtml(
    item.last_name || ""
  )}`.trim();
  info.appendChild(createElement("div", { class: "clients-name" }, fullName));
  info.appendChild(
    createElement("div", { class: "clients-email" }, escapeHtml(item.email || ""))
  );
  const meta = createElement("div", { class: "clients-meta-line" });
  meta.textContent = `Роль: ${item.role || "—"} · Спины: ${item.roulette ?? 0}`;
  info.appendChild(meta);

  const bal = createElement(
    "div",
    { class: "clients-balance" },
    `${Number(item.balance ?? 0).toLocaleString("ru-RU")} ₽`
  );

  const actions = createElement("div", { class: "clients-actions" });

  const btnAdd = createElement(
    "button",
    { type: "button", class: "clients-btn-glow" },
    "Пополнить"
  );
  const btnSub = createElement(
    "button",
    { type: "button", class: "clients-link-text" },
    "Списать"
  );
  const btnSpinP = createElement(
    "button",
    { type: "button", class: "clients-link-muted", "data-item-id": item.id },
    "+спин"
  );
  const btnSpinM = createElement(
    "button",
    { type: "button", class: "clients-link-muted", "data-item-id": item.id },
    "−спин"
  );

  btnAdd.addEventListener("click", () => {
    openBalanceModal(item, "add");
  });
  btnSub.addEventListener("click", () => {
    openBalanceModal(item, "subtract");
  });

  btnSpinP.addEventListener("click", () => handleAddSpin(String(item.id), false));
  btnSpinM.addEventListener("click", () => handleAddSpin(String(item.id), true));

  actions.appendChild(btnAdd);
  actions.appendChild(btnSub);
  actions.appendChild(btnSpinP);
  actions.appendChild(btnSpinM);

  row.appendChild(av);
  row.appendChild(info);
  row.appendChild(bal);
  row.appendChild(actions);

  return row;
}

function renderCards(data) {
  const container = document.getElementById("cardsContainer");
  const blockedContainer = document.getElementById("cardsContainerBlock");
  const blockedSection = document.getElementById("blockedSection");

  if (!container || !blockedContainer) return;

  while (container.firstChild) container.removeChild(container.firstChild);
  while (blockedContainer.firstChild)
    blockedContainer.removeChild(blockedContainer.firstChild);

  if (!Array.isArray(data)) {
    container.appendChild(
      createElement("div", { class: "clients-empty" }, "Неверный формат данных.")
    );
    if (blockedSection) blockedSection.hidden = true;
    return;
  }

  const active = data.filter((u) => u.is_active !== 2);
  const blocked = data.filter((u) => u.is_active === 2);

  if (active.length === 0 && blocked.length === 0) {
    container.appendChild(
      createElement(
        "div",
        { class: "clients-empty" },
        "Нет клиентов с подтверждённой почтой или список пуст."
      )
    );
  } else {
    active.forEach((item) => container.appendChild(buildClientRow(item, false)));
    blocked.forEach((item) =>
      blockedContainer.appendChild(buildClientRow(item, true))
    );
  }

  if (blockedSection) {
    blockedSection.hidden = blocked.length === 0;
  }
}

function searchCards(query) {
  if (!query) return [...cardsData];
  const searchTerms = query
    .toLowerCase()
    .split(" ")
    .filter((term) => term.trim());
  return cardsData.filter((item) => {
    const firstName = item.first_name?.toLowerCase() || "";
    const lastName = item.last_name?.toLowerCase() || "";
    const email = item.email?.toLowerCase() || "";
    return searchTerms.some(
      (term) =>
        firstName.includes(term) || lastName.includes(term) || email.includes(term)
    );
  });
}

function sortCards(data, sortValue) {
  if (!sortValue) return [...data];
  const sortedData = [...data];
  switch (sortValue) {
    case "role":
      sortedData.sort((a, b) => (a.role || "").localeCompare(b.role || ""));
      break;
    case "balance-asc":
      sortedData.sort((a, b) => (a.balance || 0) - (b.balance || 0));
      break;
    case "balance-desc":
      sortedData.sort((a, b) => (b.balance || 0) - (a.balance || 0));
      break;
  }
  return sortedData;
}

function setupEventListeners() {
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");
  if (!searchInput || !sortSelect) return;

  const handleFilter = () => {
    const query = searchInput.value.trim();
    const sortValue = sortSelect.value;
    let filteredData = searchCards(query);
    filteredData = sortCards(filteredData, sortValue);
    renderCards(filteredData);
  };

  searchInput.addEventListener("input", handleFilter);
  sortSelect.addEventListener("change", handleFilter);
}

function refreshView() {
  const query = document.getElementById("searchInput")?.value.trim() || "";
  const sortValue = document.getElementById("sortSelect")?.value || "";
  let filteredData = searchCards(query);
  filteredData = sortCards(filteredData, sortValue);
  renderCards(filteredData);
}

fetch(url, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${getJwtToken()}`,
    "Content-Type": "application/json",
  },
})
  .then((response) => {
    if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);
    return response.json();
  })
  .then((data) => {
    if (!Array.isArray(data)) throw new Error("Неверный формат");
    cardsData = data;
    renderCards(data);
    setupEventListeners();
  })
  .catch((error) => {
    console.error("Ошибка загрузки данных:", error);
    const container = document.getElementById("cardsContainer");
    if (container) {
      container.appendChild(
        createElement(
          "div",
          { class: "clients-empty" },
          "Ошибка загрузки данных. Попробуйте позже."
        )
      );
    }
  });

function initBalanceModalWhenReady() {
  if (document.getElementById("balanceModal")) {
    setupBalanceModalOnce();
    return;
  }
  document.addEventListener("DOMContentLoaded", setupBalanceModalOnce, { once: true });
}

/**
 * При overflow:hidden на body колесо мыши часто не прокручивает вложенный блок.
 * Явно двигаем scrollTop (passive: false).
 */
function bindClientsListWheelScroll() {
  const el = document.getElementById("clientsListScroll");
  if (!el || el.dataset.wheelBound === "1") return;
  el.dataset.wheelBound = "1";

  el.addEventListener(
    "wheel",
    (e) => {
      if (el.scrollHeight <= el.clientHeight + 2) return;
      el.scrollTop += e.deltaY;
      e.preventDefault();
    },
    { passive: false }
  );
}

initBalanceModalWhenReady();
bindClientsListWheelScroll();

async function handleAddSpin(userId, spin_delete) {
  try {
    const requestBody = spin_delete
      ? JSON.stringify({ user_id: userId, spins: -1 })
      : JSON.stringify({ user_id: userId, spins: 1 });

    const token = getJwtToken();
    if (!token) {
      alert("Нет сессии. Войдите снова.");
      return;
    }
    const response = await fetch(`${host}/roulette/add`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: requestBody,
    });

    if (!response.ok) {
      throw new Error(`Ошибка при изменении спинов: ${response.status}`);
    }

    const result = await response.json();
    const userIndex = cardsData.findIndex((user) => user.id === Number(userId));
    if (userIndex !== -1) {
      cardsData[userIndex].roulette =
        result.roulette ?? cardsData[userIndex].roulette + 1;
    }
    refreshView();
  } catch (error) {
    console.error(error);
    alert("Ошибка: " + error.message);
  }
}
