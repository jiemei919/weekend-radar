// 回归：新增「记录去过的地方」入口（V1.4.3）
// 验证：评分→政策判定、立即去重生效、落本地同步域、反馈落库、删除恢复推荐
const fs = require('fs');
const { JSDOM } = require('jsdom');

const idx = fs.readFileSync('app/index.html', 'utf8');
let html = idx;
for (const f of ['config.js', 'data.js', 'holidays.js', 'visited.js', 'hot-pool.js', 'taste-profile.js', 'candidates.js', 'match-engine.js']) {
  const code = fs.readFileSync('app/' + f, 'utf8');
  const re = new RegExp('<script src="' + f.replace(/\./g, '\\.').replace(/\?/g, '\\?') + '(\\?v=[^"]*)?"></script>');
  html = html.replace(re, `<script>${code}</script>`);
}
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://jiemei919.github.io/weekend-radar/app/', pretendToBeVisual: true });
const w = dom.window;
dom.window.prompt = () => null;

let pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('✅ ' + n); } else { fail++; console.log('❌ ' + n + (e ? '  → ' + e : '')); } }

function lsHas(keySub, txt) {
  for (let i = 0; i < w.localStorage.length; i++) {
    const k = w.localStorage.key(i);
    const v = w.localStorage.getItem(k) || '';
    if (k.toLowerCase().includes(keySub) && v.includes(txt)) return true;
  }
  return false;
}

w.addEventListener('load', () => setTimeout(() => {
  try {
    // 场景1：评分4星(≥3) → exclude，应被推荐过滤
    w.openAddVisited();
    w.document.getElementById('avName').value = '测试去过·云中溪';
    w.document.querySelectorAll('#vStars span')[3].click(); // 第4颗星 = 4星
    w.submitAddVisited();
    const vc = w.visitCheck('测试去过·云中溪', '1-2天');
    ok('记录4星→被过滤(exclude, ok=false)', vc && vc.ok === false && vc.policy === 'exclude', JSON.stringify(vc));
    ok('已写入本地 visitedAdd 同步域', lsHas('visited', '云中溪'));

    // 场景2：评分1星(≤2) → block，永不再推
    w.openAddVisited();
    w.document.getElementById('avName').value = '测试避雷·黑石滩';
    w.document.querySelectorAll('#vStars span')[0].click(); // 1星
    w.submitAddVisited();
    const vb = w.visitCheck('测试避雷·黑石滩', '3-4天');
    ok('记录1星→永不再推(block, ok=false)', vb && vb.ok === false && vb.policy === 'block', JSON.stringify(vb));

    // 场景3：评分/备注已落 feedback 域（参与云端、参与推荐逻辑）
    ok('评分/备注已落 feedback 域', lsHas('fb', '云中溪') && lsHas('fb', 'been'));

    // 场景4：换批后记录地去不回推荐卡片
    let leaked = false;
    for (let i = 0; i < 5; i++) {
      w.swapBatch();
      [...w.document.querySelectorAll('#hotCards .card')].forEach(c => {
        const t = c.textContent || '';
        if (t.includes('云中溪') || t.includes('黑石滩')) leaked = true;
      });
    }
    ok('换批后记录地去不回推荐卡片', !leaked);

    // 场景5：删除 block 项后该地从去重恢复
    w.delVisited(1); // 黑石滩（最后渲染的 visitedList[1]）
    const vb2 = w.visitCheck('测试避雷·黑石滩', '3-4天');
    ok('删除后该地从去重恢复(ok=true)', vb2 && vb2.ok === true, JSON.stringify(vb2));

    console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('FATAL', e.stack);
    process.exit(1);
  }
}, 400));
