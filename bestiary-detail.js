/* Отдельный открываемый по ссылке лист существа — только справочные данные. */
(()=>{
'use strict';
const root=document.getElementById('creature-details');if(!root)return;
const list=window.HOLEN_BESTIARY||[];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const safeImage=x=>typeof x==='string'&&/^assets\/bestiary\/[a-z0-9/_-]+\.(?:webp|avif|png|jpe?g)$/.test(x)?x:null;
const icon={'red-infantry':'♟','cordyceps':'☣','red-titan':'⬢','bombardier':'✦','burrow-worm':'〰','worm-handler':'⚑'};
const factionNames={red:'Красная колония',fungal:'Независимая грибная угроза',neutral:'Нейтральные'};
const context=new URLSearchParams(location.search);
const id=context.get('id')||'';
const creature=list.find(m=>m.id===id);
const pack=creature?.pack_key==='journeys'?'journeys':'insects';
const packList=list.filter(x=>x.pack_key===pack);
const keyword=(context.get('q')||'').toLocaleLowerCase('ru').trimStart();
const faction=['red','fungal','neutral'].includes(context.get('faction'))?context.get('faction'):'all';
const navQuery=new URLSearchParams();
if(keyword)navQuery.set('q',keyword);
if(faction!=='all')navQuery.set('faction',faction);
const catalogUrl='index.html'+(navQuery.size?'?'+navQuery.toString():'')+'#bestiary-'+pack;
document.querySelectorAll('a[href="index.html#bestiary"]').forEach(a=>a.setAttribute('href',catalogUrl));
if(!creature){
 document.title='Существо не найдено · Мир Холэна';
 root.innerHTML='<section class="creature-not-found"><h1>Существо не найдено</h1><p>Этот лист ещё не существует или ссылка содержит ошибку.</p><a href="'+esc(catalogUrl)+'" class="btn primary">Открыть бестиарий</a></section>';
 return;
}
const h=creature;
document.title=h.name+' · Бестиарий Мира Холэна';
document.querySelector('meta[name="description"]')?.setAttribute('content',h.description);
document.getElementById('creature-breadcrumb').textContent=h.name;
const portrait=safeImage(h.images?.portrait);
const art=portrait?
 '<img class="creature-portrait" src="'+esc(portrait)+'" width="768" height="768" alt="'+esc(h.images?.portrait_alt||h.name)+'" decoding="async" fetchpriority="high">':
 '<div class="creature-art-placeholder" role="img" aria-label="Иллюстрация пока не добавлена"><span aria-hidden="true">'+esc(icon[h.id]||'◇')+'</span><small>Иллюстрация появится позже</small></div>';
const values=[
 ['ОЗ',h.hp],['Класс защиты',h.armor_class],['Скорость',h.speed+' клеток'],
 ['Атака',(h.attack_bonus>=0?'+':'')+h.attack_bonus],
 ['Урон',h.members>1?h.base_damage+' → 1':h.base_damage],['Численность',h.members],
 ['Дальность',h.range_cells+' клеток'],['Размер',h.creature_size],
 ['Занимаемое место',h.footprint_w+'×'+h.footprint_h+' клетки']
];
const characteristics=['Сила','Ловкость','Телосложение','Интеллект','Мудрость','Харизма'];
const searchFactions={red:'Красная колония',fungal:'Независимый кордицепс',neutral:'Нейтральные'};
const filtered=packList.filter(x=>(faction==='all'||x.faction===faction)&&
 (x.name+' '+x.role+' '+x.description+' '+(searchFactions[x.faction]||'')).toLocaleLowerCase('ru').includes(keyword));
// Прямая ссылка с несовместимыми фильтрами сохраняет обычную навигацию.
const navList=filtered.some(x=>x.id===id)?filtered:packList;
const siblingAt=navList.findIndex(m=>m.id===id);
const siblings=[
 {creature:navList[siblingAt-1],direction:'prev'},
 {creature:navList[siblingAt+1],direction:'next'}
].filter(x=>x.creature);
function siblingLink({creature:x,direction}){
 const query=new URLSearchParams(navQuery);
 query.set('id',x.id);
 const arrow='<svg class="creature-nav-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
 const name='<span>'+esc(x.name)+'</span>';
 const label=(direction==='prev'?'Предыдущее существо: ':'Следующее существо: ')+x.name;
 return '<a href="'+esc('creature.html?'+query.toString())+'" class="btn subtle creature-sibling-'+direction+'" rel="'+direction+'" aria-label="'+esc(label)+'">'+
 (direction==='prev'?arrow+name:name+arrow)+'</a>';
}
root.innerHTML='<article class="creature-sheet">'+
 '<div class="creature-sheet-head"><span class="overline">БЕСТИАРИЙ · '+(pack==='insects'?'МУРАВЬИНАЯ РЕВОЛЮЦИЯ':'ПУТЕШЕСТВИЯ ХОЛЭНА')+'</span>'+
 '<h1>'+esc(h.name)+'</h1>'+
 '<div class="creature-tags"><span>'+esc(factionNames[h.faction]||h.faction)+'</span><span>'+esc(h.role)+'</span><span>'+esc(h.creature_size)+'</span></div>'+
 '<p>'+esc(h.description)+'</p></div>'+
 '<div class="creature-content">'+
 '<div class="creature-main-column"><section class="creature-panel"><h2>Характеристики</h2><div class="creature-stats">'+
 values.map(([label,value])=>'<div class="creature-stat"><strong>'+esc(value)+'</strong><small>'+esc(label)+'</small></div>').join('')+
 '</div></section>'+
 '<section class="creature-panel"><h2>Модификаторы характеристик</h2><div class="creature-modifiers">'+
 characteristics.map((n,i)=>'<div><strong>'+esc(n)+'</strong><span>'+((h.stats[i]||0)>=0?'+':'')+esc(h.stats[i]||0)+'</span></div>').join('')+
 '</div></section>'+
 '<section class="creature-panel"><h2>Атаки и способности</h2>'+
 (h.abilities||[]).map(a=>'<div class="creature-ability"><h3>'+esc(a.name)+'</h3><p>'+esc(a.description)+'</p></div>').join('')+
 '</section>'+
 '<section class="creature-panel creature-notes"><h2>Плейтест и ограничения</h2><p>'+esc(h.playtest||'Особые правила будут уточняться в ходе плейтеста.')+'</p>'+
 '<p>Габариты '+esc(h.footprint_w+'×'+h.footprint_h)+' относятся к будущей тактической карте. Эффекты способностей пока отслеживает ГМ вручную.</p>'+
 '<p>Эта страница — справочный лист. Здесь нельзя изменять ОЗ, расходовать способности или состояние комнаты.</p></section></div>'+
 '<aside class="creature-aside"><div class="creature-art-panel">'+art+'</div>'+
 '<p class="creature-art-caption">'+(portrait?'Иллюстрация существа':'Сейчас показан символ-заглушка. Иллюстрацию добавим после выбора единого художественного стиля.')+'</p></aside>'+
 '</div><nav class="creature-siblings" aria-label="Соседние существа">'+
 siblings.map(siblingLink).join('')+
 '</nav></article>';
})();
