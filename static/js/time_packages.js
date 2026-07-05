// Замените на ваш реальный адрес
const host = "https://api.game-sense.ru";
const url = `${host}/time_packages`;

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

const jwtToken = getCookie('jwt_token');

fetch(url, {method: 'GET',
  headers: {
            'Authorization': `Bearer ${jwtToken}`, // добавляем токен
            'Content-Type': 'application/json'
          }})
.then(response => {
  if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);
  return response.json();
})
.then(data => {
  const container = document.getElementById("cardsContainer");
  const blockedContainer = document.getElementById("cardsContainerBlock");

    // Проверяем, существуют ли нужные контейнеры
  if (!container || !blockedContainer) {
    console.error("Контейнеры не найдены на странице.");
    return;
  }

  if (!Array.isArray(data)) {
    console.error("Полученные данные не являются массивом:", data);
    container.innerHTML = "<p>Ошибка: данные пришли в неверном формате.</p>";
    return;
  }

  if (data.length === 0) {
    container.innerHTML = "<p>Нет доступных пакетов времени.</p>";
    return;
  }

  data.forEach(item => {
    const card = document.createElement("div");
    card.className = "card card_product";

    card.innerHTML = `
        <img alt="Пакет" loading="eager" src="${host}/images/time_packages/${item.id}">
        <h5 class="custom-text">${item.price}₽</h5>
        <button class="buy-button"><h6>Купить</h6></button>
    `;

      // Обработчик клика по кнопке
    const buyButton = card.querySelector(".buy-button");
    buyButton.addEventListener("click", () => {
      sendBuyRequest(item.id);
    });

      // Проверяем статус is_active
    if (item.is_active === 2) {
        card.classList.add("deactivate"); // Добавляем класс
        blockedContainer.appendChild(card); // В блокированный контейнер
      } else {
        container.appendChild(card); // В обычный контейнер
      }
    });
})
.catch(error => {
  console.error("Ошибка загрузки данных:", error);
  const container = document.getElementById("cardsContainer");
  if (container) {
    container.innerHTML = "<h4>Данные устарели. Перезайдите в аккаунт</h4>";
  }
});

// Функция для отправки POST-запроса
function sendBuyRequest(productId) {
  const jwtToken = getCookie('jwt_token');
  const buyUrl = `${host}/buy/time_packages`; // URL для покупки

  fetch(buyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      'Authorization': `Bearer ${jwtToken}`
    },
    body: JSON.stringify({ id: productId, quality:1 }) // Отправляем id товара
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Ошибка запроса: ${response.status}`);
    }
    return response.json();
  })
  .then(result => {
    updateUserData()
    showNotification("Товар добавлен в профиль");
  })
  .catch(error => {
    console.error("Ошибка покупки:", error);
    showNotification("Недостаточный баланс :(");
  });
}

// Форматирование даты и времени
function formatDateTime(dateString) {
  if (!dateString) return 'Не активировано';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? 'Неверная дата' : date.toLocaleString();
}