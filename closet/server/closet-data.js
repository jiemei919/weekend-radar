// 数据访问层：直接读写 items.json（兼容现有真实 schema，向后兼容新增字段）
// 写入采用「临时文件 + rename」原子操作，避免半写损坏。
const fs = require('fs');
const { ITEMS_FILE } = require('./config');

// 读取全部物品；文件不存在返回空数组（首次部署安全）
function loadItems() {
  try {
    const raw = fs.readFileSync(ITEMS_FILE, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    if (e.code === 'ENOENT') return [];
    throw e;
  }
}

// 原子写入：先写 .tmp 再 rename
function saveItems(items) {
  const tmp = ITEMS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2), 'utf8');
  fs.renameSync(tmp, ITEMS_FILE);
}

// 生成下一个 id：在现有 I##### 最大值 +1
function nextId(items) {
  let max = 0;
  items.forEach((it) => {
    const m = /^I(\d+)$/.exec(it.id || '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return 'I' + String(max + 1).padStart(5, '0');
}

// 列表 + 过滤：owner / category / season / status / q(名称或类目或子类模糊)
function listItems({ owner, category, season, status, q } = {}) {
  let items = loadItems();
  if (owner) items = items.filter((it) => it.owner === owner);
  if (category) items = items.filter((it) => it.category === category);
  if (season) items = items.filter((it) => it.season === season);
  if (status) items = items.filter((it) => it.status === status);
  if (q) {
    const kw = String(q).toLowerCase();
    items = items.filter(
      (it) =>
        (it.name || '').toLowerCase().includes(kw) ||
        (it.category || '').toLowerCase().includes(kw) ||
        (it.subType || '').toLowerCase().includes(kw)
    );
  }
  return items;
}

function getItem(id) {
  return loadItems().find((it) => it.id === id) || null;
}

// 新增：自动生成 id，默认 status=在册，其余字段原样保留（向后兼容）
function createItem(payload) {
  const items = loadItems();
  const id = nextId(items);
  const item = { id, status: '在册', ...payload, id };
  items.push(item);
  saveItems(items);
  return item;
}

// 编辑：合并补丁，id 不可改
function updateItem(id, patch) {
  const items = loadItems();
  const idx = items.findIndex((it) => it.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...patch, id };
  saveItems(items);
  return items[idx];
}

// 删除：硬删除（PRD 的 status 归档为后续能力）
function deleteItem(id) {
  const items = loadItems();
  const next = items.filter((it) => it.id !== id);
  if (next.length === items.length) return false;
  saveItems(next);
  return true;
}

module.exports = {
  loadItems,
  saveItems,
  nextId,
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
};
