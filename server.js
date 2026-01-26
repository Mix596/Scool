const express = require('express');
const path = require('path');
const fs = require('fs');

// ДОБАВЬТЕ ЭТУ ПРОВЕРКУ СРАЗУ ПОСЛЕ require
console.log('='.repeat(60));
console.log(' DEBUG INFO - STARTING');
console.log('='.repeat(60));

// Проверяем наличие pg модуля
try {
  const pg = require('pg');
  console.log(' pg module loaded successfully');
  console.log(' pg version:', require('pg/package.json').version);
} catch (err) {
  console.error(' ERROR loading pg module:', err.message);
  console.error(' Full error:', err);
  process.exit(1);
}

// Проверяем переменные окружения
console.log('\n Environment variables check:');
console.log('1. DATABASE_URL exists:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  console.log('2. DATABASE_URL length:', process.env.DATABASE_URL.length);
  console.log('3. DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 25) + '...');
}
console.log('4. PORT:', process.env.PORT || 3000);
console.log('='.repeat(60));

// Теперь импортируем Pool после проверки
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

console.log(' STARTING SCool SERVER');
console.log('='.repeat(60));

// Создаем подключение к базе данных
let pool;
if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false  // Обязательно для Railway
      }
    });
    console.log(' Database pool created');
  } catch (err) {
    console.error(' Error creating database pool:', err.message);
    pool = null;
  }
} else {
  console.log('  DATABASE_URL not found, running without database');
  pool = null;
}

// Проверяем подключение к базе
if (pool) {
  pool.connect((err, client, release) => {
    if (err) {
      console.error(' DATABASE CONNECTION ERROR:', err.message);
      console.log('  Running in LOCAL mode (without database)');
    } else {
      console.log(' DATABASE CONNECTED SUCCESSFULLY');
      release();
      
      // Создаем таблицы при первом запуске
      createTables();
    }
  });
} else {
  console.log('  Skipping database connection (no DATABASE_URL)');
}

// Функция создания таблиц
async function createTables() {
  if (!pool) {
    console.log('  Cannot create tables: no database connection');
    return;
  }
  
  try {
    console.log(' Creating database tables...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        score INTEGER DEFAULT 0,
        rank INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('    leaderboard table ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        class INTEGER NOT NULL,
        progress INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('    subjects table ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100),
        class INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('    users table ready');

    console.log(' DATABASE TABLES READY');
    
    // Добавляем тестовые данные если таблицы пустые
    await seedDatabase();
  } catch (err) {
    console.error(' DATABASE SETUP ERROR:', err.message);
    console.error('Full error:', err);
  }
}

// Добавление тестовых данных
async function seedDatabase() {
  if (!pool) return;
  
  try {
    console.log(' Seeding database with test data...');
    
    // Проверяем есть ли данные
    const leaderboardCount = await pool.query('SELECT COUNT(*) FROM leaderboard');
    const subjectsCount = await pool.query('SELECT COUNT(*) FROM subjects');
    
    if (parseInt(leaderboardCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO leaderboard (username, name, score, rank) VALUES 
        ('elena_v', 'Elena V.', 1200, 1),
        ('vasya', 'Vasya P.', 1000, 2),
        ('evgeniy', 'Evgeniy S.', 900, 3)
        ON CONFLICT (username) DO NOTHING
      `);
      console.log(' Added leaderboard test data');
    } else {
      console.log(' Leaderboard already has data');
    }
    
    if (parseInt(subjectsCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO subjects (name, class, progress) VALUES 
        ('Physics', 7, 95),
        ('Mathematics', 7, 88),
        ('Physics', 8, 75),
        ('Physics', 9, 60)
        ON CONFLICT DO NOTHING
      `);
      console.log(' Added subjects test data');
    } else {
      console.log(' Subjects already has data');
    }
    
    console.log(' Database seeding complete');
  } catch (err) {
    console.error(' Seed error:', err.message);
  }
}

// Пути
const projectRoot = process.cwd();
const backendDir = __dirname;
const frontendPath = path.join(projectRoot, 'frontend');
const frontendExists = fs.existsSync(frontendPath);

console.log('\n PATHS:');
console.log(`  Project Root: ${projectRoot}`);
console.log(`  Backend Dir:  ${backendDir}`);
console.log(`  Frontend Dir: ${frontendPath}`);
console.log(`  Frontend Exists: ${frontendExists ? ' YES' : ' NO'}`);

if (frontendExists) {
    console.log('\n FRONTEND FILES:');
    const files = fs.readdirSync(frontendPath);
    files.forEach(file => console.log(`    ${file}`));
}
console.log('='.repeat(60));

// ВАЖНО: Express.static ДО API маршрутов
if (frontendExists) {
    app.use(express.static(frontendPath));
    console.log(' Static files configured');
}

// Добавим простой эндпоинт для проверки базы
app.get('/api/db-check', async (req, res) => {
  if (!pool) {
    return res.json({
      status: 'error',
      message: 'No database connection',
      database_url: !!process.env.DATABASE_URL,
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    const result = await pool.query('SELECT version()');
    res.json({
      status: 'connected',
      database: 'PostgreSQL',
      version: result.rows[0].version,
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

// API маршруты
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'SCool API',
        timestamp: new Date().toISOString(),
        frontend: frontendExists,
        database: process.env.DATABASE_URL ? 'configured' : 'not configured',
        database_connected: !!pool,
        endpoints: {
            health: '/health',
            api: '/api/health',
            db_check: '/api/db-check',
            subjects: '/api/subjects/:class',
            leaderboard: '/api/leaderboard',
            frontend: frontendExists ? '/app' : null
        }
    });
});

app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      database: process.env.DATABASE_URL ? (pool ? 'connected' : 'error') : 'local'
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'operational', 
      version: '1.0.0',
      database: process.env.DATABASE_URL ? (pool ? 'connected' : 'error') : 'local',
      pg_module: 'loaded'
    });
});

// Обновленный API для работы с базой данных
app.get('/api/subjects/:class', async (req, res) => {
    const classNum = parseInt(req.params.class);
    
    if (!pool) {
        // Fallback на статические данные
        const fallbackData = [
            { id: 1, name: 'Physics', class: classNum, progress: 95 },
            { id: 2, name: 'Mathematics', class: classNum, progress: 88 }
        ];
        return res.json(fallbackData);
    }
    
    try {
        const result = await pool.query(
            'SELECT * FROM subjects WHERE class = $1 ORDER BY name',
            [classNum]
        );
        
        // Если нет данных - возвращаем тестовые
        if (result.rows.length === 0) {
            const mockData = [
                { id: 1, name: 'Physics', class: classNum, progress: 95 },
                { id: 2, name: 'Mathematics', class: classNum, progress: 88 }
            ];
            res.json(mockData);
        } else {
            res.json(result.rows);
        }
    } catch (err) {
        console.error('Subjects error:', err);
        // Fallback на статические данные
        const fallbackData = [
            { id: 1, name: 'Physics', class: classNum, progress: 95 },
            { id: 2, name: 'Mathematics', class: classNum, progress: 88 }
        ];
        res.json(fallbackData);
    }
});

app.get('/api/leaderboard', async (req, res) => {
    if (!pool) {
        return res.json([
            { username: 'elena_v', name: 'Elena V.', score: 1200, rank: 1 },
            { username: 'vasya', name: 'Vasya P.', score: 1000, rank: 2 },
            { username: 'evgeniy', name: 'Evgeniy S.', score: 900, rank: 3 }
        ]);
    }
    
    try {
        const result = await pool.query(
            'SELECT * FROM leaderboard ORDER BY rank LIMIT 10'
        );
        
        if (result.rows.length === 0) {
            const mockData = [
                { username: 'elena_v', name: 'Elena V.', score: 1200, rank: 1 },
                { username: 'vasya', name: 'Vasya P.', score: 1000, rank: 2 },
                { username: 'evgeniy', name: 'Evgeniy S.', score: 900, rank: 3 }
            ];
            res.json(mockData);
        } else {
            res.json(result.rows);
        }
    } catch (err) {
        console.error('Leaderboard error:', err);
        res.json([
            { username: 'elena_v', name: 'Elena V.', score: 1200, rank: 1 },
            { username: 'vasya', name: 'Vasya P.', score: 1000, rank: 2 },
            { username: 'evgeniy', name: 'Evgeniy S.', score: 900, rank: 3 }
        ]);
    }
});

// НОВЫЕ API ДЛЯ РАБОТЫ С БАЗОЙ

// Добавить результат
app.post('/api/score', async (req, res) => {
    if (!pool) {
        return res.status(500).json({ error: 'Database not available' });
    }
    
    try {
        const { username, name, score } = req.body;
        
        // Находим текущий ранг
        const rankResult = await pool.query(
            'SELECT COUNT(*) + 1 as new_rank FROM leaderboard WHERE score > $1',
            [score]
        );
        
        const newRank = parseInt(rankResult.rows[0].new_rank);
        
        // Обновляем или вставляем
        await pool.query(`
            INSERT INTO leaderboard (username, name, score, rank) 
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (username) 
            DO UPDATE SET score = $3, rank = $4
        `, [username, name, score, newRank]);
        
        // Обновляем ранги всех
        await updateRanks();
        
        res.json({ success: true, rank: newRank });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Обновить прогресс по предмету
app.post('/api/subject-progress', async (req, res) => {
    if (!pool) {
        return res.status(500).json({ error: 'Database not available' });
    }
    
    try {
        const { name, class: classNum, progress } = req.body;
        
        await pool.query(`
            INSERT INTO subjects (name, class, progress) 
            VALUES ($1, $2, $3)
            ON CONFLICT (name, class) 
            DO UPDATE SET progress = $3
        `, [name, classNum, progress]);
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получить топ-10
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
        res.status(500).json({ error: err.message });
    }
});

// Функция обновления рангов
async function updateRanks() {
    if (!pool) return;
    
    try {
        await pool.query(`
            UPDATE leaderboard l
            SET rank = t.new_rank
            FROM (
                SELECT username, 
                       ROW_NUMBER() OVER (ORDER BY score DESC) as new_rank
                FROM leaderboard
            ) t
            WHERE l.username = t.username
        `);
    } catch (err) {
        console.error('Update ranks error:', err);
    }
}

// Frontend app
if (frontendExists) {
    app.get('/app', (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}

// 404 для API
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Для всех остальных путей
app.use((req, res) => {
    if (frontendExists) {
        const filePath = path.join(frontendPath, req.path);
        if (fs.existsSync(filePath) && !req.path.startsWith('/api/')) {
            res.sendFile(filePath);
        } else {
            res.status(404).send('Not found');
        }
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

// Запуск
app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log(` SERVER RUNNING: http://localhost:${PORT}`);
    console.log('='.repeat(60));
    console.log(' ENDPOINTS:');
    console.log(`   API Status:  http://localhost:${PORT}/`);
    console.log(`   Health:      http://localhost:${PORT}/health`);
    console.log(`    DB Check:    http://localhost:${PORT}/api/db-check`);
    console.log(`  Subjects:    http://localhost:${PORT}/api/subjects/7`);
    console.log(`   Leaderboard: http://localhost:${PORT}/api/leaderboard`);
    console.log(`   Top 10:      http://localhost:${PORT}/api/top10`);
    
    if (process.env.DATABASE_URL) {
        console.log(`    Database:    ${pool ? ' CONNECTED' : '❌ ERROR'} (Railway PostgreSQL)`);
    } else {
        console.log(`    Database:      LOCAL MODE (add DATABASE_URL to connect)`);
    }
    
    if (frontendExists) {
        console.log(`   Frontend:    http://localhost:${PORT}/app`);
        console.log(`   CSS:         http://localhost:${PORT}/style.css`);
        console.log(`    JS:          http://localhost:${PORT}/script.js`);
    }
    console.log('='.repeat(60));
});

// Обработка ошибок при выходе
process.on('SIGINT', () => {
  console.log('\n Shutting down gracefully...');
  if (pool) {
    pool.end(() => {
      console.log(' Database pool closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
