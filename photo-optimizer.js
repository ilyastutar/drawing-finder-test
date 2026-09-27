(function(root){
 'use strict';
 const MAX_EDGE=1920, TARGET_BYTES=2*1024*1024;
 let queue=Promise.resolve();
 const sizeLabel=bytes=>bytes>=1024*1024?(bytes/1024/1024).toFixed(1)+' MB':Math.ceil(bytes/1024)+' KB';

 async function decode(file){
  if(typeof root.createImageBitmap==='function'){
   try{const bitmap=await root.createImageBitmap(file,{imageOrientation:'from-image'});return {image:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close()}}catch{}
  }
  const url=URL.createObjectURL(file),image=new Image();
  try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('This photo could not be opened. Use a valid JPEG, PNG or WebP image.'));image.src=url});return {image,width:image.naturalWidth,height:image.naturalHeight,close:()=>{image.src='';URL.revokeObjectURL(url)}}}
  catch(error){URL.revokeObjectURL(url);throw error}
 }
 function encode(canvas,type,quality){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Photo compression failed. Please try again.')),type,quality))}

 async function optimize(file,onProgress){
  if(!(file instanceof Blob)||!file.size)throw Error('Choose a non-empty photo.');
  if(!/^image\/(jpeg|png|webp)$/i.test(file.type||'')&&!/\.(jpe?g|png|webp)$/i.test(file.name||''))throw Error('Use JPEG, PNG or WebP photos. Convert HEIC/HEIF photos to JPEG first.');
  onProgress?.('Preparing '+file.name+' ('+sizeLabel(file.size)+')…');
  let decoded,canvas;
  try{
   decoded=await decode(file);
   if(!decoded.width||!decoded.height)throw Error('This photo has invalid dimensions.');
   if(Math.max(decoded.width,decoded.height)<=MAX_EDGE&&file.size<=TARGET_BYTES)return {file,originalBytes:file.size,bytes:file.size,resized:false,width:decoded.width,height:decoded.height};
   canvas=document.createElement('canvas');
   let scale=Math.min(1,MAX_EDGE/Math.max(decoded.width,decoded.height));
   for(let pass=0;pass<6;pass++){
    canvas.width=Math.max(1,Math.round(decoded.width*scale));canvas.height=Math.max(1,Math.round(decoded.height*scale));
    const context=canvas.getContext('2d');if(!context)throw Error('Your browser could not prepare this photo. Please try on another device.');
    context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(decoded.image,0,0,canvas.width,canvas.height);
    for(const quality of [.84,.72,.60]){
     let blob=await encode(canvas,'image/webp',quality);
     if(blob.type!=='image/webp')blob=await encode(canvas,'image/jpeg',quality);
     if(blob.size<=TARGET_BYTES){
      const extension=blob.type==='image/webp'?'.webp':'.jpg',name=(file.name||'photo').replace(/\.[^.]+$/,'')+extension;
      const output=new File([blob],name,{type:blob.type,lastModified:file.lastModified||0});
      return {file:output,originalBytes:file.size,bytes:output.size,resized:true,width:canvas.width,height:canvas.height};
     }
    }
    scale*=.8;
   }
   throw Error('This photo could not be compressed sufficiently. Please export it as JPEG and try again.');
  }finally{decoded?.close();if(canvas){canvas.width=1;canvas.height=1}}
 }
 // Prepare one photo at a time, including uploads started from different dialogs.
 function prepare(file,onProgress){const result=queue.then(()=>optimize(file,onProgress));queue=result.catch(()=>{});return result}
 root.PhotoOptimizer={prepare,sizeLabel,maxEdge:MAX_EDGE,targetBytes:TARGET_BYTES};
})(window);
