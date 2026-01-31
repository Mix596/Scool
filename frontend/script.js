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
        LEADERBOARD: [
            { full_name: 'Елена Васильева', score: 1200, class_number: 9 },
            { full_name: 'Василий Петров', score: 1000, class_number: 8 },
            { full_name: 'Евгений Сидоров', score: 900, class_number: 7 }
        ]
    }
};

let currentUser = null;
let isAuthenticated = false;

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

async function initApp() {
    console.log('Инициализация приложения SCool...');
    
    try {
        // Проверяем, есть ли сохраненная сессия
        checkUserSession();
        
        useFallbackData();
        setupEventListeners();
        initializeAllLayouts();
        
        console.log('Приложение успешно инициализировано');
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        useFallbackData();
    }
}

function checkUserSession() {
    const savedUser = localStorage.getItem('scool_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            isAuthenticated = true;
            updateUserInterface();
            console.log('Пользователь авторизован:', currentUser);
        } catch (e) {
            console.error('Ошибка парсинга данных пользователя:', e);
            logoutUser();
        }
    }
}

function updateUserInterface() {
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn && currentUser) {
        profileBtn.title = currentUser.name || 'Профиль';
        // Можно добавить аватар или другое отображение
    }
}

function initializeAllLayouts() {
    console.log('Инициализация всех макетов...');
    
    const layouts = ['desktop9-layout', 'desktop10-layout', 'desktop11-layout', 'standard-layout'];
    
    layouts.forEach(layoutId => {
        const layout = document.getElementById(layoutId);
        if (layout) {
            initializePhysicsSubjects(layout, layoutId);
        }
    });
    
    updateAllLeaderboards(CONFIG.FALLBACK_DATA.LEADERBOARD);
}

function initializePhysicsSubjects(layout, layoutId) {
    let classNumber;
    
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
            classNumber = currentUser ? currentUser.class_number : 7;
    }
    
    const subjects = CONFIG.FALLBACK_DATA.SUBJECTS_BY_CLASS[classNumber] || CONFIG.FALLBACK_DATA.SUBJECTS_BY_CLASS[7];
    const subjectCards = layout.querySelectorAll('.subject-card');
    
    subjectCards.forEach((card, index) => {
        if (subjects[index]) {
            const titleElement = card.querySelector('h3');
            if (titleElement) {
                titleElement.textContent = subjects[index].name;
            }
            
            const progressFill = card.querySelector('.progress-fill');
            const progressText = card.querySelector('.progress-text');
            
            if (progressFill) {
                progressFill.style.width = `${subjects[index].progress_percent}%`;
            }
            if (progressText) {
                progressText.textContent = `${subjects[index].progress_percent}% завершено`;
            }
        }
    });
}

function updateAllLeaderboards(leaderboardData) {
    const leaderboards = document.querySelectorAll('.leader-list');
    
    leaderboards.forEach(leaderList => {
        if (!leaderList) return;
        
        leaderList.innerHTML = '';
        
        const topThree = leaderboardData.slice(0, 3);
        
        topThree.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'leader-item';
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

function useFallbackData() {
    console.log('Используем резервные данные...');
    initializeAllLayouts();
}

// ==================== СИСТЕМА АВТОРИЗАЦИИ ====================

function openAuthModal() {
    const authModal = document.getElementById('auth-modal');
    if (authModal) {
        authModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Показываем форму входа по умолчанию
        switchAuthTab('login');
        
        // Очищаем сообщения
        clearAuthMessages();
    }
}

function closeAuthModal() {
    const authModal = document.getElementById('auth-modal');
    if (authModal) {
        authModal.classList.remove('show');
        document.body.style.overflow = '';
        
        // Очищаем формы
        clearAuthForms();
    }
}

function switchAuthTab(tabName) {
    const tabs = document.querySelectorAll('.auth-tab-btn');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    forms.forEach(form => form.classList.remove('active'));
    
    const activeTab = document.querySelector(`.auth-tab-btn[data-tab="${tabName}"]`);
    const activeForm = document.getElementById(`${tabName}-form`);
    
    if (activeTab) activeTab.classList.add('active');
    if (activeForm) activeForm.classList.add('active');
    
    clearAuthMessages();
}

function clearAuthForms() {
    document.getElementById('login-form').reset();
    document.getElementById('register-form').reset();
    clearAuthMessages();
}

function clearAuthMessages() {
    const messages = document.querySelectorAll('.auth-message');
    messages.forEach(msg => msg.style.display = 'none');
}

function showAuthMessage(message, type = 'error') {
    clearAuthMessages();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `auth-message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    
    const activeForm = document.querySelector('.auth-form.active');
    if (activeForm) {
        activeForm.insertBefore(messageDiv, activeForm.firstChild);
        
        if (type === 'success') {
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 3000);
        }
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    // Валидация
    if (!email || !password) {
        showAuthMessage('Заполните все поля', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showAuthMessage('Введите корректный email', 'error');
        return;
    }
    
    // Симуляция запроса на сервер
    try {
        // Здесь будет реальный запрос к API
        await simulateLoginRequest(email, password);
        
        // Создаем фейкового пользователя
        const user = {
            id: Date.now(),
            email: email,
            name: email.split('@')[0],
            class_number: 7,
            remember_me: rememberMe
        };
        
        // Сохраняем пользователя
        saveUserSession(user, rememberMe);
        
        showAuthMessage('Вход выполнен успешно!', 'success');
        
        // Закрываем модалку через 1.5 секунды
        setTimeout(() => {
            closeAuthModal();
            showCenterMessage(`Добро пожаловать, ${user.name}!`, 'fa-user-check');
            updateUserInterface();
        }, 1500);
        
    } catch (error) {
        showAuthMessage(error.message || 'Ошибка входа', 'error');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;
    const classNumber = document.getElementById('register-class').value;
    const termsAccepted = document.getElementById('register-terms').checked;
    
    // Валидация
    if (!name || !email || !password || !passwordConfirm || !classNumber) {
        showAuthMessage('Заполните все поля', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showAuthMessage('Введите корректный email', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAuthMessage('Пароль должен быть не менее 6 символов', 'error');
        return;
    }
    
    if (password !== passwordConfirm) {
        showAuthMessage('Пароли не совпадают', 'error');
        return;
    }
    
    if (!termsAccepted) {
        showAuthMessage('Примите условия использования', 'error');
        return;
    }
    
    // Симуляция запроса на сервер
    try {
        // Здесь будет реальный запрос к API
        await simulateRegisterRequest(name, email, password, classNumber);
        
        // Создаем фейкового пользователя
        const user = {
            id: Date.now(),
            email: email,
            name: name,
            class_number: parseInt(classNumber)
        };
        
        // Сохраняем пользователя
        saveUserSession(user, true);
        
        showAuthMessage('Регистрация прошла успешно!', 'success');
        
        // Закрываем модалку через 1.5 секунды
        setTimeout(() => {
            closeAuthModal();
            showCenterMessage(`Добро пожаловать, ${user.name}!`, 'fa-user-plus');
            updateUserInterface();
        }, 1500);
        
    } catch (error) {
        showAuthMessage(error.message || 'Ошибка регистрации', 'error');
    }
}

function simulateLoginRequest(email, password) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Имитация проверки на сервере
            if (email === 'demo@scool.ru' && password === '123456') {
                resolve({ success: true });
            } else {
                // Для демо - любой другой email/пароль тоже работает
                if (password.length >= 6) {
                    resolve({ success: true });
                } else {
                    reject(new Error('Неверный email или пароль'));
                }
            }
        }, 1000);
    });
}

function simulateRegisterRequest(name, email, password, classNumber) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Имитация проверки на сервере
            if (email.includes('@') && password.length >= 6) {
                resolve({ success: true });
            } else {
                reject(new Error('Ошибка при регистрации'));
            }
        }, 1000);
    });
}

function saveUserSession(user, rememberMe = true) {
    currentUser = user;
    isAuthenticated = true;
    
    if (rememberMe) {
        localStorage.setItem('scool_user', JSON.stringify(user));
    } else {
        sessionStorage.setItem('scool_user', JSON.stringify(user));
    }
}

function logoutUser() {
    currentUser = null;
    isAuthenticated = false;
    localStorage.removeItem('scool_user');
    sessionStorage.removeItem('scool_user');
    
    showCenterMessage('Вы вышли из системы', 'fa-sign-out-alt');
    updateUserInterface();
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================

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
        button.addEventListener('click', function() {
            const selectedClass = this.getAttribute('data-class');
            switchLayout(selectedClass);
            
            if (currentUser) {
                currentUser.class_number = parseInt(selectedClass);
                localStorage.setItem('scool_user', JSON.stringify(currentUser));
            }
            
            const layoutId = getLayoutIdByClass(selectedClass);
            const layout = document.getElementById(layoutId);
            if (layout) {
                initializePhysicsSubjects(layout, layoutId);
            }
            
            console.log(`Переключились на ${selectedClass} класс`);
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
                const localResults = CONFIG.FALLBACK_DATA.SEARCH.filter(item => 
                    item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    item.keywords.toLowerCase().includes(searchTerm.toLowerCase())
                );
                displaySearchResults(localResults, searchTerm);
            }, 300);
        });
        
        // Закрытие результатов при клике вне поля поиска
        document.addEventListener('click', function(event) {
            const searchResults = document.getElementById('search-results');
            if (!searchInput.contains(event.target) && !searchResults.contains(event.target)) {
                searchResults.classList.remove('show');
            }
        });
    }
    
    // Кнопка "Вся таблица" - ПЛАШКА
    document.getElementById('full-table-btn')?.addEventListener('click', function() {
        showCenterMessage('Функция "Лидеры турнира" в разработке!', 'fa-trophy');
    });
    
    // Иконка уведомлений - ПЛАШКА
    document.getElementById('notification-btn')?.addEventListener('click', function() {
        if (!isAuthenticated) {
            openAuthModal();
        } else {
            showCenterMessage('Функция "Уведомления" в разработке!', 'fa-bell');
        }
    });
    
    // Иконка профиля - ОТКРЫТИЕ МОДАЛКИ АВТОРИЗАЦИИ ИЛИ ПРОФИЛЯ
    document.getElementById('profile-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (isAuthenticated && currentUser) {
            // Если пользователь авторизован, показываем меню профиля
            showProfileMenu();
        } else {
            // Иначе открываем модалку авторизации
            openAuthModal();
        }
    });
    
    // Кнопки "Написать нам" - СООБЩЕНИЕ С ПОЧТОЙ
    document.querySelectorAll('.mail-button').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const email = this.getAttribute('data-email');
            showEmailMessage(email);
        });
    });
    
    // Кнопки "На главную"
    document.getElementById('home-from-desktop9')?.addEventListener('click', goToHome);
    document.getElementById('home-from-desktop10')?.addEventListener('click', goToHome);
    document.getElementById('home-from-desktop11')?.addEventListener('click', goToHome);
    
    // Кнопка закрытия центральной плашки
    document.getElementById('close-center-message')?.addEventListener('click', function() {
        hideCenterMessage();
    });
    
    // ============ ОБРАБОТЧИКИ ДЛЯ МОДАЛЬНОГО ОКНА ============
    
    // Закрытие модального окна
    document.querySelector('.auth-close')?.addEventListener('click', closeAuthModal);
    
    // Клик вне модального окна для закрытия
    document.getElementById('auth-modal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            closeAuthModal();
        }
    });
    
    // Переключение вкладок
    document.querySelectorAll('.auth-tab-btn').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchAuthTab(tabName);
        });
    });
    
    // Отправка формы входа
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    
    // Отправка формы регистрации
    document.getElementById('register-form')?.addEventListener('submit', handleRegister);
    
    // Кнопки социальных сетей
    document.querySelectorAll('.auth-social-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const provider = this.classList.contains('google') ? 'Google' : 'VK';
            showCenterMessage(`Вход через ${provider} в разработке!`, 'fa-external-link-alt');
        });
    });
    
    // Ссылка "Забыли пароль?"
    document.querySelector('.auth-forgot')?.addEventListener('click', function(e) {
        e.preventDefault();
        showCenterMessage('Функция восстановления пароля в разработке!', 'fa-key');
    });
    
    // Закрытие по Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAuthModal();
        }
    });
}

function showProfileMenu() {
    if (!currentUser) return;
    
    const menuHtml = `
        <div class="profile-menu-overlay">
            <div class="profile-menu">
                <div class="profile-header">
                    <i class="fas fa-user-circle"></i>
                    <div>
                        <h3>${currentUser.name}</h3>
                        <p>${currentUser.email}</p>
                        <p>${currentUser.class_number} класс</p>
                    </div>
                </div>
                <div class="profile-actions">
                    <button class="profile-action-btn" data-action="settings">
                        <i class="fas fa-cog"></i> Настройки
                    </button>
                    <button class="profile-action-btn" data-action="stats">
                        <i class="fas fa-chart-bar"></i> Статистика
                    </button>
                    <button class="profile-action-btn" data-action="help">
                        <i class="fas fa-question-circle"></i> Помощь
                    </button>
                    <button class="profile-action-btn logout" data-action="logout">
                        <i class="fas fa-sign-out-alt"></i> Выйти
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Удаляем предыдущие меню
    document.querySelectorAll('.profile-menu-overlay').forEach(el => el.remove());
    
    // Создаем стили для меню
    const styleId = 'profile-menu-styles';
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        styleElement.textContent = `
            .profile-menu-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 9999;
                display: flex;
                justify-content: flex-end;
                align-items: flex-start;
                padding: 70px 20px 0 0;
                animation: fadeIn 0.2s;
            }
            
            .profile-menu {
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                width: 300px;
                overflow: hidden;
                animation: slideDown 0.3s;
            }
            
            @keyframes slideDown {
                from {
                    transform: translateY(-20px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            .profile-header {
                padding: 20px;
                background: linear-gradient(135deg, #3f51b5, #5c6bc0);
                color: white;
                display: flex;
                gap: 15px;
                align-items: center;
            }
            
            .profile-header i {
                font-size: 48px;
            }
            
            .profile-header h3 {
                margin: 0 0 5px 0;
                font-size: 18px;
            }
            
            .profile-header p {
                margin: 0;
                font-size: 14px;
                opacity: 0.9;
            }
            
            .profile-actions {
                padding: 10px 0;
            }
            
            .profile-action-btn {
                width: 100%;
                padding: 12px 20px;
                border: none;
                background: none;
                text-align: left;
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 15px;
                color: #333;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .profile-action-btn:hover {
                background: #f5f5f5;
            }
            
            .profile-action-btn i {
                width: 20px;
                text-align: center;
            }
            
            .profile-action-btn.logout {
                color: #f44336;
                border-top: 1px solid #eee;
                margin-top: 5px;
            }
            
            body.dark-theme .profile-menu {
                background: #1e1e1e;
            }
            
            body.dark-theme .profile-action-btn {
                color: #e0e0e0;
            }
            
            body.dark-theme .profile-action-btn:hover {
                background: #2d2d2d;
            }
            
            body.dark-theme .profile-action-btn.logout {
                border-top-color: #333;
            }
        `;
        document.head.appendChild(styleElement);
    }
    
    // Добавляем меню в DOM
    const overlay = document.createElement('div');
    overlay.innerHTML = menuHtml;
    document.body.appendChild(overlay);
    
    // Обработчики для кнопок меню
    overlay.querySelectorAll('.profile-action-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.dataset.action;
            
            switch(action) {
                case 'settings':
                    showCenterMessage('Настройки профиля в разработке!', 'fa-cog');
                    break;
                case 'stats':
                    showCenterMessage('Статистика в разработке!', 'fa-chart-bar');
                    break;
                case 'help':
                    showCenterMessage('Раздел помощи в разработке!', 'fa-question-circle');
                    break;
                case 'logout':
                    logoutUser();
                    break;
            }
            
            // Закрываем меню
            overlay.remove();
        });
    });
    
    // Закрытие меню при клике вне его
    overlay.addEventListener('click', function(e) {
        if (e.target === this) {
            this.remove();
        }
    });
    
    // Закрытие по Escape
    const closeMenu = function(e) {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', closeMenu);
        }
    };
    document.addEventListener('keydown', closeMenu);
}

// Показать сообщение с почтой
function showEmailMessage(email) {
    // Создаем стили для сообщения с почтой
    const styleId = 'email-message-styles';
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        styleElement.textContent = `
            .email-message-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .email-message-box {
                background-color: white;
                border-radius: 16px;
                padding: 30px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                animation: slideUp 0.4s ease;
                text-align: center;
            }
            
            body.dark-theme .email-message-box {
                background-color: #1e1e1e;
                color: #e0e0e0;
            }
            
            @keyframes slideUp {
                from { transform: translateY(30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            .email-icon-large {
                font-size: 48px;
                color: #87CEEB;
                margin-bottom: 20px;
            }
            
            .email-message-box h3 {
                margin: 0 0 15px 0;
                font-size: 24px;
                color: #333;
            }
            
            body.dark-theme .email-message-box h3 {
                color: #e0e0e0;
            }
            
            .email-address {
                font-size: 18px;
                font-weight: bold;
                color: #3f51b5;
                margin: 15px 0;
                padding: 12px;
                background-color: #f0f8ff;
                border-radius: 8px;
                border: 2px solid #87CEEB;
                word-break: break-all;
            }
            
            body.dark-theme .email-address {
                background-color: #2d2d2d;
                color: #87CEEB;
                border-color: #5cb4e0;
            }
            
            .email-hint {
                font-size: 14px;
                color: #666;
                margin: 15px 0 25px 0;
                line-height: 1.5;
            }
            
            body.dark-theme .email-hint {
                color: #aaa;
            }
            
            .email-buttons {
                display: flex;
                gap: 15px;
                justify-content: center;
            }
            
            .email-btn {
                padding: 12px 24px;
                border-radius: 25px;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.3s;
                border: none;
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 500;
            }
            
            .email-copy-btn {
                background-color: #87CEEB;
                color: white;
            }
            
            .email-copy-btn:hover {
                background-color: #64b5f6;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(135, 206, 235, 0.3);
            }
            
            .email-close-btn {
                background-color: #f0f0f0;
                color: #333;
            }
            
            body.dark-theme .email-close-btn {
                background-color: #333;
                color: #e0e0e0;
            }
            
            .email-close-btn:hover {
                background-color: #e0e0e0;
                transform: translateY(-2px);
            }
            
            body.dark-theme .email-close-btn:hover {
                background-color: #444;
            }
            
            .copy-success {
                color: #4CAF50;
                font-size: 14px;
                margin-top: 15px;
                animation: fadeInOut 3s ease;
            }
            
            @keyframes fadeInOut {
                0% { opacity: 0; }
                20% { opacity: 1; }
                80% { opacity: 1; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(styleElement);
    }
    
    // Удаляем предыдущие сообщения
    const existingOverlays = document.querySelectorAll('.email-message-overlay');
    existingOverlays.forEach(overlay => overlay.remove());
    
    // Создаем оверлей
    const overlay = document.createElement('div');
    overlay.className = 'email-message-overlay';
    
    // Создаем сообщение
    overlay.innerHTML = `
        <div class="email-message-box">
            <i class="fas fa-envelope email-icon-large"></i>
            <h3>Написать нам</h3>
            <p>Наша почта для обратной связи:</p>
            <div class="email-address">${email}</div>
            <p class="email-hint">Скопируйте адрес и напишите нам в вашем почтовом клиенте</p>
            <div class="email-buttons">
                <button class="email-btn email-copy-btn">
                    <i class="fas fa-copy"></i> Скопировать
                </button>
                <button class="email-btn email-close-btn">
                    <i class="fas fa-times"></i> Закрыть
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Обработчики событий
    const copyBtn = overlay.querySelector('.email-copy-btn');
    const closeBtn = overlay.querySelector('.email-close-btn');
    
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(email).then(() => {
            const successMsg = document.createElement('div');
            successMsg.className = 'copy-success';
            successMsg.textContent = 'Email скопирован в буфер обмена!';
            overlay.querySelector('.email-message-box').appendChild(successMsg);
            
            setTimeout(() => {
                if (successMsg.parentNode) {
                    successMsg.remove();
                }
            }, 3000);
        });
    });
    
    closeBtn.addEventListener('click', () => {
        overlay.remove();
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
    
    // Автозакрытие через 10 секунд
    setTimeout(() => {
        if (overlay.parentNode) {
            overlay.remove();
        }
    }, 10000);
}

// Показать центральную плашку (для уведомлений и кнопки "Вся таблица")
function showCenterMessage(message, icon = 'fa-tools') {
    const centerMessage = document.getElementById('center-message');
    const centerIcon = document.getElementById('center-message-icon');
    const centerText = document.getElementById('center-message-text');
    
    if (!centerMessage || !centerIcon || !centerText) return;
    
    // Устанавливаем иконку и текст
    centerIcon.className = `fas ${icon} center-message-icon`;
    centerText.textContent = message;
    
    // Показываем плашку
    centerMessage.classList.add('show');
    
    // Автозакрытие через 4 секунды
    setTimeout(() => {
        hideCenterMessage();
    }, 4000);
}

// Скрыть центральную плашку
function hideCenterMessage() {
    const centerMessage = document.getElementById('center-message');
    if (centerMessage) {
        centerMessage.classList.remove('show');
    }
}

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
                searchResults.classList.remove('show');
                if (searchInput) searchInput.value = '';
                
                if (item.type === 'Таблица лидеров') {
                    document.querySelector('.leaderboard')?.scrollIntoView({ behavior: 'smooth' });
                } else if (item.type === 'Написать нам') {
                    const mailButtons = document.querySelectorAll('.mail-button');
                    if (mailButtons.length > 0) {
                        mailButtons[0].click();
                    }
                } else if (item.type === 'Предмет') {
                    const activeLayout = getActiveLayout();
                    if (activeLayout) {
                        const subjectCards = activeLayout.querySelectorAll('.subject-card');
                        if (subjectCards.length > 0) {
                            subjectCards[0].scrollIntoView({ behavior: 'smooth' });
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
    document.querySelectorAll('.class-btn').forEach(btn => btn.classList.remove('active'));
    const selectedBtn = document.querySelector(`.class-btn[data-class="${selectedClass}"]`);
    if (selectedBtn) selectedBtn.classList.add('active');
    
    document.getElementById('desktop9-layout').style.display = 'none';
    document.getElementById('desktop10-layout').style.display = 'none';
    document.getElementById('desktop11-layout').style.display = 'none';
    document.getElementById('standard-layout').style.display = 'none';
    
    const layoutId = getLayoutIdByClass(selectedClass);
    document.getElementById(layoutId).style.display = 'flex';
    
    updatePageTitle(selectedClass);
}

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

function goToHome() {
    document.getElementById('desktop9-layout').style.display = 'none';
    document.getElementById('desktop10-layout').style.display = 'none';
    document.getElementById('desktop11-layout').style.display = 'none';
    document.getElementById('standard-layout').style.display = 'flex';
    document.querySelectorAll('.class-btn').forEach(btn => btn.classList.remove('active'));
}

function updatePageTitle(classNumber) {
    const pageTitles = document.querySelectorAll('.page-title, .layout-title');
    pageTitles.forEach(title => {
        if (title.textContent.includes('класс')) {
            title.textContent = `Физика - ${classNumber} класс`;
        }
    });
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
    
    // Инициализация приложения
    initApp();
    
    // Начальное состояние макетов
    document.getElementById('desktop9-layout').style.display = 'none';
    document.getElementById('desktop10-layout').style.display = 'none';
    document.getElementById('desktop11-layout').style.display = 'none';
    document.getElementById('standard-layout').style.display = 'flex';
    document.querySelectorAll('.class-btn').forEach(btn => btn.classList.remove('active'));
});

// Дополнительная защита от английских названий
function forceRussianTitles() {
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
    
    document.querySelectorAll('.subject-card h3').forEach(title => {
        const currentText = title.textContent.trim();
        if (currentText === '' || replacements[currentText]) {
            const newText = replacements[currentText] || 'Физика';
            if (currentText !== newText) {
                console.log(`Исправляем: "${currentText}" → "${newText}"`);
                title.textContent = newText;
            }
        }
    });
}

// Запускаем проверку
setTimeout(forceRussianTitles, 500);
setTimeout(forceRussianTitles, 2000);
