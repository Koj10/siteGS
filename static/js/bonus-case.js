(function () {
    const PRIZE_POOL = [100, 150, 200, 300, 500];
    const PRIZE_CHANCES = [
        { amount: 100, chance: 45 },
        { amount: 150, chance: 30 },
        { amount: 200, chance: 18 },
        { amount: 300, chance: 6 },
        { amount: 500, chance: 1 },
    ];
    const ITEM_WIDTH = 128;
    const ITEM_GAP = 8;
    const STRIP_LENGTH = 50;

    const modal = document.getElementById("bonusCaseModal");
    if (!modal) return;

    const stripEl = modal.querySelector(".bonus-case-roulette__strip");
    const viewportEl = modal.querySelector(".bonus-case-roulette__viewport");
    const resultEl = modal.querySelector(".bonus-case-result");
    const resultAmountEl = modal.querySelector(".bonus-case-result__amount");
    const claimBtn = document.getElementById("bonusCaseClaimBtn");
    const closeBtn = document.getElementById("bonusCaseCloseBtn");
    const rouletteEl = modal.querySelector(".bonus-case-roulette");

    let activeClaimId = null;
    let activePrize = null;
    let isAnimating = false;

    function getTierClass(amount) {
        return `bonus-case-item--${amount}`;
    }

    function randomPrize() {
        return PRIZE_POOL[Math.floor(Math.random() * PRIZE_POOL.length)];
    }

    function buildStrip(prize, winIndex) {
        const items = [];
        for (let i = 0; i < STRIP_LENGTH; i += 1) {
            items.push(i === winIndex ? prize : randomPrize());
        }
        return items;
    }

    function renderStrip(items) {
        stripEl.innerHTML = items
            .map(
                (amount) => `
                <div class="bonus-case-item ${getTierClass(amount)}">
                    <div class="bonus-case-item__amount">${amount} ₽</div>
                    <div class="bonus-case-item__label">БАЛАНС</div>
                </div>
            `
            )
            .join("");
        stripEl.style.transition = "none";
        stripEl.style.transform = "translateX(0px)";
    }

    function animateToIndex(winIndex) {
        const itemStep = ITEM_WIDTH + ITEM_GAP;
        const viewportWidth = viewportEl.clientWidth;
        const targetOffset =
            winIndex * itemStep + ITEM_WIDTH / 2 - viewportWidth / 2;

        return new Promise((resolve) => {
            requestAnimationFrame(() => {
                stripEl.style.transition = "transform 5.5s cubic-bezier(0.12, 0.75, 0.08, 1)";
                stripEl.style.transform = `translateX(-${targetOffset}px)`;

                const onEnd = () => {
                    stripEl.removeEventListener("transitionend", onEnd);
                    resolve();
                };
                stripEl.addEventListener("transitionend", onEnd);
            });
        });
    }

    function showModal() {
        modal.hidden = false;
        document.body.style.overflow = "hidden";
    }

    function hideModal() {
        modal.hidden = true;
        document.body.style.overflow = "";
        activeClaimId = null;
        activePrize = null;
        isAnimating = false;
        claimBtn.disabled = true;
        claimBtn.hidden = false;
        resultEl.hidden = true;
        rouletteEl.hidden = false;
    }

    function showResult(prize) {
        resultAmountEl.textContent = `${prize} ₽`;
        resultEl.hidden = false;
        claimBtn.disabled = false;
    }

    function showClaimOnly(prize, claimId) {
        activePrize = prize;
        activeClaimId = claimId;
        rouletteEl.hidden = true;
        resultEl.hidden = false;
        resultAmountEl.textContent = `${prize} ₽`;
        claimBtn.disabled = false;
        showModal();
    }

    async function openBonusCase() {
        if (isAnimating) return;

        const jwtToken = getCookie("jwt_token");
        isAnimating = true;
        claimBtn.disabled = true;
        claimBtn.hidden = false;
        resultEl.hidden = true;
        rouletteEl.hidden = false;
        showModal();

        try {
            const response = await fetch(`${getApiBase()}/bonus/open`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${jwtToken}`,
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();
            if (!response.ok) {
                if (response.status === 409 && data.pending_bonus_claim) {
                    showClaimOnly(data.pending_bonus_claim.amount, data.pending_bonus_claim.claim_id);
                    isAnimating = false;
                    return;
                }
                throw new Error(data.error || "Не удалось открыть кейс");
            }

            activeClaimId = data.claim_id;
            activePrize = data.prize;

            const items = buildStrip(data.prize, data.win_index);
            renderStrip(items);
            await animateToIndex(data.win_index);
            showResult(data.prize);
            await updateUserData();
            document.dispatchEvent(new Event('userInventoryUpdated'));
        } catch (error) {
            console.error(error);
            showNotification(error.message || "Ошибка открытия кейса", true);
            hideModal();
        } finally {
            isAnimating = false;
        }
    }

    async function claimBonusPrize() {
        if (!activeClaimId || claimBtn.disabled) return;

        const jwtToken = getCookie("jwt_token");
        claimBtn.disabled = true;

        try {
            const response = await fetch(`${getApiBase()}/bonus/claim`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${jwtToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ claim_id: activeClaimId }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Не удалось получить приз");
            }

            showNotification(`+${data.prize} ₽ на баланс`);
            hideModal();
            await updateUserData();
            document.dispatchEvent(new Event('userInventoryUpdated'));
            document.querySelectorAll('.balance').forEach((el) => {
                el.textContent = data.balance;
            });
        } catch (error) {
            console.error(error);
            showNotification(error.message || "Ошибка получения приза", true);
            claimBtn.disabled = false;
        }
    }

    claimBtn.addEventListener("click", claimBonusPrize);
    closeBtn.addEventListener("click", () => {
        if (isAnimating) return;
        if (activeClaimId) {
            showNotification("Заберите приз, прежде чем закрыть окно", true);
            return;
        }
        hideModal();
    });
    modal.querySelector(".bonus-case-modal__backdrop").addEventListener("click", () => {
        if (isAnimating || activeClaimId) return;
        hideModal();
    });

    window.openBonusCase = openBonusCase;

    async function initPendingClaim() {
        const user =
            (await updateUserData()) ||
            (localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null);
        if (user?.pending_bonus_claim) {
            showClaimOnly(user.pending_bonus_claim.amount, user.pending_bonus_claim.claim_id);
            document.dispatchEvent(new Event("userInventoryUpdated"));
        }
    }

    initPendingClaim();
})();
