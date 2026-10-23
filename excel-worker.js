/* Local workbook processing: no network requests or uploads. */
importScripts('vendor/exceljs.min.js');
let book, sheet;
const text=c=>c.value instanceof Date?c.value.toISOString().slice(0,10):c.text||'';
self.onmessage=async({data:m})=>{try{
 let result;
 if(m.type==='load'){
  const next=new ExcelJS.Workbook();await next.xlsx.load(m.buffer);
  if(next.worksheets.some(s=>s.rowCount>50000||s.columnCount>200)||next.worksheets.reduce((n,s)=>n+s.rowCount*s.columnCount,0)>1000000)throw Error('Workbook exceeds the limit: 50,000 rows, 200 columns per sheet, 1 million cells overall.');
  book=next;sheet=book.worksheets[0];if(!sheet)throw Error('No worksheets found.');result={sheets:book.worksheets.map(s=>({id:s.id,name:s.name}))};
 }else if(m.type==='page'){
  sheet=book.getWorksheet(m.sheet);const cols=sheet.columnCount, rows=[];const q=(m.query||'').toLowerCase();
  sheet.eachRow((row,n)=>{if(n===1)return;const vals=Array.from({length:cols},(_,i)=>text(row.getCell(i+1)));if(q&&!vals.some(v=>v.toLowerCase().includes(q)))return;if(Object.entries(m.filters||{}).some(([c,v])=>!vals[c-1].toLowerCase().includes(v.toLowerCase())))return;rows.push({n,vals})});
  if(m.sort)rows.sort((a,b)=>a.vals[m.sort-1].localeCompare(b.vals[m.sort-1],undefined,{numeric:true})*(m.desc?-1:1));
  const page=Math.min(Math.max(0,m.page||0),Math.max(0,Math.ceil(rows.length/100)-1));
  result={total:rows.length,page,headers:Array.from({length:cols},(_,i)=>text(sheet.getRow(1).getCell(i+1))||'Column '+(i+1)),rows:rows.slice(page*100,page*100+100).map(r=>({...r,locked:r.vals.map((_,i)=>!!sheet.getCell(r.n,i+1).formula||sheet.getCell(r.n,i+1).isMerged)}))};
 }else if(m.type==='edit'){
  const c=book.getWorksheet(m.sheet).getCell(m.row,m.col);if(c.formula||c.isMerged)throw Error('Formula and merged cells are read-only.');
  if(typeof c.value==='number'){if(m.value!==''&&!Number.isFinite(Number(m.value)))throw Error('Enter a number for this cell.');c.value=m.value===''?null:Number(m.value)}
  else if(c.value instanceof Date){if(!/^\d{4}-\d{2}-\d{2}$/.test(m.value)||Number.isNaN(Date.parse(m.value)))throw Error('Enter a date as YYYY-MM-DD.');c.value=new Date(m.value+'T00:00:00Z')}
  else if(typeof c.value==='boolean'){if(!/^(true|false)$/i.test(m.value))throw Error('Enter true or false.');c.value=m.value.toLowerCase()==='true'}
  else c.value=m.value;result={edited:true};
 }else if(m.type==='export'){book.calcProperties.fullCalcOnLoad=true;result={buffer:await book.xlsx.writeBuffer()}}
 else throw Error('Unknown request');
 self.postMessage({id:m.id,result});
 }catch(e){self.postMessage({id:m.id,error:e.message})}};
