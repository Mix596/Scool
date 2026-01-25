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
    console.error('Database connection error:', err);
  } else {
    console.log('Successfully connected to PostgreSQL');
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
    console.error('Error getting subjects:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query || query.length < 2) {
      return res.json([]);
    }

    const subjectsResult = await pool.query(
      `SELECT name as title, description, 'Subject' as type, 'fas fa-book' as icon
       FROM subjects 
       WHERE name ILIKE $1 OR description ILIKE $1
       LIMIT 5`,
      [`%${query}%`]
    );

    const results = [
      ...subjectsResult.rows,
      {
        title: "Leaderboard",
        description: "Top students rating",
        type: "Rating",
        icon: "fas fa-chart-line"
      },
      {
        title: "Contact us",
        description: "Contact SCool support",
        type: "Support",
        icon: "fas fa-envelope"
      }
    ];

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    console.error('Error getting achievements:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    console.error('Error getting progress:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    
    res.json({ success: true, message: 'Progress updated' });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Internal server error' });
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
      ('elena_v', 'Elena V.', 9),
      ('vasya', 'Vasya', 8),
      ('evgeniy', 'Evgeniy', 7)
      ON CONFLICT (username) DO NOTHING;
      
      INSERT INTO subjects (name, description, class_number) VALUES
      ('Physics', 'Study of natural laws', 7),
      ('Physics', 'Study of natural laws', 8),
      ('Physics', 'Study of natural laws', 9)
      ON CONFLICT DO NOTHING;
      
      INSERT INTO leaderboard (user_id, score, rank) VALUES
      (1, 1200, 1),
      (2, 1000, 2),
      (3, 900, 3)
      ON CONFLICT DO NOTHING;
      
      INSERT INTO achievements (title, description, score, max_score) VALUES
      ('Autumn tournament', 'Physics tournament', 520, 1000),
      ('Spring olympiad', 'School olympiad', 720, 1000)
      ON CONFLICT DO NOTHING;
    `);

    res.json({ success: true, message: 'Demo data initialized' });
  } catch (error) {
    console.error('Error initializing data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open in browser: http://localhost:${PORT}`);
});