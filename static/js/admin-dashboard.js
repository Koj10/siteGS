(function () {
  const host = (window.GS_API_BASE || "http://127.0.0.1:5000").replace(/\/+$/, "");

  function getCookie(name) {
    const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return m ? decodeURIComponent(m[2]) : "";
  }

  const jwtToken = getCookie("jwt_token");
  if (!jwtToken) return;

  fetch(`${host}/admin/revenue`, {
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      Accept: "application/json",
    },
  })
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((data) => {
      const fmt = (n) =>
        typeof n === "number"
          ? `${n.toLocaleString("ru-RU")} ₽`
          : "—";
      const el = (id, key, period) => {
        const node = document.getElementById(id);
        if (node && data[period]) node.textContent = fmt(data[period].total);
      };
      el("rev-today", "today", "today");
      el("rev-week", "week", "week");
      el("rev-month", "month", "month");
    })
    .catch(() => {});
})();
