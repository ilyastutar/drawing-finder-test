(function(){

 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

 const norm=v=>String(v??'').trim().toUpperCase(),split=v=>String(v).split(/[\s,;]+/).map(norm).filter(Boolean);

 const panel=document.createElement('section');panel.id='punchPanel';panel.hidden=true;

 document.getElementById('resultsTable').closest('.wrap').after(panel);

 panel.innerHTML='<div class="punch-top"><div><div class="punch-heading"><strong>Punch Items</strong><div class="discipline-legend"><span class="disc-electric">Red: Electric and I&amp;C</span><span class="disc-mechanical">Blue: Mechanical</span><span class="disc-civil">Gray: Civil</span></div></div><input id="punchFullQuery" class="punch-full-query" aria-label="Search punch numbers" placeholder="Search or paste punch numbers…"><div id="punchCount" class="hint"></div></div><div id="punchClock" class="punch-clock"></div></div><div class="punch-chips" id="punchChips"></div><div id="punchMissing" class="punch-missing"></div><div class="punch-scroll"><table><thead><tr id="punchHead"></tr></thead><tbody id="punchRows"></tbody></table></div><div class="punch-footer"><button class="action" id="punchClear">Clear punch filters</button><span class="hint">Paste Excel cells · Enter to add numbers</span><button class="action" id="punchExpand">Full screen ⛶</button></div>';

 const $=id=>document.getElementById(id),compact=[['itemNumber','Punch Item No.'],['closedDate','Closed Date'],['statusText','Status'],['subsystem','Subsystem No.'],['discipline','Discipline'],['description','Description'],['locationRoom','Location / Room'],['category','Category'],['issuedDate','Issued Date']];

 let active=false,expanded=false,tokens=[],query='',filters={},selectedFilters={},matches=[],source=null,lastSignature='',columns=compact,scheduled=false;
 panel.querySelector('.punch-footer').insertAdjacentHTML('beforebegin','<div id="punchTotals" class="punch-totals" role="status" aria-live="polite"></div>');
 panel.querySelector('.punch-footer .hint').textContent='Column filters: type a value, then Tab or Enter to add another';
 function filterChips(key){return '<div class="punch-filter-chips">'+(selectedFilters[key]||[]).map((v,i)=>'<button type="button" data-filter-remove="'+esc(key)+'" data-filter-index="'+i+'" aria-label="Remove '+esc(v)+' filter">'+esc(v)+' <span aria-hidden="true">×</span></button>').join('')+'</div>'}
 function matchFilter(row,key,term){if(key==='issuedDate')return PunchItems.dateMatches(PunchItems.issuedDate(row),term);if(key.endsWith('ObservedAt'))return PunchItems.dateKey(term)?PunchItems.dateMatches(PunchItems.observedDate(row[key]),term):norm(value(row,key)).includes(norm(term));if(key==='closedDate')return PunchItems.dateMatches(row.closedDate,term);const actual=norm(value(row,key)),wanted=norm(term);return key==='category'||(key==='statusText'&&['CLOSED','OPEN'].includes(wanted))?actual===wanted:actual.includes(wanted)}
 function matchesFilters(row){return [...new Set([...Object.keys(filters),...Object.keys(selectedFilters)])].every(key=>{const terms=[...(selectedFilters[key]||[]),filters[key]||''].filter(v=>v.trim());return !terms.length||terms.some(term=>matchFilter(row,key,term))})}
 function totals(){const counts={Closed:0,Open:0,Review:0},groups={A:{Closed:0,Open:0,Review:0},B:{Closed:0,Open:0,Review:0},C:{Closed:0,Open:0,Review:0}};for(const {row} of matches){const status=PunchItems.rowStatus(row).status;counts[status]++;const cat=norm(row.category)||'Other';(groups[cat]||(groups[cat]={Closed:0,Open:0,Review:0}))[status]++}
 $('punchTotals').innerHTML='<strong>'+matches.length.toLocaleString('en-GB')+' punch items listed</strong><div class="category-counts">'+Object.entries(groups).map(([cat,c])=>'<span><b>'+esc(cat)+'</b> · '+c.Open+' Open · '+c.Closed+' Closed · '+c.Review+' Review</span>').join('')+'</div><div class="overall-counts"><span class="total-closed">'+counts.Closed+' Closed</span><span class="total-open">'+counts.Open+' Open</span><span class="total-review">'+counts.Review+' Require review</span></div>'}


 const scroll=panel.querySelector('.punch-scroll'),body=$('punchRows');
 let selecting=false,cellRange=null;
 scroll.insertAdjacentHTML('beforebegin','<div class="punch-copy-tools"><button class="action" id="punchSelectCells" aria-pressed="false">Select cells</button><label><input id="punchCopyHeaders" type="checkbox" checked> Include headers</label><button class="action" id="punchCopyCells" disabled>Copy selected</button><button class="action" id="punchExportSelected" disabled>Export selected punches (.xlsx)</button><button class="action" id="punchExportFiltered">Export filtered (.xlsx)</button><span id="punchCopyHint" class="hint" role="status">Click a cell, then Shift-click the opposite corner. Esc cancels selection.</span></div>');
 function clearCells(){cellRange=null;$('punchCopyCells').disabled=true;$('punchExportSelected').disabled=true;$('punchCopyHint').textContent='Click a cell, then Shift-click the opposite corner. Esc cancels selection.'}
 function bounds(){return cellRange?{r0:Math.min(cellRange.start,cellRange.end),r1:Math.max(cellRange.start,cellRange.end),c0:Math.min(cellRange.cStart,cellRange.cEnd),c1:Math.max(cellRange.cStart,cellRange.cEnd)}:null}
 function cellSelected(position,key){const b=bounds(),c=columns.findIndex(x=>x[0]===key);return selecting&&b&&position>=b.r0&&position<=b.r1&&c>=b.c0&&c<=b.c1}
 function selectedText(){const b=bounds();if(!b)return '';const cols=columns.slice(b.c0,b.c1+1),rows=matches.slice(b.r0,b.r1+1).map(({row})=>cols.map(([key])=>value(row,key)));if($('punchCopyHeaders').checked)rows.unshift(cols.map(c=>c[1]));return rows.map(r=>r.map(v=>String(v??'').replace(/[\t\r\n]+/g,' ')).join('\t')).join('\r\n')}
 function setSelecting(on){selecting=on;clearCells();panel.classList.toggle('punch-selecting',on);$('punchSelectCells').setAttribute('aria-pressed',String(on));$('punchSelectCells').textContent=on?'Finish selecting':'Select cells';window.getSelection()?.removeAllRanges();paint()}
 $('punchSelectCells').onclick=()=>setSelecting(!selecting);
 body.addEventListener('click',event=>{if(!selecting)return;const cell=event.target.closest('[data-copy-column]');if(!cell)return;event.preventDefault();event.stopImmediatePropagation();const column=columns.findIndex(c=>c[0]===cell.dataset.copyColumn),position=+cell.dataset.copyPosition;if(event.shiftKey&&cellRange){cellRange.end=position;cellRange.cEnd=column}else cellRange={cStart:column,cEnd:column,start:position,end:position};$('punchCopyCells').disabled=false;$('punchExportSelected').disabled=false;const b=bounds();$('punchCopyHint').textContent=(b.r1-b.r0+1)+' rows × '+(b.c1-b.c0+1)+' columns selected';window.getSelection()?.removeAllRanges();paint()},true);
 document.addEventListener('copy',event=>{if(!active||!selecting||!cellRange||document.querySelector('dialog[open]')||document.activeElement?.matches('input,textarea,[contenteditable="true"]'))return;event.preventDefault();event.clipboardData.setData('text/plain',selectedText());$('punchCopyHint').textContent='Copied selected cells.'});
 $('punchCopyCells').onclick=async()=>{if(!cellRange)return;try{await navigator.clipboard.writeText(selectedText());$('punchCopyHint').textContent='Copied selected cells.'}catch{$('punchCopyHint').textContent='Press Ctrl+C to copy the selection.'}};
 async function exportRows(selected){const b=bounds(),rows=(selected&&b?matches.slice(b.r0,b.r1+1):matches).map(x=>x.row);if(!rows.length)return;$('punchExportSelected').disabled=true;$('punchExportFiltered').disabled=true;$('punchCopyHint').textContent='Preparing Excel…';try{await PunchExport.download(columns,rows,value);$('punchCopyHint').textContent=rows.length+' punch items exported with all columns and headers.'}catch{$('punchCopyHint').textContent='Excel export failed. Please try again.'}finally{$('punchExportSelected').disabled=!cellRange;$('punchExportFiltered').disabled=false}}
 $('punchExportSelected').onclick=()=>exportRows(true);$('punchExportFiltered').onclick=()=>exportRows(false);

 const date=v=>v?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(new Date(v)):'Not available';

 function value(row,key){if(key==='issuedDate')return PunchItems.formatDate(PunchItems.issuedDate(row));if(key.endsWith('ObservedAt'))return PunchItems.formatObserved(row[key]);if(key==='closedDate')return PunchItems.formatDate(row.closedDate);if(key==='discipline')return PunchItems.discipline(row);if(key==='statusText')return PunchItems.rowStatus(row).text;if(key.startsWith('field:'))return row.fields?.find(f=>f.label===key.slice(6))?.value||'';return row[key]??''}

 function makeColumns(){columns=[...compact];const labels=new Set();for(const r of PunchItems.getSnapshot()?.rows||[])for(const f of r.fields||[])labels.add(f.label);

  const used=new Set(['itemno','closeddate','subsystem','description','locationroomnumber','locationroom','category','discipline','dicipline','issueddate']);

  for(const l of labels)if(!used.has(l.toLowerCase().replace(/[^a-z]/g,'')))columns.push(['field:'+l,l]);

  const notes=columns.findIndex(c=>/^comm(?:issioning)?notes$/i.test(c[1].replace(/[^a-z]/gi,'')));columns.splice(notes<0?columns.length:notes+1,0,['issuedObservedAt','Issued Time (First Seen)']);
  const focused=document.activeElement?.dataset?.punchFilter,caret=document.activeElement?.selectionStart;
  $('punchHead').innerHTML=columns.map(([k,l])=>'<th><span class="punch-col-label">'+esc(l)+'</span><input placeholder="'+(k==='closedDate'?'e.g. 14 Sept 2026':'Type + Tab…')+'" aria-label="Filter '+esc(l)+'" data-punch-filter="'+esc(k)+'" value="'+esc(filters[k]||'')+'">'+filterChips(k)+'</th>').join('');
  if(focused){const input=[...$('punchHead').querySelectorAll('input')].find(el=>el.dataset.punchFilter===focused);input?.focus({preventScroll:true});if(input&&caret!=null)input.setSelectionRange(caret,caret)}

  fitColumns();

 }

 function fitColumns(){
  const widths=columns.map(([key,label])=>{
   if(key==='statusText')return 82;if(key==='description')return 350;
   if(!['statusText','discipline','closedDate','issuedDate','closedObservedAt','issuedObservedAt','itemNumber','category','subsystem'].includes(key))return 155;
   const min=key.endsWith('ObservedAt')?110:key==='itemNumber'?95:key==='category'?85:90;
   let length=0;for(const {row} of matches)length=Math.max(length,String(value(row,key)).length);
   return Math.min(key.endsWith('ObservedAt')?220:200,Math.max(min,Math.ceil(length*7.2+25)));
  });
  const table=panel.querySelector('table');let group=table.querySelector('colgroup');if(!group){group=document.createElement('colgroup');table.prepend(group)}group.innerHTML=widths.map(w=>'<col style="width:'+w+'px">').join('');table.style.width=widths.reduce((a,b)=>a+b,0)+'px';
 }
 function tone(row){const index=tokens.indexOf(norm(row.itemNumber));return index>=0?index:(query&&norm(row.itemNumber).includes(norm(query))?0:-1)}
 function rowClass(row){return ' class="'+PunchItems.disciplineTone(row)+(tone(row)>=0?' punch-match':'')+'"'}
 function paint(){scheduled=false;if(!active)return;const start=Math.max(0,Math.floor(scroll.scrollTop/66)-8),end=Math.min(matches.length,start+70),height=n=>'<tr aria-hidden="true"><td colspan="'+columns.length+'" style="height:'+n+'px;padding:0;border:0"></td></tr>';

  body.innerHTML=height(start*66)+matches.slice(start,end).map(({row,index},offset)=>'<tr'+rowClass(row)+' style="height:66px">'+columns.map(([key])=>'<td data-copy-column="'+esc(key)+'" data-copy-position="'+(start+offset)+'"'+(cellSelected(start+offset,key)?' class="punch-cell-selected"':'')+'>'+(key==='itemNumber'?'<button class="related-tag" data-punch-record="'+index+'">'+esc(row.itemNumber)+'</button>'+(tone(row)>=0?'<div class="match-label">Searched '+(tokens.length?'#'+(tone(row)+1):'match')+'</div>':''):'<div class="punch-clip" title="'+esc(value(row,key))+'">'+(key==='statusText'?'<span class="'+(PunchItems.rowStatus(row).status==='Closed'?'found':'warn')+'">'+esc(value(row,key))+'</span>':esc(value(row,key)))+'</div>')+'</td>').join('')+'</tr>').join('')+height((matches.length-end)*66);

 }

 scroll.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(paint)}});

 function render(q=query,force=false){query=q;if(!active)return;const data=PunchItems.getSnapshot();$('punchClock').innerHTML='Last update: <strong>'+esc(date(data?.syncedAt))+'</strong><br>Last check: '+esc(date(PunchItems.getLastChecked()))+(data?.stale?'<br><span class="punch-stage">Update unavailable — displaying saved data</span>':'');

  const signature=JSON.stringify([query,tokens,filters,selectedFilters,expanded]);if(!force&&source===data?.rows&&lastSignature===signature)return;clearCells();const changed=source!==data?.rows;source=data?.rows;lastSignature=signature;if(changed)makeColumns();

  if(!data){matches=[];body.innerHTML='<tr><td colspan="'+columns.length+'">'+(PunchItems.getState()==='loading'?'Loading punch data…':'Punch data unavailable.')+'</td></tr>';$('punchCount').textContent='';$('punchTotals').textContent='';return}

  const wanted=new Set(tokens),found=new Set();matches=[];for(let index=0;index<data.rows.length;index++){const row=data.rows[index],number=norm(row.itemNumber);if(wanted.has(number))found.add(number);if(wanted.size&&!wanted.has(number))continue;if(query&&!number.includes(norm(query)))continue;if(!matchesFilters(row))continue;matches.push({row,index})}

  $('punchMissing').textContent=tokens.filter(n=>!found.has(n)).length?'Not found: '+tokens.filter(n=>!found.has(n)).join(', '):'';

  $('punchCount').textContent=matches.length.toLocaleString('en-GB')+' of '+data.rows.length.toLocaleString('en-GB')+' punch items'+(tokens.length?' · '+tokens.length+' selected numbers':'');
  totals();fitColumns();if(changed)chips();

  if(scroll.scrollTop>matches.length*66)scroll.scrollTop=0;

  paint();if(!matches.length)body.innerHTML='<tr><td colspan="'+columns.length+'">No matching punch items.</td></tr>';

 }

 function chips(){const rows=PunchItems.getSnapshot()?.rows||[],lookup=new Map(rows.map(r=>[norm(r.itemNumber),r]));$('punchChips').innerHTML=tokens.map((n,i)=>'<button class="'+PunchItems.disciplineTone(lookup.get(n)||{})+'" data-punch-remove="'+i+'" aria-label="Remove '+esc(n)+'"><span class="searched-number">'+esc(n)+'</span> ×</button>').join('') }


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

 function toggle(){expanded=!expanded;$('punchFullQuery').value=$('q').value;panel.classList.toggle('punch-expanded',expanded);$('punchExpand').textContent=expanded?'Exit full screen ⤡':'Full screen ⛶';makeColumns();render(query,true)}
 $('punchExpand').onclick=toggle;
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&active&&selecting&&!document.querySelector('dialog[open]')){event.preventDefault();event.stopImmediatePropagation();setSelecting(false)}},true);

 window.PunchBrowser={render,activate(on){active=on;panel.hidden=!on;$('resultsTable').closest('.wrap').hidden=on;document.querySelector('.filter-tools').hidden=on;$('status').hidden=on;if(!on){setSelecting(false);tokens=[];filters={};selectedFilters={};chips();if(expanded)toggle()}else{makeColumns();render('',true)}}};

})();

