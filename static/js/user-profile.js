(function () {
    const userId = Number(window.USER_PROFILE_ID);
    if (!userId) return;

    const stateEl = document.getElementById('userProfileState');
    const cardEl = document.getElementById('userProfileCard');
    const loyaltyEl = document.getElementById('userProfileLoyalty');

    async function loadProfile() {
        try {
            const response = await fetch(`${getApiBase()}/users/${userId}/profile`, {
                headers: {
                    Authorization: `Bearer ${getCookie('jwt_token')}`,
                    Accept: 'application/json',
                },
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Не удалось загрузить профиль');

            document.getElementById('userProfileInitial').textContent =
                (data.first_name || '?').charAt(0).toUpperCase();
            document.getElementById('userProfileFirstName').textContent = data.first_name || '—';
            document.getElementById('userProfileLastName').textContent = data.last_name || '—';
            document.getElementById('userProfileTag').textContent = data.tag ? `@${data.tag}` : '—';
            document.getElementById('userProfileHours').textContent = `${formatPlayHours(data.play_hours || 0)} ч`;
            document.getElementById('userProfileDiscount').textContent = `${data.rank?.discount || 1}%`;

            const rankEl = document.getElementById('userProfileRank');
            if (rankEl && data.rank) rankEl.innerHTML = rankBadgeHtml(data.rank, 'rank-badge--lg');

            renderRankProgress(document.getElementById('userProfileRankProgress'), data);

            stateEl.hidden = true;
            cardEl.hidden = false;
            loyaltyEl.hidden = false;
        } catch (error) {
            stateEl.textContent = error.message || 'Профиль недоступен';
            cardEl.hidden = true;
            loyaltyEl.hidden = true;
        }
    }

    loadProfile();
})();
