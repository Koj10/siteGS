// Функция для получения значения куки по имени
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// Функция для обновления данных пользователя
function updateUserData() {
    const jwtToken = getCookie('jwt_token');

    if (!jwtToken) {
        return Promise.resolve(null);
    }

    return fetch(`${getApiBase()}/profile`, {
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
        localStorage.setItem('user', JSON.stringify(result));
        window.dispatchEvent(new CustomEvent('gamesense:user-updated', { detail: result }));
        return result;
    })
    .catch(error => {
        console.error('Ошибка:', error);
        return null;
    });
}

window.updateUserData = updateUserData;
window.getCookie = getCookie;