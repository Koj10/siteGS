function activate_package(id_product) {
    const jwtToken = getCookie('jwt_token');
    const pc_token = getCookie('pc_token');
    const data = { 
        id: id_product, 
        type: "time_packages",
        quality: 1,
        token: `${pc_token}`
         };

    fetch(`${getApiBase()}/activate_product`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            return response.json()
                .then(errorData => {
                    const errorMessage = errorData.error;
                    throw new Error(errorMessage);
                });
        }
        return response.json();
    })
    .then(result => {
        window.location.href = '/profile';
    })
    .catch(error => {
        showNotification(error.message, true);
    });
}

function redeem_coupon() {
    const jwtToken = getCookie('jwt_token');
    const pc_token = getCookie('pc_token');
    const input = document.getElementById('couponCode');
    const code = input?.value.trim().toUpperCase();

    if (!pc_token) {
        showNotification('Активация купона доступна только с компьютера клуба', true);
        return;
    }
    if (!code) {
        showNotification('Введите код купона', true);
        return;
    }

    fetch(`${getApiBase()}/coupons/redeem`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${jwtToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code, token: pc_token })
    })
    .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Ошибка активации');
        return data;
    })
    .then(result => {
        if (input) input.value = '';
        showNotification(result.message || 'Купон активирован');
        setTimeout(() => { window.location.href = '/profile'; }, 1200);
    })
    .catch(error => {
        showNotification(error.message, true);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const pcToken = getCookie('pc_token');
    const section = document.getElementById('couponSection');
    const btn = document.getElementById('couponRedeemBtn');
    const input = document.getElementById('couponCode');

    if (pcToken && section) {
        section.hidden = false;
    }

    btn?.addEventListener('click', redeem_coupon);
    input?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') redeem_coupon();
    });
});