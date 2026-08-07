#!/usr/bin/env python3
# 给 hot-pool 的目标卡片加/更新 spots（核心玩法）字段，并重新生成 app/hot-pool.js 镜像。
# 幂等：按卡名匹配，覆盖式写入 spots，可重复运行。
# spots: [{name:"景点名", core:true/false}] —— core=true 表示该景点是推荐该地的"主玩法"，
#        去重逻辑用：全部 core 景点都去过 → 不再推荐；部分去过 → 保留并标注。
import json, sys

DATA = 'data/hot-pool.json'
MIRROR = 'app/hot-pool.js'

# (匹配关键词, [(景点名, core)])
RULES = [
    ("靖西", [("通灵大峡谷", True), ("德天瀑布", True), ("鹅泉", False)]),
    ("崇左", [("德天瀑布", True), ("明仕田园", True), ("友谊关", False)]),
    ("金秀", [("圣堂山", True), ("莲花山", False)]),
    ("鹿寨", [("中渡古镇", True), ("香桥岩溶", True)]),
    ("中渡", [("中渡古镇", True), ("香桥岩溶", True)]),
]

data = json.load(open(DATA, encoding='utf-8'))
matched = []
for d in data:
    nm = d.get('name', '')
    for kw, spots in RULES:
        if kw in nm:
            d['spots'] = [{"name": n, "core": c} for n, c in spots]
            matched.append((d['id'], nm, spots))
            break

json.dump(data, open(DATA, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
with open(MIRROR, 'w', encoding='utf-8') as f:
    f.write('// 自动生成镜像：data/hot-pool.json -> app/hot-pool.js (与 data 同步)\n')
    f.write('window.HOT_POOL = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')

print("已更新 spots 的卡片：")
for mid, nm, spots in matched:
    print(f"  [{mid}] {nm} -> {spots}")
print("done")
