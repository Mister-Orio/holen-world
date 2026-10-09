/* Холэн v0.11. Листы по умолчанию доступны только для чтения. */
(()=>{
'use strict';
window.HOLEN_SHEET_EDITABLE=false;
const params=new URLSearchParams(location.search),room=params.get('room'),char=params.get('character');
const uuid=/^[0-9a-f-]{36}$/i;
document.body.classList.add('holen-sheet-readonly');
const style=document.createElement('style');
style.textContent='body.holen-sheet-readonly button,body.holen-sheet-readonly input,body.holen-sheet-readonly select,body.holen-sheet-readonly textarea{cursor:not-allowed!important;opacity:.52!important;pointer-events:none!important}.holen-sheet-banner{position:sticky;top:0;z-index:50;padding:11px 15px;border-bottom:1px solid #6a7c67;background:#203126;color:#d3ebd7;font:600 12px/1.5 system-ui}.holen-sheet-banner strong{color:#e9c889}body:not(.holen-sheet-readonly) .holen-sheet-banner{background:#24482e;border-color:#78c996}';
document.head.appendChild(style);
const banner=document.createElement('div');banner.className='holen-sheet-banner';banner.setAttribute('role','status');
banner.innerHTML='<strong>Справочный режим.</strong> Способности, изменение здоровья и автосохранение доступны только владельцу персонажа в игровой комнате.';
document.body.prepend(banner);
function block(e){
 if(window.HOLEN_SHEET_EDITABLE)return;
 if(e.target?.closest?.('button,input,select,textarea')||e.type==='submit'){
  e.preventDefault();e.stopImmediatePropagation();
 }
}
for(const type of ['click','input','change','keydown','submit'])window.addEventListener(type,block,true);
if(!uuid.test(room||'')||!uuid.test(char||''))return;
const key=room+'-'+char;
if(location.hash.slice(1)!==key)history.replaceState(history.state,'',location.pathname+location.search+'#'+key);
const base='https://xxxsirbvyjfowyfocost.supabase.co';
const publishable='sb_publishable_ytsdF5ZPWAwJQaPHnjRybA_R8S5uVm8';
async function verify(){
 let session;try{session=JSON.parse(localStorage.getItem('holen-auth-v09')||'null');}catch(_){}
 if(!session?.access_token)return;
 if(session.expires_at&&Date.now()>session.expires_at-60000){
  if(!session.refresh_token)return;
  const rr=await fetch(base+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:publishable,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
  if(!rr.ok)return;
  const fresh=await rr.json();session={...fresh,expires_at:Date.now()+fresh.expires_in*1000};
  localStorage.setItem('holen-auth-v09',JSON.stringify(session));
 }
 const headers={apikey:publishable,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'};
 const idRes=await fetch(base+'/auth/v1/user',{headers});
 if(!idRes.ok)return;
 const user=await idRes.json();
 const snapRes=await fetch(base+'/rest/v1/rpc/holen_room_snapshot',{method:'POST',headers,body:JSON.stringify({p_room:room})});
 if(!snapRes.ok)return;
 const state=await snapRes.json();
 const type=location.pathname.match(/\/sheets\/([a-z-]+)\.html$/i)?.[1];
 const owned=state?.units?.find(u=>u.owner_id===user.id&&u.character_id===char&&u.template_key===type);
 if(!owned||state.room?.status!=='active'||state.room?.pack_key!=='insects')return;
 window.HOLEN_SHEET_EDITABLE=true;
 document.body.classList.remove('holen-sheet-readonly');
 banner.innerHTML='<strong>Игровой режим подтверждён.</strong> Действия доступны, но пока сохраняются только в этом браузере. Здоровье на сервере комнаты меняет ГМ.';
 window.dispatchEvent(new Event('holen-sheet-authorized'));
}
verify().catch(()=>{banner.innerHTML='<strong>Справочный режим.</strong> Не удалось подтвердить доступ к активной комнате. Ничего не будет изменено.';});
})();