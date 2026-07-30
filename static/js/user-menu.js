(function () {
    function closeAll(except) {
        document.querySelectorAll("[data-user-menu]").forEach((menu) => {
            if (menu === except) return;
            setMenuOpen(menu, false);
        });
    }

    function setMenuOpen(menu, open) {
        const dropdown = menu.querySelector(".user-menu__dropdown");
        const trigger = menu.querySelector("[data-user-menu-trigger]");
        if (!dropdown) return;

        dropdown.hidden = !open;
        if (trigger) trigger.setAttribute("aria-expanded", open ? "true" : "false");
    }

    function isMenuOpen(menu) {
        const dropdown = menu.querySelector(".user-menu__dropdown");
        return dropdown ? !dropdown.hidden : false;
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

        document.querySelectorAll("[data-user-menu-rank]").forEach((el) => {
            if (typeof rankBadgeHtml === "function" && user.rank) {
                el.innerHTML = rankBadgeHtml(user.rank);
                el.hidden = false;
            } else {
                el.innerHTML = "";
                el.hidden = true;
            }
        });
    }

    function initDesktopUserMenu() {
        const menus = document.querySelectorAll("[data-user-menu]");
        if (!menus.length) return;

        menus.forEach((menu) => {
            const trigger = menu.querySelector("[data-user-menu-trigger]");
            const dropdown = menu.querySelector(".user-menu__dropdown");
            if (!trigger || !dropdown) return;

            trigger.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                const shouldOpen = !isMenuOpen(menu);
                closeAll(shouldOpen ? menu : null);
                setMenuOpen(menu, shouldOpen);
            });

            menu.addEventListener("click", (event) => {
                event.stopPropagation();
            });
        });

        document.addEventListener("click", (event) => {
            if (event.target.closest("[data-user-menu]")) return;
            closeAll();
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeAll();
        });
    }

    function initMobileProfileSheet() {
        const sheet = document.getElementById("mobileProfileSheet");
        const openBtn = document.getElementById("mobileProfileOpen");
        const closeBtn = document.getElementById("mobileProfileClose");
        if (!sheet || !openBtn) return;

        const panel = sheet.querySelector(".mobile-profile-sheet__panel");

        function openSheet() {
            sheet.hidden = false;
            openBtn.setAttribute("aria-expanded", "true");
            document.body.classList.add("mobile-profile-sheet-open");
        }

        function closeSheet() {
            sheet.hidden = true;
            openBtn.setAttribute("aria-expanded", "false");
            document.body.classList.remove("mobile-profile-sheet-open");
        }

        openBtn.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (sheet.hidden) {
                openSheet();
            } else {
                closeSheet();
            }
        });

        closeBtn?.addEventListener("click", (event) => {
            event.preventDefault();
            closeSheet();
        });

        panel?.addEventListener("click", (event) => {
            if (event.target.closest(".user-menu__item")) {
                closeSheet();
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !sheet.hidden) {
                closeSheet();
            }
        });
    }

    function initUserMenu() {
        initDesktopUserMenu();
        initMobileProfileSheet();

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
