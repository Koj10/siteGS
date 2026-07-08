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

    function overallProgressPercent(loyalty) {
        const hours = Number(loyalty?.play_hours) || 0;
        const emerald = (loyalty?.ranks || []).find((rank) => rank.id === 'emerald');
        const maxHours = emerald?.min_hours || 400;
        return Math.min(100, Math.max(0, (hours / maxHours) * 100));
    }

    function markerPosition(rank, maxHours) {
        return Math.min(100, Math.max(0, (rank.min_hours / maxHours) * 100));
    }

    function renderRankProgress(container, loyalty) {
        if (!container || !loyalty) return;

        const ranks = loyalty.ranks || [];
        const emerald = ranks.find((rank) => rank.id === 'emerald');
        const maxHours = emerald?.min_hours || 400;
        const fillPercent = overallProgressPercent(loyalty);
        const currentId = loyalty.rank?.id;
        const nextRank = loyalty.next_rank;
        const progressText = nextRank
            ? `До ранга <strong>${nextRank.name}</strong> осталось <strong>${formatHours(loyalty.hours_to_next)} ч</strong>`
            : 'Вы достигли максимального ранга <strong>Emerald</strong>';

        const markers = ranks.map((rank) => {
            const left = markerPosition(rank, maxHours);
            const active = rank.id === currentId ? ' rank-track__marker--active' : '';
            const reached = (loyalty.play_hours || 0) >= rank.min_hours ? ' rank-track__marker--reached' : '';
            return `
                <div class="rank-track__marker${active}${reached}" style="left:${left}%">
                    <span class="rank-track__dot"></span>
                    <span class="rank-track__label">${rank.name}</span>
                    <span class="rank-track__discount">${rank.discount}%</span>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="rank-progress">
                <div class="rank-progress__head">
                    <div>
                        <div class="rank-progress__title">Ранги</div>
                        <div class="rank-progress__subtitle">Скидка зависит от наигранных часов в клубе</div>
                    </div>
                    ${rankBadgeHtml(loyalty.rank, 'rank-badge--lg')}
                </div>
                <div class="rank-progress__stats">
                    <div class="loyalty-stat">
                        <div class="loyalty-stat__label">Наиграно</div>
                        <div class="loyalty-stat__value">${formatHours(loyalty.play_hours)} ч</div>
                    </div>
                    <div class="loyalty-stat">
                        <div class="loyalty-stat__label">Скидка</div>
                        <div class="loyalty-stat__value">${loyalty.rank?.discount || 0}%</div>
                    </div>
                </div>
                <div class="rank-track">
                    <div class="rank-track__bar">
                        <div class="rank-track__fill" style="width:${fillPercent}%"></div>
                    </div>
                    <div class="rank-track__markers">${markers}</div>
                </div>
                <p class="rank-progress__hint">${progressText}</p>
            </div>
        `;
    }

    window.rankBadgeHtml = rankBadgeHtml;
    window.renderRankProgress = renderRankProgress;
    window.formatPlayHours = formatHours;
})();
