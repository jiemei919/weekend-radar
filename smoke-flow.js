// 真实复现用户流程：加载页面 → 换一批 → 点「去过了」→ 点「没兴趣」，验证修复后的代码本身没问题
const fs = require('fs');
const { JSDOM } = require('jsdom');

const idx = fs.readFileSync('app/index.html', 'utf8');
// 把外部 <script src> 内联，确保 jsdom 能加载（file:// 与 https 都能跑的路径）
let html = idx;
for (const f of ['config.js', 'data.js', 'holidays.js', 'visited.js', 'hot-pool.js', 'taste-profile.js', 'candidates.js', 'match-engine.js']) {
  const code = fs.readFileSync('app/' + f, 'utf8');
  const re = new RegExp('<script src="' + f.replace(/\./g, '\\.').replace(/\?/g, '\\?') + '(\\?v=[^"]*)?"></script>');
  html = html.replace(re, `<script>${code}</script>`);
}

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://jiemei919.github.io/weekend-radar/app/', pretendToBeVisual: true });
const w = dom.window;
// jsdom 无剪贴板：stub 掉，避免 swapBatch→copy() 走到 window.prompt 兜底（真浏览器有 clipboard，不会触发）
dom.window.prompt = () => null;
try { Object.defineProperty(dom.window.navigator, 'clipboard', { value: { writeText: () => Promise.resolve() }, configurable: true }); } catch (e) {}

let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('✅ ' + name); } else { fail++; console.log('❌ ' + name + (extra ? '  → ' + extra : '')); } }

w.addEventListener('load', () => setTimeout(() => {
  try {
    // 初始批次（主榜 id 1-5）
    const initCards = [...w.document.querySelectorAll('#hotCards .card')].map(c => c.id.replace('card', ''));
    ok('初始渲染主榜卡片', initCards.length > 0, 'cards=' + initCards.join(','));

    // 换一批：从大池子抽全新未看过的目的地（不再是固定 901-905）
    w.swapBatch();
    const batch2 = [...w.document.querySelectorAll('#hotCards .card')].map(c => c.id.replace('card', ''));
    ok('换一批抽到新批次(6张)', batch2.length === 6, 'len=' + batch2.length);
    ok('换一批与主榜不同', batch2.some(id => !initCards.includes(id)), 'batch2=' + batch2.join(','));

    // 取当前批次里真实存在的一张卡测「去过了」（DOM id 是字符串，转 Number 匹配数据 id）
    const idA = Number(batch2[0]);
    let threw = false, title = '';
    try {
      w.been(idA);
      title = w.document.getElementById('beenTitle').textContent;
    } catch (e) { threw = true; console.log('   been(' + idA + ') ERROR:', e.message); }
    ok('换批后点「去过了」不报错(弹层打开)', !threw);
    ok('去过了弹层标题含目的地名', title.includes('去过') && title.length > 4, 'title=' + title);
    ok('去过了弹层已显示(show)', w.document.getElementById('mBeen').classList.contains('show'));

    // 提交「去过了」(4 星) → 该地移出列表并进入「已过滤」区
    w.document.getElementById('bigstars').querySelectorAll('span')[3].click(); // 4星
    w.submitBeen();
    const cardGone = !w.document.getElementById('card' + idA);
    const filteredTxt = w.document.getElementById('filteredBox').textContent;
    ok('标记去过后卡片移出主列表', cardGone);
    ok('标记去过后进入「已过滤」区', /去过了|已去过|默认不再推/.test(filteredTxt), filteredTxt.slice(0, 80));

    // 再换一批取新卡，测「没兴趣」含自由填写框
    w.swapBatch();
    const batch3 = [...w.document.querySelectorAll('#hotCards .card')].map(c => c.id.replace('card', ''));
    const idB = Number(batch3[0]);
    w.dislike(idB);
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
