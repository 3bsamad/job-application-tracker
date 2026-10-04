'use client';

import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,ArrowUpRight,BriefcaseBusiness,Database,FileText,FolderOpen,MousePointer2,TerminalSquare,TrendingUp,Plus,Search,SlidersHorizontal,X,Check} from 'lucide-react';
import {Job,active,band,ordered,reached,replied,status,uid} from '@/lib/model';
import styles from '../concept.module.css';

export type ConceptVariant='editorial'|'retro'|'brutalist';
type TrackerResponse={applications:Job[];revision:number;error?:string};

const today=()=>new Date().toLocaleDateString('en-CA');
const pct=(a:number,b:number)=>b?Math.round(a/b*100):0;
const fmt=(s:string)=>s?new Date(s+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short'}):'—';

function useTracker(){
  const [jobs,setJobs]=useState<Job[]>([]);
  const [revision,setRevision]=useState(0);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    let mounted=true;
    (async()=>{
      try{
        const r=await fetch('/api/tracker');
        const d=await r.json() as TrackerResponse;
        if(!r.ok)throw new Error(d.error||'Could not load tracker data.');
        if(mounted){setJobs(d.applications);setRevision(d.revision)}
      }catch(e){if(mounted)setError((e as Error).message)}
      finally{if(mounted)setLoading(false)}
    })();
    return()=>{mounted=false};
  },[]);
  async function persist(next:Job[]){
    setSaving(true);setError('');
    try{
      const r=await fetch('/api/tracker',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({applications:next,revision})});
      const d=await r.json() as TrackerResponse;
      if(!r.ok)throw new Error(d.error||'Could not save tracker data.');
      setJobs(d.applications);setRevision(d.revision);return true;
    }catch(e){setError((e as Error).message);return false}
    finally{setSaving(false)}
  }
  return {jobs,loading,error,saving,persist};
}

function useMetrics(jobs:Job[]){
  return useMemo(()=>{
    const total=jobs.length;
    const responses=jobs.filter(replied);
    const activeJobs=jobs.filter(active);
    const interviews=jobs.filter(a=>reached(a,'Interview'));
    const offers=jobs.filter(a=>reached(a,'Offer')||status(a)==='Offer');
    const rejected=jobs.filter(a=>status(a)==='Rejected');
    const rated=jobs.filter(a=>a.score!==null);
    const strong=jobs.filter(a=>a.score!==null&&a.score>=4);
    const month=today().slice(0,7);
    const thisMonth=jobs.filter(a=>a.appliedDate.startsWith(month)).length;
    const followups=jobs.filter(a=>!['Rejected','Withdrawn'].includes(status(a))&&a.nextAction).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));
    const recent=[...jobs].sort((a,b)=>b.appliedDate.localeCompare(a.appliedDate)).slice(0,6);
    const stages=['Applied','In review','Screening call','Technical assessment','Interview','Offer','Rejected','Withdrawn']
      .map(label=>({label,count:jobs.filter(a=>status(a)===label).length}))
      .filter(x=>x.count>0||['Applied','Interview','Offer'].includes(x.label));
    const daily=Array.from({length:14},(_,i)=>{
      const d=new Date(today()+'T12:00:00');
      d.setDate(d.getDate()-13+i);
      const key=d.toLocaleDateString('en-CA');
      return {key,label:d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}),count:jobs.filter(a=>a.appliedDate===key).length};
    });
    const maxDaily=Math.max(1,...daily.map(x=>x.count));
    return {total,responses:responses.length,responseRate:pct(responses.length,total),active:activeJobs.length,interviews:interviews.length,offers:offers.length,rejected:rejected.length,rated:rated.length,strong:strong.length,thisMonth,followups,recent,stages,daily,maxDaily};
  },[jobs]);
}

function ConceptNav({variant}:{variant:ConceptVariant}){
  return <div className={styles.switcher}>
    <Link href="/">Current app</Link><span>Concepts</span>
    <Link className={variant==='editorial'?styles.activeSwitch:''} href="/concept/editorial">01 Editorial</Link>
    <Link className={variant==='retro'?styles.activeSwitch:''} href="/concept/retro-os">02 Career OS</Link>
    <Link className={variant==='brutalist'?styles.activeSwitch:''} href="/concept/brutalist">03 Loud</Link>
  </div>;
}

function Loading({variant,error}:{variant:ConceptVariant;error:string}){
  return <div className={styles.loading}><ConceptNav variant={variant}/><div className={styles.loadingBox}><span>{error?'DATA ERROR':'LOADING APPLICATION DATABASE'}</span><strong>{error||'…'}</strong></div></div>;
}

function HeaderIndex({no,label,tail}:{no:string;label:string;tail:string}){
  return <div className={styles.sectionIndex}><span>{no}</span><span>{label}</span><span>{tail}</span></div>;
}

type EditorialTheme='archive'|'signal'|'night';

function Editorial({jobs}:{jobs:Job[]}){
  const m=useMetrics(jobs);
  const [theme,setTheme]=useState<EditorialTheme>('signal');
  const themeClass=theme==='signal'?styles.themeSignal:theme==='night'?styles.themeNight:styles.themeArchive;
  const themeLabel=theme==='signal'?'SIGNAL EDITION':theme==='night'?'NIGHT PRESS':'ARCHIVE EDITION';
  return <div className={[styles.editorial,themeClass].join(' ')}>
    <ConceptNav variant="editorial"/>

    <div className={styles.editorialMasthead}>
      <span>CAREER INDEX®</span>
      <span>PERSONAL EDITION / 2026</span>
      <span>{m.total.toString().padStart(4,'0')} RECORDS</span>
    </div>

    <header className={styles.editorialHero}>
      <div className={styles.editorialKicker}>
        <div><span className={styles.liveDot}/>LIVE WORKSPACE</div>
        <div className={styles.editorialThemes} aria-label="Editorial visual theme">
          {(['archive','signal','night'] as EditorialTheme[]).map((t,i)=>
            <button key={t} aria-pressed={theme===t} onClick={()=>setTheme(t)}>
              <i>{String(i+1).padStart(2,'0')}</i>
              <span>{t==='archive'?'Archive':t==='signal'?'Signal':'Night'}</span>
            </button>
          )}
        </div>
      </div>

      <div className={styles.editorialTitleRow}>
        <div className={styles.editorialTitleBlock}>
          <span className={styles.issueMark}>ISSUE 04 / {themeLabel}</span>
          <h1>JOB<br/>SEARCH</h1>
          <div className={styles.titleUnderline}><i/><span>TRACK. FOLLOW UP. MOVE.</span></div>
        </div>

        <div className={styles.editorialHeroAside}>
          <p>A living record of applications, conversations and momentum.</p>
          <div className={styles.editorialHeroStats}>
            <div><strong>{m.active}</strong><span>live processes</span></div>
            <div><strong>{m.interviews}</strong><span>interviews</span></div>
            <div><strong>{m.responseRate}%</strong><span>response rate</span></div>
          </div>
          <div className={styles.editorialNextFocus}>
            <div className={styles.nextFocusLabel}><span>NEXT</span><i>{m.followups.length?'01':'—'}</i></div>
            <div className={styles.nextFocusCopy}>
              <strong>{m.followups.length?m.followups[0].nextAction:'Keep the pipeline moving.'}</strong>
              <small>{m.followups.length?m.followups[0].company+' · '+(m.followups[0].dueDate?fmt(m.followups[0].dueDate):'NO DUE DATE'):'No urgent follow-up queued'}</small>
            </div>
            <ArrowRight size={18}/>
          </div>
        </div>
      </div>

      <div className={styles.editorialRibbon}>
        <span>THIS MONTH <b>{m.thisMonth}</b></span>
        <span>STRONG FITS <b>{m.strong}</b></span>
        <span>OFFERS <b>{m.offers}</b></span>
        <span>REJECTED <b>{m.rejected}</b></span>
      </div>
    </header>

    <main className={styles.editorialGrid}>
      <section className={styles.editorialActivity}>
        <HeaderIndex no="01" label="APPLICATION ACTIVITY" tail="LAST 14 DAYS"/>
        <div className={styles.editorialChart}>
          {m.daily.map((d,i)=><div key={d.key} className={styles.editorialBarCol}>
            <div className={styles.editorialBarRail}><i style={{height:Math.max(4,d.count/m.maxDaily*100)+'%'}}/></div>
            <small>{[0,4,9,13].includes(i)?d.label:''}</small>
          </div>)}
        </div>
        <div className={styles.chartCaption}>
          <span>APPLICATION VELOCITY</span>
          <strong>{m.thisMonth} sent this month</strong>
        </div>
      </section>

      <section className={styles.editorialStages}>
        <HeaderIndex no="02" label="CURRENT STAGES" tail="STATUS INDEX"/>
        <div className={styles.stageLedger}>{m.stages.map((s,i)=><div key={s.label}>
          <span>{String(i+1).padStart(2,'0')}</span>
          <strong>{s.label}</strong>
          <i style={{width:Math.max(10,s.count/Math.max(1,...m.stages.map(x=>x.count))*100)+'%'}}/>
          <b>{String(s.count).padStart(2,'0')}</b>
        </div>)}</div>
      </section>

      <section className={styles.editorialRecent}>
        <HeaderIndex no="03" label="RECENT APPLICATIONS" tail="LIVE ARCHIVE"/>
        <div className={styles.editorialList}>{m.recent.map((a,i)=><article key={a.id}>
          <span>{String(i+1).padStart(2,'0')}</span>
          <div><strong>{a.company}</strong><p>{a.role}</p></div>
          <b>{a.score===null?'—':a.score.toFixed(1)}</b>
          <em data-status={status(a)}>{status(a)}</em>
          <time>{fmt(a.appliedDate)}</time>
          {a.url&&<a href={a.url} target="_blank" rel="noreferrer" aria-label={'Open '+a.company}><ArrowUpRight size={16}/></a>}
        </article>)}</div>
      </section>

      <section className={styles.editorialActions}>
        <HeaderIndex no="04" label="NEXT ACTIONS" tail={m.followups.length.toString().padStart(2,'0')+' OPEN'}/>
        <div className={styles.editorialActionStack}>{m.followups.slice(0,5).map((a,i)=><article key={a.id}>
          <span>{String(i+1).padStart(2,'0')}</span>
          <div><strong>{a.nextAction}</strong><p>{a.company} · {a.role}</p></div>
          <time>{a.dueDate?fmt(a.dueDate):'NO DATE'}</time>
        </article>)}{!m.followups.length&&<p>No follow-ups queued.</p>}</div>
        <div className={styles.actionFooter}><span>QUEUE / {String(m.followups.length).padStart(2,'0')}</span><ArrowRight size={14}/></div>
      </section>
    </main>

    <footer className={styles.editorialFooter}>
      <span>CAREER TRACKER / CONCEPT 01</span>
      <span>{themeLabel}</span>
      <span>EDITORIAL SYSTEM</span>
    </footer>
  </div>;
}

function Window({title,children,className=''}:{title:string;children:React.ReactNode;className?:string}){
  return <section className={[styles.osWindow,className].join(' ')}><div className={styles.osTitlebar}><span>□</span><strong>{title}</strong><div><i/><i/><i/></div></div><div className={styles.osBody}>{children}</div></section>;
}

function Retro({jobs}:{jobs:Job[]}){
  const m=useMetrics(jobs);
  return <div className={styles.retro}>
    <ConceptNav variant="retro"/>
    <div className={styles.osMenu}><div><span className={styles.pixelLogo}>◈</span><b>CAREER_OS</b><span>File</span><span>View</span><span>Process</span><span>Help</span></div><div><span>DATA: ONLINE</span><span>SESSION 2026</span></div></div>
    <main className={styles.desktop}>
      <aside className={styles.desktopIcons}><div><span><Database size={24}/></span><small>Applications</small></div><div><span><FolderOpen size={24}/></span><small>Pipeline</small></div><div><span><FileText size={24}/></span><small>Reports</small></div></aside>
      <Window title="APPLICATION_DATABASE.db" className={styles.osDatabase}>
        <div className={styles.osHero}><div><span>RECORD COUNT</span><strong>{String(m.total).padStart(4,'0')}</strong></div><div className={styles.osMiniStats}><p><b>{String(m.active).padStart(2,'0')}</b><span>ACTIVE</span></p><p><b>{String(m.interviews).padStart(2,'0')}</b><span>INTERVIEWS</span></p><p><b>{String(m.offers).padStart(2,'0')}</b><span>OFFERS</span></p><p><b>{m.responseRate}%</b><span>RESPONSE</span></p></div></div>
        <div className={styles.osStatusLine}><span>READY</span><span>{m.thisMonth} ADDED THIS MONTH</span></div>
      </Window>
      <Window title="PROCESS_MONITOR.exe" className={styles.osMonitor}>
        <div className={styles.monitorHead}><TerminalSquare size={15}/><span>STAGE PROCESS TABLE</span></div>
        {m.stages.map(s=><div className={styles.monitorRow} key={s.label}><span/><strong>{s.label}</strong><div><i style={{width:Math.max(5,s.count/Math.max(1,m.total)*100)+'%'}}/></div><b>{s.count}</b></div>)}
      </Window>
      <Window title="NEXT_ACTIONS.todo" className={styles.osActions}>
        <div className={styles.todoToolbar}><button>☑ ALL</button><button>⚑ PRIORITY</button><span>{m.followups.length} ITEMS</span></div>
        {m.followups.slice(0,6).map(a=><div className={styles.todoRow} key={a.id}><span/><div><strong>{a.nextAction}</strong><small>{a.company} / {a.role}</small></div><time>{a.dueDate?fmt(a.dueDate):'-- ---'}</time></div>)}
        {!m.followups.length&&<div className={styles.osEmpty}>NO PENDING ACTIONS</div>}
      </Window>
      <Window title="RECENT_FILES" className={styles.osRecent}>
        <div className={styles.fileListHead}><span>NAME</span><span>FIT</span><span>STATE</span><span>DATE</span></div>
        {m.recent.map(a=><div className={styles.fileRow} key={a.id}><span><BriefcaseBusiness size={14}/><div><strong>{a.company}</strong><small>{a.role}</small></div></span><b>{a.score===null?'--':a.score.toFixed(1)}</b><em>{status(a).toUpperCase()}</em><time>{fmt(a.appliedDate)}</time></div>)}
      </Window>
      <div className={styles.osCursor}><MousePointer2 size={28}/></div>
    </main>
    <div className={styles.osTaskbar}><button>▣ START</button><span>career_tracker.exe</span><span>database.db</span><strong>● ONLINE</strong></div>
  </div>;
}

function Brutalist({jobs}:{jobs:Job[]}){
  const m=useMetrics(jobs);
  return <div className={styles.brutalist}>
    <ConceptNav variant="brutalist"/>
    <header className={styles.brutalHero}>
      <div className={styles.brutalTopline}><span>JOB APPLICATION TRACKER</span><span>NO. {String(m.total).padStart(3,'0')}</span></div>
      <div className={styles.brutalHeroGrid}>
        <div className={styles.brutalMainNumber}><span>YOU HAVE</span><strong>{m.total}</strong><b>APPLICATIONS<br/>ON THE BOARD.</b></div>
        <div className={styles.brutalSticker}>AND<br/><strong>{m.active}</strong><br/>ARE STILL<br/>ALIVE ↑</div>
        <div className={styles.brutalResponse}><span>RESPONSE RATE</span><strong>{m.responseRate}%</strong><div style={{width:m.responseRate+'%'}}/></div>
      </div>
      <div className={styles.marquee}><div>KEEP APPLYING ✦ FOLLOW UP ✦ PREP THE INTERVIEW ✦ TRACK EVERYTHING ✦ KEEP APPLYING ✦ FOLLOW UP ✦ PREP THE INTERVIEW ✦ TRACK EVERYTHING ✦</div></div>
    </header>
    <main className={styles.brutalGrid}>
      <section className={styles.brutalYellow}><span className={styles.brutalLabel}>01 / SCOREBOARD</span><div className={styles.scoreboard}><div><b>{m.thisMonth}</b><span>THIS MONTH</span></div><div><b>{m.responses}</b><span>REPLIES</span></div><div><b>{m.interviews}</b><span>INTERVIEWS</span></div><div><b>{m.offers}</b><span>OFFERS</span></div></div></section>
      <section className={styles.brutalPink}><span className={styles.brutalLabel}>02 / STATUS</span><div className={styles.brutalStages}>{m.stages.map((s,i)=><div key={s.label}><span>{String(i+1).padStart(2,'0')}</span><strong>{s.label}</strong><b>{s.count}</b></div>)}</div></section>
      <section className={styles.brutalRecent}><div className={styles.brutalSectionHead}><span>03 / RECENT</span><b>WHAT DID YOU APPLY TO?</b></div>{m.recent.map((a,i)=><article key={a.id}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{a.company}</strong><p>{a.role}</p></div><em>{status(a)}</em><b>{a.score===null?'N/A':a.score.toFixed(1)}</b>{a.url?<a href={a.url} target="_blank" rel="noreferrer"><ArrowUpRight size={20}/></a>:<ArrowRight size={20}/>}</article>)}</section>
      <section className={styles.brutalNext}><div className={styles.brutalSectionHead}><span>04 / NEXT</span><b>DO THE THING.</b></div>{m.followups.slice(0,5).map((a,i)=><article key={a.id}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{a.nextAction}</strong><p>{a.company}</p></div><time>{a.dueDate?fmt(a.dueDate):'NO DATE'}</time></article>)}{!m.followups.length&&<p>NOTHING QUEUED. SUSPICIOUSLY PEACEFUL.</p>}</section>
      <section className={styles.brutalChartBlock}><span className={styles.brutalLabel}>05 / 14-DAY OUTPUT</span><div className={styles.brutalChart}>{m.daily.map(d=><div key={d.key}><i style={{height:Math.max(3,d.count/m.maxDaily*100)+'%'}}/><span>{d.count}</span></div>)}</div><div className={styles.brutalChartCaption}><span>{m.daily[0]?.label}</span><b>APPLICATION VELOCITY</b><span>{m.daily.at(-1)?.label}</span></div></section>
      <section className={styles.brutalBlue}><TrendingUp size={32}/><span>STRONG FITS</span><strong>{m.strong}</strong><p>{m.rated?pct(m.strong,m.rated)+'% OF RATED APPLICATIONS ARE 4.0+':'NO RATED APPLICATIONS YET'}</p></section>
    </main>
    <footer className={styles.brutalFooter}><span>CAREER TRACKER / CONCEPT 03</span><span>LOUD, USEFUL, UNAPOLOGETIC.</span></footer>
  </div>;
}

export default function ConceptDashboard({variant}:{variant:ConceptVariant}){
  const {jobs,loading,error}=useTracker();
  if(loading||error)return <Loading variant={variant} error={error}/>;
  if(variant==='editorial')return <Editorial jobs={jobs}/>;
  if(variant==='retro')return <Retro jobs={jobs}/>;
  return <Brutalist jobs={jobs}/>;
}
