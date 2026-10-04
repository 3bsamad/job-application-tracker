export type Event = {id:string;type:string;label:string;date:string;state:string;notes:string};
export type Job = {id:string;company:string;role:string;url:string;appliedDate:string;score:number|null;notes:string;originalNotes?:string;events:Event[];nextAction:string;dueDate:string;reason:string};
export const types=['Update','Screening call','Technical assessment','Interview','Offer','Rejected','Withdrawn'];
export const states=['Pending','Scheduled','Completed','Passed','Unsuccessful','Cancelled'];
export const bands=['Excellent','Good','Moderate','Low','Unrated'];
export const uid=()=>globalThis.crypto.randomUUID();
export const band=(s:number|null)=>s===null?'Unrated':s>=4.5?'Excellent':s>=4?'Good':s>=3?'Moderate':'Low';
export const ordered=(a:Job)=>a.events.map((e,i)=>({...e,order:i})).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||a.order-b.order);
export const status=(a:Job)=>{const e=ordered(a).filter(e=>e.state!=='Cancelled');const terminal=e.filter(x=>['Rejected','Withdrawn','Offer'].includes(x.type));if(terminal.length)return terminal.at(-1)!.type;return [...e].reverse().find(x=>['Interview','Technical assessment','Screening call'].includes(x.type))?.type|| (e.length?'In review':'Applied')};
export const active=(a:Job)=>!['Rejected','Withdrawn'].includes(status(a))&&a.events.some(e=>e.state!=='Cancelled');
export const replied=(a:Job)=>a.events.some(e=>e.type!=='Withdrawn'&&e.state!=='Cancelled');
export const positive=(a:Job)=>a.events.some(e=>['Screening call','Technical assessment','Interview','Offer'].includes(e.type)&&e.state!=='Cancelled');
export const reached=(a:Job,type:string)=>a.events.some(e=>e.type===type&&e.state!=='Cancelled');
export function migrate(raw:any):Job{
 if(!raw||typeof raw.company!=='string'||typeof raw.role!=='string')throw Error('Each application needs a company and role.');
 if(raw.events){if(!Array.isArray(raw.events))throw Error('Invalid application timeline.');const a={...raw,id:String(raw.id),score:raw.score??null};if(a.score!==null&&(!Number.isFinite(a.score)||a.score<0||a.score>5))throw Error('Scores must be between 0 and 5.');for(const e of a.events)if(!types.includes(e.type)||!states.includes(e.state)||typeof e.label!=='string')throw Error('Invalid timeline event.');return a;}
 const notes=String(raw.notes||'');const m=notes.match(/(?<![\d.])([0-5](?:\.\d+)?)\s*\/\s*5(?!\d)/);const a:Job={id:String(raw.id||uid()),company:raw.company,role:raw.role,url:raw.url||'',appliedDate:raw.appliedDate||'',score:m?Number(m[1]):null,notes:m?notes.replace(m[0],'').replace(/^\s*<>\s*/,'').replace(/^\s*,\s*/,'').trim():notes,originalNotes:notes,events:[],nextAction:'',dueDate:'',reason:''};
 const add=(type:string,label:string,date:string,state='Completed',note='')=>a.events.push({id:uid(),type,label,date,state,notes:note});
 const response=raw.responseDate==='-'?'':raw.responseDate||'';
 if(raw.status==='Rejected')add('Rejected','Application rejected',response);
 if(raw.status==='Offer')add('Offer','Offer received',response);
 if(raw.status==='Interview')add('Update','First response',response);
 if(raw.status==='Interview')add('Interview','Interview stage (date unspecified)','','Pending');
 if(/POSITION FILLED/i.test(notes))a.reason='Position filled';
 return a;
}
export function parseBackup(data:any):Job[]{const arr=Array.isArray(data)?data:data?.applications;if(!Array.isArray(arr)||arr.length>10000)throw Error('Choose a valid application JSON backup.');const rows=arr.map(migrate);if(new Set(rows.map(a=>a.id)).size!==rows.length)throw Error('Backup contains duplicate application IDs.');return rows;}
