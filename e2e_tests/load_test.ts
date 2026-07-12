// e2e_tests/load_test.ts
import http from 'http';

async function runLoadTest(concurrency = 50, durationSeconds = 10) {
  console.log(`Starting Load Test... Concurrency: ${concurrency}, Duration: ${durationSeconds}s`);
  const start = Date.now();
  const end = start + durationSeconds * 1000;
  
  let successCount = 0;
  let errorCount = 0;
  let totalLatency = 0;

  const makeRequest = (): Promise<void> => {
    return new Promise((resolve) => {
      const requestStart = Date.now();
      const req = http.get('http://localhost:8000/health', (res) => {
        if (res.statusCode === 200) {
          successCount++;
          totalLatency += (Date.now() - requestStart);
        } else {
          errorCount++;
        }
        res.resume();
        resolve();
      });
      req.on('error', () => {
        errorCount++;
        resolve();
      });
    });
  };

  const worker = async () => {
    while (Date.now() < end) {
      await makeRequest();
    }
  };

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const duration = (Date.now() - start) / 1000;
  const rps = (successCount + errorCount) / duration;
  const avgLatency = successCount > 0 ? (totalLatency / successCount) : 0;

  console.log('--- Load Test Results ---');
  console.log(`Successful Requests: ${successCount}`);
  console.log(`Failed Requests: ${errorCount}`);
  console.log(`Total Duration: ${duration.toFixed(2)}s`);
  console.log(`Requests Per Second (RPS): ${rps.toFixed(2)}`);
  console.log(`Average Latency: ${avgLatency.toFixed(2)}ms`);
}

if (require.main === module) {
  runLoadTest();
}
export { runLoadTest };
