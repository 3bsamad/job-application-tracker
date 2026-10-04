import test from 'node:test';
import assert from 'node:assert/strict';
import {active,migrate,reached,status} from '../lib/model.ts';

const base=(event:any)=>({
  id:'job-1',
  company:'Example',
  role:'Engineer',
  url:'',
  appliedDate:'2026-09-01',
  score:4.2,
  notes:'',
  nextAction:'',
  dueDate:'',
  reason:'',
  events:[event],
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
