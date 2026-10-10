(()=>{'use strict';
const d=window.HOLEN_DND,o=window.HOLEN_DND_OPTIONS,sources=window.HOLEN_OPTION_SOURCES;
if(!d||!o||!sources)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>window.HOLEN_ICONS.svg(name),params=new URLSearchParams(location.search);
for(const kind of ['backgrounds','feats']){
 const root=document.getElementById('dnd-'+kind+'-root');if(!root)continue;
 let edition=params.get('edition')==='2024'?'2024':'2014',q='',source='all';
 function setup(){
  root.innerHTML='<div class="dnd-option-toolbar"><label>Редакция<select data-option-edition aria-label="Редакция"><option value="2014">D&D 2014</option><option value="2024">D&D 2024</option></select></label><label class="dnd-option-search">Поиск<span class="option-search-field">'+icon('search')+'<input type="search" placeholder="Название или источник…" aria-label="Поиск '+(kind==='feats'?'черт':'предысторий')+'"></span></label><label>Источник<select data-option-source aria-label="Источник"></select></label><span class="option-count" role="status" aria-live="polite"></span></div><p class="dnd-source-note"></p><div class="dnd-options-grid"></div>';
  root.querySelector('[data-option-edition]').value=edition;updateSources();results();
 }
 function updateSources(){
  const books=new Map(o.editions[edition][kind].map(x=>{const a=sources.sourceFor(x,edition);return[a.abbr,a.name];}));
  if(!['all','official','homebrew',...books.keys()].includes(source))source='all';
  root.querySelector('[data-option-source]').innerHTML='<option value="all">Все источники</option><option value="official">OFF · Официальные</option><option value="homebrew">HB · Хоумбрю</option>'+[...books].map(([id,name])=>'<option value="'+esc(id)+'">'+esc(id+' · '+name)+'</option>').join('');
  root.querySelector('[data-option-source]').value=source;
 }
 function results(){
  const all=o.editions[edition][kind],items=all.filter(x=>sources.matches(x,edition,source)&&(x.name+' '+x.nameEn+' '+(x.aliases||[]).join(' ')+' '+sources.sourceFor(x,edition).name).toLocaleLowerCase('ru').replace(/ё/g,'е').includes(q));
  root.querySelector('.option-count').textContent='Найдено: '+items.length+' из '+all.length;
  root.querySelector('.dnd-source-note').textContent='Ссылки «Правила» открывают страницу выбранной '+(kind==='feats'?'черты':'предыстории')+' на DnD.su в нужной редакции.';
  root.querySelector('.dnd-options-grid').innerHTML=items.length?items.map(x=>{
   const info=sources.sourceFor(x,edition),link='index.html?edition='+edition+'&'+(kind==='feats'?'feat':'background')+'='+encodeURIComponent(x.id)+'#profile';
   const skillName=k=>d.skills.find(y=>y[0]===k)?.[1]||k;
   const detail=kind==='backgrounds'?'Навыки: '+x.skills.map(skillName).join(', ')+(x.skillChoices?' · выбрать '+x.skillChoices.count+' из: '+x.skillChoices.options.map(skillName).join(', '):'')+(x.originFeat?' · Черта: '+(o.editions[edition].feats.find(y=>y.id===x.originFeat)?.name||x.originFeat):''):(({Origin:'Происхождение',General:'Общая',Optional:'Опциональная','Fighting Style':'Боевой стиль','Epic Boon':'Эпическое дарование'})[x.category]||x.category)+(x.level>1?' · уровень '+x.level+'+':'');
   return '<article class="dnd-option-card"><div class="option-card-heading"><span class="option-source-icon" title="'+esc(info.name)+'" aria-label="Источник: '+esc(info.name)+'">'+icon(info.kind==='homebrew'?'library-feats':'library-rules')+'<b>'+esc(info.abbr)+'</b></span><div><h2>'+esc(x.name)+'</h2><small lang="en">'+esc(x.nameEn)+'</small></div></div><p>'+esc(x.description)+'</p><p>'+esc(detail)+'</p><p class="option-source-name">'+esc(info.name)+'</p><div class="dnd-option-links"><a href="'+esc(x.source)+'" target="_blank" rel="noopener">Правила ↗</a><a class="btn subtle" href="'+esc(link)+'">Создать с '+(kind==='feats'?'чертой':'предысторией')+'</a></div></article>';
  }).join(''):'<p class="room-empty option-empty">'+(source==='homebrew'?'Хоумбрю пока не добавлены. Сейчас в каталоге только официальные материалы.':'Ничего не найдено. Измени поиск или источник.')+'</p>';
 }
 root.addEventListener('input',e=>{if(e.target.type==='search'){q=e.target.value.trim().toLocaleLowerCase('ru').replace(/ё/g,'е');results();}});
 root.addEventListener('change',e=>{if(e.target.matches('[data-option-edition]')){edition=e.target.value;updateSources();results();}if(e.target.matches('[data-option-source]')){source=e.target.value;results();}});
 window.addEventListener('holen-navigated',e=>{if(e.detail?.view===kind&&!root.children.length)setup();});
 if(location.hash==='#'+kind)setup();
}
})();
