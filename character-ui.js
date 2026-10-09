/* МИР ХОЛЭНА — коллекция персонажей v1.0.
 * Профиль хранит заготовки персонажей в Supabase PostgreSQL.
 * Показатели муравьёв — шаблон класса; прогресс автономного HTML-листа
 * ПОКА НЕ связан с сохранённым персонажем и онлайн-комнатой.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const auth=window.HOLEN_AUTH_UI;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const pack=$('character-pack'),template=$('character-template');
const form=$('character-create-form'),list=$('character-list'),status=$('character-message');
let chars=[],expandedId=null,editingId=null,deletingId=null,version=0,mutating=false;
const getSquad=c=>(window.ANT_DATA?.squads||[]).find(s=>s.id===c.sheet_data?.templateId);
const packName=p=>p==='insects'?'Муравьиная революция':'Путешествия Холэна';
function say(s){status.textContent=s;}
function templates(){
 $('character-template-field').hidden=pack.value!=='insects';
 template.innerHTML=(window.ANT_DATA?.squads||[]).map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('');
}
function render(){
 const signed=auth.isAuthenticated();
 form.hidden=!signed;
 $('character-refresh').hidden=!signed;
 if(!signed){
   list.innerHTML='<div class="room-empty">Войди в аккаунт, чтобы просматривать, создавать и изменять персонажей. <button type="button" class="btn subtle" data-signin>Войти</button></div>';
   return;
 }
 if(!chars.length){
   list.innerHTML='<div class="room-empty">У тебя пока нет персонажей. Создай первого с помощью формы ниже.</div>';
   return;
 }
 list.innerHTML=chars.map(c=>{
   const squad=getSquad(c),opened=expandedId===c.id,editing=editingId===c.id,deleting=deletingId===c.id;
   const dnd=c.pack_key==='journeys'&&c.sheet_data?.type==='dnd'?window.HOLEN_DND.normalize(c.sheet_data):null;
   const dndClass=dnd&&window.HOLEN_DND.editions[dnd.edition].classes.find(x=>x.id===dnd.classId);
   const subtitle=packName(c.pack_key)+(squad?' · '+squad.name:dnd?' · '+dnd.edition+' · '+dndClass.name:'');
   const details=opened?'<div class="character-details">'+(
     squad?
     '<div class="character-stat-grid"><div><b>'+esc(squad.hp)+'</b><span>Базовые ОЗ</span></div><div><b>'+esc(squad.ac)+'</b><span>Класс доспеха</span></div><div><b>'+esc(squad.speed)+'</b><span>Скорость</span></div><div><b>'+esc(squad.number)+'</b><span>Муравьёв</span></div></div>'+
     '<p class="character-detail-copy"><strong>Роль:</strong> '+esc(squad.role)+'. '+esc(squad.short)+'</p>'+
     '<p class="character-detail-note">Это базовые показатели специализации. Текущее здоровье, заряды и другие боевые изменения пока не синхронизируются с аккаунтом.</p>'+
     '<a class="btn subtle character-sheet-link" target="_blank" rel="noopener noreferrer" href="sheets/'+encodeURIComponent(squad.id)+'.html">Открыть интерактивный лист ↗</a>'+
     '<p class="character-detail-note">Интерактивный лист пока автономен и сохраняет прогресс в этом браузере, а не в данном персонаже.</p>'
     :'<p class="character-detail-note">'+(dnd?'Уровень '+esc(dnd.level)+' · ОЗ '+esc(dnd.hp)+' / '+esc(dnd.maxHp)+' · КД '+esc(dnd.armorClass):'Редактируемый лист D&D: выбери редакцию, класс и происхождение.')+'</p><a class="btn primary" href="index.html?character='+encodeURIComponent(c.id)+'#dnd-sheet">Открыть лист D&D →</a>' 
   )+'</div>':'';
   const editor=editing?'<form class="character-inline-form" data-character-edit="'+esc(c.id)+'">'+
     '<label for="rename-'+esc(c.id)+'">Новое имя персонажа</label><input required maxlength="72" id="rename-'+esc(c.id)+'" name="name" value="'+esc(c.name)+'">'+
     '<div class="character-controls"><button class="btn primary" type="submit">Сохранить имя</button><button type="button" class="btn subtle" data-character-action="cancel" data-id="'+esc(c.id)+'">Отмена</button></div></form>':'';
   const confirmDelete=deleting?'<div class="character-delete-confirm" role="group" aria-label="Подтверждение удаления"><strong>Удалить «'+esc(c.name)+'» навсегда?</strong><p>Это действие нельзя отменить. Сохранённый персонаж исчезнет из аккаунта.</p><div class="character-controls"><button class="btn danger" type="button" data-character-action="delete-confirm" data-id="'+esc(c.id)+'">Да, удалить</button><button class="btn subtle" type="button" data-character-action="cancel" data-id="'+esc(c.id)+'">Отмена</button></div></div>':'';
   return '<article class="character-entry"><div class="character-main">'+
     '<span class="character-avatar" aria-hidden="true">'+esc(squad?.icon||'◇')+'</span><div class="character-text"><strong>'+esc(c.name)+'</strong><small>'+esc(subtitle)+'</small></div></div>'+
     '<div class="character-controls"><button type="button" class="btn subtle" data-character-action="view" data-id="'+esc(c.id)+'" aria-expanded="'+opened+'">'+(opened?'Скрыть лист':'Просмотр')+'</button>'+
     '<button type="button" class="btn subtle" data-character-action="rename" data-id="'+esc(c.id)+'">Переименовать</button>'+
     '<button type="button" class="btn character-delete-btn" data-character-action="delete" data-id="'+esc(c.id)+'">Удалить</button></div>'+
     details+editor+confirmDelete+'</article>';
 }).join('');
}
async function refresh(){
 const current=++version;
 if(!auth.isAuthenticated()){chars=[];render();return;}
 list.innerHTML='<p class="room-empty">Загружаем персонажей…</p>';
 try{
   const sets=await Promise.all([auth.listCharacters('insects'),auth.listCharacters('journeys')]);
   if(current!==version)return;
   chars=[...sets[0],...sets[1]];render();
 }catch(e){
   if(current!==version)return;
   list.innerHTML='<p class="room-empty">Не удалось загрузить персонажей. Проверь подключение и повтори попытку.</p>';
 }
}
function resetEditors(){editingId=null;deletingId=null;}
list.addEventListener('click',async event=>{
 const signin=event.target.closest('[data-signin]');
 if(signin){auth.open('login');return;}
 const button=event.target.closest('[data-character-action]');
 if(!button || mutating)return;
 const id=button.dataset.id,action=button.dataset.characterAction;
 if(!chars.some(c=>c.id===id))return;
 if(action==='view'){expandedId=expandedId===id?null:id;render();return;}
 if(action==='rename'){editingId=id;deletingId=null;render();list.querySelector('[data-character-edit="'+id+'"] input')?.focus();return;}
 if(action==='delete'){deletingId=id;editingId=null;render();return;}
 if(action==='cancel'){resetEditors();render();return;}
 if(action==='delete-confirm'){
   mutating=true;button.disabled=true;say('Удаляем персонажа…');
   try{await auth.deleteCharacter(id);if(expandedId===id)expandedId=null;resetEditors();say('Персонаж удалён.');await refresh();}
   catch(e){say(e.message||'Не удалось удалить персонажа.');button.disabled=false;}
   finally{mutating=false;}
 }
});
list.addEventListener('submit',async event=>{
 const edit=event.target.closest('[data-character-edit]');
 if(!edit)return;
 event.preventDefault();
 if(mutating)return;
 const id=edit.dataset.characterEdit,title=edit.querySelector('input[name="name"]').value.trim(),btn=edit.querySelector('button[type=submit]');
 mutating=true;btn.disabled=true;say('Сохраняем имя…');
 try{await auth.updateCharacterName(id,title);resetEditors();say('Имя персонажа изменено.');await refresh();}
 catch(e){say(e.message||'Не удалось изменить имя.');btn.disabled=false;}
 finally{mutating=false;}
});
addEventListener('holen-characters-changed',refresh);
pack.addEventListener('change',templates);
form.addEventListener('submit',async event=>{
 event.preventDefault();
 if(mutating)return;
 if(pack.value==='journeys'){const q=new URLSearchParams({name:$('character-name').value.trim()||'Новый персонаж'});location.href='index.html?'+q+'#dnd-sheet';return;}
 const btn=$('character-create-btn');mutating=true;btn.disabled=true;say('Сохраняем персонажа…');
 try{
   await auth.createCharacter($('character-name').value,pack.value,template.value);
   $('character-name').value='';say('Персонаж сохранён в аккаунте.');
   await refresh();
 }catch(e){say(e.message||'Не удалось сохранить персонажа.');}
 finally{btn.disabled=false;mutating=false;}
});
$('character-refresh').addEventListener('click',refresh);
addEventListener('holen-auth-changed',()=>{resetEditors();expandedId=null;refresh();});
templates();refresh();
})();
