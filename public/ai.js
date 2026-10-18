// Modul Analis AI untuk KYY Pro. Dimuat otomatis oleh app.html saat tombol AI pertama kali ditekan.
(function(){
if(window.KYY_AI)return;
var K=window.KYY,$=function(i){return document.getElementById(i)},qa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var st=document.createElement('style');st.textContent="#ai{position:fixed;z-index:12;display:flex;flex-direction:column;background:var(--bg);color:var(--tx);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .22s,transform .3s cubic-bezier(.2,.9,.3,1.1),visibility .22s}\n#ai.on{opacity:1;visibility:visible;pointer-events:auto;transform:none!important}\n#ai[data-m=full]{left:0;right:0;top:0;bottom:var(--kb,0px);padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);transform:translateY(18px)}\n#ai[data-m=widget]{right:14px;bottom:calc(74px + env(safe-area-inset-bottom));width:min(420px,calc(100vw - 28px));height:min(640px,calc(100dvh - 150px));border:1px solid var(--bd);border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,.55);transform:translateY(24px) scale(.97);overflow:hidden}\n#ai[data-m=widget].kbo{bottom:calc(8px + var(--kb,0px))}\n.ah{display:flex;align-items:center;gap:4px;padding:10px 10px 10px 14px;border-bottom:1px solid var(--bd);background:var(--pn);flex:none}\n.aiw{display:flex;align-items:center;gap:10px;min-width:0}.aib{width:34px;height:34px;border-radius:10px;background:var(--ac);color:#fff;display:grid;place-items:center;flex:none}\n.aiw b{display:block;line-height:1.2}.aiw small{display:block;color:var(--mu);font-size:.7rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n#aiBody{flex:1;min-height:0;display:flex;flex-direction:column;position:relative}\n#aiChat{flex:1;min-height:0;position:relative;display:flex;flex-direction:column}\n#aiLog{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:12px;overscroll-behavior:contain}\n.am{display:flex;flex-direction:column;max-width:92%;animation:sIn .25s ease both}.am.u{align-self:flex-end;align-items:flex-end}.am.a{align-self:flex-start}\n.ab{padding:9px 12px;border-radius:14px;font-size:.92rem;line-height:1.5;word-break:break-word}\n.am.u .ab{background:var(--ac);color:#fff;border-bottom-right-radius:4px;white-space:pre-wrap}\n.am.a .ab{background:var(--pn);border:1px solid var(--bd);border-bottom-left-radius:4px}\n.am.e .ab{border-color:var(--dn);color:var(--dn)}\n.ab p{margin:0 0 6px}.ab p:last-child{margin:0}.ab ul,.ab ol{margin:4px 0 6px 18px}.ab pre{background:var(--bg);border:1px solid var(--bd);border-radius:8px;padding:8px;overflow-x:auto;font-size:.8rem;margin:6px 0}.ab code{background:var(--bg);padding:1px 4px;border-radius:4px;font-size:.85em}\n.aa{display:flex;gap:2px;margin-top:2px}.aa button{padding:5px 7px;color:var(--mu);border-radius:6px;display:flex;align-items:center;gap:4px;font-size:.72rem;font-weight:600}.aa .i{width:15px;height:15px}\n.dots{display:inline-flex;gap:4px;padding:5px 0}.dots i{width:6px;height:6px;border-radius:50%;background:var(--mu);animation:pulse 1.2s infinite}.dots i:nth-child(2){animation-delay:.2s}.dots i:nth-child(3){animation-delay:.4s}\n#aiEmpty{position:absolute;inset:0 0 0 0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;text-align:center;pointer-events:none}#aiEmpty>*{pointer-events:auto}\n#aiEmpty .aib{width:54px;height:54px;border-radius:16px;margin-bottom:12px}#aiEmpty .aib .i{width:28px;height:28px}\n#aiEmpty h3{font-size:1.15rem}#aiEmpty p{color:var(--mu);font-size:.85rem;margin:6px 0 16px;max-width:300px}\n.qc{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}.qc button{border:1px solid var(--bd);border-radius:999px;padding:8px 14px;font-size:.8rem;font-weight:600;background:var(--pn)}\n#aiForm{display:flex;gap:8px;align-items:flex-end;padding:10px 12px 6px;border-top:1px solid var(--bd);flex:none}\n#aiIn{flex:1;min-width:0;resize:none;background:var(--pn);border:1px solid var(--bd);border-radius:14px;padding:10px 12px;color:var(--tx);font:inherit;max-height:120px;outline:0}#aiIn:focus{border-color:var(--ac)}\n#aiSend{width:42px;height:42px;border-radius:50%;background:var(--ac);color:#fff;display:grid;place-items:center;flex:none}#aiSend:disabled{opacity:.4}\n.ainote{font-size:.68rem;color:var(--mu);text-align:center;padding:0 12px 8px;flex:none}\n#aiAuth .ac,#aiLoad{padding:22px 20px;display:flex;flex-direction:column;gap:10px;overflow-y:auto}#aiLoad{align-items:center;text-align:center;color:var(--mu)}\n#aiAuth input{background:var(--pn);border:1px solid var(--bd);border-radius:10px;padding:11px;color:var(--tx);outline:0;font:inherit}#aiAuth input:focus{border-color:var(--ac)}\n#aiAuth h3{font-size:1.05rem}#aiAuth p{color:var(--mu);font-size:.85rem}#auM{min-height:1.2em}\n#aiSetP{z-index:14}\n.seg2{display:flex;background:var(--bg);border:1px solid var(--bd);border-radius:10px;overflow:hidden;margin:8px 0 14px}.seg2 button{flex:1;padding:10px;font-weight:700;color:var(--mu)}.seg2 button.on{background:var(--ac);color:#fff}\n#nav .js-ai.on{color:var(--tx)}\n#aiSetP{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;z-index:14;align-items:center;justify-content:center;padding:14px;opacity:0;visibility:hidden;transition:opacity .25s,visibility .25s;backdrop-filter:blur(4px)}\n#aiSetP.on{opacity:1;visibility:visible}#aiSetP .card2{transform:translateY(28px) scale(.95);transition:transform .35s cubic-bezier(.2,.9,.3,1.15)}#aiSetP.on .card2{transform:none}\n#aiHist{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;z-index:14;align-items:center;justify-content:center;padding:14px;opacity:0;visibility:hidden;transition:opacity .25s,visibility .25s;backdrop-filter:blur(4px)}\n#aiHist.on{opacity:1;visibility:visible}#aiHist .card2{transform:translateY(28px) scale(.95);transition:transform .35s cubic-bezier(.2,.9,.3,1.15)}#aiHist.on .card2{transform:none}\n.hi{display:flex;align-items:center;gap:8px;padding:11px 0;border-bottom:1px solid var(--bd)}.hi>button:first-child{flex:1;text-align:left;min-width:0}.hi b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}.hi small{color:var(--mu);font-size:.72rem}.hi.on b{color:var(--ac)}.hi .dl{color:var(--mu);padding:6px 8px;border-radius:8px;font-size:.75rem;font-weight:700}.hi .dl.cf{color:#fff;background:var(--dn)}\n";document.head.appendChild(st);
document.body.insertAdjacentHTML('beforeend',"<section id=\"ai\" data-m=\"widget\" role=\"dialog\" aria-label=\"Analis AI\" aria-hidden=\"true\">\n <header class=\"ah\"><div class=\"aiw\"><span class=\"aib\"><svg class=\"i\"><use href=\"#i-ai\"/></svg></span><div style=\"min-width:0\"><b>Analis AI</b><small id=\"aiCtx\">-</small></div></div><span class=\"sp\"></span>\n  <button class=\"ib\" id=\"aiHistB\" aria-label=\"Riwayat percakapan\"><svg class=\"i\"><use href=\"#i-clock\"/></svg></button><button class=\"ib\" id=\"aiNew\" aria-label=\"Percakapan baru\"><svg class=\"i\"><use href=\"#i-plus\"/></svg></button><button class=\"ib\" id=\"aiSet\" aria-label=\"Pengaturan AI\"><svg class=\"i\"><use href=\"#i-gear\"/></svg></button><button class=\"ib\" id=\"aiClose\" aria-label=\"Tutup\"><svg class=\"i\"><use href=\"#i-x\"/></svg></button></header>\n <div id=\"aiBody\">\n  <div id=\"aiLoad\">Memuat...</div>\n  <div id=\"aiAuth\" hidden><div class=\"ac\"><h3>Masuk untuk memakai Analis AI</h3><p>Akun diperlukan agar layanan AI tidak disalahgunakan.</p>\n   <div class=\"seg2\" style=\"margin:4px 0\"><button id=\"auL\" class=\"on\">Masuk</button><button id=\"auR\">Daftar</button></div>\n   <input id=\"auE\" type=\"email\" placeholder=\"Email\" autocomplete=\"email\"><input id=\"auP\" type=\"password\" placeholder=\"Kata sandi (minimal 6 karakter)\" autocomplete=\"current-password\">\n   <div id=\"auT\" style=\"display:flex;justify-content:center;min-height:65px\"></div><div id=\"auM\" class=\"note\" style=\"padding:0\"></div><button class=\"btn\" id=\"auGo\">Masuk</button><button class=\"lk\" id=\"auF\" style=\"text-align:center\">Lupa kata sandi?</button></div></div>\n  <div id=\"aiChat\" hidden><div id=\"aiLog\" role=\"log\" aria-live=\"polite\"></div>\n   <div id=\"aiEmpty\"><span class=\"aib\"><svg class=\"i\"><use href=\"#i-ai\"/></svg></span><h3>Analis Trading AI</h3><p id=\"aiSub\">Tanyakan analisis untuk pair yang sedang Anda lihat.</p>\n    <div class=\"qc\" id=\"aiQ\"><button>Analisis kondisi sekarang</button><button>Apa arti RSI saat ini?</button><button>Level support dan resistance</button><button>Pola candle terakhir</button><button>Risiko yang perlu diwaspadai</button></div></div></div>\n </div>\n <form id=\"aiForm\" hidden><textarea id=\"aiIn\" rows=\"1\" maxlength=\"1500\" placeholder=\"Tanya soal grafik ini...\" aria-label=\"Pesan\"></textarea><button type=\"submit\" id=\"aiSend\" aria-label=\"Kirim\" disabled><svg class=\"i\"><use href=\"#i-send\"/></svg></button></form>\n <div class=\"ainote\" id=\"aiNote\" hidden>AI dapat keliru. Bukan nasihat keuangan.</div>\n</section>\n<div id=\"aiSetP\"><div class=\"card2\"><div class=\"hh\">Pengaturan AI<button class=\"ib\" id=\"aiSetX\" aria-label=\"Tutup\"><svg class=\"i\"><use href=\"#i-x\"/></svg></button></div><div style=\"padding:12px 16px 16px\">\n <div style=\"font-weight:700\">Mode tampilan</div><div class=\"seg2\" id=\"aiMode\"><button data-am=\"full\">Layar penuh</button><button data-am=\"widget\">Widget mengambang</button></div>\n <div style=\"font-weight:700\">Akun</div><div class=\"note\" id=\"aiAcc\" style=\"padding:4px 0 10px\">Belum masuk</div><button class=\"btn\" id=\"aiOut\" style=\"width:100%\" hidden>Keluar</button><button class=\"btn\" id=\"aiClr\" style=\"width:100%;margin-top:8px;background:var(--bg);border:1px solid var(--bd);color:var(--dn)\" hidden>Hapus semua riwayat</button></div></div></div>\n<div id=\"aiHist\"><div class=\"card2\"><div class=\"hh\">Riwayat percakapan<button class=\"ib\" id=\"aiHistX\" aria-label=\"Tutup\"><svg class=\"i\"><use href=\"#i-x\"/></svg></button></div><div id=\"aiHistL\" style=\"padding:4px 16px 14px;overflow:auto\"></div></div></div>");
/* ---- Analis AI (in-app, tanpa pindah halaman) ---- */
var AI={open:false,sb:null,user:null,msgs:[],busy:false,ctrl:null,store:null};
function il(t){return t.replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/(^|[^*\w])\*([^*\n]+)\*/g,'$1<i>$2</i>')}
function md(t){
 t=t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 var out='';
 t.split('```').forEach(function(p,n){
  if(n%2){out+='<pre>'+p.replace(/^\w*\n/,'')+'</pre>';return}
  var list=null,html='';
  function end(){if(list){html+='</'+list+'>';list=null}}
  p.split('\n').forEach(function(l){
   var m=l.match(/^\s*[-*]\s+(.*)/);
   if(m){if(list!=='ul'){end();html+='<ul>';list='ul'}html+='<li>'+il(m[1])+'</li>';return}
   m=l.match(/^\s*\d+[.)]\s+(.*)/);
   if(m){if(list!=='ol'){end();html+='<ol>';list='ol'}html+='<li>'+il(m[1])+'</li>';return}
   m=l.match(/^#{1,4}\s+(.*)/);
   if(m){end();html+='<p><b>'+il(m[1])+'</b></p>';return}
   end();if(l.trim())html+='<p>'+il(l)+'</p>';
  });
  end();out+=html;
 });
 return out;
}
function aiCtx(){
 if(!$('aiCtx'))return;
 var c=K.ctx();
 $('aiCtx').textContent=c.cur.b+'/'+c.cur.q+' - '+c.tfk.toUpperCase()+(c.live?' - live':'');
 $('aiSub').textContent='Tanyakan analisis untuk '+c.cur.b+'/'+c.cur.q+' yang sedang Anda lihat.';
}
function aiLoadSB(){return new Promise(function(res,rej){if(window.supabase)return res();var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.onload=res;s.onerror=function(){rej(new Error('Modul login gagal dimuat. Periksa koneksi internet Anda.'))};document.head.appendChild(s)})}
async function aiInit(){
 if(AI.sb)return;
 await aiLoadSB();
 AI.sb=window.supabase.createClient(K.sbUrl,K.sbKey,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'kyy-pro-auth'}});
 var r=await AI.sb.auth.getSession();aiUser(r.data.session&&r.data.session.user);
 AI.sb.auth.onAuthStateChange(function(_e,se){var u=se&&se.user;if((u&&u.id)!==(AI.user&&AI.user.id))aiUser(u)});
}
function aiNewSess(){return{id:Date.now()+''+Math.floor(Math.random()*1000),t:'',ts:Date.now(),msgs:[]}}
function aiTitle(ms){for(var i=0;i<ms.length;i++)if(ms[i].r==='u')return ms[i].t.slice(0,48);return ''}
function aiStoreLoad(u){
 var st=K.ld('kyy_chats_'+u.id,null);
 if(!st||!st.list){
  st={cur:null,list:[]};
  var old=K.ld('kyy_chat_'+u.id,[]);
  if(old&&old.length){var s=aiNewSess();s.msgs=old;s.ts=old[old.length-1].ts||Date.now();s.t=aiTitle(old);st.list.push(s);st.cur=s.id}
 }
 if(!st.list.length){var n=aiNewSess();st.list.push(n);st.cur=n.id}
 if(!st.list.some(function(x){return x.id===st.cur}))st.cur=st.list[0].id;
 return st;
}
function aiCurS(){return AI.store.list.filter(function(x){return x.id===AI.store.cur})[0]}
function aiUser(u){AI.user=u||null;if(u){AI.store=aiStoreLoad(u);AI.msgs=aiCurS().msgs.slice()}else{AI.store=null;AI.msgs=[]}aiView();aiRender()}
function aiView(){
 var li=!!AI.user;
 $('aiLoad').hidden=true;$('aiAuth').hidden=li;$('aiChat').hidden=!li;$('aiForm').hidden=!li;$('aiNote').hidden=!li;
 $('aiAcc').textContent=li?AI.user.email:'Belum masuk';$('aiOut').hidden=!li;$('aiClr').hidden=!li;
 if(!li)tsEnsure();
}
function aiOpen(){
 AI.open=true;$('ai').classList.add('on');$('ai').setAttribute('aria-hidden','false');
 var nb=$('nav').querySelector('.js-ai');if(nb)nb.classList.add('on');
 aiCtx();
 if(!AI.sb){
  $('aiLoad').hidden=false;$('aiLoad').textContent='Memuat...';
  aiInit().catch(function(e){var l=$('aiLoad');l.hidden=false;l.innerHTML='';var d=document.createElement('div');d.textContent=e.message||'Gagal memuat.';var b=document.createElement('button');b.className='btn';b.textContent='Coba lagi';b.onclick=aiOpen;l.appendChild(d);l.appendChild(b)}).then(function(){setTimeout(function(){if(AI.user&&AI.open)$('aiIn').focus()},250)});
 }else if(AI.user)setTimeout(function(){$('aiIn').focus()},250);
}
function aiClose(){AI.open=false;$('ai').classList.remove('on');$('ai').setAttribute('aria-hidden','true');var nb=$('nav').querySelector('.js-ai');if(nb)nb.classList.remove('on');$('aiSetP').classList.remove('on');$('aiHist').classList.remove('on')}
function aiToggle(){AI.open?aiClose():aiOpen()}
function aiSave(){
 if(!AI.user||!AI.store)return;
 var s=aiCurS();if(!s)return;
 s.msgs=AI.msgs.filter(function(m){return !m.e&&m.t}).slice(-60);
 if(s.msgs.length){s.ts=Date.now();if(!s.t)s.t=aiTitle(s.msgs)}
 AI.store.list.sort(function(a,b){return b.ts-a.ts});
 if(AI.store.list.length>30)AI.store.list=AI.store.list.slice(0,30);
 K.sv('kyy_chats_'+AI.user.id,AI.store);
}
function aiNew(){
 if(!AI.user)return;
 if(AI.busy&&AI.ctrl)AI.ctrl.abort();
 if(!AI.msgs.length){K.toast('Percakapan ini masih kosong');return}
 aiSave();
 var n=aiNewSess();AI.store.list.unshift(n);AI.store.cur=n.id;AI.msgs=[];
 K.sv('kyy_chats_'+AI.user.id,AI.store);aiRender();K.toast('Percakapan baru. Yang lama tersimpan di Riwayat.');
}
function aiRel(t){var m=Math.floor((Date.now()-t)/60000);if(m<1)return 'baru saja';if(m<60)return m+' mnt lalu';var h=Math.floor(m/60);if(h<24)return h+' jam lalu';var d=Math.floor(h/24);if(d<7)return d+' hari lalu';return new Date(t).toLocaleDateString('id-ID')}
function aiOpenSess(id){
 if(AI.busy&&AI.ctrl)AI.ctrl.abort();
 aiSave();AI.store.cur=id;AI.msgs=aiCurS().msgs.slice();
 K.sv('kyy_chats_'+AI.user.id,AI.store);$('aiHist').classList.remove('on');aiRender();
}
function aiDelSess(id){
 AI.store.list=AI.store.list.filter(function(x){return x.id!==id});
 if(!AI.store.list.length){var n=aiNewSess();AI.store.list.push(n)}
 if(AI.store.cur===id){AI.store.cur=AI.store.list[0].id;AI.msgs=aiCurS().msgs.slice();aiRender()}
 K.sv('kyy_chats_'+AI.user.id,AI.store);aiHistRender();
}
var XI='<svg class="i" style="width:16px;height:16px"><use href="#i-x"/></svg>';
function aiHistRender(){
 var L=$('aiHistL');L.innerHTML='';
 var items=AI.store?AI.store.list.filter(function(s){return s.msgs.length}):[];
 if(!items.length){L.innerHTML='<div class="note" style="padding:14px 0">Belum ada riwayat percakapan.</div>';return}
 items.forEach(function(s){
  var d=document.createElement('div');d.className='hi'+(s.id===AI.store.cur?' on':'');
  var b=document.createElement('button');b.innerHTML='<b></b><small></small>';b.firstChild.textContent=s.t||'Percakapan';b.lastChild.textContent=aiRel(s.ts)+' - '+s.msgs.length+' pesan';
  b.onclick=function(){aiOpenSess(s.id)};
  var x=document.createElement('button');x.className='dl';x.setAttribute('aria-label','Hapus percakapan');x.innerHTML=XI;
  x.onclick=function(){
   if(!x.classList.contains('cf')){x.classList.add('cf');x.textContent='Hapus?';setTimeout(function(){if(x.isConnected){x.classList.remove('cf');x.innerHTML=XI}},3000);return}
   aiDelSess(s.id);
  };
  d.appendChild(b);d.appendChild(x);L.appendChild(d);
 });
}
function aiMsgEl(m,i){
 var d=document.createElement('div'),b=document.createElement('div'),last=i===AI.msgs.length-1;
 d.className='am '+(m.r==='u'?'u':'a')+(m.e?' e':'');b.className='ab';
 if(m.r==='u')b.textContent=m.t;
 else if(m.e)b.textContent=m.e;
 else if(!m.t&&AI.busy&&last)b.innerHTML='<span class="dots"><i></i><i></i><i></i></span>';
 else b.innerHTML=md(m.t);
 d.appendChild(b);
 if(m.r==='a'&&(m.t||m.e)&&!(AI.busy&&last)){
  var a=document.createElement('div');a.className='aa';
  if(m.e)a.innerHTML='<button data-ai="retry">'+'<svg class="i"><use href="#i-redo"/></svg>Coba lagi</button>';
  else a.innerHTML='<button data-ai="copy" data-i="'+i+'" aria-label="Salin"><svg class="i"><use href="#i-copy"/></svg></button>'+(last?'<button data-ai="regen" aria-label="Ulangi jawaban"><svg class="i"><use href="#i-redo"/></svg></button>':'');
  d.appendChild(a);
 }
 return d;
}
function aiRender(){
 var log=$('aiLog');log.innerHTML='';
 $('aiEmpty').hidden=AI.msgs.length>0;
 AI.msgs.forEach(function(m,i){log.appendChild(aiMsgEl(m,i))});
 log.scrollTop=log.scrollHeight;
}
function aiSendBtn(){
 var b=$('aiSend');
 b.innerHTML='<svg class="i"><use href="#i-'+(AI.busy?'stop':'send')+'"/></svg>';
 b.setAttribute('aria-label',AI.busy?'Berhenti':'Kirim');
 b.disabled=!AI.busy&&!$('aiIn').value.trim();
}
function aiGrow(){var t=$('aiIn');t.style.height='auto';t.style.height=Math.min(t.scrollHeight,120)+'px'}
async function aiSend(text,regen){
 if(AI.busy||!AI.user)return;
 text=(text||'').trim();if(!text)return;
 AI.busy=true;AI.ctrl=new AbortController();
 if(!regen)AI.msgs.push({r:'u',t:text,ts:Date.now()});
 var am={r:'a',t:'',ts:Date.now()};AI.msgs.push(am);aiRender();aiSendBtn();aiCtx();
 try{
  var ss=await AI.sb.auth.getSession(),tok=ss.data.session&&ss.data.session.access_token;
  if(!tok){var e0=new Error('Sesi berakhir. Silakan masuk lagi.');e0.st=401;throw e0}
  var snap=await K.snapshot();
  var hist=AI.msgs.slice(0,-2).filter(function(m){return m.t&&!m.e}).slice(-10).map(function(m){return{role:m.r==='u'?'user':'assistant',content:m.t}});
  var r=await fetch(K.api+'/api/chat_trading',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok},body:JSON.stringify({pesan:text,riwayat:hist,snapshot:snap}),signal:AI.ctrl.signal});
  if(!r.ok){var j={};try{j=await r.json()}catch(x){}var er=new Error(j.error||('Kesalahan server ('+r.status+')'));er.st=r.status;throw er}
  var ct=(r.headers&&r.headers.get('content-type'))||'';
  var bub=$('aiLog').lastChild.querySelector('.ab'),raf=0;
  function paint(){raf=0;var lg=$('aiLog'),near=lg.scrollHeight-lg.scrollTop-lg.clientHeight<90;bub.innerHTML=md(am.t);if(near)lg.scrollTop=lg.scrollHeight}
  if(ct.indexOf('application/json')>=0){var jj=await r.json();am.t=jj.balasan||jj.reply||jj.text||'';if(!am.t&&jj.error)throw new Error(jj.error)}
  else if(r.body&&r.body.getReader){
   var rd=r.body.getReader(),dc=new TextDecoder();
   for(;;){var x=await rd.read();if(x.done)break;am.t+=dc.decode(x.value,{stream:true});if(!raf)raf=requestAnimationFrame(paint)}
  }else am.t=await r.text();
  if(!am.t.trim())throw new Error('AI tidak memberi jawaban. Coba lagi.');
 }catch(e){
  if(e.name==='AbortError'){if(!am.t)AI.msgs.pop()}
  else{
   am.e=e.st===401?e.message:(e instanceof TypeError?'Tidak bisa terhubung ke server AI. Periksa koneksi Anda.':e.message);
   if(e.st===401&&AI.sb)AI.sb.auth.signOut();
  }
 }
 AI.busy=false;AI.ctrl=null;aiSave();aiRender();aiSendBtn();
}
function aiLastUser(){for(var i=AI.msgs.length-1;i>=0;i--)if(AI.msgs[i].r==='u')return AI.msgs[i].t;return''}
$('aiLog').onclick=function(e){
 var b=e.target.closest('[data-ai]');if(!b)return;
 var k=b.dataset.ai;
 if(k==='copy'){var t=AI.msgs[+b.dataset.i].t;if(navigator.clipboard)navigator.clipboard.writeText(t).then(function(){K.toast('Disalin')},function(){})}
 else if(k==='retry'||k==='regen'){if(AI.busy)return;var q=aiLastUser();AI.msgs.pop();aiSend(q,true)}
};
$('aiQ').onclick=function(e){var b=e.target.closest('button');if(b)aiSend(b.textContent)};
$('aiForm').onsubmit=function(e){e.preventDefault();if(AI.busy){if(AI.ctrl)AI.ctrl.abort();return}var t=$('aiIn').value;if(!t.trim())return;$('aiIn').value='';aiGrow();aiSendBtn();aiSend(t)};
$('aiIn').oninput=function(){aiGrow();aiSendBtn()};
$('aiIn').onkeydown=function(e){if(e.key==='Enter'&&!e.shiftKey&&!matchMedia('(pointer:coarse)').matches){e.preventDefault();$('aiForm').requestSubmit()}};
$('aiNew').onclick=aiNew;
$('aiHistB').onclick=function(){if(!AI.user)return;aiSave();aiHistRender();$('aiHist').classList.add('on')};
$('aiHistX').onclick=function(){$('aiHist').classList.remove('on')};
$('aiClr').onclick=function(){
 var b=$('aiClr');
 if(!b.dataset.cf){b.dataset.cf='1';b.textContent='Yakin? Tekan lagi untuk menghapus';setTimeout(function(){b.dataset.cf='';b.textContent='Hapus semua riwayat'},3500);return}
 b.dataset.cf='';b.textContent='Hapus semua riwayat';
 var n=aiNewSess();AI.store={cur:n.id,list:[n]};AI.msgs=[];K.sv('kyy_chats_'+AI.user.id,AI.store);K.sv('kyy_chat_'+AI.user.id,[]);aiRender();$('aiSetP').classList.remove('on');K.toast('Semua riwayat dihapus');
};
$('aiClose').onclick=aiClose;
$('aiSet').onclick=function(){qa('#aiMode button').forEach(function(b){b.classList.toggle('on',b.dataset.am===K.cfg.aiMode)});$('aiSetP').classList.add('on')};
$('aiSetX').onclick=function(){$('aiSetP').classList.remove('on')};
$('aiMode').onclick=function(e){var b=e.target.closest('button');if(!b)return;K.cfg.aiMode=b.dataset.am;K.save();$('ai').dataset.m=K.cfg.aiMode;qa('#aiMode button').forEach(function(x){x.classList.toggle('on',x===b)})};
$('aiOut').onclick=function(){if(AI.sb)AI.sb.auth.signOut();$('aiSetP').classList.remove('on')};
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&AI.open){if($('aiHist').classList.contains('on'))$('aiHist').classList.remove('on');else if($('aiSetP').classList.contains('on'))$('aiSetP').classList.remove('on');else aiClose()}});
if(window.visualViewport){var vv=window.visualViewport;var kb=function(){var h=Math.max(0,window.innerHeight-vv.height-vv.offsetTop),a=$('ai');a.style.setProperty('--kb',h+'px');a.classList.toggle('kbo',h>100);a.style.maxHeight=h>100?(vv.height-16)+'px':''};vv.addEventListener('resize',kb);vv.addEventListener('scroll',kb)}
$('ai').dataset.m=K.cfg.aiMode||'widget';
var TS_KEY='0x4AAAAAAEJvSM6VwBV-8QLu',tsTok='',tsId=null,tsLoad=null;
function tsEnsure(){
 if(tsId!==null||tsLoad)return;
 tsLoad=new Promise(function(res,rej){
  if(window.turnstile)return res();
  var s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;s.onload=res;s.onerror=function(){rej(new Error('x'))};document.head.appendChild(s);
 }).then(function(){
  tsId=window.turnstile.render('#auT',{sitekey:TS_KEY,theme:'dark',
   callback:function(t){tsTok=t},
   'expired-callback':function(){tsTok=''},
   'error-callback':function(c){tsTok='';auMsg('Verifikasi keamanan gagal (kode '+c+'). Pastikan domain situs ini sudah diizinkan di Cloudflare Turnstile.')}});
 }).catch(function(){tsLoad=null;auMsg('Verifikasi keamanan gagal dimuat. Periksa koneksi internet lalu buka ulang panel ini.')});
}
function tsReset(){tsTok='';try{if(tsId!==null&&window.turnstile)window.turnstile.reset(tsId)}catch(e){}}
var auMode='login';
function auMsg(t){$('auM').textContent=t||''}
function auSet(m){auMode=m;$('auL').classList.toggle('on',m==='login');$('auR').classList.toggle('on',m==='reg');$('auGo').textContent=m==='login'?'Masuk':'Daftar';$('auP').autocomplete=m==='login'?'current-password':'new-password';auMsg('')}
$('auL').onclick=function(){auSet('login')};$('auR').onclick=function(){auSet('reg')};
function auErr(m){m=String(m||'');if(/captcha/i.test(m))return 'Verifikasi keamanan gagal. Selesaikan kotak verifikasi lalu coba lagi.';if(/Invalid login/i.test(m))return 'Email atau kata sandi salah.';if(/not confirmed/i.test(m))return 'Email belum dikonfirmasi. Cek kotak masuk Anda.';if(/already registered/i.test(m))return 'Email sudah terdaftar. Silakan masuk.';if(/Password should/i.test(m))return 'Kata sandi minimal 6 karakter.';if(/rate limit/i.test(m))return 'Terlalu banyak percobaan. Coba lagi nanti.';return m||'Terjadi kesalahan. Coba lagi.'}
$('auGo').onclick=async function(){
 var em=$('auE').value.trim(),pw=$('auP').value;auMsg('');
 if(!em||pw.length<6){auMsg('Isi email dan kata sandi (minimal 6 karakter).');return}
 if(!tsTok){auMsg('Selesaikan verifikasi keamanan dulu.');return}
 var b=$('auGo');b.disabled=true;
 try{
  if(auMode==='login'){var r=await AI.sb.auth.signInWithPassword({email:em,password:pw,options:{captchaToken:tsTok}});if(r.error)throw r.error}
  else{var r2=await AI.sb.auth.signUp({email:em,password:pw,options:{captchaToken:tsTok}});if(r2.error)throw r2.error;if(!r2.data.session)auMsg('Pendaftaran berhasil. Cek email Anda untuk konfirmasi, lalu masuk.')}
 }catch(e){auMsg(auErr(e.message))}
 b.disabled=false;tsReset();
};
$('auF').onclick=async function(){
 var em=$('auE').value.trim();if(!em){auMsg('Isi email Anda dulu.');return}
 if(!tsTok){auMsg('Selesaikan verifikasi keamanan dulu.');return}
 try{var r=await AI.sb.auth.resetPasswordForEmail(em,{redirectTo:location.origin+location.pathname,captchaToken:tsTok});if(r.error)throw r.error;auMsg('Tautan reset kata sandi dikirim ke email Anda.')}catch(e){auMsg(auErr(e.message))}
 tsReset();
};

async function aiOnce(text,onChunk,signal,hist){
 if(!AI.sb)await aiInit();
 if(!AI.user){var e1=new Error('Masuk dulu untuk memakai AI.');e1.login=true;throw e1}
 var ss=await AI.sb.auth.getSession(),tok=ss.data.session&&ss.data.session.access_token;
 if(!tok){var e2=new Error('Sesi berakhir. Silakan masuk lagi.');e2.login=true;throw e2}
 var snap=await K.snapshot();
 var body=JSON.stringify({pesan:text,riwayat:(hist||[]).slice(-10),snapshot:snap}),r=null,tries=0;
 for(;;){
  r=await fetch(K.api+'/api/chat_trading',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok},body:body,signal:signal});
  if(r.ok||tries>=2||[429,500,502,503,504].indexOf(r.status)<0)break;
  tries++;
  await new Promise(function(ok,no){var t=setTimeout(ok,1500*tries);if(signal)signal.addEventListener('abort',function(){clearTimeout(t);var ab=new Error('Dibatalkan');ab.name='AbortError';no(ab)})});
 }
 if(!r.ok){var j={};try{j=await r.json()}catch(x){}var em=j.error||('Kesalahan server ('+r.status+')');if(r.status>=500||r.status===429)em+=' Coba lagi beberapa saat.';throw new Error(em)}
 var ct=(r.headers&&r.headers.get('content-type'))||'',out='';
 if(ct.indexOf('application/json')>=0){var jj=await r.json();out=jj.balasan||jj.reply||'';if(onChunk)onChunk(out)}
 else if(r.body&&r.body.getReader){var rd=r.body.getReader(),dc=new TextDecoder();for(;;){var x=await rd.read();if(x.done)break;out+=dc.decode(x.value,{stream:true});if(onChunk)onChunk(out)}}
 else{out=await r.text();if(onChunk)onChunk(out)}
 if(!out.trim())throw new Error('AI tidak memberi jawaban. Coba lagi.');
 return out;
}
window.KYY_AI={toggle:aiToggle,open:aiOpen,close:aiClose,ctx:aiCtx,once:aiOnce,md:md};
})();
