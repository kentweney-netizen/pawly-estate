(() => {
  const canvas = document.getElementById("view");
  const ctx = canvas.getContext("2d");
  const FILES = [
    "iso_meadow.jpg","iso_plot_empty.jpg","iso_plot_wheat.jpg","iso_plot_cabbage.jpg","iso_plot_tomato.jpg",
    "iso_barn.jpg","iso_house.jpg","iso_pond.jpg","iso_tree.jpg","iso_mill.jpg",
    "iso_chicken.jpg","iso_cow.jpg","iso_sheep.jpg","iso_dog.jpg",
    "duck.jpg","fox.jpg","rabbit.jpg","boar.jpg"
  ];
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
    plots:[], animals:[], birds:[], motes:[], toastT:0
  };

  function toast(m){
    state.toastT=2.2;
    const el=document.getElementById("ui-toast");
    el.textContent=m; el.classList.add("show");
  }
  function fee(to){ if(to<=5)return 50; if(to<=15)return 100; if(to<=30)return 180; if(to<=50)return 360; if(to<=75)return 660; return 1000; }
  function addXp(n,why){
    state.xp+=n; toast(`${why} +${n}`);
    while(state.xp>=100 && state.lv<99){
      const f=fee(state.lv+1);
      if(state.pt<f){ state.xp=100; toast(`满100分，升到${state.lv+1}级还差${f}PT`); break; }
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
    const ox = state.w*0.50 + state.cam.x;
    const oy = state.h*0.34 + state.cam.y;
    return {
      x: ox + (c-r)*tw*0.5,
      y: oy + (c+r)*th*0.5,
      tw, th
    };
  }

  function makeWorld(){
    state.plots=[];
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      const locked=!(c<3 && r<3);
      let crop=null;
      if(!locked && Math.random()<0.5) crop=["wheat","cabbage","tomato"][(c+r)%3];
      state.plots.push({c,r,locked,crop,stage:crop?2:0,grow:0});
    }
    state.animals=[
      ["iso_chicken.jpg",2.2,3.4,0.07],["iso_chicken.jpg",1.6,4.0,0.07],
      ["iso_cow.jpg",-0.4,3.6,0.12],["iso_sheep.jpg",0.8,4.6,0.09],
      ["iso_dog.jpg",3.4,4.2,0.10],["duck.jpg",5.4,2.8,0.07],
      ["fox.jpg",-1.2,1.2,0.08],["rabbit.jpg",-0.6,1.8,0.06]
    ].map(([img,c,r,hf])=>{
      const p=iso(c,r);
      return {img,c,r,hf,x:p.x,y:p.y,tx:p.x,ty:p.y,face:1,bob:Math.random()*6,wait:0};
    });
    state.birds=Array.from({length:5},(_,i)=>({x:Math.random(),y:0.08+i*0.03,s:0.04+i*0.01,p:i}));
    state.motes=Array.from({length:18},()=>({x:Math.random(),y:0.35+Math.random()*0.4,p:Math.random()*5,z:0.6+Math.random()}));
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
      const dx=Math.abs(mx-s.x)/(s.tw*0.48);
      const dy=Math.abs(my-(s.y+s.th*0.15))/(s.th*0.55);
      if(dx+dy<1) return p;
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
      const k=p.crop; state.inv[k]++; p.crop=null; p.stage=0; p.grow=0; addXp(4,"收获"); return;
    }
    if(["wheat","cabbage","tomato"].includes(state.tool)){
      if(p.crop){ toast("已有作物"); return; }
      p.crop=state.tool; p.stage=0; p.grow=0; toast("种下了");
    }
  }

  function update(dt){
    state.tick+=dt;
    state.time=(state.time+state.timeSpeed*dt/8)%1;
    state.plots.forEach(p=>{
      if(p.locked||!p.crop||p.stage>=2) return;
      p.grow+=dt; if(p.grow>5){ p.stage++; p.grow=0; }
    });
    state.animals.forEach(a=>{
      a.bob+=dt*7;
      if(a.wait>0){ a.wait-=dt; return; }
      if(Math.hypot(a.x-a.tx,a.y-a.ty)<4){
        const home=iso(a.c,a.r);
        a.tx=home.x+(Math.random()-0.5)*40;
        a.ty=home.y+(Math.random()-0.5)*24;
        a.wait=0.4+Math.random()*1.5;
      } else {
        const dx=a.tx-a.x, dy=a.ty-a.y, l=Math.hypot(dx,dy)||1;
        a.x+=dx/l*28*dt; a.y+=dy/l*28*dt;
        if(dx) a.face=dx<0?-1:1;
      }
    });
    state.birds.forEach(b=>{ b.x+=b.s*dt*0.06; if(b.x>1.2) b.x=-0.1; });
    state.motes.forEach(m=>{ m.p+=dt; m.y-=dt*0.01; if(m.y<0.12){ m.y=0.7; m.x=Math.random(); }});
    if(state.toastT>0){ state.toastT-=dt; if(state.toastT<=0) document.getElementById("ui-toast").classList.remove("show"); }
    document.getElementById("ui-clock").textContent=clock();
  }

  function sprite(name,x,y,h,face=1){
    const im=imgs[name]; if(!im) return;
    const w=h*(im.width/im.height);
    ctx.save(); ctx.translate(x,y); ctx.scale(face,1);
    ctx.drawImage(im,-w/2,-h,w,h); ctx.restore();
  }

  function draw(){
    const n=night();
    const meadow=imgs["iso_meadow.jpg"];
    const mw=state.w*1.08, mh=state.h*1.08;
    ctx.drawImage(meadow, state.cam.x-state.w*0.04, state.cam.y-state.h*0.04, mw, mh);

    const house=iso(5.4,-1.2);
    sprite("iso_house.jpg", house.x, house.y, house.tw*1.35);
    const barn=iso(-1.6,0.2);
    sprite("iso_barn.jpg", barn.x, barn.y, barn.tw*1.2);
    const mill=iso(6.6,1.0);
    sprite("iso_mill.jpg", mill.x, mill.y, mill.tw*1.45);

    const ordered=[...state.plots].sort((a,b)=>(a.c+a.r)-(b.c+b.r));
    ordered.forEach(p=>{
      const s=iso(p.c,p.r);
      let img="iso_plot_empty.jpg";
      if(!p.locked && p.crop && p.stage>=1) img="iso_plot_"+p.crop+".jpg";
      const bounce=(!p.locked && p.crop && p.stage>=2)?Math.sin(state.tick*3+p.c)*2:0;
      ctx.drawImage(imgs[img], s.x-s.tw*0.5, s.y-s.th*0.35+bounce, s.tw, s.th);
      if(p.locked){
        ctx.fillStyle="rgba(30,40,10,.32)";
        ctx.beginPath();
        ctx.moveTo(s.x, s.y-s.th*0.18);
        ctx.lineTo(s.x+s.tw*0.38, s.y+s.th*0.12);
        ctx.lineTo(s.x, s.y+s.th*0.42);
        ctx.lineTo(s.x-s.tw*0.38, s.y+s.th*0.12);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle="#fff"; ctx.font=`${Math.floor(s.th*0.28)}px sans-serif`; ctx.textAlign="center";
        ctx.fillText("荒", s.x, s.y+s.th*0.16);
      } else if(p.crop && p.stage===0){
        ctx.fillStyle="#5d8a3a";
        ctx.beginPath(); ctx.arc(s.x,s.y+s.th*0.12,5,0,Math.PI*2); ctx.fill();
      }
    });

    const pond=iso(6.2,3.4);
    ctx.drawImage(imgs["iso_pond.jpg"], pond.x-pond.tw*0.7, pond.y-pond.th*0.3, pond.tw*1.4, pond.th*1.3);

    [...state.animals].sort((a,b)=>a.y-b.y).forEach(a=>{
      const bob=Math.sin(a.bob)*4;
      sprite(a.img, a.x, a.y+bob, state.h*a.hf, a.face);
    });

    state.birds.forEach(b=>{
      ctx.strokeStyle=n>0.5?"#eef":"#3a4a38"; ctx.lineWidth=2;
      const x=b.x*state.w, y=b.y*state.h, f=Math.sin(state.tick*8+b.p)*4;
      ctx.beginPath(); ctx.moveTo(x-8,y+f); ctx.lineTo(x,y); ctx.lineTo(x+8,y+f); ctx.stroke();
    });
    state.motes.forEach(m=>{
      ctx.globalAlpha=(n>0.3?0.8:0.28)*(0.5+0.5*Math.sin(m.p));
      ctx.fillStyle=n>0.3?"#d8ff90":"#fff4b0";
      ctx.beginPath(); ctx.arc(m.x*state.w,m.y*state.h,2,0,Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha=1;
    if(n>0.04){ ctx.fillStyle=`rgba(10,16,36,${n*0.4})`; ctx.fillRect(0,0,state.w,state.h); }
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
      const dx=mx-state.drag.mx, dy=my-state.drag.my;
      if(Math.hypot(dx,dy)>8) state.drag.moved=true;
      if(state.drag.moved){ state.cam.x=state.drag.cx+dx; state.cam.y=state.drag.cy+dy; }
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
      b.onclick=()=>{
        document.querySelectorAll("#tools [data-tool]").forEach(x=>x.classList.remove("on"));
        b.classList.add("on"); state.tool=b.dataset.tool; toast("当前："+b.textContent);
      };
    });
  }

  async function start(){
    await Promise.all(FILES.map(f=>new Promise(res=>{
      const im=new Image(); im.onload=()=>{imgs[f]=im;res();}; im.onerror=()=>{console.warn(f);res();}; im.src="assets/"+f;
    })));
    makeWorld(); resize(); bind(); sync();
    document.getElementById("boot").classList.add("hidden");
    document.getElementById("game").classList.remove("hidden");
    toast("斜俯视草地庄园 · 点土畦种植");
    requestAnimationFrame(loop);
  }
  document.getElementById("btn-start").onclick=start;
})();
