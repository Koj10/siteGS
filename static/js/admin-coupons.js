const couponHost = getApiBase();
let couponsLoaded = false;

function escapeText(value) {
    if (value == null) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

async function apiAuthFetch(url, options = {}) {
    const jwtToken = getCookie('jwt_token');
    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        cache: 'no-store'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Ошибка ${response.status}`);
    return data;
}

async function loadCouponOptions() {
    const pcSelect = document.getElementById('couponPc');
    const pkgSelect = document.getElementById('couponPackage');
    if (!pcSelect || !pkgSelect) return;

    try {
        const [pcs, packages] = await Promise.all([
            apiAuthFetch(`${couponHost}/pc`),
            fetch(`${couponHost}/time_packages`).then(r => r.json())
        ]);

        const sortedPcs = (pcs || []).filter(p => p.number_pc != null)
            .sort((a, b) => a.number_pc - b.number_pc);

        pcSelect.innerHTML = '<option value="">Выберите компьютер</option>' +
            sortedPcs.map(pc => `
                <option value="${pc.id}">ПК №${escapeText(pc.number_pc)} — ${escapeText(pc.status)}</option>
            `).join('');

        const activePackages = (packages || []).filter(p => Number(p.is_active) !== 2);
        pkgSelect.innerHTML = '<option value="">Выберите пакет</option>' +
            activePackages.map(pkg => `
                <option value="${pkg.id}">${escapeText(pkg.name)} — ${Math.round(pkg.price)} ₽</option>
            `).join('');
    } catch (error) {
        pcSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
        pkgSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
        showNotification(error.message, true);
    }
}

function renderCouponsList(rows) {
    const body = document.getElementById('couponsBody');
    if (!body) return;

    if (!rows || !rows.length) {
        body.innerHTML = '<tr><td colspan="7" class="admin-empty">Купоны ещё не выдавались</td></tr>';
        return;
    }

    body.innerHTML = rows.map(row => {
        const admin = row.admin_first_name
            ? `${row.admin_first_name} ${row.admin_last_name || ''}`.trim()
            : '—';
        const statusLabel = row.status === 'used' ? 'Использован' : 'Активен';
        const statusClass = row.status === 'used' ? 'withdraw' : 'topup';

        return `
            <tr>
                <td><code>${escapeText(row.code)}</code></td>
                <td>№${escapeText(row.number_pc)}</td>
                <td>${escapeText(row.package_name)}</td>
                <td>${Math.round(row.amount || 0)} ₽</td>
                <td><span class="admin-tag admin-tag--${statusClass}">${statusLabel}</span></td>
                <td>${escapeText(admin)}</td>
                <td>${formatDateTime(row.created_at)}</td>
            </tr>
        `;
    }).join('');
}

async function loadCouponsList() {
    const body = document.getElementById('couponsBody');
    if (body) body.innerHTML = '<tr><td colspan="7" class="admin-empty">Загрузка...</td></tr>';

    try {
        const rows = await apiAuthFetch(`${couponHost}/admin/coupons?limit=100`);
        renderCouponsList(rows);
    } catch (error) {
        if (body) body.innerHTML = `<tr><td colspan="7" class="admin-empty">${escapeText(error.message)}</td></tr>`;
    }
}

async function createCoupon() {
    const pcId = document.getElementById('couponPc')?.value;
    const packageId = document.getElementById('couponPackage')?.value;
    const btn = document.getElementById('couponCreateBtn');
    const resultBox = document.getElementById('couponResult');
    const resultCode = document.getElementById('couponResultCode');

    if (!pcId || !packageId) {
        showNotification('Выберите компьютер и пакет', true);
        return;
    }

    btn.disabled = true;
    try {
        const data = await apiAuthFetch(`${couponHost}/admin/coupons`, {
            method: 'POST',
            body: JSON.stringify({
                computer_id: Number(pcId),
                time_package_id: Number(packageId)
            })
        });

        if (resultBox && resultCode) {
            resultCode.textContent = data.code;
            resultBox.hidden = false;
        }

        showNotification(`Купон ${data.code} выдан на ПК №${data.number_pc}`);
        await loadCouponsList();

        if (typeof window.reloadAdminReports === 'function') {
            window.reloadAdminReports();
        }
    } catch (error) {
        showNotification(error.message, true);
    } finally {
        btn.disabled = false;
    }
}

window.loadAdminCoupons = async function(options = {}) {
    if (!document.getElementById('panel-coupons')) return;
    if (couponsLoaded && !options.force) return;
    await loadCouponOptions();
    await loadCouponsList();
    couponsLoaded = true;
};

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('panel-coupons')) return;

    document.getElementById('couponCreateBtn')?.addEventListener('click', createCoupon);

    const panel = document.getElementById('panel-coupons');
    if (panel?.classList.contains('admin-panel--active')) {
        window.loadAdminCoupons();
    }
});
