const userData = localStorage.getItem('user');
const user = JSON.parse(userData);
const inventory = user?.inventory?.time_packages || {};
const bonusCards = Number(user?.inventory?.bonuses?.card || user?.bonus_cards || 0);

const host = getApiBase();
const container = document.getElementById('cardsContainer');
const blockedSection = document.getElementById('blockedContainer');
const bonusSection = document.getElementById('bonusCardsSection');
const bonusContainer = document.getElementById('bonusCardsContainer');
const pc_token = getCookie('pc_token');
const jwtToken = getCookie('jwt_token');

function getPeriodLabel(item) {
    if (item.is_weekend === 1) return 'ВЫХОДНЫЕ';
    if (item.is_weekend === 0) return 'БУДНИ';
    return item.time_period ? item.time_period.toUpperCase() : '';
}

function isBlockedPackage(item) {
    return Number(item.is_active) === 2;
}

function buildInventoryCard(item, buttonHTML, isBlocked, eagerImage) {
    const card = document.createElement('div');
    card.className = 'card card_product';
    if (isBlocked) card.classList.add('deactivate');

    const name = item.name || `ПАКЕТ ${item.duration_minutes || ''} МИН`;
    const subtitle = getPeriodLabel(item);
    const badge = isBlocked ? '<span class="card-badge">СКОРО</span>' : '';

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
                ${buttonHTML}
            </div>
        </div>
    `;

    const img = card.querySelector('img');
    attachCardImage(img, 'time_packages', item.id);

    return card;
}

function renderBonusCards() {
    if (!bonusContainer || !bonusSection) return;

    bonusContainer.replaceChildren();
    if (bonusCards <= 0) {
        bonusSection.hidden = true;
        return;
    }

    bonusSection.hidden = false;
    for (let i = 0; i < bonusCards; i++) {
        const card = document.createElement('div');
        card.className = 'card card_product bonus-card-placeholder';
        card.innerHTML = `
            <div class="card-body">
                <h3 class="card-title">БОНУС</h3>
                <span class="card-subtitle">СКОРО</span>
                <div class="card-divider"><span class="card-diamond"></span></div>
                <p class="shop-empty" style="margin:0;padding:0;">Детали появятся позже</p>
            </div>
        `;
        bonusContainer.appendChild(card);
    }
}

async function loadInventoryCards() {
    if (!container) return;

    const ids = Object.keys(inventory);
    if (ids.length === 0) {
        container.innerHTML = '<p class="shop-empty">Инвентарь пуст.</p>';
        return;
    }

    container.innerHTML = '<p class="shop-empty shop-loading">Загрузка карточек...</p>';
    if (blockedSection) blockedSection.replaceChildren();

    const requests = ids.map(async (id) => {
        const response = await fetch(`${host}/time_packages/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${jwtToken}`,
                'Content-Type': 'application/json'
            },
            cache: 'no-store'
        });

        if (!response.ok) throw new Error(`Ошибка загрузки ID=${id}`);

        const item = await response.json();
        const count = inventory[id];
        const cards = [];

        for (let i = 0; i < count; i++) {
            let buttonHTML;
            if (pc_token) {
                buttonHTML = `<button onclick="activate_package(${item.id})" class="card-buy buy-button" type="button">Активировать</button>`;
            } else {
                buttonHTML = `<button data-menu="about_activate" class="card-buy buy-button details" type="button">Подробнее</button>`;
            }

            cards.push(buildInventoryCard(item, buttonHTML, isBlockedPackage(item), eagerCount < 6));
            eagerCount += 1;
        }

        return cards;
    });

    let eagerCount = 0;

    try {
        const groups = await Promise.all(requests);
        container.replaceChildren();

        let hasBlocked = false;
        groups.flat().forEach(card => {
            if (card.classList.contains('deactivate') && blockedSection) {
                blockedSection.style.display = 'flex';
                blockedSection.appendChild(card);
                hasBlocked = true;
            } else {
                container.appendChild(card);
            }
        });

        if (!hasBlocked && blockedSection) {
            blockedSection.closest('.shop-section--blocked')?.style.setProperty('display', 'none');
        }
    } catch (error) {
        console.error('Ошибка загрузки инвентаря:', error);
        container.innerHTML = '<p class="shop-empty">Не удалось загрузить карточки.</p>';
    }
}

loadInventoryCards();
renderBonusCards();
