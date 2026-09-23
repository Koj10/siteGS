(function () {
    function getShellApi() {
        return window.pywebview && window.pywebview.api;
    }

    function ensureSessionBar() {
        let bar = document.getElementById('gs-session-bar');
        if (bar) {
            return bar;
        }

        bar = document.createElement('div');
        bar.id = 'gs-session-bar';
        bar.className = 'gs-session-bar';
        bar.hidden = true;
        bar.innerHTML = `
            <div class="gs-session-bar__inner">
                <span class="gs-session-bar__label">Сессия активна</span>
                <button type="button" class="gs-session-bar__btn" id="gsDesktopBtn">
                    <i class="iconoir-app-window" aria-hidden="true"></i>
                    На рабочий стол
                </button>
                <button type="button" class="gs-session-bar__btn gs-session-bar__btn--secondary" id="gsRestoreBtn" hidden>
                    Вернуться в GameSense
                </button>
            </div>
        `;
        document.body.appendChild(bar);

        document.getElementById('gsDesktopBtn').addEventListener('click', async () => {
            const api = getShellApi();
            if (api && api.minimize_to_desktop) {
                await api.minimize_to_desktop();
                document.getElementById('gsRestoreBtn').hidden = false;
            } else {
                showNotification('Обновите приложение GameSense на этом ПК', true);
            }
        });

        document.getElementById('gsRestoreBtn').addEventListener('click', async () => {
            const api = getShellApi();
            if (api && api.restore_app) {
                await api.restore_app();
                document.getElementById('gsRestoreBtn').hidden = true;
            }
        });

        return bar;
    }

    async function isSessionActive() {
        const pcToken = getCookie('pc_token');
        if (!pcToken) {
            return false;
        }

        try {
            const jwtToken = getCookie('jwt_token');
            const headers = { 'Content-Type': 'application/json' };
            if (jwtToken) {
                headers.Authorization = `Bearer ${jwtToken}`;
            }

            const response = await fetch(`${getApiBase()}/pc/status/${pcToken}`, { headers });
            const data = await response.json();
            return (data.message || {}).status === 'занят';
        } catch (error) {
            console.debug('desktop-shell status:', error);
            return false;
        }
    }

    async function refreshSessionBar() {
        if (!getCookie('pc_token')) {
            return;
        }
        const bar = ensureSessionBar();
        bar.hidden = !(await isSessionActive());
    }

    function onSessionStarted() {
        const bar = ensureSessionBar();
        bar.hidden = false;
        if (typeof showNotification === 'function') {
            showNotification('Сессия началась! Нажмите «На рабочий стол», чтобы запустить игры');
        }
    }

    window.addEventListener('gs-session-started', onSessionStarted);

    document.addEventListener('DOMContentLoaded', () => {
        refreshSessionBar();
        setInterval(refreshSessionBar, 12000);
    });
})();
