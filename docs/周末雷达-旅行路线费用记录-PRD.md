# 周末雷达 · 旅行路线「每日费用记录 + 行程总花费」PRD

> 状态：待洁梅确认「可以去开发了」后开工  
> 背景：洁梅反馈——希望在每条旅行路线的每日行程卡里记录当天花费（高铁票、住宿、门票、租车、油费、吃饭等），其中高铁/住宿/门票/租车定了以后是固定金额，油费/吃饭等是预估；最终能在每趟行程上看到总花费，并且数据能被汇总读取。

## 1. 问题根因
当前 `daily[]` 只有时间/路线/住宿/注意事项，没有费用维度。洁梅做规划时需要知道整趟要花多少钱、已确定支出和预估支出分别是多少，也需要历史花费数据做汇总。

## 2. 实现思路（一句话机制）
给每条 `daily` 新增 `costs: { items:[], dayTotal, fixedTotal, estTotal }` 字段；在每日行程卡中嵌入可折叠的「💰 当日费用」区块；路线头部展示整趟「已确定 / 预估 / 合计」总花费；所有数据随编辑叠层保存，并随导出 JSON 同步回真值源。

## 3. 各入口 / 落点改动
- **数据模型**：`daily[].costs` 新增，结构见第 4 节。原字段（timeline/route/hotel/tips）全部保留。
- **数据真值源**：`data/routes.json` 成都 8 天示例补填一组示意费用（非编造，按公开价格区间/常识填）。
- **APP 内嵌 seed**：`app/index.html` 的 `ROUTE_SEED` 同步补上 `costs`。
- **每日行程卡渲染**：`dayCardHTML()` 在「注意事项」下方新增「💰 当日费用」区块，显示当天分类小计与费用明细；编辑态可增删改。
- **路线头部渲染**：`renderRoute()` 在路线名/日期/天数一行下方新增费用总览条，显示「固定 ¥X / 预估 ¥Y / 合计 ¥Z」。
- **编辑叠层**：`ROUTE_EDIT` 的 `days[i].costs` 纳入本地保存；新增 `updRCost / addRCost / delRCost` 编辑函数。
- **导出同步**：`exportRoute()` 把 `costs` 一并导出，雪花回写 `data/routes.json` 时覆盖即可。
- **汇总读取**：提供「📊 花费汇总」入口，导出所有路线的费用合计 JSON，便于后续做年度/月度统计。

## 4. 唯一新增 / 变更逻辑（阈值与样例）

### 4.1 费用数据结构
```json
{
  "daily": [
    {
      "date": "2026/10/1",
      "mode": "行车",
      "timeline": [...],
      "route": "成都→卧龙 220km",
      "hotel": "卧龙文玥民宿(1900)",
      "tips": [...],
      "costs": {
        "items": [
          {"category": "rental", "name": "租车（SUV 7天）", "amount": 2800, "type": "fixed", "note": "一嗨/神州提前订"},
          {"category": "gas", "name": "油费", "amount": 200, "type": "estimate", "note": "成都→卧龙段"},
          {"category": "ticket", "name": "卧龙熊猫基地门票", "amount": 90, "type": "fixed", "note": "成人票，老人/小孩优惠待核"},
          {"category": "hotel", "name": "卧龙文玥民宿", "amount": 450, "type": "fixed", "note": "双床房"},
          {"category": "meal", "name": "晚餐", "amount": 150, "type": "estimate", "note": "民宿附近"}
        ]
      }
    }
  ]
}
```
- `category` 枚举：`train`（高铁/机票）、`hotel`（住宿）、`ticket`（门票）、`rental`（租车）、`gas`（油费）、`meal`（吃饭）、`toll`（停车/过路）、`other`（其他）。
- `type` 枚举：`fixed`（已定价/已定）、`estimate`（预估）。
- `amount` 为正整数（单位人民币 ¥）。

### 4.2 自动计算
每项保存时自动重算当天三个数：
- `dayTotal` = 所有 items.amount 之和
- `fixedTotal` = type=fixed 之和
- `estTotal` = type=estimate 之和
路线级别自动汇总所有 `daily[i].costs`：
- `tripFixed` = Σ fixedTotal
- `tripEst` = Σ estTotal
- `tripTotal` = tripFixed + tripEst
计算由纯前端在渲染/编辑时完成，无需后端。

### 4.3 UI 展示规则
- **非编辑态**：
  - 路线头部显示 `💰 已确定 ¥X / 预估 ¥Y / 合计 ¥Z`，点击可展开/收起整趟费用明细。
  - 每日卡「注意事项」下方显示一行 `💰 本日合计 ¥dayTotal（固定¥fixedTotal + 预估¥estTotal）`，点击展开分类明细。
  - 若某条路线没有任何 `costs` 数据，头部不显示费用条，避免占位。
- **编辑态**：
  - 每日卡费用区块变成可编辑表格：每行 = 分类下拉 + 名称输入 + 金额输入 + 类型下拉 + 备注输入 + 删除。
  - 区块底部有「＋ 添加一项」，点一次加一行空费用。
  - 修改即自动重算当天小计与路线总计，无需保存按钮。

### 4.4 固定 vs 预估的视觉区分
- `fixed` 金额用普通深色文字。
- `estimate` 金额用灰色斜体并带「≈」前缀，提示这是预估。

### 4.5 示例数据（成都 8 天）
仅填主要项目，其余天留空或填典型支出，不编造精确价格。例如：
- Day1（高铁日）：广州→成都高铁票约 ¥2600（4 人，fixed），成都东站酒店 ¥400（fixed），晚餐 ¥150（estimate）。
- Day2（行车+熊猫）：租车日均 ¥400（fixed）、油费 ¥200（estimate）、熊猫基地门票 ¥360（fixed）、民宿 ¥450（fixed）、餐费 ¥200（estimate）。
- 后续天按同类结构补主要项，未定的先不填，由洁梅在编辑态补充。

## 5. 其余沿用现有流程
- 路线库多并存、状态(done/planned)、候选路线、✅去过了、PWA/离线、localStorage 叠层编辑与导出同步机制——**全部沿用**。
- 本周最热样式保持当前卡片风格，不改动。

## 6. 验收标准
1. 打开「🗺️ 旅行路线」→成都路线，路线头部显示整趟费用总览（固定/预估/合计）。
2. 展开每日卡，能看到「💰 当日费用」区块，分类列出当天支出，区分固定与预估。
3. 进入编辑模式后，每条 daily 的费用可就地增删改；改完刷新不丢（存 localStorage 叠层）。
4. 金额输入即时校验只允许数字；保存/删除后当天小计和路线总计即时更新。
5. 「导出改动」JSON 中每条 daily 包含 `costs` 字段，雪花可据此回写 `data/routes.json`。
6. 路线库提供「📊 花费汇总」按钮，可复制所有路线的 tripFixed / tripEst / tripTotal 数据。
7. 没有费用数据的路由不显示费用条，不影响现有样式。

## 7. 汇总数据结构（雪花可读取）
```json
{
  "generatedAt": "2026-08-04T10:20:00",
  "summary": [
    {
      "routeId": "r-chengdu-2026",
      "name": "成都-卧龙-四姑娘山-新都桥-康定-三星堆",
      "dateRange": "2026-09-30 ~ 2026-10-07",
      "status": "planned",
      "tripFixed": 12000,
      "tripEst": 3400,
      "tripTotal": 15400,
      "daysWithCost": 8
    }
  ],
  "grandTotal": 15400
}
```
该 JSON 通过「📊 花费汇总」按钮复制，可直接粘贴给雪花做后续 Excel/飞书汇总。
