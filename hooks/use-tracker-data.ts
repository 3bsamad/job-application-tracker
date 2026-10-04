'use client';

import {useCallback,useEffect,useState} from 'react';
import type {Job} from '@/lib/model';

type TrackerResponse={applications:Job[];revision:number;error?:string};

export function useTrackerData({optimistic=false}:{optimistic?:boolean}={}){
  const [jobs,setJobs]=useState<Job[]>([]);
  const [revision,setRevision]=useState(0);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [dirty,setDirty]=useState(false);

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const response=await fetch('/api/tracker');
      const data=await response.json() as TrackerResponse;
      if(!response.ok)throw new Error(data.error||'Could not load tracker data.');
      setJobs(data.applications);
      setRevision(data.revision);
      setError('');
      setDirty(false);
    }catch(error){
      setError((error as Error).message);
    }finally{
      setLoading(false);
    }
  },[]);

  useEffect(()=>{void load()},[load]);

  useEffect(()=>{
    if(!dirty)return;
    const beforeUnload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''};
    window.addEventListener('beforeunload',beforeUnload);
    return()=>window.removeEventListener('beforeunload',beforeUnload);
  },[dirty]);

  const persist=useCallback(async(next:Job[])=>{
    if(optimistic){setJobs(next);setDirty(true)}
    setSaving(true);
    setError('');
    try{
      const response=await fetch('/api/tracker',{
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({applications:next,revision}),
      });
      const data=await response.json() as TrackerResponse;
      if(!response.ok)throw new Error(data.error||'Could not save tracker data.');
      if(!optimistic)setJobs(next);
      setRevision(data.revision);
      setDirty(false);
      return true;
    }catch(error){
      setError((error as Error).message);
      return false;
    }finally{
      setSaving(false);
    }
  },[optimistic,revision]);

  return {jobs,revision,loading,saving,error,dirty,load,persist};
}
