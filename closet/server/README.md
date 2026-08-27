# 家庭物品库 · 本地服务（closet server）

零依赖（仅 Node 内置 `http`，免 `npm install`）。Mac 本地运行，读写 `items.json`，优先 iCloud 同步目录、本地仓库兜底。

## 运行

```bash
node server.js
```

- 默认端口 `8787`（环境变量 `CLOSET_PORT` 覆盖）
- 数据目录解析顺序：
  1. `CLOSET_DATA_DIR` 环境变量（部署/测试显式覆盖）
  2. `~/Library/Mobile Documents/com~apple~CloudDocs/closet/`，**仅当该目录已存在 `items.json`**（避免凭空覆盖真数据）
  3. 仓库内 `closet/`（与 `items.json` 同目录）

## 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/health` | 健康检查，返回当前数据目录 |
| GET  | `/api/items` | 列表，支持 `?owner=&category=&season=&status=&q=` 过滤 |
| POST | `/api/items` | 新增，body 需含 `name`，自动生成 `id`、`status=在册` |
| GET  | `/api/items/:id` | 单条详情 |
| PUT/PATCH | `/api/items/:id` | 编辑（合并补丁，`id` 不可改） |
| DELETE | `/api/items/:id` | 删除 |

`season` 过滤为精确匹配。真实数据取值为 `四季/夏/春秋/冬`（共 4 档，历史数据含 `四季`）；新增物品按需求文档采用 `春秋/夏/冬` 三档，旧 `四季` 数据原样保留、向后兼容。

## 数据零丢失

写入采用「临时文件 + `rename`」原子操作，避免半写损坏。兼容现有 299 件真实 schema（`owner/category/name/status/subType/attrs/price/season/keep/brand`），新增字段直接原样落库。

## 测试

```bash
node test/smoke.js
```

使用临时副本、不触碰真实数据，覆盖 health / 列表 / owner·season·q 过滤 / 新增 / 读取 / 编辑 / 删除 / 原子写入无残留，14 项全过。
