/* Modules describe UI hooks. SQL permissions and publication adapters remain server-owned. */
(()=>{'use strict';
const modules=new Map();
function register(module){
 if(!/^[a-z][a-z0-9-]*$/.test(module.key)||modules.has(module.key)||typeof module.render!=='function')throw Error('Неверный модуль панели.');
 modules.set(module.key,Object.freeze({...module}));
}
window.HOLEN_ADMIN_MODULES={register,get:key=>modules.get(key),list:()=>[...modules.values()]};
})();
