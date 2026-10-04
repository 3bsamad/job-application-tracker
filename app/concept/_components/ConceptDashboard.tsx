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
type EditorialView='overview'|'applications'|'pipeline'|'statistics';

function Editorial({jobs,persist,saving}:{jobs:Job[];persist:(next:Job[])=>Promise<boolean>;saving:boolean}){
  const m=useMetrics(jobs);
  const [theme,setTheme]=useState<EditorialTheme>('signal');
  const [view,setView]=useState<EditorialView>('overview');
  const [query,setQuery]=useState('');
  const [selected,setSelected]=useState<Job|null>(null);
  const [adding,setAdding]=useState(false);
  const [draft,setDraft]=useState({company:'',role:'',score:'',url:'',nextAction:'',dueDate:''});
  const themeClass=theme==='signal'?styles.themeSignal:theme==='night'?styles.themeNight:styles.themeArchive;
  const themeLabel=theme==='signal'?'SIGNAL EDITION':theme==='night'?'NIGHT PRESS':'ARCHIVE EDITION';
  const filtered=jobs.filter(a=>(a.company+' '+a.role+' '+a.notes+' '+a.nextAction).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>b.appliedDate.localeCompare(a.appliedDate));
  const byStage=m.stages.map(s=>({stage:s.label,jobs:jobs.filter(a=>status(a)===s.label).sort((a,b)=>b.appliedDate.localeCompare(a.appliedDate))}));
  const fitGroups=[
    {label:'Exceptional',range:'4.5–5.0',count:jobs.filter(a=>a.score!==null&&a.score>=4.5).length},
    {label:'Good',range:'4.0–4.4',count:jobs.filter(a=>a.score!==null&&a.score>=4&&a.score<4.5).length},
    {label:'Okay',range:'3.0–3.9',count:jobs.filter(a=>a.score!==null&&a.score>=3&&a.score<4).length},
    {label:'Low',range:'< 3.0',count:jobs.filter(a=>a.score!==null&&a.score<3).length},
  ];
  async function addApplication(e:React.FormEvent){
    e.preventDefault();
    const score=draft.score===''?null:Number(draft.score);
    const job:Job={id:uid(),company:draft.company.trim(),role:draft.role.trim(),url:draft.url.trim(),appliedDate:today(),score:Number.isFinite(score as number)?score:null,notes:'',events:[],nextAction:draft.nextAction.trim(),dueDate:draft.dueDate,reason:''};
    if(!job.company||!job.role)return;
    if(await persist([job,...jobs])){setAdding(false);setDraft({company:'',role:'',score:'',url:'',nextAction:'',dueDate:''})}
  }
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
        <nav className={styles.editorialWorkspaceNav} aria-label="Editorial workspace">
          {([['overview','Overview'],['applications','Applications'],['pipeline','Pipeline'],['statistics','Statistics']] as [EditorialView,string][]).map(([key,label],i)=>
            <button key={key} aria-current={view===key?'page':undefined} onClick={()=>setView(key)}><i>{String(i+1).padStart(2,'0')}</i>{label}</button>
          )}
        </nav>
        <div className={styles.editorialThemes} aria-label="Editorial visual theme">
          {(['archive','signal','night'] as EditorialTheme[]).map((t,i)=>
            <button key={t} aria-pressed={theme===t} onClick={()=>setTheme(t)} title={t+' theme'}>
              <i>{String(i+1).padStart(2,'0')}</i><span>{t==='archive'?'Archive':t==='signal'?'Signal':'Night'}</span>
            </button>
          )}
        </div>
      </div>

      <div className={styles.editorialTitleRow}>
        <div className={styles.editorialTitleBlock}>
          <span className={styles.issueMark}>ISSUE 04 / {themeLabel}</span>
          <h1>{view==='overview'?<>JOB<br/>SEARCH</>:view==='applications'?<>THE<br/>ARCHIVE</>:view==='pipeline'?<>LIVE<br/>PROCESS</>:<>SEARCH<br/>SIGNALS</>}</h1>
          <div className={styles.titleUnderline}><i/><span>{view==='overview'?'TRACK. FOLLOW UP. MOVE.':view==='applications'?'EVERY ROLE. ONE INDEX.':view==='pipeline'?'WHAT IS STILL MOVING.':'READ THE PATTERN.'}</span></div>
        </div>

        <div className={styles.editorialHeroAside}>
          <p>{view==='overview'?'A living record of applications, conversations and momentum.':view==='applications'?'Your complete application archive, ordered for fast scanning.':view==='pipeline'?'A stage-by-stage view of the conversations still in motion.':'A compact read on response, fit and conversion.'}</p>
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

    {view==='overview'&&<main className={styles.editorialGrid}>
      <section className={styles.editorialActivity}>
        <HeaderIndex no="01" label="APPLICATION ACTIVITY" tail="LAST 14 DAYS"/>
        <div className={styles.editorialChart}>{m.daily.map((d,i)=><div key={d.key} className={styles.editorialBarCol}><div className={styles.editorialBarRail}><i style={{height:Math.max(4,d.count/m.maxDaily*100)+'%'}}/></div><small>{[0,4,9,13].includes(i)?d.label:''}</small></div>)}</div>
        <div className={styles.chartCaption}><span>APPLICATION VELOCITY</span><strong>{m.thisMonth} sent this month</strong></div>
      </section>
      <section className={styles.editorialStages}>
        <HeaderIndex no="02" label="CURRENT STAGES" tail="STATUS INDEX"/>
        <div className={styles.stageLedger}>{m.stages.map((s,i)=><button key={s.label} onClick={()=>setView('pipeline')}><span>{String(i+1).padStart(2,'0')}</span><strong>{s.label}</strong><i style={{width:Math.max(10,s.count/Math.max(1,...m.stages.map(x=>x.count))*100)+'%'}}/><b>{String(s.count).padStart(2,'0')}</b></button>)}</div>
      </section>
      <section className={styles.editorialRecent}>
        <HeaderIndex no="03" label="RECENT APPLICATIONS" tail="LIVE ARCHIVE"/>
        <div className={styles.editorialList}>{m.recent.map((a,i)=><button key={a.id} onClick={()=>setSelected(a)}>
          <span>{String(i+1).padStart(2,'0')}</span><div><strong>{a.company}</strong><p>{a.role}</p></div><b>{a.score===null?'—':a.score.toFixed(1)}</b><em>{status(a)}</em><time>{fmt(a.appliedDate)}</time><ArrowUpRight size={15}/>
        </button>)}</div>
        <button className={styles.moduleLink} onClick={()=>setView('applications')}>OPEN FULL ARCHIVE <ArrowRight size={14}/></button>
      </section>
      <section className={styles.editorialActions}>
        <HeaderIndex no="04" label="NEXT ACTIONS" tail={m.followups.length.toString().padStart(2,'0')+' OPEN'}/>
        <div className={styles.editorialActionStack}>{m.followups.slice(0,5).map((a,i)=><button key={a.id} onClick={()=>setSelected(a)}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{a.nextAction}</strong><p>{a.company} · {a.role}</p></div><time>{a.dueDate?fmt(a.dueDate):'NO DATE'}</time></button>)}{!m.followups.length&&<p>No follow-ups queued.</p>}</div>
        <div className={styles.actionFooter}><span>QUEUE / {String(m.followups.length).padStart(2,'0')}</span><ArrowRight size={14}/></div>
      </section>
    </main>}

    {view==='applications'&&<main className={styles.editorialWorkspace}>
      <div className={styles.workspaceToolbar}>
        <label className={styles.editorialSearch}><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search company, role, notes…"/></label>
        <span>{filtered.length} / {m.total} RECORDS</span>
        <button className={styles.editorialPrimary} onClick={()=>setAdding(true)}><Plus size={14}/> ADD APPLICATION</button>
      </div>
      <section className={styles.archiveTable}>
        <div className={styles.archiveHead}><span>NO.</span><span>COMPANY / ROLE</span><span>FIT</span><span>STAGE</span><span>APPLIED</span><span>NEXT</span></div>
        {filtered.map((a,i)=><button key={a.id} className={styles.archiveRow} onClick={()=>setSelected(a)}>
          <span>{String(i+1).padStart(3,'0')}</span><span><strong>{a.company}</strong><small>{a.role}</small></span><b>{a.score===null?'—':a.score.toFixed(1)}</b><em>{status(a)}</em><time>{fmt(a.appliedDate)}</time><span><small>{a.nextAction||'Awaiting response'}</small><ArrowRight size={14}/></span>
        </button>)}
      </section>
    </main>}

    {view==='pipeline'&&<main className={styles.editorialWorkspace}>
      <div className={styles.pipelineIntro}><span>ACTIVE / {m.active}</span><p>Each column is a current stage, not a historical funnel. Open a card to inspect the full recorded process.</p></div>
      <div className={styles.pipelineBoard}>
        {byStage.filter(g=>g.jobs.length||['Applied','Interview','Offer'].includes(g.stage)).map((g,i)=><section key={g.stage} className={styles.pipelineColumn}>
          <div className={styles.pipelineColumnHead}><span>{String(i+1).padStart(2,'0')}</span><strong>{g.stage}</strong><b>{g.jobs.length}</b></div>
          <div>{g.jobs.slice(0,8).map(a=><button key={a.id} className={styles.pipelineCard} onClick={()=>setSelected(a)}><strong>{a.company}</strong><span>{a.role}</span><footer><em>{a.score===null?'UNRATED':a.score.toFixed(1)+' / 5'}</em><time>{fmt(a.appliedDate)}</time></footer></button>)}</div>
        </section>)}
      </div>
    </main>}

    {view==='statistics'&&<main className={styles.editorialWorkspace}>
      <div className={styles.statisticsGrid}>
        <section className={styles.bigStat}><span>RESPONSE RATE</span><strong>{m.responseRate}%</strong><p>{m.responses} replies from {m.total} applications.</p><i style={{width:m.responseRate+'%'}}/></section>
        <section className={styles.bigStat}><span>INTERVIEW REACH</span><strong>{pct(m.interviews,m.total)}%</strong><p>{m.interviews} applications reached interview.</p><i style={{width:pct(m.interviews,m.total)+'%'}}/></section>
        <section className={styles.statPanel}><HeaderIndex no="01" label="FIT DISTRIBUTION" tail={m.rated+' RATED'}/><div className={styles.fitLedger}>{fitGroups.map(g=><div key={g.label}><span>{g.label}<small>{g.range}</small></span><i style={{width:Math.max(4,g.count/Math.max(1,m.rated)*100)+'%'}}/><b>{g.count}</b></div>)}</div></section>
        <section className={styles.statPanel}><HeaderIndex no="02" label="OUTCOMES" tail="CURRENT"/><div className={styles.outcomeNumbers}><div><strong>{m.active}</strong><span>ACTIVE</span></div><div><strong>{m.rejected}</strong><span>REJECTED</span></div><div><strong>{m.offers}</strong><span>OFFERS</span></div><div><strong>{m.strong}</strong><span>4.0+ FIT</span></div></div></section>
      </div>
    </main>}

    <footer className={styles.editorialFooter}><span>CAREER TRACKER / CONCEPT 01</span><span>{themeLabel}</span><span>{view.toUpperCase()} / EDITORIAL SYSTEM</span></footer>

    {selected&&<div className={styles.editorialOverlay} role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)setSelected(null)}}>
      <aside className={styles.editorialDetail} role="dialog" aria-modal="true" aria-label={selected.company}>
        <button className={styles.detailClose} onClick={()=>setSelected(null)}><X size={17}/></button>
        <div className={styles.detailIndex}>APPLICATION / {selected.id.slice(0,6).toUpperCase()}</div>
        <h2>{selected.company}</h2><p className={styles.detailRole}>{selected.role}</p>
        <div className={styles.detailMeta}><span><small>FIT</small><b>{selected.score===null?'—':selected.score.toFixed(1)}</b></span><span><small>STAGE</small><b>{status(selected)}</b></span><span><small>APPLIED</small><b>{fmt(selected.appliedDate)}</b></span></div>
        <section><h3>PROCESS</h3><div className={styles.detailTimeline}><div><i/><span><b>Applied</b><small>{fmt(selected.appliedDate)}</small></span></div>{ordered(selected).map(e=><div key={e.id}><i/><span><b>{e.label||e.type}</b><small>{e.state} · {e.date?fmt(e.date):'NO DATE'}</small></span></div>)}</div></section>
        <section><h3>NEXT ACTION</h3><p>{selected.nextAction||'No next action set.'}</p>{selected.dueDate&&<time>{fmt(selected.dueDate)}</time>}</section>
        <section><h3>NOTES</h3><p>{selected.notes||'No notes yet.'}</p></section>
        {selected.url&&<a className={styles.detailLink} href={selected.url} target="_blank" rel="noreferrer">OPEN JOB POSTING <ArrowUpRight size={14}/></a>}
      </aside>
    </div>}

    {adding&&<div className={styles.editorialOverlay} role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)setAdding(false)}}>
      <form className={styles.addPanel} onSubmit={addApplication}>
        <button type="button" className={styles.detailClose} onClick={()=>setAdding(false)}><X size={17}/></button>
        <div className={styles.detailIndex}>NEW RECORD / TODAY</div>
        <h2>Add application</h2>
        <label>COMPANY<input required value={draft.company} onChange={e=>setDraft({...draft,company:e.target.value})}/></label>
        <label>ROLE<input required value={draft.role} onChange={e=>setDraft({...draft,role:e.target.value})}/></label>
        <div className={styles.addGrid}><label>FIT / 5<input type="number" min="0" max="5" step=".1" value={draft.score} onChange={e=>setDraft({...draft,score:e.target.value})}/></label><label>DUE DATE<input type="date" value={draft.dueDate} onChange={e=>setDraft({...draft,dueDate:e.target.value})}/></label></div>
        <label>JOB URL<input type="url" value={draft.url} onChange={e=>setDraft({...draft,url:e.target.value})}/></label>
        <label>NEXT ACTION<input value={draft.nextAction} onChange={e=>setDraft({...draft,nextAction:e.target.value})}/></label>
        <button className={styles.editorialPrimary} type="submit" disabled={saving}>{saving?'SAVING…':<><Check size={14}/>SAVE APPLICATION</>}</button>
      </form>
    </div>}
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
  const {jobs,loading,error,saving,persist}=useTracker();
  if(loading||error)return <Loading variant={variant} error={error}/>;
  if(variant==='editorial')return <Editorial jobs={jobs} persist={persist} saving={saving}/>;
  if(variant==='retro')return <Retro jobs={jobs}/>;
  return <Brutalist jobs={jobs}/>;
}
