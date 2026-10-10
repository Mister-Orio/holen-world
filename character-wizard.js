(()=>{'use strict';
const m=window.HOLEN_CHARACTER_WIZARD,d=window.HOLEN_DND,o=window.HOLEN_DND_OPTIONS,auth=window.HOLEN_AUTH_UI;
const root=document.getElementById('character-wizard'),profile=document.getElementById('view-profile');
if(!root||!m||!auth)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const options=(items,selected)=>items.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===selected?'selected':'')+'>'+esc(x.name)+'</option>').join('');
const select=(label,key,items,value,empty='')=>'<label>'+label+'<select data-field="'+key+'">'+(empty?'<option value="">'+empty+'</option>':'')+options(items,value)+'</select></label>';
const number=(label,key,value,min,max)=>'<label>'+label+'<input type="number" data-field="'+key+'" value="'+value+'" min="'+min+'" max="'+max+'" step="1"></label>';
const check=(label,key,on)=>'<label class="wizard-check"><input type="checkbox" data-field="'+key+'" '+(on?'checked':'')+'><span>'+label+'</span></label>';
const help=html=>'<div class="wizard-help">'+html+'</div>';
const templates=()=>window.ANT_DATA?.squads||[],owner=()=>auth.currentUserId()||'guest';
let draftOwner=owner(),state=load(),busy=false,loginPending=false,prefilled=false;
const params=new URLSearchParams(location.search),requestedFeat=params.get('feat');
const hasPrefill=['background','feat','class','race'].some(key=>params.has(key));
const featLabels={Origin:'Происхождение',General:'Общие',Optional:'Опциональные','Fighting Style':'Боевые стили','Epic Boon':'Эпические дары'};
let featQuery='',featGroup='all';
function key(id=draftOwner){return 'holen-character-wizard-v1:'+id;}
function load(){try{return m.restore(JSON.parse(localStorage.getItem(key())||'null'));}catch{return m.fresh();}}
function remember(){try{localStorage.setItem(key(),JSON.stringify(state));}catch{}}
function say(message){const node=root.querySelector('.wizard-error');if(node)node.textContent=message;}
function start(){
 if(busy)return;
 if(!prefilled&&hasPrefill){
  state=m.fresh();m.change(state,'edition',params.get('edition')==='2024'?'2024':'2014');
  const ed=d.editions[state.sheet.edition];
  if(ed.classes.some(x=>x.id===params.get('class')))m.change(state,'classId',params.get('class'));
  if(ed.species.some(x=>x.id===params.get('race')))m.change(state,'speciesId',params.get('race'));
  const bg=params.get('background');if(o.editions[state.sheet.edition].backgrounds.some(x=>x.id===bg))m.change(state,'backgroundId',bg);
  prefilled=true;
 }
 root.hidden=false;profile.classList.add('creating-character');render();root.scrollIntoView({block:'start',behavior:'instant'});
}
function close(){if(busy)return;remember();root.hidden=true;profile.classList.remove('creating-character');document.getElementById('character-create-start').focus();}
function featRow(f,forced){
 const selected=state.sheet.featIds.includes(f.id),text=[f.name,f.nameEn,...(f.aliases||[])].join(' ').toLocaleLowerCase('ru').replace(/ё/g,'е');
 return '<label class="wizard-check" data-feat-row data-selected="'+selected+'" data-category="'+esc(f.category)+'" data-search="'+esc(text)+'"><input type="checkbox" data-feat="'+esc(f.id)+'" '+(selected?'checked':'')+' '+(forced.includes(f.id)?'disabled':'')+'><span>'+esc(f.name)+'<small>'+esc(featLabels[f.category]||f.category)+(forced.includes(f.id)?' · Из предыстории':'')+(f.manual?.filter(x=>!x.startsWith('Проверь дополнительные требования')).length?' · '+esc(f.manual.filter(x=>!x.startsWith('Проверь дополнительные требования')).join('; ')):'')+'</small><a href="'+esc(f.source)+'" target="_blank" rel="noopener">Правила ↗</a></span></label>';
}
function featPicker(feats,forced){
 const selected=feats.filter(f=>state.sheet.featIds.includes(f.id)),remaining=feats.filter(f=>!state.sheet.featIds.includes(f.id));
 const groups=[...new Set(remaining.map(f=>f.category))];if(!groups.includes(featGroup))featGroup='all';
 return (selected.length?'<fieldset class="wizard-feat-group wizard-feat-selected"><legend>Выбрано · '+selected.length+'</legend><div class="wizard-feat-list">'+selected.map(f=>featRow(f,forced)).join('')+'</div></fieldset>':'')+
 '<div class="wizard-fields wizard-feat-toolbar"><label>Поиск черт<input type="search" data-feat-search placeholder="Название черты…" value="'+esc(featQuery)+'"></label><label>Категория<select data-feat-category-filter><option value="all">Все категории</option>'+groups.map(g=>'<option value="'+esc(g)+'" '+(featGroup===g?'selected':'')+'>'+esc(featLabels[g]||g)+'</option>').join('')+'</select></label></div><div class="wizard-feat-candidates">'+groups.map(g=>'<fieldset class="wizard-feat-group" data-feat-group><legend>'+esc(featLabels[g]||g)+'</legend><div class="wizard-feat-list">'+remaining.filter(f=>f.category===g).map(f=>featRow(f,forced)).join('')+'</div></fieldset>').join('')+'</div><p class="tiny-note" data-feat-empty hidden>Нет доступных черт по выбранным условиям.</p>';
}
function filterFeats(){
 const q=featQuery.trim().toLocaleLowerCase('ru').replace(/ё/g,'е');let count=0;
 root.querySelectorAll('[data-feat-group]').forEach(group=>{
  let visible=0;group.querySelectorAll('[data-feat-row]').forEach(row=>{row.hidden=!(row.dataset.search.includes(q)&&(featGroup==='all'||featGroup===row.dataset.category));if(!row.hidden)visible++;});
  group.hidden=!visible;count+=visible;
 });const empty=root.querySelector('[data-feat-empty]');if(empty)empty.hidden=count>0;
}
function body(){
 const sh=state.sheet,c=m.cls(state),ed=d.editions[sh.edition],bg=m.background(state),step=state.step;
 if(step===0)return '<h2>Выбери мир приключения</h2><p>Пак определяет систему правил и следующие шаги.</p><div class="wizard-fields">'+select('Игровой пак','pack',[{id:'journeys',name:'Путешествия Холэна'},{id:'insects',name:'Муравьиная революция'}],state.pack)+(state.pack==='journeys'?select('Редакция правил','edition',[{id:'2014',name:'D&D 2014'},{id:'2024',name:'D&D 2024'}],sh.edition):'')+'</div>'+help(state.pack==='journeys'?'Классический персонаж D&D с характеристиками, предысторией и выбором опций по уровню.':'Авторская система: выбери имя и специализацию отряда.');
 if(step===1)return '<h2>'+m.steps(state)[step]+'</h2><p>С какого момента начнётся история персонажа?</p><label>Имя персонажа<input data-field="name" maxlength="72" autocomplete="off" placeholder="Например, Меральт" value="'+esc(state.name)+'"></label>'+(state.pack==='journeys'?'<div class="wizard-fields">'+select('Развитие','levelMode',[{id:'manual',name:'Выбрать уровень'},{id:'xp',name:'По опыту'}],sh.levelMode)+(sh.levelMode==='xp'?number('Опыт','experience',sh.experience,0,9999999):number('Уровень','level',sh.level,1,20))+'</div>'+help('Уровень '+sh.level+' · Бонус мастерства +'+d.proficiency(sh.level)+'. Здоровье рассчитаем после выбора класса и характеристик.'):'');
 if(state.pack==='insects'){
  const t=templates().find(x=>x.id===state.templateId);
  if(step===2)return '<h2>Специализация отряда</h2><p>Каждая специализация использует собственный боевой лист.</p>'+select('Специализация','templateId',templates(),state.templateId,'Выбери специализацию')+(t?help(esc(t.short)+'<br>Базовые ОЗ: '+esc(t.hp)+' · КД: '+esc(t.ac)):'');
  return '<h2>Отряд готов</h2><dl class="wizard-summary"><div><dt>Имя</dt><dd>'+esc(state.name)+'</dd></div><div><dt>Специализация</dt><dd>'+esc(t?.name)+'</dd></div></dl>'+help('В аккаунт сохранится заготовка отряда. Его автономный боевой лист пока хранит текущие показатели в этом браузере.');
 }
 if(step===2)return '<h2>Класс и раса</h2><p>Класс определит здоровье, спасброски и доступные подклассы.</p><div class="wizard-fields">'+select('Класс','classId',ed.classes,sh.classId)+select('Раса / вид','speciesId',ed.species,sh.speciesId)+'</div>'+help('Кость здоровья: d'+c.hitDie+' · Подкласс с '+c.subclassLevel+' уровня · Основные характеристики: '+esc(c.primary)+'.')+(sh.edition==='2014'&&sh.speciesId==='human'?check('Вариант человека: дополнительная черта с 1 уровня (с разрешения ГМ).','variantHuman',state.variantHuman):'');
 if(step===3)return '<h2>Предыстория</h2><p>Кем персонаж был до начала приключений?</p>'+select('Предыстория','backgroundId',o.editions[sh.edition].backgrounds,sh.backgroundId,'Выбери предысторию')+(bg?help(esc(bg.description)+'<br>Навыки: '+(bg.skills.map(k=>esc(d.skills.find(x=>x[0]===k)?.[1]||k)).join(', ')||'на выбор')+(bg.originFeat?'<br>Черта происхождения: '+esc(o.editions[sh.edition].feats.find(x=>x.id===bg.originFeat)?.name||bg.originFeat):'')+'<br><a href="'+esc(bg.source)+'" target="_blank" rel="noopener">Правила предыстории ↗</a>')+(bg.skillChoices?'<fieldset class="wizard-skill-choices"><legend>Выбери '+bg.skillChoices.count+(bg.skillChoices.count===1?' навык':' навыка')+'</legend>'+bg.skillChoices.options.map(id=>'<label><input type="checkbox" data-background-skill="'+esc(id)+'" '+(state.backgroundSkills.includes(id)?'checked':'')+' '+(!state.backgroundSkills.includes(id)&&state.backgroundSkills.length>=bg.skillChoices.count?'disabled':'')+'> '+esc(d.skills.find(x=>x[0]===id)?.[1]||id)+'</label>').join('')+'</fieldset>':''):'');
 if(step===4){
  const cost=d.pointBuyCost(sh.baseAbilities),methods=[{id:'point-buy',name:'Покупка за 27 очков'},{id:'standard-array',name:'Набор 15, 14, 13, 12, 10, 8'},{id:'manual',name:'Ввести значения вручную'}];
  return '<h2>Характеристики</h2><p>Распредели основу, затем укажи бонусы расы, предыстории и повышения уровня.</p>'+select('Способ распределения','abilityMode',methods,sh.abilityMode)+(sh.abilityMode==='point-buy'?'<strong class="wizard-points '+(cost>27?'over-budget':'')+'">Осталось очков: '+(27-cost)+' из 27</strong>':'')+'<div class="wizard-abilities">'+Object.entries(d.abilities).map(([k,name])=>'<div class="wizard-ability"><strong>'+name+'</strong>'+(sh.abilityMode==='standard-array'?select('Основа','base:'+k,d.standardArray.map(n=>({id:n,name:String(n)})),sh.baseAbilities[k]):number('Основа','base:'+k,sh.baseAbilities[k],sh.abilityMode==='point-buy'?8:1,sh.abilityMode==='point-buy'?15:30))+number('Бонус','bonus:'+k,sh.abilityBonuses[k],-20,20)+'<span class="wizard-total">'+sh.abilities[k]+' <small>('+signed(d.modifier(sh.abilities[k]))+')</small></span></div>').join('')+'</div>'+help('Бонусы и прибавки от черт вводятся вручную по правилам выбранной редакции. В стандартном наборе значения меняются местами — каждое используется один раз.');
 }
 if(step===5){
  const subs=o.availableSubclasses(sh),bud=m.budgets(state),forced=m.mandatory(state),candidates=m.candidates(state);
  const selectable=candidates.filter(f=>forced.includes(f.id)||m.selection(state,[...state.extras,f.id]).includes(f.id));
  return '<h2>Подкласс и черты</h2><p>Доступные варианты для '+esc(c.name)+' '+sh.level+' уровня.</p>'+(subs.length?select('Подкласс','selectedSubclassId',subs,sh.selectedSubclassId,'Выбери подкласс'):help('Подкласс откроется с '+c.subclassLevel+' уровня.'))+help('Выборы черт: '+bud.general+' при развитии персонажа'+(bud.origin?' · '+bud.origin+' дополнительная черта происхождения':'')+(bud.style?' · '+bud.style+' боевой стиль':'')+'. Можно оставить выбор черт на потом. При выборе черты вместо повышения характеристик учти это в бонусах на прошлом шаге.')+(requestedFeat&&!sh.featIds.includes(requestedFeat)?help('Черта из каталога появится в списке, когда будут выполнены её требования и появится свободный выбор.'):'')+featPicker(selectable,forced)+help('Прочие требования черт (например, владения и умение колдовать) проверь по источнику. Их эффекты не изменяют характеристики автоматически.');
 }
 const species=ed.species.find(x=>x.id===sh.speciesId),p=m.payload(state),featNames=o.editions[sh.edition].feats.filter(x=>sh.featIds.includes(x.id)).map(x=>x.name).join(', ');
 return '<h2>Проверь персонажа</h2><p>После сохранения откроется полный лист со снаряжением, заклинаниями и боевыми настройками.</p><dl class="wizard-summary">'+[['Имя',state.name],['Пак / редакция','Путешествия Холэна · '+sh.edition],['Класс / раса',c.name+' · '+species.name],['Уровень / здоровье',sh.level+' · '+p.maxHp+' ОЗ'],['Предыстория',bg?.name],['Подкласс',sh.subclass||'Пока недоступен'],['Характеристики',Object.entries(d.abilities).map(([k,n])=>n+': '+sh.abilities[k]).join(' · ')],['Черты',featNames||'Не выбраны']].map(([name,value],i)=>'<div class="'+(i>5?'wide':'')+'"><dt>'+name+'</dt><dd>'+esc(value)+'</dd></div>').join('')+'</dl>'+help('ОЗ рассчитаны по среднему приросту кости класса и Телосложению. КД '+p.armorClass+' — без доспеха.')+'<details class="wizard-next-settings"><summary>Что ещё настроить в полном листе</summary><ul><li>Проверь бонусы характеристик от происхождения и черт.</li><li>Выбери владения класса, навыки и инструменты.</li><li>Добавь оружие, доспех и стартовое снаряжение.</li><li>Если персонаж колдует, выбери заклинания и ячейки.</li><li>Заполни способности класса и их ресурсы.</li></ul></details>';
}
function signed(n){return n>=0?'+'+n:String(n);}
function render(focus=false){
 const labels=m.steps(state),last=state.step===labels.length-1;
 root.innerHTML='<div class="wizard-head"><div><span class="overline">НОВЫЙ ПЕРСОНАЖ</span><div class="tiny-note">Шаг '+(state.step+1)+' из '+labels.length+' · '+labels[state.step]+'</div></div><button class="btn subtle" type="button" data-wizard="close">Закрыть</button></div><div class="wizard-progress" aria-hidden="true"><span style="width:'+((state.step+1)/labels.length*100)+'%"></span></div><div class="wizard-body">'+body()+'</div><p class="wizard-error" role="status" aria-live="polite"></p><div class="wizard-footer"><button class="btn subtle" type="button" data-wizard="back" '+(state.step===0?'disabled':'')+'>← Назад</button><button class="btn primary" type="submit">'+(last?(auth.isAuthenticated()?'Сохранить персонажа':'Войти и сохранить'):'Далее →')+'</button></div>';
 filterFeats();
 if(focus){root.querySelector('h2').tabIndex=-1;root.querySelector('h2').focus();}
 remember();
}
root.addEventListener('input',e=>{
 if(e.target.matches('[data-feat-search]')){featQuery=e.target.value;filterFeats();return;}
 if(busy||!e.target.dataset.field||!['text','number'].includes(e.target.type))return;
 m.change(state,e.target.dataset.field,e.target.value);remember();
});
root.addEventListener('change',e=>{
 if(busy)return;
 if(e.target.dataset.backgroundSkill){m.change(state,'backgroundSkill',[e.target.dataset.backgroundSkill,e.target.checked]);render();return;}
 if(e.target.matches('[data-feat-category-filter]')){featGroup=e.target.value;filterFeats();return;}
 if(e.target.dataset.field)m.change(state,e.target.dataset.field,e.target.type==='checkbox'?e.target.checked:e.target.value);
 else if(e.target.dataset.feat)m.change(state,'feat',[e.target.dataset.feat,e.target.checked]);
 else return;
 render();
});
root.addEventListener('click',e=>{
 const action=e.target.closest('[data-wizard]')?.dataset.wizard;if(!action||busy)return;
 if(action==='close')close();
 if(action==='back'&&state.step>0){state.step--;render(true);}
 if(action==='again'){state=m.fresh();render(true);}
});
root.addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;
 const issue=m.validate(state,state.step,templates());if(issue){say(issue);return;}
 if(state.step<m.steps(state).length-1){
  state.step++;
  if(state.pack==='journeys'&&state.step===5&&requestedFeat&&!state.sheet.featIds.includes(requestedFeat))m.change(state,'feat',[requestedFeat,true]);
  render(true);return;
 }
 const all=m.validateAll(state,templates());if(all){state.step=all.step;render(true);say(all.error);return;}
 if(!auth.isAuthenticated()){loginPending=true;auth.open('login');say('Войди в аккаунт. Выборы персонажа сохранятся, затем нажми «Сохранить персонажа».');return;}
 const savingOwner=owner();busy=true;root.querySelectorAll('input,select,button').forEach(x=>x.disabled=true);say('Сохраняем персонажа…');
 try{
  const row=await auth.createCharacter(state.name.trim(),state.pack,state.templateId,state.pack==='journeys'?m.payload(state):undefined);
  if(owner()!==savingOwner)return;
  try{localStorage.removeItem(key());}catch{}
  const link=state.pack==='journeys'?'index.html?character='+encodeURIComponent(row.id)+'#dnd-sheet':'sheets/'+encodeURIComponent(state.templateId)+'.html';
  root.innerHTML='<div class="wizard-success"><h2>Персонаж сохранён</h2><p>«'+esc(state.name.trim())+'» появился в твоём профиле.</p><a class="btn primary" href="'+esc(link)+'">Открыть лист →</a><button class="btn subtle" type="button" data-wizard="close">К персонажам</button><button class="btn subtle" type="button" data-wizard="again">Создать ещё</button></div>';
  state=m.fresh();window.dispatchEvent(new Event('holen-characters-changed'));
 }catch(err){if(owner()===savingOwner){render();say(err.message||'Не удалось сохранить. Выборы сохранены в этом браузере.');}}
 finally{busy=false;}
});
document.getElementById('character-create-start').addEventListener('click',start);
window.addEventListener('holen-auth-changed',()=>{
 const next=owner();if(next===draftOwner)return;
 const carry=loginPending&&draftOwner==='guest'&&next!=='guest';
 if(!carry)remember();else{try{localStorage.removeItem(key());}catch{}}
 draftOwner=next;loginPending=false;state=carry?m.restore(state):load();
 if(!root.hidden){render();if(carry)say('Ты вошёл. Проверь персонажа и сохрани его.');}
});
window.addEventListener('holen-navigated',e=>{if(e.detail?.view==='profile'&&!prefilled&&hasPrefill)start();});
if(location.hash==='#profile'&&hasPrefill)start();
})();
