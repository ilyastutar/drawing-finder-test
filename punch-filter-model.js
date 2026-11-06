(function(root){
'use strict';
function parse(text){const terms=[],seen=new Set();for(const match of String(text||'').matchAll(/"([^"]*)"|([^\s,;|]+)/g)){const term=(match[1]??match[2]).trim(),key=term.toUpperCase();if(term&&!seen.has(key)){seen.add(key);terms.push(term)}}return terms}
function create(value){let source=null,eligible=new Map();const cells=new WeakMap();
 function multiple(rows,key){if(rows!==source){source=rows;eligible=new Map()}if(eligible.has(key))return eligible.get(key);if(/Date$|ObservedAt$/.test(key)){eligible.set(key,false);return false}const found=new Set();for(const row of rows){const text=String(value(row,key)??'').trim();if(text)found.add(text);if(found.size>2)break}const yes=found.size>2;eligible.set(key,yes);return yes}
 function terms(rows,key,text){return multiple(rows,key)?parse(text):String(text||'').trim()?[String(text).trim()]:[]}
 function contains(row,key,wanted){let map=cells.get(row);if(!map){map=new Map();cells.set(row,map)}const raw=String(value(row,key)??'');let c=map.get(key);if(!c||c.raw!==raw){c={raw,normalized:raw.trim().toUpperCase().replace(/[•·]/g,':')};map.set(key,c)}return /^\d+$/.test(wanted)&&/^\d+$/.test(c.normalized)?c.normalized===wanted:c.normalized.includes(wanted)}
 return {terms,multiple,contains};
}
const api={parse,create};if(typeof module!=='undefined')module.exports=api;else root.PunchFilterModel=api;
})(typeof window!=='undefined'?window:globalThis);
