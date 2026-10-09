/* ================================================================
   МИР ХОЛЭНА v0.7 — ПРЕДСТАВЛЕНИЕ ТЕСТОВОЙ КОМНАТЫ
   Движок находится отдельно: room-engine.js.
   ================================================================ */
(function(){
  'use strict';
  const engine=window.HolenRoom;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const find=(s,id)=>s.units.find(u=>u.id===id);
  const names={gm:'ГМ',p1:'Игрок 1 · Пехота',p2:'Игрок 2 · Санитары',enemy:'Вражеский отряд'};
  function message(t){$('room-message').textContent=t||'';}
  function safely(fn){try{fn();message('')}catch(e){message(e.message||String(e))}}
  function unitCard(u,gm=false,role='gm'){
    if(u.id==='enemy' && !gm && u.hidden)return '<div class="room-unit enemy"><h4>Неизвестный враг</h4><small>Информация скрыта</small></div>';
    const pct=u.cap?Math.round(u.hp/u.cap*100):0;
    return `<article class="room-unit ${u.id==='enemy'?'enemy':''}"><h4>${esc(u.name)}</h4><small>${esc(names[u.owner])}</small><div class="room-hp">${u.hp} / ${u.cap} ОЗ</div><div class="room-hp-line"><div class="room-hp-fill" style="width:${pct}%"></div></div><div class="room-metrics"><span>Выжило: ${Math.ceil(u.hp/u.per)} из ${u.max/u.per}</span><span>КД ${u.ac}</span>${u.charges!==undefined?`<span>Лечение: ${u.charges}/4</span>`:''}</div>${gm?`<div class="room-unit-actions"><button class="btn subtle" type="button" data-damage="${u.id}" data-value="1">−1 ОЗ</button><button class="btn subtle" type="button" data-damage="${u.id}" data-value="3">−3 ОЗ</button></div>`:''}</article>`;
  }
  function logs(s){return s.history.slice(0,9).map(x=>`<li>${esc(x.message)}</li>`).join('')||'<li>Журнал пуст</li>';}
  function pending(s){const list=s.requests.filter(r=>r.status==='pending');if(!list.length)return '<p class="room-no-requests">Нет новых заявок игроков.</p>';return list.map(r=>`<div class="room-request"><div class="request-info"><strong>${r.type==='attack'?'Атака пехоты':'Лечение санитаров'}</strong><small>${r.type==='attack'?'Заявленный урон: '+r.damage+'. Проверь бросок и КД перед подтверждением.':'+3 ОЗ пехоте в рамках максимума живых; −1 заряд санитаров.'}</small></div><button type="button" class="btn primary" data-approve="${r.id}">Принять</button><button type="button" class="btn subtle" data-decline="${r.id}">Отклонить</button></div>`).join('');}
  function render(s){
    $('room-setup').hidden=!!s;$('room-dashboard').hidden=!s;
    const role=engine.actor();
    $('gm-no-room').hidden=!!s && role==='gm';$('gm-dashboard').hidden=!s || role!=='gm';
    $('gm-no-room-title').textContent=!s?'Сначала создай комнату':'Требуется роль ГМа';
    $('gm-no-room-text').textContent=!s?'Перейди в «Комнаты», создай тестовую сессию и выбери роль ГМа.':'Управление врагами и заявками доступно только в режиме ГМа. В демонстрации переключи роль в разделе «Комнаты».';
    if(!s)return;
    $('room-role').value=role;
    $('room-role-pill').textContent=names[role];
    $('room-active-title').textContent=s.name;
    $('room-active-code').textContent='Код: '+s.code;
    $('gm-room-title').textContent=s.name;
    $('gm-room-code').textContent='Код: '+s.code;
    const at=engine.turns[s.turn];
    const summary=`<span>Раунд ${s.round}</span><span>Ход: ${esc(names[at])}</span><span>${s.requests.filter(r=>r.status==='pending').length} заявок</span>`;
    $('room-meta').innerHTML=summary;
    $('gm-turn-summary').innerHTML=summary;
    $('room-units').innerHTML=s.units.map(u=>unitCard(u,false,role)).join('');
    $('gm-units').innerHTML=s.units.map(u=>unitCard(u,true)).join('');
    $('gm-requests').innerHTML=pending(s);
    $('room-feed').innerHTML=logs(s);$('gm-feed').innerHTML=logs(s);
    $('gm-next-turn').disabled=role!=='gm';
    const p1=find(s,'p1'),p2=find(s,'p2'),enemy=find(s,'enemy');
    let content='';
    if(role==='gm'){
      content=`<h3>Управление боем</h3><p>Подтверждай заявки в панели ГМа. Здесь виден общий журнал и состояние игроков.</p><button type="button" class="btn primary" data-room-go="gm">Открыть панель ГМа →</button>`;
    } else if(role==='p1'){
      const can=p1.hp>0 && enemy.hp>0 && !s.requests.some(r=>r.actor==='p1'&&r.status==='pending');
      content=`<h3>Твой отряд: линейная пехота</h3><p>Отправь ГМу заявку на атаку. Урон он подтвердит после проверки броска по обычным правилам.</p><div class="room-actions"><label>Заявленный урон <input id="room-attack-damage" type="number" min="1" max="20" value="3" style="width:70px;margin-left:8px"/></label><button type="button" class="btn primary" id="room-request-attack" ${can?'':'disabled'}>Отправить атаку</button></div>`;
    } else {
      const can=p2.hp>0&&p2.charges>0&&p1.hp>0&&p1.hp<p1.cap&&!s.requests.some(r=>r.actor==='p2'&&r.status==='pending');
      content=`<h3>Твой отряд: полевые санитары</h3><p>Запрос на лечение пехоты: до +3 ОЗ без возвращения погибших. При подтверждении потратится один из четырёх зарядов.</p><div class="room-actions"><button type="button" class="btn primary" id="room-request-heal" ${can?'':'disabled'}>Отправить лечение</button></div>`;
    }
    $('room-action-panel').innerHTML=content;
  }
  function onClick(e){
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.roomGo){navigate(b.dataset.roomGo);return;}
    if(b.dataset.approve){safely(()=>engine.decideRequest(b.dataset.approve,true));return;}
    if(b.dataset.decline){safely(()=>engine.decideRequest(b.dataset.decline,false));return;}
    if(b.dataset.damage){safely(()=>engine.gmDamage(b.dataset.damage,Number(b.dataset.value)));return;}
    if(b.id==='room-request-attack'){safely(()=>engine.submitRequest('attack',Number($('room-attack-damage').value)));return;}
    if(b.id==='room-request-heal'){safely(()=>engine.submitRequest('heal'));return;}
  }
  document.addEventListener('click',onClick);
  $('room-create-form').addEventListener('submit',e=>{e.preventDefault();safely(()=>engine.startRoom($('room-create-name').value));});
  $('room-join-form').addEventListener('submit',e=>{e.preventDefault();safely(()=>engine.joinRoom($('room-join-code').value));});
  $('room-role').addEventListener('change',e=>engine.setActor(e.target.value));
  $('room-leave').addEventListener('click',()=>{engine.clearRoom();message('');});
  $('room-copy-code').addEventListener('click',()=>{const code=engine.currentCode();if(navigator.clipboard?.writeText)navigator.clipboard.writeText(code).then(()=>message('Код скопирован.')).catch(()=>message('Код: '+code));else message('Код: '+code);});
  $('gm-next-turn').addEventListener('click',()=>safely(()=>engine.nextTurn()));
  engine.subscribe(render);
  render(engine.current());
})();
