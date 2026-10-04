import type {Job} from '@/lib/model';
import {band,ordered,status} from '@/lib/model';
import {localISODate} from '@/lib/tracker-analytics';

const csvCell=(value:unknown)=>'"'+String(value??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';

export function backupJSON(jobs:Job[]){
  return JSON.stringify({version:2,exportedAt:new Date().toISOString(),applications:jobs},null,2);
}

export function simpleCSV(jobs:Job[]){
  const rows=[
    ['Company','Role','Applied','Current stage','Fit score','Next action','Due date','Notes'],
    ...jobs.map(job=>[job.company,job.role,job.appliedDate,status(job),job.score??'',job.nextAction,job.dueDate,job.notes]),
  ];
  return rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}

export function detailedCSV(jobs:Job[]){
  const rows=[
    ['Company','Role','Applied','Current stage','Fit score','Fit band','First response','Next action','Due date','Rejection reason','Notes','Timeline'],
    ...jobs.map(job=>[
      job.company,job.role,job.appliedDate,status(job),job.score??'',band(job.score),
      ordered(job).find(event=>event.type!=='Withdrawn'&&event.state!=='Cancelled')?.date||'',
      job.nextAction,job.dueDate,job.reason,job.notes,JSON.stringify(job.events),
    ]),
  ];
  return rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}

export function downloadText(data:string,name:string,type='application/json'){
  const url=URL.createObjectURL(new Blob([data],{type}));
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download=name;
  anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export const backupFilename=()=>`job_tracker_backup_${localISODate()}.json`;
