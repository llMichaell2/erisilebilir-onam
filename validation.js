/* Format checks only; these do not verify a person's identity. */
(function(root){
 const digitWords={sıfır:'0',bir:'1',iki:'2',üç:'3',dört:'4',beş:'5',altı:'6',yedi:'7',sekiz:'8',dokuz:'9'};
 function digits(value){return value.toLocaleLowerCase('tr-TR').split(/[\s,;.-]+/).map(w=>digitWords[w]??w).join('').replace(/[()+]/g,'')}
 function tc(value){const n=digits(value);if(!/^[1-9]\d{10}$/.test(n))return null;const a=[...n].map(Number);const odd=a[0]+a[2]+a[4]+a[6]+a[8],even=a[1]+a[3]+a[5]+a[7];return ((odd*7-even)%10+10)%10===a[9]&&a.slice(0,10).reduce((x,y)=>x+y,0)%10===a[10]?n:null}
 function phone(value){let n=digits(value);if(n.startsWith('90')&&n.length===12)n='0'+n.slice(2);if(n.length===10)n='0'+n;return /^0[2-5]\d{9}$/.test(n)?n:null}
 function birth(value){
  const months=['ocak','şubat','mart','nisan','mayıs','haziran','temmuz','ağustos','eylül','ekim','kasım','aralık'];
  let v=value.toLocaleLowerCase('tr-TR').trim();months.forEach((m,i)=>{v=v.replace(m,String(i+1))});
  const parts=v.split(/[\s./-]+/);if(parts.length!==3||parts.some(x=>!/^\d+$/.test(x)))return null;
  let [d,m,y]=parts.map(Number);if(parts[0].length===4)[y,m,d]=parts.map(Number);
  const dt=new Date(y,m-1,d);const now=new Date();if(y<1900||dt>now||dt.getFullYear()!==y||dt.getMonth()!==m-1||dt.getDate()!==d)return null;
  return `${String(d).padStart(2,'0')}.${String(m).padStart(2,'0')}.${y}`;
 }
 function dateTime(value){
  const match=value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)||value.trim().match(/^(\d{2})[./](\d{2})[./](\d{4})\s+(\d{2}):(\d{2})$/);
  if(!match)return null;let [a,b,c,h,min]=match.slice(1).map(Number);let y,m,d;if(match[1].length===4)[y,m,d]=[a,b,c];else [d,m,y]=[a,b,c];
  const date=new Date(y,m-1,d,h,min);if(y<1900||date.getFullYear()!==y||date.getMonth()!==m-1||date.getDate()!==d||h>23||min>59)return null;
  return `${String(d).padStart(2,'0')}.${String(m).padStart(2,'0')}.${y} ${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
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
