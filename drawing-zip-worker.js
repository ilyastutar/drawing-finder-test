importScripts('./vendor/fflate.js','./drawing-metadata.js');
self.onmessage=({data})=>{try{
 const entries=DrawingMetadata.archiveEntries(data.buffer),expected=new Map(entries.map(e=>[e.name,e.length])),files=[];let total=0;
 const unzip=new fflate.Unzip(entry=>{
  if(!expected.has(entry.name))return;
  const chunks=[];let size=0;
  entry.ondata=(error,chunk,final)=>{
   if(error)throw error;size+=chunk.length;total+=chunk.length;
   if(size>expected.get(entry.name)||total>250*1024*1024)throw Error('ZIP extraction limit exceeded.');
   chunks.push(chunk);
   if(final){if(size!==expected.get(entry.name))throw Error('ZIP size mismatch.');const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}files.push({name:entry.name,buffer:bytes.buffer})}
  };entry.start();
 });
 unzip.register(fflate.UnzipInflate);const bytes=new Uint8Array(data.buffer);
 for(let i=0;i<bytes.length;i+=65536)unzip.push(bytes.subarray(i,i+65536),i+65536>=bytes.length);
 if(files.length!==entries.length||new Set(files.map(f=>f.name)).size!==entries.length)throw Error('Incomplete or duplicate ZIP entries.');
 self.postMessage({ok:true,files},files.map(f=>f.buffer));
}catch(e){self.postMessage({ok:false,error:e.message||'ZIP extraction failed.'})}};
