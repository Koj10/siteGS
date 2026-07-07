let cachedTimePackages = null;

function parseDbDateTime(value) {
    if (!value) return null;
    const date = new Date(String(value).replace(' ', 'T'));
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDuration(ms) {
    if (ms <= 0) return '0ч 0мин 0сек';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}ч ${minutes}мин ${seconds}сек`;
}

function getSessionRemainingMs(pc) {
    if (pc.session_started_at && pc.session_duration_minutes) {
        const start = parseDbDateTime(pc.session_started_at);
        if (!start) return 0;
        const totalMs = Number(pc.session_duration_minutes) * 60 * 1000;
        const elapsed = Date.now() - start.getTime();
        return Math.max(0, totalMs - elapsed);
    }

    const end = parseDbDateTime(pc.time_active);
    if (!end) return 0;
    return Math.max(0, end.getTime() - Date.now());
}

function formatPackageDuration(minutes) {
    const total = Number(minutes) || 0;
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    if (hours && mins) return `${hours} ч ${mins} мин`;
    if (hours) return `${hours} ч`;
    return `${mins} мин`;
}

async function loadTimePackages() {
    if (cachedTimePackages) return cachedTimePackages;
    const response = await fetch(`${getApiBase()}/time_packages`, { cache: 'no-store' });
    const packages = await response.json();
    cachedTimePackages = (packages || []).filter(pkg => Number(pkg.is_active) !== 2);
    return cachedTimePackages;
}

async function activateCouponOnPc(computerId, packageId) {
    const jwtToken = getCookie('jwt_token');
    const response = await fetch(`${getApiBase()}/admin/coupons`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({
            computer_id: Number(computerId),
            time_package_id: Number(packageId)
        })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Ошибка ${response.status}`);
    return data;
}

let pendingEndSession = null;

function openEndSessionModal(computerId, numberPc) {
    const modal = document.getElementById('endSessionModal');
    const numberEl = document.getElementById('endSessionPcNumber');
    if (!modal || !numberEl) return;

    pendingEndSession = { computerId: Number(computerId), numberPc };
    numberEl.textContent = numberPc;
    modal.hidden = false;
}

function closeEndSessionModal() {
    const modal = document.getElementById('endSessionModal');
    if (modal) modal.hidden = true;
    pendingEndSession = null;
}

async function endSessionEarly(computerId) {
    const jwtToken = getCookie('jwt_token');
    const response = await fetch(`${getApiBase()}/admin/sessions/end`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ computer_id: Number(computerId) })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Ошибка ${response.status}`);
    return data;
}

function initEndSessionModal() {
    if (window.endSessionModalInitialized) return;
    window.endSessionModalInitialized = true;

    const modal = document.getElementById('endSessionModal');
    const confirmBtn = document.getElementById('endSessionConfirm');
    if (!modal || !confirmBtn) return;

    modal.addEventListener('click', (event) => {
        if (event.target.closest('[data-close-end-session]')) {
            closeEndSessionModal();
        }
    });

    confirmBtn.addEventListener('click', async () => {
        if (!pendingEndSession) return;

        confirmBtn.disabled = true;
        try {
            const result = await endSessionEarly(pendingEndSession.computerId);
            showNotification(`ПК №${result.number_pc}: сессия завершена досрочно`);
            closeEndSessionModal();
            showPC();
            if (typeof window.reloadAdminReports === 'function') {
                window.reloadAdminReports();
            }
        } catch (error) {
            showNotification(error.message, true);
        } finally {
            confirmBtn.disabled = false;
        }
    });
}

function isAdminSessionsPage() {
    return Boolean(document.getElementById('vipPcContainer'));
}

function formatPcStatus(status) {
    const labels = {
        активен: 'Активен',
        занят: 'Занят',
        заблокирован: 'Заблокирован',
        ремонт: 'На ремонте'
    };
    return labels[status] || status;
}

function buildPackageOptions(packages) {
    if (!packages.length) {
        return '<option value="">Нет активных пакетов</option>';
    }
    return '<option value="">Выберите пакет</option>' +
        packages.map(pkg => `
            <option value="${pkg.id}">
                ${pkg.name} — ${formatPackageDuration(pkg.duration_minutes)} — ${Math.round(pkg.display_price)} ₽
            </option>
        `).join('');
}

function showPC() {
    const jwtToken = getCookie('jwt_token');

    fetch(`${getApiBase()}/pc`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
        },
        cache: 'no-store'
    })
    .then(response => response.json())
    .then(data => {
        const container = document.getElementById("pcContainer");
        const vipContainer = document.getElementById("vipPcContainer");
        const dropdownContainer = document.getElementById("dropdownContainer");
        const busyPcContainer = document.getElementById("busyPcContainer");

        container.innerHTML = '';
        if (vipContainer) vipContainer.innerHTML = '';
        dropdownContainer.innerHTML = '';
        if (busyPcContainer) busyPcContainer.innerHTML = '';

        data.sort((a, b) => a.number_pc - b.number_pc);

        const busyPcs = [];

        const adminPage = isAdminSessionsPage();
        if (adminPage) initEndSessionModal();

        data.forEach(item => {
            const pc = document.createElement("div");
            pc.className = "computer";
            pc.id = item.id;
            pc.setAttribute('dropdown', `dropdown${item.id}`);

            const dropdown = document.createElement("div");
            dropdown.id = `dropdown${item.id}`;
            dropdown.className = "dropdown-content";
            dropdown.addEventListener('click', (event) => event.stopPropagation());
            dropdown.innerHTML = adminPage ? `
                <h4>Компьютер: ${item.number_pc}</h4>
                <div class="pc-dropdown-section">
                    <div class="pc-status-readonly">
                        <span class="admin-label">Статус</span>
                        <span class="pc-status-readonly__value">${formatPcStatus(item.status)}</span>
                    </div>
                    <label class="admin-label">Зона</label>
                    <select class="zonePC">
                        <option value="regular">Обычная</option>
                        <option value="vip">VIP</option>
                    </select>
                    <button type="button" class="update-zone-btn admin-btn">Сохранить зону</button>
                </div>
                <div class="pc-dropdown-section pc-dropdown-section--coupon">
                    <button type="button" class="coupon-toggle-btn admin-btn admin-btn--primary">Активировать купон</button>
                    <div class="coupon-picker" hidden>
                        <label class="admin-label">Пакет времени</label>
                        <select class="coupon-package-select admin-input admin-input--select">
                            <option value="">Загрузка...</option>
                        </select>
                        <button type="button" class="coupon-confirm-btn admin-btn admin-btn--primary">Запустить сессию</button>
                    </div>
                    ${item.status === 'занят' ? '<button type="button" class="end-session-btn admin-btn admin-btn--end-session admin-btn--subtract">Завершить сессию</button>' : ''}
                </div>
            ` : `
                <h4>Компьютер: ${item.number_pc}</h4>
                <div class="pc-dropdown-section">
                    <label class="admin-label">Зона</label>
                    <select class="zonePC">
                        <option value="regular">Обычная</option>
                        <option value="vip">VIP</option>
                    </select>
                    <label class="admin-label">Статус</label>
                    <select class="statusPC">
                        <option value="активен">Активен</option>
                        <option value="занят">Занят</option>
                        <option value="заблокирован">Заблокирован</option>
                        <option value="ремонт">На ремонте</option>
                    </select>
                    <button type="button" class="update-btn admin-btn">Обновить статус</button>
                </div>
                <div class="pc-dropdown-section pc-dropdown-section--coupon">
                    <button type="button" class="coupon-toggle-btn admin-btn admin-btn--primary">Активировать купон</button>
                    <div class="coupon-picker" hidden>
                        <label class="admin-label">Пакет времени</label>
                        <select class="coupon-package-select admin-input admin-input--select">
                            <option value="">Загрузка...</option>
                        </select>
                        <button type="button" class="coupon-confirm-btn admin-btn admin-btn--primary">Запустить сессию</button>
                    </div>
                </div>
            `;

            const statusSelect = dropdown.querySelector('.statusPC');
            if (statusSelect) statusSelect.value = item.status;
            const zoneSelect = dropdown.querySelector('.zonePC');
            const pcZone = String(item.zone || 'regular').toLowerCase();
            zoneSelect.value = pcZone === 'vip' ? 'vip' : 'regular';

            if (item.status === "занят") {
                pc.innerHTML = `<p class="iconoir-computer"></p>`;
                pc.classList.add("employ");
                busyPcs.push({
                    id: item.id,
                    number_pc: item.number_pc,
                    time_active: item.time_active,
                    session_started_at: item.session_started_at,
                    session_duration_minutes: item.session_duration_minutes
                });
            } else if (item.status === "ремонт") {
                pc.innerHTML = `<p class="iconoir-pc-no-entry"></p>`;
                pc.classList.add("fix");
            } else if (item.status === "заблокирован") {
                pc.innerHTML = `<p class="iconoir-pc-no-entry"></p>`;
                pc.classList.add("blocked");
            } else {
                pc.innerHTML = `<p class="iconoir-pc-check"></p>`;
                pc.classList.add("active");
            }
            if (zoneSelect.value === 'vip') {
                pc.classList.add("computer-vip");
            }

            const targetContainer = (zoneSelect.value === 'vip' && vipContainer) ? vipContainer : container;
            targetContainer.appendChild(pc);
            dropdownContainer.appendChild(dropdown);

            const updateButton = dropdown.querySelector('.update-btn');
            if (updateButton) {
                updateButton.addEventListener('click', () => {
                    sendUpdate(item.token, statusSelect.value, null, zoneSelect.value);
                });
            }

            const updateZoneButton = dropdown.querySelector('.update-zone-btn');
            if (updateZoneButton) {
                updateZoneButton.addEventListener('click', () => {
                    sendZoneUpdate(item.token, zoneSelect.value);
                });
            }

            const couponToggle = dropdown.querySelector('.coupon-toggle-btn');
            const couponPicker = dropdown.querySelector('.coupon-picker');
            const packageSelect = dropdown.querySelector('.coupon-package-select');
            const couponConfirm = dropdown.querySelector('.coupon-confirm-btn');
            const endSessionBtn = dropdown.querySelector('.end-session-btn');

            couponToggle.addEventListener('click', async () => {
                const isOpen = !couponPicker.hidden;
                couponPicker.hidden = isOpen;
                if (isOpen) return;

                packageSelect.innerHTML = '<option value="">Загрузка...</option>';
                try {
                    const packages = await loadTimePackages();
                    const isVip = zoneSelect.value === 'vip';
                    const adaptedPackages = packages.map(pkg => ({
                        ...pkg,
                        display_price: isVip ? Number(pkg.price_vip ?? pkg.price ?? 0) : Number(pkg.price ?? 0)
                    }));
                    packageSelect.innerHTML = buildPackageOptions(adaptedPackages);
                } catch (error) {
                    packageSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
                    showNotification(error.message, true);
                }
            });

            couponConfirm.addEventListener('click', async () => {
                const packageId = packageSelect.value;
                if (!packageId) {
                    showNotification('Выберите пакет', true);
                    return;
                }

                couponConfirm.disabled = true;
                try {
                    const result = await activateCouponOnPc(item.id, packageId);
                    const duration = formatPackageDuration(result.session_duration_minutes);
                    showNotification(`ПК №${result.number_pc}: сессия ${duration}`);
                    couponPicker.hidden = true;
                    showPC();
                    if (typeof window.reloadAdminReports === 'function') {
                        window.reloadAdminReports();
                    }
                } catch (error) {
                    showNotification(error.message, true);
                } finally {
                    couponConfirm.disabled = false;
                }
            });

            if (endSessionBtn) {
                endSessionBtn.addEventListener('click', () => {
                    openEndSessionModal(item.id, item.number_pc);
                });
            }
        });

        if (busyPcs.length > 0 && busyPcContainer) {
            const busyHeader = document.createElement("h2");
            busyHeader.textContent = "#Занятые компьютеры:";
            busyPcContainer.appendChild(busyHeader);

            busyPcs.forEach(pc => {
                const busyPcElement = document.createElement("div");
                busyPcElement.className = "busy-pc row";
                busyPcElement.id = `busy-pc-${pc.id}`;

                const title = document.createElement("h4");
                title.textContent = `Компьютер №${pc.number_pc}:`;

                const timeElement = document.createElement("div");
                timeElement.className = "time-remaining";

                const updateTime = () => {
                    const remaining = getSessionRemainingMs(pc);
                    if (remaining <= 0) {
                        timeElement.textContent = "Время истекло";
                        return;
                    }
                    timeElement.textContent = formatDuration(remaining);
                };

                updateTime();
                const timerId = setInterval(updateTime, 1000);
                busyPcElement.dataset.timerId = timerId;

                busyPcElement.appendChild(title);
                busyPcElement.appendChild(timeElement);
                busyPcContainer.appendChild(busyPcElement);
            });
        }
    })
    .catch(error => {
        console.log(error);
    });
}

function sendZoneUpdate(token, zone) {
    const jwtToken = getCookie('jwt_token');

    fetch(`${getApiBase()}/pc/status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ token, zone })
    })
    .then(response => response.json().then(data => ({ ok: response.ok, data })))
    .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Не удалось сохранить зону');
        showNotification('Зона сохранена');
        showPC();
    })
    .catch(error => {
        showNotification(error.message, true);
    });
}

function sendUpdate(token, status, time, zone) {
    const jwtToken = getCookie('jwt_token');

    const data = { token, status };
    if (time) data.time = time;
    if (zone) data.zone = zone;

    fetch(`${getApiBase()}/pc/status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(() => showPC())
    .catch(error => console.log(error));
}

showPC();
