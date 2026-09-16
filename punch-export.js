(function(root){
 let ready;
 function load(){if(root.ExcelJS)return Promise.resolve();return ready||(ready=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='vendor/exceljs.min.js';script.onload=resolve;script.onerror=()=>{ready=null;script.remove();reject(Error('Excel library unavailable'))};document.head.append(script)}))}
 root.PunchExport={async download(columns,rows,value){
  await load();const book=new ExcelJS.Workbook();book.creator='TOP Punch Closure';
  const sheet=book.addWorksheet('Punch Items',{views:[{state:'frozen',ySplit:1}]});
  sheet.columns=columns.map(([key,label])=>({header:label,key,width:key==='description'?65:key==='itemNumber'?18:25}));
  for(const row of rows)sheet.addRow(columns.map(([key])=>String(value(row,key)??'')));
  sheet.getRow(1).font={bold:true,color:{argb:'FF24465C'}};sheet.getRow(1).height=32;
  sheet.getRow(1).eachCell(c=>{c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE5EEF5'}};c.alignment={vertical:'middle',wrapText:true}});
  sheet.autoFilter={from:{row:1,column:1},to:{row:1,column:columns.length}};
  sheet.eachRow((r,n)=>{if(n>1)r.alignment={vertical:'top',wrapText:true}});
  // Values remain strings: IDs retain leading zeros and formula-like text is not executed.
  const bytes=await book.xlsx.writeBuffer(),url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  const a=document.createElement('a');a.href=url;a.download='punch-items-'+new Date().toISOString().slice(0,10)+'.xlsx';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }};
})(window);
