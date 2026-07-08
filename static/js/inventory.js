const userData = localStorage.getItem('user');
const user = JSON.parse(userData);
const inventory = user?.inventory?.time_packages || {};

const host = getApiBase();
const container = document.getElementById('cardsContainer');
const blockedContainer = document.getElementById('blockedContainer');
const blockedSection = document.querySelector('.shop-section--blocked');
const bonusSection = document.getElementById('bonusCardsSection');
const bonusContainer = document.getElementById('bonusCardsContainer');
const pc_token = getCookie('pc_token');
const jwtToken = getCookie('jwt_token');

function getBonusCards() {
    const stored = localStorage.getItem('user');
    if (!stored) return 0;
    const currentUser = JSON.parse(stored);
    return Number(currentUser?.inventory?.bonuses?.card || currentUser?.bonus_cards || 0);
}

function hasPendingBonusClaim() {
    const stored = localStorage.getItem('user');
    if (!stored) return false;
    const currentUser = JSON.parse(stored);
    return Boolean(currentUser?.pending_bonus_claim);
}

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

    const bonusCards = getBonusCards();
    const pendingClaim = hasPendingBonusClaim();

    bonusContainer.replaceChildren();
    if (bonusCards <= 0) {
        bonusSection.hidden = true;
        return;
    }

    bonusSection.hidden = false;
    for (let i = 0; i < bonusCards; i += 1) {
        const card = document.createElement('div');
        card.className = 'card card_product bonus-case-card';
        card.innerHTML = `
            <span class="card-badge">КЕЙС</span>
            <div class="bonus-case-card__preview">
                <span class="bonus-case-card__icon" aria-hidden="true"></span>
            </div>
            <div class="card-body">
                <h3 class="card-title">БОНУС-КЕЙС</h3>
                <span class="card-subtitle">НА БАЛАНС</span>
                <div class="card-divider"><span class="card-diamond"></span></div>
                <div class="card-footer">
                    <button class="card-buy buy-button bonus-case-open-btn" type="button"${pendingClaim ? ' disabled' : ''}>Открыть</button>
                </div>
            </div>
        `;

        const openBtn = card.querySelector('.bonus-case-open-btn');
        openBtn.addEventListener('click', () => {
            if (pendingClaim || openBtn.disabled) {
                showNotification('Сначала заберите предыдущий приз', true);
                return;
            }
            if (typeof window.openBonusCase === 'function') {
                window.openBonusCase();
            }
        });

        bonusContainer.appendChild(card);
    }
}

function setBlockedEmptyState() {
    if (blockedContainer) blockedContainer.replaceChildren();
    if (blockedSection) blockedSection.style.display = 'none';
}

async function loadInventoryCards() {
    if (!container) return;

    const ids = Object.keys(inventory);
    if (ids.length === 0) {
        container.innerHTML = '<p class="shop-empty">Инвентарь пуст.</p>';
        setBlockedEmptyState();
        return;
    }

    container.innerHTML = '<p class="shop-empty shop-loading">Загрузка карточек...</p>';
    if (blockedContainer) blockedContainer.replaceChildren();
    if (blockedSection) blockedSection.style.display = 'none';

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
        let hasAvailable = false;
        if (blockedContainer) blockedContainer.replaceChildren();

        groups.flat().forEach(card => {
            if (card.classList.contains('deactivate') && blockedContainer) {
                blockedContainer.appendChild(card);
                hasBlocked = true;
            } else {
                container.appendChild(card);
                hasAvailable = true;
            }
        });

        if (!hasAvailable) {
            container.innerHTML = '<p class="shop-empty">Нет доступных карточек.</p>';
        }

        if (hasBlocked && blockedSection) {
            blockedSection.style.display = '';
        } else {
            setBlockedEmptyState();
        }
    } catch (error) {
        console.error('Ошибка загрузки инвентаря:', error);
        container.innerHTML = '<p class="shop-empty">Не удалось загрузить карточки.</p>';
    }
}

loadInventoryCards();
renderBonusCards();
document.addEventListener('userInventoryUpdated', renderBonusCards);
window.renderBonusCards = renderBonusCards;
