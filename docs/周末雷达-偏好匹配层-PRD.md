# 周末雷达 · 偏好匹配层 PRD（v1，内部打分·界面只给好玩理由）

> 关联：`docs/全家旅行偏好画像-v1.md`（人话版，v1.2.1）、`data/taste-profile.json`（机器真值源）、`data/visited.json`（三档去重）。
> 前置已确认：v1.2 画像内容洁梅认可（"其他的没问题" 08-03；08-04 补 上海迪士尼=去过/北京环球=没去过/动物园举例/界面不显示打分标签）。
> **本 PRD 仅描述实现，不动代码，待洁梅确认「可以去开发了」再改 `app/index.html`。**

## 1. 问题根因
- 当前"下一个假期 / 本周最热"用的是静态 `RECS` 数组 + 简单去重，没有把洁梅全家偏好（13 个维度权重）用到候选地筛选与排序上。
- 洁梅要求：① 推荐必须结合全家偏好（客观口碑 ∩ 全家偏好）；② **使用时不展示打分数字、不展示标签**，只看到"推荐地去哪 + 为什么好玩/适合全家"；③ 推荐要持续进化（每次反馈回流到 `taste-profile.json`）。

## 2. 实现思路（一句话机制）
新增一个**偏好匹配层**：把候选地结构化属性，按 `taste-profile.json` 的维度权重做内部加权算分 + 排斥项硬拦截，分数只用于排序/过滤；最终卡片**只用自然语言写出"为什么好玩/为什么适合你们"**，分数与内部标签对用户不可见。每张卡片带反馈按钮（想去/不感兴趣/去过了），反馈自动回流学习器。

## 3. 数据改动
- **新增 `data/candidates.json`（候选地属性库）**：每个候选地的结构化属性，供匹配层算分。字段：
  - 基础：`id, name, region, grad(渐变背景), emoji, drive(车程/高铁), season(最佳季节), tier(档位1-2/3-4/5-7/8+天), src(来源), hot(热度)`
  - 偏好属性（与 `taste-profile.json` 维度一一对应，0/1 或 0~1）：`nature, zoo, chill, quiet, photo, outdoor, parent, ip_park, changlong, museum, shopping, temple, food`
  - 避雷信号：`avoid[]`（如"人多物价贵""停车难"），命中 `taste-profile.reject` 即硬拦截或降权
  - 理由素材：`why`（一句话定位）、`fun[]`（好玩点列表，用于生成自然语言理由）、`kid`（亲子适配）、`warn`（注意事项）
- **复用**：`data/taste-profile.json`（维度权重+排斥+特殊规则）、`data/visited.json`（三档去重）、现有 `RECS`/`holiday-recs.json` 作为种子，逐步迁到 `candidates.json`。
- 不新建后端：PWA 静态站点，`fetch('./data/candidates.json')` + `fetch('./data/taste-profile.json')` 本地读（与现有 visited.js 同机制，或转成 `app/*.js` 全局变量以兼容 file://）。

## 4. 各入口/落点改动（改 `app/index.html`）
- 🔥本周最热、`🗓️下一个假期` 候选结果，统一改走 `matchCandidates(rawPool)` 后再渲染。
- 新增模块函数（纯前端，无 DOM 依赖，可单测）：
  - `loadProfile()` / `loadCandidates()`：读两份 JSON。
  - `scoreOne(c, profile)`：返回 `{score, matched[], hardReject, rejectReasons[]}`（**内部用**）。
  - `matchCandidates(pool)`：filter 掉 hardReject + visited 三档拦截 → 按 score 降序 → 截断 Top N。
  - `funReason(c, matched)`：把 matched 维度 + `c.fun[]` 拼成一段自然语言"为什么好玩"（见 §5）。
  - `renderRecCard(c)`：渲染**洁梅视角卡片**（无分数、无标签，见 §5 卡片结构）。
  - 反馈：`onFeedback(id, type)` → 写 `localStorage['radar-feedback-v1']` + 触发 `learnFromFeedback()`（更新内存 profile 权重 + 追加 changelog；同步给雪花回写真值源，沿用现有 ☁️导出 机制）。

## 5. 唯一新增/变更逻辑（详述）

### 5.1 算分（内部，用户不可见）
```
score = Σ_dim( profile.dimensions[dim].weight × c[dim] )      // c[dim] ∈ {0,1}
       − Σ_reject( hit(reject_k, c.avoid) ? penalty_k : 0 )   // 硬排斥→hardReject；软排斥→扣分
硬拦截：hit(OLD_FAKE/DIRTY_SEA/BORING) 或 大IP但已去过且非"人少" → hardReject（不进榜）
特殊规则：贵州 block 清单 / 家附近开放 / 非中国近国 / 珠海长隆降权 / 大IP未去过豁免人多（读 taste-profile.special_rules 执行）
```
- 阈值：`score ≥ 0.55×maxPossible` 才进榜（maxPossible = Σ weight of 强偏好维度）。低于阈值拦截不推。
- 排序：按 score 降序；同分按 `tier` 匹配当前假期档位优先。

### 5.2 自然语言理由（界面唯一展示的"为什么"）
`funReason()` 规则：取 matched 维度 Top3 + `c.fun[]`，套模板：
> "这里**{zoo?有特色的动物/熊猫}**、**{nature?自然风光出众}**、**{chill?能躺平泡温泉}**；{c.fun[0]}、{c.fun[1]}；{parent?铄铄能玩XX，照顾他情绪}；{photo?出片很漂亮适合你发小红书}。"
- **不输出任何分数、不输出维度标签 chip**。例："这里有大熊猫基地铄铄肯定疯爱，自然风光也干净，海边出片很漂亮适合你发小红书；老人可坐缆车不累。"（全自然语言）

### 5.3 洁梅视角卡片结构（renderRecCard）
```
[emoji + 名称]  [drive·season·tier 小字]
一句话定位：{c.why}
为什么好玩/适合你们：
  {funReason 自然段}
实用：{kid} ｜ {warn} ｜ 来源 {src}·{hot}
[👍 想去] [👎 不感兴趣] [✅ 去过了]
```
- **明确不含**：分数数字、权重、`#自然风光` 类标签 chip。

### 5.4 反馈闭环（学习器自进化）
- 点 👍：该维度权重 +0.03（上限 +0.15），写 changelog「X月X日 反馈想去→维度A/B +0.03」。
- 点 👎：对应匹配维度 −0.05，若该地 avoid 命中某 reject，则强化该 reject 权重；写 changelog。
- 点 ✅去过了：回写 `visited.json` 三档（默认 exclude，长隆类按现有规则），并触发去重库重跑。
- 所有反馈先存 `localStorage['radar-feedback-v1']`；☁️导出 时合并进 `data/feedback-log.json` + 更新 `taste-profile.json`（真值源）。

## 6. 复用声明
其余沿用现有流程：PWA/缓存 bump 机制、visited 三档去重（`hitVisited/applyVisitFilter`）、假期档位计算（`calcLeave`）、路线库编辑叠层、周一自动化重跑。本层只新增"候选属性库 + 匹配/打分/理由生成 + 反馈回流"，不改动既有去重与路线逻辑。

## 7. 验收标准
1. 候选地经匹配层后，命中度低（如纯购物古城）被拦截不进榜；符合偏好（自然+动物园+亲子）进榜且排前。
2. 卡片**无任何分数数字、无标签 chip**，只有自然语言理由 + 实用信息。
3. 上海迪士尼不出现在"新推荐"（visited=revisit 人少才出现）；北京环球作为强候选进榜（人多豁免），理由写"大IP一次性体验"。
4. 点反馈按钮后，内存 profile 权重变化并写 changelog；☁️导出后 `taste-profile.json` 与 `feedback-log.json` 出现对应记录。
5. 本地 `node --check` 通过内联脚本语法；无 DOM 单测覆盖 `scoreOne/matchCandidates/funReason`。
