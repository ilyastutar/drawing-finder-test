(function(){
'use strict';document.body.classList.add('operations');
let pending=false;
function layout(){pending=false;const bar=document.querySelector('.access-bar');if(bar)document.documentElement.style.setProperty('--access-bar-height',Math.ceil(bar.getBoundingClientRect().height)+'px');
 const punch=document.getElementById('punchExpand'),tools=document.querySelector('.punch-copy-tools');if(punch&&tools&&punch.parentElement!==tools)tools.append(punch);
 const cable=document.querySelector('#cablePanel [data-expand]'),toolbar=document.querySelector('#cablePanel .cable-toolbar');if(cable&&toolbar&&cable.parentElement!==toolbar)toolbar.append(cable);
 for(const panel of document.querySelectorAll('#punchPanel,#cablePanel')){let nav=panel.querySelector('.workspace-nav');const expanded=panel.matches('.punch-expanded,.cable-fullscreen');if(expanded&&!nav){nav=document.createElement('nav');nav.className='workspace-nav';nav.setAttribute('aria-label','Workspace sections');for(const source of document.querySelectorAll('.mode-tabs [data-mode]')){const button=document.createElement('button');button.className='action';button.textContent=source.textContent;button.onclick=()=>{panel.querySelector('#punchExpand,[data-expand]').click();source.click()};nav.append(button)}panel.prepend(nav)}if(nav)nav.hidden=!expanded}
 const menu=document.querySelector('.cable-column-menu');if(menu&&!menu.querySelector('.menu-close')){const close=document.createElement('button');close.type='button';close.className='action menu-close';close.textContent='Close ×';close.onclick=()=>{menu.open=false;menu.querySelector('summary').focus()};menu.querySelector('[data-columns]').prepend(close)}
 for(const p of document.querySelectorAll('#punchPanel:not(.punch-expanded),#cablePanel:not(.cable-fullscreen)')){if(p.hidden)continue;const s=p.querySelector('.punch-scroll');if(s){const h=Math.max(220,innerHeight-s.getBoundingClientRect().top-52),v=h+'px';if(p.style.getPropertyValue('--workspace-height')!==v)p.style.setProperty('--workspace-height',v)}}
}
function schedule(){if(!pending){pending=true;requestAnimationFrame(layout)}}
new MutationObserver(schedule).observe(document.querySelector('main'),{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});window.addEventListener('resize',schedule);document.addEventListener('punch-updated',schedule);document.addEventListener('click',schedule);schedule();
function closeMenus(target){for(const d of document.querySelectorAll('details[open]'))if(d.matches('.cable-column-menu')&&!d.contains(target))d.open=false}
document.addEventListener('pointerdown',e=>{closeMenus(e.target);const d=e.target;if(d instanceof HTMLDialogElement&&d.open&&d.matches('.columns-dialog,.workspace-dialog')){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenus(null)});
})();
