'use strict';
function name(value){return String(value||'').replace(/\\/g,'/').split('/').pop().normalize('NFC').trim()}
function key(value){return name(value).toLowerCase()}
module.exports={name,key};
