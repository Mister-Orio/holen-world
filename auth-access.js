/* Standalone references are public. This compatibility file no longer checks
 * an account before reading. sheet-access.js still controls editing in rooms. */
(()=>{
 'use strict';
 document.documentElement.classList.remove('standalone-auth-check');
})();
