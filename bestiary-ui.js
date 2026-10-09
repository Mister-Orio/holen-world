/* Бестиарий v0.11. Публичные карточки утверждённых существ, без игровой мутации. */
(()=>{
'use strict';
const root=document.getElementById('bestiary-app');
if(!root)return;
const monsters=window.HOLEN_BESTIARY||[];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const factions={red:'Красная колония',fungal:'Независимый кордицепс'};
let keyword='',faction='all',opened=null;
function stats(x){return [
 ['ОЗ',x.hp],['КД',x.armor_class],['Скорость',x.speed],
 ['Атака',(x.attack_bonus>=0?'+':'')+x.attack_bonus],['Урон',x.members>1?x.base_damage+' → 1':x.base_damage],
 ['Численность',x.members],['Размер',x.creature_size],['Область',x.footprint_w+'×'+x.footprint_h],
 ['Дальность',x.range_cells]
].map(([k,v])=>'<div class="best-stat"><strong>'+esc(v)+'</strong><small>'+esc(k)+'</small></div>').join('');}
function render(){
 const results=monsters.filter(x=>(faction==='all'||x.faction===faction)&&
  (x.name+' '+x.role+' '+x.description+' '+factions[x.faction]).toLocaleLowerCase('ru').includes(keyword));
 root.innerHTML='<div class="bestiary-toolbar"><label for="best-search">Поиск по бестиарию<input id="best-search" value="'+esc(keyword)+'" placeholder="Существо, фракция или роль…"></label>'+
 '<label for="best-faction">Фракция<select id="best-faction"><option value="all">Все фракции</option><option value="red" '+(faction==='red'?'selected':'')+'>Красная колония</option><option value="fungal" '+(faction==='fungal'?'selected':'')+'>Независимый кордицепс</option></select></label>'+
 '<span class="best-count">Найдено: '+results.length+' из '+monsters.length+'</span></div>'+
 '<div class="bestiary-grid">'+results.map(x=>{
   const expanded=opened===x.id;
   return '<article class="best-creature"><div class="best-head"><span class="best-symbol" aria-hidden="true">'+(x.faction==='fungal'?'☣':'♟')+'</span><div><small>'+esc(factions[x.faction])+' · '+esc(x.role)+'</small><h2>'+esc(x.name)+'</h2></div></div>'+
   '<p>'+esc(x.description)+'</p><div class="best-stat-grid">'+stats(x)+'</div>'+
   '<button class="btn subtle best-expand" type="button" data-best-toggle="'+esc(x.id)+'" aria-expanded="'+expanded+'">'+(expanded?'Свернуть полный лист':'Открыть полный лист')+'</button>'+
   (expanded?'<div class="best-detail"><h3>Модификаторы характеристик</h3><div class="best-mods">'+['Сил','Лов','Тел','Инт','Мдр','Хар'].map((v,i)=>'<span>'+v+' '+(x.stats[i]>=0?'+':'')+x.stats[i]+'</span>').join('')+'</div>'+
   '<h3>Атаки, способности и ограничения</h3>'+x.abilities.map(a=>'<div class="best-ability"><strong>'+esc(a.name)+'</strong><p>'+esc(a.description)+'</p></div>').join('')+
   '<p class="best-rule-note">'+esc(x.playtest||'')+'</p><p class="best-rule-note">Размер области '+esc(x.footprint_w+'×'+x.footprint_h)+' зафиксирован. Автоматическое позиционирование будет доступно с появлением тактической карты. Эффекты способностей пока отслеживает ГМ.</p></div>':'')+'</article>';
 }).join('')+'</div>'+(results.length?'':'<p class="room-empty">Ничего не найдено.</p>');
 root.querySelector('#best-search').addEventListener('input',e=>{keyword=e.target.value.toLocaleLowerCase('ru');const pos=e.target.selectionStart;render();const el=root.querySelector('#best-search');el.focus();el.setSelectionRange(pos,pos);});
 root.querySelector('#best-faction').addEventListener('change',e=>{faction=e.target.value;render();});
 root.querySelectorAll('[data-best-toggle]').forEach(b=>b.addEventListener('click',()=>{opened=opened===b.dataset.bestToggle?null:b.dataset.bestToggle;render();}));
}
render();
})();