(function () {
    function closeAll(except) {
        document.querySelectorAll("[data-user-menu]").forEach((menu) => {
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

    function initUserMenu() {
        const menus = document.querySelectorAll("[data-user-menu]");
        if (!menus.length) return;

        menus.forEach((menu) => {
            const trigger = menu.querySelector("[data-user-menu-trigger]");
            const dropdown = menu.querySelector(".user-menu__dropdown");
            if (!trigger || !dropdown) return;

            trigger.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                const willOpen = dropdown.hidden;
                closeAll(menu);
                dropdown.hidden = !willOpen;
            });

            menu.addEventListener("click", (event) => {
                event.stopPropagation();
            });
        });

        document.addEventListener("click", () => closeAll());
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeAll();
        });

        const stored = localStorage.getItem("user");
        if (stored) {
            try {
                updateMenuUser(JSON.parse(stored));
            } catch (error) {
                console.error(error);
            }
        }

        document.addEventListener("userDataUpdated", (event) => {
            updateMenuUser(event.detail);
        });
    }

    window.updateUserMenu = updateMenuUser;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initUserMenu);
    } else {
        initUserMenu();
    }
})();
