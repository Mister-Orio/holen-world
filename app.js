/* ================================================================
   МИР ХОЛЭНА — ИНТЕРФЕЙС ПЛАТФОРМЫ v0.4
   01. Данные                 data.js
   02. Навигация              navigate()
   03. Каталог отрядов        renderSquads(), openSheet()
   04. Справочник правил      renderRules()
   05. Демо комнаты и ГМа     renderDemo(), nextDemoTurn()
   Сетевая часть НЕ подключена: это автономный прототип.
   ================================================================ */

const DATA = window.ANT_DATA;
const $ = id => document.getElementById(id);
const VIEWS = ['home','journeys','insects','classes','races','profile','auth','squads','sheet','bestiary','rules','lore','rooms','gm'];
const BREADCRUMBS = {home:'Главная',journeys:'Путешествия Холэна',insects:'Муравьиная революция',classes:'Классы',races:'Расы',profile:'Профиль',auth:'Аккаунт',squads:'Боевые отряды',sheet:'Лист отряда',bestiary:'Бестиарий',rules:'Правила',lore:'Мир Холэна',rooms:'Комнаты',gm:'Панель ГМа'};
const COLONY_LABEL = {black:'Чёрная колония',green:'Зелёная колония'};

// В интерфейс нельзя подставлять сырой текст пользователя через innerHTML.
// Эта функция экранирует даже локальные строки библиотеки.
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// 02. НАВИГАЦИЯ
let currentView = 'home';
let navigationTrail=['home'];
const TRAILS={home:['home'],squads:['home','insects','squads'],sheet:['home','insects','squads','sheet'],insects:['home','insects'],journeys:['home','journeys']};
function updateBreadcrumb(){
 const el=$('breadcrumbs');if(!el)return;
 const names=['ХОЛЭН',...navigationTrail.map(v=>BREADCRUMBS[v]||v)];
 el.innerHTML='<button type="button" class="crumb-link" data-crumb="home">ХОЛЭН</button>'+
 navigationTrail.map((v,i)=>'<span class="crumb-sep">/</span><button type="button" class="crumb-link '+(i===navigationTrail.length-1?'crumb-current':'')+'" data-crumb="'+escapeHtml(v)+'">'+escapeHtml(BREADCRUMBS[v]||v)+'</button>').join('');
}
function closeMenu() {
  $('sidebar').classList.remove('open');
  $('mobile-scrim').hidden = true;
  $('menu-toggle').setAttribute('aria-expanded','false');
}
function navigate(name, {push=true}={}) {
  const view = VIEWS.includes(name)?name:'home';
  const previous=currentView;
  currentView=view;
  if(view==='home')navigationTrail=['home'];
  else if(history.state?.trail && !push && history.state.view===view)navigationTrail=history.state.trail;
  else if(navigationTrail.includes(view))navigationTrail=navigationTrail.slice(0,navigationTrail.indexOf(view)+1);
  else if(view==='squads')navigationTrail=['home','insects','squads'];
  else if(view==='sheet')navigationTrail=[...navigationTrail.filter(v=>v!=='sheet'),'sheet'];
  else if((previous==='insects'||previous==='journeys') && !['rooms','gm','profile','auth'].includes(view))
    navigationTrail=['home',previous,view];
  else navigationTrail=['home',view];
  updateBreadcrumb();
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id === `view-${view}`));
  document.querySelectorAll('[data-view]').forEach(el => el.classList.toggle('active', el.getAttribute('data-view') === view));
  if(push && window.location.hash !== `#${view}`) history.pushState({view,from:previous,trail:[...navigationTrail],inApp:true},'',`#${view}`);
  $('page-back-strip').hidden=view==='home';
  closeMenu();
  if(view==='sheet' && !$('sheet-frame').getAttribute('src')) return navigate('squads');
  window.scrollTo({top:0,behavior:'instant'});
}

// Кнопка «Назад» повторяет браузерную историю; при прямом открытии страницы — главная.
function goBack() {
  if (history.state?.inApp && history.state?.from && history.state.from!==currentView) {history.back();return;}
  navigate(currentView==='sheet' ? sheetOrigin : 'home');
}


// 03. КАТАЛОГ ОТРЯДОВ
let squadFilter='all';
let sheetOrigin='squads';
function renderSquads() {
  const query=$('squad-search').value.toLocaleLowerCase('ru').trim();
  const list=DATA.squads.filter(s=>(squadFilter==='all'||s.colony===squadFilter) && `${s.name} ${s.role} ${s.short}`.toLocaleLowerCase('ru').includes(query));
  $('squad-grid').innerHTML=list.map(s=>`
    <article class="squad-card">
      <div class="card-top"><span class="squad-symbol ${s.colony==='green'?'green':''}" aria-hidden="true">${escapeHtml(s.icon)}</span><span class="colony-label ${s.colony==='green'?'green':''}">${escapeHtml(COLONY_LABEL[s.colony])}</span></div>
      <h3>${escapeHtml(s.name)}</h3><p>${escapeHtml(s.role)} · ${escapeHtml(s.short)}</p>
      <div class="mini-stats"><div><b>${s.hp}</b><small>ОЗ</small></div><div><b>${s.ac}</b><small>КД</small></div><div><b>${s.speed}</b><small>Скорость</small></div></div>
      <button type="button" class="btn subtle" data-sheet="${escapeHtml(s.id)}">Открыть лист →</button>
    </article>`).join('');
  $('squad-empty').hidden=list.length>0;
  $('squad-grid').querySelectorAll('[data-sheet]').forEach(b=>b.addEventListener('click',()=>openSheet(b.dataset.sheet)));
}
function openSheet(id) {
  sheetOrigin=currentView || 'squads'; // Откуда открыли: каталог пака или общий каталог классов
  const sheet=DATA.squads.find(s=>s.id===id);
  if(!sheet) return;
  const address=`sheets/${sheet.id}.html`;
  $('sheet-heading').textContent=sheet.name;
  $('sheet-back').textContent='← Назад: '+(BREADCRUMBS[sheetOrigin]||'Каталог');
  $('sheet-frame').src=address;
  $('sheet-popout').href=address;
  navigate('sheet');
}

// 04. БИБЛИОТЕКА ПРАВИЛ: один пакет — свой справочник.
// Важно: глобальный DATA.rules предназначен только для «Муравьиной революции».
let currentRulesPack='journeys';
const RULEPACKS={
  journeys:{title:'Путешествия Холэна',description:'Книга «Великий пакт», редакция 1.7. D&D 5e (2014) с законами и лицензиями Холэна; доступна полная версия исходного документа.'},
  insects:{title:'Муравьиная революция',description:'Утверждённые общие правила отрядного варгейма: один жетон, потери, отдых и резервы. Не путать с обычной D&D.'}
};
function openRules(pack, {focusBook=false}={}) {
  currentRulesPack=RULEPACKS[pack]?pack:'journeys';
  renderRules();
  navigate('rules');
  if (focusBook) {
    // Не открываем несуществующий файл, а переводим к месту будущей книги.
    $('player-book').scrollIntoView({behavior:'smooth',block:'center'});
  }
}
function renderRules() {
  const source=currentRulesPack==='insects'?DATA.rules:window.HOLEN_RULES_DATA.journeys;
  $('rules-container').innerHTML = source.map((rule,i)=>`
    <details class="rule-block" ${i===0?'open':''}>
      <summary>${String(i+1).padStart(2,'0')} · ${escapeHtml(rule.title)}</summary>
      <ul>${rule.items.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </details>`).join('');
  $('rules-pack-title').textContent=RULEPACKS[currentRulesPack].title;
  $('rules-pack-description').textContent=RULEPACKS[currentRulesPack].description;
  $('spell-registry').hidden=currentRulesPack!=='journeys';
  $('player-book-heading').textContent='Книга игрока · '+RULEPACKS[currentRulesPack].title;
  // 04.1 ДВЕ КНИГИ ИГРОКА: файлы хранятся в books/ и выбираются по текущему паку.
  // ВНИМАНИЕ: «Великий пакт 1.7» включён целиком с разрешения владельца.
  // При публикации сайта PDF будет доступен любому посетителю, даже без аккаунта.
  const playerBooks={
    journeys:{file:'books/velikiy_pakt_holen_1_7.pdf',desc:'«Великий пакт», редакция 1.7: полная энциклопедия и правила мира Холэна в исходной формулировке. PDF содержит 47 страниц и таблицы.'},
    insects:{file:'books/muravinaya_revolyutsiya_guide_v01.pdf',desc:'Полевое руководство игрока: основные правила, роли отрядов и советы для первой игры. Черновая редакция — числовые параметры сверяются с листами.'}
  };
  const book=playerBooks[currentRulesPack];
  $('player-book-description').textContent=book.desc;
  $('player-book-link').href=book.file;
  $('player-book-link').hidden=false;
  document.querySelector('.book-empty-label').hidden=true;
  document.querySelectorAll('[data-select-rules]').forEach(btn=>{
    let active=btn.dataset.selectRules===currentRulesPack;
    btn.setAttribute('aria-pressed',String(active));btn.classList.toggle('selected',active);
  });
  if (currentRulesPack==='journeys') renderSpells();
}
// ==== ОБЩИЕ МУЛЬТИФИЛЬТРЫ ==== 
// Внутри одного типа фильтра работает «ИЛИ», между разными типами — «И».
const SPELL_FACETS = [
  {key:'level', label:'Круг заклинания'},
  {key:'school', label:'Школа магии'},
  {key:'category', label:'Правовой статус'},
  {key:'license', label:'Лицензия / разрешение'}
];
const SPELL_FILTERS = Object.fromEntries(SPELL_FACETS.map(f=>[f.key,new Set()]));

const ITEM_PACKS = [
  {id:'journeys', name:'Путешествия Холэна'},
  {id:'insects', name:'Муравьиная революция'}
];
const ITEM_FACETS = [
  {key:'magic',label:'Тип предмета',options:[
    {value:'true', label:'Магический'}, {value:'false', label:'Обычный'}]},
  {key:'rarity',label:'Редкость',options:[
    'Без редкости','Обычный','Необычный','Редкий','Очень редкий','Легендарный','Артефакт'
  ].map(x=>({value:x,label:x}))},
  {key:'packs',label:'Поддерживаемые паки',options:ITEM_PACKS.map(x=>({value:x.id,label:x.name}))}
];
const ITEM_FILTERS = Object.fromEntries(ITEM_FACETS.map(f=>[f.key,new Set()]));

function getFacetOptions(data,key) {
  // Значения берутся ИЗ РЕЕСТРА, чтобы не выдумывать уровни/лицензии.
  const vals=[...new Set(data.map(x=>String(x[key]??'').trim()).filter(Boolean))];
  if(key==='level') return vals.sort((a,b)=>a==='Заговор'?-1:b==='Заговор'?1:Number(a)-Number(b));
  return vals.sort((a,b)=>a.localeCompare(b,'ru'));
}
function mountFacetControls(containerId,facets,state,data,rerender) {
  const container=$(containerId);
  container.innerHTML=facets.map(f=>{
    const opts=f.options||getFacetOptions(data,f.key).map(s=>({value:s,label:s}));
    const current=state[f.key].size;
    return `<details class="facet-box" data-facet="${escapeHtml(f.key)}"><summary><span>${escapeHtml(f.label)}</span><span class="facet-count" data-count="${escapeHtml(f.key)}">${current?current+' выбрано':'Все'}</span></summary><div class="facet-options">
      ${opts.map((o,i)=>`<label class="facet-option"><input type="checkbox" data-filter-key="${escapeHtml(f.key)}" value="${escapeHtml(o.value)}" ${state[f.key].has(o.value)?'checked':''}/><span>${escapeHtml(o.label)}</span></label>`).join('')}
      </div></details>`;
  }).join('');
  container.querySelectorAll('input[type=checkbox]').forEach(c=>c.addEventListener('change',()=>{
    const s=state[c.dataset.filterKey];
    if(c.checked)s.add(c.value); else s.delete(c.value);
    const tag=container.querySelector(`[data-count="${c.dataset.filterKey}"]`);
    if(tag) tag.textContent=s.size?s.size+' выбрано':'Все';
    rerender();
  }));
}
function passFacets(record,facetSets){
  return Object.entries(facetSets).every(([key,selected])=>{
    if(!selected.size) return true;
    if(Array.isArray(record[key])) return record[key].some(x=>selected.has(String(x)));
    return selected.has(String(record[key]??''));
  });
}
function resetFacets(state,containerId,rerender) {
  Object.values(state).forEach(s=>s.clear());
  const wrap=$(containerId);
  wrap.querySelectorAll('input[type=checkbox]').forEach(c=>c.checked=false);
  wrap.querySelectorAll('[data-count]').forEach(x=>x.textContent='Все');
  rerender();
}
function renderSpells(){
  const q=$('spell-search').value.trim().toLocaleLowerCase('ru');
  const all=window.HOLEN_RULES_DATA.spells;
  const list=all.filter(s=>passFacets(s,SPELL_FILTERS)&&
    `${s.name} ${s.level} ${s.school} ${s.category} ${s.license}`.toLocaleLowerCase('ru').includes(q));
  $('spell-registry-count').textContent=`Найдено: ${list.length}`;
  $('spell-filter-summary').textContent=`Подходит: ${list.length} из ${all.length} заклинаний`;
  // Не рендерим сотни элементов одновременно на телефоне.
  $('spell-list').innerHTML=list.slice(0,60).map(s=>`<div class="spell-entry"><div><strong>${escapeHtml(s.name)}</strong><small>${escapeHtml(s.level)} · ${escapeHtml(s.school)}</small></div><div><span>${escapeHtml(s.category)}</span><small>${escapeHtml(s.license)}</small></div></div>`).join('')||'<p class="muted">Нет заклинаний по выбранным условиям.</p>';
  if(list.length>60) $('spell-list').insertAdjacentHTML('beforeend',`<p class="tiny-note">Показаны первые 60 из ${list.length}. Уточни поиск или фильтры.</p>`);
}
function renderItems() {
  const q=$('item-search').value.trim().toLocaleLowerCase('ru');
  const all=window.HOLEN_ITEMS||[];
  const list=all.filter(item=>passFacets(item,ITEM_FILTERS)&&
    `${item.name||''} ${item.description||''}`.toLocaleLowerCase('ru').includes(q));
  $('item-count').textContent=`Найдено: ${list.length}`;
  $('item-filter-summary').textContent=`Подходит: ${list.length} из ${all.length} предметов`;
  $('item-empty').hidden=list.length>0||all.length>0;
  $('item-list').innerHTML=list.slice(0,60).map(item=>`<article class="item-entry"><div><strong>${escapeHtml(item.name||'Без названия')}</strong><p>${escapeHtml(item.description||'')}</p></div><div class="item-tags"><span>${item.magic?'Магический':'Обычный'}</span><span>${escapeHtml(item.rarity||'Без редкости')}</span></div></article>`).join('');
  if(all.length&&!list.length) $('item-list').innerHTML='<p class="muted">Нет предметов по выбранным условиям.</p>';
  if(list.length>60) $('item-list').insertAdjacentHTML('beforeend',`<p class="tiny-note">Показаны первые 60 из ${list.length}.</p>`);
}
function initLibraryFilters(){
  mountFacetControls('spell-filter-groups',SPELL_FACETS,SPELL_FILTERS,window.HOLEN_RULES_DATA.spells,renderSpells);
  mountFacetControls('item-filter-groups',ITEM_FACETS,ITEM_FILTERS,window.HOLEN_ITEMS||[],renderItems);
  $('spell-clear').addEventListener('click',()=>{ $('spell-search').value='';resetFacets(SPELL_FILTERS,'spell-filter-groups',renderSpells); });
  $('item-clear').addEventListener('click',()=>{ $('item-search').value='';resetFacets(ITEM_FILTERS,'item-filter-groups',renderItems); });
  $('item-search').addEventListener('input',renderItems);
  renderSpells();renderItems();
}

// 05. КОМНАТЫ И ПАНЕЛЬ ГМа — см. room-engine.js и room-ui.js.

// ================================================================
// 06. КЛАССЫ И РАСЫ: ИСТОЧНИКИ, КАТАЛОГ, ИКОНКИ
// Данные лежат в catalog-data.js: здесь только логика отображения.
// ================================================================
const CATALOG = window.HOLEN_CATALOG;
const catalogState = {
  classes:{category:'official', source:'dnd2014'},
  races:{category:'official', source:'dnd2014'}
};
const SOURCE_ICONS = {
  book:'<path d="M12 7c-3.6-2-6.6-2.4-9-1v13c2.4-1.4 5.4-1 9 1 3.6-2 6.6-2.4 9-1V6c-2.4-1.4-5.4-1-9 1Z"/><path d="M12 7v13"/>',
  bug:'<path d="M8 6c0-2 1.5-3 4-3s4 1 4 3M8 10c0-2.5 1.5-4 4-4s4 1.5 4 4v4c0 3-1.5 5-4 5s-4-2-4-5v-4Z"/><path d="M12 6v13M8 10 4 8M16 10l4-2M8 14l-4 2M16 14l4 2M8 17l-3 4M16 17l3 4"/>'
};
function iconSvg(kind) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SOURCE_ICONS[kind]||SOURCE_ICONS.book}</svg>`;
}
function showCatalog(type, category='homebrew') {
  const state=catalogState[type];
  if(!state) return;
  state.category=category;
  state.source=CATALOG[type][category][0]?.id||null;
  renderCatalog(type);
  navigate(type);
}
function renderCatalog(type) {
  const state=catalogState[type];
  const sources=CATALOG[type][state.category];
  if(!sources.some(x=>x.id===state.source)) state.source=sources[0]?.id||null;
  document.querySelectorAll(`[data-kind="${type}"][data-category]`).forEach(btn=>{
    const active=btn.dataset.category===state.category;
    btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));
  });
  const srcWrap=$(`${type}-sources`);
  srcWrap.innerHTML=sources.map(src=>`
    <button type="button" class="source-card ${src.icon==='bug'?'source-insects':'source-dnd'} ${state.source===src.id?'selected':''}" data-select-source="${escapeHtml(src.id)}" data-target-type="${type}" aria-pressed="${state.source===src.id}">
      <span class="source-symbol">${iconSvg(src.icon)}</span>
      <span class="source-info"><strong>${escapeHtml(src.name)}</strong><small>${escapeHtml(src.subtitle)}</small></span>
      <span class="source-count">${escapeHtml(src.count)}</span><span class="source-chevron" aria-hidden="true">⌄</span>
    </button>`).join('');
  const selected=sources.find(x=>x.id===state.source);
  const results=$(`${type}-results`);
  if(!selected) {results.innerHTML='';return;}
  let items=[];
  if(selected.squadIds) {
    items=selected.squadIds.map(id=>DATA.squads.find(s=>s.id===id)).filter(Boolean).map(s=>`
      <article class="catalog-item sheet-list-item"><span class="catalog-item-symbol" aria-hidden="true">${escapeHtml(s.icon)}</span><div class="catalog-item-content"><strong>${escapeHtml(s.name)}</strong><small>${escapeHtml(s.role)} · ${escapeHtml(COLONY_LABEL[s.colony])}</small></div><button type="button" class="catalog-action" data-sheet="${escapeHtml(s.id)}">Лист ↗</button></article>`);
  } else {
    items=selected.items.map(item=>{
      const itemData=typeof item==='string'?{name:item}:item;
      return `<article class="catalog-item"><span class="catalog-item-symbol muted-glyph" aria-hidden="true">◈</span><div class="catalog-item-content"><strong>${escapeHtml(itemData.name)}</strong>${itemData.description?`<small>${escapeHtml(itemData.description)}</small>`:''}</div>${itemData.tag?`<span class="item-tag">${escapeHtml(itemData.tag)}</span>`:''}</article>`;
    });
  }
  results.innerHTML=`<div class="catalog-results-heading"><div><span class="overline">${state.category==='official'?'ОФИЦИАЛЬНЫЙ ИСТОЧНИК':'АВТОРСКИЙ ПАК'}</span><h2>${escapeHtml(selected.name)}</h2></div><span class="muted">${escapeHtml(selected.count)}</span></div><div class="catalog-items">${items.join('')}</div><p class="source-note">${escapeHtml(selected.note)}</p>`;
  results.querySelectorAll('[data-sheet]').forEach(btn=>btn.addEventListener('click',()=>openSheet(btn.dataset.sheet)));
  srcWrap.querySelectorAll('[data-select-source]').forEach(btn=>btn.addEventListener('click',()=>{
    state.source=btn.dataset.selectSource;renderCatalog(type);
  }));
}

// ================================================================
// 07. ЛОКАЛЬНЫЙ ПРОФИЛЬ — в будущем будет серверная авторизация.
// Здесь хранится только ник в этом браузере.
// ================================================================
const PROFILE_KEY='holen_platform_local_nickname_v02';
function initProfile() {
  try { $('profile-name').value=localStorage.getItem(PROFILE_KEY)||''; } catch(e) {/* приватный режим */}
  $('profile-save').addEventListener('click',()=>{
    const name=$('profile-name').value.trim();
    if(!name) {$('profile-message').textContent='Введи ник перед сохранением.';return;}
    try {localStorage.setItem(PROFILE_KEY,name);$('profile-message').textContent='Ник сохранён в этом браузере.';}
    catch(e) {$('profile-message').textContent='Браузер не разрешил локальное сохранение.';}
  });
}

// 06. ПОДКЛЮЧЕНИЕ КНОПОК. Код остаётся без библиотек и работает офлайн.
// Навигация по хлебным крошкам, возврат домой и сворачивание панели.
$('page-home').addEventListener('click',()=>navigate('home'));
$('breadcrumbs').addEventListener('click',event=>{
 const t=event.target.closest('[data-crumb]');
 if(t)navigate(t.dataset.crumb);
});
const SIDEBAR_PREF='holen-sidebar-hidden-v1';
function setSidebarHidden(hidden){
 document.body.classList.toggle('sidebar-collapsed',!!hidden);
 $('sidebar-toggle').setAttribute('aria-expanded',String(!hidden));
 $('sidebar-toggle').setAttribute('aria-label',hidden?'Показать боковую панель':'Скрыть боковую панель');
 try{localStorage.setItem(SIDEBAR_PREF,hidden?'1':'0');}catch(_){}
}
try{setSidebarHidden(localStorage.getItem(SIDEBAR_PREF)==='1');}catch(_){setSidebarHidden(false);}
$('sidebar-toggle').addEventListener('click',()=>setSidebarHidden(!document.body.classList.contains('sidebar-collapsed')));
$('page-back').addEventListener('click',goBack);
$('sheet-back').addEventListener('click',goBack);
document.querySelectorAll('[data-select-rules]').forEach(b=>b.addEventListener('click',()=>{currentRulesPack=b.dataset.selectRules;renderRules();}));
document.querySelectorAll('[data-book-pack]').forEach(b=>b.addEventListener('click',()=>openRules(b.dataset.bookPack,{focusBook:true})));
document.querySelectorAll('[data-rules-pack]').forEach(b=>b.addEventListener('click',()=>openRules(b.dataset.rulesPack)));
$('spell-search').addEventListener('input',renderSpells);
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.go)));
document.querySelectorAll('[data-pack]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.pack)));
document.querySelectorAll('[data-show-catalog]').forEach(b=>b.addEventListener('click',()=>showCatalog(b.dataset.showCatalog,'homebrew')));
document.querySelectorAll('[data-kind][data-category]').forEach(b=>b.addEventListener('click',()=>{const st=catalogState[b.dataset.kind];st.category=b.dataset.category;st.source=CATALOG[b.dataset.kind][st.category][0]?.id||null;renderCatalog(b.dataset.kind);}));
document.querySelectorAll('[data-view]').forEach(a=>a.addEventListener('click',(e)=>{e.preventDefault();navigate(a.dataset.view);}));
$('squad-search').addEventListener('input',renderSquads);
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{
  squadFilter=b.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(c=>c.classList.toggle('active',c===b));
  renderSquads();
}));
$('menu-toggle').addEventListener('click',()=>{
 const open=$('sidebar').classList.toggle('open');$('mobile-scrim').hidden=!open;$('menu-toggle').setAttribute('aria-expanded',String(open));
});
$('mobile-scrim').addEventListener('click',closeMenu);
window.addEventListener('popstate',()=>navigate(window.location.hash.slice(1),{push:false}));
// popstate covers browser back and forward without duplicate handlers

// 07. ЗАПУСК
renderSquads();initLibraryFilters();renderRules();renderCatalog('classes');renderCatalog('races');initProfile();
navigate(window.location.hash.slice(1)||'home',{push:false});
// Начальная точка локальной навигации, не уводящая «Назад» в чужую вкладку.
if(!history.state?.inApp) history.replaceState({view:currentView,from:null,inApp:true},'',window.location.href);
