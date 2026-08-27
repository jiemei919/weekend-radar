// snapshot.html：把全部物品渲染成一份静态只读 HTML（按 owner 分组），
// 写进 DATA_DIR/snapshot.html，方便在任意设备/浏览器打开查看，不依赖服务运行。
// 兼容现有 299 条的真实字段（owner/category/season/subType/brand/attrs...），不重塑。
const fs = require('fs');

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function itemRow(it) {
  const cat = it.category ? esc(it.category) : '';
  const season = it.season ? ' · ' + esc(it.season) : '';
  const sub = it.subType ? ' · ' + esc(it.subType) : '';
  const brand = it.brand ? '<span class="brand">【' + esc(it.brand) + '】</span> ' : '';
  const price = it.price ? ' <span class="price">¥' + esc(it.price) + '</span>' : '';
  const attrs = it.attrs
    ? Object.entries(it.attrs)
        .map(([k, v]) => esc(k) + ':' + esc(v))
        .join(' / ')
    : '';
  const attrHtml = attrs ? '<div class="attr">' + attrs + '</div>' : '';
  const meta = cat + season + sub;
  const metaHtml = meta ? '<div class="meta">' + meta + '</div>' : '';
  return (
    '<li>' +
    brand +
    '<b>' +
    esc(it.name || '(未命名)') +
    '</b>' +
    price +
    metaHtml +
    attrHtml +
    '</li>'
  );
}

function generateSnapshot(items, outPath) {
  const byOwner = {};
  items.forEach((it) => {
    const o = it.owner || '未分类';
    (byOwner[o] = byOwner[o] || []).push(it);
  });

  const sections = Object.keys(byOwner)
    .map((owner) => {
      const list = byOwner[owner].map(itemRow).join('\n');
      return (
        '<section><h2>' +
        esc(owner) +
        ' <span class="count">(' +
        byOwner[owner].length +
        ')</span></h2><ul>' +
        list +
        '</ul></section>'
      );
    })
    .join('\n');

  const html =
    '<!doctype html>\n' +
    '<html lang="zh-CN"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>家庭物品库 · 快照</title>' +
    '<style>' +
    'body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;background:#f5f6fa;color:#1a2344;margin:0;padding:24px;}' +
    '.wrap{max-width:880px;margin:0 auto;}' +
    'h1{font-size:22px;margin:0 0 4px;}' +
    '.sub{color:#8a90a8;font-size:13px;margin-bottom:20px;}' +
    'section{background:#fff;border-radius:16px;padding:16px 20px;margin-bottom:16px;box-shadow:0 8px 24px rgba(26,35,68,.06);}' +
    'h2{font-size:16px;margin:0 0 12px;}' +
    '.count{color:#8a90a8;font-weight:400;font-size:13px;}' +
    'ul{list-style:none;margin:0;padding:0;}' +
    'li{padding:9px 0;border-bottom:1px solid #f0f1f6;font-size:14px;}' +
    'li:last-child{border-bottom:none;}' +
    '.brand{color:#4967f2;}' +
    '.price{color:#e0532f;font-size:13px;}' +
    '.meta{color:#8a90a8;font-size:12px;margin-top:2px;}' +
    '.attr{color:#5a6178;font-size:12px;margin-top:2px;}' +
    '</style></head><body><div class="wrap">' +
    '<h1>家庭物品库 · 快照</h1>' +
    '<div class="sub">生成于 ' +
    new Date().toLocaleString('zh-CN') +
    ' · 共 ' +
    items.length +
    ' 件 · 只读</div>' +
    sections +
    '</div></body></html>';

  fs.writeFileSync(outPath, html, 'utf8');
  return outPath;
}

module.exports = { generateSnapshot };
