(function () {
    const menus = document.querySelectorAll("[data-user-menu]");

    function closeAll(except) {
        menus.forEach((menu) => {
            if (menu === except) return;
            const dropdown = menu.querySelector(".user-menu__dropdown");
            if (dropdown) dropdown.hidden = true;
        });
    }

    function updateMenuUser(user) {
        if (!user) return;
        const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Пользователь";
        const tag = user.tag ? `@${user.tag}` : "@—";

        document.querySelectorAll("[data-user-menu-name]").forEach((el) => {
            el.textContent = fullName;
        });
        document.querySelectorAll("[data-user-menu-tag]").forEach((el) => {
            el.textContent = tag;
        });
    }

    menus.forEach((menu) => {
        const trigger = menu.querySelector("[data-user-menu-trigger]");
        const dropdown = menu.querySelector(".user-menu__dropdown");
        if (!trigger || !dropdown) return;

        trigger.addEventListener("click", (event) => {
            event.stopPropagation();
            const willOpen = dropdown.hidden;
            closeAll(menu);
            dropdown.hidden = !willOpen;
        });
    });

    document.addEventListener("click", () => closeAll());
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeAll();
    });

    const stored = localStorage.getItem("user");
    if (stored) updateMenuUser(JSON.parse(stored));

    document.addEventListener("userDataUpdated", (event) => {
        updateMenuUser(event.detail);
    });

    window.updateUserMenu = updateMenuUser;
})();
