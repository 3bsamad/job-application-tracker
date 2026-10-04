import test from 'node:test';
import assert from 'node:assert/strict';
import type {Job,Event} from '../lib/model.ts';
import {buildTrackerAnalytics,localISODate} from '../lib/tracker-analytics.ts';

const ev=(id:string,type:string,state:string,date='2026-09-15'):Event=>({id,type,label:type,date,state,notes:''});
const job=(id:string,events:Event[],nextAction='',dueDate=''):Job=>({id,company:id,role:'Engineer',url:'',appliedDate:'2026-09-01',score:4.1,notes:'',events,nextAction,dueDate,reason:''});

test('historical reach survives terminal outcomes and exit points are separated',()=>{
  const jobs=[
    job('rejected-after-interview',[ev('a1','Interview','Completed'),ev('a2','Rejected','Recorded','2026-09-20')]),
    job('withdrawn-after-interview',[ev('b1','Interview','Passed'),ev('b2','Withdrawn','Recorded','2026-09-21')]),
    job('rejected-after-assessment',[ev('c1','Technical assessment','Completed'),ev('c2','Rejected','Recorded','2026-09-19')]),
    job('active-screening',[ev('d1','Screening call','Scheduled')],'Prepare call','2026-10-07'),
    job('accepted-offer',[ev('e1','Interview','Passed'),ev('e2','Offer','Accepted','2026-09-25')]),
  ];
  const analytics=buildTrackerAnalytics(jobs,14);

  assert.equal(analytics.total,5);
  assert.equal(analytics.active,1);
  assert.equal(analytics.interviews,3);
  assert.equal(analytics.assessments,1);
  assert.equal(analytics.screening,1);
  assert.equal(analytics.offers,1);
  assert.equal(analytics.rejected,2);
  assert.equal(analytics.withdrawn,1);
  assert.equal(analytics.accepted,1);
  assert.equal(analytics.rejectedAfterInterview,1);
  assert.equal(analytics.withdrawnAfterInterview,1);
  assert.equal(analytics.rejectedAfterAssessment,1);
  assert.equal(analytics.withdrawnAfterAssessment,0);
  assert.deepEqual(analytics.followups.map(item=>item.id),['active-screening']);
});

test('date summary uses earliest and latest application dates',()=>{
  const today=localISODate();
  const jobs=[job('old',[]),job('new',[])];
  jobs[0].appliedDate='2026-08-01';
  jobs[1].appliedDate=today;

  const analytics=buildTrackerAnalytics(jobs,7);
  assert.equal(analytics.earliest,'2026-08-01');
  assert.equal(analytics.latest,today);
  assert.equal(analytics.daily.length,7);
});
