const userData = localStorage.getItem('user');
const user = JSON.parse(userData);
const inventory = user.inventory.time_packages;

const host = getApiBase();
const container = document.getElementById('cardsContainer');
const blockedSection = document.getElementById('blockedContainer');
const pc_token = getCookie('pc_token');
const jwtToken = getCookie('jwt_token');

function getPeriodLabel(item) {
    if (item.is_weekend === 1) return 'ВЫХОДНЫЕ';
    if (item.is_weekend === 0) return 'БУДНИ';
    return item.time_period ? item.time_period.toUpperCase() : '';
}

function buildInventoryCard(item, buttonHTML, isBlocked) {
    const card = document.createElement('div');
    card.className = 'card card_product';
    if (isBlocked) card.classList.add('deactivate');

    const name = item.name || `ПАКЕТ ${item.duration_minutes || ''} МИН`;
    const subtitle = getPeriodLabel(item);
    const badge = isBlocked ? '<span class="card-badge">СКОРО</span>' : '';

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
                ${buttonHTML}
            </div>
        </div>
    `;
    return card;
}

for (const id in inventory) {
    fetch(`${host}/time_packages/${id}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(item => {
        for (let i = 0; i < inventory[id]; i++) {
            let buttonHTML;
            if (pc_token) {
                buttonHTML = `<button onclick="activate_package(${item.id})" class="card-buy buy-button" type="button">Активировать</button>`;
            } else {
                buttonHTML = `<button data-menu="about_activate" class="card-buy buy-button details" type="button">Подробнее</button>`;
            }

            const isBlocked = item.is_active === 2;
            const card = buildInventoryCard(item, buttonHTML, isBlocked);

            if (isBlocked) {
                if (blockedSection) {
                    blockedSection.style.display = 'flex';
                    blockedSection.appendChild(card);
                }
            } else {
                container.appendChild(card);
            }
        }
    })
    .catch(error => {
        console.error(`Ошибка при загрузке товара с ID=${id}:`, error);
    });
}
