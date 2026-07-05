function reset(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    const apiBase = (window.GS_API_BASE || "http://127.0.0.1:5000").replace(/\/+$/, "");

    loading(form, true);
    
    fetch(`${apiBase}/reset-password`, {
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