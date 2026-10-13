/* Public browsing never waits for authentication. Only password recovery is modal.
 * Account data and mutations remain protected by the server, not by this panel. */
(()=>{
 'use strict';
 const root=document.getElementById('view-auth'),key='holen-auth-return-v1';
 if(!root)return;
 const base=new URL('./',location.href),inert=new Map();
 let locked=false,returnUrl=null;
 function safeReturn(value){
  try{
   const url=new URL(value,base);
   return url.origin===base.origin&&!url.username&&!url.password&&
    url.pathname.startsWith(base.pathname)&&/\.html$|\/$/.test(url.pathname)&&
    !/access_token=|refresh_token=/.test(url.hash)?url.href:null;
  }catch(_){return null;}
 }
 try{returnUrl=safeReturn(new URLSearchParams(location.search).get('return_to')||sessionStorage.getItem(key));}catch(_){}
 function remember(view){
  if(['auth','profile'].includes(view))return;
  const url=new URL(location.href);url.searchParams.delete('return_to');url.hash=view;
  returnUrl=safeReturn(url.href);
  try{sessionStorage.setItem(key,returnUrl);}catch(_){}
 }
 function sync(signedIn,{checking=false,recovery=false}={}){
  locked=recovery;
  document.documentElement.classList.toggle('auth-gated',locked);
  document.documentElement.classList.remove('auth-checking');
  root.setAttribute('role',locked?'dialog':'region');
  if(locked)root.setAttribute('aria-modal','true');else root.removeAttribute('aria-modal');
  if(locked){
   root.hidden=false;
   let branch=root;
   while(branch.parentElement){
    for(const sibling of branch.parentElement.children)if(sibling!==branch&&!inert.has(sibling)){
     inert.set(sibling,sibling.inert);sibling.inert=true;
    }
    branch=branch.parentElement;if(branch===document.body)break;
   }
  }else{
   for(const [element,value] of inert)element.inert=value;
   inert.clear();
  }
 }
 function takeReturn(){
  const target=returnUrl;returnUrl=null;
  try{sessionStorage.removeItem(key);}catch(_){}
  return target;
 }
 document.addEventListener('keydown',event=>{
  if(!locked)return;
  if(event.key==='Escape'){event.preventDefault();return;}
  if(event.key!=='Tab')return;
  const fields=[...root.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]')]
   .filter(x=>!x.disabled&&x.getClientRects().length);
  const first=fields[0],last=fields.at(-1);if(!first)return;
  if(event.shiftKey&&(document.activeElement===first||!root.contains(document.activeElement))){
   event.preventDefault();last.focus();
  }else if(!event.shiftKey&&(document.activeElement===last||!root.contains(document.activeElement))){
   event.preventDefault();first.focus();
  }
 });
 window.HOLEN_AUTH_GATE={sync,remember,takeReturn,safeReturn,isLocked:()=>locked};
 sync(false);
})();
