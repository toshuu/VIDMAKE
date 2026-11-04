/**
 * Wispr Flow — 30-second vertical product promo.
 * Original motion graphics + sourced product screenshots.
 * Built and rendered with VIDMAKE / X80.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { renderFrame } from '../../packages/core/dist/index.js';
import { SkiaRenderer, createSkiaMeasurer } from '../../packages/renderer-skia/dist/index.js';
import { renderToMp4 } from '../../packages/encoding/dist/index.js';

const W=540,H=960,FPS=30,N=900,OUT=new URL('../../output/wispr-flow/',import.meta.url);
mkdirSync(OUT,{recursive:true});
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'};
const I=(a,b,x,y)=>({binding:'interpolate',inputRange:[a,b],outputRange:[x,y],options:clamp});
const fade=(a,b)=>I(a,b,0,1);
const move=(a,b,x,y)=>I(a,b,x,y);
const R=(id,x,y,w,h,fill,extra={})=>({id,type:'rrect',x,y,width:w,height:h,radius:extra.radius??18,fill,...extra});
const T=(id,value,x,y,size,fill='#f8f7f4',extra={})=>({id,type:'text',text:value,x,y,fontFamily:'sans-serif',fontSize:size,fontWeight:700,fill,...extra});
const C=(id,x,y,r,fill,extra={})=>({id,type:'circle',x,y,radius:r,fill,...extra});
const S=(id,svg,x,y,w,h,extra={})=>({id,type:'svg',svg,x,y,width:w,height:h,...extra});
const scene=(id,start,end,children)=>({id,type:'container',opacity:{binding:'interpolate',inputRange:[start,start+15,end-15,end],outputRange:[0,1,1,0],options:clamp},children});
const ink='#111116',paper='#f7f5f1',violet='#8b70ff',lime='#d5ff70',muted='#aaa8b4';
const screenshot1=readFileSync(new URL('./assets/wispr-auto-edit.png',import.meta.url)).toString('base64');
const screenshot2=readFileSync(new URL('./assets/wispr-android.png',import.meta.url)).toString('base64');
const imgSvg=(b64,ratio='1.777')=>`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200"><defs><clipPath id="c"><rect x="0" y="0" width="900" height="1200" rx="44"/></clipPath></defs><g clip-path="url(#c)"><rect width="900" height="1200" fill="#19191f"/><image href="data:image/png;base64,${b64}" x="0" y="0" width="900" height="1200" preserveAspectRatio="xMidYMid slice"/></g></svg>`;
const nodes=[];
nodes.push(R('base',0,0,W,H,ink,{radius:0}));
nodes.push(S('ambient',`<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960"><defs><radialGradient id="g"><stop stop-color="#6550c8" stop-opacity=".48"/><stop offset="1" stop-color="#111116" stop-opacity="0"/></radialGradient></defs><ellipse cx="290" cy="400" rx="390" ry="470" fill="url(#g)"/></svg>`,0,0,W,H));
nodes.push(T('brand','wispr flow',32,58,18,paper,{letterSpacing:1.5}));
nodes.push(C('brand-dot',22,48,4,lime));
nodes.push(T('index','VOICE / 001',410,58,12,muted,{letterSpacing:1.5}));
nodes.push(scene('hero',0,165,[
 T('hero-kicker','YOUR THOUGHTS,',34,240,19,lime,{letterSpacing:2,opacity:fade(8,22)}),
 T('hero-title1','WITHOUT',30,330,66,paper,{opacity:fade(15,32),y:move(15,32,370,330)}),
 T('hero-title2','THE TYPING.',30,410,66,paper,{opacity:fade(22,40),y:move(22,40,450,410)}),
 T('hero-sub','Speak naturally. Get polished text.',34,510,20,muted,{fontWeight:400,opacity:fade(38,55)}),
 // kinetic sound wave
 ...Array.from({length:33},(_,i)=>R('wave-'+i,40+i*14,640-(Math.sin(i*.7)*1+1)*24,7,22+Math.abs(Math.sin(i*.7))*64,i%3===0?lime:violet,{radius:5,scaleY:I(0,90,.5,1.1)})),
 T('hero-foot','A NEW WAY TO WRITE',34,790,13,muted,{letterSpacing:2,opacity:fade(70,88)})
]));
nodes.push(scene('pain',150,315,[
 T('pain-label','THE OLD WAY',34,190,15,muted,{letterSpacing:2}),
 T('pain-title','Your ideas move\nfaster than your\nfingers.',34,275,49,paper,{lineHeight:1.15,opacity:fade(158,180)}),
 R('keyboard-card',34,560,472,180,'#22212b',{radius:24,opacity:fade(185,205)}),
 ...Array.from({length:3},(_,row)=>Array.from({length:10},(_,col)=>R('key-'+row+'-'+col,52+col*43,580+row*42,34,31,'#393743',{radius:7,opacity:fade(190,210)}))).flat(),
 T('slow','45 WPM',64,800,22,muted,{opacity:fade(205,220)}),
 T('not-enough','THOUGHTS ≠ KEYSTROKES',250,800,13,lime,{opacity:fade(210,228),letterSpacing:1})
]));
nodes.push(scene('solution',300,480,[
 T('solution-k','MEET WISPR FLOW',34,190,16,lime,{letterSpacing:2}),
 T('solution-title','Just speak.',34,275,64,paper,{opacity:fade(310,332),y:move(310,332,325,275)}),
 T('solution-copy','Flow turns your voice into clear,\npolished writing — right where\nyou are already working.',36,385,22,muted,{fontWeight:400,lineHeight:1.4,opacity:fade(330,350)}),
 S('product-shot',imgSvg(screenshot1),48,570,444,280,{opacity:fade(350,372),scaleY:I(350,372,.92,1)}),
 T('shot-caption','SPEAK NATURALLY. FLOW REFINES IT.',52,885,12,lime,{letterSpacing:1.2})
]));
nodes.push(scene('refine',465,650,[
 T('refine-k','NOT JUST TRANSCRIPTION',34,175,15,lime,{letterSpacing:2}),
 T('refine-title','It gets the\nmeaning.',34,255,57,paper,{lineHeight:1.1}),
 R('raw-card',34,430,472,132,'#27252f',{radius:20}),
 T('raw-label','YOU SAY',56,462,12,muted,{letterSpacing:1.5}),
 T('raw-text','“um… move the launch, uh,\nactually to Monday…”',56,510,20,'#e3a6a6',{fontWeight:400}),
 T('arrow','↓',250,600,34,lime),
 R('clean-card',34,650,472,150,'#282a23',{radius:20,stroke:'#667a3c',strokeWidth:1}),
 T('clean-label','FLOW WRITES',56,682,12,lime,{letterSpacing:1.5}),
 T('clean-text','Move the launch to Monday.',56,745,22,paper,{fontWeight:600}),
 T('refine-foot','FILLERS OUT. CLARITY IN.',36,855,13,muted,{letterSpacing:1.5})
]));
nodes.push(scene('everywhere',635,795,[
 T('everywhere-k','ONE FLOW. EVERYWHERE.',34,170,15,lime,{letterSpacing:2}),
 T('everywhere-title','Your apps.\nYour voice.',34,250,56,paper,{lineHeight:1.1}),
 S('phone-shot',imgSvg(screenshot2),140,430,260,350,{opacity:fade(660,680)}),
 ...[['MAC','#d6d2ff'],['WINDOWS','#91c9ff'],['IPHONE','#d5ff70'],['ANDROID','#a8e4b7']].map(([label,color],i)=>R('platform-'+i,35+i*120,825,108,38,'#282630',{radius:19,stroke:color,strokeWidth:1})),
 ...[['MAC'],['WINDOWS'],['IPHONE'],['ANDROID']].map(([label],i)=>T('platform-label-'+i,label,47+i*120,850,10,paper,{letterSpacing:.5})),
 T('languages','100+ LANGUAGES  •  INCLUDING HINDI',34,900,12,muted,{letterSpacing:1})
]));
nodes.push(scene('end',780,900,[
 C('end-glow',270,380,130,'#4d3c8c',{opacity:fade(790,820)}),
 T('end-brand','wispr flow',34,300,27,paper,{letterSpacing:1.5,opacity:fade(795,815)}),
 T('end-title1','Talk.',34,440,84,paper,{opacity:fade(810,830),y:move(810,830,490,440)}),
 T('end-title2','It writes.',34,535,84,lime,{opacity:fade(825,845),y:move(825,845,585,535)}),
 T('end-cta','WRITE AT THE SPEED OF THOUGHT.',36,700,15,paper,{letterSpacing:1.4,opacity:fade(845,865)}),
 R('end-button',34,790,260,62,lime,{radius:31,opacity:fade(850,870)}),
 T('end-button-text','TRY WISPR FLOW  ↗',62,829,15,ink,{opacity:fade(850,870)}),
 T('end-url','wisprflow.ai',36,900,13,muted,{opacity:fade(860,880)})
]));
const plan={composition:{id:'wispr-flow-promo',width:W,height:H,fps:FPS,durationInFrames:N,root:{id:'root',type:'container',children:nodes}},timeline:{kind:'sequence',from:0,durationInFrames:N,children:nodes.map(n=>({kind:'leaf',ref:n.id}))}};
const renderer=new SkiaRenderer(),measureText=createSkiaMeasurer(),surface=renderer.createSurface(W,H);
for(const frame of [40,190,370,540,700,860]){renderer.clear(surface,ink);renderFrame(renderer,surface,plan,frame,{measureText});writeFileSync(new URL('preview-'+frame+'.png',OUT),await renderer.encodePng(surface));}
const mp4=await renderToMp4({width:W,height:H,fps:FPS,frameCount:N,renderFrame:(frame)=>{renderer.clear(surface,ink);renderFrame(renderer,surface,plan,frame,{measureText});return Buffer.from(renderer.readPixels(surface).data);},onProgress:(f,t)=>{if(f%150===0)console.log('Encoded',f,'/',t);}});
writeFileSync(new URL('wispr-flow-promo.mp4',OUT),mp4);renderer.destroySurface(surface);console.log('WISPR_FLOW_RENDER_COMPLETE',mp4.length,'bytes');
