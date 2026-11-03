const $=id=>document.getElementById(id), canvas=$('card'),ctx=canvas.getContext('2d');
const DPI=300, SIZE=600, GAP=150, MARGIN=150;
const papers={
 '4x6':{w:4,h:6,label:'4 × 6 inches'},
 '5x7':{w:5,h:7,label:'5 × 7 inches'},
 '6x8':{w:6,h:8,label:'6 × 8 inches'},
 '8x10':{w:8,h:10,label:'8 × 10 inches'},
 letter:{w:8.5,h:11,label:'US Letter · 8½ × 11 inches'},
 a4:{w:210/25.4,h:297/25.4,label:'A4 · 210 × 297 mm'}
};
let positions=[];const controls=['zoom','horizontal','vertical'];let photo=null,request=0,drag=null;
function sheetLayout(key,n){
 const p=papers[key],width=Math.round(p.w*DPI),height=Math.round(p.h*DPI);
 const maxCols=Math.floor((width-2*MARGIN+GAP)/(SIZE+GAP));
 const maxRows=Math.floor((height-2*MARGIN+GAP)/(SIZE+GAP));
 const capacity=maxCols*maxRows;
 const count=Math.max(1,Math.min(capacity,Math.floor(Number(n)||1)));
 const cols=Math.min(maxCols,count),rows=Math.ceil(count/cols);
 const top=(height-(rows*SIZE+(rows-1)*GAP))/2;
 const slots=[];
 for(let row=0;row<rows;row++){
  const rowCount=Math.min(cols,count-row*cols),left=(width-(rowCount*SIZE+(rowCount-1)*GAP))/2;
  for(let col=0;col<rowCount;col++)slots.push([left+col*(SIZE+GAP),top+row*(SIZE+GAP)]);
 }
 return {width,height,capacity,slots,count};
}
function updatePaper(){
 const p=papers[$('paper').value],layout=sheetLayout($('paper').value,$('count').value||2);
 $('count').replaceChildren(...Array.from({length:layout.capacity},(_,i)=>new Option(`${i+1} ${i===0?'photo':'photos'}`,String(i+1))));
 $('count').value=String(layout.count);
 $('capacity').textContent=`Up to ${layout.capacity} photos fit with ½-inch gaps and at least ½-inch outer margins.`;
 $('paper-badge').textContent=p.label+' · PORTRAIT';
 $('dimensions').textContent=p.label+' · 300 DPI';
 draw();
}
// Vector scissors stay crisp and do not depend on emoji fonts.
function scissors(x,y){
 ctx.save();ctx.translate(x,y);ctx.strokeStyle='#454b43';ctx.lineWidth=3;ctx.setLineDash([]);
 for(const cy of [-10,10]){ctx.beginPath();ctx.arc(-14,cy,7,0,Math.PI*2);ctx.stroke();}
 ctx.beginPath();ctx.moveTo(-8,-7);ctx.lineTo(23,14);ctx.moveTo(-8,7);ctx.lineTo(23,-14);ctx.stroke();ctx.restore();
}
function cutGuide(x,y){
 scissors(x+SIZE/2,y-38);
}
function crop(){const size=Math.min(photo.width,photo.height)/+$('zoom').value;return {size,x:(photo.width-size)*$('horizontal').value/100,y:(photo.height-size)*$('vertical').value/100};}
function draw(){
 const layout=sheetLayout($('paper').value,$('count').value);
 if(canvas.width!==layout.width)canvas.width=layout.width;
 if(canvas.height!==layout.height)canvas.height=layout.height;
 positions=layout.slots;
 ctx.fillStyle='#b3b3b3';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.fillStyle='#41483f';ctx.textAlign='center';ctx.font='30px Arial';
 ctx.fillText('PAPER SIZE: '+papers[$('paper').value].label,canvas.width/2,70);
 ctx.font='24px Arial';ctx.fillText('Cut along photo edges • Remove the gray • Each photo: 2 × 2 in',canvas.width/2,canvas.height-55);
 for(const [x,y] of positions){
  if(photo){const c=crop();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(photo,c.x,c.y,c.size,c.size,x,y,SIZE,SIZE);}
  else{ctx.fillStyle='#eeeee8';ctx.fillRect(x,y,SIZE,SIZE);ctx.fillStyle='#7a8774';ctx.textAlign='center';ctx.font='50px Georgia';ctx.fillText('Your photo',x+300,y+290);ctx.font='32px Arial';ctx.fillText('2 × 2 in',x+300,y+350);}
  cutGuide(x,y);
 }
 $('zoomval').textContent=(+$('zoom').value).toFixed(2)+'×';
 if(photo)$('status').textContent=crop().size<SIZE?'This crop is below 600 × 600 pixels; it may print softly.':`Ready · ${canvas.width} × ${canvas.height} pixels · ${layout.count} ${layout.count===1?'photo':'photos'}`;
}
function reset(){controls.forEach(id=>$(id).value=id==='zoom'?1:50);draw();}
async function load(file){if(!file)return;const version=++request;if(!/^image\/(jpeg|png|webp)$/.test(file.type)){$('status').textContent='Please choose a JPG, PNG, or WebP image.';return;}const url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await img.decode();if(version!==request)return;photo=img;[...controls,'reset','download'].forEach(id=>$(id).disabled=false);reset();}catch{$('status').textContent='This image could not be opened. Try a JPG or PNG.';}finally{URL.revokeObjectURL(url);}}
$('file').onchange=e=>load(e.target.files[0]);$('drop').ondragover=e=>{e.preventDefault();};$('drop').ondrop=e=>{e.preventDefault();load(e.dataTransfer.files[0]);};controls.forEach(id=>$(id).oninput=draw);$('reset').onclick=reset;
function point(e){const b=canvas.getBoundingClientRect();return {x:(e.clientX-b.left)*canvas.width/b.width,y:(e.clientY-b.top)*canvas.height/b.height};}
canvas.onpointerdown=e=>{if(!photo)return;const p=point(e);if(!positions.some(([x,y])=>p.x>=x&&p.x<=x+600&&p.y>=y&&p.y<=y+600))return;drag={p,c:crop()};canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(!drag)return;const p=point(e),c=drag.c;const limit=(n)=>Math.max(0,Math.min(100,n));$('horizontal').value=photo.width===c.size?50:limit((c.x-(p.x-drag.p.x)*c.size/600)/(photo.width-c.size)*100);$('vertical').value=photo.height===c.size?50:limit((c.y-(p.y-drag.p.y)*c.size/600)/(photo.height-c.size)*100);draw();};canvas.onpointerup=canvas.onpointercancel=()=>drag=null;
// Add the physical pixel density (300 dpi) to the PNG, after IHDR.
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
async function printPng(){const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Export failed');const bytes=new Uint8Array(await blob.arrayBuffer()),chunk=new Uint8Array(21),v=new DataView(chunk.buffer);v.setUint32(0,9);chunk.set([112,72,89,115],4);v.setUint32(8,11811);v.setUint32(12,11811);chunk[16]=1;v.setUint32(17,crc32(chunk.subarray(4,17)));return new Blob([bytes.subarray(0,33),chunk,bytes.subarray(33)],{type:'image/png'});}
$('download').onclick=async()=>{try{const blob=await printPng(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`photo-pair-${$('paper').value}-${$('count').value}-photos-300dpi.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);$('status').textContent=`Downloaded. Print on ${papers[$('paper').value].label} paper, actual size.`;}catch{$('status').textContent='Could not export. Please try again.';}};$('paper').onchange=updatePaper;$('count').onchange=draw;updatePaper();
