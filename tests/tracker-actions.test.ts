import test from 'node:test';
import assert from 'node:assert/strict';
import type {Job} from '../lib/model.ts';
import {appendTimelineEvent,changeTimelineEventType,createTimelineEvent,removeApplication,removeTimelineEvent,upsertApplication} from '../lib/tracker-actions.ts';

const base:Job={id:'job-1',company:'Example',role:'Engineer',url:'',appliedDate:'2026-09-01',score:null,notes:'',nextAction:'',dueDate:'',reason:'',events:[{id:'event-1',type:'Interview',label:'Round 1',date:'2026-09-10',state:'Completed',notes:''}]};

test('changing an event type resets its state to a valid default for the new type',()=>{
  const offer=changeTimelineEventType(base,'event-1','Offer');
  assert.equal(offer.events[0].type,'Offer');
  assert.equal(offer.events[0].state,'Received');

  const update=changeTimelineEventType(offer,'event-1','Update');
  assert.equal(update.events[0].state,'Recorded');
});

test('timeline and application helpers preserve immutable list behavior',()=>{
  const event=createTimelineEvent('Interview','2026-09-20');
  const appended=appendTimelineEvent(base,event);
  assert.equal(base.events.length,1);
  assert.equal(appended.events.length,2);
  assert.equal(removeTimelineEvent(appended,event.id).events.length,1);

  const added=upsertApplication([],base);
  assert.deepEqual(added.map(item=>item.id),['job-1']);
  const changed={...base,role:'Senior Engineer'};
  assert.equal(upsertApplication(added,changed)[0].role,'Senior Engineer');
  assert.deepEqual(removeApplication(added,'job-1'),[]);
});
