// ==================== КОНФИГУРАЦИЯ ДЛЯ RAILWAY ====================
const getApiBaseUrl = () => {
    if (window.location.hostname.includes('railway') || 
        window.location.hostname.includes('vercel') ||
        window.location.hostname.includes('netlify')) {
        return window.location.origin;
    }
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    
    return window.location.origin;
};

const API_BASE_URL = getApiBaseUrl();
console.log('🌐 API Base URL:', API_BASE_URL);

const CONFIG = {
    API_BASE_URL: API_BASE_URL,
    FALLBACK_DATA: {
        SEARCH: [
            {
                title: "Физика - 7 класс",
                description: "Изучение основ физики",
                type: "Предмет",
                icon: "fas fa-atom",
                keywords: "физика наука 7 класс механика движение"
            },
            {
                title: "Таблица лидеров",
                description: "Топ учеников по баллам",
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
        LEADERBOARD: [
            { name: 'Елена Васильева', score: 1200, class: 9, rank: 1 },
            { name: 'Василий Петров', score: 1000, class: 8, rank: 2 },
            { name: 'Евгений Сидоров', score: 900, class: 7, rank: 3 },
            { name: 'Мария Козлова', score: 850, class: 9, rank: 4 },
            { name: 'Алексей Тихонов', score: 800, class: 8, rank: 5 }
        ]
    }
};

let currentUser = null;
let isAuthenticated = false;

// ==================== API ФУНКЦИИ ====================

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`📡 API Request: ${options.method || 'GET'} ${url}`);
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    try {
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`❌ API Error (${endpoint}):`, error.message);
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showCenterMessage('Ошибка подключения к серверу', 'fa-wifi');
        }
        
        throw error;
    }
}

async function loadServerData() {
    try {
        try {
            const leaderboard = await apiRequest('/api/leaderboard');
            if (leaderboard && Array.isArray(leaderboard)) {
                updateAllLeaderboards(leaderboard);
                console.log('✅ Leaderboard loaded from server');
            }
        } catch (error) {
            console.log('Using fallback leaderboard');
            updateAllLeaderboards(CONFIG.FALLBACK_DATA.LEADERBOARD);
        }
        
        if (currentUser && currentUser.class_number) {
            try {
                const subjects = await apiRequest(`/api/subjects/${currentUser.class_number}`);
                if (subjects && Array.isArray(subjects)) {
                    updateSubjectsFromServer(subjects);
                    console.log('✅ Subjects loaded from server');
                }
            } catch (error) {
                console.log('Using fallback subjects');
            }
        }
        
    } catch (error) {
        console.error('Error loading server data:', error);
        useFallbackData();
    }
}

function updateSubjectsFromServer(subjectsData) {
    const layouts = ['desktop9-layout', 'desktop10-layout', 'desktop11-layout', 'standard-layout'];
    
    layouts.forEach(layoutId => {
        const layout = document.getElementById(layoutId);
        if (layout) {
            const subjectCards = layout.querySelectorAll('.subject-card');
            subjectCards.forEach((card, index) => {
                if (subjectsData[index]) {
                    const titleElement = card.querySelector('h3');
                    if (titleElement) {
                        titleElement.textContent = subjectsData[index].name || 'Физика';
                    }
                    
                    const classElement = card.querySelector('p');
                    if (classElement) {
                        classElement.textContent = `${subjectsData[index].class_number || 7} класс`;
                    }
                }
            });
        }
    });
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

async function initApp() {
    console.log('🚀 Инициализация SCool...');
    
    try {
        checkUserSession();
        setupEventListeners();
        initializeAllLayouts();
        
        await loadServerData();
        
        console.log('✅ Приложение успешно инициализировано');
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
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
            console.log('👤 Пользователь авторизован:', currentUser);
        } catch (e) {
            console.error('❌ Ошибка парсинга данных пользователя:', e);
            logoutUser();
        }
    }
}

function updateUserInterface() {
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn && currentUser) {
        profileBtn.title = currentUser.name || 'Профиль';
        profileBtn.style.color = '#4CAF50';
    }
}

function initializeAllLayouts() {
    console.log('📊 Инициализация всех макетов...');
    
    const layouts = ['desktop9-layout', 'desktop10-layout', 'desktop11-layout', 'standard-layout'];
    
    layouts.forEach(layoutId => {
        const layout = document.getElementById(layoutId);
        if (layout) {
            initializePhysicsSubjects(layout, layoutId);
        }
    });
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
    
    const subjectCards = layout.querySelectorAll('.subject-card');
    
    subjectCards.forEach((card, index) => {
        const titleElement = card.querySelector('h3');
        if (titleElement) {
            titleElement.textContent = 'Физика';
        }
        
        const classElement = card.querySelector('p');
        if (classElement) {
            classElement.textContent = `${classNumber} класс`;
        }
    });
}

function updateAllLeaderboards(leaderboardData) {
    const leaderboardList = document.getElementById('leaderboard-list');
    if (!leaderboardList) return;
    
    leaderboardList.innerHTML = '';
    
    leaderboardData.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'leader-item';
        
        const firstLetter = (item.name || 'У').charAt(0).toUpperCase();
        const colors = ['#ff5722', '#4caf50', '#2196f3', '#ff9800', '#9c27b0'];
        const color = colors[index % colors.length];
        
        li.innerHTML = `
            <span class="rank">${item.rank || index + 1}</span>
            <div class="avatar" style="background-color: ${color}; color: white; display: flex; align-items: center; justify-content: center; border-radius: 50%; width: 30px; height: 30px; font-weight: bold;">
                ${firstLetter}
            </div>
            <span class="name">${item.name || `Ученик ${index + 1}`}</span>
            <span class="score">${item.score || 0}</span>
        `;
        
        leaderboardList.appendChild(li);
    });
}

function useFallbackData() {
    console.log('📦 Используем резервные данные...');
    updateAllLeaderboards(CONFIG.FALLBACK_DATA.LEADERBOARD);
}

// ==================== АВТОРИЗАЦИЯ ====================

function openAuthModal() {
    const authModal = document.getElementById('auth-modal');
    if (authModal) {
        authModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        switchAuthTab('login');
        clearAuthMessages();
    }
}

function closeAuthModal() {
    const authModal = document.getElementById('auth-modal');
    if (authModal) {
        authModal.classList.remove('show');
        document.body.style.overflow = '';
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
    document.getElementById('login-form')?.reset();
    document.getElementById('register-form')?.reset();
    clearAuthMessages();
}

function clearAuthMessages() {
    const messages = document.querySelectorAll('.auth-message');
    messages.forEach(msg => msg.remove());
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
    
    if (!email || !password) {
        showAuthMessage('Заполните все поля', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showAuthMessage('Введите корректный email', 'error');
        return;
    }
    
    try {
        showAuthMessage('Выполняется вход...', 'info');
        
        const response = await apiRequest('/api/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (!response.success) {
            throw new Error(response.message || 'Ошибка входа');
        }
        
        const user = {
            id: response.user?.id || Date.now(),
            email: email,
            name: response.user?.name || email.split('@')[0],
            class_number: response.user?.class_number || 7,
            remember_me: rememberMe,
            token: response.token
        };
        
        saveUserSession(user, rememberMe);
        
        showAuthMessage('Вход выполнен успешно!', 'success');
        
        setTimeout(() => {
            closeAuthModal();
            showCenterMessage(`Добро пожаловать, ${user.name}!`, 'fa-user-check');
            updateUserInterface();
            loadServerData();
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
    
    try {
        showAuthMessage('Регистрация...', 'info');
        
        const response = await apiRequest('/api/register', {
            method: 'POST',
            body: JSON.stringify({ 
                email, 
                password, 
                fullName: name, 
                classNumber: parseInt(classNumber) 
            })
        });
        
        if (!response.success) {
            throw new Error(response.message || 'Ошибка регистрации');
        }
        
        const user = {
            id: response.user?.id || Date.now(),
            email: email,
            name: name,
            class_number: parseInt(classNumber),
            token: response.token
        };
        
        saveUserSession(user, true);
        
        showAuthMessage('Регистрация прошла успешно!', 'success');
        
        setTimeout(() => {
            closeAuthModal();
            showCenterMessage(`Добро пожаловать, ${user.name}!`, 'fa-user-plus');
            updateUserInterface();
            loadServerData();
        }, 1500);
        
    } catch (error) {
        showAuthMessage(error.message || 'Ошибка регистрации', 'error');
    }
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
    useFallbackData();
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function showProfileMenu() {
    const menu = document.createElement('div');
    menu.className = 'profile-menu';
    menu.style.cssText = `
        position: absolute;
        top: 60px;
        right: 30px;
        background: white;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 15px;
        min-width: 200px;
        z-index: 1000;
    `;
    
    menu.innerHTML = `
        <div style="padding: 10px; border-bottom: 1px solid #eee;">
            <strong>${currentUser.name}</strong>
            <div style="color: #666; font-size: 0.9em;">${currentUser.email}</div>
            <div style="color: #888; font-size: 0.8em;">Класс: ${currentUser.class_number}</div>
        </div>
        <button id="logout-btn" style="width: 100%; padding: 10px; margin-top: 10px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer;">
            <i class="fas fa-sign-out-alt"></i> Выйти
        </button>
    `;
    
    document.body.appendChild(menu);
    
    document.getElementById('logout-btn').addEventListener('click', function() {
        logoutUser();
        menu.remove();
    });
    
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target) && e.target.id !== 'profile-btn') {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 100);
}

function showEmailMessage(email) {
    showCenterMessage(`Напишите нам на: ${email}`, 'fa-envelope');
}

function showCenterMessage(message, icon = 'fa-info-circle') {
    const messageElement = document.getElementById('center-message');
    const messageText = document.getElementById('center-message-text');
    const messageIcon = document.getElementById('center-message-icon');
    
    if (messageElement && messageText && messageIcon) {
        messageText.textContent = message;
        messageIcon.className = `fas ${icon}`;
        messageElement.classList.add('show');
        
        setTimeout(() => {
            messageElement.classList.remove('show');
        }, 3000);
    }
}

function hideCenterMessage() {
    const messageElement = document.getElementById('center-message');
    if (messageElement) {
        messageElement.classList.remove('show');
    }
}

function switchLayout(classNumber) {
    hideAllLayouts();
    
    const layoutId = getLayoutIdByClass(classNumber);
    const layout = document.getElementById(layoutId);
    
    if (layout) {
        layout.style.display = 'flex';
        layout.classList.add('active');
    }
    
    updateActiveClassButton(classNumber);
}

function getLayoutIdByClass(classNumber) {
    switch(classNumber) {
        case '7': return 'desktop9-layout';
        case '8': return 'desktop10-layout';
        case '9': return 'desktop11-layout';
        default: return 'standard-layout';
    }
}

function hideAllLayouts() {
    const layouts = ['desktop9-layout', 'desktop10-layout', 'desktop11-layout', 'standard-layout'];
    
    layouts.forEach(layoutId => {
        const layout = document.getElementById(layoutId);
        if (layout) {
            layout.style.display = 'none';
            layout.classList.remove('active');
        }
    });
}

function updateActiveClassButton(selectedClass) {
    document.querySelectorAll('.class-btn').forEach(button => {
        if (button.getAttribute('data-class') === selectedClass) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

function getActiveLayout() {
    const layouts = ['desktop9-layout', 'desktop10-layout', 'desktop11-layout', 'standard-layout'];
    
    for (const layoutId of layouts) {
        const layout = document.getElementById(layoutId);
        if (layout && layout.style.display !== 'none') {
            return layout;
        }
    }
    return null;
}

function goToHome() {
    hideAllLayouts();
    document.getElementById('standard-layout').style.display = 'flex';
    document.getElementById('standard-layout').classList.add('active');
    
    document.querySelectorAll('.class-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.class-btn[data-class="7"]')?.classList.add('active');
}

function highlightText(text, searchTerm) {
    if (!searchTerm || searchTerm.length < 2) return text;
    
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
                if (isAuthenticated) {
                    loadSubjectsForClass(selectedClass);
                } else {
                    initializePhysicsSubjects(layout, layoutId);
                }
            }
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
                performSearch(searchTerm);
            }, 300);
        });
        
        document.addEventListener('click', function(event) {
            const searchResults = document.getElementById('search-results');
            if (!searchInput.contains(event.target) && !searchResults.contains(event.target)) {
                searchResults.classList.remove('show');
            }
        });
    }
    
    // Кнопки
    document.getElementById('full-table-btn')?.addEventListener('click', function() {
        showCenterMessage('Функция "Лидеры турнира" в разработке!', 'fa-trophy');
    });
    
    document.getElementById('notification-btn')?.addEventListener('click', function() {
        if (!isAuthenticated) {
            openAuthModal();
        } else {
            showCenterMessage('Функция "Уведомления" в разработке!', 'fa-bell');
        }
    });
    
    document.getElementById('profile-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (isAuthenticated && currentUser) {
            showProfileMenu();
        } else {
            openAuthModal();
        }
    });
    
    // Кнопки "Написать нам"
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
    document.getElementById('close-center-message')?.addEventListener('click', hideCenterMessage);
    
    // Модальное окно авторизации
    document.querySelector('.auth-close')?.addEventListener('click', closeAuthModal);
    
    document.getElementById('auth-modal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            closeAuthModal();
        }
    });
    
    document.querySelectorAll('.auth-tab-btn').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchAuthTab(tabName);
        });
    });
    
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('register-form')?.addEventListener('submit', handleRegister);
    
    document.querySelector('.auth-forgot')?.addEventListener('click', function(e) {
        e.preventDefault();
        showCenterMessage('Функция восстановления пароля в разработке!', 'fa-key');
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAuthModal();
        }
    });
}

async function loadSubjectsForClass(classNumber) {
    try {
        const subjects = await apiRequest(`/api/subjects/${classNumber}`);
        if (subjects && Array.isArray(subjects)) {
            const layoutId = getLayoutIdByClass(classNumber);
            const layout = document.getElementById(layoutId);
            if (layout) {
                const subjectCards = layout.querySelectorAll('.subject-card');
                subjectCards.forEach((card, index) => {
                    if (subjects[index]) {
                        const titleElement = card.querySelector('h3');
                        if (titleElement) {
                            titleElement.textContent = subjects[index].name || 'Физика';
                        }
                        
                        const classElement = card.querySelector('p');
                        if (classElement) {
                            classElement.textContent = `${classNumber} класс`;
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.log('Using fallback subjects for class', classNumber);
    }
}

async function performSearch(searchTerm) {
    try {
        const results = await apiRequest(`/api/search?q=${encodeURIComponent(searchTerm)}`);
        displaySearchResults(results, searchTerm);
    } catch (error) {
        const localResults = CONFIG.FALLBACK_DATA.SEARCH.filter(item => 
            item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            item.keywords.toLowerCase().includes(searchTerm.toLowerCase())
        );
        displaySearchResults(localResults, searchTerm);
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
        noResults.innerHTML = '<i class="fas fa-search"></i> ничего не найдено';
        searchResults.appendChild(noResults);
    } else {
        results.forEach(item => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            
            resultItem.innerHTML = `
                <i class="${item.icon || 'fas fa-search'} result-icon"></i>
                <div class="result-text">
                    <div>${highlightText(item.title, searchTerm)}</div>
                    <small>${highlightText(item.description, searchTerm)}</small>
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
