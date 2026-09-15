(function(){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const norm=v=>String(v??'').trim().toUpperCase(),split=v=>String(v).split(/[\s,;]+/).map(norm).filter(Boolean);
 const panel=document.createElement('section');panel.id='punchPanel';panel.hidden=true;
 document.getElementById('resultsTable').closest('.wrap').after(panel);
 panel.innerHTML='<div class="punch-top"><div><strong>Punch Items</strong><input id="punchFullQuery" class="punch-full-query" aria-label="Search punch numbers" placeholder="Search or paste punch numbers…"><div id="punchCount" class="hint"></div></div><div id="punchClock" class="punch-clock"></div></div><div class="punch-chips" id="punchChips"></div><div id="punchMissing" class="punch-missing"></div><div class="punch-scroll"><table><thead><tr id="punchHead"></tr></thead><tbody id="punchRows"></tbody></table></div><div class="punch-footer"><button class="action" id="punchClear">Clear punch filters</button><span class="hint">Paste Excel cells · Enter to add numbers</span><button class="action" id="punchExpand">Full screen ⛶</button></div>';
 const $=id=>document.getElementById(id),compact=[['itemNumber','Punch Item No.'],['closedDate','Closed Date'],['statusText','Status'],['subsystem','Subsystem No.'],['description','Description'],['locationRoom','Location / Room'],['category','Category']];
 let active=false,expanded=false,tokens=[],query='',filters={},matches=[],source=null,lastSignature='',columns=compact,scheduled=false;
 const scroll=panel.querySelector('.punch-scroll'),body=$('punchRows');
 const date=v=>v?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(new Date(v)):'Not available';
 function value(row,key){if(key==='statusText')return PunchItems.rowStatus(row).text;if(key.startsWith('field:'))return row.fields?.find(f=>f.label===key.slice(6))?.value||'';return row[key]??''}
 function makeColumns(){columns=[...compact];if(expanded){const labels=new Set();for(const r of PunchItems.getSnapshot()?.rows||[])for(const f of r.fields||[])labels.add(f.label);for(const l of labels)if(!['Item No','Closed Date','Sub-System','Description','Location\n(Room Number)','Category'].includes(l))columns.push(['field:'+l,l]);columns.push(['sheet','Source Sheet'],['rowNumber','Excel Row'])}
  $('punchHead').innerHTML=columns.map(([k,l])=>'<th>'+esc(l)+'<input placeholder="Filter…" aria-label="Filter '+esc(l)+'" data-punch-filter="'+esc(k)+'" value="'+esc(filters[k]||'')+'"></th>').join('');
 }
 function paint(){scheduled=false;if(!active)return;const start=Math.max(0,Math.floor(scroll.scrollTop/66)-8),end=Math.min(matches.length,start+70),height=n=>'<tr aria-hidden="true"><td colspan="'+columns.length+'" style="height:'+n+'px;padding:0;border:0"></td></tr>';
  body.innerHTML=height(start*66)+matches.slice(start,end).map(({row,index})=>'<tr style="height:66px">'+columns.map(([key])=>'<td>'+(key==='itemNumber'?'<button class="related-tag" data-punch-record="'+index+'">'+esc(row.itemNumber)+'</button>':'<div class="punch-clip" title="'+esc(value(row,key))+'">'+(key==='statusText'?'<span class="'+(PunchItems.rowStatus(row).status==='Closed'?'found':'warn')+'">'+esc(value(row,key))+'</span>':esc(value(row,key)))+'</div>')+'</td>').join('')+'</tr>').join('')+height((matches.length-end)*66);
 }
 scroll.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(paint)}});
 function render(q=query,force=false){query=q;if(!active)return;const data=PunchItems.getSnapshot();$('punchClock').innerHTML='Last update: <strong>'+esc(date(data?.syncedAt))+'</strong><br>Last check: '+esc(date(PunchItems.getLastChecked()))+(data?.stale?'<br><span class="punch-stage">Update unavailable — displaying saved data</span>':'');
  const signature=JSON.stringify([query,tokens,filters,expanded]);if(!force&&source===data?.rows&&lastSignature===signature)return;source=data?.rows;lastSignature=signature;
  if(!data){matches=[];body.innerHTML='<tr><td colspan="'+columns.length+'">'+(PunchItems.getState()==='loading'?'Loading punch data…':'Punch data unavailable.')+'</td></tr>';$('punchCount').textContent='';return}
  const wanted=new Set(tokens),found=new Set();matches=[];for(let index=0;index<data.rows.length;index++){const row=data.rows[index],number=norm(row.itemNumber);if(wanted.has(number))found.add(number);if(wanted.size&&!wanted.has(number))continue;if(query&&!number.includes(norm(query)))continue;if(!Object.entries(filters).every(([key,v])=>norm(value(row,key)).includes(norm(v))))continue;matches.push({row,index})}
  $('punchMissing').textContent=tokens.filter(n=>!found.has(n)).length?'Not found: '+tokens.filter(n=>!found.has(n)).join(', '):'';
  $('punchCount').textContent=matches.length.toLocaleString('en-GB')+' of '+data.rows.length.toLocaleString('en-GB')+' punch items'+(tokens.length?' · '+tokens.length+' selected numbers':'');
  if(scroll.scrollTop>matches.length*66)scroll.scrollTop=0;
  paint();if(!matches.length)body.innerHTML='<tr><td colspan="'+columns.length+'">No matching punch items.</td></tr>';
 }
 function chips(){ $('punchChips').innerHTML=tokens.map((n,i)=>'<button data-punch-remove="'+i+'" aria-label="Remove '+esc(n)+'">'+esc(n)+' ×</button>').join('') }
 function add(text){tokens=[...new Set([...tokens,...split(text)])];$('q').value='';query='';scroll.scrollTop=0;chips();render('',true)}
 $('q').addEventListener('paste',event=>{if(!active)return;event.preventDefault();add(event.clipboardData.getData('text'))});
 $('q').addEventListener('keydown',event=>{if(!active)return;if(['Enter','Tab',',',';'].includes(event.key)&&$('q').value.trim()){event.preventDefault();add($('q').value)}else if(event.key==='Backspace'&&!$('q').value&&tokens.length){tokens.pop();chips();render('',true)}});
 panel.addEventListener('input',event=>{const key=event.target.dataset.punchFilter;if(key){filters[key]=event.target.value;scroll.scrollTop=0;render(query,true)}});
 panel.addEventListener('click',event=>{const button=event.target.closest('[data-punch-remove]');if(button){tokens.splice(+button.dataset.punchRemove,1);chips();render(query,true)}});
 $('punchClear').onclick=()=>{tokens=[];filters={};query='';$('q').value='';chips();makeColumns();scroll.scrollTop=0;render('',true)};
 async function toggle(){expanded=!expanded;punchFullQuery.value=q.value;panel.classList.toggle('punch-expanded',expanded);$('punchExpand').textContent=expanded?'Exit full screen ⤡':'Full screen ⛶';makeColumns();render(query,true);if(expanded){try{await panel.requestFullscreen()}catch{}}else if(document.fullscreenElement===panel){try{await document.exitFullscreen()}catch{}}}
 $('punchExpand').onclick=toggle;document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&expanded){expanded=false;panel.classList.remove('punch-expanded');$('punchExpand').textContent='Full screen ⛶';makeColumns();render(query,true)}});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&expanded){event.stopImmediatePropagation();if(!document.fullscreenElement)toggle()}},true);
 window.PunchBrowser={render,activate(on){active=on;panel.hidden=!on;$('resultsTable').closest('.wrap').hidden=on;document.querySelector('.filter-tools').hidden=on;$('status').hidden=on;if(!on){tokens=[];filters={};chips();if(expanded)toggle()}else{makeColumns();render('',true)}}};
})();
