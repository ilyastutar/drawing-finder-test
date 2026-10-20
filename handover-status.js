(function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const M=HandoverModel,host=document.createElement('section');
host.id='handoverStatus';host.className='ho-view';host.hidden=true;document.getElementById('punchDashboard').after(host);
let active=false,data=null,criteria=null,busy=false,request=0,priority='all';
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const fmt=v=>v?new Date(v+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):'No target date';
const pct=(n,d)=>d?Math.round(n/d*1000)/10:0;
host.innerHTML=`<header class="ho-heading"><div><small>PROJECT DELIVERY</small><h2>Project Handover Overview</h2><p>CHP Dradenau · Construction to commissioning</p></div><div><span data-updated></span><button class="action" data-refresh>Refresh</button></div></header>
<div class="ho-filters"><label>Subsystem<select data-subsystem aria-label="Subsystem"><option value="">All subsystems</option></select></label><label>Discipline<select data-discipline aria-label="Discipline"><option value="">All disciplines</option><option>Civil</option><option>E&amp;I</option><option>Mechanical</option><option>Other</option></select></label><label>Responsible engineer<select data-engineer aria-label="Responsible engineer"><option value="">All engineers</option></select></label><button class="action" data-reset>Reset filters</button></div>
<div class="ho-policy"><div><strong data-policy>Loading criteria…</strong><small>Warnings require an overdue target and an open punch in the selected categories. Recorded handovers stay unchanged.</small></div><button class="action" data-change hidden>Change criteria</button></div>
<p data-message role="status"></p><div data-content hidden></div>`;
const dialog=document.createElement('dialog');dialog.className='ho-criteria';dialog.setAttribute('aria-label','Change handover criteria');document.body.append(dialog);
const value=s=>host.querySelector(s).value;
function choices(){for(const [selector,entries,all]of [
 ['[data-subsystem]',(data?.rows||[]).map(r=>[r.subsystem,r.subsystem+' · '+r.description]),'All subsystems'],
 ['[data-engineer]',[...new Set((data?.rows||[]).map(r=>r.responsibleEngineer||''))].map(n=>[n||'__unassigned__',n||'Unassigned']),'All engineers']
 ]){const el=host.querySelector(selector),old=el.value;el.innerHTML='<option value="">'+all+'</option>'+entries.sort((a,b)=>a[1].localeCompare(b[1])).map(([k,t])=>'<option value="'+esc(k)+'">'+esc(t)+'</option>').join('');el.value=[...el.options].some(o=>o.value===old)?old:''}}
function filteredSubsystems(){const sub=value('[data-subsystem]'),engineer=value('[data-engineer]');return (data?.rows||[]).filter(r=>(!sub||r.subsystem===sub)&&(!engineer||(r.responsibleEngineer||'')===(engineer==='__unassigned__'?'':engineer)))}
function records(){return M.build(filteredSubsystems(),PunchItems.getSnapshot()?.rows||null,{today:today(),categories:criteria.categories,group:value('[data-discipline]'),getDiscipline:PunchItems.discipline,closed:p=>PunchItems.rowStatus(p).status==='Closed'})}
function week(date){const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10)}
function render(){
 if(!active)return;
 host.querySelector('[data-change]').hidden=ProjectAccess.user?.role!=='admin'||!criteria;
 host.querySelector('[data-policy]').textContent=criteria?'Blocking categories: '+criteria.categories.join(' + '):'Criteria unavailable';
 const container=host.querySelector('[data-content]');container.hidden=!data?.available||!criteria;if(container.hidden)return;
 const rows=records(),pending=rows.filter(r=>!r.delivered),delivered=rows.length-pending.length,overdue=rows.filter(r=>r.overdue).length,loaded=!!PunchItems.getSnapshot();
 const name=criteria.categories.join(' + '),counts=['A','B','C'].map(category=>rows.reduce((a,r)=>{const c=r.counts.find(c=>c.category===category);a.total+=c.total;a.closed+=c.closed;a.open+=c.open;return a},{category,total:0,closed:0,open:0}));
 const blockers=pending.reduce((n,r)=>n+r.blockers,0);
 const stages=[['walkdown','Walkdown pending'],['blocked','Open '+name+' blockers'],['cleared',name+' cleared · awaiting handover'],['unknown','No matching punch data']];
 const list=rows.filter(r=>priority==='all'||priority==='overdue'&&r.overdue||priority==='week'&&!r.delivered&&r.estimate&&week(r.estimate)===week(today())).sort((a,b)=>Number(b.overdue)-Number(a.overdue)||Number(a.delivered)-Number(b.delivered)||(a.estimate||'9999').localeCompare(b.estimate||'9999')||a.subsystem.localeCompare(b.subsystem));
 host.querySelector('[data-message]').textContent=rows.length+' / '+data.rows.length+' subsystems · Punch scope: '+(value('[data-discipline]')||'All disciplines')+(!loaded?' · Punch data unavailable; warnings cannot be evaluated.':'');
 container.innerHTML=`<div class="ho-kpis">${[['Total subsystems',rows.length,'total'],['Handed over',delivered,'delivered'],['Awaiting handover',pending.length,'pending'],['Overdue · '+name+' open',loaded?overdue:'—','overdue']].map(([label,n,c])=>'<article class="ho-kpi '+c+'"><span>'+esc(label)+'</span><strong>'+n+'</strong></article>').join('')}</div>
 <article class="ho-delivery"><strong>Delivery progress</strong><div class="ho-track" role="progressbar" aria-label="Delivery progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct(delivered,rows.length)}"><i style="width:${pct(delivered,rows.length)}%"></i></div><b>${rows.length?pct(delivered,rows.length)+'%':'—'}</b><span>${delivered} of ${rows.length} handed over</span></article>
 <div class="ho-middle"><article class="ho-panel"><h3>Awaiting handover <span>${pending.length} subsystems</span></h3><div class="ho-stages">${stages.map(([stage,label])=>{const n=pending.filter(r=>r.stage===stage).length;return '<div class="ho-stage '+stage+'"><span>'+esc(label)+'</span><div class="ho-track"><i style="width:'+pct(n,pending.length)+'%"></i></div><b>'+n+'</b></div>'}).join('')}</div><p class="ho-note">Cleared means no open punches in the chosen categories and discipline. Other delivery approvals may still be required.</p></article>
 <article class="ho-panel"><h3>Punch completion <span class="ho-legend"><i></i> Closed <i></i> Open</span></h3>${loaded?counts.map(c=>'<div class="ho-punch"><b>Category '+c.category+'</b><div class="ho-stacked" aria-label="'+c.closed+' closed, '+c.open+' open"><span style="flex:'+c.closed+'">'+(c.closed||'')+'</span><span style="flex:'+c.open+'">'+(c.open||'')+'</span></div><strong>'+(c.total?pct(c.closed,c.total)+'%':'—')+'</strong><small>'+c.closed+' closed / '+c.open+' open</small></div>').join(''):'<p>Punch data unavailable.</p>'}<button class="ho-blocker-callout" data-blockers ${!loaded||!blockers?'disabled':''}>${loaded?blockers:'—'} open ${esc(name)} punches blocking pending handovers <span>View punches →</span></button></article></div>
 <article class="ho-panel ho-priority"><header><h3>Priority subsystems <span>${list.length}</span></h3><div class="ho-segments">${[['overdue','Warnings'],['week','This week'],['all','All']].map(([v,l])=>'<button data-priority="'+v+'" aria-pressed="'+(priority===v)+'">'+l+'</button>').join('')}</div></header><div class="ho-table-scroll"><table><thead><tr><th>Subsystem</th><th>Responsible engineer</th><th>Target</th><th>Open A</th><th>Open B</th><th>Open C</th><th>Status</th></tr></thead><tbody>${list.map(r=>{const label=r.delivered?'Handed over':r.overdue?'Warning · '+name+' open':r.stage==='walkdown'?'Walkdown pending':r.stage==='unknown'?'No matching punch data':r.stage==='cleared'?name+' cleared':'Open '+name;return '<tr><td><button class="ho-subsystem" data-open-sub="'+esc(r.subsystem)+'">'+esc(r.subsystem)+' <span>↗</span></button><small>'+esc(r.description)+'</small></td><td>'+esc(r.responsibleEngineer||'Unassigned')+'</td><td>'+esc(fmt(r.estimate))+'</td>'+r.counts.map(c=>'<td class="'+(c.open?'ho-open':'')+'">'+(loaded?c.open:'—')+'</td>').join('')+'<td><span class="ho-badge '+(r.delivered?'delivered':r.overdue?'warning':r.stage)+'">'+esc(label)+'</span></td></tr>'}).join('')||'<tr><td colspan="7">No subsystems match this selection.</td></tr>'}</tbody></table></div></article><p class="ho-note">Actual handover: DRA AK. Walkdown actual: P. Handover target: AI. Criteria apply to Handover Status warnings; they do not edit Excel dates.</p>`;
}
async function load(){
 if(busy)return;busy=true;const id=++request;host.querySelector('[data-refresh]').disabled=true;
 try{const [d,c]=await Promise.all([ProjectAccess.api('/api/public/forecast'),ProjectAccess.api('/api/handover/criteria')]);if(id!==request)return;if(!d.ok||!c.ok||!Array.isArray(c.categories))throw Error('Update the backend to load handover criteria.');data=d;criteria=c;choices();host.querySelector('[data-updated]').textContent=d.syncedAt?'Imported '+new Date(d.syncedAt).toLocaleString('en-GB'):'';host.querySelector('[data-message]').textContent=d.available?'':'Import the DRA workbook to see the project overview.';render()}
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
 const segment=e.target.closest('[data-priority]');if(segment){priority=segment.dataset.priority;render()}
 if(e.target.closest('[data-blockers]'))navigate(null,true);
});
host.querySelector('[data-refresh]').onclick=load;
host.querySelector('[data-reset]').onclick=()=>{host.querySelectorAll('select').forEach(el=>el.value='');priority='all';render()};
host.addEventListener('change',render);
host.querySelector('[data-change]').onclick=()=>{
 if(ProjectAccess.user?.role!=='admin'||!criteria)return;
 dialog.innerHTML='<form><h2>Change handover criteria</h2><p>Select which open punch categories block handover.</p><div class="ho-checks">'+['A','B','C'].map(c=>'<label><input type="checkbox" name="category" value="'+c+'" '+(criteria.categories.includes(c)?'checked':'')+'>Category '+c+'</label>').join('')+'</div><p>Example: select A only to warn when the target has passed and at least one A punch remains open.</p><small>This project setting applies to all users of Handover Status. Actual handover dates and Skyline remain unchanged.</small><p data-save-status role="status"></p><footer><button type="button" class="action" data-cancel>Cancel</button><button type="submit" class="action">Save criteria</button></footer></form>';
 dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();dialog.showModal();
};
dialog.addEventListener('submit',async e=>{
 e.preventDefault();const form=e.target,categories=[...form.querySelectorAll('input:checked')].map(el=>el.value),msg=form.querySelector('[data-save-status]'),buttons=form.querySelectorAll('button');
 if(!categories.length){msg.textContent='Select at least one category.';return}
 buttons.forEach(b=>b.disabled=true);
 try{const d=await ProjectAccess.api('/api/handover/criteria',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({categories,revision:criteria.revision})});if(!d.ok)throw Error(d.error||'Could not save criteria.');criteria=d;dialog.close();render();host.querySelector('[data-message]').textContent='Criteria saved · Blocking categories: '+d.categories.join(' + ')}
 catch(err){msg.textContent=err.message}finally{buttons.forEach(b=>b.disabled=false)}
});
document.addEventListener('punch-updated',render);
window.HandoverStatus={activate(on){active=on;host.hidden=!on;if(on){render();void load()}else dialog.close()}};
})();
