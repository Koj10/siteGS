(function () {
  const host = (window.GS_API_BASE || "http://127.0.0.1:5000").replace(/\/+$/, "");

  function getCookie(name) {
    const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return m ? decodeURIComponent(m[2]) : "";
  }

  function row(label, value) {
    const r = document.createElement("div");
    r.className = "revenue-row";
    r.innerHTML = `<span>${label}</span><span>${value}</span>`;
    return r;
  }

  function renderBlock(containerId, period) {
    const root = document.getElementById(containerId);
    if (!root || !period) return;
    root.innerHTML = "";
    const money = (n) =>
      `${Number(n || 0).toLocaleString("ru-RU")} ₽`;
    root.appendChild(row("Всего", money(period.total)));
    root.appendChild(row("Наличные", money(period.cash)));
    root.appendChild(row("Безнал", money(period.card)));
    root.appendChild(row("Онлайн", money(period.online)));
  }

  const jwtToken = getCookie("jwt_token");
  if (!jwtToken) return;

  fetch(`${host}/admin/revenue`, {
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      Accept: "application/json",
    },
  })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("network"))))
    .then((data) => {
      renderBlock("rev-block-today", data.today);
      renderBlock("rev-block-week", data.week);
      renderBlock("rev-block-month", data.month);
    })
    .catch(() => {
      ["rev-block-today", "rev-block-week", "rev-block-month"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = "Не удалось загрузить данные";
      });
    });
})();
