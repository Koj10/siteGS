(function () {
    const RANK_CLASS = {
        silver: 'rank-badge--silver',
        gold: 'rank-badge--gold',
        platinum: 'rank-badge--platinum',
        diamond: 'rank-badge--diamond',
        emerald: 'rank-badge--emerald',
    };

    function rankBadgeClass(rankId) {
        return `rank-badge ${RANK_CLASS[rankId] || 'rank-badge--silver'}`;
    }

    function rankBadgeHtml(rank, extraClass) {
        if (!rank) return '';
        const cls = `${rankBadgeClass(rank.id)}${extraClass ? ` ${extraClass}` : ''}`;
        return `<span class="${cls}" style="--rank-color:${rank.color}">${rank.name}</span>`;
    }

    function formatHours(value) {
        const num = Number(value) || 0;
        return Number.isInteger(num) ? String(num) : num.toFixed(1);
    }

    function rankHoursLabel(rank) {
        if (rank.max_hours == null) {
            return `${rank.min_hours}+ ч`;
        }
        return `${rank.min_hours}–${rank.max_hours} ч`;
    }

    function tierProgress(loyalty) {
        const hours = Number(loyalty?.play_hours) || 0;
        const current = loyalty?.rank;
        const next = loyalty?.next_rank;

        if (!current) {
            return { percent: 0, currentValue: 0, targetValue: 0 };
        }

        if (!next) {
            return {
                percent: 100,
                currentValue: hours,
                targetValue: current.min_hours,
            };
        }

        const start = current.min_hours;
        const end = next.min_hours;
        const span = Math.max(end - start, 1);
        const percent = Math.min(100, Math.max(0, ((hours - start) / span) * 100));

        return {
            percent,
            currentValue: hours,
            targetValue: end,
        };
    }

    function rankEmblemHtml(rank, modifier) {
        if (!rank) {
            return `<div class="rank-emblem rank-emblem--empty ${modifier || ''}"><div class="rank-emblem__placeholder">—</div></div>`;
        }

        const initial = rank.name.charAt(0);
        return `
            <div class="rank-emblem ${modifier || ''}" style="--rank-color:${rank.color}">
                <div class="rank-emblem__glow"></div>
                <div class="rank-emblem__diamond">
                    <span class="rank-emblem__initial">${initial}</span>
                </div>
                <div class="rank-emblem__name">${rank.name}</div>
                <div class="rank-emblem__discount">-${rank.discount}%</div>
            </div>
        `;
    }

    function rankCardHtml(rank, loyalty) {
        const hours = Number(loyalty?.play_hours) || 0;
        const isCurrent = loyalty?.rank?.id === rank.id;
        const isReached = hours >= rank.min_hours;
        const stateClass = [
            isCurrent ? 'rank-card--current' : '',
            isReached ? 'rank-card--reached' : '',
        ].filter(Boolean).join(' ');

        const initial = rank.name.charAt(0);

        return `
            <article class="rank-card ${stateClass}" style="--rank-color:${rank.color}">
                <div class="rank-card__emblem">
                    <div class="rank-card__diamond"><span>${initial}</span></div>
                </div>
                <div class="rank-card__name">${rank.name}</div>
                <div class="rank-card__hours">${rankHoursLabel(rank)}</div>
                <div class="rank-card__discount">Кешбэк ${rank.discount}%</div>
                ${isCurrent ? '<div class="rank-card__badge">Ваш ранг</div>' : ''}
            </article>
        `;
    }

    function renderRankProgress(container, loyalty) {
        if (!container || !loyalty) return;

        const ranks = loyalty.ranks || [];
        const current = loyalty.rank;
        const next = loyalty.next_rank;
        const tier = tierProgress(loyalty);
        const progressHint = next
            ? `Осталось <strong>${formatHours(loyalty.hours_to_next)} ч</strong> до ранга ${next.name}`
            : 'Максимальный ранг достигнут';

        const barValues = next
            ? `${formatHours(tier.currentValue)} / ${formatHours(tier.targetValue)} ч`
            : `${formatHours(tier.currentValue)} ч`;

        container.innerHTML = `
            <div class="rank-progress">
                <div class="rank-progress__head">
                    <div>
                        <div class="rank-progress__title">Ваш прогресс</div>
						<div class="rank-progress__subtitle">Скидка ранга возвращается кешбэком с покупок пакетов времени</div>
                    </div>
                    <div class="rank-progress__stats-inline">
                        <span>Наиграно: <strong>${formatHours(loyalty.play_hours)} ч</strong></span>
                        <span>Скидка: <strong>${current?.discount || 0}%</strong> кешбэком</span>
                    </div>
                </div>

                <div class="rank-next">
                    ${rankEmblemHtml(current, 'rank-emblem--current')}
                    <div class="rank-next__center">
                        <div class="rank-next__label">До следующего ранга</div>
                        <div class="rank-next__bar-shell">
                            <div class="rank-next__bar">
                                <div class="rank-next__fill" style="width:${tier.percent}%"></div>
                                <span class="rank-next__bar-text">${barValues}</span>
                            </div>
                        </div>
                        <p class="rank-next__hint">${progressHint}</p>
                    </div>
                    ${next ? rankEmblemHtml(next, 'rank-emblem--next') : rankEmblemHtml(null, 'rank-emblem--next')}
                </div>

                <div class="rank-catalog">
                    <div class="rank-catalog__title">Все ранги</div>
                    <div class="rank-catalog__grid">
                        ${ranks.map((rank) => rankCardHtml(rank, loyalty)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    window.rankBadgeHtml = rankBadgeHtml;
    window.renderRankProgress = renderRankProgress;
    window.formatPlayHours = formatHours;
})();
