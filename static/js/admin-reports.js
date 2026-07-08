const reportsHost = getApiBase();
let currentPeriod = 'today';
let periodSummaries = null;
let reportsLoaded = false;
let reportsLoading = false;

function formatMoney(value) {
    return `${Math.round(Number(value) || 0).toLocaleString('ru-RU')} ₽`;
}

function formatDateTime(value) {
    return formatDmyDateTime(value);
}

function paymentLabel(method) {
    const map = {
        cash: 'Наличные',
        card: 'Безнал',
        online: 'Онлайн',
        coupon: 'Купон',
        none: '—'
    };
    return map[method] || method || '—';
}

function operationLabel(row) {
    if (row.kind === 'coupon') return 'Купон';
    if (row.kind === 'withdraw') return 'Списание';
    return 'Пополнение';
}

function operationTagClass(row) {
    if (row.kind === 'coupon') return 'coupon';
    if (row.kind === 'withdraw') return 'withdraw';
    return 'topup';
}

function transactionUserLabel(row) {
    const name = `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email;
    if (name) return name;
    if (row.kind === 'coupon' && row.number_pc != null) {
        const pkg = row.package_name ? ` · ${row.package_name}` : '';
        return `ПК №${row.number_pc}${pkg}`;
    }
    return '—';
}

function showReportsLoading() {
    const summaryEl = document.getElementById('revenueSummary');
    const body = document.getElementById('transactionsBody');
    if (summaryEl) {
        summaryEl.innerHTML = `
            <div class="admin-revenue-card admin-revenue-card--loading"><div class="admin-skeleton"></div></div>
            <div class="admin-revenue-card admin-revenue-card--loading"><div class="admin-skeleton"></div></div>
            <div class="admin-revenue-card admin-revenue-card--loading"><div class="admin-skeleton"></div></div>
            <div class="admin-revenue-card admin-revenue-card--loading"><div class="admin-skeleton"></div></div>
            <div class="admin-revenue-card admin-revenue-card--loading"><div class="admin-skeleton"></div></div>
        `;
    }
    if (body) {
        body.innerHTML = '<tr><td colspan="6" class="admin-empty">Загрузка операций...</td></tr>';
    }
}

function renderRevenueCards(container, data) {
    if (!container || !data) return;
    container.innerHTML = `
        <div class="admin-revenue-card">
            <div class="admin-revenue-card__label">Наличные</div>
            <div class="admin-revenue-card__value">${formatMoney(data.cash)}</div>
        </div>
        <div class="admin-revenue-card">
            <div class="admin-revenue-card__label">Безнал</div>
            <div class="admin-revenue-card__value">${formatMoney(data.card)}</div>
        </div>
        <div class="admin-revenue-card">
            <div class="admin-revenue-card__label">Онлайн</div>
            <div class="admin-revenue-card__value">${formatMoney(data.online)}</div>
        </div>
        <div class="admin-revenue-card">
            <div class="admin-revenue-card__label">Купоны</div>
            <div class="admin-revenue-card__value">${formatMoney(data.coupons || 0)}</div>
        </div>
        <div class="admin-revenue-card admin-revenue-card--total">
            <div class="admin-revenue-card__label">Итого</div>
            <div class="admin-revenue-card__value">${formatMoney(data.total)}</div>
        </div>
    `;
}

function renderTransactions(rows) {
    const body = document.getElementById('transactionsBody');
    if (!body) return;

    if (!rows || !rows.length) {
        body.innerHTML = '<tr><td colspan="6" class="admin-empty">Операций за период нет</td></tr>';
        return;
    }

    body.innerHTML = rows.map(row => {
        const name = transactionUserLabel(row);
        const isWithdraw = row.kind === 'withdraw';
        const isCoupon = row.kind === 'coupon';
        const sign = isWithdraw ? '−' : '+';
        const adminName = row.admin_first_name
            ? `${row.admin_first_name} ${row.admin_last_name || ''}`.trim()
            : (row.payment_method === 'online' ? 'Система' : '—');

        return `
            <tr>
                <td>${formatDateTime(row.created_at)}</td>
                <td>${name}</td>
                <td><span class="admin-tag admin-tag--${operationTagClass(row)}">${operationLabel(row)}</span></td>
                <td>${sign}${formatMoney(row.amount)}</td>
                <td>${paymentLabel(row.payment_method)}</td>
                <td>${adminName}</td>
            </tr>
        `;
    }).join('');
}

async function apiFetchReport(url) {
    const jwtToken = getCookie('jwt_token');
    let response;

    try {
        response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${jwtToken}`,
                'Accept': 'application/json'
            },
            cache: 'no-store'
        });
    } catch (error) {
        throw new Error('Нет связи с API. Проверьте интернет или обновите сервер API.');
    }

    let payload = null;
    try {
        payload = await response.json();
    } catch (error) {
        if (!response.ok) {
            throw new Error(`Ошибка сервера (${response.status})`);
        }
    }

    if (!response.ok) {
        throw new Error(payload?.error || `Ошибка сервера (${response.status})`);
    }

    return payload;
}

async function fetchReportBootstrap() {
    return apiFetchReport(`${reportsHost}/admin/revenue/report?bootstrap=1`);
}

async function fetchReportPeriod(period) {
    return apiFetchReport(`${reportsHost}/admin/revenue/report?period=${encodeURIComponent(period)}`);
}

async function fetchReportRange(dateFrom, dateTo) {
    const isoFrom = toIsoDate(dateFrom) || dateFrom;
    const isoTo = toIsoDate(dateTo) || dateTo;
    const qs = new URLSearchParams({
        date_from: isoFrom,
        date_to: isoTo
    });
    return apiFetchReport(`${reportsHost}/admin/revenue/report?${qs.toString()}`);
}

let reportsRequestId = 0;

function localIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function applyReportData(data, options = {}) {
    const summaryEl = document.getElementById('revenueSummary');
    const customEl = document.getElementById('revenueCustom');

    if (data.today && data.week && data.month) {
        periodSummaries = {
            today: data.today,
            week: data.week,
            month: data.month
        };
    }

    if (data.period === 'custom') {
        if (customEl) renderRevenueCards(customEl, data.summary);
        if (summaryEl && periodSummaries) {
            renderRevenueCards(summaryEl, periodSummaries[currentPeriod] || data.summary);
        } else if (summaryEl && data.summary) {
            renderRevenueCards(summaryEl, data.summary);
        }
    } else {
        if (customEl && options.clearCustom) customEl.innerHTML = '';
        if (summaryEl) {
            const summary = data.summary
                || (periodSummaries && periodSummaries[data.period || currentPeriod])
                || data[data.period || currentPeriod];
            renderRevenueCards(summaryEl, summary);
        }
        if (data.period) currentPeriod = data.period;
    }

    renderTransactions(data.transactions || []);
}

async function loadAdminReports(options = {}) {
    const panel = document.getElementById('panel-reports');
    if (!panel) return;

    const force = options.force === true;
    if (reportsLoaded && !force && !options.period && !options.range) return;

    const requestId = ++reportsRequestId;
    reportsLoading = true;
    showReportsLoading();

    try {
        let data;
        if (options.range) {
            data = await fetchReportRange(options.range.from, options.range.to);
        } else if (options.period) {
            data = await fetchReportPeriod(options.period);
        } else if (force) {
            data = await fetchReportPeriod(currentPeriod);
        } else {
            data = await fetchReportBootstrap();
        }

        if (requestId !== reportsRequestId) return;

        applyReportData(data, { clearCustom: !options.range });
        reportsLoaded = true;
    } catch (error) {
        if (requestId !== reportsRequestId) return;

        const summaryEl = document.getElementById('revenueSummary');
        if (summaryEl) {
            summaryEl.innerHTML = `<p class="admin-empty">${error.message}</p>`;
        }
        renderTransactions([]);
        if (options.showError !== false) {
            showNotification(error.message, true);
        }
    } finally {
        if (requestId === reportsRequestId) {
            reportsLoading = false;
        }
    }
}

window.loadAdminReports = loadAdminReports;
window.reloadAdminReports = () => loadAdminReports({ force: true, period: currentPeriod });

function setupReportEvents() {
    const periodTabs = document.querySelectorAll('.admin-period-tab');
    const fromInput = document.getElementById('reportFrom');
    const toInput = document.getElementById('reportTo');
    const rangeBtn = document.getElementById('reportRangeBtn');

    const fromField = fromInput ? initDmyDateField(fromInput) : null;
    const toField = toInput ? initDmyDateField(toInput) : null;

    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    fromField?.setValue(localIsoDate(monthAgo));
    toField?.setValue(localIsoDate(today));

    periodTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            periodTabs.forEach(t => t.classList.remove('admin-period-tab--active'));
            tab.classList.add('admin-period-tab--active');
            currentPeriod = tab.dataset.period;
            loadAdminReports({ period: currentPeriod, clearCustom: true });
            const customEl = document.getElementById('revenueCustom');
            if (customEl) customEl.innerHTML = '';
        });
    });

    rangeBtn?.addEventListener('click', async () => {
        const from = fromInput?.value?.trim();
        const to = toInput?.value?.trim();
        if (!from || !to) {
            showNotification('Укажите обе даты', true);
            return;
        }
        if (!toIsoDate(from) || !toIsoDate(to)) {
            showNotification('Некорректная дата. Формат: ДД/ММ/ГГГГ', true);
            return;
        }
        if (compareDmyDates(from, to) > 0) {
            showNotification('Дата «с» не может быть позже «по»', true);
            return;
        }

        rangeBtn.disabled = true;
        try {
            await loadAdminReports({
                force: true,
                range: { from, to },
                showError: true
            });
        } finally {
            rangeBtn.disabled = false;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('revenueSummary')) return;
    setupReportEvents();

    const panel = document.getElementById('panel-reports');
    if (panel?.classList.contains('admin-panel--active')) {
        loadAdminReports();
    }
});
