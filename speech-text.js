globalThis.prepareSpeech=function(str){
  return str.replace(/^\d+\.\s*/, '').replace(/T\.C\./g,'Türkiye Cumhuriyeti')
   .replace(/Bilgisayarlı Tomografi \(BT \/ Tomografi\)/gi,'bilgisayarlı tomografi')
   .replace(/Manyetik Rezonans Görüntüleme \(MR\)/gi,'emar')
   .replace(/%0,01[–-]0,1/g,'yüzde sıfır virgül sıfır bir ile yüzde sıfır virgül bir arasında')
   .replace(/%5[–-]10/g,'yüzde beş ile yüzde on arasında')
   .replace(/%0,01/g,'yüzde sıfır virgül sıfır bir')
   .replace(/4[–-]6/g,'dört ile altı')
   .replace(/\bMR\b/g,'emar').replace(/\bBT\b/g,'bilgisayarlı tomografi')
   .replace(/X-ışınları/g,'iks ışınları').replace(/vb\./g,'ve benzeri')
   .replace(/\(([^)]*)\)/g,', $1,').replace(/\s*\/\s*/g,' veya ');
 };
