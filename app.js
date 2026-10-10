/* ================================================================
   МИР ХОЛЭНА — ИНТЕРФЕЙС ПЛАТФОРМЫ v0.4
   01. Данные                 data.js
   02. Навигация              navigate()
   03. Каталог отрядов        renderSquads(), openSheet()
   04. Справочник правил      renderRules()
   05. Демо комнаты и ГМа     renderDemo(), nextDemoTurn()
   Сетевая часть НЕ подключена: это автономный прототип.
   ================================================================ */

const $ = id => document.getElementById(id);
const VIEWS = ['home','journeys','insects','classes','races','backgrounds','feats','profile','auth','squads','sheet','dnd-sheet','bestiary','bestiary-journeys','bestiary-insects','rules','lore','lore-journeys','lore-insects','rooms','gm'];
const BREADCRUMBS = {home:'Главная',journeys:'Путешествия Холэна',insects:'Муравьиная революция',classes:'Классы',races:'Расы',backgrounds:'Предыстории',feats:'Черты',profile:'Профиль',auth:'Аккаунт',squads:'Боевые отряды',sheet:'Лист отряда','dnd-sheet':'Лист D&D',bestiary:'Бестиарий',rules:'Правила',lore:'Предметы Холэна','bestiary-journeys':'Путешествия Холэна','bestiary-insects':'Муравьиная революция','lore-journeys':'Путешествия Холэна','lore-insects':'Муравьиная революция',rooms:'Комнаты',gm:'Панель ГМа'};
const LIBRARY_PACK_VIEWS={
 'bestiary-journeys':{library:'bestiary',pack:'journeys'},
 'bestiary-insects':{library:'bestiary',pack:'insects'},
 'lore-journeys':{library:'lore',pack:'journeys'},
 'lore-insects':{library:'lore',pack:'insects'}
};
const PACK_TITLES={journeys:'Путешествия Холэна',insects:'Муравьиная революция'};
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
let navigationEpoch=0;
async function navigate(name, {push=true}={}) {
  if(window.HOLEN_AUTH_GATE?.isLocked()&&name!=='auth'){
    window.HOLEN_AUTH_GATE.remember(VIEWS.includes(name)?name:'home');name='auth';
  }
  const token=++navigationEpoch;
  const view = VIEWS.includes(name)?name:'home';
  const previous=currentView;
  const libraryPack=LIBRARY_PACK_VIEWS[view];
  if(view!=='dnd-sheet')document.body.classList.remove('dnd-focus-mode');
  if(!['rooms','gm'].includes(view))document.body.classList.remove('room-focus-mode');
  currentView=view;
  if(view==='home')navigationTrail=['home'];
  else if(libraryPack)navigationTrail=['home',libraryPack.library,view];
  else if(history.state?.trail && !push && history.state.view===view)navigationTrail=history.state.trail;
  else if(navigationTrail.includes(view))navigationTrail=navigationTrail.slice(0,navigationTrail.indexOf(view)+1);
  else if(view==='squads')navigationTrail=['home','insects','squads'];
  else if(view==='sheet')navigationTrail=[...navigationTrail.filter(v=>v!=='sheet'),'sheet'];
  else if((previous==='insects'||previous==='journeys') && !['rooms','gm','profile','auth'].includes(view))
    navigationTrail=['home',previous,view];
  else navigationTrail=['home',view];
  updateBreadcrumb();
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id === `view-${libraryPack?libraryPack.library+'-catalog':view}`));
  document.querySelectorAll('[data-view]').forEach(el => el.classList.toggle('active', el.getAttribute('data-view') === (libraryPack?.library||view)));
  if(push && window.location.hash !== `#${view}`) history.pushState({view,from:previous,trail:[...navigationTrail],inApp:true},'',`#${view}`);
  if(libraryPack){
    $(libraryPack.library+'-pack-heading').textContent=PACK_TITLES[libraryPack.pack];

  }
  $('page-back-strip').hidden=view==='home';
  closeMenu();
  if(view==='sheet' && !$('sheet-frame').getAttribute('src')) return navigate('squads');
  window.scrollTo({top:0,behavior:'instant'});
  const root=document.querySelector('.view.active'),finish=window.HOLEN_FEATURES.loading(root,view);
  try{await window.HOLEN_FEATURES.forView(view);finish();}catch(error){finish(error);return;}
  if(token!==navigationEpoch)return;
  if(view==='squads')renderSquads();
  if(view==='rules'){initRuleFilters();renderRules();}
  if(['classes','races'].includes(view)){initCatalogState();renderCatalog(view);}
  if(libraryPack){
    if(libraryPack.library==='lore'){currentItemPack=libraryPack.pack;initItemFilters();renderItems();}
    window.dispatchEvent(new CustomEvent('holen:library-pack',{detail:libraryPack}));
  }
  window.dispatchEvent(new CustomEvent('holen-navigated',{detail:{view}}));
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
  const list=window.ANT_DATA.squads.filter(s=>(squadFilter==='all'||s.colony===squadFilter) && `${s.name} ${s.role} ${s.short}`.toLocaleLowerCase('ru').includes(query));
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
  const sheet=window.ANT_DATA.squads.find(s=>s.id===id);
  if(!sheet) return;
  const address=`sheets/${sheet.id}.html`;
  $('sheet-heading').textContent=sheet.name;
  $('sheet-back').textContent='← Назад: '+(BREADCRUMBS[sheetOrigin]||'Каталог');
  $('sheet-frame').src=address;
  $('sheet-popout').href=address;
  navigate('sheet');
}

// 04. БИБЛИОТЕКА ПРАВИЛ: один пакет — свой справочник.
// Важно: глобальный window.ANT_DATA.rules предназначен только для «Муравьиной революции».
let currentRulesPack='journeys';
const RULEPACKS={
  journeys:{title:'Путешествия Холэна',description:'Книга «Великий пакт», редакция 1.7. D&D 5e (2014) с законами и лицензиями Холэна; доступна полная версия исходного документа.'},
  insects:{title:'Муравьиная революция',description:'Утверждённые общие правила отрядного варгейма: один жетон, потери, отдых и резервы. Не путать с обычной D&D.'}
};
async function openRules(pack, {focusBook=false}={}) {
  currentRulesPack=RULEPACKS[pack]?pack:'journeys';
  await navigate('rules');
  if (currentView==='rules' && focusBook) {
    // Не открываем несуществующий файл, а переводим к месту будущей книги.
    $('player-book').scrollIntoView({behavior:'smooth',block:'center'});
  }
}
function renderRules() {
  const source=currentRulesPack==='insects'?window.ANT_DATA.rules:window.HOLEN_RULES_DATA.journeys;
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
    insects:{file:'books/muravinaya_revolyutsiya_guide_v01.pdf?v=0116',desc:'Полевое руководство игрока 0.2: основные правила, роли отрядов, размеры существ, типы атак и фракции. Числовые параметры сверяются с действующими листами.'}
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
  {key:'license', label:'Лицензия / разрешение'},
  {key:'review', label:'Статус проверки'}
];
const SPELL_FILTERS = Object.fromEntries(SPELL_FACETS.map(f=>[f.key,new Set()]));

let currentItemPack='journeys';
const ITEM_PACKS = [
  {id:'journeys', name:'Путешествия Холэна'},
  {id:'insects', name:'Муравьиная революция'}
];
const ITEM_FACETS = [
  {key:'kind',label:'Раздел'},
  {key:'type',label:'Тип предмета'},
  {key:'rarity',label:'Редкость'},
  {key:'legalClass',label:'Класс обращения'},
  {key:'review',label:'Статус проверки'}
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
const REGISTRY_PAGE_SIZE=60,registryPages={spell:0,item:0};
function registryPage(kind,list,rerender){
  const pages=Math.max(1,Math.ceil(list.length/REGISTRY_PAGE_SIZE));
  registryPages[kind]=Math.min(registryPages[kind],pages-1);
  const page=registryPages[kind],nav=$(`${kind}-pagination`);
  nav.hidden=pages===1;
  nav.innerHTML=`<button type="button" class="btn subtle" data-page="${page-1}" ${page===0?'disabled':''}>← Назад</button><span aria-live="polite">Страница ${page+1} из ${pages}</span><button type="button" class="btn subtle" data-page="${page+1}" ${page===pages-1?'disabled':''}>Далее →</button>`;
  nav.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>{
    registryPages[kind]=Number(button.dataset.page);rerender(false);
    $(`${kind}-list`).scrollIntoView({block:'start'});
  }));
  return list.slice(page*REGISTRY_PAGE_SIZE,(page+1)*REGISTRY_PAGE_SIZE);
}
function registrySource(record,label='DnD.su ↗'){
  return /^https:\/\/(?:[a-z0-9-]+\.)*dnd\.su\//i.test(record.sourceUrl||'')?
    `<a href="${escapeHtml(record.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`:escapeHtml(label);
}
function reviewBadge(record){
  return record.review?`<span class="registry-review ${record.review==='Спорный случай'?'disputed':''}">${escapeHtml(record.review)}</span>`:'';
}
function renderSpells(reset=true){
  if(reset)registryPages.spell=0;
  const q=$('spell-search').value.trim().toLocaleLowerCase('ru').replace(/ё/g,'е');
  const all=window.HOLEN_RULES_DATA.spells;
  const list=all.filter(s=>passFacets(s,SPELL_FILTERS)&&
    `${s.name} ${(s.aliases||[]).join(' ')} ${s.level} ${s.school} ${s.category} ${s.license} ${s.review} ${s.source}`.toLocaleLowerCase('ru').replace(/ё/g,'е').includes(q));
  $('spell-registry-count').textContent=`Найдено: ${list.length}`;
  $('spell-filter-summary').textContent=`Подходит: ${list.length} из ${all.length} заклинаний`;
  $('spell-list').innerHTML=registryPage('spell',list,renderSpells).map(s=>`<div class="spell-entry"><div><strong>${registrySource(s,s.name+' ↗')}</strong><small>${escapeHtml(s.level==='Заговор'?'Заговор':s.level+' круг')} · ${escapeHtml(s.school)} · ${escapeHtml(s.source)}</small>${reviewBadge(s)}</div><div><span>${escapeHtml(s.category)}</span><small>${escapeHtml(s.license)}</small></div></div>`).join('')||'<p class="muted">Нет заклинаний по выбранным условиям.</p>';
}
function itemDetails(item){
  const fields=[['Тип',item.type],['Настройка',item.attunement],['Цена',item.price],['Вес',item.weight],
    ['Показатели',item.stats],['Оценка',item.value?item.value+' зм / '+item.unit:''],
    ['Владение',item.possession],['Ношение',item.carrying],['Активация',item.activation],
    ['Производство / ремонт',item.crafting],['Продажа / передача',item.trading],
    ['Лицензия',item.license],['Теги риска',item.risk],['Условия',item.conditions],['Примечание',item.legalNote]];
  return `<dl>${fields.filter(([,value])=>value).map(([label,value])=>`<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl><p class="item-source">Источник: ${escapeHtml(item.source)} · ${registrySource(item,item.magic?'Показатели и эффект на DnD.su ↗':'DnD.su ↗')}</p>`;
}
function renderItems(reset=true) {
  if(reset)registryPages.item=0;
  const q=$('item-search').value.trim().toLocaleLowerCase('ru');
  const all=(window.HOLEN_ITEMS||[]).filter(item=>Array.isArray(item.packs)&&item.packs.includes(currentItemPack));
  const list=all.filter(item=>passFacets(item,ITEM_FILTERS)&&
    [item.name,item.kind,item.type,item.rarity,item.legalClass,item.license,item.stats,item.review].filter(Boolean).join(' ').toLocaleLowerCase('ru').includes(q));
  $('item-count').textContent=`Найдено: ${list.length}`;
  $('item-filter-summary').textContent=`Подходит: ${list.length} из ${all.length} предметов`;
  $('item-empty').hidden=list.length>0||all.length>0;
  $('item-registry-note').hidden=!all.length;
  $('item-list').innerHTML=registryPage('item',list,renderItems).map(item=>`<details class="item-entry"><summary><span class="item-main"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.kind)}${item.kind===item.type?'':' · '+escapeHtml(item.type)}${item.rarity==='Без редкости'?'':' · '+escapeHtml(item.rarity)}</small></span><span class="item-tags">${item.legalClass?`<span>${escapeHtml(item.legalClass)}</span>`:''}${reviewBadge(item)}</span></summary><div class="item-content">${itemDetails(item)}</div></details>`).join('');
  if(all.length&&!list.length) $('item-list').innerHTML='<p class="muted">Нет предметов по выбранным условиям.</p>';
}
let ruleFiltersReady=false,itemFiltersReady=false,itemFilterPack=null;
function initRuleFilters(){
  if(ruleFiltersReady)return;ruleFiltersReady=true;
  mountFacetControls('spell-filter-groups',SPELL_FACETS,SPELL_FILTERS,window.HOLEN_RULES_DATA.spells,renderSpells);
  $('spell-clear').addEventListener('click',()=>{$('spell-search').value='';resetFacets(SPELL_FILTERS,'spell-filter-groups',renderSpells);});
}
function initItemFilters(){
  if(itemFilterPack!==currentItemPack){
    itemFilterPack=currentItemPack;
    Object.values(ITEM_FILTERS).forEach(values=>values.clear());$('item-search').value='';
    mountFacetControls('item-filter-groups',ITEM_FACETS,ITEM_FILTERS,(window.HOLEN_ITEMS||[]).filter(item=>item.packs.includes(currentItemPack)),renderItems);
  }
  if(itemFiltersReady)return;itemFiltersReady=true;
  $('item-clear').addEventListener('click',()=>{$('item-search').value='';resetFacets(ITEM_FILTERS,'item-filter-groups',renderItems);});
  $('item-search').addEventListener('input',renderItems);
}

// 05. КОМНАТЫ И ПАНЕЛЬ ГМа — см. room-engine.js и room-ui.js.

// ================================================================
// 06. КЛАССЫ И РАСЫ: ИСТОЧНИКИ, КАТАЛОГ, ИКОНКИ
// Данные лежат в catalog-data.js: здесь только логика отображения.
// ================================================================
const catalogState = {
  classes:{category:'official', source:'dnd2014'},
  races:{category:'official', source:'dnd2014'}
};
const requestedSource=new URLSearchParams(location.search).get('source');
let catalogStateReady=false;
function initCatalogState(){if(catalogStateReady)return;catalogStateReady=true;for(const type of ['classes','races'])if(window.HOLEN_CATALOG[type].official.some(x=>x.id===requestedSource))catalogState[type].source=requestedSource;}
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
  state.source=null;
  navigate(type);
}
function renderCatalog(type) {
  if(type==='classes'){renderClassCatalog();return;}
  const state=catalogState[type];
  const sources=window.HOLEN_CATALOG[type][state.category];
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
    items=selected.squadIds.map(id=>window.ANT_DATA.squads.find(s=>s.id===id)).filter(Boolean).map(s=>`
      <article class="catalog-item sheet-list-item"><span class="catalog-item-symbol" aria-hidden="true">${escapeHtml(s.icon)}</span><div class="catalog-item-content"><strong>${escapeHtml(s.name)}</strong><small>${escapeHtml(s.role)} · ${escapeHtml(COLONY_LABEL[s.colony])}</small></div><button type="button" class="catalog-action" data-sheet="${escapeHtml(s.id)}">Лист ↗</button></article>`);
  } else {
    items=selected.items.map(item=>{
      const itemData=typeof item==='string'?{name:item}:item;
      const edition=selected.id==='dnd2024'?'2024':'2014',kind=type==='classes'?'class':'species';
      const entries=window.HOLEN_DND.editions[edition][type==='classes'?'classes':'species'];
      const entry=state.category==='official'?entries.find(x=>x.name===itemData.name):null;
      const link=entry?`<a class="catalog-action" href="${escapeHtml(window.HOLEN_DND.referenceUrl(edition,kind,entry.id))}">Лист ↗</a>`:'';
      return `<article class="catalog-item"><span class="catalog-item-symbol muted-glyph" aria-hidden="true">◈</span><div class="catalog-item-content"><strong>${escapeHtml(itemData.name)}</strong>${itemData.description?`<small>${escapeHtml(itemData.description)}</small>`:''}</div>${itemData.tag?`<span class="item-tag">${escapeHtml(itemData.tag)}</span>`:''}${link}</article>`;
    });
  }
  results.innerHTML=`<div class="catalog-results-heading"><div><span class="overline">${state.category==='official'?'ОФИЦИАЛЬНЫЙ ИСТОЧНИК':'АВТОРСКИЙ ПАК'}</span><h2>${escapeHtml(selected.name)}</h2></div><span class="muted">${escapeHtml(selected.count)}</span></div><div class="catalog-items">${items.join('')}</div><p class="source-note">${escapeHtml(selected.note)}</p>`;
  results.querySelectorAll('[data-sheet]').forEach(btn=>btn.addEventListener('click',()=>openSheet(btn.dataset.sheet)));
  srcWrap.querySelectorAll('[data-select-source]').forEach(btn=>btn.addEventListener('click',()=>{
    state.source=btn.dataset.selectSource;renderCatalog(type);
  }));
}
function renderClassCatalog(){
 const state=catalogState.classes,official=state.category==='official',edition=state.source==='dnd2024'?'2024':'2014';
 document.querySelectorAll('[data-kind="classes"][data-category]').forEach(btn=>{const active=btn.dataset.category===state.category;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));});
 const sources=$('classes-sources');sources.innerHTML=official?'<label class="class-edition-control">Редакция<select id="classes-edition"><option value="2014">D&D 2014</option><option value="2024">D&D 2024</option></select></label>':'';
 const control=$('classes-edition');if(control){control.value=edition;control.addEventListener('change',()=>{state.source='dnd'+control.value;renderClassCatalog();});}
 let cards=[];
 if(official){
  cards=window.HOLEN_DND.editions[edition].classes.map(entry=>{
   const source=entry.supplement?'TCE · Котёл Таши со всякой всячиной':'PHB '+edition+' · Книга игрока';
   return '<article class="catalog-item"><span class="catalog-item-symbol muted-glyph" aria-hidden="true">◈</span><div class="catalog-item-content"><strong>'+escapeHtml(entry.name)+'</strong><small class="catalog-item-source">'+escapeHtml(source)+'</small></div><a class="catalog-action" href="'+escapeHtml(window.HOLEN_DND.referenceUrl(edition,'class',entry.id))+'">Лист ↗</a></article>';
  });
 }else{
  for(const source of window.HOLEN_CATALOG.classes.homebrew){
   for(const id of source.squadIds||[]){const squad=window.ANT_DATA.squads.find(x=>x.id===id);if(!squad)continue;
    cards.push('<article class="catalog-item sheet-list-item"><span class="catalog-item-symbol" aria-hidden="true">'+escapeHtml(squad.icon)+'</span><div class="catalog-item-content"><strong>'+escapeHtml(squad.name)+'</strong><small class="catalog-item-source">Холэн · Муравьиная революция</small><small>'+escapeHtml(squad.role)+' · '+escapeHtml(COLONY_LABEL[squad.colony])+'</small></div><button type="button" class="catalog-action" data-sheet="'+escapeHtml(squad.id)+'">Лист ↗</button></article>');
   }
   for(const item of source.items||[]){const row=typeof item==='string'?{name:item}:item;cards.push('<article class="catalog-item"><div class="catalog-item-content"><strong>'+escapeHtml(row.name)+'</strong><small class="catalog-item-source">'+escapeHtml(row.sourceName||source.name)+'</small>'+(row.description?'<small>'+escapeHtml(row.description)+'</small>':'')+'</div></article>');}
  }
 }
 $('classes-results').innerHTML='<div class="catalog-results-heading"><div><span class="overline">'+(official?'КЛАССИЧЕСКИЕ · ОФИЦИАЛЬНЫЕ':'ХОУМБРЮ')+'</span><h2>'+(official?'D&D '+edition:'Авторские материалы')+'</h2></div><span class="muted">'+cards.length+' вариантов</span></div><div class="catalog-items">'+cards.join('')+'</div><p class="source-note">'+(official?'Издательский источник указан под каждым классом.':'Специализации «Муравьиной революции» относятся к отдельной тактической системе отрядов.')+'</p>';
 $('classes-results').querySelectorAll('[data-sheet]').forEach(btn=>btn.addEventListener('click',()=>openSheet(btn.dataset.sheet)));
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
document.querySelectorAll('[data-kind][data-category]').forEach(b=>b.addEventListener('click',()=>{const st=catalogState[b.dataset.kind];st.category=b.dataset.category;st.source=window.HOLEN_CATALOG[b.dataset.kind][st.category][0]?.id||null;renderCatalog(b.dataset.kind);}));
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
initProfile();
navigate(window.location.hash.slice(1)||'home',{push:false});
// Начальная точка локальной навигации, не уводящая «Назад» в чужую вкладку.
if(!history.state?.inApp) history.replaceState({view:currentView,from:null,inApp:true},'',window.location.href);
