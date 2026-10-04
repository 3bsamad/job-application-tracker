import {db} from '@/lib/db';
import seed from '@/lib/backup.json';
import {parseBackup} from '@/lib/model';

async function ensureTracker(){
  const d=db();
  await d.prepare('CREATE TABLE IF NOT EXISTS tracker (id INTEGER PRIMARY KEY NOT NULL, data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0)').run();
  await d.prepare('INSERT OR IGNORE INTO tracker (id,data,revision) VALUES (1,?,0)').bind(JSON.stringify(parseBackup(seed))).run();
  return d;
}

export async function GET(){
  try{
    const d=await ensureTracker();
    const row=await d.prepare('SELECT data,revision FROM tracker WHERE id=1').first<{data:string;revision:number}>();
    if(!row)return Response.json({applications:[],revision:0},{headers:{'Cache-Control':'no-store'}});
    return Response.json({applications:parseBackup(JSON.parse(row.data)),revision:row.revision},{headers:{'Cache-Control':'no-store'}});
  }catch(e){
    console.error(e);
    return Response.json({error:'Could not load your applications. Please retry.'},{status:503});
  }
}

export async function PUT(req:Request){
  try{
    if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return new Response('Forbidden',{status:403});
    const body=await req.json() as {applications:unknown;revision:number};
    const applications=parseBackup(body.applications);
    if(!Number.isInteger(body.revision))return new Response('Invalid revision',{status:400});
    const d=await ensureTracker();
    const result=await d.prepare('UPDATE tracker SET data=?,revision=revision+1 WHERE id=1 AND revision=?').bind(JSON.stringify(applications),body.revision).run();
    if(!result.meta.changes)return Response.json({error:'Another tab changed your tracker. Export your changes, then reload before saving.'},{status:409});
    return Response.json({revision:body.revision+1});
  }catch(e){
    console.error(e);
    return Response.json({error:'Save failed. Your changes are still on screen; retry or export a backup.'},{status:503});
  }
}
