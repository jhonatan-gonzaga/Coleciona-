import{appendFile}from'node:fs/promises';
const url=process.env.READY_URL||'http://127.0.0.1:4000/api/v1/health/ready',file=process.env.READY_LOG||'ready.jsonl',minutes=Number(process.env.MINUTES||43200);
for(let i=0;i<minutes;i++){const start=Date.now();let status;try{const response=await fetch(url,{signal:AbortSignal.timeout(10000)});status=response.status}catch(error){status=error.code||error.message}await appendFile(file,JSON.stringify({at:new Date(start).toISOString(),status})+'\n');if(i<minutes-1)await new Promise(resolve=>setTimeout(resolve,Math.max(0,60000-(Date.now()-start))))}
