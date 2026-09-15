// Test-only loopback proxy. Reads the real API; fault controls never reach archbox.
import http from 'node:http';
let fault = {}; let requests = [];
const cache = new Map(); // Successful real API reads reused within a test run only.
const server = http.createServer(async (req, res) => {
  if (req.url === '/__test') {
    if (req.method === 'POST') {
      let body = ''; for await (const chunk of req) body += chunk;
      fault = JSON.parse(body || '{}'); requests = [];
    }
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ fault, requests })); return;
  }
  if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
  const record = { path: req.url, start: Date.now(), internal: req.headers["x-scoracle-internal-key"] === "local-verification-key" }; requests.push(record);
  try {
    if (fault.match && req.url.includes(fault.match)) {
      if (fault.delay) await new Promise(resolve => setTimeout(resolve, fault.delay));
      if (fault.status) { res.writeHead(fault.status); res.end('{}'); record.end = Date.now(); return; }
    }
    let entry = cache.get(req.url);
    if (!entry) {
      const upstream = await fetch('http://127.0.0.1:18000' + req.url, { signal: AbortSignal.timeout(12000) });
      entry = { status: upstream.status, type: upstream.headers.get('Content-Type') || 'application/json', body: Buffer.from(await upstream.arrayBuffer()) };
      if (upstream.ok) cache.set(req.url, entry);
      record.origin = true;
    } else record.origin = false;
    res.writeHead(entry.status, { 'Content-Type': entry.type }); res.end(entry.body);
  } catch { res.writeHead(502); res.end('{}'); }
  record.end = Date.now();
});
server.listen(18001, '127.0.0.1');
