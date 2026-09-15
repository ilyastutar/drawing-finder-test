(function(){

 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

 const norm=v=>String(v??'').trim().toUpperCase(),split=v=>String(v).split(/[\s,;]+/).map(norm).filter(Boolean);

 const panel=document.createElement('section');panel.id='punchPanel';panel.hidden=true;

 document.getElementById('resultsTable').closest('.wrap').after(panel);

 panel.innerHTML='<div class="punch-top"><div><strong>Punch Items</strong><input id="punchFullQuery" class="punch-full-query" aria-label="Search punch numbers" placeholder="Search or paste punch numbers…"><div id="punchCount" class="hint"></div></div><div id="punchClock" class="punch-clock"></div></div><div class="punch-chips" id="punchChips"></div><div id="punchMissing" class="punch-missing"></div><div class="punch-scroll"><table><thead><tr id="punchHead"></tr></thead><tbody id="punchRows"></tbody></table></div><div class="punch-footer"><button class="action" id="punchClear">Clear punch filters</button><span class="hint">Paste Excel cells · Enter to add numbers</span><button class="action" id="punchExpand">Full screen ⛶</button></div>';

 const $=id=>document.getElementById(id),compact=[['itemNumber','Punch Item No.'],['closedDate','Closed Date'],['statusText','Status'],['subsystem','Subsystem No.'],['discipline','Discipline'],['description','Description'],['locationRoom','Location / Room'],['category','Category']];

 let active=false,expanded=false,tokens=[],query='',filters={},selectedFilters={},matches=[],source=null,lastSignature='',columns=compact,scheduled=false;
 panel.querySelector('.punch-footer').insertAdjacentHTML('beforebegin','<div id="punchTotals" class="punch-totals" role="status" aria-live="polite"></div>');
 panel.querySelector('.punch-footer .hint').textContent='Column filters: type a value, then Tab or Enter to add another';
 function filterChips(key){return '<div class="punch-filter-chips">'+(selectedFilters[key]||[]).map((v,i)=>'<button type="button" data-filter-remove="'+esc(key)+'" data-filter-index="'+i+'" aria-label="Remove '+esc(v)+' filter">'+esc(v)+' <span aria-hidden="true">×</span></button>').join('')+'</div>'}
 function matchFilter(row,key,term){if(key==='closedDate')return PunchItems.dateMatches(row.closedDate,term);const actual=norm(value(row,key)),wanted=norm(term);return key==='category'||(key==='statusText'&&['CLOSED','OPEN'].includes(wanted))?actual===wanted:actual.includes(wanted)}
 function matchesFilters(row){return [...new Set([...Object.keys(filters),...Object.keys(selectedFilters)])].every(key=>{const terms=[...(selectedFilters[key]||[]),filters[key]||''].filter(v=>v.trim());return !terms.length||terms.some(term=>matchFilter(row,key,term))})}
 function totals(){const counts={Closed:0,Open:0,Review:0};for(const {row} of matches)counts[PunchItems.rowStatus(row).status]++;$('punchTotals').innerHTML='<strong>'+matches.length.toLocaleString('en-GB')+' punch items listed</strong><span class="total-closed">'+counts.Closed.toLocaleString('en-GB')+' Closed</span><span class="total-open">'+counts.Open.toLocaleString('en-GB')+' Open</span><span class="total-review">'+counts.Review.toLocaleString('en-GB')+' Require review</span>'}

 const scroll=panel.querySelector('.punch-scroll'),body=$('punchRows');

 const date=v=>v?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(new Date(v)):'Not available';

 function value(row,key){if(key==='closedDate')return PunchItems.formatDate(row.closedDate);if(key==='discipline')return PunchItems.discipline(row);if(key==='statusText')return PunchItems.rowStatus(row).text;if(key.startsWith('field:'))return row.fields?.find(f=>f.label===key.slice(6))?.value||'';return row[key]??''}

 function makeColumns(){columns=[...compact];const labels=new Set();for(const r of PunchItems.getSnapshot()?.rows||[])for(const f of r.fields||[])labels.add(f.label);

  const used=new Set(['itemno','closeddate','subsystem','description','locationroomnumber','locationroom','category','discipline','dicipline']);

  for(const l of labels)if(!used.has(l.toLowerCase().replace(/[^a-z]/g,'')))columns.push(['field:'+l,l]);

  const focused=document.activeElement?.dataset?.punchFilter,caret=document.activeElement?.selectionStart;
  $('punchHead').innerHTML=columns.map(([k,l])=>'<th>'+esc(l)+filterChips(k)+'<input placeholder="'+(k==='closedDate'?'e.g. 14 Sept 2026':'Type + Tab…')+'" aria-label="Filter '+esc(l)+'" data-punch-filter="'+esc(k)+'" value="'+esc(filters[k]||'')+'"></th>').join('');
  if(focused){const input=[...$('punchHead').querySelectorAll('input')].find(el=>el.dataset.punchFilter===focused);input?.focus({preventScroll:true});if(input&&caret!=null)input.setSelectionRange(caret,caret)}

  panel.querySelector('table').style.width=(columns.length*155+260)+'px';

 }

 function paint(){scheduled=false;if(!active)return;const start=Math.max(0,Math.floor(scroll.scrollTop/66)-8),end=Math.min(matches.length,start+70),height=n=>'<tr aria-hidden="true"><td colspan="'+columns.length+'" style="height:'+n+'px;padding:0;border:0"></td></tr>';

  body.innerHTML=height(start*66)+matches.slice(start,end).map(({row,index})=>'<tr style="height:66px">'+columns.map(([key])=>'<td>'+(key==='itemNumber'?'<button class="related-tag" data-punch-record="'+index+'">'+esc(row.itemNumber)+'</button>':'<div class="punch-clip" title="'+esc(value(row,key))+'">'+(key==='statusText'?'<span class="'+(PunchItems.rowStatus(row).status==='Closed'?'found':'warn')+'">'+esc(value(row,key))+'</span>':esc(value(row,key)))+'</div>')+'</td>').join('')+'</tr>').join('')+height((matches.length-end)*66);

 }

 scroll.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(paint)}});

 function render(q=query,force=false){query=q;if(!active)return;const data=PunchItems.getSnapshot();$('punchClock').innerHTML='Last update: <strong>'+esc(date(data?.syncedAt))+'</strong><br>Last check: '+esc(date(PunchItems.getLastChecked()))+(data?.stale?'<br><span class="punch-stage">Update unavailable — displaying saved data</span>':'');

  const signature=JSON.stringify([query,tokens,filters,selectedFilters,expanded]);if(!force&&source===data?.rows&&lastSignature===signature)return;const changed=source!==data?.rows;source=data?.rows;lastSignature=signature;if(changed)makeColumns();

  if(!data){matches=[];body.innerHTML='<tr><td colspan="'+columns.length+'">'+(PunchItems.getState()==='loading'?'Loading punch data…':'Punch data unavailable.')+'</td></tr>';$('punchCount').textContent='';$('punchTotals').textContent='';return}

  const wanted=new Set(tokens),found=new Set();matches=[];for(let index=0;index<data.rows.length;index++){const row=data.rows[index],number=norm(row.itemNumber);if(wanted.has(number))found.add(number);if(wanted.size&&!wanted.has(number))continue;if(query&&!number.includes(norm(query)))continue;if(!matchesFilters(row))continue;matches.push({row,index})}

  $('punchMissing').textContent=tokens.filter(n=>!found.has(n)).length?'Not found: '+tokens.filter(n=>!found.has(n)).join(', '):'';

  $('punchCount').textContent=matches.length.toLocaleString('en-GB')+' of '+data.rows.length.toLocaleString('en-GB')+' punch items'+(tokens.length?' · '+tokens.length+' selected numbers':'');
  totals();

  if(scroll.scrollTop>matches.length*66)scroll.scrollTop=0;

  paint();if(!matches.length)body.innerHTML='<tr><td colspan="'+columns.length+'">No matching punch items.</td></tr>';

 }

 function chips(){ $('punchChips').innerHTML=tokens.map((n,i)=>'<button data-punch-remove="'+i+'" aria-label="Remove '+esc(n)+'">'+esc(n)+' ×</button>').join('') }

 function add(text){tokens=[...new Set([...tokens,...split(text)])];$('q').value='';query='';scroll.scrollTop=0;chips();render('',true)}

 $('q').addEventListener('paste',event=>{if(!active)return;event.preventDefault();add(event.clipboardData.getData('text'))});

 $('q').addEventListener('keydown',event=>{if(!active)return;if(['Enter','Tab',',',';'].includes(event.key)&&$('q').value.trim()){event.preventDefault();add($('q').value)}else if(event.key==='Backspace'&&!$('q').value&&tokens.length){tokens.pop();chips();render('',true)}});
 $('punchFullQuery').addEventListener('input',event=>{$('q').value=event.target.value;scroll.scrollTop=0;render(event.target.value,true)});
 $('punchFullQuery').addEventListener('paste',event=>{event.preventDefault();add(event.clipboardData.getData('text'));event.target.value=''});
 panel.addEventListener('input',event=>{const key=event.target.dataset.punchFilter;if(key){filters[key]=event.target.value;scroll.scrollTop=0;render(query,true)}});
 panel.addEventListener('keydown',event=>{const key=event.target.dataset.punchFilter;if(!key||event.isComposing)return;const term=event.target.value.trim();if(['Tab','Enter'].includes(event.key)&&term){event.preventDefault();const selected=selectedFilters[key]||(selectedFilters[key]=[]);if(!selected.some(v=>norm(v)===norm(term)))selected.push(term);filters[key]='';makeColumns();scroll.scrollTop=0;render(query,true)}else if(event.key==='Backspace'&&!term&&selectedFilters[key]?.length){selectedFilters[key].pop();makeColumns();scroll.scrollTop=0;render(query,true)}});
 panel.addEventListener('click',event=>{const button=event.target.closest('[data-filter-remove]');if(button){selectedFilters[button.dataset.filterRemove].splice(+button.dataset.filterIndex,1);makeColumns();scroll.scrollTop=0;render(query,true)}});

 panel.addEventListener('click',event=>{const button=event.target.closest('[data-punch-remove]');if(button){tokens.splice(+button.dataset.punchRemove,1);chips();render(query,true)}});

 $('punchClear').onclick=()=>{tokens=[];filters={};selectedFilters={};query='';$('q').value='';chips();makeColumns();scroll.scrollTop=0;render('',true)};

 async function toggle(){expanded=!expanded;punchFullQuery.value=q.value;panel.classList.toggle('punch-expanded',expanded);$('punchExpand').textContent=expanded?'Exit full screen ⤡':'Full screen ⛶';makeColumns();render(query,true);if(expanded){try{await panel.requestFullscreen()}catch{}}else if(document.fullscreenElement===panel){try{await document.exitFullscreen()}catch{}}}

 $('punchExpand').onclick=toggle;document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&expanded){expanded=false;panel.classList.remove('punch-expanded');$('punchExpand').textContent='Full screen ⛶';makeColumns();render(query,true)}});

 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&expanded){event.stopImmediatePropagation();if(!document.fullscreenElement)toggle()}},true);

 window.PunchBrowser={render,activate(on){active=on;panel.hidden=!on;$('resultsTable').closest('.wrap').hidden=on;document.querySelector('.filter-tools').hidden=on;$('status').hidden=on;if(!on){tokens=[];filters={};selectedFilters={};chips();if(expanded)toggle()}else{makeColumns();render('',true)}}};

})();

