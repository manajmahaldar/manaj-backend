const http = require('http');

const testEndpoint = (path) => {
    return new Promise((resolve) => {
        const start = Date.now();
        http.get(`http://localhost:5000${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const time = Date.now() - start;
                resolve({ path, status: res.statusCode, time, size: data.length });
            });
        }).on('error', (err) => {
            resolve({ path, error: err.message, time: Date.now() - start });
        });
    });
};

const runTests = async () => {
    const endpoints = [
        '/health',
        '/api/listings',
        '/api/posts',
        '/api/knowledge',
    ];

    console.log("=== API Network Inspection ===");
    for (const ep of endpoints) {
        const result = await testEndpoint(ep);
        const status = result.status || 'ERROR';
        const icon = status === 200 ? '✅' : status >= 400 ? '❌' : '⚠️';
        console.log(`${icon} [${status}] ${result.path} — ${result.time}ms — ${result.size || 0} bytes`);
    }
};

runTests();
