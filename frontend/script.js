// ==================== КОНФИГУРАЦИЯ И ДАННЫЕ ====================
const CONFIG = {
    API_BASE_URL: window.location.origin,
    FALLBACK_DATA: {
        SEARCH: [
            {
                title: "Физика - 7 класс",
                description: "14% завершено",
                type: "Предмет",
                icon: "fas fa-atom",
                keywords: "физика наука 7 класс механика движение"
            },
            {
                title: "Таблица лидеров",
                description: "Елена Васильева (1200), Василий Петров (1000), Евгений Сидоров (900)",
                type: "Рейтинг",
                icon: "fas fa-chart-line",
                keywords: "лидеры турнир рейтинг таблица баллы"
            },
            {
                title: "Написать нам",
                description: "Свяжитесь с поддержкой SCool",
                type: "Поддержка",
                icon: "fas fa-envelope",
                keywords: "написать нам поддержка помощь обратная связь"
            }
        ],
        SUBJECTS_BY_CLASS: {
            7: [
                { name: 'Физика', progress_percent: 14, color: '#3f51b5' },
                { name: 'Математика', progress_percent: 45, color: '#f44336' },
                { name: 'Химия', progress_percent: 28, color: '#4caf50' },
                { name: 'Биология', progress_percent: 32, color: '#ff9800' }
            ],
            8: [
                { name: 'Физика', progress_percent: 22, color: '#3f51b5' },
                { name: 'Алгебра', progress_percent: 51, color: '#f44336' },
                { name: 'Геометрия', progress_percent: 38, color: '#4caf50' },
                { name: 'Информатика', progress_percent: 67, color: '#ff9800' }
            ],
            9: [
                { name: 'Физика', progress_percent: 58, color: '#3f51b5' },
                { name: 'Математика', progress_percent: 72, color: '#f44336' },
                { name: 'Химия', progress_percent: 41, color: '#4caf50' },
                { name: 'Биология', progress_percent: 36, color: '#ff9800' }
            ]
        },
        // Русские имена для таблицы лидеров (без кружков)
        LEADERBOARD: [
            { full_name: 'Елена Васильева', score: 1200, class_number: 9 },
            { full_name: 'Василий Петров', score: 1000, class_number: 8 },
            { full_name: 'Евгений Сидоров', score: 900, class_number: 7 }
        ]
    }
};

let currentUser = { id: 1, username: 'demo_user', class_number: 7 };

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

// Инициализация приложения
async function initApp() {
    console.log('Инициализация приложения SCool...');
    
    try {
        // Пропускаем запросы к демо данным в БД (чтобы избежать английских названий)
        console.log('Используем только локальные данные...');
        
        // Сразу используем локальные данные
        useFallbackData();
        
        // Устанавливаем обработчики событий
        setupEventListeners();
        
        // Инициализируем все макеты
        initializeAllLayouts();
        
        console.log('Приложение успешно инициализировано с локальными данными');
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        useFallbackData();
    }
}

// Загрузка данных с сервера (ОТКЛЮЧЕНО для предотвращения английских названий)
async function loadDataFromServer() {
    console.log('Загрузка данных с сервера отключена - используем локальные данные');
    // НИЧЕГО НЕ ЗАГРУЖАЕМ С СЕРВЕРА, чтобы избежать английских названий
    throw new Error('Используем локальные данные');
}

// Инициализация всех макетов
function initializeAllLayouts() {
    console.log('Инициализация всех макетов...');
    
    // Инициализируем предметы на всех макетах
    const layouts = ['desktop9-layout', 'desktop10-layout', 'desktop11-layout', 'standard-layout'];
    
    layouts.forEach(layoutId => {
        const layout = document.getElementById(layoutId);
        if (layout) {
            initializePhysicsSubjects(layout, layoutId);
        }
    });
    
    // Обновляем все таблицы лидеров
    updateAllLeaderboards(CONFIG.FALLBACK_DATA.LEADERBOARD);
}

// Инициализация предметов физики на всех макетах
function initializePhysicsSubjects(layout, layoutId) {
    let classNumber;
    
    // Определяем номер класса по ID макета
    switch(layoutId) {
        case 'desktop9-layout':
            classNumber = 7;
            break;
        case 'desktop10-layout':
            classNumber = 8;
            break;
        case 'desktop11-layout':
            classNumber = 9;
            break;
        default:
            classNumber = currentUser.class_number;
    }
    
    // Получаем предметы для этого класса (всегда русские из CONFIG)
    const subjects = CONFIG.FALLBACK_DATA.SUBJECTS_BY_CLASS[classNumber] || CONFIG.FALLBACK_DATA.SUBJECTS_BY_CLASS[7];
    
    // Обновляем карточки предметов в этом макете
    const subjectCards = layout.querySelectorAll('.subject-card');
    subjectCards.forEach((card, index) => {
        if (subjects[index]) {
            const titleElement = card.querySelector('h3');
            if (titleElement) {
                // Устанавливаем русское название из CONFIG
                titleElement.textContent = subjects[index].name;
            }
            
            // Обновляем прогресс
            const progressFill = card.querySelector('.progress-fill');
            const progressText = card.querySelector('.progress-text');
            
            if (progressFill) {
                progressFill.style.width = `${subjects[index].progress_percent}%`;
            }
            if (progressText) {
                progressText.textContent = `${subjects[index].progress_percent}% завершено`;
            }
            
            // Добавляем цвет
            if (subjects[index].color) {
                const progressBar = card.querySelector('.progress-bar');
                if (progressBar) {
                    progressBar.style.backgroundColor = `${subjects[index].color}20`;
                }
                
                if (progressFill) {
                    progressFill.style.backgroundColor = subjects[index].color;
                }
            }
        }
    });
    
    // Обновляем заголовок для физики
    const physicsTitle = layout.querySelector('.physics-title');
    if (physicsTitle) {
        physicsTitle.textContent = `Физика - ${classNumber} класс`;
    }
}

// Обновление всех таблиц лидеров
function updateAllLeaderboards(leaderboardData) {
    const leaderboards = document.querySelectorAll('.leader-list');
    
    leaderboards.forEach(leaderList => {
        if (!leaderList) return;
        
        leaderList.innerHTML = '';
        
        // Берем только топ-3 (без кружков)
        const topThree = leaderboardData.slice(0, 3);
        
        topThree.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'leader-item';
            
            // Используем русское имя (без аватара)
            const displayName = item.full_name || item.username || `Ученик ${index + 1}`;
            
            li.innerHTML = `
                <span class="rank">${index + 1}</span>
                <span class="name">${displayName}</span>
                <span class="score">${item.score || 0}</span>
            `;
            
            leaderList.appendChild(li);
        });
    });
}

// Обновление предметов на текущем макете (ОСТАВЛЯЕМ, но с фильтром)
function updateSubjectsOnCurrentLayout(subjects) {
    const activeLayout = getActiveLayout();
    if (!activeLayout) return;
    
    const subjectCards = activeLayout.querySelectorAll('.subject-card');
    subjectCards.forEach((card, index) => {
        if (subjects[index]) {
            const titleElement = card.querySelector('h3');
            if (titleElement) {
                // Фильтруем названия - если английские, заменяем на русские
                let subjectName = subjects[index].name;
                
                // Словарь замены английских названий на русские
                const englishToRussian = {
                    'Physics': 'Физика',
                    'physics': 'Физика',
                    'PHYSICS': 'Физика',
                    'Mathematics': 'Математика',
                    'Math': 'Математика',
                    'Chemistry': 'Химия',
                    'Biology': 'Биология',
                    'Algebra': 'Алгебра',
                    'Geometry': 'Геометрия',
                    'Computer Science': 'Информатика',
                    'Informatics': 'Информатика'
                };
                
                if (englishToRussian[subjectName]) {
                    subjectName = englishToRussian[subjectName];
                }
                
                titleElement.textContent = subjectName;
            }
        }
    });
}

// Получение активного макета
function getActiveLayout() {
    const layouts = [
        'desktop9-layout',
        'desktop10-layout', 
        'desktop11-layout',
        'standard-layout'
    ];
    
    for (const layoutId of layouts) {
        const layout = document.getElementById(layoutId);
        if (layout && layout.style.display !== 'none') {
            return layout;
        }
    }
    
    return document.getElementById('standard-layout');
}

// Обновление прогресса
function updateProgress(progressData) {
    const activeLayout = getActiveLayout();
    if (!activeLayout) return;
    
    progressData.forEach(progress => {
        const subjectCards = activeLayout.querySelectorAll('.subject-card');
        subjectCards.forEach(card => {
            const titleElement = card.querySelector('h3');
            if (titleElement && titleElement.textContent.includes(progress.name)) {
                const progressFill = card.querySelector('.progress-fill');
                const progressText = card.querySelector('.progress-text');
                
                if (progressFill) {
                    progressFill.style.width = `${progress.progress_percent}%`;
                }
                if (progressText) {
                    progressText.textContent = `${progress.progress_percent}% завершено`;
                }
            }
        });
    });
}

// Использование резервных данных
function useFallbackData() {
    console.log('Используем резервные данные...');
    
    // Инициализируем все макеты с резервными данными
    initializeAllLayouts();
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================

// Настройка обработчиков событий
function setupEventListeners() {
    // Переключение темы
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', function() {
            if (this.checked) {
                document.body.classList.add('dark-theme');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.remove('dark-theme');
                localStorage.setItem('theme', 'light');
            }
            updateThemeLabels(this.checked);
        });
    }
    
    // Переключение классов
    document.querySelectorAll('.class-btn').forEach(button => {
        button.addEventListener('click', async function() {
            const selectedClass = this.getAttribute('data-class');
            switchLayout(selectedClass);
            
            // Обновляем пользователя
            currentUser.class_number = parseInt(selectedClass);
            
            // Инициализируем физику для выбранного класса
            const layoutId = getLayoutIdByClass(selectedClass);
            const layout = document.getElementById(layoutId);
            if (layout) {
                initializePhysicsSubjects(layout, layoutId);
            }
            
            // НЕ загружаем данные с сервера для выбранного класса
            // Используем только локальные данные
            console.log(`Переключились на ${selectedClass} класс - используем локальные данные`);
        });
    });
    
    // Поиск
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const searchTerm = this.value.trim();
            
            if (searchTerm.length < 2) {
                document.getElementById('search-results').classList.remove('show');
                return;
            }
            
            searchTimeout = setTimeout(() => {
                // Используем только локальные данные для поиска
                const localResults = CONFIG.FALLBACK_DATA.SEARCH.filter(item => 
                    item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    item.keywords.toLowerCase().includes(searchTerm.toLowerCase())
                );
                displaySearchResults(localResults, searchTerm);
            }, 300);
        });
    }
    
    // Кнопка "Лидеры турнира" - плашка по центру экрана
    document.getElementById('full-table-btn')?.addEventListener('click', function() {
        showCenterMessage('Функция "Лидеры турнира" в разработке!', 'fa-trophy');
    });
    
    // Иконка уведомлений - плашка по центру экрана
    document.querySelector('.fa-bell')?.addEventListener('click', function() {
        showCenterMessage('Функция "Уведомления" в разработке!', 'fa-bell');
    });
    
    // Иконка профиля - ничего не происходит
    // Убрали обработчик: document.querySelector('.fa-user-circle')?.addEventListener('click', openProfile);
}

// Функция для отображения результатов поиска
function displaySearchResults(results, searchTerm) {
    const searchResults = document.getElementById('search-results');
    const searchInput = document.getElementById('search-input');
    if (!searchResults) return;
    
    searchResults.innerHTML = '';
    
    if (results.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'search-no-results';
        noResults.innerHTML = `
            <i class="fas fa-search" style="margin-right: 8px;"></i>
            ничего не найдено
        `;
        searchResults.appendChild(noResults);
    } else {
        results.forEach(item => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            
            // Подсветка текста
            const highlightedTitle = highlightText(item.title, searchTerm);
            const highlightedDesc = highlightText(item.description, searchTerm);
            
            resultItem.innerHTML = `
                <i class="${item.icon || 'fas fa-search'} result-icon"></i>
                <div class="result-text">
                    <div>${highlightedTitle}</div>
                    <small>${highlightedDesc}</small>
                </div>
                <span class="result-type">${item.type}</span>
            `;
            
            resultItem.addEventListener('click', function() {
                // Закрываем результаты поиска
                searchResults.classList.remove('show');
                if (searchInput) searchInput.value = '';
                
                // Прокручиваем к соответствующему разделу
                if (item.type === 'Таблица лидеров') {
                    document.querySelector('.leaderboard')?.scrollIntoView({ behavior: 'smooth' });
                } else if (item.type === 'Написать нам') {
                    document.querySelector('.contact-button, .contact-btn')?.scrollIntoView({ behavior: 'smooth' });
                } else if (item.type === 'Предмет') {
                    // Прокручиваем к карточкам предметов
                    const activeLayout = getActiveLayout();
                    if (activeLayout) {
                        const subjectCards = activeLayout.querySelector('.subject-cards');
                        if (subjectCards) {
                            subjectCards.scrollIntoView({ behavior: 'smooth' });
                        }
                    }
                }
            });
            
            searchResults.appendChild(resultItem);
        });
    }
    
    searchResults.classList.add('show');
}

// ==================== НАВИГАЦИЯ И МАКЕТЫ ====================

function getLayoutIdByClass(className) {
    switch(className) {
        case '7': return 'desktop9-layout';
        case '8': return 'desktop10-layout';
        case '9': return 'desktop11-layout';
        default: return 'standard-layout';
    }
}

function switchLayout(selectedClass) {
    // Обновляем активные кнопки
    document.querySelectorAll('.class-btn').forEach(btn => btn.classList.remove('active'));
    const selectedBtn = document.querySelector(`.class-btn[data-class="${selectedClass}"]`);
    if (selectedBtn) selectedBtn.classList.add('active');
    
    // Скрываем все макеты
    document.getElementById('desktop9-layout').style.display = 'none';
    document.getElementById('desktop10-layout').style.display = 'none';
    document.getElementById('desktop11-layout').style.display = 'none';
    document.getElementById('standard-layout').style.display = 'none';
    
    // Показываем выбранный макет
    const layoutId = getLayoutIdByClass(selectedClass);
    document.getElementById(layoutId).style.display = 'flex';
    
    // Обновляем заголовок страницы для класса
    updatePageTitle(selectedClass);
}

function updatePageTitle(classNumber) {
    const pageTitles = document.querySelectorAll('.page-title, .layout-title');
    pageTitles.forEach(title => {
        if (title.textContent.includes('класс')) {
            title.textContent = `Физика - ${classNumber} класс`;
        }
    });
}

function goToHome() {
    document.getElementById('desktop9-layout').style.display = 'none';
    document.getElementById('desktop10-layout').style.display = 'none';
    document.getElementById('desktop11-layout').style.display = 'none';
    document.getElementById('standard-layout').style.display = 'flex';
    document.querySelectorAll('.class-btn').forEach(btn => btn.classList.remove('active'));
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function highlightText(text, searchTerm) {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

function updateThemeLabels(isDark) {
    const lightLabel = document.querySelector('.theme-label.light');
    const darkLabel = document.querySelector('.theme-label.dark');
    
    if (lightLabel && darkLabel) {
        if (isDark) {
            lightLabel.style.color = '#aaa';
            lightLabel.style.fontWeight = 'normal';
            darkLabel.style.color = '#87CEEB';
            darkLabel.style.fontWeight = '500';
        } else {
            lightLabel.style.color = '#3f51b5';
            lightLabel.style.fontWeight = '500';
            darkLabel.style.color = '#666';
            darkLabel.style.fontWeight = 'normal';
        }
    }
}

// ФУНКЦИЯ: Плашка по центру экрана
function showCenterMessage(message, icon = 'fa-tools') {
    console.log('Показать плашку:', message);
    
    // Удаляем предыдущие плашки
    const existingMessages = document.querySelectorAll('.center-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Создаем плашку
    const messageElement = document.createElement('div');
    messageElement.className = 'center-message';
    
    messageElement.innerHTML = `
        <div class="center-message-content">
            <div class="center-message-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="center-message-text">${message}</div>
            <button class="center-message-close">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Добавляем в DOM
    document.body.appendChild(messageElement);
    
    // Показываем с анимацией
    setTimeout(() => {
        messageElement.classList.add('show');
    }, 10);
    
    // Обработчик кнопки закрытия
    messageElement.querySelector('.center-message-close').addEventListener('click', () => {
        closeCenterMessage(messageElement);
    });
    
    // Автозакрытие через 4 секунды
    setTimeout(() => {
        if (messageElement.parentNode) {
            closeCenterMessage(messageElement);
        }
    }, 4000);
}

function closeCenterMessage(messageElement) {
    messageElement.classList.remove('show');
    
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }, 300);
}

// Старая функция уведомления (для других случаев)
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'info' ? 'info-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    });
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded - SCool инициализация');
    
    // Инициализация темы
    const themeToggle = document.getElementById('theme-toggle');
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeToggle) themeToggle.checked = true;
        updateThemeLabels(true);
    } else {
        updateThemeLabels(false);
    }
    
    // Проверяем кнопку "Лидеры турнира"
    const fullTableBtn = document.getElementById('full-table-btn');
    console.log('Кнопка "Лидеры турнира" найдена:', fullTableBtn);
    
    if (fullTableBtn) {
        fullTableBtn.addEventListener('click', function() {
            console.log('Кнопка "Лидеры турнира" нажата');
            showCenterMessage('Функция "Лидеры турнира" в разработке!', 'fa-trophy');
        });
    }
    
    // Иконка уведомлений
    const notificationIcon = document.querySelector('.fa-bell');
    if (notificationIcon) {
        notificationIcon.addEventListener('click', function() {
            console.log('Иконка уведомлений нажата');
            showCenterMessage('Функция "Уведомления" в разработке!', 'fa-bell');
        });
    }
    
    // Инициализация приложения
    initApp();
    
    // Устанавливаем обработчики для кнопок на главную
    document.getElementById('home-from-desktop9')?.addEventListener('click', goToHome);
    document.getElementById('home-from-desktop10')?.addEventListener('click', goToHome);
    document.getElementById('home-from-desktop11')?.addEventListener('click', goToHome);
    
    // Инициализация начального состояния
    document.getElementById('desktop9-layout').style.display = 'none';
    document.getElementById('desktop10-layout').style.display = 'none';
    document.getElementById('desktop11-layout').style.display = 'none';
    document.getElementById('standard-layout').style.display = 'flex';
    document.querySelectorAll('.class-btn').forEach(btn => btn.classList.remove('active'));
});

// ==================== ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА ОТ АНГЛИЙСКИХ НАЗВАНИЙ ====================

// Функция для принудительного исправления русских названий
function forceRussianTitles() {
    console.log('Проверка и исправление названий предметов...');
    
    // Словарь для замены
    const replacements = {
        'Physics': 'Физика',
        'physics': 'Физика',
        'PHYSICS': 'Физика',
        'Mathematics': 'Математика',
        'Math': 'Математика',
        'Chemistry': 'Химия',
        'Biology': 'Биология',
        'Algebra': 'Алгебра',
        'Geometry': 'Геометрия',
        'Computer Science': 'Информатика',
        'Informatics': 'Информатика'
    };
    
    // Проверяем все заголовки предметов
    document.querySelectorAll('.subject-card h3').forEach(title => {
        const currentText = title.textContent.trim();
        
        // Если текст пустой или на английском
        if (currentText === '' || replacements[currentText]) {
            const newText = replacements[currentText] || 'Физика';
            if (currentText !== newText) {
                console.log(`Исправляем: "${currentText}" → "${newText}"`);
                title.textContent = newText;
            }
        }
    });
}

// Запускаем проверку через 500мс после загрузки
setTimeout(forceRussianTitles, 500);

// И еще раз через 2 секунды для надежности
setTimeout(forceRussianTitles, 2000);
