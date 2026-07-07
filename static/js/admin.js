function initAdminTabs() {
    const navItems = document.querySelectorAll('.admin-nav__item');
    const panels = document.querySelectorAll('.admin-panel');

    window.switchAdminTab = (tabId) => {
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
        btn.addEventListener('click', () => window.switchAdminTab(btn.dataset.tab));
    });

    const params = new URLSearchParams(window.location.search);
    let initial = params.get('tab') || 'sessions';
    if (initial === 'coupons' || !document.getElementById(`panel-${initial}`)) {
        initial = 'sessions';
    }
    window.switchAdminTab(initial);
}

function initPcDropdowns() {
    const sessionsPanel = document.getElementById('panel-sessions');
    if (!sessionsPanel) return;
    let openedDropdownId = null;

    const positionDropdownRightFixed = (dropdownMenu) => {
        dropdownMenu.style.position = 'fixed';
        dropdownMenu.style.visibility = 'hidden';
        dropdownMenu.classList.add('pc-dropdown-fixed');
        dropdownMenu.classList.add('show');

        if (window.matchMedia('(max-width: 1000px)').matches) {
            dropdownMenu.style.right = '';
            dropdownMenu.style.left = '';
            dropdownMenu.style.top = '';
            dropdownMenu.style.bottom = '';
            dropdownMenu.style.visibility = '';
            return;
        }

        const topOffset = 130;
        const rightOffset = 28;
        dropdownMenu.style.right = `${rightOffset}px`;
        dropdownMenu.style.left = 'auto';
        dropdownMenu.style.top = `${topOffset}px`;
        dropdownMenu.style.bottom = 'auto';
        dropdownMenu.style.visibility = '';
    };

    const closeAllDropdowns = () => {
        document.querySelectorAll('.dropdown-content').forEach(menu => {
            menu.classList.remove('show');
        });
        openedDropdownId = null;
    };

    sessionsPanel.addEventListener('click', (event) => {
        const toggle = event.target.closest('[dropdown]');
        if (!toggle) return;

        const dropdownId = toggle.getAttribute('dropdown');
        const dropdownMenu = document.getElementById(dropdownId);
        if (!dropdownMenu) return;

        const shouldCloseCurrent = openedDropdownId === dropdownId && dropdownMenu.classList.contains('show');
        closeAllDropdowns();
        if (!shouldCloseCurrent) {
            positionDropdownRightFixed(dropdownMenu);
            openedDropdownId = dropdownId;
        }
        event.stopPropagation();
    });

    window.addEventListener('click', (event) => {
        if (event.target.closest('.dropdown-content') || event.target.closest('[dropdown]')) {
            return;
        }
        closeAllDropdowns();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initAdminTabs();
    initPcDropdowns();
});
