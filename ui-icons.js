/* Shared, cached vector icons; upgrade navigation labels without changing their text. */
(()=>{'use strict';
const sprite='assets/ui-icons.svg?v=0122',glyphs={'←':'arrow-left','→':'arrow-right','↗':'arrow-out','⌂':'home'};
const svg=(name,extra='')=>`<svg class="ui-icon ${extra}" viewBox="0 0 ${name.startsWith('library-')?'32 32':'24 24'}" aria-hidden="true" focusable="false"><use href="${sprite}#${name}"></use></svg>`;
function upgrade(root){
 if(!root||root.nodeType!==1)return;
 const controls=[...(root.matches('a,button,summary,.pack-cta,.feature-foot,.rules-pack-arrow,.dnd-exchange')?[root]:[]),...root.querySelectorAll('a,button,summary,.pack-cta,.feature-foot,.rules-pack-arrow,.dnd-exchange')];
 for(const control of controls){
  const walker=document.createTreeWalker(control,NodeFilter.SHOW_TEXT),nodes=[];let node;
  while((node=walker.nextNode()))if(!node.parentElement.closest('svg,script,style,textarea')&&/[←→↗⌂]/.test(node.data))nodes.push(node);
  for(const text of nodes){
   const fragment=document.createDocumentFragment();
   for(const part of text.data.split(/([←→↗⌂])/)){if(glyphs[part]){const holder=document.createElement('span');holder.innerHTML=svg(glyphs[part],'ui-action-icon');fragment.append(holder.firstChild);}else fragment.append(document.createTextNode(part));}
   text.replaceWith(fragment);
  }
 }
 root.querySelectorAll('.side-nav [data-view] .nav-icon').forEach(icon=>{
  if(icon.dataset.upgraded)return;icon.dataset.upgraded='1';icon.setAttribute('aria-hidden','true');icon.innerHTML=svg('library-'+icon.parentElement.dataset.view,'ui-library-icon');
 });
}
window.HOLEN_ICONS={svg,upgrade};upgrade(document.body);
const observer=new MutationObserver(records=>{
 const roots=new Set();for(const record of records){for(const node of record.addedNodes)if(node.nodeType===1)roots.add(node);else if(node.parentElement)roots.add(node.parentElement);}
 for(const root of roots)if(root.isConnected&&!root.closest('svg'))upgrade(root);
});observer.observe(document.body,{childList:true,subtree:true});
})();
