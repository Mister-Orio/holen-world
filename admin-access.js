/* The navigation is absent until the server confirms the current account's administrative role. */
(()=>{'use strict';
const link=document.getElementById('admin-nav');if(!link)return;
const parent=link.parentNode,next=link.nextSibling;
let epoch=0;
function hide(){link.hidden=true;link.remove();}
function currentUser(){return window.HOLEN_AUTH_UI?.currentUserId?.()||null;}
function confirmed(c,user){return !!user&&c?.allowed===true&&['admin','owner'].includes(c.role)&&c.user_id===user;}
hide();
async function refresh(){
 const marker=++epoch,user=currentUser();hide();
 if(!window.HOLEN_AUTH_UI?.isAuthenticated())return;
 try{
  const c=await window.HOLEN_AUTH_UI.api('/rest/v1/rpc/holen_admin_context',{method:'POST',body:{}});
  if(marker===epoch&&window.HOLEN_AUTH_UI.isAuthenticated()&&currentUser()===user&&confirmed(c,user)){
   parent.insertBefore(link,next?.parentNode===parent?next:null);link.hidden=false;
   link.classList.toggle('active',location.hash==='#admin');
  }
 }catch(_){/* Older deployments do not yet expose the admin API. */}
}
window.addEventListener('holen-auth-changed',refresh);
window.addEventListener('holen-navigated',refresh);
window.addEventListener('focus',refresh);
refresh();
})();
