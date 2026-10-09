/* Мир Холэна: компактная галерея бестиария. Полный лист — отдельная страница. */
(()=>{
'use strict';
const root=document.getElementById('bestiary-app');
if(!root)return;
const monsters=window.HOLEN_BESTIARY||[];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const factions={red:'Красная колония',fungal:'Независимый кордицепс'};
const symbols={'red-infantry':'♟','cordyceps':'☣','red-titan':'⬢','bombardier':'✦','burrow-worm':'〰','worm-handler':'⚑'};
const imagePath=value=>typeof value==='string'&&/^assets\/bestiary\/[a-z0-9/_-]+\.(?:webp|avif|png|jpe?g)$/.test(value)?value:null;
let keyword='',faction='all';
function card(x){
 const url='creature.html?id='+encodeURIComponent(x.id);
 const cover=imagePath(x.images?.cover);
 const icon=cover?'<img src="'+esc(cover)+'" loading="lazy" decoding="async" width="128" height="128" alt="">':
 '<span class="best-tile-symbol" aria-hidden="true">'+esc(symbols[x.id]||'◇')+'</span>';
 return '<a class="best-tile best-tile-'+esc(x.faction)+'" href="'+url+'" aria-label="Открыть лист: '+esc(x.name)+'">'+
  '<span class="best-tile-image">'+icon+'</span>'+
  '<span class="best-tile-name">'+esc(x.name)+'</span></a>';
}
function render(){
 const results=monsters.filter(x=>(faction==='all'||x.faction===faction)&&
 (x.name+' '+x.role+' '+x.description+' '+(factions[x.faction]||'')).toLocaleLowerCase('ru').includes(keyword));
 const searchFocus=document.activeElement?.id==='best-search';
 const position=searchFocus?document.activeElement.selectionStart:0;
 root.innerHTML='<div class="bestiary-toolbar"><label for="best-search">Поиск по существам<input id="best-search" type="search" autocomplete="off" value="'+esc(keyword)+'" placeholder="Название, фракция или роль…"></label>'+
 '<label for="best-faction">Фракция<select id="best-faction"><option value="all">Все фракции</option>'+
 '<option value="red" '+(faction==='red'?'selected':'')+'>Красная колония</option>'+
 '<option value="fungal" '+(faction==='fungal'?'selected':'')+'>Независимый кордицепс</option></select></label>'+
 '<span class="best-count" role="status">Существ: '+results.length+' из '+monsters.length+'</span></div>'+
 '<div class="bestiary-compact-grid">'+results.map(card).join('')+'</div>'+
 (results.length?'':'<p class="room-empty">По запросу ничего не найдено.</p>');
 if(searchFocus){const field=root.querySelector('#best-search');field?.focus();field?.setSelectionRange(position,position);}
}
root.addEventListener('input',e=>{
 if(e.target?.id==='best-search'){keyword=e.target.value.toLocaleLowerCase('ru').trimStart();render();}
});
root.addEventListener('change',e=>{
 if(e.target?.id==='best-faction'){faction=e.target.value;render();}
});
render();
})();
