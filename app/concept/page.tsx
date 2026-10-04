import Link from 'next/link';

const concepts=[
  {href:'/studio',no:'00',title:'Studio',desc:'The compact original workspace: restrained, application-first and optimized for dense daily use.'},
  {href:'/',no:'01',title:'Editorial System',desc:'Swiss editorial structure, oversized grotesk type, mono metadata, paper surfaces and selective signal colors.'},
  {href:'/concept/retro-os',no:'02',title:'Career OS',desc:'A retro desktop workspace with functional windows, file lists, process monitors and vaporwave variants.'},
  {href:'/concept/brutalist',no:'03',title:'Loud Brutalist',desc:'Poster-scale numbers, thick rules, saturated blocks, status stickers and intentionally aggressive hierarchy.'},
];

export default function ConceptIndex(){
  return <main style={{minHeight:'100vh',background:'#f1efe6',color:'#151515',fontFamily:'Arial,Helvetica,sans-serif',padding:'28px'}}>
    <div style={{maxWidth:1180,margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',fontSize:11,borderBottom:'2px solid',paddingBottom:12}}>
        <span>CAREER TRACKER / DESIGN LAB</span><Link href="/" style={{color:'inherit'}}>← CURRENT APP</Link>
      </div>
      <h1 style={{fontSize:'clamp(58px,11vw,150px)',lineHeight:.8,letterSpacing:'-.075em',margin:'48px 0 64px'}}>FOUR<br/>DIRECTIONS.</h1>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',borderTop:'2px solid',borderLeft:'2px solid'}}>
        {concepts.map((c,i)=><Link href={c.href} key={c.href} style={{color:'inherit',textDecoration:'none',padding:24,minHeight:280,borderRight:'2px solid',borderBottom:'2px solid',background:i===1?'#ded9ce':i===2?'#ff6bbb':'#f7f4ea',display:'flex',flexDirection:'column'}}>
          <span style={{fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',fontSize:11}}>{c.no}</span>
          <h2 style={{fontSize:38,letterSpacing:'-.055em',lineHeight:.95,margin:'auto 0 20px'}}>{c.title}</h2>
          <p style={{fontSize:14,lineHeight:1.4,maxWidth:320,margin:0}}>{c.desc}</p>
          <span style={{fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',fontSize:11,marginTop:28}}>OPEN CONCEPT →</span>
        </Link>)}
      </div>
    </div>
  </main>;
}
