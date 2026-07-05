function newPassword(e) {
    e.preventDefault();
    const form = e.target;
    
    const token = window.location.pathname.split('/reset-password/')[1];
    const password = document.querySelector('input[name="password"]').value;

    loading(form, true);
    
    fetch('https://api.game-sense.ru/new-password', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: password }) 
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Ошибка при получении данных пользователя');
        }
        return response.json();
    })
    .then(result => {
        showNotification("Пароль успешно изменён");
    })
    .catch(error => {
        showNotification(error);
    })
    .finally(() => {
        loading(form, false);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('newPassword');
    form.addEventListener('submit', newPassword);
});