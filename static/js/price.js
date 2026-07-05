const host = "https://api.game-sense.ru";
const url = `${host}/time_packages`;
const container = document.getElementById("cardsContainer");

// Добавляем класс загрузки
container.classList.remove('loaded');

fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
})
.then(response => {
    if (!response.ok) throw new Error(`Ошибка сети: ${response.status}`);
    return response.json();
})
.then(data => {
    container.innerHTML = '';

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
            <img alt="Пакет времени" loading="lazy" src="${host}/images/time_packages/${item.id}">
            <h5>${item.price}₽</h5>
        `;
        container.appendChild(card);
    });

    // Включаем анимации после загрузки всех карточек
    setTimeout(() => {
        container.classList.add('loaded');
    }, 100);
})
.catch(error => {
    console.error("Ошибка загрузки данных:", error);
    container.innerHTML = "<h4>Данные устарели. Перезайдите в аккаунт</h4>";
});