# 周末雷达 ·「记录去过的地方」入口 PRD

> 实现导向文档。讲清"怎么实现"，不重抄已有规则。

## 一、问题根因

洁梅需要一个**随手记录"我已经去过的地方"**的入口，要求能填「地名 + 评分 + 备注」。

现状缺口：
- 现有"记录去过"只有两条路——卡片上的「✅ 去过了」按钮、心愿单的「标记已去过」。
- 两条都**要求该地先出现在推荐卡片或心愿单里**才能点。对"早就去过、现在压根不推"的地方（如本次的增城白水寨），反而记不了。
- 心愿单的「标记已去过」只是把心愿 item 的 `status` 改成 `done`，**不进权威去重库、也不参与推荐过滤**。

→ 缺一个"任意地名直接记为去过并参与去重"的专用入口。

## 二、实现思路（一句话机制）

在「心愿单」tab 内新增一个「📍 去过的地方」分区，复用现有"去过了"数据通道（VISIT_ADD + feedback-log.visited + radar-sync），让用户自由输入地名+评分+备注即记录为去过，**立即参与推荐去重**，不新建数据文件、不新建同步通道。

## 三、各入口 / 落点改动

1. **心愿单 tab 结构**（`app/index.html`）
   - 在 tab 内加子分区切换：`⭐ 心愿单` / `📍 去过的地方`（demo：`prototype/record-visited-demo.html`）。
   - 新增 `renderVisited()`：渲染"去过的地方"列表。数据源 = `VISIT_ADD`（本地）∪ `feedback-log.visited`（云端）∪ 权威库展示，按 `name` 去重合并；每条显示 地名 / 星级 / 备注 / 记录时间 / 政策标签（去过不推·永不再推）/ 编辑·删除。

2. **添加弹窗**（复用 `mAddWish` 样式，新增 `mAddVisited`）
   - 字段：地名（自由文本 `input`，不限定候选）、评分（1–5 星单选）、备注（`textarea`）。
   - `openAddVisited()` / `submitAddVisited()`：保存时同时做两件事（见第四节）。

3. **编辑 / 删除**（`editVisited` / `delVisited`）
   - 编辑：改备注与星级（星级变更联动政策）。
   - 删除：从 `VISIT_ADD` 移除该条；若该地已晋升权威库（`data/visited.json`），提示"已进权威去过库，如需彻底取消拦截请让雪花调整"，不在本地硬删权威项。

4. **即时去重生效**
   - 保存/删除后调用 `rerenderHot()`，让"去过的地方"里的地立即从本周最热 / 下一个假期候选中被 `applyVisitFilter` 过滤（与卡片「✅ 去过了」完全一致的去重路径）。

## 四、唯一新增 / 变更逻辑（阈值与样例）

新增逻辑只有一个：**提交"添加去过"时的数据写入与政策判定**。

```
submitAddVisited():
  name = 输入地名（trim，非空校验）
  stars = 1..5（必选，否则拦截）
  note = 备注文本
  policy = stars <= 2 ? 'block' : 'exclude'   // 与卡片"去过了"评分→政策逻辑一致
  // ① 本地即时去重（复用现有通道，不新建）
  if (!VISIT_ADD.find(v => v.name === name))
    VISIT_ADD.push({ name, policy, stars, note, addedAt: ymd() })
    save(LS.visitedAdd, VISIT_ADD)
  // ② 落云端反馈（复用现有 saveFb + radar-sync）
  saveFb({ id: <候选id或哈希>, name, type:'been', stars, note })
  // ③ 重渲染
  renderVisited(); rerenderHot()
  toast('📍 已记录去过 · 将自动从推荐里过滤')
```

**样例**：洁梅在「去过的地方」填 `广州 · 增城白水寨`、4 星、备注"瀑布一般，台阶多"→ 保存后 `VISIT_ADD` 多出一条 `policy:'exclude'` → 下次渲染本周最热/下一个假期时，`applyVisitFilter` 命中 `增城白水寨` token，该地不再作为目的地推荐（可作顺路点）。

**权威库晋升**：与现有卡片"去过了"一致——`VISIT_ADD` + 云端 `feedback-log.visited` 是用户侧真值；需要"跨设备永久拦推荐"时，雪花侧把该地写进 `scripts/build_visited.py` 并重跑（即本次增城白水寨已走的流程）。本 PRD 不把"自动写 build_visited.py"纳入前端范围（保持与现状一致，避免前端直接改权威库）。

## 五、其余沿用现有流程（一句话声明）

心愿单原有「⭐ 收心愿 / 加进路线 / 调想去程度 / 标记已去过」、反馈落库 `radar-sync`、`applyVisitFilter` 三档去重、SW 缓存与灰度发布流程**全部沿用，不改动**。

## 六、验收标准

1. 在「心愿单 → 去过的地方」点「＋ 添加去过」，填任意地名 + 评分 + 备注并保存：
   - 该地立即从本周最热 / 下一个假期候选中被过滤（exclude），顺路点仍可出现在已确认行程。
   - 评分为 1–2 星时，政策标签显示"永不再推"（block）。
2. 刷新页面 / 换设备后记录仍在（`feedback-log.visited` 已同步）。
3. 编辑备注或星级后，政策标签与去重结果同步更新；删除本地项后该地从去重恢复（若已晋升权威库则提示雪花调整）。
4. `smoke-visited.js` / `smoke-test.js` / `smoke-hot.js` 全过（0 失败）。
5. demo（`prototype/record-visited-demo.html`）交互与最终实现一致。
