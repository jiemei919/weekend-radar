# 周末雷达 · 全量操作自动落库 PRD（实现导向）

> 版本：V1.3.0（草案，待洁梅确认「可以去开发了」后实装）
> 作者：雪花
> 日期：2026-08-07

## 一、问题根因

洁梅在页面上的每一次操作（加进路线 / 收心愿 / 手动加心愿 / 想去 / 没兴趣 / 去过了 / 请假拼假 / 确认去哪 / 路线编辑），目前**只写进了当前浏览器的 localStorage**，没有回写到 GitHub 真值源。

后果：
- 换浏览器、换设备、清缓存、隔几天再打开 → 之前的操作"像没做过"，要对同一内容重复操作。
- 代码里那句"反馈已改为自动同步云端，手动复制按钮已移除"是**误导性注释**——实际没有任何自动同步，复制反馈的入口也被删了，等于功能缺失。
- 唯一例外是「路线库」有手动「保存并同步」按钮（真实 PUT GitHub），但依赖洁梅记得点，且其他模块都没接。

根因一句话：**缺少一层「用户操作 → 自动持久化到 GitHub data/*.json」的统一同步机制**，且加载时没有把云端数据拉回本地。

## 二、实现思路（一句话机制）

**在已有的 GitHub PUT 写入链路（syncRoutes 已验证可用）之上，封装一层统一同步器 `radar-sync`：每次用户操作先写 localStorage（即时防丢），再 debounce 自动 PUT 到对应的 `data/*.json`；打开页面时先读 localStorage 秒开，再异步 pull 云端数据合并回来，跨设备自动一致。**

复用已有能力：GitHub API PUT（带 sha）、`APP_CONFIG`（owner/repo/branch/dataPath）、`radar-gh-token-v1` 令牌存储、btoa 编码。不引入新账号、不引入新后端。

## 三、各入口 / 落点改动

### 3.1 统一同步器（新增，核心）
- 新增 `radar-sync`，维护一张「数据域 → GitHub 文件」映射：

| localStorage 键 | GitHub 文件 | 内容 |
|---|---|---|
| `radar-wish-v1` | `data/wishlist.json` | 心愿单（含手动加） |
| `radar-routes-v1` + `radar-route-edit-v1` | `data/routes.json` | 路线库（编辑叠层先 merge 进 daily 再 PUT） |
| `radar-confirmed-v1` | `data/confirmed-trip.json` | 确认去哪 |
| `radar-leave-v1` | `data/leaves.json` | 下一个假期请假拼假 |
| `radar-fb-v1` + `radar-visited-add-v1` + `radar-learn-v1` | `data/feedback-log.json` | 想去/没兴趣 + 去过了 + 偏好学习，合并为一个 `{feedback:[], visited:[], learn:{}}` |

- 每个域封装 `push(domain)`：`GET` 取 sha → `PUT` 内容（复用 syncRoutes 的编码与鉴权逻辑）。
- `push` 失败（无 token / 网络错）→ 仅本地，不弹错打断操作；toast 提示一次。

### 3.2 触发时机（唯一新增逻辑）
- **每次写操作后**调 `markDirty(domain)`：① 立即 `save(localStorage)`；② 启动/重置一个 **15 秒 debounce 计时器**，到点对所有 dirty 域批量 `push`。
- **页面隐藏 / 关闭时兜底**：监听 `visibilitychange`(hidden) 与 `beforeunload`，若有 dirty 域立即 `push`（beforeunload 用同步 best-effort，visibilitychange 用异步）。
- **首次打开 pull 合并**（替换现有 `pullRoutesIfEmpty` 的"仅空才拉"逻辑）：读完 localStorage 后，对各域 `GET` 云端数据，按规则合并回本地并重渲染：
  - 数组类（wish/routes/feedback/visited）：按 `id`（wish/routes）或 `name`（visited）**取并集**——云端有、本地没有的条目补进来；本地有、云端没有的保留（下次 push 会上传）。
  - 对象类（leaves/confirmed）：云端有值则采用云端值。
  - 合并后 `save(localStorage)` 并重渲染对应 tab。

### 3.3 各业务入口接同步（不再各自为战）
把现有散落的 `save(LS.x, X)` 后补一句 `markDirty('x')` 即可，几乎零侵入：
- `addWish` / `submitAddWish` / `delWish` / `markDone` / `editNote` / `cycleLevel` → `markDirty('wish')`
- `submitPlan` / `submitNewRoute` / `delUserRoute` / `toggleEditRoute`/`updR`/`updCost`/`editPax` 等路线写操作 → `markDirty('routes')`
- `addFeedback`(想去/没兴趣) / `submitBeen`(去过了) / 偏好学习 `applyLearnDelta` → `markDirty('feedback')`
- 下一个假期「请假拼假」提交 → `markDirty('leaves')`
- 「✅ 确认去这里」→ `markDirty('confirmed')`

### 3.4 令牌与降级
- 首次写操作若 `radar-gh-token-v1` 为空 → toast「请先在 ⚙️ 设置 粘贴 GitHub 令牌（一次性）」并 `openSettings()`，**数据仍写本地不丢**；补完令牌后下次 markDirty 自动追上。
- 「路线库 · 保存并同步」「心愿单 · 导出同步」两个按钮**保留为手动立即同步入口**（点一下立即 push 全部 dirty 域），与后台自动同步并存，不冲突。

### 3.5 清理误导
- 删除 `copyFeedback` 死函数与 `mDislike/mBeen` 里"已改为自动同步云端"类注释；反馈落库走 `radar-sync` 自动完成，不再依赖手工复制。

## 四、唯一新增 / 变更逻辑（阈值与样例）

1. **Debounce 窗口 = 15s**（最后一次写操作后 15s 内无新写，则批量 push）。样例：连续点 3 条「没兴趣」→ 只产生 1 次 push（feedback 域），不会 3 次 commit。
2. **Pull 合并 = 并集（数组）/ 云端优先（对象）**，不做冲突弹窗（洁梅单人单主用，无需 OT）。
3. **Commit message**：`chore: 自动同步周末雷达用户数据 YYYY-MM-DD HH:mm`。
4. **失败静默**：push 失败不阻断 UI，仅 localStorage 兜底 + 顶部轻提示一次。

其余沿用现有流程：token 存浏览器 `radar-gh-token-v1`、GitHub PAT 走 macOS 钥匙串、Pages 从 main 自动构建、SW 缓存 bump 规则不变、数据 schema 不变（仅 feedback-log.json 由空 `entries:[]` 升级为 `{feedback:[],visited:[],learn:{}}`，旧空结构兼容）。

## 五、验收标准

1. Mac 上手动加一条心愿 → 15s 内 `data/wishlist.json` 出现该条（curl raw 或 GitHub 网页可见）。
2. 手机 / 无痕窗口打开（带 token）→ 该心愿存在，无需重加。
3. 点「没兴趣」「去过了」「想去」→ `data/feedback-log.json` 的对应数组更新。
4. ✏️ 编辑路线 / 记费用 → `data/routes.json` 更新（含编辑叠层 merge）。
5. 下一个假期请假拼假、确认去哪 → `data/leaves.json` / `data/confirmed-trip.json` 更新。
6. 清掉 localStorage 后重开（带 token）→ 所有数据从 GitHub 恢复，界面与操作前一致。
7. 无 token 时任意操作不报错、不丢本地数据；补 token 后自动追上云端。
8. 全量 smoke 测试（smoke-test/hot/load/match/visited/pool）0 失败。

## 六、关于「飞书文档记录」

洁梅提到"甚至可以用飞书文档记录也行"。本方案**首选 GitHub 真值源**作为数据库：写入链路已验证、无需新账号、嵌套 JSON（路线 daily 卡）天然适配、自动 commit 有版本历史。飞书文档作为**人类可读镜像**是后续可选增强（洁梅可直接在飞书看"我操作过什么"），不在本版范围内——除非洁梅明确要飞书作主库。请确认主库选型。
