// ========== RAILWAY FIXED SERVER ==========
console.log('='.repeat(60));
console.log('🚀 SCool SERVER - Railway Production (FIXED)');
console.log('='.repeat(60));

// Railway автоматически устанавливает PORT переменную
const PORT = process.env.PORT || 3000;
console.log(`Port from Railway: ${process.env.PORT}`);
console.log(`Using PORT: ${PORT}`);
console.log(`Node Environment: ${process.env.NODE_ENV || 'production'}`);
console.log('='.repeat(60));

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();

// ========== MIDDLEWARE ==========
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== ПУТИ К ФАЙЛАМ ==========
const projectRoot = process.cwd();
const frontendPath = path.join(projectRoot, 'frontend');
const frontendExists = fs.existsSync(frontendPath);

console.log('\n📁 FILE SYSTEM CHECK:');
console.log(`   Project Root: ${projectRoot}`);
console.log(`   Frontend Path: ${frontendPath}`);
console.log(`   Frontend Exists: ${frontendExists ? '✅ YES' : '❌ NO'}`);

if (frontendExists) {
  const files = fs.readdirSync(frontendPath);
  console.log(`   Files in frontend/: ${files.join(', ')}`);
  
  // Проверяем ключевые файлы
  const hasHTML = fs.existsSync(path.join(frontendPath, 'index.html'));
  const hasCSS = fs.existsSync(path.join(frontendPath, 'style.css'));
  const hasJS = fs.existsSync(path.join(frontendPath, 'script.js'));
  
  console.log(`   index.html: ${hasHTML ? '✅' : '❌'}`);
  console.log(`   style.css: ${hasCSS ? '✅' : '❌'}`);
  console.log(`   script.js: ${hasJS ? '✅' : '❌'}`);
} else {
  console.log(`   Files in root: ${fs.readdirSync('.').join(', ')}`);
}

console.log('='.repeat(60));

// ========== СТАТИЧЕСКИЕ ФАЙЛЫ (ВАЖНО: ДОЛЖНЫ БЫТЬ ПЕРВЫМИ) ==========
if (frontendExists) {
  console.log('\n🌐 CONFIGURING STATIC FILES...');
  
  // 1. СНАЧАЛА статические файлы из папки frontend
  app.use(express.static(frontendPath, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      if (path.extname(filePath) === '.html') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));
  
  console.log('✅ Static files configured');
}

// ========== HEALTH CHECK (ДЛЯ RAILWAY) ==========
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    service: 'scool-api',
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'production',
    frontend: frontendExists,
    endpoints: {
      frontend: '/',
      api_docs: '/api',
      subjects: '/api/subjects/:class',
      leaderboard: '/api/leaderboard'
    }
  };
  
  res.status(200).json(health);
});

// ========== ГЛАВНЫЙ МАРШРУТ - ФРОНТЕНД ==========
if (frontendExists) {
  app.get('/', (req, res) => {
    console.log(`📄 Serving index.html for ${req.path}`);
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
  
  // Редирект с /app на /
  app.get('/app', (req, res) => {
    res.redirect('/');
  });
  
  app.get('/app/*', (req, res) => {
    const newPath = req.path.replace('/app', '');
    res.redirect(newPath);
  });
}

// ========== API ENDPOINTS ==========

// Главная страница API
app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SCool API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    port: PORT,
    frontend: frontendExists ? 'available' : 'not_found',
    endpoints: {
      subjects: 'GET /api/subjects/:class',
      leaderboard: 'GET /api/leaderboard',
      test: 'GET /api/test',
      health: 'GET /health'
    }
  });
});

// Тестовый endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working correctly!',
    timestamp: new Date().toISOString(),
    success: true
  });
});

// Предметы по классу
app.get('/api/subjects/:class', (req, res) => {
  const classNum = req.params.class;
  
  const subjectsData = {
    '7': [
      { id: 1, name: 'Физика', progress: 14, color: '#3f51b5' },
      { id: 2, name: 'Математика', progress: 45, color: '#f44336' },
      { id: 3, name: 'Химия', progress: 28, color: '#4caf50' },
      { id: 4, name: 'Биология', progress: 32, color: '#ff9800' }
    ],
    '8': [
      { id: 1, name: 'Физика', progress: 22, color: '#3f51b5' },
      { id: 2, name: 'Алгебра', progress: 51, color: '#f44336' },
      { id: 3, name: 'Геометрия', progress: 38, color: '#4caf50' },
      { id: 4, name: 'Информатика', progress: 67, color: '#ff9800' }
    ],
    '9': [
      { id: 1, name: 'Физика', progress: 58, color: '#3f51b5' },
      { id: 2, name: 'Математика', progress: 72, color: '#f44336' },
      { id: 3, name: 'Химия', progress: 41, color: '#4caf50' },
      { id: 4, name: 'Биология', progress: 36, color: '#ff9800' }
    ]
  };
  
  res.json(subjectsData[classNum] || []);
});

// Таблица лидеров
app.get('/api/leaderboard', (req, res) => {
  const leaderboard = [
    { id: 1, name: 'Елена В.', score: 1200, rank: 1, avatar: 'E' },
    { id: 2, name: 'Вася', score: 1000, rank: 2, avatar: 'B' },
    { id: 3, name: 'Евгений', score: 900, rank: 3, avatar: 'E' },
    { id: 4, name: 'Мария К.', score: 850, rank: 4, avatar: 'M' },
    { id: 5, name: 'Алексей Т.', score: 800, rank: 5, avatar: 'A' }
  ];
  
  res.json(leaderboard);
});

// Поиск
app.get('/api/search', (req, res) => {
  const query = req.query.q || '';
  
  if (!query || query.length < 2) {
    return res.json([]);
  }
  
  const results = [
    {
      title: 'Физика - 7 класс',
      description: '14% завершено',
      type: 'Предмет',
      icon: 'fas fa-atom',
      keywords: 'физика наука 7 класс'
    },
    {
      title: 'Таблица лидеров',
      description: 'Елена В. (1200), Вася (1000), Евгений (900)',
      type: 'Рейтинг',
      icon: 'fas fa-chart-line',
      keywords: 'лидеры турнир рейтинг'
    },
    {
      title: 'Написать нам',
      description: 'Свяжитесь с поддержкой SCool',
      type: 'Поддержка',
      icon: 'fas fa-envelope',
      keywords: 'поддержка помощь обратная связь'
    }
  ].filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.keywords.toLowerCase().includes(query.toLowerCase())
  );
  
  res.json(results);
});

// Авторизация (демо)
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email и пароль обязательны' 
    });
  }
  
  // Демо-авторизация
  res.json({
    success: true,
    user: {
      id: 1,
      email: email,
      name: email.split('@')[0],
      class_number: 7,
      avatar: null
    },
    token: 'demo-token-' + Date.now(),
    message: 'Вход выполнен успешно'
  });
});

app.post('/api/register', (req, res) => {
  const { email, password, fullName, classNumber } = req.body;
  
  if (!email || !password || !fullName || !classNumber) {
    return res.status(400).json({ 
      success: false, 
      message: 'Все поля обязательны' 
    });
  }
  
  res.json({
    success: true,
    user: {
      id: Date.now(),
      email: email,
      name: fullName,
      class_number: parseInt(classNumber),
      avatar: null
    },
    token: 'demo-token-' + Date.now(),
    message: 'Регистрация успешна'
  });
});

// ========== SPA МАРШРУТИЗАЦИЯ ==========
if (frontendExists) {
  // Все остальные маршруты показывают фронтенд (для SPA)
  app.get('*', (req, res, next) => {
    // Пропускаем API маршруты
    if (req.path.startsWith('/api/')) {
      return next();
    }
    
    // Пропускаем уже определенные маршруты
    if (req.path === '/' || req.path === '/health') {
      return next();
    }
    
    // Проверяем, существует ли статический файл
    const fullPath = path.join(frontendPath, req.path);
    if (fs.existsSync(fullPath) && !fs.lstatSync(fullPath).isDirectory()) {
      return res.sendFile(fullPath);
    }
    
    // Если это не статический файл, показываем SPA
    console.log(`🔄 SPA route: ${req.path} -> index.html`);
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// ========== ОБРАБОТКА ОШИБОК ==========
// 404 для API маршрутов
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// 404 для всех остальных маршрутов
app.use((req, res) => {
  if (frontendExists) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    res.status(404).send(`
      <h1>404 - Not Found</h1>
      <p>Path: ${req.path}</p>
      <p>Frontend folder not found at: ${frontendPath}</p>
      <p>Health check: <a href="/health">/health</a></p>
    `);
  }
});

// Обработка ошибок сервера
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// ========== ЗАПУСК СЕРВЕРА ==========
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(60));
  console.log(`✅ SERVER RUNNING ON PORT: ${PORT}`);
  console.log(` Internal URL: http://0.0.0.0:${PORT}`);
  console.log(` Local URL:    http://localhost:${PORT}`);
  console.log('='.repeat(60));
  
  console.log('\n📡 AVAILABLE ENDPOINTS:');
  console.log(`   Frontend App:      http://localhost:${PORT}/`);
  console.log(`   Health Check:      http://localhost:${PORT}/health`);
  console.log(`   API Documentation: http://localhost:${PORT}/api`);
  console.log(`   Test API:          http://localhost:${PORT}/api/test`);
  console.log(`   Subjects (7th):    http://localhost:${PORT}/api/subjects/7`);
  console.log(`   Leaderboard:       http://localhost:${PORT}/api/leaderboard`);
  
  if (frontendExists) {
    console.log(`\n🌐 FRONTEND:        ✅ DETECTED AND SERVING`);
    console.log(`   Main Page:       http://localhost:${PORT}/`);
    console.log(`   CSS File:        http://localhost:${PORT}/style.css`);
    console.log(`   JS File:         http://localhost:${PORT}/script.js`);
    console.log(`   Favicon:         http://localhost:${PORT}/favicon.ico`);
  } else {
    console.log(`\n🌐 FRONTEND:        ❌ NOT FOUND`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🚀 READY FOR RAILWAY DEPLOYMENT');
  console.log(` Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(` Port: ${PORT} (Railway: ${process.env.PORT || 'not set'})`);
  console.log(` Frontend: ${frontendExists ? '✅ Found' : '❌ Missing'}`);
  console.log('='.repeat(60));
});

// ========== GRACEFUL SHUTDOWN ==========
process.on('SIGTERM', () => {
  console.log('\n🔻 Received SIGTERM - shutting down gracefully...');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🔻 Received SIGINT - shutting down...');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});
