(()=>{'use strict';
const $=s=>document.querySelector(s);
function setErr(t){const e=$('#v8Err');if(e)e.textContent=t||''}
function setBtn(t,disabled=false){const b=$('#v8Btn');if(b){b.textContent=t||'Login';b.disabled=disabled}}
function showApp(){const shell=$('.app-shell'),auth=$('#v8Auth');if(shell)shell.style.visibility='visible';if(auth)auth.classList.add('hide');const p=$('#storagePill');if(p){p.textContent='● Firebase Connected';p.style.color='#39d98a'}}
function showLogin(){const shell=$('.app-shell'),auth=$('#v8Auth');if(shell)shell.style.visibility='hidden';if(auth)auth.classList.remove('hide')}
async function verifyAndOpen(u){if(!u)return;setErr('Checking Boss / Staff access...');setBtn('Checking...',true);try{const fs=firebase.app().firestore();const d=await Promise.race([fs.collection('users').doc(u.uid).get(),new Promise((_,rej)=>setTimeout(()=>rej(new Error('Firestore is taking too long. Please try again.')),12000))]);if(!d.exists)throw new Error('User profile not configured in Firestore');const p=d.data()||{};if(p.active!==true)throw new Error('This account is inactive');if(!p.role)throw new Error('User role is missing in Firestore');showApp();setErr('');setBtn('Login',false)}catch(e){showLogin();setErr(e?.message||'Unable to open ERP');setBtn('Login',false)}}
function init(){if(typeof firebase==='undefined')return;const auth=firebase.app().auth();const form=$('#v8Form');if(form&&!form.dataset.v83){form.dataset.v83='1';form.addEventListener('submit',()=>{setErr('Signing in...');setBtn('Signing in...',true)},true)}auth.onAuthStateChanged(u=>{if(u)verifyAndOpen(u);else{showLogin();setBtn('Login',false)}})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));else setTimeout(init,0);
})();