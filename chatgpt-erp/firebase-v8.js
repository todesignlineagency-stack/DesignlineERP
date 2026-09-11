(()=>{'use strict';
// Design Line ERP — Direct Dashboard Mode
// Login / password / role gate permanently disabled by request.
function directMode(){
  try{
    const auth=document.getElementById('v8Auth');
    if(auth) auth.remove();
    const shell=document.querySelector('.app-shell');
    if(shell) shell.style.visibility='visible';

    const role=document.getElementById('roleSelect');
    if(role){
      role.value='admin';
      try{role.dispatchEvent(new Event('change',{bubbles:true}))}catch{}
      const field=role.closest('.field');
      if(field) field.style.display='none';
    }

    const brand=document.querySelector('.brand span');
    if(brand) brand.textContent='Agency ERP • Direct Mode';

    const pill=document.getElementById('storagePill');
    if(pill){pill.textContent='● Local Save';pill.style.color='#39d98a'}

    const fb=document.getElementById('firebaseBackendStatus');
    if(fb) fb.textContent='Direct Mode active — Login disabled. ERP opens directly and saves in this browser.';

    try{
      sessionStorage.removeItem('v8ExplicitLogin');
      sessionStorage.removeItem('v8r');
    }catch{}
  }catch(e){console.warn('Direct mode setup',e)}
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',directMode);
else directMode();
})();
