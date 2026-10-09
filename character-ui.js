/* Аккаунт Холэна: личная коллекция персонажей из PostgreSQL.
   Здесь хранятся только заготовки (имя, пак, специализация).
   Полный лист и онлайн-комнаты будут реализованы отдельно.
*/
(()=>{
'use strict';
const $=id=>document.getElementById(id),auth=window.HOLEN_AUTH_UI;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const pack=$('character-pack'),template=$('character-template'),form=$('character-create-form'),list=$('character-list'),status=$('character-message');
let busy=false;
function setStatus(v){status.textContent=v;}
function showTemplates(){
 $('character-template-field').hidden=pack.value!=='insects';
 template.innerHTML=(window.ANT_DATA?.squads||[]).map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('');
}
async function refresh(){
 if(busy)return;
 busy=true;
 try{
  const all=[...(await auth.listCharacters('insects')),...(await auth.listCharacters('journeys'))];
  if(!all.length){list.innerHTML='<p class="room-empty">У вас пока нет сохранённых персонажей. Создайте первый ниже.</p>';return;}
  list.innerHTML=all.map(c=>'<article class="room-player-row"><div class="room-player-marker">◇</div><div class="room-player-info"><strong>'+esc(c.name)+'</strong><small>'+esc(c.pack_key==='insects'?'Муравьиная революция':'Путешествия Холэна')+(c.sheet_data?.templateId?' · '+esc((window.ANT_DATA?.squads||[]).find(t=>t.id===c.sheet_data.templateId)?.name||'Специализация'):'')+'</small></div></article>').join('');
 }catch(e){list.innerHTML='<p class="room-empty">Для просмотра персонажей войдите в аккаунт.</p>';}
 finally{busy=false;}
}
pack.addEventListener('change',showTemplates);
form.addEventListener('submit',async ev=>{
 ev.preventDefault();const btn=$('character-create-btn');btn.disabled=true;setStatus('Сохраняем…');
 try{await auth.createCharacter($('character-name').value,pack.value,template.value);$('character-name').value='';setStatus('Персонаж сохранён в аккаунте.');await refresh();}
 catch(e){setStatus(e.message||'Ошибка сохранения.');}
 finally{btn.disabled=false;}
});
$('character-refresh').addEventListener('click',refresh);
addEventListener('holen-auth-changed',()=>{refresh();});
showTemplates();refresh();
})();