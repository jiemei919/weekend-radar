#!/usr/bin/env node
/* 生成 app 全局脚本镜像（file:// 兼容）
 * 读 data/taste-profile.json / data/candidates.json → 写 app/taste-profile.js / app/candidates.js
 * 这样 PWA 在本地 file:// 打开也能用偏好匹配层，无需 fetch。
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function readJson(p) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
}
function writeJs(p, varName, obj) {
  const body = 'window.' + varName + ' = ' + JSON.stringify(obj, null, 2) + ';\n';
  fs.writeFileSync(path.join(ROOT, p), body);
  console.log('wrote', p, '(' + body.length + ' bytes)');
}

const profile = readJson('data/taste-profile.json');
writeJs('app/taste-profile.js', 'TASTE_PROFILE', profile);

const cand = readJson('data/candidates.json');
// candidates 以 by_id 建索引，便于 getCand(id) 直接取
const candIndex = {};
Object.keys(cand.by_id).forEach(k => { candIndex[k] = cand.by_id[k]; });
writeJs('app/candidates.js', 'CANDIDATES', candIndex);

console.log('OK: ' + Object.keys(candIndex).length + ' candidates mirrored');
