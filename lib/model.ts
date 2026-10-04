export type Event = {id:string;type:string;label:string;date:string;state:string;notes:string};
export type Job = {id:string;company:string;role:string;url:string;appliedDate:string;score:number|null;notes:string;originalNotes?:string;events:Event[];nextAction:string;dueDate:string;reason:string};

export const types=['Update','Screening call','Technical assessment','Interview','Offer','Rejected','Withdrawn'];
export const processStates=['Planned','Scheduled','Completed','Passed','Unsuccessful','Cancelled'] as const;
export const offerStates=['Received','Accepted','Declined'] as const;
export const states=[...processStates,...offerStates,'Recorded','Pending'];
export const bands=['Excellent','Good','Moderate','Low','Unrated'];

export const uid=()=>globalThis.crypto.randomUUID();
export const band=(s:number|null)=>s===null?'Unrated':s>=4.5?'Excellent':s>=4?'Good':s>=3?'Moderate':'Low';

export function eventStateOptions(type:string):string[]{
 if(['Screening call','Technical assessment','Interview'].includes(type))return [...processStates];
 if(type==='Offer')return [...offerStates];
 return [];
}
export function defaultEventState(type:string){
 if(type==='Offer')return 'Received';
 if(['Screening call','Technical assessment','Interview'].includes(type))return 'Scheduled';
 return 'Recorded';
}
export function normalizeEventState(type:string,state:string){
 if(['Screening call','Technical assessment','Interview'].includes(type)){
  if(state==='Pending')return 'Planned';
  return processStates.includes(state as typeof processStates[number])?state:'Scheduled';
 }
 if(type==='Offer'){
  if(offerStates.includes(state as typeof offerStates[number]))return state;
  return 'Received';
 }
 return 'Recorded';
}
export const eventStateLabel=(e:Event)=>eventStateOptions(e.type).length?normalizeEventState(e.type,e.state):'';

export const ordered=(a:Job)=>a.events.map((e,i)=>({...e,order:i})).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||a.order-b.order);

export const status=(a:Job)=>{
 const events=ordered(a).filter(e=>e.state!=='Cancelled');
 const terminal=events.filter(e=>e.type==='Rejected'||e.type==='Withdrawn'||e.type==='Offer'&&['Accepted','Declined'].includes(normalizeEventState(e.type,e.state)));
 if(terminal.length){
  const last=terminal.at(-1)!;
  if(last.type==='Rejected')return 'Rejected';
  if(last.type==='Withdrawn')return 'Withdrawn';
  return normalizeEventState(last.type,last.state)==='Accepted'?'Accepted':'Withdrawn';
 }
 const unsuccessful=[...events].reverse().find(e=>['Screening call','Technical assessment','Interview'].includes(e.type)&&normalizeEventState(e.type,e.state)==='Unsuccessful');
 if(unsuccessful)return 'Rejected';
 const offer=[...events].reverse().find(e=>e.type==='Offer');
 if(offer)return 'Offer';
 return [...events].reverse().find(e=>['Interview','Technical assessment','Screening call'].includes(e.type))?.type||(events.length?'In review':'Applied');
};

export const active=(a:Job)=>!['Rejected','Withdrawn','Accepted'].includes(status(a));
export const replied=(a:Job)=>a.events.some(e=>e.type!=='Withdrawn'&&e.state!=='Cancelled');
export const positive=(a:Job)=>a.events.some(e=>['Screening call','Technical assessment','Interview','Offer'].includes(e.type)&&e.state!=='Cancelled');
export const reached=(a:Job,type:string)=>a.events.some(e=>e.type===type&&e.state!=='Cancelled');

export function migrate(raw:any):Job{
 if(!raw||typeof raw.company!=='string'||typeof raw.role!=='string')throw Error('Each application needs a company and role.');
 if(raw.events){
  if(!Array.isArray(raw.events))throw Error('Invalid application timeline.');
  const score=raw.score??null;
  if(score!==null&&(!Number.isFinite(score)||score<0||score>5))throw Error('Scores must be between 0 and 5.');
  const events:Event[]=raw.events.map((e:any)=>{
   if(!e||!types.includes(e.type)||!states.includes(e.state)||typeof e.label!=='string')throw Error('Invalid timeline event.');
   return {id:String(e.id||uid()),type:e.type,label:e.label,date:String(e.date||''),state:normalizeEventState(e.type,e.state),notes:String(e.notes||'')};
  });
  return {
   ...raw,
   id:String(raw.id||uid()),
   company:raw.company,
   role:raw.role,
   url:String(raw.url||''),
   appliedDate:String(raw.appliedDate||''),
   score,
   notes:String(raw.notes||''),
   events,
   nextAction:String(raw.nextAction||''),
   dueDate:String(raw.dueDate||''),
   reason:String(raw.reason||''),
  };
 }
 const notes=String(raw.notes||'');const m=notes.match(/(?<![\d.])([0-5](?:\.\d+)?)\s*\/\s*5(?!\d)/);
 const a:Job={id:String(raw.id||uid()),company:raw.company,role:raw.role,url:raw.url||'',appliedDate:raw.appliedDate||'',score:m?Number(m[1]):null,notes:m?notes.replace(m[0],'').replace(/^\s*<>\s*/,'').replace(/^\s*,\s*/,'').trim():notes,originalNotes:notes,events:[],nextAction:'',dueDate:'',reason:''};
 const add=(type:string,label:string,date:string,state=defaultEventState(type),note='')=>a.events.push({id:uid(),type,label,date,state:normalizeEventState(type,state),notes:note});
 const response=raw.responseDate==='-'?'':raw.responseDate||'';
 if(raw.status==='Rejected')add('Rejected','Application rejected',response);
 if(raw.status==='Offer')add('Offer','Offer received',response);
 if(raw.status==='Interview')add('Update','First response',response);
 if(raw.status==='Interview')add('Interview','Interview stage (date unspecified)','','Planned');
 if(/POSITION FILLED/i.test(notes))a.reason='Position filled';
 return a;
}
export function parseBackup(data:any):Job[]{const arr=Array.isArray(data)?data:data?.applications;if(!Array.isArray(arr)||arr.length>10000)throw Error('Choose a valid application JSON backup.');const rows=arr.map(migrate);if(new Set(rows.map(a=>a.id)).size!==rows.length)throw Error('Backup contains duplicate application IDs.');return rows;}
