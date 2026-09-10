(function(){
 const body=document.getElementById('results');
 const inputs=[...document.querySelectorAll('[data-column-filter]')];
 const normalize=s=>String(s||'').trim().toLocaleUpperCase('en');
 function apply(){
  const rows=[...body.rows].filter(r=>r.cells.length===8);
  let shown=0;
  for(const row of rows){
   row.hidden=!inputs.every(input=>normalize(row.cells[Number(input.dataset.columnFilter)].textContent).includes(normalize(input.value)));
   if(!row.hidden)shown++;
  }
  document.getElementById('filterCount').textContent=rows.length?`${shown} of ${rows.length} loaded results shown`:'Filters apply to loaded results';
 }
 inputs.forEach(input=>input.addEventListener('input',apply));
 const clear=()=>{inputs.forEach(i=>i.value='');apply()};
 document.getElementById('clearFilters').addEventListener('click',clear);
 document.getElementById('clearAll').addEventListener('click',clear);
 new MutationObserver(apply).observe(body,{childList:true});
 apply();
})();
