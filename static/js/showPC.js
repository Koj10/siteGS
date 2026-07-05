function showPC() {
    const jwtToken = getCookie('jwt_token');

    fetch('https://api.game-sense.ru/pc', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const container = document.getElementById("pcContainer");
        const dropdownContainer = document.getElementById("dropdownContainer");
        const busyPcContainer = document.getElementById("busyPcContainer");

        // Очищаем контейнеры перед добавлением новых элементов
        container.innerHTML = '';
        dropdownContainer.innerHTML = '';
        if (busyPcContainer) busyPcContainer.innerHTML = '';

        // Сортируем компьютеры по number_pc
        data.sort((a, b) => a.number_pc - b.number_pc);

        // Массив для хранения занятых ПК
        const busyPcs = [];

        data.forEach(item => {
            const pc = document.createElement("div");
            pc.className = "computer";
            pc.id = item.id;
            pc.setAttribute('dropdown', `dropdown${item.id}`);

            function add4Hours(datetime) {
                if (!datetime) return datetime;
                
                const date = new Date(datetime);
                date.setHours(date.getHours() + 10);
                return date.toISOString().slice(0, 16);
            }

            const dropdown = document.createElement("div");
            dropdown.id = `dropdown${item.id}`;
            dropdown.className = "dropdown-content";
            dropdown.innerHTML = `
                <h4>Компьютер: ${item.number_pc}</h4>
                <input type="datetime-local" id="timeActive" value="${add4Hours(item.time_active)}">
                <select id="statusPC">
                    <option value="активен">Активен</option>
                    <option value="занят">Занят</option>
                    <option value="заблокирован">Заблокирован</option>
                    <option value="ремонт">На ремонте</option>
                </select>
                <button class="update-btn"><h5>Обновить</h5></button>
            `;

            // Устанавливаем выбранное значение в зависимости от item.status
            const statusSelect = dropdown.querySelector('#statusPC');
            if (statusSelect) {
                statusSelect.value = item.status;
            }

            if (item.status === "занят") {
                pc.innerHTML = `<p class="iconoir-computer"></p>`;
                pc.classList.add("employ");
                
                // Добавляем ПК в массив занятых
                busyPcs.push({
                    id: item.id,
                    number_pc: item.number_pc,
                    time_active: item.time_active
                });
            }
            else if (item.status === "ремонт") {
                pc.innerHTML = `<p class="iconoir-pc-no-entry"></p>`;
                pc.classList.add("fix");
            }
            else {
                pc.innerHTML = `<p class="iconoir-pc-check"></p>`;
                pc.classList.add("active");
            }
            
            container.appendChild(pc); 
            dropdownContainer.appendChild(dropdown);

            // Добавляем обработчик события для кнопки "Обновить"
            const updateButton = dropdown.querySelector('.update-btn');
            updateButton.addEventListener('click', () => {
                const timeInput = dropdown.querySelector('#timeActive');
                sendUpdate(item.token, statusSelect.value, timeInput.value);
            });
        });

        // Если есть занятые ПК, отображаем их в отдельном контейнере
        if (busyPcs.length > 0 && busyPcContainer) {
            const busyHeader = document.createElement("h2");
            busyHeader.textContent = "#Занятые компьютеры:";
            busyPcContainer.appendChild(busyHeader);

            busyPcs.forEach(pc => {
                const busyPcElement = document.createElement("h4");
                busyPcElement.className = "busy-pc row";
                busyPcElement.id = `busy-pc-${pc.id}`;
                
                // Создаем элемент для отображения оставшегося времени
                const timeElement = document.createElement("div");
                timeElement.className = "time-remaining";
                
                // Функция для обновления оставшегося времени
                const updateTime = () => {
                    if (!pc.time_active) {
                        timeElement.textContent = "Время не установлено";
                        return;
                    }
                    
                    const endTime = new Date(pc.time_active);
                    endTime.setHours(endTime.getHours() + 5); // Добавляем 10 часов к времени начала
                    const now = new Date();
                    const diffMs = endTime - now;
                    
                    if (diffMs <= 0) {
                        timeElement.textContent = "Время истекло";
                        // Останавливаем таймер
                        const timerElement = document.getElementById(`timer-${pc.id}`);
                        if (timerElement) clearInterval(timerElement.dataset.timerId);
                        return;
                    }
                    
                    const hours = Math.floor(diffMs / (1000 * 60 * 60));
                    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
                    
                    timeElement.textContent = `${hours}ч ${minutes}мин ${seconds}сек`;
                };
                
                // Обновляем время сразу
                updateTime();
                
                // Запускаем таймер с обновлением каждую секунду
                const timerId = setInterval(updateTime, 1000);
                
                // Сохраняем ID таймера в элементе для возможности очистки
                busyPcElement.dataset.timerId = timerId;
                
                busyPcElement.innerHTML = `<h4>Компьютер №${pc.number_pc}: </h4>`;
                busyPcElement.appendChild(timeElement);
                busyPcContainer.appendChild(busyPcElement);
                
                // Очищаем интервал при удалении элемента
                busyPcElement.addEventListener('DOMNodeRemoved', () => {
                    clearInterval(timerId);
                });
            });
        }
    })
    .catch(error => {
        console.log(error);
    });
}

// Модифицированная функция для отправки данных на сервер
function sendUpdate(token, status, time) {
    const jwtToken = getCookie('jwt_token');

    const data = {
        token: token,
        status: status,
        time: time
    };

    fetch('https://api.game-sense.ru/pc/status', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(responseData => {
        // Обновляем интерфейс после успешной отправки
        showPC();
    })
    .catch(error => {
        console.log(error);
    });
}

showPC();