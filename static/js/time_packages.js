const host = getApiBase();
const url = `${host}/time_packages`;

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function getPeriodLabel(item) {
    if (item.is_weekend === 1 || item.is_weekend === true) return 'ВЫХОДНЫЕ';
    if (item.is_weekend === 0 || item.is_weekend === false) return 'БУДНИ';
    const period = item.time_period;
    if (period === 'дневной') return 'ДНЕВНОЙ';
    if (period === 'вечерний') return 'ВЕЧЕРНИЙ';
    if (period === 'ночной') return 'НОЧНОЙ';
    if (period === 'бесконечный') return 'БЕЗЛИМИТ';
    return period ? period.toUpperCase() : '';
}

function isBlockedPackage(item) {
    return Number(item.is_active) === 2;
}

function buildCard(item, isBlocked, eagerImage) {
    const card = document.createElement('div');
    card.className = 'card card_product';
    if (isBlocked) card.classList.add('deactivate');

    const badge = isBlocked ? '<span class="card-badge">СКОРО</span>' : '';
    const name = item.name || `ПАКЕТ ${item.duration_minutes || ''} МИН`;
    const subtitle = getPeriodLabel(item);
    const price = Math.round(Number(item.price));

    card.innerHTML = `
        ${badge}
        <div class="card-image-wrap is-loading">
            <img alt="${name}" decoding="async" loading="${eagerImage ? 'eager' : 'lazy'}"${eagerImage ? ' fetchpriority="high"' : ''} src="">
        </div>
        <div class="card-body">
            <h3 class="card-title">${name}</h3>
            ${subtitle ? `<span class="card-subtitle">${subtitle}</span>` : ''}
            <div class="card-divider"><span class="card-diamond"></span></div>
            <div class="card-footer">
                <span class="card-price">${price} ₽</span>
                ${isBlocked ? '' : '<button class="buy-button card-buy" type="button">Купить</button>'}
            </div>
        </div>
    `;

    const img = card.querySelector('img');
    attachCardImage(img, 'time_packages', item.id);

    if (!isBlocked) {
        card.querySelector('.buy-button').addEventListener('click', () => sendBuyRequest(item.id));
    }

    return card;
}

function renderPackages(data) {
    const container = document.getElementById('cardsContainer');
    const blockedContainer = document.getElementById('cardsContainerBlock');
    const blockedSection = document.querySelector('.shop-section--blocked');

    if (!container || !blockedContainer) return;

    container.replaceChildren();
    blockedContainer.replaceChildren();

    if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = '<p class="shop-empty">Нет доступных пакетов времени.</p>';
        if (blockedSection) blockedSection.style.display = 'none';
        return;
    }

    const activeItems = data.filter(item => !isBlockedPackage(item));
    const blockedItems = data.filter(item => isBlockedPackage(item));

    if (activeItems.length === 0) {
        container.innerHTML = '<p class="shop-empty">Сейчас нет доступных тарифов.</p>';
    } else {
        activeItems.forEach((item, index) => {
            container.appendChild(buildCard(item, false, index < 6));
        });
    }

    if (blockedItems.length === 0) {
        if (blockedSection) blockedSection.style.display = 'none';
    } else {
        if (blockedSection) blockedSection.style.display = '';
        blockedItems.forEach(item => {
            blockedContainer.appendChild(buildCard(item, true, false));
        });
    }
}

async function loadPackages() {
    const container = document.getElementById('cardsContainer');
    if (container?.dataset.loading === '1') return;

    if (container) {
        container.dataset.loading = '1';
        container.innerHTML = '<p class="shop-empty shop-loading">Загрузка тарифов...</p>';
    }

    const jwtToken = getCookie('jwt_token');

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${jwtToken}`,
                'Content-Type': 'application/json'
            },
            cache: 'no-store'
        });

        if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);

        const data = await response.json();
        renderPackages(data);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        if (container) {
            container.innerHTML = '<p class="shop-empty">Не удалось загрузить тарифы. <button type="button" class="flat-button shop-retry">Повторить</button></p>';
            container.querySelector('.shop-retry')?.addEventListener('click', () => {
                if (container) delete container.dataset.loading;
                loadPackages();
            });
        }
    } finally {
        if (container) delete container.dataset.loading;
    }
}

function sendBuyRequest(productId) {
    const jwtToken = getCookie('jwt_token');
    const buyUrl = `${host}/buy/time_packages`;

    fetch(buyUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ id: productId, quality: 1 })
    })
    .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || `Ошибка запроса: ${response.status}`);
        }
        return data;
    })
    .then((data) => {
        updateUserData();
        if (data.cashback_earned > 0) {
            showNotification(`Покупка успешна! Кешбэк +${data.cashback_earned} ₽ (${data.cashback_percent}%)`);
        } else {
            showNotification('Товар добавлен в инвентарь');
        }
    })
    .catch(error => {
        console.error('Ошибка покупки:', error);
        showNotification(error.message || 'Недостаточный баланс :(', true);
    });
}

loadPackages();
