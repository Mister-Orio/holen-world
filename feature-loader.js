/* Section dependencies are loaded once, in order, with retry after a failed request. */
(()=>{'use strict';
const pending=new Map(),ready=new Set(),busy=new WeakMap(),failed=new WeakMap();
const data='data.js?v=0110',model='dnd-data.js?v=0117',options='dnd-options-data.js?v=0123',srd='bestiary-srd.js?v=0120',library='dnd-library.css?v=0118';
const catalogs=[data,'catalog-data.js?v=0116',model];
const choices=[model,options,library,'dnd-option-sources.js?v=0122','dnd-options-ui.js?v=0123'];
const rooms=[data,'squad-abilities.js?v=0116','bestiary-data.js?v=0115','online-room-ui.js?v=0119'];
const views={
 squads:[data],rules:[data,'holen-rules-data.js?v=0123'],
 classes:catalogs,races:catalogs,backgrounds:choices,feats:choices,
 profile:[data,model,options,'character-wizard.css?v=0123','character-ui.js?v=0122','character-wizard-model.js?v=0122','character-wizard.js?v=0123'],
 'dnd-sheet':[model,options,srd,library,'dnd-builder.css?v=0117','dnd-sheet-ui.js?v=0119'],
 'bestiary-journeys':[srd,library,'bestiary-ui.js?v=0120'],
 'bestiary-insects':['bestiary-data.js?v=0115',srd,library,'bestiary-ui.js?v=0120'],
 'lore-journeys':['items-data.js?v=0121'],'lore-insects':['items-data.js?v=0121'],
 rooms,gm:rooms
};
function resource(url){
 if(pending.has(url))return pending.get(url);
 const task=new Promise((resolve,reject)=>{
  const css=url.split('?')[0].endsWith('.css'),node=document.createElement(css?'link':'script');
  if(css){node.rel='stylesheet';node.href=url;}else{node.src=url;node.async=false;}
  node.onload=()=>{ready.add(url);resolve();};
  node.onerror=()=>{node.remove();pending.delete(url);reject(Error('Не удалось загрузить раздел. Проверь подключение.'));};
  document.head.append(node);
 });pending.set(url,task);return task;
}
async function forView(view){
 const files=views[view]||[];
 await Promise.all(files.filter(x=>x.split('?')[0].endsWith('.css')).map(resource));
 for(const file of files)if(!file.split('?')[0].endsWith('.css'))await resource(file);
}
function loading(root,view){
 if(!root)return ()=>{};
 if(failed.has(root))root.querySelector('.feature-status')?.remove();
 if((views[view]||[]).every(x=>ready.has(x))){(failed.get(root)||[]).forEach(([node,value])=>node.inert=value);failed.delete(root);return ()=>{};}
 if(busy.has(root))return busy.get(root);
 const children=failed.get(root)||[...root.children].map(node=>[node,node.inert]);
 children.forEach(([node])=>node.inert=true);
 const notice=document.createElement('div');notice.className='room-empty feature-status';notice.setAttribute('role','status');notice.textContent='Загружаем раздел…';root.prepend(notice);root.setAttribute('aria-busy','true');
 const finish=error=>{
  root.removeAttribute('aria-busy');busy.delete(root);
  if(!error){children.forEach(([node,value])=>node.inert=value);failed.delete(root);notice.remove();return;}
  failed.set(root,children);
  notice.textContent=error.message+' ';const retry=document.createElement('button');retry.type='button';retry.className='btn subtle';retry.textContent='Повторить';retry.onclick=()=>{notice.remove();window.navigate(view,{push:false});};notice.append(retry);
 };busy.set(root,finish);return finish;
}
window.HOLEN_FEATURES={forView,loading};
})();
