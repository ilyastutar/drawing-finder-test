(function(root){
 function dedupeDrawingRows(rows){
  const found=new Map();
  for(const r of rows){
   const path=String(r.drawing_path||r.file_name||'').replace(/\\/g,'/');
   const name=path.split('/').pop().trim().toUpperCase();
   // Preserve revisions, distinct rows, pipelines, elevations and related tags.
   const key=JSON.stringify([String(r.tag||'').toUpperCase(),name,r.row_no,r.pipeline,r.elevation,r.floor_elevation,r.related_tag,r.record_source]);
   if(!found.has(key)){found.set(key,{...r,duplicate_paths:[path]});continue}
   const old=found.get(key);old.duplicate_paths.push(path);
   if(path.includes('/')&&!String(old.drawing_path||'').includes('/'))found.set(key,{...r,duplicate_paths:old.duplicate_paths});
  }
  return [...found.values()];
 }
 if(typeof module!=='undefined')module.exports={dedupeDrawingRows};else root.dedupeDrawingRows=dedupeDrawingRows;
})(typeof window!=='undefined'?window:globalThis);
