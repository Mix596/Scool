// Конфигурация
const API_BASE_URL = window.location.origin; // Автоматически определяем URL API
let currentUser = { id: 1, username: 'demo_user', class_number: 7 }; // Демо пользователь

// Данные для поиска (резервные, если API недоступно)
const fallbackSearchData = [
  {
    title: "Физика - 7 класс",
    description: "14% завершено",
    type: "Предмет",
    icon: "fas fa-atom",
    keywords: "физика наука 7 класс"
  },
  {
    title: "Таблица лидеров",
    description: "Елена В. (1200), Вася (1000), Евгений (900)",
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
];

// Инициализация приложения
async function initApp() {
  console.log('?? Инициализация приложения SCool...');
  
  try {
    // Пробуем проинициализировать демо данные в БД
    await fetch(`${API_BASE_URL}/api/init-demo`, {
      method: 'POST'
    }).catch(e => console.log('Демо данные уже инициализированы или сервер недоступен'));
    
    // Загружаем данные с сервера
    await loadDataFromServer();
    
    // Устанавливаем обработчики событий
    setupEventListeners();
    
    console.log('? Приложение успешно инициализировано');
  } catch (error) {
    console.error('? Ошибка инициализации:', error);
    useFallbackData();
  }
}

// Загрузка данных с сервера
async function loadDataFromServer() {
  try {
    // Загружаем предметы для текущего класса пользователя
    const subjectsResponse = await fetch(`${API_BASE_URL}/api/subjects/${currentUser.class_number}`);
    if (subjectsResponse.ok) {
      const subjects = await subjectsResponse.json();
      updateSubjects(subjects);
    }
    
    // Загружаем лидерборд
    const leaderboardResponse = await fetch(`${API_BASE_URL}/api/leaderboard`);
    if (leaderboardResponse.ok) {
      const leaderboard = await leaderboardResponse.json();
      updateLeaderboard(leaderboard);
    }
    
    // Загружаем достижения
    const achievementsResponse = await fetch(`${API_BASE_URL}/api/achievements`);
    if (achievementsResponse.ok) {
      const achievements = await achievementsResponse.json();
      updateAchievements(achievements);
    }
    
    // Загружаем прогресс пользователя
    const progressResponse = await fetch(`${API_BASE_URL}/api/progress/${currentUser.id}`);
    if (progressResponse.ok) {
      const progress = await progressResponse.json();
      updateProgress(progress);
    }
  } catch (error) {
    console.warn('??  Не удалось загрузить данные с сервера, используем локальные данные');
    throw error;
  }
}

// Обновление предметов на странице
function updateSubjects(subjects) {
  const subjectCards = document.querySelectorAll('.subject-card');
  subjectCards.forEach((card, index) => {
    if (subjects[index]) {
      const titleElement = card.querySelector('h3');
      if (titleElement) {
        titleElement.textContent = subjects[index].name;
      }
    }
  });
}

// Обновление лидерборда
function updateLeaderboard(leaderboard) {
  const leaderList = document.querySelector('.leader-list');
  if (!leaderList) return;
  
  leaderList.innerHTML = '';
  leaderboard.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'leader-item';
    const firstLetter = item.full_name ? item.full_name.charAt(0) : item.username.charAt(0);
    const colors = ['#ff5722', '#4caf50', '#2196f3'];
    const color = colors[index % colors.length];
    
    li.innerHTML = `
      <span class="rank">${index + 1}</span>
      <div class="avatar" style="background-image: url('https://via.placeholder.com/30/${color.replace('#', '')}/ffffff?text=${firstLetter}');"></div>
      <span class="name">${item.full_name || item.username}</span>
      <span class="score">${item.score}</span>
    `;
    leaderList.appendChild(li);
  });
}

// Обновление достижений
function updateAchievements(achievements) {
  const achievementsContainer = document.querySelector('.achievements-list');
  if (!achievementsContainer || !achievements.length) return;
  
  const firstAchievement = achievements[0];
  const dateElement = document.querySelector('.section-title-with-date .date');
  const achievementTitle = document.querySelector('.achievement-info h3');
  const achievementDate = document.querySelector('.date-value');
  
  if (dateElement) {
    dateElement.textContent = firstAchievement.date || 'Дата';
  }
  if (achievementTitle) {
    achievementTitle.textContent = firstAchievement.title;
  }
  if (achievementDate) {
    achievementDate.textContent = firstAchievement.date || '09.11.2025';
  }
}

// Обновление прогресса
function updateProgress(progressData) {
  progressData.forEach(progress => {
    const subjectCards = document.querySelectorAll('.subject-card');
    subjectCards.forEach(card => {
      const titleElement = card.querySelector('h3');
      if (titleElement && titleElement.textContent.includes(progress.name)) {
        const progressFill = card.querySelector('.progress-fill');
        const progressText = card.querySelector('.progress-text');
        
        if (progressFill) {
          progressFill.style.width = `${progress.progress_percent}%`;
        }
        if (progressText) {
          progressText.textContent = `${progress.progress_percent}% Завершено`;
        }
      }
    });
  });
}

// Использование резервных данных
function useFallbackData() {
  console.log('?? Используем резервные данные...');
  
  // Обновляем лидерборд из резервных данных
  updateLeaderboard([
    { full_name: 'Елена В.', username: 'elena_v', score: 1200 },
    { full_name: 'Вася', username: 'vasya', score: 1000 },
    { full_name: 'Евгений', username: 'evgeniy', score: 900 }
  ]);
}

// Настройка обработчиков событий
function setupEventListeners() {
  // Переключение темы (оставляем ваш существующий код)
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
      
      // Обновляем данные для выбранного класса
      currentUser.class_number = parseInt(selectedClass);
      try {
        const response = await fetch(`${API_BASE_URL}/api/subjects/${selectedClass}`);
        if (response.ok) {
          const subjects = await response.json();
          updateSubjects(subjects);
        }
      } catch (error) {
        console.warn('Не удалось загрузить предметы для класса', selectedClass);
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
      
      searchTimeout = setTimeout(async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(searchTerm)}`);
          if (response.ok) {
            const results = await response.json();
            displaySearchResults(results, searchTerm);
          } else {
            // Используем резервные данные
            const localResults = fallbackSearchData.filter(item => 
              item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
              item.keywords.toLowerCase().includes(searchTerm.toLowerCase())
            );
            displaySearchResults(localResults, searchTerm);
          }
        } catch (error) {
          console.error('Ошибка поиска:', error);
          const localResults = fallbackSearchData.filter(item => 
            item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            item.keywords.toLowerCase().includes(searchTerm.toLowerCase())
          );
          displaySearchResults(localResults, searchTerm);
        }
      }, 300);
    });
  }
  
  // Кнопка "Вся таблица"
  document.querySelector('.btn-full')?.addEventListener('click', function() {
    alert('Функция "Вся таблица" подключена к базе данных!');
  });
}

// Функция для отображения результатов поиска (адаптированная)
function displaySearchResults(results, searchTerm) {
  const searchResults = document.getElementById('search-results');
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
        searchInput.value = '';
        
        // Прокручиваем к соответствующему разделу
        if (item.type === 'Таблица лидеров') {
          document.querySelector('.leaderboard')?.scrollIntoView({ behavior: 'smooth' });
        } else if (item.type === 'Написать нам') {
          document.querySelector('.contact-button, .contact-btn')?.scrollIntoView({ behavior: 'smooth' });
        }
      });
      
      searchResults.appendChild(resultItem);
    });
  }
  
  searchResults.classList.add('show');
}

// Вспомогательные функции (оставляем ваши)
function highlightText(text, searchTerm) {
  if (!searchTerm) return text;
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<span class="highlight">$1</span>');
}

function switchLayout(selectedClass) {
  document.querySelectorAll('.class-btn').forEach(btn => btn.classList.remove('active'));
  const selectedBtn = document.querySelector(`.class-btn[data-class="${selectedClass}"]`);
  if (selectedBtn) selectedBtn.classList.add('active');
  
  document.getElementById('desktop9-layout').style.display = 'none';
  document.getElementById('desktop10-layout').style.display = 'none';
  document.getElementById('desktop11-layout').style.display = 'none';
  document.getElementById('standard-layout').style.display = 'none';
  
  if (selectedClass === '7') {
    document.getElementById('desktop9-layout').style.display = 'flex';
  } else if (selectedClass === '8') {
    document.getElementById('desktop10-layout').style.display = 'flex';
  } else if (selectedClass === '9') {
    document.getElementById('desktop11-layout').style.display = 'flex';
  }
}

function goToHome() {
  document.getElementById('desktop9-layout').style.display = 'none';
  document.getElementById('desktop10-layout').style.display = 'none';
  document.getElementById('desktop11-layout').style.display = 'none';
  document.getElementById('standard-layout').style.display = 'flex';
  document.querySelectorAll('.class-btn').forEach(btn => btn.classList.remove('active'));
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

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
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