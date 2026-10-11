'use strict';
const invalid=()=>{throw Object.assign(Error('Invalid view preferences'),{status:400})};
function validate(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||JSON.stringify(value).length>30000)invalid();
 if(!['light','dark'].includes(value.theme))invalid();
 const columns={};if(value.columns!==undefined&&(!value.columns||typeof value.columns!=='object'||Array.isArray(value.columns)))invalid();
 for(const key of Object.keys(value.columns||{})){
  if(!['punch','cables'].includes(key)&&!/^table:[a-f0-9]{1,8}$/.test(key))invalid();const section=value.columns[key];if(!section||typeof section!=='object'||Array.isArray(section))invalid();
  columns[key]={};for(const type of ['hidden','order']){const list=section[type]||[];if(!Array.isArray(list)||list.length>250||list.some(v=>typeof v!=='string'||!v.length||v.length>160))invalid();columns[key][type]=[...new Set(list)]}
 }
 return {version:1,theme:value.theme,columns};
}
module.exports={validate};
