const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ctx={window:{},URLSearchParams};vm.createContext(ctx);
for(const file of ['dnd-data.js','dnd-options-data.js','dnd-option-sources.js','catalog-data.js','character-wizard-model.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
const d=ctx.window.HOLEN_DND,o=ctx.window.HOLEN_DND_OPTIONS,src=ctx.window.HOLEN_OPTION_SOURCES,m=ctx.window.HOLEN_CHARACTER_WIZARD;
const races=d.editions['2014'].species,newRaces=races.filter(x=>x.supplement);
assert.equal(races.length,46);assert.equal(newRaces.length,37);assert.equal(new Set(races.map(x=>x.id)).size,46);
for(const id of ['gith','astral-elf','simic-hybrid','yuan-ti','hexblood','reborn','dhampir','custom-lineage'])assert.ok(!races.some(x=>x.id===id),id+' needs separate GM approval');
assert.equal(require('node:crypto').createHash('sha256').update(JSON.stringify(d.editions['2024'])).digest('hex'),'b54008c6aaf9b08ee2ebd94ac137939f57ab3a0d7bc8ff3fc1c02139003400c7','2024 unchanged');
for(const r of newRaces){const sh=d.normalize(d.blank('2014','fighter',r.id));assert.equal(sh.speciesId,r.id);assert.equal(sh.speed,r.speed);assert.ok(r.source.startsWith('https://5e14.dnd.su/'));assert.ok(r.sourceBook&&r.sourceName&&r.worldAccess&&r.worldRegion);const state=m.fresh();m.change(state,'speciesId',r.id);assert.equal(m.payload(state).speciesId,r.id);assert.equal(m.payload(state).speed,r.speed);}
assert.equal(races.find(x=>x.id==='aarakocra').speed,25);assert.equal(races.find(x=>x.id==='grung').speed,25);assert.equal(races.find(x=>x.id==='centaur').speed,40);
const smallFeat=o.editions['2014'].feats.find(x=>x.id==='squat-nimbleness'),sh=d.blank('2014','fighter','verdan');sh.level=4;
assert.equal(d.speciesSize(sh),'Маленький');assert.ok(o.featEligibility(smallFeat,sh).eligible);sh.level=5;assert.equal(d.speciesSize(sh),'Средний');assert.ok(!o.featEligibility(smallFeat,sh).eligible);
sh.speciesId='plasmoid';assert.ok(o.featEligibility(smallFeat,sh).eligible);assert.ok(o.featEligibility(smallFeat,sh).manual.some(x=>x.includes('Маленький размер')));
const group=ctx.window.HOLEN_CATALOG.races.official.find(x=>x.id==='dnd2014-extra');assert.equal(group.items.length,37);for(const item of group.items)assert.ok(newRaces.some(x=>x.name===item.name));
for(const edition of ['2014','2024'])for(const kind of ['feats','backgrounds']){
 const items=o.editions[edition][kind],ph=edition==='2014'?'PH14':'PH24',choices=src.catalogSources(items,edition);
 assert.equal(choices[0][0],ph);assert.ok(choices[0][1].startsWith('Player’s Handbook'));assert.ok(!choices.some(x=>x[0]==='official'));
 const basic=items.filter(x=>src.catalogMatches(x,edition,ph)),other=items.filter(x=>src.catalogMatches(x,edition,'homebrew'));
 assert.equal(basic.length+other.length,items.length);assert.ok(!other.some(x=>basic.includes(x)));
 if(edition==='2014')assert.ok(other.length>0);else assert.equal(other.length,0);
 for(const x of other)assert.equal(src.sourceFor(x,edition).kind,'official','Grouping must preserve real provenance');
}
console.log('PASS: 37 imported races, preserved 2024, model/wizard integration, size-dependent feats, PHB/non-PHB filters.');
