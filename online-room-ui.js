/* Холэн v0.10 — защищённые онлайн-комнаты через Supabase RPC.
   Состояние хранится сервером; изменения прав и ОЗ проверяет PostgreSQL.
   Альфа: синхронизация опросом каждые 6 секунд, не WebSocket.
*/
(()=>{
'use strict';
const auth=window.HOLEN_AUTH_UI;
const root=document.getElementById('online-room-root'),gmRoot=document.getElementById('online-gm-root');
if(!root||!gmRoot||!auth)return;
const key='holen_online_active_room_v10';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
let activeId=null, snapshot=null, rooms=[], characters=[], charactersLoadedFor=null, status='', busy=false, loading=false,lastSnapshot=0,err='';
try{activeId=sessionStorage.getItem(key)||null;}catch(_){}
function notice(t,isError=false){status=t;err=isError?'is-error':'';const n=$('online-status');if(n){n.textContent=t;n.className='online-status '+err;}}
const api=(path,opts)=>auth.api(path,opts);
async function rpc(name,args){return api('/rest/v1/rpc/'+name,{method:'POST',body:args});}
function currentMember(){return snapshot?.members?.find(m=>m.user_id===auth.currentUserId())||null;}
function setRoom(id){
 activeId=id; snapshot=null;characters=[];charactersLoadedFor=null;
 try{id?sessionStorage.setItem(key,id):sessionStorage.removeItem(key);}catch(_){}
}
function packLabel(p){return p==='insects'?'Муравьиная революция':'Путешествия Холэна';}
function roomChoices(){
 return rooms.length?'<div class="online-myrooms"><h3>Мои комнаты</h3>'+rooms.map(r=>
 '<button type="button" class="online-room-pick" data-online-action="open" data-id="'+esc(r.id)+'"><strong>'+esc(r.name)+'</strong><small>'+esc(packLabel(r.pack_key))+' · '+esc(r.invite_code)+'</small></button>'
 ).join('')+'</div>':'';
}
function lobby(){
 if(!auth.isAuthenticated()){
  return '<div class="panel online-intro"><h2>Онлайн-комнаты</h2><p>Для участия войди в учётную запись. ГМ и игроки подключаются с разных устройств, а состав комнаты хранится в Supabase.</p><button class="btn primary" type="button" data-online-action="login">Войти или зарегистрироваться</button></div>';
 }
 return '<div class="online-grid">'+
 '<form id="online-create" class="panel online-card"><span class="overline">ВЕДУЩИЙ</span><h2>Создать онлайн-комнату</h2>'+
 '<label class="field-label" for="online-title">Название</label><input id="online-title" maxlength="72" required placeholder="Например, Красный тоннель">'+
 '<label class="field-label" for="online-pack">Игровой пак</label><select id="online-pack" class="room-select"><option value="insects">Муравьиная революция</option><option value="journeys">Путешествия Холэна (листы в разработке)</option></select>'+
 '<button type="submit" class="btn primary wide">Создать</button></form>'+
 '<form id="online-join" class="panel online-card"><span class="overline">ИГРОК</span><h2>Присоединиться</h2><p>Попроси у ГМа код приглашения. У каждого участника должен быть свой аккаунт.</p>'+
 '<label class="field-label" for="online-join-code">Код комнаты</label><input id="online-join-code" maxlength="24" required autocapitalize="characters" placeholder="HOL-XXXXXXXXXXXX">'+
 '<button class="btn primary wide" type="submit">Войти в комнату</button></form></div>'+roomChoices();
}
function unitCard(u){
 const hidden=u.owner_id===null && (u.hp===null || u.hp===undefined);
 const ratio=!hidden && u.cap?Math.round(100*u.hp/u.cap):0;
 return '<article class="online-unit"><div class="online-unit-head"><strong>'+esc(u.name)+'</strong><span>'+
 (hidden?'ОЗ скрыты ГМом':esc(u.hp)+' / '+esc(u.cap)+' ОЗ')+'</span></div>'+
 (hidden?'<p class="online-hp-hidden">Здоровье противника неизвестно</p>':
 '<div class="room-hp-line"><div class="room-hp-fill" style="width:'+Math.min(100,Math.max(0,ratio))+'%"></div></div>')+
 '<small>КД '+esc(u.armor_class)+' · Скорость '+esc(u.speed)+(u.charges?' · Заряды '+esc(u.charges):'')+
 (u.is_training?' · Тренировочный':'')+'</small></article>';
}
function roomView(){
 const s=snapshot;if(!s?.room)return '<p class="room-empty">Загружаем комнату…</p>';
 const room=s.room,me=currentMember(),gm=me?.role==='gm';
 const units=s.units||[],friends=units.filter(u=>u.owner_id),enemies=units.filter(u=>!u.owner_id && u.hp!==0);
 const self=units.find(u=>u.owner_id===auth.currentUserId());
 const roster=(s.members||[]).map(m=>{
  const u=units.find(u=>u.owner_id===m.user_id);
  return '<div class="room-player-row"><div class="room-player-marker">'+(m.role==='gm'?'♛':'◇')+'</div>'+
  '<div class="room-player-info"><strong>'+esc(m.display_name)+(m.role==='gm'?' · ГМ':'')+'</strong><small>'+esc(u?.name||'Персонаж не выбран')+'</small></div></div>';
 }).join('');
 const select=(!gm&&!self&&room.status==='active')?
  '<div class="panel online-picker"><h3>Выбери своего персонажа</h3><p>Показываются персонажи из твоего профиля, подходящие этому паку.</p>'+
  (room.pack_key==='insects'?
   (characters.length?'<div class="online-character-options">'+characters.map(c=>{
    const t=(window.ANT_DATA?.squads||[]).find(x=>x.id===c.sheet_data?.templateId);
    return t?'<button type="button" class="btn subtle" data-online-action="choose" data-id="'+esc(c.id)+'">'+esc(c.name)+' · '+esc(t.name)+'</button>':'';
   }).join('')+'</div>':'<p>Сначала создай персонажа в разделе «Мой профиль».</p>'):
   '<p>Онлайн-листы для «Путешествий Холэна» пока разрабатываются.</p>')+
  '<button type="button" class="btn subtle" data-online-action="refresh-chars">Обновить список</button> '+
  '<button type="button" class="btn subtle" data-online-action="profile">Открыть профиль →</button></div>':'';
 const pending=(s.requests||[]).some(r=>r.actor_id===auth.currentUserId());
 const attackTargets=enemies.filter(u=>u.hp>0);
 const healTargets=friends.filter(u=>u.owner_id!==auth.currentUserId()&&u.hp>0&&u.hp<u.cap);
 const actions=!gm&&self&&self.hp>0&&room.status==='active'?
  '<section class="online-gm-card online-player-actions"><h3>Действия отряда</h3>'+
  (pending?'<p>Твоя заявка ожидает решения ГМа.</p>':
   '<p>Проверку броска и расчёт урона пока проводит ГМ. Здесь отправляется заявка на применение результата.</p>'+
   (attackTargets.length?'<label class="field-label" for="online-attack-target">Цель атаки</label><select id="online-attack-target" class="room-select">'+
     attackTargets.map(u=>'<option value="'+esc(u.id)+'">'+esc(u.name)+' · '+u.hp+' ОЗ</option>').join('')+'</select>'+
     '<label class="field-label" for="online-attack-amount">Подтверждённый урон (1–30)</label><input type="number" id="online-attack-amount" min="1" max="30" value="3">'+
     '<button type="button" class="btn primary" data-online-action="send-attack">Запросить атаку</button>':
     '<p>Пока нет живых противников для атаки.</p>')+
   (self.template_key==='medic'&&self.charges>0&&healTargets.length?
     '<label class="field-label" for="online-heal-target">Союзник для лечения</label><select id="online-heal-target" class="room-select">'+
     healTargets.map(u=>'<option value="'+esc(u.id)+'">'+esc(u.name)+' · '+u.hp+'/'+u.cap+' ОЗ</option>').join('')+'</select>'+
     '<button type="button" class="btn subtle" data-online-action="send-heal">Запросить лечение (+3 ОЗ, −1 заряд)</button>':'')
  )+'</section>':'';
 return '<section class="panel online-session"><div class="room-dash-head"><div><span class="overline">ОНЛАЙН-КОМНАТА · АЛЬФА</span>'+
 '<h2>'+esc(room.name)+'</h2><p>'+esc(packLabel(room.pack_key))+'</p>'+
 '<p>Код приглашения: <strong>'+esc(room.invite_code)+'</strong></p></div>'+
 '<div class="room-head-actions"><button class="btn subtle" type="button" data-online-action="copy">Копировать код</button>'+
 '<button class="btn subtle" type="button" data-online-action="back">К списку комнат</button></div></div>'+
 '<p class="online-live-note">Участников: '+s.members.length+' / 8 · Обновление каждые 6 секунд · '+(room.status==='active'?'Комната активна':'Комната закрыта')+(room.hide_enemy_hp?' · ОЗ противников скрыты для игроков':'')+'</p>'+
 '<h3>Участники</h3><div class="room-roster">'+roster+'</div>'+
 (gm?'<button type="button" class="btn primary" data-online-action="gm">Открыть рубку ГМа →</button>':'')+
 select+
 '<h3>Отряды игроков</h3><div class="room-unit-list">'+(friends.length?friends.map(unitCard).join(''):'<div class="room-empty">Участники ещё не выбрали персонажей.</div>')+'</div>'+
 '<h3>Противники</h3><div class="room-unit-list">'+(enemies.length?enemies.map(unitCard).join(''):'<div class="room-empty">Противников пока нет. Их добавляет только ГМ.</div>')+'</div>'+
 actions+
 '<h3>Журнал событий</h3><ol class="online-events">'+(s.events||[]).map(e=>'<li>'+esc(e.message)+'</li>').join('')+'</ol>'+
 (!gm&&room.status==='active'?'<button class="btn subtle" data-online-action="leave" type="button">Покинуть комнату</button>':'')+'</section>';
}
function gmView(){
 const s=snapshot,member=currentMember();
 if(!auth.isAuthenticated())return '<div class="panel online-intro">Для управления онлайн-комнатой войди в аккаунт.</div>';
 if(!s||member?.role!=='gm')return '<div class="panel online-intro"><h2>Онлайн-рубка ГМа</h2><p>Создай онлайн-комнату или открой принадлежащую тебе сессию.</p><button class="btn primary" data-online-action="rooms" type="button">В комнаты →</button></div>';
 const items=(s.units||[]).map(u=>'<option value="'+esc(u.id)+'">'+esc(u.name)+' ('+u.hp+'/'+u.cap+')</option>').join('');
 const roster=(s.members||[]);
 const requests=(s.requests||[]).map(q=>{
   const player=roster.find(m=>m.user_id===q.actor_id);
   const target=(s.units||[]).find(u=>u.id===q.target_unit_id);
   return '<article class="online-request"><div><strong>'+esc(player?.display_name||'Игрок')+' · '+(q.kind==='attack'?'Атака':'Лечение')+'</strong>'+
   '<small>Цель: '+esc(target?.name||'Неизвестно')+' · '+(q.kind==='attack'?'Урон '+q.amount:'Лечение 3 ОЗ')+'</small></div>'+
   '<div class="online-inline"><button class="btn primary" type="button" data-online-action="approve" data-id="'+esc(q.id)+'">Подтвердить</button>'+
   '<button class="btn subtle" type="button" data-online-action="decline" data-id="'+esc(q.id)+'">Отклонить</button></div></article>';
 }).join('')||'<p class="room-empty">Заявок нет.</p>';
 return '<section class="panel online-session"><span class="overline">ОНЛАЙН · ПРАВА ГМа ПРОВЕРЯЕТ СЕРВЕР</span><h2>'+esc(s.room.name)+'</h2>'+
 '<p>Комната '+esc(s.room.invite_code)+' · '+esc(packLabel(s.room.pack_key))+'</p>'+
 '<div class="online-gm-visibility"><strong>Здоровье врагов для игроков:</strong> '+(s.room.hide_enemy_hp?'скрыто':'видно')+
 '<button type="button" class="btn subtle" data-online-action="toggle-enemy-hp">'+
 (s.room.hide_enemy_hp?'Показать здоровье противников':'Скрыть здоровье противников')+'</button></div>'+
 '<h3>Заявки игроков</h3><div class="online-requests">'+requests+'</div>'+
 '<div class="online-grid"><section class="online-gm-card"><h3>Управление здоровьем</h3><label class="field-label" for="online-gm-target">Цель</label>'+
 '<select id="online-gm-target" class="room-select">'+items+'</select>'+
 '<label class="field-label" for="online-gm-amount">Количество ОЗ</label><input type="number" id="online-gm-amount" min="1" max="9999" value="3">'+
 '<div class="online-inline"><button class="btn subtle" type="button" data-online-action="damage">Нанести урон</button><button class="btn primary" type="button" data-online-action="heal">Восстановить</button></div></section>'+
 '<section class="online-gm-card"><h3>Отдых</h3><p>Короткий отдых возвращает здоровье выживших до текущего предела. Долгий — восстанавливает их до полного состава.</p>'+
 '<div class="online-inline"><button class="btn subtle" data-online-action="rest-short" type="button">Короткий</button><button class="btn primary" data-online-action="rest-long" type="button">Долгий</button></div></section>'+
 '<section class="online-gm-card"><h3>Противники</h3><p>Бестиарий ещё не подключён. Для тестирования можно добавить манекен.</p>'+
 '<button class="btn subtle" type="button" data-online-action="dummy">Добавить тренировочного врага</button></section>'+
 '<section class="online-gm-card"><h3>Управление комнатой</h3><p>Закрытая комната останется доступна для просмотра, но новые игроки присоединиться не смогут.</p>'+
 '<button class="btn subtle" type="button" data-online-action="close">Завершить комнату</button></section></div>'+
 ((s.units||[]).some(u=>u.owner_id===null&&u.hp===0)?
 '<div class="online-defeated"><h3>Побеждённые противники · только для ГМа</h3><p>Их карточки исчезли из комнаты игроков. Записи сохранены, и ты можешь вернуть их через ручное восстановление ОЗ.</p>'+
 (s.units||[]).filter(u=>u.owner_id===null&&u.hp===0).map(u=>'<div class="online-defeated-entry">'+esc(u.name)+'</div>').join('')+'</div>':'')+
 '<button class="btn subtle" type="button" data-online-action="rooms">← В комнату</button></section>';
}
function paint(){
 const focus=document.activeElement;
 if((root.contains(focus)||gmRoot.contains(focus))&&['INPUT','SELECT','TEXTAREA'].includes(focus?.tagName))return;
 root.innerHTML='<div class="online-status '+err+'" id="online-status" role="status" aria-live="polite">'+esc(status)+'</div>'+
 (activeId?roomView():lobby());
 gmRoot.innerHTML=gmView();
}
async function ownRooms(){
 if(!auth.isAuthenticated()){rooms=[];return;}
 const v=await api('/rest/v1/rooms?select=id,name,pack_key,invite_code,status&status=eq.active&order=created_at.desc');
 rooms=Array.isArray(v)?v:[];
}
async function refresh(force=false){
 if(loading||!auth.isAuthenticated()){if(!auth.isAuthenticated()){snapshot=null;rooms=[];paint();}return;}
 if(!force&&document.hidden)return;
 loading=true;
 try{
  if(activeId){
   snapshot=await rpc('holen_room_snapshot',{p_room:activeId});
   if(!snapshot?.room)throw Error('Комната не найдена.');
   if(snapshot.room.status==='active'&&currentMember()?.role==='player'&&!snapshot.units?.some(u=>u.owner_id===auth.currentUserId())&&charactersLoadedFor!==activeId){
    characters=await auth.listCharacters(snapshot.room.pack_key);
    charactersLoadedFor=activeId;
   }
  }else await ownRooms();
  if(!status||err)notice('',false);
  paint();
 }catch(e){
  notice('Не удалось синхронизировать комнату: '+(e?.message||'ошибка сети'),true);
  paint();
 }finally{loading=false;lastSnapshot=Date.now();}
}
async function action(fn){
 if(busy)return;busy=true;notice('Выполняем действие…');
 try{await fn();notice('Сохранено на сервере.');await refresh(true);}
 catch(e){notice(e?.message||'Не удалось выполнить действие.',true);}
 finally{busy=false;}
}
document.addEventListener('submit',event=>{
 const form=event.target;
 if(form.id==='online-create'){
  event.preventDefault();const title=$('online-title').value,pack=$('online-pack').value;
  action(async()=>{const a=await rpc('holen_room_create',{p_name:title,p_pack:pack});setRoom(a.id);});
 }else if(form.id==='online-join'){
  event.preventDefault();const code=$('online-join-code').value;
  action(async()=>{const id=await rpc('holen_room_join',{p_code:code});setRoom(id);});
 }
});
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-online-action]');if(!b)return;
 const a=b.dataset.onlineAction;
 if(a==='login'){auth.open('login');return;}
 if(a==='profile'){navigate('profile');return;}
 if(a==='refresh-chars'){charactersLoadedFor=null;refresh(true);return;}
 if(a==='rooms'){navigate('rooms');return;}
 if(a==='gm'){navigate('gm');return;}
 if(a==='back'){setRoom(null);refresh(true);return;}
 if(a==='open'){setRoom(b.dataset.id);refresh(true);return;}
 if(a==='copy'){
  const code=snapshot?.room?.invite_code;
  if(code&&navigator.clipboard?.writeText)navigator.clipboard.writeText(code).then(()=>notice('Код скопирован.')).catch(()=>notice('Код: '+code));
  else notice('Код: '+code);
  return;
 }
 if(a==='choose')return action(async()=>{await rpc('holen_room_pick',{p_room:activeId,p_character:b.dataset.id});});
 if(a==='send-attack'){
   const target=$('online-attack-target')?.value,damage=Number($('online-attack-amount')?.value);
   if(!target||!Number.isInteger(damage)||damage<1||damage>30){notice('Выбери цель и корректный урон от 1 до 30.',true);return;}
   return action(async()=>rpc('holen_room_request',{p_room:activeId,p_kind:'attack',p_target:target,p_amount:damage}));
 }
 if(a==='send-heal'){
   const target=$('online-heal-target')?.value;
   if(!target){notice('Выбери союзника для лечения.',true);return;}
   return action(async()=>rpc('holen_room_request',{p_room:activeId,p_kind:'heal',p_target:target,p_amount:3}));
 }
 if(a==='approve'||a==='decline')
   return action(async()=>rpc('holen_gm_decide',{p_room:activeId,p_request:b.dataset.id,p_approve:a==='approve'}));
 if(a==='leave'){
  if(!confirm('Покинуть онлайн-комнату?'))return;
  return action(async()=>{await rpc('holen_room_leave',{p_room:activeId});setRoom(null);});
 }
 if(a==='damage'||a==='heal'){
  const id=$('online-gm-target')?.value,amount=Number($('online-gm-amount')?.value);
  if(!id||!Number.isInteger(amount)||amount<1||amount>9999){notice('Выбери цель и целое количество ОЗ от 1 до 9999.',true);return;}
  return action(async()=>rpc('holen_gm_adjust',{p_room:activeId,p_unit:id,p_delta:a==='damage'?-amount:amount}));
 }
 if(a==='rest-short'||a==='rest-long'){
  if(a==='rest-long'&&!confirm('Разрешить долгий отдых выжившим отрядам?'))return;
  return action(async()=>rpc('holen_gm_rest',{p_room:activeId,p_kind:a==='rest-short'?'short':'long'}));
 }
 if(a==='toggle-enemy-hp')return action(async()=>rpc('holen_gm_enemy_hp_visibility',
    {p_room:activeId,p_hidden:!snapshot?.room?.hide_enemy_hp}));
 if(a==='dummy')return action(async()=>rpc('holen_gm_dummy',{p_room:activeId}));
 if(a==='close'){
  if(!confirm('Завершить комнату? Новые игроки больше не смогут войти.'))return;
  return action(async()=>rpc('holen_gm_close',{p_room:activeId}));
 }
});
window.addEventListener('holen-auth-changed',()=>{if(!auth.isAuthenticated()){snapshot=null;rooms=[];setRoom(null);}refresh(true);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastSnapshot>4000)refresh(true);});
setInterval(()=>{if(auth.isAuthenticated()&&activeId&&(location.hash==='#rooms'||location.hash==='#gm'))refresh();},6000);
paint();if(auth.isAuthenticated())refresh(true);
})();
