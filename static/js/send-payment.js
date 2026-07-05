document.addEventListener('DOMContentLoaded', function() {
    const amountInput = document.getElementById('amount');
    const confirmBtn = document.getElementById('confirm-btn');

    amountInput.addEventListener('input', validateForm);

    function validateForm() {
        const amount = parseFloat(amountInput.value);
        const isAmountValid = !isNaN(amount) && amount >= 50 && amount <= 10000;

        if (isAmountValid) {
            confirmBtn.classList.remove('deactivate');
            confirmBtn.disabled = false;
        } else {
            confirmBtn.classList.add('deactivate');
            confirmBtn.disabled = true;
        }
    }

    confirmBtn.addEventListener('click', function() {
        if (!this.classList.contains('deactivate')) {
            const amount = amountInput.value;
            const userData = localStorage.getItem('user');
            const user = JSON.parse(userData);
            
            sendPayment(amount, user.email);
        }
    });
});

function sendPayment(value, email) {
    const jwtToken = getCookie('jwt_token');
    const form = document.querySelector('form');
    
    const data = {
        value: value,
        email: email
    };
    
    loading(form, true);
    
    fetch('https://api.game-sense.ru/payments', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Ошибка при обработке платежа');
        }
        return response.json();
    })
    .then(result => {
        window.location.href = result; 
    })
    .catch(error => {
        showNotification(error.message, true);
    })
    .finally(() => {
        loading(form, false);
    });
}
