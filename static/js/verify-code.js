function getCookie(name) {
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) return parts.pop().split(';').shift();
}

const jwtToken = getCookie('jwt_token');
const userData = localStorage.getItem('user');
const user = JSON.parse(userData);
const email = user?.email || 'Email не найден';

fetch('https://api.game-sense.ru/verify-code/send', {
	method: 'POST',
	headers: {
		'Authorization': `Bearer ${jwtToken}`,
		'Content-Type': 'application/json'
	},
	body: JSON.stringify({email:email})
})

document.getElementById("email").textContent = email;

const inputs = document.querySelectorAll('input');
const resendBtn = document.getElementById('resendBtn');

inputs[0].focus();

document.addEventListener('DOMContentLoaded', function() {
    const inputs = document.querySelectorAll('#send-code input');
    
    inputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            if (input.value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }

            const allFilled = Array.from(inputs).every(input => input.value.length === 1);
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
});

function sendData() {
	const code = Array.from(inputs).map(input => input.value).join('');
	const jwtToken = getCookie('jwt_token');
	const data = { email: email, code: code };

	fetch('https://api.game-sense.ru/verify-code', {
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
				const errorMessage = errorData.error || 'Неверный код';
				throw new Error(errorMessage);
			});
		}
		return response.json();
	})
	.then(result => {
		window.location.href = '/';
	})
	.catch(error => {
        showNotification(error.message, true);
    });
}

setTimeout(() => {
	resendBtn.classList.remove('deactivate');
}, 30000);

resendBtn.addEventListener('click', async () => {
	resendBtn.classList.add('deactivate');

	setTimeout(() => {
		resendBtn.classList.remove('deactivate');
	}, 30000);

	const jwtToken = getCookie('jwt_token');
    const data = { email: email };

    try {
        const response = await fetch('https://api.game-sense.ru/verify-code/send', {
        	method: 'POST',
        	headers: {
        		'Authorization': `Bearer ${jwtToken}`,
        		'Content-Type': 'application/json'
        	},
        	body: JSON.stringify(data)
        });

        if (!response.ok) {
        	let errorMessage = 'Ошибка на сервере';
        	const contentType = response.headers.get("content-type");
        	if (contentType && contentType.includes("application/json")) {
        		const errorData = await response.json();
        		errorMessage = errorData.error || errorMessage;
        	} else {
        		const errorText = await response.text();
        		errorMessage = errorText || errorMessage;
        	}

        	throw new Error(errorMessage);
        }

        const result = await response.json();

    } catch (error) {
        showNotification(error.message, true);
    }
});