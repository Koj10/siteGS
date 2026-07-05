const host = (window.GS_API_BASE || "http://127.0.0.1:5000").replace(/\/+$/, "");

let pcCountdownTimer = null;
/** @type {object | null} */
let selectedPcItem = null;

function toDatetimeLocalValue(sqlOrIso) {
  if (!sqlOrIso) return "";
  const s = String(sqlOrIso).trim().replace(" ", "T");
  if (s.length >= 19 && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
    return s.slice(0, 16);
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function addHoursToInput(inputEl, hours) {
  if (!inputEl) return;
  let base = new Date();
  if (inputEl.value) {
    const parsed = new Date(inputEl.value);
    if (!isNaN(parsed.getTime())) base = parsed;
  }
  base.setMinutes(base.getMinutes() + Math.round(hours * 60));
  const pad = (n) => String(n).padStart(2, "0");
  inputEl.value = `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(
    base.getDate()
  )}T${pad(base.getHours())}:${pad(base.getMinutes())}`;
}

function statusLabel(st) {
  const m = {
    занят: "Занят",
    активен: "Свободен",
    заблокирован: "Заблокирован",
    ремонт: "Ремонт",
    админ: "Админ",
    выключен: "Выключен",
  };
  return m[st] || st || "—";
}

function formatCountdown(timeActive) {
  if (!timeActive) return "—";
  const end = new Date(String(timeActive).replace(" ", "T"));
  if (isNaN(end.getTime())) return "—";
  const diff = end - Date.now();
  if (diff <= 0) return "Время вышло";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${h}ч ${m}м ${s}с`;
}

function updateCountdownEls() {
  document.querySelectorAll("[data-pc-end]").forEach((el) => {
    const raw = el.getAttribute("data-pc-end");
    el.textContent = formatCountdown(raw);
  });
}

function openPcModal(item) {
  selectedPcItem = item;
  const root = document.getElementById("pcEditModal");
  const title = document.getElementById("pcModalTitle");
  const status = document.getElementById("pcModalStatus");
  const time = document.getElementById("pcModalTime");
  if (!root || !status || !time) return;

  if (title) title.textContent = `ПК №${item.number_pc ?? "—"}`;
  status.value = item.status || "активен";
  time.value = toDatetimeLocalValue(item.time_active);

  root.hidden = false;
  root.setAttribute("aria-hidden", "false");
  setTimeout(() => time.focus(), 50);
}

function closePcModal() {
  const root = document.getElementById("pcEditModal");
  if (!root) return;
  root.hidden = true;
  root.setAttribute("aria-hidden", "true");
  selectedPcItem = null;
}

function setupPcModalOnce() {
  const save = document.getElementById("pcModalSave");
  if (!save || save.dataset.bound) return;
  save.dataset.bound = "1";

  document.querySelectorAll("[data-pc-modal-close]").forEach((el) => {
    el.addEventListener("click", closePcModal);
  });

  document.getElementById("pcModalSave")?.addEventListener("click", () => {
    if (!selectedPcItem) return;
    const status = document.getElementById("pcModalStatus");
    const time = document.getElementById("pcModalTime");
    sendUpdate(
      selectedPcItem.token,
      status?.value,
      time?.value || ""
    );
  });

  document.querySelectorAll(".pc-quick-h").forEach((btn) => {
    btn.addEventListener("click", () => {
      const h = parseFloat(btn.getAttribute("data-h") || "0");
      const time = document.getElementById("pcModalTime");
      addHoursToInput(time, h);
    });
  });

  document.addEventListener("keydown", (ev) => {
    const root = document.getElementById("pcEditModal");
    if (ev.key === "Escape" && root && !root.hidden) closePcModal();
  });
}

function sendUpdate(token, status, time) {
  const jwtToken = getCookie("jwt_token");
  const data = { token, status, time };

  fetch(`${host}/pc/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
    body: JSON.stringify(data),
  })
    .then(async (r) => {
      const res = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(res.error || `Ошибка ${r.status}`);
      }
      if (res.error) throw new Error(res.error);
      return res;
    })
    .then(() => {
      closePcModal();
      showPC();
    })
    .catch((e) => {
      alert(e.message || "Не удалось сохранить");
    });
}

function showPC() {
  const jwtToken = getCookie("jwt_token");

  fetch(`${host}/pc`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwtToken}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      const container = document.getElementById("pcContainer");
      const statsBar = document.getElementById("pcStatsBar");
      if (!container) return;

      if (pcCountdownTimer) {
        clearInterval(pcCountdownTimer);
        pcCountdownTimer = null;
      }

      container.innerHTML = "";
      if (!Array.isArray(data)) return;

      data.sort((a, b) => (a.number_pc || 0) - (b.number_pc || 0));

      let nFree = 0,
        nBusy = 0,
        nFix = 0,
        nOther = 0;
      data.forEach((item) => {
        const st = item.status;
        if (st === "активен") nFree++;
        else if (st === "занят") nBusy++;
        else if (st === "ремонт") nFix++;
        else nOther++;
      });

      if (statsBar) {
        statsBar.innerHTML = `<span class="pc-stat"><strong>${data.length}</strong> мест</span>
          <span class="pc-stat pc-stat--free">Свободно <strong>${nFree}</strong></span>
          <span class="pc-stat pc-stat--busy">Занято <strong>${nBusy}</strong></span>
          <span class="pc-stat pc-stat--fix">Ремонт <strong>${nFix}</strong></span>`;
      }

      data.forEach((item) => {
        const st = item.status || "";
        const card = document.createElement("button");
        card.type = "button";
        card.className = "pc-premium-card";
        if (st === "занят") card.classList.add("pc-premium-card--busy");
        else if (st === "ремонт") card.classList.add("pc-premium-card--repair");
        else if (st === "заблокирован")
          card.classList.add("pc-premium-card--locked");
        else card.classList.add("pc-premium-card--free");

        const num = document.createElement("span");
        num.className = "pc-premium-card__num";
        num.textContent = String(item.number_pc ?? "—");

        const badge = document.createElement("span");
        badge.className = "pc-premium-card__badge";
        badge.textContent = statusLabel(st);

        const sub = document.createElement("span");
        sub.className = "pc-premium-card__sub";
        if (st === "занят" && item.time_active) {
          sub.classList.add("pc-premium-card__countdown");
          sub.setAttribute("data-pc-end", String(item.time_active));
          sub.textContent = formatCountdown(item.time_active);
        } else if (st === "ремонт") {
          sub.textContent = "Недоступен";
        } else if (st === "заблокирован") {
          sub.textContent = "Заблокирован";
        } else {
          sub.textContent = "Готов к сессии";
        }

        const icon = document.createElement("span");
        icon.className = "pc-premium-card__icon iconoir-pc-check";
        if (st === "занят") icon.className = "pc-premium-card__icon iconoir-computer";
        if (st === "ремонт") icon.className = "pc-premium-card__icon iconoir-pc-no-entry";

        card.appendChild(num);
        card.appendChild(badge);
        card.appendChild(sub);
        card.appendChild(icon);

        card.addEventListener("click", () => openPcModal(item));

        container.appendChild(card);
      });

      pcCountdownTimer = setInterval(updateCountdownEls, 1000);
    })
    .catch((error) => {
      console.log(error);
    });
}

showPC();
setupPcModalOnce();
