function reset(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    loading(form, true);
    
    fetch('https://api.game-sense.ru/reset-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Ошибка при получении данных пользователя');
        }
        return response.json();
    })
    .then(result => {
        showNotification("Письмо отправлено на вашу почту");
    })
    .catch(error => {
        showNotification(error);
    })
    .finally(() => {
        loading(form, false);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const formReset = document.getElementById('reset-password');
    formReset.addEventListener('submit', reset);
});