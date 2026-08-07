# 周末雷达 · 反馈自动落库 PRD（V1.3.0）

## 一、问题根因

1. **反馈只存浏览器本地**：点「去过了 / 没兴趣 / 想去」+ 写的文字，只写进 `localStorage`（key `radar-fb-v1` / `radar-visited-add-v1`）。换设备、清缓存即丢失，无法跨设备永久生效。
2. **手动复制按钮反人类**：右下角「📋 复制反馈同步给雪花（N 条）」FAB，把反馈复制到剪贴板，需用户**手动贴给雪花（WorkBuddy 里的我）**，我再手动写进仓库真值源。用户不会每次来，等于功能失效。
3. **「去过了」未跨设备永久**：`VISIT_ADD` 本地叠层已参与 `hitVisited` 过滤（本周最热 + 下一个假期都拦），但仅本机；且不应直接写 `visited.json`（会被 `build_visited.py` 重建覆盖）。

## 二、实现思路（一句话机制）

复用「旅行路线」已有的 GitHub token 直连通道：点反馈按钮时 **本地先存即时生效 + 有 token 则静默 PUT 到仓库 data 文件**（`feedback-log.json` / `visited-additions.json`），新设备打开自动拉回合并；去掉手动复制按钮。

> GitHub Pages 是纯静态站、无服务器数据库，所以"数据库"= 仓库的 `data/*.json`，写入靠浏览器带 `⚙️设置` 里的 token 直连 GitHub API（与路线库 `syncRoutes` 同款机制）。

## 三、各入口 / 落点改动

| 位置 | 改动 |
|---|---|
| `submitBeen` / `submitDislike` / `like` | 原 `saveFb` + 本地 `VISIT_ADD` **不动**，末尾追加 `syncFeedbackCloud(entry)`；`submitBeen` 额外追加 `syncVisitedAddCloud()` |
| FAB 按钮 `#fab`（第 411 行 `copyFeedback`） | **删除**；改为提交后 toast「已自动同步 ✅」（无 token 时提示去填） |
| 新增 `pushFeedback(entry)` / `pushVisitedAdd()` | PUT `data/feedback-log.json` / `data/visited-additions.json`，带 sha 乐观锁，复用 `APP_CONFIG` + `LS.ghToken` |
| 新增 `pullFeedbackIfEmpty()` / `pullVisitedAddIfEmpty()` | 启动处调用（同 `pullRoutesIfEmpty` 模式），从 `raw.githubusercontent.com` 拉回合并进本地 `feedback` / `VISIT_ADD` |
| 启动合并 | `pullVisitedAddIfEmpty` 把云端 additions 并入 `VISIT_ADD`（运行时）；`hitVisited` 已 `V.items.concat(VISIT_ADD)`，两入口自动拦 |

## 四、唯一新增 / 变更逻辑（详述阈值与样例）

- **写入为「追加合并」非覆盖**：先 GET 现有文件拿 sha + 现有数组 → 按去重 key（`name` + `type` + **当日日期**）合并（同日同地同类型只留最新一条）→ PUT 回。避免多设备互相覆盖。
- **去过了落 additions 阈值沿用**：`≤2星 → policy=block`（永不再推）；`≥3星 → policy=exclude`（默认不推，可作顺路点）。与现有 `submitBeen` 逻辑一致。
- **无 token**：本地照常存 + 生效，toast「已存本机；去 ⚙️设置 填 GitHub token 可跨设备永久」。不报错、不阻塞。
- **云端失败**（网络/限速/401）：本地已存，toast「本机已记录，云端同步失败（检查 token/网络）」，不抛错。
- **`feedback-log.json` 结构**（已存在，沿用）：
  ```json
  { "entries": [ { "id": 2001, "name": "…", "type": "been|dislike|like",
                   "stars": 2, "reason": "…", "tags": ["…"], "note": "…", "at": "2026-08-06" } ],
    "updatedAt": "2026-08-06" }
  ```
- **`visited-additions.json` 结构**（新增，与 `build_visited.py` 主库互不干扰）：
  ```json
  { "additions": [ { "name": "上下川岛", "policy": "block",
                     "blockReason": "工具内评 2 星", "review": "…", "addedAt": "2026-08-06" } ],
    "updatedAt": "2026-08-06" }
  ```
- PUT commit message：`chore: 自动同步反馈 +N 条（weekend-radar）`。

## 五、其余沿用现有流程

本地过滤（`hitVisited` 已 concat `VISIT_ADD`）、偏好学习（`learnFromFeedback` / `radar-learn-v1`）、`rerenderHot`、心愿单、路线库同步 **均不变**；GitHub token 设置入口与存储（`radar-gh-token-v1`）沿用路线库同款。

## 六、验收标准

1. 点「去过了」(≤2星) → 本地立即过滤 + **有 token 时** `feedback-log.json` 与 `visited-additions.json` 各多一条；跨设备打开该地不再出现于本周最热 / 下一个假期。
2. 点「没兴趣」+ 文字 → 云端 `feedback-log.json` 多一条含 `reason`。
3. 点「想去」 → 云端多一条 `type=like`。
4. 无 token → 本地生效，toast 提示填 token；不报错、不卡死。
5. FAB「复制反馈同步」按钮消失，提交后显示自动同步状态。
6. 全量回归 0 失败 + 新增 `smoke-feedback-sync.js`（mock fetch：有 token 调 PUT / 无 token 跳过 / 合并去重 / been 进 additions）。

## 七、部署附带项

- `app/index.html` 改动 → 脚本版本升 `v=1.3.0`；`sw.js` 缓存戳升 `radar-v16`（沿用 V1.1.1 起的 network-first 策略，部署即生效）。
- 新增空壳 `data/visited-additions.json` 需先提交仓库，`raw.githubusercontent` 才能拉到。
