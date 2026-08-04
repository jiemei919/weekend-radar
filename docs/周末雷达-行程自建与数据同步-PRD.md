# 周末雷达 · 行程自建 + 数据同步 PRD

> 实现导向。讲清"怎么实现"，不讲已有规则百科全书。
> 关联：费用记录 PRD、偏好匹配层 PRD（均待"可以去开发了"后并入）。

## 一、要解决的问题
1. 当前 App **无"从零新建行程"入口**：路线只能由助手写进 `ROUTE_SEED`/`data/routes.json`，或靠未接通的"下一个假期确认→genPlan"。用户想"自己把行程做出来"做不到。
2. 用户改动只存浏览器 localStorage，**不跨设备、无版本、母本不自动回写**。
3. 洁梅要求：①自己开新行程、边走边改；②数据可读汇总、可跨设备、无服务器。

## 二、实现思路（一句话）
新增「＋新建行程」表单 → 生成空白每日卡（写入 localStorage `radar-routes-v1`，架构不变）；数据层把 `data/` + `app/` 迁入 **GitHub 仓库 + GitHub Pages 托管**，"保存并同步"即提交，实现"这台 Mac 关机也能从手机/别的电脑用" + 版本历史。

## 三、各入口/落点改动

### A. 新建行程（改 `app/index.html`）
- **入口**：路线库 tab 顶部加 `＋ 新建行程` 按钮（沿用现有卡片/按钮风格，不碰本周最热）。
- **表单弹窗**字段：
  - 行程名称（必填，如"潮汕闲逛"）
  - 状态：规划中 / 已走过（默认规划中）
  - 日期范围（可选，如 2026-10-01 ~ 2026-10-03）
  - 天数（必填，1-30，决定生成 Day 数）
  - 档位（可选：1-2天 / 3-4天 / 5-7天 / 8天+）
- **提交逻辑**：`ROUTE_DB.push(newRoute)`；`newRoute = { id, name, status, dateRange, days, tier, source:'user', daily: genPlan(name, days) }`；`save(LS.routes, ROUTE_DB)`。
- **genPlan 增强**：生成骨架时每天带 `costs:{items:[]}`（接费用记录 PRD）。
- **立即可用**：新路线出现在路线库，可展开 → ✏️编辑模式填时间/路线/住宿/注意事项/费用（复用 `dayCardHTML` / `toggleEditRoute` / 费用编辑，零改动）。
- **删除**：路线卡加 `🗑 删除`（仅 `source:'user'` 可见；SEED 的成都不可删）。

### B. 数据同步（GitHub 仓库，无服务器、永远在线）
- **为什么是 GitHub 不是本机/Obsidian**：本机方案 Mac 一关就断；Obsidian 是个人笔记工具，不能托管网页 app、也不能让网页 app 跨设备读它的数据（最多把行程当笔记存着看）。GitHub 同时解决"托管 app（Pages 永远在线）+ 数据在云端仓库（关机也能从手机开）+ 版本历史 + 多设备"，唯一满足"这部关机也还能用"。
- **初始化**：把 `data/` + `app/` 提交到 GitHub 仓库；开启 **GitHub Pages** 托管 → 手机/电脑开同一网址，不依赖这台 Mac。
- **读取**：app 启动 fetch 仓库 raw JSON（或 Pages URL）作初始数据；localStorage 叠层（`radar-route-edit-v1` 等）逻辑不变。
- **写入**：点「保存并同步」→ 用 GitHub API + token（`localStorage` 存，仅仓库写权限，可撤销）PUT 变更的 `data/*.json` → commit。
- **多设备**：任意设备打开即拉最新；版本历史 = Git commits，可回滚。
- **Obsidian 定位（可选加分项，非主存储）**：若你想在 Obsidian 里也能"读"到行程，我可额外把数据同步成 Obsidian 能看的笔记（如 `行程-成都.md`）；但 app 运行与实时数据仍以 GitHub 为准。
- **降级**：未配置 token 时，仍只存 localStorage（当前行为），不影响使用；但此时换设备/关机仍不可用，故主推 GitHub。

## 四、唯一新增/变更逻辑（阈值与样例）
- 表单校验：名称非空；天数 1-30 整数；日期范围可选（不校验先后，仅展示）。
- 删除仅对 `source==='user'` 生效（`ROUTE_SEED` 里的成都 `source:'seed'` 不显示删除）。
- 同步提交**只 PUT 变更文件**（routes / visited / wishlist / taste-profile / confirmed-trip），不整库覆盖，避免冲突。
- 新建路线 `id` 规则：`r-user-{YYYYMMDD}-{rand}`，避免与 SEED 冲突。

## 五、其余沿用现有流程
编辑叠层 `radar-route-edit-v1`、费用记录、导出改动、偏好匹配层、三档去重均不变，新路线同样适用。

## 六、我需要你提供（仅 GitHub 同步部分）
- 一个 **GitHub 账号**（你已有）；你建好仓库给我写权限，或生成 personal access token 给我（仅仓库写权限，可随时撤销）。
- **隐私提示**：GitHub Pages 免费版仓库默认**公开**。行程数据不算敏感，公开通常没问题；若想私有，可用 GitHub Pro（私有仓库+Pages）或 Cloudflare Pages（免费私有）。你定。
- **Obsidian 不强求**：若想要 Obsidian 里也能看行程笔记，我再加同步（见 B 节）；不影响主流程。

## 七、验收标准
1. 点「＋新建行程」→ 填表 → 路线库出现新路线，含 N 天空白每日卡。
2. 新路线可在编辑模式填时间/路线/住宿/注意事项/费用，保存后刷新仍在（localStorage）。
3. （Git 配置后）点「保存并同步」→ 仓库出现新提交，另一设备打开能看到。
4. 成都等 SEED 路线不可被删除。
