# 周末雷达 · 开发需求文档（给独立开发者 condex 从零复刻）

> **文档目的**：让一个独立开发者（condex）不依赖原作者，照本文档完整复刻出与线上版功能对等的「周末雷达」。
> **线上参照**：`https://jiemei919.github.io/weekend-radar/app/index.html`（GitHub Pages，V1.4.3）。
> **写作原则**：实现导向。本文给出**数据模型、同步协议、去重规则、匹配算法、阈值与样例**，condex 据此即可实现；不解释"为什么",只讲"做成什么样、怎么做成"。
> **目标用户（决定所有业务逻辑）**：龚洁梅（女，互联网产品经理，base 广州番禺），一家四口（洁梅 + 先生 + 2 位老人 1956 生 + 儿子铄铄 2016.9 生）。先生是唯一司机。偏好自然风光、亲子、chill 度假、人少清净；有大熊猫必安排；排斥过度商业化、人多物价贵、停车难、老/假/萧条景区。

---

## 0. 产品定位

一个**纯前端 PWA 网页（无后端服务器）**。云端"数据库"用 **GitHub 仓库的文件**（GitHub Contents API 读写 `data/*.json`）。部署在 GitHub Pages。
四个 Tab：**🔥 本周最热 / 🗓️ 下一个假期 / ⭐ 心愿单（含 📍 去过的地方）/ 🗺️ 旅行路线**。
核心价值：根据洁梅全家旅行偏好，从候选池挑"这周/这个假期适合去哪"，并把"已去过、不想再去"的地方自动过滤。

### 0.1 技术栈（必选，保证可复刻）
- 原生 HTML + CSS + 原生 JS（ES6），**不依赖框架、不依赖打包器**。单页 `app/index.html` 内联 JS 也可接受，但推荐拆分 `app/*.js` 后在 `index.html` 用 `<script src>` 引入。
- 存储：浏览器 `localStorage`（用户数据）+ GitHub 仓库文件（云端真值源）。
- 同步：直接用 `fetch` 调 **GitHub REST Contents API**（`api.github.com`），无需自建后端。
- PWA：`manifest.webmanifest` + `sw.js`（Service Worker，network-first）。
- 数据读取：`fetch('./data/xxx.json')`（相对路径，兼容 GitHub Pages 与本地静态服务）。

---

## 1. 数据模型（云端真值源：`data/*.json`）

> **铁律**：`data/visited.json`、`data/candidates.json`、`data/hot-pool.json`、`data/taste-profile.json`、`data/holidays.json` 由**维护者侧**生成/维护，**前端不改**这些文件（前端只读 + 用本地叠层覆盖）。
> 用户在前端的操作只写：`wishlist.json / routes.json / confirmed-trip.json / leaves.json / feedback-log.json`（通过同步器 PUT 回仓库）。

### 1.1 文件清单与职责

| 文件 | 写方 | 作用 | 关键字段 |
|---|---|---|---|
| `data/visited.json` | 维护者 | **权威"已去过"去重库**（~167 条，三档政策 + 洁梅点评） | 见 1.2 |
| `data/candidates.json` | 维护者 | 候选地属性库（19 地 × 13 维偏好向量） | 见 1.3 |
| `data/hot-pool.json` | 维护者 | 本周最热候选池（~49 地 + 各平台推荐帖链接 `posts[]`） | 见 1.4 |
| `data/taste-profile.json` | 维护者+学习器 | 偏好权重真值源（强/顺带/排斥三维） | 见 1.5 |
| `data/holidays.json` | 维护者 | 法定节假日与可用日 | `{holidays:[{date, name}], ...}` |
| `data/wishlist.json` | **前端同步** | 心愿单（想去的目的地，跨假期） | 见 1.6 |
| `data/routes.json` | **前端同步** | 旅行路线库（已走过 + 规划中，含每日卡 + 费用） | 见 1.7 |
| `data/confirmed-trip.json` | **前端同步** | 已确认行程 | 见 1.8 |
| `data/leaves.json` | **前端同步** | 请假/可用日 `{ "YYYY-MM-DD": "full"\|"am"\|"pm" }` | 见 1.9 |
| `data/feedback-log.json` | **前端同步** | 反馈流水 + 用户侧去重叠层 | 见 1.10 |

### 1.2 `data/visited.json` 结构
```json
{
  "updatedAt": "2026-08-06",
  "source": "飞书《已经去过的旅行目的地统计》 wiki BmzFwoDJzi…",
  "policyDef": {
    "block": "永不推荐。点名不要推/避雷/明确不会再去。任何情况不出现在推荐榜。",
    "exclude": "默认不推荐。去过即不再作推荐目的地，但可作已确认行程顺路点。",
    "revisit": "条件可推。去过但有特定玩法/季节/天气窗口，满足时可再推，卡片须标【复访·理由】。"
  },
  "regionBlock": { "贵州": "老家，传统景点跑遍，除非全新景点/活动否则不推" },
  "items": [
    {
      "name": "广州长隆动物园", "region": "广东", "city": "广州",
      "review": "很好，离我家近，买过3年年票，去得有点腻了，正常不会去",
      "scope": "cn", "policy": "block", "blockReason": "去得腻了"
    },
    {
      "name": "长隆水上乐园", "region": "广东", "city": "广州",
      "review": "每年6月1日前后儿童免票，一年安排一次",
      "scope": "cn", "policy": "revisit",
      "revisit": { "why":"每年6月1日前后儿童免票", "activity":"水上乐园", "season":"5-9月", "weather":"晴,气温≥28℃", "tier":"1-2天" }
    }
  ]
}
```
- `policy` ∈ `block | exclude | revisit`，三选一，缺失默认按 `exclude` 处理。
- `regionBlock`：整区域屏蔽（命中区域名一律不推，除非该地 `policy=revisit` 且窗口满足）。
- 维护者通过脚本（如 `scripts/build_visited.py`）重跑生成 `data/visited.json` + 前端镜像 `app/visited.js`；**前端不允许直接改此文件**。

### 1.3 `data/candidates.json` 结构（偏好属性库）
每条候选地：
```json
{
  "id": "cd_changbai", "name": "长白山", "region": "吉林", "grad": "linear-gradient(...)",
  "emoji": "🏔️", "drive": "飞机+租车", "season": "冬季/夏季", "tier": "5-7天",
  "src": "维护者推荐", "hot": "高",
  "nature": 1, "zoo": 0, "chill": 1, "quiet": 1, "photo": 1, "outdoor": 1,
  "parent": 1, "ip_park": 0, "changlong": 0, "museum": 0, "shopping": 0, "temple": 0, "food": 0,
  "avoid": [], "why": "长白山天池+滑雪，自然风光出众",
  "fun": ["天池绝景", "冬季滑雪", "温泉"], "kid": "铄铄可玩雪", "warn": "高海拔注意保暖",
  "spots": [ {"name":"天池", "core": true}, {"name":"万达滑雪", "core": false} ]
}
```
- 13 个偏好维度字段：`nature, zoo, chill, quiet, photo, outdoor, parent, ip_park, changlong, museum, shopping, temple, food`，取值 0/1（命中=1）。
- `avoid[]`：避雷信号词（如"人多物价贵""停车难"），命中 `taste-profile.reject` 即硬拦截或降权。
- `why`：一句话定位；`fun[]`：好玩点列表（生成自然语言理由素材）；`kid`：亲子适配；`warn`：注意事项。
- `spots[]`：核心玩法点，`core:true` 表示"推荐该地的主要玩法"。用于按核心景点去重（见 §8.2）。

### 1.4 `data/hot-pool.json` 结构
```json
{
  "pool": [
    { "name":"盐洲岛", "emoji":"🏝️", "tier":"1-2天", "region":"广东", "why":"惠州小众海岛…",
      "posts": [ {"platform":"小红书","title":"盐洲岛2天1夜攻略","url":"https://www.xiaohongshu.com/search_result?keyword=盐洲岛","fav":1234,"like":560,"view":8900} ] }
  ]
}
```
- `posts[]`：各平台推荐帖（小红书/抖音/携程/马蜂窝/去哪儿）。**链接必须是平台搜索结果页**（见 §10 链接重建规则），不能是具体帖深链（深链移动端易失效）。

### 1.5 `data/taste-profile.json` 结构
```json
{
  "dimensions": {
    "nature":  {"weight": 0.9, "type": "strong"},
    "zoo":     {"weight": 0.8, "type": "strong"},
    "chill":   {"weight": 0.7, "type": "strong"},
    "quiet":   {"weight": 0.9, "type": "strong"},
    "photo":   {"weight": 0.6, "type": "side"},
    "outdoor": {"weight": 0.6, "type": "side"},
    "parent":  {"weight": 0.7, "type": "strong"},
    "ip_park": {"weight": 0.7, "type": "strong"},
    "changlong":{"weight": 0.6, "type": "side"},
    "museum":  {"weight": 0.6, "type": "side"},
    "shopping":{"weight": 0.5, "type": "side"},
    "temple":  {"weight": 0.4, "type": "side"},
    "food":    {"weight": 0.3, "type": "side"}
  },
  "reject": ["老旧假景区","脏海差沙滩","过度商业化古城","人多物价贵","无聊没看点","贵而不值","停车难"],
  "special_rules": {
    "region_block": {"贵州": true},
    "home_open": ["番禺","广州"],
    "zhuhai_changlong_downweight": true,
    "ip_park_exempt_crowd": true
  }
}
```
- `weight` ∈ 0~1；`type`：`strong`（强偏好）/ `side`（顺带项）。
- `reject[]`：硬/软排斥信号词。
- `special_rules`：贵州整区域屏蔽、家附近开放、珠海长隆降权、大IP乐园豁免人多。

### 1.6 `data/wishlist.json`（用户写）
```json
[
  { "id": 1786437895791, "name": "增城白水寨", "emoji": "🌟", "level": "中",
    "tier": "1-2天", "source": "手动添加", "addedAt": "2026-08-11",
    "note": "水挺干净，有平的地方给小孩玩…", "status": "done" }
]
```
- `level` ∈ 高/中/低（想去程度）；`status` ∈ want(想去)/done(已去过)；`tier` ∈ 1-2天/3-4天/5-7天/8天+。

### 1.7 `data/routes.json`（用户写）
路线库数组，每条路线：
```json
{ "id":"r1", "title":"2026国庆·贵州", "cover":"🏔️", "createdAt":"2026-08-01",
  "daily": [ {"day":1,"date":"2026-10-01","title":"广州→贵阳","items":["高铁","酒店"],"cost":1200,"note":"..."} ],
  "dayCosts": [ {"day":1,"trans":2359,"stay":0,"ticket":0,"food":400,"other":200} ],
  "pax": {"adult":2,"child":1,"senior":2} }
```
- 每日卡可编辑/导出/还原；支持费用记录与费用台账（逐日 + 整趟合计）。

### 1.8 `data/confirmed-trip.json`（用户写）
```json
{ "name":"增城白水寨", "tier":"1-2天", "confirmedAt":"2026-08-11", "note":"" }
```
- 由「下一个假期 → ✅ 确认去这里」写入，并联动切到路线库新建行程。

### 1.9 `data/leaves.json`（用户写）
```json
{ "2026-10-01": "full", "2026-10-08": "pm" }
```
- key=日期 `YYYY-MM-DD`，value=`full`(请全天)/`am`(上午)/`pm`(下午)。

### 1.10 `data/feedback-log.json`（用户写）
```json
{
  "note": "洁梅反馈流水…",
  "feedback": [ {"name":"XX","type":"want|dislike|been","ts":"..."} ],
  "visited": [ {"name":"增城白水寨","policy":"exclude","stars":4,"note":"…","addedAt":"2026-08-11"} ],
  "learn": { "deltas": {}, "log": [ {"date":"2026-08-11","name":"XX","type":"want","delta":0.03} ] }
}
```
- `visited[]`：**用户侧"记录去过"去重叠层**（与权威库 `visited.json` 并集参与过滤）。这是「📍 记录去过」入口的落点（见 §11）。
- `learn`：偏好学习器权重 delta 与日志。

### 1.11 本地 `localStorage` Key 约定
```
radar-wish-v1        心愿单
radar-routes-v1       路线库
radar-route-edit-v1   路线编辑叠层（随 routes 一并落库）
radar-fb-v1           反馈流水 feedback[]
radar-visited-add-v1  用户侧去过叠层 VISIT_ADD[]
radar-learn-v1        学习器 LEARN
radar-leave-v1        请假/可用日
radar-confirmed-v1    已确认行程
radar-gh-token-v1     GitHub Token（仅本地，不上云）
radar-sync-dirty-v1   脏标记持久化
```
> 凡用户对"用户数据"的写入，必须同时写 localStorage 并标记对应同步域脏（见 §7）。

---

## 2. 雷达同步机制（radar-sync，核心协议）

> 无后端，GitHub 仓库 = 云数据库。协议必须严格实现以下行为，否则跨设备不一致。

### 2.1 同步域映射
```
wish      → wishlist.json
routes     → routes.json        （含 route-edit 叠层）
confirmed  → confirmed-trip.json
leaves     → leaves.json
feedback   → feedback-log.json  （含 fb / visitedAdd / learn 三者合一）
```

### 2.2 写入链路（本地 → 云端）
1. 用户操作 → 写 `localStorage`（`save()` 内自动 `markDirty(domain)`）。
2. `markDirty`：内存脏标记 + **持久化**到 `radar-sync-dirty-v1`（防刷新/关页面丢反馈）。启动 15s debounce 定时器。
3. 15s 后 `flushSync()`：合并内存+持久脏标记，对每个脏域 `pushDomain(domain)`。
4. `pushDomain` 调 GitHub Contents API：
   - 先 `GET /repos/{owner}/{repo}/contents/{path}?ref={branch}` 取 `sha`（存在则带 sha 更新，否则新建）。
   - 再 `PUT /repos/{owner}/{repo}/contents/{path}`：
     ```
     Authorization: Bearer <token>
     body: { "message": "chore: 自动同步周末雷达用户数据 <时间戳>",
              "content": <base64(UTF-8(JSON.stringify(payload,null,2)))>,
              "branch": <branch>,
              "sha": <sha 或省略> }
     ```
   - **UTF-8 处理**：`btoa(unescape(encodeURIComponent(jsonStr)))`（否则中文乱码/报错）。
   - 无 token 时 `pushDomain` 直接返回 false（不报错），脏标记保留待补推。
5. 成功则清除该域脏标记；失败保留，下次打开页面 `initSync` 补推。

### 2.3 读取链路（云端 → 本地）
- 打开页面 `pullAll()`：
  - **有 token**：逐域 `GET https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{dataPath}{file}`。
  - **无 token**（如 iOS 未配）：改从 **GitHub Pages 公开 URL** `https://{owner}.github.io/{repo}/{dataPath}{file}` 只读拉取（保证无令牌设备也能看到云端数据）。
  - 拉到后 `applyPull(domain, data)`：**本地优先并集**（`mergeArr`：cloud 先 set，local 后 set 覆盖同 key），写回内存 + localStorage（用原始 `setItem`，不走 `save` 以免回环 markDirty）。
- 合并 keyFn：wish 按 `name`、routes 按 `id`、feedback 的 `visited` 按 `name`、feedback 的 `feedback` 按 `name|type`、learn.log 按 `date|name|type`。

### 2.4 令牌隔离（重要边界）
- GitHub Personal Token **只存浏览器 localStorage**（`radar-gh-token-v1`），**不上 git、不进 `data/`、不跨设备同步**。
- 换设备/换端需各自在 ⚙️ 设置粘贴一次同一枚 token，才能实现该端"写"上传。
- 状态条 `#syncStat` 常驻显示：`已同步` / `待同步 N` / `未配置令牌⚠️（数据可读取云端，但修改暂不上传，去 ⚙️ 设置填令牌可全端同步）`。

### 2.5 立即同步按钮
「☁️ 立即同步（写回 GitHub）」→ 调 `syncNow()`：取消定时器立即 `flushSync()`（跳过 15s 等待）。

---

## 3. Tab 1 · 🔥 本周最热

- 主榜渲染 **5–8 张**推荐卡 + **1 张"铄铄彩蛋位"**（固定展示一个适合孩子的亮点地）。
- 候选来源：`hot-pool.json` 的 `pool[]`，先经**偏好匹配层**（§9）打分过滤，再经**已去过去重**（§8）剔除。
- 每张卡操作：`👍 想去` / `👎 不感兴趣` / `✅ 去过了` / `⭐ 收心愿` / `🗺️ 加进路线`。
- **【换一批】**：从 `hot-pool.json` 随机抽 6 张（跳过已去过 / 已标记没兴趣的）。

---

## 4. Tab 2 · 🗓️ 下一个假期

1. 读出下一个法定节假日（`holidays.json`）。
2. 计算可拼天数：法定假 + 周末 + 用户请假（`leaves.json`，`full/am/pm`）且非补班日。
3. 映射档位：1-2天(≤3h车程) / 3-4天(≤6h) / 5-7天(跨省) / 8天+(远途)。
4. **【🚀 帮我找目的地】**：按档位 + 偏好匹配层筛候选地。
5. **【✅ 确认去这里】**：写 `confirmed-trip.json` 并切到「🗺️ 旅行路线」新建行程。

---

## 5. Tab 3 · ⭐ 心愿单（含 📍 去过的地方）

子分区切换：`⭐ 心愿单` / `📍 去过的地方`。

### 5.1 心愿单
- 列表渲染 `wishlist.json` 项（地名/想去程度/档位/备注/状态）。
- **＋ 手动添加心愿**：弹窗填 名称/emoji/想去程度/档位/备注 → 写 `wishlist.json` + 同步。
- 卡片操作：`⭐ 收心愿`（来自本周最热/下一个假期）、`🗺️ 加进路线`、`标记已去过`（仅把该 item `status` 改 `done`，**不进权威去重库**）、编辑、删除。
- **☁️ 立即同步** 按钮（§2.5）。

### 5.2 📍 去过的地方（见 §11 详细）
子分区渲染 = `VISIT_ADD`(本地) ∪ `feedback-log.visited`(云端) ∪ 权威库展示，按 `name` 去重。每条显示：地名 / 星级 / 备注 / 记录时间 / 政策标签（去过不推·永不再推）/ 编辑·删除。

---

## 6. Tab 4 · 🗺️ 旅行路线

- 保存"已走过 + 规划中"行程（多条）。
- 每日卡可 `✏️ 编辑` / `📤 导出改动` / `↺ 还原`；`＋ 新建行程`；每日费用记录；**费用台账**（整趟一张表，逐日 + 合计）。
- 与本周最热/下一个假期/心愿单联动：卡片「🗺️ 加进路线」一键生成路线草稿。
- 路线数据 = `routes.json` + 本地编辑叠层 `radar-route-edit-v1`（随 routes 一并落库）。

---

## 7. 已去过去重（三档规则）

推荐生成时，拿卡片地名比对「权威库 `visited.json` ∪ 用户侧 `VISIT_ADD` ∪ `feedback-log.visited`」。

### 7.1 三档
| 档 | 含义 | 推荐表现 |
|---|---|---|
| `block` | 永不再推 | 永不作为目的地推荐 |
| `exclude` | 去过默认不推 | 不作目的地推荐，但可作已确认行程顺路点 |
| `revisit` | 有窗口才推 | 满足季节/档位/天气窗口才推，卡片标【复访·理由】 |

### 7.2 地名 token 拆分（关键）
- 按**原始名**（保留 `、，,／()-` 等分隔符）拆成多个地名 token；组合地名（如「东涌、西涌、较场尾」「双月湾、絮寮湾」）也能拦**单卡**。
- 例：卡片名含「双月湾」→ 命中 visited 中组合名「双月湾、絮寮湾」的 token，单卡被拦。
- **错误实现警示**：不要先 `normName` 剥掉分隔符再比对——会导致组合名永远拦不住单卡。

### 7.3 按核心景点去重（§8 延续）
- 每张推荐卡可带 `spots:[{name, core}]`，`core:true` = 推荐该地的主玩法。
- 全部 `core` 景点命中去过库 → **不推**（bySpots）。
- 部分命中 → **保留**并标"⚠️ 部分去过(已去过X)"。
- 非 core 顺路点不参与拦截。

---

## 8. 偏好匹配层（决定"推什么"）

纯前端函数（无 DOM 依赖，可单测）：`scoreOne(c, profile)`、`matchCandidates(pool)`、`funReason(c, matched)`、`renderRecCard(c)`。

### 8.1 算分（内部，用户不可见）
```
maxPossible = Σ( weight_dim ) 对 type=="strong" 的维度
score = Σ_dim( weight_dim × c[dim] )          // c[dim] ∈ {0,1}
      − Σ_reject( hit(reject_k, c.avoid) ? penalty_k : 0 )   // 硬排斥→hardReject；软排斥→扣分
```
- **硬拦截（hardReject，不进榜）**：`avoid` 命中 `reject` 硬排斥词（如"老旧假景区""脏海差沙滩"）；或整区域屏蔽（贵州，除非 revisit 窗口满足）；或家附近（番禺/广州）默认开放不拦。
- **进榜阈值**：`score ≥ 0.55 × maxPossible` 才进榜；低于阈值拦截不推。
- **排序**：按 score 降序；同分按 `tier` 匹配当前假期档位优先。
- **特殊规则**（`special_rules`）：珠海长隆降权、大IP乐园（迪士尼/环球）豁免人多（人多仍可一次）、非中国近国需详评。

### 8.2 自然语言理由（界面唯一展示的"为什么"）
- `funReason()`：取 matched 维度 Top3 + `c.fun[]`，套模板生成自然语言，例如：
  > "这里有大熊猫基地铄铄肯定疯爱，自然风光也干净；老人可坐缆车不累，出片很漂亮适合你发小红书。"
- **界面绝对不展示**：分数数字、权重、`#自然风光` 类标签 chip。卡片只给：emoji+名称、drive·season·tier 小字、一句话定位 `why`、自然语言理由、实用信息（kid/warn/src/hot）、反馈按钮。

### 8.3 反馈闭环（学习器自进化）
- `👍 想去`：对应匹配维度权重 +0.03（单维上限 +0.15），写 `learn.log`。
- `👎 没兴趣`：对应匹配维度 −0.05；若该地 `avoid` 命中某 `reject`，强化该 reject。
- `✅ 去过了`：回写去重（默认 `exclude`；长隆类按现有规则；评分≤2→`block`）。
- 所有反馈先存本地 `radar-fb-v1` + `radar-learn-v1`，经同步器落 `feedback-log.json`（维护者可据 `learn` 更新 `taste-profile.json` 真值源）。

---

## 9. 推荐帖链接（makePostUrl 规则）

`hot-pool.json` 里各平台 `posts[].url` 必须是**搜索结果页**，且按**平台 + 设备 UA** 重建可用链接（旧深链/桌面专有 URL 移动端打不开）：
```
isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(UA) || matchMedia('(pointer:coarse)').matches
提取关键词 kw = URL 的 search 参数(keyword/query/searchWord/q/wd) 或 /search/(...) 路径段

小红书: 移动 → m.xiaohongshu.com/search_result?keyword=<kw>
        桌面 → www.xiaohongshu.com/search_result?keyword=<kw>&source=web_search_result_notes&sort=general
抖音:   www.douyin.com/search/<kw>?source=normal_search
携程:   you.ctrip.com/globalsearch/?keyword=<kw>&tabType=travelnotes
马蜂窝: www.mafengwo.cn/search/q.php?q=<kw>
去哪儿: 旧接口已下线 → 降级为 https://www.baidu.com/s?wd=<kw>+去哪儿
```
- 从 `posts[]` 渲染时，锚点 `href` 一律走 `makePostUrl(p, 卡片名)`（卡片名作关键词兜底）。

---

## 10. 📍 记录去过的地方（入口详规）

在「⭐ 心愿单」内新增子分区，**任意地名**直接记（不限于推荐卡片），填**评分 + 备注**。

### 10.1 添加流程 `submitAddVisited()`
```
name  = 输入地名（trim，非空校验）
stars = 1..5（必选，否则拦截保存）
note  = 备注文本
policy = stars <= 2 ? 'block' : 'exclude'     // 与卡片"去过了"评分→政策一致
// ① 本地即时去重（复用 VISIT_ADD 通道，不新建）
if (!VISIT_ADD.find(v => v.name === name))
  VISIT_ADD.push({ name, policy, stars, note, addedAt: ymd() })
  save(radar-visited-add-v1, VISIT_ADD)
// ② 落云端反馈（复用 saveFb + radar-sync）
saveFb({ name, type:'been', stars, note })
// ③ 重渲染
renderVisited(); rerenderHot()
toast('📍 已记录去过 · 将自动从推荐里过滤')
```
- 保存后该地**立即**从本周最热/下一个假期候选中被 `applyVisitFilter` 过滤（与卡片「✅ 去过了」完全一致的去重路径）。

### 10.2 编辑 / 删除
- 编辑：改备注与星级（星级变更联动 policy）。
- 删除：从 `VISIT_ADD` 移除；若该地已晋升权威库（`data/visited.json`），提示"已进权威去过库，如需彻底取消拦截请让维护者调整"，不在本地硬删权威项。

### 10.3 权威库晋升（维护者侧，非前端）
`VISIT_ADD` + 云端 `feedback-log.visited` 是用户侧真值；需"跨设备永久拦推荐"时，维护者把该地写进 `visited.json` 生成脚本并重跑。**前端不自动改权威库**（保持与现状一致）。

---

## 11. iOS / Mac 两端同步边界（明确告知 condex）

- **读（云端→本地）**：两端 `pullAll()`。Mac 通常配 token 走 `raw.githubusercontent`；**iOS 无 token 时走 GitHub Pages 公开 URL 只读**（见 §2.3）。✅ 已实现读互通。
- **写（本地→云端）**：需**各自设备都配 token** 才能上传。iOS 未配 → 修改暂不上传（状态条提示"未配置令牌"）。这是令牌隔离的架构限制。
- **结论**：全端双向同步 = 各端 ⚙️ 设置都粘贴同一枚 token。

---

## 12. 版本与部署

- 仓库 `jiemei919/weekend-radar`，GitHub Pages 从 `main` 自动构建。
- 每次部署前 **bump `app/sw.js` 的 `CACHE` 名**（如 `radar-v25`），Service Worker 用 **network-first** 策略。
- 部署后用户**硬刷新 / 开无痕**验证（PWA 有缓存）。
- 当前线上版本：V1.4.3。

---

## 13. 验收标准（总）

1. 四 Tab 均能正常渲染、交互、持久化。
2. 用户任意操作（心愿/路线/确认/请假/反馈/记录去过）后，数据在 15s 内或点【立即同步】后写回 GitHub `data/*.json`（用 `curl` 验云端文件确认）。
3. 已去过（权威库 + 用户侧）地名在推荐中按三档正确拦截；组合地名/核心景点去重生效。
4. 偏好匹配：低匹配度地点被拦截；符合偏好地点进榜且排前；卡片**无分数数字、无标签 chip**，仅自然语言理由。
5. 推荐帖链接在 Mac（桌面 UA）与手机（移动 UA）都能打开并定位到搜索结果页。
6. iOS 无 token 能看到 Mac 数据（读互通）；各端配 token 后双向同步。
7. `node --check` 通过；无 DOM 单测覆盖 `scoreOne / matchCandidates / funReason / submitAddVisited / applyVisitFilter`。

---

## 附：condex 实现 checklist（照此逐项交付）
- [ ] 单页 PWA（index.html + app/*.js + manifest + sw.js）
- [ ] GitHub Contents API 同步器（GET sha / PUT base64 / 15s debounce / 脏标记持久化 / pullAll 并集 / 无 token 走 Pages）
- [ ] 四 Tab 渲染与交互
- [ ] 偏好匹配层（13 维算分 + 阈值 0.55×maxPossible + 自然语言理由 + 反馈学习器）
- [ ] 三档去重（token 拆分 + 核心景点去重）
- [ ] 推荐帖链接 makePostUrl（5 平台 × UA）
- [ ] 📍 记录去过入口（VISIT_ADD + feedback-log.visited + 评分→政策）
- [ ] ⚙️ 设置（填/清 GitHub Token）
- [ ] 测试用例文档全部 TC 通过
