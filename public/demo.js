// Mode Demo KYY Pro: mesin simulasi trading + tampilan. Dimuat saat fitur Demo pertama dipakai.
(function(){
/* ===================== MESIN SIMULASI (murni, tanpa DOM) ===================== */
var E={FEE:0.001,SLIP:0.0002,MIN:5,VER:1};
E.create=function(start,fee){return{v:E.VER,start:start,cash:start,locked:0,pos:{},orders:[],hist:[],closed:[],eq:[{t:Date.now(),v:start}],fees:0,seq:1,ts:Date.now(),fee:fee==null?E.FEE:fee}};
E.id=function(a){return a.seq++};
E.step=function(p){return p>=1000?1e-5:p>=100?1e-4:p>=10?1e-3:p>=1?1e-2:p>=0.1?1e-1:1};
E.floor=function(q,p){var s=E.step(p);return +(Math.floor(q/s+1e-9)*s).toFixed(8)};
E.reserved=function(a,s){var r=0;a.orders.forEach(function(o){if(o.s===s&&o.side==='sell')r+=o.qty});return r};
E.avail=function(a,s){var p=a.pos[s];return p?Math.max(0,+(p.qty-E.reserved(a,s)).toFixed(10)):0};
E.vwap=function(levels,qty){
 var rem=qty,cost=0,i,t;
 for(i=0;i<levels.length&&rem>1e-12;i++){t=Math.min(rem,+levels[i][1]);cost+=t*(+levels[i][0]);rem-=t}
 return rem>qty*1e-9?null:cost/qty;
};
E.valid=function(price,sl,tp){
 if(sl>0&&sl>=price)return 'sl';
 if(tp>0&&tp<=price)return 'tp';
 return null;
};
E.buy=function(a,s,qty,price,m){
 m=m||{};
 if(!(qty>0)||!(price>0))return{ok:false,err:'qty'};
 var cost=qty*price,fee=cost*a.fee,tot=cost+fee;
 if(cost<E.MIN-1e-9)return{ok:false,err:'min'};
 if(tot>a.cash+1e-9)return{ok:false,err:'dana'};
 var bad=E.valid(price,m.sl||0,m.tp||0);if(bad)return{ok:false,err:bad};
 a.cash-=tot;a.fees+=fee;
 var p=a.pos[s];
 if(!p)p=a.pos[s]={id:E.id(a),s:s,qty:0,cost:0,realized:0,fees:0,ts:Date.now(),sl:0,tp:0,note:'',fills:0,riskPct:null};
 p.qty=+(p.qty+qty).toFixed(10);p.cost+=tot;p.fees+=fee;p.fills++;
 if(m.sl!=null)p.sl=m.sl||0;if(m.tp!=null)p.tp=m.tp||0;if(m.note)p.note=m.note;if(m.riskPct!=null)p.riskPct=m.riskPct;
 var t={id:E.id(a),ts:Date.now(),s:s,side:'buy',qty:qty,price:price,fee:fee,type:m.type||'market',pid:p.id};
 a.hist.push(t);
 return{ok:true,trade:t,pos:p};
};
E.sell=function(a,s,qty,price,m){
 m=m||{};
 var p=a.pos[s];
 if(!p)return{ok:false,err:'pos'};
 if(!(qty>0)||!(price>0))return{ok:false,err:'qty'};
 if(qty>p.qty+1e-9)return{ok:false,err:'pos'};
 if(!m.force&&qty>E.avail(a,s)+1e-9)return{ok:false,err:'terkunci'};
 if(qty>p.qty)qty=p.qty;
 var all=qty>=p.qty-1e-10,gross=qty*price,fee=gross*a.fee,net=gross-fee;
 if(gross<E.MIN-1e-9&&!all)return{ok:false,err:'min'};
 var part=all?p.cost:p.cost*(qty/p.qty),pnl=net-part;
 a.cash+=net;a.fees+=fee;p.qty=all?0:+(p.qty-qty).toFixed(10);p.cost-=part;p.realized+=pnl;p.fees+=fee;
 var t={id:E.id(a),ts:Date.now(),s:s,side:'sell',qty:qty,price:price,fee:fee,type:m.type||'market',pid:p.id,pnl:pnl,pnlPct:part?pnl/part*100:0};
 a.hist.push(t);
 var closed=null;
 if(all){
  var inQ=0,inC=0,inF=0,outQ=0,outC=0;
  a.hist.forEach(function(h){if(h.pid!==p.id)return;if(h.side==='buy'){inQ+=h.qty;inC+=h.qty*h.price;inF+=h.fee}else{outQ+=h.qty;outC+=h.qty*h.price}});
  closed={id:p.id,s:s,open:p.ts,close:t.ts,pnl:p.realized,fees:p.fees,reason:m.type||'market',note:p.note||'',sl:p.sl,tp:p.tp,fills:p.fills,riskPct:p.riskPct,
   qty:inQ,avgIn:inQ?inC/inQ:0,avgOut:outQ?outC/outQ:0,pnlPct:(inC+inF)?p.realized/(inC+inF)*100:0};
  a.closed.push(closed);delete a.pos[s];
  a.orders=a.orders.filter(function(o){return !(o.s===s&&o.side==='sell')});
 }
 return{ok:true,trade:t,closed:closed};
};
E.limit=function(a,o){
 var qty=o.qty,price=o.price;
 if(!(qty>0)||!(price>0))return{ok:false,err:'qty'};
 if(qty*price<E.MIN-1e-9)return{ok:false,err:'min'};
 var bad=o.side==='buy'?E.valid(price,o.sl||0,o.tp||0):null;if(bad)return{ok:false,err:bad};
 var ord={id:E.id(a),ts:Date.now(),s:o.s,side:o.side,qty:qty,price:price,sl:o.sl||0,tp:o.tp||0,note:o.note||'',riskPct:o.riskPct==null?null:o.riskPct,lock:0};
 if(o.side==='buy'){var lock=qty*price*(1+a.fee);if(lock>a.cash+1e-9)return{ok:false,err:'dana'};a.cash-=lock;a.locked+=lock;ord.lock=lock}
 else if(qty>E.avail(a,o.s)+1e-9)return{ok:false,err:'pos'};
 a.orders.push(ord);
 return{ok:true,order:ord};
};
E.cancel=function(a,id){
 var i,o;
 for(i=0;i<a.orders.length;i++)if(a.orders[i].id===id){o=a.orders[i];break}
 if(!o)return false;
 if(o.side==='buy'){a.cash+=o.lock;a.locked-=o.lock}
 a.orders.splice(i,1);return true;
};
E.tick=function(a,pr){
 var ev=[];
 a.orders.slice().forEach(function(o){
  var last=pr[o.s];if(!(last>0))return;
  if(o.side==='buy'&&last<=o.price){
   a.orders=a.orders.filter(function(x){return x.id!==o.id});a.cash+=o.lock;a.locked-=o.lock;
   var r=E.buy(a,o.s,o.qty,Math.min(o.price,last),{type:'limit',sl:o.sl,tp:o.tp,note:o.note,riskPct:o.riskPct});
   ev.push(r.ok?{k:'fill',s:o.s,trade:r.trade}:{k:'gagal',s:o.s,err:r.err,order:o});
  }else if(o.side==='sell'&&last>=o.price){
   a.orders=a.orders.filter(function(x){return x.id!==o.id});
   var r2=E.sell(a,o.s,o.qty,Math.max(o.price,last),{type:'limit',force:true});
   if(r2.ok)ev.push({k:'fill',s:o.s,trade:r2.trade,closed:r2.closed});
  }
 });
 Object.keys(a.pos).forEach(function(s){
  var p=a.pos[s],last=pr[s];if(!(last>0))return;
  var why=p.sl>0&&last<=p.sl?'sl':(p.tp>0&&last>=p.tp?'tp':null);
  if(!why)return;
  a.orders=a.orders.filter(function(o){return !(o.s===s&&o.side==='sell')});
  var r=E.sell(a,s,p.qty,last*(1-E.SLIP),{type:why,force:true});
  if(r.ok)ev.push({k:why,s:s,trade:r.trade,closed:r.closed});
 });
 return ev;
};
E.equity=function(a,px){var e=a.cash+a.locked;Object.keys(a.pos).forEach(function(s){var p=a.pos[s],pr=px(s);e+=p.qty*(pr>0?pr:p.cost/p.qty)});return e};
E.sample=function(a,eq,force){
 var l=a.eq[a.eq.length-1];
 if(!force&&l&&Date.now()-l.t<30000)return;
 a.eq.push({t:Date.now(),v:eq});
 if(a.eq.length>600){var o=[];a.eq.forEach(function(x,i){if(i%2===0||i===a.eq.length-1)o.push(x)});a.eq=o}
};
E.stats=function(a,eqNow){
 var c=a.closed,w=c.filter(function(x){return x.pnl>0}),l=c.filter(function(x){return x.pnl<0});
 var sw=w.reduce(function(s,x){return s+x.pnl},0),sl=-l.reduce(function(s,x){return s+x.pnl},0),tot=c.reduce(function(s,x){return s+x.pnl},0);
 var peak=a.start,dd=0;
 a.eq.concat([{v:eqNow}]).forEach(function(x){if(x.v>peak)peak=x.v;var d=peak?(peak-x.v)/peak*100:0;if(d>dd)dd=d});
 var streak=0,ms=0;c.forEach(function(x){if(x.pnl<0){streak++;if(streak>ms)ms=streak}else streak=0});
 var withSL=c.filter(function(x){return x.sl>0}).length,rk=c.filter(function(x){return x.riskPct!=null});
 return{trades:c.length,wins:w.length,losses:l.length,winRate:c.length?w.length/c.length*100:null,
  avgWin:w.length?sw/w.length:null,avgLoss:l.length?-sl/l.length:null,profitFactor:sl>0?sw/sl:(sw>0?null:null),pfInf:sl===0&&sw>0,
  expectancy:c.length?tot/c.length:null,best:c.length?Math.max.apply(null,c.map(function(x){return x.pnl})):null,worst:c.length?Math.min.apply(null,c.map(function(x){return x.pnl})):null,
  fees:a.fees,ret:a.start?(eqNow-a.start)/a.start*100:0,maxDD:dd,maxLossStreak:ms,
  avgHoldMs:c.length?c.reduce(function(s,x){return s+(x.close-x.open)},0)/c.length:null,
  slUsagePct:c.length?withSL/c.length*100:null,avgRiskPct:rk.length?rk.reduce(function(s,x){return s+x.riskPct},0)/rk.length:null,realized:tot};
};
E.risk=function(d){
 var notional=d.qty*d.price,fee=notional*d.fee,o={notional:notional,fee:fee,pctCash:d.cash?(notional+fee)/d.cash*100:null,pctEq:d.eq?notional/d.eq*100:null,breakEvenPct:2*d.fee*100};
 if(d.sl>0){var rk=(d.price-d.sl)*d.qty+fee+d.sl*d.qty*d.fee;o.riskUSDT=rk;o.riskPctEq=d.eq?rk/d.eq*100:null;o.slDistPct=(d.price-d.sl)/d.price*100;if(d.atr>0)o.slDistATR=(d.price-d.sl)/d.atr}
 if(d.sl>0&&d.tp>0){var rw=(d.tp-d.price)*d.qty-fee-d.tp*d.qty*d.fee;o.rewardUSDT=rw;o.rr=o.riskUSDT>0?rw/o.riskUSDT:null}
 return o;
};
if(typeof module!=='undefined')module.exports=E;

/* ===================== TAMPILAN ===================== */
(function(){
if(typeof window==='undefined'||window.KYY_DEMO)return;
var K=window.KYY,$=function(i){return document.getElementById(i)},qa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var KEY='kyy_demo_v1',A=null,tab='sum',O=null,draft=null,review=null,hv='trade',linesSig='';
try{var raw=JSON.parse(localStorage.getItem(KEY));if(raw&&raw.v===E.VER&&raw.pos&&raw.hist)A=raw}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(A))}catch(e){}cache()}
function px(s){var m=K.mkGet(s);return m&&m.p>0?m.p:0}
function eqNow(){return A?E.equity(A,px):0}
function cache(){try{if(A){var e=eqNow();localStorage.setItem('kyy_demo_sum',JSON.stringify({eq:e,ret:(e-A.start)/A.start*100,t:Date.now()}))}}catch(e){}}
function usdtSyms(){return K.syms().filter(function(o){return o.q==='USDT'&&!o.f})}
function symObj(s){return K.syms().filter(function(o){return o.s===s})[0]}
/* ---------- format ---------- */
function nf(x,d){return K.nf(x,d)}
function fp(p){return nf(p,K.dp(p,'USDT'))}
function sg(x,d){return (x>=0?'+':'-')+nf(Math.abs(x),d==null?2:d)}
function cl(x){return x>0?'var(--up)':x<0?'var(--dn)':'var(--tx)'}
function dur(ms){var m=Math.floor(ms/60000);if(m<60)return m+' mnt';var h=Math.floor(m/60);if(h<48)return h+' jam '+(m%60)+' mnt';return Math.floor(h/24)+' hari'}
function dts(t){return new Date(t).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
function num(s){s=String(s==null?'':s).trim().replace(/\s/g,'');if(s.indexOf(',')>=0)s=s.replace(/\./g,'').replace(',','.');var v=parseFloat(s);return isNaN(v)?0:v}
function rd(p){return +p.toFixed(Math.max(K.dp(p,'USDT'),2))}
var RS={market:'Manual',limit:'Limit',sl:'Stop Loss',tp:'Take Profit'};
function tw(el,to,fmt,ms){
 if(!el)return;
 var from=el._v==null?to:el._v;el._v=to;
 if(from===to){el.textContent=fmt(to);return}
 cancelAnimationFrame(el._r);var t0=performance.now();ms=K.anim()?(ms||520):0;
 (function f(n){var k=ms?Math.min(1,(n-t0)/ms):1,e=1-Math.pow(1-k,3);el.textContent=fmt(from+(to-from)*e);if(k<1)el._r=requestAnimationFrame(f)})(t0);
}
function spark(arr,w,h,col,id){
 if(!arr||arr.length<2)return '';
 var mn=Math.min.apply(null,arr),mx=Math.max.apply(null,arr),r=mx-mn||1,pts=arr.map(function(v,i){return (i/(arr.length-1)*w).toFixed(1)+','+(h-3-(v-mn)/r*(h-8)).toFixed(1)}).join(' ');
 return '<defs><linearGradient id="g'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+col+'" stop-opacity=".35"/><stop offset="1" stop-color="'+col+'" stop-opacity="0"/></linearGradient></defs><polygon points="0,'+h+' '+pts+' '+w+','+h+'" fill="url(#g'+id+')"/><polyline class="dsl" points="'+pts+'" fill="none" stroke="'+col+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>';
}
function vib(n){try{if(navigator.vibrate)navigator.vibrate(n)}catch(e){}}
function haptic(){vib(12)}
/* ---------- css + html ---------- */
var css='#demo{position:fixed;inset:0;z-index:11;background:var(--bg);color:var(--tx);display:flex;flex-direction:column;opacity:0;visibility:hidden;transform:translateY(22px);transition:opacity .25s,transform .35s cubic-bezier(.2,.9,.25,1),visibility .25s;padding:env(safe-area-inset-top) env(safe-area-inset-right) 0 env(safe-area-inset-left)}'
+'#demo.on{opacity:1;visibility:visible;transform:none}'
+'.dh{display:flex;align-items:center;gap:8px;padding:8px 12px;flex:none}.dh b{font-size:1.05rem}.dbadge{margin-left:8px;font-size:.62rem;font-weight:800;letter-spacing:.06em;padding:3px 7px;border-radius:6px;background:rgba(245,179,1,.16);color:#f5b301;border:1px solid rgba(245,179,1,.4)}'
+'.dhero{position:relative;padding:6px 16px 6px;overflow:hidden;flex:none}.dhero::before{content:"";position:absolute;left:-20%;right:-20%;top:-60%;height:210px;background:radial-gradient(closest-side,var(--gl,rgba(47,107,255,.28)),transparent);transition:background .8s;pointer-events:none}'
+'.dhero small{color:var(--mu);position:relative}.dhero #dEq{font-size:2.2rem;font-weight:800;line-height:1.15;position:relative;white-space:nowrap}.dhero #dRet{font-weight:700;position:relative}'
+'#dSpark{width:100%;height:62px;display:block;margin-top:6px;position:relative}.dsl{stroke-dasharray:900;stroke-dashoffset:900;animation:dsd 1.1s .1s ease forwards}@keyframes dsd{to{stroke-dashoffset:0}}'
+'.dtabs{position:relative;display:flex;gap:4px;padding:0 10px;border-bottom:1px solid var(--bd);overflow-x:auto;flex:none}.dtabs button{padding:11px 10px;font-weight:700;color:var(--mu);white-space:nowrap}.dtabs button.on{color:var(--tx)}'
+'#dInd{position:absolute;bottom:-1px;height:2px;background:var(--ac);border-radius:2px;transition:left .3s cubic-bezier(.3,.9,.3,1.1),width .3s}'
+'#dBody{flex:1;min-height:0;overflow-y:auto;padding:12px 14px 24px;overscroll-behavior:contain}.dtab{animation:sIn .3s ease both}'
+'.dgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.dc{background:var(--pn);border:1px solid var(--bd);border-radius:14px;padding:12px;transition:border-color .3s}.dc small{display:block;color:var(--mu);font-size:.72rem;margin-bottom:2px}.dc b{font-size:1.05rem;font-variant-numeric:tabular-nums}.dc em{display:block;font-style:normal;color:var(--mu);font-size:.68rem;margin-top:3px}'
+'.dsec{margin-top:16px}.dsec h4{font-size:.78rem;color:var(--mu);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;padding:0;border:0}'
+'.alloc{display:flex;height:12px;border-radius:6px;overflow:hidden;background:var(--pn);gap:2px}.alloc i{display:block;height:100%;transition:width .6s cubic-bezier(.2,.9,.3,1);min-width:0}.legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px;font-size:.78rem;color:var(--mu)}.legend span::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;background:var(--c)}'
+'.pc{background:var(--pn);border:1px solid var(--bd);border-radius:16px;padding:12px;margin-bottom:10px;animation:sIn .3s ease both}.pt{display:flex;align-items:center;gap:10px}.pt small{color:var(--mu);display:block;font-size:.74rem}.pr{text-align:right}.pr b{display:block;font-variant-numeric:tabular-nums}'
+'.pbar{position:relative;height:6px;border-radius:3px;background:linear-gradient(90deg,var(--dn),var(--bd) 50%,var(--up));margin:16px 4px 6px}.pbar i{position:absolute;top:-4px;width:14px;height:14px;border-radius:50%;background:var(--tx);border:3px solid var(--pn);transform:translateX(-50%);transition:left .6s cubic-bezier(.2,.9,.3,1)}.pbl{display:flex;justify-content:space-between;font-size:.68rem;color:var(--mu);margin:0 2px}'
+'.hint{font-size:.74rem;color:var(--mu);margin-top:10px;padding:8px 10px;border-radius:10px;background:rgba(245,179,1,.08);border:1px solid rgba(245,179,1,.25)}'
+'.pm{display:flex;justify-content:space-between;gap:8px;margin-top:8px;font-size:.74rem;color:var(--mu)}.pm b{display:block;color:var(--tx);font-variant-numeric:tabular-nums}.pa{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}'
+'.dbtn{padding:8px 12px;border-radius:10px;border:1px solid var(--bd);font-weight:700;font-size:.78rem;background:var(--bg)}.dbtn.p{background:var(--ac);border-color:var(--ac);color:#fff}.dbtn.r{color:var(--dn)}.dbtn:active{transform:scale(.95)}'
+'.dli{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid var(--bd);animation:sIn .3s ease both}.dli>div{min-width:0;flex:1}.dli b{display:block}.dli small{color:var(--mu);font-size:.72rem}.dli .rt{text-align:right;flex:none}.tag2{display:inline-block;font-size:.62rem;font-weight:800;padding:2px 6px;border-radius:5px;background:var(--bg);border:1px solid var(--bd);color:var(--mu);margin-left:6px}'
+'.guide{margin:0 0 8px 20px;color:var(--mu);font-size:.84rem;line-height:1.55}.guide li{margin-bottom:6px}.guide b{color:var(--tx)}.dmg{display:grid;grid-template-columns:1fr 1fr;gap:10px}.dmg .dc b{font-size:1.1rem}.dnote{color:var(--mu);font-size:.74rem;line-height:1.5;margin-top:12px}'
+'.dempty{text-align:center;padding:30px 10px;color:var(--mu)}.dempty b{display:block;color:var(--tx);font-size:1.05rem;margin-bottom:6px}.dempty svg{width:64px;height:64px;margin-bottom:10px;stroke:var(--ac);fill:none;stroke-width:1.5}'
+'.dchips{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.dchips button{padding:9px 14px;border:1px solid var(--bd);border-radius:999px;font-weight:700;background:var(--bg)}.dchips button.on{background:rgba(47,107,255,.2);border-color:var(--ac);color:#8fb0ff}'
+'.dov{position:fixed;inset:0;z-index:14;display:flex;align-items:flex-end;justify-content:center;visibility:hidden;pointer-events:none;transition:visibility .3s}.dov.on{visibility:visible;pointer-events:auto}.dbk{position:absolute;inset:0;background:rgba(0,0,0,.55);opacity:0;transition:opacity .28s;backdrop-filter:blur(3px)}.dov.on .dbk{opacity:1}'
+'.dsh{position:relative;width:100%;max-width:520px;max-height:93dvh;background:var(--pn);border:1px solid var(--bd);border-radius:20px 20px 0 0;transform:translateY(100%);transition:transform .38s cubic-bezier(.2,.9,.25,1);display:flex;flex-direction:column;padding-bottom:env(safe-area-inset-bottom)}.dov.on .dsh{transform:none}'
+'.grab{width:40px;height:4px;border-radius:2px;background:var(--bd);margin:8px auto 2px;flex:none}.dsb{overflow-y:auto;padding:6px 16px 16px;overscroll-behavior:contain}.oh{display:flex;align-items:center;gap:10px;padding:6px 0 10px}.oh small{display:block;color:var(--mu)}'
+'.sd{display:flex;border-radius:12px;background:var(--bg);border:1px solid var(--bd);padding:3px;gap:3px;margin:6px 0}.sd button{flex:1;padding:10px;border-radius:9px;font-weight:800;color:var(--mu);transition:background .25s,color .25s}.sd.big button.on[data-s=buy]{background:var(--up);color:#fff}.sd.big button.on[data-s=sell]{background:var(--dn);color:#fff}.sd.sm button{padding:7px;font-size:.82rem}.sd.sm button.on{background:var(--pn);color:var(--tx)}'
+'.dfl{display:block;font-size:.74rem;color:var(--mu);margin:12px 0 4px}.fi{width:100%;background:var(--bg);border:1px solid var(--bd);border-radius:12px;padding:12px;color:var(--tx);font:inherit;font-size:1.05rem;outline:0;transition:border-color .2s}.fi:focus{border-color:var(--ac)}.fi.err{border-color:var(--dn)}'
+'.pch{display:flex;gap:6px;margin-top:8px}.pch button{flex:1;padding:8px 0;border:1px solid var(--bd);border-radius:10px;font-weight:700;font-size:.8rem;background:var(--bg)}.pch button.on{border-color:var(--ac);color:#8fb0ff;background:rgba(47,107,255,.15)}'
+'.avl{display:flex;justify-content:space-between;font-size:.76rem;color:var(--mu);margin-top:6px}.avl b{color:var(--tx)}'
+'.dsm{margin-top:14px;border:1px solid var(--bd);border-radius:14px;padding:4px 12px;background:var(--bg)}.dsm div{display:flex;justify-content:space-between;padding:7px 0;font-size:.82rem;border-bottom:1px solid var(--bd)}.dsm div:last-child{border:0}.dsm span{color:var(--mu)}.dsm b{font-variant-numeric:tabular-nums}'
+'.dwn{margin-top:10px;font-size:.76rem;display:flex;flex-direction:column;gap:6px}.dwn p{padding:8px 10px;border-radius:10px;background:rgba(245,179,1,.09);border:1px solid rgba(245,179,1,.28);color:#f5c542}.dwn p.e{background:rgba(229,72,77,.1);border-color:rgba(229,72,77,.4);color:#ff8a8e}.dwn p.i{background:rgba(47,107,255,.1);border-color:rgba(47,107,255,.35);color:#9db8ff}'
+'.dac{display:flex;gap:8px;margin-top:14px}.dac button{padding:14px;border-radius:14px;font-weight:800;font-size:1rem}.dac .gh{flex:0 0 auto;border:1px solid var(--bd);background:var(--bg);padding:14px 16px}.dac .go{flex:1;color:#fff;position:relative;overflow:hidden;transition:background .3s,opacity .2s,transform .12s}.dac .go:disabled{opacity:.45}.dac .go.ok{background:var(--up)!important}'
+'.dac .go svg{width:22px;height:22px;stroke:#fff;fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.dac .go svg path{stroke-dasharray:30;stroke-dashoffset:30;animation:dsd2 .45s ease forwards}@keyframes dsd2{to{stroke-dashoffset:0}}'
+'.coach{margin-top:12px;padding:12px;border-radius:14px;background:var(--bg);border:1px solid var(--bd);font-size:.88rem;line-height:1.5}.coach h5{font-size:.74rem;color:var(--ac);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}.coach p{margin:0 0 6px}.coach ul,.coach ol{margin:4px 0 6px 18px}.coach pre{background:var(--pn);padding:6px;border-radius:8px;overflow-x:auto}'
+'.res{text-align:center;padding:18px 16px 8px}.res .big{font-size:2.4rem;font-weight:800;line-height:1.1;margin:6px 0}.res .rg{position:relative;width:76px;height:76px;margin:0 auto 6px;border-radius:50%;display:grid;place-items:center;background:var(--rc)}.res .rg::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid var(--rc);animation:rpl 1.3s ease-out infinite}@keyframes rpl{from{transform:scale(1);opacity:.7}to{transform:scale(1.7);opacity:0}}'
+'.res .rg svg{width:34px;height:34px;stroke:#fff;fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.res .rr{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px;text-align:left}'
+'#dBar{display:none;gap:10px;align-items:center;padding:8px 12px;border-top:1px solid var(--bd);flex:none;background:var(--pn)}body.dm #dBar{display:flex;animation:sIn .3s ease both}#dBar>div{flex:1;min-width:0;font-size:.72rem;color:var(--mu);line-height:1.3}#dBar b{display:block;color:var(--tx);font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
+'#dBar button{padding:11px 20px;border-radius:12px;font-weight:800;color:#fff}#dBar .b{background:var(--up)}#dBar .s{background:var(--dn)}'
+'@media (min-width:700px){#demo{max-width:560px;left:50%;right:auto;width:100%;transform:translate(-50%,22px);border-left:1px solid var(--bd);border-right:1px solid var(--bd)}#demo.on{transform:translate(-50%,0)}}';
var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
var X='<svg class="i"><use href="#i-x"/></svg>',CHK='<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
document.body.insertAdjacentHTML('beforeend',
'<section id="demo" role="dialog" aria-label="Mode Demo" aria-hidden="true"><header class="dh"><button class="ib" id="dClose" aria-label="Tutup">'+X+'</button><div><b>Mode Demo</b><span class="dbadge">SIMULASI</span></div><span class="sp"></span><button class="ib" id="dSet" aria-label="Pengaturan demo"><svg class="i"><use href="#i-gear"/></svg></button></header>'
+'<div class="dhero"><small>Total ekuitas (USDT)</small><div id="dEq">-</div><div id="dRet"></div><svg id="dSpark" viewBox="0 0 300 62" preserveAspectRatio="none"></svg></div>'
+'<div class="dtabs" id="dTabs"><button data-t="sum" class="on">Ringkasan</button><button data-t="pos">Posisi</button><button data-t="ord">Order</button><button data-t="his">Riwayat</button><button data-t="sta">Statistik</button><i id="dInd"></i></div><div id="dBody"></div></section>'
+'<div class="dov" id="dOrd" aria-hidden="true"><div class="dbk" data-cl="dOrd"></div><div class="dsh" role="dialog" aria-label="Order demo"><div class="grab"></div><div class="dsb">'
+'<div class="oh"><span id="oIc"></span><div><b id="oSym">-</b><small id="oLast">-</small></div><span class="sp"></span><button class="ib" data-cl="dOrd" aria-label="Tutup">'+X+'</button></div>'
+'<div class="sd big" id="oSide"><button data-s="buy" class="on">Beli</button><button data-s="sell">Jual</button></div><div class="sd sm" id="oType"><button data-t="market" class="on">Market</button><button data-t="limit">Limit</button></div>'
+'<div id="oPW" hidden><label class="dfl" for="oPrice">Harga limit (USDT)</label><input class="fi" id="oPrice" inputmode="decimal" autocomplete="off"></div>'
+'<label class="dfl" for="oAmt" id="oAL">Jumlah (USDT)</label><input class="fi" id="oAmt" inputmode="decimal" autocomplete="off" placeholder="0"><div class="pch" id="oPct"><button data-p="25">25%</button><button data-p="50">50%</button><button data-p="75">75%</button><button data-p="100">100%</button></div><div class="avl"><span id="oAvT">Kas tersedia</span><b id="oAv">-</b></div>'
+'<div id="oRiskW"><label class="dfl" for="oSL">Stop Loss (opsional)</label><input class="fi" id="oSL" inputmode="decimal" autocomplete="off" placeholder="Harga stop loss"><div class="pch" id="oSLc"><button data-v="1">-1%</button><button data-v="2">-2%</button><button data-v="3">-3%</button><button data-v="atr">1,5 ATR</button></div>'
+'<label class="dfl" for="oTP">Take Profit (opsional)</label><input class="fi" id="oTP" inputmode="decimal" autocomplete="off" placeholder="Harga take profit"><div class="pch" id="oTPc"><button data-v="2">+2%</button><button data-v="4">+4%</button><button data-v="6">+6%</button><button data-v="r2">2R</button></div>'
+'<label class="dfl" for="oNote">Catatan / alasan masuk (opsional)</label><input class="fi" id="oNote" maxlength="140" placeholder="Mis. pantulan di support, RSI oversold" style="font-size:.9rem"></div>'
+'<div class="dsm" id="oSum"></div><div class="dwn" id="oWn"></div><div class="coach" id="oCo" hidden></div>'
+'<div class="dac"><button class="gh" id="oAI" type="button">Tanya AI</button><button class="go" id="oGo" type="button">Beli</button></div></div></div></div>'
+'<div class="dov" id="dSlt" aria-hidden="true"><div class="dbk" data-cl="dSlt"></div><div class="dsh"><div class="grab"></div><div class="dsb"><div class="oh"><div><b id="sSym">Atur SL / TP</b><small id="sInfo"></small></div><span class="sp"></span><button class="ib" data-cl="dSlt" aria-label="Tutup">'+X+'</button></div>'
+'<label class="dfl" for="sSL">Stop Loss</label><input class="fi" id="sSL" inputmode="decimal" placeholder="Kosongkan untuk menghapus"><label class="dfl" for="sTP">Take Profit</label><input class="fi" id="sTP" inputmode="decimal" placeholder="Kosongkan untuk menghapus"><div class="dwn" id="sWn"></div><div class="dac"><button class="go" id="sGo" type="button" style="background:var(--ac)">Simpan</button></div></div></div></div>'
+'<div class="dov" id="dRes" aria-hidden="true"><div class="dbk" data-cl="dRes"></div><div class="dsh"><div class="grab"></div><div class="dsb" id="rB"></div></div></div>'
+'<div class="dov" id="dCo" aria-hidden="true"><div class="dbk" data-cl="dCo"></div><div class="dsh"><div class="grab"></div><div class="dsb"><div class="oh"><b id="cT">Ulasan AI</b><span class="sp"></span><button class="ib" data-cl="dCo" aria-label="Tutup">'+X+'</button></div><div class="coach" id="cB" style="margin-top:0"></div><div class="dnote">AI menilai berdasarkan data yang tampil dan bukan nasihat keuangan.</div></div></div></div>'
+'<div class="dov" id="dSP" aria-hidden="true"><div class="dbk" data-cl="dSP"></div><div class="dsh"><div class="grab"></div><div class="dsb" id="spB"></div></div></div>');
var DOTS='<span class="dots"><i></i><i></i><i></i></span>';
var st2=document.createElement('style');st2.textContent='.dots{display:inline-flex;gap:4px;padding:5px 0}.dots i{width:6px;height:6px;border-radius:50%;background:var(--mu);animation:pulse 1.2s infinite}.dots i:nth-child(2){animation-delay:.2s}.dots i:nth-child(3){animation-delay:.4s}';document.head.appendChild(st2);
function sheet(id,on){var e=$(id);e.classList.toggle('on',on);e.setAttribute('aria-hidden',on?'false':'true')}
var coachCtl=null,dtimer=0,depth=null,focus=null;
function closeSheet(id){
 sheet(id,false);
 if(id==='dOrd'){O=null;draft=null;depth=null;clearInterval(dtimer);if(coachCtl)coachCtl.abort()}
 if(id==='dCo'){review=null;focus=null;if(coachCtl)coachCtl.abort()}
}
document.addEventListener('click',function(e){var c=e.target.closest('[data-cl]');if(c)closeSheet(c.dataset.cl)});
function isOpen(){return $('demo').classList.contains('on')}
/* ---------- nilai portofolio ---------- */
function vals(){
 var pos=0,unr=0,rows=[];
 Object.keys(A.pos).forEach(function(s){var p=A.pos[s],pr=px(s)||p.cost/p.qty,v=p.qty*pr;pos+=v;unr+=v-p.cost;rows.push({s:s,v:v,p:p,pr:pr,u:v-p.cost,up:p.cost?(v-p.cost)/p.cost*100:0})});
 var rea=A.closed.reduce(function(x,c){return x+c.pnl},0)+Object.keys(A.pos).reduce(function(x,s){return x+A.pos[s].realized},0);
 return{pos:pos,unr:unr,rows:rows,rea:rea,eq:A.cash+A.locked+pos};
}
function entry(p){var q=0,c=0;A.hist.forEach(function(h){if(h.pid===p.id&&h.side==='buy'){q+=h.qty;c+=h.qty*h.price}});return q?c/q:p.cost/p.qty}
function hue(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))%360;return 'hsl('+h+' 55% 50%)'}
function cssv(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim()}
/* ---------- dashboard ---------- */
var GUIDE='<ol class="guide"><li><b>Pilih koin.</b> Buka grafik koin USDT, misalnya BTC/USDT.</li><li><b>Tekan Beli</b> pada bar Demo di bawah grafik.</li><li><b>Atur order:</b> jumlah (25% sampai 100% kas), Stop Loss, Take Profit, dan catatan alasan.</li><li><b>Tanya AI</b> untuk menilai rencana sebelum konfirmasi.</li><li><b>Pantau</b> di tab Posisi, lalu tutup dengan tombol Jual.</li></ol>';
var ONB='<div class="dtab"><div class="dempty"><svg viewBox="0 0 24 24"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg><b>Mulai latihan trading</b>Berlatih dengan saldo virtual dan harga pasar sungguhan, tanpa risiko uang asli. AI ikut mendampingi dengan data akun Anda.</div><div class="dchips" id="obC"><button data-v="1000">1.000 USDT</button><button data-v="10000" class="on">10.000 USDT</button><button data-v="100000">100.000 USDT</button></div><button class="dbtn p" id="obGo" style="width:100%;padding:14px;font-size:1rem">Mulai akun demo</button><p class="dnote">Simulasi memakai harga live Binance, biaya 0,1% per transaksi, dan kedalaman order book untuk order market. Hanya pair USDT spot. Stop Loss dan Take Profit dipantau selama aplikasi terbuka.</p></div>';
function setTab(t){
 tab=t;var bs=qa('#dTabs button'),on=null;
 bs.forEach(function(b){var x=b.dataset.t===t;b.classList.toggle('on',x);if(x)on=b});
 if(on){var i=$('dInd');i.style.left=on.offsetLeft+'px';i.style.width=on.offsetWidth+'px'}
 render();
}
function render(){
 var b=$('dBody');
 if(!A){b.innerHTML=ONB;var v=10000;qa('#obC button').forEach(function(x){x.onclick=function(){v=+x.dataset.v;qa('#obC button').forEach(function(y){y.classList.toggle('on',y===x)})}});$('obGo').onclick=function(){A=E.create(v);save();haptic();K.dmBar(true);hero(true);setTab('sum');barUpd()};return}
 b.innerHTML='<div class="dtab">'+({sum:rSum,pos:rPos,ord:rOrd,his:rHis,sta:rSta}[tab])()+'</div>';
 live();
}
function card(l,id,e){return '<div class="dc"><small>'+l+'</small><b id="'+id+'">-</b>'+(e?'<em>'+e+'</em>':'')+'</div>'}
function rSum(){
 var h='<div class="dgrid">'+card('Kas tersedia','sCash')+card('Nilai posisi','sPos')+card('Belum terealisasi','sUnr')+card('Terealisasi','sRea')+'</div>';
 h+='<div class="dsec"><h4>Alokasi</h4><div class="alloc" id="dAl"></div><div class="legend" id="dLg"></div></div>';
 if(!A.hist.length)h+='<div class="dsec"><h4>Cara pakai</h4>'+GUIDE+'<button class="dbtn p" data-a="start" style="width:100%;padding:14px">Mulai: Beli BTC/USDT</button></div>';
 else h+='<div class="dsec"><h4>Aktivitas terakhir</h4>'+A.hist.slice(-4).reverse().map(fillRow).join('')+'</div>';
 return h;
}
function fillRow(h){var o=symObj(h.s)||{b:h.s,q:'USDT'};return '<div class="dli">'+K.ic(o)+'<div><b>'+(h.side==='buy'?'Beli':'Jual')+' '+o.b+'<span class="tag2">'+RS[h.type]+'</span></b><small>'+nf(h.qty,6)+' @ '+fp(h.price)+' - '+dts(h.ts)+'</small></div><div class="rt">'+(h.pnl!=null?'<b style="color:'+cl(h.pnl)+'">'+sg(h.pnl)+'</b><small>'+sg(h.pnlPct)+'%</small>':'<small>Biaya '+nf(h.fee,3)+'</small>')+'</div></div>'}
function rPos(){
 var rows=Object.keys(A.pos);
 if(!rows.length)return '<div class="dempty"><b>Belum ada posisi terbuka</b>Posisi yang Anda buka akan muncul di sini lengkap dengan untung rugi live.<div style="margin-top:12px"><button class="dbtn p" data-a="start">Beli BTC/USDT</button></div></div>';
 return rows.map(function(s){
  var p=A.pos[s],o=symObj(s)||{b:s,q:'USDT'},en=entry(p);
  var bar=p.sl>0&&p.tp>0?'<div class="pbar"><i></i></div><div class="pbl"><span>SL '+fp(p.sl)+'</span><span>TP '+fp(p.tp)+'</span></div>'
   :(p.sl>0?'<div class="hint">Stop Loss '+fp(p.sl)+'. Tambahkan Take Profit untuk menentukan target.</div>':'<div class="hint">Belum ada Stop Loss. Tanpa batas rugi, satu pergerakan buruk bisa menghabiskan banyak modal.</div>');
  return '<div class="pc" data-p="'+s+'"><div class="pt">'+K.ic(o)+'<div><b>'+o.b+'/'+o.q+'</b><small>'+nf(p.qty,6)+' @ '+fp(en)+'</small></div><span class="sp"></span><div class="pr"><b class="v">-</b><small class="u">-</small></div></div>'+bar
  +'<div class="pm"><span>Sekarang<b class="mk">-</b></span><span>Modal<b>'+nf(p.cost,2)+'</b></span><span>Umur<b>'+dur(Date.now()-p.ts)+'</b></span></div>'
  +'<div class="pa"><button class="dbtn r" data-a="sell" data-s="'+s+'" data-p="25">Jual 25%</button><button class="dbtn r" data-a="sell" data-s="'+s+'" data-p="100">Jual semua</button><button class="dbtn" data-a="sltp" data-s="'+s+'">SL / TP</button><button class="dbtn" data-a="chart" data-s="'+s+'">Grafik</button><button class="dbtn p" data-a="posai" data-s="'+s+'">Tanya AI</button></div></div>';
 }).join('');
}
function rOrd(){
 if(!A.orders.length)return '<div class="dempty"><b>Tidak ada order limit</b>Order limit yang menunggu harga akan tampil di sini. Kas atau jumlah koin terkait ikut terkunci.</div>';
 return A.orders.map(function(o){var ob=symObj(o.s)||{b:o.s,q:'USDT'},p=px(o.s),d=p?(o.price-p)/p*100:0;
  return '<div class="dli">'+K.ic(ob)+'<div><b>'+(o.side==='buy'?'Beli':'Jual')+' limit '+ob.b+'</b><small>'+nf(o.qty,6)+' @ '+fp(o.price)+' ('+sg(d)+'% dari harga kini)</small></div><button class="dbtn r" data-a="cancel" data-id="'+o.id+'">Batalkan</button></div>'}).join('');
}
function rHis(){
 var seg='<div class="sd sm" style="margin:0 0 6px"><button data-hv="trade" class="'+(hv==='trade'?'on':'')+'">Trade selesai</button><button data-hv="fill" class="'+(hv==='fill'?'on':'')+'">Semua transaksi</button></div>';
 var ex='<div style="text-align:right;margin:6px 0"><button class="dbtn" data-a="csv">Ekspor CSV</button></div>';
 if(hv==='fill')return seg+(A.hist.length?A.hist.slice().reverse().map(fillRow).join(''):'<div class="dempty"><b>Belum ada transaksi</b></div>')+ex;
 if(!A.closed.length)return seg+'<div class="dempty"><b>Belum ada trade selesai</b>Trade tercatat setelah posisi ditutup penuh.</div>';
 return seg+A.closed.slice().reverse().map(function(c){var o=symObj(c.s)||{b:c.s,q:'USDT'};
  return '<div class="dli" style="align-items:flex-start">'+K.ic(o)+'<div><b>'+o.b+'/'+o.q+'<span class="tag2">'+RS[c.reason]+'</span></b><small>'+fp(c.avgIn)+' &rarr; '+fp(c.avgOut)+' - '+dur(c.close-c.open)+'</small>'+(c.note?'<small style="display:block;font-style:italic">"'+c.note.replace(/</g,'&lt;')+'"</small>':'')+'<div style="margin-top:6px"><button class="dbtn p" data-a="rev" data-id="'+c.id+'">Ulasan AI</button></div></div><div class="rt"><b style="color:'+cl(c.pnl)+'">'+sg(c.pnl)+'</b><small>'+sg(c.pnlPct)+'%</small></div></div>'}).join('')+ex;
}
function stat(l,v,e,c){return '<div class="dc"><small>'+l+'</small><b'+(c?' style="color:'+c+'"':'')+'>'+v+'</b>'+(e?'<em>'+e+'</em>':'')+'</div>'}
function rSta(){
 var e=eqNow(),s=E.stats(A,e),pf=s.profitFactor!=null?nf(s.profitFactor,2):(s.pfInf?'tak terhingga':'-');
 var d=A.eq.map(function(x){return x.v}).concat([e]);
 var h='<svg viewBox="0 0 300 90" preserveAspectRatio="none" style="width:100%;height:90px;margin-bottom:10px">'+spark(d,300,90,e>=A.start?cssv('--up'):cssv('--dn'),'S')+'</svg>';
 h+='<div class="dmg">'+stat('Return total',sg(s.ret)+'%','dari saldo awal '+nf(A.start,0),cl(s.ret))+stat('Max drawdown',nf(s.maxDD,2)+'%','penurunan terdalam dari puncak')
 +stat('Jumlah trade',s.trades,s.wins+' untung / '+s.losses+' rugi')+stat('Win rate',s.winRate==null?'-':nf(s.winRate,1)+'%','')
 +stat('Profit factor',pf,'di atas 1 = total untung > total rugi')+stat('Ekspektasi / trade',s.expectancy==null?'-':sg(s.expectancy)+' USDT','rata-rata hasil per trade',s.expectancy==null?null:cl(s.expectancy))
 +stat('Rata-rata menang',s.avgWin==null?'-':sg(s.avgWin),'USDT','var(--up)')+stat('Rata-rata kalah',s.avgLoss==null?'-':sg(s.avgLoss),'USDT','var(--dn)')
 +stat('Terbaik',s.best==null?'-':sg(s.best),'USDT')+stat('Terburuk',s.worst==null?'-':sg(s.worst),'USDT')
 +stat('Pakai Stop Loss',s.slUsagePct==null?'-':nf(s.slUsagePct,0)+'%','dari trade selesai')+stat('Risiko rata-rata',s.avgRiskPct==null?'-':nf(s.avgRiskPct,2)+'%','dari ekuitas saat masuk')
 +stat('Total biaya',nf(s.fees,2)+' USDT','0,1% per transaksi')+stat('Streak rugi terpanjang',s.maxLossStreak,'trade beruntun')+'</div>';
 h+='<p class="dnote">Disiplin lebih penting dari tebakan arah: stop loss konsisten dan risiko kecil per trade biasanya membuat hasil lebih stabil. Angka di sini murni dari simulasi Anda, dan hasil demo tidak menjamin hasil trading sungguhan.</p>';
 return h;
}
/* ---------- pembaruan live ---------- */
var sparkLen=-1;
function hero(force){
 if(!A){$('dEq').textContent='-';$('dRet').textContent='Belum ada akun demo';$('dSpark').innerHTML='';return}
 var e=eqNow(),ret=(e-A.start)/A.start*100;
 tw($('dEq'),e,function(v){return nf(v,2)});
 var r=$('dRet');r.style.color=cl(ret);r.textContent=sg(e-A.start)+' USDT ('+sg(ret)+'%)';
 $('demo').style.setProperty('--gl',ret>=0?'rgba(22,168,108,.28)':'rgba(229,72,77,.28)');
 if(force||sparkLen!==A.eq.length){sparkLen=A.eq.length;var d=A.eq.map(function(x){return x.v}).concat([e]);$('dSpark').innerHTML=spark(d,300,62,ret>=0?cssv('--up'):cssv('--dn'),'H')}
}
function live(){
 if(!A)return;
 hero(false);barUpd();
 var v=vals();
 if(tab==='sum'&&$('sCash')){
  tw($('sCash'),A.cash,function(x){return nf(x,2)});tw($('sPos'),v.pos,function(x){return nf(x,2)});
  var u=$('sUnr');u.style.color=cl(v.unr);tw(u,v.unr,function(x){return sg(x)});
  var r=$('sRea');r.style.color=cl(v.rea);tw(r,v.rea,function(x){return sg(x)});
  var seg=[{k:'Kas',v:A.cash+A.locked,c:'#5b6270'}].concat(v.rows.map(function(x){return{k:x.s.replace('USDT',''),v:x.v,c:hue(x.s)}})),tot=seg.reduce(function(s,x){return s+x.v},0)||1,al=$('dAl'),sig=seg.map(function(x){return x.k}).join();
  if(al._sig!==sig){al._sig=sig;al.innerHTML=seg.map(function(x){return '<i style="background:'+x.c+';width:0"></i>'}).join('');$('dLg').innerHTML=seg.map(function(x){return '<span style="--c:'+x.c+'">'+x.k+' <b class="lg"></b></span>'}).join('')}
  qa('i',al).forEach(function(i,n){i.style.width=(seg[n].v/tot*100)+'%'});qa('.lg',$('dLg')).forEach(function(b,n){b.textContent=nf(seg[n].v/tot*100,1)+'%'});
 }
 if(tab==='pos')v.rows.forEach(function(x){
  var c=$('dBody').querySelector('[data-p="'+x.s+'"]');if(!c)return;
  tw(c.querySelector('.v'),x.v,function(t){return nf(t,2)+' USDT'});var uu=c.querySelector('.u');uu.style.color=cl(x.u);uu.textContent=sg(x.u)+' ('+sg(x.up)+'%)';
  c.querySelector('.mk').textContent=fp(x.pr);
  var p=x.p,i=c.querySelector('.pbar i');if(i&&p.sl>0&&p.tp>0)i.style.left=Math.max(0,Math.min(100,(x.pr-p.sl)/(p.tp-p.sl)*100))+'%';
 });
}
function barUpd(){
 var t=$('dBarT'),s=$('dBarS');if(!t)return;
 if(!A){t.textContent='Mode Demo';s.textContent='Ketuk Beli untuk memulai akun demo';return}
 var c=K.cur(),p=A.pos[c.s];t.textContent='Ekuitas '+nf(eqNow(),2)+' USDT';
 s.textContent=p?(nf(p.qty,6)+' '+c.b+' ('+sg((px(c.s)*p.qty-p.cost)/p.cost*100)+'%)'):'Kas '+nf(A.cash,2)+' USDT';
}
function syncLines(){
 var s=K.cur().s,p=A&&A.pos[s],arr=[];
 if(p){arr.push({price:entry(p),color:'#2f6bff',title:'Masuk',style:2});if(p.sl>0)arr.push({price:p.sl,color:'#e5484d',title:'SL'});if(p.tp>0)arr.push({price:p.tp,color:'#16a86c',title:'TP'})}
 if(A)A.orders.forEach(function(o){if(o.s===s)arr.push({price:o.price,color:'#8b8f98',title:(o.side==='buy'?'Beli':'Jual')+' limit',style:3})});
 var sig=s+JSON.stringify(arr);if(sig===linesSig)return;linesSig=sig;K.lines(arr);
}
document.addEventListener('kyy:pair',function(){linesSig='';syncLines();barUpd()});
/* ---------- order sheet ---------- */
function r2(x){return x==null||!isFinite(x)?null:+x.toFixed(2)}
var ERR={dana:'Kas tidak cukup.',min:'Nilai order minimal 5 USDT.',sl:'Stop Loss harus di bawah harga masuk.',tp:'Take Profit harus di atas harga masuk.',pos:'Jumlah melebihi posisi Anda.',terkunci:'Sebagian posisi terkunci pada order limit.',qty:'Jumlah atau harga tidak valid.',likuid:'Kedalaman order book tidak cukup untuk ukuran ini.'};
function fetchDepth(){
 if(!O)return;var s=O.sym;
 K.rest('/api/v3/depth?symbol='+s+'&limit=20',K.SR).then(function(j){if(O&&O.sym===s&&j&&j!=='BAD'&&j.bids){depth=j;oRecalc()}}).catch(function(){});
}
function openOrder(side,sym,pct){
 if(!A){open();return}
 sym=sym||K.cur().s;var o=symObj(sym);
 if(!o||o.q!=='USDT'||o.f){K.toast('Mode demo hanya untuk pair USDT spot');return}
 if(side==='sell'&&!A.pos[sym]){K.toast('Belum ada posisi '+o.b+'. Membuka order beli.');side='buy'}
 O={side:side,type:'market',sym:sym,o:o,busy:false};depth=null;draft=null;
 $('oIc').innerHTML=K.ic(o);$('oSym').textContent=o.b+'/'+o.q;
 ['oPrice','oAmt','oSL','oTP','oNote'].forEach(function(i){$(i).value='';$(i).classList.remove('err')});
 $('oCo').hidden=true;$('oCo').innerHTML='';$('oGo').className='go';
 qa('#oPct button').forEach(function(b){b.classList.remove('on')});
 oMode();if(pct)setPct(pct);
 sheet('dOrd',true);fetchDepth();clearInterval(dtimer);dtimer=setInterval(fetchDepth,3000);
}
function oMode(){
 var o=O.o,sell=O.side==='sell',lim=O.type==='limit';
 qa('#oSide button').forEach(function(b){b.classList.toggle('on',b.dataset.s===O.side)});
 qa('#oType button').forEach(function(b){b.classList.toggle('on',b.dataset.t===O.type)});
 $('oPW').hidden=!lim;if(lim&&!$('oPrice').value){var p=px(O.sym);if(p)$('oPrice').value=String(rd(p))}
 $('oAL').textContent=sell?'Jumlah ('+o.b+')':'Jumlah (USDT)';$('oAvT').textContent=sell?'Posisi tersedia':'Kas tersedia';
 $('oRiskW').hidden=sell;
 var g=$('oGo');g.textContent=(sell?'Jual ':'Beli ')+o.b+(lim?' (Limit)':'')+' - Demo';g.style.background=sell?'var(--dn)':'var(--up)';
 oRecalc();
}
function setPct(p){
 if(!O)return;var sell=O.side==='sell',a=$('oAmt');
 if(sell){var av=E.avail(A,O.sym);a.value=p>=100?String(+av.toFixed(8)):String(E.floor(av*p/100,px(O.sym)||1))}
 else a.value=String(+(A.cash*p/100).toFixed(2));
 qa('#oPct button').forEach(function(b){b.classList.toggle('on',+b.dataset.p===p)});oRecalc();
}
function oRecalc(){
 if(!O||!A)return;
 var o=O.o,fee=A.fee,sell=O.side==='sell',lim=O.type==='limit',last=px(O.sym),eq=eqNow(),cash=A.cash,pos=A.pos[O.sym];
 $('oLast').textContent='Harga terakhir '+(last?fp(last):'-');
 var pI=num($('oPrice').value),amt=num($('oAmt').value),sl=num($('oSL').value),tp=num($('oTP').value);
 var wn=[],sm=[],qty=0,est=0,block=false,bids=depth&&depth.bids,asks=depth&&depth.asks;
 function row(l,v){sm.push('<div><span>'+l+'</span><b>'+v+'</b></div>')}
 function W(t,m){wn.push('<p class="'+t+'">'+m+'</p>')}
 qa('#oAmt,#oPrice,#oSL,#oTP').forEach(function(i){i.classList.remove('err')});
 draft=null;
 if(!(last>0)){W('e','Harga belum tersedia. Tunggu data pasar.');block=true}
 else{
  if(lim&&!(pI>0)){block=true;if($('oPrice').value)$('oPrice').classList.add('err')}
  if(!sell){
   var base=lim?(pI>0?pI:last):last,q0=amt/(1+fee)/base;
   est=lim?base:((asks&&q0>0&&E.vwap(asks,E.floor(q0,base)||q0))||last*(1+E.SLIP));
   qty=amt>0?E.floor(amt/(1+fee)/est,est):0;
   if(!lim&&asks&&qty>0&&amt<=cash+1e-9&&E.vwap(asks,qty)==null){W('e',ERR.likuid);block=true}
   if(amt>cash+1e-9){W('e','Jumlah melebihi kas tersedia.');$('oAmt').classList.add('err');block=true}
  }else{
   var av=E.avail(A,O.sym);qty=amt>=av-1e-9?av:E.floor(amt,last);
   if(amt>av+1e-9){W('e','Jumlah melebihi posisi tersedia.');$('oAmt').classList.add('err');block=true}
   est=lim?(pI>0?pI:last):((bids&&qty>0&&E.vwap(bids,qty))||last*(1-E.SLIP));
   if(!lim&&bids&&qty>0&&E.vwap(bids,qty)==null){W('e',ERR.likuid);block=true}
  }
  if(amt>0&&qty<=0){W('e','Jumlah terlalu kecil untuk pair ini.');block=true}
  var notional=qty*est;
  if(qty>0&&notional<E.MIN-1e-9&&!(sell&&pos&&qty>=pos.qty-1e-10)){W('e',ERR.min);block=true}
  if(!depth&&!lim)W('i','Mengambil kedalaman order book. Estimasi sementara memakai harga terakhir.');
  if(lim&&pI>0&&(sell?pI<=last:pI>=last))W('i','Harga limit melewati harga pasar. Order akan langsung terisi pada harga pasar atau lebih baik.');
  if(qty>0){
   var fe=qty*est*fee;row('Harga isi (estimasi)',fp(est));row('Jumlah',nf(qty,6)+' '+o.b);row('Biaya (0,1%)',nf(fe,4)+' USDT');
   if(!sell){
    row('Total',nf(qty*est+fe,2)+' USDT');
    var bad=E.valid(est,sl,tp);if(bad){W('e',bad==='sl'?ERR.sl:ERR.tp);$('o'+bad.toUpperCase()).classList.add('err');block=true}
    var rk=E.risk({qty:qty,price:est,sl:bad==='sl'?0:sl,tp:bad==='tp'?0:tp,eq:eq,cash:cash,fee:fee,atr:K.atr()||0});
    row('Impas bila harga naik','+'+nf(rk.breakEvenPct,2)+'%');
    if(sl>0&&!bad){row('Risiko jika SL kena',nf(rk.riskUSDT,2)+' USDT ('+nf(rk.riskPctEq,2)+'% ekuitas)');row('Jarak Stop Loss',nf(rk.slDistPct,2)+'%'+(rk.slDistATR?' ('+nf(rk.slDistATR,1)+' ATR)':''))}
    if(rk.rr!=null)row('Risk : Reward','1 : '+nf(rk.rr,2));
    if(!block&&!(sl>0))W('','Tanpa Stop Loss, kerugian tidak dibatasi.');
    if(!block&&rk.riskPctEq>2)W('','Risiko '+nf(rk.riskPctEq,2)+'% dari ekuitas. Banyak trader membatasi sekitar 1-2% per trade.');
    if(!block&&rk.pctEq>50)W('','Posisi ini '+nf(rk.pctEq,0)+'% dari ekuitas. Portofolio jadi sangat terkonsentrasi.');
    if(!block&&rk.rr!=null&&rk.rr<1.5)W('','Risk:reward di bawah 1:1,5 membutuhkan win rate tinggi agar tetap untung.');
    draft={pair:O.sym,sisi:'beli',tipe:lim?'limit':'market',hargaEstimasi:rd(est),jumlahKoin:qty,nilaiUSDT:r2(notional),biayaUSDT:r2(fe),persenDariKas:r2(rk.pctCash),persenDariEkuitas:r2(rk.pctEq),stopLoss:sl||null,takeProfit:tp||null,risikoUSDT:r2(rk.riskUSDT),risikoPersenEkuitas:r2(rk.riskPctEq),jarakSLPersen:r2(rk.slDistPct),jarakSLdalamATR:r2(rk.slDistATR),rasioRiskReward:r2(rk.rr),catatanPengguna:$('oNote').value.trim()||null};
   }else{
    var net=qty*est-fe,part=pos?pos.cost*(qty>=pos.qty-1e-10?1:qty/pos.qty):0,pnl=net-part;
    row('Diterima (bersih)',nf(net,2)+' USDT');row('Perkiraan untung / rugi','<span style="color:'+cl(pnl)+'">'+sg(pnl)+' USDT ('+sg(part?pnl/part*100:0)+'%)</span>');
    draft={pair:O.sym,sisi:'jual',tipe:lim?'limit':'market',hargaEstimasi:rd(est),jumlahKoin:qty,porsiPosisiPersen:pos?r2(qty/pos.qty*100):null,perkiraanUntungRugiUSDT:r2(pnl),perkiraanUntungRugiPersen:r2(part?pnl/part*100:0),catatanPengguna:$('oNote').value.trim()||null};
   }
  }
 }
 $('oSum').innerHTML=sm.join('');$('oSum').style.display=sm.length?'':'none';$('oWn').innerHTML=wn.join('');
 $('oGo').disabled=block||qty<=0||O.busy;
 $('oAv').textContent=sell?nf(E.avail(A,O.sym),6)+' '+o.b:nf(A.cash,2)+' USDT';
}
$('oSide').onclick=function(e){var b=e.target.closest('button');if(!b||!O)return;if(b.dataset.s==='sell'&&!A.pos[O.sym]){K.toast('Belum ada posisi '+O.o.b);return}O.side=b.dataset.s;$('oAmt').value='';qa('#oPct button').forEach(function(x){x.classList.remove('on')});oMode()};
$('oType').onclick=function(e){var b=e.target.closest('button');if(!b||!O)return;O.type=b.dataset.t;oMode()};
$('oPct').onclick=function(e){var b=e.target.closest('button');if(b)setPct(+b.dataset.p)};
['oPrice','oSL','oTP','oNote'].forEach(function(i){$(i).oninput=oRecalc});
$('oAmt').oninput=function(){qa('#oPct button').forEach(function(x){x.classList.remove('on')});oRecalc()};
function ref(){return (draft&&draft.hargaEstimasi)||(O?px(O.sym):0)}
$('oSLc').onclick=function(e){var b=e.target.closest('button');if(!b||!O)return;var p=ref();if(!p)return;var v=b.dataset.v,x=v==='atr'?p-1.5*(K.atr()||p*0.01):p*(1-(+v)/100);$('oSL').value=String(rd(x));oRecalc()};
$('oTPc').onclick=function(e){var b=e.target.closest('button');if(!b||!O)return;var p=ref();if(!p)return;var v=b.dataset.v,x;
 if(v==='r2'){var sl=num($('oSL').value);if(!(sl>0&&sl<p)){K.toast('Isi Stop Loss dulu untuk menghitung 2R');return}x=p+2*(p-sl)}else x=p*(1+(+v)/100);$('oTP').value=String(rd(x));oRecalc()};
$('oGo').onclick=async function(){
 if(!O||O.busy)return;oRecalc();var b=$('oGo');if(b.disabled)return;
 O.busy=true;b.disabled=true;var label=b.textContent;b.textContent='Memproses...';
 var s=O.sym,o=O.o,sell=O.side==='sell',lim=O.type==='limit',fee=A.fee,res=null,eq0=eqNow();
 var amt=num($('oAmt').value),sl=num($('oSL').value)||0,tp=num($('oTP').value)||0,note=$('oNote').value.trim(),pI=num($('oPrice').value);
 try{
  var last=px(s),pos=A.pos[s];
  if(lim){
   var qty=sell?(pos&&amt>=pos.qty-1e-9?pos.qty:E.floor(amt,last)):E.floor(amt/(1+fee)/pI,pI);
   var rkL=sell?null:E.risk({qty:qty,price:pI,sl:sl,tp:tp,eq:eq0,cash:A.cash,fee:fee,atr:0});
   res=E.limit(A,{s:s,side:O.side,qty:qty,price:pI,sl:sl,tp:tp,note:note,riskPct:sl>0&&rkL?rkL.riskPctEq:null});
  }else{
   var dj=await K.rest('/api/v3/depth?symbol='+s+'&limit=20',K.SR);
   var bk=dj&&dj!=='BAD'&&dj.bids&&dj.asks?dj:null;last=px(s);
   if(!(last>0))throw new Error('Harga belum tersedia.');
   if(!sell){
    var q0=amt/(1+fee)/last,est=(bk&&E.vwap(bk.asks,E.floor(q0,last)||q0))||last*(1+E.SLIP),qty2=E.floor(amt/(1+fee)/est,est),fill=bk?E.vwap(bk.asks,qty2):last*(1+E.SLIP);
    if(!fill)throw new Error(ERR.likuid);
    var rk2=E.risk({qty:qty2,price:fill,sl:sl,tp:tp,eq:eq0,cash:A.cash,fee:fee,atr:0});
    res=E.buy(A,s,qty2,fill,{type:'market',sl:sl,tp:tp,note:note,riskPct:sl>0?rk2.riskPctEq:null});
   }else{
    var q3=pos&&amt>=pos.qty-1e-9?pos.qty:E.floor(amt,last),fill2=bk?E.vwap(bk.bids,q3):last*(1-E.SLIP);
    if(!fill2)throw new Error(ERR.likuid);
    res=E.sell(A,s,q3,fill2,{type:'market'});
   }
  }
 }catch(e){res={ok:false,msg:e.message}}
 if(!O)return;
 O.busy=false;
 if(!res.ok){b.textContent=label;oRecalc();$('oWn').insertAdjacentHTML('afterbegin','<p class="e">'+(res.msg||ERR[res.err]||'Order gagal.')+'</p>');return}
 save();haptic();b.disabled=true;b.className='go ok';b.innerHTML=CHK;
 var t=res.trade,r=res.closed,od=res.order;
 K.toast(od?('Order limit dipasang: '+(sell?'jual ':'beli ')+o.b+' @ '+fp(od.price)):((sell?'Jual ':'Beli ')+o.b+' '+nf(t.qty,6)+' @ '+fp(t.price)));
 setTimeout(function(){closeSheet('dOrd');$('oGo').className='go';render();hero(true);syncLines();barUpd();if(r)setTimeout(function(){showResult(r)},350)},700);
};
/* ---------- SL / TP ---------- */
var S2=null;
function openSLTP(sym){
 var p=A.pos[sym];if(!p)return;S2=sym;var o=symObj(sym);
 $('sSym').textContent='SL / TP '+o.b+'/'+o.q;$('sInfo').textContent='Masuk rata-rata '+fp(entry(p))+' - sekarang '+fp(px(sym));
 $('sSL').value=p.sl>0?String(rd(p.sl)):'';$('sTP').value=p.tp>0?String(rd(p.tp)):'';$('sWn').innerHTML='';sheet('dSlt',true);
}
$('sGo').onclick=function(){
 var p=A.pos[S2];if(!p)return;var sl=num($('sSL').value)||0,tp=num($('sTP').value)||0,last=px(S2),w=$('sWn');
 if(sl>0&&sl>=last){w.innerHTML='<p class="e">Stop Loss harus di bawah harga sekarang ('+fp(last)+').</p>';return}
 if(tp>0&&tp<=last){w.innerHTML='<p class="e">Take Profit harus di atas harga sekarang ('+fp(last)+').</p>';return}
 p.sl=sl;p.tp=tp;save();closeSheet('dSlt');render();syncLines();K.toast('SL / TP diperbarui');
};
/* ---------- hasil trade ---------- */
function showResult(c){
 var win=c.pnl>=0,colr=win?'var(--up)':'var(--dn)',o=symObj(c.s)||{b:c.s,q:'USDT'};
 function cell(l,v){return '<div class="dc"><small>'+l+'</small><b>'+v+'</b></div>'}
 $('rB').innerHTML='<div class="res" style="--rc:'+colr+'"><div class="rg"><svg viewBox="0 0 24 24"><path d="'+(win?'M12 19V5M5 12l7-7 7 7':'M12 5v14M5 12l7 7 7-7')+'"/></svg></div><small style="color:var(--mu)">'+(win?'Trade ditutup dengan untung':'Trade ditutup dengan rugi')+' - '+o.b+'/'+o.q+'</small><div class="big" id="rBig" style="color:'+colr+'">0</div><div style="color:'+colr+';font-weight:700">'+sg(c.pnlPct)+'%</div>'
  +'<div class="rr">'+cell('Penutupan',RS[c.reason])+cell('Durasi',dur(c.close-c.open))+cell('Masuk rata-rata',fp(c.avgIn))+cell('Keluar rata-rata',fp(c.avgOut))+'</div>'
  +'<div class="dac"><button class="gh" id="rAI" type="button">Ulasan AI</button><button class="go" id="rOk" type="button" style="background:var(--ac)">Selesai</button></div></div>';
 sheet('dRes',true);tw($('rBig'),c.pnl,function(v){return sg(v)+' USDT'},900);haptic();
 $('rOk').onclick=function(){closeSheet('dRes')};$('rAI').onclick=function(){closeSheet('dRes');reviewOpen(c.id)};
}
/* ---------- pendamping AI ---------- */
function coachRun(box,title,prompt){
 if(coachCtl)coachCtl.abort();coachCtl=new AbortController();var ctl=coachCtl;
 box.hidden=false;box.innerHTML='<h5>'+title+'</h5><div class="cb">'+DOTS+'</div>';var out=box.querySelector('.cb');
 K.loadAI().then(function(){return window.KYY_AI.once(prompt,function(t){if(ctl===coachCtl)out.innerHTML=window.KYY_AI.md(t)},ctl.signal)}).catch(function(e){
  if(e&&e.name==='AbortError')return;
  if(e&&e.login){out.innerHTML='Masuk dulu untuk memakai AI. <button class="dbtn p" id="cLg" style="margin-top:6px">Masuk</button>';out.querySelector('#cLg').onclick=function(){window.KYY_AI.open()}}
  else out.textContent=(e&&e.message)||'AI tidak bisa menjawab saat ini.';
 });
}
$('oAI').onclick=function(){oRecalc();if(!draft){K.toast('Isi jumlah order dulu');return}coachRun($('oCo'),'Penilaian AI','Evaluasi rencana order demo saya (lihat draftOrder pada data). Nilai manajemen risiko, kesesuaian dengan kondisi pasar saat ini berdasarkan indikator dan multi-timeframe, dan sebutkan hal konkret yang bisa diperbaiki. Jawab ringkas.')};
function reviewOpen(id){
 var c=A.closed.filter(function(x){return x.id===id})[0];if(!c)return;
 review={pair:c.s,hasilUSDT:r2(c.pnl),hasilPersen:r2(c.pnlPct),hargaMasukRata2:rd(c.avgIn),hargaKeluarRata2:rd(c.avgOut),penutupan:RS[c.reason],durasi:dur(c.close-c.open),stopLoss:c.sl||null,takeProfit:c.tp||null,risikoAwalPersenEkuitas:c.riskPct==null?null:r2(c.riskPct),biayaUSDT:r2(c.fees),catatanSaatMasuk:c.note||null};
 focus=null;$('cT').textContent='Ulasan trade';sheet('dCo',true);
 coachRun($('cB'),'Ulasan AI','Ulas trade demo yang sudah selesai (lihat ulasanTrade pada data). Jelaskan apa yang berjalan baik dan kurang baik dari sisi manajemen risiko, ukuran posisi, dan eksekusi, hubungkan dengan catatan saya jika ada, lalu beri 2-3 saran konkret. Jangan menyalahkan dan jangan menjanjikan hasil.');
}
function posAI(sym){
 focus=sym;review=null;$('cT').textContent='Evaluasi posisi';sheet('dCo',true);
 coachRun($('cB'),'Evaluasi posisi','Evaluasi posisi demo terbuka saya di '+sym+' (lihat fokusPosisi pada data). Nilai apakah Stop Loss dan Take Profit masuk akal terhadap ATR dan struktur harga, apa risiko utama saat ini, dan hal apa yang perlu dipantau. Jawab ringkas.');
}
/* ---------- konteks untuk AI ---------- */
function rr(p){return p==null?null:+(+p).toPrecision(8)}
function ctx(){
 if(!A)return null;
 var v=vals(),e=v.eq,s=E.stats(A,e);
 if(!A.hist.length&&!A.orders.length&&!draft&&!review)return {mode:'demo-spot (simulasi)',status:'Akun demo dibuat tetapi belum ada transaksi',saldoAwal:r2(A.start),ekuitas:r2(e)};
 var o={mode:'demo-spot (simulasi, bukan uang sungguhan)',mataUang:'USDT',feePersenPerTransaksi:A.fee*100,saldoAwal:r2(A.start),kasTersedia:r2(A.cash),kasTerkunciOrderLimit:r2(A.locked),ekuitas:r2(e),returnPersen:r2((e-A.start)/A.start*100),
  posisiTerbuka:v.rows.map(function(x){var p=x.p;return{pair:x.s,jumlah:p.qty,hargaMasukRata2:rr(entry(p)),hargaSekarang:rr(x.pr),nilaiUSDT:r2(x.v),untungRugiBelumTerealisasiUSDT:r2(x.u),persen:r2(x.up),stopLoss:p.sl||null,takeProfit:p.tp||null,jarakKeStopLossPersen:p.sl>0?r2((x.pr-p.sl)/x.pr*100):null,porsiEkuitasPersen:r2(x.v/e*100),umur:dur(Date.now()-p.ts),catatan:p.note||null}}),
  orderLimitTerbuka:A.orders.map(function(x){return{pair:x.s,sisi:x.side==='buy'?'beli':'jual',jumlah:x.qty,harga:rr(x.price)}}),
  statistik:{jumlahTrade:s.trades,winRatePersen:r2(s.winRate),profitFactor:s.profitFactor!=null?r2(s.profitFactor):(s.pfInf?'tak terhingga':null),ekspektasiPerTradeUSDT:r2(s.expectancy),rataRataMenangUSDT:r2(s.avgWin),rataRataKalahUSDT:r2(s.avgLoss),maxDrawdownPersen:r2(s.maxDD),rataRataRisikoPerTradePersen:r2(s.avgRiskPct),persenTradeDenganStopLoss:r2(s.slUsagePct),streakKalahTerpanjang:s.maxLossStreak,totalBiayaUSDT:r2(s.fees)},
  tradeSelesaiTerakhir:A.closed.slice(-8).map(function(c){return{pair:c.s,hasilUSDT:r2(c.pnl),hasilPersen:r2(c.pnlPct),penutupan:RS[c.reason],durasi:dur(c.close-c.open),pakaiStopLoss:c.sl>0,catatan:c.note||null}}),
  catatanSimulasi:'Order market diisi menurut kedalaman order book; SL dan TP hanya dipantau saat aplikasi terbuka dan terisi dengan slippage kecil.'};
 if(draft)o.draftOrder=draft;if(review)o.ulasanTrade=review;if(focus)o.fokusPosisi=focus;
 return o;
}
/* ---------- pengaturan, ekspor ---------- */
function csv(){
 if(!A)return;
 var rows=[['waktu','pair','sisi','jumlah','harga','biaya_usdt','tipe','pnl_usdt','pnl_persen']].concat(A.hist.map(function(h){return [new Date(h.ts).toISOString(),h.s,h.side,h.qty,h.price,h.fee.toFixed(6),h.type,h.pnl==null?'':h.pnl.toFixed(6),h.pnlPct==null?'':h.pnlPct.toFixed(4)]}));
 var b=new Blob([rows.map(function(r){return r.join(',')}).join('\n')],{type:'text/csv'}),a=document.createElement('a');
 a.href=URL.createObjectURL(b);a.download='kyy-demo-jurnal.csv';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500);
}
function openSettings(){
 var h='<div class="oh"><b>Pengaturan demo</b><span class="sp"></span><button class="ib" data-cl="dSP" aria-label="Tutup">'+X+'</button></div>'
 +'<div class="dc"><small>Saldo awal akun</small><b>'+(A?nf(A.start,0)+' USDT':'Belum dibuat')+'</b></div>'
 +'<div class="dsec"><h4>Reset akun</h4><p class="dnote" style="margin-top:0">Menghapus semua posisi, order, dan riwayat, lalu mulai dari saldo baru. Ketuk dua kali untuk konfirmasi.</p><div class="dchips" id="rsC"><button data-v="1000">1.000 USDT</button><button data-v="10000">10.000 USDT</button><button data-v="100000">100.000 USDT</button></div></div>'
 +'<div class="dsec"><h4>Jurnal</h4><button class="dbtn" data-a="csv">Ekspor CSV</button></div>'
 +'<div class="dsec"><h4>Cara pakai</h4>'+GUIDE+'</div>'
 +'<div class="dsec"><h4>Cara kerja simulasi</h4><p class="dnote" style="margin-top:0">Harga dari Binance. Order market diisi menurut kedalaman order book 20 level. Order limit terisi saat harga menyentuh. Biaya 0,1% per transaksi. Stop Loss dan Take Profit hanya dipantau saat aplikasi terbuka dan terisi dengan slippage kecil. Hanya pair USDT spot. Ini bukan trading sungguhan.</p></div>';
 $('spB').innerHTML=h;
 qa('#rsC button').forEach(function(b){var t=b.textContent;b.onclick=function(){
  if(!b.dataset.cf){b.dataset.cf='1';b.textContent='Yakin? Ketuk lagi';setTimeout(function(){b.dataset.cf='';b.textContent=t},3000);return}
  A=E.create(+b.dataset.v);save();closeSheet('dSP');sparkLen=-1;setTab('sum');hero(true);barUpd();syncLines();K.toast('Akun demo direset');
 }});
 sheet('dSP',true);
}
/* ---------- aksi dashboard ---------- */
function act(e){
 var b=e.target.closest('[data-a],[data-hv],[data-t]');if(!b)return;
 var a=b.dataset.a,s=b.dataset.s;
 if(b.dataset.hv){hv=b.dataset.hv;render();return}
 if(a==='go'){close();K.dmBar(true);K.openTrade(symObj('BTCUSDT'));return}
 if(a==='start'){close();K.dmBar(true);K.openTrade(symObj('BTCUSDT'));setTimeout(function(){openOrder('buy','BTCUSDT')},550);return}
 if(a==='sell')openOrder('sell',s,+b.dataset.p);
 else if(a==='sltp')openSLTP(s);
 else if(a==='chart'){close();K.dmBar(true);K.openTrade(symObj(s))}
 else if(a==='posai')posAI(s);
 else if(a==='rev')reviewOpen(+b.dataset.id);
 else if(a==='cancel'){E.cancel(A,+b.dataset.id);save();render();syncLines();hero(true)}
 else if(a==='csv')csv();
}
$('dBody').onclick=act;$('spB').onclick=act;
$('dTabs').onclick=function(e){var b=e.target.closest('button[data-t]');if(b)setTab(b.dataset.t)};
$('dClose').onclick=function(){close()};$('dSet').onclick=openSettings;
/* ---------- loop ---------- */
var n=0;
function handle(e){
 var o=symObj(e.s)||{b:e.s};
 if(e.k==='fill')K.toast('Order limit terisi: '+(e.trade.side==='buy'?'beli ':'jual ')+o.b+' @ '+fp(e.trade.price));
 else if(e.k==='sl'||e.k==='tp'){K.toast((e.k==='sl'?'Stop Loss':'Take Profit')+' terpicu '+o.b+': '+sg(e.closed.pnl)+' USDT');if(e.closed)setTimeout(function(){showResult(e.closed)},400)}
 else if(e.k==='gagal')K.toast('Order limit dibatalkan: kas tidak cukup');
 haptic();
}
function loop(){
 if(!A)return;
 var pr={};Object.keys(A.pos).forEach(function(s){pr[s]=px(s)});A.orders.forEach(function(o){pr[o.s]=px(o.s)});
 var ev=E.tick(A,pr);
 E.sample(A,eqNow());
 if(ev.length){save();ev.forEach(handle);if(isOpen())render();syncLines()}
 else if(++n%15===0)save();
 if(isOpen())live();else barUpd();
 if(O)oRecalc();
}
function open(t){$('demo').classList.add('on');$('demo').setAttribute('aria-hidden','false');setTab(t||tab);hero(true)}
function close(){$('demo').classList.remove('on');$('demo').setAttribute('aria-hidden','true');['dOrd','dSlt','dRes','dCo','dSP'].forEach(closeSheet)}
document.addEventListener('keydown',function(e){
 if(e.key!=='Escape')return;
 var top=['dCo','dRes','dSlt','dOrd','dSP'].filter(function(id){return $(id).classList.contains('on')})[0];
 if(top)closeSheet(top);else if(isOpen())close();
});
document.addEventListener('visibilitychange',function(){if(!document.hidden)loop()});
window.KYY_DEMO={open:open,close:close,order:openOrder,ctx:ctx,sync:function(){syncLines();barUpd()},isOpen:isOpen};
setInterval(loop,1000);syncLines();barUpd();
})();
})();
