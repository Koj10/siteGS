(function () {
    function updateCashbackUi(user) {
        const balanceEl = document.getElementById('cashbackBalance');
        const percentEl = document.getElementById('cashbackPercent');
        const claimBtn = document.getElementById('claimCashbackBtn');
        const amount = Number(user?.cashback_balance) || 0;
        const percent = Number(user?.cashback_percent ?? user?.rank?.discount) || 0;

        if (balanceEl) balanceEl.textContent = amount;
        if (percentEl) percentEl.textContent = percent;
        if (claimBtn) claimBtn.disabled = amount <= 0;
    }

    async function claimCashback() {
        const claimBtn = document.getElementById('claimCashbackBtn');
        if (!claimBtn || claimBtn.disabled) return;

        claimBtn.disabled = true;
        try {
            const response = await fetch(`${getApiBase()}/loyalty/cashback/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getCookie('jwt_token')}`,
                },
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Не удалось перевести кешбэк');

            showNotification(`На баланс зачислено ${data.claimed} ₽`);
            const user = await updateUserData();
            if (user) {
                updateCashbackUi(user);
                document.dispatchEvent(new CustomEvent('userDataUpdated', { detail: user }));
            }
        } catch (error) {
            showNotification(error.message || 'Ошибка перевода кешбэка', true);
            const user = await updateUserData();
            if (user) updateCashbackUi(user);
        }
    }

    function initLoyaltyCashback(user) {
        updateCashbackUi(user);
        const claimBtn = document.getElementById('claimCashbackBtn');
        if (claimBtn && !claimBtn.dataset.bound) {
            claimBtn.dataset.bound = '1';
            claimBtn.addEventListener('click', claimCashback);
        }
        document.addEventListener('userDataUpdated', (event) => {
            if (event.detail) updateCashbackUi(event.detail);
        });
    }

    window.initLoyaltyCashback = initLoyaltyCashback;
    window.updateCashbackUi = updateCashbackUi;
})();
