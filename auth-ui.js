/* МИР ХОЛЭНА — email + password (Supabase Auth REST API).
 * В публичном JS только publishable ключ; service_role и пароли НЕ сохраняются.
 * Игровые комнаты работают в режиме онлайн-альфы.
 */
(()=>{
'use strict';
const PROJECT='https://xxxsirbvyjfowyfocost.supabase.co';
const KEY='sb_publishable_ytsdF5ZPWAwJQaPHnjRybA_R8S5uVm8';
const REDIRECT='https://mister-orio.github.io/holen-world/';
const STORE='holen-auth-v09';
const $=id=>document.getElementById(id);
const form=$('auth-form'), name=$('auth-username'),email=$('auth-email'),pass=$('auth-password'),confirm=$('auth-confirm');
const buttons={register:$('auth-register-btn'),login:$('auth-login-btn'),forgot:$('auth-forgot-btn')};
const info=$('auth-response');
let mode='login',session=null,authenticated=false;
function feedback(t,err=false){info.textContent=t;info.hidden=false;info.className='auth-response'+(err?' is-error':'');}
function clear(){info.hidden=true;info.textContent='';}
function store(s){session=s;try{s?localStorage.setItem(STORE,JSON.stringify(s)):localStorage.removeItem(STORE);}catch(_){}}
try{session=JSON.parse(localStorage.getItem(STORE)||'null');}catch(_){session=null;}
async function request(endpoint,{method='GET',body,token,headers={}}={}){
 const res=await fetch(PROJECT+endpoint,{method,headers:{'apikey':KEY,'Content-Type':'application/json',...headers,...(token?{'Authorization':'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
 let data;try{data=await res.json();}catch(_){data={};}
 if(!res.ok)throw Error(data.msg||data.error_description||data.message||'Сервер отклонил запрос ('+res.status+').');
 return data;
}
async function validSession(){
 if(!session?.access_token)return null;
 if(session.expires_at && Date.now()>session.expires_at-60000){
   try{
     const fresh=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}});
     store({...fresh,expires_at:Date.now()+fresh.expires_in*1000});
   }catch(_){store(null);renderSession(null);return null;}
 }
 return session.access_token;
}
async function loadProfile(){
 const token=await validSession();
 if(!token){renderSession(null);return;}
 try{
   const user=await request('/auth/v1/user',{token});
   if(!user.id)throw Error('Сессия не подтверждена.');
   let list=[];try{list=await request('/rest/v1/profiles?select=username&id=eq.'+encodeURIComponent(user.id),{token});}catch(_){}
   renderSession({user,username:list?.[0]?.username||'Путешественник'});
 }catch(_){store(null);renderSession(null);}
}
function renderSession(data){
 authenticated=!!data;
 window.__holen_current_user_id=data?.user?.id||null;
 window.HOLEN_AUTH_GATE?.sync(authenticated,{recovery:mode==='reset'});
 const note=$('auth-session'),profile=$('profile-auth-info'),top=$('top-auth-open');
 $('auth-form').hidden=authenticated && mode!=='reset';
 $('auth-bottom-meta')?.classList?.toggle('is-signed-in',authenticated);
 $('profile-auth-actions').hidden=authenticated;
 $('profile-demo-card').hidden=authenticated;
 $('profile-account-card').hidden=!authenticated;
 $('auth-title').textContent=authenticated && mode!=='reset'?'Аккаунт активен':$('auth-title').textContent;
 if(data){
   const display=data.username;
   note.hidden=false;
   $('auth-session-name').textContent=display;
   $('auth-session-email').textContent=data.user.email||'';
   $('profile-account-name').textContent=display;
   $('profile-account-email').textContent=data.user.email||'';
   profile.textContent='Вы вошли как '+display+'. Персонажи сохраняются в аккаунте; онлайн-комнаты проходят тестирование.';
   top.querySelector('span').textContent=display;
   $('profile-name').value=display;
   $('auth-subtitle').textContent='Вы уже авторизованы. Перейдите в профиль для работы с персонажами.';
 }else{
   note.hidden=true;
   profile.textContent='Чтобы сохранять персонажей, зарегистрируйтесь или войдите по почте.';
   top.querySelector('span').textContent='Войти';
 }
 window.dispatchEvent(new Event('holen-auth-changed'));
}
function selectMode(next){
 mode=next;clear();
 window.HOLEN_AUTH_GATE?.sync(authenticated,{recovery:next==='reset'});
 $('auth-form').hidden=authenticated && next!=='reset';
 const reg=next==='register',login=next==='login',recover=next==='recover',reset=next==='reset';
 $('auth-title').textContent=reg?'Создать аккаунт':login?'Войти в Холэн':recover?'Восстановить пароль':'Новый пароль';
 $('auth-subtitle').textContent=reg?'Игровой ник, почта и пароль. Сначала подтвердите адрес электронной почты.':login?'Войдите с помощью электронной почты и пароля.':recover?'Отправим ссылку для восстановления, если этот адрес зарегистрирован.':'Введите новый пароль для своего аккаунта.';
 $('auth-name-field').hidden=!reg;
 $('auth-policy-wrap').hidden=!reg;
 $('auth-policy-accept').required=reg;
 $('auth-email-field').hidden=reset;
 $('auth-password-field').hidden=recover;
 $('auth-confirm-field').hidden=!(reg||reset);
 name.required=reg;email.required=!reset;pass.required=!recover;confirm.required=reg||reset;
 pass.autocomplete=reg||reset?'new-password':'current-password';
 buttons.register.classList.toggle('primary',reg);
 buttons.login.classList.toggle('primary',login);
 $('auth-submit').textContent=reg?'Создать аккаунт':login?'Войти':recover?'Отправить ссылку':'Сохранить новый пароль';
 $('auth-forgot-btn').hidden=recover||reset;
 $('auth-back-login').hidden=!(recover||reset);
 $('auth-reset-help').hidden=!(recover||reset);
}
function failure(e){
 const m=String(e?.message||'Ошибка соединения.');
 if(/invalid login credentials/i.test(m))return 'Неверная почта или пароль.';
 if(/email not confirmed/i.test(m))return 'Подтвердите адрес почты по ссылке из письма.';
 if(/already registered/i.test(m))return 'Этот адрес уже зарегистрирован.';
 if(/rate limit|too many requests|email rate limit/i.test(m))return 'Слишком много попыток или писем. Попробуйте позднее.';
 if(/invalid_username/i.test(m))return 'Проверьте ник: он должен быть уникальным и содержать 3–24 допустимых символа.';
 if(/database error saving new user/i.test(m))return 'Не удалось создать профиль. Проверьте уникальность игрового ника.';
 return m.length<240?m:'Ошибка сервера. Попробуйте позже.';
}
async function submit(e){
 e.preventDefault();clear();
 const btn=$('auth-submit');btn.disabled=true;
 try{
   const username=name.value.trim().normalize('NFC'),mail=email.value.trim().toLowerCase(),password=pass.value;
   if(mode==='register'&&(!/^[\p{L}\p{N}_-]{3,24}$/u.test(username)))throw Error('Логин: 3–24 символа, буквы, цифры, _ и -.');
   if(mode==='register'&&!$('auth-policy-accept').checked)throw Error('Сначала ознакомьтесь с политикой конфиденциальности и подтвердите согласие.');
   if(mode!=='reset'&&(!mail||!email.validity.valid))throw Error('Укажите действительный адрес почты.');
   if(mode!=='recover' && (password.length<12||password.length>128))throw Error('Пароль должен содержать от 12 до 128 символов.');
   if((mode==='register'||mode==='reset')&&password!==confirm.value)throw Error('Пароли не совпадают.');
   if(mode==='register'){
     const x=await request('/auth/v1/signup?redirect_to='+encodeURIComponent(REDIRECT),{method:'POST',body:{email:mail,password,data:{username}}});
     if(x.access_token)store({...x,expires_at:Date.now()+x.expires_in*1000});
     feedback('Если регистрация принята, проверьте почту и подтвердите адрес по ссылке. Без подтверждения вход может быть недоступен.');
     pass.value='';confirm.value='';
     if(x.access_token){await completeLogin();}
   }else if(mode==='login'){
     const s=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:mail,password}});
     store({...s,expires_at:Date.now()+s.expires_in*1000});pass.value='';
     await completeLogin();
   }else if(mode==='recover'){
     await request('/auth/v1/recover?redirect_to='+encodeURIComponent(REDIRECT),{method:'POST',body:{email:mail}});
     feedback('Если аккаунт существует и почтовая отправка настроена, придёт письмо со ссылкой восстановления.');
   }else if(mode==='reset'){
     const token=await validSession();if(!token)throw Error('Ссылка восстановления истекла. Запросите новую.');
     await request('/auth/v1/user',{method:'PUT',body:{password},token});
     pass.value='';confirm.value='';await logout();feedback('Пароль обновлён. Теперь войдите в аккаунт.');
   }
 }catch(e){feedback(failure(e),true);}
 finally{btn.disabled=false;}
}
async function completeLogin(){
 await loadProfile();if(!authenticated)return;
 resumeNavigation();
}
function resumeNavigation(){
 const target=window.HOLEN_AUTH_GATE?.takeReturn();
 if(target){const url=new URL(target);if(url.pathname===location.pathname&&url.search===location.search){navigate(url.hash.slice(1)||'home');return;}location.replace(target);return;}
 navigate('profile');
}
function open(next='login'){if(authenticated && next!=='reset'){navigate('profile');return;}selectMode(next);navigate('auth');}
async function logout(){
 const token=await validSession();
 try{if(token)await request('/auth/v1/logout',{method:'POST',token});}catch(_){}
 store(null);renderSession(null);selectMode('login');navigate('auth');feedback('Вы вышли из аккаунта.');
}
form.addEventListener('submit',submit);
buttons.register.addEventListener('click',()=>selectMode('register'));
buttons.login.addEventListener('click',()=>selectMode('login'));
buttons.forgot.addEventListener('click',()=>selectMode('recover'));
$('auth-back-login').addEventListener('click',()=>selectMode('login'));
$('auth-logout').addEventListener('click',logout);
$('profile-account-logout').addEventListener('click',logout);
$('top-auth-open').addEventListener('click',()=>open('login'));
document.querySelectorAll('[data-open-auth]').forEach(b=>b.addEventListener('click',()=>open(b.dataset.openAuth)));
document.querySelectorAll('[data-password-toggle]').forEach(b=>b.addEventListener('click',()=>{const el=$(b.dataset.passwordToggle);el.type=el.type==='password'?'text':'password';b.setAttribute('aria-pressed',String(el.type==='text'));}));
const hash=location.hash;
selectMode('login');
if(hash.includes('access_token=') && hash.includes('refresh_token=')){
 const p=new URLSearchParams(hash.slice(1));
 const s={access_token:p.get('access_token'),refresh_token:p.get('refresh_token'),expires_in:Number(p.get('expires_in')||3600)};
 s.expires_at=Date.now()+s.expires_in*1000;store(s);
 history.replaceState(null,'',location.pathname+location.search+'#auth');
 if(p.get('type')==='recovery'){selectMode('reset');feedback('Ссылка подтверждена. Введите новый пароль.');}
 else{selectMode('login');feedback('Адрес подтверждён. Вы вошли в аккаунт.');}
 navigate('auth',{push:false});
}
loadProfile().then(()=>{
 if(authenticated&&mode!=='reset'&&currentView==='auth'){
  resumeNavigation();
 }
});
window.addEventListener('storage',e=>{if(e.key===STORE){try{session=JSON.parse(e.newValue||'null');}catch(_){session=null;}loadProfile();}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadProfile();});
async function listCharacters(pack){
 const token=await validSession();
 if(!token)return [];
 const p=pack==='journeys'?'journeys':'insects';
 const data=await request('/rest/v1/characters?select=id,name,pack_key,sheet_data,updated_at&pack_key=eq.'+p+'&order=created_at.desc',{token});
 return Array.isArray(data)?data:[];
}
async function updateCharacterName(characterId,newName){
 const token=await validSession();if(!token)throw Error('Сначала войдите в аккаунт.');
 const title=String(newName||'').trim();
 if(title.length<1||title.length>72)throw Error('Имя персонажа: от 1 до 72 символов.');
 if(!/^[0-9a-f-]{36}$/i.test(characterId))throw Error('Неверный идентификатор персонажа.');
 const user=await request('/auth/v1/user',{token});
 const rows=await request('/rest/v1/characters?id=eq.'+encodeURIComponent(characterId)+'&owner_id=eq.'+encodeURIComponent(user.id),
 {method:'PATCH',token,body:{name:title,updated_at:new Date().toISOString()},headers:{Prefer:'return=representation'}});
 if(!Array.isArray(rows)||rows.length!==1)throw Error('Персонаж не найден или нет прав на изменение.');
 return rows[0];
}
async function deleteCharacter(characterId){
 const token=await validSession();if(!token)throw Error('Сначала войдите в аккаунт.');
 if(!/^[0-9a-f-]{36}$/i.test(characterId))throw Error('Неверный идентификатор персонажа.');
 const user=await request('/auth/v1/user',{token});
 const rows=await request('/rest/v1/characters?id=eq.'+encodeURIComponent(characterId)+'&owner_id=eq.'+encodeURIComponent(user.id),
 {method:'DELETE',token,headers:{Prefer:'return=representation'}});
 if(!Array.isArray(rows)||rows.length!==1)throw Error('Персонаж не найден или нет прав на удаление.');
 return true;
}
async function createCharacter(nameValue,packKey,templateId,dndSheetData){
 const token=await validSession();if(!token)throw Error('Сначала войдите в аккаунт.');
 const title=String(nameValue||'').trim();
 if(title.length<1||title.length>72)throw Error('Имя персонажа: от 1 до 72 символов.');
 const pack=packKey==='journeys'?'journeys':'insects';
 const t=pack==='insects'?(window.ANT_DATA?.squads||[]).find(x=>x.id===templateId):null;
 if(pack==='insects'&&!t)throw Error('Выберите отряд из пака.');
 const sheet=pack==='insects'?{templateId:t.id,version:1}:window.HOLEN_DND.normalize(dndSheetData||window.HOLEN_DND.blank());
 const user=await request('/auth/v1/user',{token});
 const rows=await request('/rest/v1/characters',{method:'POST',token,headers:{Prefer:'return=representation'},body:{owner_id:user.id,pack_key:pack,name:title,sheet_data:sheet}});
 if(!Array.isArray(rows)||rows.length!==1)throw Error('Не удалось подтвердить создание. Обновите профиль перед повторной попыткой.');
 return rows[0];
}
async function getCharacter(characterId){
 const token=await validSession();if(!token)throw Error('Сначала войдите в аккаунт.');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(characterId))throw Error('Неверный идентификатор персонажа.');
 const user=await request('/auth/v1/user',{token});
 const rows=await request('/rest/v1/characters?select=id,name,pack_key,sheet_data,updated_at&id=eq.'+encodeURIComponent(characterId)+'&owner_id=eq.'+encodeURIComponent(user.id),{token});
 if(!Array.isArray(rows)||rows.length!==1)throw Error('Персонаж не найден или принадлежит другому аккаунту.');
 return rows[0];
}
async function updateDndCharacter(characterId,title,sheetData,expectedUpdatedAt){
 const token=await validSession();if(!token)throw Error('Сначала войдите в аккаунт.');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(characterId))throw Error('Неверный идентификатор персонажа.');
 const name=String(title||'').trim();if(!name||name.length>72)throw Error('Имя персонажа: от 1 до 72 символов.');
 if(!expectedUpdatedAt||!Number.isFinite(Date.parse(expectedUpdatedAt)))throw Error('Сначала обновите лист из профиля.');
 const user=await request('/auth/v1/user',{token}),sheet=window.HOLEN_DND.normalize(sheetData);
 const rows=await request('/rest/v1/characters?id=eq.'+encodeURIComponent(characterId)+'&owner_id=eq.'+encodeURIComponent(user.id)+'&pack_key=eq.journeys&updated_at=eq.'+encodeURIComponent(expectedUpdatedAt),{method:'PATCH',token,body:{name,sheet_data:sheet,updated_at:new Date().toISOString()},headers:{Prefer:'return=representation'}});
 if(!Array.isArray(rows)||rows.length!==1)throw Error('Лист изменён в другой вкладке или недоступен. Обновите его; ваш черновик сохранён в этом браузере.');
 return rows[0];
}
async function authorizedApi(endpoint,options={}){
 const token=await validSession();
 if(!token)throw Error('Сначала войдите в аккаунт.');
 return request(endpoint,{...options,token});
}
window.HOLEN_AUTH_UI={open,refresh:loadProfile,listCharacters,createCharacter,updateCharacterName,deleteCharacter,getCharacter,updateDndCharacter,
 isAuthenticated:()=>authenticated,currentUserId:()=>window.__holen_current_user_id||null,api:authorizedApi};
})();
