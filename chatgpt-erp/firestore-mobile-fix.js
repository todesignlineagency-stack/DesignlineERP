(()=>{'use strict';
// Mobile/network compatibility patch for Firestore WebChannel.
// Must load after Firebase SDKs and before firebase-v8.js.
try{
  const CFG={apiKey:'AIzaSyC8Hx-5PQHT31NeRvMfsOIZnvm2IkEOBkg',authDomain:'designline-erp.firebaseapp.com',projectId:'designline-erp',storageBucket:'designline-erp.firebasestorage.app',messagingSenderId:'605680724271',appId:'1:605680724271:web:cb3184217ea69e1d8619da'};
  if(typeof firebase==='undefined') throw new Error('Firebase SDK not loaded');
  const app=firebase.apps[0]||firebase.initializeApp(CFG);
  const fs=app.firestore();
  fs.settings({
    experimentalForceLongPolling:true,
    experimentalLongPollingOptions:{timeoutSeconds:15},
    ignoreUndefinedProperties:true
  });
  window.__DL_FIRESTORE_MOBILE_FIX__=true;
  console.info('Design Line ERP: Firestore mobile long-polling enabled');
}catch(e){
  console.warn('Design Line ERP: Firestore mobile fix could not apply',e);
}
})();