/* Отдельный открываемый по ссылке лист существа — только справочные данные. */
(()=>{
'use strict';
const root=document.getElementById('creature-details');if(!root)return;
const list=window.HOLEN_BESTIARY||[];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const safeImage=x=>typeof x==='string'&&/^assets\/bestiary\/[a-z0-9/_-]+\.(?:webp|avif|png|jpe?g)$/.test(x)?x:null;
const icon={'red-infantry':'♟','cordyceps':'☣','red-titan':'⬢','bombardier':'✦','burrow-worm':'〰','worm-handler':'⚑'};
const factionNames={red:'Красная колония',fungal:'Независимая грибная угроза'};
const id=new URLSearchParams(location.search).get('id')||'';
const creature=list.find(m=>m.id===id);
if(!creature){
 document.title='Существо не найдено · Мир Холэна';
 root.innerHTML='<section class="creature-not-found"><h1>Существо не найдено</h1><p>Этот лист ещё не существует или ссылка содержит ошибку.</p><a href="index.html#bestiary" class="btn primary">Открыть бестиарий</a></section>';
 return;
}
const h=creature;
document.title=h.name+' · Бестиарий Мира Холэна';
document.querySelector('meta[name="description"]')?.setAttribute('content',h.description);
document.getElementById('creature-breadcrumb').textContent=h.name;
const portrait=safeImage(h.images?.portrait);
const art=portrait?
 '<img class="creature-portrait" src="'+esc(portrait)+'" width="768" height="1024" alt="'+esc(h.images?.portrait_alt||h.name)+'" decoding="async" fetchpriority="high">':
 '<div class="creature-art-placeholder" role="img" aria-label="Иллюстрация пока не добавлена"><span aria-hidden="true">'+esc(icon[h.id]||'◇')+'</span><small>Иллюстрация появится позже</small></div>';
const values=[
 ['ОЗ',h.hp],['Класс защиты',h.armor_class],['Скорость',h.speed+' клеток'],
 ['Атака',(h.attack_bonus>=0?'+':'')+h.attack_bonus],
 ['Урон',h.members>1?h.base_damage+' → 1':h.base_damage],['Численность',h.members],
 ['Дальность',h.range_cells+' клеток'],['Размер',h.creature_size],
 ['Занимаемое место',h.footprint_w+'×'+h.footprint_h+' клетки']
];
const characteristics=['Сила','Ловкость','Телосложение','Интеллект','Мудрость','Харизма'];
const siblingAt=list.findIndex(m=>m.id===id);
const siblings=[list[siblingAt-1],list[siblingAt+1]].filter(Boolean);
root.innerHTML='<article class="creature-sheet">'+
 '<div class="creature-sheet-head"><span class="overline">БЕСТИАРИЙ · МУРАВЬИНАЯ РЕВОЛЮЦИЯ</span>'+
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
 siblings.map(x=>'<a href="creature.html?id='+encodeURIComponent(x.id)+'" class="btn subtle">'+esc(x.name)+' →</a>').join('')+
 '</nav></article>';
})();
