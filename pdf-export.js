// PDF generation stays in this browser. Only public scripts and fonts are fetched.
(() => {
 'use strict';
 const base=new URL('.',document.currentScript.src);let assets=null;
 function script(file){return new Promise((resolve,reject)=>{const element=document.createElement('script');element.src=new URL(file,base).href;element.onload=resolve;element.onerror=()=>{element.remove();reject(Error('PDF bileşeni yüklenemedi. Bağlantınızı kontrol edip yeniden deneyin.'))};document.head.append(element)})}
 async function resources(){
  if(!assets)assets=(async()=>{if(!window.PDFLib)await script('vendor/pdf-lib.min.js');if(!window.fontkit)await script('vendor/fontkit.umd.min.js');const fetchFont=async name=>{const response=await fetch(new URL('assets/fonts/'+name,base));if(!response.ok)throw Error('PDF yazı tipi yüklenemedi. Yeniden deneyin.');return response.arrayBuffer()};const fonts=await Promise.all([fetchFont('NotoSans-Regular.ttf'),fetchFont('NotoSans-Bold.ttf')]);return fonts})().catch(error=>{assets=null;throw error});
  return assets;
 }
 async function create(report){
  if(!report?.answers||!Array.isArray(report.formSnapshot)||!report.formSnapshot.length)throw Error('PDF için form metni bulunamadı. Sayfayı yenileyip formu yeniden tamamlayın.');
  const fonts=await resources(),{PDFDocument,rgb,PDFString}=window.PDFLib;
  const pdf=await PDFDocument.create();pdf.registerFontkit(window.fontkit);pdf.setTitle('Erişilebilir Onam - Hasta Beyanı');pdf.setAuthor('Erişilebilir Onam');pdf.setLanguage('tr-TR');pdf.setCreationDate(new Date(report.completedAt));
  const regular=await pdf.embedFont(fonts[0],{subset:false}),bold=await pdf.embedFont(fonts[1],{subset:false});
  const width=595.28,height=841.89,margin=44,contentWidth=width-2*margin,navy=rgb(.09,.17,.29),red=rgb(.76,.16,.25),muted=rgb(.32,.38,.46),line=rgb(.84,.87,.91);let page,y;
  function addPage(){page=pdf.addPage([width,height]);page.drawText('ERİŞİLEBİLİR ONAM',{x:margin,y:height-40,size:10,font:bold,color:navy});page.drawText('HASTA KOPYASI',{x:width-margin-88,y:height-40,size:8,font:regular,color:muted});page.drawLine({start:{x:margin,y:height-52},end:{x:width-margin,y:height-52},thickness:1,color:line});y=height-82;}
  function ensure(amount){if(y-amount<68)addPage()}
  function wrap(value,font,size,max){
   const rows=[];for(const paragraph of String(value??'').replace(/\r/g,'').split('\n')){let current='';for(const word of paragraph.split(/\s+/).filter(Boolean)){
    if(font.widthOfTextAtSize((current?current+' ':'')+word,size)<=max){current+=(current?' ':'')+word;continue}
    if(current){rows.push(current);current=''}let chunk='';for(const char of word){if(chunk&&font.widthOfTextAtSize(chunk+char,size)>max){rows.push(chunk);chunk=''}chunk+=char}current=chunk;
   }rows.push(current)}return rows;
  }
  function paragraph(value,{size=10.5,font=regular,color=navy,indent=0,leading=15,gap=9}={}){for(const row of wrap(value,font,size,contentWidth-indent)){ensure(leading);if(row)page.drawText(row,{x:margin+indent,y,size,font,color});y-=leading}y-=gap}
  function heading(value){ensure(50);paragraph(value,{size:14,font:bold,gap:10,leading:20})}
  function field(label,value){const lines=wrap(value,regular,11,contentWidth-155);const h=Math.max(32,lines.length*16+10);ensure(h);page.drawText(label,{x:margin,y,size:9,font:bold,color:muted});lines.forEach((row,i)=>page.drawText(row,{x:margin+155,y:y-i*16,size:11,font:regular,color:navy}));y-=h;}
  addPage();paragraph('Hasta beyanı',{size:26,font:bold,leading:34,gap:6});paragraph('Form özeti ve onaylanan bilgilendirme metni',{size:11,color:muted,gap:22});
  heading('Hasta bilgileri');
  for(const [key,label] of [['name','Ad soyad'],['tc','T.C. kimlik numarası'],['birthDate','Doğum tarihi'],['phone','Telefon'],['dateTime','Form tarih ve saati']])field(label,report.answers[key]?.value||'-');
  heading('Son beyan ve onay');paragraph(report.answers.declaration?.value||'-',{size:12,font:bold,leading:18});
  const raw=report.answers.declaration?.spokenDeclaration;if(raw&&raw!==report.answers.declaration.value)paragraph('İlk söylenen ifade: '+raw,{size:9,color:muted});
  paragraph('Beyanın tamamlandığı zaman: '+new Date(report.completedAt).toLocaleString('tr-TR'),{size:9,color:muted});
  const saved=!!report.recordId&&!!report.recordUrl;
  heading('Kayıt ve form erişimi');
  if(saved){
   paragraph('Sisteme kaydedildi. Kayıt numarası: '+report.recordId,{size:9,color:muted});ensure(135);const top=y,box=105,qr=window.qrcode(0,'M');qr.addData(report.recordUrl);qr.make();const count=qr.getModuleCount(),cell=box/(count+8),bottom=top-box;
   page.drawRectangle({x:margin,y:bottom,width:box,height:box,color:rgb(1,1,1)});
   for(let r=0;r<count;r++)for(let c=0;c<count;c++)if(qr.isDark(r,c))page.drawRectangle({x:margin+(c+4)*cell,y:bottom+(count+3-r)*cell,width:cell+.01,height:cell+.01,color:rgb(0,0,0)});
   const x=margin+box+20;page.drawText('Formunuzu QR ile açabilirsiniz.',{x,y:top-18,size:11,font:bold,color:navy});page.drawText('Kaydedilen formu aç',{x,y:top-43,size:10,font:regular,color:red});
   const annotation=pdf.context.obj({Type:'Annot',Subtype:'Link',Rect:[x,top-48,x+160,top-29],Border:[0,0,0],A:{Type:'Action',S:'URI',URI:PDFString.of(report.recordUrl)}});page.node.addAnnot(pdf.context.register(annotation));
   page.drawText('Bu PDF ve QR kişisel bilgiler içerir.',{x,y:top-66,size:8,font:regular,color:muted});y=bottom-24;
  }else paragraph('Sunucu kaydı doğrulanmadı. Bu PDF, açık sayfada tamamlanan beyanın kopyasıdır. Kayıt başarılı olmadığı için QR bağlantısı eklenmedi.',{size:10,color:muted});
  paragraph('Bu kayıt hasta beyanını gösterir; resmî kimlik doğrulaması veya elektronik imza değildir.',{size:8.5,color:muted});
  const health=report.answers.declaration?.healthHistory;
  if(health){
   if(!window.OnamHealth)throw Error('Sağlık öyküsü PDF bileşeni yüklenemedi. Sayfayı yenileyip tekrar deneyin.');
   addPage();paragraph('Sağlık öyküsü yanıtları',{size:20,font:bold,leading:28,gap:16});
   paragraph('Hastanın beyanıdır. Bilmiyorum yanıtı Hayır anlamına gelmez. İşleme uygunluk değerlendirmesini sağlık çalışanı yapar.',{size:9,color:muted});
   const rows=window.OnamHealth.entries(health);
   if(!rows)paragraph('Bu sağlık öyküsünün sürümü desteklenmiyor. Personel değerlendirmesi gerekir.');
   else for(const [index,row] of rows.entries()){ensure(80);paragraph((index+1)+'. '+row.prompt,{size:10.5,font:bold,leading:16,gap:5});paragraph('Yanıt: '+row.answer,{size:11,leading:16,gap:5});if(row.detail)paragraph('Açıklama: '+row.detail,{size:10.5,leading:16,gap:12});else y-=10}
  }
  addPage();paragraph('Onaylanan bilgilendirme metni',{size:20,font:bold,leading:28,gap:16});
  for(const section of report.formSnapshot){heading(section.title);paragraph(section.text,{size:10.5,leading:16,gap:16})}
  for(const [index,current] of pdf.getPages().entries()){current.drawLine({start:{x:margin,y:49},end:{x:width-margin,y:49},thickness:.6,color:line});current.drawText('Erişilebilir Onam - Hasta beyanı kopyası',{x:margin,y:33,size:8,font:regular,color:muted});current.drawText((index+1)+' / '+pdf.getPageCount(),{x:width-margin-30,y:33,size:8,font:regular,color:muted});}
  return new Blob([await pdf.save()],{type:'application/pdf'});
 }
 window.OnamPDF={create};
})();
