(function () {
    const DMY_RE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;
    const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

    function parseDateParts(value) {
        if (!value) return null;
        const raw = String(value).trim();
        let match = ISO_RE.exec(raw);
        if (match) {
            return { day: +match[3], month: +match[2], year: +match[1] };
        }
        match = DMY_RE.exec(raw);
        if (match) {
            return { day: +match[1], month: +match[2], year: +match[3] };
        }
        return null;
    }

    function isValidDateParts(parts) {
        const date = new Date(parts.year, parts.month - 1, parts.day);
        return (
            date.getFullYear() === parts.year &&
            date.getMonth() === parts.month - 1 &&
            date.getDate() === parts.day
        );
    }

    function formatDmyDate(value) {
        const parts = parseDateParts(value);
        if (!parts || !isValidDateParts(parts)) {
            return value ? String(value) : '';
        }
        const day = String(parts.day).padStart(2, '0');
        const month = String(parts.month).padStart(2, '0');
        return `${day}/${month}/${parts.year}`;
    }

    function toIsoDate(value) {
        const parts = parseDateParts(value);
        if (!parts || !isValidDateParts(parts)) return null;
        const day = String(parts.day).padStart(2, '0');
        const month = String(parts.month).padStart(2, '0');
        return `${parts.year}-${month}-${day}`;
    }

    function compareDmyDates(a, b) {
        const isoA = toIsoDate(a);
        const isoB = toIsoDate(b);
        if (!isoA || !isoB) return null;
        return isoA.localeCompare(isoB);
    }

    function formatDmyDateTime(value) {
        if (!value) return '—';
        const normalized = String(value).includes('T')
            ? value
            : String(value).replace(' ', 'T');
        const date = new Date(normalized);
        if (Number.isNaN(date.getTime())) return String(value);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    function attachDmyInputMask(input) {
        if (!input || input.dataset.dmyMask === '1') return;
        input.dataset.dmyMask = '1';
        input.setAttribute('inputmode', 'numeric');
        input.setAttribute('autocomplete', 'bday');

        input.addEventListener('input', () => {
            const digits = input.value.replace(/\D/g, '').slice(0, 8);
            let formatted = '';
            if (digits.length <= 2) {
                formatted = digits;
            } else if (digits.length <= 4) {
                formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
            } else {
                formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
            }
            if (input.value !== formatted) {
                input.value = formatted;
            }
        });
    }

    function initDmyDateField(textInput) {
        if (!textInput) return null;
        if (textInput._dmyFieldApi) return textInput._dmyFieldApi;

        attachDmyInputMask(textInput);

        let field = textInput.closest('.dmy-date-field');
        if (!field) {
            field = document.createElement('div');
            field.className = 'dmy-date-field';
            textInput.parentNode.insertBefore(field, textInput);
            field.appendChild(textInput);
        }

        const picker = document.createElement('input');
        picker.type = 'date';
        picker.className = 'dmy-date-field__picker';
        picker.tabIndex = -1;
        picker.setAttribute('aria-hidden', 'true');

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dmy-date-field__btn';
        btn.setAttribute('aria-label', 'Выбрать дату');
        btn.innerHTML = '<i class="iconoir-calendar"></i>';

        field.appendChild(picker);
        field.appendChild(btn);

        function syncPickerToText() {
            if (picker.value) {
                textInput.value = formatDmyDate(picker.value);
            }
        }

        function syncTextToPicker() {
            const iso = toIsoDate(textInput.value.trim());
            picker.value = iso || '';
        }

        picker.addEventListener('change', syncPickerToText);
        textInput.addEventListener('change', syncTextToPicker);
        textInput.addEventListener('blur', syncTextToPicker);

        btn.addEventListener('click', () => {
            if (textInput.disabled) return;
            syncTextToPicker();
            if (typeof picker.showPicker === 'function') {
                picker.showPicker();
            } else {
                picker.focus();
                picker.click();
            }
        });

        const api = {
            setValue(value) {
                const dmy = value ? formatDmyDate(value) : '';
                textInput.value = dmy;
                picker.value = dmy ? (toIsoDate(dmy) || '') : '';
            },
            setDisabled(disabled) {
                textInput.disabled = disabled;
                picker.disabled = disabled;
                btn.disabled = disabled;
                field.classList.toggle('dmy-date-field--disabled', disabled);
            },
        };

        textInput._dmyFieldApi = api;
        return api;
    }

    window.formatDmyDate = formatDmyDate;
    window.toIsoDate = toIsoDate;
    window.compareDmyDates = compareDmyDates;
    window.formatDmyDateTime = formatDmyDateTime;
    window.attachDmyInputMask = attachDmyInputMask;
    window.initDmyDateField = initDmyDateField;
})();
