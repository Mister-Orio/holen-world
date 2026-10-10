/* Rebuild the lightweight indexes and detail chunks without changing creature data. */
const fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'../assets/bestiary'),fields=['id','name','name_ru','size','sizes','type','cr'];
for(const edition of ['2014','2024']){
 const file=path.join(dir,'srd-monsters-'+edition+'.json'),data=JSON.parse(fs.readFileSync(file,'utf8'));
 const input=data.monsters.some(x=>x.block_text)?data.monsters:data.monsters.map(x=>({...Object.fromEntries(fields.map(k=>[k,x[k]])),...JSON.parse(fs.readFileSync(path.join(dir,'srd-details-'+edition+'-'+x.chunk+'.json'),'utf8')).monsters.find(m=>m.id===x.id)}));
 const index=[],chunks=[];
 const firstChunk=input.length&&fs.existsSync(path.join(dir,`srd-details-${edition}-01.json`))?JSON.parse(fs.readFileSync(path.join(dir,`srd-details-${edition}-01.json`),'utf8')):null;
 const translation=firstChunk?.translation;
 input.forEach((monster,i)=>{
  const chunk=String(Math.floor(i/20)+1).padStart(2,'0');
  const card=Object.fromEntries(fields.map(k=>[k,monster[k]]));card.chunk=chunk;index.push(card);
  const detail={...monster};for(const key of fields)if(key!=='id')delete detail[key];
  (chunks[Number(chunk)-1]??=[]).push(detail);
 });
 chunks.forEach((monsters,i)=>fs.writeFileSync(path.join(dir,'srd-details-'+edition+'-'+String(i+1).padStart(2,'0')+'.json'),JSON.stringify({edition,monsters,...(translation?{translation}:{})})));
 const output={...data,format:'holen-srd-index-v1',monsters:index};fs.writeFileSync(file,JSON.stringify(output));
 console.log(edition+': '+index.length+' creatures, '+chunks.length+' detail chunks, index '+fs.statSync(file).size+' bytes');
}
