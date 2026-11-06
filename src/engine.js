// Rule-based analysis (adapted from PUREGOLD engine). Data: Binance PAXGUSDT proxy + gold-api.com XAU spot.
const HOSTS=['https://data-api.binance.vision','https://api.binance.com','https://api1.binance.com'];
async function gj(u){const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw new Error(r.status);return r.json();}
async function bn(p){let e;for(const h of HOSTS){try{return await gj(h+p);}catch(x){e=x;}}throw e;}
const kl=async(tf,n)=>(await bn(`/api/v3/klines?symbol=PAXGUSDT&interval=${tf}&limit=${n}`)).map(r=>({h:+r[2],l:+r[3],c:+r[4]}));
function ema(a,n){const k=2/(n+1);let e=a[0];return a.map(x=>e=x*k+e*(1-k));}
function rsi(c,n=14){let g=0,l=0;for(let i=1;i<c.length;i++){const d=c[i]-c[i-1],u=Math.max(d,0),w=Math.max(-d,0);if(i<=n){g+=u/n;l+=w/n}else{g=(g*(n-1)+u)/n;l=(l*(n-1)+w)/n}}return l?100-100/(1+g/l):100;}
function atr(k,n=14){let a=null;for(let i=1;i<k.length;i++){const tr=Math.max(k[i].h-k[i].l,Math.abs(k[i].h-k[i-1].c),Math.abs(k[i].l-k[i-1].c));a=a==null?tr:(a*(n-1)+tr)/n;}return a;}
function piv(k,w=3){const o=[];for(let i=w;i<k.length-w;i++){let H=1,Lo=1;for(let j=i-w;j<=i+w;j++){if(k[j].h>k[i].h)H=0;if(k[j].l<k[i].l)Lo=0;}if(H)o.push(k[i].h);if(Lo)o.push(k[i].l);}return o;}
function clu(v,tol){const o=[];v.sort((a,b)=>a-b).forEach(x=>{const q=o[o.length-1];if(q&&Math.abs(x-q[0]/q[1])<=tol){q[0]+=x;q[1]++}else o.push([x,1])});return o.map(([s,n])=>[s/n,n]);}
export async function analyze(){
 const [m15,h1,tk]=await Promise.all([kl('15m',300),kl('1h',300),bn('/api/v3/ticker/24hr?symbol=PAXGUSDT')]);
 const px=m15.at(-1).c;let spot=null;try{spot=+(await gj('https://api.gold-api.com/price/XAU')).price}catch(e){}
 const basis=spot?spot-px:0,price=spot||px;
 const c1=h1.map(x=>x.c),c15=m15.map(x=>x.c),e20=ema(c1,20).at(-1),e50=ema(c1,50).at(-1),e20m=ema(c15,20).at(-1),e50m=ema(c15,50).at(-1);
 const r1=rsi(c1),a1=atr(h1),a15=atr(m15);
 const lv=clu(piv(h1.slice(-200)).concat(piv(m15.slice(-200))),a1*0.5).map(([x,n])=>[x+basis,n]);
 const res=lv.filter(x=>x[0]>price).sort((a,b)=>a[0]-b[0]).slice(0,3),sup=lv.filter(x=>x[0]<price).sort((a,b)=>b[0]-a[0]).slice(0,3);
 let s=0;const R=[];
 const tH=(e20-e50)/a1;s+=Math.max(-1,Math.min(1,tH))*.4;R.push(tH>0?{th:'H1: EMA20 อยู่เหนือ EMA50 แนวโน้มขึ้น',en:'H1: EMA20 above EMA50, uptrend'}:{th:'H1: EMA20 อยู่ใต้ EMA50 แนวโน้มลง',en:'H1: EMA20 below EMA50, downtrend'});
 const tM=(e20m-e50m)/a15;s+=Math.max(-1,Math.min(1,tM))*.3;R.push({th:`M15: ${tM>0?'โมเมนตัมขึ้น':'โมเมนตัมลง'}`,en:`M15: momentum ${tM>0?'up':'down'}`});
 s+=Math.max(-1,Math.min(1,(r1-50)/20))*.3;R.push({th:`RSI H1 ${r1.toFixed(0)}${r1>70?' ซื้อมากเกิน ระวังย่อ':r1<30?' ขายมากเกิน ระวังเด้ง':''}`,en:`RSI H1 ${r1.toFixed(0)}${r1>70?' overbought, watch pullback':r1<30?' oversold, watch bounce':''}`});
 const conf=Math.round(Math.min(90,50+Math.abs(s)*45)),dir=s>.2?'up':s<-.2?'down':'side';
 const side=s>=0?'BUY':'SELL',sn=side==='BUY'?1:-1,ref=side==='BUY'?sup[0]:res[0];
 let sl=1.5*a15;if(ref&&Math.abs(price-ref[0])<2.5*a15)sl=Math.max(sl,Math.abs(price-ref[0])+.3*a15);sl=Math.min(sl,3*a15);
 const r=x=>Math.round(x*100)/100;
 return{price:r(price),ch:+tk.priceChange,chp:+tk.priceChangePercent,res,sup,bias:{dir,conf,reasons:R},
  plan:{side,hyp:dir==='side',e1:r(price-sn*.25*a15),e2:r(price),sl:r(price-sn*sl),tp:r(price+sn*sl*2),rr:2}};
}
