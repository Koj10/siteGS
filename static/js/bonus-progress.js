(function () {
    let bonusSnapshot = null;
    let isCelebrating = false;

    function getBonusCards(user) {
        return Number(user?.inventory?.bonuses?.card || user?.bonus_cards || 0);
    }

    function getProgressData(user) {
        return {
            progress: Number(user?.topup_bonus_progress) || 0,
            threshold: Number(user?.topup_bonus_threshold) || 2000,
            bonusCards: getBonusCards(user),
        };
    }

    function pluralCases(count) {
        const mod10 = count % 10;
        const mod100 = count % 100;
        if (mod100 >= 11 && mod100 <= 14) return `${count} бонусных кейсов`;
        if (mod10 === 1) return `${count} бонусный кейс`;
        if (mod10 >= 2 && mod10 <= 4) return `${count} бонусных кейса`;
        return `${count} бонусных кейсов`;
    }

    function applyBonusProgressUI(user) {
        if (!user) return;

        const { progress, threshold } = getProgressData(user);
        const percent = Math.min(100, Math.max(0, (progress / threshold) * 100));

        document.querySelectorAll(".bonus-current").forEach((el) => {
            el.textContent = progress;
        });
        document.querySelectorAll(".bonus-threshold").forEach((el) => {
            el.textContent = threshold;
        });
        document.querySelectorAll(".bonus-progress-widget__fill").forEach((el) => {
            el.style.width = `${percent}%`;
        });
    }

    function setWidgetCelebration(active, earnedCount = 1) {
        document.querySelectorAll(".bonus-progress-widget").forEach((widget) => {
            widget.classList.toggle("bonus-progress-widget--earned", active);

            const label = widget.querySelector(".bonus-progress-widget__label");
            if (label) {
                if (active) {
                    if (!label.dataset.defaultLabel) {
                        label.dataset.defaultLabel = label.textContent;
                    }
                    label.textContent = earnedCount > 1 ? `+${earnedCount} КЕЙСА` : "БОНУС!";
                } else if (label.dataset.defaultLabel) {
                    label.textContent = label.dataset.defaultLabel;
                }
            }

            const burst = widget.querySelector(".bonus-progress-widget__burst");
            if (burst) {
                burst.hidden = !active;
            }
        });

        document.querySelectorAll(".bonus-progress-widget__fill").forEach((fill) => {
            fill.classList.toggle("bonus-progress-widget__fill--celebrate", active);
            if (active) {
                fill.style.width = "100%";
            }
        });
    }

    function playBonusEarnedAnimation(user, earnedCount) {
        return new Promise((resolve) => {
            setWidgetCelebration(true, earnedCount);

            if (typeof showNotification === "function") {
                showNotification(`Получен ${pluralCases(earnedCount)}!`);
            }

            document.dispatchEvent(
                new CustomEvent("bonusCaseEarned", { detail: { count: earnedCount } })
            );

            window.setTimeout(() => {
                setWidgetCelebration(false);
                applyBonusProgressUI(user);
                resolve();
            }, 1900);
        });
    }

    function handleBonusProgressUpdate(user, prevUser, { isInitial = false } = {}) {
        if (!user) return;

        const current = getProgressData(user);

        if (isInitial || bonusSnapshot === null) {
            bonusSnapshot = current;
            applyBonusProgressUI(user);
            return;
        }

        if (isCelebrating) return;

        const earned = current.bonusCards - bonusSnapshot.bonusCards;
        if (earned > 0) {
            isCelebrating = true;
            playBonusEarnedAnimation(user, earned).finally(() => {
                bonusSnapshot = current;
                isCelebrating = false;
                document.dispatchEvent(new Event("userInventoryUpdated"));
            });
            return;
        }

        bonusSnapshot = current;
        applyBonusProgressUI(user);
    }

    window.applyBonusProgressUI = applyBonusProgressUI;
    window.handleBonusProgressUpdate = handleBonusProgressUpdate;
    window.isBonusCelebrating = () => isCelebrating;

    const storedUser = localStorage.getItem("user");
    if (storedUser) {
        handleBonusProgressUpdate(JSON.parse(storedUser), null, { isInitial: true });
    }
})();
