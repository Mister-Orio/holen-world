(()=>{'use strict';
const d=window.HOLEN_DND,o=window.HOLEN_DND_OPTIONS,keys=Object.keys(d.abilities);
const steps=s=>s.pack==='insects'?['Пак','Имя','Специализация','Проверка']:['Пак','Имя и уровень','Класс и раса','Предыстория','Характеристики','Подкласс и черты','Проверка'];
function fresh(){const sheet=d.blank('2014','fighter','human');sheet.abilityMode='point-buy';sheet.baseAbilities=Object.fromEntries(keys.map(k=>[k,8]));return {pack:'journeys',name:'',step:0,templateId:'',variantHuman:false,extras:[],backgroundSkills:[],sheet:d.normalize(sheet)};}
function cls(s){return d.editions[s.sheet.edition].classes.find(x=>x.id===s.sheet.classId);}
function budgets(s){
 const sh=s.sheet,levels=[4,8,12,16,19,...(sh.classId==='fighter'?[6,14]:sh.classId==='rogue'?[10]:[])];
 return {general:levels.filter(x=>x<=sh.level).length+(sh.edition==='2014'&&sh.speciesId==='human'&&s.variantHuman?1:0),
 origin:sh.edition==='2024'&&sh.speciesId==='human'?1:0,
 style:sh.edition==='2024'&&((sh.classId==='fighter'&&sh.level>=1)||(['paladin','ranger'].includes(sh.classId)&&sh.level>=2))?1:0};
}
function background(s){return o.editions[s.sheet.edition].backgrounds.find(x=>x.id===s.sheet.backgroundId);}
function candidates(s){return o.availableFeats(s.sheet);}
function mandatory(s){const id=background(s)?.originFeat;return id?[id]:[];}
function category(f,s){return s.sheet.edition==='2024'&&f.category==='Origin'?'origin':s.sheet.edition==='2024'&&f.category==='Fighting Style'?'style':'general';}
function selection(s,ids){
 const b=budgets(s),allowed=new Map(candidates(s).map(x=>[x.id,x])),chosen=[],forced=mandatory(s);
 for(const id of new Set(Array.isArray(ids)?ids:[])){
  const f=allowed.get(id);if(!f||forced.includes(id))continue;
  const group=category(f,s);
  if(b[group]>0){b[group]--;chosen.push(id);}
  else if(group==='origin'&&b.general>0){b.general--;chosen.push(id);}
 }
 return chosen;
}
function sync(s){
 s.sheet=d.normalize(s.sheet);s.variantHuman=!!s.variantHuman&&s.sheet.edition==='2014'&&s.sheet.speciesId==='human';
 const c=cls(s),bg=background(s),sub=o.availableSubclasses(s.sheet).find(x=>x.id===s.sheet.selectedSubclassId);
 s.sheet.subclass=sub?.name||'';s.sheet.selectedSubclassId=sub?.id||'';
 s.sheet.background=bg?.name||'';s.sheet.backgroundId=bg?.id||'';
 s.sheet.saveProficiencies=[...c.saves];s.sheet.casting=c.casting;
 s.backgroundSkills=[...new Set(s.backgroundSkills||[])].filter(id=>bg?.skillChoices?.options.includes(id)).slice(0,bg?.skillChoices?.count||0);
 s.sheet.skills=Object.fromEntries(d.skills.map(([id])=>[id,bg?.skills.includes(id)||s.backgroundSkills.includes(id)?1:0]));
 s.extras=selection(s,s.extras);s.sheet.featIds=[...new Set([...mandatory(s),...s.extras])];
 s.sheet.hpMode='average';s.sheet.hp=9999;s.sheet.hitDice=s.sheet.level;
 s.sheet.resources=c.resources.map(name=>({name,current:0,max:0}));
 s.sheet=d.normalize(s.sheet);
 return s;
}
function restore(value){
 const base=fresh(),v=value&&typeof value==='object'?value:{};
 const s={...base,pack:v.pack==='insects'?'insects':'journeys',name:typeof v.name==='string'?v.name.slice(0,72):'',templateId:typeof v.templateId==='string'?v.templateId:'',variantHuman:!!v.variantHuman,extras:Array.isArray(v.extras)?v.extras:[],backgroundSkills:Array.isArray(v.backgroundSkills)?v.backgroundSkills:[],sheet:d.normalize(v.sheet||base.sheet)};
 s.step=Math.max(0,Math.min(steps(s).length-1,Number.isInteger(v.step)?v.step:0));return sync(s);
}
function change(s,key,value){
 if(key==='edition'){if(s.sheet.edition!==value){s.sheet=d.blank(value);s.sheet.abilityMode='point-buy';s.sheet.baseAbilities=Object.fromEntries(keys.map(k=>[k,8]));s.extras=[];s.variantHuman=false;}}
 else if(['pack','name','templateId','variantHuman'].includes(key)){s[key]=value;if(key==='pack')s.step=0;}
 else if(key==='abilityMode'){
  s.sheet.abilityMode=value;
  s.sheet.baseAbilities=Object.fromEntries(keys.map((k,i)=>[k,value==='standard-array'?d.standardArray[i]:value==='point-buy'?8:10]));
 }else if(key.startsWith('base:')){
  const k=key.slice(5),n=Number(value);
  if(s.sheet.abilityMode==='standard-array'){const other=keys.find(x=>x!==k&&s.sheet.baseAbilities[x]===n);if(other)s.sheet.baseAbilities[other]=s.sheet.baseAbilities[k];}
  s.sheet.baseAbilities[k]=n;
 }else if(key.startsWith('bonus:'))s.sheet.abilityBonuses[key.slice(6)]=Number(value);
 else if(key==='feat'){
  const [id,on]=value;
  s.extras=on?selection(s,[...s.extras,id]):s.extras.filter(x=>x!==id);
 }else if(key==='backgroundSkill'){
  const [id,on]=value,bg=background(s);
  if(bg?.skillChoices?.options.includes(id))s.backgroundSkills=on?[...new Set([...s.backgroundSkills,id])].slice(0,bg.skillChoices.count):s.backgroundSkills.filter(x=>x!==id);
 }else if(key==='classId'){s.sheet.classId=value;s.sheet.selectedSubclassId='';}
 else if(key==='speciesId'){s.sheet.speciesId=value;s.sheet.speed=d.editions[s.sheet.edition].species.find(x=>x.id===value)?.speed||30;}
 else if(key==='level'){s.sheet.level=Number(value);}
 else if(key==='experience'){s.sheet.experience=Number(value);}
 else if(['levelMode','backgroundId','selectedSubclassId'].includes(key))s.sheet[key]=value;
 return sync(s);
}
function validate(s,step=s.step,templates=[]){
 if(step===0)return ['journeys','insects'].includes(s.pack)?'':'Выбери игровой пак.';
 if(step===1){if(!s.name.trim()||s.name.trim().length>72)return 'Введи имя от 1 до 72 символов.';return '';}
 if(s.pack==='insects')return step===2&&!templates.some(t=>t.id===s.templateId)?'Выбери специализацию.':'';
 if(step===2)return !cls(s)||!d.editions[s.sheet.edition].species.some(x=>x.id===s.sheet.speciesId)?'Выбери класс и расу.':'';
 if(step===3){const bg=background(s);return !bg?'Выбери предысторию.':bg.skillChoices&&s.backgroundSkills.length!==bg.skillChoices.count?'Выбери навыки предыстории: '+bg.skillChoices.count+'.':'';}
 if(step===4){
  if(s.sheet.abilityMode==='point-buy'&&(keys.some(k=>s.sheet.baseAbilities[k]<8||s.sheet.baseAbilities[k]>15)||d.pointBuyCost(s.sheet.baseAbilities)>27))return 'На покупку характеристик доступно 27 очков; значения — от 8 до 15.';
  if(s.sheet.abilityMode==='standard-array'&&[...keys.map(k=>s.sheet.baseAbilities[k])].sort((a,b)=>a-b).join()!==[...d.standardArray].sort((a,b)=>a-b).join())return 'Используй каждое значение стандартного набора один раз.';
 }
 if(step===5&&o.availableSubclasses(s.sheet).length&&!s.sheet.selectedSubclassId)return 'Выбери подкласс для своего уровня.';
 return '';
}
function validateAll(s,templates=[]){for(let i=0;i<steps(s).length-1;i++){const error=validate(s,i,templates);if(error)return {step:i,error};}return null;}
function payload(s){
 const sh=d.normalize(s.sheet),c=cls(s);
 sh.armorClass=10+d.modifier(sh.abilities.dex)+(sh.classId==='barbarian'?d.modifier(sh.abilities.con):sh.classId==='monk'?d.modifier(sh.abilities.wis):0);
 sh.features=[...o.editions[sh.edition].feats.filter(f=>sh.featIds.includes(f.id)).map(f=>f.name),...(s.variantHuman?['Вариант человека (согласован с ГМ)']:[])].join('\n');
 return sh;
}
window.HOLEN_CHARACTER_WIZARD={fresh,restore,change,sync,steps,cls,background,budgets,candidates,mandatory,selection,validate,validateAll,payload};
})();
