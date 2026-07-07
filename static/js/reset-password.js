function reset(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    loading(form, true);
    
    fetch(`${getApiBase()}/reset-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            return response.json()
                .then(data => {
                    throw new Error(data.error || 'Ошибка при отправке письма');
                });
        }
        return response.json();
    })
    .then(result => {
        showNotification("Письмо отправлено на вашу почту");
    })
    .catch(error => {
        showNotification(error.message || 'Ошибка при отправке письма', true);
    })
    .finally(() => {
        loading(form, false);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const formReset = document.getElementById('reset-password');
    formReset.addEventListener('submit', reset);
});