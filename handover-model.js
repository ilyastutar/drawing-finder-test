(function(root){
'use strict';
const key=v=>String(v||'').trim().toUpperCase();
function discipline(name){name=key(name);return /ELECTR|I&C|E&I|INSTRUMENT/.test(name)?'E&I':/MECHAN|PIPING/.test(name)?'Mechanical':/CIVIL|ARCHITECT/.test(name)?'Civil':'Other'}
function build(subsystems,punches,{today,categories=['A','B'],group='',getDiscipline,closed}){
 const index=new Map();
 for(const p of punches||[]){if(group&&discipline(getDiscipline(p))!==group)continue;const k=key(p.subsystem);if(!index.has(k))index.set(k,[]);index.get(k).push(p)}
 return subsystems.map(r=>{
  const rows=index.get(key(r.subsystem))||[];
  const counts=['A','B','C'].map(category=>{const items=rows.filter(p=>key(p.category)===category),done=items.filter(closed).length;return {category,total:items.length,closed:done,open:items.length-done}});
  const blockers=counts.filter(c=>categories.includes(c.category)).reduce((n,c)=>n+c.open,0);
  const delivered=!!r.handoverActual,hasData=!!punches&&rows.length>0;
  const overdue=!delivered&&!!r.estimate&&r.estimate<today&&blockers>0;
  const stage=delivered?'delivered':!r.walkdownActual?'walkdown':!hasData?'unknown':blockers?'blocked':'cleared';
  return {...r,rows,counts,blockers,delivered,hasData,overdue,stage};
 });
}
const api={key,discipline,build};if(typeof module==='object')module.exports=api;else root.HandoverModel=api;
})(typeof window==='undefined'?globalThis:window);
