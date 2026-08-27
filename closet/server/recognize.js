// 智谱 AI 视觉识别：输入图片(base64) => 结构化物品字段
// key 从环境变量 ZHIPU_API_KEY 读取（不写死在代码里）；缺失时抛错提示。
const ZHIPU_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const MODEL = process.env.ZHIPU_MODEL || 'glm-4v-plus';

const PROMPT = `你是一个家庭物品入库助手。请识别图片中的物品，只返回一个 JSON 对象（不要 markdown 代码块、不要任何解释文字），字段定义如下：
{
  "name": "物品名称（必填）",
  "brand": "品牌（识别不出填空字符串）",
  "category": "大类，从[衣物,鞋,日用,护肤,洗护,厨房,家电,其他]中选一个",
  "season": "适用季节，从[春秋,夏,冬,四季]中选（不确定填四季）",
  "subtype": "衣物子类，从[上装,下装,裙装,其他]中选（非衣物填其他）",
  "qty": 1,
  "place": "建议存放位置（识别不出填空字符串）"
}`;

async function recognizeImage(base64, mime = 'image/jpeg') {
  const key = process.env.ZHIPU_API_KEY;
  if (!key) throw new Error('缺少 ZHIPU_API_KEY 环境变量（请在启动服务时 export ZHIPU_API_KEY=...）');
  const dataUrl = `data:${mime};base64,${base64}`;
  const body = {
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    temperature: 0.3,
  };
  const resp = await fetch(ZHIPU_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + key,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error('Zhipu API ' + resp.status + ': ' + t.slice(0, 300));
  }
  const data = await resp.json();
  const text = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  return parseJson(text);
}

// 容错解析：去掉 ```json 围栏，截取第一个 { 到最后一个 }
function parseJson(text) {
  let s = String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end >= start) s = s.slice(start, end + 1);
  try {
    return JSON.parse(s);
  } catch (e) {
    return { raw: text };
  }
}

module.exports = { recognizeImage, parseJson, MODEL };
