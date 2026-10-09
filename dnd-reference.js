(()=>{'use strict';
const d=window.HOLEN_DND,p=new URLSearchParams(location.search),edition=p.get('edition')||'2014',kind=p.get('kind'),data=Object.hasOwn(d.editions,edition)?d.editions[edition]:null;
const root=document.getElementById('dnd-reference-root');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const entity=data&&(kind==='class'?data.classes:kind==='species'?data.species:[]).find(x=>x.id===p.get('id'));
if(!entity){root.innerHTML='<h1>Страница не найдена</h1><p>Выбери класс или расу в каталоге.</p>';return;}
document.title=entity.name+' · '+data.label+' · Мир Холэна';
document.getElementById('dnd-reference-back').href='index.html?source=dnd'+edition+'#'+(kind==='class'?'classes':'races');
const query=new URLSearchParams({edition,[kind==='class'?'class':'race']:entity.id});
const subclasses=(window.HOLEN_DND_OPTIONS?.editions[edition]?.subclasses||[]).filter(x=>x.classId===entity.id);
const facts=kind==='class'?[
 ['Кость хитов','d'+entity.hitDie],['Основные характеристики',entity.primary],['Владение спасбросками',entity.saves.map(x=>d.abilities[x]).join(', ')],['Подкласс','С '+entity.subclassLevel+' уровня']
]:[['Базовая скорость',entity.speed+' футов'],['Размер',entity.size],['Редакция',data.label]];
root.innerHTML='<article class="dnd-reference"><span class="overline">'+data.label+' · '+(kind==='class'?'КЛАСС':edition==='2024'?'ВИД':'РАСА')+'</span><h1>'+esc(entity.name)+'</h1><p class="dnd-lead">'+esc(entity.description)+'</p>'+
 '<section class="creature-panel"><h2>Основные сведения</h2><dl class="dnd-reference-facts">'+facts.map(([a,b])=>'<div><dt>'+esc(a)+'</dt><dd>'+esc(b)+'</dd></div>').join('')+'</dl></section>'+
 (kind==='class'?'<section class="creature-panel"><h2>Особенности класса</h2><ul>'+entity.features.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><p>Запиши выбранный подкласс, полученные способности и их ресурсы в интерактивный лист. Конкретные эффекты и развитие по уровням сверяй с источником своей редакции.</p></section>':'<section class="creature-panel"><h2>Происхождение</h2><p>'+esc(data.originNote)+'</p><p>Если у расы есть подраса или линия наследия, её особенности и изменённую скорость отметь в листе вручную.</p></section>')+
 '<a class="btn primary" href="'+esc('index.html?'+query+'#dnd-sheet')+'">Создать персонажа с этим '+(kind==='class'?'классом':'происхождением')+' →</a>'+
 (kind==='class'?'<section class="creature-panel"><h2>Подклассы</h2><ul>'+subclasses.map(x=>'<li>'+esc(x.name)+' <small>('+esc(x.nameEn)+') · уровень '+x.level+'</small></li>').join('')+'</ul></section>':'')+
 '<section class="dnd-reference-source"><h2>Источник и редакция</h2><p>Это краткая справка и собственное изложение. Полный текст выбранной редакции: <a href="'+esc(entity.source||data.source)+'" target="_blank" rel="noopener noreferrer">официальный источник D&D</a>.</p><p>Базовые показатели из <a href="https://www.dndbeyond.com/srd" target="_blank" rel="noopener noreferrer">SRD 5.1 / 5.2.1</a> Wizards of the Coast LLC, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>; перевод и сокращение — Мир Холэна. '+(entity.supplement?'Изобретатель относится к дополнению Tasha’s Cauldron of Everything; его полный текст здесь не воспроизводится.':entity.id==='aasimar'?'Справка об аасимаре основана на собственном кратком описании; этот вид отсутствует в SRD.':'')+'</p></section></article>';
})();
