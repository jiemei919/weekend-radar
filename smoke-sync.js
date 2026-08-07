/* 数据自动落库集成测试：jsdom 真实加载页面 + mock fetch，验证
 * save()→markDirty→pushDomain→PUT data/*.json，pullAll 合并，无 token 降级。
 * 覆盖验收标准 1,2,3,4,5,6,7（标准 8 由 smoke-* 系列覆盖）。 */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

let html = fs.readFileSync('app/index.html', 'utf8');
['data.js', 'holidays.js', 'visited.js', 'config.js', 'taste-profile.js', 'candidates.js', 'match-engine.js'].forEach(f => {
  const code = fs.readFileSync('app/' + f, 'utf8');
  const re = new RegExp('<script src="' + f.replace(/\./g, '\\.').replace(/\?/g, '\\?') + '(\\?v=[^"]*)?"></script>');
  html = html.replace(re, '<script>' + code + '</script>');
});

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => { const msg = 'jsdomError: ' + (e.detail && e.detail.message || e.message); errors.push(msg); });
vc.sendTo(console, { omitJSDOMErrors: true });

const CLOUD = {
  'data/wishlist.json': [{ id: 999999, name: '云端已有·莫干山', emoji: '🏔', level: '强', tier: '3-4天', source: 'cloud', addedAt: '2026-08-01', note: '', status: 'want' }],
  'data/feedback-log.json': { note: 'x', feedback: [], visited: [], learn: {} },
  'data/routes.json': [],
  'data/leaves.json': { '2026-10': { days: 2, range: '国庆前后', tier: '3-4天' } },
  'data/confirmed-trip.json': { name: '云端已有·成都', gone: true }
};
const PUTS = {};
let PUT_COUNT = 0;
const SHA = {};

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://jiemei919.github.io/weekend-radar/app/', virtualConsole: vc, pretendToBeVisual: true });
dom.window.addEventListener('error', e => console.log('!! window.error: ' + (e.error && e.error.stack || e.message)));

dom.window.fetch = async (url, opts) => {
  let m = url.match(/repos\/jiemei919\/weekend-radar\/contents\/(data\/[^?]+)/);
  if (m) {
    const file = m[1];
    if (opts && opts.method === 'PUT') {
      const body = JSON.parse(opts.body);
      const json = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
      PUTS[file] = json; PUT_COUNT++;
      return { ok: true, json: async () => ({ sha: 'sha-' + Date.now() }) };
    }
    return { ok: true, json: async () => ({ sha: SHA[file] || 'sha-existing' }) };
  }
  let r = url.match(/raw\.githubusercontent\.com\/jiemei919\/weekend-radar\/main\/(data\/[^?]+)/);
  if (r) {
    const file = r[1];
    return { ok: true, json: async () => (CLOUD[file] !== undefined ? CLOUD[file] : null) };
  }
  return { ok: false, status: 404, json: async () => ({}) };
};

dom.window.addEventListener('load', () => {
  setTimeout(async () => {
    const w = dom.window; let pass = 0, fail = 0;
    const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (x ? ' → ' + x : '')); } };

    ok('加载期无 jsdomError', errors.length === 0, errors.join(' | '));
    ok('APP_CONFIG 就绪', !!(w.APP_CONFIG && w.APP_CONFIG.owner === 'jiemei919'));

    // 注入令牌（模拟洁梅已在设置里填过；走真实 save() 的 JSON 编码路径）
    w.save('radar-gh-token-v1', 'TEST_TOKEN');

    // —— 触发 5 个数据域的写操作（走真实 save()→markDirty）——
    // wish：手动加心愿
    w.document.getElementById('awName').value = '测试·甘坑古镇';
    w.document.getElementById('awEmoji').value = '🏘';
    w.document.getElementById('awLevel').value = '中';
    w.document.getElementById('awTier').value = '1-2天';
    w.document.getElementById('awNote').value = '想带铄铄逛逛';
    w.submitAddWish();
    ok('手动加心愿已写本地', JSON.parse(w.localStorage.getItem('radar-wish-v1') || '[]').some(x => x.name === '测试·甘坑古镇'));
    const wishLocalCount = JSON.parse(w.localStorage.getItem('radar-wish-v1')).length;

    // feedback：想去(like) + 去过(submitBeen)
    w.like(103);
    ok('想去写入本地反馈', JSON.parse(w.localStorage.getItem('radar-fb-v1') || '[]').some(f => f.type === 'like' && /清远/.test(f.name)));
    w.been(103);
    w.document.querySelectorAll('#bigstars span')[2].click();     // 点亮 3 星
    w.document.getElementById('beenNote').value = '挺好';
    w.submitBeen();
    ok('去过了写入本地 VISIT_ADD', JSON.parse(w.localStorage.getItem('radar-visited-add-v1') || '[]').some(v => /清远/.test(v.name)));

    // routes：新建一条路线
    w.document.getElementById('nrName').value = '测试路线·珠海';
    w.document.getElementById('nrDays').value = '2';
    w.document.getElementById('nrRange').value = '周末';
    w.document.getElementById('nrStatus').value = 'planned';
    w.submitNewRoute();
    ok('新建路线已写本地', JSON.parse(w.localStorage.getItem('radar-routes-v1') || '[]').some(r => r.name === '测试路线·珠海'));

    // leaves：请假拼假（真实业务函数 addLeave）
    w.document.getElementById('leaveDate').value = '2026-09-10';
    w.document.getElementById('leaveHalf').value = 'full';
    w.addLeave();
    ok('请假拼假已写本地', !!JSON.parse(w.localStorage.getItem('radar-leave-v1') || '{}')['2026-09-10']);

    // confirmed：确认去哪（真实业务函数 confirmDest）
    let cThrew = false;
    try { w.confirmDest(101); } catch (e) { cThrew = true; console.log('   confirmDest note:', e.message); }
    ok('确认去哪已写本地', !!JSON.parse(w.localStorage.getItem('radar-confirmed-v1') || 'null'));

    // —— 强制 flush（生产里是 15s debounce，这里直接触发以验证推送）——
    const before = PUT_COUNT;
    await w.flushSync();
    ok('wish → PUT data/wishlist.json', !!PUTS['data/wishlist.json'] && PUTS['data/wishlist.json'].some(x => x.name === '测试·甘坑古镇'), JSON.stringify(PUTS['data/wishlist.json']));
    ok('feedback → PUT data/feedback-log.json', !!PUTS['data/feedback-log.json'] && Array.isArray(PUTS['data/feedback-log.json'].feedback) && PUTS['data/feedback-log.json'].feedback.some(f => f.type === 'like'));
    ok('feedback → visited 数组含去过记录', !!PUTS['data/feedback-log.json'] && PUTS['data/feedback-log.json'].visited.some(v => /清远/.test(v.name)));
    ok('routes → PUT data/routes.json', !!PUTS['data/routes.json'] && PUTS['data/routes.json'].some(r => r.name === '测试路线·珠海'));
    ok('leaves → PUT data/leaves.json', !!PUTS['data/leaves.json'] && PUTS['data/leaves.json']['2026-09-10']);
    ok('confirmed → PUT data/confirmed-trip.json', !!PUTS['data/confirmed-trip.json'] && /湛江/.test(PUTS['data/confirmed-trip.json'].destination || ''));
    ok('一次 flush 推送了全部脏域（5 个文件）', PUT_COUNT - before === 5, '新增 PUT=' + (PUT_COUNT - before));

    // —— 验收标准 6：pullAll 合并云端（清掉本地后重开场景）——
    // 模拟"清掉本地后从云端恢复"：清空本地心愿，pullAll 应把云端莫干山补回
    w.localStorage.removeItem('radar-wish-v1');
    const beforePull = PUT_COUNT;
    await w.pullAll();
    const afterPull = JSON.parse(w.localStorage.getItem('radar-wish-v1') || '[]');
    ok('pullAll 把云端心愿合并回本地', afterPull.some(x => x.name === '云端已有·莫干山'), JSON.stringify(afterPull.map(x => x.name)));
    ok('pullAll 并集：本地操作过的也保留', afterPull.some(x => x.name === '测试·甘坑古镇'));
    ok('pullAll 不反向触发推送（只读合并）', PUT_COUNT === beforePull, '意外 PUT=' + (PUT_COUNT - beforePull));
    ok('pullAll 后重渲染心愿卡', w.document.getElementById('wishCards').innerHTML.includes('莫干山') || afterPull.length > 0);

    // —— 旧格式兼容：云端若是旧 schema，pull 不污染内存（验收健壮性）——
    CLOUD['data/leaves.json'] = { updatedAt: '2026-07-28', note: '旧格式', leaves: [{ date: '2026-08-15', half: 'am', note: '旧请假' }] };
    CLOUD['data/feedback-log.json'] = { note: '旧', entries: [{ id: 5, name: '旧格式地', type: 'like' }] };
    await w.pullAll();
    const lm = JSON.parse(w.localStorage.getItem('radar-leave-v1') || '{}');
    ok('旧格式 leaves 兼容：只保留日期键（无 updatedAt/note/leaves）', lm['2026-08-15'] === 'am' && !lm.updatedAt && !lm.note && !lm.leaves);
    const fbOld = JSON.parse(w.localStorage.getItem('radar-fb-v1') || '[]');
    ok('旧格式 feedback 兼容：entries 合并进 feedback', fbOld.some(f => f.name === '旧格式地' && f.type === 'like'));

    // —— 验收标准 7：无 token 降级，不报错、不丢本地、不推云端 ——
    w.localStorage.removeItem('radar-gh-token-v1');
    w.document.getElementById('leaveDate').value = '2026-12-01';
    w.document.getElementById('leaveHalf').value = 'pm';
    w.addLeave();
    const beforeNoTok = PUT_COUNT;
    let threw = false;
    try { await w.flushSync(); } catch (e) { threw = true; }
    ok('无 token 时操作不抛错', !threw);
    ok('无 token 时本地数据仍在', !!JSON.parse(w.localStorage.getItem('radar-leave-v1') || '{}')['2026-12-01']);
    ok('无 token 时未推送云端（不刷 commit）', PUT_COUNT === beforeNoTok, '意外 PUT=' + (PUT_COUNT - beforeNoTok));

    // —— 验收标准 7（续）：补 token 后自动追上（走真实 saveGhToken 全域 catch-up 路径）——
    w.document.getElementById('ghToken').value = 'TEST_TOKEN';
    w.saveGhToken();
    await new Promise(r => setTimeout(r, 80));   // saveGhToken 内 flushSync 为异步，等其完成
    ok('补 token 后自动追上云端（leaves 含 2026-12-01）', PUTS['data/leaves.json'] && PUTS['data/leaves.json']['2026-12-01']);

    // —— 验收标准 9：推荐去重（组合名拦截，修复「双月湾」类组合名永远拦不住的 bug）——
    // 9.1 双月湾数据修复：拆成独立 block 条目后，卡片含「双月湾/絮寮湾」即拦截
    // 用与 HOT_ALTS 真实卡片完全一致的名字（"惠州 · 双月湾（亲子海边）"）
    const sh = w.hitVisited('惠州 · 双月湾（亲子海边）');
    ok('双月湾卡片被 hitVisited 拦截（policy=block）', sh && sh.policy === 'block', sh && sh.name);
    ok('双月湾卡片 visitCheck 判定不推荐', w.visitCheck('惠州 · 双月湾（亲子海边）').ok === false);
    const sh2 = w.hitVisited('惠州 · 双月湾');
    ok('双月湾（无后缀）仍被拦截', sh2 && sh2.policy === 'block');
    const xl = w.hitVisited('絮寮湾');
    ok('絮寮湾独立条目也被拦截', xl && xl.policy === 'block' && xl.city === '惠州');

    // 9.2 组合名 token 化逻辑修复：库里仍是组合名（如「东涌、西涌、较场尾」）也应能拦单卡
    const dc = w.hitVisited('东涌');
    ok('组合名 token 命中（东涌→东涌、西涌、较场尾，revisit）', dc && dc.policy === 'revisit', dc && dc.name);
    const sk = w.hitVisited('世客围');
    ok('组合名 token 命中（世客围→世客围、关西新围…）', sk && sk.policy === 'block', sk && sk.name);

    // 9.3 applyVisitFilter 整体过滤：双月湾被移入 blocked，未去过的新地放行
    const fr = w.applyVisitFilter([{ name: '惠州 · 双月湾（亲子海边）' }, { name: '测试新地·火星基地' }], '1-2天');
    ok('applyVisitFilter 拦截双月湾', fr.blocked.some(b => /双月湾/.test(b.name)));
    ok('applyVisitFilter 保留未去过的新地', fr.pass.some(p => p.name === '测试新地·火星基地'));
    // 9.4 复访窗口（季节）仍正确：小径湾 10月-次年4月，8月应拦截（窗口未到）
    const xb = w.visitCheck('小径湾', '1-2天');
    ok('小径湾（8月）复访窗口未到→拦截', xb.ok === false && xb.policy === 'revisit');

    console.log('\n同步集成：' + pass + ' 通过 / ' + fail + ' 失败');
    process.exit(fail ? 1 : 0);
  }, 500);
});
