// 回归：已去过地点必须被自动拦截，绝不出现在本周最热推荐卡片里（用户踩过的真实 bug）
// 卡片名与已去过名不一致时（如"台山 上下川岛" vs visited"上川岛"）也必须拦住。
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
try { Object.defineProperty(dom.window.navigator, 'clipboard', { value: { writeText: () => Promise.resolve() }, configurable: true }); } catch (e) {}

let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('✅ ' + name); } else { fail++; console.log('❌ ' + name + (extra ? '  → ' + extra : '')); } }

w.addEventListener('load', () => setTimeout(() => {
  try {
    const BAD = ['杨梅坑', '川岛', '上川岛', '崇左']; // 用户明确已去过、应被 block/按核心景点拦的地名
    let leakedCards = [];        // 出现在推荐卡片里的违规地名
    let filteredEver = '';       // 累计的"已替你过滤"文案

    function snap() {
      const cards = [...w.document.querySelectorAll('#hotCards .card')];
      cards.forEach(c => {
        const txt = c.textContent || '';
        BAD.forEach(b => { if (txt.includes(b)) leakedCards.push(b + '(卡片:' + (c.id || '?') + ')'); });
      });
      filteredEver += w.document.getElementById('filteredBox').textContent + '|';
    }

    snap();
    // 连换 15 批，覆盖整个池子（49 候选），确保 杨梅坑(id 905, 在 HOT_ALTS) 一定被抽到并被拦
    for (let i = 0; i < 15; i++) { w.swapBatch(); snap(); }

    ok('本周最热卡片里从未出现已去过地(杨梅坑/川岛)', leakedCards.length === 0, leakedCards.join(','));
    ok('已去过地被自动过滤(过滤区出现"杨梅坑")', filteredEver.includes('杨梅坑'), 'filteredEver 含杨梅坑? ' + filteredEver.includes('杨梅坑'));
    // 新逻辑：按核心景点/地名拦截崇左（德天+明仕均去过）。
    // 注：本周 2 天档下崇左(3-4天)被档位过滤移出「本周最热」候选，故不会出现在过滤区；
    // 改为直接验证拦截逻辑本身——无论当周档位，崇左名含已去过「明仕田园」都应被拦。
    const cz = w.visitCheck('广西 · 崇左（明仕田园周边）', '3-4天');
    ok('新逻辑·核心景点/地名拦截崇左(德天+明仕均去过)', cz && cz.ok === false, 'visitCheck=' + JSON.stringify(cz));

    // 下一个假期：RECS 来自 candidates(含 id 905 大鹏所城+杨梅坑)，同样应被拦
    const seenRECS = (w.RECS || []).map(r => r.name || '');
    ok('下一个假期 RECS 不含已去过地(杨梅坑)', !seenRECS.some(n => (n || '').includes('杨梅坑')), 'RECS=' + seenRECS.join(','));

    console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
    process.exit(fail ? 1 : 0);
  } catch (e) {
    console.log('FATAL', e.stack);
    process.exit(1);
  }
}, 400));
