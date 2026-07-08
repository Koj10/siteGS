const friendsApi = getApiBase();
let searchTimer = null;

function escapeText(value) {
    if (value == null) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getCookie('jwt_token')}`
    };
}

function userName(user) {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim();
}

function renderEmpty(container, text) {
    container.innerHTML = `<p class="friends-empty">${escapeText(text)}</p>`;
}

function renderUserRow(user, actionsHtml, options = {}) {
    const initial = (user.first_name || '?').charAt(0).toUpperCase();
    const tagLine = user.tag ? `<span class="friends-row__tag">@${escapeText(user.tag)}</span>` : '';
    const rankLine = user.rank
        ? `<span class="friends-row__rank">${escapeText(user.rank.name)} · ${user.rank.discount}%</span>`
        : '';
    const linkClass = options.linkable ? ' friends-row--link' : '';
    const linkAttrs = options.linkable ? ` data-profile-link="/user/${user.id}"` : '';
    return `
        <div class="friends-row${linkClass}" data-user-id="${user.id}"${linkAttrs}>
            <div class="friends-row__avatar">${escapeText(initial)}</div>
            <div class="friends-row__info">
                <h4>${escapeText(userName(user))}</h4>
                ${tagLine}
                ${rankLine}
            </div>
            <div class="friends-row__actions">${actionsHtml}</div>
        </div>
    `;
}

async function apiRequest(path, options = {}) {
    const response = await fetch(`${friendsApi}${path}`, {
        ...options,
        headers: { ...authHeaders(), ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Ошибка ${response.status}`);
    return data;
}

function actionButton(label, className, action, userId) {
    return `<button type="button" class="friends-btn ${className}" data-action="${action}" data-user-id="${userId}">${label}</button>`;
}

function renderSearchResults(users) {
    const container = document.getElementById('friendsSearchResults');
    if (!users.length) {
        renderEmpty(container, 'Никого не найдено');
        return;
    }

    container.innerHTML = users.map(user => {
        let actions = '';
        switch (user.friendship_status) {
            case 'accepted':
                actions = '<span class="friends-badge friends-badge--accepted">В друзьях</span>';
                break;
            case 'pending_outgoing':
                actions = '<span class="friends-badge friends-badge--pending">Заявка отправлена</span>';
                break;
            case 'pending_incoming':
                actions = `
                    ${actionButton('Принять', 'friends-btn--primary', 'accept', user.id)}
                    ${actionButton('Отклонить', 'friends-btn--ghost', 'decline', user.id)}
                `;
                break;
            default:
                actions = actionButton('Добавить', 'friends-btn--primary', 'request', user.id);
        }
        return renderUserRow(user, actions, {
            linkable: user.friendship_status === 'accepted' || Boolean(user.profile_public)
        });
    }).join('');
}

function renderRequestList(containerId, users, type) {
    const container = document.getElementById(containerId);
    if (!users.length) {
        renderEmpty(container, type === 'incoming' ? 'Нет входящих заявок' : 'Нет исходящих заявок');
        return;
    }

    container.innerHTML = users.map(user => {
        const actions = type === 'incoming'
            ? `${actionButton('Принять', 'friends-btn--primary', 'accept', user.id)}
               ${actionButton('Отклонить', 'friends-btn--ghost', 'decline', user.id)}`
            : actionButton('Отменить', 'friends-btn--ghost', 'cancel', user.id);
        return renderUserRow(user, actions);
    }).join('');
}

function renderFriendsList(users) {
    const container = document.getElementById('friendsList');
    if (!users.length) {
        renderEmpty(container, 'Список друзей пуст');
        return;
    }

    container.innerHTML = users.map(user => renderUserRow(
        user,
        actionButton('Удалить', 'friends-btn--ghost', 'remove', user.id),
        { linkable: true }
    )).join('');
}

async function loadFriendsData() {
    const [friends, requests] = await Promise.all([
        apiRequest('/friends'),
        apiRequest('/friends/requests')
    ]);

    renderFriendsList(friends);
    renderRequestList('friendsIncoming', requests.incoming || [], 'incoming');
    renderRequestList('friendsOutgoing', requests.outgoing || [], 'outgoing');
}

async function searchUsers(query) {
    const container = document.getElementById('friendsSearchResults');
    if (query.trim().length < 2) {
        container.innerHTML = '';
        return;
    }

    try {
        const users = await apiRequest(`/users/search?q=${encodeURIComponent(query.trim())}`);
        renderSearchResults(users);
    } catch (error) {
        renderEmpty(container, error.message);
    }
}

async function handleFriendAction(action, userId) {
    try {
        if (action === 'request') {
            await apiRequest('/friends/request', {
                method: 'POST',
                body: JSON.stringify({ user_id: Number(userId) })
            });
            showNotification('Заявка отправлена');
        } else if (action === 'accept') {
            await apiRequest('/friends/accept', {
                method: 'POST',
                body: JSON.stringify({ user_id: Number(userId) })
            });
            showNotification('Пользователь добавлен в друзья');
        } else if (action === 'decline') {
            await apiRequest('/friends/decline', {
                method: 'POST',
                body: JSON.stringify({ user_id: Number(userId) })
            });
            showNotification('Заявка отклонена');
        } else if (action === 'remove' || action === 'cancel') {
            await apiRequest(`/friends/${Number(userId)}`, { method: 'DELETE' });
            showNotification(action === 'cancel' ? 'Заявка отменена' : 'Удалено из друзей');
        }

        await loadFriendsData();
        const query = document.getElementById('friendsSearch').value;
        if (query.trim().length >= 2) {
            await searchUsers(query);
        }
    } catch (error) {
        showNotification(error.message, true);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadFriendsData().catch(error => showNotification(error.message, true));

    const searchInput = document.getElementById('friendsSearch');
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => searchUsers(searchInput.value), 300);
    });

    document.querySelector('.friends-page').addEventListener('click', (event) => {
        const profileLink = event.target.closest('[data-profile-link]');
        if (profileLink && !event.target.closest('[data-action]')) {
            window.location.href = profileLink.dataset.profileLink;
            return;
        }

        const button = event.target.closest('[data-action]');
        if (!button) return;
        handleFriendAction(button.dataset.action, button.dataset.userId);
    });
});
