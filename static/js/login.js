const form = document.getElementById("loginForm");
const buttons = form.querySelectorAll("button");

const loginBtn = buttons[0];
const registerBtn = buttons[1];

const jwtToken = getCookie('jwt_token');

if (jwtToken) {
    window.location.href = '/';
}

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
                showNotification(jsonData.error || 'Эта почта уже зарегистрирована', true);
            } else {
                showNotification('Введите правильные данные', true);
            }
            return;
        }

        document.cookie = `jwt_token=${jsonData.token}; path=/; SameSite=Strict`;
        await updateUserData();
        window.location.href = '/verify';
    } catch (error) {
        console.error('Network or other error:', error);
        showNotification('Произошла ошибка сети или сервера', true);
    }
}

form.addEventListener('submit', handleLoginSubmit);

function switchToRegister() {
    form.id = "registerForm";

    form.removeEventListener('submit', handleLoginSubmit);
    form.addEventListener('submit', handleRegisterSubmit);

    form.first_name.classList.remove("none");
    form.last_name.classList.remove("none");

    document.querySelectorAll('.auth-label--login').forEach(el => el.classList.add('none'));

    loginBtn.classList.add("iconoir-arrow-left-circle-solid");
    loginBtn.textContent = "";
    loginBtn.removeAttribute('style');
    registerBtn.style.flexGrow = '1';

    form.first_name.name = "first_name";
    form.last_name.name = "last_name";

    form.first_name.required = true;
    form.last_name.required = true;

    const identifier = form.identifier;
    const emailField = document.createElement("input");
    emailField.type = "text";
    emailField.name = "email";
    emailField.placeholder = "E-mail:";
    emailField.required = true;
    emailField.value = identifier.value.includes('@') ? identifier.value : '';

    identifier.parentNode.replaceChild(emailField, identifier);

    registerBtn.type = "submit";
    registerBtn.classList.remove("outline-button");
    loginBtn.type = "button";
}

function switchToLogin() {
    form.id = "loginForm";

    form.removeEventListener('submit', handleRegisterSubmit);
    form.addEventListener('submit', handleLoginSubmit);

    form.first_name.classList.add("none");
    form.last_name.classList.add("none");

    document.querySelectorAll('.auth-label--login').forEach(el => el.classList.remove('none'));

    loginBtn.classList.remove("iconoir-arrow-left-circle-solid");
    loginBtn.textContent = "Войти";
    registerBtn.removeAttribute('style');
    loginBtn.style.flexGrow = '1';

    registerBtn.classList.add("outline-button");

    form.first_name.removeAttribute("name");
    form.last_name.removeAttribute("name");

    form.first_name.required = false;
    form.last_name.required = false;

    const emailField = form.email;
    if (emailField) {
        const identifierField = document.createElement("input");
        identifierField.type = "text";
        identifierField.name = "identifier";
        identifierField.placeholder = "+7XXXXXXXXXX или email";
        identifierField.required = true;
        identifierField.value = emailField.value;

        emailField.parentNode.replaceChild(identifierField, emailField);
    }

    loginBtn.type = "submit";
    registerBtn.type = "button";
}

loginBtn.addEventListener("click", switchToLogin);
registerBtn.addEventListener("click", switchToRegister);
