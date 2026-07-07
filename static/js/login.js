const form = document.getElementById("loginForm");
const buttons = form.querySelectorAll("button");

const loginBtn = buttons[0];
const registerBtn = buttons[1];

const jwtToken = getCookie('jwt_token');

if (jwtToken) {
    window.location.href = '/';
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
        await updateUserData();
        window.location.href = '/verify';
    } catch (error) {
        console.error('Network or other error:', error);
        showNotification('Произошла ошибка сети или сервера', true);
    }
}

    // Первоначально слушаем только вход
    form.addEventListener('submit', handleLoginSubmit);

    // Функция для переключения на регистрацию
    function switchToRegister() {
        form.id = "registerForm";

        // Удаляем старый обработчик
        form.removeEventListener('submit', handleLoginSubmit);
        form.addEventListener('submit', handleRegisterSubmit);

        // Показываем имя и фамилию
        form.first_name.classList.remove("none");
        form.last_name.classList.remove("none");

        loginBtn.classList.add("iconoir-arrow-left-circle-solid");
        loginBtn.textContent = "";
        loginBtn.removeAttribute('style');
        registerBtn.style.flexGrow = '1';

        form.first_name.name = "first_name";
        form.last_name.name = "last_name";

        form.first_name.required = true;
        form.last_name.required = true;

        // Заменяем identifier на email
        const identifier = form.identifier;
        const emailField = document.createElement("input");
        emailField.type = "text";
        emailField.name = "email";
        emailField.placeholder = "E-mail:";
        emailField.required = true;
        emailField.value = identifier.value;

        identifier.parentNode.replaceChild(emailField, identifier);

        // Превращаем кнопку регистрации в submit
        registerBtn.type = "submit";
        registerBtn.classList.remove("outline-button");

        // Убираем submit у кнопки "Войти"
        loginBtn.type = "button";
    }

    // Функция для возврата к входу
    function switchToLogin() {
        form.id = "loginForm";

        // Удаляем обработчик регистрации
        form.removeEventListener('submit', handleRegisterSubmit);
        form.addEventListener('submit', handleLoginSubmit);

        // Скрываем имя и фамилию
        form.first_name.classList.add("none");
        form.last_name.classList.add("none");

        loginBtn.classList.remove("iconoir-arrow-left-circle-solid");
        loginBtn.textContent = "Войти";
        registerBtn.removeAttribute('style');
        loginBtn.style.flexGrow = '1';

        registerBtn.classList.add("outline-button");

        form.first_name.removeAttribute("name");
        form.last_name.removeAttribute("name");

        form.first_name.required = false;
        form.last_name.required = false;



        // Удаляем email и возвращаем identifier
        const emailField = form.email;
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