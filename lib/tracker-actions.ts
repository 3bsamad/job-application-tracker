import type {Event,Job} from '@/lib/model';
import {defaultEventState,uid} from '@/lib/model';
import {localISODate} from '@/lib/tracker-analytics';

export function createTimelineEvent(type='Interview',date=localISODate()):Event{
  return {id:uid(),type,label:'',date,state:defaultEventState(type),notes:''};
}

export function updateTimelineEvent(job:Job,id:string,key:keyof Event,value:string):Job{
  return {...job,events:job.events.map(event=>event.id===id?{...event,[key]:value}:event)};
}

export function changeTimelineEventType(job:Job,id:string,type:string):Job{
  return {...job,events:job.events.map(event=>event.id===id?{...event,type,state:defaultEventState(type)}:event)};
}

export function appendTimelineEvent(job:Job,event=createTimelineEvent()):Job{
  return {...job,events:[...job.events,event]};
}

export function removeTimelineEvent(job:Job,id:string):Job{
  return {...job,events:job.events.filter(event=>event.id!==id)};
}

export function upsertApplication(jobs:Job[],job:Job):Job[]{
  return jobs.some(item=>item.id===job.id)?jobs.map(item=>item.id===job.id?job:item):[job,...jobs];
}

export function removeApplication(jobs:Job[],id:string):Job[]{
  return jobs.filter(job=>job.id!==id);
}
