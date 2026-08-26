// v3.3 smoke test — 内联 app.js，用 DOM 交互驱动（避免 jsdom 中 let/const 不挂 window 的问题）
const {JSDOM}=require('jsdom');
const fs=require('fs');
const path=require('path');

const root=__dirname;
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'app.js'),'utf8');

// 内联 app.js，去掉外部 CSS 引用（逻辑测试不需要样式）
const inlined=html
  .replace('<link rel="stylesheet" href="styles.css" />','')
  .replace('<script src="app.js"></script>','<script>'+js+'</script>');

const dom=new JSDOM(inlined,{url:'http://localhost',pretendToBeVisual:true,runScripts:'dangerously'});
const w=dom.window, doc=w.document;

function wait(ms){return new Promise(r=>setTimeout(r,ms||20))}
function txt(){return doc.querySelector('#app')?doc.querySelector('#app').textContent:''}
function full(){return doc.body.textContent}
let passed=0,failed=0;
function check(label,cond){if(cond){passed++;console.log('  ✓ '+label)}else{failed++;console.log('  ✗ FAIL: '+label)}}
function clickOwner(name){const p=Array.from(doc.querySelectorAll('.owner-pill')).find(b=>b.textContent.includes(name));if(p)p.click()}
function clickChip(text){const c=Array.from(doc.querySelectorAll('.chip')).find(x=>x.textContent.trim()===text);if(c)c.click()}

async function run(){
  console.log('=== v3.3 Smoke Test ===\n');
  await wait(30);

  console.log('— 基础渲染 —');
  check('#app存在',!!doc.querySelector('#app'));
  check('.page存在',!!doc.querySelector('.page'));
  check('首页有天气卡',!!doc.querySelector('.weather-hero'));
  check('首页有记一笔',txt().includes('记一笔'));
  check('首页有快捷操作',txt().includes('拍订单')&&txt().includes('拍包装')&&txt().includes('手动添加'));
  check('首页右上角无头像',!doc.querySelector('.topline .avatar'));

  console.log('\n— tab icon（改动6）—');
  const tabs=doc.querySelectorAll('.tabbar button');
  check('底部4个tab',tabs.length===4);
  const tabTexts=Array.from(tabs).map(t=>t.textContent.trim());
  check('tab文案含首页/我/记/家当',['首页','我','记','家当'].every(l=>tabTexts.some(t=>t.includes(l))));
  check('首页icon=🏡',doc.querySelector('[data-route="home"] .tab-icon')&&doc.querySelector('[data-route="home"] .tab-icon').textContent==='🏡');
  check('记icon=✏️',doc.querySelector('[data-route="add"] .tab-icon')&&doc.querySelector('[data-route="add"] .tab-icon').textContent==='✏️');

  console.log('\n— 我的宝贝（改动8）—');
  if(typeof w.go!=='function'){console.log('  ⚠ go() 未定义，脚本未加载');failed+=30;return finish();}
  await wait(); w.go('assets'); await wait();
  check('标题=「我」',doc.querySelector('.title')&&doc.querySelector('.title').textContent==='我');
  check('有搜索栏',!!doc.querySelector('.owner-search-bar'));
  check('placeholder含人名',(doc.querySelector('.owner-search-bar input')?doc.querySelector('.owner-search-bar input').placeholder:'')&&(doc.querySelector('.owner-search-bar input').placeholder||'').includes('我'));
  check('有件数显示',txt().includes('件'));

  // 切换成员：点击儿子
  await wait(); clickOwner('儿子'); await wait();
  check('切→儿子标题=儿子',doc.querySelector('.title')&&doc.querySelector('.title').textContent==='儿子');
  await wait(); clickOwner('我'); await wait();

  // +分类弹窗
  await wait(); w.addOwnerCat(); await wait();
  check('+分类弹出modal',!!doc.getElementById('appModal'));
  await wait(); w.closeModal(); await wait();

  // 衣物季节部位
  await wait(); clickChip('衣物'); await wait();
  check('衣物→季节chip',txt().includes('全部季节'));
  await wait(); clickChip('秋季'); await wait();
  check('秋→部位chip',txt().includes('上装')&&txt().includes('下装')&&txt().includes('裙子'));

  console.log('\n— 手动添加（改动1）—');
  await wait(); w.go('add','manual'); await wait();
  check('手动添加页渲染',txt().includes('物品名称'));
  check('归属是select',!!doc.getElementById('selOwner'));
  check('大类是select',!!doc.getElementById('selCategory'));
  check('归属5选项',doc.getElementById('selOwner')&&doc.getElementById('selOwner').options.length===5);

  const selO=doc.getElementById('selOwner');
  if(selO){selO.value='家当';await wait();w.onOwnerChange('家当');await wait();}
  check('家当→大类≥3',doc.getElementById('selCategory')&&doc.getElementById('selCategory').options.length>=3);

  if(selO){selO.value='我';await wait();w.onOwnerChange('我');await wait();}
  const selC=doc.getElementById('selCategory');
  if(selC){selC.value='衣物';await wait();w.onCategoryChange('衣物');await wait();}
  check('衣物→季节+部位select',!!doc.getElementById('selSeason')&&!!doc.getElementById('selPart'));
  if(selC){selC.value='护理';await wait();w.onCategoryChange('护理');await wait();}
  check('护理→瓶数field',!!doc.getElementById('itemBottles'));
  if(selC){selC.value='装备';await wait();w.onCategoryChange('装备');await wait();}
  check('装备→无季节无瓶数',!doc.getElementById('selSeason')&&!doc.getElementById('itemBottles'));
  if(selO){selO.value='家当';await wait();w.onOwnerChange('家当');await wait();}
  if(selC){selC.value='食物';await wait();w.onCategoryChange('食物');await wait();}
  check('家当食物→数量field',!!doc.getElementById('itemBottles'));

  console.log('\n— 照片上传（改动3）—');
  await wait(); w.go('add','manual'); await wait();
  check('有照片上传区',!!doc.querySelector('.photo-upload'));
  check('有input[file]',!!doc.getElementById('photoInput'));

  console.log('\n— 识别结果页 —');
  await wait(); w.go('recognize','photo'); await wait();
  check('识别结果渲染',txt().includes('AI 识别结果'));
  check('归类是select',doc.getElementById('rCat')&&doc.getElementById('rCat').tagName==='SELECT');
  check('归属是select',doc.getElementById('rOwner')&&doc.getElementById('rOwner').tagName==='SELECT');
  check('毛玻璃背景class',!!doc.querySelector('.glass-bg'));

  console.log('\n— 物品详情（改动5）—');
  await wait(); w.go('detail','1'); await wait();
  check('衣物有卖掉按钮',!!doc.querySelector('.dispose-btn'));
  check('卖掉按钮含"卖掉"',doc.querySelector('.dispose-btn')&&doc.querySelector('.dispose-btn').textContent.includes('卖掉'));
  await wait(); w.go('detail','17'); await wait();
  check('护理无卖掉按钮',!doc.querySelector('.dispose-btn'));

  console.log('\n— 家当（改动2+10）—');
  await wait(); w.go('family'); await wait();
  check('家当页渲染',!!doc.querySelector('.page'));
  const ft=full();
  check('默认分类(食物)无×',!/食物\s*×/.test(ft));
  check('默认分类(洗护)无×',!/洗护\s*×/.test(ft));
  check('默认分类(家电)无×',!/家电\s*×/.test(ft));

  console.log('\n— 用完消失（改动10）—');
  // 挂耳咖啡 id 107: stock12 using0 → 循环 fOpen/fFinish 直到 total<=0 触发确认
  for(let i=0;i<12;i++){w.fOpen('107');}
  for(let i=0;i<11;i++){w.fFinish('107');}
  w.fFinish('107'); await wait();
  check('用完最后一件→确认框',!!doc.getElementById('appModal'));
  await wait(); w.closeModal(); await wait();

  // +大类弹窗
  await wait(); w.addFamilyCat(); await wait();
  check('+大类弹modal',!!doc.getElementById('appModal'));
  await wait(); w.closeModal(); await wait();

  console.log('\n— 结构检查 —');
  await wait(); w.go('home'); await wait();
  check('无"更多"页',!full().includes('更多'));
  check('无最近添加',!txt().includes('最近添加'));

  finish();
}

function finish(){
  console.log('\n===================');
  console.log('结果: '+passed+' 通过 / '+failed+' 失败 / 共 '+(passed+failed)+' 项');
  process.exit(failed?1:0);
}

run().catch(e=>{console.error('测试异常:',e.message);process.exit(1)});
