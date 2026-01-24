const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});


app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));


pool.connect((err, client, release) => {
  if (err) {
    console.error('Ошибка подключения к базе данных:', err);
  } else {
    console.log(' Успешное подключение к PostgreSQL');
    release();
  }
});


app.get('/api/subjects/:class', async (req, res) => {
  try {
    const { class: classNumber } = req.params;
    const result = await pool.query(
      'SELECT * FROM subjects WHERE class_number = $1 ORDER BY id',
      [classNumber]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения предметов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});


app.get('/api/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.username, u.full_name, l.score, l.rank 
      FROM leaderboard l
      JOIN users u ON l.user_id = u.id
      ORDER BY l.score DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения лидерборда:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});


app.get('/api/search', async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query || query.length < 2) {
      return res.json([]);
    }


    const subjectsResult = await pool.query(
      `SELECT name as title, description, 'Предмет' as type, 'fas fa-book' as icon
       FROM subjects 
       WHERE name ILIKE $1 OR description ILIKE $1
       LIMIT 5`,
      [`%${query}%`]
    );

    const results = [
      ...subjectsResult.rows,
      {
        title: "Таблица лидеров",
        description: "Рейтинг лучших учеников",
        type: "Рейтинг",
        icon: "fas fa-chart-line"
      },
      {
        title: "Написать нам",
        description: "Свяжитесь с поддержкой SCool",
        type: "Поддержка",
        icon: "fas fa-envelope"
      }
    ];

    res.json(results);
  } catch (error) {
    console.error('Ошибка поиска:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});


app.get('/api/achievements', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT title, description, score, max_score, 
             TO_CHAR(date_achieved, 'DD.MM.YYYY') as date
      FROM achievements 
      ORDER BY date_achieved DESC
      LIMIT 5
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения достижений:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});


app.get('/api/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(`
      SELECT s.name, up.progress_percent
      FROM user_progress up
      JOIN subjects s ON up.subject_id = s.id
      WHERE up.user_id = $1
    `, [userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения прогресса:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});


app.post('/api/progress', async (req, res) => {
  try {
    const { userId, subjectId, progress } = req.body;
    
    await pool.query(`
      INSERT INTO user_progress (user_id, subject_id, progress_percent)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, subject_id) 
      DO UPDATE SET progress_percent = $3, updated_at = CURRENT_TIMESTAMP
    `, [userId, subjectId, progress]);
    
    res.json({ success: true, message: 'Прогресс обновлен' });
  } catch (error) {
    console.error('Ошибка обновления прогресса:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.post('/api/init-demo', async (req, res) => {
  try {

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(100),
        class_number INT
      );
      
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        class_number INT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS user_progress (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        subject_id INT REFERENCES subjects(id),
        progress_percent DECIMAL(5,2) DEFAULT 0,
        UNIQUE(user_id, subject_id)
      );
      
      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        score INT,
        max_score INT,
        date_achieved DATE DEFAULT CURRENT_DATE
      );
      
      CREATE TABLE IF NOT EXISTS leaderboard (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        score INT DEFAULT 0,
        rank INT
      );
    `);


    await pool.query(`
      INSERT INTO users (username, full_name, class_number) VALUES
      ('elena_v', 'Елена В.', 9),
      ('vasya', 'Вася', 8),
      ('evgeniy', 'Евгений', 7)
      ON CONFLICT (username) DO NOTHING;
      
      INSERT INTO subjects (name, description, class_number) VALUES
      ('Физика', 'Изучение законов природы', 7),
      ('Физика', 'Изучение законов природы', 8),
      ('Физика', 'Изучение законов природы', 9)
      ON CONFLICT DO NOTHING;
      
      INSERT INTO leaderboard (user_id, score, rank) VALUES
      (1, 1200, 1),
      (2, 1000, 2),
      (3, 900, 3)
      ON CONFLICT DO NOTHING;
      
      INSERT INTO achievements (title, description, score, max_score) VALUES
      ('Осенний турнир', 'Турнир по физике', 520, 1000),
      ('Весенняя олимпиада', 'Школьная олимпиада', 720, 1000)
      ON CONFLICT DO NOTHING;
    `);

    res.json({ success: true, message: 'Демо данные инициализированы' });
  } catch (error) {
    console.error('Ошибка инициализации данных:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});


app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});


app.listen(PORT, () => {
  console.log(` Сервер запущен на порту ${PORT}`);
  console.log(` Откройте в браузере: http://localhost:${PORT}`);
});