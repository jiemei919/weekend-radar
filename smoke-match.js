/* 偏好匹配层 · 无浏览器烟雾测试（node 直接跑）
 * 覆盖：算分 / 特殊规则(贵州block·珠海长隆降温·大IP豁免·硬排斥·阈值) / 排序 / 反馈学习器
 */
const fs = require('fs');
const path = require('path');
const ME = require('./app/match-engine.js');

const ROOT = __dirname;
const taste = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/taste-profile.json'), 'utf8'));
const candJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/candidates.json'), 'utf8'));
const cands = candJson.by_id;

function buildProfile() { return JSON.parse(JSON.stringify(taste)); }
function baseWeights(p) { const b = {}; (p.dimensions || []).forEach(d => b[d.key] = d.weight); return b; }

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}

console.log('== 1. scoreOne 真实候选 ==');
let P = buildProfile();
const r103 = ME.scoreOne(cands['103'], P);
ok('清远长隆 命中 zoo/changlong/chill/parent', ['zoo', 'changlong', 'chill', 'parent'].every(k => r103.matched.includes(k)), JSON.stringify(r103.matched));
ok('清远长隆 非硬拦截', r103.hardReject === false);
ok('清远长隆 分数≈4.50', Math.abs(r103.score - 4.50) < 0.01, 'score=' + r103.score.toFixed(3));

console.log('== 2. matchCandidates 排序（下一个假期 RECS）==');
const RECS = [101, 102, 103].map(id => ({ id, name: cands[String(id)].name }));
const m = ME.matchCandidates(RECS, P, cands, 0.3);
ok('全部通过(3)', m.passed.length === 3, 'passed=' + m.passed.length);
const order = m.passed.map(x => x.d.id);
ok('排序 清远(103)>湛江(101)>泉州(102)', JSON.stringify(order) === JSON.stringify([103, 101, 102]), JSON.stringify(order));
ok('清远排第一且分最高', m.passed[0].d.id === 103 && m.passed[0].score > m.passed[1].score);

console.log('== 3. 特殊规则 ==');
// 3a 贵州 block
const guizhouC = { name: '贵州 · 黄果树瀑布', p: { nature: 1, quiet: 1 } };
const rg = ME.scoreOne(guizhouC, P);
ok('贵州黄果树 → 硬拦截', rg.hardReject === true && rg.reasons.join().includes('贵州'));

// 3b 珠海长隆降温（special.changlong_cool）
const zhuC = { name: '珠海长隆飞船乐园', p: { zoo: 1, changlong: 1, chill: 0.9, parent: 1 }, special: { changlong_cool: true } };
const rz = ME.scoreOne(zhuC, P);
ok('珠海长隆 → 不硬拦截(仅降温)', rz.hardReject === false && rz.reasons.join().includes('降温'));

// 3c 大IP未去过人多豁免
const ipC = { name: '北京 · 环球影城', p: { ip_park: 1, parent: 0.8, photo: 0.8 }, avoid: ['crowd_expensive'], special: { ip_exempt: true } };
const ri = ME.scoreOne(ipC, P);
ok('大IP人多豁免 → 不硬拦截(软扣分)', ri.hardReject === false && ri.reasons.join().includes('豁免'));

// 3d 硬排斥（老/假/萧条景区）
const oldC = { name: '某老牌景区', p: { nature: 0.5 }, avoid: ['old_fake'] };
const ro = ME.scoreOne(oldC, P);
ok('old_fake → 硬拦截', ro.hardReject === true);

// 3e 阈值拦截（纯美食/低匹配）
const lowC = { id: 777, name: '某纯小吃街', p: { food: 0.3 } };
const ml = ME.matchCandidates([lowC], P, { 777: lowC }, 0.3);
ok('低匹配度 < 阈值 → 被拦截', ml.blocked.length === 1, 'passed=' + ml.passed.length);

console.log('== 4. 无候选属性 → 放行(按原 match) ==');
const noProf = ME.matchCandidates([{ id: 555, name: 'X', match: 70 }], P, {}, 0.3);
ok('无属性候选进 passed', noProf.passed.length === 1 && noProf.passed[0].noProfile === true);

console.log('== 5. 反馈学习器 applyLearnDelta ==');
const dims = P.dimensions;
const bwP = baseWeights(P);   // 基线只捕获一次（与 app 的 BASE_WEIGHTS 一致）
const before = dims.find(d => d.key === 'zoo').weight;
const ch = ME.applyLearnDelta(dims, ['zoo', 'changlong', 'chill'], 'like', bwP);
const after = dims.find(d => d.key === 'zoo').weight;
ok('like → zoo 权重 +0.03', Math.abs((after - before) - 0.03) < 1e-9, 'before=' + before + ' after=' + after);
ok('返回 applied 明细', ch.find(x => x.key === 'zoo').applied === after - before);
// 上限 cap（用稳定基线 bwP）
for (let i = 0; i < 20; i++) ME.applyLearnDelta(dims, ['zoo'], 'like', bwP);
const capped = dims.find(d => d.key === 'zoo').weight;
ok('like 上限 = 基线+0.15', Math.abs(capped - (bwP.zoo + 0.15)) < 1e-9, 'capped=' + capped);
// dislike 下限
const dims2 = buildProfile().dimensions;
for (let i = 0; i < 20; i++) ME.applyLearnDelta(dims2, ['food'], 'dislike', baseWeights(buildProfile()));
const floored = dims2.find(d => d.key === 'food').weight;
ok('dislike 下限 = 基线-0.10', Math.abs(floored - (baseWeights(taste).food - 0.10)) < 1e-9, 'floored=' + floored);

console.log('== 6. 端到端：学习后排序仍稳定 ==');
let P2 = buildProfile();
ME.applyLearnDelta(P2.dimensions, cands['103'].p ? Object.keys(cands['103'].p).filter(k => cands['103'].p[k] > 0) : [], 'like', baseWeights(P2));
const m2 = ME.matchCandidates(RECS, P2, cands, 0.3);
ok('学习后清远仍第一', m2.passed[0].d.id === 103);

console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
