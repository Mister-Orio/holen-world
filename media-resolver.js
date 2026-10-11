/* One API for future avatars, catalogs, map editor and VTT. No private URL is persisted. */
(()=>{'use strict';
const local=key=>typeof key==='string'&&/^assets\/[a-z0-9/_-]+\.(webp|png|jpe?g)$/.test(key)&&!key.includes('..')?key:null;
async function resolve(assetId){
 if(!/^[0-9a-f-]{36}$/i.test(assetId))throw Error('Неверный ID изображения.');
 const auth=window.HOLEN_AUTH_UI;if(!auth?.isAuthenticated())throw Error('Сначала войдите в аккаунт.');
 const a=await auth.api('/rest/v1/rpc/holen_media_reference',{method:'POST',body:{p_asset:assetId}});
 if(!a)return null;
 if(a.provider==='repository'&&a.visibility==='public')return local(a.object_key);
 // Object keys are never treated as URLs. The future provider endpoint signs authorized reads.
 throw Error('Облачное изображение пока не подключено.');
}
window.HOLEN_MEDIA={resolve,local};
})();
