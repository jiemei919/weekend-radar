// 冒烟测试：起服务 → 调接口 → 验证 items.json 读写 + iCloud 路径回落 + inbox + snapshot
// 使用临时数据目录，绝不触碰真实 items.json
const fs = require('fs');
const os = require('os');
const path = require('path');

const SRC = '/Users/gongjiemei/WorkBuddy/travelling/closet/items.json';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'closet-test-'));
fs.copyFileSync(SRC, path.join(tmp, 'items.json'));
const baseCount = JSON.parse(fs.readFileSync(path.join(tmp, 'items.json'), 'utf8')).length;
process.env.CLOSET_DATA_DIR = tmp;
process.env.CLOSET_INBOX_DIR = path.join(tmp, 'inbox');
process.env.CLOSET_PORT = '8799';

const server = require('../server.js');

let pass = 0;
let fail = 0;
function ok(cond, msg) {
  if (cond) {
    pass++;
    console.log('  ✓', msg);
  } else {
    fail++;
    console.log('  ✗', msg);
  }
}

async function main() {
  const base = 'http://localhost:8799';

  let r = await fetch(base + '/health');
  let h = await r.json();
  ok(r.ok && h.ok, 'health 正常');
  ok(h.dataDir === tmp, '数据目录回落到临时目录（非 iCloud 误覆盖）');

  r = await fetch(base + '/api/items');
  let items = await r.json();
  ok(Array.isArray(items) && items.length === baseCount, '列表返回 ' + baseCount + ' 条');

  r = await fetch(base + '/api/items?owner=' + encodeURIComponent('铄铄'));
  let s = await r.json();
  ok(s.length === 5, '按 owner=铄铄 过滤 = 5 条');

  r = await fetch(base + '/api/items?season=' + encodeURIComponent('冬'));
  let w = await r.json();
  ok(w.length > 0, '按 season=冬 过滤有结果 (' + w.length + ' 条)');

  r = await fetch(base + '/api/items?q=' + encodeURIComponent('sk2'));
  let sk = await r.json();
  ok(sk.length >= 1, '搜索 sk2 命中 >=1 条');

  r = await fetch(base + '/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ owner: '洁梅', category: '日用', name: '测试物品ABC', season: '春秋' }),
  });
  ok(r.status === 201, '新增返回 201');
  let created = await r.json();
  ok(/^I\d{5}$/.test(created.id), '新增 id 格式正确: ' + created.id);

  r = await fetch(base + '/api/items/' + created.id);
  let got = await r.json();
  ok(got.name === '测试物品ABC', '按 id 读取成功');

  r = await fetch(base + '/api/items/' + created.id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '测试物品XYZ' }),
  });
  let upd = await r.json();
  ok(upd.name === '测试物品XYZ', '编辑名称成功');

  r = await fetch(base + '/api/items/' + created.id);
  ok(r.status === 200 && (await r.json()).name === '测试物品XYZ', '编辑后读取为新值');

  r = await fetch(base + '/api/items/' + created.id, { method: 'DELETE' });
  ok(r.ok, '删除成功');
  r = await fetch(base + '/api/items/' + created.id);
  ok(r.status === 404, '删除后 404');

  // ===== inbox 离线直写 =====
  const inboxDir = path.join(tmp, 'inbox');
  fs.mkdirSync(inboxDir, { recursive: true });
  fs.writeFileSync(
    path.join(inboxDir, 'in1.json'),
    JSON.stringify({ owner: '洁梅', category: '日用', name: 'inbox测试物品', season: '四季', qty: 2 })
  );
  // 一个缺 name 的坏文件，应进 failed/
  fs.writeFileSync(path.join(inboxDir, 'bad.json'), JSON.stringify({ category: '日用' }));

  r = await fetch(base + '/api/inbox/process', { method: 'POST' });
  let ib = await r.json();
  ok(r.ok && ib.processed === 1, 'inbox 处理 1 条成功 (processed=' + ib.processed + ')');
  ok(ib.failed === 1, 'inbox 坏文件 1 条进 failed (failed=' + ib.failed + ')');

  r = await fetch(base + '/api/items?q=' + encodeURIComponent('inbox测试物品'));
  let ibItems = await r.json();
  ok(ibItems.length === 2, 'inbox 写入 2 件 (qty=2)');
  ok(fs.existsSync(path.join(inboxDir, 'done', 'in1.json')), '成功文件移到 done/');
  ok(fs.existsSync(path.join(inboxDir, 'failed', 'bad.json')), '坏文件移到 failed/');
  // 清理 inbox 写入的 2 件，回到 299
  for (const it of ibItems) {
    await fetch(base + '/api/items/' + it.id, { method: 'DELETE' });
  }

  // ===== snapshot 只读快照 =====
  r = await fetch(base + '/api/snapshot', { method: 'POST' });
  let sn = await r.json();
  ok(r.ok && sn.count === baseCount, 'snapshot 生成，count=' + baseCount);
  ok(fs.existsSync(sn.file), 'snapshot.html 已写出');
  const snapHtml = fs.readFileSync(sn.file, 'utf8');
  ok(snapHtml.includes('nike') && snapHtml.includes('洁梅'), 'snapshot 含真实物品(按 owner 分组渲染)');

  const after = JSON.parse(fs.readFileSync(path.join(tmp, 'items.json'), 'utf8'));
  ok(after.length === baseCount, '文件在 新增+删除+inbox+清理 后回到 ' + baseCount + ' 条（原子写入无残留）');

  // ===== 智谱识图（纯函数 + 有 key 才真调）=====
  const recognize = require('../recognize');
  const pj = recognize.parseJson('```json\n{"name":"X","qty":2}\n```');
  ok(pj.name === 'X' && pj.qty === 2, 'parseJson 容错解析 markdown 围栏');
  const pj2 = recognize.parseJson('前面巴拉巴拉 {"brand":"Y"} 后面');
  ok(pj2.brand === 'Y', 'parseJson 从混杂文本截取 JSON');
  if (process.env.ZHIPU_API_KEY && process.env.ZHIPU_TEST_IMG) {
    const b64 = fs.readFileSync(process.env.ZHIPU_TEST_IMG).toString('base64');
    const ext = path.extname(process.env.ZHIPU_TEST_IMG).slice(1).toLowerCase();
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    const rec = await recognize.recognizeImage(b64, mime);
    ok(rec && rec.name, '智谱识图返回 name 字段 (live)');
    console.log('   智谱 live 识别:', JSON.stringify(rec));
  } else {
    console.log('   (跳过智谱 live 识别：未设置 ZHIPU_API_KEY / ZHIPU_TEST_IMG)');
  }

  server.close();
  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
