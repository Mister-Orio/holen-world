/* Separate licensed SRD catalogs. Load only the requested edition. */
(()=>{'use strict';const pending=new Map(),details=new Map();
const types={aberration:'Аберрация',beast:'Зверь',celestial:'Небожитель',construct:'Конструкт',dragon:'Дракон',elemental:'Элементаль',fey:'Фея',fiend:'Исчадие',giant:'Великан',humanoid:'Гуманоид',monstrosity:'Монстр',ooze:'Слизь',plant:'Растение',undead:'Нежить'},sizes={Tiny:'Крошечный',Small:'Маленький',Medium:'Средний',Large:'Большой',Huge:'Огромный',Gargantuan:'Громадный'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function json(url){const r=await fetch(url+'?v=0120');if(!r.ok)throw Error('Не удалось загрузить бестиарий.');return r.json();}
function load(e){e=e==='2024'?'2024':'2014';if(!pending.has(e))pending.set(e,json('assets/bestiary/srd-monsters-'+e+'.json').then(d=>{if(d.edition!==e||!Array.isArray(d.monsters))throw Error('Неверный каталог.');return d.monsters.sort((a,b)=>a.name_ru.localeCompare(b.name_ru,'ru')||a.id.localeCompare(b.id));}).catch(err=>{pending.delete(e);throw err;}));return pending.get(e);}
async function detail(e,id){
 e=e==='2024'?'2024':'2014';const card=(await load(e)).find(x=>x.id===id);
 if(!card)throw Error('Существо не найдено.');
 if(!/^\d{2}$/.test(card.chunk))throw Error('Неверный индекс бестиария.');
 const key=e+':'+card.chunk;
 if(!details.has(key))details.set(key,json('assets/bestiary/srd-details-'+e+'-'+card.chunk+'.json').then(d=>{if(d.edition!==e||!Array.isArray(d.monsters))throw Error('Неверный лист существа.');return d.monsters;}).catch(err=>{details.delete(key);throw err;}));
 const full=(await details.get(key)).find(x=>x.id===id);if(!full?.block_text||!Array.isArray(full.abilities))throw Error('Лист существа не найден.');
 const result={...card,...full};delete result.chunk;return result;
}
function filters(p){return {edition:p.get('edition')==='2024'?'2024':'2014',q:(p.get('q')||'').trimStart().toLocaleLowerCase('ru'),cr:p.get('cr')||'all',size:p.get('size')||'all',type:p.get('type')||'all'};}
function query(f){const p=new URLSearchParams({edition:f.edition});for(const k of ['q','cr','size','type'])if(f[k]&&f[k]!=='all')p.set(k,f[k]);return p;}
function filter(list,f){return list.filter(x=>(f.cr==='all'||x.cr===f.cr)&&(f.size==='all'||(x.sizes||[x.size]).includes(f.size))&&(f.type==='all'||x.type===f.type)&&(x.name+' '+x.name_ru+' '+(types[x.type]||'')).toLocaleLowerCase('ru').includes(f.q));}
const symbols={aberration:'◉',beast:'♧',celestial:'✧',construct:'⚙',dragon:'♜',elemental:'✦',fey:'❋',fiend:'♆',giant:'⬟',humanoid:'♟',monstrosity:'◇',ooze:'≋',plant:'❦',undead:'☠'};
function icon(t){return '<span class="srd-type-symbol" aria-hidden="true">'+(symbols[t]||'◇')+'</span>';}
function attribution(){return '<details class="srd-attribution"><summary>Источники и лицензия</summary><p>This work includes material from the System Reference Document 5.1 and System Reference Document 5.2.1 by Wizards of the Coast LLC, available at <a href="https://www.dndbeyond.com/srd" target="_blank" rel="noopener">D&D Beyond</a>. The SRDs are licensed under the <a href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noopener">Creative Commons Attribution 4.0 International License</a>. </p><p>Русский перевод: <a href="https://github.com/OmnisGM-App/OmnisGM-Rules/tree/26169ce31e316ae7b8a0b3dbe031a77626589251" target="_blank" rel="noopener">OmnisGM · открытые SRD 5.1 и 5.2</a>, CC BY 4.0. Мир Холэна адаптировал названия, термин «Восприятие» и формат листов; восстановил пропущенные реакции, ограничения действий и заклинаний, согласовал числовые показатели с соответствующей редакцией официального SRD.</p></details>';}
window.HOLEN_SRD={load,detail,types,sizes,esc,filters,filter,query,icon,attribution};})();
