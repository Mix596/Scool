const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// ========== RAILWAY PORT FIX ==========
// Функция для надежного получения порта в Railway
function getRailwayPort() {
  console.log('🔍 Checking Railway environment...');
  
  // Список возможных переменных порта в Railway
  const portCandidates = [
    process.env.PORT,                    // Основная переменная
    process.env.RAILWAY_PORT,           // Railway специфичная
    process.env.PORT_NUMBER,            // Альтернативное название
    process.env.HTTP_PORT,              // HTTP порт
    process.env.APP_PORT,               // Порт приложения
    process.env.SERVER_PORT             // Порт сервера
  ];
  
  // Проверяем каждую переменную
  for (let i = 0; i < portCandidates.length; i++) {
    const port = portCandidates[i];
    if (port && !isNaN(parseInt(port))) {
      console.log(` Found port in candidate ${i}: ${port}`);
      return parseInt(port);
    }
  }
  
  // Если ничего не найдено, проверяем все переменные окружения
  console.log('🔍 Checking all environment variables...');
  const allEnvVars = Object.keys(process.env);
  for (const key of allEnvVars) {
    if (key.toUpperCase().includes('PORT') && 
        process.env[key] && 
        !isNaN(parseInt(process.env[key]))) {
      console.log(` Found port in ${key}: ${process.env[key]}`);
      return parseInt(process.env[key]);
    }
  }
  
  // Возвращаем порт по умолчанию
  console.log('  No Railway port found, using default: 8080');
  return 8080;
}

// Получаем порт
const PORT = getRailwayPort();

console.log('='.repeat(60));
console.log(' SCool Server - Railway Deployment');
console.log('='.repeat(60));
console.log(` Railway PORT variable: "${process.env.PORT}"`);
console.log(` Using PORT: ${PORT}`);
console.log(` NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(` Listen address: 0.0.0.0`);
console.log('='.repeat(60));

// Проверяем наличие pg модуля
try {
  const pg = require('pg');
  console.log(` pg module: ${require('pg/package.json').version}`);
} catch (err) {
  console.error(' ERROR loading pg module:', err.message);
  console.error('Full error:', err);
  process.exit(1);
}

// Импортируем Pool после проверки
const { Pool } = require('pg');

const app = express();

// ========== MIDDLEWARE ==========
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== БАЗА ДАННЫХ ==========
console.log('\n💾 DATABASE CONFIGURATION:');
let pool = null;

async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.log('  DATABASE_URL not found - running in local mode');
    return null;
  }

  try {
    console.log('🔌 Connecting to Railway PostgreSQL...');
    
    // Railway PostgreSQL требует SSL
    const poolConfig = {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    };

    pool = new Pool(poolConfig);
    
    // Обработчик ошибок пула
    pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
    });

    // Тестируем подключение
    const client = await pool.connect();
    console.log(' DATABASE CONNECTED');
    
    // Получаем информацию о БД
    const versionResult = await client.query('SELECT version()');
    const dbInfo = await client.query('SELECT current_database(), current_user');
    
    console.log(`    Database: ${dbInfo.rows[0].current_database}`);
    console.log(`    User: ${dbInfo.rows[0].current_user}`);
    console.log(`    PostgreSQL: ${versionResult.rows[0].version.split(',')[0]}`);
    
    client.release();
    
    // Создаем таблицы
    await createTables();
    
    return pool;
    
  } catch (err) {
    console.error(' DATABASE CONNECTION FAILED:', err.message);
    console.log('  Running without database connection');
    return null;
  }
}

// Функция создания таблиц
async function createTables() {
  if (!pool) return;
  
  try {
    console.log('\n CREATING DATABASE TABLES...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        score INTEGER DEFAULT 0,
        rank INTEGER DEFAULT 999,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log(' leaderboard table ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        class INTEGER NOT NULL,
        progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, class)
      )
    `);
    console.log(' subjects table ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100),
        class INTEGER CHECK (class >= 1 AND class <= 11),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log(' users table ready');

    console.log(' DATABASE TABLES READY');
    
    await seedDatabase();
    
  } catch (err) {
    console.error(' DATABASE SETUP ERROR:', err.message);
  }
}

// Добавление тестовых данных
async function seedDatabase() {
  if (!pool) return;
  
  try {
    console.log('\n SEEDING DATABASE...');
    
    const leaderboardResult = await pool.query('SELECT COUNT(*) FROM leaderboard');
    const leaderboardCount = parseInt(leaderboardResult.rows[0].count);
    
    if (leaderboardCount === 0) {
      await pool.query(`
        INSERT INTO leaderboard (username, name, score, rank) VALUES 
        ('elena_v', 'Elena V.', 1200, 1),
        ('vasya', 'Vasya P.', 1000, 2),
        ('evgeniy', 'Evgeniy S.', 900, 3),
        ('maria_k', 'Maria K.', 850, 4),
        ('alex_t', 'Alex T.', 800, 5)
        ON CONFLICT (username) DO NOTHING
      `);
      console.log(`   📊 Added leaderboard entries`);
    }
    
    const subjectsResult = await pool.query('SELECT COUNT(*) FROM subjects');
    const subjectsCount = parseInt(subjectsResult.rows[0].count);
    
    if (subjectsCount === 0) {
      await pool.query(`
        INSERT INTO subjects (name, class, progress) VALUES 
        ('Physics', 7, 95),
        ('Mathematics', 7, 88),
        ('Chemistry', 7, 78),
        ('Physics', 8, 75),
        ('Physics', 9, 60),
        ('Biology', 9, 85),
        ('Informatics', 10, 92)
        ON CONFLICT DO NOTHING
      `);
      console.log(`    Added subject entries`);
    }
    
    console.log(' SEEDING COMPLETE');
    
  } catch (err) {
    console.error(' SEED ERROR:', err.message);
  }
}

// ========== ПУТИ К ФАЙЛАМ ==========
const projectRoot = process.cwd();
const frontendPath = path.join(projectRoot, 'frontend');
const frontendExists = fs.existsSync(frontendPath);

console.log('\n FILE SYSTEM PATHS:');
console.log(`    Project Root: ${projectRoot}`);
console.log(`   Frontend Dir: ${frontendPath}`);
console.log(`    Frontend Exists: ${frontendExists ? ' YES' : ' NO'}`);

if (frontendExists) {
  console.log('\n   📄 FRONTEND FILES:');
  const files = fs.readdirSync(frontendPath);
  files.slice(0, 5).forEach(file => console.log(`      ${file}`));
}
console.log('='.repeat(60));

// ========== СТАТИЧЕСКИЕ ФАЙЛЫ ==========
if (frontendExists) {
  app.use(express.static(frontendPath, {
    maxAge: '1d',
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));
  console.log(' Static files configured');
}

// ========== ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ ==========
initializeDatabase().then(() => {
  console.log('\n DATABASE INITIALIZATION COMPLETE');
}).catch(err => {
  console.error(' DATABASE INIT FAILED:', err);
});

// ========== HEALTH CHECK (для Railway) ==========
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'scool-api',
    port: PORT,
    railway_port: process.env.PORT,
    environment: process.env.NODE_ENV || 'development',
    database: 'checking'
  };

  try {
    if (pool) {
      await pool.query('SELECT 1');
      health.database = 'connected';
      health.database_status = 'healthy';
    } else if (process.env.DATABASE_URL) {
      health.database = 'disconnected';
      health.database_status = 'no_pool';
    } else {
      health.database = 'local_mode';
      health.database_status = 'not_configured';
    }
    
    // Railway требует 200 OK
    res.status(200).json(health);
    
  } catch (err) {
    health.database = 'error';
    health.database_error = err.message;
    health.status = 'degraded';
    res.status(200).json(health);
  }
});

// ========== API ENDPOINTS ==========

// Главная страница API
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SCool API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    port: PORT,
    railway_port: process.env.PORT,
    documentation: {
      health: '/health',
      api: '/api/health',
      db_check: '/api/db-check',
      subjects: '/api/subjects/:class',
      leaderboard: '/api/leaderboard',
      frontend: frontendExists ? '/app' : null
    },
    environment: {
      node: process.version,
      database: process.env.DATABASE_URL ? 'configured' : 'local',
      frontend: frontendExists
    }
  });
});

// API Health
app.get('/api/health', async (req, res) => {
  const apiHealth = {
    status: 'operational',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    port: PORT,
    endpoints: {
      subjects: 'active',
      leaderboard: 'active',
      score: 'active'
    }
  };

  try {
    if (pool) {
      await pool.query('SELECT 1');
      apiHealth.database = 'connected';
    } else {
      apiHealth.database = 'local_mode';
    }
    
    res.status(200).json(apiHealth);
  } catch (err) {
    apiHealth.database = 'error';
    apiHealth.error = err.message;
    apiHealth.status = 'degraded';
    res.status(200).json(apiHealth);
  }
});

// Проверка базы данных
app.get('/api/db-check', async (req, res) => {
  if (!pool) {
    return res.json({
      status: 'local_mode',
      message: 'Running without database connection',
      database_url: !!process.env.DATABASE_URL,
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    const version = await pool.query('SELECT version()');
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM leaderboard) as leaderboard_count,
        (SELECT COUNT(*) FROM subjects) as subjects_count,
        (SELECT COUNT(*) FROM users) as users_count
    `);
    
    res.json({
      status: 'connected',
      database: 'PostgreSQL',
      version: version.rows[0].version.split(',')[0],
      stats: stats.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.json({
      status: 'error',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Получить предметы для класса
app.get('/api/subjects/:class', async (req, res) => {
  const classNum = parseInt(req.params.class);
  
  if (!pool) {
    const fallbackData = [
      { id: 1, name: 'Physics', class: classNum, progress: 95 },
      { id: 2, name: 'Mathematics', class: classNum, progress: 88 },
      { id: 3, name: 'Chemistry', class: classNum, progress: 78 },
      { id: 4, name: 'Biology', class: classNum, progress: 85 }
    ];
    return res.json(fallbackData);
  }
  
  try {
    const result = await pool.query(
      'SELECT * FROM subjects WHERE class = $1 ORDER BY name',
      [classNum]
    );
    
    if (result.rows.length === 0) {
      const defaultSubjects = [
        { id: 1, name: 'Physics', class: classNum, progress: 0 },
        { id: 2, name: 'Mathematics', class: classNum, progress: 0 },
        { id: 3, name: 'Chemistry', class: classNum, progress: 0 },
        { id: 4, name: 'Biology', class: classNum, progress: 0 }
      ];
      res.json(defaultSubjects);
    } else {
      res.json(result.rows);
    }
  } catch (err) {
    console.error('Subjects error:', err);
    res.json([
      { id: 1, name: 'Physics', class: classNum, progress: 95 },
      { id: 2, name: 'Mathematics', class: classNum, progress: 88 }
    ]);
  }
});

// Лидерборд
app.get('/api/leaderboard', async (req, res) => {
  if (!pool) {
    return res.json([
      { id: 1, username: 'elena_v', name: 'Elena V.', score: 1200, rank: 1 },
      { id: 2, username: 'vasya', name: 'Vasya P.', score: 1000, rank: 2 },
      { id: 3, username: 'evgeniy', name: 'Evgeniy S.', score: 900, rank: 3 },
      { id: 4, username: 'maria_k', name: 'Maria K.', score: 850, rank: 4 },
      { id: 5, username: 'alex_t', name: 'Alex T.', score: 800, rank: 5 }
    ]);
  }
  
  try {
    const result = await pool.query(
      'SELECT * FROM leaderboard ORDER BY rank NULLS LAST LIMIT 20'
    );
    
    if (result.rows.length === 0) {
      const mockData = [
        { id: 1, username: 'elena_v', name: 'Elena V.', score: 1200, rank: 1 },
        { id: 2, username: 'vasya', name: 'Vasya P.', score: 1000, rank: 2 },
        { id: 3, username: 'evgeniy', name: 'Evgeniy S.', score: 900, rank: 3 }
      ];
      res.json(mockData);
    } else {
      res.json(result.rows);
    }
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.json([
      { id: 1, username: 'elena_v', name: 'Elena V.', score: 1200, rank: 1 },
      { id: 2, username: 'vasya', name: 'Vasya P.', score: 1000, rank: 2 },
      { id: 3, username: 'evgeniy', name: 'Evgeniy S.', score: 900, rank: 3 }
    ]);
  }
});

// Добавить/обновить результат
app.post('/api/score', async (req, res) => {
  if (!pool) {
    return res.status(200).json({ 
      success: false, 
      message: 'Database not available, running in local mode' 
    });
  }
  
  try {
    const { username, name, score } = req.body;
    
    if (!username || !name || score === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      await client.query(`
        INSERT INTO leaderboard (username, name, score, rank) 
        VALUES ($1, $2, $3, 999)
        ON CONFLICT (username) 
        DO UPDATE SET score = $3, updated_at = CURRENT_TIMESTAMP
      `, [username, name, score]);
      
      await client.query(`
        WITH ranked AS (
          SELECT username, 
                 ROW_NUMBER() OVER (ORDER BY score DESC) as new_rank
          FROM leaderboard
        )
        UPDATE leaderboard l
        SET rank = r.new_rank,
            updated_at = CURRENT_TIMESTAMP
        FROM ranked r
        WHERE l.username = r.username
      `);
      
      await client.query('COMMIT');
      
      const result = await client.query(
        'SELECT * FROM leaderboard WHERE username = $1',
        [username]
      );
      
      res.json({
        success: true,
        rank: result.rows[0]?.rank || 999,
        score: score
      });
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    
  } catch (err) {
    console.error('Score update error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Обновить прогресс по предмету
app.post('/api/subject-progress', async (req, res) => {
  if (!pool) {
    return res.status(200).json({ 
      success: false, 
      message: 'Database not available' 
    });
  }
  
  try {
    const { name, class: classNum, progress } = req.body;
    
    if (!name || !classNum || progress === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    await pool.query(`
      INSERT INTO subjects (name, class, progress) 
      VALUES ($1, $2, $3)
      ON CONFLICT (name, class) 
      DO UPDATE SET progress = $3, updated_at = CURRENT_TIMESTAMP
    `, [name, classNum, progress]);
    
    res.json({ 
      success: true, 
      message: 'Progress updated' 
    });
    
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Получить топ 10
app.get('/api/top10', async (req, res) => {
  if (!pool) {
    return res.json([
      { username: 'elena_v', name: 'Elena V.', score: 1200, rank: 1 },
      { username: 'vasya', name: 'Vasya P.', score: 1000, rank: 2 },
      { username: 'evgeniy', name: 'Evgeniy S.', score: 900, rank: 3 }
    ]);
  }
  
  try {
    const result = await pool.query(
      'SELECT * FROM leaderboard ORDER BY score DESC LIMIT 10'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ 
      error: err.message 
    });
  }
});

// ========== FRONTEND ROUTES ==========
if (frontendExists) {
  app.get('/app', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
  
  app.get('/app/*', (req, res) => {
    const filePath = path.join(frontendPath, req.path.replace('/app', ''));
    if (fs.existsSync(filePath) && !fs.lstatSync(filePath).isDirectory()) {
      res.sendFile(filePath);
    } else {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
}

// ========== ERROR HANDLING ==========
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.path,
    method: req.method,
    port: PORT
  });
});

app.use((req, res) => {
  if (frontendExists && !req.path.startsWith('/api/')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    res.status(404).json({ 
      error: 'Not found',
      port: PORT,
      available_endpoints: [
        '/',
        '/health',
        '/api/health',
        '/api/subjects/:class',
        '/api/leaderboard'
      ]
    });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    port: PORT,
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ========== ЗАПУСК СЕРВЕРА ==========
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(60));
  console.log(` SERVER RUNNING ON PORT: ${PORT}`);
  console.log(` Internal URL: http://0.0.0.0:${PORT}`);
  console.log(` Local URL:    http://localhost:${PORT}`);
  console.log('='.repeat(60));
  console.log('\n📡 PUBLIC ENDPOINTS:');
  console.log(`    Main API:     https://YOUR_PROJECT.railway.app/`);
  console.log(`     Health:       https://YOUR_PROJECT.railway.app/health`);
  console.log(`    Subjects:     https://YOUR_PROJECT.railway.app/api/subjects/7`);
  console.log(`    Leaderboard:  https://YOUR_PROJECT.railway.app/api/leaderboard`);
  console.log(`    Frontend:     https://YOUR_PROJECT.railway.app/app`);
  console.log('\n🔧 INTERNAL ENDPOINTS:');
  console.log(`    DB Check:     http://localhost:${PORT}/api/db-check`);
  console.log(`    Top 10:       http://localhost:${PORT}/api/top10`);
  
  if (process.env.DATABASE_URL) {
    console.log(`\n DATABASE:       ${pool ? ' CONNECTED' : ' DISCONNECTED'}`);
    if (pool) {
      console.log(`    URL: ${process.env.DATABASE_URL.substring(0, 30)}...`);
    }
  } else {
    console.log(`\n DATABASE:         LOCAL MODE (no DATABASE_URL)`);
  }
  
  if (frontendExists) {
    console.log(`\n FRONTEND:        DETECTED`);
    console.log(`    App:         http://localhost:${PORT}/app`);
    console.log(`    CSS:         http://localhost:${PORT}/style.css`);
    console.log(`     JS:          http://localhost:${PORT}/script.js`);
  } else {
    console.log(`\n FRONTEND:        NOT FOUND`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(' READY FOR RAILWAY DEPLOYMENT');
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Port detection: ${process.env.PORT ? 'Railway' : 'Default (8080)'}`);
  console.log('='.repeat(60));
});

// ========== GRACEFUL SHUTDOWN ==========
process.on('SIGTERM', () => {
  console.log('\n🔻 Received SIGTERM - shutting down gracefully...');
  server.close(() => {
    console.log('   HTTP server closed');
    if (pool) {
      pool.end(() => {
        console.log('   Database pool closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

process.on('SIGINT', () => {
  console.log('\n Received SIGINT - shutting down...');
  server.close(() => {
    console.log('   HTTP server closed');
    if (pool) {
      pool.end(() => {
        console.log('   Database pool closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});
