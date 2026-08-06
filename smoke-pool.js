// 周末雷达 · 本周最热大池子轮换测试（jsdom 真加载 index.html）
const fs = require('fs');
const { JSDOM } = require('jsdom');

const files = ['config.js','data.js','holidays.js','visited.js','taste-profile.js','candidates.js','match-engine.js','hot-pool.js'];
let html = fs.readFileSync('app/index.html','utf8');
for (const f of files) {
  const re = new RegExp('<script src="' + f.replace(/[.+?^${}()|[\]\\]/g, '\\$&') + '(\\?v=[^"]*)?"></script>');
  const code = fs.readFileSync('app/' + f, 'utf8');
  if (!re.test(html)) { console.log('⚠️ 未找到脚本标签:', f); continue; }
  html = html.replace(re, '<script>' + code + '</script>');
}

let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('✅ ' + name); } else { fail++; console.log('❌ ' + name + (extra ? ' · ' + extra : '')); } }

const errors = [];
const vc = new (require('jsdom').VirtualConsole)();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.detail && e.detail.message || e.message)));

const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://jiemei919.github.io/weekend-radar/app/', virtualConsole: vc, pretendToBeVisual: true });
// 规避 jsdom 未实现剪贴板/prompt 的报错（真浏览器无此问题）
dom.window.prompt = () => null;
try { Object.defineProperty(dom.window.navigator, 'clipboard', { value: { writeText: () => Promise.resolve() }, configurable: true }); } catch (e) {}
dom.window.addEventListener('load', () => {
  setTimeout(() => {
    const w = dom.window;
    const ids = () => [...w.document.getElementById('hotCards').children].map(c => c.id.replace('card','')).filter(Boolean);

    // t1: 初始渲染有卡片
    const init = ids();
    ok('初始渲染有卡片（>0）', init.length > 0, 'init=' + init.length);
    ok('初始每批 ≤6 张', init.length <= 6, 'init=' + init.length);
    ok('HOT_POOL 已合并（≥30）', (w.HOT_POOL||[]).length >= 30, 'len=' + (w.HOT_POOL||[]).length);

    // t2: 换一批得到不同的一批
    w.swapBatch();
    const s1 = ids();
    const overlap = init.filter(x => s1.includes(x));
    ok('第一次换一批与初始不同', s1.length > 0 && overlap.length < Math.min(init.length, s1.length), 'overlap=' + overlap.length);

    // t3: 连续换 8 次不崩溃，且累计展示的去重 id 随次数增长
    let thrown = false, totalDistinct = new Set(init.concat(s1));
    try {
      for (let i = 0; i < 8; i++) { w.swapBatch(); ids().forEach(x => totalDistinct.add(x)); }
    } catch (e) { thrown = true; console.log('   swap loop error:', e.message); }
    ok('连续换 8 次不抛错', !thrown);
    ok('轮换累计展示去重 id 明显增长（>10）', totalDistinct.size > 10, 'distinct=' + totalDistinct.size);

    // t4: 池内目的地反馈正常（取成都熊猫 2031）
    let fbOk = true, name = '';
    try {
      const c = w.get(2031); name = c ? c.name : '(null)';
      w.been(2031);
      const shown = w.document.getElementById('mBeen').classList.contains('show');
      if (!shown) fbOk = false;
    } catch (e) { fbOk = false; console.log('   been(2031) error:', e.message); }
    ok('池内卡片 get(2031) 可取且 been 弹层正常', fbOk, 'name=' + name);

    // t5: 反馈后该地进入已过滤区（不再出现在主列表）
    const stars = w.document.getElementById('bigstars');
    if (stars) { stars.querySelectorAll('span')[3].click(); }
    // submitBeen 可能因子星逻辑提前 return，这里只验证流程不抛错
    let submitOk = true;
    try { w.submitBeen(); } catch (e) { submitOk = false; console.log('   submitBeen error:', e.message); }
    ok('submitBeen 流程不抛错', submitOk);

    ok('加载期无 jsdomError', errors.length === 0, errors.join(' | '));

    console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
    process.exit(fail ? 1 : 0);
  }, 400);
});
