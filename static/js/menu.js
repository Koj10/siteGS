document.addEventListener('DOMContentLoaded', function() {
    const overlay = document.getElementById("overlay");
    let currentOpenMenu = null;

    // Сначала скроем все меню
    document.querySelectorAll('.menu').forEach(menu => {
        menu.style.display = 'none';
    });

    // Делегирование события для кнопок меню
    document.addEventListener('click', function(e) {
        const t = e.target;
        const el = !t ? null : t.nodeType === 1 ? t : t.parentElement;
        const button = el && el.closest ? el.closest('[data-menu]') : null;
        
        if (button) {
            e.preventDefault();
            e.stopPropagation();
            
            const menuId = button.getAttribute('data-menu');
            const menu = document.getElementById(menuId);
            
            if (!menu) {
                console.error('Меню с ID', menuId, 'не найдено');
                return;
            }
            
            // Закрываем предыдущее открытое меню
            if (currentOpenMenu && currentOpenMenu !== menu) {
                currentOpenMenu.style.display = 'none';
            }
            
            // Переключаем текущее меню
            if (currentOpenMenu === menu) {
                menu.style.display = 'none';
                currentOpenMenu = null;
                overlay.style.display = 'none';
            } else {
                menu.style.display = 'flex';
                currentOpenMenu = menu;
                overlay.style.display = 'flex';
            }
        }
        
        // Закрытие меню при клике вне его области
        else if (currentOpenMenu && el && !currentOpenMenu.contains(el)) {
            currentOpenMenu.style.display = 'none';
            currentOpenMenu = null;
            overlay.style.display = 'none';
        }
    });

    // Предотвращаем закрытие при клике внутри меню
    document.addEventListener('click', function(e) {
        const t = e.target;
        const el = !t ? null : t.nodeType === 1 ? t : t.parentElement;
        if (el && el.closest && el.closest('.menu')) {
            e.stopPropagation();
        }
    });
});