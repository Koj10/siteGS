(function () {
    const form = document.getElementById("settingsForm");
    if (!form) return;

    const birthdayInput = document.getElementById("settingsBirthday");
    const birthdayHint = document.getElementById("settingsBirthdayHint");
    const profilePublicInput = document.getElementById("settingsProfilePublic");
    const birthdayField = birthdayInput ? initDmyDateField(birthdayInput) : null;

    function fillForm(user) {
        form.first_name.value = user.first_name || "";
        form.last_name.value = user.last_name || "";
        form.tag.value = user.tag || "";
        if (profilePublicInput) {
            profilePublicInput.checked = Boolean(user.profile_public);
        }

        if (user.birthday_locked && user.date_of_birth) {
            birthdayField?.setValue(user.date_of_birth);
            birthdayField?.setDisabled(true);
            birthdayHint.textContent = "День рождения уже указан и не может быть изменён.";
        } else {
            birthdayField?.setValue("");
            birthdayField?.setDisabled(false);
            birthdayHint.textContent = "День рождения можно указать только один раз. Формат: ДД/ММ/ГГГГ.";
        }
    }

    async function loadUser() {
        const user = await updateUserData();
        if (user) fillForm(user);
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const payload = {
            first_name: form.first_name.value.trim(),
            last_name: form.last_name.value.trim(),
            tag: form.tag.value.trim(),
            profile_public: Boolean(profilePublicInput?.checked),
        };

        if (!birthdayInput.disabled && birthdayInput.value) {
            const birthday = formatDmyDate(birthdayInput.value.trim());
            if (!toIsoDate(birthday)) {
                showNotification("Некорректная дата рождения. Формат: ДД/ММ/ГГГГ", true);
                return;
            }
            payload.date_of_birth = birthday;
        }

        try {
            const response = await fetch(`${getApiBase()}/profile/settings`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getCookie("jwt_token")}`,
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Не удалось сохранить");

            showNotification("Настройки сохранены");
            const user = await updateUserData();
            if (user) {
                fillForm(user);
                document.dispatchEvent(new CustomEvent("userDataUpdated", { detail: user }));
            }
        } catch (error) {
            showNotification(error.message || "Ошибка сохранения", true);
        }
    });

    loadUser();
})();
