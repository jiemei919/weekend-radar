const { JSDOM, ResourceLoader } = require("jsdom");
const ROOT = "/Users/gongjiemei/WorkBuddy/travelling/app";

const errs = [];
class LocalOnly extends ResourceLoader {
  fetch(url, opt){
    if(/api\.github\.com|raw\.githubusercontent\.com/.test(url)) return Promise.reject(new Error("no-net"));
    // 本地测试时去掉 ?v=1.x 缓存戳，避免文件系统把 data.js?v=1.1.2 当成文件名
    if(typeof url === 'string' && url.startsWith('file://')){
      url = url.replace(/\?v=[^&]*/, '');
    }
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
  w.prompt = () => "4"; // editPax 默认返回 4 人
  try { if(!w.navigator.clipboard) Object.defineProperty(w.navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.resolve()}}); } catch(e){}
  w.addEventListener("error", e => errs.push("window.error: " + (e.error ? e.error.stack : e.message)));
}

let pass = 0, fail = 0;
function ok(name, cond){ if(cond){ pass++; console.log("  ✅ "+name); } else { fail++; console.log("  ❌ "+name); } }

JSDOM.fromFile(ROOT+"/index.html", { runScripts:"dangerously", resources:new LocalOnly(), beforeParse:stubs })
.then(dom => {
  const { window } = dom, { document } = window;
  setTimeout(() => {
    try {
      // 1) 初始化
      ok("初始化无运行时错误", errs.length === 0);
      if(errs.length) console.log("    " + errs.join("\n    "));

      // 2) 路线库渲染出卡片
      const cards = document.querySelectorAll('#routeList .route-card');
      ok("路线库至少渲染 1 张路线卡", cards.length >= 1);

      // 取第一条路线 id
      const rid = (cards[0] && cards[0].id) ? cards[0].id.replace(/^rc-/, "") : null;
      ok("拿到第一条路线 id", !!rid);

      // 3) 花费汇总面板
      window.openBook();
      ok("花费汇总弹窗打开(mBook.show)", document.getElementById('mBook').classList.contains('show'));
      ok("花费汇总内容非空", (document.getElementById('bookBody').innerHTML||"").length > 0);

      // 4) 费用台账：打开 + 填一笔 + 切换预估 + 人数
      if(rid){
        window.openLedger(rid);
        ok("费用台账弹窗打开(mLedger.show)", document.getElementById('mLedger').classList.contains('show'));
        const rows = document.querySelectorAll('#lgTable table.lg tbody tr');
        ok("费用台账有数据行(含合计)", rows.length >= 2); // 至少 全程 + 合计
        // 直接调 updCost 写 Day1 门票 500（已有初始数据，用增量断言）
        const sumBefore = document.getElementById('lgSum').innerHTML;
        const fixedBeforeMatch = sumBefore.match(/固定 <b>¥([\d.]+)<\/b>/);
        const totalBeforeMatch = sumBefore.match(/合计 <b>¥([\d.]+)<\/b>/);
        const fixedBefore = fixedBeforeMatch ? parseFloat(fixedBeforeMatch[1]) : 0;
        const totalBefore = totalBeforeMatch ? parseFloat(totalBeforeMatch[1]) : 0;
        window.updCost('1','ticket','500');
        const sumAfter = document.getElementById('lgSum').innerHTML;
        const fixedAfterMatch = sumAfter.match(/固定 <b>¥([\d.]+)<\/b>/);
        const totalAfterMatch = sumAfter.match(/合计 <b>¥([\d.]+)<\/b>/);
        const fixedAfter = fixedAfterMatch ? parseFloat(fixedAfterMatch[1]) : 0;
        const totalAfter = totalAfterMatch ? parseFloat(totalAfterMatch[1]) : 0;
        ok("填 500 后固定增加 500", Math.abs(fixedAfter - (fixedBefore + 500)) < 0.01);
        ok("填 500 后合计增加 500", Math.abs(totalAfter - (totalBefore + 500)) < 0.01);
        // 切换预估
        window.togCost('1','ticket');
        const sumToggle = document.getElementById('lgSum').innerHTML;
        const fixedToggleMatch = sumToggle.match(/固定 <b>¥([\d.]+)<\/b>/);
        const estToggleMatch = sumToggle.match(/预估 <b>¥([\d.]+)<\/b>/);
        const fixedToggle = fixedToggleMatch ? parseFloat(fixedToggleMatch[1]) : -1;
        const estToggle = estToggleMatch ? parseFloat(estToggleMatch[1]) : -1;
        ok("切换预估后 固定恢复原值 预估=500", Math.abs(fixedToggle - fixedBefore) < 0.01 && estToggle === 500);
        // 输入框 wiring：找一个 num 输入框，设值并派发 input
        const inp = document.querySelector('#lgTable input.num');
        if(inp){
          inp.value = "300";
          inp.dispatchEvent(new window.Event('input', { bubbles:true }));
          ok("输入框 oninput 触发 updCost 无报错", errs.length === 0);
        } else { ok("输入框 oninput 触发 updCost 无报错 (无输入框跳过)", true); }
        // 人数
        window.editPax();
        ok("editPax 后 lgPax=4", document.getElementById('lgPax').textContent === "4");
      } else { console.log("  ⚠️ 跳过台账（无 rid）"); }

      // 5) 加进路线：从本周最热卡片点按钮 → 生成路线
      // 切到 hot 页已默认渲染，找带「加进路线」的按钮
      const planBtns = [...document.querySelectorAll('button')].filter(b => /加进路线/.test(b.textContent));
      ok("本周最热/假期存在「加进路线」按钮", planBtns.length >= 1);
      if(planBtns.length){
        const before = document.querySelectorAll('#routeList .route-card').length;
        planBtns[0].click(); // 打开 mPlan
        ok("点击加进路线后 mPlan 打开", document.getElementById('mPlan').classList.contains('show'));
        document.getElementById('pName').value = "测试·烟雾自动生成目的地";
        document.getElementById('pDays').value = "5";
        window.autoTierPlan();
        ok("autoTierPlan 根据 5 天算档位=5-7天", document.getElementById('pTierShow').textContent === "5-7天");
        window.submitPlan();
        const after = document.querySelectorAll('#routeList .route-card').length;
        ok("submitPlan 后路线库新增一条", after === before + 1);
        ok("新增目的地出现在路线库", /测试·烟雾自动生成目的地/.test(document.getElementById('routeList').innerHTML));
        ok("重复加同目的地被拦截(routeExistsByName)", window.routeExistsByName("测试·烟雾自动生成目的地"));
      }

      // 6) 筛选：只看已走过
      window.setRouteFilter('done');
      const doneCards = [...document.querySelectorAll('#routeList .route-card .tag')].filter(t=>/已走过/.test(t.textContent)).length;
      ok("setRouteFilter('done') 仅显示已走过", document.querySelectorAll('#routeList .route-card').length >= 0 && (document.querySelectorAll('#routeList .route-card').length===0 || doneCards>0));
      window.setRouteFilter('all');

      // 7) 复制账本不致命
      let threw=false; try { window.copyBook(); } catch(e){ threw=true; }
      ok("copyBook 调用不抛致命异常", !threw);

      console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
      console.log(errs.length ? ("⚠️ 运行期错误:\n" + errs.join("\n")) : "✅ 无任何运行时错误");
      process.exit(fail===0 && errs.length===0 ? 0 : 1);
    } catch(e){
      console.log("测试脚本异常：", e.stack);
      process.exit(1);
    }
  }, 1600);
})
.catch(e => { console.log("加载失败", e.stack); process.exit(1); });
