/* Универсальный редактируемый лист D&D, сохранение в собственной записи characters. */
(()=>{'use strict';
const root=document.getElementById('dnd-sheet-root'),d=window.HOLEN_DND,auth=window.HOLEN_AUTH_UI;
if(!root||!d||!auth)return;
const params=new URLSearchParams(location.search),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let characterId=params.get('character')||null,updatedAt=null,loadedId=null,loadEpoch=0,saving=false,dirty=false,userId=auth.currentUserId();
let sheet=d.blank(params.get('edition')||'2014',params.get('class')||'fighter',params.get('race')||'human'),name=(params.get('name')||'Новый персонаж').slice(0,72);
const newDraftId='new:'+sheet.edition+':'+sheet.classId+':'+sheet.speciesId+(['background','feat','name'].some(k=>params.has(k))?':'+(params.get('background')||'')+':'+(params.get('feat')||'')+':'+(params.get('name')||''):'');
const prefillBackground=window.HOLEN_DND_OPTIONS?.editions[sheet.edition].backgrounds.find(x=>x.id===params.get('background'));if(prefillBackground){sheet.backgroundId=prefillBackground.id;sheet.background=prefillBackground.name;for(const id of prefillBackground.skills)sheet.skills[id]=1;if(prefillBackground.originFeat)sheet.featIds.push(prefillBackground.originFeat);}
if(window.HOLEN_DND_OPTIONS?.editions[sheet.edition].feats.some(x=>x.id===params.get('feat')))sheet.featIds.push(params.get('feat'));
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
 const previous=sheet; const next={...sheet,baseAbilities:{...sheet.baseAbilities},abilityBonuses:{...sheet.abilityBonuses},coins:{...sheet.coins},inventory:sheet.inventory.map(x=>({...x})),hitRolls:[...sheet.hitRolls],abilities:{...sheet.abilities},skills:{...sheet.skills},saveProficiencies:[],slots:sheet.slots.map(x=>({...x})),resources:sheet.resources.map(x=>({...x})),attacks:sheet.attacks.map(x=>({...x}))};
 root.querySelectorAll('[data-field]').forEach(e=>{const k=e.dataset.field;if(k==='name')name=e.value;else next[k]=e.type==='checkbox'?e.checked:e.type==='number'?Number(e.value):e.value;});
 root.querySelectorAll('[data-ability]').forEach(e=>next.baseAbilities[e.dataset.ability]=Number(e.value));
 root.querySelectorAll('[data-save]').forEach(e=>{if(e.checked)next.saveProficiencies.push(e.dataset.save);});
 root.querySelectorAll('[data-skill]').forEach(e=>next.skills[e.dataset.skill]=Number(e.value));
 root.querySelectorAll('[data-slot]').forEach(e=>next.slots[Number(e.dataset.slot)][e.dataset.key]=Number(e.value));
 root.querySelectorAll('[data-resource]').forEach(e=>next.resources[Number(e.dataset.resource)][e.dataset.key]=e.dataset.key==='name'?e.value:Number(e.value));
 root.querySelectorAll('[data-attack]').forEach(e=>next.attacks[Number(e.dataset.attack)][e.dataset.key]=e.type==='checkbox'?e.checked:e.type==='number'?Number(e.value):e.value);
 root.querySelectorAll('[data-bonus]').forEach(e=>next.abilityBonuses[e.dataset.bonus]=Number(e.value));
 root.querySelectorAll('[data-hp-roll]').forEach(e=>next.hitRolls[Number(e.dataset.hpRoll)]=Number(e.value));
 root.querySelectorAll('[data-coin]').forEach(e=>next.coins[e.dataset.coin]=Number(e.value));
 root.querySelectorAll('[data-inventory]').forEach(e=>next.inventory[Number(e.dataset.inventory)][e.dataset.key]=e.type==='checkbox'?e.checked:e.type==='number'?Number(e.value):e.value);
 sheet=d.reconcileHealth(previous,next);return sheet;
}
function computed(){
 const set=(id,value)=>{const el=root.querySelector('#'+id);if(el)el.textContent=value;};
 set('dnd-summary-name',name);set('dnd-summary-level',sheet.level);set('dnd-summary-ac',sheet.armorClass);set('dnd-summary-speed',sheet.speed);set('dnd-summary-hp',sheet.hp+' / '+sheet.maxHp);
 set('dnd-wallet-total',(d.totalCopper(sheet.coins)/100).toLocaleString('ru')+' зм');
 set('dnd-carry-weight','Вес: '+sheet.inventory.reduce((n,x)=>n+x.quantity*x.weight,0).toLocaleString('ru')+' фунтов');
 set('dnd-point-cost',sheet.abilityMode==='point-buy'?'Потрачено '+(d.pointBuyCost(sheet.baseAbilities)??'—')+' / 27 очков':sheet.abilityMode==='standard-array'?'Набор: 15, 14, 13, 12, 10, 8':'');
 set('dnd-xp-next',sheet.level<20?'До уровня '+(sheet.level+1)+': '+Math.max(0,d.xpForLevel(sheet.level+1)-sheet.experience)+' опыта':'Достигнут 20 уровень');
 set('dnd-hp-formula',sheet.hpMode==='manual'?'Максимум ОЗ задаётся вручную.':'Первый уровень: кость класса + Телосложение. Затем '+(sheet.hpMode==='rolled'?'свои броски':'среднее по кости')+' + Телосложение за каждый уровень, минимум 1 ОЗ за уровень.');
 for(const key of ['hp','maxHp','level']){const el=root.querySelector('[data-field="'+key+'"]');if(el){el.value=sheet[key];el.readOnly=key==='maxHp'&&sheet.hpMode!=='manual'||key==='level'&&sheet.levelMode==='xp';}}
 for(const k of Object.keys(d.abilities)){const total=root.querySelector('[data-score-total="'+k+'"]');if(total)total.textContent=sheet.abilityBonuses[k]?'Итого '+sheet.abilities[k]:'';}

 const pb=d.proficiency(sheet.level),cls=d.editions[sheet.edition].classes.find(x=>x.id===sheet.classId);
 const subclassField=root.querySelector('[data-field="selectedSubclassId"]');
 if(subclassField){const rows=[{id:'',name:sheet.subclass&&!sheet.selectedSubclassId?sheet.subclass:sheet.level<cls.subclassLevel?'Доступен с '+cls.subclassLevel+' уровня':'Выбери подкласс'},...selectedOptions()],chosen=optData().subclasses.find(x=>x.id===sheet.selectedSubclassId);if(chosen&&!rows.some(x=>x.id===chosen.id))rows.push({...chosen,name:chosen.name+' · проверь условия'});subclassField.innerHTML=options(rows,sheet.selectedSubclassId);}
 const featPicker=root.querySelector('#dnd-feat-picker');if(featPicker)featPicker.innerHTML='<option value="">Доступные черты…</option>'+options((window.HOLEN_DND_OPTIONS?.availableFeats(sheet)||[]).filter(x=>!sheet.featIds.includes(x.id)),featPicker.value);
 const rollGrid=root.querySelector('.dnd-roll-grid');if(rollGrid&&rollGrid.childElementCount!==sheet.level-1)rollGrid.innerHTML=Array.from({length:Math.max(0,sheet.level-1)},(_,i)=>`<label>Ур. ${i+2}<input type="number" data-hp-roll="${i}" min="1" max="${cls.hitDie}" value="${sheet.hitRolls[i]??Math.floor(cls.hitDie/2)+1}"></label>`).join('');
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
 root.querySelectorAll('[data-attack-total]').forEach(e=>{const a=sheet.attacks[Number(e.dataset.attackTotal)];e.textContent=signed(d.modifier(sheet.abilities[a.ability])+(a.proficient?pb:0)+a.bonus);
 const weapon=weaponPresets.find(x=>x.id===a.weaponId);if(weapon){a.damage=weapon.damage+signed(d.modifier(sheet.abilities[a.ability]))+' '+weapon.type;root.querySelector('[data-attack="'+e.dataset.attackTotal+'"][data-key="damage"]').value=a.damage;}});
}
const builderTabs=[['setup','Сборка'],['combat','Атаки'],['spells','Заклинания'],['inventory','Снаряжение'],['features','Способности'],['personality','Личность'],['notes','Заметки']];
let activeTab='setup',statsOpen=innerWidth>760,spellQuery='';
const selectField=(key,label,rows,value)=>`<label>${esc(label)}<select data-field="${key}">${options(rows,value)}</select></label>`;
const area=(key,label,rows=5)=>`<label>${esc(label)}<textarea data-field="${key}" maxlength="8000" rows="${rows}">${esc(sheet[key])}</textarea></label>`;
function optData(){return window.HOLEN_DND_OPTIONS?.editions[sheet.edition]||{subclasses:[],backgrounds:[],feats:[],spells:[]};}
function selectedOptions(){
 const all=window.HOLEN_DND_OPTIONS;return all?.availableSubclasses?all.availableSubclasses(sheet):optData().subclasses.filter(x=>x.classId===sheet.classId&&x.level<=sheet.level);
}
function spellList(){
 const items=optData().spells||[];
 const list=items.filter(x=>sheet.spellIds.includes(x.id));
 const search=items.filter(x=>!sheet.spellIds.includes(x.id)&&(x.name+' '+(x.nameRu||'')).toLocaleLowerCase('ru').includes(spellQuery)&&(!spellClassOnly||x.classes?.includes(sheet.classId)));
 return `<div class="dnd-spell-tools"><label>Найти заклинание<input id="dnd-spell-search" type="search" value="${esc(spellQuery)}" placeholder="Название…"></label><label class="dnd-check"><input id="dnd-spell-class-only" type="checkbox" ${spellClassOnly?'checked':''}> Список моего класса</label><span class="muted">Найдено: ${search.length}</span></div><div class="dnd-spell-selected">${list.length?list.map(x=>`<div><span><strong>${esc(x.nameRu||x.name)}</strong><small>${x.level?'Круг '+x.level:'Заговор'}</small></span><a href="${esc(x.source)}" target="_blank" rel="noopener">Правила ↗</a><button type="button" class="btn subtle" data-dnd-action="remove-spell" data-id="${esc(x.id)}" aria-label="Убрать ${esc(x.name)}">×</button></div>`).join(''):'<p class="dnd-help">Добавь известные или подготовленные заклинания.</p>'}</div><details class="dnd-spell-results" ${spellQuery?'open':''}><summary>Выбрать из списка · ${search.length}</summary><div>${search.slice(0,60).map(x=>`<button type="button" data-dnd-action="add-spell" data-id="${esc(x.id)}"><span>${esc(x.nameRu||x.name)}</span><small>${x.level?'Круг '+x.level:'Заговор'} · +</small></button>`).join('')}</div>${search.length>60?'<p class="dnd-help">Показаны первые 60. Уточни название для остальных.</p>':''}</details>`;
}
let spellClassOnly=true;
function draw(){
 const edition=d.editions[sheet.edition],cls=edition.classes.find(x=>x.id===sheet.classId),species=edition.species.find(x=>x.id===sheet.speciesId),o=optData();
 const subclasses=selectedOptions(),chosenSubclass=o.subclasses.find(x=>x.id===sheet.selectedSubclassId);
 const subclassRows=[{id:'',name:sheet.subclass&&!sheet.selectedSubclassId?sheet.subclass:sheet.level<cls.subclassLevel?'Доступен с '+cls.subclassLevel+' уровня':'Выбери подкласс'},...subclasses];
 if(chosenSubclass&&!subclasses.some(x=>x.id===chosenSubclass.id))subclassRows.push({id:chosenSubclass.id,name:chosenSubclass.name+' · проверь условия'});
 const backgrounds=[{id:'',name:sheet.background&&!sheet.backgroundId?sheet.background:'Выбери предысторию'},...o.backgrounds];
 const availableFeats=window.HOLEN_DND_OPTIONS?.availableFeats?.(sheet)||o.feats;
 const availableIds=new Set(availableFeats.map(x=>x.id));
 const feats=[...availableFeats,...o.feats.filter(x=>sheet.featIds.includes(x.id)&&!availableIds.has(x.id))];
 const fieldGrid=(s)=>`<div class="dnd-form-grid">${s}</div>`;
 const setup=fieldGrid(textInput('name','Имя персонажа',name,72)+selectField('edition','Редакция',[{id:'2014',name:'D&D 2014'},{id:'2024',name:'D&D 2024'}],sheet.edition)+selectField('classId','Класс',edition.classes,sheet.classId)+selectField('speciesId',sheet.edition==='2024'?'Вид':'Раса',edition.species,sheet.speciesId)+selectField('selectedSubclassId','Подкласс',subclassRows,sheet.selectedSubclassId)+selectField('backgroundId','Предыстория',backgrounds,sheet.backgroundId)+selectField('levelMode','Рост уровня',[{id:'manual',name:'Уровень вручную'},{id:'xp',name:'По опыту'}],sheet.levelMode)+input('level','Уровень',sheet.level,1,20)+input('experience','Опыт',sheet.experience,0,9999999))+`<p class="dnd-help" id="dnd-xp-next"></p><div class="dnd-reference-links"><a href="${esc(d.referenceUrl(sheet.edition,'class',sheet.classId))}">Класс ↗</a><a href="${esc(d.referenceUrl(sheet.edition,'species',sheet.speciesId))}">Происхождение ↗</a><a href="index.html?edition=${sheet.edition}#backgrounds">Предыстории ↗</a><a href="index.html?edition=${sheet.edition}#feats">Черты ↗</a></div><details class="dnd-settings"><summary>Свои предыстория и подкласс</summary>${textInput('background','Название предыстории',sheet.background)}${textInput('subclass','Название подкласса',sheet.subclass)}</details><h3>Характеристики</h3>${fieldGrid(selectField('abilityMode','Распределение',[{id:'manual',name:'Вручную / броски'},{id:'point-buy',name:'Покупка за 27 очков'},{id:'standard-array',name:'Стандартный набор'}],sheet.abilityMode))}<div class="dnd-inline"><button type="button" class="btn subtle" data-dnd-action="standard-array">Назначить 15, 14, 13, 12, 10, 8</button><span id="dnd-point-cost" role="status"></span></div><details class="dnd-settings"><summary>Бонусы происхождения и черт</summary><p class="dnd-help">${esc(edition.originNote)} Укажи выбранные прибавки здесь: они добавятся к базовым значениям слева.</p><div class="dnd-bonus-grid">${Object.entries(d.abilities).map(([k,label])=>`<label>${label}<input type="number" data-bonus="${k}" min="-10" max="10" value="${sheet.abilityBonuses[k]}"></label>`).join('')}</div></details><h3>Здоровье при повышении уровня</h3>${fieldGrid(selectField('hpMode','Способ расчёта',[{id:'average',name:'Среднее по кости класса'},{id:'rolled',name:'Свои броски кости'},{id:'manual',name:'Максимум вручную'}],sheet.hpMode)+input('hpAdjustment','Дополнительные ОЗ',sheet.hpAdjustment,-9999,9999))}<p class="dnd-help" id="dnd-hp-formula"></p>${sheet.hpMode==='rolled'?`<div class="dnd-roll-grid">${Array.from({length:Math.max(0,sheet.level-1)},(_,i)=>`<label>Ур. ${i+2}<input type="number" data-hp-roll="${i}" min="1" max="${cls.hitDie}" value="${sheet.hitRolls[i]??Math.floor(cls.hitDie/2)+1}"></label>`).join('')}</div>`:''}<p class="dnd-help">При изменении уровня и Телосложения максимум пересчитывается, полученный урон сохраняется. Для особых эффектов есть дополнительные ОЗ.</p>`;
 const attacks=sheet.attacks.map((a,i)=>`<details class="dnd-attack" open><summary><span>${esc(a.name||'Новая атака')}</span><strong data-attack-total="${i}"></strong></summary>${fieldGrid(`<label>Название<input data-attack="${i}" data-key="name" value="${esc(a.name)}" maxlength="80"></label><label>Характеристика<select data-attack="${i}" data-key="ability">${options(Object.entries(d.abilities).map(([id,name])=>({id,name})),a.ability)}</select></label><label>Доп. бонус<input type="number" min="-30" max="30" data-attack="${i}" data-key="bonus" value="${a.bonus}"></label><label>Урон и вид<input data-attack="${i}" data-key="damage" value="${esc(a.damage)}" maxlength="120" placeholder="1d8+3 рубящего"></label><label>Дальность<input data-attack="${i}" data-key="range" value="${esc(a.range)}" maxlength="80"></label><label class="dnd-check"><input type="checkbox" data-attack="${i}" data-key="proficient" ${a.proficient?'checked':''}> Владение</label>`)}<button type="button" class="btn subtle" data-dnd-action="remove-attack" data-index="${i}">Убрать</button></details>`).join('');
 const combat=`<div class="dnd-combat-fields">${input('hp','ОЗ сейчас',sheet.hp)+input('maxHp','Максимум ОЗ',sheet.maxHp,1)+input('tempHp','Временные ОЗ',sheet.tempHp)+input('armorClass','Класс защиты',sheet.armorClass,1,100)+input('speed','Скорость, футы',sheet.speed,0,1000)+input('initiativeBonus','Доп. инициатива',sheet.initiativeBonus,-30,30)+input('hitDice','Кости хитов',sheet.hitDice,0,20)}</div><div class="dnd-derived"><div>Инициатива <strong id="dnd-initiative"></strong></div><div>Кость хитов <strong id="dnd-hit-die"></strong></div></div><h3>Оружие и атаки</h3><div class="dnd-inline"><select id="dnd-weapon-preset" aria-label="Оружие">${options(weaponPresets,'longsword')}</select><button type="button" class="btn subtle" data-dnd-action="add-weapon">+ Оружие</button><button type="button" class="btn subtle" data-dnd-action="add-attack">+ Своя атака</button></div><div class="dnd-attacks">${attacks}</div><details class="dnd-settings"><summary>Спасение от смерти и вдохновение</summary>${fieldGrid(input('deathSuccess','Успехи',sheet.deathSuccess,0,3)+input('deathFailure','Провалы',sheet.deathFailure,0,3))}<label class="dnd-check"><input type="checkbox" data-field="inspiration" ${sheet.inspiration?'checked':''}> Вдохновение</label></details>`;
 const spells=`${fieldGrid(selectField('casting','Характеристика заклинателя',[{id:'',name:'Нет'},...['int','wis','cha'].map(id=>({id,name:d.abilities[id]}))],sheet.casting))}<div class="dnd-derived"><div>Сложность спасброска <strong id="dnd-spell-dc"></strong></div><div>Атака заклинанием <strong id="dnd-spell-attack"></strong></div></div><div id="dnd-spell-library">${spellList()}</div><details class="dnd-settings"><summary>Ячейки заклинаний</summary><p class="dnd-help">Количество ячеек укажи по таблице класса. Ячейки договора удобно вести отдельным ресурсом.</p><div class="dnd-slot-grid">${sheet.slots.map((x,i)=>`<div><strong>Круг ${i+1}</strong><label>Осталось<input type="number" min="0" max="20" data-slot="${i}" data-key="current" value="${x.current}"></label><label>Всего<input type="number" min="0" max="20" data-slot="${i}" data-key="max" value="${x.max}"></label></div>`).join('')}</div></details>${area('spells','Другие заклинания и пометки',4)}`;
 const inventory=`<section class="dnd-wallet"><div class="dnd-wallet-head"><h3>Кошелёк</h3><strong id="dnd-wallet-total"></strong></div><div class="dnd-coin-grid">${Object.entries(coinNames).map(([k,label])=>`<label>${label}<input type="number" data-coin="${k}" min="0" max="100000000" value="${sheet.coins[k]}"></label>`).join('')}</div><div class="dnd-exchange"><label>Обменять<input type="number" id="dnd-exchange-amount" min="1" step="1" value="10"></label><label>Из<select id="dnd-exchange-from">${options(coinOptions,'gp')}</select></label><span aria-hidden="true">→</span><label>В<select id="dnd-exchange-to">${options(coinOptions,'sp')}</select></label><button class="btn subtle" type="button" data-dnd-action="exchange">Обменять</button></div><p id="dnd-exchange-status" role="status"></p></section><h3>Предметы</h3><div class="dnd-inventory-list">${sheet.inventory.map((x,i)=>`<details class="dnd-inventory-item"><summary>${esc(x.name||'Новый предмет')} <span>× ${x.quantity}</span></summary>${fieldGrid(`<label>Название<input data-inventory="${i}" data-key="name" value="${esc(x.name)}" maxlength="120"></label><label>Количество<input data-inventory="${i}" data-key="quantity" type="number" min="0" max="9999" value="${x.quantity}"></label><label>Вес одной, фунты<input data-inventory="${i}" data-key="weight" type="number" step="0.01" min="0" max="9999" value="${x.weight}"></label><label class="dnd-check"><input data-inventory="${i}" data-key="equipped" type="checkbox" ${x.equipped?'checked':''}> Надето</label>`)}<label>Описание<textarea data-inventory="${i}" data-key="notes" maxlength="2000" rows="3">${esc(x.notes)}</textarea></label><button type="button" class="btn subtle" data-dnd-action="remove-item" data-index="${i}">Убрать предмет</button></details>`).join('')}</div><div class="dnd-inline"><button class="btn subtle" type="button" data-dnd-action="add-item">+ Предмет</button><span id="dnd-carry-weight"></span></div>${area('equipment','Дополнительное снаряжение',5)}`;
 const selectedFeats=sheet.featIds.map(id=>o.feats.find(x=>x.id===id)).filter(Boolean);
 const features=`<h3>Черты</h3><div class="dnd-inline"><select id="dnd-feat-picker" aria-label="Выбрать черту"><option value="">Доступные черты…</option>${options(feats.filter(x=>!sheet.featIds.includes(x.id)),'')}</select><button type="button" class="btn subtle" data-dnd-action="add-feat">+ Добавить</button></div><div class="dnd-feat-selected">${selectedFeats.map(x=>{const eligibility=window.HOLEN_DND_OPTIONS.featEligibility(x,sheet);return `<article><div><strong>${esc(x.name)}</strong><small>${esc(x.description||'')}</small><a href="${esc(x.source)}" target="_blank" rel="noopener">Правила ↗</a>${!eligibility.eligible?`<small class="is-error">${esc(eligibility.reasons.join('; '))}</small>`:''}${eligibility.manual.length?`<small>Проверь: ${esc(eligibility.manual.join('; '))}</small>`:''}</div><button type="button" class="btn subtle" data-dnd-action="remove-feat" data-id="${esc(x.id)}" aria-label="Убрать черту">×</button></article>`;}).join('')}</div><p class="dnd-help">Список учитывает редакцию, уровень и проверенные требования. Дополнительные условия показаны у выбранной черты. Доступность самой ячейки черты и выбранные прибавки проверь по развитию класса; прибавки можно указать во вкладке «Сборка».</p><h3>Ресурсы</h3><div class="dnd-resources">${sheet.resources.map((r,i)=>`<div class="dnd-resource"><label>Название<input data-resource="${i}" data-key="name" value="${esc(r.name)}" maxlength="80"></label><label>Осталось<input type="number" min="0" max="999" data-resource="${i}" data-key="current" value="${r.current}"></label><label>Всего<input type="number" min="0" max="999" data-resource="${i}" data-key="max" value="${r.max}"></label><button class="btn subtle" type="button" data-dnd-action="remove-resource" data-index="${i}" aria-label="Убрать ресурс">×</button></div>`).join('')}</div><button class="btn subtle" type="button" data-dnd-action="add-resource">+ Ресурс</button>${area('features','Способности, владения и эффекты',6)}`;
 const personality=fieldGrid(textInput('playerName','Игрок',sheet.playerName)+textInput('alignment','Мировоззрение',sheet.alignment)+textInput('age','Возраст',sheet.age)+textInput('height','Рост',sheet.height)+textInput('weight','Вес',sheet.weight)+textInput('eyes','Глаза',sheet.eyes)+textInput('hair','Волосы',sheet.hair)+textInput('skin','Кожа',sheet.skin))+[['appearance','Внешность'],['backstory','История'],['allies','Союзники'],['personality','Характер'],['ideals','Идеалы'],['bonds','Привязанности'],['flaws','Слабости'],['languages','Языки и инструменты']].map(([key,label])=>area(key,label,3)).join('');
 const panels={setup,combat,spells,inventory,features,personality,notes:area('notes','Заметки',14)};
 root.innerHTML=`<div class="dnd-toolbar"><a class="btn subtle" href="index.html#profile">← Профиль</a><button class="btn primary" type="button" data-dnd-action="save" ${saving?'disabled':''}>Сохранить</button><button class="btn subtle" type="button" data-dnd-action="focus">${document.body.classList.contains('dnd-focus-mode')?'Обычный вид':'Развернуть'}</button><details class="dnd-file-menu"><summary>Копия / печать</summary><div><button class="btn subtle" type="button" data-dnd-action="export">Скачать копию</button><label class="btn subtle dnd-import">Загрузить копию<input type="file" accept="application/json,.json" id="dnd-import" class="visually-hidden"></label><button class="btn subtle" type="button" data-dnd-action="print">Печать</button></div></details></div><p id="dnd-save-status" class="dnd-save-status" role="status">${dirty?'Есть изменения · черновик сохранён в браузере.':characterId?'Лист персонажа':'Собери персонажа и сохрани в профиле.'}</p><div class="dnd-summary"><div class="dnd-summary-title"><strong id="dnd-summary-name">${esc(name)}</strong><small>${edition.label} · ${esc(species.name)} · ${esc(cls.name)}</small></div><div><span>Уровень</span><b id="dnd-summary-level">${sheet.level}</b></div><div><span>Мастерство</span><b id="dnd-proficiency"></b></div><div><span>КД</span><b id="dnd-summary-ac">${sheet.armorClass}</b></div><div><span>ОЗ</span><b id="dnd-summary-hp">${sheet.hp}/${sheet.maxHp}</b></div><div><span>Скорость</span><b id="dnd-summary-speed">${sheet.speed}</b></div></div><form id="dnd-character-form" class="dnd-compact-form"><div class="dnd-compact-shell"><details class="dnd-stat-column" ${statsOpen?'open':''}><summary>Характеристики и навыки <span id="dnd-passive"></span></summary><div>${Object.entries(d.abilities).map(([k,label])=>`<section class="dnd-stat-group"><div class="dnd-stat-head"><label>${label}<input type="number" min="1" max="30" data-ability="${k}" value="${sheet.baseAbilities[k]}" aria-label="Базовая ${label}"></label><strong data-mod="${k}"></strong><small data-score-total="${k}"></small></div><label class="dnd-check"><input type="checkbox" data-save="${k}" ${sheet.saveProficiencies.includes(k)?'checked':''}> Спасбросок <b data-save-total="${k}"></b></label>${d.skills.filter(x=>x[2]===k).map(([id,label])=>`<label class="dnd-skill-row"><span>${label}</span><select data-skill="${id}" aria-label="Владение: ${label}">${[0,1,2].map(n=>`<option value="${n}" ${(sheet.skills[id]||0)===n?'selected':''}>${['—','М','М×2'][n]}</option>`).join('')}</select><b data-skill-total="${id}"></b></label>`).join('')}</section>`).join('')}<p class="dnd-help">М — владение; М×2 — компетентность.</p></div></details><div class="dnd-main-column"><nav class="dnd-tabbar" role="tablist" aria-label="Разделы листа">${builderTabs.map(([id,label])=>`<button type="button" role="tab" id="dnd-tab-${id}" data-dnd-tab="${id}" aria-selected="${activeTab===id}" aria-controls="dnd-panel-${id}" tabindex="${activeTab===id?'0':'-1'}">${label}</button>`).join('')}</nav>${builderTabs.map(([id,label])=>`<section class="dnd-tab-panel" role="tabpanel" id="dnd-panel-${id}" aria-labelledby="dnd-tab-${id}" ${activeTab===id?'':'hidden'}>${panels[id]}</section>`).join('')}</div></div></form><p class="dnd-help dnd-room-link-note">Лист сохраняется в профиле. Боевые действия и здоровье D&D в онлайн-комнатах пока отдельно не подключены.</p>`;
 computed();
 root.insertAdjacentHTML('beforeend',window.HOLEN_SRD.attribution());
}
const coinNames={cp:'Медь',sp:'Серебро',ep:'Электрум',gp:'Золото',pp:'Платина'},coinOptions=Object.entries(coinNames).map(([id,name])=>({id,name}));
const weaponPresets=[{id:'longsword',name:'Длинный меч',damage:'1d8',type:'рубящий',ability:'str',range:'5 футов'},{id:'dagger',name:'Кинжал',damage:'1d4',type:'колющий',finesse:true,ability:'str',range:'5 / 20–60 футов'},{id:'rapier',name:'Рапира',damage:'1d8',type:'колющий',finesse:true,ability:'str',range:'5 футов'},{id:'shortbow',name:'Короткий лук',damage:'1d6',type:'колющий',ability:'dex',range:'80 / 320 футов'},{id:'longbow',name:'Длинный лук',damage:'1d8',type:'колющий',ability:'dex',range:'150 / 600 футов'},{id:'light-crossbow',name:'Лёгкий арбалет',damage:'1d8',type:'колющий',ability:'dex',range:'80 / 320 футов'},{id:'quarterstaff',name:'Боевой посох',damage:'1d6',type:'дробящий',ability:'str',range:'5 футов'},{id:'greataxe',name:'Секира',damage:'1d12',type:'рубящий',ability:'str',range:'5 футов'},{id:'greatsword',name:'Двуручный меч',damage:'2d6',type:'рубящий',ability:'str',range:'5 футов'}];

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
 if(e.target.id==='dnd-spell-search'){spellQuery=e.target.value.toLocaleLowerCase('ru');const pos=e.target.selectionStart;root.querySelector('#dnd-spell-library').innerHTML=spellList();const field=root.querySelector('#dnd-spell-search');field.focus();field.setSelectionRange(pos,pos);return;}
 if(!e.target.matches('[data-field],[data-ability],[data-save],[data-skill],[data-slot],[data-resource],[data-attack],[data-bonus],[data-hp-roll],[data-coin],[data-inventory]'))return;
 const before=sheet;collect();
 if(e.target.hasAttribute('data-attack')&&e.target.dataset.key==='damage')sheet.attacks[Number(e.target.dataset.attack)].weaponId='';
 if(sheet.abilityMode==='point-buy'&&e.target.dataset.ability&&(d.pointBuyCost(sheet.baseAbilities)===null||d.pointBuyCost(sheet.baseAbilities)>27)){
  sheet=before;e.target.value=sheet.baseAbilities[e.target.dataset.ability];computed();status('Для покупки: значения от 8 до 15 и не более 27 очков.');return;
 }
 dirty=true;computed();storeDraft();status('Черновик сохранён · нажми «Сохранить» для профиля.');
});
root.addEventListener('change',e=>{
 if(e.target.id==='dnd-spell-class-only'){spellClassOnly=e.target.checked;root.querySelector('#dnd-spell-library').innerHTML=spellList();return;}
 const key=e.target.dataset.field;
 if(['edition','classId','speciesId','levelMode','hpMode','abilityMode','backgroundId','selectedSubclassId'].includes(key)){
  collect();const cls=d.editions[sheet.edition].classes.find(x=>x.id===sheet.classId),species=d.editions[sheet.edition].species.find(x=>x.id===sheet.speciesId);
  if(key==='edition'||key==='classId'){sheet.saveProficiencies=[...cls.saves];sheet.casting=cls.casting;sheet.subclass='';sheet.selectedSubclassId='';}
  if(key==='edition'){sheet.backgroundId='';sheet.background='';sheet.featIds=[];sheet.spellIds=[];}
  if(key==='edition'||key==='speciesId')sheet.speed=species.speed;
  if(key==='abilityMode'&&sheet.abilityMode==='point-buy'&&(d.pointBuyCost(sheet.baseAbilities)===null||d.pointBuyCost(sheet.baseAbilities)>27)){sheet=d.reconcileHealth(sheet,{...sheet,baseAbilities:Object.fromEntries(Object.keys(d.abilities).map(k=>[k,8]))});}
  if(key==='backgroundId'){const bg=optData().backgrounds.find(x=>x.id===sheet.backgroundId);sheet.background=bg?.name||'';for(const id of bg?.skills||[])sheet.skills[id]=Math.max(1,sheet.skills[id]||0);if(bg?.originFeat&&!sheet.featIds.includes(bg.originFeat))sheet.featIds.push(bg.originFeat);}
  if(key==='selectedSubclassId')sheet.subclass=optData().subclasses.find(x=>x.id===sheet.selectedSubclassId)?.name||'';
  dirty=true;storeDraft();draw();
 }
});
root.addEventListener('toggle',e=>{if(e.target.classList.contains('dnd-stat-column'))statsOpen=e.target.open;},true);
root.addEventListener('keydown',e=>{if(!e.target.matches('[data-dnd-tab]')||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=[...root.querySelectorAll('[data-dnd-tab]')],i=tabs.indexOf(e.target),next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();tabs[next].focus();});
root.addEventListener('click',async e=>{
 const tab=e.target.closest('[data-dnd-tab]');if(tab){activeTab=tab.dataset.dndTab;root.querySelectorAll('[data-dnd-tab]').forEach(x=>{x.setAttribute('aria-selected',String(x===tab));x.tabIndex=x===tab?0:-1;});root.querySelectorAll('.dnd-tab-panel').forEach(x=>x.hidden=x.id!=='dnd-panel-'+activeTab);return;}
 const button=e.target.closest('[data-dnd-action]');if(!button)return;
 const action=button.dataset.dndAction;collect();
 if(action==='focus'){document.body.classList.toggle('dnd-focus-mode');button.textContent=document.body.classList.contains('dnd-focus-mode')?'Обычный вид':'Развернуть';return;}
 if(action==='exchange'){
  const result=d.exchangeCoins(sheet.coins,root.querySelector('#dnd-exchange-from').value,root.querySelector('#dnd-exchange-to').value,Number(root.querySelector('#dnd-exchange-amount').value));
  if(!result.ok){root.querySelector('#dnd-exchange-status').textContent=result.reason==='insufficient-funds'?'Не хватает монет.':result.reason==='too-small'?'Недостаточно для одной монеты выбранного номинала.':'Проверь сумму и разные номиналы.';return;}
  sheet.coins=result.coins;dirty=true;storeDraft();draw();root.querySelector('#dnd-exchange-status').textContent='Обмен выполнен.'+(result.remainder?' Остаток '+result.remainder+' остался в исходном номинале.':'');return;
 }
 if(action==='standard-array')sheet=d.reconcileHealth(sheet,{...sheet,abilityMode:'standard-array',baseAbilities:Object.fromEntries(Object.keys(d.abilities).map((k,i)=>[k,d.standardArray[i]]))});
 else if(action==='add-item'&&sheet.inventory.length<100)sheet.inventory.push({id:'item-'+Date.now(),name:'',quantity:1,weight:0,equipped:false,notes:''});
 else if(action==='remove-item')sheet.inventory.splice(Number(button.dataset.index),1);
 else if(action==='add-spell'&&sheet.spellIds.length<150){if(!sheet.spellIds.includes(button.dataset.id))sheet.spellIds.push(button.dataset.id);}
 else if(action==='remove-spell')sheet.spellIds=sheet.spellIds.filter(x=>x!==button.dataset.id);
 else if(action==='add-feat'){const id=root.querySelector('#dnd-feat-picker').value,feat=optData().feats.find(x=>x.id===id);if(!feat)return;if(!window.HOLEN_DND_OPTIONS.featEligibility(feat,sheet).eligible){status('Условия черты не выполнены.');return;}if(!sheet.featIds.includes(id)&&sheet.featIds.length<40)sheet.featIds.push(id);}
 else if(action==='remove-feat')sheet.featIds=sheet.featIds.filter(x=>x!==button.dataset.id);
 else if(action==='add-weapon'&&sheet.attacks.length<20){const w=weaponPresets.find(x=>x.id===root.querySelector('#dnd-weapon-preset').value);const ability=w.finesse&&sheet.abilities.dex>sheet.abilities.str?'dex':w.ability;sheet.attacks.push({name:w.name,weaponId:w.id,ability,proficient:true,bonus:0,damage:w.damage+signed(d.modifier(sheet.abilities[ability]))+' '+w.type,range:w.range});}
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
 const url=new URL(location.href);url.searchParams.set('character',characterId);for(const k of ['class','race','edition','name','feat','background'])url.searchParams.delete(k);history.replaceState(history.state,'',url);
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
 if(file.size>1048576){status('Файл слишком большой. Допустимо до 1 МБ.');return;}
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
