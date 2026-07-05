document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    if (!form) {
        console.error('loginForm не найден');
        return;
    }

    const buttons = form.querySelectorAll('button');
    const loginBtn = buttons[0];
    const registerBtn = buttons[1];

    if (typeof getCookie === 'function' && getCookie('jwt_token')) {
        window.location.href = '/';
        return;
    }

    function getApiBase() {
        return (window.GS_API_BASE || 'http://193.176.78.125:6001').replace(/\/+$/, '');
    }

    async function handleLoginSubmit(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form));

        try {
            const response = await fetch(`${getApiBase()}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error('Ошибка входа');
            }

            const result = await response.json();
            document.cookie = `jwt_token=${result.token}; path=/; SameSite=Strict`;
            if (typeof updateUserData === 'function') {
                updateUserData();
            }
            window.location.href = '/';
        } catch (error) {
            console.error('Login error:', error);
            if (typeof showNotification === 'function') {
                showNotification('Неверный логин или пароль', true);
            }
        }
    }

    async function handleRegisterSubmit(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form));

        try {
            const response = await fetch(`${getApiBase()}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const jsonData = await response.json();

            if (!response.ok) {
                const message = response.status === 400
                    ? 'Эта почта уже зарегистрирована'
                    : (jsonData.error || 'Введите правильные данные');
                if (typeof showNotification === 'function') {
                    showNotification(message, true);
                }
                return;
            }

            document.cookie = `jwt_token=${jsonData.token}; path=/; SameSite=Strict`;
            if (typeof updateUserData === 'function') {
                updateUserData();
            }
            window.location.href = '/';
        } catch (error) {
            console.error('Register error:', error);
            if (typeof showNotification === 'function') {
                showNotification('Произошла ошибка сети или сервера', true);
            }
        }
    }

    form.addEventListener('submit', handleLoginSubmit);

    function switchToRegister(e) {
        e.preventDefault();
        if (form.id === 'registerForm') {
            return;
        }
        form.id = 'registerForm';

        form.removeEventListener('submit', handleLoginSubmit);
        form.addEventListener('submit', handleRegisterSubmit);

        const firstName = form.querySelector('[name="first_name"]');
        const lastName = form.querySelector('[name="last_name"]');
        const identifier = form.querySelector('[name="identifier"]');

        firstName.classList.remove('none');
        lastName.classList.remove('none');

        loginBtn.classList.add('iconoir-arrow-left-circle-solid');
        loginBtn.textContent = '';
        loginBtn.removeAttribute('style');
        registerBtn.style.flexGrow = '1';

        firstName.required = true;
        lastName.required = true;

        const emailField = document.createElement('input');
        emailField.type = 'text';
        emailField.name = 'email';
        emailField.placeholder = 'E-mail:';
        emailField.required = true;
        if (identifier) {
            emailField.value = identifier.value;
            identifier.parentNode.replaceChild(emailField, identifier);
        } else {
            form.insertBefore(emailField, form.querySelector('[name="password"]'));
        }

        registerBtn.type = 'submit';
        registerBtn.classList.remove('outline-button');
        loginBtn.type = 'button';
    }

    function switchToLogin(e) {
        e.preventDefault();
        if (form.id === 'loginForm') {
            return;
        }
        form.id = 'loginForm';

        form.removeEventListener('submit', handleRegisterSubmit);
        form.addEventListener('submit', handleLoginSubmit);

        const firstName = form.querySelector('[name="first_name"]');
        const lastName = form.querySelector('[name="last_name"]');

        firstName.classList.add('none');
        lastName.classList.add('none');

        loginBtn.classList.remove('iconoir-arrow-left-circle-solid');
        loginBtn.textContent = 'Войти';
        registerBtn.removeAttribute('style');
        loginBtn.style.flexGrow = '1';

        registerBtn.classList.add('outline-button');

        firstName.required = false;
        lastName.required = false;

        const emailField = form.querySelector('[name="email"]');
        if (emailField) {
            const identifierField = document.createElement('input');
            identifierField.type = 'text';
            identifierField.name = 'identifier';
            identifierField.placeholder = 'E-mail:';
            identifierField.required = true;
            identifierField.value = emailField.value;
            emailField.parentNode.replaceChild(identifierField, emailField);
        }

        loginBtn.type = 'submit';
        registerBtn.type = 'button';
    }

    loginBtn.addEventListener('click', switchToLogin);
    registerBtn.addEventListener('click', switchToRegister);
});
