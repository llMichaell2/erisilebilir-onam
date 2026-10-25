(() => {
 'use strict';
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 for(const carousel of document.querySelectorAll('.portal-carousel')){
  const slides=[...carousel.querySelectorAll('.portal-slide')],pause=carousel.querySelector('[data-slide-pause]'),position=carousel.querySelector('[data-slide-position]');
  let index=0,paused=reduced.matches,hover=false,focused=false,timer=null;
  const schedule=()=>{clearTimeout(timer);if(paused||hover||focused||document.hidden||carousel.closest('[hidden]'))return;timer=setTimeout(()=>{show(index+1)},10000)};
  const show=next=>{index=(next+slides.length)%slides.length;slides.forEach((slide,i)=>{slide.hidden=i!==index});position.textContent=String(index+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');schedule()};
  const label=()=>pause.textContent=paused?'Slaytları oynat':'Slaytları duraklat';
  carousel.querySelector('[data-slide-prev]').onclick=()=>show(index-1);carousel.querySelector('[data-slide-next]').onclick=()=>show(index+1);
  pause.onclick=()=>{paused=!paused;label();schedule()};
  carousel.addEventListener('mouseenter',()=>{hover=true;schedule()});carousel.addEventListener('mouseleave',()=>{hover=false;schedule()});
  carousel.addEventListener('focusin',()=>{focused=true;schedule()});carousel.addEventListener('focusout',()=>{queueMicrotask(()=>{focused=carousel.contains(document.activeElement);schedule()})});
  document.addEventListener('visibilitychange',schedule);reduced.addEventListener('change',()=>{if(reduced.matches){paused=true;label();schedule()}});
  new MutationObserver(schedule).observe(document.getElementById('main-content'),{attributes:true,subtree:true,attributeFilter:['hidden']});
  window.addEventListener('pagehide',()=>clearTimeout(timer));label();show(0);
 }
})();


(() => {
 'use strict';
 const box=document.querySelector('.staff-quotes');if(!box)return;
 const quotes=[
  'Her hayat eşsiz, her insan değerlidir.',
  'İyi bir iletişim, duyulduğunu hissetmekle başlar.',
  'Her hastanın arkasında bir hayat, her hayatın içinde bir umut vardır.',
  'İnsan hayatına dokunmak, en güzel iyiliktir.',
  'Şifa bazen bir ilaçta, bazen bir bilgide, bazen de bir insanın yaklaşımında saklıdır.',
  'Bir insanın hayatına yıllar katamasak bile, yıllarına hayat katabiliriz.',
  'Bir hayatı kurtarmak dünyayı değiştirmektir; kurtarılan kişi için dünya zaten değişmiştir.',
  'Hastalık insanı tanımlar sanmayın; her hastanın ardında umutları, hayalleri ve kocaman bir hayat vardır.'
 ];
 const text=document.getElementById('staff-quote'),position=document.getElementById('quote-position'),pause=document.getElementById('quote-pause'),motion=window.matchMedia('(prefers-reduced-motion: reduce)');
 let index=0,paused=motion.matches,hover=false,focused=false,timer=null,fade=null;
 function clear(){clearTimeout(timer);clearTimeout(fade);timer=fade=null;text.classList.remove('quote-changing')}
 function eligible(){return !paused&&!hover&&!focused&&!document.hidden&&!box.closest('[hidden]')}
 function schedule(){clearTimeout(timer);if(eligible())timer=setTimeout(()=>show(index+1),12000)}
 function render(){text.textContent=quotes[index];position.textContent=String(index+1).padStart(2,'0')+' / '+String(quotes.length).padStart(2,'0');text.classList.remove('quote-changing');schedule()}
 function show(next){clear();index=(next+quotes.length)%quotes.length;if(motion.matches){render();return}text.classList.add('quote-changing');fade=setTimeout(render,220)}
 function label(){pause.textContent=paused?'▶':'Ⅱ';pause.setAttribute('aria-label',paused?'Söz geçişlerini başlat':'Söz geçişlerini duraklat')}
 document.getElementById('quote-prev').onclick=()=>show(index-1);document.getElementById('quote-next').onclick=()=>show(index+1);
 pause.onclick=()=>{paused=!paused;label();schedule()};
 box.addEventListener('mouseenter',()=>{hover=true;schedule()});box.addEventListener('mouseleave',()=>{hover=false;schedule()});
 box.addEventListener('focusin',()=>{focused=true;schedule()});box.addEventListener('focusout',()=>queueMicrotask(()=>{focused=box.contains(document.activeElement);schedule()}));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();else schedule()});
 new MutationObserver(()=>{if(box.closest('[hidden]'))clear();else schedule()}).observe(document.getElementById('main-content'),{attributes:true,subtree:true,attributeFilter:['hidden']});
 motion.addEventListener('change',()=>{if(motion.matches){paused=true;clear();render();label()}});
 window.addEventListener('pagehide',clear);label();render();
})();
