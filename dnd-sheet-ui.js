/* Универсальный редактируемый лист D&D, сохранение в собственной записи characters. */
(()=>{'use strict';
const root=document.getElementById('dnd-sheet-root'),d=window.HOLEN_DND,auth=window.HOLEN_AUTH_UI;
if(!root||!d||!auth)return;
const params=new URLSearchParams(location.search),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let characterId=params.get('character')||null,updatedAt=null,loadedId=null,loadEpoch=0,saving=false,dirty=false,userId=auth.currentUserId();
let sheet=d.blank(params.get('edition')||'2014',params.get('class')||'fighter',params.get('race')||'human'),name='Новый персонаж';
const newDraftId='new:'+sheet.edition+':'+sheet.classId+':'+sheet.speciesId;
const signed=n=>(n>=0?'+':'')+n;
const input=(key,label,value,min=0,max=9999)=>'<label>'+esc(label)+'<input type="number" data-field="'+key+'" value="'+value+'" min="'+min+'" max="'+max+'" step="1"></label>';
const textInput=(key,label,value,max=160)=>'<label>'+esc(label)+'<input data-field="'+key+'" value="'+esc(value)+'" maxlength="'+max+'"></label>';
const options=(rows,selected)=>rows.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===selected?'selected':'')+'>'+esc(x.name)+'</option>').join('');
function draftKey(){return 'holen-dnd-draft-v1:'+ (auth.currentUserId()||'guest')+':'+(characterId||newDraftId);}
function storeDraft(){try{localStorage.setItem(draftKey(),JSON.stringify({name,sheet,updatedAt,dirty}));}catch(_){}}
function restoreDraft(){
 try{const value=JSON.parse(localStorage.getItem(draftKey())||'null');if(value){sheet=d.normalize(value.sheet);name=typeof value.name==='string'?value.name.slice(0,72):name;updatedAt=value.updatedAt||null;dirty=!!value.dirty;return true;}}catch(_){}
 return false;
}
function status(message){const el=root.querySelector('#dnd-save-status');if(el)el.textContent=message;}
function collect(){
 const next={...sheet,abilities:{...sheet.abilities},skills:{...sheet.skills},saveProficiencies:[],slots:sheet.slots.map(x=>({...x})),resources:sheet.resources.map(x=>({...x})),attacks:sheet.attacks.map(x=>({...x}))};
 root.querySelectorAll('[data-field]').forEach(e=>{const k=e.dataset.field;if(k==='name')name=e.value;else next[k]=e.type==='checkbox'?e.checked:e.type==='number'?Number(e.value):e.value;});
 root.querySelectorAll('[data-ability]').forEach(e=>next.abilities[e.dataset.ability]=Number(e.value));
 root.querySelectorAll('[data-save]').forEach(e=>{if(e.checked)next.saveProficiencies.push(e.dataset.save);});
 root.querySelectorAll('[data-skill]').forEach(e=>next.skills[e.dataset.skill]=Number(e.value));
 root.querySelectorAll('[data-slot]').forEach(e=>next.slots[Number(e.dataset.slot)][e.dataset.key]=Number(e.value));
 root.querySelectorAll('[data-resource]').forEach(e=>next.resources[Number(e.dataset.resource)][e.dataset.key]=e.dataset.key==='name'?e.value:Number(e.value));
 root.querySelectorAll('[data-attack]').forEach(e=>next.attacks[Number(e.dataset.attack)][e.dataset.key]=e.type==='checkbox'?e.checked:e.type==='number'?Number(e.value):e.value);
 sheet=d.normalize(next);return sheet;
}
function computed(){
 const pb=d.proficiency(sheet.level),cls=d.editions[sheet.edition].classes.find(x=>x.id===sheet.classId);
 root.querySelector('#dnd-proficiency').textContent=signed(pb);
 root.querySelector('#dnd-initiative').textContent=signed(d.modifier(sheet.abilities.dex)+sheet.initiativeBonus);
 root.querySelector('#dnd-hit-die').textContent='d'+cls.hitDie;
 root.querySelector('#dnd-passive').textContent=10+d.modifier(sheet.abilities.wis)+(sheet.skills.perception||0)*pb;
 for(const k of Object.keys(d.abilities)){
 root.querySelector('[data-mod="'+k+'"]').textContent=signed(d.modifier(sheet.abilities[k]));
 root.querySelector('[data-save-total="'+k+'"]').textContent=signed(d.modifier(sheet.abilities[k])+(sheet.saveProficiencies.includes(k)?pb:0));
 }
 for(const [id,,ability]of d.skills)root.querySelector('[data-skill-total="'+id+'"]').textContent=signed(d.modifier(sheet.abilities[ability])+(sheet.skills[id]||0)*pb);
 root.querySelector('#dnd-spell-dc').textContent=sheet.casting?8+pb+d.modifier(sheet.abilities[sheet.casting]):'—';
 root.querySelector('#dnd-spell-attack').textContent=sheet.casting?signed(pb+d.modifier(sheet.abilities[sheet.casting])):'—';
 root.querySelectorAll('[data-attack-total]').forEach(e=>{const a=sheet.attacks[Number(e.dataset.attackTotal)];e.textContent=signed(d.modifier(sheet.abilities[a.ability])+(a.proficient?pb:0)+a.bonus);});
}
function draw(){
 const edition=d.editions[sheet.edition];
 root.innerHTML='<div class="dnd-toolbar"><a class="btn subtle" href="index.html#profile">← Мой профиль</a><button class="btn primary" type="button" data-dnd-action="save" '+(saving?'disabled':'')+'>Сохранить в профиле</button><button class="btn subtle" type="button" data-dnd-action="export">Скачать копию</button><label class="btn subtle dnd-import">Загрузить копию<input type="file" accept="application/json,.json" id="dnd-import" class="visually-hidden"></label><button class="btn subtle" type="button" data-dnd-action="print">Печать</button></div>'+
 '<p id="dnd-save-status" class="dnd-save-status" role="status">'+(dirty?'Есть изменения. Черновик сохранён в этом браузере.':characterId?'Лист персонажа':'Заполни лист и сохрани его в своём профиле.')+'</p>'+
 '<form id="dnd-character-form"><section class="creature-panel"><h2>Персонаж</h2><div class="dnd-form-grid">'+textInput('name','Имя персонажа',name,72)+
 '<label>Редакция<select data-field="edition"><option value="2014" '+(sheet.edition==='2014'?'selected':'')+'>D&D 2014</option><option value="2024" '+(sheet.edition==='2024'?'selected':'')+'>D&D 2024</option></select></label>'+
 '<label>Класс<select data-field="classId">'+options(edition.classes,sheet.classId)+'</select></label><label>'+(sheet.edition==='2024'?'Вид':'Раса')+'<select data-field="speciesId">'+options(edition.species,sheet.speciesId)+'</select></label>'+
 input('level','Уровень',sheet.level,1,20)+textInput('subclass','Подкласс',sheet.subclass)+textInput('background','Предыстория',sheet.background)+textInput('alignment','Мировоззрение',sheet.alignment)+input('experience','Опыт',sheet.experience,0,9999999)+'</div>'+
 '<div class="dnd-reference-links"><a href="'+esc(d.referenceUrl(sheet.edition,'class',sheet.classId))+'">Справка о классе ↗</a><a href="'+esc(d.referenceUrl(sheet.edition,'species',sheet.speciesId))+'">Справка о происхождении ↗</a></div><p class="dnd-help">'+esc(edition.originNote)+'</p></section>'+
 '<section class="creature-panel"><h2>Характеристики и спасброски</h2><div class="dnd-abilities">'+Object.entries(d.abilities).map(([k,label])=>'<div class="dnd-ability"><label>'+label+'<input type="number" min="1" max="30" data-ability="'+k+'" value="'+sheet.abilities[k]+'"></label><strong data-mod="'+k+'"></strong><label class="dnd-check"><input type="checkbox" data-save="'+k+'" '+(sheet.saveProficiencies.includes(k)?'checked':'')+'> Владение спасброском</label><span>Спасбросок <b data-save-total="'+k+'"></b></span></div>').join('')+'</div></section>'+
 '<div class="dnd-sheet-columns"><section class="creature-panel"><h2>Бой и здоровье</h2><div class="dnd-derived"><div>Мастерство <strong id="dnd-proficiency"></strong></div><div>Инициатива <strong id="dnd-initiative"></strong></div><div>Кость хитов <strong id="dnd-hit-die"></strong></div><div>Пассивное восприятие <strong id="dnd-passive"></strong></div></div><div class="dnd-form-grid">'+
 input('hp','Текущие ОЗ',sheet.hp)+input('maxHp','Максимум ОЗ',sheet.maxHp,1)+input('tempHp','Временные ОЗ',sheet.tempHp)+input('armorClass','Класс защиты',sheet.armorClass,1,100)+input('speed','Скорость, футы',sheet.speed,0,1000)+input('initiativeBonus','Доп. бонус инициативы',sheet.initiativeBonus,-30,30)+input('hitDice','Оставшиеся кости хитов',sheet.hitDice,0,20)+input('deathSuccess','Успехи спасения от смерти',sheet.deathSuccess,0,3)+input('deathFailure','Провалы спасения от смерти',sheet.deathFailure,0,3)+'</div><label class="dnd-check"><input type="checkbox" data-field="inspiration" '+(sheet.inspiration?'checked':'')+'> Вдохновение</label></section>'+
 '<section class="creature-panel"><h2>Навыки</h2><div class="dnd-skills">'+d.skills.map(([id,label])=>'<label><span>'+label+'</span><select data-skill="'+id+'" aria-label="Владение: '+label+'">'+[0,1,2].map(n=>'<option value="'+n+'" '+((sheet.skills[id]||0)===n?'selected':'')+'>'+['Нет','Владение','Компетентность'][n]+'</option>').join('')+'</select><b data-skill-total="'+id+'"></b></label>').join('')+'</div></section></div>'+
 '<section class="creature-panel"><h2>Атаки</h2><div class="dnd-attacks">'+sheet.attacks.map((a,i)=>'<div class="dnd-attack"><div class="dnd-form-grid"><label>Название<input data-attack="'+i+'" data-key="name" value="'+esc(a.name)+'" maxlength="80"></label><label>Характеристика<select data-attack="'+i+'" data-key="ability">'+Object.entries(d.abilities).map(([id,label])=>'<option value="'+id+'" '+(a.ability===id?'selected':'')+'>'+label+'</option>').join('')+'</select></label><label>Доп. бонус<input type="number" min="-30" max="30" data-attack="'+i+'" data-key="bonus" value="'+a.bonus+'"></label><label>Урон<input data-attack="'+i+'" data-key="damage" value="'+esc(a.damage)+'" maxlength="120" placeholder="Например, 1d8+3 рубящего"></label><label>Дальность<input data-attack="'+i+'" data-key="range" value="'+esc(a.range)+'" maxlength="80"></label><label class="dnd-check"><input type="checkbox" data-attack="'+i+'" data-key="proficient" '+(a.proficient?'checked':'')+'> Владение</label></div><p>Бонус атаки: <strong data-attack-total="'+i+'"></strong></p><button type="button" class="btn subtle" data-dnd-action="remove-attack" data-index="'+i+'">Убрать атаку</button></div>').join('')+'</div><button type="button" class="btn subtle" data-dnd-action="add-attack">+ Добавить атаку</button></section>'+
 '<section class="creature-panel"><h2>Заклинания</h2><label>Характеристика заклинателя<select data-field="casting"><option value="">Нет</option>'+['int','wis','cha'].map(k=>'<option value="'+k+'" '+(sheet.casting===k?'selected':'')+'>'+d.abilities[k]+'</option>').join('')+'</select></label><div class="dnd-derived"><div>Сложность спасброска <strong id="dnd-spell-dc"></strong></div><div>Бонус атаки <strong id="dnd-spell-attack"></strong></div></div><p class="dnd-help">Ячейки заполняются по таблице класса и уровню. Ячейки договора колдуна можно вести отдельным ресурсом ниже.</p><div class="dnd-slot-grid">'+sheet.slots.map((x,i)=>'<div><strong>Круг '+(i+1)+'</strong><label>Осталось<input type="number" min="0" max="20" data-slot="'+i+'" data-key="current" value="'+x.current+'"></label><label>Всего<input type="number" min="0" max="20" data-slot="'+i+'" data-key="max" value="'+x.max+'"></label></div>').join('')+'</div><label>Известные и подготовленные заклинания<textarea data-field="spells" maxlength="8000" rows="6">'+esc(sheet.spells)+'</textarea></label></section>'+
 '<section class="creature-panel"><h2>Ресурсы класса</h2><div class="dnd-resources">'+sheet.resources.map((r,i)=>'<div class="dnd-resource"><label>Ресурс<input data-resource="'+i+'" data-key="name" value="'+esc(r.name)+'" maxlength="80"></label><label>Осталось<input type="number" min="0" max="999" data-resource="'+i+'" data-key="current" value="'+r.current+'"></label><label>Всего<input type="number" min="0" max="999" data-resource="'+i+'" data-key="max" value="'+r.max+'"></label><button class="btn subtle" type="button" data-dnd-action="remove-resource" data-index="'+i+'" aria-label="Убрать ресурс">×</button></div>').join('')+'</div><button class="btn subtle" type="button" data-dnd-action="add-resource">+ Добавить ресурс</button></section>'+
 '<div class="dnd-sheet-columns">'+[['features','Способности и владения'],['equipment','Снаряжение'],['notes','Заметки']].map(([key,label])=>'<section class="creature-panel"><h2>'+label+'</h2><textarea aria-label="'+label+'" data-field="'+key+'" maxlength="8000" rows="8">'+esc(sheet[key])+'</textarea></section>').join('')+'</div>'+
 '<p class="dnd-help">Лист рассчитывает модификаторы, мастерство, навыки и бонусы атак. Подклассы, повышение уровня, эффекты способностей и состав заклинаний отмечаются вручную. Здоровье этого листа сохраняется в профиле; боевое подключение D&D к онлайн-комнатам пока отдельно не реализовано.</p></form>';
 computed();
}
async function load(){
 if(!characterId||!auth.isAuthenticated()){draw();return;}
 const epoch=++loadEpoch,owner=auth.currentUserId();status('Загружаем персонажа…');
 try{
 const row=await auth.getCharacter(characterId);if(epoch!==loadEpoch||owner!==auth.currentUserId())return;
 if(row.pack_key!=='journeys')throw Error('Этот персонаж использует лист муравьиного отряда.');
 const draft=(()=>{try{return JSON.parse(localStorage.getItem(draftKey())||'null');}catch(_){return null;}})();
 sheet=d.normalize(row.sheet_data);name=row.name;updatedAt=row.updated_at;loadedId=row.id;dirty=false;
 if(draft?.dirty&&draft.updatedAt===row.updated_at){sheet=d.normalize(draft.sheet);name=draft.name;dirty=true;}
 draw();status(dirty?'Восстановлен несохранённый черновик этого листа.':'Лист загружен из профиля.');
 }catch(e){if(epoch!==loadEpoch)return;loadedId=null;draw();status(e.message||'Не удалось загрузить лист.');}
}
root.addEventListener('submit',e=>e.preventDefault());
root.addEventListener('input',e=>{
 if(!e.target.matches('input:not([type=file]),select,textarea'))return;
 collect();dirty=true;computed();storeDraft();status('Черновик сохранён в этом браузере. Нажми «Сохранить в профиле» для синхронизации.');
});
root.addEventListener('change',e=>{
 const key=e.target.dataset.field;
 if(['edition','classId','speciesId'].includes(key)){
 collect();const cls=d.editions[sheet.edition].classes.find(x=>x.id===sheet.classId),species=d.editions[sheet.edition].species.find(x=>x.id===sheet.speciesId);
 if(key==='edition'||key==='classId'){sheet.saveProficiencies=[...cls.saves];sheet.casting=cls.casting;sheet.subclass='';}
 if(key==='edition'||key==='speciesId')sheet.speed=species.speed;
 dirty=true;storeDraft();draw();
 }
});
root.addEventListener('click',async e=>{
 const button=e.target.closest('[data-dnd-action]');if(!button)return;
 const action=button.dataset.dndAction;collect();
 if(action==='print'){window.print();return;}
 if(action==='export'){
 const blob=new Blob([JSON.stringify({format:'holen-dnd-character-v1',name,sheet},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='dnd-'+sheet.edition+'-character.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
 }
 if(action==='add-attack'&&sheet.attacks.length<20)sheet.attacks.push({name:'',ability:'str',proficient:true,bonus:0,damage:'',range:''});
 else if(action==='remove-attack')sheet.attacks.splice(Number(button.dataset.index),1);
 else if(action==='add-resource'&&sheet.resources.length<12)sheet.resources.push({name:'',current:0,max:0});
 else if(action==='remove-resource')sheet.resources.splice(Number(button.dataset.index),1);
 else if(action==='save'){
 if(saving)return;
 if(!auth.isAuthenticated()){status('Войди в аккаунт, чтобы сохранить лист в профиле.');auth.open('login');return;}
 if(!name.trim()||name.trim().length>72){status('Имя персонажа: от 1 до 72 символов.');return;}
 if(characterId&&loadedId!==characterId){status('Сначала загрузите доступный вам лист.');return;}
 saving=true;button.disabled=true;const owner=auth.currentUserId(),payload=d.normalize(sheet),savedName=name.trim();status('Сохраняем в профиле…');
 try{
 const row=characterId?await auth.updateDndCharacter(characterId,savedName,payload,updatedAt):await auth.createCharacter(savedName,'journeys',null,payload);
 if(owner!==auth.currentUserId())return;
 const changed=JSON.stringify(d.normalize(sheet))!==JSON.stringify(payload)||name.trim()!==savedName;
 const oldKey=draftKey();characterId=row.id;loadedId=row.id;updatedAt=row.updated_at;
 if(!changed)name=row.name;dirty=changed;
 try{localStorage.removeItem(oldKey);}catch(_){}
 const url=new URL(location.href);url.searchParams.set('character',characterId);url.searchParams.delete('class');url.searchParams.delete('race');url.searchParams.delete('edition');history.replaceState(history.state,'',url);
 storeDraft();status(changed?'Лист сохранён. Более новые изменения остались в черновике; сохрани их ещё раз.':'Лист сохранён в профиле.');window.dispatchEvent(new Event('holen-characters-changed'));
 }catch(err){status(err.message||'Не удалось сохранить. Черновик остаётся в этом браузере.');}
 finally{saving=false;button.disabled=false;}
 return;
 }
 dirty=true;storeDraft();draw();
});
root.addEventListener('change',async e=>{
 if(e.target.id!=='dnd-import')return;
 const file=e.target.files?.[0];if(!file)return;
 if(file.size>100000){status('Файл слишком большой. Допустимо до 100 КБ.');return;}
 try{const value=JSON.parse(await file.text());if(value.format!=='holen-dnd-character-v1'||!value.sheet)throw Error('Неверный формат копии.');sheet=d.normalize(value.sheet);name=String(value.name||'Персонаж').slice(0,72);dirty=true;storeDraft();draw();status('Копия загружена в черновик. Сохрани её в профиле.');}catch(err){status(err.message||'Не удалось открыть копию.');}
});
window.addEventListener('holen-auth-changed',()=>{
 const next=auth.currentUserId();if(next!==userId){
  const guest=!userId&&!!next&&!characterId,guestSheet=sheet,guestName=name,guestDirty=dirty;
  loadEpoch++;loadedId=null;updatedAt=null;dirty=false;
  sheet=d.blank(params.get('edition')||'2014',params.get('class')||'fighter',params.get('race')||'human');name='Новый персонаж';userId=next;
  if(!characterId&&!restoreDraft()&&guest){sheet=guestSheet;name=guestName;dirty=guestDirty;}
 }
 load();
});
window.addEventListener('holen-navigated',e=>{if(e.detail?.view==='dnd-sheet'&&characterId&&loadedId!==characterId)load();});
restoreDraft();draw();load();
})();
