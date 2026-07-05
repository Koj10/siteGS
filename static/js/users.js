const host = "https://api.game-sense.ru";
const url = `${host}/profile/all`;
let cardsData = []; // Глобальная переменная для хранения данных

const jwtToken = getCookie('jwt_token');

// Функция для экранирования HTML
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Функция для отправки нового баланса
async function updateBalance(userId, newBalance) {
  try {
    const response = await fetch(`${host}/profile/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ balance: newBalance })
    });

    if (!response.ok) {
      throw new Error(`Ошибка при обновлении баланса: ${response.status}`);
    }

    // Обновляем данные в cardsData
    const userIndex = cardsData.findIndex(user => user.id === userId);
    if (userIndex !== -1) {
      cardsData[userIndex].balance = newBalance;
    }

    return await response.json();
  } catch (error) {
    console.error('Ошибка при обновлении баланса:', error);
    throw error;
  }
}

// Безопасное создание элементов
function createElement(tag, attributes = {}, textContent = '') {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, escapeHtml(value));
  }

  if (textContent) {
    element.textContent = textContent;
  }

  return element;
}

// Функция для отображения карточек
function renderCards(data) {
  const container = document.getElementById("cardsContainer");
  const blockedContainer = document.getElementById("cardsContainerBlock");

  if (!container || !blockedContainer) {
    console.error("Контейнеры не найдены на странице.");
    return;
  }

  // Очищаем контейнеры безопасным способом
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  while (blockedContainer.firstChild) {
    blockedContainer.removeChild(blockedContainer.firstChild);
  }

  if (!Array.isArray(data)) {
    console.error("Полученные данные не являются массивом:", data);
    const errorMsg = createElement('p', {}, 'Ошибка: данные пришли в неверном формате.');
    container.appendChild(errorMsg);
    return;
  }

  if (data.length === 0) {
    const noUsersMsg = createElement('p', {}, 'Пользователи не найдены');
    container.appendChild(noUsersMsg);
    return;
  }

  data.forEach(item => {
    const card = createElement('div', { class: 'card card_user' });

    // Создаем элементы безопасным способом
    const firstName = createElement('h5', {}, `Имя: ${escapeHtml(item.first_name)}`);
    const lastName = createElement('h5', {}, `Фамилия: ${escapeHtml(item.last_name)}`);
    const email = createElement('h5', {}, `Почта: ${escapeHtml(item.email)}`);

    // Создаем элемент баланса
    const balanceLabel = createElement('h5', { class: 'row' }, 'Баланс: ');
    const balanceInputContainer = createElement('div', { class: 'row' });

    const balanceInput = createElement('input', {
      type: 'number',
      min: '0',
      value: escapeHtml(item.balance)
    });

    balanceInput.addEventListener('input', (e) => {
      if (!e.target.validity.valid) e.target.value = '';
    });

    balanceInput.addEventListener('change', () => {
      handleBalanceChange(item.id, balanceInput.value);
    });

    balanceInputContainer.appendChild(balanceInput);
    balanceInputContainer.appendChild(document.createTextNode(' ₽'));
    balanceLabel.appendChild(balanceInputContainer);

    const role = createElement('h5', {}, `Роль: ${escapeHtml(item.role)}`);
    const spins = createElement('h5', {}, `Спины: ${escapeHtml(item.roulette)}`);

    const div_buttons = createElement('div', { class: 'row' });
    const add_spins = createElement('button', { type: 'button', 'data-item-id': item.id }, 'Добавить спин');
    const delete_spins = createElement('button', { type: 'button', 'data-item-id': item.id }, 'Удалить спин');
    div_buttons.appendChild(add_spins);
    div_buttons.appendChild(delete_spins);

    // Добавляем все элементы в карточку
    card.appendChild(firstName);
    card.appendChild(lastName);
    card.appendChild(email);
    card.appendChild(balanceLabel);
    card.appendChild(role);
    card.appendChild(spins);
    card.appendChild(div_buttons);

    if (item.is_active === 2) {
      card.classList.add("deactivate");
      blockedContainer.appendChild(card);
    } else {
      container.appendChild(card);
    }
  });
}

// Обработчик изменения баланса
async function handleBalanceChange(userId, newBalance) {
  try {
    const balance = parseInt(newBalance);
    if (isNaN(balance)) {
      throw new Error('Неверное значение баланса');
    }

    await updateBalance(userId, balance);
    console.log(`Баланс пользователя ${userId} успешно обновлен`);
  } catch (error) {
    console.error('Не удалось обновить баланс:', error);
    // Можно добавить уведомление пользователю об ошибке
    alert('Ошибка при обновлении баланса: ' + error.message);
  }
}

// Функция для добавления спина
async function handleAddSpin(userId, spin_delete = false) {
  try {
    const requestBody = spin_delete
      ? JSON.stringify({ user_id: userId, spins: -1 })
      : JSON.stringify({ user_id: userId, spins: 1 });

    const response = await fetch(`${host}/roulette/add`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      body: requestBody
    });

    if (!response.ok) {
      throw new Error(`Ошибка при добавлении спина: ${response.status}`);
    }

    const result = await response.json();

    // Обновляем данные в cardsData
    const userIndex = cardsData.findIndex(user => user.id === userId);
    if (userIndex !== -1) {
      cardsData[userIndex].roulette = result.roulette || cardsData[userIndex].roulette + 1;
    }

    // Переотрисовываем карточки
    const query = document.getElementById('searchInput')?.value.trim() || '';
    const sortValue = document.getElementById('sortSelect')?.value || '';
    let filteredData = searchCards(query);
    filteredData = sortCards(filteredData, sortValue);
    renderCards(filteredData);

    console.log(`Спин успешно добавлен пользователю ${userId}`);
  } catch (error) {
    console.error('Не удалось добавить спин:', error);
    alert('Ошибка при добавлении спина: ' + error.message);
  }
  location.reload();
}

// Функция для поиска
function searchCards(query) {
  if (!query) return [...cardsData]; // Возвращаем копию массива

  const searchTerms = query.toLowerCase().split(' ').filter(term => term.trim());

  return cardsData.filter(item => {
    const firstName = item.first_name?.toLowerCase() || '';
    const lastName = item.last_name?.toLowerCase() || '';

    // Проверяем, совпадает ли любой из терминов с именем или фамилией
    return searchTerms.some(term =>
      firstName.includes(term) || lastName.includes(term)
    );
  });
}

// Функция для сортировки
function sortCards(data, sortValue) {
  if (!sortValue) return [...data]; // Возвращаем копию массива

  const sortedData = [...data];

  switch (sortValue) {
    case 'role':
      sortedData.sort((a, b) => (a.role || '').localeCompare(b.role || ''));
      break;
    case 'balance-asc':
      sortedData.sort((a, b) => (a.balance || 0) - (b.balance || 0));
      break;
    case 'balance-desc':
      sortedData.sort((a, b) => (b.balance || 0) - (a.balance || 0));
      break;
  }

  return sortedData;
}

// Обработчики событий для поиска и сортировки
function setupEventListeners() {
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');

  if (!searchInput || !sortSelect) return;

  const handleFilter = () => {
    const query = searchInput.value.trim();
    const sortValue = sortSelect.value;

    let filteredData = searchCards(query);
    filteredData = sortCards(filteredData, sortValue);

    renderCards(filteredData);
  };

  searchInput.addEventListener('input', handleFilter);
  sortSelect.addEventListener('change', handleFilter);
}

// Основной запрос данных
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
    if (!Array.isArray(data)) {
      throw new Error('Полученные данные не являются массивом');
    }

    cardsData = data; // Сохраняем данные в глобальную переменную
    renderCards(data); // Первоначальная отрисовка
    setupEventListeners(); // Настраиваем обработчики событий
  })
  .catch(error => {
    console.error("Ошибка загрузки данных:", error);
    const container = document.getElementById("cardsContainer");
    if (container) {
      const errorMsg = createElement('p', {}, 'Ошибка загрузки данных. Попробуйте позже.');
      container.appendChild(errorMsg);
    }
  });

document.addEventListener('click', (e) => {
  if (e.target.matches('[data-item-id]')) {
    const itemId = e.target.dataset.itemId;
    if (e.target.textContent === 'Удалить спин') {
      handleAddSpin(itemId, true);
      return;
    }
    handleAddSpin(itemId);
  }
});