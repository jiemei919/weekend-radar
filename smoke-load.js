/* 真机集成加载测试：把外部 JS 内联进 index.html 后用 jsdom 真实加载 */
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
vc.on('jsdomError', e => { const msg = 'jsdomError: ' + (e.detail && e.detail.message || e.message); errors.push(msg); console.log('!! ' + msg); });
vc.sendTo(console, { omitJSDOMErrors: true });

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://jiemei919.github.io/weekend-radar/app/', virtualConsole: vc, pretendToBeVisual: true });
dom.window.addEventListener('error', e => console.log('!! window.error: ' + (e.error && e.error.stack || e.message)));
dom.window.addEventListener('load', () => {
  setTimeout(() => {
    const w = dom.window;
    console.log('--- load-time errors so far:', errors.length);
    errors.forEach(e => console.log('   ' + e));
    let pass = 0, fail = 0;
    const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (x ? ' → ' + x : '')); } };

    ok('加载期无 jsdomError', errors.length === 0, errors.join(' | '));
    ok('MatchEngine 全局就绪', typeof w.MatchEngine === 'object');

    const m = w.matchCandidates([101, 102, 103].map(id => ({ id, name: w.CANDIDATES[id].name })));
    ok('下一个假期按偏好排序 103>101>102', m.passed.map(x => x.d.id).join(',') === '103,101,102', m.passed.map(x => x.d.id).join(','));

    // like(103)：验证学习器把 delta 落到 localStorage（不外挂调试变量）
    w.like(103);
    const learn = JSON.parse(w.localStorage.getItem('radar-learn-v1') || '{}');
    ok('like(103) 写入学习日志', learn.log && learn.log.length === 1 && learn.log[0].type === 'like' && learn.log[0].name.indexOf('清远') >= 0);
    ok('like(103) 累计 delta: zoo>0', (learn.deltas && learn.deltas.zoo > 0), JSON.stringify(learn.deltas));

    // dislike(101)：模拟选原因并提交 → 学习器写入（验证 get 覆盖 RECS 且 submitDislike 学习路径）
    let threw = false;
    try {
      const chip = w.document.querySelector('#dChips .chip');
      if (chip) chip.classList.add('sel');   // 模拟用户选了一个原因
      w.submitDislike();
    } catch (e) { threw = true; console.log('   submitDislike err:', e.message); }
    ok('submitDislike(101) RECS 卡片不报错', !threw);
    const learn2 = JSON.parse(w.localStorage.getItem('radar-learn-v1') || '{}');
    ok('submitDislike(101) 追加学习日志', learn2.log && learn2.log.length === 2 && learn2.log[1].type === 'dislike');

    console.log('\n加载集成：' + pass + ' 通过 / ' + fail + ' 失败');
    process.exit(fail ? 1 : 0);
  }, 400);
});
