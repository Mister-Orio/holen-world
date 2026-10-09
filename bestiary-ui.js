/* Мир Холэна: компактная галерея бестиария. Полный лист — отдельная страница. */
(()=>{
'use strict';
const root=document.getElementById('bestiary-app');
if(!root)return;
const monsters=window.HOLEN_BESTIARY||[];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const factions={red:'Красная колония',fungal:'Независимый кордицепс',neutral:'Нейтральные'};
let pack=location.hash==='#bestiary-journeys'?'journeys':'insects';
const types=new Set(['ant','infected-ant','beetle','worm']);
const context=new URLSearchParams(location.search);
let keyword=(context.get('q')||'').toLocaleLowerCase('ru').trimStart();
let faction=['red','fungal','neutral'].includes(context.get('faction'))?context.get('faction'):'all';
function card(x){
 const query=new URLSearchParams({id:x.id});
 if(keyword)query.set('q',keyword);
 if(faction!=='all')query.set('faction',faction);
 const url=esc('creature.html?'+query.toString());
 const type=types.has(x.visual_type)?x.visual_type:'ant';
 const icon='<svg class="best-type-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><use href="assets/bestiary/types.svg?v=0113#'+type+'"></use></svg>';
 return '<a class="library-cover-tile best-tile best-tile-'+esc(x.faction)+'" href="'+url+'" aria-label="Открыть лист: '+esc(x.name)+'">'+
  '<span class="library-cover-image best-tile-image">'+icon+'</span>'+
  '<span class="library-cover-title best-tile-name">'+esc(x.name)+'</span></a>';
}
function render(){
 const packMonsters=monsters.filter(x=>x.pack_key===pack);
 const results=packMonsters.filter(x=>(faction==='all'||x.faction===faction)&&
 (x.name+' '+x.role+' '+x.description+' '+(factions[x.faction]||'')).toLocaleLowerCase('ru').includes(keyword));
 const searchFocus=document.activeElement?.id==='best-search';
 const position=searchFocus?document.activeElement.selectionStart:0;
 root.innerHTML='<div class="bestiary-toolbar"><label for="best-search">Поиск по существам<input id="best-search" type="search" autocomplete="off" value="'+esc(keyword)+'" placeholder="Название, фракция или роль…"></label>'+
 '<label for="best-faction">Фракция<select id="best-faction"><option value="all">Все фракции</option>'+
 '<option value="red" '+(faction==='red'?'selected':'')+'>Красная колония</option>'+
 '<option value="fungal" '+(faction==='fungal'?'selected':'')+'>Независимый кордицепс</option>'+
 '<option value="neutral" '+(faction==='neutral'?'selected':'')+'>Нейтральные</option></select></label>'+
 '<span class="best-count" role="status">Существ: '+results.length+' из '+packMonsters.length+'</span></div>'+
 '<div class="library-cover-grid bestiary-compact-grid">'+results.map(card).join('')+'</div>'+
 (results.length?'':'<p class="room-empty">'+(packMonsters.length?'По запросу ничего не найдено.':'Существа этого пака ещё не добавлены.')+'</p>');
 if(searchFocus){const field=root.querySelector('#best-search');field?.focus();field?.setSelectionRange(position,position);}
}
root.addEventListener('input',e=>{
 if(e.target?.id==='best-search'){keyword=e.target.value.toLocaleLowerCase('ru').trimStart();render();}
});
root.addEventListener('change',e=>{
 if(e.target?.id==='best-faction'){faction=e.target.value;render();}
});
window.addEventListener('holen:library-pack',e=>{
 if(e.detail?.library!=='bestiary')return;
 if(pack!==e.detail.pack){pack=e.detail.pack;keyword='';faction='all';}
 render();
});
render();
})();
