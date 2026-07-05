// Функция для получения значения куки по имени
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// Функция для обновления данных пользователя
function updateUserData() {
    // Получаем jwt_token из куки
    const jwtToken = getCookie('jwt_token');

    if (!jwtToken) {
        return;
    }

    // Выполняем GET-запрос без тела
    fetch(`${getApiBase()}/profile`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Ошибка при получении данных пользователя');
        }
        return response.json();
    })
    .then(result => {
        // Сохраняем данные пользователя в localStorage
        localStorage.setItem('user', JSON.stringify(result));
    })
    .catch(error => {
        console.error('Ошибка:', error);
    });
}

window.updateUserData = updateUserData;
window.getCookie = getCookie;