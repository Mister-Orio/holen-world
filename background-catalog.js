/* Published backgrounds are scoped by pack and edition; character choices keep their own snapshot. */
(()=>{'use strict';
const options=window.HOLEN_DND_OPTIONS,d=window.HOLEN_DND;if(!options||!d)return;
const ids=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/,uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fields=['id','name','nameEn','description','source','sourceBook','sourceName','sourceKind','homebrew','aliases','skills','skillChoices','originFeat'];
const skillIds=new Set(d.skills.map(x=>x[0])),states=new Map(),bundled={};
for(const edition of ['2014','2024']){bundled[edition]=JSON.parse(JSON.stringify(options.editions[edition].backgrounds));states.set(edition,{version:null,loadedAt:0,pending:null,epoch:0,status:'bundled'});}
const strings=(v,limit,max)=>Array.isArray(v)&&v.length<=limit&&new Set(v).size===v.length&&v.every(x=>typeof x==='string'&&x.length<=max);
function valid(record,edition){
 if(!record||typeof record!=='object'||Array.isArray(record)||Object.keys(record).some(k=>!fields.includes(k)))return false;
 if(typeof record.id!=='string'||!ids.test(record.id)||typeof record.name!=='string'||!record.name.trim()||record.name.length>160)return false;
 for(const [key,max] of [['nameEn',160],['description',8000],['sourceBook',24],['sourceName',300]])if(record[key]!==undefined&&(typeof record[key]!=='string'||record[key].length>max))return false;
 if(typeof record.source!=='string'||record.source.length>500)return false;
 const domain=edition==='2024'?'next\\.dnd\\.su':'(?:5e14\\.)?dnd\\.su';
 if(!new RegExp('^https://'+domain+'/backgrounds/[0-9]+-[a-z0-9-]+/?$').test(record.source))return false;
 if(!strings(record.skills,18,30)||record.skills.some(k=>!skillIds.has(k)))return false;
 if(record.aliases!==undefined&&!strings(record.aliases,20,160))return false;
 if(record.homebrew!==undefined&&typeof record.homebrew!=='boolean')return false;
 if(record.sourceKind!==undefined&&!['official','homebrew'].includes(record.sourceKind))return false;
 if(record.originFeat!==undefined&&(typeof record.originFeat!=='string'||!options.editions[edition].feats.some(x=>x.id===record.originFeat)||(edition!=='2024')))return false;
 const choices=record.skillChoices;
 if(choices!==undefined&&(!choices||typeof choices!=='object'||Array.isArray(choices)||Object.keys(choices).some(k=>!['count','options'].includes(k))||!Number.isInteger(choices.count)||choices.count<1||choices.count>18||!strings(choices.options,18,30)||choices.options.length<choices.count||choices.options.some(k=>!skillIds.has(k)||record.skills.includes(k))))return false;
 return true;
}
function validate(records,edition){return ['2014','2024'].includes(edition)&&Array.isArray(records)&&records.length<=5000&&new Set(records.map(x=>x?.id)).size===records.length&&records.every(x=>valid(x,edition));}
async function ensure(edition,{force=false}={}){
 const state=states.get(edition);if(!state)return null;if(state.pending)return state.pending;
 if(!force&&Date.now()-state.loadedAt<30000)return state;
 const epoch=++state.epoch;
 state.pending=(async()=>{
  let timer;
  try{
   const auth=window.HOLEN_AUTH_UI;if(!auth?.isAuthenticated())return state;
   const data=await Promise.race([auth.api('/rest/v1/rpc/holen_catalog_public',{method:'POST',body:{p_module:'backgrounds',p_pack:'journeys',p_edition:edition}}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('catalog_timeout')),8000);})]);
   if(epoch!==state.epoch)return state;
   if(data===null){options.editions[edition].backgrounds=JSON.parse(JSON.stringify(bundled[edition]));state.version=null;state.status='bundled';}
   else{
    if(!uuid.test(data?.version_id||'')||!validate(data.records,edition))throw Error('invalid_catalog');
    options.editions[edition].backgrounds=JSON.parse(JSON.stringify(data.records)).sort((a,b)=>a.name.localeCompare(b.name,'ru'));state.version=data.version_id;state.status='published';
   }
   state.loadedAt=Date.now();window.dispatchEvent(new CustomEvent('holen-backgrounds-changed',{detail:{edition,version:state.version}}));
  }catch(_){state.status=state.version?'cached':'fallback';}
  finally{clearTimeout(timer);state.pending=null;}
  return state;
 })();return state.pending;
}
function selection(edition,id){
 const record=options.editions[edition]?.backgrounds.find(x=>x.id===id);if(!record)return null;
 return {pack:'journeys',edition,version:states.get(edition)?.version||null,record:JSON.parse(JSON.stringify(record))};
}
function snapshot(value,edition,id){
 if(!value||value.pack!=='journeys'||value.edition!==edition||value.record?.id!==id||!(value.version===null||uuid.test(value.version||''))||!valid(value.record,edition))return null;
 return JSON.parse(JSON.stringify({pack:value.pack,edition,version:value.version,record:value.record}));
}
window.HOLEN_BACKGROUNDS={ensure,ready:()=>Promise.all(['2014','2024'].map(e=>ensure(e))),validate,selection,snapshot,state:edition=>({...states.get(edition),pending:undefined}),bundled:edition=>JSON.parse(JSON.stringify(bundled[edition]))};
})();
