// 配置：端口 + 数据存储目录解析（iCloud 感知，零丢失优先）
const fs = require('fs');
const os = require('os');
const path = require('path');

// 数据存储目录解析顺序：
// 1) 环境变量 CLOSET_DATA_DIR（显式覆盖，测试/部署用）
// 2) iCloud Drive 同步目录下的 closet/，但仅当该目录已存在 items.json（避免凭空覆盖真数据）
// 3) 本地回落：仓库内的 closet/（与 items.json 同目录）
function resolveDataDir() {
  if (process.env.CLOSET_DATA_DIR) return process.env.CLOSET_DATA_DIR;
  const icloud = path.join(
    os.homedir(),
    'Library',
    'Mobile Documents',
    'com~apple~CloudDocs',
    'closet'
  );
  if (fs.existsSync(path.join(icloud, 'items.json'))) return icloud;
  return path.resolve(__dirname, '..');
}

const PORT = parseInt(process.env.CLOSET_PORT || '8787', 10);
const DATA_DIR = resolveDataDir();
const ITEMS_FILE = path.join(DATA_DIR, 'items.json');

module.exports = { PORT, DATA_DIR, ITEMS_FILE, resolveDataDir };
