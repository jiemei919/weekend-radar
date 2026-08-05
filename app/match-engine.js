/* 周末雷达 · 偏好匹配层纯算法（无 DOM 依赖，浏览器/Node 双用）
 * 由 index.html 通过 window.MatchEngine 调用；Node 端可被 smoke-match.js require 单测。
 * 算分只用于排序/过滤，分数与内部标签对用户不可见。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.MatchEngine = api;
})(typeof window !== 'undefined' ? window : null, function () {
  function getCand(cands, id) { return cands ? cands[String(id)] : null; }

  function strongMax(profile) {
    return (profile.dimensions || []).filter(d => d.tier === '强偏好').reduce((s, d) => s + d.weight, 0);
  }

  // 内部算分：命中排斥项→硬拦截；大IP未去过人多→软扣分(豁免)；贵州清单/珠海长隆降温
  function scoreOne(c, profile) {
    const dims = profile.dimensions || [];
    let score = 0, matched = [];
    dims.forEach(d => { const v = c.p[d.key] || 0; if (v > 0) { score += d.weight * v; matched.push(d.key); } });
    const rejKeys = (profile.reject || []).map(r => r.key);
    const rejMap = {}; (profile.reject || []).forEach(r => rejMap[r.key] = r.label);
    let hardReject = false, reasons = [];
    (c.avoid || []).forEach(a => {
      if (rejKeys.includes(a)) {
        const exempt = ((a === 'crowd_expensive' || a === 'been_tired') && c.special && c.special.ip_exempt);
        if (exempt) { score -= 0.1; reasons.push('人多·物价贵(大IP豁免)'); }
        else { hardReject = true; reasons.push('命中排斥：' + rejMap[a]); }
      }
    });
    const sr = profile.special_rules || [];
    const guizhou = sr.find(s => s.key === 'guizhou_block');
    if (guizhou && guizhou.block.some(n => c.name && c.name.indexOf(n) >= 0)) { hardReject = true; reasons.push('命中贵州屏蔽清单'); }
    const cl = sr.find(s => s.key === 'changlong_cool');
    if (cl && c.special && c.special.changlong_cool) { score -= 0.2; reasons.push('珠海长隆实例降温'); }
    return { score, matched, hardReject, reasons };
  }

  // 硬拦截过滤 + 阈值过滤 + 按偏好分降序
  function matchCandidates(pool, profile, cands, threshold) {
    const sMax = strongMax(profile), out = [];
    (pool || []).forEach(d => {
      const c = getCand(cands, d.id);
      if (!c) { out.push({ d, score: d.match || 0, matched: [], hardReject: false, reasons: [], noProfile: true }); return; }
      const r = scoreOne(c, profile);
      const belowTh = r.score < threshold * sMax;
      out.push({ d, score: r.score, matched: r.matched, hardReject: r.hardReject || belowTh, reasons: r.reasons.concat(belowTh ? ['偏好匹配度低于阈值'] : []) });
    });
    const passed = out.filter(x => !x.hardReject).sort((a, b) => b.score - a.score);
    const blocked = out.filter(x => x.hardReject);
    return { passed, blocked };
  }

  // 反馈学习：按命中维度微调权重，返回 [{key, applied}]；上限基线+0.15 / 下限基线-0.10
  function applyLearnDelta(dimensions, matched, type, baseWeights) {
    const delta = (type === 'like' ? 0.03 : -0.05), changed = [];
    matched.forEach(k => {
      const d = dimensions.find(x => x.key === k); if (!d) return;
      const lo = Math.max(0, baseWeights[k] - 0.10), hi = baseWeights[k] + 0.15;
      const nv = Math.max(lo, Math.min(hi, d.weight + delta));
      const applied = nv - d.weight; d.weight = nv; changed.push({ key: k, applied });
    });
    return changed;
  }

  return { getCand, strongMax, scoreOne, matchCandidates, applyLearnDelta };
});
