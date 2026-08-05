// 真实复现用户流程：加载页面 → 换一批 → 点「去过了」→ 点「没兴趣」，验证修复后的代码本身没问题
const fs = require('fs');
const { JSDOM } = require('jsdom');

const idx = fs.readFileSync('app/index.html', 'utf8');
// 把外部 <script src> 内联，确保 jsdom 能加载（file:// 与 https 都能跑的路径）
let html = idx;
for (const f of ['config.js', 'data.js', 'taste-profile.js', 'candidates.js', 'match-engine.js']) {
  const code = fs.readFileSync('app/' + f, 'utf8');
  html = html.replace(`<script src="${f}"></script>`, `<script>${code}</script>`);
}

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://jiemei919.github.io/weekend-radar/app/', pretendToBeVisual: true });
const w = dom.window;

let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('✅ ' + name); } else { fail++; console.log('❌ ' + name + (extra ? '  → ' + extra : '')); } }

w.addEventListener('load', () => setTimeout(() => {
  try {
    // 初始批次应是 R.items（id 1-5）
    const initCards = [...w.document.querySelectorAll('#hotCards .card')].map(c => c.id);
    ok('初始渲染主榜卡片', initCards.length > 0, 'cards=' + initCards.join(','));

    // 换一批（渲染 HOT_ALTS[0] = 901-905）
    w.swapBatch();
    const batch2 = [...w.document.querySelectorAll('#hotCards .card')].map(c => c.id.replace('card', ''));
    ok('换一批后显示备选批次(901-905)', batch2.includes('901') && batch2.includes('905'), 'batch2=' + batch2.join(','));

    // 在备选批次点「去过了」(901) → 弹层应打开且不报错
    let threw = false, title = '';
    try {
      w.been(901);
      title = w.document.getElementById('beenTitle').textContent;
    } catch (e) { threw = true; console.log('   been(901) ERROR:', e.message); }
    ok('换批后点「去过了」不报错(弹层打开)', !threw);
    ok('去过了弹层标题含目的地名', /双月湾/.test(title), 'title=' + title);
    ok('去过了弹层已显示(show)', w.document.getElementById('mBeen').classList.contains('show'));

    // 提交「去过了」(901)：点 4 星 → submitBeen → 该地移出列表并进入「已过滤」区（cur 必须仍是 901）
    w.document.getElementById('bigstars').querySelectorAll('span')[3].click(); // 4星
    w.submitBeen();
    const cardGone = !w.document.getElementById('card901');
    const filteredTxt = w.document.getElementById('filteredBox').textContent;
    ok('标记去过后卡片移出主列表', cardGone);
    ok('标记去过后进入「已过滤」区(显示已去过)', /双月湾/.test(filteredTxt) && /去过了|已去过|默认不再推/.test(filteredTxt), filteredTxt.slice(0, 80));

    // 在备选批次点「没兴趣」(905) → 弹层打开且含自由填写框（放到 been 提交之后，避免改 cur）
    w.dislike(905);
    ok('换批后点「没兴趣」弹层打开', w.document.getElementById('mDislike').classList.contains('show'));
    ok('没兴趣弹层含自由填写框(dislikeNote)', !!w.document.getElementById('dislikeNote'));
    ok('没兴趣自由填写框是 textarea', w.document.getElementById('dislikeNote').tagName === 'TEXTAREA');

    console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('FATAL', e.stack);
    process.exit(1);
  }
}, 400));
