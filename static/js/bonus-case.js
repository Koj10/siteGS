(function () {
    const PRIZE_CHANCES = [
        { amount: 100, chance: 45 },
        { amount: 150, chance: 30 },
        { amount: 200, chance: 18 },
        { amount: 300, chance: 6 },
        { amount: 500, chance: 1 },
    ];
    const ITEM_GAP = 8;
    const STRIP_LENGTH = 65;
    const SPIN_DURATION_MS = 6000;

    const modal = document.getElementById("bonusCaseModal");
    if (!modal) return;

    const stripEl = modal.querySelector(".bonus-case-roulette__strip");
    const viewportEl = modal.querySelector(".bonus-case-roulette__viewport");
    const resultEl = modal.querySelector(".bonus-case-result");
    const resultAmountEl = modal.querySelector(".bonus-case-result__amount");
    const startBtn = document.getElementById("bonusCaseStartBtn");
    const claimBtn = document.getElementById("bonusCaseClaimBtn");
    const closeBtn = document.getElementById("bonusCaseCloseBtn");
    const rouletteEl = modal.querySelector(".bonus-case-roulette");

    let activeClaimId = null;
    let activePrize = null;
    let isAnimating = false;
    let modalMode = "idle";

    function getTierClass(amount) {
        return `bonus-case-item--${amount}`;
    }

    function weightedRandomPrize() {
        const roll = Math.random() * 100;
        let sum = 0;
        for (const { amount, chance } of PRIZE_CHANCES) {
            sum += chance;
            if (roll < sum) return amount;
        }
        return PRIZE_CHANCES[0].amount;
    }

    function pickNeighborPrize(winPrize, index, winIndex) {
        let prize = weightedRandomPrize();
        let attempts = 0;
        while (attempts < 8) {
            const isNearWin = Math.abs(index - winIndex) <= 2;
            if (!isNearWin || prize !== winPrize) break;
            prize = weightedRandomPrize();
            attempts += 1;
        }
        return prize;
    }

    function buildStrip(winPrize, winIndex) {
        const items = [];
        for (let i = 0; i < STRIP_LENGTH; i += 1) {
            items.push(i === winIndex ? winPrize : pickNeighborPrize(winPrize, i, winIndex));
        }
        return items;
    }

    function buildIdleStrip() {
        const items = [];
        for (let i = 0; i < 24; i += 1) {
            items.push(weightedRandomPrize());
        }
        return items;
    }

    function getItemMetrics() {
        const first = stripEl.querySelector(".bonus-case-item");
        const width = first ? first.offsetWidth : 128;
        return { width, step: width + ITEM_GAP };
    }

    function renderStrip(items, { resetPosition = true, startOffset = 0 } = {}) {
        stripEl.innerHTML = items
            .map(
                (amount) => `
                <div class="bonus-case-item ${getTierClass(amount)}" data-amount="${amount}">
                    <div class="bonus-case-item__visual">
                        <span class="bonus-case-item__coin" aria-hidden="true"></span>
                        <span class="bonus-case-item__amount">${amount} ₽</span>
                    </div>
                    <div class="bonus-case-item__label">НА БАЛАНС</div>
                </div>
            `
            )
            .join("");
        stripEl.style.transition = "none";
        stripEl.style.transform = resetPosition ? `translateX(${startOffset}px)` : stripEl.style.transform;
        stripEl.classList.remove("bonus-case-roulette__strip--spinning");
    }

    function centerStripOnMiddle() {
        const { step } = getItemMetrics();
        const viewportWidth = viewportEl.clientWidth;
        const items = stripEl.querySelectorAll(".bonus-case-item");
        if (!items.length) return;
        const middleIndex = Math.floor(items.length / 2);
        const offset = middleIndex * step + getItemMetrics().width / 2 - viewportWidth / 2;
        stripEl.style.transform = `translateX(-${offset}px)`;
    }

    function easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }

    function clearWinnerHighlight() {
        stripEl.querySelectorAll(".bonus-case-item--winner").forEach((el) => {
            el.classList.remove("bonus-case-item--winner");
        });
    }

    function highlightWinner(winIndex) {
        clearWinnerHighlight();
        const items = stripEl.querySelectorAll(".bonus-case-item");
        if (items[winIndex]) {
            items[winIndex].classList.add("bonus-case-item--winner");
        }
    }

    function animateToIndex(winIndex) {
        const { width, step } = getItemMetrics();
        const viewportWidth = viewportEl.clientWidth;
        const jitter = (Math.random() - 0.5) * width * 0.72;
        const targetOffset = winIndex * step + width / 2 - viewportWidth / 2 + jitter;

        const startTransform = stripEl.style.transform;
        const startMatch = startTransform.match(/translateX\((-?\d+\.?\d*)px\)/);
        const startOffset = startMatch ? parseFloat(startMatch[1]) * -1 : 0;
        const distance = targetOffset - startOffset;

        stripEl.classList.add("bonus-case-roulette__strip--spinning");

        return new Promise((resolve) => {
            const startTime = performance.now();

            function frame(now) {
                const elapsed = now - startTime;
                const progress = Math.min(1, elapsed / SPIN_DURATION_MS);
                const eased = easeOutQuart(progress);
                const current = startOffset + distance * eased;
                stripEl.style.transform = `translateX(-${current}px)`;

                if (progress < 1) {
                    requestAnimationFrame(frame);
                } else {
                    stripEl.classList.remove("bonus-case-roulette__strip--spinning");
                    highlightWinner(winIndex);
                    resolve();
                }
            }

            requestAnimationFrame(frame);
        });
    }

    function setModalActions(mode) {
        modalMode = mode;
        if (mode === "idle") {
            startBtn.hidden = false;
            startBtn.disabled = false;
            claimBtn.hidden = true;
            claimBtn.disabled = true;
        } else if (mode === "spinning") {
            startBtn.hidden = true;
            startBtn.disabled = true;
            claimBtn.hidden = true;
            claimBtn.disabled = true;
        } else if (mode === "result") {
            startBtn.hidden = true;
            startBtn.disabled = true;
            claimBtn.hidden = false;
            claimBtn.disabled = false;
        }
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
        modalMode = "idle";
        resultEl.hidden = true;
        rouletteEl.hidden = false;
        clearWinnerHighlight();
        setModalActions("idle");
    }

    function showResult(prize) {
        resultAmountEl.textContent = `${prize} ₽`;
        resultEl.hidden = false;
        setModalActions("result");
    }

    function showClaimOnly(prize, claimId) {
        activePrize = prize;
        activeClaimId = claimId;
        rouletteEl.hidden = true;
        resultEl.hidden = false;
        resultAmountEl.textContent = `${prize} ₽`;
        setModalActions("result");
        showModal();
    }

    function showModalPreview() {
        if (isAnimating || activeClaimId) return;

        resultEl.hidden = true;
        rouletteEl.hidden = false;
        renderStrip(buildIdleStrip());
        requestAnimationFrame(() => centerStripOnMiddle());
        setModalActions("idle");
        showModal();
    }

    async function startBonusCaseOpening() {
        if (isAnimating || activeClaimId || modalMode !== "idle") return;

        const jwtToken = getCookie("jwt_token");
        isAnimating = true;
        setModalActions("spinning");
        resultEl.hidden = true;
        clearWinnerHighlight();

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
            renderStrip(items, { resetPosition: true, startOffset: 0 });
            await animateToIndex(data.win_index);
            showResult(data.prize);
            await updateUserData();
            document.dispatchEvent(new Event("userInventoryUpdated"));
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
            document.dispatchEvent(new Event("userInventoryUpdated"));
            document.querySelectorAll(".balance").forEach((el) => {
                el.textContent = data.balance;
            });
        } catch (error) {
            console.error(error);
            showNotification(error.message || "Ошибка получения приза", true);
            claimBtn.disabled = false;
        }
    }

    startBtn.addEventListener("click", startBonusCaseOpening);
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

    window.openBonusCase = showModalPreview;

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
