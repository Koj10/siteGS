function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function showNotification(message, isError = false) {
    const notification = document.getElementById('custom-notification');
    notification.textContent = message;
    
    notification.className = 'notification show';
    
    if (isError) {
        notification.classList.add('error');
        setTimeout(() => {
            notification.className = 'notification error';
        }, 3000);
    }

    else{

        setTimeout(() => {
            notification.className = 'notification';
        }, 3000);
    }
}

function showNotificationTime() {
    const pc_token = getCookie('pc_token');
    const jwtToken = getCookie('jwt_token');

    // Проверяем наличие pc_token перед отправкой запроса
    if (!pc_token) {
        return;
    }

    fetch(`https://api.game-sense.ru/pc/status/${pc_token}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`        
        },
    })
    .then(response => response.json())
    .then(responseData => {
        const time_active = responseData.message.time_active || 'N/A';

        if (time_active === "N/A"){
            return;
        }
        
        const notification = document.getElementById('out_time');

        const endTime = new Date(time_active);
        endTime.setHours(endTime.getHours() + 5);
        const now = new Date();

        if (endTime <= now) {
            notification.className = 'notification';
            return;
        }
        
        function updateTimer() {
            const now = new Date();
            const diff = endTime - now;

            if (diff <= 0) {
                // Время истекло
                notification.className = 'notification';
                clearInterval(timerInterval);
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            const formattedTime = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        notification.textContent = formattedTime;
        notification.className = 'notification show';
    }

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
})
    .catch(error => {
        console.error('Ошибка при выполнении запроса:', error);
    });
}

showNotificationTime();