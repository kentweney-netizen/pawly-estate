(() => {
  const canvas = document.getElementById("view");
  const ctx = canvas.getContext("2d");
  const FILES = [
    "iso_meadow.jpg","iso_plot_empty.jpg","iso_plot_wheat.jpg","iso_plot_cabbage.jpg","iso_plot_tomato.jpg",
    "iso_barn.jpg","iso_house.jpg","iso_pond.jpg","iso_tree.jpg","iso_mill.jpg",
    "walk_chicken.png","walk_cow.png","walk_sheep.png","walk_dog.png","walk_duck.png"
  ];
  const WALKS = {chicken:"walk_chicken.png",cow:"walk_cow.png",sheep:"walk_sheep.png",dog:"walk_dog.png",duck:"walk_duck.png"};
  const COLORS = {
    chicken:"#f4f0e6", cow:"#222", sheep:"#f7f7f7", dog:"#e08a3c", duck:"#2f6b3a",
    fox:"#d06a2a", rabbit:"#eee"
  };
  const imgs = {};
  const COLS = 6, ROWS = 5;
  const FEATURES = [
    {id:"farm",name:"耕种",lv:1,cost:0},{id:"fish",name:"捕鱼",lv:5,cost:100},
    {id:"hunt",name:"小型捕猎",lv:10,cost:150},{id:"land",name:"买地鸡鸭",lv:15,cost:200},
    {id:"cattle",name:"养牛羊",lv:20,cost:250},{id:"pond",name:"鱼塘",lv:30,cost:350},
    {id:"shop",name:"店铺",lv:65,cost:800},{id:"tower",name:"高楼",lv:90,cost:1000}
  ];
  const state = {
    w:0,h:0, tick:0, time:0.36, timeSpeed:0.005,
    cam:{x:0,y:0}, drag:null, tool:"wheat",
    lv:1,xp:8,pt:480, opened:{farm:true},
    inv:{wheat:4,cabbage:2,tomato:1,fish:0,meat:0},
    plots:[], animals:[], birds:[], toastT:0
  };
  function toast(m){ state.toastT=2.2; const el=document.getElementById("ui-toast"); if(el){ el.textContent=m; el.classList.add("show"); } }
  function fee(to){ if(to<=5)return 50; if(to<=15)return 100; if(to<=30)return 180; if(to<=50)return 360; if(to<=75)return 660; return 1000; }
  function addXp(n,why){
    state.xp+=n; toast(why+" +"+n);
    while(state.xp>=100 && state.lv<99){
      const f=fee(state.lv+1);
      if(state.pt<f){ state.xp=100; toast("满100分，升到"+(state.lv+1)+"级还差"+f+"PT"); break; }
      state.pt-=f; state.xp-=100; state.lv++; toast("升到 "+state.lv+" 级");
    }
    sync();
  }
  function tryOpen(id){
    const f=FEATURES.find(x=>x.id===id);
    if(!f) return; if(state.opened[id]) return "已开通";
    if(state.lv<f.lv) return "需要 "+f.lv+" 级";
    if(state.pt<f.cost) return "需要 "+f.cost+" PT";
    state.pt-=f.cost; state.opened[id]=true; toast("开通 "+f.name); sync(); return "ok";
  }
  function clock(){
    const mins=Math.floor(state.time*24*60)%(24*60);
    const hh=String(Math.floor(mins/60)).padStart(2,"0");
    const mm=String(mins%60).padStart(2,"0");
    let p="夜晚";
    if(state.time>=0.22&&state.time<0.32)p="清晨";
    else if(state.time>=0.32&&state.time<0.55)p="白天";
    else if(state.time>=0.55&&state.time<0.66)p="黄昏";
    return p+" "+hh+":"+mm;
  }
  function night(){
    if(state.time<0.20)return 1;
    if(state.time<0.32)return 1-(state.time-0.20)/0.12;
    if(state.time<0.55)return 0;
    if(state.time<0.68)return (state.time-0.55)/0.13;
    return 1;
  }
  function iso(c,r){
    const tw = Math.min(state.w,state.h)*0.16;
    const th = tw*0.52;
    return { x: state.w*0.50 + state.cam.x + (c-r)*tw*0.5, y: state.h*0.34 + state.cam.y + (c+r)*th*0.5, tw, th };
  }
  function diamond(x,y,tw,th){
    ctx.beginPath();
    ctx.moveTo(x, y-th*0.35);
    ctx.lineTo(x+tw*0.48, y+th*0.12);
    ctx.lineTo(x, y+th*0.52);
    ctx.lineTo(x-tw*0.48, y+th*0.12);
    ctx.closePath();
  }
  function makeWorld(){
    state.plots=[];
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      const locked=!(c<3 && r<3);
      let crop=null;
      if(!locked && Math.random()<0.55) crop=["wheat","cabbage","tomato"][(c+r)%3];
      state.plots.push({c,r,locked,crop,stage:crop?2:0,grow:0});
    }
    state.animals=[
      ["chicken",2.2,3.4,0.07],["chicken",1.6,4.0,0.07],["chicken",2.8,3.1,0.07],
      ["cow",-0.4,3.6,0.12],["sheep",0.8,4.6,0.09],["sheep",1.3,4.9,0.09],
      ["dog",3.4,4.2,0.09],["duck",5.4,2.8,0.07],["duck",5.8,3.1,0.07],
      ["fox",-1.2,1.2,0.07],["rabbit",-0.6,1.8,0.06]
    ].map(([kind,c,r,hf])=>{
      const p=iso(c,r);
      return {kind,c,r,hf,x:p.x,y:p.y,tx:p.x,ty:p.y,face:1,frame:0,anim:Math.random()*4,moving:false,wait:0};
    });
    state.birds=Array.from({length:6},(_,i)=>({x:Math.random(),y:0.08+i*0.03,s:0.04+i*0.01,p:i}));
  }
  function sync(){
    document.getElementById("ui-lv").textContent=state.lv;
    document.getElementById("ui-xp").textContent=Math.min(100,state.xp)+" / 100";
    document.getElementById("ui-xpbar").style.width=Math.min(100,state.xp)+"%";
    document.getElementById("ui-pt").textContent=state.pt;
    document.getElementById("ui-clock").textContent=clock();
    document.getElementById("ui-inv").innerHTML=Object.entries(state.inv).map(([k,v])=>
      `<div class="fac-row"><span>${({wheat:"小麦",cabbage:"白菜",tomato:"番茄",fish:"鱼",meat:"猎物"})[k]}</span><b>${v}</b></div>`).join("");
    document.getElementById("ui-unlocks").innerHTML=FEATURES.map(f=>{
      const on=!!state.opened[f.id];
      return `<div class="feat-row"><span>${f.name}</span><button data-open="${f.id}" ${on?"disabled":""}>${on?"已开":f.cost+"PT"}</button></div>`;
    }).join("");
    document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>toast(tryOpen(b.dataset.open)));
  }
  function resize(){
    const dpr=Math.min(2,devicePixelRatio||1);
    state.w=canvas.width=Math.floor(innerWidth*dpr);
    state.h=canvas.height=Math.floor(innerHeight*dpr);
    canvas.style.width=innerWidth+"px"; canvas.style.height=innerHeight+"px";
  }
  function hitPlot(mx,my){
    for(let i=state.plots.length-1;i>=0;i--){
      const p=state.plots[i], s=iso(p.c,p.r);
      if(Math.abs(mx-s.x)/(s.tw*0.48)+Math.abs(my-(s.y+s.th*0.15))/(s.th*0.55)<1) return p;
    }
    return null;
  }
  function clickWorld(mx,my){
    const p=hitPlot(mx,my);
    if(!p){
      const pond=iso(6.2,3.2);
      if(Math.hypot(mx-pond.x,my-pond.y)<pond.tw*0.7){
        if(!state.opened.fish){ toast(tryOpen("fish")); return; }
        state.inv.fish++; addXp(3,"钓鱼"); return;
      }
      if(state.tool==="hunt"){
        if(!state.opened.hunt){ toast(tryOpen("hunt")); return; }
        state.inv.meat++; addXp(6,"捕猎"); return;
      }
      toast("点土畦种植或收获"); return;
    }
    if(p.locked){
      if(state.tool!=="expand"){ toast("荒地，选「开地」"); return; }
      if(state.lv<15){ toast("15级开荒"); return; }
      if(state.pt<80){ toast("开一块 80 PT"); return; }
      state.pt-=80; p.locked=false; toast("开垦成功"); sync(); return;
    }
    if(state.tool==="harvest" || (p.crop && p.stage>=2 && !["wheat","cabbage","tomato"].includes(state.tool))){
      if(!p.crop||p.stage<2){ toast("还没熟"); return; }
      state.inv[p.crop]++; p.crop=null; p.stage=0; p.grow=0; addXp(4,"收获"); return;
    }
    if(["wheat","cabbage","tomato"].includes(state.tool)){
      if(p.crop){ toast("已有作物"); return; }
      p.crop=state.tool; p.stage=0; p.grow=0; toast("种下了");
    }
  }
  function update(dt){
    state.tick+=dt;
    state.time=(state.time+state.timeSpeed*dt/8)%1;
    state.plots.forEach(p=>{ if(p.locked||!p.crop||p.stage>=2) return; p.grow+=dt; if(p.grow>5){ p.stage++; p.grow=0; } });
    state.animals.forEach(a=>{
      if(a.wait>0){ a.wait-=dt; a.moving=false; return; }
      const dist=Math.hypot(a.x-a.tx,a.y-a.ty);
      if(dist<4){
        const home=iso(a.c,a.r);
        a.tx=home.x+(Math.random()-0.5)*70; a.ty=home.y+(Math.random()-0.5)*36;
        a.wait=0.2+Math.random()*1.1; a.moving=false;
      } else {
        a.x+=(a.tx-a.x)/dist*38*dt; a.y+=(a.ty-a.y)/dist*38*dt;
        if(a.tx!==a.x) a.face=(a.tx-a.x)<0?-1:1;
        a.moving=true; a.anim+=dt*8; a.frame=Math.floor(a.anim)%4;
      }
    });
    state.birds.forEach(b=>{ b.x+=b.s*dt*0.06; if(b.x>1.2) b.x=-0.1; });
    if(state.toastT>0){ state.toastT-=dt; if(state.toastT<=0){ const t=document.getElementById("ui-toast"); if(t) t.classList.remove("show"); } }
    const clk=document.getElementById("ui-clock"); if(clk) clk.textContent=clock();
  }
  function sprite(name,x,y,h,face){
    const im=imgs[name]; if(!im) return false;
    const w=h*(im.width/im.height);
    ctx.save(); ctx.translate(x,y); ctx.scale(face||1,1); ctx.drawImage(im,-w/2,-h,w,h); ctx.restore();
    return true;
  }
  function walkSprite(kind,x,y,h,face,frame,moving){
    const sheet=imgs[WALKS[kind]];
    if(!sheet) return false;
    const fw=sheet.width/4, fh=sheet.height, w=h*(fw/fh), f=moving?frame:0;
    ctx.save(); ctx.translate(x,y); ctx.scale(face,1);
    ctx.drawImage(sheet, f*fw, 0, fw, fh, -w/2, -h, w, h); ctx.restore();
    return true;
  }
  function drawAnimal(a){
    const h=state.h*a.hf;
    if(walkSprite(a.kind,a.x,a.y,h,a.face,a.frame,a.moving)) return;
    const bob=a.moving?Math.sin(a.anim*3)*4:0;
    ctx.save(); ctx.translate(a.x, a.y+bob);
    ctx.fillStyle=COLORS[a.kind]||"#fff";
    ctx.beginPath(); ctx.ellipse(0,-h*0.35,h*0.38,h*0.28,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#222"; ctx.beginPath(); ctx.arc(a.face*h*0.22,-h*0.48,h*0.08,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#fff"; ctx.font=Math.floor(h*0.28)+"px sans-serif"; ctx.textAlign="center";
    const label={chicken:"鸡",cow:"牛",sheep:"羊",dog:"狗",duck:"鸭",fox:"狐",rabbit:"兔"}[a.kind]||"";
    ctx.fillText(label,0,-h*0.7);
    ctx.restore();
  }
  function drawBuilding(kind,c,r,twMul,thMul){
    const s=iso(c,r);
    const names={house:"iso_house.jpg",barn:"iso_barn.jpg",mill:"iso_mill.jpg"};
    if(sprite(names[kind], s.x, s.y, s.tw*twMul, 1)) return;
    ctx.fillStyle=kind==="mill"?"#e8e4dc":kind==="house"?"#f3e6c8":"#c4a06a";
    ctx.fillRect(s.x-s.tw*0.35, s.y-s.tw*0.55, s.tw*0.7, s.tw*0.55);
    ctx.fillStyle=kind==="mill"?"#c43c3c":"#8b5a2b";
    ctx.beginPath(); ctx.moveTo(s.x-s.tw*0.42,s.y-s.tw*0.52); ctx.lineTo(s.x,s.y-s.tw*0.88); ctx.lineTo(s.x+s.tw*0.42,s.y-s.tw*0.52); ctx.fill();
    ctx.fillStyle="#fff"; ctx.font="12px sans-serif"; ctx.textAlign="center";
    ctx.fillText({house:"小屋",barn:"谷仓",mill:"风车"}[kind], s.x, s.y-s.tw*0.2);
  }
  function draw(){
    const n=night();
    const meadow=imgs["iso_meadow.jpg"];
    if(meadow){
      ctx.drawImage(meadow, state.cam.x-state.w*0.04, state.cam.y-state.h*0.04, state.w*1.08, state.h*1.08);
    } else {
      const sky=ctx.createLinearGradient(0,0,0,state.h);
      sky.addColorStop(0, n>0.5?"#1b2a44":"#8ec8f0");
      sky.addColorStop(0.28, n>0.5?"#24351c":"#7ed321");
      sky.addColorStop(1, "#4aa01e");
      ctx.fillStyle=sky; ctx.fillRect(0,0,state.w,state.h);
      ctx.fillStyle="rgba(255,255,255,.85)";
      for(let i=0;i<5;i++){
        const cx=((state.tick*18+i*240)%(state.w+160))-60;
        ctx.beginPath(); ctx.ellipse(cx, 36+i*16, 70, 16, 0,0,Math.PI*2); ctx.fill();
      }
      ctx.fillStyle="rgba(90,160,40,.25)";
      for(let i=0;i<40;i++){
        const gx=((i*97)%state.w), gy=state.h*0.28+((i*53)%(state.h*0.7));
        ctx.fillRect(gx,gy,3,3);
      }
    }
    drawBuilding("house",5.4,-1.2,1.35,1);
    drawBuilding("barn",-1.6,0.2,1.2,1);
    drawBuilding("mill",6.6,1.0,1.45,1);
    [...state.plots].sort((a,b)=>(a.c+a.r)-(b.c+b.r)).forEach(p=>{
      const s=iso(p.c,p.r);
      let img="iso_plot_empty.jpg";
      if(!p.locked && p.crop && p.stage>=1) img="iso_plot_"+p.crop+".jpg";
      const bounce=(!p.locked && p.crop && p.stage>=2)?Math.sin(state.tick*3+p.c)*2:0;
      if(imgs[img]){
        ctx.drawImage(imgs[img], s.x-s.tw*0.5, s.y-s.th*0.35+bounce, s.tw, s.th);
      } else {
        diamond(s.x, s.y+bounce, s.tw, s.th);
        if(p.locked) ctx.fillStyle="#6b7a3a";
        else if(!p.crop) ctx.fillStyle="#8b5a2b";
        else if(p.crop==="wheat") ctx.fillStyle=p.stage>=2?"#e2c14a":"#8fbf4a";
        else if(p.crop==="cabbage") ctx.fillStyle="#3f9a3a";
        else ctx.fillStyle="#d23a2a";
        ctx.fill();
        ctx.strokeStyle="rgba(90,60,20,.55)"; ctx.lineWidth=2; ctx.stroke();
      }
      if(p.locked){
        ctx.fillStyle="#fff"; ctx.textAlign="center"; ctx.font=Math.floor(s.th*0.28)+"px sans-serif";
        ctx.fillText("荒", s.x, s.y+s.th*0.16);
      } else if(p.crop && p.stage>=2){
        ctx.fillStyle="#fff"; ctx.textAlign="center"; ctx.font="11px sans-serif";
        ctx.fillText({wheat:"麦",cabbage:"菜",tomato:"茄"}[p.crop], s.x, s.y+s.th*0.12);
      }
    });
    const pond=iso(6.2,3.4);
    if(!sprite("iso_pond.jpg", pond.x, pond.y, pond.tw*0.9, 1)){
      ctx.fillStyle="#2a7cad";
      ctx.beginPath(); ctx.ellipse(pond.x, pond.y, pond.tw*0.7, pond.th*0.7, 0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,.35)"; ctx.beginPath();
      ctx.ellipse(pond.x, pond.y, 18+Math.sin(state.tick*2)*4, 8, 0,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle="#fff"; ctx.font="12px sans-serif"; ctx.textAlign="center"; ctx.fillText("鱼塘", pond.x, pond.y);
    }
    [...state.animals].sort((a,b)=>a.y-b.y).forEach(drawAnimal);
    state.birds.forEach(b=>{
      ctx.strokeStyle=n>0.5?"#eef":"#2a3a28"; ctx.lineWidth=2;
      const x=b.x*state.w, y=b.y*state.h, f=Math.sin(state.tick*8+b.p)*4;
      ctx.beginPath(); ctx.moveTo(x-8,y+f); ctx.lineTo(x,y); ctx.lineTo(x+8,y+f); ctx.stroke();
    });
    if(n>0.04){ ctx.fillStyle="rgba(10,16,36,"+(n*0.4)+")"; ctx.fillRect(0,0,state.w,state.h); }
  }
  let last=performance.now();
  function loop(now){ const dt=Math.min(0.05,(now-last)/1000); last=now; update(dt); draw(); requestAnimationFrame(loop); }
  function bind(){
    addEventListener("resize",resize);
    canvas.addEventListener("pointerdown",e=>{
      const r=canvas.getBoundingClientRect();
      state.drag={mx:(e.clientX-r.left)/r.width*state.w, my:(e.clientY-r.top)/r.height*state.h, cx:state.cam.x, cy:state.cam.y, moved:false};
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove",e=>{
      if(!state.drag)return;
      const r=canvas.getBoundingClientRect();
      const mx=(e.clientX-r.left)/r.width*state.w, my=(e.clientY-r.top)/r.height*state.h;
      if(Math.hypot(mx-state.drag.mx,my-state.drag.my)>8) state.drag.moved=true;
      if(state.drag.moved){ state.cam.x=state.drag.cx+mx-state.drag.mx; state.cam.y=state.drag.cy+my-state.drag.my; }
    });
    canvas.addEventListener("pointerup",e=>{
      if(!state.drag)return;
      if(!state.drag.moved){
        const r=canvas.getBoundingClientRect();
        clickWorld((e.clientX-r.left)/r.width*state.w,(e.clientY-r.top)/r.height*state.h);
      }
      state.drag=null;
    });
    document.querySelectorAll("#tools [data-tool]").forEach(b=>{
      b.onclick=()=>{ document.querySelectorAll("#tools [data-tool]").forEach(x=>x.classList.remove("on")); b.classList.add("on"); state.tool=b.dataset.tool; toast("当前："+b.textContent); };
    });
  }
  async function start(){
    await Promise.all(FILES.map(f=>new Promise(res=>{ const im=new Image(); im.onload=()=>{imgs[f]=im;res();}; im.onerror=()=>res(); im.src="assets/"+f; })));
    makeWorld(); resize(); bind(); sync();
    document.getElementById("boot").classList.add("hidden");
    document.getElementById("game").classList.remove("hidden");
    toast(imgs["iso_meadow.jpg"]?"图已加载":"当前是无图模式 · 绿草地已画出");
    requestAnimationFrame(loop);
  }
  document.getElementById("btn-start").onclick=start;
})();
