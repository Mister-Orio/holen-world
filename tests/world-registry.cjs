/* Data integrity and public-field boundary for the workbook import. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const site=path.resolve(__dirname,'..'),context={window:{}};vm.createContext(context);
for(const file of ['holen-rules-data.js','items-data.js'])vm.runInContext(fs.readFileSync(path.join(site,file),'utf8'),context);
const spells=context.window.HOLEN_RULES_DATA.spells,items=context.window.HOLEN_ITEMS;
const spellKeys=new Set(['id','name','level','school','category','license','source','sourceUrl','review']);
const itemKeys=new Set(['id','name','type','rarity','attunement','source','sourceUrl','legalClass','risk','possession','carrying','activation','crafting','trading','license','conditions','review','kind','magic','packs','price','weight','stats','legalNote','value','unit']);
assert.equal(spells.length,441);assert.equal(items.length,470);
for(const [records,keys] of [[spells,spellKeys],[items,itemKeys]]){
 assert.equal(new Set(records.map(r=>r.id)).size,records.length);
 for(const record of records){
  assert.ok(record.name&&record.source);
  const source=new URL(record.sourceUrl);
  assert.equal(source.protocol,'https:');assert.match(source.hostname,/(^|\.)dnd\.su$/);
  for(const key of Object.keys(record))assert.ok(keys.has(key),`Unexpected public field: ${record.id}.${key}`);
 }
}
const levels={'Заговор':46,'1':78,'2':86,'3':74,'4':50,'5':60,'6':47};
for(const [level,count] of Object.entries(levels))assert.equal(spells.filter(s=>s.level===level).length,count);
assert.equal(spells.filter(s=>s.review==='Спорный случай').length,64);
assert.equal(items.filter(s=>s.review==='Спорный случай').length,40);
for(const [kind,count] of Object.entries({'Магические предметы':265,'Снаряжение':148,'Сокровища':57}))
 assert.equal(items.filter(item=>item.kind===kind).length,count);
for(const item of items){assert.deepEqual(Array.from(item.packs),['journeys']);
 if(item.magic)for(const key of ['possession','carrying','activation','crafting','trading','license','legalClass','review'])assert.ok(item[key],`${item.id}.${key}`);
}
assert.equal(items.filter(x=>x.id.startsWith('GEM-')).length,52);
assert.equal(items.filter(x=>x.id.startsWith('ART-')).length,5);
console.log('PASS: 441 spells (0–6), 470 items, source links, pack isolation, public fields and review flags.');
