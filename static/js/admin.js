function initAdminTabs() {
    const navItems = document.querySelectorAll('.admin-nav__item');
    const panels = document.querySelectorAll('.admin-panel');

    const switchTab = (tabId) => {
        navItems.forEach(btn => {
            btn.classList.toggle('admin-nav__item--active', btn.dataset.tab === tabId);
        });
        panels.forEach(panel => {
            panel.classList.toggle('admin-panel--active', panel.id === `panel-${tabId}`);
        });

        const url = new URL(window.location.href);
        url.searchParams.set('tab', tabId);
        history.replaceState(null, '', url);

        if (tabId === 'sessions' && typeof showPC === 'function') {
            showPC();
        }

        if (tabId === 'reports' && typeof window.loadAdminReports === 'function') {
            window.loadAdminReports({ force: true });
        }
    };

    navItems.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    const params = new URLSearchParams(window.location.search);
    const initial = params.get('tab') || 'sessions';
    if (document.getElementById(`panel-${initial}`)) {
        switchTab(initial);
    }
}

function initPcDropdowns() {
    const container = document.getElementById('pcContainer');
    if (!container) return;

    container.addEventListener('click', (event) => {
        const toggle = event.target.closest('[dropdown]');
        if (!toggle) return;

        const dropdownId = toggle.getAttribute('dropdown');
        const dropdownMenu = document.getElementById(dropdownId);
        if (!dropdownMenu) return;

        dropdownMenu.style.position = 'fixed';
        dropdownMenu.style.left = `${event.clientX}px`;
        dropdownMenu.style.top = `${event.clientY}px`;
        dropdownMenu.classList.toggle('show');
        event.stopPropagation();
    });

    window.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-content').forEach(menu => {
            menu.classList.remove('show');
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initAdminTabs();
    initPcDropdowns();
});
