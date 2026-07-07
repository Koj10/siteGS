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

    const positionDropdownRightOfGrid = (dropdownMenu, toggleElement, gridElement) => {
        const containerRect = gridElement.getBoundingClientRect();
        const toggleRect = toggleElement.getBoundingClientRect();

        dropdownMenu.style.position = 'fixed';
        dropdownMenu.style.visibility = 'hidden';
        dropdownMenu.classList.add('show');

        const menuRect = dropdownMenu.getBoundingClientRect();
        const gap = 16;
        const horizontalShift = -24;

        let left = containerRect.right + gap + horizontalShift;
        if (left + menuRect.width > window.innerWidth - gap) {
            left = window.innerWidth - menuRect.width - gap;
        }
        left = Math.max(gap, left);

        let top = toggleRect.top;
        if (top + menuRect.height > window.innerHeight - gap) {
            top = window.innerHeight - menuRect.height - gap;
        }
        top = Math.max(gap, top);

        dropdownMenu.style.left = `${left}px`;
        dropdownMenu.style.top = `${top}px`;
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
        const gridElement = toggle.closest('.admin-pc-grid, .cardsContainer');
        if (!gridElement) return;

        const dropdownId = toggle.getAttribute('dropdown');
        const dropdownMenu = document.getElementById(dropdownId);
        if (!dropdownMenu) return;

        const shouldCloseCurrent = openedDropdownId === dropdownId && dropdownMenu.classList.contains('show');
        closeAllDropdowns();
        if (!shouldCloseCurrent) {
            positionDropdownRightOfGrid(dropdownMenu, toggle, gridElement);
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
