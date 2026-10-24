(() => {
 const root=document.documentElement;const buttons=[['text-size','large-text'],['contrast','high-contrast']];
 let preferences={};try{preferences=JSON.parse(localStorage.getItem('onam-display-prefs')||'{}')}catch{}
 for(const [id,className] of buttons){const button=document.getElementById(id);if(!button)continue;
  const apply=value=>{root.classList.toggle(className,value);button.setAttribute('aria-pressed',String(value))};apply(preferences[className]===true);
  button.onclick=()=>{const active=!root.classList.contains(className);apply(active);preferences[className]=active;try{localStorage.setItem('onam-display-prefs',JSON.stringify(preferences))}catch{};const status=document.getElementById('display-status');if(status)status.textContent=(id==='text-size'?'Büyük yazı':'Yüksek kontrast')+(active?' açıldı.':' kapatıldı.')};
 }
 const current=document.getElementById('go-current');if(current)current.onclick=()=>{const card=document.querySelector('.section.is-active');if(!card)return;card.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});const h=card.querySelector('h3');h.tabIndex=-1;h.focus({preventScroll:true})};
})();
