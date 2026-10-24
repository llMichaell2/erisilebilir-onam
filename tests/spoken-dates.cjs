const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../validation.js'),'utf8'),ctx);const V=ctx.OnamValidation;
for(const [text,want] of [
 ['beş ekim iki bin beş','05.10.2005'],['beş ekim ikibin beş','05.10.2005'],['5 Ekim 2005','05.10.2005'],['beş ekim ikibinbeş','05.10.2005'],['beş ekim 2000 beş','05.10.2005'],['on beş haziran bin dokuz yüz doksan','15.06.1990'],['yirmi dokuz şubat iki bin','29.02.2000'],['sıfır beş mayıs iki bin beş','05.05.2005'],['31.12.1999','31.12.1999'],['2005-10-05','05.10.2005'],['05/10/2005','05.10.2005'],['beş ekim bir dokuz dokuz sıfır','05.10.1990']
])assert.equal(V.birth(text),want,text);
for(const text of ['beş ekim 200','beş ekim iki','otuz bir şubat iki bin beş','yirmi dokuz şubat iki bin bir','beş bilinmeyen iki bin','beş ekim iki bin beş altı','beş ekim iki bin bin','beş ekim 3000','32.10.2005','5.13.2005'])assert.equal(V.birth(text),null,text);
for(const [text,want] of [['24.10.2026 14:30','24.10.2026 14:30'],['2026-10-24T14:30','24.10.2026 14:30'],['yirmi dört ekim iki bin yirmi altı saat on dört dakika otuz','24.10.2026 14:30'],['beş ekim iki bin beş saat sıfır dokuz dakika sıfır beş','05.10.2005 09:05']])assert.equal(V.dateTime(text),want,text);
for(const text of ['24.10.2026 24:00','31.02.2026 14:30','24.10.2026 14:60','beş ekim iki bin beş saat on bir'])assert.equal(V.dateTime(text),null,text);
// Every prerecorded year must also parse back to the same calendar year.
for(let y=1900;y<=2025;y++)assert.equal(V.birth('beş ekim '+V.numberParts(y).join(' ')),'05.10.'+y,String(y));
console.log('PASS: spoken/compact/mixed dates, 126 year round trips, leap years, incomplete and invalid dates, explicit spoken hours/minutes');
