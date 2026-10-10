/* A compact reference for mundane PHB 2014 weapons and armour. */
(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const groups=[['simple','Простое оружие'],['martial','Воинское оружие'],['other','Другое оружие'],['light','Лёгкие доспехи'],['medium','Средние доспехи'],['heavy','Тяжёлые доспехи'],['shield','Щиты']];
const forms={зм:['корон','корона','коронов'],см:['соль','соли','солей'],мм:['искра','искры','искр']};
const coin=s=>String(s).replace(/([\d\s]+) (зм|см|мм)$/,(_,digits,unit)=>{const n=Number(digits.replace(/\s/g,'')),last=n%10,teen=n%100;return digits+' '+forms[unit][teen>=11&&teen<=14?2:last===1?0:last>=2&&last<=4?1:2];});
let ready=false;
function render(){
 const query=document.getElementById('inventory-search').value.trim().toLowerCase().replace(/ё/g,'е'),group=document.getElementById('inventory-group').value,combat=document.getElementById('inventory-combat').value;
 const filtered=window.HOLEN_INVENTORY.filter(x=>(group==='all'||x.group===group)&&(combat==='all'||x.combat===combat)&&`${x.name} ${x.stats}`.toLowerCase().replace(/ё/g,'е').includes(query));
 document.getElementById('inventory-count').textContent=`Найдено: ${filtered.length} из ${window.HOLEN_INVENTORY.length}`;
 const sections=[];
 for(const [id,title] of groups){
  const records=filtered.filter(x=>x.group===id).sort((a,b)=>a.type==='Доспех'?Number(a.id.split('-')[1])-Number(b.id.split('-')[1]):a.name.localeCompare(b.name,'ru'));if(!records.length)continue;
  const weapon=records[0].type==='Оружие';
  for(const mode of weapon?['melee','ranged']:['armour']){
   const rows=weapon?records.filter(x=>x.combat===mode):records;if(!rows.length)continue;
   const heading=title+(weapon?' · '+(mode==='melee'?'рукопашное':'дальнобойное'):'');
   const headers=weapon?['Название','Урон','Тип урона','Дистанция','Свойства','Цена','Вес']:['Название','КД','Сила','Скрытность','Цена','Вес'];
   const body=rows.map(x=>`<tr><th scope="row">${esc(x.name)}</th>${(weapon?[x.damage,x.damageType,x.range,x.properties,coin(x.price),x.weight]:[x.ac,x.strength,x.stealth,coin(x.price),x.weight]).map(s=>`<td>${esc(s)}</td>`).join('')}</tr>`).join('');
   sections.push(`<section class="inventory-section"><h2>${esc(heading)}</h2><div class="inventory-scroll" role="region" aria-label="${esc(heading)}" tabindex="0"><table class="inventory-table"><caption class="visually-hidden">${esc(heading)} · Player’s Handbook 2014</caption><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div></section>`);
  }
 }
 document.getElementById('inventory-tables').innerHTML=sections.join('')||(group==='other'&&combat==='all'&&!query?'<p class="room-empty">Дополнительное и импровизированное оружие согласуется с ГМом. Утверждённых записей в этой группе пока нет.</p>':'<p class="room-empty">Нет снаряжения по выбранным условиям.</p>');
}
function init(){if(!ready){ready=true;for(const id of ['inventory-search','inventory-group','inventory-combat'])document.getElementById(id).addEventListener(id.endsWith('search')?'input':'change',()=>{const armour=['light','medium','heavy','shield'].includes(document.getElementById('inventory-group').value),combat=document.getElementById('inventory-combat');combat.disabled=armour;if(armour)combat.value='all';render();});document.getElementById('inventory-clear').addEventListener('click',()=>{for(const id of ['inventory-group','inventory-combat'])document.getElementById(id).value='all';document.getElementById('inventory-search').value='';document.getElementById('inventory-combat').disabled=false;render();});}render();}
window.addEventListener('holen-navigated',e=>{if(e.detail.view==='inventory')init();});
})();
