(function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const M=HandoverModel,host=document.createElement('section');
host.id='handoverStatus';host.className='ho-view';host.hidden=true;document.getElementById('punchDashboard').after(host);
let active=false,data=null,criteria=null,busy=false,request=0,priority='all';const tableFilters={};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const fmt=v=>v?new Date(v+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):'No target date';
const pct=(n,d)=>d?Math.round(n/d*1000)/10:0;
host.innerHTML=`<header class="ho-heading"><div><small>PROJECT DELIVERY</small><h2>Project Handover Overview</h2><p>CHP Dradenau · Construction to commissioning</p></div><div><span data-updated></span><button class="action" data-refresh>Refresh</button></div></header>
<div class="ho-filters"><div class="ho-picker"><span>Subsystem</span><input type="hidden" data-subsystem><details><summary data-sub-choice>All subsystems</summary><div class="ho-picker-menu"><input type="search" data-sub-search placeholder="Search code or description…" aria-label="Find subsystem"><div data-sub-options></div></div></details></div><label>Discipline<select data-discipline aria-label="Discipline"><option value="">All disciplines</option><option>Civil</option><option>E&amp;I</option><option>Mechanical</option><option>Other</option></select></label><label>Responsible engineer<select data-engineer aria-label="Responsible engineer"><option value="">All engineers</option></select></label><button class="action" data-reset>Reset filters</button></div>
<div class="ho-policy"><button class="action criteria-button" data-change hidden>Change criteria</button><div><strong data-policy>Loading criteria…</strong><small>Warnings require an overdue target and an open punch in the selected categories. Recorded handovers stay unchanged.</small></div></div>
<p data-message role="status"></p><div data-content hidden></div>`;
const dialog=document.createElement('dialog');dialog.className='ho-criteria';dialog.setAttribute('aria-label','Change handover criteria');document.body.append(dialog);
const value=s=>host.querySelector(s).value;
function choices(){drawSubsystems();for(const [selector,entries,all]of [
 
 ['[data-engineer]',[...new Set((data?.rows||[]).map(r=>r.responsibleEngineer||''))].map(n=>[n||'__unassigned__',n||'Unassigned']),'All engineers']
 ]){const el=host.querySelector(selector),old=el.value;el.innerHTML='<option value="">'+all+'</option>'+entries.sort((a,b)=>a[1].localeCompare(b[1])).map(([k,t])=>'<option value="'+esc(k)+'">'+esc(t)+'</option>').join('');el.value=[...el.options].some(o=>o.value===old)?old:''}}
function drawSubsystems(){const selected=value('[data-subsystem]'),q=M.key(value('[data-sub-search]'));host.querySelector('[data-sub-choice]').textContent=selected||'All subsystems ('+(data?.rows.length||0)+')';host.querySelector('[data-sub-options]').innerHTML='<button type="button" data-select-sub="">All subsystems</button>'+[...(data?.rows||[])].filter(r=>M.key(r.subsystem+' '+r.description).includes(q)).sort((a,b)=>a.subsystem.localeCompare(b.subsystem)).map(r=>'<button type="button" data-select-sub="'+esc(r.subsystem)+'" aria-pressed="'+(r.subsystem===selected)+'"><strong>'+esc(r.subsystem)+'</strong><small>'+esc(r.description)+'</small></button>').join('')}
host.querySelector('[data-sub-search]').oninput=drawSubsystems;
host.addEventListener('click',e=>{const b=e.target.closest('[data-select-sub]');if(!b)return;host.querySelector('[data-subsystem]').value=b.dataset.selectSub;host.querySelector('.ho-picker details').open=false;drawSubsystems();render()});
document.addEventListener('pointerdown',e=>{const picker=host.querySelector('.ho-picker details');if(!picker.contains(e.target))picker.open=false});host.addEventListener('keydown',e=>{if(e.key==='Escape')host.querySelector('.ho-picker details').open=false});
function filterTable(){const rows=[...host.querySelectorAll('.ho-priority tbody tr[data-sub-row]')];let count=0;for(const row of rows){row.hidden=!Object.entries(tableFilters).every(([key,q])=>!q||M.key(row.querySelector('[data-cell="'+key+'"]')?.textContent).includes(M.key(q)));if(!row.hidden)count++}const label=host.querySelector('[data-priority-count]');if(label)label.textContent=count+' / '+rows.length;}
host.addEventListener('input',e=>{if(e.target.matches('[data-table-filter]')){tableFilters[e.target.dataset.tableFilter]=e.target.value;filterTable()}});
function filteredSubsystems(){const sub=value('[data-subsystem]'),engineer=value('[data-engineer]');return (data?.rows||[]).filter(r=>(!sub||r.subsystem===sub)&&(!engineer||(r.responsibleEngineer||'')===(engineer==='__unassigned__'?'':engineer)))}
function records(){return M.build(filteredSubsystems(),PunchItems.getSnapshot()?.rows||null,{today:today(),categories:criteria.categories,group:value('[data-discipline]'),getDiscipline:PunchItems.discipline,closed:p=>PunchItems.rowStatus(p).status==='Closed'})}
function week(date){const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10)}
function render(){
 if(!active)return;
 host.querySelector('[data-change]').hidden=!criteria;
 host.querySelector('[data-policy]').textContent=criteria?'Blocking categories: '+criteria.categories.join(' + '):'Criteria unavailable';
 const container=host.querySelector('[data-content]');container.hidden=!data?.available||!criteria;if(container.hidden)return;
 const rows=records(),pending=rows.filter(r=>!r.delivered),delivered=rows.length-pending.length,overdue=rows.filter(r=>r.overdue).length,loaded=!!PunchItems.getSnapshot();
 const name=criteria.categories.join(' + '),counts=['A','B','C'].map(category=>rows.reduce((a,r)=>{const c=r.counts.find(c=>c.category===category);a.total+=c.total;a.closed+=c.closed;a.open+=c.open;return a},{category,total:0,closed:0,open:0}));
 const blockers=pending.reduce((n,r)=>n+r.blockers,0);
 const stages=[['walkdown','Walkdown pending'],['blocked','Open '+name+' blockers'],['cleared',name+' cleared · awaiting handover'],['unknown','No matching punch data']];
 const list=rows.filter(r=>priority==='all'||priority.startsWith('stage:')&&r.stage===priority.slice(6)||priority==='overdue'&&r.overdue||priority==='week'&&!r.delivered&&r.estimate&&week(r.estimate)===week(today())).sort((a,b)=>(priority==='stage:walkdown'?(a.walkdownEstimate||'9999').localeCompare(b.walkdownEstimate||'9999'):Number(b.overdue)-Number(a.overdue)||Number(a.delivered)-Number(b.delivered)||(a.estimate||'9999').localeCompare(b.estimate||'9999'))||a.subsystem.localeCompare(b.subsystem));
 host.querySelector('[data-message]').textContent=rows.length+' / '+data.rows.length+' subsystems · Punch scope: '+(value('[data-discipline]')||'All disciplines')+(!loaded?' · Punch data unavailable; warnings cannot be evaluated.':'');
 container.innerHTML=`<div class="ho-kpis">${[['Total subsystems',rows.length,'total'],['Handed over',delivered,'delivered'],['Awaiting handover',pending.length,'pending'],['Overdue · '+name+' open',loaded?overdue:'—','overdue']].map(([label,n,c])=>'<article class="ho-kpi '+c+'"><span>'+esc(label)+'</span><strong>'+n+'</strong></article>').join('')}</div>
 <article class="ho-delivery"><strong>Delivery progress</strong><div class="ho-track" role="progressbar" aria-label="Delivery progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct(delivered,rows.length)}"><i style="width:${pct(delivered,rows.length)}%"></i></div><b>${rows.length?pct(delivered,rows.length)+'%':'—'}</b><span>${delivered} of ${rows.length} handed over</span></article>
 <div class="ho-middle"><article class="ho-panel"><h3>Awaiting handover <span>${pending.length} subsystems</span></h3><div class="ho-stages">${stages.map(([stage,label])=>{const n=pending.filter(r=>r.stage===stage).length;return '<button type="button" class="ho-stage '+stage+'" data-priority="stage:'+stage+'" aria-pressed="'+(priority==='stage:'+stage)+'"><span>'+esc(label)+'</span><div class="ho-track"><i style="width:'+pct(n,pending.length)+'%"></i></div><b>'+n+'</b></button>'}).join('')}</div><p class="ho-note">Cleared means no open punches in the chosen categories and discipline. Other delivery approvals may still be required.</p></article>
 <article class="ho-panel"><h3>Punch completion <span class="ho-legend"><i></i> Closed <i></i> Open</span></h3>${loaded?counts.map(c=>'<div class="ho-punch"><b>Category '+c.category+'</b><div class="ho-stacked" aria-label="'+c.closed+' closed, '+c.open+' open"><span style="flex:'+c.closed+'">'+(c.closed||'')+'</span><span style="flex:'+c.open+'">'+(c.open||'')+'</span></div><strong>'+(c.total?pct(c.closed,c.total)+'%':'—')+'</strong><small>'+c.closed+' closed / '+c.open+' open</small></div>').join(''):'<p>Punch data unavailable.</p>'}<button class="ho-blocker-callout" data-blockers ${!loaded||!blockers?'disabled':''}>${loaded?blockers:'—'} open ${esc(name)} punches blocking pending handovers <span>View punches →</span></button></article></div>
 <article class="ho-panel ho-priority"><header><h3>Priority subsystems <span data-priority-count>${list.length}</span></h3><span>${priority==='stage:walkdown'?'Walkdown pending · sorted by walkdown target':priority.startsWith('stage:')?stages.find(s=>s[0]===priority.slice(6))?.[1]||'':''}</span><div class="ho-segments">${[['overdue','Warnings'],['week','This week'],['all','All']].map(([v,l])=>'<button data-priority="'+v+'" aria-pressed="'+(priority===v)+'">'+l+'</button>').join('')}</div></header><div class="ho-table-scroll"><table><thead><tr>${[['sub','Subsystem'],['engineer','Responsible engineer'],['target',priority==='stage:walkdown'?'Walkdown target':'Handover target'],['A','Open A'],['B','Open B'],['C','Open C'],['status','Status']].map(([k,l])=>'<th>'+l+'<input data-table-filter="'+k+'" aria-label="Filter '+l+'" placeholder="Search…" value="'+esc(tableFilters[k]||'')+'"></th>').join('')}</tr></thead><tbody>${list.map(r=>{const label=r.delivered?'Handed over':r.overdue?'Warning · '+name+' open':r.stage==='walkdown'?'Walkdown pending':r.stage==='unknown'?'No matching punch data':r.stage==='cleared'?name+' cleared':'Open '+name;return '<tr data-sub-row><td data-cell="sub"><button class="ho-subsystem" data-open-sub="'+esc(r.subsystem)+'">'+esc(r.subsystem)+' <span>↗</span></button><small>'+esc(r.description)+'</small></td><td data-cell="engineer">'+esc(r.responsibleEngineer||'Unassigned')+'</td><td data-cell="target">'+esc(fmt(priority==='stage:walkdown'?r.walkdownEstimate:r.estimate))+'</td>'+r.counts.map(c=>'<td data-cell="'+c.category+'" class="'+(c.open?'ho-open':'')+'">'+(loaded?c.open:'—')+'</td>').join('')+'<td data-cell="status"><span class="ho-badge '+(r.delivered?'delivered':r.overdue?'warning':r.stage)+'">'+esc(label)+'</span></td></tr>'}).join('')||'<tr><td colspan="7">No subsystems match this selection.</td></tr>'}</tbody></table></div></article><p class="ho-note">Actual handover: DRA AK. Walkdown actual: P. Handover target: AI. Criteria apply to Handover Status warnings; they do not edit Excel dates.</p>`;filterTable();
}
async function load(){
 if(busy)return;busy=true;const id=++request;host.querySelector('[data-refresh]').disabled=true;
 try{const [d,c]=await Promise.all([ProjectAccess.api('/api/public/forecast'),personalCriteria()]);if(id!==request)return;if(!d.ok||!c.ok||!Array.isArray(c.categories))throw Error('Update the backend to load handover criteria.');data=d;criteria=c;choices();host.querySelector('[data-updated]').textContent=d.syncedAt?'Imported '+new Date(d.syncedAt).toLocaleString('en-GB'):'';host.querySelector('[data-message]').textContent=d.available?'':'Import the DRA workbook to see the project overview.';render()}
 catch(e){host.querySelector('[data-message]').textContent='Could not refresh: '+e.message}
 finally{busy=false;host.querySelector('[data-refresh]').disabled=false}
}
function navigate(sub,blockersOnly=false){
 const disc=value('[data-discipline]'),categories=[...criteria.categories],subs=new Set((blockersOnly?records().filter(r=>!r.delivered):records().filter(r=>r.subsystem===sub)).map(r=>M.key(r.subsystem)));
 const predicate=p=>subs.has(M.key(p.subsystem))&&(!disc||M.discipline(PunchItems.discipline(p))===disc)&&(!blockersOnly||categories.includes(M.key(p.category))&&PunchItems.rowStatus(p).status!=='Closed');
 PunchBrowser.navigateFrom({mode:'handover',predicate,label:(blockersOnly?'Open '+categories.join(' + ')+' · Pending handovers':sub)+' · '+(disc||'All disciplines'),restore:render});
}
host.addEventListener('click',e=>{
 const sub=e.target.closest('[data-open-sub]');if(sub)navigate(sub.dataset.openSub);
 const segment=e.target.closest('[data-priority]');if(segment){priority=segment.dataset.priority;render();if(priority.startsWith('stage:'))host.querySelector('.ho-priority').scrollIntoView({behavior:'smooth',block:'start'})}
 if(e.target.closest('[data-blockers]'))navigate(null,true);
});
host.querySelector('[data-refresh]').onclick=load;
host.querySelector('[data-reset]').onclick=()=>{host.querySelectorAll('select').forEach(el=>el.value='');host.querySelector('[data-subsystem]').value='';host.querySelector('[data-sub-search]').value='';Object.keys(tableFilters).forEach(k=>delete tableFilters[k]);UserPreferences.setDelivery({handoverDiscipline:''});drawSubsystems();priority='all';render()};
host.addEventListener('change',e=>{if(e.target.matches('[data-discipline]'))UserPreferences.setDelivery({handoverDiscipline:e.target.value});render()});
host.querySelector('[data-change]').onclick=()=>{
 if(!criteria)return;
 dialog.innerHTML='<form><h2>Change handover criteria</h2><p>Select which open punch categories block handover.</p><div class="ho-checks">'+['A','B','C'].map(c=>'<label><input type="checkbox" name="category" value="'+c+'" '+(criteria.categories.includes(c)?'checked':'')+'>Category '+c+'</label>').join('')+'</div><p>Example: select A only to warn when the target has passed and at least one A punch remains open.</p><small>Saved to your profile for Skyline and Handover Status. Other users keep their own choices. Actual handover dates remain unchanged.</small><p data-save-status role="status"></p><footer><button type="button" class="action" data-cancel>Cancel</button><button type="submit" class="action">Save criteria</button></footer></form>';
 dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();dialog.showModal();
};
dialog.addEventListener('submit',async e=>{
 e.preventDefault();const form=e.target,categories=[...form.querySelectorAll('input:checked')].map(el=>el.value),msg=form.querySelector('[data-save-status]'),buttons=form.querySelectorAll('button');
 if(!categories.length){msg.textContent='Select at least one category.';return}
 buttons.forEach(b=>b.disabled=true);
 try{UserPreferences.setDelivery({categories});await UserPreferences.save();const d={ok:true,categories};criteria=d;dialog.close();render();document.dispatchEvent(new CustomEvent('handover-criteria-changed',{detail:d}));host.querySelector('[data-message]').textContent='Criteria saved · Blocking categories: '+d.categories.join(' + ')}
 catch(err){msg.textContent=err.message}finally{buttons.forEach(b=>b.disabled=false)}
});
document.addEventListener('punch-updated',render);

async function personalCriteria(){await UserPreferences.ready;return {ok:true,categories:UserPreferences.get().delivery?.categories||['A','B']}}
function restorePreferences(){const d=UserPreferences.get().delivery||{},categories=d.categories||['A','B'],disc=d.handoverDiscipline||'',changed=JSON.stringify(criteria?.categories)!==JSON.stringify(categories)||host.querySelector('[data-discipline]').value!==disc;criteria={ok:true,categories};host.querySelector('[data-discipline]').value=disc;if(changed)render()}
UserPreferences.ready.then(restorePreferences);document.addEventListener('user-preferences-changed',restorePreferences);
setInterval(()=>{if(active&&!document.hidden)void load()},60000);document.addEventListener('visibilitychange',()=>{if(active&&!document.hidden)void load()});
window.HandoverStatus={async getCriteria(){criteria=await personalCriteria();return criteria},changeCriteria(){host.querySelector('[data-change]').onclick()},activate(on){active=on;host.hidden=!on;if(on){render();void load()}else {dialog.close();host.querySelector('.ho-picker details').open=false}}};
})();
