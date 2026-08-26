// ===== 数据 =====
const FAMILY=[{name:'我',emoji:'👩',bg:'#f7dfd6'},{name:'儿子',emoji:'👦',bg:'#dceafa'},{name:'奶奶',emoji:'👵',bg:'#f5edc9'},{name:'爷爷',emoji:'👴',bg:'#e2ecdf'}];
const FIXED_CATS=['衣物','护理'];
let ownerCats={'我':['衣物','护理','家电','装备'],'儿子':['衣物','护理'],'奶奶':['衣物','护理'],'爷爷':['衣物','护理']};
const DEFAULT_FAMILY_CATS=['食物','洗护','家电'];
let familyCats=['食物','洗护','家电'];
let familySubs={'食物':['粮食','油','零食','调味'],'洗护':['洗头膏','沐浴露','洗衣','纸品'],'家电':[]};

const assets=[
 {id:1,name:'薄针织开衫',type:'衣物',emoji:'🧶',place:'主卧衣柜',owner:'我',wear:'42 次',cost:'¥68/次',season:'春',part:'上装'},
 {id:2,name:'碎花连衣裙',type:'衣物',emoji:'🌸',place:'主卧衣柜',owner:'我',wear:'12 次',cost:'¥96/次',season:'春',part:'裙子'},
 {id:3,name:'直筒牛仔裤',type:'衣物',emoji:'👖',place:'主卧衣柜',owner:'我',wear:'58 次',cost:'¥32/次',season:'春',part:'下装'},
 {id:4,name:'连帽卫衣',type:'衣物',emoji:'👕',place:'儿童房衣柜',owner:'儿子',wear:'26 次',cost:'¥19/次',season:'春',part:'上装'},
 {id:5,name:'白色T恤',type:'衣物',emoji:'🤍',place:'主卧衣柜',owner:'我',wear:'35 次',cost:'¥15/次',season:'夏',part:'上装'},
 {id:6,name:'棉麻连衣裙',type:'衣物',emoji:'🌿',place:'主卧衣柜',owner:'我',wear:'9 次',cost:'¥120/次',season:'夏',part:'裙子'},
 {id:7,name:'速干短裤',type:'衣物',emoji:'🩳',place:'儿童房衣柜',owner:'儿子',wear:'20 次',cost:'¥12/次',season:'夏',part:'下装'},
 {id:8,name:'防晒冰丝衫',type:'衣物',emoji:'⛱️',place:'主卧衣柜',owner:'我',wear:'16 次',cost:'¥42/次',season:'夏',part:'上装'},
 {id:9,name:'牛仔外套',type:'衣物',emoji:'🧥',place:'主卧衣柜',owner:'我',wear:'28 次',cost:'¥51/次',season:'秋',part:'上装'},
 {id:10,name:'针织连衣裙',type:'衣物',emoji:'🧶',place:'奶奶房衣柜',owner:'奶奶',wear:'15 次',cost:'¥40/次',season:'秋',part:'裙子'},
 {id:11,name:'阔腿休闲裤',type:'衣物',emoji:'👖',place:'主卧衣柜',owner:'我',wear:'31 次',cost:'¥28/次',season:'秋',part:'下装'},
 {id:12,name:'polo衫',type:'衣物',emoji:'👕',place:'爷爷房衣柜',owner:'爷爷',wear:'22 次',cost:'¥25/次',season:'秋',part:'上装'},
 {id:13,name:'短款羽绒服',type:'衣物',emoji:'🧥',place:'主卧衣柜',owner:'我',wear:'40 次',cost:'¥88/次',season:'冬',part:'上装'},
 {id:14,name:'加绒保暖裤',type:'衣物',emoji:'🧣',place:'奶奶房衣柜',owner:'奶奶',wear:'30 次',cost:'¥20/次',season:'冬',part:'下装'},
 {id:15,name:'高领毛衣',type:'衣物',emoji:'🧶',place:'爷爷房衣柜',owner:'爷爷',wear:'25 次',cost:'¥36/次',season:'冬',part:'上装'},
 {id:16,name:'毛呢半身裙',type:'衣物',emoji:'👗',place:'主卧衣柜',owner:'我',wear:'18 次',cost:'¥77/次',season:'冬',part:'裙子'},
 {id:17,name:'小棕瓶精华',type:'护理',emoji:'🧴',place:'镜柜',owner:'我',bottles:[{ml:'30ml',status:'在用',opened:'8月12日',deadline:'建议 2月12日 前用完'},{ml:'30ml',status:'库存'},{ml:'30ml',status:'库存'}]},
 {id:18,name:'防晒霜',type:'护理',emoji:'🧢',place:'镜柜',owner:'我',bottles:[{ml:'50ml',status:'在用',opened:'7月2日',deadline:'建议 1月2日 前用完'},{ml:'50ml',status:'库存'}]},
 {id:19,name:'儿童面霜',type:'护理',emoji:'🧸',place:'儿童房',owner:'儿子',bottles:[{ml:'80g',status:'在用',opened:'8月1日',deadline:'建议 2月1日 前用完'}]},
 {id:20,name:'面霜',type:'护理',emoji:'🧴',place:'奶奶房',owner:'奶奶',bottles:[{ml:'50g',status:'库存'},{ml:'50g',status:'库存'}]},
];
const familyItems=[
 {id:101,name:'洗发水（家庭装）',cat:'洗护',sub:'洗头膏',emoji:'🧴',stock:1,using:1,note:'750ml'},
 {id:102,name:'沐浴露',cat:'洗护',sub:'沐浴露',emoji:'🫧',stock:2,using:1},
 {id:103,name:'洗衣液',cat:'洗护',sub:'洗衣',emoji:'🧺',stock:2,using:1},
 {id:104,name:'卷纸',cat:'洗护',sub:'纸品',emoji:'🧻',stock:4,using:1},
 {id:105,name:'东北大米',cat:'食物',sub:'粮食',emoji:'🍚',stock:2,using:1,note:'在吃这袋 10斤装'},
 {id:106,name:'海天生抽',cat:'食物',sub:'调味',emoji:'🫙',stock:7,using:1,note:'别再买了！'},
 {id:107,name:'挂耳咖啡',cat:'食物',sub:'零食',emoji:'☕',stock:12,using:0},
 {id:108,name:'金龙鱼食用油',cat:'食物',sub:'油',emoji:'🫒',stock:1,using:1,note:'剩余约 20%'},
 {id:109,name:'Dyson 吹风机',cat:'家电',sub:'',emoji:'💨',plain:true,note:'浴室柜 · 共用'},
 {id:110,name:'电饭煲',cat:'家电',sub:'',emoji:'🍚',plain:true,note:'厨房 · 共用'},
];
let currentRoute='home',activeOwner='我',activeCategory='全部',activeSeason='全部',activePart='全部',activeFamilyCat='食物',activeFamilySub='全部';
let ownerSearchQ='';
const SEASONS=['全部','春','夏','秋','冬'];
const PARTS=['全部','上装','下装','裙子'];
const OWNERS=['我','儿子','奶奶','爷爷','家当'];
const app=document.querySelector('#app');

// ===== 框架 =====
function shell(content,title){app.innerHTML='<section class="page">'+content+'</section>';document.querySelectorAll('[data-route]').forEach(function(b){b.classList.toggle('active',b.dataset.route===currentRoute);b.onclick=function(){go(b.dataset.route)}});syncOwnerTab();if(title)document.title=title;}
function go(route,id){currentRoute=route;history.replaceState({},'','#'+route+(id?'/'+id:''));render(route,id)}
function syncOwnerTab(){var av=document.querySelector('#tabOwnerAvatar'),nm=document.querySelector('#tabOwnerName');var f=FAMILY.find(function(x){return x.name===activeOwner})||FAMILY[0];if(av)av.textContent=f.emoji;if(nm)nm.textContent=f.name;}
function header(kicker,title,back,action){return '<div class="topline"><div>'+(back?'<button class="back" onclick="go(\'home\')">‹</button>':'<p class="eyebrow">'+kicker+'</p>')+'<h1 class="title">'+title+'</h1></div>'+(action||'')}

// ===== 弹窗 =====
function showModal(html){var m=document.createElement('div');m.className='modal-overlay';m.id='appModal';m.innerHTML='<div class="modal-box">'+html+'</div>';m.onclick=function(e){if(e.target===m)closeModal()};document.body.appendChild(m)}
function closeModal(){var m=document.getElementById('appModal');if(m)m.remove()}
function confirmDialog(title,msg,onConfirm){showModal('<div class="modal-title">'+title+'</div><p class="modal-msg">'+msg+'</p><div class="modal-actions"><button class="primary" id="modalOk">确认</button><button class="primary ghost" id="modalCancel">取消</button></div>');document.getElementById('modalOk').onclick=function(){closeModal();onConfirm()};document.getElementById('modalCancel').onclick=closeModal}

// ===== 天气 =====
function weatherEmoji(code){if(code===0)return'☀️';if([1,2].indexOf(code)>=0)return'🌤️';if(code===3)return '☁️';if([45,48].indexOf(code)>=0)return '🌫️';return '🌤️'}
function weatherText(code){if(code===0)return '晴';if([1,2].indexOf(code)>=0)return '多云';if(code===3)return '阴';return '多云'}
async function loadWeather(){
 try{
  if(typeof fetch!=='function') return;
  var r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=23.0&longitude=113.38&current=temperature_2m,apparent_temperature,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1');
  var j = await r.json();
  var t=Math.round(j.current.temperature_2m);
  var box=document.querySelector('#weatherNow');
  if(box) box.innerHTML='<div class="weather-main"><span class="weather-emoji">'+weatherEmoji(j.current.weather_code)+'</span><div><div class="weather-temp">'+t+'°</div><div class="weather-desc">'+weatherText(j.current.weather_code)+' · 体感 '+Math.round(j.current.apparent_temperature)+'°</div></div></div><div class="weather-range">今日 '+Math.round(j.daily.temperature_2m_min[0])+'° ~ '+Math.round(j.daily.temperature_2m_max[0])+'° · 番禺</div>';
 }catch(e){}
}

// ===== 首页 =====
function home(){
  shell(header(weekdayCN(),'你好，洁梅',false,'<div class="avatar">👩</div>')+
  '<div class="card weather-hero"><p class="eyebrow">今日天气</p><div id="weatherNow"><div class="weather-main"><span class="weather-emoji">🌤️</span><div><div class="weather-temp">--°</div><div class="weather-desc">正在获取…</div></div></div><div class="weather-range">番禺 · 今日天气</div></div></div>'+
  '<div class="card outfit-card" onclick="go(\'assets\',\'clothing\')"><div class="outfit-left"><strong>✨ 今日穿搭推荐</strong><small>根据天气和你的衣橱，为你搭配</small></div><span class="chip active" style="padding:6px 12px">即将上线</span></div>'+
  '<div class="section-head"><h2>需要留意</h2><button class="link" onclick="go(\'family\')">查看全部</button></div>'+
  '<div class="list"><div class="card alert"><span class="dot"></span><p><b>酱油库存偏高</b><br><span class="sub">家里还有 7 瓶，预计可用 8 个月</span></p><span class="chev">›</span></div>'+
  '<div class="card alert"><span class="dot" style="background:var(--red)"></span><p><b>食用油快用完了</b><br><span class="sub">剩余约 20%，点家当里"用完" 就会提醒补货</span></p><span class="chev">›</span></div></div>'+
  '<div class="section-head"><h2>记一笔</h2></div>'+
  '<div class="quick-row"><button class="quick" onclick="go(\'add\',\'order\')"><span class="q-icon">🟧</span><span class="q-text"><strong>拍订单</strong><small>自动识别并入库</small></span></button>'+
  '<button class="quick" onclick="go(\'add\',\'photo\')"><span class="q-icon">📦</span><span class="q-text"><strong>拍包装</strong><small>识别物品信息</small></span></button>'+
  '<button class="quick" onclick="go(\'add\',\'manual\')"><span class="q-icon">＋</span><span class="q-text"><strong>手动添加</strong><small>记录一件物品</small></span></button></div>','Home Assets');
  loadWeather();
}
function weekdayCN(){var d=new Date();var wd=['日','一','二','三','四','五','六'][d.getDay()];return '星期'+wd+' · '+(d.getMonth()+1)+'月'+d.getDate()+'日'}

// ===== 我的宝贝 =====
function ownerRow(){return '<div class="owner-row">'+FAMILY.map(function(f){return '<button class="owner-pill '+(activeOwner===f.name?'active':'')+'" style="--obg:'+f.bg+'" onclick="activeOwner=\''+f.name+'\';activeCategory=\'全部\';activeSeason=\'全部\';activePart=\'全部\';ownerSearchQ=\'\';render(\'assets\')"><span class="owner-face">'+f.emoji+'</span><small>'+f.name+'</small></button>'}).join('')+'</div>'}

function ownerSearchBar(){
  var count=assets.filter(function(a){return a.owner===activeOwner}).length;
  return '<div class="owner-search-bar"><span>⌕</span><input placeholder="搜索 '+activeOwner+' 的物品…" value="'+ownerSearchQ+'" oninput="ownerSearchQ=this.value;render(\'assets\')" /><span class="owner-count">'+count+'件</span></div>'
}

function assetCard(a){
 if(a.type==='护理'&&a.bottles){
   var stock=a.bottles.filter(function(b){return b.status==='库存'}).length;
   var using=a.bottles.filter(function(b){return b.status==='在用'}).length;
   return '<div class="asset-card" onclick="go(\'detail\','+a.id+')"><div class="asset-art">'+a.emoji+'</div><div class="asset-meta"><strong>'+a.name+'</strong><small>护理 · 剩 '+(a.bottles.length-stock-using>0?a.bottles.length-stock-using:0)+'瓶 · 库存'+stock+' · 在用'+using+'</small></div></div>'
 }
 return '<div class="asset-card" onclick="go(\'detail\','+a.id+')"><div class="asset-art">'+a.emoji+'</div><div class="asset-meta"><strong>'+a.name+'</strong><small>'+(a.type==='衣物'?a.season+'季 · '+a.part:a.type)+' · '+a.place+'</small></div></div>'
}

function delOwnerCat(cat){
  if(FIXED_CATS.indexOf(cat)>=0){toast('衣物和护理是固定分类，不能删');return}
  var list=ownerCats[activeOwner];var i=list.indexOf(cat);
  if(i>=0){list.splice(i,1);if(activeCategory===cat)activeCategory='全部';toast('已删除分类：'+cat);render('assets')}
}

function addOwnerCat(){
  showModal('<div class="modal-title">新增大类</div><div class="field"><label>分类名称</label><input id="newCatName" placeholder="如：运动、书籍、兴趣" /></div><div class="modal-actions"><button class="primary" id="catAddOk">添加</button><button class="primary ghost" id="catAddCancel">取消</button></div>');
  document.getElementById('catAddOk').onclick=function(){
    var name=document.getElementById('newCatName').value.trim();
    if(!name){toast('名称不能为空');return}
    if(ownerCats[activeOwner].indexOf(name)>=0){toast('已有同名分类');return}
    ownerCats[activeOwner].push(name);
    activeCategory=name;
    closeModal();
    toast('已为'+activeOwner+'添加分类：'+name);
    render('assets');
  };
  document.getElementById('catAddCancel').onclick=closeModal
}

function assetsPage(){
 var cats=['全部'].concat(ownerCats[activeOwner]);
 var isCloth=activeCategory==='衣物';
 var isCare=activeCategory==='护理';
 if(isCloth&&activeSeason==='全部') activePart='全部';
 var list=assets.filter(function(a){return a.owner===activeOwner});
 if(ownerSearchQ.trim()){var q=ownerSearchQ.trim().toLowerCase();list=list.filter(function(a){return a.name.toLowerCase().indexOf(q)>=0})}
 if(activeCategory!=='全部') list=list.filter(function(a){return a.type===activeCategory});
 if(isCloth&&activeSeason!=='全部') list=list.filter(function(a){return a.season===activeSeason});
 if(isCloth&&activeSeason!=='全部'&&activePart!=='全部') list=list.filter(function(a){return a.part===activePart});

 var catChips=cats.map(function(x){
   var del=x!=='全部'&&FIXED_CATS.indexOf(x)<0?'<span class="cat-x" onclick="event.stopPropagation();delOwnerCat(\''+x+'\')">×</span>':'';
   return '<button class="chip '+(activeCategory===x?'active':'')+'" onclick="activeCategory=\''+x+'\';activeSeason=\'全部\';activePart=\'全部\';render(\'assets\')">'+x+del+'</button>'
 }).join('');

 var chips2='';
 if(isCloth) chips2='<div class="chips subchips">'+SEASONS.map(function(s){return '<button class="chip '+(activeSeason===s?'active':'')+'" onclick="activeSeason=\''+s+'\';render(\'assets\')">'+(s==='全部'?'全部季节':s+'季')+'</button>'}).join('')+'</div>';

 var chips3='';
 if(isCloth&&activeSeason!=='全部') chips3='<div class="chips subchips">'+PARTS.map(function(p){return '<button class="chip '+(activePart===p?'active':'')+'" onclick="activePart=\''+p+'\';render(\'assets\')">'+p+'</button>'}).join('')+'</div>';

 var crumb=isCloth&&activeSeason!=='全部'?activeSeason+'季'+(activePart!=='全部'?' · '+activePart:''):activeCategory==='全部'?'全部物品':activeCategory;

 var careTip='';
 if(isCare) careTip='<div class="card alert" style="margin:12px 0"><span class="dot" style="background:var(--green)"></span><p><b>护理怎么记</b><br><span class="sub">开新瓶时点 "开新瓶" 同步一次即可，不用每天记；系统自动算开封期限和剩余瓶数</span></p></div>';

 shell(header('','我的宝贝',false)+
 ownerRow()+
 '<div class="chips">'+catChips+'<button class="chip add-chip" onclick="addOwnerCat()">＋ 分类</button></div>'+
 chips2+chips3+careTip+
 '<div class="section-head"><h2>'+crumb+'</h2><span class="sub">'+list.length+' 件</span></div>'+
 '<div class="asset-grid">'+(list.map(assetCard).join('')||'<div class="empty" style="grid-column:1/-1"><span>🟪</span>这里还没有物品</div>')+'</div>')
}

// 衣物详情
function detail(id){
 var a=assets.find(function(x){return x.id==id})||assets[0];
 var bottlesHTML='';
 if(a.bottles){
   bottlesHTML='<div class="section-head"><h2>每一瓶</h2><button class="link" onclick="openBottle('+a.id+')">开新瓶</button></div><div class="list">'+
   a.bottles.map(function(b,i){
     return '<div class="row"><div class="row-icon">'+(b.status==='在用'?'🟢':'📦')+'</div><div class="row-main"><strong>第'+(i+1)+'瓶 · '+b.ml+'</strong><small>'+(b.status==='在用'?b.opened+' 开封 · '+b.deadline:'未开封')+'</small></div><span class="chip '+(b.status==='在用'?'active':'')+'" style="padding:6px 9px">'+b.status+'</span></div>'
   }).join('')+'</div>';
 }

 var disposeBtn='';

 shell(header('物品详情',a.name,true)+
 '<div class="detail-cover">'+a.emoji+'</div><h1 class="detail-title">'+a.name+'</h1><p class="sub">'+a.owner+' · '+a.type+'</p>'+
 (a.bottles?'<div class="stat-grid"><div class="stat"><strong>'+a.bottles.filter(function(b){return b.status==='库存'}).length+'</strong><small>库存瓶数</small></div><div class="stat"><strong>'+a.bottles.filter(function(b){return b.status==='在用'}).length+'</strong><small>在用瓶数</small></div><div class="stat"><strong>'+a.bottles[0].ml+'</strong><small>每瓶容量</small></div></div>':'<div class="stat-grid"><div class="stat"><strong>'+(a.wear||'—')+'</strong><small>使用次数</small></div><div class="stat"><strong>'+(a.cost||'—')+'</strong><small>使用成本</small></div><div class="stat"><strong>18 天</strong><small>最近使用</small></div></div>')+
 '<div class="card form-card"><div class="field"><label>存放位置</label><input value="'+(a.place||'')+'" />'+'<div class="field"><label>备注</label><input placeholder="添加备注" /></div></div>'+
 bottlesHTML+
 (a.bottles?'<button class="primary" onclick="openBottle('+a.id+')">开新瓶（开封同步一次）</button><button class="primary ghost" onclick="finishBottle('+a.id+')">这瓶用完了</button>':'<button class="primary" onclick="toast(\'已记录一次使用\')">记录今天使用</button>')+
 disposeBtn)
}

function openBottle(id){
 var a=assets.find(function(x){return x.id==id});
 var stockB=a.bottles.find(function(b){return b.status==='库存'});
 if(!stockB){toast('没有库存瓶了，该补货啦');return}
 stockB.status='在用';
 var d=new Date();
 stockB.opened=(d.getMonth()+1)+'月'+d.getDate()+'日';
 var dl=new Date(d.getTime()+180*86400000);
 stockB.deadline='建议 '+(dl.getMonth()+1)+'月'+dl.getDate()+'日 前用完';
 toast('已开新瓶 · 自动计算开封期限（6个月）');
 go('detail',id)
}

function finishBottle(id){
 var a=assets.find(function(x){return x.id==id});
 var usingB=a.bottles.find(function(b){return b.status==='在用'});
 if(!usingB){toast('当前没有在用的');return}
 usingB.status='已用完';
 toast('这瓶用完了 · 还剩库存 '+a.bottles.filter(function(b){return b.status==='库存'}).length+' 瓶');
 go('detail',id)
}


// ===== 家当 =====
function addFamilyCat(){
  showModal('<div class="modal-title">新增家当大类</div><div class="field"><label>分类名称</label><input id="newFCatName" placeholder="如：药品、工具" /></div><div class="modal-actions"><button class="primary" id="fcatAddOk">添加</button><button class="primary ghost" id="fcatAddCancel">取消</button></div>');
  document.getElementById('fcatAddOk').onclick=function(){
    var name=document.getElementById('newFCatName').value.trim();
    if(!name){toast('名称不能为空');return}
    if(familyCats.indexOf(name)>=0){toast('已有同名分类');return}
    familyCats.push(name);
    familySubs[name]=[];
    activeFamilyCat=name;
    activeFamilySub='全部';
    closeModal();
    toast('已添加家当大类：'+name);
    render('family');
  };
  document.getElementById('fcatAddCancel').onclick=closeModal
}

function delFamilyCat(cat){
  confirmDialog('删除分类','确定要删除「'+cat+'」这个分类吗？分类下的物品也会一起隐藏。',function(){
    var i=familyCats.indexOf(cat);
    if(i>=0){familyCats.splice(i,1);delete familySubs[cat];if(activeFamilyCat===cat){activeFamilyCat=familyCats[0]||'';activeFamilySub='全部'}toast('已删除：'+cat);render('family')}
  })
}

function addFamilySub(){
  var hints={'食物':'如：辣椒、饮料','洗护':'如：肥肠、牙刷','家电':'如：厨电'};
  showModal('<div class="modal-title">新增小分类</div><p class="modal-msg" style="text-align:left">在「'+activeFamilyCat+'」下添加小分类</p><div class="field"><label>小分类名称</label><input id="newFSubName" placeholder="'+(hints[activeFamilyCat]||'新分类')+'" /></div><div class="modal-actions"><button class="primary" id="fsubAddOk">添加</button><button class="primary ghost" id="fsubAddCancel">取消</button></div>');
  document.getElementById('fsubAddOk').onclick=function(){
    var name=document.getElementById('newFSubName').value.trim();
    if(!name){toast('名称不能为空');return}
    if((familySubs[activeFamilyCat]||[]).indexOf(name)>=0){toast('已有同名小分类');return}
    if(!familySubs[activeFamilyCat]) familySubs[activeFamilyCat]=[];
    familySubs[activeFamilyCat].push(name);
    activeFamilySub=name;
    closeModal();
    toast('已添加小分类：'+name);
    render('family');
  };
  document.getElementById('fsubAddCancel').onclick=closeModal
}

function familyRow(f){
 if(f.plain) return '<div class="row"><div class="row-icon">'+f.emoji+'</div><div class="row-main"><strong>'+f.name+'</strong><small>'+f.note+'</small></div><span class="chip" style="padding:6px 9px">共用</span></div>';
 var total=f.stock+f.using;
 var low=total<=1;
 var statusText = low ? '该补货' : (f.using > 0 ? '库存'+f.stock+' · 在用'+f.using : '库存'+f.stock);
 var noteText = f.sub + (f.note ? ' · '+f.note : '· 共 '+total+' 件');
 return '<div class="card" style="border-radius:18px;box-shadow:var(--shadow);padding:15px 16px">'+
  '<div style="display:flex;align-items:center;gap:13px"><div class="row-icon">'+f.emoji+'</div><div class="row-main"><strong>'+f.name+'</strong><small>'+noteText+'</small></div><span class="chip '+(low?'active':'')+'" style="padding:6px 9px">'+statusText+'</span></div>'+
  '<div class="row-actions"><button class="mini-btn" onclick="fOpen('+f.id+')">开封一件</button><button class="mini-btn" onclick="fFinish('+f.id+')">用完一件</button><button class="mini-btn" onclick="fAdd('+f.id+')">补了一件</button></div></div>'
}

function fOpen(id){var f=familyItems.find(function(x){return x.id==id});if(f.stock<=0){toast('没有库存了，先补一件吧');return}f.stock--;f.using++;toast(f.name+'：开封 → 库存 '+f.stock+' · 在用 '+f.using);render('family')}

function fFinish(id){
  var f=familyItems.find(function(x){return x.id==id});
  if(f.using<=0){toast('当前没有在用的');return}
  f.using--;
  var total=f.stock+f.using;
  if(total<=0){
    var idx=familyItems.findIndex(function(x){return x.id===id});
    if(idx>=0){familyItems.splice(idx,1);toast('已全部用完，已从列表移除');render('family')}
  }else{
    toast(f.name+'：用完整件 → 还剩 '+total+' 件');
    render('family');
  }
}

function fAdd(id){var f=familyItems.find(function(x){return x.id==id});f.stock++;toast(f.name+'：补货 → 库存 '+f.stock+' · 在用 '+f.using);render('family')}

function familyPage(){
 var subs=['全部'].concat(familySubs[activeFamilyCat]||[]);
 var list=familyItems.filter(function(f){return f.cat===activeFamilyCat});
 if(activeFamilySub!=='全部') list=list.filter(function(f){return f.sub===activeFamilySub});

 var catChips=familyCats.map(function(c){
   var isDefault=DEFAULT_FAMILY_CATS.indexOf(c)>=0;
   var del=!isDefault?'<span class="cat-x" onclick="event.stopPropagation();delFamilyCat(\''+c+'\')">×</span>':'';
   return '<button class="chip '+(activeFamilyCat===c?'active':'')+'" onclick="activeFamilyCat=\''+c+'\';activeFamilySub=\'全部\';render(\'family\')">'+c+del+'</button>'
 }).join('');

 shell(header('家庭共用 · '+familyItems.length+' 件','家当',false)+
 '<div class="chips">'+catChips+'<button class="chip add-chip" onclick="addFamilyCat()">＋ 大类</button></div>'+
 (activeFamilyCat?'<div class="chips subchips">'+subs.map(function(s){return '<button class="chip '+(activeFamilySub===s?'active':'')+'" onclick="activeFamilySub=\''+s+'\';render(\'family\')">'+s+'</button>'}).join('')+'<button class="chip add-chip" onclick="addFamilySub()">＋ 小类</button></div>':'')+
 '<div class="section-head"><h2>'+activeFamilyCat+(activeFamilySub!=='全部'?' · '+activeFamilySub:'')+'</h2><span class="sub">'+list.length+' 件</span></div>'+
 '<div class="list">'+(list.map(familyRow).join('')||'<div class="empty"><span>🌠</span>这里还没有物品</div>')+'</div>'+
 '<div class="card alert" style="margin-top:18px"><span class="dot" style="background:var(--blue)"></span><p><b>家当怎么记</b><br><span class="sub">开封一件：库存 － 1 · 在用 + 1；用完一件：在用 － 1；总数 ≤ 1 自动提醒补货；全部用完后会自动从列表消失</span></p></div>')
}


// ===== 添加 =====
function manualFormHTML(){
  return '<div class="card form-card">'+
  '<div class="field"><label>物品名称</label><input id="itemName" placeholder="如：Uniqlo 羽绒服" /></div>'+
  '<div class="field"><label>归属</label><select id="selOwner">'+OWNERS.map(function(o){return '<option value="'+o+'" '+(o===activeOwner?'selected':'')+'>'+o+'</option>'}).join('')+'</select></div>'+
  '<div class="field"><label>大类</label><input id="itemCategory" placeholder="如：衣物 / 护理 / 装备" /></div>'+
  '<div class="field"><label>存放位置</label><input id="itemPlace" placeholder="如：主卧衣柜" /></div>'+
  '<button class="primary" onclick="saveManualItem()">保存</button></div>'
}

function saveManualItem(){
  var input=document.querySelector('#itemName');
  if(!input.value.trim()){toast('请先填写物品名称');return}
  toast('已添加');setTimeout(function(){go('assets')},600)
}

function addPage(mode){
  var modes=[['order','拍订单'],['photo','拍包装'],['manual','手动添加']];
  shell(header('AI 智能录入','添加物品',true)+
  '<div class="mode-tabs">'+modes.map(function(m){return '<button class="'+(mode===m[0]?'active':'')+'" onclick="go(\'add\',\''+m[0]+'\')">'+m[1]+'</button>'}).join('')+'</div>'+
  (mode==='manual'?manualFormHTML():
  '<div class="dropzone" onclick="go(\'recognize\',\''+mode+'\')"><span>'+(mode==='order'?'🟧':'📦')+'</span><strong>'+(mode==='order'?'上传订单截图':'拍摄或上传包装照片')+'</strong><small>支持 JPG、PNG · AI 会自动识别物品信息</small></div>'+
  '<div class="section-head"><h2>AI 会识别</h2></div><div class="list">'+
  '<div class="row"><div class="row-icon">✦</div><div class="row-main"><strong>品牌与品名</strong><small>自动提取商品核心信息</small></div><span class="chev">✓</span></div>'+
  '<div class="row"><div class="row-icon">⌌</div><div class="row-main"><strong>分类 / 归属 / 库存建议</strong><small>自动判断个人还是家庭共用</small></div><span class="chev">✓</span></div>'+
  '<div class="row"><div class="row-icon">¥</div><div class="row-main"><strong>价格与购买时间</strong><small>方便追踪资产价值</small></div><span class="chev">✓</span></div></div>'))
}

function recognizePage(source){
  var isOrder=source==='order';
  var sample=isOrder?
    {name:'优衣库 UNIQLO 童装连帽卫衣',brand:'UNIQLO 优衣库',price:'¥149.00',date:'2026-08-20',category:'衣物',owner:'儿子',season:'秋',part:'上装',place:'儿童衣柜',note:'订单号: JD2026082088xxxx'}:
    {name:'舒肤佳 纯白沐浴露 720ml',brand:'舒肤佳 Safeguard',price:'¥29.90',date:'',category:'洗护',owner:'家当',sub:'沐浴露',stock:2,place:'浴室柜',note:''};

  var seasonPartHtml=sample.category==='衣物'?
    '<div class="field-row"><div class="field half"><label>季节</label><select id="rSeason"><option value="春" '+(sample.season==='春'?'selected':'')+'>春季</option><option value="夏" '+(sample.season==='夏'?'selected':'')+'>夏季</option><option value="秋" '+(sample.season==='秋'?'selected':'')+'>秋季</option><option value="冬" '+(sample.season==='冬'?'selected':'')+'>冬季</option></select></div><div class="field half"><label>部位</label><select id="rPart"><option value="上装" '+(sample.part==='上装'?'selected':'')+'>上装</option><option value="下装" '+(sample.part==='下装'?'selected':'')+'>下装</option><option value="裙子" '+(sample.part==='裙子'?'selected':'')+'>裙子</option></select></div></div>':'';

  var subStockHtml=(sample.category==='洗护'||sample.category==='食物')?
    '<div class="field-row"><div class="field half"><label>小分类</label><select id="rSub"><option value="'+(sample.sub||'')+'" selected>'+(sample.sub||'请选择')+'</option></select></div><div class="field half"><label>数量</label><input id="rStock" value="'+(sample.stock||1)+'" /></div></div>':'';

  shell(header(isOrder?'订单识别结果':'识别结果','确认信息',true)+
  '<div class="card rec-preview"><div class="rec-thumb glass-bg">'+(isOrder?'🟧':'📦')+'</div><div class="rec-meta"><p class="eyebrow">AI 识别结果 · 可编辑修正</p><p class="sub">以下信息均由 AI 自动提取，如有不准请直接修改</p></div></div>'+
  '<div class="card form-card">'+
  '<div class="field"><label>物品名称</label><input id="rName" value="'+sample.name+'" /></div>'+
  '<div class="field"><label>品牌</label><input id="rBrand" value="'+sample.brand+'" /></div>'+
  (isOrder?'<div class="field-row"><div class="field half"><label>价格</label><input id="rPrice" value="'+sample.price+'" /></div><div class="field half"><label>购买日期</label><input id="rDate" value="'+sample.date+'" /></div></div>':'')+
  '<div class="field-row"><div class="field half"><label>归类</label><select id="rCat"><option value="'+sample.category+'" selected>'+sample.category+'</option></select></div><div class="field half"><label>归属</label><select id="rOwner"><option value="'+sample.owner+'" selected>'+sample.owner+'</option></select></div></div>'+
  '<div id="recDynamicFields">'+seasonPartHtml+subStockHtml+'</div>'+
  '<div class="field"><label>存放位置</label><input id="rPlace" value="'+sample.place+'" placeholder="如：主卧衣柜" /></div>'+
  '<div class="field"><label>备注</label><input id="rNote" value="'+sample.note+'" placeholder="选填" /></div></div>'+
  '<button class="primary" onclick="toast(\'已保存到物品库\');setTimeout(function(){go(\'assets\')},700)">确认保存</button>'+
  '<button class="primary ghost" style="margin-top:10px" onclick="go(\'add\',\''+source+'\')">重新拍照识别</button>','Recognize')
}


// ===== 搜索 =====
function search(){
  shell(header('快速查找','搜索',true)+
  '<div class="searchbox"><span>⌕</span><input autofocus id="searchInput" placeholder="试试 裙子" oninput="filterSearch(this.value)" /></div>'+
  '<p class="eyebrow">你可能想找</p><div class="chips">'+
  '<button class="chip" onclick="document.getElementById(\'searchInput\').value=\'裙子\';filterSearch(\'裙子\')">裙子</button>'+
  '<button class="chip" onclick="document.getElementById(\'searchInput\').value=\'小棕瓶\';filterSearch(\'小棕瓶\')">我的精华</button>'+
  '<button class="chip" onclick="document.getElementById(\'searchInput\').value=\'洗发水\';filterSearch(\'洗发水\')">家当·洗发水</button></div>'+
  '<div id="searchResults" class="list" style="margin-top:22px">'+
  assets.map(searchRow).join('')+familyItems.map(familySearchRow).join('')+'</div>')
}
function searchRow(a){return '<div class="row" onclick="go(\'detail\','+a.id+')"><div class="row-icon">'+a.emoji+'</div><div class="row-main"><strong>'+a.name+'</strong><small>'+a.owner+' · '+(a.type==='衣物'?a.season+'季'+a.part:a.type)+'</small></div><span class="chev">›</span></div>'}
function familySearchRow(f){return '<div class="row" onclick="go(\'family\')"><div class="row-icon">'+f.emoji+'</div><div class="row-main"><strong>'+f.name+'</strong><small>家当 · '+f.cat+(f.sub?' · '+f.sub:'')+'</small></div><span class="chev">›</span></div>'}
function filterSearch(q){
  var ql=q.toLowerCase();
  var mine=assets.filter(function(a){return (a.name+a.type+a.place+a.owner).toLowerCase().indexOf(ql)>=0}).map(searchRow);
  var fam=familyItems.filter(function(f){return (f.name+f.cat+(f.sub||'')).toLowerCase().indexOf(ql)>=0}).map(familySearchRow);
  document.querySelector('#searchResults').innerHTML=mine.concat(fam).join('')||'<div class="empty"><span>⌕</span>没有找到相关物品</div>'
}

function toast(msg){var t=document.querySelector('#toast');t.textContent=msg;t.classList.add('show');setTimeout(function(){t.classList.remove('show')},2200)}
function render(route,id){({home:home,assets:assetsPage,add:addPage,detail:detail,family:familyPage,search:search,recognize:recognizePage}[route]||home)(id)}
window.addEventListener('popstate',function(){render(location.hash.slice(1).split('/')[0]||'home')});
render('home');
