// 快捷指令 inbox 离线直写：iOS 快捷指令把一条物品写成 inbox/ 下一个 .json 文件，
// 服务端周期性或手动调用 processInbox 把它合并进 items.json（原子写入，兼容现有 schema）。
// 成功后文件移到 done/，解析失败或缺字段移到 failed/，绝不丢数据。
const fs = require('fs');
const path = require('path');
const data = require('./closet-data');

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

// 处理 inbox 目录。返回 { processed, failed, errors:[] }
function processInbox(inboxDir) {
  ensureDir(inboxDir);
  const doneDir = path.join(inboxDir, 'done');
  const failedDir = path.join(inboxDir, 'failed');
  ensureDir(doneDir);
  ensureDir(failedDir);

  const files = fs
    .readdirSync(inboxDir)
    .filter((f) => f.endsWith('.json') && f !== 'done' && f !== 'failed');

  const out = { processed: 0, failed: 0, errors: [] };

  for (const f of files) {
    const fp = path.join(inboxDir, f);
    let payload;
    try {
      payload = JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch (e) {
      out.failed++;
      out.errors.push({ file: f, error: 'JSON 解析失败: ' + e.message });
      fs.renameSync(fp, path.join(failedDir, f));
      continue;
    }
    if (!payload || typeof payload !== 'object' || !payload.name) {
      out.failed++;
      out.errors.push({ file: f, error: '缺少必填字段 name' });
      fs.renameSync(fp, path.join(failedDir, f));
      continue;
    }
    // qty>1 时拆成多条（默认 1）；其余字段原样落库
    const qty = Math.max(1, parseInt(payload.qty || '1', 10) || 1);
    const base = { ...payload };
    delete base.qty;
    for (let i = 0; i < qty; i++) data.createItem(base);
    fs.renameSync(fp, path.join(doneDir, f));
    out.processed++;
  }
  return out;
}

module.exports = { processInbox, ensureDir };
