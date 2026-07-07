let email = '';

function getAuthHeaders() {
    const jwtToken = getCookie('jwt_token');
    return {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
    };
}

async function loadUserEmail() {
    const jwtToken = getCookie('jwt_token');
    if (!jwtToken) {
        window.location.href = '/login';
        return false;
    }

    const response = await fetch(`${getApiBase()}/profile`, {
        method: 'GET',
        headers: getAuthHeaders()
    });

    if (!response.ok) {
        throw new Error('Не удалось загрузить профиль');
    }

    const user = await response.json();
    email = user.email;
    document.getElementById('email').textContent = email;
    return true;
}

async function sendVerificationCode() {
    const response = await fetch(`${getApiBase()}/verify-code/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || 'Не удалось отправить код');
    }
}

function sendData() {
    const inputs = document.querySelectorAll('#send-code input');
    const code = Array.from(inputs).map(input => input.value).join('');
    const data = { email, code };

    fetch(`${getApiBase()}/verify-code`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            return response.json()
                .then(errorData => {
                    throw new Error(errorData.error || 'Неверный код');
                });
        }
        return response.json();
    })
    .then(() => {
        window.location.href = '/';
    })
    .catch(error => {
        showNotification(error.message, true);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const inputs = document.querySelectorAll('#send-code input');
    const resendBtn = document.getElementById('resendBtn');

    try {
        const loaded = await loadUserEmail();
        if (!loaded) return;
        await sendVerificationCode();
    } catch (error) {
        showNotification(error.message, true);
    }

    inputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            if (input.value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }

            const allFilled = Array.from(inputs).every(item => item.value.length === 1);
            if (allFilled) {
                sendData();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' || e.key === 'Delete') {
                if (input.value === '' && index > 0) {
                    inputs[index - 1].focus();
                    inputs[index - 1].value = '';
                } else if (input.value !== '') {
                    input.value = '';
                }
                e.preventDefault();
            }
        });
    });

    if (inputs[0]) inputs[0].focus();

    setTimeout(() => {
        resendBtn.classList.remove('deactivate');
    }, 30000);

    resendBtn.addEventListener('click', async () => {
        resendBtn.classList.add('deactivate');

        setTimeout(() => {
            resendBtn.classList.remove('deactivate');
        }, 30000);

        try {
            await sendVerificationCode();
            showNotification('Код отправлен повторно');
        } catch (error) {
            showNotification(error.message, true);
        }
    });
});
