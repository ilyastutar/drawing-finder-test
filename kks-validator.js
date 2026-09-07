(function(g){
'use strict';
const D=typeof module!=='undefined'?require('./kks-dictionary.js'):g.DradenauKKSDictionary;
const normalize=x=>String(x??'').toUpperCase().replace(/\s+/g,'');
function assess(raw){
 const value=normalize(raw), warnings=[];
 const m=/^(\d)(\d)([A-Z]{3})(\d{2})(?:([A-Z]{2})(\d{3})([A-Z])?)?(?:([A-Z]{2})(\d{2})|(-[A-Z])(\d{2}))?$/.exec(value);
 if(!m)return {original:String(raw??''),normalized:value,status:'REVIEW',score:0,warnings:['Unsupported or damaged structure; retained unchanged'],breakdown:null};
 const [,G,F0,F,FN,A,AN,A3,B,BN,E,EN]=m;
 const breakdown={G,F0,functionKey:F,FN,equipmentKey:A||'',AN:AN||'',A3:A3||'',componentKey:B||E||'',BN:BN||EN||''};
 let score=40;
 for(const [kind,key] of [['function',F],['equipment',A],['component',B||E]]){
  if(!key)continue;
  const item=D[kind][key];
  if(!item)warnings.push('Unknown '+kind+' key: '+key);
  else if(item.kind==='free')warnings.push('Project assignment required: '+key);
  else score+=kind==='function'?25:15;
 }
 if(!D.plantPrefixes.includes(G+F0))warnings.push('GF0 needs contextual review (I&C may use other prefixes): '+G+F0);
 if(A&&'CDF'.includes(A[0])){
  breakdown.measuredVariable=D.icVariables[A[1]]||'';
  if(!breakdown.measuredVariable)warnings.push('A2 not in project I&C table (section 7.1.2)');
  if(Number(AN)>=900)breakdown.signalLink=Number(AN)<930?'similar analogue':Number(AN)<960?'similar binary':'dissimilar quantities';
 }
 if(A?.startsWith('H')&&!['M','X'].includes(F[0]))warnings.push('H equipment requires M/X function group (Annex 1)');
 if(!A)warnings.push('System/cabinet level only; installation-location details not validated');
 return {original:String(raw??''),normalized:value,status:warnings.length?'REVIEW':'CONSISTENT',score:Math.min(100,score),warnings,breakdown};
}
function validate(raw){
 const result=assess(raw);result.correction=null;
 // Never rewrite a structurally valid tag or guess letters in a letter slot.
 if(result.breakdown)return result;
 const s=normalize(raw);if(![12,13,16,17].includes(s.length))return result;
 const chars=[...s],changes=[];
 for(const i of [0,1,5,6,9,10,11]){
  const to={O:'0',I:'1',L:'1',S:'5'}[chars[i]];
  if(to){changes.push({index:i,from:chars[i],to});chars[i]=to;}
 }
 if(changes.length!==1)return result;
 const candidate=assess(chars.join(''));
 if(candidate.status==='CONSISTENT')result.correction={candidate:candidate.normalized,changes,policy:'suggestion-only',score:candidate.score};
 return result;
}
function annotate(record){
 const pipe=String(record.pipeline||'');
 return {...record,kks:validate(record.tag),pipelineKks:pipe?validate(pipe.split('-')[0]):null};
}
const api={validate,annotate,dictionary:D};
if(typeof module!=='undefined')module.exports=api;else g.DradenauKKS=api;
})(globalThis);
