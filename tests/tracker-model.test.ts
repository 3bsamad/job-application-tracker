import test from 'node:test';
import assert from 'node:assert/strict';
import {active,defaultEventState,eventStateOptions,migrate,parseBackup,reached,replied,status} from '../lib/model.ts';

const base=(event:any)=>({
  id:'job-1',company:'Example',role:'Engineer',url:'',appliedDate:'2026-09-01',score:4.2,notes:'',nextAction:'',dueDate:'',reason:'',events:[event],
});

test('legacy terminal events do not become active when their old generic state was Cancelled',()=>{
  const rejected=migrate(base({id:'e1',type:'Rejected',label:'Rejected',date:'2026-09-10',state:'Cancelled',notes:''}));
  const withdrawn=migrate(base({id:'e2',type:'Withdrawn',label:'Withdrawn',date:'2026-09-11',state:'Cancelled',notes:''}));
  assert.equal(rejected.events[0].state,'Recorded');
  assert.equal(status(rejected),'Rejected');
  assert.equal(withdrawn.events[0].state,'Recorded');
  assert.equal(status(withdrawn),'Withdrawn');
});

test('a legacy cancelled offer is migrated as a rescinded offer and closes the application',()=>{
  const job=migrate(base({id:'e3',type:'Offer',label:'Offer',date:'2026-09-12',state:'Cancelled',notes:''}));
  assert.equal(job.events[0].state,'Rescinded');
  assert.equal(status(job),'Rejected');
  assert.equal(active(job),false);
  assert.equal(reached(job,'Offer'),true);
});

test('process states distinguish planned, scheduled, completed, passed and unsuccessful',()=>{
  assert.deepEqual(eventStateOptions('Interview'),['Planned','Scheduled','Completed','Passed','Unsuccessful','Cancelled']);
  assert.equal(defaultEventState('Interview'),'Scheduled');
  for(const state of ['Planned','Scheduled','Completed','Passed']){
    const job=migrate(base({id:'p-'+state,type:'Interview',label:'Round 1',date:'2026-09-10',state,notes:''}));
    assert.equal(status(job),'Interview');
    assert.equal(active(job),true);
  }
  const unsuccessful=migrate(base({id:'p-fail',type:'Interview',label:'Round 1',date:'2026-09-10',state:'Unsuccessful',notes:''}));
  assert.equal(status(unsuccessful),'Rejected');
  assert.equal(reached(unsuccessful,'Interview'),true);
});

test('informational updates have no process state but count as a reply',()=>{
  const job=migrate(base({id:'u1',type:'Update',label:'Hiring manager reviewing',date:'2026-09-05',state:'Passed',notes:''}));
  assert.equal(job.events[0].state,'Recorded');
  assert.equal(eventStateOptions('Update').length,0);
  assert.equal(status(job),'In review');
  assert.equal(replied(job),true);
});

test('offer outcomes derive the final application stage',()=>{
  const expected={Received:'Offer',Accepted:'Accepted',Declined:'Withdrawn',Rescinded:'Rejected'} as const;
  for(const [state,result] of Object.entries(expected)){
    const job=migrate(base({id:'o-'+state,type:'Offer',label:'Offer',date:'2026-09-20',state,notes:''}));
    assert.equal(status(job),result);
    assert.equal(active(job),state==='Received');
    assert.equal(reached(job,'Offer'),true);
  }
});

test('legacy pending process state migrates to Planned',()=>{
  const job=migrate(base({id:'pending',type:'Interview',label:'Onsite interview',date:'',state:'Pending',notes:''}));
  assert.equal(job.events[0].state,'Planned');
  assert.equal(status(job),'Interview');
});

test('backup validation rejects duplicate ids',()=>{
  const raw=base({id:'u1',type:'Update',label:'Update',date:'2026-09-05',state:'Recorded',notes:''});
  assert.throws(()=>parseBackup({applications:[raw,{...raw}]}),/duplicate application IDs/i);
});
