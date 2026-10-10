/* Explicit source labels, separate from the URL used to read the rules. */
(()=>{'use strict';
const books={PH14:'Книга игрока D&D 2014 — Player’s Handbook',PH24:'Книга игрока D&D 2024 — Player’s Handbook',HB:'Хоумбрю — авторский материал'};
function sourceFor(record,edition){
 const homebrew=record.homebrew===true||record.sourceKind==='homebrew'||record.sourceBook==='HB';
 const abbr=homebrew?'HB':record.sourceBook||(edition==='2024'?'PH24':'PH14');
 return {abbr,name:record.sourceName||books[abbr]||abbr,kind:homebrew?'homebrew':'official'};
}
function matches(record,edition,source){const info=sourceFor(record,edition);return source==='all'||source===info.kind||source===info.abbr;}
window.HOLEN_OPTION_SOURCES={sourceFor,matches};
})();
