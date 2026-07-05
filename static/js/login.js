const form = document.getElementById("loginForm");
const buttons = form.querySelectorAll("button");

const loginBtn = buttons[0];
const registerBtn = buttons[1];

const jwtToken = getCookie('jwt_token');

if (jwtToken) {
    window.location.href = '/';
}

function getApiBase() {
    return (window.GS_API_BASE || "http://193.176.78.125:6001").replace(/\/+$/, "");
}

    // Функция для отправки формы входа
async function handleLoginSubmit(e) {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch(`${getApiBase()}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Ошибка входа');
        }

        const result = await response.json();
        document.cookie = `jwt_token=${result.token}; path=/; SameSite=Strict`;
        updateUserData();
        window.location.href = '/';
    } catch (error) {
        showNotification("Неверный логин или пароль", true);
    }
}

    // Функция для отправки формы регистрации
async function handleRegisterSubmit(e) {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch(`${getApiBase()}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const jsonData = await response.json();

        if (!response.ok) {
            if (response.status === 400) {
                showNotification(`Эта почта уже зарегистрирована`, true);
            } else {
                showNotification('Введите правильные данные', true);
            }
            return;
        }

        // Успешная регистрация
        document.cookie = `jwt_token=${jsonData.token}; path=/; SameSite=Strict`;
        updateUserData();
        window.location.href = '/';
    } catch (error) {
        console.error('Network or other error:', error);
        showNotification('Произошла ошибка сети или сервера', true);
    }
}

    // Первоначально слушаем только вход
    form.addEventListener('submit', handleLoginSubmit);

    // Функция для переключения на регистрацию
    function switchToRegister(e) {
        e.preventDefault();
        if (form.id === "registerForm") {
            return;
        }
        form.id = "registerForm";

        // Удаляем старый обработчик
        form.removeEventListener('submit', handleLoginSubmit);
        form.addEventListener('submit', handleRegisterSubmit);

        const firstName = form.querySelector('[name="first_name"]');
        const lastName = form.querySelector('[name="last_name"]');
        const identifier = form.querySelector('[name="identifier"]');

        // Показываем имя и фамилию
        firstName.classList.remove("none");
        lastName.classList.remove("none");

        loginBtn.classList.add("iconoir-arrow-left-circle-solid");
        loginBtn.textContent = "";
        loginBtn.removeAttribute('style');
        registerBtn.style.flexGrow = '1';

        firstName.required = true;
        lastName.required = true;

        // Заменяем identifier на email
        const emailField = document.createElement("input");
        emailField.type = "text";
        emailField.name = "email";
        emailField.placeholder = "E-mail:";
        emailField.required = true;
        if (identifier) {
            emailField.value = identifier.value;
            identifier.parentNode.replaceChild(emailField, identifier);
        } else {
            form.insertBefore(emailField, form.querySelector('[name="password"]'));
        }

        // Превращаем кнопку регистрации в submit
        registerBtn.type = "submit";
        registerBtn.classList.remove("outline-button");

        // Убираем submit у кнопки "Войти"
        loginBtn.type = "button";
    }

    // Функция для возврата к входу
    function switchToLogin(e) {
        e.preventDefault();
        if (form.id === "loginForm") {
            return;
        }
        form.id = "loginForm";

        // Удаляем обработчик регистрации
        form.removeEventListener('submit', handleRegisterSubmit);
        form.addEventListener('submit', handleLoginSubmit);

        const firstName = form.querySelector('[name="first_name"]');
        const lastName = form.querySelector('[name="last_name"]');

        // Скрываем имя и фамилию
        firstName.classList.add("none");
        lastName.classList.add("none");

        loginBtn.classList.remove("iconoir-arrow-left-circle-solid");
        loginBtn.textContent = "Войти";
        registerBtn.removeAttribute('style');
        loginBtn.style.flexGrow = '1';

        registerBtn.classList.add("outline-button");

        firstName.required = false;
        lastName.required = false;

        // Удаляем email и возвращаем identifier
        const emailField = form.querySelector('[name="email"]');
        if (emailField) {
            const identifierField = document.createElement("input");
            identifierField.type = "text";
            identifierField.name = "identifier";
            identifierField.placeholder = "E-mail:";
            identifierField.required = true;
            identifierField.value = emailField.value;

            emailField.parentNode.replaceChild(identifierField, emailField);
        }

        // Возвращаем тип кнопок
        loginBtn.type = "submit";
        registerBtn.type = "button";
    }

    // Обработчики событий
    loginBtn.addEventListener("click", switchToLogin);
    registerBtn.addEventListener("click", switchToRegister);
