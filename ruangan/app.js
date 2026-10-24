/* BARIKO PUTERA - Visualizer (prototipe, foto ruangan)
   Alur: foto ruangan -> poligon lantai (rooms.js) -> ubin digambar dengan perspektif
   -> dicampur dengan cahaya/pantulan foto asli supaya tidak terlihat seperti tempelan.
   Ukuran ubin dalam cm. Semua pemrosesan berjalan di browser. */

const products=[
{id:'luxor',name:'Luxor Grey',size:'50x50',surface:'Glossy',color:'#f2f2f2',vein:'#b9bcc0',pattern:'marble',texture:'luxor',seamless:true},
{id:'morocco',name:'Morocco Gris',size:'60x60',surface:'Glossy',color:'#bfc0c2',vein:'#9fa1a4',pattern:'stone',texture:'morocco'},
{id:'miquel',name:'Miquel Gold',size:'50x50',surface:'Glossy',color:'#efeeeb',vein:'#c9a24a',pattern:'marble',texture:'miquel',seamless:true},
{id:'sand',name:'Marble Sand',size:'60x60',surface:'Glossy',color:'#d9d0c1',vein:'#b8aa96',pattern:'marble'},
{id:'cloud',name:'Cloud White',size:'60x60',surface:'Glossy',color:'#e8e5dd',vein:'#aaa99f',pattern:'marble'},
{id:'cement',name:'Urban Cement',size:'50x50',surface:'Matt',color:'#aaa9a1',vein:'#8d8d85',pattern:'cement'},
{id:'taupe',name:'Taupe Stone',size:'60x60',surface:'Matt',color:'#b8a995',vein:'#93816d',pattern:'stone'},
{id:'linear',name:'Linear Beige',size:'50x50',surface:'Matt',color:'#d4c4aa',vein:'#b3a084',pattern:'linear'},
{id:'graphite',name:'Graphite Grey',size:'50x50',surface:'Matt',color:'#777a77',vein:'#a6a7a1',pattern:'stone'}
];

const $=id=>document.getElementById(id);
const canvas=$('roomCanvas'),ctx=canvas.getContext('2d'),
      grid=$('productGrid'),filtersEl=$('filters'),searchEl=$('search'),
      toggleBtn=$('toggleOriginal'),viewLabel=$('viewLabel');
let active='sand',filter='all',original=false;
let scene=null;          // diisi setelah foto selesai dimuat dan disiapkan
let pendingId=null;

/* ---------- Pembantu umum ---------- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hashStr(s){let h=7;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return h}
const parseSize=s=>s.split('x').map(Number);
const clamp=(n,a,b)=>n<a?a:n>b?b:n;
function shadeColor(hex,delta){
 const m=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);if(!m)return hex;
 const c=[1,2,3].map(i=>Math.max(0,Math.min(255,Math.round(parseInt(m[i],16)+delta))));
 return 'rgb('+c.join(',')+')';
}

/* ---------- Urat / tekstur per ubin (koordinat 0..1 di dalam satu ubin) ---------- */
function makeVeins(p,rnd){
 const L=[],cl=n=>Math.min(.97,Math.max(.03,n));
 const wave=(stroke,w,o)=>{
  const y0=.2+rnd()*.6,sl=(rnd()-.5)*.7,pts=[],T=Math.PI*2;
  const f1=.6+rnd()*.7,f2=1.8+rnd()*1.2,f3=4+rnd()*2,p1=rnd()*T,p2=rnd()*T,p3=rnd()*T,a1=.05+rnd()*.07;
  for(let s=0;s<=22;s++){const t=s/22;
   pts.push([cl(.03+t*.94),cl(y0+sl*(t-.5)+a1*Math.sin(f1*T*t+p1)+.025*Math.sin(f2*T*t+p2)+.01*Math.sin(f3*T*t+p3))])}
  L.push({pts,stroke,w,o});
 };
 if(p.pattern==='marble'){wave(p.vein,1.1,.4);wave(p.vein,.8,.3);wave('#ffffff',1.6,.22)}
 else if(p.pattern==='cement'){
  for(let k=0;k<6;k++){const x=.08+rnd()*.7,y=.08+rnd()*.84,len=.06+rnd()*.12;
   L.push({pts:[[x,y],[cl(x+len),cl(y+(rnd()-.5)*.04)]],stroke:p.vein,w:1,o:.28})}
  for(let k=0;k<3;k++){const x=.1+rnd()*.8,y=.1+rnd()*.8;
   L.push({pts:[[x,y],[x+.004,y]],stroke:p.vein,w:2,o:.4})}
 }
 else if(p.pattern==='stone'){
  for(let k=0;k<2;k++){const y0=.25+k*.45+rnd()*.1,pts=[];
   for(let s=0;s<=6;s++)pts.push([.03+s*.94/6,cl(y0+(rnd()-.5)*.08)]);
   L.push({pts,stroke:p.vein,w:2,o:.32})}
 }
 else if(p.pattern==='linear'){
  for(let k=0;k<6;k++){const x=(k+.5)/6,tilt=(rnd()-.5)*.04;
   L.push({pts:[[cl(x+tilt),.03],[cl(x-tilt),.97]],stroke:p.vein,w:1.2,o:.32})}
 }
 return L;
}
const faceCache={};
function getFaces(p){
 if(!faceCache[p.id]){faceCache[p.id]=[];for(let f=0;f<4;f++)faceCache[p.id].push(makeVeins(p,mulberry32(hashStr(p.id)+f*7919)))}
 return faceCache[p.id];
}

/* ---------- Persiapan ruangan (sekali, setelah foto dimuat) ---------- */
function loadImage(src){
 return new Promise((resolve,reject)=>{
  const img=new Image();
  img.onload=()=>resolve(img);
  img.onerror=()=>reject(new Error('Foto ruangan gagal dimuat'));
  img.src=src;
 });
}
function newCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}

// Closing morfologi (maks lalu min): menghapus garis gelap tipis (nat lama) tanpa merusak pantulan lebar.
function morphClose(src,W,H,r,y0){
 if(r<1)return src;
 const pass=(inp,horizontal,useMax)=>{
  const out=new Float32Array(inp.length);
  if(horizontal){
   for(let y=y0;y<H;y++){const row=y*W;
    for(let x=0;x<W;x++){let m=inp[row+x];const a=Math.max(0,x-r),b=Math.min(W-1,x+r);
     for(let k=a;k<=b;k++){const v=inp[row+k];if(useMax?v>m:v<m)m=v}
     out[row+x]=m}}
  }else{
   for(let y=y0;y<H;y++){const a=Math.max(y0,y-r),b=Math.min(H-1,y+r);
    for(let x=0;x<W;x++){let m=inp[y*W+x];
     for(let k=a;k<=b;k++){const v=inp[k*W+x];if(useMax?v>m:v<m)m=v}
     out[y*W+x]=m}}
  }
  return out;
 };
 let a=pass(src,true,true);a=pass(a,false,true);   // dilatasi
 a=pass(a,true,false);a=pass(a,false,false);       // erosi
 return a;
}

// Pemburaman kotak (separable) pada peta luminans, hanya mulai dari baris y0.
function boxBlur(src,W,H,r,y0){
 if(r<1)return src;
 const n=2*r+1,tmp=new Float32Array(src.length),dst=new Float32Array(src.length);
 for(let y=y0;y<H;y++){
  const row=y*W;let s=0;
  for(let x=-r;x<=r;x++)s+=src[row+clamp(x,0,W-1)];
  for(let x=0;x<W;x++){tmp[row+x]=s/n;s+=src[row+Math.min(W-1,x+r+1)]-src[row+Math.max(0,x-r)]}
 }
 for(let x=0;x<W;x++){
  let s=0;
  for(let y=-r;y<=r;y++)s+=tmp[clamp(y0+y,y0,H-1)*W+x];
  for(let y=y0;y<H;y++){dst[y*W+x]=s/n;s+=tmp[Math.min(H-1,y+r+1)*W+x]-tmp[Math.max(y0,y-r)*W+x]}
 }
 return dst;
}

function prepareScene(room,img){
 const W=img.naturalWidth,H=img.naturalHeight,sc=W/room.refWidth;
 canvas.width=W;canvas.height=H;
 const photoCanvas=newCanvas(W,H),pctx=photoCanvas.getContext('2d');
 pctx.drawImage(img,0,0,W,H);
 const photo=pctx.getImageData(0,0,W,H);

 // Masker lantai
 const mc=newCanvas(W,H),mctx=mc.getContext('2d');
 mctx.fillStyle='#fff';mctx.beginPath();
 room.floor.forEach((pt,i)=>{const x=pt[0]*sc,y=pt[1]*sc;i?mctx.lineTo(x,y):mctx.moveTo(x,y)});
 mctx.closePath();mctx.fill();
 const md=mctx.getImageData(0,0,W,H).data,mask=new Uint8Array(W*H);
 let minY=H;
 for(let i=0;i<mask.length;i++){const a=md[i*4+3];mask[i]=a;if(a&&i/W<minY)minY=Math.floor(i/W)}
 minY=Math.max(0,minY-2);

 // Luminans foto (dihaluskan agar garis nat lama tidak ikut terlihat)
 const lum=new Float32Array(W*H),d=photo.data;
 for(let i=minY*W;i<W*H;i++)lum[i]=.299*d[i*4]+.587*d[i*4+1]+.114*d[i*4+2];
 const Ls=boxBlur(morphClose(lum,W,H,room.closeRadius==null?2:room.closeRadius,minY),W,H,room.smooth==null?1:room.smooth,minY);

 // Luminans dasar lantai (median) dan warna cahaya ruangan
 const hist=new Uint32Array(256);let cnt=0,sr=0,sg=0,sb=0;
 for(let i=minY*W;i<W*H;i++){
  if(mask[i]>128){hist[clamp(Math.round(Ls[i]),0,255)]++;cnt++;sr+=d[i*4];sg+=d[i*4+1];sb+=d[i*4+2]}
 }
 let acc=0,base=200;
 for(let v=0;v<256;v++){acc+=hist[v];if(acc>=cnt/2){base=Math.max(v,40);break}}
 const avg=[sr/cnt,sg/cnt,sb/cnt],avgL=.299*avg[0]+.587*avg[1]+.114*avg[2];
 const tint=avg.map(c=>1+.6*(c/avgL-1));

 // Kamera (satuan piksel gambar acuan -> dikalikan sc saat menggambar)
 const cam=room.camera,theta=Math.atan((cam.cy-cam.horizon)/cam.f);
 const camera={cx:cam.vx,cy:cam.cy,f:cam.f,h:cam.height,s:Math.sin(theta),c:Math.cos(theta),yh:cam.horizon};
 return {room,W,H,sc,photoCanvas,photo,mask,minY,Ls,base,tint,camera,texCanvas:newCanvas(W,H)};
}

/* ---------- Proyeksi lantai ---------- */
function zc(cam,Y){return Y*cam.c+cam.h*cam.s}
function projectU(cam,X,Y){return cam.cx+cam.f*X/zc(cam,Y)}
function projectV(cam,Y){return cam.cy+cam.f*(cam.h*cam.c-Y*cam.s)/zc(cam,Y)}
function depthAtV(cam,v){const dv=v-cam.cy;return cam.h*(cam.f*cam.c-dv*cam.s)/(dv*cam.c+cam.f*cam.s)}

/* ---------- Gambar ubin ke kanvas tekstur ---------- */
function drawTiles(p){
 const S=scene,cam=S.camera,sc=S.sc,refW=S.room.refWidth,refH=S.room.refHeight;
 const t=S.texCanvas.getContext('2d');
 t.setTransform(1,0,0,1,0,0);
 t.fillStyle=p.color;t.fillRect(0,0,S.W,S.H);
 const [tw,th]=parseSize(p.size),faces=getFaces(p);
 const floorTopV=S.minY/sc;
 const lumC=(()=>{const m=/^#(..)(..)(..)$/.exec(p.color);return m?.299*parseInt(m[1],16)+.587*parseInt(m[2],16)+.114*parseInt(m[3],16):180})();
 const groutColor=shadeColor(p.color,lumC<140?40:-30);
 const j0=Math.max(0,Math.floor(depthAtV(cam,refH+8)/th));
 t.lineJoin='round';t.lineCap='round';
 for(let j=j0;j<j0+4000;j++){
  const Ya=j*th,Yb=Ya+th,va=projectV(cam,Ya),vb=projectV(cam,Yb),rowH=va-vb;
  if(vb>refH+8)continue;                 // baris di bawah tepi gambar
  if(va<floorTopV-2||rowH<.9)break;      // sudah di atas lantai atau terlalu kecil untuk terlihat
  const zb=zc(cam,Yb),Xmin=-cam.cx*zb/cam.f,Xmax=(refW-cam.cx)*zb/cam.f;
  const i0=Math.floor(Xmin/tw),i1=Math.ceil(Xmax/tw);
  const pxcm=cam.f/zc(cam,(Ya+Yb)/2);                      // piksel acuan per cm (horizontal)
  const groutW=Math.max(.7,Math.min(Math.max(1.2,.25*pxcm*sc),rowH*sc*.35));
  const k=clamp(pxcm/3,.3,1.3)*sc;
  t.lineWidth=groutW;t.strokeStyle=groutColor;
  const drawVeins=rowH>=5;
  for(let i=i0;i<i1;i++){
   const face=(((i*7+j*3+((i*j)%5))%4)+4)%4;
   const X0=i*tw,X1=X0+tw;
   const pr=(X,Y)=>[projectU(cam,X,Y)*sc,projectV(cam,Y)*sc];
   const a=pr(X0,Ya),b=pr(X1,Ya),c=pr(X1,Yb),d=pr(X0,Yb);
   t.fillStyle=shadeColor(p.color,(face-1.5)*2.2);
   t.beginPath();t.moveTo(a[0],a[1]);t.lineTo(b[0],b[1]);t.lineTo(c[0],c[1]);t.lineTo(d[0],d[1]);t.closePath();
   t.fill();t.stroke();
   if(drawVeins){
    faces[face].forEach(v=>{
     t.beginPath();
     v.pts.forEach((q,n)=>{const s=pr(X0+q[0]*tw,Ya+q[1]*th);n?t.lineTo(s[0],s[1]):t.moveTo(s[0],s[1])});
     t.globalAlpha=v.o;t.strokeStyle=v.stroke;t.lineWidth=Math.max(.5,v.w*k);t.stroke();
    });
    t.globalAlpha=1;t.strokeStyle=groutColor;t.lineWidth=groutW;
   }
  }
 }
}

/* ---------- Ubin dari foto tekstur asli (dipetakan per piksel dengan perspektif) ---------- */
function buildMips(img){
 const levels=[];let s=512;
 let c=newCanvas(s,s);c.getContext('2d').drawImage(img,0,0,s,s);
 for(;;){
  levels.push({s,data:c.getContext('2d').getImageData(0,0,s,s).data});
  if(s<=4)break;
  const n=newCanvas(s/2,s/2),nx=n.getContext('2d');
  nx.imageSmoothingEnabled=true;nx.drawImage(c,0,0,s/2,s/2);c=n;s/=2;
 }
 return levels;
}
function loadTextures(){
 const jobs=products.filter(p=>p.texture&&window.TEXTURES&&window.TEXTURES[p.texture]).map(p=>
  loadImage(window.TEXTURES[p.texture]).then(img=>{p.mips=buildMips(img)}).catch(()=>{p.mips=null}));
 return Promise.all(jobs);
}
function groutRGB(p){
 const m=/^#(..)(..)(..)$/.exec(p.color);
 const r=m?parseInt(m[1],16):180,g=m?parseInt(m[2],16):180,b=m?parseInt(m[3],16):180;
 const d=(.299*r+.587*g+.114*b)<140?40:-30;
 return [r,g,b].map(c=>clamp(c+d,0,255));
}
function drawTexturedTiles(p){
 const S=scene,cam=S.camera,sc=S.sc,W=S.W,H=S.H,mask=S.mask;
 const tctx=S.texCanvas.getContext('2d'),out=tctx.createImageData(W,H),o=out.data;
 const [tw,th]=parseSize(p.size),mips=p.mips,nL=mips.length,gc=groutRGB(p),groutCm=.25,wrap=!!p.seamless;
 for(let y=S.minY;y<H;y++){
  const v=(y+.5)/sc;
  if(v-cam.yh<2)continue;
  const Y=depthAtV(cam,v),zcv=zc(cam,Y);
  const fy=Math.abs(Y-depthAtV(cam,v+1/sc)),fx=zcv/(cam.f*sc);   // cm per piksel kanvas
  const j=Math.floor(Y/th),b0=(Y-j*th)/th;
  const lvl=clamp(Math.round(Math.log2(Math.max(fx,fy)*mips[0].s/tw)),0,nL-1);
  const ms=mips[lvl].s,md=mips[lvl].data;
  const halfX=Math.min(Math.max(groutCm/2,.6*fx),.17*tw),halfY=Math.min(Math.max(groutCm/2,.6*fy),.17*th);
  const covY=clamp((halfY-Math.min(b0,1-b0)*th)/fy+.5,0,1);
  const row=y*W;
  for(let x=0;x<W;x++){
   if(!mask[row+x])continue;
   const X=((x+.5)/sc-cam.cx)*zcv/cam.f;
   const i=Math.floor(X/tw),a0=(X-i*tw)/tw;
   const face=p.seamless?0:(((i*7+j*3+((i*j)%5))%4)+4)%4;   // 4 variasi cermin; motif seamless = tanpa variasi
   let a=a0,b=b0;if(face&1)a=1-a;if(face&2)b=1-b;
   const tx=a*ms-.5,ty=b*ms-.5,x0=Math.floor(tx),y0=Math.floor(ty),wx=tx-x0,wy=ty-y0;
   const xa=wrap?((x0%ms)+ms)%ms:clamp(x0,0,ms-1),xb=wrap?(((x0+1)%ms)+ms)%ms:clamp(x0+1,0,ms-1),
         ya=wrap?((y0%ms)+ms)%ms:clamp(y0,0,ms-1),yb=wrap?(((y0+1)%ms)+ms)%ms:clamp(y0+1,0,ms-1);
   const i00=(ya*ms+xa)*4,i10=(ya*ms+xb)*4,i01=(yb*ms+xa)*4,i11=(yb*ms+xb)*4;
   const covX=clamp((halfX-Math.min(a0,1-a0)*tw)/fx+.5,0,1);
   const gr=Math.max(covX,covY)*.9,q=(row+x)*4;
   for(let c=0;c<3;c++){
    const t=(md[i00+c]*(1-wx)+md[i10+c]*wx)*(1-wy)+(md[i01+c]*(1-wx)+md[i11+c]*wx)*wy;
    o[q+c]=t*(1-gr)+gc[c]*gr;
   }
   o[q+3]=255;
  }
 }
 tctx.putImageData(out,0,0);
}

/* ---------- Campur ubin dengan cahaya & pantulan foto ---------- */
function composite(p){
 const S=scene,W=S.W,H=S.H,photo=S.photo.data;
 const tex=S.texCanvas.getContext('2d').getImageData(0,0,W,H).data;
 const out=ctx.createImageData(W,H),o=out.data;
 o.set(photo);
 // Warna motif harus tetap setia: tanpa nuansa hangat ruangan, kilau sedang, pantulan terang dibatasi,
 // lalu eksposur dikoreksi supaya warna rata-rata ubin sama dengan motifnya.
 const g=p.surface==='Glossy'?.5:.25,base=S.base,Ls=S.Ls,mask=S.mask;
 const shade=(i,q,c)=>{
  const dl0=Ls[i]-base,dl=dl0>0?dl0*.6:dl0;          // pantulan terang diredam
  const v=tex[q+c]*(1+g*dl/base)+g*.25*dl;
  return v<0?0:v>255?255:v;
 };
 const st=[0,0,0],so=[0,0,0];
 for(let i=S.minY*W;i<W*H;i+=3){                      // contoh tiap 3 piksel cukup untuk rata-rata
  if(mask[i]<128)continue;const q=i*4;
  for(let c=0;c<3;c++){st[c]+=tex[q+c];so[c]+=shade(i,q,c)}
 }
 const gain=[0,1,2].map(c=>so[c]>0?clamp(st[c]/so[c],.85,1.3):1);
 for(let i=S.minY*W;i<W*H;i++){
  const m=mask[i];if(!m)continue;
  const a=m/255,q=i*4;
  for(let c=0;c<3;c++){
   let v=shade(i,q,c)*gain[c];v=v>255?255:v;
   o[q+c]=photo[q+c]*(1-a)+v*a;
  }
 }
 ctx.putImageData(out,0,0);
}

function renderFloor(p){
 if(p.mips)drawTexturedTiles(p);else drawTiles(p);
 composite(p);
}
function showOriginal(){ctx.putImageData(scene.photo,0,0)}

/* ---------- Katalog ---------- */
const norm=s=>String(s).toLowerCase().replace(/(\d)\s*[x×*]\s*(\d)/g,'$1x$2').replace(/\s*cm\b/g,'').replace(/\s+/g,' ').trim();
const sizeLabel=s=>s.replace('x',' × ');

function swatchImage(p){
 if(p.pattern==='marble')return `repeating-linear-gradient(145deg, transparent 0 23px, ${p.vein}66 24px 25px, transparent 26px 47px),linear-gradient(135deg,${p.color},${p.color})`;
 if(p.pattern==='linear')return `repeating-linear-gradient(90deg,transparent 0 11px,${p.vein}66 12px 13px,transparent 14px 19px)`;
 return `repeating-linear-gradient(160deg,transparent 0 25px,${p.vein}55 26px 27px,transparent 28px 51px)`;
}

function applySwatch(el,p){
 const tex=p.texture&&window.TEXTURES&&window.TEXTURES[p.texture];
 el.style.backgroundColor=p.color;
 if(tex){el.style.backgroundImage='url("'+tex+'")';el.style.backgroundSize='cover';el.style.backgroundPosition='center'}
 else{el.style.backgroundImage=swatchImage(p);el.style.backgroundSize='';el.style.backgroundPosition=''}
}

function renderFilters(){
 const sizes=[...new Set(products.map(p=>p.size))].sort((a,b)=>{const A=parseSize(a),B=parseSize(b);return A[0]*A[1]-B[0]*B[1]||A[0]-B[0]});
 filtersEl.innerHTML='';
 [['all','Semua']].concat(sizes.map(s=>[s,s.replace('x','×')])).forEach(([val,label])=>{
  const b=document.createElement('button');
  b.type='button';b.className='filter'+(val===filter?' active':'');b.dataset.size=val;b.textContent=label;
  b.setAttribute('aria-pressed',val===filter?'true':'false');
  filtersEl.appendChild(b);
 });
}
function syncFilterButtons(){
 filtersEl.querySelectorAll('.filter').forEach(b=>{const on=b.dataset.size===filter;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on?'true':'false')});
}

function renderGrid(){
 const q=norm(searchEl.value);
 const shown=products.filter(p=>(filter==='all'||p.size===filter)&&norm(`${p.name} ${p.size} ${p.surface}`).includes(q));
 grid.innerHTML='';
 if(!shown.length){
  const m=document.createElement('p');m.className='empty';m.textContent='Motif tidak ditemukan. Coba kata kunci atau ukuran lain.';grid.appendChild(m);
 }
 shown.forEach(p=>{
  const b=document.createElement('button');
  b.className='product'+(p.id===active?' selected':'');b.type='button';b.dataset.id=p.id;
  b.setAttribute('aria-pressed',p.id===active?'true':'false');
  b.innerHTML=`<span class="swatch"></span><b>${p.name}</b><small>${sizeLabel(p.size)} cm · ${p.surface}</small>`;
  applySwatch(b.querySelector('.swatch'),p);
  b.addEventListener('click',()=>selectProduct(p.id));
  grid.appendChild(b);
 });
 $('count').textContent=String(shown.length).padStart(2,'0')+' produk';
}

function selectProduct(id){
 const p=products.find(x=>x.id===id);if(!p)return;
 active=id;original=false;
 $('selectedName').textContent=p.name;
 $('selectedSize').textContent=sizeLabel(p.size)+' cm';
 $('detailName').textContent=p.name;
 $('detailMeta').textContent=sizeLabel(p.size)+' cm · '+p.surface;
 applySwatch($('detailSwatch'),p);
 toggleBtn.textContent='Lihat lantai asli';
 grid.querySelectorAll('.product').forEach(b=>{const on=b.dataset.id===id;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',on?'true':'false')});
 if(!scene){pendingId=id;return}
 viewLabel.textContent='Memproses…';
 // beri kesempatan browser menampilkan status sebelum perhitungan berat
 setTimeout(()=>{
  if(active!==id)return;
  renderFloor(p);
  viewLabel.textContent='Visualisasi motif aktif';
 },20);
}

/* ---------- Event ---------- */
filtersEl.addEventListener('click',e=>{
 const b=e.target.closest('.filter');if(!b)return;
 filter=b.dataset.size;syncFilterButtons();renderGrid();
});
searchEl.addEventListener('input',renderGrid);
toggleBtn.addEventListener('click',()=>{
 if(!scene)return;
 original=!original;
 if(original)showOriginal();else renderFloor(products.find(x=>x.id===active));
 toggleBtn.textContent=original?'Kembali ke visualisasi':'Lihat lantai asli';
 viewLabel.textContent=original?'Lantai asli pada foto':'Visualisasi motif aktif';
});
$('reset').addEventListener('click',()=>{
 filter='all';searchEl.value='';syncFilterButtons();active='sand';renderGrid();selectProduct('sand');
});

/* ---------- Mulai ---------- */
renderFilters();
renderGrid();
(function init(){
 const room=(window.ROOMS||[])[0],src=room&&window.ROOM_IMAGES&&window.ROOM_IMAGES[room.image];
 if(!room||!src){viewLabel.textContent='Data ruangan tidak ditemukan (rooms.js / assets)';return}
 viewLabel.textContent='Memuat foto ruangan…';
 Promise.all([loadImage(src),loadTextures()]).then(res=>{
  scene=prepareScene(room,res[0]);
  selectProduct(pendingId||active);
 }).catch(err=>{viewLabel.textContent=err.message});
})();

/* ---------- Perbesar foto ruangan (lightbox + zoom/geser) ---------- */
(function(){
 const frame=$('roomFrame'),lb=$('lightbox'),stage=$('lbStage'),lc=$('lbCanvas'),lctx=lc.getContext('2d'),
       zoomEl=$('lbZoom'),origBtn=$('lbOriginal'),hint=$('lbHint'),MAX=4;
 let s=1,tx=0,ty=0,bw=0,bh=0,isOpen=false,lastTap=0,lastTapX=0,lastTapY=0,moved=false;
 const ptrs=new Map();let lastDist=0,lastMx=0,lastMy=0;

 function sync(){
  lc.width=canvas.width;lc.height=canvas.height;lctx.drawImage(canvas,0,0);
  $('lbName').textContent=$('selectedName').textContent;
  $('lbSize').textContent=$('selectedSize').textContent;
  origBtn.textContent=toggleBtn.textContent;
 }
 function clamp(){
  const W=stage.clientWidth,H=stage.clientHeight,sw=bw*s,sh=bh*s;
  tx=sw<=W?(W-sw)/2:Math.min(0,Math.max(W-sw,tx));
  ty=sh<=H?(H-sh)/2:Math.min(0,Math.max(H-sh,ty));
 }
 function apply(){
  clamp();
  lc.style.transform='translate('+tx+'px,'+ty+'px) scale('+s+')';
  zoomEl.textContent=Math.round(s*100)+'%';
 }
 function fitBase(){
  const W=stage.clientWidth,H=stage.clientHeight,r=canvas.width/canvas.height;
  bw=Math.min(W,H*r);bh=bw/r;lc.style.width=bw+'px';lc.style.height=bh+'px';
 }
 function zoomAt(cx,cy,ns){
  ns=Math.min(MAX,Math.max(1,ns));const k=ns/s;
  tx=cx-(cx-tx)*k;ty=cy-(cy-ty)*k;s=ns;apply();
 }
 function resetView(initial){
  fitBase();
  const W=stage.clientWidth,H=stage.clientHeight;
  // HP tegak: mulai lebih besar supaya lantai terlihat jelas (tetap bisa "Pas layar")
  s=(initial&&H>W)?Math.min(MAX,Math.max(1,H*0.5/bh)):1;
  tx=-(bw*s-W)/2;ty=0;apply();
 }
 function open(){
  if(!scene||isOpen)return;
  isOpen=true;sync();lb.hidden=false;document.body.style.overflow='hidden';
  hint.textContent=(window.innerHeight>window.innerWidth?'Putar HP ke mendatar untuk tampilan lebih luas · ':'')+'Cubit atau scroll untuk zoom · seret untuk menggeser · ketuk dua kali untuk memperbesar';
  resetView(true);$('lbClose').focus();
 }
 function close(){
  if(!isOpen)return;isOpen=false;lb.hidden=true;document.body.style.overflow='';ptrs.clear();frame.focus({preventScroll:true});
 }
 const stageXY=e=>{const r=stage.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};

 frame.addEventListener('click',open);
 frame.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
 $('lbClose').addEventListener('click',close);
 document.addEventListener('keydown',e=>{
  if(!isOpen)return;
  if(e.key==='Escape')close();
  else if(e.key==='+'||e.key==='=')zoomAt(stage.clientWidth/2,stage.clientHeight/2,s*1.3);
  else if(e.key==='-')zoomAt(stage.clientWidth/2,stage.clientHeight/2,s/1.3);
 });
 $('lbIn').addEventListener('click',()=>zoomAt(stage.clientWidth/2,stage.clientHeight/2,s*1.4));
 $('lbOut').addEventListener('click',()=>zoomAt(stage.clientWidth/2,stage.clientHeight/2,s/1.4));
 $('lbFit').addEventListener('click',()=>resetView(false));
 origBtn.addEventListener('click',()=>{toggleBtn.click();sync()});
 window.addEventListener('resize',()=>{if(!isOpen)return;fitBase();apply()});

 stage.addEventListener('wheel',e=>{
  e.preventDefault();const[x,y]=stageXY(e);zoomAt(x,y,s*Math.exp(-e.deltaY*0.0018));
 },{passive:false});

 stage.addEventListener('pointerdown',e=>{
  stage.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,[e.clientX,e.clientY]);
  stage.classList.add('dragging');moved=false;
  if(ptrs.size===2){
   const[a,b]=[...ptrs.values()];lastDist=Math.hypot(a[0]-b[0],a[1]-b[1]);lastMx=(a[0]+b[0])/2;lastMy=(a[1]+b[1])/2;
  }
 });
 stage.addEventListener('pointermove',e=>{
  if(!ptrs.has(e.pointerId))return;
  const prev=ptrs.get(e.pointerId);ptrs.set(e.pointerId,[e.clientX,e.clientY]);
  if(ptrs.size===1){
   const dx=e.clientX-prev[0],dy=e.clientY-prev[1];
   if(Math.abs(dx)+Math.abs(dy)>0)moved=moved||Math.hypot(dx,dy)>1.5;
   tx+=dx;ty+=dy;apply();
  }else if(ptrs.size===2){
   moved=true;
   const[a,b]=[...ptrs.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]),mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;
   const r=stage.getBoundingClientRect();
   tx+=mx-lastMx;ty+=my-lastMy;
   if(lastDist>0)zoomAt(mx-r.left,my-r.top,s*d/lastDist);else apply();
   lastDist=d;lastMx=mx;lastMy=my;
  }
 });
 function end(e){
  if(!ptrs.has(e.pointerId))return;
  const wasSingle=ptrs.size===1;ptrs.delete(e.pointerId);
  if(ptrs.size===0)stage.classList.remove('dragging');
  if(ptrs.size===1){const[p]=[...ptrs.values()];lastDist=0;lastMx=p[0];lastMy=p[1]}
  if(wasSingle&&!moved&&e.type==='pointerup'){
   const now=Date.now(),[x,y]=stageXY(e);
   if(now-lastTap<320&&Math.hypot(x-lastTapX,y-lastTapY)<30){
    zoomAt(x,y,s>1.05?1:Math.min(MAX,2.5));lastTap=0;
   }else{lastTap=now;lastTapX=x;lastTapY=y}
  }
 }
 stage.addEventListener('pointerup',end);
 stage.addEventListener('pointercancel',end);
})();
