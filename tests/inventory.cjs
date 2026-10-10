const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const site=path.resolve(__dirname,'..'),ctx={window:{}};vm.createContext(ctx);
for(const name of ['inventory-data.js','items-data.js'])vm.runInContext(fs.readFileSync(path.join(site,name),'utf8'),ctx);
const inventory=ctx.window.HOLEN_INVENTORY,items=ctx.window.HOLEN_ITEMS;
assert.equal(inventory.length,50);assert.equal(new Set(inventory.map(x=>x.id)).size,50);
const count=(group,combat)=>inventory.filter(x=>x.group===group&&(!combat||x.combat===combat)).length;
assert.equal(count('simple','melee'),10);assert.equal(count('simple','ranged'),4);
assert.equal(count('martial','melee'),18);assert.equal(count('martial','ranged'),5);
for(const [group,n] of [['light',3],['medium',5],['heavy',4],['shield',1]])assert.equal(count(group),n);
for(const x of inventory){assert.equal(x.magic,false);assert.ok(!items.some(y=>y.id===x.id));assert.ok(x.price&&x.weight);}
assert.ok(!items.some(x=>x.magic===false&&['Оружие','Доспех'].includes(x.type)));
assert.ok(items.some(x=>x.magic&&x.type==='Доспех'),'Magic armour must remain in Holen items');
const find=name=>inventory.find(x=>x.name===name);
assert.equal(find('Щит').ac,'+2');assert.equal(find('Латы').ac,'18');assert.equal(find('Латы').strength,'15');assert.equal(find('Латы').stealth,'Помеха');
assert.equal(find('Кираса').ac,'14 + модификатор Лов (макс. 2)');assert.equal(find('Кожаный').ac,'11 + модификатор Лов');
assert.equal(find('Кинжал').range,'5 фут. · метание 20/60 фут.');assert.equal(find('Кинжал').damageType,'колющий');
assert.equal(find('Длинный лук').range,'150/600 фут.');assert.equal(find('Глефа').range,'10 фут.');
assert.equal(find('Сеть').damage,'—');assert.equal(find('Духовая трубка').damage,'1');
console.log('PASS: 37 weapons, 13 armour/shield entries; ranges, armour rules, magic items and catalogue separation.');
