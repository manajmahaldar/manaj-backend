const autocannon = require('autocannon');

const url = 'http://localhost:5000/api/listings';

const instance = autocannon({
    url: url,
    connections: 100, // Simulate 100 concurrent users
    pipelining: 10,
    duration: 10, // 10 seconds test
}, (err, result) => {
    if (err) {
        console.error('Error during load test:', err);
        return;
    }
    console.log('Load test completed!');
    console.log(`Total Requests: ${result.requests.total}`);
    console.log(`Average Latency: ${result.latency.average} ms`);
    console.log(`Requests/sec: ${result.requests.average}`);
    console.log(`Errors: ${result.errors}`);
});

autocannon.track(instance, { renderProgressBar: true });
