// 家庭物品库本地服务（Mac 本地 + iCloud 读写）
// 零依赖：仅用 Node 内置 http，免 npm install。洁梅只需 `node server.js`。
const http = require('http');
const { URL } = require('url');
const { PORT, ITEMS_FILE, DATA_DIR, INBOX_DIR, SNAPSHOT_FILE } = require('./config');
const data = require('./closet-data');
const inbox = require('./inbox');
const snapshot = require('./snapshot');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...CORS });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    return res.end();
  }
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  if (p === '/health') return send(res, 200, { ok: true, dataDir: DATA_DIR, itemsFile: ITEMS_FILE });

  // 快捷指令 inbox 离线直写：处理 inbox/ 下所有 .json
  if (p === '/api/inbox/process') {
    if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
    try {
      const results = inbox.processInbox(INBOX_DIR);
      return send(res, 200, { ok: true, ...results });
    } catch (e) {
      return send(res, 500, { error: e.message });
    }
  }

  // 只读快照：生成 snapshot.html
  if (p === '/api/snapshot') {
    if (req.method !== 'GET' && req.method !== 'POST')
      return send(res, 405, { error: 'method not allowed' });
    try {
      const items = data.loadItems();
      const file = snapshot.generateSnapshot(items, SNAPSHOT_FILE);
      return send(res, 200, { ok: true, file, count: items.length });
    } catch (e) {
      return send(res, 500, { error: e.message });
    }
  }

  const m = p.match(/^\/api\/items(?:\/([^/]+))?$/);
  if (!m) return send(res, 404, { error: 'unknown route' });

  const id = m[1];

  // /api/items/:id
  if (id) {
    if (req.method === 'GET') {
      const it = data.getItem(id);
      return it ? send(res, 200, it) : send(res, 404, { error: 'not found' });
    }
    if (req.method === 'PUT' || req.method === 'PATCH') {
      try {
        const patch = await readBody(req);
        const updated = data.updateItem(id, patch);
        return updated ? send(res, 200, updated) : send(res, 404, { error: 'not found' });
      } catch (e) {
        return send(res, 400, { error: e.message });
      }
    }
    if (req.method === 'DELETE') {
      const ok = data.deleteItem(id);
      return ok ? send(res, 200, { ok: true }) : send(res, 404, { error: 'not found' });
    }
    return send(res, 405, { error: 'method not allowed' });
  }

  // /api/items
  if (req.method === 'GET') {
    const q = Object.fromEntries(url.searchParams);
    return send(res, 200, data.listItems(q));
  }
  if (req.method === 'POST') {
    try {
      const payload = await readBody(req);
      if (!payload.name) return send(res, 400, { error: 'name required' });
      const item = data.createItem(payload);
      return send(res, 201, item);
    } catch (e) {
      return send(res, 400, { error: e.message });
    }
  }
  return send(res, 405, { error: 'method not allowed' });
});

server.listen(PORT, () => {
  console.log(`📦 closet server 已启动: http://localhost:${PORT}`);
  console.log(`   数据目录: ${DATA_DIR}`);
  console.log(`   数据文件: ${ITEMS_FILE}`);
});

module.exports = server;
