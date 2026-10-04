'use client';

import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import ConceptDashboard from './concept/_components/ConceptDashboard';

type StyleKey='editorial'|'studio'|'retro'|'brutalist';

export default function HomePage(){
  const router=useRouter();
  const [ready,setReady]=useState(false);

  useEffect(()=>{
    let style:StyleKey='editorial';
    try{
      const saved=localStorage.getItem('career-tracker-style');
      if(saved==='studio'||saved==='retro'||saved==='brutalist'||saved==='editorial')style=saved;
    }catch{}
    if(style==='studio'){router.replace('/studio');return}
    if(style==='retro'){router.replace('/concept/retro-os');return}
    if(style==='brutalist'){router.replace('/concept/brutalist');return}
    try{localStorage.setItem('career-tracker-style','editorial')}catch{}
    setReady(true);
  },[router]);

  if(!ready)return <div style={{minHeight:'100vh',background:'#f1e7d8'}} aria-busy="true"/>;
  return <ConceptDashboard variant="editorial"/>;
}
