/*__LAND__*/

/* ===================== 基础：自适应缩放 / 时钟 ===================== */
const stage=document.getElementById('stage');
/* ---------- 平板 / 手机：强制横屏渲染 ----------
   触屏设备处于竖屏时，给 body 加 .fl，#fit 以 CSS transform 旋转 90° 并铺满屏幕，
   舞台拿到的是「宽 ≥ 高」的横屏视口，因此任何浏览器（安卓 / iOS / 鸿蒙 / 夸克 / 微信内置）
   都能得到满屏横版画面，不依赖 screen.orientation.lock。 */
let FL=false;
function isTouch(){
  try{return !!(navigator.maxTouchPoints>0||(matchMedia&&matchMedia('(pointer:coarse)').matches));}
  catch(e){return navigator.maxTouchPoints>0;}
}
function sysPortrait(){
  var a=null;
  if(screen.orientation&&typeof screen.orientation.angle==='number')a=screen.orientation.angle;
  else if(typeof window.orientation==='number')a=window.orientation;
  if(a===null)return innerWidth<innerHeight;   /* 拿不到方向信息时用视口比例兜底 */
  return Math.abs(a%180)!==90;
}
function flApply(){
  /* 三重判定：触屏 + 系统方向为竖 + 视口实际也是竖（宽<高）。
     第三个条件是兜底：个别浏览器横屏时 angle 上报不准，若视口已是横屏（宽≥高）
     说明内容已正确显示，绝不再旋转（否则会越转越窄）。 */
  var need=isTouch()&&sysPortrait()&&(innerWidth<innerHeight);
  if(need!==FL){FL=need;document.body.classList.toggle('fl',FL);}
}
function vpSize(){
  const vv=window.visualViewport;
  let w,h;
  if(vv&&vv.width>0){w=vv.width;h=vv.height;}
  else{const de=document.documentElement;w=de.clientWidth||innerWidth;h=de.clientHeight||innerHeight;}
  /* 强制横屏模式下，旋转后舞台实际拿到的是长边×短边 */
  if(FL){return{w:Math.max(w,h,1),h:Math.max(Math.min(w,h),1)};}
  return{w:Math.max(w,1),h:Math.max(h,1)};
}
let fitRaf=0;
function fit(){
  flApply();
  const{w,h}=vpSize();const s=Math.min(w/1920,h/1080);
  stage.style.transform='scale('+s+')';
  /* 非全屏时让页面背景与舞台无缝衔接，避免两侧生硬黑边 */
  const offY=Math.max(0,(h-1080*s)/2),offX=Math.max(0,(w-1920*s)/2);
  stage.style.boxShadow='0 0 '+(Math.max(offX,offY)+80)+'px '+(Math.max(offX,offY)+40)+'px #050a15';
  if(typeof rotSync==='function')rotSync();
}
function fitSoon(){cancelAnimationFrame(fitRaf);fitRaf=requestAnimationFrame(()=>requestAnimationFrame(fit));}
addEventListener('resize',fitSoon);
/* 尺寸变化后重绘当前页的静态画布（感知/推演等非逐帧页面），防止内容不随布局缩放 */
let _reEnterTo=0;
addEventListener('resize',()=>{clearTimeout(_reEnterTo);
  _reEnterTo=setTimeout(()=>{if(typeof ENTERS!=='undefined'&&typeof cur!=='undefined'&&ENTERS[cur])ENTERS[cur]();},180);});
addEventListener('orientationchange',function(){setTimeout(fit,60);setTimeout(fit,350);setTimeout(fit,800);});
if(window.visualViewport)visualViewport.addEventListener('resize',fitSoon);

/* ===================== 全屏 ===================== */
function isFS(){return !!(document.fullscreenElement||document.webkitFullscreenElement||document.webkitCurrentFullScreenElement);}
function fsToggle(){
  var de=document.documentElement;
  if(isFS()){
    try{var ex=document.exitFullscreen||document.webkitExitFullscreen||document.webkitCancelFullScreen;
        if(ex)ex.call(document);}catch(e){}
    return;
  }
  var rq=de.requestFullscreen||de.webkitRequestFullscreen||de.webkitRequestFullScreen||de.mozRequestFullScreen||de.msRequestFullscreen;
  if(!rq)return;
  try{var p=rq.call(de,{navigationUI:'hide'});if(p&&p.catch)p.catch(function(){try{rq.call(de);}catch(e){}});}
  catch(e){try{rq.call(de);}catch(e2){}}
}
function lockLand(){ /* 能锁就锁，锁不了也不影响（已有 CSS 强制横屏兜底） */
  try{
    if(screen.orientation&&screen.orientation.lock){
      var p=screen.orientation.lock('landscape');
      if(p&&p.catch)p.catch(function(){});
    }
  }catch(e){}
}
function fsBtnSync(){
  var b=document.getElementById('fsBtn');
  if(b)b.textContent=isFS()?'⤡ 退出全屏':'⛶ 全屏';
}
['fullscreenchange','webkitfullscreenchange','msfullscreenchange'].forEach(function(ev){
  document.addEventListener(ev,function(){setTimeout(fit,80);setTimeout(fit,350);if(isFS())lockLand();fsBtnSync();});
});
/* 触屏设备首次交互时自动尝试进入全屏（浏览器要求必须在用户手势里触发） */
(function(){
  if(!isTouch())return;
  document.body.classList.add('tch');
  var tries=0;
  function once(){
    if(isFS())return;
    if(tries++>=3)return;
    setTimeout(function(){if(!isFS())fsToggle();},20);
  }
  ['touchend','pointerdown','click'].forEach(function(ev){
    document.addEventListener(ev,once,{passive:true});
  });
})();

/* ===================== 触屏滑动翻页 =====================
   平板/手机上，小尺寸底栏按钮不便点按 → 支持滑屏翻页。
   普通横屏：左右滑；竖屏强制横屏（FL）时内容横轴映射到屏幕纵轴 → 上下滑。 */
(function(){
  if(!isTouch())return;
  var x0=0,y0=0,t0=0,active=false;
  document.addEventListener('touchstart',function(e){
    if(!e.changedTouches||!e.changedTouches.length)return;
    var t=e.changedTouches[0];
    x0=t.clientX;y0=t.clientY;t0=Date.now();active=true;
  },{passive:true});
  document.addEventListener('touchcancel',function(){active=false;},{passive:true});
  document.addEventListener('touchend',function(e){
    if(!active)return;active=false;
    var t=e.changedTouches[0];
    var dx=t.clientX-x0,dy=t.clientY-y0,dt=Date.now()-t0;
    if(dt>900)return;                        /* 慢拖不算滑屏 */
    var go2=null;
    if(FL){
      /* 强制横屏：屏幕上滑 = 内容左滑（下一页），下滑 = 上一页 */
      if(Math.abs(dy)>64&&Math.abs(dx)<50)go2=(dy<0)?1:-1;
    }else{
      if(Math.abs(dx)>64&&Math.abs(dy)<50)go2=(dx<0)?1:-1;
    }
    if(go2===null)return;
    if((typeof auto!=='undefined')&&auto)stopAuto();   /* 手动接管时停下自动演示 */
    page(go2);
  },{passive:true});
})();

/* ===================== 竖屏提示 =====================
   已强制横屏 → 顶部轻提示（4.5 秒自动消失，不挡画面）；
   极端情况下强制横屏未生效 → 退回整屏引导。 */
let rotDismissed=false,rotTimer=null;
function rotSync(){
  var hint=document.getElementById('rotHint');if(!hint)return;
  var touch=isTouch(),por=sysPortrait()&&(innerWidth<innerHeight);  /* 与 flApply 同口径：视口横屏时永不提示 */
  if(!touch||!por||rotDismissed||isFS()){hint.classList.remove('show');return;}
  hint.classList.toggle('toast',FL);
  hint.classList.add('show');
  if(FL){
    clearTimeout(rotTimer);
    rotTimer=setTimeout(function(){hint.classList.remove('show');},4500);
  }
}
document.getElementById('rotSkip').onclick=function(){rotDismissed=true;rotSync();};
fit();
function cvFit(cv){const r=cv.getBoundingClientRect(),d=devicePixelRatio||1;
  cv.width=Math.round(r.width*d);cv.height=Math.round(r.height*d);return d;}
const WEEK=['日','一','二','三','四','五','六'];
function tickClock(){const d=new Date();const p=n=>String(n).padStart(2,'0');
  document.getElementById('clock').textContent=
    d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' 周'+WEEK[d.getDay()]+' · '+
    p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds());}
tickClock();setInterval(tickClock,1000);

/* ===================== 场景调度 ===================== */
const NAMES=['首页','战略总览','感 · 感知','通 · 通信','算 · 算力','用 · 应用','全链路推演','实景视频墙','AI 驾驶舱','路线与成效','星座沙盘','来用卫星吧'];
const scenes=[...document.querySelectorAll('.scene')];
let cur=0;
const dots=document.getElementById('dots');
scenes.forEach((s,i)=>{const d=document.createElement('div');d.className='dot';d.innerHTML='<i>'+NAMES[i]+'</i>';
  d.onclick=()=>go(i);dots.appendChild(d);});
function go(i){
  if(i<0||i>=scenes.length)return;
  const prev=cur;
  scenes[cur].classList.remove('on');cur=i;scenes[i].classList.add('on');
  [...dots.children].forEach((d,k)=>d.classList.toggle('on',k===i));
  document.getElementById('pno').textContent=(i+1)+'/'+scenes.length;
  if(prev!==i)onLeave(prev);
  onEnter(i);
}
function page(d){go(cur+d<0?0:Math.min(scenes.length-1,cur+d));}
addEventListener('keydown',e=>{
  if(e.key==='ArrowRight'){page(1)} if(e.key==='ArrowLeft'){page(-1)}
  if(e.key==='p'||e.key==='P'){toggleAuto()}
  if(/^[1-9]$/.test(e.key))go(+e.key);
  if(e.key==='0')go(9);
});
const ENTERS=[],LEAVES=[];
function onEnter(i){ if(ENTERS[i])ENTERS[i](); }
function onLeave(i){ if(LEAVES[i])LEAVES[i](); }

/* ===================== 数字滚动 ===================== */
function countUp(el,to,dur=1400,suf='',dec=0){
  const t0=performance.now();
  (function tick(t){const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);
    el.textContent=(to*e).toFixed(dec)+suf; if(k<1)requestAnimationFrame(tick);})(t0);
}

/* ===================== 程序化噪声 ===================== */
function hash(x,y){let n=Math.sin(x*127.1+y*311.7+7.3)*43758.5453;return n-Math.floor(n);}
function vn(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;
  const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash(xi,yi),b=hash(xi+1,yi),c=hash(xi,yi+1),d=hash(xi+1,yi+1);
  return a*(1-u)*(1-v)+b*u*(1-v)+c*(1-u)*v+d*u*v;}
function fbm(x,y,o=4){let s=0,a=.5,f=1;for(let i=0;i<o;i++){s+=a*vn(x*f,y*f);f*=2;a*=.5;}return s;}

/* ===================== 地球（正交投影 + 卫星轨道） ===================== */
class Globe{
  constructor(cv,opt={}){this.cv=cv;this.R=opt.R||300;this.cx=opt.cx||0;this.cy=opt.cy||0;
    this.cx2=opt.cx2||0;this.cy2=opt.cy2||0;this.rot=0;this.spin=opt.spin||.0022;
    this.sats=opt.sats||[];this.stations=opt.stations||[];this.stars=opt.stars!==false;
    this.showOrbit=opt.showOrbit!==false;this.t=0;
    this.pts=[];for(let i=0;i<520;i++)this.pts.push({x:Math.random(),y:Math.random(),r:Math.random()*1.3+.2,a:Math.random()*.6+.2,p:Math.random()*6.28});
    this.start();}
  proj(lon,lat){const R=this.R,a=(lon*Math.PI/180)+this.rot,b=lat*Math.PI/180;
    const x=R*Math.cos(b)*Math.sin(a),y=-R*Math.sin(b),z=Math.cos(b)*Math.cos(a);return[x,y,z];}
  draw(){
    const cv=this.cv,d=cvFit(cv),g=cv.getContext('2d');
    const W=cv.width/d,H=cv.height/d;g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,W,H);
    const cx=this.cx||W/2+this.cx2, cy=this.cy||H/2+this.cy2, R=this.R;
    // 星空
    if(this.stars){this.pts.forEach(p=>{const a=p.a*(.6+.4*Math.sin(this.t*.02+p.p));
      g.fillStyle='rgba(180,215,255,'+a+')';g.beginPath();g.arc(p.x*W,p.y*H,p.r,0,6.283);g.fill();});}
    // 大气辉光
    let gr=g.createRadialGradient(cx,cy,R*.85,cx,cy,R*1.5);
    gr.addColorStop(0,'rgba(60,150,255,.30)');gr.addColorStop(.35,'rgba(40,110,220,.10)');gr.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=gr;g.beginPath();g.arc(cx,cy,R*1.5,0,6.283);g.fill();
    // 海洋球
    gr=g.createRadialGradient(cx-R*.35,cy-R*.4,R*.1,cx,cy,R);
    gr.addColorStop(0,'#12406e');gr.addColorStop(.55,'#0a274a');gr.addColorStop(1,'#04101f');
    g.fillStyle=gr;g.beginPath();g.arc(cx,cy,R,0,6.283);g.fill();
    // 经纬网
    g.strokeStyle='rgba(120,190,255,.10)';g.lineWidth=1;
    for(let lat=-60;lat<=60;lat+=30){g.beginPath();let f=0;
      for(let lon=-180;lon<=180;lon+=4){const[x,y,z]=this.proj(lon,lat);if(z<=0){f=0;continue;}
        if(!f){g.moveTo(cx+x,cy+y);f=1;}else g.lineTo(cx+x,cy+y);}g.stroke();}
    for(let lon=-180;lon<180;lon+=30){g.beginPath();let f=0;
      for(let lat=-90;lat<=90;lat+=4){const[x,y,z]=this.proj(lon,lat);if(z<=0){f=0;continue;}
        if(!f){g.moveTo(cx+x,cy+y);f=1;}else g.lineTo(cx+x,cy+y);}g.stroke();}
    // 陆地
    LAND.forEach(ring=>{
      let vis=false;const pts=[];
      for(let i=0;i<ring.length;i+=2){const[x,y,z]=this.proj(ring[i],ring[i+1]);pts.push([x,y,z]);if(z>0)vis=true;}
      if(!vis)return;
      g.beginPath();let f=0;
      for(const[x,y,z] of pts){if(z<=0){f=0;continue;}if(!f){g.moveTo(cx+x,cy+y);f=1;}else g.lineTo(cx+x,cy+y);}
      g.closePath();g.fillStyle='rgba(37,140,120,.55)';g.fill();
      g.strokeStyle='rgba(90,240,210,.55)';g.lineWidth=1.1;g.stroke();});
    // 轨道
    if(this.showOrbit)this.sats.forEach(s=>{
      const inc=s.inc*Math.PI/180;g.lineWidth=1;
      for(let k=0;k<160;k++){const th=k/160*6.283,th2=(k+1)/160*6.283;
        const p1=this.orb(th,s,inc),p2=this.orb(th2,s,inc);
        if(p1[2]<0&&p2[2]<0)continue;
        g.strokeStyle='rgba('+s.col+',.'+(p1[2]>0?.42:.10)+')';
        g.beginPath();g.moveTo(cx+p1[0],cy+p1[1]);g.lineTo(cx+p2[0],cy+p2[1]);g.stroke();}});
    // 地面站
    this.stations.forEach(st=>{const[x,y,z]=this.proj(st.lon,st.lat);if(z<=0)return;
      const px=cx+x,py=cy+y;
      const pr=(this.t*1.6%40);g.strokeStyle='rgba(255,204,92,'+(.5-pr/80)+')';g.lineWidth=1.6;
      g.beginPath();g.arc(px,py,pr*R/300,0,6.283);g.stroke();
      g.fillStyle='#ffcc5c';g.beginPath();g.arc(px,py,3,0,6.283);g.fill();
      g.fillStyle='rgba(255,230,170,.85)';g.font='600 12px sans-serif';g.fillText(st.name,px+7,py-5);});
    // 卫星 + 波束
    this.sats.forEach(s=>{const inc=s.inc*Math.PI/180;
      const th=this.t*s.sp+s.ph, p=this.orb(th,s,inc);
      const px=cx+p[0],py=cy+p[1];
      if(p[2]>0){ // 波束覆盖圈（地面投影近似）
        const bx=px,by=py,bw=s.beam*R/60*(1+p[2]*.5);
        gr=g.createRadialGradient(bx,by,0,bx,by,bw);
        gr.addColorStop(0,'rgba('+s.col+',.30)');gr.addColorStop(1,'rgba('+s.col+',0)');
        g.fillStyle=gr;g.beginPath();g.arc(bx,by,bw,0,6.283);g.fill();
        g.strokeStyle='rgba('+s.col+',.55)';g.lineWidth=1;g.beginPath();g.arc(bx,by,bw,0,6.283);g.stroke();}
      g.save();g.translate(px,py);
      g.fillStyle=p[2]>0?'#ffffff':'#6a8299';g.shadowColor='rgba('+s.col+',.9)';g.shadowBlur=14;
      g.beginPath();g.arc(0,0,p[2]>0?4.2:3,0,6.283);g.fill();g.restore();
      if(p[2]>0&&s.label){g.fillStyle='rgba('+s.col+',.95)';g.font='600 12px sans-serif';g.fillText(s.label,px+8,py+4);}});
    // 边缘暗角
    gr=g.createRadialGradient(cx,cy,R*.6,cx,cy,R*1.02);
    gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(2,6,14,.85)');
    g.fillStyle=gr;g.beginPath();g.arc(cx,cy,R,0,6.283);g.fill();
    g.strokeStyle='rgba(120,210,255,.35)';g.lineWidth=1.4;g.beginPath();g.arc(cx,cy,R,0,6.283);g.stroke();
    this.rot+=this.spin;this.t+=.016;requestAnimationFrame(()=>this.draw());
  }
  orb(th,s,inc){const raan=s.raan*Math.PI/180-this.rot*0;
    const ct=Math.cos(th),st=Math.sin(th);
    const x=Math.cos(raan)*ct-Math.sin(raan)*st*Math.cos(inc);
    const y=st*Math.sin(inc);
    const z=Math.sin(raan)*ct+Math.cos(raan)*st*Math.cos(inc);
    const R=this.R*(1+s.alt);return[x*R,y*R,z];}
  start(){requestAnimationFrame(()=>this.draw());}
}
const SATS=[
  {raan:20,inc:98,alt:.16,sp:.010,ph:0,col:'37,230,192',beam:16,label:'遥感-01 SAR'},
  {raan:110,inc:45,alt:.24,sp:.014,ph:2.1,col:'63,169,255',beam:22,label:'低轨通信-A'},
  {raan:200,inc:53,alt:.30,sp:.009,ph:4.0,col:'169,123,255',beam:26,label:'低轨通信-B'},
  {raan:290,inc:20,alt:.42,sp:.005,ph:1.2,col:'255,182,61',beam:34,label:'高通量-HTS'}
];
const STATIONS=[{lon:116.4,lat:39.9,name:'北京站'},{lon:75.9,lat:39.5,name:'喀什站'},{lon:109.5,lat:18.3,name:'三亚站'},{lon:130.3,lat:46.8,name:'佳木斯站'}];
new Globe(document.getElementById('globeHero'),{R:352,cx2:0,cy2:70,sats:SATS,stations:STATIONS});

/* 封面 KPI */
ENTERS[0]=()=>{countUp(document.getElementById('k1'),86,1600);countUp(document.getElementById('k2'),25,1600);
  countUp(document.getElementById('k3'),99,1600,'%');countUp(document.getElementById('k4'),4,900);};

/* ===================== S2 感知成像沙盘 ===================== */
const SENSORS={
  opt:{t:'可见光 · 亚米级成像',b:'0.4–0.9 μm',d:'最接近人眼的成像方式，分辨率可达 0.3 m，用于地物识别、变化检测、违法建设核查。致命短板：云雾与夜间完全失效。',
    p:['0.3 m 分辨率','地物识别','变化检测','✕ 怕云','✕ 怕黑']},
  sar:{t:'SAR 合成孔径雷达',b:'C/X 波段 · 主动成像',d:'主动发射微波并接收回波，云层、雨雪、夜暗全部穿透，全天候全天时。水体呈暗色、城市建筑呈强反射亮斑，是洪涝淹没范围提取的首选手段。',
    p:['全天候全天时','穿云透雨','淹没范围','形变监测','✓ 不受云影响']},
  ir:{t:'红外热成像 · 火点识别',b:'3–5 μm / 8–12 μm',d:'直接探测地表热辐射，可在烟雾遮挡下识别明火与暗火，亚像元火点温度反演，是森林草原火灾早期发现的核心载荷。',
    p:['穿透烟雾','明火/暗火','亚像元火点','夜间可用','早期预警']},
  hyp:{t:'高光谱 · 物质指纹识别',b:'400+ 连续波段',d:'每个像元都有连续光谱曲线，可识别「是什么物质」而非仅「是什么形状」：作物胁迫、水质水华、矿物填图、伪装识别。',
    p:['物质识别','作物胁迫','水质反演','矿物填图','伪装识别']},
  insar:{t:'InSAR 干涉形变监测',b:'毫米级 · 相位差分',d:'两次成像的相位差分反演地表形变，精度达毫米级。大坝、桥梁、矿区、城市地面沉降的大范围低成本体检手段。',
    p:['毫米级精度','大坝/桥梁','地面沉降','矿区形变','大范围体检']}
};
let senMode='opt',cloud=20;
const senCv=document.getElementById('senseCv');
let senBase=null,senW=0,senH=0;
/* 真实影像底图缓存：加载完成后自动重绘当前模式 */
var senImgCache={};
function senImgGet(mode){
  if(!(typeof SEN_IMG_SRC!=='undefined'&&SEN_IMG_SRC[mode]))return null;
  let im=senImgCache[mode];
  if(!im){im=new Image();im.onload=function(){drawSense2();};im.src=SEN_IMG_SRC[mode];senImgCache[mode]=im;}
  return im;
}
function buildBase(){
  const d=cvFit(senCv),W=senCv.width/d,H=senCv.height/d;senW=W;senH=H;
  senBase=new Float32Array(Math.floor(W/3)*Math.floor(H/3));
  let i=0;for(let y=0;y<H;y+=3)for(let x=0;x<W;x+=3){senBase[i++]=fbm(x/140,y/140,5);}
}
function drawSense2(){
  const d=cvFit(senCv),g=senCv.getContext('2d');
  const W=senCv.width/d,H=senCv.height/d;
  /* 画布尺寸变化（全屏切换 / 平板旋转 / 窗口缩放）时自动重建底图，修复不随布局缩放的问题 */
  if(!senBase||Math.abs(W-senW)>2||Math.abs(H-senH)>2)buildBase();
  g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,W,H);
  const senPhoto=senImgGet(senMode);
  if(senPhoto&&senPhoto.complete&&senPhoto.naturalWidth){
    /* 真实影像底图：cover 裁剪，铺满画布自适应 */
    const iw=senPhoto.naturalWidth,ih=senPhoto.naturalHeight;
    const sc=Math.max(W/iw,H/ih),sw=W/sc,sh=H/sc;
    g.drawImage(senPhoto,(iw-sw)/2,(ih-sh)/2,sw,sh,0,0,W,H);
    if(senMode==='opt'&&cloud>0){          /* 云量滑杆仍作用于光学影像 */
      const cstep=6,ccols=Math.floor(W/cstep),crows=Math.floor(H/cstep);
      for(let cy=0;cy<crows;cy++)for(let cx=0;cx<ccols;cx++){
        const c=fbm(cx/19+11,cy/19+7,4);
        if(c>.62-cloud/100*.55){const a=Math.min(1,(c-(.62-cloud/100*.55))/.22+cloud/100*.3);
          g.fillStyle='rgba(245,248,252,'+a.toFixed(2)+')';g.fillRect(cx*cstep,cy*cstep,cstep+1,cstep+1);}
      }
    }
  }else{
  const step=3,cols=Math.floor(W/step),rows=Math.floor(H/step);
  for(let ry=0;ry<rows;ry++)for(let rx=0;rx<cols;rx++){
    const h=senBase[ry*cols+rx],fx=rx/cols,fy=ry/rows;
    let r,gg,b;
    if(senMode==='opt'){
      if(h<.40){r=26;gg=62;b=105;}                    // 水体
      else if(h<.47){r=52;gg=104;b=96;}                // 滩涂
      else if(h<.60){r=58+Math.floor(h*40);gg=110+Math.floor(h*50);b=62;}
      else {r=110+Math.floor(h*70);gg=118+Math.floor(h*60);b=86;}  // 裸土/山脊
    }else if(senMode==='sar'){
      const v=h*.85+hash(rx*1.7,ry*2.3)*.28;           // 斑点噪声
      let s;if(h<.40)s=18+v*8; else if(h<.47)s=40+v*18; else s=90+Math.floor(v*150);
      r=gg=b=Math.min(255,s);
    }else if(senMode==='ir'){
      const t=h*.5+.45+hash(rx*3.1,ry*1.3)*.06;
      let s=t;
      r=Math.min(255,Math.floor(60+s*150));gg=Math.min(255,Math.floor(20+s*90));b=Math.floor(30+s*20);
    }else if(senMode==='hyp'){
      const cls=Math.floor(fbm(rx/26,ry/26,3)*5);
      const pal=[[150,70,200],[60,190,150],[220,180,60],[90,120,220],[200,90,110]];
      r=pal[cls][0]+Math.floor(h*30);gg=pal[cls][1]+Math.floor(h*30);b=pal[cls][2]+Math.floor(h*30);
    }else{ // insar 干涉条纹
      const fr=Math.sin((Math.hypot(fx-.55,fy-.48)*46)+(fbm(rx/50,ry/50,2)*3));
      const v=(fr+1)/2;
      const pal=[[20,40,120],[40,140,220],[240,240,220],[230,140,60],[150,30,60]];
      const k=Math.min(4,Math.floor(v*5));r=pal[k][0];gg=pal[k][1];b=pal[k][2];
    }
    // 火场（光学/红外可见；SAR 略显示边界）
    let d2=Math.hypot(fx-.58,fy-.46);
    if(senMode==='ir'&&d2<.16){const inten=1-d2/.16;
      r=Math.min(255,r+inten*230);gg=Math.min(255,gg+inten*150*(d2<.06?1:.35));b=Math.min(255,b+inten*40);}
    if(senMode==='opt'&&d2<.13){const inten=1-d2/.13;
      r=Math.min(255,r+inten*150);gg=Math.min(255,gg+inten*40);b=Math.min(255,b+inten*10);}
    // 云层（仅光学受影响）
    if(senMode==='opt'){
      const c=fbm(rx/38+11,ry/38+7,4);
      if(c>.62-cloud/100*.55){const a=Math.min(1,(c-(.62-cloud/100*.55))/.22+cloud/100*.3);
        r=r+(245-r)*a;gg=gg+(248-gg)*a;b=b+(252-b)*a;}
    }
      g.fillStyle='rgb('+(r|0)+','+(gg|0)+','+(b|0)+')';
    g.fillRect(rx*step,ry*step,step+1,step+1);
  }
  }
  // 扫描线 + 网格
  g.strokeStyle='rgba(120,220,255,.10)';g.lineWidth=1;
  for(let i=1;i<6;i++){g.beginPath();g.moveTo(0,H*i/6);g.lineTo(W,H*i/6);g.moveTo(W*i/6,0);g.lineTo(W*i/6,H);g.stroke();}
  // AI 检测框
  if(senMode==='ir'||senMode==='opt'||senMode==='sar'){
    const boxes=[[.52,.38,.10,.075],[.60,.50,.08,.062]];
    boxes.forEach((b,i)=>{
      const x=b[0]*W,y=b[1]*H,w=b[2]*W,h=b[3]*H;
      g.strokeStyle='rgba(255,204,92,.95)';g.lineWidth=2;g.strokeRect(x,y,w,h);
      g.fillStyle='rgba(255,204,92,.95)';g.font='700 13px sans-serif';
      g.fillText(senMode==='sar'?'水体边界 0.96':'火点 0.98',x+2,y-6);
      g.fillStyle='rgba(255,204,92,.10)';g.fillRect(x,y,w,h);});
  }
  // 顶部信息条
  g.fillStyle='rgba(3,8,16,.72)';g.fillRect(0,0,W,38);
  g.fillStyle='#8fe6d8';g.font='600 15px sans-serif';
  g.fillText('SAT-01 轨道高度 500 km · 幅宽 '+(senMode==='sar'?'100':'16')+' km · '+(new Date().getHours()>18||new Date().getHours()<6?'夜间成像':(cloud>60?'云层覆盖 '+cloud+'%':'晴好')) ,14,25);
  g.fillStyle=cloud>60&&senMode==='opt'?'#ff8a92':'#25e6c0';
  g.fillText(cloud>60&&senMode==='opt'?'● 光学失效 — 需调用 SAR':'● 数据有效',W-190,25);
}
document.querySelectorAll('.sbtn[data-s]').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.sbtn[data-s]').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');senMode=b.dataset.s;setSenInfo();drawSense2();});
function setSenInfo(){const s=SENSORS[senMode];
  document.getElementById('senTitle').textContent=s.t;document.getElementById('senBand').textContent=s.b;
  document.getElementById('senDesc').textContent=s.d;
  document.getElementById('senPills').innerHTML=s.p.map(x=>'<span class="pill'+(x.includes('✓')||x.includes('✕')?' hi':'')+'">'+x+'</span>').join('');}
document.getElementById('cloudSlider').oninput=e=>{cloud=+e.target.value;
  document.getElementById('cloudVal').textContent=cloud+'%';drawSense2();};
ENTERS[2]=()=>{if(!senBase){buildBase();}setSenInfo();drawSense2();};

/* ===================== S3 通信链路沙盘 ===================== */
/* ===================== S3 通信：等比世界地图 / 链路择优 / 实时解说 ===================== */
const mapCv=document.getElementById('mapCv');
const LOCS=[
  {n:'城市核心区（北京）',lon:116.4,lat:39.9,type:'city',d:'地面公网密集覆盖，5G / 光纤完全可用 —— 卫星在此作为备份与容量补充。'},
  {n:'长三角城市群（上海）',lon:121.5,lat:31.2,type:'city',d:'地面网络最发达地区之一，时延最低、成本最低，优先走地面链路。'},
  {n:'粤港澳大湾区（深圳）',lon:114.1,lat:22.5,type:'city',d:'城市核心区，光纤与海缆资源丰富，卫星仅作应急备份。'},
  {n:'西南枢纽（成都）',lon:104.1,lat:30.7,type:'city',d:'城内地面条件好，但由此向西进入山区后信号迅速衰减 —— 与相邻点位对比最有说服力。'},
  {n:'青藏高原无人区',lon:84.0,lat:33.5,type:'mountain',d:'海拔 5000 m 以上、基站覆盖为零。地面手段进不去，只有卫星能看见、能连通。'},
  {n:'塔克拉玛干沙漠腹地',lon:83.5,lat:39.0,type:'mountain',d:'流动沙丘区，无任何公网覆盖；星载 SAR + 卫星链路是唯一可用手段。'},
  {n:'三江源高寒草甸',lon:96.5,lat:34.0,type:'mountain',d:'生态敏感区，地面巡检成本极高，靠卫星定期普查与 AI 变化检测替代人工。'},
  {n:'横断山区深切峡谷',lon:99.2,lat:28.0,type:'mountain',d:'地形遮蔽严重，地面通信盲区连片，又是地质灾害高发带。'},
  {n:'大兴安岭原始林区',lon:122.7,lat:52.3,type:'mountain',d:'林火高风险区，无网无路；火点只能由卫星红外载荷第一时间捕获。'},
  {n:'南海岛礁',lon:114.0,lat:16.0,type:'island',d:'海缆脆弱、地面站稀少，日常通信依赖高通量卫星，应急备份同样靠天基。'},
  {n:'地震震中（三断灾区）',lon:103.4,lat:31.0,type:'quake',d:'典型「三断」场景：基站损毁、光缆中断、道路不通 —— 卫星通信是唯一生命线。'},
  {n:'森林火场（滇中林区）',lon:101.0,lat:25.5,type:'quake',d:'火线推进快、公网随电力一起中断；热成像切片必须在 AI 调度下插队优先回传。'},
  {n:'西太平洋远洋（130°E）',lon:130.0,lat:20.0,type:'ocean',d:'公海海域无任何地面网络，船舶遇险时卫星是唯一的求救与指挥通道。'},
  {n:'印度洋主航道',lon:75.0,lat:-15.0,type:'ocean',d:'远洋航运走廊，离岸数千公里，除天基链路外别无选择。'},
  {n:'北大西洋航线',lon:-40.0,lat:40.0,type:'ocean',d:'洲际航线中段，岸基通信完全失效，只能由卫星中继。'},
  {n:'北冰洋航道',lon:90.0,lat:80.0,type:'ocean',d:'极区地面站稀少、电离层扰动强，最考验链路调度的鲁棒性。'},
  {n:'撒哈拉沙漠腹地',lon:12.0,lat:23.0,type:'remote',d:'全球最大无人区之一，仅存少量绿洲聚落，公网几近为零。'},
  {n:'亚马逊雨林腹地',lon:-62.0,lat:-4.0,type:'remote',d:'常年云雨覆盖，可见光频繁失效 —— 只有 SAR 成像配合低轨通信才有意义。'},
  {n:'西澳内陆荒漠',lon:122.0,lat:-25.0,type:'remote',d:'地广人稀，地面站间距上千公里，是典型的天基优先场景。'},
  {n:'落基山脉无人区',lon:-115.0,lat:45.0,type:'remote',d:'地形复杂、公网稀疏，应急救灾往往需要临时开设卫星链路。'}
];
const LINK={
  city:{'5g':{ok:1,ms:'18 ms'},leo:{ok:1,ms:'32 ms'},hts:{ok:1,ms:'280 ms'},bd:{ok:1,ms:'3 s'}},
  mountain:{'5g':{ok:0,ms:'无覆盖'},leo:{ok:1,ms:'41 ms'},hts:{ok:1,ms:'310 ms'},bd:{ok:1,ms:'3 s'}},
  island:{'5g':{ok:0,ms:'无覆盖'},leo:{ok:1,ms:'38 ms'},hts:{ok:1,ms:'288 ms'},bd:{ok:1,ms:'3 s'}},
  ocean:{'5g':{ok:0,ms:'无覆盖'},leo:{ok:1,ms:'36 ms'},hts:{ok:1,ms:'295 ms'},bd:{ok:1,ms:'3 s'}},
  quake:{'5g':{ok:0,ms:'中断'},leo:{ok:1,ms:'44 ms'},hts:{ok:1,ms:'330 ms'},bd:{ok:1,ms:'3 s'}},
  remote:{'5g':{ok:0,ms:'无覆盖'},leo:{ok:1,ms:'43 ms'},hts:{ok:1,ms:'305 ms'},bd:{ok:1,ms:'3 s'}}
};
/* 链路分段解说：地面场景 3 段，天基场景 5 段 */
const FLOW={
  city:[
    {t:'① 现场接入',d:'终端经最近 5G 基站 / 光纤入网'},
    {t:'② 城域回传',d:'经城域骨干汇聚至核心节点'},
    {t:'③ 平台解译',d:'AI 秒级出图，直推指挥终端'}
  ],
  sat:[
    {t:'① 现场发起',d:'终端自检：周边无可用地面网络'},
    {t:'② 上行入星',d:'锁定过境窗口，建立卫星上行链路'},
    {t:'③ 星上处理',d:'星载 AI 只传目标切片，回传量↓99.8%'},
    {t:'④ 落地接站',d:'下行至最近地面站，转入光纤骨干'},
    {t:'⑤ 直达决策',d:'大模型出处置建议，推给指挥者'}
  ]
};
let curLoc=null,curPick=null,flowTip='',flowSeq=0,flowTimer=null;

function fmtLon(v){return Math.abs(v).toFixed(1)+'°'+(v>=0?'E':'W');}
function fmtLat(v){return Math.abs(v).toFixed(1)+'°'+(v>=0?'N':'S');}
function pickXY(e){const r=mapCv.getBoundingClientRect();
  return[(e.clientX-r.left)/r.width*360-180, 90-(e.clientY-r.top)/r.height*180];}
/* 射线法：判定该经纬度落在陆地还是海面 —— 用于给自定义点位如实定性 */
function isLand(lon,lat){let c=false;
  for(let n=0;n<LAND.length;n++){const r=LAND[n];
    for(let i=0,j=r.length-2;i<r.length;j=i,i+=2){
      const yi=r[i+1],yj=r[j+1];
      if((yi>lat)!==(yj>lat)){
        const xi=r[i],xj=r[j];
        if(lon<(xj-xi)*(lat-yi)/(yj-yi)+xi)c=!c;}}}
  return c;}
/* 按球面近似距离取最近预设点（经度差按 cos(lat) 收敛），避免高纬误判 */
function nearestLoc(lon,lat){let best=LOCS[0],bd=1e9;const cl=Math.cos(lat*Math.PI/180);
  LOCS.forEach(l=>{const dx=(l.lon-lon)*cl,dy=l.lat-lat,d=Math.hypot(dx,dy);if(d<bd){bd=d;best=l;}});
  return[best,bd];}
function nearestStation(lon,lat){let s=STATIONS[0],bd=1e9;const cl=Math.cos(lat*Math.PI/180);
  STATIONS.forEach(t=>{const d=Math.hypot((t.lon-lon)*cl,t.lat-lat);if(d<bd){bd=d;s=t;}});return s;}
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);
  g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}

function drawMap(){
  const d=cvFit(mapCv),g=mapCv.getContext('2d'),W=mapCv.width/d,H=mapCv.height/d;
  g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,W,H);
  /* 等距圆柱投影：360°×180° = 严格 2:1，画布已按该比例设置，不再拉伸 */
  const P=(lon,lat)=>[(lon+180)/360*W,(90-lat)/180*H];
  const t=performance.now()/1000;
  // 海洋底色
  let gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#08203a');gr.addColorStop(1,'#03101d');
  g.fillStyle=gr;g.fillRect(0,0,W,H);
  // 经纬网 + 边缘刻度
  g.strokeStyle='rgba(90,160,220,.10)';g.lineWidth=1;
  for(let lon=-180;lon<=180;lon+=20){const[x]=P(lon,0);g.beginPath();g.moveTo(x,0);g.lineTo(x,H);g.stroke();}
  for(let lat=-80;lat<=80;lat+=20){const[,y]=P(0,lat);g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}
  g.font='600 12px sans-serif';g.fillStyle='rgba(120,170,210,.5)';
  for(let lon=-120;lon<=120;lon+=60){const[x]=P(lon,0);g.fillText(fmtLon(lon),x+5,H-7);}
  for(let lat=-60;lat<=60;lat+=30){if(!lat)continue;const[,y]=P(0,lat);g.fillText(lat+'°',5,y-5);}
  // 赤道 / 南北回归线
  [[0,'赤道','rgba(140,215,255,.34)'],[23.44,'北回归线','rgba(255,204,92,.18)'],[-23.44,'南回归线','rgba(255,204,92,.18)']].forEach(o=>{
    const[,y]=P(0,o[0]);g.strokeStyle=o[2];g.lineWidth=o[0]?1:1.4;g.setLineDash([6,8]);
    g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();g.setLineDash([]);
    g.fillStyle=o[2].replace('.34','.62').replace('.18','.5');g.font='600 13px sans-serif';g.fillText(o[1],W-96,y-6);});
  // 昼夜线（太阳直下点实时推算）
  const nd=new Date();
  const doy=Math.floor((nd-new Date(nd.getFullYear(),0,0))/864e5);
  const dec=23.44*Math.sin((360/365.24*(doy-80))*Math.PI/180);
  const sunLon=180-((nd.getUTCHours()+nd.getUTCMinutes()/60+nd.getUTCSeconds()/3600)*15);
  if(Math.abs(dec)>3){
    const td=Math.tan(dec*Math.PI/180);
    g.beginPath();g.moveTo(0,dec>0?H:0);
    for(let i=0;i<=96;i++){const x=i/96*W,lon=x/W*360-180;
      const lt=Math.atan(-Math.cos((lon-sunLon)*Math.PI/180)/td)*180/Math.PI;
      g.lineTo(x,P(0,lt)[1]);}
    g.lineTo(W,dec>0?H:0);g.closePath();g.fillStyle='rgba(1,5,14,.34)';g.fill();
    const[sx,sy]=P(sunLon,dec);
    g.fillStyle='rgba(255,236,170,.22)';g.beginPath();g.arc(sx,sy,9,0,6.283);g.fill();
    g.fillStyle='rgba(255,236,170,.9)';g.beginPath();g.arc(sx,sy,3.4,0,6.283);g.fill();
    g.fillStyle='rgba(255,236,170,.65)';g.font='600 12px sans-serif';g.fillText('☀ 直下点',sx+11,sy+4);
  }
  // 陆地
  LAND.forEach(r=>{g.beginPath();let f=0;
    for(let i=0;i<r.length;i+=2){const[x,y]=P(r[i],r[i+1]);if(!f){g.moveTo(x,y);f=1;}else g.lineTo(x,y);}
    g.closePath();g.fillStyle='rgba(32,92,116,.62)';g.fill();g.strokeStyle='rgba(96,206,226,.42)';g.lineWidth=1;g.stroke();});
  // 移动中的低轨星座 + 固定高通量卫星
  const leo=[{lon:((t*7)%360)-180,lat:20},{lon:((t*5+140)%360)-180,lat:-15}];
  const geo={lon:101.4,lat:0};
  const[gx,gy]=P(geo.lon,geo.lat);
  gr=g.createRadialGradient(gx,gy,0,gx,gy,H*.55);
  gr.addColorStop(0,'rgba(255,182,61,.13)');gr.addColorStop(1,'rgba(255,182,61,0)');
  g.fillStyle=gr;g.beginPath();g.arc(gx,gy,H*.55,0,6.283);g.fill();
  // 地面站
  STATIONS.forEach(s=>{const[x,y]=P(s.lon,s.lat);
    const pr=(performance.now()/26%34);
    g.strokeStyle='rgba(255,204,92,'+(.45-pr/90)+')';g.lineWidth=1.4;
    g.beginPath();g.arc(x,y,pr,0,6.283);g.stroke();
    g.fillStyle='#ffcc5c';g.beginPath();g.arc(x,y,3.6,0,6.283);g.fill();
    g.fillStyle='rgba(255,235,180,.92)';g.font='600 14px sans-serif';g.fillText(s.name,x+9,y-7);});
  // 预设点位
  LOCS.forEach(l=>{const[x,y]=P(l.lon,l.lat);
    const on=curLoc===l;
    g.strokeStyle=on?'#ff5c6c':'rgba(255,255,255,.42)';g.lineWidth=on?2.4:1.3;
    g.beginPath();g.arc(x,y,on?11:6,0,6.283);g.stroke();
    g.fillStyle=on?'#ff5c6c':'rgba(255,255,255,.66)';g.beginPath();g.arc(x,y,on?4:2.8,0,6.283);g.fill();
    if(on){g.fillStyle='#ffb0b8';g.font='700 15px sans-serif';g.fillText(l.n,x+15,y+5);}});
  // 链路动画
  if(curLoc){
    const[ax,ay]=P(curLoc.lon,curLoc.lat);
    const st=nearestStation(curLoc.lon,curLoc.lat);const[bx,by]=P(st.lon,st.lat);
    const route=curLoc.type==='city'?
      {tgt:null,segs:[[[ax,ay],[bx,by]]]}:
      {tgt:curLoc.type==='ocean'?P(leo[0].lon,leo[0].lat):P(leo[1].lon,leo[1].lat),
       segs:[[[ax,ay],P((curLoc.type==='ocean'?leo[0]:leo[1]).lon,(curLoc.type==='ocean'?leo[0]:leo[1]).lat)],
             [P((curLoc.type==='ocean'?leo[0]:leo[1]).lon,(curLoc.type==='ocean'?leo[0]:leo[1]).lat),[bx,by]]]};
    route.segs.forEach(s=>{
      g.strokeStyle='rgba(63,169,255,.6)';g.lineWidth=2;g.setLineDash([7,6]);
      g.lineDashOffset=-(performance.now()/30)%26;
      g.beginPath();g.moveTo(s[0][0],s[0][1]);g.lineTo(s[1][0],s[1][1]);g.stroke();g.setLineDash([]);
      for(let i=0;i<3;i++){const p=((performance.now()/1400+i/3)%1);
        const px=s[0][0]+(s[1][0]-s[0][0])*p,py=s[0][1]+(s[1][1]-s[0][1])*p;
        g.fillStyle='rgba(160,230,255,.95)';g.beginPath();g.arc(px,py,3.2,0,6.283);g.fill();
        g.fillStyle='rgba(160,230,255,.25)';g.beginPath();g.arc(px,py,8,0,6.283);g.fill();}});
    // 自定义点位：画出真实落点与「→ 就近匹配」的引导线，避免看起来「点哪都不准」
    if(curPick){
      const[px,py]=P(curPick.lon,curPick.lat);
      g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=1.6;
      g.beginPath();g.moveTo(px-7,py);g.lineTo(px+7,py);g.moveTo(px,py-7);g.lineTo(px,py+7);g.stroke();
      g.strokeStyle='rgba(255,255,255,.3)';g.setLineDash([4,5]);g.lineWidth=1.2;
      g.beginPath();g.moveTo(px,py);g.lineTo(ax,ay);g.stroke();g.setLineDash([]);
      const lb=fmtLon(curPick.lon)+' / '+fmtLat(curPick.lat);
      g.font='600 13px sans-serif';const tw=g.measureText(lb).width;
      rr(g,Math.min(W-tw-22,px+10),py+8,tw+16,22,6);
      g.fillStyle='rgba(6,16,32,.86)';g.fill();g.strokeStyle='rgba(255,255,255,.28)';g.lineWidth=1;g.stroke();
      g.fillStyle='rgba(220,235,250,.95)';g.fillText(lb,Math.min(W-tw-22,px+10)+8,py+23);
    }
    // 当前解说阶段浮标
    if(flowTip){
      g.font='700 15px sans-serif';const tw=g.measureText(flowTip).width,bw=tw+24,bh=30;
      const cbx=Math.min(W-bw-6,Math.max(6,ax-bw/2)),cby=Math.max(6,ay-52);
      rr(g,cbx,cby,bw,bh,9);g.fillStyle='rgba(6,18,34,.92)';g.fill();
      g.strokeStyle='rgba(63,169,255,.65)';g.lineWidth=1.2;g.stroke();
      g.fillStyle='#bfe4ff';g.textBaseline='middle';g.fillText(flowTip,cbx+12,cby+bh/2);g.textBaseline='alphabetic';
    }
  }
  // 卫星图标
  leo.forEach(s=>{const[x,y]=P(s.lon,s.lat);
    g.save();g.translate(x,y);g.fillStyle='#3fa9ff';g.shadowColor='rgba(63,169,255,.9)';g.shadowBlur=12;
    g.beginPath();g.arc(0,0,5,0,6.283);g.fill();g.restore();
    g.fillStyle='rgba(160,215,255,.9)';g.font='600 13px sans-serif';g.fillText('LEO 低轨卫星',x+8,y-6);});
  g.save();g.translate(gx,gy);g.fillStyle='#ffb63d';g.shadowColor='rgba(255,182,61,.9)';g.shadowBlur=12;
  g.beginPath();g.arc(0,0,6,0,6.283);g.fill();g.restore();
  g.fillStyle='rgba(255,220,150,.9)';g.font='600 13px sans-serif';g.fillText('GEO 高通量高轨卫星',gx+10,gy-8);
  requestAnimationFrame(drawMap);
}

/* ---- 点位拾取：鼠标处真坐标 → 就近吸附 / 如实新建自定义点位 ---- */
mapCv.onmousemove=e=>{const[lon,lat]=pickXY(e);
  document.getElementById('mapCoord').textContent=fmtLon(lon)+' · '+fmtLat(lat);};
mapCv.onclick=e=>{
  const[lon,lat]=pickXY(e);
  const[best,dist]=nearestLoc(lon,lat);
  if(dist<=9){curLoc=best;curPick=dist>1.6?{lon:lon,lat:lat}:null;}
  else{
    const sea=!isLand(lon,lat);
    curLoc={n:(sea?'🌊 自定义海域点位':'🏔 自定义陆域点位'),
      lon:+lon.toFixed(1),lat:+lat.toFixed(1),type:sea?'ocean':'remote',
      d:'按真实经纬度判定 —— '+(sea?'该点位于海域，地面网络为零，只能走天基链路；':'该点位于陆域，按偏远地区处理，公网基本不可用；')
        +'链路与时延由 AI 调度引擎自动择优。'};
    curPick={lon:lon,lat:lat};
  }
  applyLoc();};

/* ---- 链路择优 + 分段解说 ---- */
function applyLoc(){
  document.getElementById('locName').textContent='📍 '+curLoc.n+
    (curPick?'  ('+fmtLon(curPick.lon)+' / '+fmtLat(curPick.lat)+')':'');
  document.getElementById('locDesc').textContent=curLoc.d;
  const cfg=LINK[curLoc.type];
  const items=[...document.querySelectorAll('#segList .segItem')];
  items.forEach(x=>x.classList.remove('on'));
  let i=0;const seq=['5g','leo','hts','bd'];
  const tick=()=>{if(i>=seq.length)return;
    const k=seq[i],el=document.querySelector('.segItem[data-k="'+k+'"]'),c=cfg[k];
    el.classList.add('on');const ms=el.querySelector('.ms');
    ms.textContent=c.ok?c.ms:'✕ '+c.ms;ms.classList.toggle('bad',!c.ok);i++;
    setTimeout(tick,c.ok?260:160);};
  tick();
  playFlow(cfg);
}
function playFlow(cfg){
  const id=++flowSeq;clearTimeout(flowTimer);
  const steps=curLoc.type==='city'?FLOW.city:FLOW.sat;
  const wrap=document.getElementById('flowSteps');
  wrap.innerHTML=steps.map((s,k)=>'<div class="flowStep"><div class="fi">STEP '+(k+1)+'</div>'+
    '<div class="ft">'+s.t+'</div><div class="fd">'+s.d+'</div></div>').join('');
  const els=[...wrap.children];
  const best=cfg['5g'].ok?cfg['5g'].ms:cfg['leo'].ms;
  document.getElementById('flowSub').innerHTML='当前点位：<em>'+curLoc.n+'</em> · 全程 '+
    steps.length+' 段 · 端到端最优 '+best;
  let i=0;
  const tick=()=>{
    if(id!==flowSeq)return;
    els.forEach((e,k)=>{e.classList.toggle('on',k===i);e.classList.toggle('done',k<i);});
    flowTip=steps[i].t;i++;
    if(i<steps.length)flowTimer=setTimeout(tick,1900);
  };
  tick();
}
ENTERS[3]=()=>{if(!mapCv._run){mapCv._run=1;drawMap();}
  if(!curLoc){curLoc=LOCS.filter(l=>l.type==='quake')[0];applyLoc();}};

/* ===================== S4 算力调度 ===================== */
function calcPlans(){
  const urg=+document.getElementById('urg').value,vol=+document.getElementById('vol').value,ty=+document.getElementById('ttype').value;
  const gb=(0.05+vol/100*2.4);
  const P=[
    {k:'on',T:1.5+vol/100*3.5,B:gb*0.002,C:3.2,bar:'barOn',t:'sOnT',b:'sOnB',e:'sOnE'},
    {k:'ed',T:6+vol/100*16,B:gb,C:2.0,bar:'barEd',t:'sEdT',b:'sEdB',e:'sEdE'},
    {k:'ce',T:55+vol/100*140,B:gb*1.05,C:1.0,bar:'barCe',t:'sCeT',b:'sCeB',e:'sCeE'}
  ];
  const wU=urg/100, wC=1-wU, wB=(ty>50?0.9:0.35);
  P.forEach(p=>{const tn=Math.min(1,p.T/200),cn=p.C/3.5,bn=Math.min(1,p.B/2.5);
    p.score=wU*(1-tn)*1.0 + wC*(1-cn)*0.9 + wB*(1-bn)*0.55 + (p.k==='on'?0.12*(urg/100):0);});
  const max=Math.max(...P.map(p=>p.score)),min=Math.min(...P.map(p=>p.score));
  P.forEach(p=>p.n=(p.score-min)/(max-min||1));
  return P;
}
function renderPlans(){
  const P=calcPlans(),els=document.querySelectorAll('#plans .plan');
  let bi=0;P.forEach((p,i)=>{if(p.score>P[bi].score)bi=i;});
  P.forEach((p,i)=>{
    const el=els[i];el.classList.toggle('best',i===bi);
    let tg=el.querySelector('.bestTag');if(i===bi&&!tg){tg=document.createElement('div');tg.className='bestTag';tg.textContent='调度引擎推荐';el.appendChild(tg);}
    if(i!==bi&&tg)tg.remove();
    el.querySelector('.rank').textContent=['A','B','C'][i];
    document.getElementById(p.t).textContent=p.T<60?Math.round(p.T)+' min':(p.T/60).toFixed(1)+' h';
    document.getElementById(p.b).textContent=p.B<1?(p.B*1024).toFixed(0)+' MB':p.B.toFixed(2)+' GB';
    document.getElementById(p.e).textContent=p.C.toFixed(1);
    document.getElementById(p.bar).style.width=(18+p.n*82)+'%';});
  const urg=+document.getElementById('urg').value,vol=+document.getElementById('vol').value,ty=+document.getElementById('ttype').value;
  document.getElementById('urgVal').textContent=urg>75?'极高（秒—分钟级）':urg>45?'较高（分钟—十分钟级）':'常规（小时级批处理）';
  document.getElementById('volVal').textContent=(0.05+vol/100*2.4).toFixed(2)+' GB（'+(vol>60?'整景全色':vol>30?'多光谱':'切片数据')+'）';
  document.getElementById('typeVal').textContent=ty>60?'应急 · 火点识别':ty>30?'常态 · 变化检测':'科研 · 全量分析';
  const pick=['星上在轨推理','地面站边缘算力','中心智算中心批处理'][bi];
  const reason=bi===0?'紧急度 '+urg+'/100，且可用过境窗口 3 个 → 星上处理省下 99.8% 下行带宽，端到端最快。'
    :bi===1?'紧急度中等 → 边缘就近解译兼顾时效与算力成本，无需占用稀缺的星上算力。'
    :'紧急度低、数据量 '+(0.05+vol/100*2.4).toFixed(1)+' GB → 全量入湖批处理，综合成本最低。';
  document.getElementById('taskBox').innerHTML='调度引擎输出：<b>'+pick+'</b> —— '+reason;
  document.getElementById('expl').innerHTML='评分 = 时效权重('+( urg/100).toFixed(2)+') × 紧急度 − 带宽成本 − 链路等待时间。'+
    '<div class="explConc">★ 当前：<b>'+pick+'</b> 得分最高</div>';
}
['urg','vol','ttype'].forEach(id=>document.getElementById(id).oninput=renderPlans);
ENTERS[4]=()=>renderPlans();

/* ===================== S5 行业板块 ===================== */
const IND=[
  {t:'应急管理 · 全灾种全流程',
   pain:'痛点：灾害现场往往「三断」——断网、断电、断路。地面手段进不去、看不全、传不回，指挥靠打电话、靠猜。',
   sat:['红外载荷穿透烟雾识别明火与暗火','SAR 穿云提取洪涝淹没范围','InSAR 提前发现坝体/边坡毫米级形变','卫星短报文在无网区双向通信'],
   ai:['星上 AI 在轨识别，2 MB 切片替代 1.2 GB 整景','大模型融合气象/地形/植被预测火势蔓延','智能体自动生成隔离带与撤离路线','无人机前突复核，结果回流修正模型'],
   eff:[['25 min','端到端响应'],['↓99.8%','回传数据量'],['↑3.2×','覆盖面积'],['0','通信盲区']]},
  {t:'智慧城市 · 城市体检',
   pain:'痛点：违建、渣土堆场、黑臭水体、城市内涝点位分散，靠人工巡查「跑断腿也跑不全」，发现即滞后。',
   sat:['亚米级光学月度普查，变化自动发现','夜光遥感识别闲置用地与建设进度','SAR 监测地面沉降，预警管网风险','热红外识别热岛与地下管网漏点'],
   ai:['遥感变化检测大模型自动圈出疑似违建','开放词汇检索：「找露天堆场/找工地」','多源融合预测内涝点并给出排水调度','自动生成执法核查清单与图斑台账'],
   eff:[['1月→1天','巡查周期'],['↑92%','疑似违建查全率'],['↓70%','人工外业量'],['4 类','自动识别图斑']]},
  {t:'农林水利 · 粮食安全',
   pain:'痛点：耕地面积大、分布散，长势与灾情靠层层上报，数据滞后一个月，产量预估与保险定损都缺乏依据。',
   sat:['多光谱 NDVI 逐旬监测作物长势','高光谱识别作物胁迫与病虫害','土壤水分遥感支撑干旱预警','SAR 在连阴雨天气照样成像'],
   ai:['长势—气象—土壤融合的单产预测模型','干旱等级自动划分与灌溉调度建议','灾损自动评估，支撑保险快速定损','灌区渠系与耕地「非农化」自动核查'],
   eff:[['10 天','长势监测周期'],['±4%','单产预测精度'],['↓60%','定损理赔周期'],['100%','耕地覆盖']]},
  {t:'生态环保 · 双碳支撑',
   pain:'痛点：生态红线范围大、人难至，违规开发、固废堆存、水体水华靠举报发现；碳汇核算缺数据、缺方法。',
   sat:['高光谱反演水体叶绿素与水华','激光雷达测森林树高，反演碳储量','夜光与红外发现夜间偷排偷采','多时相比对发现生态红线内变化'],
   ai:['碳汇核算模型自动生成林碳储量图','水华暴发提前 3—7 天预警','红线内人类活动自动识别与告警','生成季度生态体检报告'],
   eff:[['3—7 天','水华预警提前量'],['±8%','碳汇核算精度'],['100%','红线区覆盖'],['4 类','自动告警']]}
];
document.querySelectorAll('.indTab').forEach(t=>t.onclick=()=>{
  document.querySelectorAll('.indTab').forEach(x=>x.classList.remove('on'));t.classList.add('on');
  renderInd(+t.dataset.i);});
function renderInd(i){const d=IND[i];
  document.querySelectorAll('.indTab').forEach(x=>x.classList.toggle('on',+x.dataset.i===i));
  document.getElementById('uTitle').textContent=d.t;
  document.getElementById('uPain').textContent=d.pain;
  document.getElementById('uSat').innerHTML=d.sat.map(x=>'<li>'+x+'</li>').join('');
  document.getElementById('uAi').innerHTML=d.ai.map(x=>'<li>'+x+'</li>').join('');
  document.getElementById('uEff').innerHTML=d.eff.map(x=>'<div class="eff"><b>'+x[0]+'</b><span>'+x[1]+'</span></div>').join('');
  document.getElementById('indTag').textContent=INDTAGS[i];
  if(i!==vizCur){vizPrev=vizCur;vizCur=i;vizFade=0;}}
ENTERS[5]=()=>renderInd(0);

/* ---------- S5 行业底图 + 数字底座 动画 ---------- */
const INDC=['#ff5c6c','#4fd1ff','#3ddc84','#25e6c0'];
const INDTAGS=['应急管理 · 实时态势底图','智慧城市 · 城市体检底图','农林水利 · 耕地长势底图','生态环保 · 红线监测底图'];
let vizCur=0,vizPrev=0,vizFade=1;
const rnd=i=>{const x=Math.sin(i*127.1+311.7)*43758.5;return x-Math.floor(x);};
function fitCv(cv){const r=Math.min(window.devicePixelRatio||1,2),w=cv.clientWidth||10,h=cv.clientHeight||10;
  if(cv.width!==Math.round(w*r)||cv.height!==Math.round(h*r)){cv.width=Math.round(w*r);cv.height=Math.round(h*r);}
  const g=cv.getContext('2d');g.setTransform(r,0,0,r,0,0);return g;}
function ridge(g,w,h,base,amp,seed,c){g.beginPath();g.moveTo(0,h);
  for(let x=0;x<=w;x+=8){const y=base+Math.sin(x*.012+seed)*amp+Math.sin(x*.031+seed*2)*amp*.4;g.lineTo(x,y);}
  g.lineTo(w,h);g.closePath();g.fillStyle=c;g.fill();}
function glow(g,x,y,r,a,color){const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,color);gr.addColorStop(1,'rgba(0,0,0,0)');
  g.globalAlpha=a;g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,7);g.fill();g.globalAlpha=1;}
const SCENES=[
  (g,w,h,t)=>{ /* 应急：山火态势 */
    g.fillStyle='#160a0e';g.fillRect(0,0,w,h);
    ridge(g,w,h,h*.52,h*.16,1.3,'rgba(90,30,34,.55)');ridge(g,w,h,h*.68,h*.12,4.1,'rgba(56,16,20,.85)');
    const fx=[w*.3,w*.62,w*.8],fy=[h*.5,h*.62,h*.44];
    fx.forEach((x,i)=>{const y=fy[i]+Math.sin(t*1.3+i)*3,f=Math.sin(t*7+i*2)*.25+.75;
      glow(g,x,y,26,f*.9,'rgba(255,122,69,.85)');glow(g,x,y,9,f,'rgba(255,214,120,.95)');
      const ph=(t*.5+i*.33)%1;g.strokeStyle='rgba(255,92,108,'+(0.55*(1-ph))+')';g.lineWidth=1.6;
      g.beginPath();g.arc(x,y,10+ph*56,0,7);g.stroke();});
    const dx=(t*46)%(w+120)-60,dy=h*.3+Math.sin(t*2.1)*8;
    g.strokeStyle='rgba(255,255,255,.16)';g.setLineDash([4,6]);g.beginPath();g.moveTo(0,dy+6);g.lineTo(dx,dy);g.stroke();g.setLineDash([]);
    drawDroneIcon(g,dx,dy,12,t);},
  (g,w,h,t)=>{ /* 城市：天际线体检 */
    g.fillStyle='#081120';g.fillRect(0,0,w,h);
    for(let i=0;i<13;i++){const bw=w/14,bh=(0.28+rnd(i)*0.55)*h,x=i*(w/13)-bw*.2,y=h-bh;
      g.fillStyle=i%2?'#0d1c33':'#10233f';g.fillRect(x,y,bw*.82,bh);
      for(let r=0;r<Math.floor(bh/14);r++)for(let c2=0;c2<3;c2++){
        const lit=rnd(i*57+r*7+c2)>.45&&Math.sin(t*.8+r+c2+i)>.2;
        g.fillStyle=lit?'rgba(79,209,255,.75)':'rgba(79,209,255,.10)';
        g.fillRect(x+4+c2*(bw*.82-10)/3,y+6+r*13,5,6);}
      if(rnd(i+40)>.7){g.strokeStyle='rgba(255,92,108,.6)';g.lineWidth=1.2;g.beginPath();g.moveTo(x+bw*.41,y);g.lineTo(x+bw*.41,y-12);g.stroke();
        g.fillStyle='rgba(255,92,108,.9)';g.beginPath();g.arc(x+bw*.41,y-13,2.2,0,7);g.fill();}}
    const sx=(t*60)%(w+80)-40,gr=g.createLinearGradient(sx-36,0,sx,0);
    gr.addColorStop(0,'rgba(79,209,255,0)');gr.addColorStop(1,'rgba(79,209,255,.22)');g.fillStyle=gr;g.fillRect(sx-36,0,36,h);
    g.fillStyle='rgba(160,225,255,.85)';g.fillRect(sx,0,1.5,h);},
  (g,w,h,t)=>{ /* 农林：田垄长势 */
    g.fillStyle='#0a140c';g.fillRect(0,0,w,h);
    for(let i=0;i<6;i++){const yy=h*.22+i*(h*.78)/6,nxt=h*.22+(i+1)*(h*.78)/6;
      g.fillStyle=i%2?'rgba(37,120,64,.5)':'rgba(24,92,50,.62)';
      g.beginPath();g.moveTo(0,yy);g.lineTo(w,yy+nxt-yy-(nxt-yy)*.12);g.lineTo(w,nxt);g.lineTo(0,yy+(nxt-yy)*.88);g.closePath();g.fill();
      const px=((t*36+i*37)%(w+40))-20;
      g.fillStyle='rgba(61,220,132,.85)';for(let k=0;k<5;k++){const qx=px+k*14-(i%2)*7;
        if(qx>0&&qx<w)g.fillRect(qx,(yy+nxt)/2-2+Math.sin(qx*.05+i)*3,3,5);}}
    g.strokeStyle='rgba(79,180,255,.55)';g.lineWidth=5;g.lineCap='round';
    g.beginPath();g.moveTo(w*.72,h);g.bezierCurveTo(w*.6,h*.55,w*.82,h*.4,w*.68,h*.16);g.stroke();g.lineCap='butt';
    g.strokeStyle='rgba(140,220,255,.8)';g.lineWidth=1.8;g.setLineDash([7,9]);g.lineDashOffset=-t*40;
    g.beginPath();g.moveTo(w*.72,h);g.bezierCurveTo(w*.6,h*.55,w*.82,h*.4,w*.68,h*.16);g.stroke();g.setLineDash([]);},
  (g,w,h,t)=>{ /* 生态：山水红线 */
    g.fillStyle='#071410';g.fillRect(0,0,w,h);
    ridge(g,w,h,h*.42,h*.2,2.2,'rgba(24,74,60,.7)');ridge(g,w,h,h*.56,h*.14,5.7,'rgba(14,52,44,.9)');
    g.fillStyle='rgba(37,230,192,.12)';g.fillRect(0,h*.72,w,h*.28);
    for(let i=0;i<4;i++){const ph=(t*.4+i*.25)%1;
      g.strokeStyle='rgba(37,230,192,'+(0.5*(1-ph))+')';g.lineWidth=1.4;
      g.beginPath();g.ellipse(w*.3,h*.86,20+ph*w*.3,4+ph*9,0,Math.PI,0);g.stroke();}
    for(let i=0;i<9;i++){const x=w*.06+i*w*.06,y=h*.7-rnd(i)*8;
      g.fillStyle='rgba(61,220,132,'+(.5+rnd(i+9)*.4)+')';
      g.beginPath();g.moveTo(x,y-10-rnd(i)*6);g.lineTo(x+5,y+4);g.lineTo(x-5,y+4);g.closePath();g.fill();}
    g.strokeStyle='rgba(255,204,92,.65)';g.lineWidth=1.4;g.setLineDash([6,5]);g.lineDashOffset=t*14;
    g.beginPath();g.moveTo(w*.5,h*.12);g.quadraticCurveTo(w*.92,h*.3,w*.86,h*.95);g.stroke();g.setLineDash([]);}
];
function drawBase(g,w,h,t,c){
  g.fillStyle='#050a16';g.fillRect(0,0,w,h);
  for(let i=0;i<36;i++){const a=.25+.55*Math.abs(Math.sin(t*1.4+i*2.3));
    g.fillStyle='rgba(200,220,255,'+a*.5+')';g.fillRect(rnd(i)*w,rnd(i+70)*h,1.4,1.4);}
  const cx=w*.5,cy=h*.58,R=h*.42;
  const gg=g.createRadialGradient(cx-R*.3,cy-R*.3,R*.1,cx,cy,R);gg.addColorStop(0,'#123055');gg.addColorStop(1,'#081426');
  g.fillStyle=gg;g.beginPath();g.arc(cx,cy,R,0,7);g.fill();
  g.strokeStyle='rgba(120,170,220,.4)';g.lineWidth=1;
  [0.35,0.7].forEach(k=>{g.beginPath();g.ellipse(cx,cy,R*k,R,0,0,7);g.stroke();});
  [0.4,0.75].forEach(k=>{g.beginPath();g.ellipse(cx,cy,R,R*k,0,0,7);g.stroke();});
  g.strokeStyle=c;g.lineWidth=1.4;g.save();g.translate(cx,cy);g.scale(1,.36);
  g.beginPath();g.arc(0,0,R*1.45,0,7);g.stroke();g.setLineDash([3,7]);g.beginPath();g.arc(0,0,R*1.8,0,7);g.stroke();g.setLineDash([]);g.restore();
  for(let s=0;s<2;s++){const a=t*(s?-.85:.6)+s*2.6,ox=cx+Math.cos(a)*R*1.45*(s?.8:1),oy=cy+Math.sin(a)*R*1.45*.36*(s?.8:1);
    g.strokeStyle=c;g.lineWidth=1;g.globalAlpha=.5;g.beginPath();g.moveTo(ox,oy);g.lineTo(cx,cy);g.stroke();g.globalAlpha=1;
    const ph=((t*.7+s*.5)%1);g.fillStyle=c;g.globalAlpha=.85;
    for(let k=0;k<3;k++){const q=(ph+k/3)%1,qx=ox+(cx-ox)*q,qy=oy+(cy-oy)*q;g.fillRect(qx-2,qy-2,4,4);}
    g.globalAlpha=1;
    g.fillStyle='#dfe9f5';g.fillRect(ox-4,oy-3,8,6);
    g.fillStyle=c;g.fillRect(ox-11,oy-2,6,4);g.fillRect(ox+5,oy-2,6,4);
    glow(g,ox,oy,14,.7,c);}
}
/* ---------- 行业底图：桌面素材照片（cover 裁切不拉伸）+ 动效标注 ---------- */
const INDIMGS=(typeof IND_IMG_SRC!=='undefined')?IND_IMG_SRC.map(function(s){var im=new Image();im.src=s;return im;}):null;
function drawImgCover(g,img,w,h){
  if(!img||!img.complete||!img.naturalWidth)return false;
  var s=Math.max(w/img.naturalWidth,h/img.naturalHeight),iw=img.naturalWidth*s,ih=img.naturalHeight*s;
  g.drawImage(img,(w-iw)/2,(h-ih)/2,iw,ih);return true;
}
function iBrackets(g,x,y,bw,bh,c,label){ /* AI 目标角框 */
  var L=Math.min(bw,bh)*.3;
  g.strokeStyle=c;g.lineWidth=2;g.beginPath();
  g.moveTo(x,y+L);g.lineTo(x,y);g.lineTo(x+L,y);
  g.moveTo(x+bw-L,y);g.lineTo(x+bw,y);g.lineTo(x+bw,y+L);
  g.moveTo(x+bw,y+bh-L);g.lineTo(x+bw,y+bh);g.lineTo(x+bw-L,y+bh);
  g.moveTo(x+L,y+bh);g.lineTo(x,y+bh);g.lineTo(x,y+bh-L);
  g.stroke();
  if(label){g.fillStyle=c;g.font='700 13px sans-serif';g.fillText(label,x+4,y-6);}
}
const INDFX=[
 function(g,w,h,t){ /* 应急：火点亮斑 + 扩散告警环 + 无人机前突航线 */
   var x=w*.56,y=h*.46,f=.7+.3*Math.sin(t*6);
   glow(g,x,y,30,f,'rgba(255,122,69,.55)');glow(g,x,y,12,f,'rgba(255,214,120,.75)');
   for(var i=0;i<2;i++){var ph=(t*.5+i*.5)%1;
     g.strokeStyle='rgba(255,92,108,'+(.6*(1-ph))+')';g.lineWidth=1.6;
     g.beginPath();g.arc(x,y,8+ph*54,0,7);g.stroke();}
   iBrackets(g,w*.48,h*.36,w*.17,h*.24,'rgba(255,204,92,.95)','火点 0.98');
   var dx=(t*50)%(w*.7)-40,dy=h*.22+Math.sin(t*1.8)*6;
   g.strokeStyle='rgba(255,255,255,.35)';g.setLineDash([5,6]);g.lineDashOffset=-t*30;
   g.beginPath();g.moveTo(w*.08,h*.32);g.quadraticCurveTo(w*.35,dy-34,dx,dy);g.stroke();g.setLineDash([]);
   drawDroneIcon(g,dx,dy,13,t);
   g.fillStyle='rgba(255,204,92,.9)';g.font='600 12px sans-serif';g.fillText('无人机前突复核',dx+16,dy+4);},
 function(g,w,h,t){ /* 城市：竖向扫描光带 + 违建/渣土图斑框 */
   var sx=(t*.12%1)*w,grd=g.createLinearGradient(sx-40,0,sx,0);
   grd.addColorStop(0,'rgba(79,209,255,0)');grd.addColorStop(1,'rgba(79,209,255,.25)');
   g.fillStyle=grd;g.fillRect(sx-40,0,40,h);
   g.fillStyle='rgba(160,225,255,.8)';g.fillRect(sx,0,1.5,h);
   iBrackets(g,w*.14,h*.3,w*.13,h*.2,'rgba(255,92,108,.95)','疑似违建 0.91');
   iBrackets(g,w*.62,h*.5,w*.15,h*.22,'rgba(79,209,255,.95)','渣土堆场 0.94');
   var ph=(t*.6)%1;g.strokeStyle='rgba(79,209,255,'+(.5*(1-ph))+')';g.lineWidth=1.4;
   g.strokeRect(w*.62-6-ph*8,h*.5-6-ph*8,w*.15+12+ph*16,h*.22+12+ph*16);},
 function(g,w,h,t){ /* 农林：横向长势扫描 + NDVI 图斑 */
   var sy=(t*.1%1)*h;
   var grd=g.createLinearGradient(0,sy-26,0,sy);
   grd.addColorStop(0,'rgba(61,220,132,0)');grd.addColorStop(1,'rgba(61,220,132,.22)');
   g.fillStyle=grd;g.fillRect(0,sy-26,w,26);
   g.fillStyle='rgba(140,240,180,.75)';g.fillRect(0,sy,w,1.5);
   iBrackets(g,w*.3,h*.32,w*.2,h*.26,'rgba(61,220,132,.95)','胁迫区 NDVI↓ 0.9');
   iBrackets(g,w*.66,h*.58,w*.16,h*.2,'rgba(255,204,92,.9)','长势正常 0.88');},
 function(g,w,h,t){ /* 生态：水波纹圈 + 红线动态描边 */
   for(var i=0;i<3;i++){var ph=(t*.35+i/3)%1;
     g.strokeStyle='rgba(37,230,192,'+(.5*(1-ph))+')';g.lineWidth=1.4;
     g.beginPath();g.ellipse(w*.42,h*.72,26+ph*w*.24,6+ph*h*.1,0,Math.PI,0);g.stroke();}
   g.strokeStyle='rgba(255,92,108,.75)';g.lineWidth=1.6;g.setLineDash([7,6]);g.lineDashOffset=-t*18;
   g.beginPath();g.moveTo(w*.5,h*.12);g.quadraticCurveTo(w*.92,h*.3,w*.84,h*.92);g.stroke();g.setLineDash([]);
   g.fillStyle='rgba(255,140,150,.9)';g.font='600 12px sans-serif';g.fillText('生态红线 · 动态核查',w*.52,h*.16);
   iBrackets(g,w*.28,h*.5,w*.18,h*.22,'rgba(37,230,192,.95)','水华预警 0.87');}
];
function drawInd(i,g,w,h,t){ /* 照片就绪用照片，否则退回程序化示意 */
  if(!(INDIMGS&&drawImgCover(g,INDIMGS[i],w,h))){SCENES[i](g,w,h,t);return;}
  g.fillStyle='rgba(3,7,15,.34)';g.fillRect(0,0,w,h);
  INDFX[i](g,w,h,t);
}
let lastTs=0;
function vizLoop(ts){const t=ts/1000,dt=Math.min(.05,(ts-lastTs)/1000||.016);lastTs=ts;
  const sec=document.getElementById('s5');
  if(sec&&sec.classList.contains('on')){
    vizFade=Math.min(1,vizFade+dt*2.2);
    const cv1=document.getElementById('indCv');
    if(cv1){const g=fitCv(cv1),w=cv1.clientWidth,h=cv1.clientHeight;
      drawInd(vizCur,g,w,h,t);
      if(vizFade<1){drawInd(vizPrev,g,w,h,t);
        g.fillStyle='rgba(4,7,15,'+(1-vizFade)+')';g.fillRect(0,0,w,h);
        drawInd(vizCur,g,w,h,t);
        g.globalAlpha=(1-vizFade)*.5;g.fillStyle=INDC[vizCur];g.fillRect(0,0,w,h);g.globalAlpha=1;}}
    const cv2=document.getElementById('baseCv');
    if(cv2){const g=fitCv(cv2),w=cv2.clientWidth,h=cv2.clientHeight;drawBase(g,w,h,t,INDC[vizCur]);}}
  requestAnimationFrame(vizLoop);}
requestAnimationFrame(vizLoop);

/* ===================== S6 全链路推演 ===================== */
const SIM=[
  {n:'森林草原火灾',d:'西南林区 · 雷击火',k:'fire',old:420,new:25,steps:[
    {t:0,tag:'巡视',h:'常态化巡检 · 一切如常',d:'低轨光学卫星按计划过境，地面 AI 未发现异常。传统模式下，此刻无人知晓 8 分钟后会发生什么。',l:'光学卫星例行成像，未见异常',op:0,np:0},
    {t:2,tag:'告警',h:'红外载荷发现<em>异常高温点</em>',d:'卫星过境时红外载荷捕获 3 处亚像元高温点，坐标精度 ±30 m。同一时刻云层开始聚集。',l:'红外识别高温点 ×3，置信度 0.91',op:0,np:12},
    {t:4,tag:'复核',h:'云层遮挡 → <em>自动改派 SAR</em>',d:'光学无法穿透云层，智能体自动改派最近可用的 SAR 卫星（等待 90 s），穿透云雾确认火场边界与周边植被含水率。',l:'SAR 穿云成像，火场边界 2.1 km²',op:5,np:26},
    {t:6,tag:'在轨',h:'<em>星上 AI</em> 在轨完成解译',d:'星载 AI 芯片在轨完成火点检测与边界提取，仅下行目标切片 2.3 MB（整景 1.2 GB），回传量下降 99.8%。',l:'在轨解译完成，下行 2.3 MB',op:8,np:44},
    {t:8,tag:'回传',h:'低轨链路 <em>优先插队</em> 回传',d:'AI 链路调度将火情切片标记为 P0 优先级，插入当前过境窗口队首，8 秒内送达地面站边缘节点。',l:'P0 优先级插入，8 s 送达地面站',op:10,np:58},
    {t:10,tag:'融合',h:'大模型<em>融合多源</em>预测蔓延',d:'融合气象（风速 6 m/s）、地形（坡度 22°）、植被含水率、居民点分布，生成未来 6 小时火势蔓延概率图。',l:'生成 6 h 火势蔓延概率图',op:12,np:70},
    {t:14,tag:'决策',h:'智能体<em>生成处置方案</em>',d:'自动生成：3 条隔离带位置、2 条撤离路线、受影响 3 个村 427 人、力量部署建议与物资清单，一键下发。',l:'处置方案生成：隔离带 3 / 撤离路线 2',op:14,np:82},
    {t:25,tag:'闭环',h:'<em>卫星短报文</em>指挥无网区队伍',d:'火场深处无公网，指令经卫星短报文直达一线；无人机前突复核并将现场画面回传，修正模型预测。',l:'卫星短报文下发指令，无人机复核回传',op:18,np:100}
  ]},
  {n:'城市特大暴雨内涝',d:'沿海城市 · 特大暴雨',k:'flood',old:360,new:22,steps:[
    {t:0,tag:'监测',h:'气象卫星监测<em>强对流云团</em>',d:'静止气象卫星每 5 分钟一次区域观测，AI 识别出强对流云团并向城市方向移动。',l:'气象卫星识别强对流云团',op:2,np:8},
    {t:3,tag:'预判',h:'AI <em>预判内涝风险点位</em>',d:'模型融合降雨预报、数字高程、管网拓扑、历史积水点，预判 37 处高风险内涝点。',l:'预判高风险内涝点 37 处',op:4,np:24},
    {t:6,tag:'预警',h:'<em>提前 40 分钟</em>发布预警',d:'向交警、排水、地铁、应急联动发布分级预警，建议预置排水泵车与交通管制点位。',l:'分级预警发布，预置力量 12 处',op:6,np:40},
    {t:12,tag:'实况',h:'SAR <em>穿透雨云</em>提取淹没范围',d:'暴雨云层下光学完全失效，SAR 卫星成像提取实际淹没范围 18.6 km²，与预判吻合度 87%。',l:'SAR 提取淹没范围 18.6 km²',op:10,np:58},
    {t:15,tag:'核查',h:'在轨 AI <em>识别中断道路</em>',d:'星上 AI 比对路网数据，自动识别 9 条中断道路、2 处下穿隧道积水，生成绕行方案。',l:'识别中断道路 9 条 / 隧道 2 处',op:14,np:70},
    {t:18,tag:'调度',h:'智能体<em>生成处置指令</em>',d:'自动生成排水力量调度、公交绕行、地铁限流、救援通道保障方案，并推送至各处置单位。',l:'排水/交通/救援联合方案下发',op:18,np:86},
    {t:22,tag:'复盘',h:'持续监测 · <em>每 15 分钟</em>更新',d:'卫星与物联水位计持续联动，积水退去过程全程记录，自动生成本次内涝复盘报告。',l:'退水监测完成，复盘报告生成',op:22,np:100}
  ]},
  {n:'远海船舶遇险',d:'西太平洋 · 渔船求救',k:'ship',old:480,new:18,steps:[
    {t:0,tag:'求救',h:'<em>卫星短报文</em>发出求救',d:'渔船在无公网海域触发卫星短报文求救，位置与船号即时上星。',l:'卫星短报文求救信号上星',op:4,np:12},
    {t:1,tag:'定位',h:'AIS + 卫星<em>交叉定位</em>',d:'融合星载 AIS 与卫星定位，确认船舶位置，排除 AIS 关闭导致的误判。',l:'AIS/卫星交叉定位确认',op:6,np:26},
    {t:4,tag:'搜索',h:'广域搜索雷达<em>锁定目标</em>',d:'调度 SAR 卫星对 200 km 半径海域成像，海面目标检测模型排除浪涌与岛屿干扰。',l:'SAR 广域搜索 200 km 半径',op:8,np:42},
    {t:7,tag:'识别',h:'星上 AI<em>确认遇险船只</em>',d:'在轨模型识别出倾覆船体与救生筏，置信度 0.94，仅回传切片与坐标。',l:'识别遇险船体 + 救生筏，置信度 0.94',op:10,np:58},
    {t:10,tag:'预测',h:'大模型<em>预测漂移轨迹</em>',d:'融合海流、风场、波浪数据，预测未来 6 小时人员漂移概率分布，划定最优搜索区。',l:'生成 6 h 漂移概率分布图',op:12,np:72},
    {t:13,tag:'指挥',h:'<em>低轨通信</em>建立现场指挥链路',d:'救援船只与指挥中心通过低轨卫星建立宽带链路，现场视频回传，远程会商。',l:'低轨宽带链路建立，视频回传',op:14,np:86},
    {t:18,tag:'救援',h:'力量到位 · <em>持续保障</em>',d:'救援力量抵达目标区，卫星持续提供海况与位置更新直至救援结束。',l:'救援力量抵达，持续保障中',op:18,np:100}
  ]},
  {n:'农业干旱预警',d:'华北平原 · 夏玉米拔节期',k:'crop',old:720,new:36,steps:[
    {t:0,tag:'监测',h:'多光谱<em>逐旬长势监测</em>',d:'光学与多光谱卫星按旬获取 NDVI，覆盖全域耕地，长势曲线自动入库。',l:'全域 NDVI 长势数据更新',op:2,np:10},
    {t:6,tag:'识别',h:'AI <em>发现长势异常区</em>',d:'对比历史同期与相邻地块，识别出 4.2 万亩 NDVI 显著偏低区域。',l:'识别长势异常区 4.2 万亩',op:5,np:24},
    {t:12,tag:'诊断',h:'高光谱<em>诊断胁迫类型</em>',d:'高光谱数据判别为水分胁迫（非病虫害），结合土壤水分遥感确认根层含水量不足。',l:'诊断为水分胁迫，土壤含水量偏低',op:8,np:38},
    {t:18,tag:'预警',h:'<em>干旱等级</em>划分与预警',d:'融合未来 15 天降水预报，划分三级干旱预警区，明确优先灌溉顺序。',l:'三级干旱预警发布',op:12,np:54},
    {t:24,tag:'调度',h:'智能体<em>生成灌溉调度</em>',d:'结合灌区渠系能力、机井分布与作物需水模型，生成分区域轮灌计划与水量分配。',l:'轮灌计划生成，水量分配下发',op:16,np:70},
    {t:30,tag:'评估',h:'<em>产量损失</em>预估',d:'单产预测模型给出减产幅度预估，同步推送保险机构用于预赔与定损准备。',l:'减产预估完成，同步保险机构',op:20,np:86},
    {t:36,tag:'复核',h:'降雨后<em>效果复核</em>',d:'SAR 穿透连阴雨云层复核土壤水分恢复情况，闭环评估灌溉成效。',l:'SAR 复核土壤水分恢复情况',op:24,np:100}
  ]}
];
/* 推演底图：AI 实景照片（SIM_IMG_SRC，key 与 SIM[].k 对应），加载失败退回程序化地形 */
const SIMIMGS=(typeof SIM_IMG_SRC!=='undefined')?(()=>{const o={};for(const k in SIM_IMG_SRC){const im=new Image();im.src=SIM_IMG_SRC[k];
  im.onload=function(){const sec=document.getElementById('s6');
    if(sec&&sec.classList.contains('on')&&!simPlaying)drawSim(simStepI<0?0:simStepI/Math.max(1,SIM[simIdx].steps.length-1),0);};
  o[k]=im;}return o;})():null;
let simIdx=0,simStepI=-1,simTimer=null,simPlaying=false;
let simGap=3400;   /* 每一步推演的间隔；展示模式会按解说节奏调快 */
document.getElementById('simScenes').innerHTML=SIM.map((s,i)=>
  '<div class="simBtn'+(i===0?' on':'')+'" data-i="'+i+'"><b>'+s.n+'</b><span>'+s.d+' · 传统 '+Math.round(s.old/60)+' h → 平台 '+s.new+' min</span></div>').join('');
document.querySelectorAll('.simBtn').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.simBtn').forEach(x=>x.classList.remove('on'));b.classList.add('on');
  simIdx=+b.dataset.i;simStepI=-1;simPlaying=false;
  document.getElementById('simPlay').textContent='▶ 开始推演';
  document.getElementById('logList').innerHTML='';
  document.getElementById('simT').textContent='00:00';document.getElementById('simTag').textContent='待命';
  document.getElementById('stepNow').textContent=SIM[simIdx].n+' · 点击「开始推演」';
  document.getElementById('stepDesc').textContent=SIM[simIdx].steps[0].d;
  document.getElementById('cmpOld').style.width='0';document.getElementById('cmpNew').style.width='0';
  document.getElementById('cmpOldV').textContent='—';document.getElementById('cmpNewV').textContent='—';
  drawSim(0,0);});
function simRender(){
  const S=SIM[simIdx],st=S.steps[Math.max(0,simStepI)];
  document.getElementById('logList').innerHTML=S.steps.map((s,i)=>
    '<div class="logItem'+(i<simStepI?' done':i===simStepI?' active':'')+'"><div class="lt2">T+'+String(s.t).padStart(2,'0')+'</div><div class="ltx">'+s.l+'</div></div>').join('');
  const act=document.querySelector('.logItem.active');if(act)act.scrollIntoView({block:'nearest',behavior:'smooth'});
  const mm=String(st.t).padStart(2,'0');
  document.getElementById('simT').textContent=mm+':00';
  document.getElementById('simTag').textContent=st.tag;
  document.getElementById('stepNow').innerHTML=st.h;
  document.getElementById('stepDesc').textContent=st.d;
  const oldP=st.op,newP=st.np;
  document.getElementById('cmpOld').style.width=oldP+'%';
  document.getElementById('cmpNew').style.width=newP+'%';
  document.getElementById('cmpOldV').textContent=Math.round(S.old*(oldP/100))+' min';
  document.getElementById('cmpNewV').textContent=Math.round(S.new*(newP/100))+' min';
  drawSim(simStepI/Math.max(1,S.steps.length-1),st.np/100);
}
function simStep(d){
  const S=SIM[simIdx];
  simStepI=Math.max(0,Math.min(S.steps.length-1,simStepI+d));
  simRender();
}
function simToggle(){
  const S=SIM[simIdx];
  if(simPlaying){clearTimeout(simTimer);simPlaying=false;document.getElementById('simPlay').textContent='▶ 继续推演';return;}
  if(simStepI>=S.steps.length-1)simStepI=-1;
  simPlaying=true;document.getElementById('simPlay').textContent='❚❚ 暂停';
  document.getElementById('simScan').style.display='block';
  const tick=()=>{if(!simPlaying)return;simStep(1);
    if(simStepI>=S.steps.length-1){simPlaying=false;document.getElementById('simPlay').textContent='↻ 重新推演';
      document.getElementById('simScan').style.display='none';return;}
    simTimer=setTimeout(tick,simGap);};
  tick();
}
/* 自动演示用：切到第 i 个场景并从头推演（与解说词逐句对应） */
function simAuto(i){
  var b=document.querySelector('.simBtn[data-i="'+i+'"]');
  if(!b)return;
  b.click();                       /* 点击即复位到该场景：simStepI=-1, simPlaying=false */
  if(!simPlaying)simToggle();
}
/* 推演态势图 */
const simCv=document.getElementById('simCv');
let simBase=null,simW=0,simH=0;
function simBuild(){const d=cvFit(simCv),W=simCv.width/d,H=simCv.height/d;simW=W;simH=H;
  simBase=new Float32Array(Math.floor(W/4)*Math.floor(H/4));let i=0;
  for(let y=0;y<H;y+=4)for(let x=0;x<W;x+=4)simBase[i++]=fbm(x/120+3,y/120+5,5);}
function drawSim(prog,conf){
  const d=cvFit(simCv),g=simCv.getContext('2d');
  const W=simCv.width/d,H=simCv.height/d;
  if(!simBase||Math.abs(W-simW)>2||Math.abs(H-simH)>2)simBuild();
  g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,W,H);
  const kind=SIM[simIdx].k,step=4,cols=Math.floor(W/step),rows=Math.floor(H/step);
  const t=performance.now()/1000;
  const simImg=SIMIMGS?SIMIMGS[kind]:null;
  const useImg=simImg&&simImg.complete&&simImg.naturalWidth;
  if(useImg){
    drawImgCover(g,simImg,W,H);
    g.fillStyle='rgba(3,7,15,.28)';g.fillRect(0,0,W,H);
    /* 进度染色：保留推演推进的视觉反馈 */
    if(kind==='fire'){const rr=.06+prog*.34;
      const gr2=g.createRadialGradient(W*.5,H*.5,0,W*.5,H*.5,W*rr);
      gr2.addColorStop(0,'rgba(255,110,50,'+(.34*Math.min(1,prog*1.6+.15))+')');gr2.addColorStop(1,'rgba(255,110,50,0)');
      g.fillStyle=gr2;g.fillRect(0,0,W,H);}
    else if(kind==='flood'){g.fillStyle='rgba(30,90,170,'+(prog*.26)+')';g.fillRect(0,H*(1-prog*.5),W,H*prog*.5);}
    else if(kind==='crop'){g.fillStyle='rgba(190,150,60,'+(prog*.16)+')';g.fillRect(0,0,W,H);}
  }else{
  for(let ry=0;ry<rows;ry++)for(let rx=0;rx<cols;rx++){
    const h=simBase[ry*cols+rx],fx=rx/cols,fy=ry/rows;let r,gg,b;
    if(kind==='fire'||kind==='crop'){
      if(h<.42){r=30;gg=64;b=104;}
      else if(kind==='crop'){const dry=prog;r=70+Math.floor(h*90+dry*110);gg=110+Math.floor(h*70-dry*40);b=52+Math.floor(h*30-dry*30);}
      else {r=46+Math.floor(h*70);gg=96+Math.floor(h*70);b=54+Math.floor(h*30);}
    }else if(kind==='flood'){
      if(h<.40+prog*.16){r=26+Math.floor(h*10);gg=70+prog*40;b=120+prog*60;}
      else {r=54+Math.floor(h*60);gg=88+Math.floor(h*50);b=70+Math.floor(h*30);}
    }else{r=18;gg=48;b=92;const w=Math.sin(fx*18+t*.8)*.02;r+=w*300;gg+=w*200;b+=w*120;}
    // 事件图层
    if(kind==='fire'){const d2=Math.hypot(fx-.5,fy-.5);
      if(d2<(.05+prog*.30)){const inten=1-d2/(.05+prog*.30);
        if(Math.sin(d2*70+t*3)>0){r=Math.min(255,r+inten*210);gg=Math.min(255,gg+inten*(90+Math.sin(t*6)*40));b=Math.min(255,b+inten*20);}
        else {r=r*.35+30;gg=gg*.35+30;b=b*.35+34;}}
      const dd=Math.hypot(fx-.5-prog*.22,fy-.5-prog*.18);
      if(dd<.10){const a=Math.min(.8,(1-dd/.10)*prog);r=r*(1-a)+170*a;gg=gg*(1-a)+170*a;b=b*(1-a)+175*a;}}
    if(kind==='ship'){const d2=Math.hypot(fx-.42,fy-.44);
      if(d2<(.03+prog*.11)){const inten=(1-d2/(.03+prog*.11))*.45;gg=Math.min(255,gg+inten*60);b=Math.min(255,b+inten*30);}}
    if(kind==='crop'&&Math.abs(fy-.5)<.02){r=200;gg=170;b=90;}   // 道路
    g.fillStyle='rgb('+(r|0)+','+(gg|0)+','+(b|0)+')';
    g.fillRect(rx*step,ry*step,step+1,step+1);
  }
  }
  // 卫星过境扫描条
  const sx=((t*.16)%1)*W;
  const gr=g.createLinearGradient(sx-70,0,sx+70,0);
  gr.addColorStop(0,'rgba(37,230,192,0)');gr.addColorStop(.5,'rgba(37,230,192,.28)');gr.addColorStop(1,'rgba(37,230,192,0)');
  g.fillStyle=gr;g.fillRect(sx-70,0,140,H);
  g.strokeStyle='rgba(160,255,240,.55)';g.lineWidth=1.4;g.beginPath();g.moveTo(sx,0);g.lineTo(sx,H);g.stroke();
  // 目标框
  const boxes=kind==='ship'?[[.38,.40,.09,.075]]:kind==='fire'?[[.44,.44,.14,.13],[.56,.36,.07,.06]]:kind==='flood'?[[.30,.42,.16,.13],[.56,.56,.12,.10]]:[[.28,.34,.20,.16],[.56,.54,.16,.13]];
  boxes.forEach((b,i)=>{const x=b[0]*W,y=b[1]*H,w=b[2]*W,h=b[3]*H;
    if(prog<=0&&i>0)return;
    g.strokeStyle='rgba(255,204,92,.95)';g.lineWidth=2;g.strokeRect(x,y,w,h);
    g.fillStyle='rgba(255,204,92,.12)';g.fillRect(x,y,w,h);
    g.fillStyle='rgba(255,204,92,.95)';g.font='700 13px sans-serif';
    const lb=kind==='fire'?(i?'暗火 0.93':'火场 0.98'):kind==='flood'?(i?'内涝点 0.91':'淹没区 0.96'):kind==='ship'?'遇险船只 0.94':(i?'次生区 0.88':'胁迫区 0.95');
    g.fillText(lb,x+3,y-6);});
  // 数据流：目标 → 卫星 → 地面站
  const gx=W-92,gy=H-70;
  const tgt=[boxes[0][0]*W+boxes[0][2]*W/2,boxes[0][1]*H+boxes[0][3]*H/2];
  const sat=[W-92,86];
  g.strokeStyle='rgba(63,169,255,.5)';g.setLineDash([6,5]);g.lineDashOffset=-(performance.now()/28)%22;g.lineWidth=1.8;
  g.beginPath();g.moveTo(gx,gy);g.lineTo(sat[0],sat[1]);g.lineTo(tgt[0],tgt[1]);g.stroke();g.setLineDash([]);
  for(let i=0;i<4;i++){const p=((performance.now()/1500+i/4)%1);
    const a=tgt,b=i%2?sat:[gx,gy];
    const px=a[0]+(b[0]-a[0])*p,py=a[1]+(b[1]-a[1])*p;
    g.fillStyle='rgba(170,235,255,.95)';g.beginPath();g.arc(px,py,3,0,6.283);g.fill();}
  // 卫星图标
  g.save();g.translate(sat[0],sat[1]);g.fillStyle='#3fa9ff';g.shadowColor='rgba(63,169,255,.9)';g.shadowBlur=14;
  g.beginPath();g.arc(0,0,7,0,6.283);g.fill();g.restore();
  g.fillStyle='rgba(180,225,255,.9)';g.font='700 13px sans-serif';g.fillText('🛰 在轨 AI',sat[0]+12,sat[1]+4);
  // 地面站
  g.fillStyle='#ffcc5c';g.beginPath();g.arc(gx,gy,6,0,6.283);g.fill();
  g.fillStyle='rgba(255,235,180,.9)';g.font='700 13px sans-serif';g.fillText('地面站 · 边缘算力',gx-96,gy+5);
  if(!simPlaying&&simStepI<SIM[simIdx].steps.length-1)return;
  requestAnimationFrame(()=>drawSim(prog,conf));
}
ENTERS[6]=()=>{simBase=null;if(simStepI<0){simW=0;simH=0;drawSim(0,0);}else simRender();};

/* ===================== S7 AI 驾驶舱 ===================== */
/* 决策辅助 · 内联配图（SVG，深色底，answer() 以 data:image/svg+xml 渲染） */
const ANS_SVG={
risk:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 172"><rect width="560" height="172" rx="10" fill="#081322"/><rect x="14" y="12" width="532" height="148" rx="10" fill="#0c1a30" stroke="#223c5e"/><text x="32" y="40" fill="#8aa3c0" font-size="15">未来 24h 辖区风险分布（示意）</text><circle cx="150" cy="92" r="28" fill="rgba(255,122,69,.2)" stroke="#ff7a45" stroke-width="2"/><circle cx="150" cy="92" r="8" fill="#ff7a45"/><text x="150" y="140" fill="#ffb59a" font-size="14" text-anchor="middle">① 西南林区 · 火险极高</text><circle cx="322" cy="84" r="23" fill="rgba(63,169,255,.18)" stroke="#3fa9ff" stroke-width="2"/><circle cx="322" cy="84" r="7" fill="#3fa9ff"/><text x="322" y="126" fill="#9fd0ff" font-size="14" text-anchor="middle">② 中部城区 · 内涝高</text><circle cx="452" cy="70" r="18" fill="rgba(255,204,92,.16)" stroke="#ffcc5c" stroke-width="2"/><circle cx="452" cy="70" r="6" fill="#ffcc5c"/><text x="452" y="106" fill="#ffe0a8" font-size="14" text-anchor="middle">③ 东部库区 · 形变中</text></svg>',
typhoon:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 172"><rect width="560" height="172" rx="10" fill="#081322"/><path d="M0,118 C110,106 210,126 330,116 C430,108 510,120 560,110 L560,172 L0,172 Z" fill="#0e2138"/><path d="M0,118 C110,106 210,126 330,116 C430,108 510,120 560,110" fill="none" stroke="#2e5078" stroke-width="2"/><g stroke="none"><ellipse cx="118" cy="132" rx="66" ry="17" fill="rgba(255,92,108,.28)" stroke="#ff5c6c" stroke-width="1.6"/><ellipse cx="268" cy="130" rx="58" ry="15" fill="rgba(255,154,92,.26)" stroke="#ff9a5c" stroke-width="1.6"/><ellipse cx="400" cy="128" rx="52" ry="13" fill="rgba(255,204,92,.22)" stroke="#ffcc5c" stroke-width="1.6"/></g><text x="118" y="137" fill="#ffb3ba" font-size="13" text-anchor="middle">红色·必须转移</text><text x="268" y="135" fill="#ffd0ae" font-size="13" text-anchor="middle">橙色·建议转移</text><text x="400" y="133" fill="#ffe9b0" font-size="13" text-anchor="middle">黄色·就地避险</text><circle cx="452" cy="44" r="15" fill="none" stroke="#ff8a92" stroke-width="3"/><circle cx="452" cy="44" r="26" fill="none" stroke="rgba(255,138,146,.45)" stroke-width="2" stroke-dasharray="6 5"/><path d="M452,74 L452,96 M444,88 L452,97 L460,88" stroke="#ff8a92" stroke-width="2.4" fill="none"/><text x="478" y="40" fill="#ff8a92" font-size="14">台风中心</text><text x="478" y="60" fill="#8aa3c0" font-size="13">36h 后登陆</text></svg>',
cost:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 158"><rect width="560" height="158" rx="10" fill="#081322"/><text x="24" y="36" fill="#8aa3c0" font-size="15">同等覆盖面积 · 年成本对比（万元/km²·年）</text><text x="24" y="76" fill="#c3d6ec" font-size="15">地面摄像头+铁塔+运维</text><rect x="248" y="60" width="264" height="22" rx="7" fill="#ff5c6c" opacity=".85"/><text x="524" y="77" fill="#ff8a92" font-size="16" font-weight="bold" text-anchor="end" dx="-6">18</text><text x="24" y="112" fill="#c3d6ec" font-size="15">卫星数据+算力</text><rect x="248" y="97" width="7" height="22" rx="3.5" fill="#25e6c0"/><text x="268" y="114" fill="#25e6c0" font-size="16" font-weight="bold">0.4</text><text x="24" y="146" fill="#ffcc5c" font-size="15" font-weight="bold">相差约 45 倍 —— 广域覆盖，卫星的边际成本近乎为零</text></svg>'};

const QA=[
  {q:'未来 24 小时，辖区内最需要关注的风险是什么？',
   res:[['h','风险研判结论（未来 24 h）'],
    ['p','综合气象卫星水汽通道、地面物联监测与历史灾情样本，识别出 <b style="color:#ffcc5c">3 处中高风险区域</b>，按优先级排序：'],
    ['p','<b>① 西南林区（A 县）</b> — 连续 12 天无有效降水，可燃物含水率降至 14%，叠加午后雷暴，火险等级 <b style="color:#ff5c6c">极高</b>。建议：红外卫星加密至每 30 min 一次。'],
    ['p','<b>② 中部城区（B 区）</b> — 预报 6 h 内降水 85 mm，管网满负荷，历史积水点 11 处中 <b style="color:#3fa9ff">7 处</b> 位于风险区。建议：预置泵车、提前交通管制。'],
    ['p','<b>③ 东部库区（C 水库）</b> — InSAR 时序显示坝体近 30 天累计形变 <b style="color:#ffcc5c">6.8 mm</b>，速率略增。建议：加密形变监测并安排现场复核。'],
    ['i',(typeof ANS_IMG_SRC!=='undefined'&&ANS_IMG_SRC.risk)?ANS_IMG_SRC.risk:ANS_SVG.risk],
    ['h','本次自动编排的资源'],
    ['c',['红外载荷 ×2','低轨过境 6 次','SAR 应急成像 ×1','边缘算力 32 卡时','大模型：火险/内涝/形变 三模型并行']],
    ['p','<span style="color:#8aa3c0">整体置信度 0.87 · 全程耗时 42 秒 · 全程无需人工干预</span>']]},
  {q:'台风将在 36 小时后登陆，哪些区域必须转移？',
   res:[['h','转移研判（登陆前 36 h → 登陆后 12 h）'],
    ['p','融合台风路径预报、数字高程、SAR 历史淹没范围与人口热力，生成 <b style="color:#ffcc5c">三级转移清单</b>：'],
    ['p','<b>必须转移（红色）</b>：沿海低洼 11 个村，<b style="color:#ff5c6c">4,270 人</b>；风暴潮增水叠加天文大潮，预计淹没深度 1.8—3.2 m。'],
    ['p','<b>建议转移（橙色）</b>：山洪与地质灾害隐患点 23 处，<b style="color:#ff9a5c">1,860 人</b>；土壤含水量已饱和。'],
    ['p','<b>就地避险（黄色）</b>：老旧房屋与简易工棚 <b style="color:#ffcc5c">3,150 人</b>，需加固或集中安置。'],
    ['i',(typeof ANS_IMG_SRC!=='undefined'&&ANS_IMG_SRC.typhoon)?ANS_IMG_SRC.typhoon:ANS_SVG.typhoon],
    ['h','转移路径与安置'],
    ['p','规划 <b>6 条撤离主通道</b>（已避开 4 处易淹路段），安置点容量 9,800 人，物资缺口：折叠床 1,200 张、饮用水 42 吨。'],
    ['c',['气象卫星 5 min 频度','SAR 穿云成像','夜光遥感核实地块','路网+人口融合模型','智能体自动生成撤离方案']],
    ['p','<span style="color:#8aa3c0">登陆后每 30 min 更新一次淹没范围，动态调整转移范围</span>']]},
  {q:'西部偏远山区地面网络全断，我们还能指挥吗？',
   res:[['h','结论：能 —— 这正是「通」这一层存在的原因'],
    ['p','地面公网中断时，系统自动切换至 <b>卫星链路</b>，指挥能力不降级：'],
    ['p','<b>看得见</b>：SAR 卫星穿透云雨成像，不受地面条件限制，30 min 内给出灾区全域影像与道路中断情况。'],
    ['p','<b>连得上</b>：一线队伍配备卫星终端 / 卫星短报文，无公网也可双向通信；低轨宽带可在 15 min 内开通现场视频回传。'],
    ['p','<b>指得动</b>：指令经短报文直达个人终端，回执状态实时可见，队伍位置在指挥大屏上一图呈现。'],
    ['h','演练验证'],
    ['p','2025 年某次「三断」实战演练：公网中断 <b style="color:#ffcc5c">4 小时 12 分</b>，期间指令下发 <b style="color:#25e6c0">63 条</b>，回执率 <b style="color:#25e6c0">100%</b>，态势更新 <b>9 次</b>。'],
    ['c',['高通量卫星 2 Mbps','卫星短报文 1000 字/次','低轨宽带 20 Mbps','星地一体自动切换','终端离线缓存补传']],
    ['p','<span style="color:#8aa3c0">建议：为县级应急队伍标配卫星终端，纳入年度预算</span>']]},
  {q:'为什么不能只用 5G 和摄像头，一定要上卫星？',
   res:[['h','一句话：5G 覆盖 20% 的国土，但要守住 100% 的风险'],
    ['p','地面手段与卫星不是替代关系，而是 <b>分工</b>：地面负责「看得细」，卫星负责「看得全、进得去、断不了」。'],
    ['p','<b>① 覆盖率</b>：地面基站主要覆盖人口密集区，广袤山区、林区、海域、荒漠基本无覆盖 —— 而灾害恰恰常发生在这些地方。'],
    ['p','<b>② 抗毁性</b>：地面网络依赖机房供电与光缆，灾害中极易整体失效；卫星链路不依赖地面设施，是唯一的「不断线」通道。'],
    ['p','<b>③ 全天候</b>：摄像头夜间与浓雾下失效，SAR 卫星穿云透雨、全天时成像。'],
    ['p','<b>④ 尺度</b>：一次卫星成像覆盖上万平方公里，等于数万路摄像头同时巡查，边际成本近乎为零。'],
    ['h','成本对比（同等覆盖面积）'],
    ['p','地面摄像头 + 铁塔 + 供电 + 传输 + 运维：约 <b style="color:#ff8a92">18 万元/km²·年</b>；卫星数据 + 算力：约 <b style="color:#25e6c0">0.4 万元/km²·年</b>，<b style="color:#ffcc5c">相差约 45 倍</b>。'],
    ['i',ANS_SVG.cost],
    ['c',['广域普查用卫星','重点区域用摄像头','互为备份互相校验','统一时空底座融合']]]},
  {q:'这套体系一年能省多少钱、值不值？',
   res:[['h','投入产出测算（以省级规模、3 年建设期为例）'],
    ['p','<b>投入</b>：卫星资源采购 + 算力设施 + 平台研发 + 运营，3 年合计约 <b style="color:#8fd3ff">4.6 亿元</b>，年均 1.5 亿元。'],
    ['p','<b>直接节省</b>：替代人工巡查与外业核查 <b>6,800 万元/年</b>；减少重复建设（四板块共用一套底座）<b>3,200 万元/年</b>；压缩保险定损与理赔周期带来的经济社会效益 <b>1.1 亿元/年</b>。'],
    ['p','<b>风险减量</b>：按历史灾均损失与响应时效弹性测算，响应时效由 6 h 缩短至 30 min，预计年均减少灾害损失 <b style="color:#25e6c0">2.4 亿元</b>。'],
    ['h','结论'],
    ['p','静态投资回收期约 <b style="color:#ffcc5c">2.4 年</b>；若计入生命安全保障与重大事件政治影响，<b>这项投入无法用常规 ROI 度量</b>。'],
    ['c',['一套底座四板块复用','按次付费的卫星资源','算力弹性伸缩按需计费','避免各委办局重复立项']],
    ['p','<span style="color:#8aa3c0">注：以上为规划阶段测算示意，需以本单位基线数据校准</span>']]}
];
document.getElementById('qList').innerHTML=QA.map((x,i)=>'<div class="qBtn" data-i="'+i+'">'+x.q+'</div>').join('');
document.querySelectorAll('.qBtn').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.qBtn').forEach(x=>x.classList.remove('on'));b.classList.add('on');
  answer(+b.dataset.i);});
let ansTimers=[];
function answer(i){
  ansTimers.forEach(clearTimeout);ansTimers=[];
  const tb=document.getElementById('termBody');tb.innerHTML='';
  document.getElementById('termSub').textContent='正在编排资源…';
  const th=document.createElement('div');th.className='thinking';
  th.innerHTML='<i></i><i></i><i></i> 智能体正在理解问题、编排卫星与算力资源…';tb.appendChild(th);
  let k=0;
  const push=()=>{
    if(k===0){th.remove();document.getElementById('termSub').textContent='已完成编排 · 用时 '+(1.2+Math.random()*1.4).toFixed(1)+' s';}
    if(k>=QA[i].res.length)return;
    const[type,val]=QA[i].res[k++];const div=document.createElement('div');div.className='answerLine';
    if(type==='h')div.innerHTML='<h5>◆ '+val+'</h5>';
    else if(type==='c')div.innerHTML=val.map(c=>'<span class="chip">'+c+'</span>').join('');
    else if(type==='i'){const src=val.indexOf('data:image')===0?val:('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(val));
      div.innerHTML='<img class="ansImg" src="'+src+'"/>';}
    else div.innerHTML='<div style="margin-bottom:6px">'+val+'</div>';
    tb.appendChild(div);tb.scrollTop=tb.scrollHeight;
    ansTimers.push(setTimeout(push,type==='h'?260:type==='c'?220:520));
  };
  ansTimers.push(setTimeout(push,1300));
}
ENTERS[8]=()=>{if(!document.querySelector('.qBtn.on'))answer(0);};

/* ===================== S8 KPI ===================== */
ENTERS[9]=()=>{countUp(document.getElementById('v1'),100,1500,'%');countUp(document.getElementById('v2'),30,1500,'min');
  countUp(document.getElementById('v3'),99,1500,'%');countUp(document.getElementById('v4'),45,1500,'%');
  countUp(document.getElementById('v5'),0,1500,'%');};

/* ===================== S10 调度演练场（展会互动小游戏） =====================
   玩家流程：接收任务 → 选卫星（测运控上注）→ 星上成像切片 → 回传地面站 →
   AI 融合分析 → 派无人机/机器狗 → 报告生成与评级。得分制：选对卫星/空地协同/速度。 */
const GSTEPS=['接收任务','测运控 · 上注指令','卫星成像 · 在轨切片','数据回传地面站','AI 融合分析研判','调度无人装备','报告生成 · 完成'];
const GSATS=[
 {id:'opt',n:'光学卫星',d:'亚米级成像 · 怕云怕夜'},
 {id:'sar',n:'SAR 雷达卫星',d:'穿云透雨 · 全天候成像'},
 {id:'ir',n:'红外热成像卫星',d:'穿透烟雾 · 识别高温点'},
 {id:'hyp',n:'高光谱卫星',d:'物质指纹 · 辨作物胁迫'}
];
const GASSETS={ /* 装备库（按场景逻辑选用） */
 drone:{n:'无人机',d:'空中侦察 · 快速抵达',ok:'无人机穿烟抵近，最快确认现场态势'},
 dog:{n:'机器狗',d:'地面贴近 · 精细核查',ok:''},
 ugv:{n:'无人车',d:'地面巡线 · 载荷更大',ok:''},
 boat:{n:'无人船',d:'水面机动 · 抵近核查',ok:'无人船涉水抵近，核查积水深度与管涌'},
 heli:{n:'直升机',d:'空中救援 · 悬停吊运',ok:'直升机航程远、可悬停，是远海搜救主力'},
 cam:{n:'长焦摄像头',d:'定点瞭望 · 持续监视',ok:''},
 irr:{n:'自动灌溉',d:'按需启停 · 精准补水',ok:''}
};
const GWHY={ /* 非最优选项的一句话说明（弹窗用，key=场景_装备） */
 '0_dog':'林间山地崎岖，机器狗推进慢、视野低',
 '0_ugv':'无路林区无人车难以通行',
 '0_cam':'固定摄像头建网周期长，赶不上火势',
 '1_drone':'城区楼群遮挡，空中视角难探水下',
 '1_dog':'积水区机器狗易涉水故障',
 '1_cam':'内涝点分散，固定监控难以覆盖',
 '2_drone':'小型无人机航程与抗风能力有限',
 '2_boat':'无人船赶赴远海耗时太长',
 '2_cam':'海上无固定安装条件',
 '3_dog':'垄间穿行易伤苗，速度也慢',
 '3_cam':'固定点位难以看清整片条田',
 '3_irr':'灌溉需先确认旱情分布再调度'
};
const GSC=[
 {n:'山林火情',brief:'护林员报告：山区疑似出现火点，烟雾弥漫。请最快确认火场范围并组织处置。',sat:'ir',best:'drone',opts:['drone','dog','ugv','cam'],pos:[.56,.42],cl:'255,122,69'},
 {n:'城市内涝',brief:'气象台：暴雨红色预警，城区多点积水。请评估淹没范围并排查中断道路。',sat:'sar',best:'boat',opts:['drone','boat','dog','cam'],pos:[.44,.56],cl:'63,169,255'},
 {n:'海上搜救',brief:'海事局：远海渔船失联，最后信号位于外海。请尽快定位遇险船只并组织救援。',sat:'sar',best:'heli',opts:['heli','drone','boat','cam'],pos:[.58,.5],cl:'90,200,230'},
 {n:'农田旱情',brief:'农业局：连日高温，玉米产区疑似干旱。请诊断胁迫范围并指导灌溉。',sat:'hyp',best:'drone',opts:['drone','dog','cam','irr'],pos:[.5,.5],cl:'61,220,132'}
];
let G={ph:-1,sc:0,pts:0,t0:0,satSel:null,asset:null,auto:false,timers:[]};
const gameCv=document.getElementById('gameCv');
let gW=0,gH=0,gBase=null,gBaseKey='';
/* ---- 确定性伪随机（底图每次烘焙结果一致，不会闪烁） ---- */
let _sd=20260921;
function gRndNew(s){_sd=s||20260921;}
function gRnd(){_sd=(_sd*1103515245+12345)&0x7fffffff;return _sd/0x7fffffff;}
function rgba(r,g,b,a){return 'rgba('+(r|0)+','+(g|0)+','+(b|0)+','+a+')';}

/* ===================== 三种任务的专属底图（离屏烘焙，每帧只 drawImage） ===================== */
function sceneForest(x,W,H,U){
  const gr=x.createLinearGradient(0,0,0,H);
  gr.addColorStop(0,'#0b1b2e');gr.addColorStop(1,'#08201c');x.fillStyle=gr;x.fillRect(0,0,W,H);
  const step=Math.max(3,Math.round(6*U));
  const sc2=190*U;
  gRndNew(9137);
  for(let y=0;y<H;y+=step)for(let px=0;px<W;px+=step){
    const h=fbm(px/sc2+9,(y/sc2)+4,5);
    let r,gg,b;
    if(h<.34){r=20;gg=52;b=96;}                                   /* 水体 */
    else if(h<.44){r=30+((h-.34)*180)|0;gg=72+((h-.34)*150)|0;b=48+((h-.34)*40)|0;} /* 河谷 */
    else{const k=(h-.44)/.56;
      r=26+k*74;gg=64+k*66;b=34+k*30;                              /* 山林：越高的山脊偏枯黄灰 */
      if(h>.74){r+=18;gg+=16;b+=14;}}
    x.fillStyle=rgba(r,gg,b,1);x.fillRect(px,y,step+1,step+1);}
  /* 河道 */
  x.strokeStyle='rgba(48,110,175,.75)';x.lineWidth=8*U;x.lineCap='round';
  x.beginPath();
  for(let t=0;t<=1.001;t+=.02){const px=t*W,py=H*.72+Math.sin(t*5.2)*H*.09-t*H*.30;
    t===0?x.moveTo(px,py):x.lineTo(px,py);}
  x.stroke();
  /* 林木纹理 */
  const n=Math.round(W*H/(2100*U*U));
  for(let i=0;i<n;i++){
    const px=gRnd()*W,py=gRnd()*H,h=fbm(px/sc2+9,py/sc2+4,5);
    if(h<.40)continue;
    const s=(1.6+gRnd()*2.2)*U,dark=h>.7;
    x.fillStyle=dark?'rgba(58,86,44,.75)':'rgba(16,44,26,.65)';
    x.beginPath();x.ellipse(px,py,s*1.5,s,0,0,6.283);x.fill();}
  /* 山脊等高线 */
  x.strokeStyle='rgba(190,225,255,.07)';x.lineWidth=1*U;
  for(let k=1;k<7;k++){x.beginPath();
    for(let t=0;t<=1.001;t+=.02){const px=t*W,py=H*k/8+Math.sin(t*3.4+k)*H*.045;
      t===0?x.moveTo(px,py):x.lineTo(px,py);}
    x.stroke();}
  x.fillStyle='rgba(150,200,180,.55)';x.font=700*(15*U)+'px sans-serif';
  x.fillText('林场 · 山地/河谷地形',14*U,H-14*U);
}
function sceneCity(x,W,H,U){
  const gr=x.createLinearGradient(0,0,0,H);
  gr.addColorStop(0,'#0a1220');gr.addColorStop(1,'#0d1826');x.fillStyle=gr;x.fillRect(0,0,W,H);
  gRndNew(4421);
  /* 穿城河道 */
  x.strokeStyle='rgba(38,86,140,.85)';x.lineWidth=26*U;x.lineCap='round';
  x.beginPath();
  for(let t=0;t<=1.001;t+=.02){const px=t*W,py=H*.20+Math.sin(t*2.4)*H*.10;
    t===0?x.moveTo(px,py):x.lineTo(px,py);}
  x.stroke();
  /* 街区 + 道路 */
  const cell=76*U,road=8*U;
  for(let cy=0,ry=0;cy<H+cell;cy+=cell,ry++)for(let cx=0,rxi=0;cx<W+cell;cx+=cell,rxi++){
    /* 道路底色 */
    x.fillStyle='rgba(58,72,96,.30)';x.fillRect(cx,cy,cell,cell);
    /* 街区地块 */
    const bx=cx+road,by=cy+road,bw=cell-road*2,bh=cell-road*2;
    if(bw<=0||bh<=0)continue;
    const tone=.5+gRnd()*.5;
    x.fillStyle=rgba(26+tone*26,34+tone*30,52+tone*34,1);x.fillRect(bx,by,bw,bh);
    /* 楼栋 */
    const cnt=2+Math.floor(gRnd()*3);
    for(let i=0;i<cnt;i++){
      const w2=bw*(.30+gRnd()*.42),h2=bh*(.30+gRnd()*.40);
      const px=bx+gRnd()*(bw-w2),py=by+gRnd()*(bh-h2);
      const lit=.6+gRnd()*.4;
      x.fillStyle=rgba(44+lit*46,56+lit*46,78+lit*52,1);x.fillRect(px,py,w2,h2);
      x.strokeStyle='rgba(140,190,255,.22)';x.lineWidth=Math.max(1,U*.8);x.strokeRect(px,py,w2,h2);
      /* 窗格 */
      x.fillStyle='rgba(255,225,150,'+(.10+gRnd()*.22)+')';
      for(let wy=py+3*U;wy<py+h2-3*U;wy+=6*U)for(let wx=px+3*U;wx<px+w2-3*U;wx+=6*U)
        if(gRnd()>.45)x.fillRect(wx,wy,2.2*U,2.2*U);}}
  /* 主干道高亮 */
  x.strokeStyle='rgba(150,190,240,.16)';x.lineWidth=Math.max(1,U);
  for(let cx=0;cx<W+cell;cx+=cell){x.beginPath();x.moveTo(cx+road/2,0);x.lineTo(cx+road/2,H);x.stroke();}
  for(let cy=0;cy<H+cell;cy+=cell){x.beginPath();x.moveTo(0,cy+road/2);x.lineTo(W,cy+road/2);x.stroke();}
  x.fillStyle='rgba(170,205,245,.6)';x.font=700*(15*U)+'px sans-serif';
  x.fillText('城区 · 建筑/路网底图',14*U,H-14*U);
}
function sceneFarm(x,W,H,U){
  const gr=x.createLinearGradient(0,0,0,H);
  gr.addColorStop(0,'#2a2f1c');gr.addColorStop(1,'#38351d');x.fillStyle=gr;x.fillRect(0,0,W,H);
  gRndNew(7788);
  const pal=['#7d8c3c','#93994a','#a8a84f','#6e7f35','#b39a4e','#8a7c36','#9aa855'];
  /* 地块条田 */
  const fw=112*U,fh=74*U;
  for(let y=-fh;y<H+fh;y+=fh)for(let px=-fw;px<W+fw;px+=fw){
    const c=pal[Math.floor(gRnd()*pal.length)];
    x.fillStyle=c;x.fillRect(px+2*U,y+2*U,fw-4*U,fh-4*U);
    /* 垄沟 */
    x.strokeStyle='rgba(40,44,20,.45)';x.lineWidth=Math.max(1,U);
    const horiz=gRnd()>.5;
    for(let i=1;i<6;i++){
      x.beginPath();
      if(horiz){const yy=y+2*U+i*(fh-4*U)/6;x.moveTo(px+3*U,yy);x.lineTo(px+fw-3*U,yy);}
      else{const xx=px+2*U+i*(fw-4*U)/6;x.moveTo(xx,y+3*U);x.lineTo(xx,y+fh-3*U);}
      x.stroke();}
    x.strokeStyle='rgba(210,200,150,.18)';x.strokeRect(px+2*U,y+2*U,fw-4*U,fh-4*U);}
  /* 灌渠 */
  x.strokeStyle='rgba(70,140,190,.8)';x.lineWidth=6*U;
  for(let px=fw*.5;px<W;px+=fw*2){x.beginPath();x.moveTo(px,0);x.lineTo(px,H);x.stroke();}
  /* 圆形喷灌区 */
  for(let i=0;i<4;i++){
    const cx=fw*(1.2+gRnd()*2.6),cy=fh*(.6+gRnd()*3.4),r=fh*(.42+gRnd()*.22);
    const cg=x.createRadialGradient(cx,cy,r*.15,cx,cy,r);
    cg.addColorStop(0,'rgba(120,200,120,.55)');cg.addColorStop(1,'rgba(90,160,90,.06)');
    x.fillStyle=cg;x.beginPath();x.arc(cx,cy,r,0,6.283);x.fill();
    x.strokeStyle='rgba(190,235,190,.35)';x.lineWidth=Math.max(1,U*.9);
    for(let a=0;a<6;a++){x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);x.stroke();}
    x.beginPath();x.arc(cx,cy,r,0,6.283);x.stroke();}
  x.fillStyle='rgba(215,225,170,.65)';x.font=700*(15*U)+'px sans-serif';
  x.fillText('农田 · 条田/灌区底图',14*U,H-14*U);
}
function sceneSea(x,W,H,U){
  const gr=x.createLinearGradient(0,0,0,H);
  gr.addColorStop(0,'#0a2440');gr.addColorStop(1,'#061526');x.fillStyle=gr;x.fillRect(0,0,W,H);
  gRndNew(6603);
  /* 浪涌条带 */
  for(let i=0;i<26;i++){
    const y0=gRnd()*H,len=W*(.15+gRnd()*.5),px=gRnd()*W;
    x.strokeStyle='rgba(140,200,240,'+(.05+gRnd()*.10)+')';x.lineWidth=(1+gRnd()*2.2)*U;
    x.beginPath();
    for(let t=0;t<=1.001;t+=.05)x[t?'lineTo':'moveTo'](px+len*t,y0+Math.sin(t*9+i)*4*U);
    x.stroke();}
  /* 涌浪明暗 */
  for(let i=0;i<60;i++){
    x.fillStyle='rgba(180,225,255,'+(.03+gRnd()*.06)+')';
    x.beginPath();x.ellipse(gRnd()*W,gRnd()*H,(14+gRnd()*46)*U,(3+gRnd()*7)*U,gRnd()*.6-.3,0,6.283);x.fill();}
  x.fillStyle='rgba(160,210,240,.6)';x.font=700*(15*U)+'px sans-serif';
  x.fillText('远海 · 开阔水域底图',14*U,H-14*U);
}
function drawBaseScene(x,W,H,sc){
  const U=Math.max(.6,W/900);
  x.clearRect(0,0,W,H);
  if(sc===0)sceneForest(x,W,H,U);
  else if(sc===1)sceneCity(x,W,H,U);
  else if(sc===2)sceneSea(x,W,H,U);
  else sceneFarm(x,W,H,U);
}
/* 游戏底图：AI 实景照片优先（GAME_IMG_SRC 与 GSC 一一对应），加载失败退回程序化场景 */
const GAMEIMGS=(typeof GAME_IMG_SRC!=='undefined')?GAME_IMG_SRC.map(function(s){var im=new Image();im.src=s;return im;}):null;
const GSCEN_TAGS=['林场地形','城区路网','远海海域','条田灌区'];
function gKey(){return G.sc+'|'+gameCv.width+'x'+gameCv.height+'|'+(G.mapAlt?'alt':'')+'|'+(GAMEIMGS&&GAMEIMGS[G.sc]&&GAMEIMGS[G.sc].complete&&GAMEIMGS[G.sc].naturalWidth?'img':'proc');}
function gBake(){
  const W=gameCv.width,H=gameCv.height;if(!W||!H)return;
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const x=c.getContext('2d');
  const im=GAMEIMGS&&GAMEIMGS[G.sc];
  if(im&&im.complete&&im.naturalWidth&&!(G.mapAlt&&G.sc===1)){
    const s=Math.max(W/im.naturalWidth,H/im.naturalHeight),iw=im.naturalWidth*s,ih=im.naturalHeight*s;
    x.drawImage(im,(W-iw)/2,(H-ih)/2,iw,ih);
    x.fillStyle='rgba(4,10,20,.18)';x.fillRect(0,0,W,H);
    x.fillStyle='rgba(225,240,255,.8)';x.font='700 '+Math.round(15*Math.max(.6,W/900))+'px sans-serif';
    x.fillText('实景底图 · '+GSC[G.sc].n,Math.round(14*Math.max(.6,W/900)),H-Math.round(14*Math.max(.6,W/900)));
  }else{
    drawBaseScene(x,W,H,G.sc);
  }
  gBase=c;gBaseKey=gKey();
  const tag=gE('gSceneTag');
  if(tag)tag.textContent='演练沙盘 · '+GSC[G.sc].n+' · '+((G.mapAlt&&G.sc===1)?'城市路网示意':GSCEN_TAGS[G.sc]);
}
function gBuild(){const d=cvFit(gameCv);gW=gameCv.width/d;gH=gameCv.height/d;if(gBaseKey!==gKey())gBake();}
function gClearTimers(){G.timers.forEach(clearTimeout);G.timers=[];}
function gSched(fn,ms){const id=setTimeout(fn,ms);(G.auto?autoT:G.timers).push(id);return id;}
function gStopAll(){G.auto=false;gClearTimers();}
const gE=id=>document.getElementById(id);
function gLogMsg(s,cls){const lg=gE('gLog');const d=document.createElement('div');
  if(cls)d.className=cls;const t=(G.ph>=0)?(performance.now()-G.t0)/1000:0;
  d.innerHTML='<span class="num" style="color:#5f7691">['+t.toFixed(1)+'s]</span> '+s;
  lg.appendChild(d);lg.scrollTop=lg.scrollHeight;}
function gStepsRender(){
  gE('gSteps').innerHTML=GSTEPS.map((s,i)=>{
    const c=i<G.ph?'done':i===G.ph?'on':'';
    return '<div class="gStep '+c+'"><i class="gi">'+(i<G.ph?'✓':i+1)+'</i>'+s+'</div>';}).join('');}
function gPtsRender(){gE('gPts').textContent=G.pts;}
function gTimeStr(){const t=G.ph>=0&&G.ph<7?(performance.now()-G.t0)/1000:0;return t.toFixed(1)+'s';}

/* ---------- 交互提示：收缩光晕 + 「请选择」气泡 ----------
   规则：需要用户点击处播放一次收缩光晕（1.6s），结束后若 3 秒内仍无操作，再播一次，循环往复。 */
let gHaloEl=null,gHaloTo=0;
function gHintClear(){
  if(gHaloTo){clearTimeout(gHaloTo);gHaloTo=0;}
  if(gHaloEl){gHaloEl.classList.remove('gHalo');gHaloEl=null;}
  const tip=gE('gPickTip');if(tip)tip.classList.remove('on');
}
function gHintPulse(){
  if(!gHaloEl)return;
  gHaloEl.classList.remove('gHalo');void gHaloEl.offsetWidth;gHaloEl.classList.add('gHalo');
  gHaloTo=setTimeout(gHintPulse,4600);            /* 1.6s 光晕 + 3s 等待 */
}
function gHint(el,txt){
  gHintClear();
  if(!el)return;
  gHaloEl=el;
  const tip=gE('gPickTip');
  if(tip){
    const top=(el.offsetParent===el.parentNode)?el.offsetTop:0;
    tip.style.top=Math.max(-20,top-34)+'px';
    tip.textContent=txt||'👆 请选择';tip.classList.add('on');
  }
  gHintPulse();
}

/* ---------- 对错弹窗：答对/答错提示，1.5s 自动关闭 ---------- */
let gToastEl=null,gToastTo=0;
function gToast(ok,title,desc){
  if(gToastTo){clearTimeout(gToastTo);gToastTo=0;}
  if(!gToastEl){
    gToastEl=document.createElement('div');gToastEl.id='gToast';
    const st=document.querySelector('#s10 .gStage');
    (st||document.getElementById('s10')).appendChild(gToastEl);
  }
  gToastEl.className=ok?'ok':'bad';
  gToastEl.innerHTML='<div class="gtIco">'+(ok?'✓':'✗')+'</div><div class="gtTx"><b>'+title+'</b><span>'+desc+'</span></div>';
  void gToastEl.offsetWidth;
  gToastEl.classList.add('on');
  gToastTo=setTimeout(function(){gToastEl.classList.remove('on');},1500);
}

/* ---------- 流程 ---------- */
function gameStart(scIdx){
  if(scIdx===undefined)scIdx=Math.floor(Math.random()*GSC.length);
  if(G.ph>=0)gClearTimers();
  gHintClear();
  G.sc=scIdx%GSC.length;G.ph=0;G.pts=0;G.satSel=null;G.asset=null;G.t0=performance.now();G._dep=0;G.mapAlt=false;
  const sc=GSC[G.sc];
  /* 城市内涝场景：提供「实景 / 示意」底图切换 */
  let mb=gE('gMapBtn');
  if(!mb){mb=document.createElement('button');mb.id='gMapBtn';mb.type='button';
    document.querySelector('#s10 .gStage').appendChild(mb);
    mb.onclick=function(){G.mapAlt=!G.mapAlt;gBaseKey='';gBake();
      mb.textContent=G.mapAlt?'🛰 切换实景底图':'🗺 切换示意底图';};}
  mb.style.display=(G.sc===1)?'block':'none';
  mb.textContent='🗺 切换示意底图';
  if(gBaseKey!==gKey())gBake();
  gE('gBrief').textContent='【'+sc.n+'】'+sc.brief;
  gE('gBanner').classList.remove('on');
  gE('gRank').textContent='—';gE('gTime').textContent='0.0s';gPtsRender();
  gE('gChoiceBox').innerHTML='<h5>任务已受理，即将编排卫星…</h5>';
  gE('gStartBtn').textContent='↻ 换个任务再来';
  gE('gLog').innerHTML='';
  gLogMsg('任务受理：<b>'+sc.n+'</b> 事件已进入调度队列','em');
  gStepsRender();
  gSched(()=>{if(G.ph===0)gPhase(1);},1500);
}
function gPhase(p){
  if(G.ph>=7)return;
  G.ph=p;gStepsRender();
  const sc=GSC[G.sc];
  if(p===1){ /* 测运控：选卫星 */
    gLogMsg('测运控通道就绪 —— 请选择执行本次任务的卫星','em');
    gE('gChoiceBox').innerHTML='<h5>① 测运控：选择最合适的卫星并上注任务</h5>'+
      GSATS.map(s=>'<button class="gOpt" data-sat="'+s.id+'"><b>'+s.n+'</b><span>'+s.d+'</span></button>').join('');
    [...gE('gChoiceBox').querySelectorAll('.gOpt')].forEach(b=>{
      b.onclick=()=>gPickSat(b.dataset.sat,false);});
    gHint(gE('gChoiceBox'),'👆 请选择卫星');
    if(G.auto)G.pts+=0;
  }else if(p===2){
    gLogMsg('✓ 任务上注成功 · 卫星已侧摆瞄准目标区','ok');
    G.pts+=9;gPtsRender();
    gSched(()=>{if(G.ph===2)gPhase(3);},2200);
  }else if(p===3){
    gLogMsg('✓ 成像完成：星上 AI 在轨检测，仅回传目标切片（↓99.8%）','ok');
    G.pts+=9;gPtsRender();
    gSched(()=>{if(G.ph===3)gPhase(4);},2200);
  }else if(p===4){
    gLogMsg('✓ 切片经低轨链路落站，进入地面算力池','ok');
    G.pts+=9;gPtsRender();
    gSched(()=>{if(G.ph===4)gPhase(5);},2400);
  }else if(p===5){
    gLogMsg('AI 融合分析完成：'+(['火场边界 2.1 km²，预测蔓延方向','淹没范围提取，识别中断道路 3 处','遇险船只位置锁定，漂移轨迹预测','胁迫区 4.2 万亩，灌溉优先级排序'][G.sc])+'，置信度 0.9+','em');
    G.pts+=9;gPtsRender();
    gE('gChoiceBox').innerHTML='<h5>② 场景处置：派出最合适的装备现场核实</h5>'+
      sc.opts.map(function(a){const A=GASSETS[a];
        return '<button class="gOpt" data-as="'+a+'"><b>'+A.n+'</b><span>'+A.d+'</span></button>';}).join('');
    [...gE('gChoiceBox').querySelectorAll('.gOpt')].forEach(b=>{
      b.onclick=()=>gPickAsset(b.dataset.as,false);});
    gHint(gE('gChoiceBox'),'👆 请选择装备');
  }else if(p===6){
    gLogMsg('✓ 无人装备抵达现场，画面与传感数据回传，模型结果得到验证','ok');
    G.pts+=9;gPtsRender();
    gSched(()=>{if(G.ph===6)gPhase(7);},2000);
  }else if(p===7){
    gHintClear();
    const secs=(performance.now()-G.t0)/1000;
    G.pts+=9;gPtsRender();
    const rank=G.pts>=95?'S':G.pts>=85?'A':G.pts>=70?'B':'C';
    const rname={S:'王牌调度员',A:'资深调度员',B:'合格调度员',C:'见习调度员'}[rank];
    gE('gRank').textContent=rank+' · '+rname;
    gLogMsg('<b>报告已生成</b>：事件档案 + 影像切片 + AI 结论 + 处置建议 一键归档','em');
    gE('gChoiceBox').innerHTML='<h5>任务完成！点击下方「换个任务再来」挑战其他场景</h5>';
    gE('gStartBtn').textContent='↻ 换个任务再来';
    const bn=gE('gBanner');
    bn.innerHTML='<h3>任务完成 · '+GSC[G.sc].n+'</h3>'+
      '<div class="big">'+G.pts+' 分 · '+rank+' 级</div>'+
      '<p>'+rname+' ｜ 用时 '+secs.toFixed(1)+' s<br>'+
      '测运控 → 成像回传 → AI 分析 → 装备调度 → 报告生成，全流程闭环完成。<br>'+
      '这正是「感通算用」平台每天在真实世界中的工作方式。</p>';
    bn.classList.add('on');
    gStepsRender();
  }
}
function gPickSat(id,auto){
  if(G.ph!==1)return;
  gHintClear();
  const sc=GSC[G.sc];
  const good=id===sc.sat;
  G.satSel=id;
  const btn=gE('gChoiceBox').querySelector('[data-sat="'+id+'"]');
  if(btn)btn.classList.add(good?'good':'bad');
  [...gE('gChoiceBox').querySelectorAll('.gOpt')].forEach(b=>b.disabled=true);
  G.pts+=good?26:8;gPtsRender();
  gLogMsg(good?('✓ 选对了！'+sc.n+'最适配「'+GSATS.find(s=>s.id===id).n+'」 +26 分')
              :('选了「'+GSATS.find(s=>s.id===id).n+'」—— 不是最优：该场景更适合「'+GSATS.find(s=>s.id===sc.sat).n+'」 +8 分'),good?'ok':'warn');
  gToast(good,good?'回答正确！':'回答错误',
    good?('「'+GSATS.find(s=>s.id===id).n+'」最适配'+sc.n+'，+26 分，我们继续')
        :('本场景更适合「'+GSATS.find(s=>s.id===sc.sat).n+'」，+8 分，我们继续'));
  gSched(()=>{if(G.ph===1)gPhase(2);},auto?600:1700);
}
function gPickAsset(as,auto){
  if(G.ph!==5)return;
  gHintClear();
  G.asset=as;
  const sc=GSC[G.sc],good=as===sc.best;
  const btn=gE('gChoiceBox').querySelector('[data-as="'+as+'"]');
  if(btn)btn.classList.add(good?'good':'bad');
  [...gE('gChoiceBox').querySelectorAll('.gOpt')].forEach(b=>b.disabled=true);
  G.pts+=good?20:12;gPtsRender();
  gLogMsg(good?('✓ 选对了！'+GASSETS[as].ok+' +20 分')
              :('已出动「'+GASSETS[as].n+'」—— '+(GWHY[G.sc+'_'+as]||'并非本场景最优')+'，更适合「'+GASSETS[sc.best].n+'」 +12 分'),good?'ok':'warn');
  gToast(good,good?'回答正确！':'回答错误',
    good?(GASSETS[as].ok+'，+20 分，我们继续')
        :((GWHY[G.sc+'_'+as]||'并非本场景最优')+'，+12 分，我们继续'));
  gSched(()=>{if(G.ph===5)gPhase(6);},auto?600:1700);
}

/* ---------- 智能装备矢量 icon（无人机 / 机器狗，canvas 绘制，全局复用） ---------- */
function drawDroneIcon(g,x,y,s,t){
  g.save();g.translate(x,y);
  g.strokeStyle='rgba(215,232,248,.95)';g.lineWidth=Math.max(1.4,s*.16);g.lineCap='round';
  g.beginPath();g.moveTo(-s*.62,-s*.62);g.lineTo(s*.62,s*.62);
  g.moveTo(s*.62,-s*.62);g.lineTo(-s*.62,s*.62);g.stroke();
  [[-s*.62,-s*.62],[s*.62,-s*.62],[-s*.62,s*.62],[s*.62,s*.62]].forEach(function(p,i){
    g.fillStyle='rgba(120,200,255,.20)';g.beginPath();g.arc(p[0],p[1],s*.40,0,6.283);g.fill();
    const a=(t||0)*14*(i%2?1:-1)+i;
    g.strokeStyle='rgba(245,252,255,.95)';g.lineWidth=Math.max(1.2,s*.10);
    g.beginPath();g.moveTo(p[0]-Math.cos(a)*s*.38,p[1]-Math.sin(a)*s*.38);
    g.lineTo(p[0]+Math.cos(a)*s*.38,p[1]+Math.sin(a)*s*.38);g.stroke();
    g.fillStyle='#3fa9ff';g.beginPath();g.arc(p[0],p[1],s*.09,0,6.283);g.fill();});
  g.fillStyle='#eef5fd';g.beginPath();g.ellipse(0,0,s*.52,s*.34,0,0,6.283);g.fill();
  g.strokeStyle='rgba(63,169,255,.9)';g.lineWidth=Math.max(1,s*.06);g.stroke();
  g.fillStyle='#223c5e';g.beginPath();g.arc(0,s*.32,s*.17,0,6.283);g.fill();
  g.fillStyle='#25e6c0';g.beginPath();g.arc(0,s*.32,s*.075,0,6.283);g.fill();
  g.restore();
}
function drawDogIcon(g,x,y,s,t,moving){
  g.save();g.translate(x,y);
  const mv=moving?1:0,ph=(t||0)*7;
  g.strokeStyle='#d9c49a';g.lineWidth=Math.max(1.6,s*.16);g.lineCap='round';
  [[-s*.52,0],[s*.52,Math.PI],[-s*.28,Math.PI],[s*.28,0]].forEach(function(L){
    const sw=Math.sin(ph+L[1])*s*.16*mv;
    g.beginPath();g.moveTo(L[0],-s*.10);
    g.lineTo(L[0]+sw,s*.34);g.lineTo(L[0]+sw+((mv&&Math.cos(ph+L[1])>0)?s*.10:0),s*.62);g.stroke();});
  g.fillStyle='#e6d3a8';g.beginPath();
  if(g.roundRect)g.roundRect(-s*.72,-s*.42,s*1.44,s*.62,s*.18);else g.rect(-s*.72,-s*.42,s*1.44,s*.62);
  g.fill();
  g.strokeStyle='rgba(120,95,50,.8)';g.lineWidth=Math.max(1,s*.05);g.stroke();
  g.strokeStyle='#8a795b';g.lineWidth=Math.max(1.2,s*.07);
  g.beginPath();g.moveTo(-s*.1,-s*.42);g.lineTo(-s*.1,-s*.66);g.stroke();
  g.fillStyle='#ffcc5c';g.beginPath();g.arc(-s*.1,-s*.70,s*.09,0,6.283);g.fill();
  g.fillStyle='#e6d3a8';g.beginPath();
  if(g.roundRect)g.roundRect(s*.62,-s*.52,s*.5,s*.42,s*.14);else g.rect(s*.62,-s*.52,s*.5,s*.42);
  g.fill();g.stroke();
  g.fillStyle='#223c5e';g.beginPath();g.arc(s*.94,-s*.34,s*.075,0,6.283);g.fill();
  g.fillStyle='#25e6c0';g.beginPath();g.arc(s*.94,-s*.34,s*.032,0,6.283);g.fill();
  g.strokeStyle='#8a795b';g.beginPath();g.moveTo(-s*.72,-s*.34);g.lineTo(-s*.92,-s*.58);g.stroke();
  g.fillStyle='#ff5c6c';g.beginPath();g.arc(-s*.94,-s*.60,s*.06,0,6.283);g.fill();
  g.restore();
}

function drawHeliIcon(g,x,y,s,t){
  g.save();g.translate(x,y);
  g.fillStyle='#eef5fd';g.beginPath();g.ellipse(0,0,s*.78,s*.38,0,0,6.283);g.fill();
  g.strokeStyle='rgba(63,169,255,.9)';g.lineWidth=Math.max(1,s*.06);g.stroke();
  g.strokeStyle='#eef5fd';g.lineWidth=Math.max(1.4,s*.14);g.lineCap='round';
  g.beginPath();g.moveTo(s*.7,0);g.lineTo(s*1.3,-s*.12);g.stroke();          /* 尾梁 */
  g.strokeStyle='rgba(245,252,255,.9)';g.lineWidth=Math.max(1.2,s*.09);
  const a=(t||0)*22;
  g.beginPath();g.moveTo(-Math.cos(a)*s*1.15,-s*.52-Math.sin(a)*s*.1);
  g.lineTo(Math.cos(a)*s*1.15,-s*.52+Math.sin(a)*s*.1);g.stroke();          /* 主旋翼 */
  g.beginPath();g.moveTo(0,-s*.52);g.lineTo(0,-s*.34);g.stroke();
  const ta=(t||0)*30;
  g.strokeStyle='rgba(245,252,255,.85)';g.lineWidth=Math.max(1,s*.07);
  g.beginPath();g.moveTo(s*1.3-Math.cos(ta)*s*.2,-s*.12-Math.sin(ta)*s*.2);
  g.lineTo(s*1.3+Math.cos(ta)*s*.2,-s*.12+Math.sin(ta)*s*.2);g.stroke();    /* 尾桨 */
  g.fillStyle='#223c5e';g.beginPath();g.ellipse(s*.3,s*.05,s*.28,s*.2,0,0,6.283);g.fill(); /* 座舱 */
  g.fillStyle='#25e6c0';g.beginPath();g.arc(s*.36,s*.04,s*.06,0,6.283);g.fill();
  g.restore();
}
function drawBoatIcon(g,x,y,s,t){
  g.save();g.translate(x,y);
  g.fillStyle='rgba(190,225,255,.28)';                                       /* 尾迹 */
  const w=(t||0)*3;
  for(let i=0;i<3;i++){const ph=((w+i/3)%1);
    g.beginPath();g.ellipse(-s*(1+ph*2.4),s*.3,s*(1+ph*1.4),s*.28*(1+ph*.6),0,0,6.283);
    g.fillStyle='rgba(190,225,255,'+(.22*(1-ph))+')';g.fill();}
  g.fillStyle='#dfeaf5';g.beginPath();                                       /* 船体 */
  g.moveTo(-s*.95,-s*.15);g.lineTo(s*.95,-s*.15);g.lineTo(s*.6,s*.42);g.lineTo(-s*.6,s*.42);g.closePath();g.fill();
  g.strokeStyle='rgba(63,169,255,.85)';g.lineWidth=Math.max(1,s*.06);g.stroke();
  g.fillStyle='#c8d8ea';g.beginPath();
  if(g.roundRect)g.roundRect(-s*.4,-s*.62,s*.8,s*.5,s*.08);else g.rect(-s*.4,-s*.62,s*.8,s*.5);
  g.fill();
  g.fillStyle='#223c5e';g.fillRect(-s*.3,-s*.52,s*.6,s*.2);
  g.strokeStyle='#8fa8c8';g.lineWidth=Math.max(1,s*.05);
  g.beginPath();g.moveTo(0,-s*.62);g.lineTo(0,-s*.95);g.stroke();
  g.fillStyle='#ff5c6c';g.beginPath();g.arc(0,-s*.98,s*.07,0,6.283);g.fill();
  g.restore();
}
function drawCamIcon(g,x,y,s,t,tx,ty){
  g.save();g.translate(x,y);
  /* 扫描视锥指向目标 */
  if(tx!==undefined){const ang=Math.atan2(ty-y,tx-x);
    g.save();g.rotate(ang);g.fillStyle='rgba(255,220,130,.12)';
    g.beginPath();g.moveTo(0,0);g.arc(0,0,s*3.2,-.28,.28);g.closePath();g.fill();
    g.strokeStyle='rgba(255,220,130,.4)';g.lineWidth=1;
    g.beginPath();g.moveTo(0,0);g.lineTo(s*3.2*Math.cos(-.28),s*3.2*Math.sin(-.28));
    g.moveTo(0,0);g.lineTo(s*3.2*Math.cos(.28),s*3.2*Math.sin(.28));g.stroke();g.restore();}
  g.strokeStyle='#d9e2ee';g.lineWidth=Math.max(1.6,s*.12);g.lineCap='round';
  g.beginPath();g.moveTo(0,s*.2);g.lineTo(0,s*1.5);g.stroke();              /* 立杆 */
  g.beginPath();g.moveTo(-s*.5,s*1.5);g.lineTo(s*.5,s*1.5);g.stroke();
  g.fillStyle='#eef5fd';g.beginPath();
  if(g.roundRect)g.roundRect(-s*.72,-s*.5,s*1.2,s*.62,s*.12);else g.rect(-s*.72,-s*.5,s*1.2,s*.62);
  g.fill();g.strokeStyle='rgba(63,169,255,.85)';g.lineWidth=Math.max(1,s*.05);g.stroke();
  g.fillStyle='#223c5e';g.beginPath();g.arc(-s*.78,-s*.19,s*.22,0,6.283);g.fill();
  g.fillStyle='#25e6c0';g.beginPath();g.arc(-s*.78,-s*.19,s*.1,0,6.283);g.fill();
  g.fillStyle='#ff5c6c';g.beginPath();g.arc(s*.34,-s*.38,s*.06,0,6.283);g.fill();
  g.restore();
}
function drawUgvIcon(g,x,y,s,t,moving){
  g.save();g.translate(x,y);
  const mv=moving?1:0;
  g.fillStyle='#cfc4a8';g.beginPath();
  if(g.roundRect)g.roundRect(-s*.85,-s*.5,s*1.7,s*.62,s*.14);else g.rect(-s*.85,-s*.5,s*1.7,s*.62);
  g.fill();g.strokeStyle='rgba(120,105,60,.85)';g.lineWidth=Math.max(1,s*.05);g.stroke();
  g.fillStyle='#223c5e';g.fillRect(s*.1,-s*.4,s*.5,s*.24);                  /* 前视窗 */
  g.strokeStyle='#8a795b';g.lineWidth=Math.max(1.2,s*.06);
  g.beginPath();g.moveTo(-s*.3,-s*.5);g.lineTo(-s*.3,-s*.85);g.stroke();    /* 桅杆 */
  g.fillStyle='#ffcc5c';g.beginPath();g.arc(-s*.3,-s*.9,s*.08,0,6.283);g.fill();
  for(let i=0;i<3;i++){const wx=-s*.55+i*s*.55;                              /* 六轮 */
    g.fillStyle='#3a3f4a';g.beginPath();g.arc(wx,s*.28+Math.sin((t||0)*8*mv+i)*s*.03*mv,s*.24,0,6.283);g.fill();
    g.fillStyle='#9aa4b5';g.beginPath();g.arc(wx,s*.28,s*.1,0,6.283);g.fill();}
  g.restore();
}
function drawIrrIcon(g,x,y,s,t){
  g.save();g.translate(x,y);
  g.strokeStyle='#9fc6e8';g.lineWidth=Math.max(1.6,s*.1);g.lineCap='round';
  g.beginPath();g.moveTo(0,s*.9);g.lineTo(0,-s*.4);g.stroke();              /* 立管 */
  g.fillStyle='#5ac8e0';g.beginPath();g.arc(0,-s*.5,s*.16,0,6.283);g.fill();
  const rot=((t||0)*.9)%1;                                                   /* 旋转喷洒 */
  for(let k=0;k<2;k++){const off=(rot+k*.5)%1,ang=-Math.PI*.85+off*Math.PI*.7;
    for(let i=1;i<=3;i++){const r2=s*(0.5+i*.5);
      const dx=Math.cos(ang)*r2,dy=Math.sin(ang)*r2*.55-s*.1;
      g.fillStyle='rgba(140,210,255,'+(0.75-i*.18)+')';
      g.beginPath();g.arc(dx,dy,Math.max(1.2,s*.07),0,6.283);g.fill();}}
  g.strokeStyle='rgba(140,210,255,.35)';g.lineWidth=1;
  g.beginPath();g.arc(0,s*.9,s*1.4,Math.PI,0);g.stroke();
  g.restore();
}

/* ---------- 演练沙盘动画 ---------- */
function drawGame(){
  const d=cvFit(gameCv),g=gameCv.getContext('2d'),W=gameCv.width/d,H=gameCv.height/d;gW=W;gH=H;
  g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,W,H);
  if(!gBase||gBaseKey!==gKey())gBuild();
  if(gBase){g.save();g.setTransform(1,0,0,1,0,0);g.drawImage(gBase,0,0);g.restore();}
  const t=performance.now()/1000,sc=GSC[G.sc]||GSC[0];
  const px=sc.pos[0],py=sc.pos[1];
  g.strokeStyle='rgba(120,220,255,.08)';g.lineWidth=1;
  for(let i=1;i<6;i++){g.beginPath();g.moveTo(0,H*i/6);g.lineTo(W,H*i/6);g.moveTo(W*i/6,0);g.lineTo(W*i/6,H);g.stroke();}
  /* 卫星：沿顶部轨道巡航 */
  const satX=W*.5+Math.cos(t*.5)*W*.34,satY=H*.16+Math.sin(t*.5)*H*.06;
  /* 上注/成像波束 */
  if(G.ph>=1&&G.ph<=3){
    g.strokeStyle='rgba(63,169,255,.55)';g.lineWidth=1.8;g.setLineDash([6,5]);g.lineDashOffset=-(t*40)%22;
    g.beginPath();g.moveTo(satX,satY);g.lineTo(px*W,py*H);g.stroke();g.setLineDash([]);}
  /* 成像扫描带 */
  if(G.ph>=2&&G.ph<=3){
    const sx2=((t*.25)%1)*W;
    const gr=g.createLinearGradient(sx2-60,0,sx2+20,0);
    gr.addColorStop(0,'rgba(37,230,192,0)');gr.addColorStop(1,'rgba(37,230,192,.25)');
    g.fillStyle=gr;g.fillRect(sx2-60,0,80,H);
    g.strokeStyle='rgba(160,255,240,.5)';g.beginPath();g.moveTo(sx2,0);g.lineTo(sx2,H);g.stroke();}
  /* 山林火情：着火点闪烁 + 烟气（从任务开始就可见） */
  if(G.sc===0&&G.ph>=0){
    [[.52,.38],[.58,.45],[.63,.40]].forEach(function(f,i){
      const fx2=f[0]*W,fy2=f[1]*H,fl=.6+.4*Math.sin(t*9+i*2.1);
      glow(g,fx2,fy2,16*fl,fl,'rgba(255,120,50,.8)');
      g.fillStyle='rgba(255,'+Math.floor(120+80*fl)+',40,.95)';
      g.beginPath();g.arc(fx2,fy2,3.5+2.5*fl,0,6.283);g.fill();
      g.fillStyle='rgba(200,200,210,'+(.10+.06*Math.sin(t*2+i))+')';
      g.beginPath();g.ellipse(fx2+8+((t*14+i*30)%60),fy2-26-((t*10+i*20)%40),16,9,0,0,6.283);g.fill();});
  }
  /* 目标区 */
  const tx=px*W,ty=py*H,bw=W*.2,bh=H*.26;
  if(G.ph>=2){
    const f=.7+.3*Math.sin(t*6);
    glow(g,tx,ty,30*f*(G.ph>=3?1:0.4),f,'rgba('+sc.cl+',.5)');
    iBrackets(g,tx-bw/2,ty-bh/2,bw,bh,'rgba(255,204,92,.95)',
      G.ph>=4?(G.sc===0?'火场 0.98':G.sc===1?'淹没区 0.96':'胁迫区 0.95'):'目标区');
  }else{
    g.strokeStyle='rgba(255,255,255,.3)';g.setLineDash([4,6]);
    g.strokeRect(tx-bw/2,ty-bh/2,bw,bh);g.setLineDash([]);}
  /* 回传光点：目标 → 地面站 */
  if(G.ph>=3){
    const gx=W-70,gy=H-58;
    for(let i=0;i<4;i++){const p=((t*.7+i/4)%1);
      const qx=tx+(gx-tx)*p,qy=ty+(gy-ty)*p;
      g.fillStyle='rgba(170,235,255,.95)';g.beginPath();g.arc(qx,qy,3.4,0,6.283);g.fill();}
    g.fillStyle='#ffcc5c';g.beginPath();g.arc(gx,gy,6,0,6.283);g.fill();
    g.fillStyle='rgba(255,235,180,.95)';g.font='700 16px sans-serif';g.fillText('地面站 · 边缘算力',gx-104,gy+24);}
  /* AI 分析环 */
  if(G.ph>=4){
    for(let i=0;i<3;i++){const ph=(t*.6+i/3)%1;
      g.strokeStyle='rgba(169,123,255,'+(.55*(1-ph))+')';g.lineWidth=1.5;
      g.beginPath();g.arc(tx,ty,14+ph*66,0,6.283);g.stroke();}
    g.fillStyle='rgba(200,160,255,.98)';g.font='700 17px sans-serif';
    g.fillText('AI 大模型融合研判中',tx-84,ty+bh/2+38);}
  /* 无人装备出动（按场景逻辑的装备类型与运动方式） */
  if(G.ph>=6||(G.ph===5&&G.asset)){
    const fly=Math.min(1,(performance.now()-(G._dep||performance.now()))/2600);
    if(!G._dep)G._dep=performance.now();
    const id=G.asset;
    if(id==='drone'||id==='heli'){                                   /* 空中装备：弧线飞抵 */
      const fx=(W*.06)+((tx-W*.06))*fly,fy=(H*.14)+((ty-H*.14))*fly;
      g.strokeStyle='rgba(255,255,255,.3)';g.setLineDash([4,5]);
      g.beginPath();g.moveTo(W*.06,H*.14);g.lineTo(fx,fy);g.stroke();g.setLineDash([]);
      if(id==='heli')drawHeliIcon(g,fx,fy,15,t);else drawDroneIcon(g,fx,fy,15,t);
      glow(g,fx,fy,13,.55,'rgba(255,204,92,.6)');
      g.fillStyle='rgba(255,204,92,.98)';g.font='700 15px sans-serif';g.fillText(GASSETS[id].n,fx+18,fy-6);
    }else if(id==='boat'){                                           /* 水面装备：自右下水域驶入 */
      const bx=W*.97+((tx+40)-W*.97)*fly,by=H*.86+((ty+bh/2+26)-H*.86)*fly;
      drawBoatIcon(g,bx,by,15,t);
      glow(g,bx,by,11,.45,'rgba(120,200,255,.6)');
      g.fillStyle='rgba(170,225,255,.98)';g.font='700 15px sans-serif';g.fillText('无人船',bx-46,by+30);
    }else if(id==='cam'){                                            /* 定点装备：立杆瞭望 */
      const cx2=tx+bw/2+40,cy2=ty-bh/2-16;
      drawCamIcon(g,cx2,cy2,13,t,tx,ty);
      g.fillStyle='rgba(255,230,170,.98)';g.font='700 15px sans-serif';g.fillText('长焦摄像头',cx2-24,cy2-30);
    }else if(id==='irr'){                                            /* 自动灌溉：田间喷洒 */
      const ix2=tx-bw/2+20,iy2=ty+bh/2-26;
      drawIrrIcon(g,ix2,iy2,14,t);
      g.fillStyle='rgba(140,220,255,.98)';g.font='700 15px sans-serif';g.fillText('自动灌溉',ix2-20,iy2+40);
    }else{                                                           /* 地面装备：机器狗 / 无人车 */
      const dx2=W*.05+((tx-40)-W*.05)*fly,dy2=H*.9+Math.sin(fly*6)*4-(H*.9-(ty+bh/2+30))*fly;
      if(id==='ugv')drawUgvIcon(g,dx2,dy2,15,t,fly<1);else drawDogIcon(g,dx2,dy2,15,t,fly<1);
      glow(g,dx2,dy2,11,.45,'rgba(200,180,138,.7)');
      g.fillStyle='rgba(230,210,170,.98)';g.font='700 15px sans-serif';g.fillText(GASSETS[id].n,dx2+16,dy2+9);
    }
    g.fillStyle='rgba(255,255,255,.6)';g.font='700 15px sans-serif';
    if(G.asset&&fly>=1)g.fillText((id==='cam'||id==='irr')?'实时监测数据回传中…':'现场画面回传中…',tx-48,ty-bh/2-12);}
  /* 卫星图标 */
  g.save();g.translate(satX,satY);g.fillStyle='#3fa9ff';g.shadowColor='rgba(63,169,255,.9)';g.shadowBlur=14;
  g.beginPath();g.arc(0,0,6,0,6.283);g.fill();g.restore();
  g.fillStyle='rgba(140,190,240,.75)';g.fillRect(satX-9,satY-2,4,4);g.fillRect(satX+5,satY-2,4,4);
  g.fillStyle='rgba(180,225,255,.95)';g.font='700 16px sans-serif';g.fillText(G.satSel?GSATS.find(s=>s.id===G.satSel).n:'巡航卫星',satX+14,satY+5);
  /* 左上状态 */
  g.fillStyle='rgba(3,8,16,.74)';g.fillRect(0,0,W,40);
  g.fillStyle='#8fe6d8';g.font='700 17px sans-serif';
  g.fillText('演练沙盘 · '+sc.n+' · '+GSTEPS[Math.max(0,Math.min(6,G.ph))],16,26);
  requestAnimationFrame(drawGame);
}
function gLoop(){const sec=document.getElementById('s10');
  if(sec&&sec.classList.contains('on')){
    drawGame();
    if(G.ph>=0&&G.ph<7)gE('gTime').textContent=gTimeStr();}
  requestAnimationFrame(gLoop);}
requestAnimationFrame(gLoop);
function gIdle(){ /* 进入页面未开始时 */
  if(G.ph>=0)return;
  gE('gChoiceBox').innerHTML='<h5>点击下方「🚀 开始任务」，接受一条随机突发事件</h5>';
  gStepsRender();
  gBuild();
  gHint(gE('gStartBtn'),'👆 点我开始');
}
ENTERS[11]=()=>{gBuild();gIdle();};

/* 自动演示：脚本化跑一局完整任务 */
function gameAuto(){
  gStopAll();
  G.auto=true;
  const D=AUTOD[11]||30000;
  gameStart(0);
  G._dep=0;
  gSched(()=>{if(G.auto&&G.ph===1)gPickSat(GSC[0].sat,true);},D*.40);
  gSched(()=>{if(G.auto&&G.ph===5)gPickAsset(GSC[0].best,true);},D*.66);
}

/* ===================== S6V 真实系统运行实录（哈萨克火情监测 · 五系统并发连播） =====================
   五格 = 五个真实在跑的系统（data-name 与角标显示名）：
     ① 智能体  中间跨两行 · 火点研判与专业技能编排
     ② 灵驭    左下 · 卫星拍摄任务规划（筛星 + 匹配地面站）
     ③ 灵观    左上 · 需求确认、历史数据检查、选定卫星并反馈测控
     ④ 火情校验 右上 · 校验环节
     ⑤ 指挥调度系统 右下 · 指令与调度

   设计要点：
   ① 版面按 data-vw 显式定位，不依赖 DOM 顺序；每格 object-fit:cover 各自铺满；
      智能体（3072x1920 横幅）用 object-position 微调取景，左侧「统一演」面板完整保留、四边无黑框。
   ② 多轨并发：同一步内各路各自 seek 到 from 后同时 play()；
      由轮询判断「本步是否演完」再进下一步 —— 不用 ended 推进，
      因为一步里可能有多轨、长短不一，必须等最长的那路走完。
   ③ 区间循环：play 的第三项为 true 时，该路在 [from,to] 区间内反复播放，
      本步不因它推进（步骤①的智能体 27→31 循环就是靠这个）。
   ④ 防自动播放拦截（长时间播放后浏览器会暂停）：
      · play() 被拒 → 该格浮出「点击继续播放」遮罩
      · 页面切到后台再回来（visibilitychange）→ 自动续播被暂停的路
      · 检测到「本该在播却 paused」→ 自动重试，并计数，超过阈值才提示用户
      · 任意一次用户手势（点击/触摸/按键/滑动）→ 立即恢复所有被拦截的路
   ⑤ 适配 iPad：playsinline + muted 起播，不依赖用户手势。 */
const VW_ORDER=[1,2,3,4,5];
/* 业务时序剧本。play 的键是格序号，值是 [起点, 终点]，
   终点写 'end' 表示播到本段结尾；第三项 true 表示该路在本步内循环播放。
   time 是本步对应的素材时间点（用于进度条与文案，仅供人读）。 */
const VW_SCRIPT=[
  /* ① 火情研判技能启动 —— 平台收到火情请求，调用智能体并启动火情研判专业技能做任务规划 */
  {play:{1:[0,27]},mean:'平台在接收到<em>火情请求</em>后，调用<em>智能体</em>并启动<em>火情研判</em>专业技能进行任务规划：<em>区域解析与火点标注</em> —— 系统监测到可疑火点位置，随即调用卫星影像'},
  /* ② 需求确认与历史数据检查 —— 灵观确认需求、查本地历史数据，决定实时调用卫星拍摄 */
  {play:{3:[0,7],1:[27,31,true]},mean:'<em>灵观</em>收到请求后先确认需求、检查本地历史数据 —— 经确认该区域<em>没有可用的历史数据</em>，因此决定<em>实时调用卫星进行拍摄</em>'},
  /* ③ 拍摄任务规划 —— 灵驭筛星、匹配地面站，给出多组组合方案 */
  {play:{2:[0,24],1:[27,31,true]},mean:'拍摄需求被发送给<em>灵驭</em>。<em>灵驭</em>开始规划：<em>筛选可能过境的卫星</em>，并<em>匹配可接收数据的地面站</em>，系统给出多个地面站与卫星的组合方案'},
  /* ④ 选定卫星并反馈测控 —— 灵观选定「吉林一号」高分03星执行拍摄并反馈测控系统 */
  {play:{3:[7,15],1:[27,31,true]},mean:'<em>灵观</em>从中选定<em>「吉林一号」高分 03 星</em>执行拍摄任务，并将确定好的任务触发结果<em>反馈给测控系统</em>'},
  /* ⑤ 指令上注与数据回传 —— 灵驭经地面站发指令、建链后上注参数；
        灵观侧可见星地链路连接成功，数据回传后交给智能体 */
  {play:{2:[24,'end'],3:[15,'end'],1:[27,31,true]},mean:'<em>灵驭</em>执行拍照：通过地面站向卫星发送指令，建立<em>星地链路</em>后上注拍照位置、清晰度等参数；拍摄数据<em>经地面站回传</em>，<em>灵观</em>可见链路连接成功，并将影像交给智能体'},
  /* ⑥ 智能研判与指控调度 —— 火情校验播至结尾；智能体续播 27→53 完成研判；
        同时指挥调度系统接收结果 */
  {play:{4:[0,'end'],1:[27,53],5:[0,'end']},mean:'<em>智能体</em>结合影像完成<em>火情监测、火势评估、影响范围测算</em>，<em>火情校验</em>同步核验，最终结果推送给<em>指挥调度系统</em>'},
];

/* 自动演示在本页的停留时长（毫秒）。剧本 ①② 是循环段、无法精确累加，
   这里按「循环段按一次算 + 其余步骤的真实时长」取值并留足缓冲，
   保证自动演示不会在连播中途翻页。若替换素材，只需调整此值。 */
const VW_DUR=800000;
const vwCells={};      /* 序号 → {cell,video,bar,name} */
const vwSeen={};       /* 序号 → 是否已轮到过（决定显示"已播完"还是"待播"） */
let vwStep=-1,vwPlaying=false,vwMuted=true,vwTimer=null;
/* 自动播放被拦截的恢复机制 */
let vwBlockedSet={},vwRetry=0,gestureBound=false;
function vwActiveSet(){
  const st=VW_SCRIPT[vwStep];if(!st)return [];
  return Object.keys(st.play).map(Number);
}
function vwIsActive(n){return vwActiveSet().indexOf(n)>=0;}
function vwSeg(n){const st=VW_SCRIPT[vwStep];return st&&st.play[n];}

/* ---------- 起播（含被拦截后的重试） ---------- */
function vwPlayOne(key,from){
  const o=vwCells[key];if(!o)return;
  const v=o.v;
  if(!v.getAttribute('src')){v.preload='auto';v.src=v.dataset.src;v.load();}
  else if(v.preload!=='auto')v.preload='auto';
  const begin=()=>{
    /* 只在"该路还没走到 from"时才 seek，避免循环段每 200ms 被打断 */
    try{ if(Math.abs(v.currentTime-from)>0.25) v.currentTime=from; }catch(e){}
    v.muted=vwMuted;
    o.cell.classList.remove('blocked','loading');
    const pr=v.play();
    if(pr&&pr.catch)pr.catch(()=>{
      /* 被浏览器拦截：记下来，等用户手势或页面回前台时恢复 */
      vwBlockedSet[key]=true;o.cell.classList.add('blocked');
    });
  };
  /* 元数据就绪才能 seek 到非 0 位置 */
  if(v.readyState>=1)begin();
  else v.addEventListener('loadedmetadata',begin,{once:true});
}
/* 用户手势到来时恢复所有被拦截的路（一次即可） */
function vwBindGesture(){
  if(gestureBound)return;gestureBound=true;
  /* 一次手势就把所有被拦截的格恢复。注意：不能只依赖 vwBlockedSet ——
     切换步骤时该标记会被清空，但那一格仍处于「被浏览器拦下」的状态。
     因此以 DOM 上的 blocked 类为准（它由真实播放失败事件驱动）。 */
  const fire=()=>{
    const keys=Object.keys(vwCells).filter(k=>
      vwCells[k].cell.classList.contains('blocked')||vwBlockedSet[k]);
    if(!keys.length)return;
    keys.forEach(k=>{
      const o=vwCells[k];if(!o)return;
      o.cell.classList.remove('blocked');
      vwBlockedSet[k]=false;
      o.v.muted=vwMuted;
      const pr=o.v.play();
      if(pr&&pr.catch)pr.catch(()=>{o.cell.classList.add('blocked');vwBlockedSet[k]=true;});
    });
  };
  ['pointerdown','touchstart','keydown','wheel'].forEach(ev=>{
    document.addEventListener(ev,fire,{passive:true});
  });
}
/* 页面切后台再回来：浏览器常在此时暂停视频，自动续播 */
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState!=='visible')return;
  if(!vwPlaying||vwStep<0)return;
  /* 回到前台：把本步该播的、但当前暂停的路重新起播 */
  vwActiveSet().forEach(n=>{
    const v=vwCells[n].v;
    if(v.paused&&!vwCells[n].cell.classList.contains('blocked')){
      const seg=vwSeg(n);if(seg)vwPlayOne(n,seg[0]);
    }
  });
});

(function initVW(){
  document.querySelectorAll('#s6v .vwCell').forEach(c=>{
    const n=+c.dataset.vw,v=c.querySelector('video');
    vwCells[n]={cell:c,v:v,bar:c.querySelector('.vwBar i'),name:c.dataset.name||''};
    vwBlockedSet[n]=false;
    v.muted=true;
    /* timeupdate 推进各格自己的进度条 */
    v.addEventListener('timeupdate',()=>{
      if(!v.duration)return;
      vwCells[n].bar.style.width=(v.currentTime/v.duration*100).toFixed(2)+'%';
    });
    /* 起播失败（编码不支持 / 文件缺失）→ 提示手动处理 */
    v.addEventListener('error',()=>{c.classList.add('blocked');vwSync();});
    /* 播放被浏览器中断（长时间无交互常见）→ 交由轮询统一恢复，避免各处重复处理 */
    v.addEventListener('pause',()=>{/* 状态由 vwTick 依据 vwPlaying 判断并恢复 */});
  });
  vwBindGesture();
})();

/* 把某格停在首帧：挂载 src → 等首帧解码完成 → 归零并暂停。
   skip 用于排除本步骤正在播放的格 —— seek0 里的 pause() 会把刚起的播掐掉。 */
function vwFirstFrame(n,skip){
  const o=vwCells[n];if(!o)return;
  if(n===skip)return;
  const v=o.v;
  const seek0=()=>{ if(vwIsActive(n))return; v.pause(); v.currentTime=0; o.cell.classList.remove('loading'); };
  if(v.readyState>=2){ seek0(); return; }
  o.cell.classList.add('loading');
  v.addEventListener('loadeddata',seek0,{once:true});
  if(!v.getAttribute('src')){ v.preload='metadata'; v.src=v.dataset.src; v.load(); }
  /* 元数据就绪后强制绘制首帧（部分浏览器需手动 seek 才会渲染） */
  v.addEventListener('loadedmetadata',()=>{ try{ if(!vwIsActive(n))v.currentTime=0.001; }catch(e){} },{once:true});
}
function vwMark(n,state){
  const o=vwCells[n];if(!o)return;
  /* 三态互斥：on（正在播，全亮）/ done（已播完，压暗）/ idle（未轮到，停首帧微暗） */
  o.cell.classList.toggle('on',state==='on');
  o.cell.classList.toggle('done',state==='done');
  o.cell.classList.toggle('idle',state==='idle');
  o.cell.querySelector('.vwState').textContent=
    state==='on'?'播放中':state==='done'?'已播完':'待播';
}
/* 状态：正在播的 = on（全亮）；已轮到过的 = done（保留画面，压暗）；其余 = idle（停在首帧） */
function vwSync(){
  VW_ORDER.forEach(n=>{
    if(vwIsActive(n))vwMark(n,'on');
    else vwMark(n,vwSeen[n]?'done':'idle');
  });
  const btn=document.getElementById('vwToggle');
  if(btn)btn.textContent=vwPlaying?'⏸ 暂停':'▶ 播放';
  const st=document.getElementById('vwStep');
  if(st)st.textContent=(vwStep<0||vwStep>=VW_SCRIPT.length)?'待播放'
    :('第 '+(vwStep+1)+' / '+VW_SCRIPT.length+' 步');
  /* 步骤含义条：把当前这一步在业务上做什么讲清楚 */
  const box=document.getElementById('vwMeaning');
  if(box){
    const s=VW_SCRIPT[vwStep];
    if(s&&s.mean){
      box.style.opacity='1';
      const idx=box.querySelector('.vwMIdx'),txt=box.querySelector('.vwMTxt');
      if(idx)idx.textContent='第 '+(vwStep+1)+' 步';
      if(txt)txt.innerHTML=s.mean;
    }else box.style.opacity='0';
  }
}
/* 本步骤是否演完：本步骤内每一路（非循环）都到达目标时间点（或已播完）才算结束。
   循环段不参与判定 —— 它们要一直转到本步骤被换掉为止。 */
function vwStepDone(){
  const st=VW_SCRIPT[vwStep];if(!st)return true;
  let hasReal=false;                 /* 本步是否存在非循环段 */
  for(const n in st.play){
    const seg=st.play[n];
    if(seg[2])continue;              /* 循环段：自身不影响推进 */
    hasReal=true;
    const v=vwCells[n].v,to=seg[1];
    const tgt=(to==='end')?(isFinite(v.duration)?v.duration:Infinity):to;
    if(!(v.ended||v.currentTime>=tgt-0.12))return false;
  }
  /* 本步全是循环段（如步骤②）：它没有自然终点，应一直循环下去。
     只有当所有路都已被暂停/拦截（本步实际上已经结束）时才算演完。 */
  if(!hasReal){
    const act=vwActiveSet();
    return act.length>0&&act.every(n=>{
      const o=vwCells[n];
      return o.cell.classList.contains('blocked')||
        (o.v.paused&&o.v.ended);
    });
  }
  return true;
}
/* 推进到第 k 步（超出则回到 0 循环） */
function vwGoStep(k){
  if(!VW_SCRIPT.length)return;
  if(k>=VW_SCRIPT.length)k=0;
  const prev=vwStep;
  vwStep=k;
  const st=VW_SCRIPT[k];
  vwBlockedSet={};vwRetry=0;
  /* 本步骤不参与的路一律暂停（保留已加载 src 与当前画面，不重复解码） */
  Object.keys(vwCells).forEach(n=>{ if(!st.play[n])vwCells[n].v.pause(); });
  for(const n in st.play){
    vwSeen[+n]=true;
    vwPlayOne(+n,st.play[n][0]);
  }
  vwPlaying=true;
  vwSync();
}
/* 轮询：判断本步骤是否演完 → 自动进入下一步；
   同时负责两件事：驱动区间循环、恢复被浏览器暂停的路。
   不用固定 setTimeout，因为大文件可能缓冲卡顿，按实际播放位置判定更可靠。 */
function vwTick(){
  if(vwStep<0)return;
  if(!vwPlaying)return;
  /* ① 区间循环：到区间末尾则回到起点重播 */
  vwActiveSet().forEach(n=>{
    const seg=vwSeg(n);if(!seg||!seg[2])return;
    const v=vwCells[n].v;
    const to=seg[1],tgt=(to==='end')?(isFinite(v.duration)?v.duration:Infinity):to;
    if(v.ended||(isFinite(tgt)&&v.currentTime>=tgt-0.08)){
      /* 先归位到区间起点再播：若 keep 停在末尾，play() 可能立刻判为已播完 */
      try{ v.currentTime=seg[0]; }catch(e){}
      v.muted=vwMuted;
      const pr=v.play();
      if(pr&&pr.catch)pr.catch(()=>{});
    }
  });
  /* ② 恢复被浏览器自动暂停的路（长时间播放后的典型问题）。
        只在「本该在播、却处于 paused、且没有 blocked 遮罩」时才恢复，
        避免与用户主动点击的暂停互相打架。 */
  const act=vwActiveSet();
  let needFix=0;
  act.forEach(n=>{
    const o=vwCells[n],v=o.v,seg=vwSeg(n);
    /* 已被浏览器拦下的路：先摘掉遮罩再试播（play 失败会重新加回），
       这样即使没有用户手势也能自愈 —— 只在用户主动暂停时才需要手动介入。 */
    if(o.cell.classList.contains('blocked')&&seg){
      o.cell.classList.remove('blocked');vwBlockedSet[n]=false;
      const pr0=v.play();
      if(pr0&&pr0.catch)pr0.catch(()=>{o.cell.classList.add('blocked');vwBlockedSet[n]=true;});
      return;
    }
    if(!o.cell.classList.contains('blocked')&&v.paused&&seg){
      needFix++;
      const to=seg[1],tgt=(to==='end')?(isFinite(v.duration)?v.duration:Infinity):to;
      /* 循环段永远不该"演完"，只要不是 ended 就必须拉起；
         非循环段若已到达终点则不再拉起（马上要进下一步了）。 */
      const finished=seg[2]?v.ended:(v.ended||(isFinite(tgt)&&v.currentTime>=tgt-0.12));
      if(!finished){
        const pr=v.play();
        if(pr&&pr.catch)pr.catch(()=>{o.cell.classList.add('blocked');});
      }
    }
  });
  if(needFix)vwRetry++;else vwRetry=0;
  /* ③ 推进 */
  if(vwStepDone())vwGoStep(vwStep+1);
}
function vwStart(){vwGoStep(0);}
function vwStepGo(d){vwGoStep((vwStep<0?0:vwStep)+d);}
function vwJump(d){vwStepGo(d);}          /* 兼容旧调用：按步骤跳转 */
function vwPlayPause(){
  if(vwStep<0){vwStart();return;}
  const act=vwActiveSet();
  if(vwPlaying){
    act.forEach(n=>vwCells[n].v.pause());
    vwPlaying=false;
  }else{
    vwPlaying=true;
    act.forEach(n=>{const v=vwCells[n].v;v.muted=vwMuted;
      const pr=v.play();if(pr&&pr.catch)pr.catch(()=>vwCells[n].cell.classList.add('blocked'));});
  }
  vwSync();
}
function vwMute(){
  vwMuted=!vwMuted;
  Object.keys(vwCells).forEach(k=>{vwCells[k].v.muted=vwMuted;});
  const b=document.getElementById('vwMute');if(b)b.textContent=vwMuted?'🔇 静音':'🔊 有声';
}
/* 手动解锁：遮罩点击后重试起播。这次点击本身即为用户手势，
   因此按当前的静音偏好播放（而不是强制静音），iPad/iOS 均可正常出声。 */
function vwUnlock(e){
  if(e)e.stopPropagation();
  vwPlaying=true;
  vwActiveSet().forEach(n=>{
    const o=vwCells[n];o.cell.classList.remove('blocked');o.v.muted=vwMuted;
    const pr=o.v.play();if(pr&&pr.catch)pr.catch(()=>o.cell.classList.add('blocked'));});
  vwSync();
}
/* 进入本页：重置 → 所有格停在首帧 → 从步骤 1 开始；
   离开本页：暂停、卸载 src、停轮询，释放解码器与内存。 */
ENTERS[7]=()=>{
  vwStep=-1;vwPlaying=false;
  Object.keys(vwSeen).forEach(k=>delete vwSeen[k]);
  Object.keys(vwCells).forEach(k=>{
    const o=vwCells[k];
    o.v.pause();o.v.removeAttribute('src');o.v.load();o.v.preload='none';
    o.bar.style.width='0%';o.cell.classList.remove('on','idle','blocked','done','loading');
    o.cell.classList.add('idle');
  });
  /* 步骤 1 只有智能体在播，故首帧预载跳过它 —— 顺序不能颠倒，
     否则首帧逻辑里的 pause() 会把自动播放掐掉。 */
  VW_ORDER.forEach(n=>vwFirstFrame(n,1));
  if(vwTimer)clearInterval(vwTimer);
  vwTimer=setInterval(vwTick,200);
  vwGoStep(0);
};
LEAVES[7]=()=>{
  vwPlaying=false;vwStep=-1;
  if(vwTimer){clearInterval(vwTimer);vwTimer=null;}
  Object.keys(vwCells).forEach(k=>{
    const o=vwCells[k];
    o.v.pause();o.v.removeAttribute('src');o.v.load();o.v.preload='none';
    o.bar.style.width='0%';o.cell.classList.remove('on','idle','blocked','done','loading');
    o.cell.classList.add('idle');
    o.cell.querySelector('.vwState').textContent='待播';
  });
  const b=document.getElementById('vwToggle');if(b)b.textContent='⏸ 暂停';
  const st=document.getElementById('vwStep');if(st)st.textContent='待播放';
  const box=document.getElementById('vwMeaning');if(box)box.style.opacity='0';
};

/* ===================== 自动演示 ===================== */
let auto=null,autoT=[];
/* 每页停留毫秒 —— 展示模式下由 tools/update_timing.py 按解说词配音实际时长自动重算，
   页内动画节奏也由它派生，改这一处即可。讲解模式沿用同一组数值。 */
const AUTOD=[18400,23300,32000,30500,26200,28000,44900,VW_DUR,26200,20800,37600,43600]; /* 末项=调度演练场（含配音解说，gameAuto 节奏按 AUTOD[11] 百分比推进） */
const AUTO=[
  {d:AUTOD[0],f:()=>{}},                                                 // 首页
  {d:AUTOD[1],f:()=>{}},                                                 // 总览
  {d:AUTOD[2],f:()=>{const seq=['opt','sar','ir','hyp','insar'];let i=0;
      const s=document.getElementById('cloudSlider');
      const gap=Math.max(1200,AUTOD[2]/seq.length);
      const t=setInterval(()=>{if(i<seq.length){document.querySelector('.sbtn[data-s="'+seq[i]+'"]').click();i++;}
        else{clearInterval(t);}},gap);
      let c=20;const t2=setInterval(()=>{c=Math.min(85,c+Math.max(4,Math.round(65*700/(AUTOD[2]/2))));s.value=c;s.dispatchEvent(new Event('input'));if(c>=85)clearInterval(t2);},700);
      autoT.push(t,t2);}},                                               // 感知
  {d:AUTOD[3],f:()=>{let i=0;const gap=Math.max(1500,AUTOD[3]/LOCS.length);const t=setInterval(()=>{if(i<LOCS.length){curLoc=LOCS[i];applyLoc();i++;}else clearInterval(t);},gap);autoT.push(t);}}, // 通信
  {d:AUTOD[4],f:()=>{const u=document.getElementById('urg'),v=document.getElementById('vol'),y=document.getElementById('ttype');
      let i=0;const val=[[90,85,90],[55,50,50],[15,70,10]];
      const gap=Math.max(2500,AUTOD[4]/val.length);
      const t=setInterval(()=>{if(i<val.length){u.value=val[i][0];v.value=val[i][1];y.value=val[i][2];renderPlans();i++;}else clearInterval(t);},gap);
      autoT.push(t);}},                                                  // 算力
  {d:AUTOD[5],f:()=>{let i=0;const gap=Math.max(2000,AUTOD[5]/4);const t=setInterval(()=>{if(i<4){document.querySelectorAll('.indTab')[i].click();i++;}else clearInterval(t);},gap);autoT.push(t);}}, // 应用
  {d:AUTOD[6],f:()=>{
      /* 场景切换与解说词逐句同步：火情 → 城市内涝 → 海上遇险 → 农业干旱
         map 与 SHOW_CAPS[6] 一一对应，非 null 的位置在该句出现时切换场景并重新推演 */
      const map=[0,null,1,2,3,null];
      const ds=((typeof SHOW_DUR!=='undefined')&&SHOW_DUR&&SHOW_DUR[6])?SHOW_DUR[6]:null;
      simGap=ds?1900:3400;                                  /* 展示模式下推演节奏加快，尽量走完整条链路 */
      let t=250;
      map.forEach((m,k)=>{
        if(m!==null&&m!==undefined){
          const at=Math.round(t);
          autoT.push(setTimeout(()=>{if(auto)simAuto(m);},at));
        }
        t+=(ds&&ds[k])?ds[k]*1000+550:AUTOD[6]/map.length;   /* 与字幕推进同一步长 */
      });
      autoT.push(setInterval(()=>{},9999));}},              // 推演
  {d:VW_DUR,f:()=>{vwStart();}},                                          // 实景视频墙
  {d:AUTOD[8],f:()=>{ /* 驾驶舱：随机抽两题演示，点击即高亮左侧问题 */
      const pool=[0,1,2,3,4];
      for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const tmp=pool[i];pool[i]=pool[j];pool[j]=tmp;}
      const clickQ=(idx)=>{const b=document.querySelector('.qBtn[data-i="'+idx+'"]');if(b)b.click();};
      clickQ(pool[0]);
      autoT.push(setTimeout(()=>{if(auto)clickQ(pool[1]);},Math.max(6000,Math.round(AUTOD[8]*.5))));}}, // 驾驶舱
  {d:AUTOD[9],f:()=>{}},                                                 // 路线
  {d:AUTOD[10],f:()=>{let i=0;const gap=Math.max(1200,AUTOD[10]/CSATS.length);const t=setInterval(()=>{if(i<CSATS.length){selectSat(i);i++;}else clearInterval(t);},gap);autoT.push(t);}}, // 星座沙盘
  {d:AUTOD[11],f:()=>{gameAuto();}}                                     // 调度演练场
];
function toggleAuto(){if(auto)pauseAuto();else if(autoPaused)resumeAuto();else startAuto();}
function startAuto(fromIdx){
  /* 从当前页开始自动演示（封面大按钮传 0，即从头开始完整走一遍） */
  auto=1;document.getElementById('autoBtn').textContent='❚❚ 停止演示';document.getElementById('autoBtn').classList.add('playing');
  document.getElementById('modeChip').textContent='自动演示中';document.getElementById('modeChip').classList.add('on');
  runAuto(fromIdx===undefined?cur:fromIdx);
}
/* 右上角状态胶囊：显示本页停留倒计时（自动演示 / 展示模式通用） */
let cdTimer=null;
function cdStop(){if(cdTimer){clearInterval(cdTimer);cdTimer=null;}}
function cdStart(ms){
  cdStop();
  const chip=document.getElementById('modeChip');if(!chip)return;
  let left=Math.round(ms/1000);
  const tick=()=>{
    if(!auto){cdStop();return;}
    const base=chip.textContent.replace(/\s*[·•]\s*\d+\s*s$/,'');
    chip.textContent=base+' · '+left+'s';
    if(left<=0){cdStop();return;}
    left--;
  };
  tick();cdTimer=setInterval(tick,1000);
}
function runAuto(i){
  if(!auto)return;
  autoPageT0=Date.now();
  go(i);ENTERS[i]&&ENTERS[i]();AUTO[i].f&&AUTO[i].f();
  cdStart(AUTO[i].d);
  autoT.push(setTimeout(()=>{if(!auto)return;runAuto((i+1)%scenes.length);},AUTO[i].d));
}
let autoPaused=false,autoPauseIdx=0,autoPauseLeft=0,autoPageT0=0;
function pauseAuto(){
  if(!auto)return;
  autoPauseIdx=(typeof cur!=='undefined')?cur:0;
  autoPauseLeft=Math.max(1500,((AUTO[autoPauseIdx]&&AUTO[autoPauseIdx].d)||15000)-(Date.now()-autoPageT0));
  auto=null;autoT.forEach(x=>{clearTimeout(x);clearInterval(x);});autoT=[];cdStop();
  autoPaused=true;
  const b=document.getElementById('autoBtn');b.textContent='▶ 继续演示';b.classList.remove('playing');
  document.getElementById('modeChip').textContent='已暂停';document.getElementById('modeChip').classList.remove('on');
  if(simPlaying)simToggle();
}
function resumeAuto(){
  if(!autoPaused)return;
  autoPaused=false;auto=1;autoPageT0=Date.now();
  const b=document.getElementById('autoBtn');b.textContent='❚❚ 停止演示';b.classList.add('playing');
  document.getElementById('modeChip').textContent='自动演示中';document.getElementById('modeChip').classList.add('on');
  const i=autoPauseIdx;
  cdStart(autoPauseLeft);
  autoT.push(setTimeout(()=>{if(!auto)return;runAuto((i+1)%scenes.length);},autoPauseLeft));
  /* 讲解版无音频：重跑本页动画脚本（展示版的字幕/配音由 show.js 单独从当句恢复） */
  if(!document.body.classList.contains('showmode')){AUTO[i].f&&AUTO[i].f();}
}
function stopAuto(){
  auto=null;autoPaused=false;autoT.forEach(x=>{clearTimeout(x);clearInterval(x);});autoT=[];cdStop();
  gStopAll();
  const b=document.getElementById('autoBtn');b.textContent='▶ 自动演示';b.classList.remove('playing');
  document.getElementById('modeChip').textContent='讲解模式';document.getElementById('modeChip').classList.remove('on');
  if(simPlaying)simToggle();
}
ENTERS[1]=()=>{};
go(0);ENTERS[0]();

/* ===================== S9 星座沙盘 ===================== */
const CSATS=[
 {n:'中星 26 号',k:'高通量通信',c:'#ff6ad5',alt:35786,inc:0.1,per:1436,raan:75,u0:2.2,
  ob:'GEO 地球同步',pay:'Ka 频段 · 容量超 100 Gbps',rev:'持续覆盖',
  role:'我国[[首颗单星容量超 100 Gbps]]的高通量卫星，为偏远地区、航空高铁与应急现场提供「像宽带一样好用」的卫星上网。'},
 {n:'天链一号 04',k:'数据中继',c:'#ffb63d',alt:35786,inc:0.5,per:1436,raan:0,u0:.6,
  ob:'GEO 地球同步',pay:'Ka 频段相控阵中继',rev:'持续可见',
  role:'把低轨卫星在境外成像的数据中继回国内地面站，[[境外拍、境内收]]靠它落地。'},
 {n:'风云四号 B',k:'气象观测',c:'#4fd1ff',alt:35786,inc:.8,per:1436,raan:115,u0:3.4,
  ob:'GEO 地球同步',pay:'干涉式大气垂直探测仪',rev:'区域 1 分钟',
  role:'[[分钟级盯住同一片区域]]，为火势蔓延、台风路径与强对流提供气象底数。'},
 {n:'高分四号',k:'光学凝视',c:'#ff9a5c',alt:35786,inc:0.1,per:1436,raan:60,u0:1.2,
  ob:'GEO 地球同步',pay:'50 m 凝视相机',rev:'分钟级凝视',
  role:'像一台挂在天上的固定监控探头，[[始终盯住同一片区域]]，火点、台风、洪涝全程不间断。'},
 {n:'天通一号 02',k:'移动通信',c:'#ffd76b',alt:35786,inc:0.6,per:1436,raan:160,u0:4.8,
  ob:'GEO 地球同步',pay:'S 频段移动通信',rev:'持续覆盖',
  role:'手机直连卫星的语音与数据业务，野外勘察、应急救援[[不换机也能打通]]。'},
 {n:'导航卫星 GEO',k:'导航增强',c:'#e0a0ff',alt:35786,inc:1.5,per:1436,raan:210,u0:2.9,
  ob:'GEO 地球同步',pay:'星基增强 + 短报文',rev:'亚太持续',
  role:'导航系统特有的高轨部分：[[定点在亚太上空]]，提供增强定位与区域短报文保障。'},
 {n:'导航卫星 MEO',k:'导航定位',c:'#a97bff',alt:21528,inc:55,per:773,raan:42,u0:2.1,
  ob:'MEO 中圆轨道',pay:'原子钟 + 导航信号',rev:'全球连续',
  role:'提供定位、授时与短报文双向通信——「三断」现场[[唯一还能打通]]的链路。'},
 {n:'吉林一号',k:'高分光学',c:'#25e6c0',alt:535,inc:97.5,per:95,raan:18,u0:.3,
  ob:'LEO 太阳同步',pay:'0.5 m 全色 / 2 m 多光谱',rev:'0.5 天',
  role:'[[亚米级成像]]，看清房屋、道路、火点位置，是变化检测的主力。'},
 {n:'高分三号',k:'SAR 雷达',c:'#3ddc84',alt:755,inc:98.4,per:99,raan:78,u0:3.1,
  ob:'LEO 太阳同步',pay:'C 波段合成孔径雷达',rev:'1 天',
  role:'[[穿云透雨、夜间照样成像]]，洪涝淹没范围、滑坡体边界由它圈定。'},
 {n:'资源三号 02',k:'立体测绘',c:'#ff7a45',alt:505,inc:97.4,per:94,raan:145,u0:1.5,
  ob:'LEO 太阳同步',pay:'三线阵立体测绘相机',rev:'3—5 天',
  role:'生成 DEM/DSM 高程基准，支撑 [[InSAR 形变监测]]与工程选址。'},
 {n:'珠海一号',k:'高光谱',c:'#ff5c6c',alt:500,inc:97.4,per:94,raan:205,u0:5.2,
  ob:'LEO 太阳同步',pay:'可见—近红外高光谱仪',rev:'2—3 天',
  role:'反演水体叶绿素、作物胁迫与矿蚀信息，识别[[人眼看不出]]的差异。'},
 {n:'海洋一号 D',k:'海洋水色',c:'#5ac8e0',alt:798,inc:98.6,per:101,raan:255,u0:.9,
  ob:'LEO 太阳同步',pay:'海洋水色 / 海面温度',rev:'1 天',
  role:'[[每天给海洋「体检」]]：水华、赤潮、海冰、渔场环境，一眼扫过大洋。'},
 {n:'张衡一号 02',k:'电磁监测',c:'#8fd3ff',alt:507,inc:97.4,per:95,raan:305,u0:4.1,
  ob:'LEO 太阳同步',pay:'电场 / 磁场 / 等离子体',rev:'全球 5 天',
  role:'监测[[震前电磁异常]]，是中国地震立体观测体系里「天上那只眼」。'}
];
CSATS.forEach(s=>{s.incR=s.inc*Math.PI/180;s.raanR=s.raan*Math.PI/180;
  s.rf=1.10+0.34*Math.log10(1+s.alt/300);
  /* GEO：角速度与地球自转严格一致 → 相对地面定点不动（含小幅倾斜摄动）；其余按开普勒量级 */
  s.spd = s.per>=1400 ? 0.1309 : 0.55/Math.pow(s.per/95,0.55);
  s.cosA=6371/(6371+s.alt);s.alpha=Math.acos(Math.min(1,s.cosA));});
const orbCv=document.getElementById('orbCv');
let orbSel=-1,orbHover=-1,orbT0=performance.now(),lastSP=[],orbLive=0;
const ORBSTARS=[];for(let i=0;i<140;i++)ORBSTARS.push([Math.random(),Math.random(),Math.random()]);
/* 陆地描边抽稀一次，减少每帧点数 */
const LANDP=[];
(function(){for(let n=0;n<LAND.length;n++){const r=LAND[n],o=[];
  for(let i=0;i<r.length;i+=4){o.push(r[i],r[i+1]);}
  if(o.length>6)LANDP.push(o);}})();
function orbSize(){const r=orbCv.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);
  const w=Math.max(10,Math.round(r.width)),h=Math.max(10,Math.round(r.height));
  if(orbCv.width!==Math.round(w*d)||orbCv.height!==Math.round(h*d)){orbCv.width=Math.round(w*d);orbCv.height=Math.round(h*d);}
  return {g:orbCv.getContext('2d'),d:d,W:w,H:h};}
function vec3(lat,lon){const a=lat*Math.PI/180,b=lon*Math.PI/180;return[Math.cos(a)*Math.sin(b),Math.sin(a),Math.cos(a)*Math.cos(b)];}
function tilt3(p,tt){const ct=Math.cos(tt),st=Math.sin(tt);return[p[0],p[1]*ct-p[2]*st,p[1]*st+p[2]*ct];}
function satVec(s,u){let x=Math.cos(u)*s.rf,y=0,z=Math.sin(u)*s.rf;
  const ci=Math.cos(s.incR),si=Math.sin(s.incR);
  let y1=y*ci-z*si,z1=y*si+z*ci;
  const cr=Math.cos(s.raanR),sr=Math.sin(s.raanR);
  return [x*cr+z1*sr,y1,-x*sr+z1*cr];}
function hexA(h,a){const n=parseInt(h.slice(1),16);
  return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';}
function drawOrb(){
  const {g,d,W,H}=orbSize();g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,W,H);
  const t=(performance.now()-orbT0)/1000;
  const cx=W*.5,cy=H*.5,R=Math.min(W*.17,H*.40),tt=.42,rotD=t*7.5;
  const P=p=>{const q=tilt3(p,tt);return{x:cx+q[0]*R,y:cy-q[1]*R,z:q[2]};};
  /* 星空 */
  ORBSTARS.forEach((s,i)=>{const a=.18+.5*Math.abs(Math.sin(t*1.1+i*2.7));
    g.fillStyle='rgba(200,225,255,'+(a*(0.35+s[2]*0.5))+')';g.fillRect(s[0]*W,s[1]*H,1.3,1.3);});
  /* 大气辉光 + 地球 */
  const ag=g.createRadialGradient(cx,cy,R*.96,cx,cy,R*1.55);
  ag.addColorStop(0,'rgba(80,160,255,.20)');ag.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=ag;g.beginPath();g.arc(cx,cy,R*1.55,0,7);g.fill();
  const og=g.createRadialGradient(cx-R*.34,cy-R*.36,R*.08,cx,cy,R);
  og.addColorStop(0,'#14406c');og.addColorStop(1,'#061426');
  g.fillStyle=og;g.beginPath();g.arc(cx,cy,R,0,7);g.fill();
  g.save();g.beginPath();g.arc(cx,cy,R*.999,0,7);g.clip();
  /* 经纬网 */
  g.strokeStyle='rgba(125,185,245,.13)';g.lineWidth=1;
  for(let la=-60;la<=60;la+=30){g.beginPath();let f=0;
    for(let lo=-180;lo<=180;lo+=6){const p=P(vec3(la,lo+rotD));
      if(p.z>0){f?g.lineTo(p.x,p.y):(g.moveTo(p.x,p.y),f=1);}else f=0;}
    g.stroke();}
  for(let lo=-180;lo<180;lo+=30){g.beginPath();let f=0;
    for(let la=-88;la<=88;la+=6){const p=P(vec3(la,lo+rotD));
      if(p.z>0){f?g.lineTo(p.x,p.y):(g.moveTo(p.x,p.y),f=1);}else f=0;}
    g.stroke();}
  /* 陆地（全息描边风格：只描边不填充，避免环跨越地平线的填充伪影） */
  LANDP.forEach(r=>{g.beginPath();let f=0;
    for(let i=0;i<r.length;i+=2){const p=P(vec3(r[i+1],r[i]+rotD));
      if(p.z>0){f?g.lineTo(p.x,p.y):(g.moveTo(p.x,p.y),f=1);}else f=0;}
    g.strokeStyle='rgba(120,215,245,.62)';g.lineWidth=1.3;g.lineJoin='round';g.stroke();
    g.strokeStyle='rgba(80,180,225,.22)';g.lineWidth=3.2;g.stroke();});
  g.restore();
  /* 轨道 + 卫星 */
  const SP=[];
  CSATS.forEach((s,i)=>{
    g.beginPath();let f=0;
    for(let a=0;a<=360;a+=4){const p=P(satVec(s,a*Math.PI/180));f?g.lineTo(p.x,p.y):(g.moveTo(p.x,p.y),f=1);}
    g.strokeStyle=i===orbSel?hexA(s.c,.7):'rgba(150,190,230,.14)';g.lineWidth=i===orbSel?1.7:1;g.stroke();
    const p=P(satVec(s,s.u0+t*s.spd));SP.push({i:i,x:p.x,y:p.y,z:p.z,v:satVec(s,s.u0+t*s.spd)});
  });
  /* 覆盖范围 */
  SP.forEach(o=>{const s=CSATS[o.i];if(o.i!==orbSel||o.z<=0)return;
    const v=o.v,L=Math.hypot(v[0],v[1],v[2]);const n=[v[0]/L,v[1]/L,v[2]/L];
    let u=[-n[1],n[0],0];const ul=Math.hypot(u[0],u[1],u[2])||1;u=[u[0]/ul,u[1]/ul,0];
    const w=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]];
    const ca=Math.cos(s.alpha),sa=Math.sin(s.alpha);
    const edge=[];
    g.beginPath();let f=0;
    for(let a=0;a<=360;a+=5){const th=a*Math.PI/180,c=Math.cos(th),sn=Math.sin(th);
      const pt=[n[0]*ca+(u[0]*c+w[0]*sn)*sa,n[1]*ca+(u[1]*c+w[1]*sn)*sa,n[2]*ca+(u[2]*c+w[2]*sn)*sa];
      if(a%90===0)edge.push(pt);
      const p=P(pt);
      if(p.z>0){f?g.lineTo(p.x,p.y):(g.moveTo(p.x,p.y),f=1);}else f=0;}
    g.fillStyle=hexA(s.c,.16);g.fill();g.strokeStyle=hexA(s.c,.75);g.lineWidth=1.4;g.stroke();
    /* 星下点连线 + 覆盖锥面 */
    const nd=P(n);
    g.strokeStyle=hexA(s.c,.5);g.setLineDash([3,4]);
    g.beginPath();g.moveTo(o.x,o.y);g.lineTo(nd.x,nd.y);g.stroke();
    edge.forEach(pt=>{const p=P(pt);
      g.setLineDash([2,5]);g.beginPath();g.moveTo(o.x,o.y);g.lineTo(p.x,p.y);g.stroke();});
    g.setLineDash([]);
    g.fillStyle=hexA(s.c,.95);g.beginPath();g.arc(nd.x,nd.y,3,0,7);g.fill();
    /* 星下点脉冲环 + 坐标标注 */
    const pr2=6+3*Math.sin(t*4);
    g.strokeStyle=hexA(s.c,.8);g.lineWidth=1.4;g.beginPath();g.arc(nd.x,nd.y,pr2,0,7);g.stroke();
    const flat=Math.asin(n[1])*57.2958,flon=Math.atan2(n[0],n[2])*57.2958;
    const lbl='正覆盖 '+Math.abs(flat).toFixed(1)+'°'+(flat>=0?'N':'S')+' '+Math.abs(flon).toFixed(1)+'°'+(flon>=0?'E':'W')+' 上空';
    g.font='600 13px "Microsoft YaHei",sans-serif';const lw=g.measureText(lbl).width;
    const lbx=Math.min(W-lw-20,Math.max(4,nd.x-lw/2)),lby=Math.max(20,nd.y-30);
    rr(g,lbx,lby-14,lw+14,22,6);g.fillStyle='rgba(4,9,18,.88)';g.fill();
    g.strokeStyle=hexA(s.c,.6);g.lineWidth=1;g.stroke();
    g.fillStyle='#ffe0a8';g.fillText(lbl,lbx+7,lby+1);});
  /* 卫星本体：背面先画、正面后画 */
  SP.sort((a,b)=>a.z-b.z);
  SP.forEach(o=>{const s=CSATS[o.i];g.globalAlpha=o.z<0?.42:1;
    glow(g,o.x,o.y,o.i===orbSel?20:14,o.i===orbSel?.9:.35,s.c);
    g.fillStyle='#eaf3ff';g.fillRect(o.x-3,o.y-2.5,6,5);
    g.fillStyle=s.c;g.fillRect(o.x-8.5,o.y-1.6,4.5,3.2);g.fillRect(o.x+4,o.y-1.6,4.5,3.2);
    if(o.i===orbSel){const pr=11+3.2*Math.sin(t*4);
      g.strokeStyle=hexA(s.c,.9);g.lineWidth=1.5;g.beginPath();g.arc(o.x,o.y,pr,0,7);g.stroke();}
    if(o.i===orbSel||o.i===orbHover){
      g.font='600 14px "Microsoft YaHei",sans-serif';const tw=g.measureText(s.n).width;
      const lx=o.x+14,ly=o.y-10;
      g.fillStyle='rgba(4,9,18,.85)';g.strokeStyle=hexA(s.c,.6);g.lineWidth=1;
      rr(g,lx,ly-13,tw+14,22,6);g.fill();g.stroke();
      g.fillStyle=o.i===orbSel?'#ffe0a8':'#dbeaf8';g.fillText(s.n,lx+7,ly+2);}
    g.globalAlpha=1;});
  lastSP=SP;
  /* 实时星下点 */
  if(orbSel>=0&&performance.now()-orbLive>260){orbLive=performance.now();
    const o=SP[orbSel];if(o){const v=o.v,L=Math.hypot(v[0],v[1],v[2]);
      const lat=Math.asin(v[1]/L)*57.2958,lon=Math.atan2(v[0],v[2])*57.2958,s=CSATS[orbSel];
      const ar=2*Math.PI*6371*6371*(1-s.cosA);
      document.getElementById('stLive').textContent=
        '实时星下点 '+Math.abs(lat).toFixed(1)+'°'+(lat>=0?'N':'S')+' '+Math.abs(lon).toFixed(1)+'°'+(lon>=0?'E':'W')+
        ' ｜ 覆盖半径 '+(6371*s.alpha).toFixed(0)+' km ｜ 覆盖面积 '+(ar/1e4).toFixed(0)+' 万 km²'+
        ' ｜ '+(o.z>0?'当前位于地球正面':'已转到地球背面');}}
}
function orbPick(e,r){const rect=orbCv.getBoundingClientRect();
  const x=e.clientX-rect.left,y=e.clientY-rect.top;let best=-1,bd=1e9;
  lastSP.forEach(o=>{const dd=Math.hypot(o.x-x,o.y-y);if(dd<bd){bd=dd;best=o.i;}});
  return bd<r?best:-1;}
orbCv.addEventListener('mousemove',e=>{orbHover=orbPick(e,16);orbCv.style.cursor=orbHover>=0?'pointer':'default';});
orbCv.addEventListener('mouseleave',()=>{orbHover=-1;});
orbCv.addEventListener('click',e=>{const i=orbPick(e,18);selectSat(i);});
/* 卫星介绍：[[关键信息]] → 金色高亮 */
function hlOf(t){return t.replace(/\[\[(.*?)\]\]/g,'<b class="hl">$1</b>');}
function selectSat(i){
  orbSel=(i===orbSel)?-1:i;
  const nm=document.getElementById('stName'),ch=document.getElementById('stChip'),
        kv=document.getElementById('stKv'),ds=document.getElementById('stDesc'),
        lv=document.getElementById('stLive'),hint=document.getElementById('orbHint');
  document.querySelectorAll('.orbItem').forEach(el=>el.classList.toggle('on',+el.dataset.i===orbSel));
  if(orbSel<0){nm.textContent='— 请选择一颗卫星 —';ch.textContent='未选择';ch.style.borderColor='#4a6a92';ch.style.color='#9fb8d4';
    kv.innerHTML='';ds.textContent='左侧地球上有 13 颗在轨卫星：排在第一位的中星 26 号是国内首颗百 Gbps 级高通量卫星；高轨 6 颗与地球同步转动、始终定点在各自上空，中轨 1 颗、低轨 6 颗快速绕行。点击它们试试。';
    lv.textContent='实时星下点：—';hint.textContent='🛰 点击卫星查看档案 · 再点空白处取消';return;}
  const s=CSATS[orbSel];
  nm.textContent=s.n;ch.textContent=s.k;ch.style.borderColor=s.c;ch.style.color=s.c;
  kv.innerHTML=[['轨道类型',s.ob],['轨道高度',s.alt.toLocaleString()+' km'],
                ['轨道倾角',s.inc.toFixed(1)+'°'],['运行周期',(s.per/60).toFixed(1)+' 小时'],
                ['主要载荷',s.pay],['重访能力',s.rev]]
    .map(x=>'<div>'+x[0]+'<b>'+x[1]+'</b></div>').join('');
  ds.innerHTML=hlOf(s.role);hint.textContent='✓ 已选中：'+s.n+' · 黄色区域为它的实时覆盖范围';}
document.getElementById('orbList').innerHTML=CSATS.map((s,i)=>
  '<div class="orbItem" data-i="'+i+'"><i style="background:'+s.c+'"></i>'+s.n+'<em>'+s.k+'</em></div>').join('');
document.querySelectorAll('.orbItem').forEach(el=>{el.onclick=()=>selectSat(+el.dataset.i);});
(function(){const g={};CSATS.forEach(s=>{g[s.ob]=(g[s.ob]||0)+1;});
  document.getElementById('orbLegend').innerHTML=Object.keys(g).map(k=>
    '<span><i style="background:'+(k.indexOf('GEO')===0?'#ffb63d':k.indexOf('MEO')===0?'#a97bff':'#25e6c0')+'"></i>'+k+' '+g[k]+' 颗</span>').join('');})();
(function orbLoop(){const sec=document.getElementById('s9');
  if(sec&&sec.classList.contains('on'))drawOrb();
  requestAnimationFrame(orbLoop);})();
ENTERS[10]=()=>{orbT0=orbT0||performance.now();};