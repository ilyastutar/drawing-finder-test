(function(root){

 const P=typeof module!=='undefined'&&module.exports?require('./punch-items'):root.PunchItems;

 const disciplines=[['disc-electric','Electric & I&C','#bd6969'],['disc-mechanical','Mechanical','#6289b3'],['disc-civil','Civil','#8d939c'],['disc-other','Other / unspecified','#b5a278']];

 const series=[['A','A punch','#568f87'],['B','B punch','#6c8fa7'],['C','C punch','#9caeba']];

 const category=r=>{const c=String(r.category||'').trim().toUpperCase();return ['A','B','C'].includes(c)?c:null};

 const weekKey=d=>{const x=new Date(d+'T00:00:00Z');x.setUTCDate(x.getUTCDate()-(x.getUTCDay()+6)%7);return x.toISOString().slice(0,10)};

 const bucket=(d,p)=>p==='week'?weekKey(d):d.slice(0,p==='month'?7:10);

 const iso=d=>d.toISOString().slice(0,10),day=s=>Date.parse(s+'T00:00:00Z'),step=86400000;

 function aggregate(rows,from,to,discipline='all',period='day'){

  if(!P.dateKey(from)||!P.dateKey(to)||from>to||day(to)-day(from)>3660*step)throw Error('Choose a valid date range of up to ten years.');

  const selected=rows.filter(r=>category(r)&&(discipline==='all'||P.disciplineTone(r)===discipline)),days=Math.round((day(to)-day(from))/step)+1;

  const buckets=new Map();for(let t=day(from);t<=day(to);t+=step){const key=bucket(iso(new Date(t)),period);if(!buckets.has(key))buckets.set(key,{key,counts:[0,0,0]})}

  let closed=0,previous=0,open=0,review=0,invalid=0;const perSeries=[0,0,0],prevFrom=iso(new Date(day(from)-days*step));

  for(const r of selected){const state=P.rowStatus(r).status;if(state==='Open'){open++;continue}if(state!=='Closed'){review++;invalid++;continue}const date=P.dateKey(r.closedDate);if(!date){invalid++;continue}if(date>=from&&date<=to){closed++;const i=series.findIndex(s=>s[0]===category(r));perSeries[i]++;buckets.get(bucket(date,period)).counts[i]++}else if(date>=prevFrom&&date<from)previous++}

  return {buckets:[...buckets.values()],closed,previous,open,review,invalid,perSeries,days,rows:selected.length};

 }

 if(typeof module!=='undefined'&&module.exports){module.exports={aggregate,series};return}

 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

 const host=document.createElement('section');host.id='punchDashboard';host.hidden=true;document.getElementById('punchPanel').after(host);

 host.innerHTML=`<header class="dashboard-heading"><div><div class="eyebrow">PROJECT DELIVERY</div><h2>Subsystem progress</h2></div><span id="dashboardClock" class="hint"></span></header>

 <div class="dashboard-controls"><div class="dash-picker" data-kind="handed"><span>Handed over subsystems</span><details><summary data-choice>No handed over subsystem selected</summary><div class="dash-menu"><input type="search" aria-label="Search handed over subsystems" placeholder="Code or description…"><div data-options></div></div></details></div><div class="dash-picker" data-kind="forecast"><span>Forecast subsystems</span><details><summary data-choice>Select a forecast subsystem</summary><div class="dash-menu"><input type="search" aria-label="Search forecast subsystems" placeholder="Code or description…"><div data-options></div></div></details></div><label>From<input id="dashboardFrom" type="date"></label><label>To<input id="dashboardTo" type="date"></label><label>Group by<select id="dashboardPeriod"><option value="day">Daily</option><option value="week">Weekly</option><option value="month">Monthly</option></select></label><label>Chart style<select id="dashboardStyle"><option value="bar">Stacked columns</option><option value="line">Trend lines</option></select></label><label>Discipline<select id="dashboardDiscipline"><option value="all">All disciplines</option>${disciplines.map(s=>'<option value="'+s[0]+'">'+s[1]+'</option>').join('')}</select></label><label>Construction week<select id="dashboardCW" aria-label="Construction week"></select></label><button class="action" id="dashboardWeek">This week</button><button class="action" id="dashboard2Weeks">Last 2 weeks</button></div>

 <div id="dashboardScope" aria-live="polite"></div><p id="dashboardError" role="status"></p><div class="delivery-grid"><article class="delivery-progress"><h3>Completion</h3><div id="dashboardRing"></div><div id="dashboardBacklog"></div></article><div class="delivery-main"><div class="dashboard-metrics" id="dashboardMetrics"></div><article class="delivery-chart"><div class="dashboard-chart-heading"><h3>Closures over time</h3><span class="hint">Closed Date · hover for counts</span></div><div id="dashboardChart"></div></article></div><article class="delivery-deadline"><h3>Target date</h3><strong id="dashboardDeadlineLabel">Select a subsystem</strong><p id="dashboardPace"></p><form id="deadlineForm" hidden><label>Subsystem deadline<input type="date" id="dashboardDeadline"></label><button class="action">Save deadline</button></form><p id="deadlineStatus" role="status"></p><div id="dashboardBreakdown"></div></article></div><p class="dashboard-footnote">Current workbook snapshot. Charts use valid Closed Dates; reopening removes that item from closure totals. Unknown dates are reported separately. Targets are shared across users.</p>`;

 const $=id=>document.getElementById(id);let active=false,deadlines=new Map(),deadlineLoaded=false,loading=false,source=null,forecast=null,forecastLoading=false,selectedSubsystem='',selectedKind='',forecastError='';

 function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}

 function dates(year){const end=today();$('dashboardTo').value=end;$('dashboardFrom').value=year?end.slice(0,4)+'-01-01':iso(new Date(day(end)-29*step))}dates(false);$('dashboardFrom').value=weekKey(today());$('dashboardTo').value=iso(new Date(day(weekKey(today()))+6*step));

 async function loadDeadlines(){if(loading)return;loading=true;try{const d=await ProjectAccess.api('/api/dashboard/deadlines');deadlines=new Map(d.rows.map(r=>[r.subsystem,r.date]));deadlineLoaded=true;$('deadlineStatus').textContent='';render()}catch(e){$('deadlineStatus').textContent='Targets unavailable: '+e.message}finally{loading=false}}

 function legend(values,caption=''){return '<div class="dash-legend">'+series.map((s,i)=>i===3&&!Number(values[i])?'':'<span><i style="background:'+s[2]+'"></i>'+s[0]+' <b>'+values[i]+'</b>'+caption+'</span>').join('')+'</div>'}

 function chart(data){const line=$('dashboardStyle').value==='line',buckets=data.buckets,n=buckets.length,w=900,h=245,left=38,top=12,plot=185,max=Math.max(1,...buckets.map(b=>line?Math.max(...b.counts):b.counts.reduce((a,v)=>a+v,0))),slot=(w-left-8)/n;let svg='<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Closed punches by date and A B C category">';
 for(let i=0;i<4;i++){const y=top+plot-i*plot/3;svg+='<path d="M'+left+' '+y+'H'+w+'" stroke="#cbdbe5"/><text x="30" y="'+(y+4)+'" text-anchor="end" font-size="11" fill="currentColor">'+(max*i/3).toFixed(max<3?1:0)+'</text>'}
 if(line)series.forEach((s,k)=>{svg+='<polyline fill="none" stroke="'+s[2]+'" stroke-width="3" points="'+buckets.map((b,i)=>(left+(i+.5)*slot)+','+(top+plot-b.counts[k]/max*plot)).join(' ')+'"/>'});
 buckets.forEach((b,i)=>{let base=0;const x=left+i*slot;b.counts.forEach((v,k)=>{const bh=v/max*plot,label=esc(b.key+' · '+series[k][0]+': '+v+' closed');if(line)svg+='<circle tabindex="0" cx="'+(x+slot*.5)+'" cy="'+(top+plot-bh)+'" r="4" fill="'+series[k][2]+'" aria-label="'+label+'"><title>'+label+'</title></circle>';else if(v)svg+='<rect class="dash-bar" tabindex="0" x="'+x+'" y="'+(top+plot-base-bh)+'" width="'+Math.max(.5,Math.min(45,slot*.75))+'" height="'+bh+'" fill="'+series[k][2]+'" aria-label="'+label+'"><title>'+label+'</title></rect>';base+=bh});if(i%Math.max(1,Math.ceil(n/8))===0)svg+='<text x="'+x+'" y="226" font-size="10" fill="currentColor">'+esc($('dashboardPeriod').value==='week'?'CW '+ForecastModel.week(b.key).number+' / '+ForecastModel.week(b.key).year:b.key)+'</text>'});return svg+'</svg>'+legend(data.perSeries,' closed')}

 function pickerRows(kind){const rows=forecast?.rows||[];return kind==='handed'?rows.filter(r=>r.handoverActual).sort((a,b)=>b.handoverActual.localeCompare(a.handoverActual)||a.subsystem.localeCompare(b.subsystem)):window.ForecastModel?ForecastModel.select(rows).filter(r=>r.estimate>=ForecastModel.week(today()).start):[]}

 function drawPickers(){for(const picker of host.querySelectorAll('.dash-picker')){const kind=picker.dataset.kind,q=picker.querySelector('input').value.toUpperCase(),rows=pickerRows(kind).filter(r=>(r.subsystem+' '+r.description).toUpperCase().includes(q));picker.querySelector('[data-choice]').textContent=selectedKind===kind?selectedSubsystem:kind==='handed'?'Select handed over subsystem':'Select forecast subsystem';picker.querySelector('[data-options]').innerHTML='<button type="button" data-sub="" data-kind="'+kind+'">All subsystems</button>'+rows.map(r=>'<button type="button" data-sub="'+esc(r.subsystem)+'" data-kind="'+kind+'" aria-pressed="'+(selectedSubsystem===r.subsystem)+'"><strong>'+esc(r.subsystem)+'</strong><small>'+esc(r.description)+'</small><span>'+ (kind==='handed'?'Handed over · '+P.formatDate(r.handoverActual):'CW '+ForecastModel.week(r.estimate).number+' · '+P.formatDate(r.estimate))+'</span></button>').join('')+(!rows.length?'<p>No matching subsystems.</p>':'')}}

 function cwOptions(){const selected=$('dashboardCW').value||(day($('dashboardTo').value)-day($('dashboardFrom').value)===6*step?$('dashboardFrom').value:''),dates=[today(),...(forecast?.rows||[]).flatMap(r=>[r.estimate,r.handoverActual]),...(P.getSnapshot()?.rows||[]).map(r=>P.dateKey(r.closedDate))].filter(Boolean).sort(),start=day(weekKey(dates[0])),end=day(weekKey(dates.at(-1)));let html='<option value="">Custom dates</option>';for(let t=start;t<=end;t+=7*step){const d=iso(new Date(t)),w=ForecastModel.week(d);html+='<option value="'+d+'">'+w.year+' · CW '+w.number+' · '+P.formatDate(d)+'</option>'}$('dashboardCW').innerHTML=html;$('dashboardCW').value=selected}

 async function loadForecast(){if(forecastLoading)return;forecastLoading=true;try{forecast=await ProjectAccess.api('/api/public/forecast');forecastError=forecast.available?'':'Forecast Excel has not been imported yet.'}catch(e){forecastError='Forecast unavailable: '+e.message}finally{forecastLoading=false;cwOptions();drawPickers();render()}}

 host.addEventListener('click',e=>{const b=e.target.closest('[data-sub]');if(!b)return;selectedSubsystem=b.dataset.sub;selectedKind=selectedSubsystem?b.dataset.kind:'';host.querySelectorAll('.dash-picker details').forEach(d=>d.open=false);drawPickers();render()});

 for(const input of host.querySelectorAll('.dash-picker input'))input.addEventListener('input',drawPickers);

 document.addEventListener('pointerdown',e=>host.querySelectorAll('.dash-picker details[open]').forEach(d=>{if(!d.contains(e.target))d.open=false}));host.addEventListener('keydown',e=>{if(e.key==='Escape')host.querySelectorAll('.dash-picker details[open]').forEach(d=>{d.open=false;d.querySelector('summary').focus()})});

 function periodLength(s){return s.length}

 function render(){if(!active)return;const snapshot=P.getSnapshot(),rows=snapshot?.rows||[];

 const subsystem=selectedSubsystem,selected=rows.filter(r=>!subsystem||(r.subsystem||'Unspecified')===subsystem),discipline=$('dashboardDiscipline').value,current=selected.filter(r=>category(r)&&['Open','Closed'].includes(P.rowStatus(r).status)&&(discipline==='all'||P.disciplineTone(r)===discipline));

 $('dashboardClock').textContent=snapshot?.checkedAt?'Last check: '+P.formatObserved(snapshot.checkedAt):'';

 let data;try{data=aggregate(current,$('dashboardFrom').value,$('dashboardTo').value,discipline,$('dashboardPeriod').value)}catch(e){$('dashboardError').textContent=e.message;return}

 $('dashboardScope').textContent=subsystem?subsystem+' · '+(forecast?.rows.find(r=>r.subsystem===subsystem)?.description||''):'All subsystems · Select a delivered or forecast subsystem above';

 $('dashboardError').textContent=forecastError||(!snapshot?'Waiting for punch data…':snapshot.stale?'Showing saved data; update unavailable.':'');

 const closed=current.filter(r=>P.rowStatus(r).status==='Closed').length,total=current.length,remaining=total-closed,pct=total?closed/total*100:0;

 const counts=predicate=>series.map(s=>current.filter(r=>category(r)===s[0]&&predicate(r)).length),done=counts(r=>P.rowStatus(r).status==='Closed'),left=counts(r=>P.rowStatus(r).status!=='Closed');

 let offset=0;const arcs=done.map((v,i)=>{const length=total?v/total*100:0,start=offset;offset+=length;return '<circle class="dash-arc" cx="90" cy="90" r="72" pathLength="100" fill="none" stroke="'+series[i][2]+'" stroke-width="15" stroke-dasharray="'+length+' '+(100-length)+'" stroke-dashoffset="'+(-start)+'"><title>'+series[i][0]+': '+v+' closed / '+(v+left[i])+' total</title></circle>'}).join('');

 const remainingPct=total?remaining/total*100:0;
 const remainingArc=remaining?'<circle class="dash-arc dash-remaining-arc" cx="90" cy="90" r="72" pathLength="100" fill="none" stroke="#dc493b" stroke-width="20" stroke-dasharray="'+remainingPct+' '+(100-remainingPct)+'" stroke-dashoffset="'+(-offset)+'"><title>'+remaining+' remaining ('+remainingPct.toFixed(1)+'%)</title></circle>':'';
 $('dashboardRing').innerHTML='<div class="dash-ring"><svg viewBox="0 0 180 180" role="img" aria-label="'+remaining+' remaining, '+remainingPct.toFixed(1)+' percent. Red shows remaining punches; muted segments show closed A B C punches."><circle cx="90" cy="90" r="72" fill="none" stroke="#dce6ec" stroke-width="15"/>'+arcs+remainingArc+'</svg><div class="dash-remaining-center" role="button" tabindex="0" data-drill="open" aria-label="Show remaining punch items"><strong>'+remaining.toLocaleString()+'</strong><span>Remaining</span><small>'+remainingPct.toFixed(1)+'% of total</small></div></div>';


 $('dashboardBacklog').innerHTML='<div class="dash-remaining-legend" role="button" tabindex="0" data-drill="open" aria-label="Show remaining punch items"><span><i></i>Remaining</span><strong>'+remaining.toLocaleString()+'</strong><small>Open · '+remainingPct.toFixed(1)+'%</small></div>'+legend(done,' closed')+'<p><strong>'+pct.toFixed(1)+'% complete</strong><br>'+closed.toLocaleString()+' closed / '+total.toLocaleString()+' total</p>';


 $('dashboardMetrics').innerHTML=[['Remaining',remaining,left,'Open','open'],['Closed',data.closed,data.perSeries,'Selected dates','closed'],['Daily average',(data.closed/data.days).toFixed(2),data.perSeries.map(v=>(v/data.days).toFixed(2)),data.days+' calendar days','']].map(([k,v,values,n,action])=>'<div class="dashboard-metric'+(k==='Remaining'?' dashboard-metric-remaining':'')+'"'+(action?' role="button" tabindex="0" data-drill="'+action+'" aria-label="Show '+k+' punch items"':'')+'><div><span>'+k+'</span><strong>'+v+'</strong><small>'+n+'</small></div>'+legend(values)+'</div>').join('');
 $('dashboardChart').innerHTML=chart(data);

 if(!matchMedia('(prefers-reduced-motion: reduce)').matches)for(const el of [$('dashboardRing'),$('dashboardMetrics'),$('dashboardChart')]){el.getAnimations().forEach(a=>a.cancel());el.animate([{opacity:.25,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:320,easing:'ease-out'})}

 const record=forecast?.rows.find(r=>r.subsystem===subsystem),target=record?.estimate||deadlines.get(subsystem),daysLeft=target?Math.round((day(target)-day(today()))/step):null;

 $('dashboardDeadlineLabel').textContent=!subsystem?'Select a subsystem':record?.handoverActual?'Handed over '+P.formatDate(record.handoverActual):!deadlineLoaded&&!target?'Loading target…':target?P.formatDate(target):'No deadline set';

 $('dashboardDeadlineLabel').classList.toggle('overdue',!record?.handoverActual&&daysLeft!==null&&daysLeft<0&&remaining>0);

 const blocking=selected.filter(r=>['A','B'].includes(category(r))&&P.rowStatus(r).status!=='Closed').length;

 $('dashboardPace').textContent=record?.handoverActual?'Actual handover recorded in DRA Excel.':target?(blocking===0?'No open A/B punches across all disciplines.':daysLeft<0?Math.abs(daysLeft)+' days overdue · '+blocking+' A/B remaining':daysLeft===0?'Due today · '+blocking+' A/B remaining':daysLeft+' days remaining · '+(blocking/daysLeft).toFixed(1)+' A/B closures/day needed'): subsystem?'No delivery target has been set yet.':'Select a subsystem to view its delivery target.';

 $('deadlineForm').hidden=!!record?.estimate||!subsystem||ProjectAccess.user?.role!=='admin';if(document.activeElement!==$('dashboardDeadline'))$('dashboardDeadline').value=target||'';

 $('dashboardBreakdown').innerHTML='<h4>Closed by category</h4>'+series.map((s,i)=>'<div class="delivery-discipline" role="button" tabindex="0" data-drill="closed" data-category="'+s[0]+'"><span>'+s[1]+'</span><strong>'+data.perSeries[i]+'</strong><progress style="accent-color:'+s[2]+'" value="'+data.perSeries[i]+'" max="'+Math.max(1,data.closed)+'"></progress></div>').join('')+(data.invalid?'<p class="hint">'+data.invalid+' items excluded from the timeline: missing or invalid dates.</p>':'');

 }

 host.addEventListener('change',e=>{if(e.target.id==='dashboardCW'&&e.target.value){$('dashboardFrom').value=e.target.value;$('dashboardTo').value=iso(new Date(day(e.target.value)+6*step));$('dashboardPeriod').value='day'}else if(['dashboardFrom','dashboardTo'].includes(e.target.id))$('dashboardCW').value='';if(e.target.id!=='dashboardDeadline')render()});function preset(kind){$('dashboardCW').value='';const end=today(),t=day(end),start=kind==='week'?iso(new Date(t-((new Date(t).getUTCDay()+6)%7)*step)):kind==='month'?end.slice(0,7)+'-01':iso(new Date(t-13*step));$('dashboardFrom').value=start;$('dashboardTo').value=end;render()}$('dashboardWeek').onclick=()=>preset('week');$('dashboard2Weeks').onclick=()=>preset('2weeks');document.addEventListener('punch-updated',render);

 $('deadlineForm').onsubmit=async e=>{e.preventDefault();const subsystem=selectedSubsystem,date=$('dashboardDeadline').value,b=e.target.querySelector('button');b.disabled=true;try{await ProjectAccess.api('/api/dashboard/deadlines',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subsystem,date})});deadlines.set(subsystem,date);deadlineLoaded=true;$('deadlineStatus').textContent='Deadline saved for all users.';render()}catch(error){$('deadlineStatus').textContent=error.message}finally{b.disabled=false}};

 let drill=null;
 function openDrill(action,cat){const subsystem=selectedSubsystem,discipline=$('dashboardDiscipline').value,from=$('dashboardFrom').value,to=$('dashboardTo').value;const predicate=r=>category(r)&&(!cat||category(r)===cat)&&(!subsystem||r.subsystem===subsystem)&&(discipline==='all'||P.disciplineTone(r)===discipline)&&(action==='open'?P.rowStatus(r).status==='Open':P.rowStatus(r).status==='Closed'&&P.dateKey(r.closedDate)>=from&&P.dateKey(r.closedDate)<=to);drill={id:crypto.randomUUID(),predicate,label:(action==='open'?'Open':'Closed · '+from+' — '+to)+' · '+(subsystem||'All subsystems')+(cat?' · Category '+cat:'')};history.pushState({...history.state,dashboardDrill:drill.id},'');document.querySelector('.mode-tabs [data-mode="punch"]').click();PunchBrowser.showDashboardRows(predicate,drill.label,()=>history.back());}
 host.addEventListener('click',e=>{const b=e.target.closest('[data-drill]');if(b)openDrill(b.dataset.drill,b.dataset.category)});
 host.addEventListener('keydown',e=>{if(e.target.matches('[data-drill]')&&['Enter',' '].includes(e.key)){e.preventDefault();e.target.click()}});
 window.addEventListener('popstate',e=>{if(!drill)return;if(e.state?.dashboardDrill===drill.id){document.querySelector('.mode-tabs [data-mode="punch"]').click();PunchBrowser.showDashboardRows(drill.predicate,drill.label,()=>history.back())}else{PunchBrowser.clearDashboardRows();document.querySelector('.mode-tabs [data-mode="dashboard"]').click()}});
 root.PunchDashboard={activate(on){active=on;host.hidden=!on;if(on){void loadDeadlines();void loadForecast()}else host.querySelectorAll('.dash-picker details').forEach(d=>d.open=false);render()},render};

})(typeof window!=='undefined'?window:globalThis);

