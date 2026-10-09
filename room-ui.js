/* Холэн 0.9: локальный демонстрационный интерфейс комнат.
 * Одна колонка игроков, выбор отряда, ручные команды ГМа.
 * Никогда не выдаём локальные роли за серверную авторизацию.
 */
(function(){
'use strict';
const e=window.HolenRoom,$=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const roleNames={gm:'ГМ',p1:'Игрок 1',p2:'Игрок 2'};
const actorNames={...roleNames};
function notify(t){$('room-message').textContent=t||'';}
function safe(fn){try{fn();notify('');}catch(err){notify(err?.message||String(err));}}
function unit(s,id){return s.units.find(u=>u.id===id);}
function card(u,gm=false){
 const p=u.cap?Math.round(u.hp/u.cap*100):0;
 return '<article class="room-unit '+(u.owner==='gm'?'enemy':'')+'"><div class="room-player-head"><strong>'+esc(u.name)+'</strong><span class="pill muted-pill">'+esc(u.owner==='gm'?'Противник':roleNames[u.owner])+'</span></div>'+
 '<div class="room-hp">'+u.hp+' / '+u.cap+' ОЗ</div><div class="room-hp-line"><div class="room-hp-fill" style="width:'+p+'%"></div></div>'+
 '<div class="room-metrics"><span>КД '+u.ac+'</span><span>Выжило: '+Math.ceil(u.hp/u.per)+' из '+Math.ceil(u.max/u.per)+'</span>'+
 (u.charges!==undefined?'<span>Лечебные заряды: '+u.charges+'/4</span>':'')+
 (u.training?'<span>Тестовый, не из бестиария</span>':'')+'</div>'+
 (gm?'<div class="room-unit-actions"><button class="btn subtle" type="button" data-damage="'+esc(u.id)+'" data-value="1">−1 ОЗ</button><button class="btn subtle" type="button" data-damage="'+esc(u.id)+'" data-value="3">−3 ОЗ</button></div>':'')+
 '</article>';
}
function roster(s){
 return ['p1','p2'].map((id,i)=>{
 const u=unit(s,id);
 return '<article class="room-player-row"><div class="room-player-marker">'+(i+1)+'</div><div class="room-player-info"><strong>'+esc(roleNames[id])+'</strong><small>'+(u?esc(u.name):'Место свободно · персонаж не выбран')+'</small></div><span class="pill '+(u?'':'muted-pill')+'">'+(u?'Персонаж выбран':'Ожидание')+'</span></article>';
 }).join('');
}
function showUnits(s,gm=false){
 const friendly=s.units.filter(u=>u.owner!=='gm'),enemies=s.units.filter(u=>u.owner==='gm');
 const friendlyHtml=friendly.length?friendly.map(u=>card(u,gm)).join(''):'<p class="room-empty">Игроки ещё не выбрали персонажей.</p>';
 const enemyHtml=enemies.length?enemies.map(u=>card(u,gm)).join(''):'<div class="room-empty">Врагов пока нет. Они появляются только после добавления ГМом.</div>';
 return '<h3>Персонажи игроков</h3><div class="room-unit-list">'+friendlyHtml+'</div><h3>Противники</h3><div class="room-unit-list">'+enemyHtml+'</div>';
}
function logs(s){return s.history.slice(0,12).map(h=>'<li>'+esc(h.message)+'</li>').join('')||'<li>Журнал пока пуст.</li>';}
function pending(s){
 const list=s.requests.filter(x=>x.status==='pending');
 if(!list.length)return '<p class="room-no-requests">Заявок от игроков нет.</p>';
 return list.map(r=>'<div class="room-request"><div class="request-info"><strong>'+esc(roleNames[r.actor])+' · '+(r.type==='attack'?'Атака':'Лечение')+'</strong><small>'+(r.type==='attack'?'Урон: '+r.damage:'Лечение: +3 ОЗ союзнику и −1 заряд санитарам')+'</small></div><button class="btn primary" data-approve="'+esc(r.id)+'" type="button">Подтвердить</button><button class="btn subtle" data-decline="'+esc(r.id)+'" type="button">Отклонить</button></div>').join('');
}
function playerAction(s,role){
 if(role==='gm')return '<h3>Рубка ведущего</h3><p>Заявки, отдых, враги и ручное изменение здоровья доступны в разделе «Панель ГМа».</p><button class="btn primary" type="button" data-room-go="gm">Открыть рубку ГМа →</button>';
 const self=unit(s,role);
 if(!self){
   return '<h3>Выбери персонажа</h3><p>В этой комнате используется пак «Муравьиная революция». Доступны семь специализаций из его каталога.</p><label class="field-label" for="room-template">Специализация отряда</label><select id="room-template" class="room-select">'+e.squadTemplates().map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('')+'</select> <button id="room-choose-character" class="btn primary" type="button">Выбрать отряд</button><p class="room-note">Сохранённые персонажи аккаунта будут подключены к выбору после интеграции онлайн-комнат.</p>';
 }
 const hasEnemy=s.units.some(u=>u.owner==='gm'&&u.hp>0);
 const hasRequest=s.requests.some(r=>r.actor===role&&r.status==='pending');
 const allies=s.units.some(u=>u.owner!=='gm'&&u.id!==role&&u.hp>0&&u.hp<u.cap);
 const heal=self.templateId==='medic'&&self.charges>0&&allies&&self.hp>0&&!hasRequest;
 return '<h3>Твой отряд: '+esc(self.name)+'</h3><p>Заявки проходят через подтверждение ГМа. Другие классовые способности подключим позже.</p>'+
 '<div class="room-actions"><label>Урон <input id="room-attack-damage" type="number" min="1" max="30" value="3" style="width:76px;margin-left:8px"></label>'+
 '<button id="room-request-attack" class="btn primary" type="button" '+(hasEnemy&&self.hp>0&&!hasRequest?'':'disabled')+'>Отправить атаку</button>'+
 (self.templateId==='medic'?'<button id="room-request-heal" class="btn subtle" type="button" '+(heal?'':'disabled')+'>Лечить союзника (+3)</button>':'')+'</div>'+
 (!hasEnemy?'<p class="room-note">ГМ ещё не добавил противника.</p>':'');
}
function render(s){
 $('room-setup').hidden=!!s;$('room-dashboard').hidden=!s;
 const role=e.actor();
 $('gm-no-room').hidden=!!s && role==='gm';$('gm-dashboard').hidden=!s||role!=='gm';
 $('gm-no-room-title').textContent=!s?'Сначала создай комнату':'Требуется демонстрационная роль ГМа';
 $('gm-no-room-text').textContent=!s?'Открой «Комнаты» и создай тестовую сессию.':'Для испытания рубки выбери роль ГМа в разделе «Комнаты». В реальной онлайн-версии такие полномочия будут защищены.';
 if(!s)return;
 $('room-role').value=role;$('room-role-pill').textContent=roleNames[role];
 $('room-active-title').textContent=s.name;$('room-active-code').textContent='Код: '+s.code;
 $('gm-room-title').textContent=s.name;$('gm-room-code').textContent='Код: '+s.code;
 const at=e.turns[s.turn];
 const summary='<span>Раунд '+s.round+'</span><span>Ход: '+esc(actorNames[at]||'ГМ')+'</span><span>Заявок: '+s.requests.filter(x=>x.status==='pending').length+'</span>';
 $('room-meta').innerHTML=summary;$('gm-turn-summary').innerHTML=summary;
 $('room-units').innerHTML='<h3>Игроки в комнате</h3><div class="room-roster">'+roster(s)+'</div>'+showUnits(s,false);
 $('gm-units').innerHTML=showUnits(s,true);
 $('gm-requests').innerHTML=pending(s);
 $('room-feed').innerHTML=logs(s);$('gm-feed').innerHTML=logs(s);
 $('room-action-panel').innerHTML=playerAction(s,role);
 $('gm-next-turn').disabled=role!=='gm';
 const target=$('gm-target');
 if(target){
  const chosen=target.value;
  target.innerHTML=s.units.map(u=>'<option value="'+esc(u.id)+'">'+esc(u.name)+'</option>').join('');
  if(s.units.some(u=>u.id===chosen))target.value=chosen;
  $('gm-heal-btn').disabled=!s.units.length;
 }
}
function onClick(ev){
 const b=ev.target.closest('button');if(!b)return;
 if(b.dataset.roomGo){navigate(b.dataset.roomGo);return;}
 if(b.dataset.approve){safe(()=>e.decideRequest(b.dataset.approve,true));return;}
 if(b.dataset.decline){safe(()=>e.decideRequest(b.dataset.decline,false));return;}
 if(b.dataset.damage){safe(()=>e.gmDamage(b.dataset.damage,Number(b.dataset.value)));return;}
 if(b.id==='room-choose-character'){safe(()=>e.chooseCharacter($('room-template').value));return;}
 if(b.id==='room-request-attack'){safe(()=>e.submitRequest('attack',Number($('room-attack-damage').value)));return;}
 if(b.id==='room-request-heal'){safe(()=>e.submitRequest('heal'));return;}
 if(b.id==='gm-heal-btn'){safe(()=>e.gmHeal($('gm-target').value,Number($('gm-heal-amount').value)));return;}
 if(b.id==='gm-short-rest'){safe(()=>e.gmRest('short'));return;}
 if(b.id==='gm-long-rest'){if(confirm('Долгий отдых восстановит всех бойцов и заряды санитаров. Подтвердить?'))safe(()=>e.gmRest('long'));return;}
 if(b.id==='gm-add-training'){safe(()=>e.gmAddEnemy());return;}
}
document.addEventListener('click',onClick);
$('room-create-form').addEventListener('submit',ev=>{ev.preventDefault();safe(()=>e.startRoom($('room-create-name').value));});
$('room-join-form').addEventListener('submit',ev=>{ev.preventDefault();safe(()=>e.joinRoom($('room-join-code').value));});
$('room-role').addEventListener('change',ev=>e.setActor(ev.target.value));
$('room-leave').addEventListener('click',()=>{e.clearRoom();notify('');});
$('room-copy-code').addEventListener('click',()=>{
 const code=e.currentCode();if(navigator.clipboard?.writeText)navigator.clipboard.writeText(code).then(()=>notify('Код скопирован.')).catch(()=>notify('Код: '+code));else notify('Код: '+code);
});
$('gm-next-turn').addEventListener('click',()=>safe(()=>e.nextTurn()));
e.subscribe(render);render(e.current());
})();