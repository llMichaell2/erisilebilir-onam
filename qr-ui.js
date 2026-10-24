(() => {
 window.OnamQR={
  render(element,url){const qr=qrcode(0,'M');qr.addData(url);qr.make();element.innerHTML=qr.createSvgTag({cellSize:4,margin:4,scalable:true})},
  async download(element){
   const svg=element.querySelector('svg');if(!svg)throw Error('QR unavailable');
   const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));
   try{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=1000;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,1000,1000);ctx.drawImage(image,0,0,1000,1000);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('QR encoding failed');const png=URL.createObjectURL(blob);const a=document.createElement('a');a.href=png;a.download='onam-qr.png';a.click();setTimeout(()=>URL.revokeObjectURL(png),1000)}finally{URL.revokeObjectURL(url)}
  }
 };
})();
