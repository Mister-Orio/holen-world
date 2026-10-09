/* Focused model checks: node tests/character-builder.cjs */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const sandbox={window:{},URLSearchParams};vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','dnd-data.js'),'utf8'),sandbox);
const d=sandbox.window.HOLEN_DND,plain=value=>JSON.parse(JSON.stringify(value));
let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
const equal=(actual,expected,message)=>{assert.deepEqual(plain(actual),plain(expected),message);checks++;};
const change=(sheet,patch)=>d.reconcileHealth(sheet,{...sheet,...patch});

// Both editions and every class use the documented die size and fixed higher-level value.
for(const [edition,data] of Object.entries(d.editions))for(const cls of data.classes){
 const fixed=Math.floor(cls.hitDie/2)+1;
 for(const level of [1,2,5,20])for(const con of [1,8,10,16,30]){
  const mod=Math.floor((con-10)/2),sheet=d.normalize({...d.blank(edition,cls.id),level,baseAbilities:{con}});
  equal(sheet.maxHp,Math.max(1,cls.hitDie+mod)+(level-1)*Math.max(1,fixed+mod),`${edition}/${cls.id}/L${level}/Con${con}`);
 }
}
const fighter=d.blank();equal(fighter.version,2);equal(fighter.hpMode,'average');
const wounded={...fighter,hp:3};
const leveled=change(wounded,{level:5});equal(leveled.maxHp,34);equal(leveled.hp,27,'Level changes preserve seven points of damage');
const stronger=change(leveled,{baseAbilities:{...leveled.baseAbilities,con:16}});equal(stronger.maxHp,49);equal(stronger.hp,42,'Con modifier changes apply to all levels without erasing damage');
equal(change(stronger,{hp:12}).hp,12,'A current HP edit is accepted at the same maximum');
equal(change(stronger,{hpAdjustment:-40}).hp,2,'HP adjustment keeps prior damage');
equal(change(stronger,{level:1,baseAbilities:{...stronger.baseAbilities,con:1}}).hp,0,'Lower maximum clamps current HP at zero');
equal(d.normalize({...fighter,level:3,hpMode:'rolled',hitRolls:[1,10],baseAbilities:{con:1}}).maxHp,11,'Each rolled level gains at least one HP');
equal(d.normalize({...fighter,level:4,hpMode:'rolled',hitRolls:[2]}).maxHp,24,'Missing rolls use the fixed class value');
equal(d.normalize({...fighter,hpAdjustment:-9999}).maxHp,1,'Adjusted maximum cannot drop below one');
const exhausted={...fighter,level:5,hitDice:2};equal(change(exhausted,{baseAbilities:{con:18}}).hitDice,2,'Con changes do not refill spent hit dice');

// Explicit manual health, free-text legacy data, and old totals survive migration.
const legacy={type:'dnd',version:1,edition:'2014',classId:'wizard',speciesId:'elf',level:8,hp:17,maxHp:42,abilities:{str:8,dex:12,con:16,int:18,wis:10,cha:9},notes:'Legacy notes',features:'Feat written by the player',spells:'Old spellbook',equipment:'Old equipment',background:'Custom background',subclass:'Custom subclass',skills:{arcana:2},attacks:[{name:'Old attack',ability:'dex',proficient:true,bonus:1,damage:'1d6+2',range:'30'}]};
const migrated=d.normalize(legacy);equal(migrated.hpMode,'manual');equal(migrated.maxHp,42);equal(migrated.hp,17);equal(migrated.baseAbilities,legacy.abilities);equal(migrated.abilities,legacy.abilities);
for(const k of ['notes','features','spells','equipment','background','subclass'])equal(migrated[k],legacy[k]);
equal(migrated.skills.arcana,2);equal(migrated.attacks[0].damage,'1d6+2');
equal(change(migrated,{level:15,baseAbilities:{...migrated.baseAbilities,con:20}}).maxHp,42,'Migration preserves manual maximum through level and Con edits');
equal(d.normalize(migrated),migrated,'Normalized sheets are stable on subsequent saves');
equal(change(migrated,{hpMode:'average'}).hp,33,'Changing from a legacy manual maximum preserves existing damage');

for(let level=1;level<=20;level++){
 const threshold=d.xpForLevel(level);equal(d.levelFromXp(threshold),level);
 if(level>1)equal(d.levelFromXp(threshold-1),level-1);
}
equal(d.levelFromXp(-50),1);equal(d.levelFromXp(9999999),20);
equal(d.normalize({...fighter,levelMode:'xp',level:1,experience:6500}).level,5);
equal(d.normalize({...fighter,levelMode:'manual',level:3,experience:6500}).level,3);
equal(d.pointBuyCost({str:15,dex:15,con:15,int:8,wis:8,cha:8}),27);
equal(d.pointBuyCost({str:15,dex:14,con:13,int:12,wis:10,cha:8}),27);
equal(d.pointBuyCost(14),7);equal(d.pointBuyCost(7),null);equal(d.pointBuyCost(15.5),null);equal(d.pointBuyCost({str:8}),null);
equal(d.normalize({...fighter,baseAbilities:{str:15,con:12},abilityBonuses:{str:2,con:1}}).abilities,{str:17,dex:10,con:13,int:10,wis:10,cha:10});

// Every denomination pair conserves exact integer copper value.
equal(d.totalCopper({cp:1,sp:1,ep:1,gp:1,pp:1}),1161);
for(const from of Object.keys(d.coinValues))for(const to of Object.keys(d.coinValues))if(from!==to){
 const coins={cp:5,sp:7,ep:3,gp:2,pp:1,[from]:2037},result=d.exchangeCoins(coins,from,to,2037);
 check(result.ok,`${from} to ${to} should exchange`);
 equal(d.totalCopper(result.coins),d.totalCopper(coins),`${from} to ${to} conserves value`);
 check(Number.isInteger(result.received)&&Number.isInteger(result.exchanged)&&Number.isInteger(result.remainder),'No fractional coins');
 equal(result.coins[from],2037-result.exchanged,'Unexchangeable source coins remain in the wallet');
 equal(result.exchanged+result.remainder,2037,'Requested amount is accounted for exactly');
}
const copperToGold=d.exchangeCoins({cp:157},'cp','gp',157);equal(copperToGold.coins,{cp:57,sp:0,ep:0,gp:1,pp:0});equal(copperToGold.remainder,57);
equal(d.exchangeCoins({ep:3},'ep','gp',3).coins,{cp:0,sp:0,ep:1,gp:1,pp:0});
equal(d.exchangeCoins({gp:1},'gp','ep',1).received,2);equal(d.exchangeCoins({ep:1},'ep','cp',1).received,50);
const poor={cp:1,sp:2};equal(d.exchangeCoins(poor,'sp','gp',3).reason,'insufficient-funds');equal(d.exchangeCoins(poor,'sp','gp',3).coins,{cp:1,sp:2,ep:0,gp:0,pp:0});
equal(d.exchangeCoins({cp:9},'cp','sp',9).reason,'too-small');equal(d.exchangeCoins({cp:9},'cp','sp',9).coins.cp,9);
for(const amount of [0,-1,1.5,NaN,Infinity,'',null,true])equal(d.exchangeCoins({gp:1},'gp','cp',amount).ok,false);
equal(d.exchangeCoins({gp:1},'gp','unknown',1).ok,false);
const full={gp:1,cp:d.coinLimit};equal(d.exchangeCoins(full,'gp','cp',1).reason,'limit');equal(d.totalCopper(d.exchangeCoins(full,'gp','cp',1).coins),d.totalCopper(full));

const safe=d.normalize({version:2,edition:'constructor',classId:'__proto__',speciesId:'nope',level:Infinity,hp:-10,maxHp:-50,abilities:{str:NaN},coins:{cp:2.9,sp:-4,ep:Infinity,gp:'3',pp:true},inventory:[null,[],{name:'Rope',quantity:2.9,weight:1.5,costCopper:75,equipped:true,notes:'Keep dry'}],featIds:['feat','feat',7],spellIds:['spell'],selectedSubclassId:'subclass',backgroundId:'background'});
equal(safe.coins,{cp:2,sp:0,ep:0,gp:3,pp:0});equal(safe.inventory.length,1);equal(safe.inventory[0].quantity,2);equal(safe.inventory[0].weight,1.5);equal(safe.inventory[0].costCopper,75);equal(safe.featIds,['feat']);equal(safe.selectedSubclassId,'subclass');equal(safe.backgroundId,'background');
equal(safe.hp,0);equal(safe.maxHp,1);equal(safe.level,1);equal(safe.edition,'2014');equal(d.normalize([]).version,2);
equal(d.normalize({...fighter,inventory:Array.from({length:110},()=>({name:'Item'})),attacks:Array.from({length:25},()=>({name:'Attack'})),hitRolls:Array(40).fill(999)}).inventory.length,100);
equal(d.normalize({...fighter,hitRolls:Array(40).fill(999)}).hitRolls.length,19);
console.log(`D&D builder model: ${checks} checks passed.`);
