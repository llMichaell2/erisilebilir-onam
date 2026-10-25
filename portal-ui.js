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
