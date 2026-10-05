'use client';

import {useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {ArrowRight,ArrowUpRight,BriefcaseBusiness,Database,FileText,FolderOpen,TerminalSquare,TrendingUp,Plus,Search,X,Check,Download,Upload,Pencil,Trash2,ChevronDown} from 'lucide-react';
import {Job,Event,active,ordered,parseBackup,reached,status,uid,types,eventStateOptions,defaultEventState,eventStateLabel} from '@/lib/model';
import {useTrackerData} from '@/hooks/use-tracker-data';
import {buildTrackerAnalytics,localISODate,percentNumber} from '@/lib/tracker-analytics';
import {backupFilename,backupJSON,downloadText,simpleCSV} from '@/lib/tracker-export';
import {appendTimelineEvent,changeTimelineEventType,removeApplication,removeTimelineEvent,updateTimelineEvent,upsertApplication} from '@/lib/tracker-actions';
import styles from '../concept.module.css';

export type ConceptVariant='editorial'|'retro'|'brutalist';
const today=localISODate;
const pct=percentNumber;
const fmt=(s:string)=>s?new Date(s+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short'}):'—';
const useMetrics=(jobs:Job[])=>useMemo(()=>buildTrackerAnalytics(jobs,14),[jobs]);

type EditorialTheme='archive'|'signal'|'night';
type RetroTheme='vapor'|'classic'|'midnight';

function ConceptNav({variant,editorialTheme,onEditorialTheme,retroTheme,onRetroTheme}:{variant:ConceptVariant;editorialTheme?:EditorialTheme;onEditorialTheme?:(theme:EditorialTheme)=>void;retroTheme?:RetroTheme;onRetroTheme?:(theme:RetroTheme)=>void}){
  const themeName=editorialTheme==='archive'?'Archive':editorialTheme==='night'?'Night':'Signal';
  const retroName=retroTheme==='classic'?'Classic':retroTheme==='midnight'?'Midnight':'Vapor';
  return <div className={styles.switcher}>
    <Link href="/studio" title="Studio tracker design" onClick={()=>{try{localStorage.setItem('career-tracker-style','studio')}catch{}}}>00 Studio</Link>
    <span>Styles</span>
    {variant==='editorial'&&onEditorialTheme?
      <details className={styles.conceptMenu}>
        <summary className={styles.activeSwitch}><span>01 Editorial</span><small>{themeName}</small><ChevronDown size={13}/></summary>
        <div className={styles.conceptDropdown}>
          <div className={styles.conceptDropdownLabel}>EDITORIAL VARIANTS</div>
          {([['signal','Signal','Color-forward editorial'],['night','Night','Dark publication'],['archive','Archive','Quiet paper system']] as [EditorialTheme,string,string][]).map(([key,label,desc],i)=>
            <button key={key} aria-pressed={editorialTheme===key} onClick={e=>{onEditorialTheme(key);e.currentTarget.closest('details')?.removeAttribute('open')}}>
              <i>{String(i+1).padStart(2,'0')}</i><span><b>{label}</b><small>{desc}</small></span>{editorialTheme===key&&<Check size={13}/>}
            </button>
          )}
        </div>
      </details>
      :<Link href="/" onClick={()=>{try{localStorage.setItem('career-tracker-style','editorial')}catch{}}}>01 Editorial</Link>}
    {variant==='retro'&&onRetroTheme?
      <details className={styles.conceptMenu}>
        <summary className={styles.activeSwitch}><span>02 Career OS</span><small>{retroName}</small><ChevronDown size={13}/></summary>
        <div className={styles.conceptDropdown}>
          <div className={styles.conceptDropdownLabel}>CAREER OS VARIANTS</div>
          {([['vapor','Vapor','Pastel retro-future desktop'],['classic','Classic','Beige Macintosh workstation'],['midnight','Midnight','After-hours terminal desktop']] as [RetroTheme,string,string][]).map(([key,label,desc],i)=>
            <button key={key} aria-pressed={retroTheme===key} onClick={e=>{onRetroTheme(key);e.currentTarget.closest('details')?.removeAttribute('open')}}>
              <i>{String(i+1).padStart(2,'0')}</i><span><b>{label}</b><small>{desc}</small></span>{retroTheme===key&&<Check size={13}/>}
            </button>
          )}
        </div>
      </details>
      :<Link className={variant==='retro'?styles.activeSwitch:''} href="/concept/retro-os" onClick={()=>{try{localStorage.setItem('career-tracker-style','retro')}catch{}}}>02 Career OS</Link>}
    <Link className={variant==='brutalist'?styles.activeSwitch:''} href="/concept/brutalist" onClick={()=>{try{localStorage.setItem('career-tracker-style','brutalist')}catch{}}}>03 Loud</Link>
  </div>;
}
function Loading({variant,error}:{variant:ConceptVariant;error:string}){
  if(variant==='editorial')return <div className={styles.editorialLoading}>
    <ConceptNav variant={variant}/>
    <div className={styles.editorialLoadingShell}>
      <div className={styles.editorialLoadingMast}><span>CAREER INDEX®</span><span>{error?'SYSTEM NOTICE':'OPENING EDITION'}</span></div>
      <div className={styles.editorialLoadingGrid}>
        <div><span>{error?'DATA ERROR':'LOCAL DATABASE'}</span><strong>{error?'Unable to open the archive.':'Preparing your career index…'}</strong><p>{error||'Loading applications, pipeline and search signals.'}</p>{error&&<button onClick={()=>window.location.reload()}>RETRY CONNECTION</button>}</div>
        <div aria-hidden="true"><i/><i/><i/><i/></div>
      </div>
    </div>
  </div>;
  return <div className={styles.loading}><ConceptNav variant={variant}/><div className={styles.loadingBox}><span>{error?'DATA ERROR':'LOADING APPLICATION DATABASE'}</span><strong>{error||'…'}</strong></div></div>;
}

function HeaderIndex({no,label,tail}:{no:string;label:string;tail:string}){
  return <div className={styles.sectionIndex}><span>{no}</span><span>{label}</span><span>{tail}</span></div>;
}

type EditorialView='overview'|'applications'|'pipeline'|'statistics';
type ArchiveFilter='all'|'active'|'strong'|'interview'|'accepted'|'rejected';
type ApplicationDraft={company:string;role:string;appliedDate:string;score:string;url:string;notes:string;nextAction:string;dueDate:string;events:Event[]};
const blankApplicationDraft=():ApplicationDraft=>({company:'',role:'',appliedDate:today(),score:'',url:'',notes:'',nextAction:'',dueDate:'',events:[]});

function Editorial({jobs,persist,saving}:{jobs:Job[];persist:(next:Job[])=>Promise<boolean>;saving:boolean}){
  const m=useMetrics(jobs);
  const fileInput=useRef<HTMLInputElement>(null);
  const [theme,setTheme]=useState<EditorialTheme>('signal');
  const [deleteConfirm,setDeleteConfirm]=useState(false);
  const [view,setView]=useState<EditorialView>('overview');
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState<ArchiveFilter>('all');
  const [selected,setSelected]=useState<Job|null>(null);
  const [editing,setEditing]=useState<Job|null>(null);
  const [adding,setAdding]=useState(false);
  const [incoming,setIncoming]=useState<Job[]|null>(null);
  const [importError,setImportError]=useState('');
  const [draft,setDraft]=useState<ApplicationDraft>(()=>blankApplicationDraft());
  const overlayOpen=Boolean(selected||adding||incoming||importError);
  useEffect(()=>{try{const saved=localStorage.getItem('career-tracker-editorial-theme');if(saved==='archive'||saved==='signal'||saved==='night')setTheme(saved)}catch{}},[]);
  useEffect(()=>{if(!overlayOpen)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous}},[overlayOpen]);
  useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key!=='Escape')return;if(editing){setEditing(null);return}if(selected){setSelected(null);setDeleteConfirm(false);return}if(adding){setAdding(false);return}if(incoming||importError){setIncoming(null);setImportError('')}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[editing,selected,adding,incoming,importError]);
  function chooseTheme(next:EditorialTheme){setTheme(next);try{localStorage.setItem('career-tracker-editorial-theme',next)}catch{}}

  const themeClass=theme==='signal'?styles.themeSignal:theme==='night'?styles.themeNight:styles.themeArchive;
  const themeLabel=theme==='signal'?'SIGNAL EDITION':theme==='night'?'NIGHT PRESS':'ARCHIVE EDITION';
  const filtered=jobs.filter(a=>{
    const matches=(a.company+' '+a.role+' '+a.notes+' '+a.nextAction+' '+a.events.map(e=>e.label+' '+e.type+' '+e.notes).join(' ')).toLowerCase().includes(query.toLowerCase());
    const passes=filter==='all'||(filter==='active'&&active(a))||(filter==='strong'&&a.score!==null&&a.score>=4)||(filter==='interview'&&reached(a,'Interview'))||(filter==='accepted'&&status(a)==='Accepted')||(filter==='rejected'&&status(a)==='Rejected');
    return matches&&passes;
  }).sort((a,b)=>b.appliedDate.localeCompare(a.appliedDate));
  const byStage=m.stages.map(s=>({stage:s.label,jobs:jobs.filter(a=>status(a)===s.label).sort((a,b)=>b.appliedDate.localeCompare(a.appliedDate))}));
  const fitGroups=[
    {label:'Exceptional',range:'4.5–5.0',count:jobs.filter(a=>a.score!==null&&a.score>=4.5).length},
    {label:'Good',range:'4.0–4.4',count:jobs.filter(a=>a.score!==null&&a.score>=4&&a.score<4.5).length},
    {label:'Okay',range:'3.0–3.9',count:jobs.filter(a=>a.score!==null&&a.score>=3&&a.score<4).length},
    {label:'Low',range:'< 3.0',count:jobs.filter(a=>a.score!==null&&a.score<3).length},
  ];

  function exportJSON(){downloadText(backupJSON(jobs),backupFilename())}
  function exportCSV(){downloadText(simpleCSV(jobs),'job_applications_'+today()+'.csv','text/csv')}
  async function readImport(file:File){
    setImportError('');
    try{setIncoming(parseBackup(JSON.parse(await file.text())))}catch(e){setImportError((e as Error).message)}
    if(fileInput.current)fileInput.current.value='';
  }
  async function confirmImport(){
    if(!incoming)return;
    if(await persist(incoming)){setIncoming(null);setView('applications');setSelected(null)}
  }
  function openJob(a:Job){setSelected(a);setEditing(null);setDeleteConfirm(false)}
  function beginEdit(a:Job){setEditing(structuredClone(a))}
  const editField=(key:keyof Job,value:any)=>setEditing(d=>d?{...d,[key]:value}:null);
  const editEvent=(id:string,key:keyof Event,value:string)=>setEditing(d=>d?updateTimelineEvent(d,id,key,value):null);
  const editEventType=(id:string,type:string)=>setEditing(d=>d?changeTimelineEventType(d,id,type):null);
  function addEditEvent(){setEditing(d=>d?appendTimelineEvent(d):null)}
  function removeEditEvent(id:string){setEditing(d=>d?removeTimelineEvent(d,id):null)}
  const editDraftEvent=(id:string,key:keyof Event,value:string)=>setDraft(d=>({...d,events:d.events.map(event=>event.id===id?{...event,[key]:value}:event)}));
  const editDraftEventType=(id:string,type:string)=>setDraft(d=>({...d,events:d.events.map(event=>event.id===id?{...event,type,state:defaultEventState(type)}:event)}));
  const addDraftEvent=()=>setDraft(d=>({...d,events:[...d.events,{id:uid(),type:'Interview',label:'',date:today(),state:defaultEventState('Interview'),notes:''}]}));
  const removeDraftEvent=(id:string)=>setDraft(d=>({...d,events:d.events.filter(event=>event.id!==id)}));
  async function saveEdit(e:FormEvent){
    e.preventDefault(); if(!editing)return;
    const score=editing.score===null?null:Number(editing.score);
    if(!editing.company.trim()||!editing.role.trim()||score!==null&&(!Number.isFinite(score)||score<0||score>5))return;
    const updated={...editing,company:editing.company.trim(),role:editing.role.trim(),score};
    if(await persist(upsertApplication(jobs,updated))){setSelected(updated);setEditing(null)}
  }
  async function deleteApplication(){
    if(!selected)return;
    if(await persist(removeApplication(jobs,selected.id))){setSelected(null);setEditing(null);setDeleteConfirm(false)}
  }
  async function addApplication(e:FormEvent){
    e.preventDefault();
    const score=draft.score===''?null:Number(draft.score);
    const job:Job={id:uid(),company:draft.company.trim(),role:draft.role.trim(),url:draft.url.trim(),appliedDate:draft.appliedDate||today(),score:Number.isFinite(score as number)?score:null,notes:draft.notes.trim(),events:draft.events,nextAction:draft.nextAction.trim(),dueDate:draft.dueDate,reason:''};
    if(!job.company||!job.role||score!==null&&(score<0||score>5))return;
    if(await persist([job,...jobs])){setAdding(false);setDraft(blankApplicationDraft());setView('applications')}
  }

  return <div className={[styles.editorial,themeClass].join(' ')} aria-busy={saving}>
    <ConceptNav variant="editorial" editorialTheme={theme} onEditorialTheme={chooseTheme}/>

    <div className={styles.editorialMasthead}>
      <span>CAREER INDEX®</span><span>PERSONAL EDITION / 2026</span><span>{m.total.toString().padStart(4,'0')} RECORDS</span>
    </div>

    <div className={styles.editorialHero}>
      <div className={styles.editorialKicker}>
        <div><span className={styles.liveDot}/>LIVE WORKSPACE</div>
        <nav className={styles.editorialWorkspaceNav} aria-label="Editorial workspace">
          {([['overview','Overview'],['applications','Applications'],['pipeline','Pipeline'],['statistics','Statistics']] as [EditorialView,string][]).map(([key,label],i)=>
            <button key={key} aria-current={view===key?'page':undefined} onClick={()=>setView(key)}><i>{String(i+1).padStart(2,'0')}</i>{label}</button>
          )}
        </nav>
      </div>

      <div className={styles.editorialTitleRow}>
        <div className={styles.editorialTitleBlock}>
          <span className={styles.issueMark}>ISSUE 04 / {themeLabel}</span>
          <h1>{view==='overview'?<>JOB<br/>SEARCH</>:view==='applications'?<>THE<br/>ARCHIVE</>:view==='pipeline'?<>LIVE<br/>PROCESS</>:<>SEARCH<br/>SIGNALS</>}</h1>
          <div className={styles.titleUnderline}><i/><span>{view==='overview'?'TRACK. FOLLOW UP. MOVE.':view==='applications'?'EVERY ROLE. ONE INDEX.':view==='pipeline'?'WHAT IS STILL MOVING.':'READ THE PATTERN.'}</span></div>
        </div>
        <div className={styles.editorialHeroAside}>
          <p>{view==='overview'?'A living record of applications, conversations and momentum.':view==='applications'?'Your complete application archive, ordered for fast scanning.':view==='pipeline'?'A stage-by-stage view of the conversations still in motion.':'A compact read on response, fit and conversion.'}</p>
          <div className={styles.editorialHeroStats}>{view==='overview'?<><div><strong>{m.strong}</strong><span>strong fits</span></div><div><strong>{m.offers}</strong><span>reached offer</span></div><div><strong>{m.responseRate}%</strong><span>response rate</span></div></>:<><div><strong>{m.active}</strong><span>live processes</span></div><div><strong>{m.interviews}</strong><span>interviews</span></div><div><strong>{m.responseRate}%</strong><span>response rate</span></div></>}</div>
          <button className={styles.editorialNextFocus} disabled={!m.followups.length} onClick={()=>m.followups.length&&openJob(m.followups[0])}><div className={styles.nextFocusLabel}><span>NEXT</span><i>{m.followups.length?'01':'—'}</i></div><div className={styles.nextFocusCopy}><strong>{m.followups.length?m.followups[0].nextAction:'Keep the pipeline moving.'}</strong><small title={m.followups.length?m.followups[0].company+' · '+(m.followups[0].dueDate?fmt(m.followups[0].dueDate):'NO DUE DATE'):undefined}>{m.followups.length?m.followups[0].company+' · '+(m.followups[0].dueDate?fmt(m.followups[0].dueDate):'NO DUE DATE'):'No urgent follow-up queued'}</small></div><ArrowRight size={18}/></button>
        </div>
      </div>

      {view!=='overview'&&<div className={styles.editorialRibbon}><span>THIS MONTH <b>{m.thisMonth}</b></span><span>STRONG FITS <b>{m.strong}</b></span><span>OFFERS <b>{m.offers}</b></span><span>REJECTED <b>{m.rejected}</b></span></div>}
      <div className={styles.editorialUtility}>
        <span aria-live="polite">{saving?'SAVING CHANGES…':'DATABASE READY'}</span>
        <div>
          <button onClick={exportJSON}><Download size={13}/> BACKUP JSON</button>
          <button onClick={exportCSV}><Download size={13}/> EXPORT CSV</button>
          <button disabled={saving} onClick={()=>fileInput.current?.click()}><Upload size={13}/> IMPORT</button>
          <button className={styles.utilityPrimary} disabled={saving} onClick={()=>setAdding(true)}><Plus size={13}/> ADD APPLICATION</button>
        </div>
        <input ref={fileInput} hidden type="file" accept="application/json,.json" onChange={e=>{const f=e.target.files?.[0];if(f)void readImport(f)}}/>
      </div>
    </div>

    {view==='overview'&&<section className={styles.overviewSnapshot}>
      <div className={styles.snapshotHeading}><span>SEARCH SNAPSHOT</span><button onClick={()=>setView('statistics')}>OPEN ANALYTICS <ArrowRight size={13}/></button></div>
      <div className={styles.snapshotGrid}>
        <article><span>TOTAL APPLICATIONS</span><strong>{m.total}</strong><small>complete archive</small></article>
        <article><span>THIS MONTH</span><strong>{m.thisMonth}</strong><small>{new Date().toLocaleDateString('en-GB',{month:'long',year:'numeric'})}</small></article>
        <article><span>ACTIVE NOW</span><strong>{m.active}</strong><small>still in motion</small></article>
        <article className={styles.snapshotAccent}><span>REACHED INTERVIEW</span><strong>{m.interviews}</strong><small>{m.rejectedAfterInterview} rejected · {m.withdrawnAfterInterview} withdrawn after interview</small></article>
        <article><span>DAILY AVERAGE</span><strong>{m.dailyAverage}</strong><small>applications / day since first</small></article>
        <article><span>REJECTED</span><strong>{m.rejected}</strong><small>{m.rejectedAfterInterview} after interview</small></article>
        <article className={styles.snapshotDate}><span>FIRST APPLICATION</span><strong>{m.earliest?fmt(m.earliest):'—'}</strong><small>{m.earliest?new Date(m.earliest+'T12:00:00').getFullYear():'No applications yet'}</small></article>
        <article className={styles.snapshotDate}><span>LATEST APPLICATION</span><strong>{m.latest?fmt(m.latest):'—'}</strong><small>{m.latest?'most recent submission':'No applications yet'}</small></article>
      </div>
    </section>}

    {view==='overview'&&<div className={styles.editorialGrid}>
      <section className={styles.editorialActivity}><HeaderIndex no="01" label="APPLICATION ACTIVITY" tail="LAST 14 DAYS"/><div className={styles.editorialChart}>{m.daily.map((d,i)=><div key={d.key} className={styles.editorialBarCol}><div className={styles.editorialBarRail}><i style={{height:Math.max(4,d.count/m.maxDaily*100)+'%'}}/></div><small>{[0,4,9,13].includes(i)?d.label:''}</small></div>)}</div><div className={styles.chartCaption}><span>APPLICATION VELOCITY</span><strong>{m.thisMonth} sent this month</strong></div></section>
      <section className={styles.editorialStages}><HeaderIndex no="02" label="CURRENT STAGES" tail="STATUS INDEX"/><div className={styles.stageLedger}>{m.stages.map((s,i)=><button key={s.label} onClick={()=>setView('pipeline')}><span>{String(i+1).padStart(2,'0')}</span><strong>{s.label}</strong><i style={{width:Math.max(10,s.count/Math.max(1,...m.stages.map(x=>x.count))*100)+'%'}}/><b>{String(s.count).padStart(2,'0')}</b></button>)}</div></section>
      <section className={styles.editorialRecent}><HeaderIndex no="03" label="RECENT APPLICATIONS" tail="LIVE ARCHIVE"/><div className={styles.editorialList}>{m.recent.map((a,i)=><button key={a.id} onClick={()=>openJob(a)}><span>{String(i+1).padStart(2,'0')}</span><div><strong title={a.company}>{a.company}</strong><p title={a.role}>{a.role}</p></div><b>{a.score===null?'—':a.score.toFixed(1)}</b><em>{status(a)}</em><time>{fmt(a.appliedDate)}</time><ArrowUpRight size={15}/></button>)}{!m.recent.length&&<div className={styles.editorialModuleEmpty}><strong>No applications yet.</strong><span>Add your first role to start the archive.</span></div>}</div><button className={styles.moduleLink} onClick={()=>setView('applications')}>OPEN FULL ARCHIVE <ArrowRight size={14}/></button></section>
      <section className={styles.editorialActions}><HeaderIndex no="04" label="NEXT ACTIONS" tail={m.followups.length.toString().padStart(2,'0')+' OPEN'}/><div className={styles.editorialActionStack}>{m.followups.slice(0,5).map((a,i)=><button key={a.id} onClick={()=>openJob(a)}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{a.nextAction}</strong><p>{a.company} · {a.role}</p></div><time>{a.dueDate?fmt(a.dueDate):'NO DATE'}</time></button>)}{!m.followups.length&&<div className={styles.editorialModuleEmpty}><strong>Queue clear.</strong><span>No follow-ups need attention right now.</span></div>}</div><div className={styles.actionFooter}><span>QUEUE / {String(m.followups.length).padStart(2,'0')}</span><ArrowRight size={14}/></div></section>
    </div>}

    {view==='applications'&&<div className={styles.editorialWorkspace}>
      <div className={styles.workspaceToolbar}><label className={styles.editorialSearch}><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search company, role, notes…"/></label><span>{filtered.length} / {m.total} RECORDS</span><button className={styles.editorialPrimary} disabled={saving} onClick={()=>setAdding(true)}><Plus size={14}/> ADD APPLICATION</button></div>
      <div className={styles.archiveFilters}>{([['all','All'],['active','Active'],['strong','4.0+ Fit'],['interview','Interview'],['accepted','Accepted'],['rejected','Rejected']] as [ArchiveFilter,string][]).map(([key,label])=><button key={key} aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label}</button>)}</div>
      <section className={styles.archiveTable}>
        <div className={styles.archiveHead}><span>NO.</span><span>COMPANY / ROLE</span><span>FIT</span><span>STAGE</span><span>APPLIED</span><span>NEXT</span></div>
        {filtered.map((a,i)=><button key={a.id} className={[styles.archiveRow,status(a)==='Rejected'?styles.archiveRowRejected:''].join(' ')} onClick={()=>openJob(a)}><span>{String(i+1).padStart(3,'0')}</span><span><strong title={a.company}>{a.company}</strong><small title={a.role}>{a.role}</small></span><b>{a.score===null?'—':a.score.toFixed(1)}</b><em title={status(a)}>{status(a)}</em><time>{fmt(a.appliedDate)}</time><span><small title={a.nextAction||'Awaiting response'}>{a.nextAction||'Awaiting response'}</small><ArrowRight size={14}/></span></button>)}
        {!filtered.length&&<div className={styles.archiveEmpty}><strong>No matching applications.</strong><span>Try another search or clear the active filter.</span><button onClick={()=>{setQuery('');setFilter('all')}}>CLEAR FILTERS</button></div>}
      </section>
    </div>}

    {view==='pipeline'&&<div className={styles.editorialWorkspace}>
      <div className={styles.pipelineIntro}><span>ACTIVE / {m.active}</span><p>Each column is a current stage, not a historical funnel. Open a card to inspect or edit the full recorded process.</p></div>
      <div className={styles.pipelineBoard}>{byStage.filter(g=>g.jobs.length||['Applied','Interview','Offer'].includes(g.stage)).map((g,i)=><section key={g.stage} className={styles.pipelineColumn}><div className={styles.pipelineColumnHead}><span>{String(i+1).padStart(2,'0')}</span><strong>{g.stage}</strong><b>{g.jobs.length}</b></div><div>{g.jobs.slice(0,8).map(a=><button key={a.id} className={styles.pipelineCard} onClick={()=>openJob(a)}><strong title={a.company}>{a.company}</strong><span title={a.role}>{a.role}</span><div className={styles.pipelineCardMeta}><em>{a.score===null?'UNRATED':a.score.toFixed(1)+' / 5'}</em><time>{fmt(a.appliedDate)}</time></div></button>)}</div></section>)}</div>
    </div>}

    {view==='statistics'&&<div className={styles.editorialWorkspace}><div className={styles.statisticsGrid}>
      <section className={styles.bigStat}><span>RESPONSE RATE</span><strong>{m.responseRate}%</strong><p>{m.responses} replies from {m.total} applications.</p><i style={{width:m.responseRate+'%'}}/></section>
      <section className={styles.bigStat}><span>INTERVIEW REACH</span><strong>{pct(m.interviews,m.total)}%</strong><p>{m.interviews} applications reached interview.</p><i style={{width:pct(m.interviews,m.total)+'%'}}/></section>
      <section className={styles.statPanel}><HeaderIndex no="01" label="FIT DISTRIBUTION" tail={m.rated+' RATED'}/><div className={styles.fitLedger}>{fitGroups.map(g=><div key={g.label}><span>{g.label}<small>{g.range}</small></span><i style={{width:Math.max(4,g.count/Math.max(1,m.rated)*100)+'%'}}/><b>{g.count}</b></div>)}</div></section>
      <section className={styles.statPanel}><HeaderIndex no="02" label="OUTCOMES" tail="CURRENT"/><div className={styles.outcomeNumbers}><div><strong>{m.active}</strong><span>ACTIVE</span></div><div><strong>{m.rejected}</strong><span>REJECTED</span></div><div><strong>{m.withdrawn}</strong><span>WITHDRAWN</span></div><div><strong>{m.accepted}</strong><span>ACCEPTED</span></div></div></section>
      <section className={styles.journeyPanel}><HeaderIndex no="03" label="HISTORICAL REACH" tail="EVER REACHED"/><div className={styles.journeyReach}>
        {[['Screening',m.screening],['Assessment',m.assessments],['Interview',m.interviews],['Offer',m.offers]] .map(([label,count],i)=><div key={label as string}><span>{String(i+1).padStart(2,'0')} / {label}</span><strong>{count}</strong><i><b style={{width:Math.max(4,(count as number)/Math.max(1,m.total)*100)+'%'}}/></i><small>{pct(count as number,m.total)}% of all applications</small></div>)}
      </div></section>
      <section className={styles.journeyPanel}><HeaderIndex no="04" label="WHERE PROCESSES STOPPED" tail="HISTORICAL"/><div className={styles.exitGrid}>
        <div><strong>{m.rejectedAfterInterview}</strong><span>REJECTED AFTER INTERVIEW</span></div>
        <div><strong>{m.withdrawnAfterInterview}</strong><span>WITHDRAWN AFTER INTERVIEW</span></div>
        <div><strong>{m.rejectedAfterAssessment}</strong><span>REJECTED AFTER ASSESSMENT</span></div>
        <div><strong>{m.withdrawnAfterAssessment}</strong><span>WITHDRAWN AFTER ASSESSMENT</span></div>
      </div></section>
    </div></div>}

    <div className={styles.editorialFooter}><span>CAREER TRACKER / {m.total} RECORDS</span><span>{themeLabel}</span><span>{view.toUpperCase()} / EDITORIAL SYSTEM</span></div>

    {selected&&<div className={styles.editorialOverlay} role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target){setSelected(null);setEditing(null)}}}>
      <aside className={styles.editorialDetail} role="dialog" aria-modal="true" aria-label={selected.company+' application details'}>
        {!editing?<>
          <div className={styles.detailTopline}>
            <div className={styles.detailIndex}>APPLICATION / {selected.id.slice(0,6).toUpperCase()}</div>
            <div className={styles.detailHeaderActions}>
              <button className={styles.detailEdit} onClick={()=>beginEdit(selected)}><Pencil size={12}/> EDIT RECORD</button>
              <button className={styles.detailCloseInline} aria-label="Close application details" onClick={()=>{setSelected(null);setDeleteConfirm(false)}}><X size={17}/></button>
            </div>
          </div>
          <h2 title={selected.company}>{selected.company}</h2><p className={styles.detailRole} title={selected.role}>{selected.role}</p>
          <div className={styles.detailMeta}><span><small>FIT</small><b>{selected.score===null?'—':selected.score.toFixed(1)}</b></span><span><small>STAGE</small><b>{status(selected)}</b></span><span><small>APPLIED</small><b>{fmt(selected.appliedDate)}</b></span></div>
          <section><h3>PROCESS</h3><div className={styles.detailTimeline}><div><i/><span><b>Applied</b><small>{fmt(selected.appliedDate)}</small></span></div>{ordered(selected).map(e=><div key={e.id}><i/><span><b>{e.label||e.type}</b><small>{eventStateLabel(e)?eventStateLabel(e)+' · ':''}{e.date?fmt(e.date):'NO DATE'}</small>{e.notes&&<small>{e.notes}</small>}</span></div>)}</div></section>
          <section><h3>NEXT ACTION</h3><p>{selected.nextAction||'No next action set.'}</p>{selected.dueDate&&<time>{fmt(selected.dueDate)}</time>}</section>
          <section><h3>NOTES</h3><p>{selected.notes||'No notes yet.'}</p></section>
          <div className={styles.detailBottomActions}>
            {selected.url&&<a className={styles.detailLink} href={selected.url} target="_blank" rel="noreferrer">OPEN JOB POSTING <ArrowUpRight size={14}/></a>}
            {!deleteConfirm?<button className={styles.detailDelete} onClick={()=>setDeleteConfirm(true)} disabled={saving}><Trash2 size={13}/> DELETE</button>:
              <div className={styles.deleteConfirm}><span>DELETE THIS RECORD?</span><button onClick={()=>setDeleteConfirm(false)}>CANCEL</button><button onClick={deleteApplication} disabled={saving}>{saving?'DELETING…':'CONFIRM'}</button></div>}
          </div>
        </>:<form className={styles.detailEditForm} onSubmit={saveEdit}>
          <div className={styles.detailTopline}><div className={styles.detailIndex}>EDITING / {editing.id.slice(0,6).toUpperCase()}</div><button type="button" className={styles.detailCloseInline} aria-label="Close application details" onClick={()=>{setSelected(null);setEditing(null)}}><X size={17}/></button></div><h2>Edit application</h2>
          <div className={styles.addGrid}><label>COMPANY<input required value={editing.company} onChange={e=>editField('company',e.target.value)}/></label><label>ROLE<input required value={editing.role} onChange={e=>editField('role',e.target.value)}/></label></div>
          <div className={styles.addGrid}><label>APPLIED<input type="date" value={editing.appliedDate} onChange={e=>editField('appliedDate',e.target.value)}/></label><label>FIT / 5<input type="number" min="0" max="5" step=".1" value={editing.score??''} onChange={e=>editField('score',e.target.value===''?null:Number(e.target.value))}/></label></div>
          <label>JOB URL<input type="url" value={editing.url} onChange={e=>editField('url',e.target.value)}/></label>
          <div className={styles.addGrid}><label>NEXT ACTION<input value={editing.nextAction} onChange={e=>editField('nextAction',e.target.value)}/></label><label>DUE DATE<input type="date" value={editing.dueDate} onChange={e=>editField('dueDate',e.target.value)}/></label></div>
          <label>NOTES<textarea rows={5} value={editing.notes} onChange={e=>editField('notes',e.target.value)}/></label>
          <div className={styles.timelineEditorHead}><span>PROCESS TIMELINE</span><button type="button" onClick={addEditEvent}><Plus size={12}/> ADD EVENT</button></div>
          <p className={styles.timelineStateHelp}>UPDATE = INFO ONLY · PLANNED = ANNOUNCED · SCHEDULED = DATE FIXED · COMPLETED = DONE / WAITING · PASSED = ADVANCED</p>
          <div className={styles.timelineEditor}>{editing.events.map((event,i)=><div key={event.id} className={styles.timelineEditRow}>
            <span>{String(i+1).padStart(2,'0')}</span>
            <select aria-label="Event type" value={event.type} onChange={e=>editEventType(event.id,e.target.value)}>{types.map(t=><option key={t}>{t}</option>)}</select>
            {eventStateOptions(event.type).length?<select className={styles.eventStateSelect} aria-label={event.type==='Offer'?'Offer status':'Stage status'} title={event.type==='Offer'?'Received = open offer · Accepted/Declined = final outcome · Rescinded = employer withdrew the offer':'Completed = happened, awaiting result · Passed = confirmed advancement'} value={event.state} onChange={e=>editEvent(event.id,'state',e.target.value)}>{eventStateOptions(event.type).map(s=><option key={s}>{s}</option>)}</select>:<span className={styles.eventStateStatic} title={event.type==='Update'?'Informational update; no outcome needed.':'This event is itself the outcome.'}>RECORDED</span>}
            <input type="date" value={event.date} onChange={e=>editEvent(event.id,'date',e.target.value)}/>
            <input placeholder="Label" value={event.label} onChange={e=>editEvent(event.id,'label',e.target.value)}/>
            <button type="button" aria-label="Remove event" onClick={()=>removeEditEvent(event.id)}><X size={13}/></button>
            <input className={styles.timelineEventNotes} aria-label="Stage notes" placeholder="Stage notes (optional)" value={event.notes} onChange={e=>editEvent(event.id,'notes',e.target.value)}/>
          </div>)}</div>
          <div className={styles.editActions}><button type="button" onClick={()=>setEditing(null)}>CANCEL</button><button className={styles.editorialPrimary} type="submit" disabled={saving}>{saving?'SAVING…':<><Check size={14}/> SAVE CHANGES</>}</button></div>
        </form>}
      </aside>
    </div>}

    {adding&&<div className={styles.editorialOverlay} role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)setAdding(false)}}><form className={styles.addPanel} onSubmit={addApplication}>
      <button type="button" className={styles.detailClose} onClick={()=>setAdding(false)}><X size={17}/></button><div className={styles.detailIndex}>NEW RECORD / {today()}</div><h2>Add application</h2>
      <div className={styles.addGrid}><label>COMPANY<input required value={draft.company} onChange={e=>setDraft({...draft,company:e.target.value})}/></label><label>ROLE<input required value={draft.role} onChange={e=>setDraft({...draft,role:e.target.value})}/></label></div>
      <div className={styles.addGrid}><label>APPLIED<input type="date" value={draft.appliedDate} onChange={e=>setDraft({...draft,appliedDate:e.target.value})}/></label><label>FIT / 5<input type="number" min="0" max="5" step=".1" value={draft.score} onChange={e=>setDraft({...draft,score:e.target.value})}/></label></div>
      <label>JOB URL<input type="url" value={draft.url} onChange={e=>setDraft({...draft,url:e.target.value})}/></label>
      <div className={styles.addGrid}><label>NEXT ACTION<input value={draft.nextAction} onChange={e=>setDraft({...draft,nextAction:e.target.value})}/></label><label>DUE DATE<input type="date" value={draft.dueDate} onChange={e=>setDraft({...draft,dueDate:e.target.value})}/></label></div>
      <label>NOTES<textarea rows={5} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label>
      <div className={styles.timelineEditorHead}><span>PROCESS TIMELINE</span><button type="button" onClick={addDraftEvent}><Plus size={12}/> ADD STAGE</button></div>
      <p className={styles.timelineStateHelp}>OPTIONAL · ADD INTERVIEWS, ASSESSMENTS, UPDATES OR OUTCOMES NOW, OR LATER</p>
      <div className={styles.timelineEditor}>{draft.events.map((event,i)=><div key={event.id} className={styles.timelineEditRow}>
        <span>{String(i+1).padStart(2,'0')}</span>
        <select aria-label="Event type" value={event.type} onChange={e=>editDraftEventType(event.id,e.target.value)}>{types.map(t=><option key={t}>{t}</option>)}</select>
        {eventStateOptions(event.type).length?<select className={styles.eventStateSelect} aria-label={event.type==='Offer'?'Offer status':'Stage status'} value={event.state} onChange={e=>editDraftEvent(event.id,'state',e.target.value)}>{eventStateOptions(event.type).map(s=><option key={s}>{s}</option>)}</select>:<span className={styles.eventStateStatic}>RECORDED</span>}
        <input type="date" value={event.date} onChange={e=>editDraftEvent(event.id,'date',e.target.value)}/>
        <input placeholder="Label" value={event.label} onChange={e=>editDraftEvent(event.id,'label',e.target.value)}/>
        <button type="button" aria-label="Remove stage" onClick={()=>removeDraftEvent(event.id)}><X size={13}/></button>
        <input className={styles.timelineEventNotes} aria-label="Stage notes" placeholder="Stage notes (optional)" value={event.notes} onChange={e=>editDraftEvent(event.id,'notes',e.target.value)}/>
      </div>)}</div>
      <button className={styles.editorialPrimary} type="submit" disabled={saving}>{saving?'SAVING…':<><Check size={14}/> SAVE APPLICATION</>}</button>
    </form></div>}

    {(incoming||importError)&&<div className={styles.editorialOverlay} role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target){setIncoming(null);setImportError('')}}}>
      <div className={styles.importPanel} role="dialog" aria-modal="true">
        <button className={styles.detailClose} onClick={()=>{setIncoming(null);setImportError('')}}><X size={17}/></button>
        <div className={styles.detailIndex}>BACKUP IMPORT</div><h2>{importError?'Import failed':'Replace local database?'}</h2>
        {importError?<p>{importError}</p>:<><p>The selected backup contains <strong>{incoming?.length}</strong> applications. Importing it will replace the {jobs.length} applications currently stored in this local database.</p><div className={styles.importSummary}><span>CURRENT <b>{jobs.length}</b></span><ArrowRight size={18}/><span>BACKUP <b>{incoming?.length}</b></span></div></>}
        <div className={styles.editActions}><button onClick={()=>{setIncoming(null);setImportError('')}}>CANCEL</button>{incoming&&<button className={styles.editorialPrimary} disabled={saving} onClick={confirmImport}>{saving?'IMPORTING…':'IMPORT & REPLACE'}</button>}</div>
      </div>
    </div>}
  </div>;
}

function Window({title,children,className=''}:{title:string;children:React.ReactNode;className?:string}){
  return <section className={[styles.osWindow,className].join(' ')}><div className={styles.osTitlebar}><span>□</span><strong>{title}</strong><div><i/><i/><i/></div></div><div className={styles.osBody}>{children}</div></section>;
}

type RetroView='desktop'|'applications'|'pipeline'|'statistics';
type RetroFilter='all'|'active'|'strong'|'interview'|'accepted'|'rejected';

function Retro({jobs,persist,saving}:{jobs:Job[];persist:(next:Job[])=>Promise<boolean>;saving:boolean}){
  const m=useMetrics(jobs);
  const fileInput=useRef<HTMLInputElement>(null);
  const [theme,setTheme]=useState<RetroTheme>('vapor');
  const [view,setView]=useState<RetroView>('desktop');
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState<RetroFilter>('all');
  const [selected,setSelected]=useState<Job|null>(null);
  const [editing,setEditing]=useState<Job|null>(null);
  const [adding,setAdding]=useState(false);
  const [incoming,setIncoming]=useState<Job[]|null>(null);
  const [importError,setImportError]=useState('');
  const [deleteConfirm,setDeleteConfirm]=useState(false);
  const [draft,setDraft]=useState<ApplicationDraft>(()=>blankApplicationDraft());

  useEffect(()=>{try{const saved=localStorage.getItem('career-tracker-retro-theme');if(saved==='vapor'||saved==='classic'||saved==='midnight')setTheme(saved)}catch{}},[]);
  useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key!=='Escape')return;if(editing){setEditing(null);return}if(selected){setSelected(null);setDeleteConfirm(false);return}if(adding){setAdding(false);return}if(incoming||importError){setIncoming(null);setImportError('')}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[editing,selected,adding,incoming,importError]);
  function chooseTheme(next:RetroTheme){setTheme(next);try{localStorage.setItem('career-tracker-retro-theme',next)}catch{}}

  const themeClass=theme==='classic'?styles.retroClassic:theme==='midnight'?styles.retroMidnight:styles.retroVapor;
  const filtered=jobs.filter(a=>{
    const text=(a.company+' '+a.role+' '+a.notes+' '+a.nextAction+' '+a.events.map(e=>e.type+' '+e.label+' '+e.notes).join(' ')).toLowerCase().includes(query.toLowerCase());
    const pass=filter==='all'||(filter==='active'&&active(a))||(filter==='strong'&&a.score!==null&&a.score>=4)||(filter==='interview'&&reached(a,'Interview'))||(filter==='accepted'&&status(a)==='Accepted')||(filter==='rejected'&&status(a)==='Rejected');
    return text&&pass;
  }).sort((a,b)=>b.appliedDate.localeCompare(a.appliedDate));
  const byStage=m.stages.map(s=>({stage:s.label,jobs:jobs.filter(a=>status(a)===s.label).sort((a,b)=>b.appliedDate.localeCompare(a.appliedDate))}));

  function exportJSON(){downloadText(backupJSON(jobs),backupFilename())}
  function exportCSV(){downloadText(simpleCSV(jobs),'job_applications_'+today()+'.csv','text/csv')}
  async function readImport(file:File){setImportError('');try{setIncoming(parseBackup(JSON.parse(await file.text())))}catch(e){setImportError((e as Error).message)}if(fileInput.current)fileInput.current.value=''}
  async function confirmImport(){if(!incoming)return;if(await persist(incoming)){setIncoming(null);setView('applications');setSelected(null)}}
  function openJob(a:Job){setSelected(a);setEditing(null);setDeleteConfirm(false)}
  function beginEdit(a:Job){setEditing(structuredClone(a))}
  const editField=(key:keyof Job,value:any)=>setEditing(d=>d?{...d,[key]:value}:null);
  const editEvent=(id:string,key:keyof Event,value:string)=>setEditing(d=>d?updateTimelineEvent(d,id,key,value):null);
  const editEventType=(id:string,type:string)=>setEditing(d=>d?changeTimelineEventType(d,id,type):null);
  function addEditEvent(){setEditing(d=>d?appendTimelineEvent(d):null)}
  function removeEditEvent(id:string){setEditing(d=>d?removeTimelineEvent(d,id):null)}
  const editDraftEvent=(id:string,key:keyof Event,value:string)=>setDraft(d=>({...d,events:d.events.map(event=>event.id===id?{...event,[key]:value}:event)}));
  const editDraftEventType=(id:string,type:string)=>setDraft(d=>({...d,events:d.events.map(event=>event.id===id?{...event,type,state:defaultEventState(type)}:event)}));
  const addDraftEvent=()=>setDraft(d=>({...d,events:[...d.events,{id:uid(),type:'Interview',label:'',date:today(),state:defaultEventState('Interview'),notes:''}]}));
  const removeDraftEvent=(id:string)=>setDraft(d=>({...d,events:d.events.filter(event=>event.id!==id)}));
  async function saveEdit(e:FormEvent){e.preventDefault();if(!editing)return;const score=editing.score===null?null:Number(editing.score);if(!editing.company.trim()||!editing.role.trim()||score!==null&&(!Number.isFinite(score)||score<0||score>5))return;const updated={...editing,company:editing.company.trim(),role:editing.role.trim(),score};if(await persist(upsertApplication(jobs,updated))){setSelected(updated);setEditing(null)}}
  async function deleteApplication(){if(!selected)return;if(await persist(removeApplication(jobs,selected.id))){setSelected(null);setEditing(null);setDeleteConfirm(false)}}
  async function addApplication(e:FormEvent){e.preventDefault();const score=draft.score===''?null:Number(draft.score);const job:Job={id:uid(),company:draft.company.trim(),role:draft.role.trim(),url:draft.url.trim(),appliedDate:draft.appliedDate||today(),score:Number.isFinite(score as number)?score:null,notes:draft.notes.trim(),events:draft.events,nextAction:draft.nextAction.trim(),dueDate:draft.dueDate,reason:''};if(!job.company||!job.role||score!==null&&(score<0||score>5))return;if(await persist([job,...jobs])){setAdding(false);setDraft(blankApplicationDraft());setView('applications')}}

  return <div className={[styles.retro,themeClass].join(' ')}>
    <ConceptNav variant="retro" retroTheme={theme} onRetroTheme={chooseTheme}/>

    <div className={styles.osMenu}>
      <div><span className={styles.pixelLogo}>◈</span><b>CAREER_OS</b><span>File</span><span>Edit</span><span>View</span><span>Window</span><span>Help</span></div>
      <div><span className={styles.osOnlineDot}/> <span>LOCAL DATABASE</span><span>SESSION 2026</span></div>
    </div>

    <div className={styles.retroDesktopShell}>
      <div className={styles.vaporSky} aria-hidden="true"><i/><b/></div>
      <aside className={styles.desktopIcons}>
        <button onClick={()=>setView('applications')}><span><Database size={24}/></span><small>Applications</small></button>
        <button onClick={()=>setView('pipeline')}><span><FolderOpen size={24}/></span><small>Pipeline</small></button>
        <button onClick={()=>setView('statistics')}><span><FileText size={24}/></span><small>Reports</small></button>
        <button onClick={exportJSON}><span><Download size={24}/></span><small>Backup</small></button>
      </aside>

      {view==='desktop'&&<div className={styles.desktop}>
        <Window title="APPLICATION_DATABASE.db" className={styles.osDatabase}>
          <div className={styles.osHero}><div><span>RECORD COUNT</span><strong>{String(m.total).padStart(4,'0')}</strong><small>CAREER ARCHIVE</small></div><div className={styles.osMiniStats}><p><b>{String(m.active).padStart(2,'0')}</b><span>ACTIVE</span></p><p><b>{String(m.interviews).padStart(2,'0')}</b><span>INTERVIEWS</span></p><p><b>{String(m.offers).padStart(2,'0')}</b><span>OFFERS</span></p><p><b>{m.responseRate}%</b><span>RESPONSE</span></p></div></div>
          <div className={styles.osStatusLine}><span>READY</span><button onClick={()=>setAdding(true)}>＋ NEW RECORD</button><span>{m.thisMonth} ADDED THIS MONTH</span></div>
        </Window>
        <Window title="PROCESS_MONITOR.exe" className={styles.osMonitor}>
          <div className={styles.monitorHead}><TerminalSquare size={15}/><span>STAGE PROCESS TABLE</span><button onClick={()=>setView('pipeline')}>OPEN ↗</button></div>
          {m.stages.map(s=><button className={styles.monitorRow} key={s.label} onClick={()=>setView('pipeline')}><span/><strong>{s.label}</strong><div><i style={{width:Math.max(5,s.count/Math.max(1,m.total)*100)+'%'}}/></div><b>{s.count}</b></button>)}
        </Window>
        <Window title="RECENT_FILES" className={styles.osRecent}>
          <div className={styles.fileListHead}><span>NAME</span><span>FIT</span><span>STATE</span><span>DATE</span></div>
          {m.recent.map(a=><button className={styles.fileRow} key={a.id} onClick={()=>openJob(a)}><span><BriefcaseBusiness size={14}/><div><strong>{a.company}</strong><small>{a.role}</small></div></span><b>{a.score===null?'--':a.score.toFixed(1)}</b><em>{status(a).toUpperCase()}</em><time>{fmt(a.appliedDate)}</time></button>)}
        </Window>
        <Window title="NEXT_ACTIONS.todo" className={styles.osActions}>
          <div className={styles.todoToolbar}><button>☑ ALL</button><button>⚑ PRIORITY</button><span>{m.followups.length} ITEMS</span></div>
          {m.followups.slice(0,6).map(a=><button className={styles.todoRow} key={a.id} onClick={()=>openJob(a)}><span/><div><strong>{a.nextAction}</strong><small>{a.company} / {a.role}</small></div><time>{a.dueDate?fmt(a.dueDate):'-- ---'}</time></button>)}
          {!m.followups.length&&<div className={styles.osEmpty}>NO PENDING ACTIONS</div>}
        </Window>
      </div>}

      {view==='applications'&&<div className={styles.osWorkspace}>
        <Window title="APPLICATIONS.FINDER" className={styles.osWorkspaceWindow}>
          <div className={styles.osFinderToolbar}>
            <button onClick={()=>setView('desktop')}>← DESKTOP</button>
            <label><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search records…"/></label>
            <button onClick={()=>fileInput.current?.click()}><Upload size={13}/> IMPORT</button>
            <button onClick={exportCSV}><Download size={13}/> CSV</button>
            <button className={styles.osPrimary} onClick={()=>setAdding(true)}><Plus size={13}/> NEW</button>
          </div>
          <div className={styles.osFilterbar}>{([['all','All'],['active','Active'],['strong','4.0+ Fit'],['interview','Interview'],['accepted','Accepted'],['rejected','Rejected']] as [RetroFilter,string][]).map(([key,label])=><button key={key} aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label}</button>)}<span>{filtered.length} OF {m.total} RECORDS</span></div>
          <div className={styles.osFinderStatus}><span>◼ INDEXED</span><span>VIEW: LIST</span><span>DISK: LOCAL</span><b>{theme.toUpperCase()} MODE</b></div>
          <div className={styles.osTable}>
            <div className={styles.osTableHead}><span>NAME</span><span>FIT</span><span>STATE</span><span>APPLIED</span><span>NEXT</span></div>
            {filtered.map(a=><button className={styles.osTableRow} key={a.id} onClick={()=>openJob(a)}><span><BriefcaseBusiness size={14}/><div><strong>{a.company}</strong><small>{a.role}</small></div></span><b>{a.score===null?'--':a.score.toFixed(1)}</b><em>{status(a)}</em><time>{fmt(a.appliedDate)}</time><span>{a.nextAction||'Awaiting response'} <ArrowRight size={13}/></span></button>)}
            {!filtered.length&&<div className={styles.osEmptyState}><strong>NO MATCHING FILES</strong><span>Try another search or filter.</span><button onClick={()=>{setQuery('');setFilter('all')}}>CLEAR FILTERS</button></div>}
          </div>
        </Window>
      </div>}

      {view==='pipeline'&&<div className={styles.osWorkspace}>
        <Window title="PIPELINE_CONTROL_PANEL.exe" className={styles.osWorkspaceWindow}>
          <div className={styles.osFinderToolbar}><button onClick={()=>setView('desktop')}>← DESKTOP</button><span className={styles.osToolbarTitle}>LIVE PROCESSES / {m.active}</span><button onClick={()=>setView('applications')}>DATABASE ↗</button></div>
          <div className={styles.osPipelineBoard}>{byStage.filter(g=>g.jobs.length||['Applied','Interview','Offer'].includes(g.stage)).map((g,i)=><section key={g.stage} className={styles.osPipelineColumn}><div className={styles.osPipelineHead}><span>{String(i+1).padStart(2,'0')}</span><strong>{g.stage}</strong><b>{g.jobs.length}</b></div><div>{g.jobs.slice(0,10).map(a=><button key={a.id} className={styles.osPipelineCard} onClick={()=>openJob(a)}><div><strong>{a.company}</strong><span>{a.role}</span></div><div className={styles.osPipelineCardMeta}><em>{a.score===null?'UNRATED':a.score.toFixed(1)+'/5'}</em><time>{fmt(a.appliedDate)}</time></div></button>)}</div></section>)}</div>
        </Window>
      </div>}

      {view==='statistics'&&<div className={styles.osWorkspace}>
        <Window title="CAREER_REPORTS.app" className={styles.osWorkspaceWindow}>
          <div className={styles.osFinderToolbar}><button onClick={()=>setView('desktop')}>← DESKTOP</button><span className={styles.osToolbarTitle}>SYSTEM REPORT / CURRENT DATABASE</span><button onClick={exportCSV}><Download size={13}/> EXPORT</button></div>
          <div className={styles.osReportBanner}><span>CAREER ANALYTICS SYSTEM</span><b>LIVE</b><i/></div>
          <div className={styles.osReportGrid}>
            <div className={styles.osReportHero}><span>RESPONSE RATE</span><strong>{m.responseRate}%</strong><div><i style={{width:m.responseRate+'%'}}/></div><small>{m.responses} replies from {m.total} applications</small></div>
            <div className={styles.osReportHero}><span>INTERVIEW REACH</span><strong>{pct(m.interviews,m.total)}%</strong><div><i style={{width:pct(m.interviews,m.total)+'%'}}/></div><small>{m.interviews} applications reached interview</small></div>
            <div className={styles.osReportPanel}><div className={styles.osPanelHeader}>STAGE DISTRIBUTION</div>{m.stages.map(s=><div className={styles.osReportRow} key={s.label}><span>{s.label}</span><i style={{width:Math.max(4,s.count/Math.max(1,...m.stages.map(x=>x.count))*100)+'%'}}/><b>{s.count}</b></div>)}</div>
            <div className={styles.osReportPanel}><div className={styles.osPanelHeader}>DATABASE SUMMARY</div><div className={styles.osSummaryGrid}><div><strong>{m.active}</strong><span>ACTIVE</span></div><div><strong>{m.rejected}</strong><span>REJECTED</span></div><div><strong>{m.offers}</strong><span>OFFERS</span></div><div><strong>{m.strong}</strong><span>4.0+ FIT</span></div></div></div>
          </div>
        </Window>
      </div>}

      <input ref={fileInput} hidden type="file" accept="application/json,.json" onChange={e=>{const f=e.target.files?.[0];if(f)void readImport(f)}}/>
    </div>

    <div className={styles.osTaskbar}>
      <button className={view==='desktop'?styles.osTaskActive:''} onClick={()=>setView('desktop')}>▣ DESKTOP</button>
      <button className={view==='applications'?styles.osTaskActive:''} onClick={()=>setView('applications')}>database.db</button>
      <button className={view==='pipeline'?styles.osTaskActive:''} onClick={()=>setView('pipeline')}>pipeline.exe</button>
      <button className={view==='statistics'?styles.osTaskActive:''} onClick={()=>setView('statistics')}>reports.app</button>
      <span className={styles.osTaskSpacer}/>
      <button onClick={exportJSON}>BACKUP</button>
      <button className={styles.osAddTask} onClick={()=>setAdding(true)}>＋ ADD</button>
      <strong><span className={styles.osOnlineDot}/> ONLINE</strong>
    </div>

    {selected&&<div className={styles.osOverlay} role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target){setSelected(null);setEditing(null);setDeleteConfirm(false)}}}>
      <div className={styles.osDialog} role="dialog" aria-modal="true">
        <div className={styles.osDialogTitle}><span>APPLICATION_INFO</span><button aria-label="Close application details" onClick={()=>{setSelected(null);setEditing(null);setDeleteConfirm(false)}}>×</button></div>
        {!editing?<>
          <div className={styles.osDialogBody}>
            <div className={styles.osFileIdentity}><div className={styles.osFileIcon}><BriefcaseBusiness size={28}/></div><div><span>APPLICATION RECORD</span><h2>{selected.company}</h2><p>{selected.role}</p></div></div>
            <div className={styles.osInfoStrip}><div><span>FIT</span><b>{selected.score===null?'—':selected.score.toFixed(1)}</b></div><div><span>STATE</span><b>{status(selected)}</b></div><div><span>APPLIED</span><b>{fmt(selected.appliedDate)}</b></div></div>
            <section><div className={styles.osSectionTitle}>PROCESS LOG</div><div className={styles.osTimeline}><div><i/><span><b>Applied</b><small>{fmt(selected.appliedDate)}</small></span></div>{ordered(selected).map(e=><div key={e.id}><i/><span><b>{e.label||e.type}</b><small>{eventStateLabel(e)?eventStateLabel(e)+' · ':''}{e.date?fmt(e.date):'NO DATE'}</small>{e.notes&&<small>{e.notes}</small>}</span></div>)}</div></section>
            <section><div className={styles.osSectionTitle}>NEXT ACTION</div><p>{selected.nextAction||'No next action set.'}</p>{selected.dueDate&&<time>{fmt(selected.dueDate)}</time>}</section>
            <section><div className={styles.osSectionTitle}>NOTES</div><p>{selected.notes||'No notes yet.'}</p></section>
          </div>
          <div className={styles.osDialogActions}>
            {selected.url&&<a href={selected.url} target="_blank" rel="noreferrer">OPEN JOB ↗</a>}
            {!deleteConfirm?<button onClick={()=>setDeleteConfirm(true)}><Trash2 size={13}/> DELETE</button>:<><span>DELETE RECORD?</span><button onClick={()=>setDeleteConfirm(false)}>NO</button><button className={styles.osDanger} onClick={deleteApplication} disabled={saving}>YES, DELETE</button></>}
            <button className={styles.osPrimary} onClick={()=>beginEdit(selected)}><Pencil size={13}/> EDIT</button>
          </div>
        </>:<form className={styles.osEditForm} onSubmit={saveEdit}>
          <div className={styles.osFormGrid}><label>COMPANY<input required value={editing.company} onChange={e=>editField('company',e.target.value)}/></label><label>ROLE<input required value={editing.role} onChange={e=>editField('role',e.target.value)}/></label></div>
          <div className={styles.osFormGrid}><label>APPLIED<input type="date" value={editing.appliedDate} onChange={e=>editField('appliedDate',e.target.value)}/></label><label>FIT / 5<input type="number" min="0" max="5" step=".1" value={editing.score??''} onChange={e=>editField('score',e.target.value===''?null:Number(e.target.value))}/></label></div>
          <label>JOB URL<input type="url" value={editing.url} onChange={e=>editField('url',e.target.value)}/></label>
          <div className={styles.osFormGrid}><label>NEXT ACTION<input value={editing.nextAction} onChange={e=>editField('nextAction',e.target.value)}/></label><label>DUE DATE<input type="date" value={editing.dueDate} onChange={e=>editField('dueDate',e.target.value)}/></label></div>
          <label>NOTES<textarea rows={5} value={editing.notes} onChange={e=>editField('notes',e.target.value)}/></label>
          <div className={styles.osTimelineEditorHead}><span>PROCESS LOG</span><button type="button" onClick={addEditEvent}>＋ ADD EVENT</button></div>
          <div className={styles.osTimelineStateHelp}>UPDATE = INFO ONLY · PLANNED = ANNOUNCED · SCHEDULED = DATE FIXED · COMPLETED = DONE / WAITING · PASSED = ADVANCED</div>
          <div className={styles.osTimelineEditor}>{editing.events.map((event,i)=><div className={styles.osTimelineEditRow} key={event.id}><span>{String(i+1).padStart(2,'0')}</span><select aria-label="Event type" value={event.type} onChange={e=>editEventType(event.id,e.target.value)}>{types.map(t=><option key={t}>{t}</option>)}</select>{eventStateOptions(event.type).length?<select className={styles.eventStateSelect} aria-label={event.type==='Offer'?'Offer status':'Stage status'} title={event.type==='Offer'?'Received = open offer · Accepted/Declined = final outcome · Rescinded = employer withdrew the offer':'Completed = happened, awaiting result · Passed = confirmed advancement'} value={event.state} onChange={e=>editEvent(event.id,'state',e.target.value)}>{eventStateOptions(event.type).map(s=><option key={s}>{s}</option>)}</select>:<span className={styles.osEventStateStatic}>RECORDED</span>}<input type="date" value={event.date} onChange={e=>editEvent(event.id,'date',e.target.value)}/><input placeholder="Label" value={event.label} onChange={e=>editEvent(event.id,'label',e.target.value)}/><button type="button" onClick={()=>removeEditEvent(event.id)}>×</button><input className={styles.osTimelineEventNotes} aria-label="Stage notes" placeholder="Stage notes (optional)" value={event.notes} onChange={e=>editEvent(event.id,'notes',e.target.value)}/></div>)}</div>
          <div className={styles.osDialogActions}><button type="button" onClick={()=>setEditing(null)}>CANCEL</button><button className={styles.osPrimary} type="submit" disabled={saving}>{saving?'SAVING…':'SAVE CHANGES'}</button></div>
        </form>}
      </div>
    </div>}

    {adding&&<div className={styles.osOverlay} role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)setAdding(false)}}>
      <form className={styles.osDialog} onSubmit={addApplication}>
        <div className={styles.osDialogTitle}><span>NEW_APPLICATION.wiz</span><button type="button" onClick={()=>setAdding(false)}>×</button></div>
        <div className={styles.osEditForm}>
          <div className={styles.osFormGrid}><label>COMPANY<input required value={draft.company} onChange={e=>setDraft({...draft,company:e.target.value})}/></label><label>ROLE<input required value={draft.role} onChange={e=>setDraft({...draft,role:e.target.value})}/></label></div>
          <div className={styles.osFormGrid}><label>APPLIED<input type="date" value={draft.appliedDate} onChange={e=>setDraft({...draft,appliedDate:e.target.value})}/></label><label>FIT / 5<input type="number" min="0" max="5" step=".1" value={draft.score} onChange={e=>setDraft({...draft,score:e.target.value})}/></label></div>
          <label>JOB URL<input type="url" value={draft.url} onChange={e=>setDraft({...draft,url:e.target.value})}/></label>
          <div className={styles.osFormGrid}><label>NEXT ACTION<input value={draft.nextAction} onChange={e=>setDraft({...draft,nextAction:e.target.value})}/></label><label>DUE DATE<input type="date" value={draft.dueDate} onChange={e=>setDraft({...draft,dueDate:e.target.value})}/></label></div>
          <label>NOTES<textarea rows={5} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label>
          <div className={styles.osTimelineEditorHead}><span>PROCESS LOG</span><button type="button" onClick={addDraftEvent}>＋ ADD STAGE</button></div>
          <div className={styles.osTimelineStateHelp}>OPTIONAL · ADD PROCESS HISTORY NOW OR LATER</div>
          <div className={styles.osTimelineEditor}>{draft.events.map((event,i)=><div className={styles.osTimelineEditRow} key={event.id}><span>{String(i+1).padStart(2,'0')}</span><select aria-label="Event type" value={event.type} onChange={e=>editDraftEventType(event.id,e.target.value)}>{types.map(t=><option key={t}>{t}</option>)}</select>{eventStateOptions(event.type).length?<select className={styles.eventStateSelect} aria-label={event.type==='Offer'?'Offer status':'Stage status'} value={event.state} onChange={e=>editDraftEvent(event.id,'state',e.target.value)}>{eventStateOptions(event.type).map(s=><option key={s}>{s}</option>)}</select>:<span className={styles.osEventStateStatic}>RECORDED</span>}<input type="date" value={event.date} onChange={e=>editDraftEvent(event.id,'date',e.target.value)}/><input placeholder="Label" value={event.label} onChange={e=>editDraftEvent(event.id,'label',e.target.value)}/><button type="button" onClick={()=>removeDraftEvent(event.id)}>×</button><input className={styles.osTimelineEventNotes} aria-label="Stage notes" placeholder="Stage notes (optional)" value={event.notes} onChange={e=>editDraftEvent(event.id,'notes',e.target.value)}/></div>)}</div>
          <div className={styles.osDialogActions}><button type="button" onClick={()=>setAdding(false)}>CANCEL</button><button className={styles.osPrimary} type="submit" disabled={saving}>{saving?'SAVING…':'CREATE RECORD'}</button></div>
        </div>
      </form>
    </div>}

    {(incoming||importError)&&<div className={styles.osOverlay} role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target){setIncoming(null);setImportError('')}}}>
      <div className={[styles.osDialog,styles.osImportDialog].join(' ')}>
        <div className={styles.osDialogTitle}><span>IMPORT_BACKUP.alert</span><button onClick={()=>{setIncoming(null);setImportError('')}}>×</button></div>
        <div className={styles.osDialogBody}>
          <h2>{importError?'IMPORT ERROR':'REPLACE DATABASE?'}</h2>
          {importError?<p>{importError}</p>:<p>The selected backup contains <b>{incoming?.length}</b> applications. It will replace the <b>{jobs.length}</b> records in this local database.</p>}
        </div>
        <div className={styles.osDialogActions}><button onClick={()=>{setIncoming(null);setImportError('')}}>CANCEL</button>{incoming&&<button className={styles.osPrimary} onClick={confirmImport} disabled={saving}>{saving?'IMPORTING…':'IMPORT & REPLACE'}</button>}</div>
      </div>
    </div>}
  </div>;
}
function Brutalist({jobs}:{jobs:Job[]}){
  const m=useMetrics(jobs);
  return <div className={styles.brutalist}>
    <ConceptNav variant="brutalist"/>
    <div className={styles.brutalHero}>
      <div className={styles.brutalTopline}><span>JOB APPLICATION TRACKER</span><span>NO. {String(m.total).padStart(3,'0')}</span></div>
      <div className={styles.brutalHeroGrid}>
        <div className={styles.brutalMainNumber}><span>YOU HAVE</span><strong>{m.total}</strong><b>APPLICATIONS<br/>ON THE BOARD.</b></div>
        <div className={styles.brutalSticker}>AND<br/><strong>{m.active}</strong><br/>ARE STILL<br/>ALIVE ↑</div>
        <div className={styles.brutalResponse}><span>RESPONSE RATE</span><strong>{m.responseRate}%</strong><div style={{width:m.responseRate+'%'}}/></div>
      </div>
      <div className={styles.marquee}><div>KEEP APPLYING ✦ FOLLOW UP ✦ PREP THE INTERVIEW ✦ TRACK EVERYTHING ✦ KEEP APPLYING ✦ FOLLOW UP ✦ PREP THE INTERVIEW ✦ TRACK EVERYTHING ✦</div></div>
    </div>
    <div className={styles.brutalGrid}>
      <section className={styles.brutalYellow}><span className={styles.brutalLabel}>01 / SCOREBOARD</span><div className={styles.scoreboard}><div><b>{m.thisMonth}</b><span>THIS MONTH</span></div><div><b>{m.responses}</b><span>REPLIES</span></div><div><b>{m.interviews}</b><span>INTERVIEWS</span></div><div><b>{m.offers}</b><span>OFFERS</span></div></div></section>
      <section className={styles.brutalPink}><span className={styles.brutalLabel}>02 / STATUS</span><div className={styles.brutalStages}>{m.stages.map((s,i)=><div key={s.label}><span>{String(i+1).padStart(2,'0')}</span><strong>{s.label}</strong><b>{s.count}</b></div>)}</div></section>
      <section className={styles.brutalRecent}><div className={styles.brutalSectionHead}><span>03 / RECENT</span><b>WHAT DID YOU APPLY TO?</b></div>{m.recent.map((a,i)=><article key={a.id}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{a.company}</strong><p>{a.role}</p></div><em>{status(a)}</em><b>{a.score===null?'N/A':a.score.toFixed(1)}</b>{a.url?<a href={a.url} target="_blank" rel="noreferrer"><ArrowUpRight size={20}/></a>:<ArrowRight size={20}/>}</article>)}</section>
      <section className={styles.brutalNext}><div className={styles.brutalSectionHead}><span>04 / NEXT</span><b>DO THE THING.</b></div>{m.followups.slice(0,5).map((a,i)=><article key={a.id}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{a.nextAction}</strong><p>{a.company}</p></div><time>{a.dueDate?fmt(a.dueDate):'NO DATE'}</time></article>)}{!m.followups.length&&<p>NOTHING QUEUED. SUSPICIOUSLY PEACEFUL.</p>}</section>
      <section className={styles.brutalChartBlock}><span className={styles.brutalLabel}>05 / 14-DAY OUTPUT</span><div className={styles.brutalChart}>{m.daily.map(d=><div key={d.key}><i style={{height:Math.max(3,d.count/m.maxDaily*100)+'%'}}/><span>{d.count}</span></div>)}</div><div className={styles.brutalChartCaption}><span>{m.daily[0]?.label}</span><b>APPLICATION VELOCITY</b><span>{m.daily.at(-1)?.label}</span></div></section>
      <section className={styles.brutalBlue}><TrendingUp size={32}/><span>STRONG FITS</span><strong>{m.strong}</strong><p>{m.rated?pct(m.strong,m.rated)+'% OF RATED APPLICATIONS ARE 4.0+':'NO RATED APPLICATIONS YET'}</p></section>
    </div>
    <div className={styles.brutalFooter}><span>CAREER TRACKER / CONCEPT 03</span><span>LOUD, USEFUL, UNAPOLOGETIC.</span></div>
  </div>;
}

export default function ConceptDashboard({variant}:{variant:ConceptVariant}){
  useEffect(()=>{try{localStorage.setItem('career-tracker-style',variant)}catch{}},[variant]);
  const {jobs,loading,error,saving,persist}=useTrackerData();
  if(loading||error)return <Loading variant={variant} error={error}/>;
  if(variant==='editorial')return <Editorial jobs={jobs} persist={persist} saving={saving}/>;
  if(variant==='retro')return <Retro jobs={jobs} persist={persist} saving={saving}/>;
  return <Brutalist jobs={jobs}/>;
}
