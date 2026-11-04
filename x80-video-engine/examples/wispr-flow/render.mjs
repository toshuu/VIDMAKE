/** Wispr Flow V2: original vector motion illustration campaign. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {renderFrame} from '../../packages/core/dist/index.js';
import {SkiaRenderer,createSkiaMeasurer} from '../../packages/renderer-skia/dist/index.js';
import {renderToMp4} from '../../packages/encoding/dist/index.js';
const W=540,H=960,FPS=30,N=900,OUT=new URL('../../output/wispr-flow/',import.meta.url);
mkdirSync(OUT,{recursive:true});
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'};
const I=(a,b,x,y)=>({binding:'interpolate',inputRange:[a,b],outputRange:[x,y],options:clamp});
const R=(id,x,y,w,h,fill,e={})=>({id,type:'rrect',x,y,width:w,height:h,radius:e.radius??18,fill,...e});
const C=(id,x,y,r,fill,e={})=>({id,type:'circle',x,y,radius:r,fill,...e});
const T=(id,text,x,y,size,fill,e={})=>({id,type:'text',text,x,y,fontFamily:'Arial',fontSize:size,fontWeight:e.fontWeight??700,fill,...e});
const P=(id,d,fill,e={})=>({id,type:'path',d,fill,...e});
const S=(id,a,b,children)=>({id,type:'container',opacity:{binding:'interpolate',inputRange:[a,a+15,b-15,b],outputRange:[0,1,1,0],options:clamp},children});
const cream='#f7f1e7',ink='#171c35',coral='#ff6248',blue='#536dff',lime='#f5d64e',mint='#a7e6c5',white='#fffdf8',grey='#777b89';
const n=[R('background',0,0,W,H,cream,{radius:0}),C('ambient',490,50,150,'#eee4d7'),T('brand','wispr',28,30,25,ink),C('brandmark',111,44,6,coral),T('series','VOICE / IDEAS / FLOW',320,42,11,ink,{letterSpacing:1.5})];

// 0–5.2s: illustrated speaker, oversized kinetic headline.
n.push(S('hero',0,155,[
 T('eyebrow','YOUR VOICE, UNLOCKED',28,135,13,blue,{letterSpacing:2}),
 T('hero-a','Think it.',26,195,76,ink),T('hero-b','Say it.',26,278,76,coral),
 C('sun',382,595,130,lime),
 ...Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return P('sunray'+i,'M '+(382+Math.cos(a)*145)+' '+(595+Math.sin(a)*145)+' L '+(382+Math.cos(a)*176)+' '+(595+Math.sin(a)*176),'none',{stroke:coral,strokeWidth:5});}),
 P('torso','M270 790 Q265 680 320 655 Q390 625 440 700 L455 820 Z',blue),
 R('neck',350,620,46,58,'#d99070',{radius:16}),C('head',370,540,88,'#f2ae83'),
 P('hair','M285 540 Q270 420 370 414 Q475 422 463 535 Q435 480 410 482 Q370 515 305 490 Z',ink),
 C('ear',284,555,17,'#f2ae83'),C('eye-left',345,535,5,ink),C('eye-right',402,535,5,ink),
 P('smile','M350 580 Q377 610 405 580','none',{stroke:ink,strokeWidth:5}),
 P('arm','M300 700 Q240 670 210 605 Q190 570 215 550 Q240 540 252 570 L290 630','none',{stroke:'#d99070',strokeWidth:25}),
 R('speech',38,430,190,105,white,{radius:25,stroke:ink,strokeWidth:3}),
 P('speech-tail','M178 525 L205 558 L205 525',white,{stroke:ink,strokeWidth:3}),
 T('hello','hello, world',57,466,20,ink),R('idea-pill',28,630,120,42,mint,{radius:21,rotation:-8}),T('idea','IDEA!',55,642,16,ink,{rotation:-8}),
 T('hero-caption','Wispr Flow turns speech into finished words.',28,865,16,ink,{fontWeight:500})
]));

// 5.2–10s: the keyboard obstacle course, animated keys flying away.
n.push(S('problem',150,300,[
 T('eyebrow2','THE OLD WORKFLOW',28,135,13,coral,{letterSpacing:2}),
 T('problem-title','Still typing\nevery thought?',28,185,53,ink,{lineHeight:1.1}),
 R('key-shadow',48,560,440,205,'#d8cfc2',{radius:30,rotation:-5}),R('keyboard',40,540,440,205,ink,{radius:30,rotation:-5}),
 ...Array.from({length:4},(_,r)=>Array.from({length:7},(_,c)=>R('key'+r+'-'+c,64+c*57,565+r*38,43,27,(r+c)%4===0?coral:'#3b4263',{radius:7,rotation:-5}))).flat(),
 R('spacebar',170,716,180,25,'#606789',{radius:9,rotation:-5}),
 ...Array.from({length:7},(_,i)=>R('flying-key'+i,22+i*73,405-(i%3)*28,39,35,i%2?lime:mint,{radius:8,rotation:i%2?15:-12,y:I(165+i*5,235+i*5,405-(i%3)*28,345-(i%3)*38)})),
 C('clock',425,380,61,lime,{stroke:ink,strokeWidth:4}),P('clockhand1','M425 380 L425 340','none',{stroke:ink,strokeWidth:6}),P('clockhand2','M425 380 L458 400','none',{stroke:ink,strokeWidth:6}),
 T('clocklabel','TIME IS GOING…',350,465,12,ink,{letterSpacing:1.2}),T('problem-caption','Your ideas move faster than your fingers.',28,850,17,ink)
]));

// 10–15s: voice orb, wave and flowing words.
n.push(S('voice',295,445,[
 T('eyebrow3','MEET YOUR NEW INPUT',28,135,13,blue,{letterSpacing:2}),T('voice-title','Talk. Watch\nit take shape.',28,185,56,ink,{lineHeight:1.08}),
 C('halo',270,570,154,'#e2e0ff'),C('orb',270,570,112,blue),C('orb-core',270,570,78,'#788aff'),
 ...Array.from({length:19},(_,i)=>R('wave'+i,132+i*15,555-Math.sin(i*.8)*26,7,26+Math.abs(Math.sin(i*.8))*70,i%3===0?lime:white,{radius:4})),
 R('mic',248,480,44,112,white,{radius:22,stroke:ink,strokeWidth:4}),
 P('mic-stand','M235 565 Q235 625 270 625 Q305 625 305 565 M270 625 L270 656 M245 656 L295 656','none',{stroke:ink,strokeWidth:5}),
 P('trail-a','M55 730 C165 660 325 740 470 650','none',{stroke:coral,strokeWidth:5}),P('trail-b','M55 755 C165 685 325 765 470 680','none',{stroke:blue,strokeWidth:3}),
 R('clear-pill',42,760,125,42,lime,{radius:21,rotation:-5}),T('clear-word','clear',76,773,16,ink),
 R('confident-pill',345,730,150,42,mint,{radius:21,rotation:5}),T('confident-word','confident',368,743,15,ink),
 T('voice-caption','Natural speech in. Beautiful writing out.',28,865,17,ink)
]));

// 15–20s: visual transformation from messy voice to polished writing.
n.push(S('transform',440,600,[
 T('eyebrow4','MORE THAN TRANSCRIPTION',28,130,13,coral,{letterSpacing:2}),T('transform-title','Your meaning.\nMade clear.',28,180,56,ink,{lineHeight:1.08}),
 R('raw-card',22,390,225,250,'#ead8d0',{radius:23,rotation:-3}),T('raw-label','RAW VOICE',45,415,12,coral,{letterSpacing:1.4}),
 T('raw-copy','“um… can you\nlike send the\nthingy before\nFriday, maybe?”',45,460,21,ink,{fontWeight:500,lineHeight:1.35}),
 R('clean-card',285,390,232,250,white,{radius:23,stroke:blue,strokeWidth:3}),T('clean-label','WISPR FLOW',307,415,12,blue,{letterSpacing:1.4}),
 T('clean-copy','Please send the\nfile before\nFriday.',307,468,23,ink,{lineHeight:1.35}),
 C('magic-star',270,535,38,lime),T('magic-glyph','✦',253,512,34,coral),
 P('magic-trail','M220 690 L340 570','none',{stroke:ink,strokeWidth:11}),
 ...Array.from({length:9},(_,i)=>C('spark'+i,300+Math.cos(i*Math.PI/4)*58,550+Math.sin(i*Math.PI/4)*58,5+(i%3)*2,lime)),
 C('check-circle',470,615,20,mint),T('check','✓',459,602,24,ink),
 T('transform-caption','Less cleanup. More getting things done.',28,855,17,ink)
]));

// 20–25s: illustrated desktop + phone product ecosystem.
n.push(S('devices',590,755,[
 T('eyebrow5','FITS YOUR FLOW',28,130,13,blue,{letterSpacing:2}),T('devices-title','Everywhere\nyou work.',28,180,57,ink,{lineHeight:1.08}),
 R('monitor',25,380,335,240,ink,{radius:24}),R('monitor-screen',38,393,309,214,white,{radius:15}),
 C('dot1',58,412,5,coral),C('dot2',76,412,5,lime),C('dot3',94,412,5,mint),T('app-name','wispr flow',58,440,15,ink),
 R('line1',58,482,200,8,'#e2e4ed',{radius:4}),R('line2',58,502,240,8,'#e2e4ed',{radius:4}),R('line3',58,522,210,8,'#e2e4ed',{radius:4}),
 R('highlight',58,550,250,34,'#e4f5eb',{radius:9}),T('doc-line','That sounds perfect.',70,559,14,ink),
 R('stand',160,620,70,42,ink,{radius:8}),R('foot',125,658,140,13,blue,{radius:7}),
 R('phone',355,450,150,285,ink,{radius:29,rotation:8}),R('screen',365,462,130,260,white,{radius:21,rotation:8}),R('notch',405,471,50,8,ink,{radius:4,rotation:8}),
 C('phone-orb',430,555,31,blue),T('phone-mic','●',423,545,15,white),
 ...Array.from({length:5},(_,i)=>R('phone-wave'+i,390+i*16,620,7,18+Math.sin(i+1)*16,i%2?coral:blue,{radius:4,rotation:8})),
 T('phone-label','VOICE NOTE',390,680,9,ink,{rotation:8,letterSpacing:1}),
 ...[['MAC',25,785,blue,105],['WINDOWS',145,785,coral,140],['IPHONE',300,785,ink,115],['ANDROID',25,835,blue,125]].map(([s,x,y,c,w],i)=>R('device-pill'+i,x,y,w,38,white,{radius:19,stroke:c,strokeWidth:2})),
 ...[['MAC',52,797],['WINDOWS',165,797],['IPHONE',322,797],['ANDROID',52,847]].map(([s,x,y],i)=>T('device-text'+i,s,x,y,12,ink,{letterSpacing:1})),
 T('device-caption','One voice. All your devices.',28,900,15,grey)
]));

// 25–30s: bright, simple campaign close.
n.push(S('outro',745,900,[
 C('outro-sun',270,420,190,lime),
 ...Array.from({length:16},(_,i)=>{const a=i*Math.PI/8;return P('outro-ray'+i,'M '+(270+Math.cos(a)*205)+' '+(420+Math.sin(a)*205)+' L '+(270+Math.cos(a)*245)+' '+(420+Math.sin(a)*245),'none',{stroke:coral,strokeWidth:7});}),
 T('outro-brand','wispr flow',28,170,26,ink),T('outro-a','Say more.',25,320,72,ink),T('outro-b','Type less.',25,402,72,coral),
 R('cta',28,690,315,72,ink,{radius:36}),T('cta-text','TRY WISPR FLOW  ↗',60,713,19,white,{letterSpacing:.7}),
 T('url','wisprflow.ai',30,800,17,ink),T('tagline','WRITE AT THE SPEED OF THOUGHT.',30,865,12,grey,{letterSpacing:1.6})
]));
const plan={composition:{id:'wispr-flow-v2',width:W,height:H,fps:FPS,durationInFrames:N,root:{id:'root',type:'container',children:n}},timeline:{kind:'sequence',from:0,durationInFrames:N,children:n.map(x=>({kind:'leaf',ref:x.id}))}};
const renderer=new SkiaRenderer(),measureText=createSkiaMeasurer(),surface=renderer.createSurface(W,H),opts={measureText};
for(const frame of [55,205,350,500,660,820]){renderer.clear(surface,cream);renderFrame(renderer,surface,plan,frame,opts);writeFileSync(new URL('v2-preview-'+frame+'.png',OUT),await renderer.encodePng(surface));}
const mp4=await renderToMp4({width:W,height:H,fps:FPS,frameCount:N,renderFrame:(frame)=>{renderer.clear(surface,cream);renderFrame(renderer,surface,plan,frame,opts);return Buffer.from(renderer.readPixels(surface).data);},onProgress:(f,t)=>{if(f%150===0)console.log('Encoded',f,'/',t);}});
writeFileSync(new URL('wispr-flow-promo-v2.mp4',OUT),mp4);renderer.destroySurface(surface);console.log('WISPR_FLOW_V2_COMPLETE',mp4.length,'bytes');
