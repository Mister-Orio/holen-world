/* Собственные краткие справки; игровые показатели сверены с SRD 5.1/5.2.1.
   Изменения/перевод: Мир Холэна. SRD: Wizards of the Coast LLC, CC BY 4.0.
   https://www.dndbeyond.com/srd | https://creativecommons.org/licenses/by/4.0/ */
(()=>{'use strict';
const abilities={str:'Сила',dex:'Ловкость',con:'Телосложение',int:'Интеллект',wis:'Мудрость',cha:'Харизма'};
const rows=[
 ['barbarian','Варвар',12,'str',['str','con'],3,'','Воин ближнего боя, который опирается на ярость и стойкость.',['Ярость','Безрассудная атака','Чувство опасности']],
 ['bard','Бард',8,'cha',['dex','cha'],3,'cha','Поддерживает союзников вдохновением, навыками и заклинаниями.',['Вдохновение барда','Заклинания','Компетентность']],
 ['cleric','Жрец',8,'wis',['wis','cha'],1,'wis','Божественный заклинатель: поддержка, лечение и защита.',['Заклинания','Божественный канал','Божественный домен']],
 ['druid','Друид',8,'wis',['int','wis'],2,'wis','Заклинатель природы, использующий превращения и контроль поля боя.',['Заклинания','Дикий облик','Друидический круг']],
 ['fighter','Воин',10,'str',['str','con'],3,'','Мастер оружия и устойчивый участник ближнего или дальнего боя.',['Второе дыхание','Всплеск действий','Дополнительная атака']],
 ['monk','Монах',8,'dex',['str','dex'],3,'','Подвижный боец, совмещающий безоружные атаки и особые приёмы.',['Боевые искусства','Защита без доспехов','Ки']],
 ['paladin','Паладин',10,'cha',['wis','cha'],3,'cha','Воин священной клятвы: оружие, лечение и божественные силы.',['Наложение рук','Божественная кара','Аура защиты']],
 ['ranger','Следопыт',10,'wis',['str','dex'],3,'wis','Разведчик и охотник, совмещающий оружие, навыки и магию природы.',['Заклинания','Боевой стиль','Исследование и охота']],
 ['rogue','Плут',8,'dex',['dex','int'],3,'','Специалист по скрытности, точным ударам и навыкам.',['Скрытая атака','Хитрое действие','Компетентность']],
 ['sorcerer','Чародей',6,'cha',['con','cha'],1,'cha','Врождённый заклинатель, меняющий применение магии метамагией.',['Заклинания','Очки чародейства','Метамагия']],
 ['warlock','Колдун',8,'cha',['wis','cha'],1,'cha','Магия договора, покровитель и мистические воззвания.',['Магия договора','Мистические воззвания','Покровитель']],
 ['wizard','Волшебник',6,'int',['int','wis'],2,'int','Изучает магию, ведёт книгу заклинаний и готовит нужные чары.',['Книга заклинаний','Магическое восстановление','Магическая традиция']]
];
const primary={fighter:'Сила или Ловкость',monk:'Ловкость и Мудрость',paladin:'Сила и Харизма',ranger:'Ловкость и Мудрость'};
const resources={barbarian:['Ярость'],bard:['Вдохновение барда'],cleric:['Божественный канал'],druid:['Дикий облик'],fighter:['Второе дыхание','Всплеск действий'],monk:['Ки'],paladin:['Наложение рук','Божественный канал'],ranger:[],rogue:[],sorcerer:['Очки чародейства'],warlock:['Ячейки договора'],wizard:['Магическое восстановление']};
function classes(edition){return rows.map(([id,name,hitDie,main,saves,subclassLevel,casting,description,features])=>({id,name,hitDie,primary:primary[id]||abilities[main],saves,casting,description,subclassLevel:edition==='2024'?3:subclassLevel,features:features.map(x=>edition==='2024'&&x==='Ки'?'Очки фокуса':x),resources:(resources[id]||[]).map(x=>edition==='2024'&&x==='Ки'?'Очки фокуса':x)}));}
const species2014=[
 ['dwarf','Дварф',25,'Средний','Стойкость, тёмное зрение и устойчивость к яду.'],
 ['elf','Эльф',30,'Средний','Тёмное зрение, острые чувства, наследие фей и транс.'],
 ['halfling','Полурослик',25,'Маленький','Удачливость, храбрость и проворство.'],
 ['human','Человек',30,'Средний','Гибкое развитие; вариант человека согласуется с ГМом.'],
 ['dragonborn','Драконорождённый',30,'Средний','Драконье происхождение, дыхание и сопротивление стихии.'],
 ['gnome','Гном',25,'Маленький','Тёмное зрение и защита разума гномьей хитростью.'],
 ['half-elf','Полуэльф',30,'Средний','Тёмное зрение, наследие фей и широкий выбор навыков.'],
 ['half-orc','Полуорк',30,'Средний','Тёмное зрение, выносливость и сила критических ударов.'],
 ['tiefling','Тифлинг',30,'Средний','Тёмное зрение, сопротивление огню и врождённая магия.']
];
const species2024=[
 ['aasimar','Аасимар',30,'Маленький или Средний','Небесное наследие: свет, исцеление и раскрытие небесной природы.'],
 ['dragonborn','Драконорождённый',30,'Средний','Драконье наследие, дыхание, сопротивление и позднее драконий полёт.'],
 ['dwarf','Дварф',30,'Средний','Тёмное зрение, стойкость и связь с камнем.'],
 ['elf','Эльф',30,'Средний','Эльфийская линия наследия, острые чувства и транс; лесная линия меняет скорость.'],
 ['gnome','Гном',30,'Маленький','Гномья хитрость, тёмное зрение и выбранная линия наследия.'],
 ['goliath','Голиаф',35,'Средний','Наследие великанов, могучее сложение и возможность увеличиваться.'],
 ['halfling','Полурослик',30,'Маленький','Удачливость, храбрость, проворство и скрытность.'],
 ['human','Человек',30,'Маленький или Средний','Универсальность, дополнительный навык и черта происхождения.'],
 ['orc','Орк',30,'Средний','Прилив адреналина, тёмное зрение и неукротимая стойкость.'],
 ['tiefling','Тифлинг',30,'Маленький или Средний','Тёмное зрение, потустороннее наследие и его врождённая магия.']
];
const mapSpecies=rows=>rows.map(([id,name,speed,size,description])=>({id,name,speed,size,description}));
const editions={
 '2014':{label:'D&D 2014',classes:classes('2014'),species:mapSpecies(species2014),source:'https://www.dndbeyond.com/sources/dnd/basic-rules-2014',originNote:'Бонусы характеристик зависят от расы и подрасы. В лист вводятся итоговые значения после всех бонусов.'},
 '2024':{label:'D&D 2024',classes:classes('2024'),species:mapSpecies(species2024),source:'https://www.dndbeyond.com/sources/dnd/br-2024',originNote:'Бонусы характеристик определяются предысторией, а не видом. В лист вводятся итоговые значения после всех бонусов.'}
};
const artificer={id:'artificer',name:'Изобретатель (Artificer)',hitDie:8,primary:'Интеллект',saves:['con','int'],casting:'int',subclassLevel:3,description:'Заклинатель-изобретатель из дополнений: создаёт магические инструменты и усиливает предметы.',features:['Заклинания','Магические устройства','Специализация'],resources:[],source:'https://www.dndbeyond.com/sources/dnd/tcoe',supplement:true};
editions['2024'].species.find(x=>x.id==='aasimar').source='https://www.dndbeyond.com/posts/1783-the-10-species-in-the-2024-players-handbook';
editions['2014'].classes.push(artificer);
const skills=[['acrobatics','Акробатика','dex'],['animalHandling','Уход за животными','wis'],['arcana','Магия','int'],['athletics','Атлетика','str'],['deception','Обман','cha'],['history','История','int'],['insight','Проницательность','wis'],['intimidation','Запугивание','cha'],['investigation','Анализ','int'],['medicine','Медицина','wis'],['nature','Природа','int'],['perception','Внимательность','wis'],['performance','Выступление','cha'],['persuasion','Убеждение','cha'],['religion','Религия','int'],['sleightOfHand','Ловкость рук','dex'],['stealth','Скрытность','dex'],['survival','Выживание','wis']];
const modifier=value=>Math.floor((Number(value)-10)/2);
const proficiency=level=>2+Math.floor((Math.min(20,Math.max(1,Number(level)||1))-1)/4);
// Single-class 5e calculations. Multiclass HP and unusual effects remain manual.
const xpThresholds=[0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000];
const standardArray=[15,14,13,12,10,8];
const pointBuyCosts={8:0,9:1,10:2,11:3,12:4,13:5,14:7,15:9};
const coinValues={cp:1,sp:10,ep:50,gp:100,pp:1000},coinLimit=999999999;
const record=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const number=value=>typeof value==='number'?value:typeof value==='string'&&value.trim()!==''?Number(value):NaN;
const int=(value,min,max,fallback=0)=>Number.isFinite(number(value))?Math.min(max,Math.max(min,Math.trunc(number(value)))):fallback;
const decimal=(value,min,max,fallback=0)=>Number.isFinite(number(value))?Math.min(max,Math.max(min,number(value))):fallback;
const text=(value,max=8000)=>typeof value==='string'?value.slice(0,max):'';
const idList=(value,limit)=>Array.isArray(value)?[...new Set(value.filter(x=>typeof x==='string').map(x=>text(x,120)).filter(Boolean))].slice(0,limit):[];
const normalizeCoins=value=>Object.fromEntries(Object.keys(coinValues).map(k=>[k,int(record(value)[k],0,coinLimit)]));
function levelFromXp(value){const xp=int(value,0,9999999);let level=1;while(level<20&&xp>=xpThresholds[level])level++;return level;}
const xpForLevel=value=>xpThresholds[int(value,1,20,1)-1];
function pointBuyCost(value){
 if(value&&typeof value==='object'&&!Array.isArray(value)){
  const costs=Object.keys(abilities).map(k=>pointBuyCost(value[k]));return costs.some(x=>x===null)?null:costs.reduce((a,b)=>a+b,0);
 }
 const score=number(value);return Number.isInteger(score)&&Object.hasOwn(pointBuyCosts,score)?pointBuyCosts[score]:null;
}
function totalCopper(value){const coins=normalizeCoins(value);return Object.entries(coinValues).reduce((total,[k,rate])=>total+coins[k]*rate,0);}
function exchangeCoins(value,from,to,amount){
 const coins=normalizeCoins(value),fail=reason=>({ok:false,coins,exchanged:0,received:0,remainder:0,reason});
 if(!Object.hasOwn(coinValues,from)||!Object.hasOwn(coinValues,to)||from===to)return fail('invalid-currency');
 const requested=number(amount);if(!Number.isSafeInteger(requested)||requested<1)return fail('invalid-amount');
 if(requested>coins[from])return fail('insufficient-funds');
 // Exchange only whole destination coins; a remainder stays in its source denomination.
 const sourcePerGroup=coinValues[to]/Math.min(coinValues[from],coinValues[to]);
 const exchanged=Math.floor(requested/sourcePerGroup)*sourcePerGroup;
 const received=exchanged*coinValues[from]/coinValues[to],remainder=requested-exchanged;
 if(!received)return {...fail('too-small'),remainder};
 if(coins[to]+received>coinLimit)return {...fail('limit'),remainder:requested};
 return {ok:true,coins:{...coins,[from]:coins[from]-exchanged,[to]:coins[to]+received},exchanged,received,remainder,reason:''};
}
function hpMaximum(value){
 const s=record(value),edition=Object.hasOwn(editions,s.edition)?s.edition:'2014';
 const cls=editions[edition].classes.find(x=>x.id===s.classId)||editions[edition].classes[0];
 if(!['average','rolled'].includes(s.hpMode))return int(s.maxHp,1,9999,cls.hitDie);
 const level=s.levelMode==='xp'?levelFromXp(s.experience):int(s.level,1,20,1),con=modifier(int(record(s.abilities).con,1,30,10));
 const average=Math.floor(cls.hitDie/2)+1,rolls=Array.isArray(s.hitRolls)?s.hitRolls:[];
 let total=Math.max(1,cls.hitDie+con);
 for(let i=0;i<level-1;i++)total+=Math.max(1,(s.hpMode==='rolled'?int(rolls[i],1,cls.hitDie,average):average)+con);
 return int(total+int(s.hpAdjustment,-9999,9999),1,9999,1);
}
function blank(edition='2014',classId='fighter',speciesId='human'){
 if(!Object.hasOwn(editions,edition))edition='2014';
 const cls=editions[edition].classes.find(x=>x.id===classId)||editions[edition].classes[0];
 const species=editions[edition].species.find(x=>x.id===speciesId)||editions[edition].species.find(x=>x.id==='human');
 const scores=Object.fromEntries(Object.keys(abilities).map(k=>[k,10]));
 return {type:'dnd',version:2,edition,classId:cls.id,speciesId:species.id,level:1,levelMode:'manual',background:'',backgroundId:'',subclass:'',selectedSubclassId:'',featIds:[],spellIds:[],alignment:'',experience:0,abilityMode:'manual',baseAbilities:{...scores},abilityBonuses:Object.fromEntries(Object.keys(abilities).map(k=>[k,0])),abilities:scores,saveProficiencies:[...cls.saves],skills:{},hpMode:'average',hpAdjustment:0,hitRolls:[],hp:cls.hitDie,maxHp:cls.hitDie,tempHp:0,armorClass:10,speed:species.speed,initiativeBonus:0,hitDice:1,casting:cls.casting,slots:Array.from({length:9},()=>({current:0,max:0})),resources:cls.resources.map(name=>({name,current:0,max:0})),attacks:[],inventory:[],coins:normalizeCoins(),features:'',spells:'',equipment:'',notes:'',appearance:'',backstory:'',allies:'',traits:'',ideals:'',bonds:'',flaws:'',playerName:'',inspiration:false,deathSuccess:0,deathFailure:0};
}
function normalize(value){
 const s=record(value);
 const edition=Object.hasOwn(editions,s.edition)?s.edition:'2014';
 const base=blank(edition,s.classId,s.speciesId);
 const result={...base};
 for(const key of ['background','subclass','alignment'])result[key]=text(s[key],160);
 for(const key of ['backgroundId','selectedSubclassId'])result[key]=text(s[key],120);
 for(const key of ['features','spells','equipment','notes','appearance','backstory','allies','traits','ideals','bonds','flaws'])result[key]=text(s[key]);
 for(const key of ['playerName','age','gender','height','weight','eyes','hair','skin','languages','deity','personality'])result[key]=text(s[key],key==='personality'?8000:240);
 result.levelMode=s.levelMode==='xp'?'xp':'manual';
 result.abilityMode=['point-buy','standard-array'].includes(s.abilityMode)?s.abilityMode:'manual';
 // Old sheets have a hand-entered maximum. Importing one never replaces that maximum.
 result.hpMode=['average','rolled','manual'].includes(s.hpMode)?s.hpMode:'manual';
 result.hpAdjustment=int(s.hpAdjustment,-9999,9999);
 result.featIds=idList(s.featIds,40);result.spellIds=idList(s.spellIds,150);
 for(const [key,min,max] of [['level',1,20],['experience',0,9999999],['hp',0,9999],['maxHp',1,9999],['tempHp',0,9999],['armorClass',1,100],['speed',0,1000],['initiativeBonus',-30,30],['hitDice',0,20],['deathSuccess',0,3],['deathFailure',0,3]])result[key]=int(s[key]??base[key],min,max,base[key]);
 if(result.levelMode==='xp')result.level=levelFromXp(result.experience);
 result.baseAbilities=Object.fromEntries(Object.keys(abilities).map(k=>[k,int(record(s.baseAbilities)[k]??record(s.abilities)[k]??10,1,30,10)]));
 result.abilityBonuses=Object.fromEntries(Object.keys(abilities).map(k=>[k,int(record(s.abilityBonuses)[k],-20,20)]));
 result.abilities=Object.fromEntries(Object.keys(abilities).map(k=>[k,int(result.baseAbilities[k]+result.abilityBonuses[k],1,30,10)]));
 const hitDie=editions[edition].classes.find(x=>x.id===result.classId).hitDie;
 result.hitRolls=(Array.isArray(s.hitRolls)?s.hitRolls:[]).slice(0,19).map(roll=>int(roll,1,hitDie,Math.floor(hitDie/2)+1));
 result.maxHp=hpMaximum(result);result.hp=Math.min(result.hp,result.maxHp);result.hitDice=Math.min(result.hitDice,result.level);
 result.saveProficiencies=Array.isArray(s.saveProficiencies)?Object.keys(abilities).filter(k=>s.saveProficiencies.includes(k)):base.saveProficiencies;
 result.skills=Object.fromEntries(skills.map(([id])=>[id,int(s.skills?.[id],0,2)]));
 result.casting=['','int','wis','cha'].includes(s.casting)?s.casting:base.casting;
 result.inspiration=!!s.inspiration;
 result.slots=Array.from({length:9},(_,i)=>{const max=int(s.slots?.[i]?.max,0,20);return {max,current:int(s.slots?.[i]?.current,0,max)};});
 result.resources=(Array.isArray(s.resources)?s.resources:base.resources).filter(r=>r&&typeof r==='object').slice(0,12).map(r=>{const max=int(r.max,0,999);return {name:text(r.name,80),max,current:int(r.current,0,max)};});
 result.attacks=(Array.isArray(s.attacks)?s.attacks:[]).filter(a=>a&&typeof a==='object'&&!Array.isArray(a)).slice(0,20).map(a=>({name:text(a.name,80),weaponId:text(a.weaponId,120),ability:Object.hasOwn(abilities,a.ability)?a.ability:'str',proficient:!!a.proficient,bonus:int(a.bonus,-30,30),damage:text(a.damage,120),range:text(a.range,80)}));
 result.inventory=(Array.isArray(s.inventory)?s.inventory:[]).filter(r=>r&&typeof r==='object'&&!Array.isArray(r)).slice(0,100).map((r,i)=>({id:text(r.id,120)||'item-'+(i+1),name:text(r.name,160),quantity:int(r.quantity,0,999999,1),weight:decimal(r.weight,0,999999),...(r.costCopper!==undefined?{costCopper:int(r.costCopper,0,coinLimit)}:{}),equipped:!!r.equipped,notes:text(r.notes,2000)}));
 result.coins=normalizeCoins(s.coins);
 return result;
}
function reconcileHealth(previous,next){
 const before=normalize(previous),after=normalize(next);
 if(before.maxHp!==after.maxHp)after.hp=Math.max(0,after.maxHp-Math.max(0,before.maxHp-before.hp));
 return after;
}
const referenceUrl=(edition,kind,id)=>'dnd-reference.html?'+new URLSearchParams({edition,kind,id});
window.HOLEN_DND={abilities,editions,skills,modifier,proficiency,blank,normalize,referenceUrl,xpThresholds,standardArray,pointBuyCosts,coinValues,coinLimit,levelFromXp,xpForLevel,pointBuyCost,hpMaximum,reconcileHealth,totalCopper,exchangeCoins};
})();
