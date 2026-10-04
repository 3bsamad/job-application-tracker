import type {Job} from '@/lib/model';
import {active,reached,replied,status} from '@/lib/model';

export const localISODate=()=>new Date().toLocaleDateString('en-CA');
export const percentNumber=(value:number,total:number)=>total?Math.round(value/total*100):0;

export function buildTrackerAnalytics(jobs:Job[],dailyWindow=14){
  const today=localISODate();
  const total=jobs.length;
  const responsesJobs=jobs.filter(replied);
  const activeJobs=jobs.filter(active);
  const interviewsJobs=jobs.filter(a=>reached(a,'Interview'));
  const offersJobs=jobs.filter(a=>reached(a,'Offer')||status(a)==='Offer'||status(a)==='Accepted');
  const rejectedJobs=jobs.filter(a=>status(a)==='Rejected');
  const withdrawnJobs=jobs.filter(a=>status(a)==='Withdrawn');
  const acceptedJobs=jobs.filter(a=>status(a)==='Accepted');
  const ratedJobs=jobs.filter(a=>a.score!==null);
  const strongJobs=jobs.filter(a=>a.score!==null&&a.score>=4);
  const screeningJobs=jobs.filter(a=>reached(a,'Screening call'));
  const assessmentJobs=jobs.filter(a=>reached(a,'Technical assessment'));
  const month=today.slice(0,7);
  const thisMonth=jobs.filter(a=>a.appliedDate.startsWith(month)).length;
  const dated=jobs.map(a=>a.appliedDate).filter(Boolean).sort();
  const earliest=dated[0]||'';
  const latest=dated.at(-1)||'';
  const elapsedDays=earliest?Math.max(1,Math.floor((Date.parse(today+'T12:00:00')-Date.parse(earliest+'T12:00:00'))/86400000)+1):0;
  const dailyAverage=elapsedDays?(jobs.filter(a=>a.appliedDate&&a.appliedDate<=today).length/elapsedDays).toFixed(1):'—';
  const followups=jobs.filter(a=>active(a)&&a.nextAction).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));
  const recent=[...jobs].sort((a,b)=>b.appliedDate.localeCompare(a.appliedDate)).slice(0,6);
  const stages=['Applied','In review','Screening call','Technical assessment','Interview','Offer','Accepted','Rejected','Withdrawn']
    .map(label=>({label,count:jobs.filter(a=>status(a)===label).length}))
    .filter(item=>item.count>0||['Applied','Interview','Offer'].includes(item.label));
  const daily=Array.from({length:dailyWindow},(_,index)=>{
    const date=new Date(today+'T12:00:00');
    date.setDate(date.getDate()-(dailyWindow-1)+index);
    const key=date.toLocaleDateString('en-CA');
    return {key,label:date.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}),count:jobs.filter(a=>a.appliedDate===key).length};
  });
  const maxDaily=Math.max(1,...daily.map(item=>item.count));

  return {
    total,
    responsesJobs,
    responses:responsesJobs.length,
    responseRate:percentNumber(responsesJobs.length,total),
    activeJobs,
    active:activeJobs.length,
    interviewsJobs,
    interviews:interviewsJobs.length,
    offersJobs,
    offers:offersJobs.length,
    rejectedJobs,
    rejected:rejectedJobs.length,
    withdrawnJobs,
    withdrawn:withdrawnJobs.length,
    acceptedJobs,
    accepted:acceptedJobs.length,
    ratedJobs,
    rated:ratedJobs.length,
    strongJobs,
    strong:strongJobs.length,
    screeningJobs,
    screening:screeningJobs.length,
    assessmentJobs,
    assessments:assessmentJobs.length,
    rejectedAfterInterview:rejectedJobs.filter(a=>reached(a,'Interview')).length,
    withdrawnAfterInterview:withdrawnJobs.filter(a=>reached(a,'Interview')).length,
    rejectedAfterAssessment:rejectedJobs.filter(a=>reached(a,'Technical assessment')&&!reached(a,'Interview')).length,
    withdrawnAfterAssessment:withdrawnJobs.filter(a=>reached(a,'Technical assessment')&&!reached(a,'Interview')).length,
    thisMonth,
    earliest,
    latest,
    dailyAverage,
    followups,
    recent,
    stages,
    daily,
    maxDaily,
  };
}
