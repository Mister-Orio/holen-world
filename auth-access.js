/* Guard standalone creature, reference and squad pages before displaying them. */
(()=>{'use strict';
const base=new URL(document.currentScript.src),login=new URL('index.html',base),store='holen-auth-v09';
const project='https://xxxsirbvyjfowyfocost.supabase.co',key='sb_publishable_ytsdF5ZPWAwJQaPHnjRybA_R8S5uVm8';
document.documentElement.classList.add('standalone-auth-check');
const style=document.createElement('style');style.textContent='html.standalone-auth-check body{visibility:hidden}html.standalone-auth-check:before{content:"Проверяем вход в Холэн…";position:fixed;inset:0;display:grid;place-items:center;background:#0c1815;color:#eaf2eb;font:600 18px system-ui;z-index:99999}';document.head.append(style);
let checking=false;
function signIn(){login.searchParams.set('return_to',location.href);login.hash='auth';location.replace(login.href);}
async function verify(){
 if(checking)return;checking=true;document.documentElement.classList.add('standalone-auth-check');
 try{
  let session;try{session=JSON.parse(localStorage.getItem(store)||'null');}catch(_){}
  if(!session?.access_token){signIn();return;}
  if(session.expires_at&&Date.now()>session.expires_at-60000){
   if(!session.refresh_token){localStorage.removeItem(store);signIn();return;}
   const response=await fetch(project+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
   if(!response.ok){if(response.status===400||response.status===401)localStorage.removeItem(store);signIn();return;}
   const fresh=await response.json();session={...fresh,expires_at:Date.now()+fresh.expires_in*1000};localStorage.setItem(store,JSON.stringify(session));
  }
  const response=await fetch(project+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+session.access_token}});
  if(!response.ok){if(response.status===401||response.status===403)localStorage.removeItem(store);signIn();return;}
  const user=await response.json();if(!user.id){signIn();return;}
  document.documentElement.classList.remove('standalone-auth-check');
 }catch(_){signIn();}finally{checking=false;}
}
window.addEventListener('storage',e=>{if(e.key===store)verify();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)verify();});
verify();
})();
