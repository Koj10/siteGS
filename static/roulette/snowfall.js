// Добавляем CSS стили для снега
var style = document.createElement('style');
style.innerHTML = `
  .sf-snow-flake {
    position: fixed;
    top: -20px;
    z-index: 99999;
    color: white;
    font-size: 1em;
    font-family: Arial, sans-serif;
    text-shadow: 0 0 5px rgba(255, 255, 255, 0.8);
    pointer-events: none;
    user-select: none;
    will-change: transform;
  }
  @keyframes sf-fall {
    0% {
      transform: translateY(0) translateX(0) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translateY(100vh) translateX(50px) rotate(360deg);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Создаем снегопад
(function() {
  var snowflakes = [];
  var snowflakeCount = 50; // Количество снежинок
  var snowflakeSymbols = ['❄', '❅', '❆', '*', '·']; // Символы снежинок
  
  function createSnowflake() {
    var snowflake = document.createElement('div');
    snowflake.className = 'sf-snow-flake';
    snowflake.innerHTML = snowflakeSymbols[Math.floor(Math.random() * snowflakeSymbols.length)];
    snowflake.style.left = Math.random() * 100 + '%';
    snowflake.style.opacity = Math.random() * 0.5 + 0.5;
    snowflake.style.fontSize = (Math.random() * 15 + 10) + 'px';
    var duration = Math.random() * 3 + 5; // 5-8 секунд
    snowflake.style.animationDuration = duration + 's';
    snowflake.style.animationName = 'sf-fall';
    snowflake.style.animationTimingFunction = 'linear';
    snowflake.style.animationIterationCount = '1';
    snowflake.style.animationFillMode = 'forwards';
    
    document.body.appendChild(snowflake);
    snowflakes.push(snowflake);
    
    // Удаляем снежинку после завершения анимации
    setTimeout(function() {
      if (snowflake.parentNode) {
        snowflake.parentNode.removeChild(snowflake);
        var index = snowflakes.indexOf(snowflake);
        if (index > -1) {
          snowflakes.splice(index, 1);
        }
      }
    }, duration * 1000);
  }
  
  // Создаем снежинки
  function initSnow() {
    // Создаем начальные снежинки
    for (var i = 0; i < snowflakeCount; i++) {
      setTimeout(function() {
        createSnowflake();
      }, i * 300);
    }
    
    // Продолжаем создавать новые снежинки
    setInterval(function() {
      if (snowflakes.length < snowflakeCount) {
        createSnowflake();
      }
    }, 300);
  }
  
  // Запускаем снегопад после загрузки страницы
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSnow);
  } else {
    initSnow();
  }
})();

