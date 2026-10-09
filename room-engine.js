/* МИР ХОЛЭНА v0.9 — локальная комната для проверки UX и механик.
 * НЕ онлайн-комната. Роли в этой демонстрации не защищены сервером.
 * В онлайн-версии все изменения проверяются на сервере.
 */
(function(){
'use strict';
const PREFIX='holen-room-demo-v09:', CURRENT_KEY='holen-room-current-v09', ACTOR_KEY='holen-room-actor-v09';
const roles={gm:'ГМ',p1:'Игрок 1',p2:'Игрок 2'};
const listeners=new Set();
const CH='holen-room-events-v09';
let channel=null;
try{if('BroadcastChannel' in window)channel=new BroadcastChannel(CH);}catch(_){}
const rand=n=>{const a=new Uint8Array(n);crypto.getRandomValues(a);return Array.from(a,x=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x%32]).join('');};
const roomKey=code=>PREFIX+code, clean=(v,n=72)=>String(v||'').trim().slice(0,n);
function load(code){try{const d=JSON.parse(localStorage.getItem(roomKey(code))||'null');return d?.version===2?d:null;}catch(_){return null;}}
function currentCode(){try{return sessionStorage.getItem(CURRENT_KEY)||'';}catch(_){return '';}}
function setCode(code){try{code?sessionStorage.setItem(CURRENT_KEY,code):sessionStorage.removeItem(CURRENT_KEY);}catch(_){}notify();}
function actor(){try{return sessionStorage.getItem(ACTOR_KEY)||'gm';}catch(_){return 'gm';}}
function setActor(role){if(!roles[role])return;try{sessionStorage.setItem(ACTOR_KEY,role);}catch(_){}notify();}
function current(){return load(currentCode());}
function notify(){const state=current();listeners.forEach(f=>{try{f(state);}catch(e){console.error(e);}});}
if(channel)channel.onmessage=e=>{if(e.data?.code===currentCode())notify();};
addEventListener('storage',e=>{if(e.key===roomKey(currentCode()))notify();});
function write(s){s.updatedAt=Date.now();localStorage.setItem(roomKey(s.code),JSON.stringify(s));channel?.postMessage({code:s.code});notify();return s;}
function log(s,message){s.history.unshift({id:rand(6),message,time:Date.now()});s.history=s.history.slice(0,60);}
function startRoom(text){
 const name=clean(text);if(!name)throw Error('Введите название комнаты.');
 let code;do{code='ANT-'+rand(5);}while(load(code));
 const s={version:2,code,name,pack:'insects',round:1,turn:0,units:[],requests:[],history:[],createdAt:Date.now()};
 log(s,'Создана пустая комната «'+name+'».');
 write(s);setCode(code);setActor('gm');return s;
}
function joinRoom(raw){const code=clean(raw,15).toUpperCase();if(!/^ANT-[A-Z2-9]{5}$/.test(code))throw Error('Код должен иметь вид ANT-ABCDE.');
 if(!load(code))throw Error('Комната не найдена. Пока комнаты доступны только во вкладках одного браузера.');setCode(code);return current();}
function transact(fn){const s=current();if(!s)throw Error('Сначала открой комнату.');fn(s);return write(s);}
function assertGm(){if(actor()!=='gm')throw Error('Действие доступно только демонстрационной роли ГМа.');}
function assertPlayer(role){if(actor()!==role)throw Error('Переключись на соответствующего игрока.');}
function unit(s,id){const u=s.units.find(x=>x.id===id);if(!u)throw Error('Отряд не выбран или не найден.');return u;}
function squadTemplates(){return window.ANT_DATA?.squads||[];}
function chooseCharacter(templateId,customName=''){
 const role=actor();if(!['p1','p2'].includes(role))throw Error('Сначала выбери место игрока.');
 const t=squadTemplates().find(x=>x.id===templateId);if(!t)throw Error('Эта специализация недоступна в текущем паке.');
 return transact(s=>{
  const safeName=clean(customName,72);
  const value={id:role,name:safeName?(safeName+' · '+t.name):t.name,owner:role,templateId:t.id,max:t.hp,hp:t.hp,cap:t.hp,per:t.hp/t.number,ac:t.ac};
  if(t.id==='medic')value.charges=4;
  const ix=s.units.findIndex(x=>x.id===role);
  if(ix<0)s.units.push(value);else s.units[ix]=value;
  s.requests=s.requests.filter(x=>x.actor!==role||x.status!=='pending');
  log(s,roles[role]+' выбрал отряд «'+t.name+'».');
 });
}
function adjustHp(s,id,delta,override=false){
 const u=unit(s,id);
 if(delta<0){u.hp=Math.max(0,u.hp+delta);u.cap=Math.min(u.cap,Math.ceil(u.hp/u.per)*u.per);}
 if(delta>0){
  if(override){u.cap=u.max;u.hp=Math.min(u.max,u.hp+delta);}
  else if(u.hp>0)u.hp=Math.min(u.cap,u.hp+delta);
 }
 return u;
}
function activeEnemies(s){return s.units.filter(u=>u.owner==='gm'&&u.hp>0);}
function submitRequest(type,amount=3){
 const role=actor();if(!['p1','p2'].includes(role))throw Error('Сначала выбери место игрока.');
 if(!['attack','heal'].includes(type))throw Error('Неизвестное действие.');
 if(type==='attack'&&(!Number.isInteger(amount)||amount<1||amount>30))throw Error('Урон: от 1 до 30.');
 return transact(s=>{
  const sender=unit(s,role);
  if(sender.hp<=0)throw Error('Отряд уничтожен.');
  if(s.requests.some(r=>r.actor===role&&r.status==='pending'))throw Error('Есть заявка, ожидающая ГМа.');
  if(type==='attack'&&!activeEnemies(s).length)throw Error('ГМ ещё не добавил противника.');
  if(type==='heal'){
    if(sender.templateId!=='medic'||!sender.charges)throw Error('Лечить могут полевые санитары с оставшимися зарядами.');
    const target=s.units.find(u=>u.owner!=='gm'&&u.id!==role&&u.hp>0&&u.hp<u.cap);
    if(!target)throw Error('Пока нет союзника, которому требуется лечение.');
  }
  s.requests.push({id:rand(8),actor:role,type,damage:type==='attack'?amount:3,status:'pending',createdAt:Date.now()});
  log(s,roles[role]+': заявка на '+(type==='attack'?'атаку':'лечение')+' ожидает ГМа.');
 });
}
function decideRequest(id,accepted){
 assertGm();return transact(s=>{
  const req=s.requests.find(r=>r.id===id);if(!req||req.status!=='pending')throw Error('Заявка уже обработана.');
  req.status=accepted?'accepted':'rejected';if(!accepted){log(s,'ГМ отклонил заявку.');return;}
  if(req.type==='attack'){
    const target=activeEnemies(s)[0];if(!target){req.status='rejected';log(s,'Атака отклонена: противников нет.');return;}
    adjustHp(s,target.id,-req.damage);log(s,'ГМ подтвердил атаку: −'+req.damage+' ОЗ противнику «'+target.name+'».');
  }else{
    const sender=s.units.find(u=>u.id===req.actor);
    const target=s.units.find(u=>u.owner!=='gm'&&u.id!==req.actor&&u.hp>0&&u.hp<u.cap);
    if(!sender||sender.templateId!=='medic'||sender.charges<=0||!target){req.status='rejected';log(s,'Лечение отклонено: условия изменились.');return;}
    sender.charges--;const before=target.hp;adjustHp(s,target.id,3);log(s,'ГМ подтвердил лечение: +'+(target.hp-before)+' ОЗ отряду «'+target.name+'».');
  }
 });
}
function gmDamage(id,amount){assertGm();if(!Number.isInteger(amount)||amount<1||amount>9999)throw Error('Урон: целое число от 1 до 9999.');return transact(s=>{const u=adjustHp(s,id,-amount);log(s,'ГМ: −'+amount+' ОЗ отряду «'+u.name+'» ('+u.hp+'/'+u.cap+').');});}
function gmHeal(id,amount){assertGm();if(!Number.isInteger(amount)||amount<1||amount>9999)throw Error('Лечение: целое число от 1 до 9999.');return transact(s=>{const u=adjustHp(s,id,amount,true);log(s,'ГМ восстановил '+amount+' ОЗ отряду «'+u.name+'» (ручное решение; итог '+u.hp+'/'+u.max+').');});}
function gmRest(kind){
 assertGm();if(!['short','long'].includes(kind))throw Error('Неизвестный тип отдыха.');
 return transact(s=>{
  for(const u of s.units.filter(x=>x.owner!=='gm')){
   if(kind==='short'){if(u.hp>0)u.hp=u.cap;}
   else{u.cap=u.max;u.hp=u.max;if(u.templateId==='medic')u.charges=4;}
  }
  log(s,kind==='short'?'ГМ оформил короткий отдых: живые отряды восстановлены до текущего максимума.':'ГМ разрешил долгий отдых: отряды, павшие бойцы и лечебные заряды восстановлены.');
 });
}
function gmAddEnemy(){
 assertGm();return transact(s=>{
  const idx=s.units.filter(x=>x.owner==='gm').length+1;
  const name='Тренировочный противник '+idx;
  s.units.push({id:'enemy-'+rand(4),name,owner:'gm',max:16,hp:16,cap:16,per:8,ac:13,training:true});
  log(s,'ГМ добавил «'+name+'» (временный манекен, не бестиарий).');
 });
}
function nextTurn(){assertGm();return transact(s=>{const order=['p1','p2','gm'];s.turn=(s.turn+1)%order.length;if(s.turn===0)s.round++;log(s,'Следующий ход: '+roles[order[s.turn]]+', раунд '+s.round+'.');});}
function clearRoom(){setCode('');}
window.HolenRoom={startRoom,joinRoom,current,currentCode,actor,setActor,roles,turns:['p1','p2','gm'],load,clearRoom,chooseCharacter,squadTemplates,submitRequest,decideRequest,gmDamage,gmHeal,gmRest,gmAddEnemy,nextTurn,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},notify};
})();