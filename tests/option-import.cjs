const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const box={window:{},URLSearchParams};vm.createContext(box);
for(const file of ['dnd-data.js','dnd-options-data.js','character-wizard-model.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),box);
const {HOLEN_DND:d,HOLEN_DND_OPTIONS:o,HOLEN_CHARACTER_WIZARD:m}=box.window,ed=o.editions['2014'];
assert.equal(ed.backgrounds.length,37);assert.equal(ed.feats.length,74);
for(const kind of ['backgrounds','feats']){
 assert.equal(new Set(ed[kind].map(x=>x.id)).size,ed[kind].length);
 for(const x of ed[kind])assert.match(x.source,/^https:\/\/(?:5e14\.)?dnd\.su\/(?:feats|backgrounds)\/\d+-[^/]+\/$/);
}
for(const bg of ed.backgrounds){assert.equal(bg.skills.length+(bg.skillChoices?.count||0),2);if(bg.skillChoices)assert.ok(bg.skillChoices.options.length>=bg.skillChoices.count);}
const state=m.fresh();m.change(state,'backgroundId','urban-bounty-hunter');assert.ok(m.validate(state,3));
m.change(state,'backgroundSkill',['deception',true]);m.change(state,'backgroundSkill',['stealth',true]);m.change(state,'backgroundSkill',['persuasion',true]);
assert.equal(state.backgroundSkills.length,2);assert.equal(m.validate(state,3),'');assert.equal(m.payload(state).skills.deception,1);
m.change(state,'backgroundId','cloistered-scholar');assert.equal(state.backgroundSkills.length,0);assert.ok(m.validate(state,3));
m.change(state,'backgroundSkill',['nature',true]);assert.equal(m.validate(state,3),'');assert.equal(m.payload(state).skills.history,1);assert.equal(m.payload(state).skills.nature,1);
const restored=m.restore(state);assert.equal(restored.backgroundSkills[0],'nature');
const sh=d.blank('2014','fighter','human'),feat=id=>ed.feats.find(x=>x.id===id),eligible=id=>o.featEligibility(feat(id),sh).eligible;
assert.equal(eligible('bountiful-luck'),false);sh.speciesId='halfling';assert.equal(eligible('bountiful-luck'),true);assert.equal(eligible('squat-nimbleness'),true);
sh.speciesId='human';assert.equal(eligible('squat-nimbleness'),false);sh.speciesId='dwarf';assert.equal(eligible('squat-nimbleness'),true);
assert.equal(eligible('metamagic-adept'),false);sh.classId='paladin';sh.level=1;assert.equal(eligible('metamagic-adept'),false);sh.level=2;assert.equal(eligible('metamagic-adept'),true);
sh.classId='warlock';sh.level=4;assert.equal(eligible('metamagic-adept'),true);assert.equal(eligible('cartomancer'),false);
sh.classId='fighter';sh.level=3;sh.selectedSubclassId='fighter-eldritch-knight';assert.equal(eligible('metamagic-adept'),true);
console.log('PASS: imported options, direct sources, selectable background skills and feat prerequisites.');
