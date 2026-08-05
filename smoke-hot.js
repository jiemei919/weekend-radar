// 本周最热 · 反馈/换批 烟雾测试（针对 V1.0.1 修复）
// 覆盖：换一批后反馈按钮仍可点 / 去过了写入并跨批屏蔽 / 没兴趣自由填写 / 已标记标签
const { JSDOM, ResourceLoader, VirtualConsole } = require("jsdom");
const ROOT = "/Users/gongjiemei/WorkBuddy/travelling/app";

const errs = [];
const jsdomErrors = [];
class LocalOnly extends ResourceLoader {
  fetch(url, opt){
    if(/api\.github\.com|raw\.githubusercontent\.com/.test(url)) return Promise.reject(new Error("no-net"));
    return super.fetch(url, opt);
  }
}
function stubs(w){
  const s = {};
  Object.defineProperty(w, 'localStorage', { configurable:true, value:{
    getItem:k=> (k in s)? s[k] : null,
    setItem:(k,v)=>{ s[k]=String(v); },
    removeItem:k=>{ delete s[k]; }
  }});
  w.fetch = () => Promise.reject(new Error("no-net"));
  w.navigator.serviceWorker = undefined;
  w.confirm = () => true;
  w.prompt = () => "4";
  try { if(!w.navigator.clipboard) Object.defineProperty(w.navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.resolve()}}); } catch(e){}
  w.addEventListener("error", e => errs.push("window.error: " + (e.error ? e.error.stack : e.message)));
  w.addEventListener("unhandledrejection", e => errs.push("unhandledrejection: " + (e.reason ? e.reason.message : e)));
}

let pass = 0, fail = 0;
function ok(name, cond){ if(cond){ pass++; console.log("  ✅ "+name); } else { fail++; console.log("  ❌ "+name); } }

function firstCardBtn(card, re){
  return [...card.querySelectorAll('button')].find(b => re.test(b.textContent));
}

JSDOM.fromFile(ROOT+"/index.html", {
  runScripts:"dangerously",
  resources:new LocalOnly(),
  virtualConsole:(()=>{ const vc=new VirtualConsole(); vc.on('jsdomError', e => jsdomErrors.push('jsdomError: ' + (e.detail ? e.detail.stack : e.message))); vc.sendTo(console, { omitJSDOMErrors:true }); return vc; })(),
  beforeParse:stubs
})
.then(dom => {
  const { window } = dom, { document } = window;
  setTimeout(() => {
    try {
      const hot = document.getElementById('hotCards');
      ok("初始化无运行时错误", errs.length===0 && jsdomErrors.length===0);
      if(errs.length) console.log("    " + errs.join("\n    "));
      if(jsdomErrors.length) console.log("    " + jsdomErrors.join("\n    "));
      ok("本周最热初始有卡片", hot.children.length > 0);

      // —— 换一批（重点：换到备选批次后反馈按钮必须还能点）——
      window.swapBatch(); // → 备选批次0（id 901~905）
      ok("换一批后仍有卡片且无错误", hot.children.length>0 && errs.length===0 && jsdomErrors.length===0);
      const altCard = hot.querySelector('.card');
      ok("换批后取到备选批次卡片", !!altCard);
      const altId = altCard.id.replace('card','');
      const altName = altCard.querySelector('h3').textContent;

      // —— 去过了（备选批次卡片，原 bug 会在此抛错点不动）——
      const beenBtn = firstCardBtn(altCard, /去过了/);
      beenBtn.click();
      ok("去过了弹层打开", document.getElementById('mBeen').classList.contains('show'));
      const stars = document.querySelectorAll('#bigstars span');
      stars[4].click(); // 5 星
      window.submitBeen();
      ok("提交去过后无运行时错误", errs.length===0 && jsdomErrors.length===0);
      ok("提交去过后该卡被移出当前屏", !document.getElementById('card'+altId));
      ok("fbText 含该地(已记入反馈)", window.fbText().includes(altName));
      ok("该地进入「已过滤」区", /已去过/.test(document.getElementById('filteredBox').innerHTML));

      // —— 没兴趣·仅自由填写（无选中芯片）——
      const c2 = hot.querySelector('.card');
      const id2 = c2.id.replace('card','');
      const name2 = c2.querySelector('h3').textContent;
      firstCardBtn(c2, /没兴趣/).click();
      ok("没兴趣弹层打开", document.getElementById('mDislike').classList.contains('show'));
      document.getElementById('dislikeNote').value = '带老人不方便';
      window.submitDislike();
      ok("提交没兴趣(仅自由填写)无错误", errs.length===0 && jsdomErrors.length===0);
      const c2el = document.getElementById('card'+id2);
      ok("没兴趣后卡片置灰", c2el.classList.contains('dimmed'));
      ok("没兴趣后显示「已标记」标签", !!c2el.querySelector('.marked-badge.dislike'));
      ok("fbText 含自由填写原因", window.fbText().includes('带老人不方便'));

      // —— 换到备选批次1，测「没兴趣·选芯片」与「已经去过了」路由 ——
      window.swapBatch(); // → 备选批次1（id 911~915）
      ok("再次换批后仍有卡片", hot.children.length>0);
      const c3 = hot.querySelector('.card');
      const id3 = c3.id.replace('card','');
      const name3 = c3.querySelector('h3').textContent;
      firstCardBtn(c3, /没兴趣/).click();
      // 选中「太远了」芯片
      const chip = [...document.querySelectorAll('#dChips .chip')].find(c=>c.textContent==='太远了');
      chip.click();
      window.submitDislike();
      ok("选芯片提交没兴趣无错误", errs.length===0 && jsdomErrors.length===0);
      ok("选芯片的不感兴趣被记录", window.fbText().includes(name3) && window.fbText().includes('太远了'));
      ok("该卡显示已标记标签", !!document.getElementById('card'+id3).querySelector('.marked-badge.dislike'));

      // —— 「已经去过了」芯片应路由到去评分弹层 ——
      const c4 = hot.querySelector('.card');
      if(c4){
        const id4 = c4.id.replace('card','');
        firstCardBtn(c4, /没兴趣/).click();
        const beenChip = [...document.querySelectorAll('#dChips .chip')].find(c=>c.dataset.route==='been');
        beenChip.click();
        window.submitDislike();
        ok("选「已经去过了」→ 打开去评分弹层", document.getElementById('mBeen').classList.contains('show'));
      } else {
        ok("选「已经去过了」→ 打开去评分弹层 (无卡片跳过)", true);
      }

      // —— 跨批保持：回主榜再回备选0，曾标记去过的地不应再出现 ——
      window.swapBatch(); // 备选1→主榜
      window.swapBatch(); // 主榜→备选0
      ok("跨批后曾标记去过的地不再出现(无该卡)", !document.getElementById('card'+altId));
      ok("全程无运行时错误", errs.length===0 && jsdomErrors.length===0);

      console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
      console.log(errs.length ? ("⚠️ 运行期错误:\n" + errs.join("\n")) : "✅ 无 window 错误");
      console.log(jsdomErrors.length ? ("⚠️ jsdom 错误:\n" + jsdomErrors.join("\n")) : "✅ 无 jsdom 错误");
      process.exit(fail===0 && errs.length===0 && jsdomErrors.length===0 ? 0 : 1);
    } catch(e){
      console.log("测试脚本异常：", e.stack);
      process.exit(1);
    }
  }, 1600);
})
.catch(e => { console.log("加载失败", e.stack); process.exit(1); });
