// server.js - основной файл для Railway
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('frontend'));

// Healthcheck endpoint - ОБЯЗАТЕЛЬНО для Railway
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'scool-backend'
  });
});

// API endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/subjects/:class', (req, res) => {
  const classNumber = parseInt(req.params.class);
  const subjects = [
    { id: 1, name: 'Physics', description: 'Study of natural laws', class_number: 7 },
    { id: 2, name: 'Mathematics', description: 'Study of numbers and shapes', class_number: 7 },
    { id: 3, name: 'Physics', description: 'Study of natural laws', class_number: 8 },
    { id: 4, name: 'Physics', description: 'Study of natural laws', class_number: 9 }
  ];
  
  const filtered = subjects.filter(s => s.class_number === classNumber);
  res.json(filtered);
});

app.get('/api/leaderboard', (req, res) => {
  res.json([
    { username: 'elena_v', full_name: 'Elena V.', score: 1200, rank: 1 },
    { username: 'vasya', full_name: 'Vasya', score: 1000, rank: 2 },
    { username: 'evgeniy', full_name: 'Evgeniy', score: 900, rank: 3 }
  ]);
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Healthcheck: http://0.0.0.0:${PORT}/health`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
});
