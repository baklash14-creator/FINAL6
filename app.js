(function(){
'use strict';
var KEY='freetown-life-v2';
var N=function(n){return 'Le '+Math.round(n).toLocaleString('en-US')};
var rnd=function(a,b){return Math.floor(a+Math.random()*(b-a+1))};
var clamp=function(v){return Math.max(0,Math.min(100,v))};
var clampN=function(v,a,b){return Math.max(a,Math.min(b,v))};
var NEEDS=['food','energy','fun','social','hygiene'];
var NL={food:'Food',energy:'Energy',fun:'Fun',social:'Social',hygiene:'Hygiene',health:'health'};
var SKINS=['#f1c8a0','#d9a273','#b87a4b','#8a5530','#5a361d'];
var SHIRTS=['#1eb53a','#0072c6','#f2b630','#d6403a','#14221a'];
var S=null,pend=null,tab='play',ui={modal:null,name:'',skin:3,shirt:0,confirm:false};
var HPS=1/15; /* game hours per real second */

function fresh(){return{started:false,won:false,name:'',skin:SKINS[3],shirt:SHIRTS[0],t:7,cash:200,health:100,food:70,energy:80,fun:60,social:50,hygiene:70,loc:'home',px:190,py:389,visited:{home:1},own:{},study:0,shifts:0,fr:{},rent:300,nextRent:7,debt:0,lastDay:1,powerOff:false,powerBack:0,collapses:0,earned:0,house:false,log:[{t:'Welcome to Freetown. Rent is due on day 7. Walk out the door and find something to do.',k:'info'}]}}
function save(){try{if(P){S.px=Math.round(P.x);S.py=Math.round(P.y)}if(!pend)localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function load(){try{var r=localStorage.getItem(KEY);var o=r?JSON.parse(r):null;return o&&o.own&&o.log?Object.assign(fresh(),o):null}catch(e){return null}}
function log(t,k){S.log.unshift({t:t,k:k||''});if(S.log.length>30)S.log.length=30}
function txt(v){return typeof v==='function'?v():v}
function dayNum(){return Math.floor(S.t/24)+1}
function hourNow(){return S.t%24}
function hr(h){var hh=h%24,ap=hh>=12?'pm':'am',h12=hh%12||12;return h12+':00 '+ap}
function clock(){var h=hourNow(),hh=Math.floor(h),mm=Math.round((h-hh)*60);if(mm===60){hh++;mm=0}hh%=24;var ap=hh>=12?'pm':'am',h12=hh%12||12;return h12+':'+(mm<10?'0':'')+mm+' '+ap}
function fmtH(h){return h<1?Math.round(h*60)+'m':(h%1?h.toFixed(1):h)+'h'}
function eduLevel(){return Math.min(6,Math.floor(S.study/3))}
function powerOK(){return !S.powerOff||!!S.own.gen}
function hasPerk(id){var f=S.fr[id];return !!(f&&f.rel>=30)}
function tierName(r){return r>=70?'Best friend':r>=30?'Friend':r>=1?'Acquaintance':'New face'}
var P=null;

/* ---------- data ---------- */
var FRIENDS=[
 {id:'mohamed',name:'Mohamed',role:'Poda-poda driver and football fanatic',loc:'beach',hrs:[14,19],pos:[1440,430],skin:SKINS[3],shirt:SHIRTS[1],hint:'Plays football at the beach in the afternoon.',perk:'Beach football gives you +10 extra fun.'},
 {id:'fatmata',name:'Fatmata',role:'Market trader with a sharp tongue',loc:'market',hrs:[8,17],pos:[820,392],skin:SKINS[4],shirt:SHIRTS[3],hint:'Works her stall at Big Market in the daytime.',perk:'10% off food at the market.'},
 {id:'abu',name:'Abu',role:'Musician who plays the beach parties',loc:'beach',hrs:[19,24],pos:[1450,570],skin:SKINS[2],shirt:SHIRTS[2],hint:'Plays at the beach in the evening.',perk:'Beach parties cost Le 60 instead of Le 100.'},
 {id:'isatu',name:'Isatu',role:'Nurse who never sits down',loc:'worship',hrs:[8,14],pos:[700,722],skin:SKINS[3],shirt:SHIRTS[0],hint:'Goes to morning services.',perk:'Your health recovers twice as fast.'},
 {id:'alhaji',name:'Alhaji Sesay',role:'Retired headmaster',loc:'worship',hrs:[16,20],pos:[790,722],skin:SKINS[4],shirt:SHIRTS[4],hint:'Sits outside the place of worship in the late afternoon.',perk:'Study sessions count for more.'},
 {id:'mariama',name:'Mariama',role:'Medical student',loc:'college',hrs:[9,17],pos:[270,722],skin:SKINS[2],shirt:SHIRTS[1],hint:'Studies at Fourah Bay College in the daytime.',perk:'Study sessions count for more.'}
];
function frById(id){return FRIENDS.filter(function(f){return f.id===id})[0]}
function frState(id){return S.fr[id]||(S.fr[id]={met:false,rel:0,gift:0})}
function inHours(f){var h=hourNow();return h>=f.hrs[0]&&h<f.hrs[1]}
function present(f){return inHours(f)&&S.loc===f.loc}

var ITEMS=[
 {id:'phone',name:'Smartphone',price:1000,desc:'Call friends from anywhere. Your social need drains slower.'},
 {id:'gen',name:'Generator',price:900,desc:'Keeps the TV and fan going when EDSA cuts the light.'},
 {id:'clothes',name:'Nice clothes',price:500,desc:'People warm to you faster. Social gains rise 25%.'},
 {id:'mattress',name:'Good mattress',price:700,desc:'Sleep restores 25% more energy.'},
 {id:'radio',name:'Battery radio',price:150,desc:'Fun at home even when the light is out.'}
];
var HOUSE_PRICE=30000;
function foodPrice(p){return hasPerk('fatmata')?Math.round(p*.9):p}
function officeTitle(){var l=eduLevel();return l>=6?'Manager':l>=4?'Bank officer':'Clerk'}
function officePay(){var l=eduLevel();return l>=6?[520,700]:l>=4?[320,440]:[200,280]}

var LOCS={
 street:{name:'On the street',desc:'Out in the Freetown air. Walk onto the marked doorstep of a place to see what it offers.',acts:[
  {id:'sit',label:'Rest on a bench',desc:'Watch the traffic go by.',hrs:1,fx:{energy:8,fun:2}},
  {id:'greet',label:'Greet passers-by',desc:'"Kushe!" Everybody has time for a greeting.',hrs:.5,fx:{social:8,fun:3}}
 ]},
 home:{name:function(){return S.house?'Your house, Hill Station':'Your room in Kissy'},desc:'Your own space. Sleep, wash, cook and rest.',acts:[
  {id:'sleep',label:'Sleep until morning',desc:'Best after 7 pm. You wake at 6:00 am.',hrs:function(){var h=hourNow();return h<6?6-h:30-h},sleep:true,noEvent:true,fx:{},show:['+energy'],need:function(){var h=hourNow();return (h>=19||h<5||S.energy<35)?'':'Not sleepy yet. Try after 7:00 pm.'},log:'You slept deep and woke up at 6:00 am.'},
  {id:'nap',label:'Take a nap',desc:'Two hours on the mat.',hrs:2,fx:{energy:20}},
  {id:'wash',label:'Bucket bath',desc:'Quick wash before heading out.',hrs:.5,fx:{hygiene:60,fun:3}},
  {id:'cook',label:'Cook rice and stew',desc:'Home cooking.',hrs:1,cost:25,fx:{food:42,fun:3}},
  {id:'tv',label:function(){return powerOK()?'Watch TV':'Listen to the radio'},desc:function(){return powerOK()?'Football highlights and Nollywood.':'No light, so it is the battery radio.'},hrs:2,fx:function(){return {fun:powerOK()?26:12}},need:function(){return (powerOK()||S.own.radio)?'':'No light, and no radio.'}},
  {id:'rent',label:'Pay overdue rent',desc:'The landlord keeps knocking.',hrs:.25,cost:function(){return S.debt},vis:function(){return S.debt>0},fx:{fun:5},run:function(){S.debt=0;return 'You cleared the overdue rent. The landlord smiled at last.'}}
 ]},
 market:{name:'Big Market',desc:'Stalls, cookshops, haggling and gist from sunrise until late afternoon.',acts:[
  {id:'eat1',label:'Cassava leaf and rice',desc:'A plate from the cookshop.',hrs:.5,cost:function(){return foodPrice(30)},fx:{food:40,fun:2}},
  {id:'eat2',label:'Jollof, fried fish and plantain',desc:'A proper sit-down plate.',hrs:1,cost:function(){return foodPrice(80)},fx:{food:65,fun:8}},
  {id:'snack',label:'Groundnuts and a cold drink',desc:'Small snack on the move.',hrs:.25,cost:function(){return foodPrice(10)},fx:{food:12,fun:2}},
  {id:'browse',label:'Bargain and browse',desc:'Chat, haggle and window-shop.',hrs:2,fx:{fun:10,social:10,energy:-4},run:function(){if(Math.random()<.4){var t=rnd(10,40);S.cash+=t;return 'You helped a trader carry a load and earned '+N(t)+'.'}return 'You haggled for fun. No luck today.'}},
  {id:'stall',label:'Work at a stall',desc:'Needs education level 1. Weigh, sell, count change.',hrs:5,win:[8,13],pay:[110,160],fx:{energy:-12,food:-8,fun:-6,hygiene:-8,social:4},need:function(){return eduLevel()<1?'Needs education level 1. Study at the college.':''}}
 ]},
 congo:{name:'Congo Cross',desc:'The busiest junction in town. Poda-podas, keke taxis and hawkers everywhere.',acts:[
  {id:'hawk',label:'Hawk in the traffic',desc:'Water sachets, cold drinks and groundnuts.',hrs:3,win:[6,18],pay:[40,90],fx:{energy:-12,food:-6,fun:-5,hygiene:-10}},
  {id:'crew',label:'Chat with the poda-poda crew',desc:'Gist, jokes and the latest football talk.',hrs:1,fx:{fun:8,social:12}}
 ]},
 beach:{name:'Lumley Beach',desc:'Sand, sea breeze and the best evenings in the city.',acts:[
  {id:'swim',label:'Swim in the sea',desc:'Cool off and wash the day away.',hrs:2,fx:{fun:30,hygiene:20,energy:-12}},
  {id:'football',label:'Beach football',desc:'Pick-up game from 2 pm.',hrs:2,win:[14,19],fx:function(){return {fun:28+(hasPerk('mohamed')?10:0),social:15,energy:-16,hygiene:-10}}},
  {id:'grill',label:'Grilled fish and a cold drink',desc:'Fresh from the grill by the sand.',hrs:1,cost:60,fx:{food:45,fun:10}},
  {id:'walk',label:'Walk the shore',desc:'Slow stroll at the water line.',hrs:1,fx:{fun:10,social:4}},
  {id:'party',label:'Beach party',desc:'Live music, from 7 pm until late.',hrs:3,win:[19,24],cost:function(){return hasPerk('abu')?60:100},fx:{fun:45,social:30,energy:-10,hygiene:-12,food:-8}}
 ]},
 office:{name:'Siaka Stevens Street',desc:'Banks, offices and ministries in the city centre.',acts:[
  {id:'shift',label:function(){return 'Work shift as '+officeTitle()},desc:'Six hours at the desk. Study to climb the ladder.',hrs:6,win:[8,13],pay:officePay,fx:{energy:-14,food:-8,fun:-8,hygiene:-8,social:6},need:function(){return eduLevel()<2?'Needs education level 2. Study at the college.':''}},
  {id:'lunch',label:'Lunch with colleagues',desc:'Proper lunch break.',hrs:1,win:[12,15],cost:40,fx:{food:35,social:12,fun:4}}
 ]},
 college:{name:'Fourah Bay College',desc:'The old hilltop campus. Libraries, lecture halls and ambitious people.',acts:[
  {id:'study',label:'Study in the library',desc:'Three sessions earn an education level.',hrs:3,win:[8,20],fx:{fun:-8,energy:-8},show:['+education'],run:function(){var g=1+(hasPerk('mariama')?.5:0)+(hasPerk('alhaji')?.5:0);S.study+=g;return 'You studied hard. Education level '+eduLevel()+', '+(Math.floor(S.study%3*10)/10)+' of 3 toward the next.'}},
  {id:'canteen',label:'Student canteen',desc:'Cheap hot meal.',hrs:1,cost:20,fx:{food:30,social:6}}
 ]},
 worship:{name:'Place of worship',desc:'Church bells and the call to prayer share the same street.',acts:[
  {id:'service',label:'Attend a service',desc:'Singing, greetings and good company.',hrs:2,win:[7,20],fx:{fun:10,social:20,energy:-2}},
  {id:'pray',label:'Quiet prayer',desc:'A calm hour to yourself.',hrs:1,fx:{fun:8,energy:6}}
 ]},
 hill:{name:'Hill Station',desc:'Cool air above the city. Colonial-era villas with the best views in town.',acts:[
  {id:'view',label:'Take in the view',desc:'The whole harbour spread out below.',hrs:1,fx:{fun:25,social:3,energy:3}},
  {id:'picnic',label:'Picnic on the hill',desc:'Food, friends and fresh air.',hrs:2,cost:100,fx:{food:35,fun:30,social:15}},
  {id:'house',label:'Buy a house here',desc:'Your own house. No more rent.',hrs:.5,cost:HOUSE_PRICE,vis:function(){return !S.house},need:function(){return S.debt>0?'Clear your overdue rent first.':''},fx:{fun:30},run:function(){S.house=true;S.rent=0;S.debt=0;return 'You bought a house on Hill Station. The view is yours.'}}
 ]}
};
var ORDER=['home','market','congo','beach','office','college','worship','hill'];
var RIDE={poda:{name:'Poda-poda',c:5,speed:210},keke:{name:'Keke',c:25,speed:340}};

var GOALS=[
 {t:'Save Le 5,000',p:function(){return Math.min(1,S.cash/5000)},d:function(){return S.cash>=5000}},
 {t:'Get an office job (education level 2)',p:function(){return Math.min(1,eduLevel()/2)},d:function(){return eduLevel()>=2}},
 {t:'Make 3 friends',p:function(){return Math.min(1,FRIENDS.filter(function(f){return frState(f.id).rel>=30}).length/3)},d:function(){return FRIENDS.filter(function(f){return frState(f.id).rel>=30}).length>=3}},
 {t:'Get a best friend',p:function(){return Math.min(1,Math.max.apply(null,FRIENDS.map(function(f){return frState(f.id).rel}))/70)},d:function(){return FRIENDS.some(function(f){return frState(f.id).rel>=70})}},
 {t:'Own a phone and a generator',p:function(){return ((S.own.phone?1:0)+(S.own.gen?1:0))/2},d:function(){return !!(S.own.phone&&S.own.gen)}},
 {t:'Visit every part of the city',p:function(){return Math.min(1,Object.keys(S.visited).length/ORDER.length)},d:function(){return Object.keys(S.visited).length>=ORDER.length}},
 {t:'Survive 30 days',p:function(){return Math.min(1,dayNum()/30)},d:function(){return dayNum()>=30}},
 {t:'Buy a house on Hill Station',p:function(){return S.house?1:Math.min(1,S.cash/HOUSE_PRICE)},d:function(){return S.house}}
];

/* ---------- engine ---------- */
function collapse(){
  var fee=Math.min(S.cash,300);S.cash-=fee;
  S.t=(Math.floor(S.t/24)+1)*24+8;
  NEEDS.forEach(function(k){S[k]=50});S.health=40;S.collapses++;
  S.loc='home';S.powerOff=false;
  if(P){P.x=190;P.y=389;P.target=null}
  R=null;T=null;
  log('You collapsed and woke up at the clinic. Bill: '+N(fee)+'. A neighbour carried you home.','bad');
  save();
}
function tick(hrs,sleeping){
  var steps=Math.max(1,Math.ceil(hrs*2)),dt=hrs/steps;
  for(var i=0;i<steps;i++){
    S.t+=dt;
    var h=hourNow();
    if(sleeping){S.energy=clamp(S.energy+11*dt*(S.own.mattress?1.25:1));S.food=clamp(S.food-1.2*dt);S.fun=clamp(S.fun-.5*dt);S.social=clamp(S.social-.5*dt);S.hygiene=clamp(S.hygiene-.8*dt)}
    else{S.food=clamp(S.food-3.2*dt);S.energy=clamp(S.energy-(h>=1&&h<5?4.5:2.4)*dt);S.fun=clamp(S.fun-2.6*dt);S.social=clamp(S.social-(S.own.phone?1.4:1.8)*dt);S.hygiene=clamp(S.hygiene-1.6*dt)}
    var zero=NEEDS.some(function(k){return S[k]<=.5});
    if(zero)S.health=clamp(S.health-7*dt);
    else if(NEEDS.every(function(k){return S[k]>35}))S.health=clamp(S.health+(hasPerk('isatu')?2:1)*dt);
    if(S.powerOff&&S.t>=S.powerBack){S.powerOff=false;log('EDSA brought the light back.','info')}
    var d=dayNum();
    if(d>S.lastDay){S.lastDay=d;if(S.debt>0){S.fun=clamp(S.fun-5);log('The landlord is knocking about the overdue rent.','bad')}}
    if(d>=S.nextRent){
      S.nextRent+=7;
      if(S.rent>0){if(S.cash>=S.rent){S.cash-=S.rent;log('Landlord collected '+N(S.rent)+' rent.','info')}else{S.debt+=S.rent;log('You could not pay '+N(S.rent)+' rent. It is now overdue.','bad')}}
    }
    if(S.health<=0){collapse();return false}
  }
  return true;
}
function applyFx(fx){
  if(!fx)return;
  for(var k in fx){var v=fx[k];if(k==='social'&&v>0&&S.own.clothes)v*=1.25;S[k]=clamp(S[k]+v)}
}
function costOf(a){return typeof a.cost==='function'?a.cost():(a.cost||0)}
function hrsOf(a){return typeof a.hrs==='function'?a.hrs():a.hrs}
function why(a){
  if(a.win){var h=hourNow();if(h<a.win[0]||h>=a.win[1])return 'Available '+hr(a.win[0])+' to '+hr(a.win[1])}
  if(a.need){var r=a.need();if(r)return r}
  if(S.cash<costOf(a))return 'Need '+N(costOf(a));
  return '';
}
function doAction(o){
  var c=o.cost||0;
  if(S.cash<c)return;
  S.cash-=c;
  var alive=tick(o.hrs,o.sleep);
  if(!alive){render();return}
  applyFx(o.fx);
  if(o.pay){S.cash+=o.pay;S.earned+=o.pay}
  var m=o.run?o.run():null;
  var msg=m||o.log;
  if(msg)log(msg,o.k||'');
  if(!o.noEvent&&Math.random()<Math.min(.4,.06*o.hrs)){
    var el=EV.filter(function(e){return e.ok()});
    if(el.length)pend=el[rnd(0,el.length-1)].build();
  }
  save();render();
}
function doAct(a){
  if(why(a))return;
  var fx=txt(a.fx);
  var pr=a.pay?txt(a.pay):null;
  var pay=pr?Math.round(rnd(pr[0],pr[1])/5)*5:0;
  var lab=txt(a.label);
  if(pr)S.shifts++;
  doAction({hrs:hrsOf(a),cost:costOf(a),fx:fx,pay:pay,sleep:a.sleep,noEvent:a.noEvent,run:a.run,log:a.log||(lab+(pay?': earned '+N(pay)+'.':'.')),k:pay?'good':''});
}
function frAct(id,kind){
  var f=frById(id),st=frState(id),o=null;
  var near=present(f);
  if(kind==='hello'&&near&&!st.met)o={hrs:.25,fx:{social:6},run:function(){st.met=true;st.rel=Math.max(st.rel,5);return 'You met '+f.name+'. '+f.role+'.'}};
  else if(!st.met)return;
  else if(kind==='chat'&&near)o={hrs:1,fx:{social:18,fun:8},run:function(){st.rel=Math.min(100,st.rel+10);return 'You had a good chat with '+f.name+'.'}};
  else if(kind==='meal'&&near&&S.cash>=40)o={hrs:1,cost:40,fx:{food:30,social:12},run:function(){st.rel=Math.min(100,st.rel+16);return 'You shared a meal with '+f.name+'.'}};
  else if(kind==='gift'&&near&&S.cash>=50&&st.gift!==dayNum())o={hrs:.25,cost:50,fx:{social:4},run:function(){st.gift=dayNum();st.rel=Math.min(100,st.rel+15);return 'You gave '+f.name+' a gift. They were touched.'}};
  else if(kind==='hang'&&near)o={hrs:2,fx:{fun:25,social:25,energy:-8,hygiene:-6},run:function(){st.rel=Math.min(100,st.rel+14);return 'You hung out with '+f.name+' for a couple of hours.'}};
  else if(kind==='call'&&S.own.phone&&S.cash>=5)o={hrs:.5,cost:5,fx:{social:10},run:function(){st.rel=Math.min(100,st.rel+4);return 'You called '+f.name+' and caught up.'}};
  if(o)doAction(o);
}
function buy(id){
  var it=ITEMS.filter(function(i){return i.id===id})[0];
  if(!it||S.own[id]||S.cash<it.price||S.loc!=='market')return;
  S.cash-=it.price;S.own[id]=1;S.fun=clamp(S.fun+10);
  log('Bought: '+it.name+' for '+N(it.price)+'.','info');
  save();render();
}
function resolve(i){
  var c=pend.choices[i];
  if(c.cost&&S.cash<c.cost)return;
  var title=pend.title;
  var m=c.do();
  pend=null;
  if(m)log(title+': '+m,'');
  NEEDS.concat(['health']).forEach(function(k){S[k]=clamp(S[k])});
  save();render();
}

/* ---------- events ---------- */
function ev(ok,build){return{ok:ok,build:build}}
var EV=[
 ev(function(){return !S.powerOff},function(){
   S.powerOff=true;S.powerBack=S.t+rnd(3,6);
   if(S.own.gen)return{title:'Power cut',text:'EDSA has cut the light again. Your generator hums while the street goes dark.',choices:[{label:'Fuel it ('+N(25)+')',cost:25,do:function(){S.cash-=25;S.fun=clamp(S.fun+3);return 'The generator carried you through. Neighbours are jealous.'}}]};
   return{title:'Power cut',text:'EDSA has cut the light again. Dark street, hot room, dying phone.',choices:[
     {label:'Endure it',do:function(){S.fun=clamp(S.fun-8);S.energy=clamp(S.energy-5);return 'You sweated through it.'}},
     {label:'Charge at the kiosk ('+N(10)+')',cost:10,do:function(){S.cash-=10;S.fun=clamp(S.fun-2);return 'Phone charged at the corner kiosk. Small dent to your mood.'}}]}}),
 ev(function(){return true},function(){return{title:'Traffic jam',text:'The road is jammed. Horns everywhere, nobody moving.',choices:[
   {label:'Wait it out',do:function(){tick(1.5);S.fun=clamp(S.fun-4);return 'An hour and a half lost in traffic.'}},
   {label:'Take a keke round it ('+N(30)+')',cost:30,do:function(){S.cash-=30;return 'You zipped past the jam.'}}]}}),
 ev(function(){return S.cash>=40},function(){return{title:'Touts at the junction',text:'"Boss, something for the boys?"',choices:[
   {label:'Pay '+N(40),cost:40,do:function(){S.cash-=40;return 'You paid and walked on.'}},
   {label:'Talk your way out',do:function(){if(Math.random()<.5){return 'You made them laugh. They let you through.'}var l=Math.min(S.cash,70);S.cash-=l;S.fun=clamp(S.fun-10);return 'They did not buy it. It cost you '+N(l)+' and your mood.'}}]}}),
 ev(function(){return true},function(){var f=rnd(20,80);return{title:'Found money',text:'A folded note sits at the bus stop. Nobody is looking.',choices:[{label:'Pocket it',do:function(){S.cash+=f;S.fun=clamp(S.fun+5);return 'You found '+N(f)+'. Good day.'}}]}}),
 ev(function(){return !!S.own.phone},function(){return{title:'Orange Money alert',text:'A text says you won Le 50,000 and asks for your PIN plus a small fee to claim it.',choices:[
   {label:'Send the fee ('+N(120)+')',cost:120,do:function(){S.cash-=120;S.fun=clamp(S.fun-10);return 'It was a scam. Naturally.'}},
   {label:'Ignore it',do:function(){S.fun=clamp(S.fun+2);return 'You deleted it. Wisdom.'}},
   {label:'Forward it to the family group',do:function(){S.fun=clamp(S.fun+5);return 'Your aunt replied with seven prayer emojis.'}}]}}),
 ev(function(){return true},function(){return{title:'Heavy rain',text:'The rains flood the gutters. Poda-podas stop running.',choices:[
   {label:'Wade through',do:function(){S.hygiene=clamp(S.hygiene-12);S.fun=clamp(S.fun-6);return 'You waded through soaked but fine.'}},
   {label:'Shelter in a cookshop ('+N(35)+')',cost:35,do:function(){S.cash-=35;S.food=clamp(S.food+25);return 'Hot pepper soup while the sky drained itself.'}}]}}),
 ev(function(){var h=hourNow();return h>=10&&h<20},function(){return{title:'Naming ceremony',text:'A neighbour is celebrating a baby\'s naming ceremony. Rice, jollof and drums.',choices:[
   {label:'Go with a gift ('+N(60)+')',cost:60,do:function(){S.cash-=60;S.food=clamp(S.food+50);S.fun=clamp(S.fun+20);S.social=clamp(S.social+25);return 'You ate well, danced harder and made friends.'}},
   {label:'Skip it',do:function(){S.social=clamp(S.social-3);return 'You stayed in. The drums reached you anyway.'}}]}}),
 ev(function(){return S.hygiene<35||S.health<55},function(){return{title:'Malaria strikes',text:'Fever, chills and a heavy head. You have been pushing yourself too far.',choices:[
   {label:'Go to the clinic ('+N(120)+')',cost:120,do:function(){S.cash-=120;S.health=clamp(S.health+30);return 'The clinic sorted you out properly.'}},
   {label:'Buy drugs at the pharmacy ('+N(50)+')',cost:50,do:function(){S.cash-=50;S.health=clamp(S.health+10);S.energy=clamp(S.energy-10);return 'It helped a bit. You still feel rough.'}}]}}),
 ev(function(){return !!S.own.phone&&FRIENDS.some(function(f){return frState(f.id).met})},function(){
   var met=FRIENDS.filter(function(f){return frState(f.id).met});var f=met[rnd(0,met.length-1)];
   return{title:f.name+' texts you',text:f.name+' wants to hang out this evening. "Come, no excuse!"',choices:[
     {label:'Go (2 hours)',do:function(){tick(2);S.social=clamp(S.social+20);S.fun=clamp(S.fun+18);var st=frState(f.id);st.rel=Math.min(100,st.rel+10);return 'You had a great time with '+f.name+'.'}},
     {label:'Maybe next time',do:function(){S.social=clamp(S.social-4);return 'You cancelled. '+f.name+' sent a sad face.'}}]}})
];
var R=null,T=null;

/* ---------- world ---------- */
var WW=1600,WH=1050,VW=480,VH=320,WALKSP=118;
var ROADS=[{x:0,y:420,w:1390,h:70},{x:0,y:780,w:1390,h:70},{x:520,y:0,w:70,h:1050},{x:1060,y:0,w:70,h:1050}];
var ZONES={
 home:{x:100,y:366,w:180,h:46,ax:195,ay:455,road:'A'},
 market:{x:630,y:366,w:240,h:46,ax:750,ay:455,road:'A'},
 congo:{x:430,y:500,w:85,h:90,ax:555,ay:455,road:'A'},
 beach:{x:1392,y:260,w:106,h:440,ax:1380,ay:455,road:'A'},
 office:{x:1150,y:366,w:220,h:46,ax:1260,ay:455,road:'A'},
 college:{x:100,y:696,w:240,h:46,ax:220,ay:815,road:'B'},
 worship:{x:640,y:696,w:200,h:46,ax:740,ay:815,road:'B'},
 hill:{x:180,y:880,w:300,h:110,ax:330,ay:815,road:'B'}
};
var BLD=[
 {id:'home',name:'Home',x:110,y:240,w:160,h:120,c:'#e7b66b',roof:'#b5542f'},
 {id:'market',name:'Big Market',x:640,y:230,w:220,h:130,c:'#f2d4a0',roof:'#2b7a4b'},
 {id:'office',name:'Siaka Stevens St',x:1160,y:220,w:200,h:140,c:'#9fb9d6',roof:'#33557a'},
 {id:'college',name:'Fourah Bay College',x:110,y:560,w:220,h:130,c:'#e9e1c9',roof:'#7a3b2e'},
 {id:'worship',name:'Place of Worship',x:650,y:560,w:180,h:130,c:'#f4f1ea',roof:'#707a86'}
];
var LANES=[
 {a:'h',c:441,d:1,len:1400},{a:'h',c:469,d:-1,len:1400},{a:'h',c:801,d:1,len:1400},{a:'h',c:829,d:-1,len:1400},
 {a:'v',c:538,d:1,len:1050},{a:'v',c:572,d:-1,len:1050},{a:'v',c:1078,d:1,len:1050},{a:'v',c:1112,d:-1,len:1050}
];
var PLINES=[
 {a:'h',c:394,r:[0,1380]},{a:'h',c:506,r:[0,1380]},{a:'h',c:752,r:[0,1380]},{a:'h',c:868,r:[0,1380]},
 {a:'v',c:504,r:[0,1040]},{a:'v',c:606,r:[0,1040]},{a:'v',c:1044,r:[0,1040]},{a:'v',c:1146,r:[0,1040]}
];
var cv=null,ctx=null,bg=null,WIN=[],K={},W={time:0,toast:'',toastT:0,shake:0,evT:90,thiefT:80,hitT:0,hintT:9};
var cam={x:0,y:0},VEH=[],PEDS=[],acc=0,uiT=0,saveT=0;

function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function zoneCenter(z){return {x:z.x+z.w/2,y:z.y+z.h/2}}
function zoneAt(x,y){
  for(var i=0;i<ORDER.length;i++){var z=ZONES[ORDER[i]];if(x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h)return ORDER[i]}
  return 'street';
}
function solidPt(x,y){
  if(x<10||x>1488||y<12||y>WH-8)return true;
  for(var i=0;i<BLD.length;i++){var b=BLD[i];if(x>b.x&&x<b.x+b.w&&y>b.y-10&&y<b.y+b.h)return true}
  return false;
}
function solidAt(x,y){return solidPt(x-6,y)||solidPt(x,y)||solidPt(x+6,y)}
function toast(t){W.toast=t;W.toastT=2.4}

function sign(g,text,cx,cy){
  g.font='700 12px Archivo, system-ui, sans-serif';
  var w=g.measureText(text).width+16;
  g.fillStyle='rgba(0,0,0,.2)';rr(g,cx-w/2+2,cy-9+3,w,20,4);g.fill();
  g.fillStyle='#fffdf4';rr(g,cx-w/2,cy-9,w,20,4);g.fill();
  g.strokeStyle='#14221a';g.lineWidth=1.5;g.stroke();
  g.fillStyle='#14221a';g.textAlign='center';g.textBaseline='middle';g.fillText(text,cx,cy+1);
}
function tree(g,x,y,s){
  g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.ellipse(x,y+4,14*s,5*s,0,0,7);g.fill();
  g.fillStyle='#6b4a2e';g.fillRect(x-2.5*s,y-14*s,5*s,16*s);
  g.fillStyle='#2e8b45';g.beginPath();g.arc(x,y-24*s,15*s,0,7);g.fill();
  g.fillStyle='#3aa056';g.beginPath();g.arc(x-5*s,y-28*s,9*s,0,7);g.fill();
}
function palm(g,x,y){
  g.strokeStyle='#7a5a36';g.lineWidth=4;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+6,y-24,x+2,y-46);g.stroke();
  g.strokeStyle='#2e8b45';g.lineWidth=4;
  for(var i=0;i<6;i++){var a=i/6*Math.PI*2;g.beginPath();g.moveTo(x+2,y-46);g.quadraticCurveTo(x+2+Math.cos(a)*16,y-54+Math.sin(a)*6,x+2+Math.cos(a)*26,y-44+Math.sin(a)*12);g.stroke()}
}
function umbrella(g,x,y,col){
  g.fillStyle='rgba(0,0,0,.15)';g.beginPath();g.ellipse(x,y+2,16,5,0,0,7);g.fill();
  g.fillStyle='#5b3a24';g.fillRect(x-1.5,y-22,3,24);
  g.fillStyle=col;g.beginPath();g.arc(x,y-22,16,Math.PI,0);g.closePath();g.fill();
  g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.arc(x,y-22,16,Math.PI*1.2,Math.PI*1.45);g.lineTo(x,y-22);g.fill();
}
function drawBuilding(g,b){
  var x=b.x,y=b.y,w=b.w,h=b.h;
  g.fillStyle='rgba(0,0,0,.18)';g.fillRect(x+6,y+h-4,w,10);
  g.fillStyle=b.c;g.fillRect(x,y,w,h);
  g.fillStyle=b.roof;g.fillRect(x-6,y-16,w+12,34);
  g.fillStyle='rgba(255,255,255,.16)';g.fillRect(x-6,y-16,w+12,6);
  var n=Math.max(2,Math.floor(w/52));
  for(var i=0;i<n;i++){
    var wx=x+16+i*((w-38)/(n-1)),wy=y+32;
    g.fillStyle='#35506b';g.fillRect(wx,wy,22,26);
    g.fillStyle='rgba(255,255,255,.25)';g.fillRect(wx+2,wy+2,8,22);
    WIN.push({x:wx,y:wy,w:22,h:26});
  }
  g.fillStyle='#5b3a24';g.fillRect(x+w/2-13,y+h-34,26,34);
  g.fillStyle='#d9b45a';g.fillRect(x+w/2+6,y+h-18,3,3);
  if(b.id==='market'){for(var s=0;s<11;s++){g.fillStyle=s%2?'#fff':'#d6403a';g.fillRect(x+s*20,y+h-6,20,10)}}
  if(b.id==='worship'){g.fillStyle='#f4f1ea';g.fillRect(x+w/2-10,y-58,20,44);g.fillStyle='#707a86';g.beginPath();g.moveTo(x+w/2-14,y-58);g.lineTo(x+w/2,y-80);g.lineTo(x+w/2+14,y-58);g.fill();g.fillStyle='#c9a227';g.fillRect(x+w/2-1.5,y-92,3,14);g.fillRect(x+w/2-6,y-88,12,3)}
  if(b.id==='college'){g.fillStyle='#d9d1b6';for(var c=0;c<5;c++)g.fillRect(x+14+c*44,y+66,10,h-66)}
  if(b.id==='office'){g.fillStyle='#33557a';g.fillRect(x+w-40,y-50,28,34);g.fillStyle='#9fb9d6';g.fillRect(x+w-36,y-44,8,8);g.fillRect(x+w-24,y-44,8,8)}
  sign(g,b.name,x+w/2,y-28);
}
function seeded(n){var s=n;return function(){s=(s*9301+49297)%233280;return s/233280}}

function buildBg(){
  bg=document.createElement('canvas');bg.width=WW;bg.height=WH;
  var g=bg.getContext('2d'),r=seeded(7),i;
  g.fillStyle='#8ccf86';g.fillRect(0,0,WW,WH);
  for(i=0;i<900;i++){g.fillStyle=r()<.5?'#7fc47a':'#9bd694';g.fillRect(r()*1390,r()*WH,3,2)}
  g.fillStyle='#efdca9';g.fillRect(1390,0,112,WH);
  for(i=0;i<260;i++){g.fillStyle='#e3cd92';g.fillRect(1390+r()*110,r()*WH,2,2)}
  g.fillStyle='#2a8fd6';g.fillRect(1502,0,98,WH);
  g.fillStyle='#bfe6ff';g.fillRect(1494,0,10,WH);
  var hg=g.createRadialGradient(330,980,10,330,980,200);hg.addColorStop(0,'#5fae5c');hg.addColorStop(1,'rgba(95,174,92,0)');
  g.fillStyle=hg;g.beginPath();g.ellipse(330,960,220,90,0,0,7);g.fill();
  ROADS.forEach(function(rd){g.fillStyle='#d8d1c0';g.fillRect(rd.x-12,rd.y-12,rd.w+24,rd.h+24)});
  ROADS.forEach(function(rd){g.fillStyle='#50565e';g.fillRect(rd.x,rd.y,rd.w,rd.h)});
  g.fillStyle='#f3e6a8';
  function inRoad(x,y){return ROADS.some(function(q){return x>=q.x&&x<=q.x+q.w&&y>=q.y&&y<=q.y+q.h})}
  ROADS.forEach(function(rd){
    if(rd.w>rd.h){for(var x=rd.x;x<rd.x+rd.w;x+=40){var cy=rd.y+rd.h/2;if(!inRoad(x+10,cy-60)&&!(x>500&&x<610)&&!(x>1040&&x<1150))g.fillRect(x,cy-1.5,22,3)}}
    else{for(var y=rd.y;y<rd.y+rd.h*0+WH;y+=40){var cx=rd.x+rd.w/2;if(!((y>400&&y<510)||(y>760&&y<870)))g.fillRect(cx-1.5,y,3,22)}}
  });
  g.fillStyle='#fff';
  [[555,455],[1095,455],[555,815],[1095,815]].forEach(function(p){
    for(var k=-28;k<=28;k+=8){g.fillRect(p.x?0:0,0,0,0)}
  });
  /* crossing stripes at the four junctions */
  [[555,455],[1095,455],[555,815],[1095,815]].forEach(function(p){
    for(var k=-30;k<=30;k+=10){g.fillRect(p[0]+k-3,p[1]-60,6,16);g.fillRect(p[0]+k-3,p[1]+44,6,16);g.fillRect(p[0]-60,p[1]+k-3,16,6);g.fillRect(p[0]+44,p[1]+k-3,16,6)}
  });
  /* zone pads */
  ORDER.forEach(function(id){
    var z=ZONES[id];
    if(id==='hill'||id==='beach'||id==='congo')return;
    g.fillStyle='rgba(30,181,58,.22)';g.fillRect(z.x,z.y,z.w,z.h);
    g.strokeStyle='rgba(17,115,38,.8)';g.lineWidth=2;g.setLineDash([8,6]);g.strokeRect(z.x+1,z.y+1,z.w-2,z.h-2);g.setLineDash([]);
  });
  /* hill station */
  g.fillStyle='#4d9c4b';g.beginPath();g.ellipse(330,950,170,62,0,0,7);g.fill();
  g.fillStyle='#5fae5c';g.beginPath();g.ellipse(330,935,120,38,0,0,7);g.fill();
  g.fillStyle='#8a6a44';g.fillRect(220,930,220,6);for(i=0;i<9;i++)g.fillRect(224+i*26,918,4,18);
  g.fillStyle='#fffdf4';g.fillRect(300,960,60,10);
  [[200,900],[250,990],[430,905],[460,975],[380,1000]].forEach(function(p){tree(g,p[0],p[1],1)});
  g.fillStyle='#e8d9b0';g.fillRect(500,896,64,48);g.fillStyle='#b5542f';g.fillRect(494,882,76,22);g.fillStyle='#5b3a24';g.fillRect(522,916,20,28);
  sign(g,'Hill Station',330,884);
  /* congo cross */
  [[448,528,'#d6403a'],[478,560,'#f2b630'],[500,525,'#0072c6'],[452,576,'#1eb53a']].forEach(function(u){umbrella(g,u[0],u[1],u[2])});
  g.fillStyle='#8a6a44';g.fillRect(440,538,70,8);
  sign(g,'Congo Cross',472,496);
  /* beach */
  [[1420,300],[1470,360],[1420,520],[1470,620],[1425,660]].forEach(function(u,k){umbrella(g,u[0],u[1],['#d6403a','#0072c6','#f2b630','#1eb53a','#d6403a'][k])});
  [[1450,250],[1410,470],[1465,700],[1420,200],[1470,130]].forEach(function(p){palm(g,p[0],p[1])});
  g.fillStyle='#fff';g.fillRect(1440,540,14,4);
  sign(g,'Lumley Beach',1445,240);
  /* buildings */
  BLD.forEach(function(b){drawBuilding(g,b)});
  /* scenery */
  [[60,330],[300,330],[330,450+60],[90,520],[360,520],[380,610],[900,330],[930,560],[900,700],[1000,520],[1020,330],[1180,560],[1260,580],[1330,540],[1300,700],[1200,720],[100,820+120],[80,750],[960,740],[1000,900],[1200,900],[1320,980],[700,960],[780,990],[60,480]].forEach(function(p){tree(g,p[0],p[1],.9+((p[0]*7)%3)/10)});
  g.fillStyle='#8a6a44';for(i=0;i<8;i++){g.fillRect(150+i*14,745,3,14)}
}

/* traffic and pedestrians */
function initTraffic(){
  VEH=[];var cols=['#f2b630','#d6403a','#1eb53a','#0072c6','#f2b630','#e8761e'];
  LANES.forEach(function(L){
    L.s=rnd(70,105);var n=L.a==='h'?3:2;
    for(var i=0;i<n;i++){var kek=Math.random()<.4;VEH.push({L:L,p:(i+.15+Math.random()*.6)*L.len/n,len:kek?32:58,wid:kek?20:24,kek:kek,col:kek?'#1eb53a':cols[rnd(0,cols.length-1)]})}
  });
  PEDS=[];
  PLINES.forEach(function(L){
    for(var i=0;i<2;i++)PEDS.push({L:L,p:L.r[0]+Math.random()*(L.r[1]-L.r[0]),d:Math.random()<.5?1:-1,s:rnd(18,34),skin:SKINS[rnd(0,4)],shirt:['#1eb53a','#0072c6','#f2b630','#d6403a','#8e5fc9','#e8761e','#ffffff'][rnd(0,6)],t:Math.random()*9});
  });
}
function vehPos(v){return v.L.a==='h'?{x:v.p,y:v.L.c}:{x:v.L.c,y:v.p}}
function vehAng(v){return v.L.a==='h'?(v.L.d>0?0:Math.PI):(v.L.d>0?Math.PI/2:-Math.PI/2)}
function vehRect(v){var c=vehPos(v);return v.L.a==='h'?{x:c.x-v.len/2,y:c.y-v.wid/2,w:v.len,h:v.wid}:{x:c.x-v.wid/2,y:c.y-v.len/2,w:v.wid,h:v.len}}
function pedPos(p){return p.L.a==='h'?{x:p.p,y:p.L.c}:{x:p.L.c,y:p.p}}

function drawPerson(x,y,skin,shirt,t,moving,face,bag){
  var sw=moving?Math.sin(t*2):0,bob=moving?-Math.abs(Math.sin(t*2))*1.6:0;
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(x,y,9,3.6,0,0,7);ctx.fill();
  ctx.fillStyle='#232b3a';ctx.fillRect(x-5,y-11+bob,4,11+sw*2);ctx.fillRect(x+1,y-11+bob,4,11-sw*2);
  ctx.fillStyle=shirt;rr(ctx,x-7,y-25+bob,14,15,3);ctx.fill();
  ctx.fillStyle=skin;ctx.fillRect(x-9,y-23+bob+sw*1.5,3,9);ctx.fillRect(x+6,y-23+bob-sw*1.5,3,9);
  ctx.beginPath();ctx.arc(x,y-31+bob,7,0,7);ctx.fill();
  ctx.fillStyle='#120c08';ctx.beginPath();ctx.arc(x,y-33+bob,7.2,Math.PI,0);ctx.fill();
  if(bag){ctx.fillStyle='#ffd24a';ctx.fillRect(x+face*8-3,y-20+bob,7,8)}
}
function drawVehicle(x,y,ang,len,wid,kek,col){
  ctx.save();ctx.translate(x,y);ctx.rotate(ang);
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(-len/2+2,-wid/2+3,len,wid);
  ctx.fillStyle=col;rr(ctx,-len/2,-wid/2,len,wid,kek?7:4);ctx.fill();
  if(!kek){ctx.fillStyle='rgba(255,255,255,.85)';ctx.fillRect(-len/2+2,-1.5,len-4,3);ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(-len/2+6,-wid/2+3,len-24,3);ctx.fillRect(-len/2+6,wid/2-6,len-24,3)}
  else{ctx.fillStyle='#f2b630';ctx.fillRect(-len/2+3,-wid/2+2,len*.45,wid-4)}
  ctx.fillStyle='#2a3d52';ctx.fillRect(len/2-14,-wid/2+3,9,wid-6);
  ctx.fillStyle='#fff6b0';ctx.fillRect(len/2-2,-wid/2+2,2.5,3);ctx.fillRect(len/2-2,wid/2-5,2.5,3);
  ctx.fillStyle='#111';ctx.fillRect(-len/2+5,-wid/2-1.5,8,2.5);ctx.fillRect(-len/2+5,wid/2-1,8,2.5);ctx.fillRect(len/2-14,-wid/2-1.5,8,2.5);ctx.fillRect(len/2-14,wid/2-1,8,2.5);
  ctx.restore();
}

/* player, rides, thief */
function initPlayer(){
  P={x:S.px||190,y:S.py||389,face:1,walk:0,moving:false,inv:0,target:null,guide:null,stuck:0};
  if(solidAt(P.x,P.y)){P.x=190;P.y=389}
  S.loc=zoneAt(P.x,P.y);R=null;T=null;
}
function setLoc(z){
  if(z===S.loc)return;
  S.loc=z;
  if(z!=='street'){
    var first=!S.visited[z];S.visited[z]=1;
    if(P.guide===z)P.guide=null;
    toast('Arrived at '+txt(LOCS[z].name));
    if(first)log('You discovered '+txt(LOCS[z].name)+'.','info');
  }
  render();
}
function startRide(loc,mode){
  var m=RIDE[mode];
  if(!m||R||S.loc==='street'||loc===S.loc||S.cash<m.c)return;
  var from=ZONES[S.loc],to=ZONES[loc];
  S.cash-=m.c;
  var pts=[{x:P.x,y:P.y},{x:from.ax,y:from.ay}];
  if(from.road===to.road)pts.push({x:to.ax,y:to.ay});
  else{
    var best=555,bd=1e9;[555,1095].forEach(function(ix){var d=Math.abs(from.ax-ix)+Math.abs(to.ax-ix);if(d<bd){bd=d;best=ix}});
    pts.push({x:best,y:from.ay},{x:best,y:to.ay},{x:to.ax,y:to.ay});
  }
  pts.push(zoneCenter(to));
  R={pts:pts,i:1,speed:m.speed,mode:mode,loc:loc,ang:0};
  P.target=null;S.loc='street';tab='play';
  log('You hop on a '+m.name.toLowerCase()+' to '+txt(LOCS[loc].name)+'.','');
  toast(m.name+' to '+txt(LOCS[loc].name));
  render();
}
function moveRide(dt){
  var p=R.pts[R.i],dx=p.x-P.x,dy=p.y-P.y,d=Math.hypot(dx,dy),step=R.speed*dt;
  if(d>.5)R.ang=Math.atan2(dy,dx);
  if(d<=step){P.x=p.x;P.y=p.y;R.i++;if(R.i>=R.pts.length){endRide();return}}
  else{P.x+=dx/d*step;P.y+=dy/d*step}
  P.moving=false;
}
function endRide(){
  R=null;P.target=null;
  var z=zoneAt(P.x,P.y);S.loc='street';setLoc(z);
  render();
}
function spawnThief(){
  if(S.cash<20||T||R)return;
  for(var k=0;k<12;k++){
    var a=Math.random()*Math.PI*2,d=rnd(150,210),x=P.x+Math.cos(a)*d,y=P.y+Math.sin(a)*d;
    if(!solidAt(x,y)&&zoneAt(x,y)==='street'||!solidAt(x,y)){
      var st=Math.min(S.cash,rnd(30,80));S.cash-=st;
      T={x:x,y:y,life:10,stolen:st,vx:0,vy:0,turn:0,walk:0};
      log('A thief snatched '+N(st)+' from your pocket and ran. Catch him!','bad');
      toast('Thief! Catch him! (Hold Shift to run)');
      render();return;
    }
  }
}
function moveThief(dt){
  T.life-=dt;T.turn-=dt;
  var dx=T.x-P.x,dy=T.y-P.y,d=Math.hypot(dx,dy)||1;
  if(T.turn<=0){T.vx=dx/d+(Math.random()-.5)*.8;T.vy=dy/d+(Math.random()-.5)*.8;var l=Math.hypot(T.vx,T.vy)||1;T.vx/=l;T.vy/=l;T.turn=.6}
  var sp=138,nx=T.x+T.vx*sp*dt,ny=T.y+T.vy*sp*dt;
  if(!solidAt(nx,T.y))T.x=nx;else T.turn=0;
  if(!solidAt(T.x,ny))T.y=ny;else T.turn=0;
  T.walk+=dt*sp/9;
  if(d<20){
    var back=T.stolen+25;S.cash+=back;S.fun=clamp(S.fun+10);
    log('You caught the thief and got back '+N(T.stolen)+', plus a reward of '+N(25)+'.','good');
    toast('Caught him!');T=null;render();return;
  }
  if(T.life<=0){log('The thief got away with your money.','bad');toast('He got away.');T=null;render()}
}

/* frame update */
function afterTick(ok){if(!ok){render()}}
function update(dt){
  W.time+=dt;if(W.toastT>0)W.toastT-=dt;if(W.shake>0)W.shake-=dt;if(W.hintT>0)W.hintT-=dt;
  acc+=dt*HPS;
  if(acc>=1/30){var ok=tick(acc);acc=0;afterTick(ok)}
  if(P.inv>0)P.inv-=dt;
  if(R){moveRide(dt)}
  else{
    var mx=(K.right?1:0)-(K.left?1:0),my=(K.down?1:0)-(K.up?1:0),dx=0,dy=0;
    if(mx||my){P.target=null;var l=Math.hypot(mx,my);dx=mx/l;dy=my/l}
    else if(P.target){var tx=P.target.x-P.x,ty=P.target.y-P.y,td=Math.hypot(tx,ty);if(td<5)P.target=null;else{dx=tx/td;dy=ty/td}}
    P.moving=!!(dx||dy);
    if(P.moving){
      var run=K.sprint&&S.energy>8,sp=run?WALKSP*1.65:WALKSP;
      if(run){S.energy=clamp(S.energy-3*dt);S.hygiene=clamp(S.hygiene-.15*dt)}
      var nx=P.x+dx*sp*dt,ny=P.y+dy*sp*dt,moved=false;
      if(!solidAt(nx,P.y)){P.x=nx;moved=true}
      if(!solidAt(P.x,ny)){P.y=ny;moved=true}
      if(!moved&&P.target){P.stuck+=dt;if(P.stuck>.3){P.target=null;P.stuck=0}}else P.stuck=0;
      if(dx)P.face=dx>0?1:-1;
      P.walk+=dt*sp/9;
    }
    var z=zoneAt(P.x,P.y);if(z!==S.loc)setLoc(z);
  }
  VEH.forEach(function(v){
    v.p+=v.L.d*v.L.s*dt;
    if(v.L.d>0&&v.p>v.L.len+60)v.p=-60;
    if(v.L.d<0&&v.p<-60)v.p=v.L.len+60;
  });
  PEDS.forEach(function(p){
    p.p+=p.d*p.s*dt;p.t+=dt*p.s/9;
    if(p.p<p.L.r[0]){p.p=p.L.r[0];p.d=1}
    if(p.p>p.L.r[1]){p.p=p.L.r[1];p.d=-1}
  });
  if(T)moveThief(dt);
  if(!R&&P.inv<=0){
    var fx=P.x-7,fy=P.y-8;
    for(var i=0;i<VEH.length;i++){
      var q=vehRect(VEH[i]);
      if(fx<q.x+q.w&&fx+14>q.x&&fy<q.y+q.h&&fy+8>q.y){
        var cx=q.x+q.w/2,cy=q.y+q.h/2,ax=P.x-cx,ay=P.y-cy,al=Math.hypot(ax,ay)||1;
        for(var s=40;s>=8;s-=8){var tx2=P.x+ax/al*s,ty2=P.y+ay/al*s;if(!solidAt(tx2,ty2)){P.x=tx2;P.y=ty2;break}}
        P.inv=1.6;P.target=null;W.shake=.3;
        S.health=clamp(S.health-12);S.fun=clamp(S.fun-6);
        if(W.hitT<=0){log('A '+(VEH[i].kek?'keke':'poda-poda')+' clipped you. Watch the road!','bad');W.hitT=4}
        toast('Ouch! Watch the road!');
        if(S.health<=0){collapse();render()}
        render();
        break;
      }
    }
  }
  if(W.hitT>0)W.hitT-=dt;
  if(!R){W.evT-=dt;if(W.evT<=0){W.evT=rnd(90,150);var el=EV.filter(function(e){return e.ok()});if(el.length&&!pend){pend=el[rnd(0,el.length-1)].build();render()}}}
  if(!R&&!T){W.thiefT-=dt;if(W.thiefT<=0){W.thiefT=rnd(80,160);spawnThief()}}
}

/* ---------- drawing ---------- */
function nightAmt(){var h=hourNow();if(h>=21||h<4)return .55;if(h>=19)return (h-19)/2*.55;if(h<6)return (6-h)/2*.55;return 0}
function txtc(s,x,y,size,col,align){ctx.font='700 '+size+'px Archivo, system-ui, sans-serif';ctx.textAlign=align||'center';ctx.textBaseline='middle';ctx.fillStyle=col;ctx.fillText(s,x,y)}
function bubble(s,x,y){
  ctx.font='700 10px Archivo, system-ui, sans-serif';
  var w=ctx.measureText(s).width+12;
  ctx.fillStyle='#fffdf4';rr(ctx,x-w/2,y-9,w,17,4);ctx.fill();ctx.strokeStyle='#14221a';ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle='#14221a';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s,x,y);
}
function draw(){
  var sc=cv.width/VW;
  ctx.setTransform(sc,0,0,sc,0,0);
  var shx=W.shake>0?(Math.random()-.5)*6:0,shy=W.shake>0?(Math.random()-.5)*6:0;
  cam.x=clampN(P.x-VW/2,0,WW-VW);cam.y=clampN(P.y-VH/2,0,WH-VH);
  ctx.drawImage(bg,cam.x,cam.y,VW,VH,0,0,VW,VH);
  ctx.save();ctx.translate(-cam.x+shx,-cam.y+shy);
  ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=2;
  for(var wy=20;wy<WH;wy+=46){var ox=Math.sin(W.time*1.2+wy)*6;ctx.beginPath();ctx.moveTo(1522+ox,wy);ctx.lineTo(1562+ox,wy);ctx.stroke()}
  if(P.guide){var gz=zoneCenter(ZONES[P.guide]);ctx.strokeStyle='rgba(214,64,58,'+(.5+.4*Math.sin(W.time*5))+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(gz.x,gz.y,26+Math.sin(W.time*5)*3,0,7);ctx.stroke()}
  if(P.target&&!R){ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(P.target.x,P.target.y,6+Math.sin(W.time*8)*1.5,0,7);ctx.stroke()}
  VEH.forEach(function(v){var c=vehPos(v);if(c.x<cam.x-80||c.x>cam.x+VW+80||c.y<cam.y-80||c.y>cam.y+VH+80)return;drawVehicle(c.x,c.y,vehAng(v),v.len,v.wid,v.kek,v.col)});
  var items=[];
  PEDS.forEach(function(p){var c=pedPos(p);if(c.x<cam.x-30||c.x>cam.x+VW+30||c.y<cam.y-50||c.y>cam.y+VH+50)return;items.push({y:c.y,f:function(){drawPerson(c.x,c.y,p.skin,p.shirt,p.t,true,p.d)}})});
  FRIENDS.forEach(function(f){
    if(!inHours(f))return;
    var st=frState(f.id),px=f.pos[0],py=f.pos[1];
    items.push({y:py,f:function(){
      drawPerson(px,py,f.skin,f.shirt,W.time*1.4,false,1);
      var d=Math.hypot(P.x-px,P.y-py);
      if(!st.met)txtc('!',px,py-48,16,'#d6403a');
      if(d<110){var near=S.loc===f.loc&&d<90;bubble((st.met?f.name:'New face')+(near?' · E':''),px,py-50)}
    }});
  });
  if(T)items.push({y:T.y,f:function(){drawPerson(T.x,T.y,'#8a5530','#222',T.walk,true,T.vx>=0?1:-1,true);txtc('THIEF',T.x,T.y-48,10,'#d6403a')}});
  items.push({y:P.y,f:function(){
    if(R){
      var m=RIDE[R.mode];drawVehicle(P.x,P.y,R.ang,m.name==='Keke'?32:58,m.name==='Keke'?20:24,m.name==='Keke',m.name==='Keke'?'#1eb53a':'#f2b630');
      ctx.fillStyle=S.skin;ctx.beginPath();ctx.arc(P.x,P.y-2,5,0,7);ctx.fill();
    }else{
      if(P.inv>0&&Math.floor(W.time*12)%2===0)ctx.globalAlpha=.4;
      drawPerson(P.x,P.y,S.skin,S.shirt,P.walk,P.moving,P.face,false);
      ctx.globalAlpha=1;
      txtc(S.name||'You',P.x,P.y-48,10,'#14221a');
    }
  }});
  items.sort(function(a,b){return a.y-b.y});
  items.forEach(function(it){it.f()});
  ctx.restore();
  var na=nightAmt();
  if(na>0){ctx.fillStyle='rgba(10,14,50,'+na+')';ctx.fillRect(0,0,VW,VH)}
  else{var h=hourNow();if(h>=17&&h<19){ctx.fillStyle='rgba(255,140,60,'+((h-17)/2*.16)+')';ctx.fillRect(0,0,VW,VH)}}
  if(na>.15){
    ctx.save();ctx.translate(-cam.x,-cam.y);ctx.fillStyle='rgba(255,211,106,'+Math.min(1,na*1.6)+')';
    WIN.forEach(function(w){if(w.x>cam.x-30&&w.x<cam.x+VW&&w.y>cam.y-30&&w.y<cam.y+VH)ctx.fillRect(w.x,w.y,w.w,w.h)});
    ctx.restore();
  }
  /* HUD */
  ctx.fillStyle='rgba(10,15,12,.72)';rr(ctx,6,6,150,34,5);ctx.fill();
  txtc('Day '+dayNum()+' · '+clock(),12,17,11,'#fff','left');
  txtc(txt(LOCS[S.loc].name),12,31,10,'#9fe3ae','left');
  if(T){ctx.fillStyle='rgba(214,64,58,.92)';rr(ctx,VW/2-92,8,184,22,5);ctx.fill();txtc('Catch the thief! '+Math.ceil(T.life)+'s',VW/2,19,12,'#fff')}
  if(W.toastT>0){var s=W.toast;ctx.font='700 12px Archivo, system-ui, sans-serif';var tw=ctx.measureText(s).width+20;ctx.fillStyle='rgba(10,15,12,.85)';rr(ctx,VW/2-tw/2,VH-34,tw,22,11);ctx.fill();txtc(s,VW/2,VH-23,12,'#fff')}
  if(W.hintT>0&&!T){txtc('Arrows / WASD or tap to move',VW/2,58,11,'rgba(255,255,255,.9)')}
  /* minimap */
  var mw=88,mh=Math.round(mw*WH/WW),mx=VW-mw-6,my=6,k=mw/WW;
  ctx.fillStyle='rgba(10,15,12,.72)';ctx.fillRect(mx-2,my-2,mw+4,mh+4);
  ctx.fillStyle='#4f9a4e';ctx.fillRect(mx,my,mw,mh);
  ctx.fillStyle='#e8d6a0';ctx.fillRect(mx+1390*k,my,112*k,mh);ctx.fillStyle='#2a8fd6';ctx.fillRect(mx+1502*k,my,98*k,mh);
  ctx.fillStyle='#50565e';ROADS.forEach(function(r){ctx.fillRect(mx+r.x*k,my+r.y*k,Math.max(2,r.w*k),Math.max(2,r.h*k))});
  ORDER.forEach(function(id){var c=zoneCenter(ZONES[id]);ctx.fillStyle=id===S.loc?'#fff':'#f2b630';ctx.fillRect(mx+c.x*k-2,my+c.y*k-2,4,4)});
  if(P.guide){var gc=zoneCenter(ZONES[P.guide]);ctx.fillStyle=Math.floor(W.time*3)%2?'#d6403a':'#fff';ctx.fillRect(mx+gc.x*k-3,my+gc.y*k-3,6,6)}
  ctx.fillStyle='#1eb53a';ctx.beginPath();ctx.arc(mx+P.x*k,my+P.y*k,3,0,7);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke();
  /* guide arrow */
  if(P.guide&&!R){
    var gz2=zoneCenter(ZONES[P.guide]),ang=Math.atan2(gz2.y-P.y,gz2.x-P.x),dist=Math.round(Math.hypot(gz2.x-P.x,gz2.y-P.y)/10);
    var ax=P.x-cam.x+Math.cos(ang)*40,ay=P.y-cam.y-16+Math.sin(ang)*40;
    ctx.save();ctx.translate(ax,ay);ctx.rotate(ang);ctx.fillStyle='#d6403a';ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-6,-7);ctx.lineTo(-6,7);ctx.closePath();ctx.fill();ctx.restore();
    txtc(dist+' m',ax,ay+14,10,'#fff');
  }
}
function sizeCanvas(){
  var r=cv.getBoundingClientRect();if(!r.width)return false;
  var d=Math.min(2,window.devicePixelRatio||1),w=Math.round(r.width*d),h=Math.round(w*VH/VW);
  if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}
  return true;
}

/* ---------- ui rendering ---------- */
function setHTML(el,h){if(el._h!==h){el.innerHTML=h;el._h=h}}
function avatar(skin,shirt,px){
  var dark=SKINS.indexOf(skin)>=3,fc=dark?'#f6ead8':'#1b130d';
  return '<svg viewBox="0 0 80 90" width="'+px+'" height="'+Math.round(px*90/80)+'" aria-hidden="true"><rect x="12" y="58" width="56" height="32" rx="16" fill="'+shirt+'"/><rect x="34" y="48" width="12" height="14" fill="'+skin+'"/><circle cx="40" cy="32" r="22" fill="'+skin+'"/><path d="M18 30a22 20 0 0 1 44 0c-6-8-14-11-22-11s-16 3-22 11z" fill="#120c08"/><circle cx="32" cy="35" r="2.4" fill="'+fc+'"/><circle cx="48" cy="35" r="2.4" fill="'+fc+'"/><path d="M33 44q7 6 14 0" stroke="'+fc+'" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>';
}
function bar(label,v){var c=v<25?'low':v<50?'mid':'';return '<div class="nb"><span class="k">'+label+'</span><div class="bar '+c+'"><i style="width:'+Math.round(v)+'%"></i></div><span class="v">'+Math.round(v)+'</span></div>'}
function fxChips(fx,show){
  var h='';
  if(show){show.forEach(function(s){h+='<span class="pos">'+s+'</span>'});return h}
  if(!fx)return h;
  for(var k in fx){var v=fx[k];if(!v)continue;h+='<span class="'+(v>0?'pos':'neg')+'">'+(v>0?'+':'−')+Math.abs(v)+' '+(NL[k]||k).toLowerCase()+'</span>'}
  return h;
}
function actCard(a){
  var r=why(a),fx=txt(a.fx),pr=a.pay?txt(a.pay):null,c=costOf(a);
  var chips='<span class="neu">'+fmtH(hrsOf(a))+'</span>';
  if(c)chips+='<span class="neg">'+N(c)+'</span>';
  if(pr)chips+='<span class="pos">'+N(pr[0])+'–'+N(pr[1]).replace('Le ','')+'</span>';
  chips+=fxChips(fx,a.show);
  return '<button class="card" data-a="act:'+a.id+'"'+(r?' disabled':'')+'><span class="t">'+txt(a.label)+'</span><span class="cc">'+chips+'</span><span class="s">'+txt(a.desc)+'</span>'+(r?'<span class="why">'+r+'</span>':'')+'</button>';
}
function hereHtml(){
  var L=LOCS[S.loc];
  var h='<h2 class="loc">'+txt(L.name)+'</h2><p class="desc">'+L.desc+'</p>';
  var ppl=FRIENDS.filter(present);
  if(ppl.length){
    h+='<div class="people">';
    ppl.forEach(function(f){var st=frState(f.id);h+='<button class="person" data-a="open:'+f.id+'">'+avatar(f.skin,f.shirt,34)+'<span><b>'+(st.met?f.name:'New face')+'</b><small>'+(st.met?tierName(st.rel):f.role)+'</small></span></button>'});
    h+='</div>';
  }
  h+='<div class="list">';
  L.acts.forEach(function(a){if(!a.vis||a.vis())h+=actCard(a)});
  h+='</div>';
  return h;
}
function mapHtml(){
  var inZone=S.loc!=='street'&&!R;
  var h='<p class="note">Walk anywhere for free, or ride from a doorstep. Poda-podas are cheap. Keke taxis are fast. You can only hop on while standing at a place.</p><div class="grid2">';
  ORDER.forEach(function(id){
    var L=LOCS[id],here=id===S.loc;
    h+='<div class="place'+(here?' here':'')+'"><h3>'+txt(L.name)+'</h3><p>'+L.desc+'</p>';
    if(here)h+='<span class="pill ok">You are here</span>';
    else{
      h+='<div class="row"><button class="btn" data-a="guide:'+id+'">Guide me</button>';
      Object.keys(RIDE).forEach(function(m){var rd=RIDE[m];h+='<button class="btn" data-a="ride:'+id+':'+m+'"'+(!inZone||S.cash<rd.c?' disabled':'')+'>'+rd.name+' · '+N(rd.c)+'</button>'});
      h+='</div>';
    }
    h+='</div>';
  });
  return h+'</div>';
}
function peopleHtml(){
  var h='<p class="note">Meet people around the city, then chat, share meals and hang out. Friends unlock perks.</p>';
  FRIENDS.forEach(function(f){
    var st=frState(f.id);
    h+='<button class="fr" data-a="open:'+f.id+'">'+avatar(st.met?f.skin:'#c9d3c6',st.met?f.shirt:'#9aa89d',44)+'<span><b>'+(st.met?f.name:'Someone to meet')+'</b><small>'+(st.met?f.role+'. '+tierName(st.rel)+'.':f.hint)+'</small></span><span class="pill">'+(st.met?st.rel+'/100':'?')+'</span></button>';
  });
  return h;
}
function shopHtml(){
  var h='';
  if(S.loc!=='market')h+='<p class="note">Items are sold at Big Market. Walk onto its doorstep to buy.</p>';
  h+='<div class="list">';
  ITEMS.forEach(function(i){
    var owned=S.own[i.id],dis=owned||S.cash<i.price||S.loc!=='market';
    h+='<button class="card" data-a="buy:'+i.id+'"'+(dis?' disabled':'')+'><span class="t">'+i.name+'</span><span class="cc">'+(owned?'<span class="pos">OWNED</span>':'<span class="neg">'+N(i.price)+'</span>')+'</span><span class="s">'+i.desc+'</span>'+(!owned&&S.cash<i.price?'<span class="why">Short by '+N(i.price-S.cash)+'</span>':'')+'</button>';
  });
  return h+'</div>';
}
function goalsHtml(){
  var n=GOALS.filter(function(g){return g.d()}).length;
  var h='<p class="note">'+n+' of '+GOALS.length+' life goals done. Complete them all to make it in Freetown.</p>';
  GOALS.forEach(function(g){
    var d=g.d(),p=Math.round(g.p()*100);
    h+='<div class="goal'+(d?' done':'')+'"><b>'+g.t+(d?' ✓':'')+'</b><div class="bar"><i style="width:'+p+'%"></i></div></div>';
  });
  return h;
}
function skyUpdate(){
  var h=hourNow(),sky=document.getElementById('sky'),sun=document.getElementById('sun');
  var p=(h>=5&&h<10)?'morning':(h>=10&&h<16)?'day':(h>=16&&h<19)?'dusk':'night';
  sky.setAttribute('data-p',p);
  if(p==='night'){sun.style.left='78%';sun.style.top='10px'}
  else{var f=Math.min(1,Math.max(0,(h-5)/14));sun.style.left=(8+f*80)+'%';sun.style.top=(54-46*Math.sin(Math.PI*f))+'px'}
}
function meHtml(){
  var pills='<span class="pill '+(powerOK()?'ok':'bad')+'">'+(S.powerOff?(S.own.gen?'EDSA out, generator on':'EDSA light out'):'Light on')+'</span>';
  pills+='<span class="pill">Education '+eduLevel()+'</span>';
  var left=S.nextRent-dayNum();
  if(S.rent>0)pills+='<span class="pill'+(S.debt>0?' bad':'')+'">'+(S.debt>0?'Overdue '+N(S.debt):'Rent '+N(S.rent)+' in '+Math.max(0,left)+'d')+'</span>';
  else pills+='<span class="pill ok">Homeowner</span>';
  return '<div class="top">'+avatar(S.skin,S.shirt,64)+'<div><div class="nm">'+(S.name||'You')+'</div><div class="sub">Day '+dayNum()+' · '+clock()+'</div></div></div><div class="cash">'+N(S.cash)+'</div><div class="bars">'+bar('Health',S.health)+NEEDS.map(function(k){return bar(NL[k],S[k])}).join('')+'</div><div class="chips">'+pills+'</div>';
}
function logHtml(){
  var h='<h2>Street log</h2><ol>';
  S.log.slice(0,7).forEach(function(l){h+='<li class="'+l.k+'">'+l.t+'</li>'});
  h+='</ol><button class="newgame" data-a="new">'+(ui.confirm?'Tap again to erase your save':'Start over')+'</button>';
  return h;
}
function tabsHtml(){
  var h='';
  [['play','Play'],['map','Map'],['people','People'],['shop','Shop'],['goals','Goals']].forEach(function(t){h+='<button class="tab" role="tab" aria-selected="'+(tab===t[0])+'" data-a="tab:'+t[0]+'">'+t[1]+'</button>'});
  return h;
}
function overlayHtml(){
  if(!S.started){
    var h='<div class="ov"><div class="modal" role="dialog"><h3>Welcome to Freetown</h3><p>Create your person. Then walk the city, find food, money and friends, and build a life.</p><div class="center">'+avatar(SKINS[ui.skin],SHIRTS[ui.shirt],96)+'</div>';
    h+='<div class="field"><label for="nameIn">Your name</label><input id="nameIn" maxlength="16" autocomplete="off" value="'+ui.name.replace(/["<>&]/g,'')+'" placeholder="Aminata"></div>';
    h+='<div class="field"><label>Skin tone</label><div class="sw">';
    SKINS.forEach(function(c,i){h+='<button style="background:'+c+'" data-a="skin:'+i+'" aria-label="Skin tone '+(i+1)+'" aria-pressed="'+(ui.skin===i)+'"></button>'});
    h+='</div></div><div class="field"><label>Shirt</label><div class="sw">';
    SHIRTS.forEach(function(c,i){h+='<button style="background:'+c+'" data-a="shirt:'+i+'" aria-label="Shirt colour '+(i+1)+'" aria-pressed="'+(ui.shirt===i)+'"></button>'});
    h+='</div></div><button class="btn primary" data-a="start">Start living</button></div></div>';
    return h;
  }
  if(pend){
    var o='<div class="ov"><div class="modal" role="dialog" aria-live="polite"><h3>'+pend.title+'</h3><p>'+pend.text+'</p><div class="choices">';
    pend.choices.forEach(function(c,i){o+='<button class="btn" data-a="ev:'+i+'"'+(c.cost&&S.cash<c.cost?' disabled':'')+'>'+c.label+'</button>'});
    return o+'</div></div></div>';
  }
  if(ui.modal&&ui.modal.indexOf('person:')===0){
    var f=frById(ui.modal.split(':')[1]),st=frState(f.id),near=present(f);
    var m='<div class="ov"><div class="modal" role="dialog"><div class="center">'+avatar(f.skin,f.shirt,80)+'</div><h3>'+(st.met?f.name:'New face')+'</h3><p>'+f.role+'.</p>';
    if(st.met){
      m+='<div class="nb" style="grid-template-columns:90px minmax(0,1fr) 44px"><span class="k">'+tierName(st.rel)+'</span><div class="bar"><i style="width:'+st.rel+'%"></i></div><span class="v">'+st.rel+'</span></div>';
      m+='<p class="note">'+(st.rel>=30?'Perk: '+f.perk:'Perk unlocks at Friend (30). '+f.perk)+'</p>';
      if(!near)m+='<p class="note">'+f.name+' is not here right now. '+f.hint+'</p>';
      m+='<div class="choices">';
      m+='<button class="btn" data-a="fr:'+f.id+':chat"'+(near?'':' disabled')+'>Chat · 1h</button>';
      m+='<button class="btn" data-a="fr:'+f.id+':meal"'+(near&&S.cash>=40?'':' disabled')+'>Share a meal · '+N(40)+' · 1h</button>';
      m+='<button class="btn" data-a="fr:'+f.id+':gift"'+(near&&S.cash>=50&&st.gift!==dayNum()?'':' disabled')+'>Give a gift · '+N(50)+' (once a day)</button>';
      m+='<button class="btn" data-a="fr:'+f.id+':hang"'+(near?'':' disabled')+'>Hang out · 2h</button>';
      m+='<button class="btn" data-a="fr:'+f.id+':call"'+(S.own.phone&&S.cash>=5?'':' disabled')+'>Call · '+N(5)+' · 30m'+(S.own.phone?'':' (needs a phone)')+'</button>';
      m+='</div>';
    }else{
      m+='<div class="choices"><button class="btn primary" data-a="fr:'+f.id+':hello"'+(near?'':' disabled')+'>Say hello</button></div>';
    }
    return m+'<button class="btn" data-a="close">Close</button></div></div>';
  }
  if(ui.modal==='won'){
    return '<div class="ov"><div class="modal" role="dialog"><h3>You made it</h3><p>Every life goal done on day '+dayNum()+'. You earned '+N(S.earned)+' along the way and own a house with the best view in Freetown.</p><button class="btn primary" data-a="close">Keep playing</button></div></div>';
  }
  return '';
}
function refreshUI(){
  skyUpdate();
  document.getElementById('clock').textContent='Day '+dayNum()+' · '+clock();
  document.getElementById('skyplace').textContent=txt(LOCS[S.loc].name);
  setHTML(document.getElementById('tabs'),tabsHtml());
  setHTML(document.getElementById('me'),meHtml());
  document.getElementById('stage').hidden=tab!=='play';
  document.getElementById('hint').hidden=tab!=='play';
  setHTML(document.getElementById('panel'),tab==='play'?hereHtml():tab==='map'?mapHtml():tab==='people'?peopleHtml():tab==='shop'?shopHtml():goalsHtml());
  setHTML(document.getElementById('logbox'),logHtml());
}
function render(){
  var lay=document.getElementById('layout');
  lay.hidden=!S.started;
  if(S.started){
    if(!S.won&&GOALS.every(function(g){return g.d()})){S.won=true;ui.modal='won';save()}
    refreshUI();
  }else{skyUpdate()}
  document.getElementById('overlay').innerHTML=overlayHtml();
}

/* ---------- input ---------- */
function interact(){
  if(!S.started||pend||ui.modal||R)return;
  var best=null,bd=95;
  FRIENDS.forEach(function(f){if(!inHours(f))return;var d=Math.hypot(P.x-f.pos[0],P.y-f.pos[1]);if(d<bd){bd=d;best=f}});
  if(best){if(S.loc===best.loc){ui.modal='person:'+best.id;render()}else toast('Step closer to talk to '+best.name+'.')}
  else toast(S.loc==='street'?'Walk onto a place\'s doorstep to see its activities.':'Pick an activity below the map.');
}
var KEYMAP={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ShiftLeft:'sprint',ShiftRight:'sprint'};
function typing(e){var t=e.target;return t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA')}
window.addEventListener('keydown',function(e){
  if(typing(e)||!S||!S.started)return;
  if(e.code==='Escape'&&ui.modal&&!pend){ui.modal=null;render();return}
  var k=KEYMAP[e.code];
  if(k&&tab==='play'&&!pend&&!ui.modal){K[k]=true;e.preventDefault()}
  else if((e.code==='KeyE'||e.code==='Space')&&tab==='play'&&!e.repeat){e.preventDefault();interact()}
});
window.addEventListener('keyup',function(e){var k=KEYMAP[e.code];if(k)K[k]=false});
window.addEventListener('blur',function(){K={}});
function setupPad(){
  document.querySelectorAll('[data-k]').forEach(function(b){
    var k=b.getAttribute('data-k');
    function on(e){e.preventDefault();if(k==='act'){interact();return}K[k]=true}
    function off(e){e.preventDefault();if(k!=='act')K[k]=false}
    b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',off);
  });
  cv.addEventListener('pointerdown',function(e){
    if(!S.started||pend||ui.modal||R)return;
    e.preventDefault();
    var r=cv.getBoundingClientRect();
    var wx=(e.clientX-r.left)/r.width*VW+cam.x,wy=(e.clientY-r.top)/r.height*VH+cam.y;
    var hit=null;
    FRIENDS.forEach(function(f){if(inHours(f)&&Math.hypot(wx-f.pos[0],wy-(f.pos[1]-14))<26)hit=f});
    if(hit&&S.loc===hit.loc&&Math.hypot(P.x-hit.pos[0],P.y-hit.pos[1])<95){ui.modal='person:'+hit.id;render();return}
    P.target={x:wx,y:wy};
  });
}
document.addEventListener('click',function(e){
  var b=e.target.closest('[data-a]');
  if(!b||b.disabled)return;
  var p=b.getAttribute('data-a').split(':'),k=p[0];
  if(k!=='new')ui.confirm=false;
  if(!S.started){
    var inp=document.getElementById('nameIn');if(inp)ui.name=inp.value;
    if(k==='skin'){ui.skin=+p[1];render()}
    else if(k==='shirt'){ui.shirt=+p[1];render()}
    else if(k==='start'){S.started=true;S.name=(ui.name||'').trim().replace(/[<>&"]/g,'')||'Aminata';S.skin=SKINS[ui.skin];S.shirt=SHIRTS[ui.shirt];initPlayer();save();render()}
    return;
  }
  if(k==='ev'){if(pend)resolve(+p[1]);return}
  if(pend)return;
  if(k==='tab'){tab=p[1];K={};render()}
  else if(k==='act'){var a=LOCS[S.loc].acts.filter(function(x){return x.id===p[1]})[0];if(a)doAct(a)}
  else if(k==='guide'){P.guide=p[1];tab='play';toast('Follow the red arrow');render()}
  else if(k==='ride'){startRide(p[1],p[2])}
  else if(k==='open'){ui.modal='person:'+p[1];render()}
  else if(k==='fr'){frAct(p[1],p[2])}
  else if(k==='close'){ui.modal=null;render()}
  else if(k==='buy'){buy(p[1])}
  else if(k==='new'){
    if(!ui.confirm){ui.confirm=true;render();return}
    ui.confirm=false;S=fresh();ui.modal=null;ui.name='';tab='play';pend=null;try{localStorage.removeItem(KEY)}catch(x){}
    initPlayer();render();
  }
});

/* ---------- main loop ---------- */
var last=0;
function frame(ts){
  requestAnimationFrame(frame);
  var dt=Math.min(.05,(ts-last)/1000||0);last=ts;
  if(!S||!S.started)return;
  var run=tab==='play'&&!pend&&!ui.modal&&!document.hidden;
  if(tab==='play'&&sizeCanvas()){if(run)update(dt);draw()}
  if(run){
    uiT+=dt;saveT+=dt;
    if(uiT>.5){uiT=0;refreshUI()}
    if(saveT>5){saveT=0;save()}
  }
}
cv=document.getElementById('cv');ctx=cv.getContext('2d');
buildBg();initTraffic();setupPad();
S=load()||fresh();
if(S.started)initPlayer();else{P={x:190,y:389,face:1,walk:0,moving:false,inv:0,target:null,guide:null,stuck:0}}
render();
requestAnimationFrame(frame);
})();
