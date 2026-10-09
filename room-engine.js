/* ================================================================
   МИР ХОЛЭНА v0.7 — ЛОКАЛЬНЫЙ ДВИЖОК КОМНАТЫ
   ================================================================
   01. Данные и ключи    — localStorage (один браузер/один origin)
   02. Ходы и здоровье   — общие игровые правила
   03. Заявки игроков    — отправка, подтверждение ГМом
   04. Синхронизация     — события storage и BroadcastChannel

   ВАЖНО: Это НЕ авторизация и НЕ защита от недобросовестных игроков.
   Настоящая публичная версия потребует базы данных, аутентификации,
   серверных проверок прав и атомарных игровых операций.
   ================================================================ */
(function(){
  'use strict';
  const PREFIX='holen-room-demo-v07:';
  const CURRENT_KEY='holen-room-current-v07';
  const ACTOR_KEY='holen-room-actor-v07';
  const CH='holen-room-events-v07';
  const roles={gm:'ГМ',p1:'Игрок 1 · Пехота',p2:'Игрок 2 · Санитары'};
  const turns=['p1','enemy','p2'];
  const listeners=new Set();
  let channel=null;
  try { if ('BroadcastChannel' in window) channel=new BroadcastChannel(CH); }catch(e){}
  const rand=n=>{const a=new Uint8Array(n);crypto.getRandomValues(a);return Array.from(a,x=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x%32]).join('');};
  const roomKey=code=>PREFIX+code;
  const clone=o=>JSON.parse(JSON.stringify(o));
  const capFor=(hp,per)=>Math.ceil(hp/per)*per;
  const cleanText=(v,max=72)=>String(v||'').trim().slice(0,max);
  function load(code){
    try{const val=JSON.parse(localStorage.getItem(roomKey(code))||'null');return val&&val.version===1?val:null;}
    catch(e){return null;}
  }
  function currentCode(){try{return sessionStorage.getItem(CURRENT_KEY)||''}catch(e){return ''}}
  function setCode(code){try{code?sessionStorage.setItem(CURRENT_KEY,code):sessionStorage.removeItem(CURRENT_KEY);}catch(e){}notify();}
  function actor(){try{return sessionStorage.getItem(ACTOR_KEY)||'gm'}catch(e){return 'gm'}}
  function setActor(next){if(!(next in roles))return;try{sessionStorage.setItem(ACTOR_KEY,next)}catch(e){}notify();}
  function current(){return load(currentCode());}
  function notify(){const s=current();listeners.forEach(fn=>{try{fn(s)}catch(e){console.error('room subscriber',e)}});}
  if(channel) channel.onmessage=ev=>{if(ev.data?.code===currentCode())notify()};
  window.addEventListener('storage',ev=>{if(ev.key===roomKey(currentCode()))notify()});
  function write(state){
    state.updatedAt=Date.now();
    localStorage.setItem(roomKey(state.code),JSON.stringify(state));
    if(channel)channel.postMessage({code:state.code});
    notify();
    return state;
  }
  function addEvent(s,message){s.history.unshift({id:rand(6),message,time:Date.now()});s.history=s.history.slice(0,40);}
  function startRoom(rawName){
    const name=cleanText(rawName);
    if(!name)throw Error('Введи название комнаты.');
    let code; do{code='ANT-'+rand(5);}while(load(code));
    const state={version:1,code,name,createdAt:Date.now(),updatedAt:Date.now(),round:1,turn:0,
      units:[
        {id:'p1',name:'Линейная пехота',owner:'p1',max:12,hp:12,cap:12,per:3,ac:13},
        {id:'p2',name:'Полевые санитары',owner:'p2',max:9,hp:9,cap:9,per:3,ac:12,charges:4},
        {id:'enemy',name:'Красный отряд (пример)',owner:'gm',max:16,hp:16,cap:16,per:8,ac:13,hidden:false}
      ],requests:[],history:[]};
    addEvent(state,'ГМ создал комнату «'+name+'».');
    write(state);setCode(code);setActor('gm');return state;
  }
  function joinRoom(text){const code=cleanText(text,15).toUpperCase();if(!/^ANT-[A-Z2-9]{5}$/.test(code))throw Error('Проверь код: пример ANT-ABC23.');if(!load(code))throw Error('Комната не найдена в этом браузере. На другом устройстве локальный прототип пока недоступен.');setCode(code);return current();}
  function transact(handler){const s=current();if(!s)throw Error('Сначала открой комнату.');handler(s);write(s);return s;}
  function assertGm(){if(actor()!=='gm')throw Error('Это действие доступно только в демонстрационном режиме ГМа.');}
  function assertPlayer(role){if(actor()!==role)throw Error('Действие доступно только владельцу отряда.');}
  function unit(s,id){const u=s.units.find(x=>x.id===id);if(!u)throw Error('Отряд не найден.');return u;}
  function adjustHp(s,id,delta){const u=unit(s,id);if(delta<0){u.hp=Math.max(0,u.hp+delta);u.cap=Math.min(u.cap,capFor(u.hp,u.per));}else if(delta>0 && u.hp>0){u.hp=Math.min(u.cap,u.hp+delta);}return u;}
  function submitRequest(type,damage=2){
    if(!['attack','heal'].includes(type))throw Error('Неизвестное действие.');
    const expected=type==='attack'?'p1':'p2';assertPlayer(expected);
    return transact(s=>{
      const sender=unit(s,expected);
      if(sender.hp===0)throw Error('Отряд уничтожен.');
      if(s.requests.some(r=>r.status==='pending'&&r.actor===expected))throw Error('У тебя уже есть заявка на рассмотрении.');
      if(type==='heal'){
        const target=unit(s,'p1');
        if(sender.charges<=0)throw Error('Лечебные заряды закончились.');
        if(target.hp===0)throw Error('Погибший отряд нельзя вылечить.');
        if(target.hp>=target.cap)throw Error('Лечить пока нечего.');
      }
      if(type==='attack' && (!Number.isInteger(damage)||damage<1||damage>20))throw Error('Укажи ожидаемый урон от 1 до 20.');
      s.requests.push({id:rand(8),actor:expected,type,damage:type==='attack'?damage:3,status:'pending',createdAt:Date.now()});
      addEvent(s,(type==='attack'?'Пехота отправила заявку на атаку.':'Санитары запросили лечение пехоты.')+' Ожидает ГМа.');
    });
  }
  function decideRequest(id,accepted){assertGm();return transact(s=>{
    const req=s.requests.find(r=>r.id===id);if(!req||req.status!=='pending')throw Error('Заявка уже обработана.');
    req.status=accepted?'accepted':'rejected';
    if(!accepted){addEvent(s,'ГМ отклонил заявку.');return;}
    if(req.type==='attack'){
      const target=adjustHp(s,'enemy',-req.damage);
      addEvent(s,`ГМ подтвердил атаку пехоты: −${req.damage} ОЗ врагу (осталось ${target.hp}).`);
    }else{
      const medic=unit(s,'p2'), target=unit(s,'p1');
      if(medic.hp===0||medic.charges<=0||target.hp===0||target.hp>=target.cap){req.status='rejected';addEvent(s,'Лечение отклонено: условия уже изменились.');return;}
      medic.charges--;
      const old=target.hp;adjustHp(s,'p1',3);
      addEvent(s,`ГМ подтвердил лечение: +${target.hp-old} ОЗ пехоте, зарядов ${medic.charges}/4.`);
    }
  });}
  function gmDamage(id,amount){assertGm();if(!['p1','p2','enemy'].includes(id)||!Number.isInteger(amount)||amount<1||amount>20)throw Error('Некорректное значение урона.');return transact(s=>{const target=adjustHp(s,id,-amount);addEvent(s,`ГМ нанёс ${amount} урона отряду «${target.name}» (${target.hp}/${target.cap} ОЗ).`)});}
  function nextTurn(){assertGm();return transact(s=>{s.turn=(s.turn+1)%turns.length;if(s.turn===0)s.round++;addEvent(s,`ГМ передал ход: ${turns[s.turn]==='enemy'?'Вражеский отряд':roles[turns[s.turn]]}, раунд ${s.round}.`)});}
  function clearRoom(){setCode('');}
  window.HolenRoom={startRoom,joinRoom,current,currentCode,actor,setActor,roles,turns,load,clearRoom,submitRequest,decideRequest,gmDamage,nextTurn,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},notify};
})();
