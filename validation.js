/* Format checks only; these do not verify a person's identity. */
(function(root){
 const digitWords={sıfır:'0',bir:'1',iki:'2',üç:'3',dört:'4',beş:'5',altı:'6',yedi:'7',sekiz:'8',dokuz:'9'};
 function digits(value){return value.toLocaleLowerCase('tr-TR').split(/[\s,;.-]+/).map(w=>digitWords[w]??w).join('').replace(/[()+]/g,'')}
 function tc(value){const n=digits(value);if(!/^[1-9]\d{10}$/.test(n))return null;const a=[...n].map(Number);const odd=a[0]+a[2]+a[4]+a[6]+a[8],even=a[1]+a[3]+a[5]+a[7];return ((odd*7-even)%10+10)%10===a[9]&&a.slice(0,10).reduce((x,y)=>x+y,0)%10===a[10]?n:null}
 function phone(value){let n=digits(value);if(n.startsWith('90')&&n.length===12)n='0'+n.slice(2);if(n.length===10)n='0'+n;return /^0[2-5]\d{9}$/.test(n)?n:null}
 const monthNames=['ocak','şubat','mart','nisan','mayıs','haziran','temmuz','ağustos','eylül','ekim','kasım','aralık'];
 const smallNumbers={sıfır:0,bir:1,iki:2,üç:3,dört:4,beş:5,altı:6,yedi:7,sekiz:8,dokuz:9,on:10,yirmi:20,otuz:30,kırk:40,elli:50,altmış:60,yetmiş:70,seksen:80,doksan:90};
 const numberLexicon=[...Object.keys(smallNumbers),'yüz','bin'].sort((a,b)=>b.length-a.length);
 function numberTokens(value){
  const output=[];
  for(const word of value.toLocaleLowerCase('tr-TR').normalize('NFC').trim().split(/\s+/)){
   if(/^\d+$/.test(word)){output.push(word);continue}
   let rest=word;
   while(rest){const found=numberLexicon.find(part=>rest.startsWith(part));if(!found)return null;output.push(found);rest=rest.slice(found.length)}
  }
  return output;
 }
 function underHundred(tokens){
  if(tokens.length===1){const t=tokens[0];return /^\d+$/.test(t)&&Number(t)<100?Number(t):(smallNumbers[t]??null)}
  if(tokens.length===2){const [a,b]=tokens.map(t=>smallNumbers[t]);if(a>=10&&a%10===0&&b>0&&b<10)return a+b}
  return null;
 }
 function underThousand(tokens){
  if(!tokens.length)return 0;
  if(tokens.length===1&&/^\d+$/.test(tokens[0])&&Number(tokens[0])<1000)return Number(tokens[0]);
  const hundred=tokens.indexOf('yüz');
  if(hundred<0)return underHundred(tokens);
  if(hundred>1||tokens.indexOf('yüz',hundred+1)>=0)return null;
  const factor=hundred===0?1:smallNumbers[tokens[0]];
  if(!factor||factor>9)return null;
  const tail=tokens.slice(hundred+1),remainder=tail.length?underHundred(tail):0;
  return remainder===null?null:factor*100+remainder;
 }
 function spokenNumber(value){
  const tokens=numberTokens(value);if(!tokens?.length)return null;
  if(tokens.length===1&&/^\d+$/.test(tokens[0]))return Number(tokens[0]);
  // Dictation may return a year as individual digits or a numeric thousand plus words.
  if(tokens.length<=4&&tokens.every(t=>smallNumbers[t]>=0&&smallNumbers[t]<10))return Number(tokens.map(t=>smallNumbers[t]).join(''));
  if(/^\d+$/.test(tokens[0])&&Number(tokens[0])>=1000&&Number(tokens[0])%1000===0){const tail=underThousand(tokens.slice(1));return tail===null?null:Number(tokens[0])+tail}
  const thousand=tokens.indexOf('bin');
  if(thousand<0)return underThousand(tokens);
  if(thousand>1||tokens.indexOf('bin',thousand+1)>=0)return null;
  const factor=thousand===0?1:smallNumbers[tokens[0]];
  if(!factor||factor>9)return null;
  const tail=underThousand(tokens.slice(thousand+1));return tail===null?null:factor*1000+tail;
 }
 function dateParts(value){
  let v=value.toLocaleLowerCase('tr-TR').normalize('NFC').trim().replace(/[.,!?]+$/,'');
  const numeric=v.match(/^(\d{1,4})[\s./-]+(\d{1,2})[\s./-]+(\d{1,4})$/);
  if(numeric){const [a,b,c]=numeric.slice(1);return a.length===4?[Number(c),Number(b),Number(a)]:c.length===4?[Number(a),Number(b),Number(c)]:null}
  const words=v.split(/\s+/),month=words.findIndex(w=>monthNames.includes(w));
  if(month<1||month===words.length-1)return null;
  const d=spokenNumber(words.slice(0,month).join(' '));
  const y=spokenNumber(words.slice(month+1).join(' '));
  return d===null||y===null?null:[d,monthNames.indexOf(words[month])+1,y];
 }
 function validDate(d,m,y){const dt=new Date(y,m-1,d);return Number.isInteger(y)&&y>=1900&&y<=9999&&dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d?dt:null}
 function formattedDate(d,m,y){return `${String(d).padStart(2,'0')}.${String(m).padStart(2,'0')}.${y}`}
 function birth(value){
  const parts=dateParts(value);if(!parts)return null;
  const [d,m,y]=parts,dt=validDate(d,m,y);
  return dt&&dt<=new Date()?formattedDate(d,m,y):null;
 }
 function dateTime(value){
  const input=value.trim();
  const iso=input.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  let date,h,min;
  if(iso){date=[Number(iso[3]),Number(iso[2]),Number(iso[1])];h=Number(iso[4]);min=Number(iso[5])}
  else{
   const standard=input.match(/^(.+)\s+(\d{1,2}):(\d{2})$/);
   const spoken=input.toLocaleLowerCase('tr-TR').match(/^(.+?)\s+saat\s+(.+?)\s+dakika\s+(.+)$/);
   if(standard){date=dateParts(standard[1]);h=Number(standard[2]);min=Number(standard[3])}
   else if(spoken){date=dateParts(spoken[1]);h=spokenNumber(spoken[2]);min=spokenNumber(spoken[3])}
   else return null;
  }
  if(!date||h===null||min===null||h<0||h>23||min<0||min>59||!validDate(...date))return null;
  return `${formattedDate(...date)} ${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
 }
 function localNow(){const n=new Date();return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}T${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`}
 const words=['sıfır','bir','iki','üç','dört','beş','altı','yedi','sekiz','dokuz'];
 const tens=['','on','yirmi','otuz','kırk','elli','altmış','yetmiş','seksen','doksan'];
 function numberParts(value,padded=false){
  const str=String(value);
  if(padded&&str.length>1&&str[0]==='0'){
   if(str.length===2)return ['sıfır '+words[Number(str[1])]];
   return ['sıfır',...numberParts(str.slice(1),true)];
  }
  let n=Number(str);if(!Number.isInteger(n)||n<0||n>9999)throw Error('Unsupported number');
  if(n===0)return ['sıfır'];
  const parts=[];
  if(n>=1000){const thousands=Math.floor(n/1000);parts.push(thousands===1?'bin':words[thousands]+' bin');n%=1000}
  if(n>=100){const hundreds=Math.floor(n/100);parts.push(hundreds===1?'yüz':words[hundreds]+' yüz');n%=100}
  if(n)parts.push(n<10?words[n]:[tens[Math.floor(n/10)],n%10?words[n%10]:''].filter(Boolean).join(' '));
  return parts;
 }
 function answerParts(key,value){
  if(key==='tc')return [...value].map(d=>words[Number(d)]);
  if(key==='phone')return [value.slice(0,1),value.slice(1,4),value.slice(4,7),value.slice(7,9),value.slice(9,11)].flatMap(group=>numberParts(group,true));
  if(key==='birthDate'||key==='dateTime'){
   const [date,time]=value.split(' ');const [day,month,year]=date.split('.');
   const parts=[...numberParts(day,true),...numberParts(month,true),...(Number(year)===2005?['iki bin beş']:numberParts(year))];
   if(time){const [hour,minute]=time.split(':');parts.push('saat',...numberParts(hour,true),...numberParts(minute,true))}
   return parts;
  }
  return [];
 }
 root.OnamValidation={tc,phone,birth,dateTime,localNow,numberParts,answerParts,spokenDigits:v=>[...v].map(d=>words[Number(d)]).join(' ')};
})(globalThis);
