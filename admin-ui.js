(()=>{'use strict';
const root=document.getElementById('admin-root'),auth=window.HOLEN_AUTH_UI,registry=window.HOLEN_ADMIN_MODULES;
if(!root||!auth||!registry)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={owner:'Владелец',admin:'Администратор',user:'Игрок'};
const failures={conflict:'Данные изменились. Обнови раздел и проверь изменения заново.',owner_protected:'Действие остановлено защитой владельца.',
 invalid_request:'Проверь введённые данные.',invalid_catalog:'Каталог не прошёл проверку. Проверь ID, названия, формат и выбранный пак.',
 not_found:'Запись не найдена.',asset_in_use:'Изображение используется. Сначала замени ссылки на него.',adapter_required:'Для публикации этого раздела нужно завершить проверку его связи с игровыми данными.',internal_error:'Операция не выполнена. Запись об ошибке сохранена в журнале.'};
let context=null,section='dashboard',epoch=0,busy=false,catalogs=null,preview=null,factor=null;
const pending=new Map();
const rpc=(name,args={})=>auth.api('/rest/v1/rpc/'+name,{method:'POST',body:args});
function notice(message,error=false){const n=document.getElementById('admin-status');if(n){n.textContent=message;n.classList.toggle('is-error',error);}}
function table(headers,rows){return '<div class="admin-table-scroll"><table class="admin-table"><thead><tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>';}
const utc=value=>{const date=new Date(value);return Number.isFinite(date.getTime())?date.toISOString():'';};
function writable(){return context?.aal==='aal2';}
function mutationButton(action,id,label,owner=false){return `<button class="btn subtle" data-admin-action="${esc(action)}" data-id="${esc(id)}" ${!writable()||owner&&context.role!=='owner'?'disabled':''}>${esc(label)}</button>`;}
async function mutate(name,args){
 const key=name+JSON.stringify(args);if(!pending.has(key))pending.set(key,crypto.randomUUID());
 const result=await rpc(name,{...args,p_operation:pending.get(key)});
 pending.delete(key);
 if(!result?.ok)throw Error(failures[result?.code]||'Сервер не подтвердил изменение.');
 return result;
}
async function confirmAction(title,description){
 const dialog=document.createElement('dialog');dialog.className='admin-dialog';
 dialog.innerHTML=`<h2>${esc(title)}</h2><p class="admin-note">${esc(description)}</p><form method="dialog" class="admin-actions"><button class="btn subtle" value="cancel" autofocus>Отмена</button><button class="btn primary" value="confirm">Подтвердить</button></form>`;
 root.append(dialog);dialog.showModal();
 return new Promise(resolve=>dialog.addEventListener('close',()=>{const accepted=dialog.returnValue==='confirm';dialog.remove();resolve(accepted);},{once:true}));
}
function shell(){
 root.innerHTML=`<div class="admin-header"><div><p class="eyebrow">УПРАВЛЕНИЕ ХОЛЭНОМ</p><h1>Панель администратора</h1><p>${esc(names[context.role])}</p></div><button class="btn subtle" data-admin-action="refresh">Обновить</button></div>
  <p id="admin-status" class="admin-status" role="status" aria-live="polite"></p>
  ${!writable()?'<div class="admin-card"><strong>Подтверди вход кодом из приложения</strong><p class="admin-note">Просмотр доступен. Для изменений нужен второй фактор.</p><button class="btn primary" data-admin-action="mfa">Настроить или подтвердить</button><div id="admin-mfa"></div></div>':''}
  <nav class="admin-tabs" aria-label="Разделы управления">${registry.list().map(m=>`<button class="btn subtle" data-admin-tab="${esc(m.key)}" aria-selected="${section===m.key}">${esc(m.label)}</button>`).join('')}</nav><div id="admin-content" aria-busy="true">Загружаем раздел…</div>`;
}
async function show(){
 const token=++epoch;factor=null;context=null;preview=null;
 root.innerHTML='<p class="admin-note" role="status">Проверяем доступ…</p>';
 try{
  const c=await rpc('holen_admin_context');if(token!==epoch)return;
  if(c?.allowed!==true||!['admin','owner'].includes(c.role)||!auth.isAuthenticated()||c.user_id!==auth.currentUserId()){root.innerHTML='<div class="admin-card"><h1>Раздел недоступен</h1><p>Панель доступна владельцу и назначенным администраторам.</p></div>';return;}
  context=c;shell();await renderSection(token);
 }catch(_){if(token!==epoch)return;root.innerHTML='<div class="admin-card"><h1>Панель пока недоступна</h1><p>Не удалось подтвердить серверный доступ. Проверь подключение или обратись к владельцу.</p><button class="btn subtle" data-admin-action="refresh">Повторить</button></div>';}
}
async function renderSection(token=epoch){
 const el=document.getElementById('admin-content');if(!el)return;
 el.setAttribute('aria-busy','true');el.textContent='Загружаем раздел…';
 try{const html=await registry.get(section).render();if(token===epoch&&document.getElementById('admin-content')===el){el.innerHTML=html;el.removeAttribute('aria-busy');}}
 catch(e){if(token===epoch){el.textContent='Раздел не удалось загрузить. Нажми «Обновить».';el.removeAttribute('aria-busy');notice(e.message,true);}}
}
registry.register({key:'dashboard',label:'Обзор',render:async()=>{
 const d=await rpc('holen_admin_read',{p_section:'dashboard'});
 return '<div class="admin-stats">'+[['Пользователи',d.users],['Комнаты',d.rooms],['Активные',d.active_rooms],['Заблокированные',d.locked_rooms],['База данных',(d.database_bytes/1048576).toFixed(2)+' МиБ'],['События аудита',d.audit_events]].map(([label,value])=>`<div class="admin-card"><strong>${esc(value)}</strong>${esc(label)}</div>`).join('')+'</div><h2>Последние ошибки</h2>'+(d.recent_errors.length?table(['Время UTC','Действие','Объект'],d.recent_errors.map(x=>`<tr><td>${esc(utc(x.created_at))}</td><td>${esc(x.action)}</td><td>${esc(x.object_id)}</td></tr>`)):'<p>Ошибок административных операций нет.</p>')+'<p class="admin-note">Обзор обновляется по запросу. Объём базы не равен точному показанию диска или счёту за облако.</p>';
}});
let users=[],rooms=[];
registry.register({key:'users',label:'Пользователи',render:async()=>{
 users=await rpc('holen_admin_read',{p_section:'users',p_query:root.dataset.query||''});
 return '<form data-admin-form="search" class="admin-form"><label>Имя или ID<input name="query" type="search" maxlength="72" value="'+esc(root.dataset.query||'')+'"></label><button class="btn subtle">Найти</button></form>'+table(['Пользователь','Роль','Состояние','Действия'],users.map(x=>`<tr><td>${esc(x.username)}<code>${esc(x.id)}</code></td><td>${esc(names[x.role])}</td><td>${x.blocked?'Заблокирован':'Активен'}</td><td>${mutationButton('access',x.id,'Изменить',true)}</td></tr>`))+'<p class="admin-note">Показано до 50 совпадений. Для изменения ролей и блокировок нужен владелец.</p>';
}});
registry.register({key:'rooms',label:'Комнаты',render:async()=>{
 rooms=await rpc('holen_admin_read',{p_section:'rooms'});
 return table(['Название','ГМ','Состояние','Действие'],rooms.map(x=>`<tr><td>${esc(x.name)}<code>${esc(x.id)}</code><small>${esc(x.pack_key)}</small></td><td><code>${esc(x.gm_id)}</code></td><td>${esc(x.status)}${x.locked?' · заблокирована':''}</td><td>${mutationButton('room-lock',x.id,x.locked?'Снять блокировку':'Заблокировать')}</td></tr>`))+'<p class="admin-note">Техническая блокировка сохраняет отряды, участников и журнал комнаты.</p>';
}});
registry.register({key:'catalogs',label:'Каталоги и паки',render:async()=>{
 catalogs=await rpc('holen_admin_catalogs');
 return `<div class="admin-card"><h2>Паки</h2>${table(['Название','Доступность','Действие'],catalogs.packs.map(x=>`<tr><td>${esc(x.name)}<code>${esc(x.key)}</code></td><td>${x.playable?'Подключён к сайту':'Подготовлен для будущего подключения'}</td><td>${mutationButton('pack',x.key,'Описание')}</td></tr>`))}${mutationButton('new-pack','','Подготовить пак')}</div>
 <div class="admin-card"><h2>Подготовить новую версию</h2><p class="admin-note">Загрузи JSON со стабильными ID и утверждёнными данными. Сначала увидишь изменения. Исчезнувшие записи останутся в предыдущей версии.</p>
 <form class="admin-form" data-admin-form="stage"><label>Каталог<select name="module">${catalogs.modules.map(x=>`<option value="${esc(x.key)}">${esc(x.label)}${x.publish_ready?'':' · подготовка'}</option>`).join('')}</select></label>
 <label>Пак<select name="pack">${catalogs.packs.map(x=>`<option value="${esc(x.key)}">${esc(x.name)}</option>`).join('')}</select></label><label>Редакция<select name="edition"><option>2014</option><option>2024</option><option value="custom">Авторская</option></select></label>
 <label class="admin-wide">Основание / версия утверждённого реестра<input name="reference" required maxlength="200"></label><label class="admin-wide">JSON-файл<input name="file" type="file" accept=".json,application/json" required></label><button class="btn primary" ${writable()?'':'disabled'}>Проверить и подготовить</button><button class="btn subtle" type="button" data-admin-action="catalog-export">Скачать выбранный каталог</button></form></div>
 <div id="admin-preview"></div><h2>Сохранённые версии</h2>${table(['Каталог','Пак / редакция','Записи','Действие'],catalogs.versions.map(x=>`<tr><td>${esc(x.module_key)}<code>${esc(x.id)}</code></td><td>${esc(x.pack_key)} · ${esc(x.edition)}</td><td>${x.records}</td><td><button class="btn subtle" data-admin-action="preview" data-id="${esc(x.id)}">Просмотреть</button></td></tr>`))}`;
}});
let auditRows=[],auditBefore=null,auditFilter={};
registry.register({key:'audit',label:'Журнал',render:async()=>{
 auditRows=await rpc('holen_admin_read',{p_section:'audit',p_before:auditBefore,p_filter:auditFilter});
 return `<form class="admin-form" data-admin-form="audit-filter"><label>Результат<select name="outcome"><option value="">Все</option><option value="success">Успех</option><option value="error">Ошибка</option></select></label><label>ID объекта<input name="object_id" maxlength="160"></label><label>ID пользователя<input name="actor_id" maxlength="36"></label><label>Действие<input name="action" maxlength="60"></label><button class="btn subtle">Применить</button></form>`+table(['UTC / операция','Кто','Действие / объект','Результат'],auditRows.map(x=>`<tr><td>${esc(utc(x.created_at))}<code>${esc(x.operation_id)}</code></td><td><code>${esc(x.actor_id)}</code></td><td>${esc(x.action)}<code>${esc(x.object_id)}</code><pre class="admin-json">${esc(JSON.stringify(x.summary))}</pre></td><td>${x.outcome==='success'?'Успех':'Ошибка'}${x.error_code?'<code>'+esc(x.error_code)+'</code>':''}</td></tr>`))+`<div class="admin-actions"><button class="btn subtle" data-admin-action="audit-next" ${auditRows.length===50?'':'disabled'}>Раньше →</button><button class="btn subtle" data-admin-action="audit-start">Последние</button><button class="btn subtle" data-admin-action="audit-export">Скачать эту страницу JSON</button></div><p class="admin-note">Журнал доступен только для чтения. Архивирование выполняется отдельно после проверки резервной копии.</p>`;
}});
let media=[];
registry.register({key:'media',label:'Медиатека',render:async()=>{
 const data=await rpc('holen_admin_media');media=data.assets;
 return '<div class="admin-card"><h2>Медиатека</h2><p>'+media.length+' изображений · '+(data.total_bytes/1048576).toFixed(2)+' МиБ</p><p class="admin-note">Текущие изображения остаются в репозитории. Облачная загрузка будет включена после согласования ресурсов и проверки пилота.</p></div>'+table(['ID','Доступ','Размер / формат','Использование','Действие'],media.map(x=>`<tr><td><code>${esc(x.id)}</code>${esc(x.provider)}</td><td>${x.visibility==='public'?'Публичное':'Приватное'}</td><td>${x.width} × ${x.height}<br>${esc(x.mime)} · ${(x.bytes/1024).toFixed(0)} КиБ</td><td>${x.uses} ссылок${x.archived?' · в архиве':''}</td><td>${x.provider==='repository'&&!x.archived?'<button class="btn subtle" data-admin-action="preview-media" data-id="'+esc(x.id)+'">Просмотр</button>':''}${mutationButton('media-archive',x.id,x.archived?'Восстановить':'В архив')}</td></tr>`));
}});
async function showPreview(id){
 preview=await rpc('holen_admin_catalog_preview',{p_version:id});const el=document.getElementById('admin-preview');
 el.innerHTML=`<div class="admin-card"><h2>Изменения версии</h2><p>${esc(preview.module)} · ${esc(preview.pack)} · ${esc(preview.edition)}</p><p>Новых: ${preview.added.length} · изменено: ${preview.changed.length} · в архив: ${preview.archived.length}</p>
  ${preview.conflict&&preview.head!==id?'<p class="admin-note">Версия подготовлена относительно другого состояния каталога. Здесь показаны изменения относительно текущей активной версии — проверь их перед подтверждением.</p>':''}
 ${!preview.publish_ready?'<p class="admin-note">Для этого каталога ещё проверяется связь с игровыми данными. Версия сохранена для проверки.</p>':''}
 ${preview.module==='backgrounds'?'<p class="admin-note">Публикация обновляет справочник и новые выборы персонажей. Сохранённые персонажи сохранят свои навыки и выбранную предысторию. Для возврата открой прежнюю версию и сделай её активной.</p>':''}
 <details><summary>Просмотреть записи</summary><pre class="admin-json">${esc(JSON.stringify(preview.records,null,2))}</pre></details>
 <div class="admin-actions">${preview.publish_ready&&writable()?`<button class="btn primary" data-admin-action="activate" data-id="${esc(id)}" ${preview.head===id?'disabled':''}>${preview.head===id?'Версия уже активна':'Сделать активной'}</button>`:''}</div>
 ${preview.module==='backgrounds'&&writable()?`<details><summary>Редактировать данные и подготовить новую версию</summary><form class="admin-form" data-admin-form="catalog-edit"><label class="admin-wide">Данные предысторий · JSON<textarea name="records" rows="16" required>${esc(JSON.stringify(preview.records,null,2))}</textarea></label><label class="admin-wide">Основание изменения<input name="reference" maxlength="200" required></label><button class="btn primary">Проверить изменения</button></form><p class="admin-note">Сохраняй ID существующих предысторий. Названия, источники и игровые изменения должны соответствовать утверждённым материалам. Сохранение черновика не публикует его.</p></details>`:''}</div>`;
 el.scrollIntoView({block:'nearest',behavior:'smooth'});
}
root.addEventListener('click',async e=>{
 const tab=e.target.closest('[data-admin-tab]');if(tab&&!busy){section=tab.dataset.adminTab;root.dataset.query='';auditBefore=null;await show();return;}
 const button=e.target.closest('[data-admin-action]');if(!button||busy)return;
 const action=button.dataset.adminAction,id=button.dataset.id;busy=true;
 try{
  if(action==='refresh'){await show();return;}
  if(action==='preview'){await showPreview(id);return;}
  if(action==='preview-media'){
   const src=await window.HOLEN_MEDIA.resolve(id);if(!src)throw Error('Изображение недоступно.');
   const dialog=document.createElement('dialog');dialog.className='admin-dialog';
   dialog.innerHTML='<h2>Изображение</h2><img alt="Иллюстрация из медиатеки" style="width:100%;max-height:50vh;object-fit:contain"><form method="dialog"><button class="btn subtle" autofocus>Закрыть</button></form>';
   dialog.querySelector('img').src=src;root.append(dialog);dialog.showModal();
   await new Promise(resolve=>dialog.addEventListener('close',resolve,{once:true}));dialog.remove();return;
  }
  if(action==='media-archive'){
   const x=media.find(x=>x.id===id);if(await confirmAction(x.archived?'Восстановить изображение':'Архивировать изображение',x.id+' · '+x.uses+' ссылок. Используемое изображение нельзя архивировать. Файл сохраняется.')){
    await mutate('holen_admin_media_archive',{p_asset:id,p_archived:!x.archived,p_revision:x.revision});await show();notice('Состояние изображения обновлено.');}
   return;
  }
  if(action==='room-lock'){
   const x=rooms.find(x=>x.id===id);if(await confirmAction(x.locked?'Снять блокировку':'Заблокировать комнату',x.name+' · '+x.id)){
    await mutate('holen_admin_room_lock',{p_room:id,p_locked:!x.locked,p_revision:x.revision});await show();notice('Состояние комнаты обновлено.');}
  }else if(action==='access'){
   const x=users.find(x=>x.id===id);const dialog=document.createElement('dialog');dialog.className='admin-dialog';
   dialog.innerHTML=`<h2>${esc(x.username)}</h2><p><code>${esc(x.id)}</code></p><form method="dialog" id="admin-access-form" class="admin-form"><label>Роль<select name="role">${Object.entries(names).map(([k,v])=>`<option value="${k}" ${x.role===k?'selected':''}>${v}</option>`).join('')}</select></label><label>Доступ<select name="blocked"><option value="false" ${!x.blocked?'selected':''}>Активен</option><option value="true" ${x.blocked?'selected':''}>Заблокирован</option></select></label><button class="btn subtle" value="cancel">Отмена</button><button class="btn primary" value="confirm">Сохранить</button></form>`;
   root.append(dialog);dialog.showModal();await new Promise(resolve=>dialog.addEventListener('close',resolve,{once:true}));
   const data=new FormData(dialog.querySelector('form')),accepted=dialog.returnValue==='confirm';dialog.remove();
   if(accepted&&await confirmAction('Изменить доступ',x.username+' → '+names[data.get('role')]+(data.get('blocked')==='true'?' · заблокировать':''))){
    await mutate('holen_admin_access_change',{p_user:id,p_role:data.get('role'),p_blocked:data.get('blocked')==='true',p_revision:x.revision});await show();notice('Доступ обновлён.');}
  }else if(action==='catalog-export'){
   const form=button.closest('form'),data=new FormData(form),module=data.get('module'),pack=data.get('pack'),edition=data.get('edition');
   const current=await rpc('holen_catalog_public',{p_module:module,p_pack:pack,p_edition:edition});
   const records=current?.records||(module==='backgrounds'&&pack==='journeys'&&['2014','2024'].includes(edition)?window.HOLEN_BACKGROUNDS.bundled(edition):null);
   if(!records)throw Error('Для выбранного каталога ещё нет опубликованной версии.');
   const url=URL.createObjectURL(new Blob([JSON.stringify(records,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=module+'-'+pack+'-'+edition+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }else if(action==='activate'){
   if(await confirmAction('Сделать версию активной',`Новых: ${preview.added.length}, изменённых: ${preview.changed.length}, в архив: ${preview.archived.length}. Предыдущая версия сохраняется.`)){
    await mutate('holen_admin_catalog_activate',{p_version:id,p_expected_head:preview.head});if(preview.module==='backgrounds')await window.HOLEN_BACKGROUNDS.ensure(preview.edition,{force:true});await show();notice('Активная версия обновлена.');}
  }else if(action==='pack'||action==='new-pack'){
   const x=catalogs.packs.find(x=>x.key===id)||{key:'',name:'',description:'',revision:0};
   const el=document.getElementById('admin-content');el.innerHTML=`<h2>Описание пака</h2><form data-admin-form="pack" class="admin-form"><label>ID<input name="key" value="${esc(x.key)}" ${x.key?'readonly':''} required pattern="[a-z][a-z0-9-]{1,39}"></label><label>Название<input name="name" value="${esc(x.name)}" maxlength="100" required></label><label class="admin-wide">Описание<textarea name="description" maxlength="1000">${esc(x.description)}</textarea></label><input type="hidden" name="revision" value="${x.revision}"><button class="btn primary">Сохранить</button></form><p class="admin-note">Подготовка нового пака сохраняет его описание. Игровые правила подключаются отдельно.</p>`;
  }else if(action==='audit-next'){auditBefore=auditRows.at(-1)?.id;await renderSection();}
  else if(action==='audit-start'){auditBefore=null;await renderSection();}
  else if(action==='audit-export'){
   const url=URL.createObjectURL(new Blob([JSON.stringify(auditRows,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='holen-audit.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }else if(action==='mfa'){
   const factors=await auth.mfa.factors();factor=factors.find(x=>x.factor_type==='totp'&&x.status==='verified')||null;
   const el=document.getElementById('admin-mfa');el.innerHTML='<p class="admin-note">'+(factor?'Введи текущий код из приложения.':'Добавь второй фактор в приложение-аутентификатор. Держи резервную копию доступа в безопасном месте.')+'</p>'+(factor?'':'<button class="btn subtle" data-admin-action="mfa-enroll">Добавить приложение</button>')+(factor?mfaForm():'');
  }else if(action==='mfa-enroll'){
   factor=await auth.mfa.enroll();const el=document.getElementById('admin-mfa');el.innerHTML='<p>Отсканируй QR в приложении-аутентификаторе.</p><img class="admin-mfa-qr" alt="QR для настройки второго фактора">'+mfaForm();
   el.querySelector('img').src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(factor.totp.qr_code);
  }
 }catch(e){notice(e.message,true);}finally{busy=false;}
});
function mfaForm(){return '<form class="admin-form" data-admin-form="mfa"><label>Код из приложения<input name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required></label><button class="btn primary">Подтвердить</button></form>';}
root.addEventListener('submit',async e=>{
 const form=e.target.closest('[data-admin-form]');if(!form)return;e.preventDefault();if(busy)return;busy=true;
 const data=new FormData(form);form.querySelectorAll('button').forEach(x=>x.disabled=true);
 try{
  if(form.dataset.adminForm==='search'){root.dataset.query=data.get('query');await renderSection();}
  else if(form.dataset.adminForm==='audit-filter'){auditBefore=null;auditFilter=Object.fromEntries(data);await renderSection();}
  else if(form.dataset.adminForm==='pack'){
   await mutate('holen_admin_pack_save',{p_key:data.get('key'),p_name:data.get('name'),p_description:data.get('description'),p_revision:Number(data.get('revision'))});await show();notice('Описание сохранено.');
  }else if(form.dataset.adminForm==='catalog-edit'){
   const records=JSON.parse(data.get('records'));if(!window.HOLEN_BACKGROUNDS.validate(records,preview.edition))throw Error('Проверь поля предысторий, навыки, ID и ссылки DnD.su выбранной редакции.');
   if(new Blob([JSON.stringify(records)]).size>4194304)throw Error('Каталог должен быть не больше 4 МиБ.');
   const result=await mutate('holen_admin_catalog_stage',{p_module:preview.module,p_pack:preview.pack,p_edition:preview.edition,p_schema_version:1,p_expected_head:preview.head,p_records:records,p_reference:data.get('reference')});
   await showPreview(result.version_id);notice('Черновик сохранён. Проверь изменения перед публикацией.');
  }else if(form.dataset.adminForm==='stage'){
   const file=data.get('file');if(!file||file.size>4194304)throw Error('JSON-файл должен быть не больше 4 МиБ.');
   const records=JSON.parse(await file.text());if(!Array.isArray(records))throw Error('Нужен JSON-массив записей.');
   const module=data.get('module'),pack=data.get('pack'),edition=data.get('edition'),m=catalogs.modules.find(x=>x.key===module);
   if(module==='backgrounds'&&(pack!=='journeys'||!window.HOLEN_BACKGROUNDS.validate(records,edition)))throw Error('Предыстории доступны для «Путешествий Холэна» в редакциях 2014 и 2024. Проверь поля, навыки и ссылки выбранной редакции.');
   const head=catalogs.heads.find(x=>x.module_key===module&&x.pack_key===pack&&x.edition===edition);
   const result=await mutate('holen_admin_catalog_stage',{p_module:module,p_pack:pack,p_edition:edition,p_schema_version:m.schema_version,p_expected_head:head?.version_id||null,p_records:records,p_reference:data.get('reference')});
   await showPreview(result.version_id);notice('Версия сохранена для проверки.');
  }else if(form.dataset.adminForm==='mfa'){
   await auth.mfa.verify(factor.id,data.get('code'));factor=null;await show();notice('Второй фактор подтверждён.');
  }
 }catch(e){notice(e instanceof SyntaxError?'Файл не удалось прочитать как JSON.':e.message,true);}finally{busy=false;form.querySelectorAll('button').forEach(x=>x.disabled=false);}
});
window.addEventListener('holen-navigated',e=>{if(e.detail?.view==='admin')show();else{epoch++;factor=null;root.replaceChildren();}});
window.addEventListener('holen-auth-changed',()=>{epoch++;context=null;factor=null;pending.clear();root.replaceChildren();if(location.hash==='#admin')show();});
window.addEventListener('focus',()=>{if(location.hash==='#admin')show();});
})();
