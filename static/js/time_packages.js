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

function buildCard(item, isBlocked) {
    const card = document.createElement('div');
    card.className = 'card card_product';
    if (isBlocked) card.classList.add('deactivate');

    const badge = isBlocked ? '<span class="card-badge">СКОРО</span>' : '';
    const name = item.name || `ПАКЕТ ${item.duration_minutes || ''} МИН`;
    const subtitle = getPeriodLabel(item);
    const price = Math.round(Number(item.price));

    card.innerHTML = `
        ${badge}
        <div class="card-image-wrap">
            <img alt="${name}" loading="lazy" src="${host}/images/time_packages/${item.id}">
        </div>
        <div class="card-body">
            <h3 class="card-title">${name}</h3>
            ${subtitle ? `<span class="card-subtitle">${subtitle}</span>` : ''}
            <div class="card-divider"><span class="card-diamond"></span></div>
            <div class="card-footer">
                <span class="card-price">${price} ₽</span>
                <button class="buy-button card-buy" type="button">Купить</button>
            </div>
        </div>
    `;

    if (!isBlocked) {
        card.querySelector('.buy-button').addEventListener('click', () => sendBuyRequest(item.id));
    }

    return card;
}

const jwtToken = getCookie('jwt_token');

fetch(url, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
    }
})
.then(response => {
    if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);
    return response.json();
})
.then(data => {
    const container = document.getElementById('cardsContainer');
    const blockedContainer = document.getElementById('cardsContainerBlock');

    if (!container || !blockedContainer) return;

    if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = '<p class="shop-empty">Нет доступных пакетов времени.</p>';
        return;
    }

    let hasActive = false;
    let hasBlocked = false;

    data.forEach(item => {
        const isBlocked = item.is_active === 2;
        const card = buildCard(item, isBlocked);
        if (isBlocked) {
            blockedContainer.appendChild(card);
            hasBlocked = true;
        } else {
            container.appendChild(card);
            hasActive = true;
        }
    });

    if (!hasActive) {
        container.innerHTML = '<p class="shop-empty">Сейчас нет доступных тарифов.</p>';
    }
    if (!hasBlocked) {
        document.querySelector('.shop-section--blocked').style.display = 'none';
    }
})
.catch(error => {
    console.error('Ошибка загрузки данных:', error);
    const container = document.getElementById('cardsContainer');
    if (container) {
        container.innerHTML = '<p class="shop-empty">Данные устарели. Перезайдите в аккаунт.</p>';
    }
});

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
    .then(response => {
        if (!response.ok) throw new Error(`Ошибка запроса: ${response.status}`);
        return response.json();
    })
    .then(() => {
        updateUserData();
        showNotification('Товар добавлен в профиль');
    })
    .catch(error => {
        console.error('Ошибка покупки:', error);
        showNotification('Недостаточный баланс :(', true);
    });
}
