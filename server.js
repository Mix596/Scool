const express = require('express');
const path = require('path');
const fs = require('fs');

// Загружаем .env для локальной разработки
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

console.log('='.repeat(60));
console.log(' STARTING SCool SERVER');
console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(` Port: ${PORT}`);
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

// Дополнительная отладка
console.log('\n ROOT DIRECTORY CONTENTS:');
try {
  const rootFiles = fs.readdirSync(projectRoot);
  rootFiles.forEach(file => {
    const filePath = path.join(projectRoot, file);
    const isDir = fs.lstatSync(filePath).isDirectory();
    console.log(`  ${isDir ? '' : ''} ${file}`);
  });
} catch (error) {
  console.log('  Cannot read directory:', error.message);
}

if (frontendExists) {
    console.log('\n FRONTEND FILES:');
    const files = fs.readdirSync(frontendPath);
    files.forEach(file => console.log(`   ${file}`));
}
console.log('='.repeat(60));

// ВАЖНО: Express.static ДО API маршрутов
if (frontendExists) {
    app.use(express.static(frontendPath));
    console.log(' Static files configured');
}

// ================== ОБНОВЛЕННЫЕ МАРШРУТЫ ==================

// Health check для Railway (ВАЖНО!)
app.get('/health', (req, res) => {
    console.log(`[Healthcheck] ${new Date().toISOString()} from ${req.ip}`);
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'SCool API'
    });
});

// API маршруты
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

// ================== ГЛАВНАЯ СТРАНИЦА ==================
app.get('/', (req, res) => {
    // Проверяем, это healthcheck от Railway?
    const isHealthCheck = req.headers['user-agent']?.includes('Railway') || 
                         req.headers['x-railway-deployment-id'];
    
    if (isHealthCheck) {
        console.log('Railway healthcheck detected on /');
        return res.status(200).json({ 
            status: 'ok',
            timestamp: new Date().toISOString(),
            message: 'Railway health check passed'
        });
    }
    
    // Если frontend существует и есть index.html - отдаём его
    if (frontendExists) {
        const indexPath = path.join(frontendPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            return res.sendFile(indexPath);
        }
    }
    
    // Fallback HTML страница
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SCool Learning Platform</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
            }
            .container {
                background: white;
                border-radius: 20px;
                padding: 40px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                max-width: 800px;
                width: 100%;
            }
            h1 {
                color: #333;
                margin-bottom: 20px;
                font-size: 2.5em;
                text-align: center;
            }
            .status-badge {
                background: #4CAF50;
                color: white;
                padding: 10px 20px;
                border-radius: 50px;
                display: inline-block;
                margin: 10px auto;
                font-weight: bold;
                text-align: center;
            }
            .card {
                background: #f8f9fa;
                border-radius: 15px;
                padding: 25px;
                margin: 20px 0;
                border-left: 5px solid #667eea;
            }
            .api-list {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 15px;
                margin: 25px 0;
            }
            .api-item {
                background: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                transition: transform 0.3s;
            }
            .api-item:hover {
                transform: translateY(-5px);
            }
            .api-item h3 {
                color: #667eea;
                margin-bottom: 10px;
            }
            a {
                color: #667eea;
                text-decoration: none;
                font-weight: bold;
            }
            a:hover {
                text-decoration: underline;
            }
            code {
                background: #e9ecef;
                padding: 2px 6px;
                border-radius: 4px;
                font-family: monospace;
            }
            .info-box {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                padding: 15px;
                border-radius: 10px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎓 SCool Learning Platform</h1>
            
            <div style="text-align: center;">
                <div class="status-badge"> Server Running on Railway</div>
            </div>
            
            <div class="card">
                <h2> System Status</h2>
                <p><strong>Status:</strong> <span style="color: #4CAF50;">Operational</span></p>
                <p><strong>Port:</strong> <code>${PORT}</code></p>
                <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
                <p><strong>Frontend:</strong> ${frontendExists ? 'Found' : 'Not found (add /frontend folder)'}</p>
                <p><strong>Uptime:</strong> <span id="uptime">${process.uptime().toFixed(0)}s</span></p>
            </div>
            
            <div class="info-box">
                <h3> Frontend Not Found</h3>
                <p>To add a frontend, create a <code>/frontend</code> folder with <code>index.html</code> in your project.</p>
                <p>For now, you can use the API endpoints below.</p>
            </div>
            
            <h2>API Endpoints</h2>
            <div class="api-list">
                <div class="api-item">
                    <h3>Health Check</h3>
                    <p><a href="/health" target="_blank">/health</a></p>
                    <p>System status and uptime</p>
                </div>
                <div class="api-item">
                    <h3>Subjects API</h3>
                    <p><a href="/api/subjects/7" target="_blank">/api/subjects/7</a></p>
                    <p>Get subjects for specific class</p>
                </div>
                <div class="api-item">
                    <h3>Leaderboard</h3>
                    <p><a href="/api/leaderboard" target="_blank">/api/leaderboard</a></p>
                    <p>Top users ranking</p>
                </div>
                <div class="api-item">
                    <h3>API Status</h3>
                    <p><a href="/api/health" target="_blank">/api/health</a></p>
                    <p>API version information</p>
                </div>
            </div>
            
            <div class="card">
                <h2>🚀 Quick Start</h2>
                <p>1. Check health: <code>curl https://${req.headers.host}/health</code></p>
                <p>2. Test API: <code>curl https://${req.headers.host}/api/subjects/7</code></p>
                <p>3. Add frontend files to <code>/frontend</code> folder</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; color: #666; font-size: 0.9em;">
                <p>Powered by Express.js & Railway 🚄</p>
                <p>Server time: <span id="timestamp">${new Date().toLocaleString()}</span></p>
            </div>
        </div>
        
        <script>
            // Обновляем uptime каждую секунду
            let uptime = ${process.uptime().toFixed(0)};
            setInterval(() => {
                uptime++;
                document.getElementById('uptime').textContent = uptime + 's';
            }, 1000);
            
            // Обновляем время
            setInterval(() => {
                document.getElementById('timestamp').textContent = new Date().toLocaleString();
            }, 1000);
            
            // Тестируем API
            async function testAPI() {
                try {
                    const response = await fetch('/health');
                    const data = await response.json();
                    console.log('API Status:', data.status);
                } catch (error) {
                    console.error('API test failed:', error);
                }
            }
            testAPI();
        </script>
    </body>
    </html>`;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

// Frontend app - перенаправление
if (frontendExists) {
    app.get('/app', (req, res) => {
        const indexPath = path.join(frontendPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.redirect('/');
        }
    });
}

// 404 для API
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Для всех остальных путей - если frontend есть, пробуем отдать файл
// если нет - редирект на главную
app.use((req, res) => {
    if (frontendExists && !req.path.startsWith('/api/')) {
        const filePath = path.join(frontendPath, req.path);
        if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
        }
    }
    // Редирект на главную для всех остальных путей
    res.redirect('/');
});

// Запуск
app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log(` SERVER RUNNING: http://localhost:${PORT}`);
    console.log('='.repeat(60));
    console.log(' ENDPOINTS:');
    console.log(`  Main Page:   http://localhost:${PORT}/`);
    console.log(`  Health:      http://localhost:${PORT}/health`);
    console.log(`  Subjects:    http://localhost:${PORT}/api/subjects/7`);
    console.log(`  Leaderboard: http://localhost:${PORT}/api/leaderboard`);
    
    if (frontendExists) {
        console.log(`  Frontend:    http://localhost:${PORT}/app`);
    }
    console.log('='.repeat(60));
    console.log('IMPORTANT FOR RAILWAY:');
    console.log('  - Healthcheck endpoint: /health');
    console.log('  - Port should be: ${PORT}');
    console.log('  - Railway will check both / and /health');
    console.log('='.repeat(60));
});
