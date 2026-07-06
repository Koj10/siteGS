const balanceHost = getApiBase();
let balanceUsers = [];

function escapeText(value) {
    if (value == null) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function getPayMethod() {
    const checked = document.querySelector('input[name="payMethod"]:checked');
    return checked ? checked.value : 'cash';
}

function filterUsers(query) {
    if (!query) return [...balanceUsers];
    const terms = query.toLowerCase().split(' ').filter(Boolean);
    return balanceUsers.filter(user => {
        const hay = `${user.first_name || ''} ${user.last_name || ''} ${user.email || ''}`.toLowerCase();
        return terms.every(term => hay.includes(term));
    });
}

function sortUsers(data, sortValue) {
    const list = [...data];
    switch (sortValue) {
        case 'balance-asc':
            list.sort((a, b) => (a.balance || 0) - (b.balance || 0));
            break;
        case 'balance-desc':
            list.sort((a, b) => (b.balance || 0) - (a.balance || 0));
            break;
        case 'name':
            list.sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'ru'));
            break;
    }
    return list;
}

function renderBalanceUsers(users) {
    const list = document.getElementById('balanceUsersList');
    if (!list) return;

    if (!users.length) {
        list.innerHTML = '<p class="admin-empty">Пользователи не найдены</p>';
        return;
    }

    list.innerHTML = users.map(user => `
        <div class="admin-user-row" data-user-id="${user.id}">
            <div class="admin-user-row__info">
                <h4>${escapeText(user.first_name)} ${escapeText(user.last_name)}</h4>
                <p>${escapeText(user.email)}</p>
            </div>
            <div class="admin-user-row__balance"><span class="user-balance">${Math.round(Number(user.balance) || 0)}</span> ₽</div>
            <input type="number" class="admin-user-row__amount" min="1" placeholder="Сумма" data-amount>
            <div class="admin-user-row__actions">
                <button type="button" class="admin-btn admin-btn--add" data-op="add">Пополнить</button>
                <button type="button" class="admin-btn admin-btn--subtract" data-op="subtract">Списать</button>
            </div>
        </div>
    `).join('');
}

async function adjustBalance(userId, operation, amount, row) {
    const jwtToken = getCookie('jwt_token');
    const body = { user_id: userId, operation, amount: Number(amount) };

    if (operation === 'add') {
        body.payment_method = getPayMethod();
    }

    const buttons = row.querySelectorAll('button');
    buttons.forEach(btn => { btn.disabled = true; });

    try {
        const response = await fetch(`${balanceHost}/admin/balance`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwtToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Ошибка операции');
        }

        const balanceEl = row.querySelector('.user-balance');
        if (balanceEl) balanceEl.textContent = Math.round(result.balance);

        const userIndex = balanceUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) balanceUsers[userIndex].balance = result.balance;

        const amountInput = row.querySelector('[data-amount]');
        if (amountInput) amountInput.value = '';

        showNotification(operation === 'add' ? 'Баланс пополнен' : 'Средства списаны');

        if (typeof window.reloadAdminReports === 'function') {
            window.reloadAdminReports();
        }
    } catch (error) {
        showNotification(error.message, true);
    } finally {
        buttons.forEach(btn => { btn.disabled = false; });
    }
}

async function loadBalanceUsers() {
    const jwtToken = getCookie('jwt_token');
    const list = document.getElementById('balanceUsersList');
    if (list) list.innerHTML = '<p class="admin-empty">Загрузка...</p>';

    try {
        const response = await fetch(`${balanceHost}/profile/all`, {
            headers: {
                'Authorization': `Bearer ${jwtToken}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Не удалось загрузить пользователей');
        balanceUsers = await response.json();
        renderBalanceUsers(balanceUsers);
    } catch (error) {
        if (list) list.innerHTML = `<p class="admin-empty">${escapeText(error.message)}</p>`;
    }
}

function setupBalanceEvents() {
    const search = document.getElementById('balanceSearch');
    const sort = document.getElementById('balanceSort');
    const list = document.getElementById('balanceUsersList');

    const applyFilters = () => {
        let data = filterUsers(search?.value.trim() || '');
        data = sortUsers(data, sort?.value || '');
        renderBalanceUsers(data);
    };

    search?.addEventListener('input', applyFilters);
    sort?.addEventListener('change', applyFilters);

    list?.addEventListener('click', (event) => {
        const btn = event.target.closest('button[data-op]');
        if (!btn) return;

        const row = btn.closest('.admin-user-row');
        const userId = Number(row.dataset.userId);
        const amountInput = row.querySelector('[data-amount]');
        const amount = Number(amountInput?.value);

        if (!amount || amount < 1) {
            showNotification('Укажите сумму от 1 ₽', true);
            return;
        }

        adjustBalance(userId, btn.dataset.op, amount, row);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('balanceUsersList')) return;
    loadBalanceUsers();
    setupBalanceEvents();
});
