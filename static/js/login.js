const form = document.getElementById("loginForm");
const buttons = form.querySelectorAll("button");
const loginBtn = buttons[0];
const registerBtn = buttons[1];
const loginEmail = document.getElementById("loginEmail");
const registerEmail = document.getElementById("registerEmail");
const firstName = document.getElementById("first_name");
const lastName = document.getElementById("last_name");

const jwtToken = getCookie('jwt_token');
if (jwtToken) {
    window.location.href = '/';
}

function setRegisterMode(isRegister) {
    form.id = isRegister ? "registerForm" : "loginForm";

    document.querySelectorAll('.auth-field--login').forEach(el => {
        el.classList.toggle('none', isRegister);
    });
    document.querySelectorAll('.auth-field--register').forEach(el => {
        el.classList.toggle('none', !isRegister);
    });

    loginEmail.required = !isRegister;
    loginEmail.disabled = isRegister;
    registerEmail.required = isRegister;

    firstName.required = isRegister;
    lastName.required = isRegister;

    if (isRegister) {
        loginBtn.classList.add("iconoir-arrow-left-circle-solid");
        loginBtn.textContent = "";
        loginBtn.removeAttribute('style');
        registerBtn.style.flexGrow = '1';
        registerBtn.type = "submit";
        registerBtn.classList.remove("outline-button");
        loginBtn.type = "button";

        if (!registerEmail.value && loginEmail.value.includes('@')) {
            registerEmail.value = loginEmail.value.trim();
        }
        registerEmail.focus();
    } else {
        loginBtn.classList.remove("iconoir-arrow-left-circle-solid");
        loginBtn.textContent = "Войти";
        registerBtn.removeAttribute('style');
        loginBtn.style.flexGrow = '1';
        registerBtn.type = "button";
        registerBtn.classList.add("outline-button");
        loginBtn.type = "submit";
        loginEmail.focus();
    }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch(`${getApiBase()}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

    const payload = {
        first_name: firstName.value.trim(),
        last_name: lastName.value.trim(),
        email: registerEmail.value.trim().toLowerCase(),
        password: form.password.value
    };

    if (!payload.first_name || !payload.last_name || !payload.email || !payload.password) {
        showNotification('Заполните все поля регистрации', true);
        return;
    }

    try {
        const response = await fetch(`${getApiBase()}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const jsonData = await response.json().catch(() => ({}));

        if (!response.ok) {
            showNotification(jsonData.error || 'Не удалось зарегистрироваться', true);
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
    if (form.id === "registerForm") return;
    form.removeEventListener('submit', handleLoginSubmit);
    form.addEventListener('submit', handleRegisterSubmit);
    setRegisterMode(true);
}

function switchToLogin() {
    if (form.id === "loginForm") return;
    form.removeEventListener('submit', handleRegisterSubmit);
    form.addEventListener('submit', handleLoginSubmit);
    setRegisterMode(false);
}

loginBtn.addEventListener("click", switchToLogin);
registerBtn.addEventListener("click", switchToRegister);
