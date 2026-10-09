/* МИР ХОЛЭНА — email + password (Supabase Auth REST API).
 * В публичном JS только publishable ключ; service_role и пароли НЕ сохраняются.
 * Игровые комнаты пока остаются локальным прототипом, не онлайн-сессией.
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
let mode='register',session=null;
function feedback(t,err=false){info.textContent=t;info.hidden=false;info.className='auth-response'+(err?' is-error':'');}
function clear(){info.hidden=true;info.textContent='';}
function store(s){session=s;try{s?localStorage.setItem(STORE,JSON.stringify(s)):localStorage.removeItem(STORE);}catch(_){}}
try{session=JSON.parse(localStorage.getItem(STORE)||'null');}catch(_){session=null;}
async function request(endpoint,{method='GET',body,token}={}){
 const res=await fetch(PROJECT+endpoint,{method,headers:{'apikey':KEY,'Content-Type':'application/json',...(token?{'Authorization':'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
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
   }catch(_){store(null);return null;}
 }
 return session.access_token;
}
async function loadProfile(){
 const token=await validSession();
 if(!token){renderSession(null);return;}
 try{
   const user=await request('/auth/v1/user',{token});
   const list=await request('/rest/v1/profiles?select=username&id=eq.'+encodeURIComponent(user.id),{token});
   renderSession({user,username:list?.[0]?.username||'Путешественник'});
 }catch(_){store(null);renderSession(null);}
}
function renderSession(data){
 const note=$('auth-session'),profile=$('profile-auth-info'),top=$('top-auth-open');
 if(data){
   const display=data.username;
   note.hidden=false;
   $('auth-session-name').textContent=display;
   $('auth-session-email').textContent=data.user.email||'';
   profile.textContent='Вы вошли как '+display+'. Аккаунт хранится в Supabase; игровые комнаты пока работают локально.';
   top.querySelector('span').textContent=display;
   $('profile-name').value=display;
 }else{
   note.hidden=true;profile.textContent='Пока не вошли. Создайте аккаунт или авторизуйтесь по почте.';
   top.querySelector('span').textContent='Войти';
 }
 window.dispatchEvent(new Event('holen-auth-changed'));

}
function selectMode(next){
 mode=next;clear();
 const reg=next==='register',login=next==='login',recover=next==='recover',reset=next==='reset';
 $('auth-title').textContent=reg?'Создать аккаунт':login?'Войти в Холэн':recover?'Восстановить пароль':'Новый пароль';
 $('auth-subtitle').textContent=reg?'Игровой ник, почта и пароль. Сначала подтвердите адрес электронной почты.':login?'Войдите с помощью электронной почты и пароля.':recover?'Отправим ссылку для восстановления, если этот адрес зарегистрирован.':'Введите новый пароль для своего аккаунта.';
 $('auth-name-field').hidden=!reg;
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
   if(mode!=='reset'&&(!mail||!email.validity.valid))throw Error('Укажите действительный адрес почты.');
   if(mode!=='recover' && (password.length<12||password.length>128))throw Error('Пароль должен содержать от 12 до 128 символов.');
   if((mode==='register'||mode==='reset')&&password!==confirm.value)throw Error('Пароли не совпадают.');
   if(mode==='register'){
     const x=await request('/auth/v1/signup?redirect_to='+encodeURIComponent(REDIRECT),{method:'POST',body:{email:mail,password,data:{username}}});
     if(x.access_token)store({...x,expires_at:Date.now()+x.expires_in*1000});
     feedback('Если регистрация принята, проверьте почту и подтвердите адрес по ссылке. Без подтверждения вход может быть недоступен.');
     pass.value='';confirm.value='';
     if(x.access_token)await loadProfile();
   }else if(mode==='login'){
     const s=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:mail,password}});
     store({...s,expires_at:Date.now()+s.expires_in*1000});pass.value='';
     await loadProfile();feedback('Вы вошли в аккаунт. Перейдите в «Мой профиль».');
   }else if(mode==='recover'){
     await request('/auth/v1/recover?redirect_to='+encodeURIComponent(REDIRECT),{method:'POST',body:{email:mail}});
     feedback('Если аккаунт существует и почтовая отправка настроена, придёт письмо со ссылкой восстановления.');
   }else if(mode==='reset'){
     const token=await validSession();if(!token)throw Error('Ссылка восстановления истекла. Запросите новую.');
     await request('/auth/v1/user',{method:'PUT',body:{password},token});
     pass.value='';confirm.value='';selectMode('login');feedback('Пароль обновлён. Теперь войдите в аккаунт.');
   }
 }catch(e){feedback(failure(e),true);}
 finally{btn.disabled=false;}
}
function open(next='login'){selectMode(next);navigate('auth');}
async function logout(){
 const token=await validSession();
 try{if(token)await request('/auth/v1/logout',{method:'POST',token});}catch(_){}
 store(null);renderSession(null);selectMode('login');feedback('Вы вышли из аккаунта.');
}
form.addEventListener('submit',submit);
buttons.register.addEventListener('click',()=>selectMode('register'));
buttons.login.addEventListener('click',()=>selectMode('login'));
buttons.forgot.addEventListener('click',()=>selectMode('recover'));
$('auth-back-login').addEventListener('click',()=>selectMode('login'));
$('auth-logout').addEventListener('click',logout);
$('top-auth-open').addEventListener('click',()=>open(session?'login':'login'));
document.querySelectorAll('[data-open-auth]').forEach(b=>b.addEventListener('click',()=>open(b.dataset.openAuth)));
document.querySelectorAll('[data-password-toggle]').forEach(b=>b.addEventListener('click',()=>{const el=$(b.dataset.passwordToggle);el.type=el.type==='password'?'text':'password';b.setAttribute('aria-pressed',String(el.type==='text'));}));
const hash=location.hash;
if(hash.includes('access_token=') && hash.includes('refresh_token=')){
 const p=new URLSearchParams(hash.slice(1));
 const s={access_token:p.get('access_token'),refresh_token:p.get('refresh_token'),expires_in:Number(p.get('expires_in')||3600)};
 s.expires_at=Date.now()+s.expires_in*1000;store(s);
 history.replaceState(null,'',location.pathname+location.search+'#auth');
 if(p.get('type')==='recovery'){selectMode('reset');feedback('Ссылка подтверждена. Введите новый пароль.');}
 else{selectMode('login');feedback('Адрес подтверждён. Вы вошли в аккаунт.');}
 navigate('auth',{push:false});
}
loadProfile();
async function listCharacters(pack){
 const token=await validSession();
 if(!token)return [];
 const p=pack==='journeys'?'journeys':'insects';
 const data=await request('/rest/v1/characters?select=id,name,pack_key,sheet_data&pack_key=eq.'+p+'&order=created_at.desc',{token});
 return Array.isArray(data)?data:[];
}
async function createCharacter(nameValue,packKey,templateId){
 const token=await validSession();if(!token)throw Error('Сначала войдите в аккаунт.');
 const title=String(nameValue||'').trim();
 if(title.length<1||title.length>72)throw Error('Имя персонажа: от 1 до 72 символов.');
 const pack=packKey==='journeys'?'journeys':'insects';
 const t=pack==='insects'?(window.ANT_DATA?.squads||[]).find(x=>x.id===templateId):null;
 if(pack==='insects'&&!t)throw Error('Выберите отряд из пака.');
 await request('/rest/v1/characters',{method:'POST',token,body:{name:title,pack_key:pack,sheet_data:t?{templateId:t.id}:{} }});
 return true;
}
window.HOLEN_AUTH_UI={open,refresh:loadProfile,listCharacters,createCharacter};
})();