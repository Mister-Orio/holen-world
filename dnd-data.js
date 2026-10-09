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
function blank(edition='2014',classId='fighter',speciesId='human'){
 if(!Object.hasOwn(editions,edition))edition='2014';
 const cls=editions[edition].classes.find(x=>x.id===classId)||editions[edition].classes[0];
 const species=editions[edition].species.find(x=>x.id===speciesId)||editions[edition].species.find(x=>x.id==='human');
 return {type:'dnd',version:1,edition,classId:cls.id,speciesId:species.id,level:1,background:'',subclass:'',alignment:'',experience:0,abilities:Object.fromEntries(Object.keys(abilities).map(k=>[k,10])),saveProficiencies:[...cls.saves],skills:{},hp:cls.hitDie,maxHp:cls.hitDie,tempHp:0,armorClass:10,speed:species.speed,initiativeBonus:0,hitDice:1,casting:cls.casting,slots:Array.from({length:9},()=>({current:0,max:0})),resources:cls.resources.map(name=>({name,current:0,max:0})),attacks:[],features:'',spells:'',equipment:'',notes:'',inspiration:false,deathSuccess:0,deathFailure:0};
}
function normalize(value){
 const s=value&&typeof value==='object'?value:{};
 const edition=Object.hasOwn(editions,s.edition)?s.edition:'2014';
 const base=blank(edition,s.classId,s.speciesId);
 const int=(x,min,max,fallback=0)=>Number.isFinite(Number(x))?Math.min(max,Math.max(min,Math.trunc(Number(x)))):fallback;
 const text=(x,max=8000)=>typeof x==='string'?x.slice(0,max):'';
 const result={...base};
 for(const key of ['background','subclass','alignment'])result[key]=text(s[key],160);
 for(const key of ['features','spells','equipment','notes'])result[key]=text(s[key]);
 for(const [key,min,max] of [['level',1,20],['experience',0,9999999],['hp',0,9999],['maxHp',1,9999],['tempHp',0,9999],['armorClass',1,100],['speed',0,1000],['initiativeBonus',-30,30],['hitDice',0,20],['deathSuccess',0,3],['deathFailure',0,3]])result[key]=int(s[key]??base[key],min,max,base[key]);
 result.hp=Math.min(result.hp,result.maxHp);result.hitDice=Math.min(result.hitDice,result.level);
 result.abilities=Object.fromEntries(Object.keys(abilities).map(k=>[k,int(s.abilities?.[k]??10,1,30,10)]));
 result.saveProficiencies=Array.isArray(s.saveProficiencies)?Object.keys(abilities).filter(k=>s.saveProficiencies.includes(k)):base.saveProficiencies;
 result.skills=Object.fromEntries(skills.map(([id])=>[id,int(s.skills?.[id],0,2)]));
 result.casting=['','int','wis','cha'].includes(s.casting)?s.casting:base.casting;
 result.inspiration=!!s.inspiration;
 result.slots=Array.from({length:9},(_,i)=>{const max=int(s.slots?.[i]?.max,0,20);return {max,current:int(s.slots?.[i]?.current,0,max)};});
 result.resources=(Array.isArray(s.resources)?s.resources:base.resources).filter(r=>r&&typeof r==='object').slice(0,12).map(r=>{const max=int(r.max,0,999);return {name:text(r.name,80),max,current:int(r.current,0,max)};});
 result.attacks=(Array.isArray(s.attacks)?s.attacks:[]).filter(a=>a&&typeof a==='object').slice(0,20).map(a=>({name:text(a.name,80),ability:Object.hasOwn(abilities,a.ability)?a.ability:'str',proficient:!!a.proficient,bonus:int(a.bonus,-30,30),damage:text(a.damage,120),range:text(a.range,80)}));
 return result;
}
const referenceUrl=(edition,kind,id)=>'dnd-reference.html?'+new URLSearchParams({edition,kind,id});
window.HOLEN_DND={abilities,editions,skills,modifier,proficiency,blank,normalize,referenceUrl};
})();
