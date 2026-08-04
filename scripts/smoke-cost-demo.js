const { JSDOM } = require('jsdom');
const path = '/Users/gongjiemei/WorkBuddy/travelling/prototype/周末雷达-费用台账与联动-demo.html';
const errs = [];
JSDOM.fromFile(path, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true })
.then(async dom => {
  const w = dom.window, d = w.document;
  w.addEventListener('error', e => errs.push('window.error: ' + e.message));
  w.onerror = (m) => errs.push('onerror: ' + m);
  const origErr = w.console.error; w.console.error = (...a) => { errs.push('console.error: ' + a.join(' ')); origErr(...a); };
  w.alert = () => {}; w.confirm = () => true; w.prompt = () => '4';
  await new Promise(r => setTimeout(r, 400));
  const T = (name, fn) => { try { fn(); console.log('  ✅ ' + name); } catch (e) { errs.push(name + ' → ' + e.message); console.log('  ❌ ' + name + ' → ' + e.message); } };

  console.log('\n--- 渲染 ---');
  T('本周最热卡片渲染', () => { if (d.querySelectorAll('#hotBox .card').length !== 2) throw new Error('卡片数不对'); });
  T('心愿单卡片渲染', () => { if (!d.querySelectorAll('#wishBox .card').length) throw new Error('无心愿卡'); });
  T('路线卡渲染 2 条', () => { if (d.querySelectorAll('#routeBox .rcard').length !== 2) throw new Error('路线数不对'); });
  T('全程花费条有金额', () => { const t = d.querySelector('.tripcost').textContent; if (!/¥/.test(t)) throw new Error('无金额'); });

  console.log('\n--- 加进路线联动 ---');
  T('点本周最热「加进路线」弹表单', () => { d.querySelector('#hotBox .card .acts button.plan').click(); if (!d.getElementById('mPlan').classList.contains('show')) throw new Error('未弹出'); });
  T('表单预填目的地', () => { if (!d.getElementById('pName').value) throw new Error('未预填'); });
  T('档位根据天数自动显示', () => { if (!/1-2天/.test(d.getElementById('pTierShow').textContent)) throw new Error('档位未自动: ' + d.getElementById('pTierShow').textContent); });
  T('提交生成路线', () => { w.submitPlan(); if (d.querySelectorAll('#routeBox .rcard').length !== 3) throw new Error('未新增'); });
  T('该卡片变「已在路线库」', () => { const b = d.querySelector('#hotBox .card .acts button'); if (!/已在路线库/.test(b.textContent)) throw new Error('按钮未变: ' + b.textContent); });
  T('心愿单加进路线→状态变已安排', () => { d.querySelector('#wishBox .card .acts button.plan').click(); w.submitPlan(); if (!/已安排/.test(d.querySelector('#wishBox .card').textContent)) throw new Error('状态未变'); });

  console.log('\n--- 筛选 ---');
  T('筛选「已走过」只剩 1 条', () => { const chips = d.querySelectorAll('#fchips .chip'); chips[2].click(); if (d.querySelectorAll('#routeBox .rcard').length !== 1) throw new Error('过滤错'); chips[0].click(); });

  console.log('\n--- 费用台账（按天一行）---');
  T('打开台账', () => { w.openLedger('r1'); if (!d.getElementById('mLedger').classList.contains('show')) throw new Error('未弹出'); });
  T('表格有 9 行数据 + 1 行合计 = 10 行', () => { const n = d.querySelectorAll('#lgTable tbody tr').length; if (n !== 10) throw new Error('行数=' + n); });
  T('顶部合计有金额', () => { const t = d.getElementById('lgSum').textContent; if (!/合计/.test(t)) throw new Error(t); });
  T('改金额即时更新合计', () => {
    const before = d.getElementById('lgSum').textContent;
    w.updCost(0, 'transport', 9999);
    const after = d.getElementById('lgSum').textContent;
    if (before === after) throw new Error('合计未更新');
  });
  T('切换固定/预估', () => { const before = d.querySelectorAll('#lgTable .ctog.est').length; w.togCost(0, 'transport'); const after = d.querySelectorAll('#lgTable .ctog.est').length; if (after === before) throw new Error('未切换'); });
  T('改人数', () => { w.editPax(); if (!/人均/.test(d.getElementById('lgSum').textContent)) throw new Error('无人均'); });
  T('分类小计存在', () => { if (!/分类小计/.test(d.getElementById('lgFoot').textContent)) throw new Error('无小计'); });
  T('改备注', () => { const input = d.querySelector('#lgTable tbody input.note'); input.value = '测试备注'; input.dispatchEvent(new w.Event('input', { bubbles: true })); });

  console.log('\n--- 花费账本 ---');
  T('关闭台账', () => { w.closeM('mLedger'); if (d.getElementById('mLedger').classList.contains('show')) throw new Error('未关'); });
  T('点花费汇总弹面板（不复制）', () => { w.openBook(); if (!d.getElementById('mBook').classList.contains('show')) throw new Error('未弹出'); });
  T('面板有总合计', () => { if (!/全部行程合计/.test(d.getElementById('bookBody').textContent)) throw new Error('无总计'); });
  T('有人均 / 日均', () => { const t = d.getElementById('bookBody').textContent; if (!/人均/.test(t) || !/日均/.test(t)) throw new Error('缺'); });
  T('有分类占比条', () => { if (!d.querySelectorAll('#bookBody .barrow').length) throw new Error('无占比条'); });
  T('展开每日明细', () => { const m = d.querySelector('#bookBody .more'); m.click(); if (d.getElementById('bd-r1').style.display === 'none') throw new Error('未展开'); });
  T('复制按钮不报错', () => { w.copyBook(); });

  console.log('\n========================');
  if (errs.length) { console.log('❌ 发现 ' + errs.length + ' 个问题：'); errs.forEach(e => console.log('   - ' + e)); process.exit(1); }
  else console.log('✅ 全部通过，零运行时报错');
}).catch(e => { console.error('加载失败:', e); process.exit(1); });
