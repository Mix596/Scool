const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

console.log('='.repeat(60));
console.log(' STARTING SCool SERVER');
console.log('='.repeat(60));

// Пути
const projectRoot = process.cwd();
const backendDir = __dirname;
const frontendPath = path.join(projectRoot, 'frontend');
const frontendExists = fs.existsSync(frontendPath);

console.log(' PATHS:');
console.log(`  Project Root: ${projectRoot}`);
console.log(`  Backend Dir:  ${backendDir}`);
console.log(`  Frontend Dir: ${frontendPath}`);
console.log(`  Frontend Exists: ${frontendExists ? ' YES' : ' NO'}`);

if (frontendExists) {
    console.log('\n FRONTEND FILES:');
    const files = fs.readdirSync(frontendPath);
    files.forEach(file => console.log(`   ${file}`));
}
console.log('='.repeat(60));

//  ВАЖНО: Express.static ДО API маршрутов
if (frontendExists) {
    app.use(express.static(frontendPath));
    console.log(' Static files configured');
}

// API маршруты
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'SCool API',
        timestamp: new Date().toISOString(),
        frontend: frontendExists,
        endpoints: {
            health: '/health',
            api: '/api/health',
            subjects: '/api/subjects/:class',
            leaderboard: '/api/leaderboard',
            frontend: frontendExists ? '/app' : null
        }
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'operational', version: '1.0.0' });
});

app.get('/api/subjects/:class', (req, res) => {
    const classNum = parseInt(req.params.class);
    const subjects = [
        { id: 1, name: 'Physics', class: 7, progress: 95 },
        { id: 2, name: 'Mathematics', class: 7, progress: 88 },
        { id: 3, name: 'Physics', class: 8, progress: 75 },
        { id: 4, name: 'Physics', class: 9, progress: 60 }
    ];
    res.json(subjects.filter(s => s.class === classNum));
});

app.get('/api/leaderboard', (req, res) => {
    res.json([
        { username: 'elena_v', name: 'Elena V.', score: 1200, rank: 1 },
        { username: 'vasya', name: 'Vasya P.', score: 1000, rank: 2 },
        { username: 'evgeniy', name: 'Evgeniy S.', score: 900, rank: 3 }
    ]);
});

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

// Для всех остальных путей - если frontend есть, пробуем отдать файл
// если нет - 404
app.use((req, res) => {
    if (frontendExists) {
        // Проверяем есть ли файл
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
    console.log(`  API Status:  http://localhost:${PORT}/`);
    console.log(`  Health:      http://localhost:${PORT}/health`);
    console.log(`  Subjects:    http://localhost:${PORT}/api/subjects/7`);
    console.log(`  Leaderboard: http://localhost:${PORT}/api/leaderboard`);
    
    if (frontendExists) {
        console.log(`  Frontend:    http://localhost:${PORT}/app`);
        console.log(`  CSS:         http://localhost:${PORT}/style.css`);
        console.log(`  JS:          http://localhost:${PORT}/script.js`);
        console.log(`  FontAwesome: https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css`);
    }
    console.log('='.repeat(60));
})
