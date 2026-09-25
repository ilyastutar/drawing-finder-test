(function(root){
 const norm=s=>String(s||'').toUpperCase().trim(),label=s=>norm(s).replace(/[^A-Z]/g,'');
 function alias(row){const fields=row.fields||[],nfi=fields.find(f=>/TURNOVERWALKDOWN|NFINO/.test(label(f.label))),item=fields.find(f=>label(f.label)==='WALKDOWNITEMNO');const no=norm(nfi?.value).match(/DE303-\d{3}-SU-NFI-\d+/)?.[0],i=String(item?.value||'').trim();return no&&/^\d+$/.test(i)?no+'-'+Number(i):''}
 function fileAlias(name){const base=norm(name.split(/[\\/]/).pop()).replace(/\.(JPE?G|PNG|WEBP)$/,'');const m=base.match(/^(DE303-\d{3}-SU-NFI-\d+)[\s-]+(\d+)(?=$|[\s_.()-])/);return m?m[1]+'-'+Number(m[2]):''}
 function createMatcher(rows){const aliases=new Map(),numbers=new Map();for(const r of rows){for(const [m,k]of [[aliases,alias(r)],[numbers,String(r.itemNumber)]])if(k){if(!m.has(k))m.set(k,[]);m.get(k).push(r)}}return name=>{const a=fileAlias(name);if(a)return aliases.get(a)||[];const m=name.split(/[\\/]/).pop().match(/^(\d+)(?:[-_ ].*)?\.(?:jpe?g|png|webp)$/i);return m?numbers.get(String(Number(m[1])))||[]:[]}}
 const api={alias,fileAlias,createMatcher};if(typeof module!=='undefined')module.exports=api;else root.PhotoMatching=api;
})(typeof window!=='undefined'?window:globalThis);
