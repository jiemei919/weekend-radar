// 冒烟测试：起服务 → 调接口 → 验证 items.json 读写 + iCloud 路径回落
// 使用临时数据目录，绝不触碰真实 items.json
const fs = require('fs');
const os = require('os');
const path = require('path');

const SRC = '/Users/gongjiemei/WorkBuddy/travelling/closet/items.json';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'closet-test-'));
fs.copyFileSync(SRC, path.join(tmp, 'items.json'));
process.env.CLOSET_DATA_DIR = tmp;
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
  ok(Array.isArray(items) && items.length === 299, '列表返回 299 条');

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

  const after = JSON.parse(fs.readFileSync(path.join(tmp, 'items.json'), 'utf8'));
  ok(after.length === 299, '文件在 新增+删除 后回到 299 条（原子写入无残留）');

  server.close();
  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
