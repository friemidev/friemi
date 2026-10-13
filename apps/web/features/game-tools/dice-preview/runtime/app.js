'use strict';
import { createMotionRoller, createDiceAudio } from './dice-device.js';
const $ = id => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const pageCopy = document.body.dataset;
const E = window.DiceBluffEngine;
const patterns = {0:[],1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
const roster = [
  {name:'桃桃',cat:'baker',catName:'面包喵',seat:'seat-taotao'},
  {name:'小鹿',cat:'scholar',catName:'学者喵',seat:'seat-xiaolu'},
  {name:'猫猫',cat:'captain',catName:'船长喵',seat:'seat-maomao'},
  {name:'我',cat:'cloud',catName:'云朵喵',seat:'my-seat'}
];
const turnOrder = ['我','小鹿','猫猫','桃桃'];
const free = {count:5,values:[],hasResult:false,covered:false,busy:false,rolls:0,quick:false};
const bluff = {state:null,phase:'idle',timer:null,actionTimer:null,actionsReady:true,roundNo:0,scores:{},privateCovered:false,draft:{count:4,face:2},revealed:0,total:0};
let mode='free', soundOn=false, audioContext, rollTimer, faceTimer, coverTimer, landingTimer, dialogTrigger;
let soundChosen=false, soundFailure=false, motionGeneration=0, soundGeneration=0;
const diceAudio=createDiceAudio();
const motionRoller=createMotionRoller({
  canRoll:()=>mode==='free'&&!free.busy&&!$('game-dialog').open,
  onRoll:()=>roll(),
  onState:state=>{
    const enabled=state==='on'||state==='waiting',pending=state==='requesting';
    $('hand-shake-button').setAttribute('aria-checked',String(enabled));
    $('hand-shake-button').disabled=pending;
    $('hand-shake-button').dataset.state=state;
    $('hand-shake-button').setAttribute('aria-busy',String(pending));
    updateDeviceNote(state);
  },
});
const activeVoices = new Set();
const characterFrames={idle:'idle',thinking:'thinking',calling:'idle',challenged:'thinking',happy:'happy',sad:'sad'};

function randomDie(){const a=new Uint32Array(1);do{crypto.getRandomValues(a)}while(a[0]>=4294967292);return a[0]%6+1}
function characterImage(player,mood='idle'){return 'assets/cats/players/'+player.cat+'-'+characterFrames[mood]+'.svg'}
// Character reactions use public events, never hidden dice or bid probability.
function updateCharacters({thinking,calling,challenged,winner,loser}={}){
  document.querySelectorAll('[data-player]').forEach(seat=>{
    const player=roster.find(p=>p.name===seat.dataset.player);if(!player)return;
    const mood=player.name===winner?'happy':player.name===loser?'sad':player.name===challenged?'challenged':player.name===thinking?'thinking':player.name===calling?'calling':'idle';
    seat.dataset.mood=mood;seat.classList.toggle('active',player.name===thinking);
    if(player.name===thinking)seat.setAttribute('aria-current','true');else seat.removeAttribute('aria-current');
    const img=seat.querySelector('img');if(img){const src=characterImage(player,mood);if(img.getAttribute('src')!==src)img.src=src;img.alt=player.catName}
  });
}
function die(value,index=0,match=false){
  const d=document.createElement('span');d.className='die'+(match?' matches':'');d.dataset.value=value;d.style.setProperty('--i',index);d.setAttribute('role','img');d.setAttribute('aria-label',value?value+' 点':'等待摇骰');
  for(let p=0;p<9;p++){const dot=document.createElement('i');dot.className='pip'+(patterns[value].includes(p)?' on':'');dot.setAttribute('aria-hidden','true');d.append(dot)}
  window.DiceSprites?.mount(d,value);return d;
}
function renderDice(values,matchFace){
  $('dice-stage').replaceChildren(...values.map((v,i)=>die(v,i,Boolean(matchFace)&&(v===1||v===matchFace))));
  $('dice-stage').classList.toggle('six',values.length===6);$('game-table').classList.toggle('six-dice',values.length===6&&mode==='free');
  $('game-table').dataset.count=values.length;
}
function clearRoundFeedback(){clearTimeout(landingTimer);$('game-table').classList.remove('landed','won','lost');$('result-line').classList.remove('landed')}
function celebrateLanding(){
  if(reducedMotion.matches||document.hidden)return;
  $('game-table').classList.add('landed');$('result-line').classList.add('landed');
  landingTimer=setTimeout(clearRoundFeedback,700);
}
function tone(frequency,duration,volume=.03,type='sine',delay=0){
  if(!soundOn||!audioContext||document.hidden)return;
  const start=audioContext.currentTime+delay,osc=audioContext.createOscillator(),gain=audioContext.createGain();
  const voice={osc,gain};activeVoices.add(voice);osc.onended=()=>{activeVoices.delete(voice);osc.disconnect();gain.disconnect()};
  osc.type=type;osc.frequency.setValueAtTime(frequency,start);osc.frequency.exponentialRampToValueAtTime(frequency*.6,start+duration);
  gain.gain.setValueAtTime(volume,start);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(gain);gain.connect(audioContext.destination);osc.start(start);osc.stop(start+duration);
}
function stopSounds(){diceAudio.stop();for(const {osc,gain} of activeVoices){gain.gain.cancelScheduledValues(0);gain.gain.setValueAtTime(0,audioContext.currentTime);try{osc.stop()}catch{}}activeVoices.clear()}
function playTap(){tone(600,.055,.014,'triangle')}
function playRoll(factor){
  if(!soundOn)return;
  const current=soundGeneration,rollNumber=free.rolls;
  void diceAudio.roll(1800*factor,free.count).then(status=>{
    if(status!=='blocked'||current!==soundGeneration||rollNumber!==free.rolls||mode!=='free'||document.hidden||!soundOn)return;
    ++soundGeneration;soundOn=false;soundFailure=true;stopSounds();diceAudio.disable();updateSound();updateDeviceNote();
  });
}
function setStatus(value,message=''){$('sum-value').textContent=value;$('result-message').textContent=message;$('result-message').hidden=!message;document.querySelector('.result-divider').hidden=!message}
function updateFreeResult(message){
  const sum=free.values.reduce((a,b)=>a+b,0);
  setStatus(!free.hasResult?'—':free.covered?'?':sum,!free.hasResult||free.covered?'':message||'');
  $('sum-unit').textContent=free.covered||!free.hasResult?'':'点';
}
function setBusy(busy){
  free.busy=busy;['roll-button','cup-zone','quick-roll-button'].forEach(id=>$(id).disabled=busy);
  $('cover-button').disabled=busy;
  for(const b of $('count-picker').children)b.disabled=busy;
  document.querySelectorAll('.mode').forEach(b=>b.disabled=busy);
}
function showFreeDice(){renderDice(free.hasResult?free.values:Array(free.count).fill(0))}
function positionGather(){
  const table=$('game-table'),tr=table.getBoundingClientRect(),stage=$('dice-stage');
  const x=tr.left+tr.width/2,y=tr.top+tr.height*.61;
  for(const d of stage.children){const r=d.getBoundingClientRect();d.style.setProperty('--gather-x',(x-r.left-r.width/2).toFixed(1)+'px');d.style.setProperty('--gather-y',(y-r.top-r.height/2).toFixed(1)+'px')}
  table.style.setProperty('--cover-top',Math.max(12,tr.height*.61-$('cup-zone').offsetHeight*.8)+'px');
}
function updateCover(){
  $('game-table').classList.toggle('covered',free.covered);
  $('cover-button').disabled=free.busy;$('cover-button').querySelector('span').textContent=free.covered?'揭盅':'盖盅';
  $('cover-button').setAttribute('aria-pressed',String(free.covered));$('cup-zone').setAttribute('aria-label',free.covered?'揭开骰盅':'摇动骰盅');
  $('dice-stage').setAttribute('aria-hidden',String(free.covered));updateFreeResult();
}
function toggleCover(){
  if(free.busy)return;
  clearRoundFeedback();positionGather();const closing=!free.covered,table=$('game-table');
  free.covered=closing;setBusy(true);playTap();
  table.classList.remove('covered');table.classList.add(closing?'covering':'uncovering');
  $('dice-stage').setAttribute('aria-hidden',String(closing));$('hidden-note').hidden=true;updateFreeResult();
  coverTimer=setTimeout(finishCover,reducedMotion.matches?0:440);
}
function finishCover(){
  const table=$('game-table');
  if(mode!=='free'||(!table.classList.contains('covering')&&!table.classList.contains('uncovering')))return;
  clearTimeout(coverTimer);table.classList.remove('covering','uncovering');
  setBusy(false);positionGather();updateCover();
}
function renderCount(){
  const restoreFocus=$('count-picker').contains(document.activeElement);
  $('count-picker').replaceChildren();
  for(let n=1;n<=6;n++){
    const b=document.createElement('button');b.textContent=n;b.className=n===free.count?'selected':'';b.setAttribute('aria-label',n+' 颗骰子');b.setAttribute('aria-pressed',String(n===free.count));b.disabled=free.busy;
    b.addEventListener('click',()=>{if(free.busy||free.count===n)return;clearRoundFeedback();free.count=n;free.values=[];free.hasResult=false;$('roll-button').querySelector('span').textContent='摇一摇';renderCount();showFreeDice();positionGather();updateCover();playTap()});$('count-picker').append(b);
  }
  if(restoreFocus)$('count-picker').querySelector('.selected').focus({preventScroll:true});
}
function finishRoll(){
  if(mode!=='free'||!$('game-table').classList.contains('rolling'))return;
  clearTimeout(rollTimer);clearTimeout(faceTimer);window.DiceSprites?.finishAll();free.hasResult=true;renderDice(free.values);$('game-table').classList.remove('rolling');
  if(free.covered)positionGather();
  setBusy(false);$('roll-button').querySelector('span').textContent='再摇一次';
  updateFreeResult();celebrateLanding();
}
function roll(){
  if(free.busy)return;clearRoundFeedback();updateCover();setBusy(true);
  free.values=Array.from({length:free.count},randomDie);free.rolls++;
  const duration=reducedMotion.matches?140:free.quick?900:1800,factor=duration/1800;
  $('game-table').style.setProperty('--roll-time',duration+'ms');$('game-table').classList.add('rolling');
  $('roll-button').querySelector('span').textContent='摇动中…';setStatus(free.covered?'?':'—');$('sum-unit').textContent='';playRoll(factor);
  faceTimer=setTimeout(()=>{renderDice(free.values);window.DiceSprites?.animate($('dice-stage').children,{duration:1333*factor,stagger:28*factor})},reducedMotion.matches?30:300*factor);
  rollTimer=setTimeout(finishRoll,duration);
}

function ownPlayer(){return bluff.state.players.find(p=>p.name==='我')}
function isMyTurn(){return mode==='bluff'&&bluff.phase==='bidding'&&bluff.state.currentPlayer==='我'}
function characterFor(name){return roster.find(p=>p.name===name)}
function setBluffStatus(title,detail=''){$('bluff-status').replaceChildren();$('bluff-status').hidden=!title&&!detail;const s=document.createElement('strong'),p=document.createElement('span');s.textContent=title;p.textContent=detail;p.hidden=!detail;$('bluff-status').append(s,p)}
function showOwnHand(){
  renderDice(ownPlayer().values,bluff.state.bid?.face);
  $('dice-stage').hidden=bluff.privateCovered;$('dice-stage').setAttribute('aria-hidden',String(bluff.privateCovered));
  $('dice-stage').setAttribute('aria-label','我的五颗骰子');$('private-peek').hidden=!bluff.privateCovered;
  $('hand-toggle').textContent=bluff.privateCovered?'看骰子':'盖住骰子';$('hand-toggle').setAttribute('aria-pressed',String(bluff.privateCovered));
}
function updatePrivateSummary(){
  if(bluff.phase!=='bidding')return;
  if(bluff.privateCovered){setBluffStatus('');return}
  const bid=bluff.state.bid;
  if(!bid){setBluffStatus('');return}
  const matches=ownPlayer().values.filter(v=>v===1||v===bid.face).length;
  setBluffStatus('按桌上 '+bid.face+' 点计：手中 '+matches+' 个');
}
function syncComposer(reset=false){
  const legal=E.legalBids(bluff.state),mine=isMyTurn(),draft=bluff.draft;
  if(reset||!legal.some(b=>b.count===draft.count&&b.face===draft.face))Object.assign(draft,legal[0]||{count:20,face:6});
  const atCount=legal.filter(b=>b.count===draft.count);
  $('bid-count').value=draft.count;$('bid-count').min=legal[0]?.count||20;$('bid-count').max=20;
  for(const option of $('bid-face').options)option.disabled=!atCount.some(b=>b.face===Number(option.value));
  $('bid-face').value=draft.face;
  $('bid-count').disabled=!mine||!legal.length;$('bid-face').disabled=!mine||!legal.length;
  $('bid-minus').disabled=!mine||!legal.some(b=>b.count<draft.count);$('bid-plus').disabled=!mine||!legal.some(b=>b.count>draft.count);
  $('bid-button').disabled=!mine||!legal.length||!bluff.actionsReady;$('open-button').disabled=!mine||!bluff.state.bid||!bluff.actionsReady;
  $('bid-button').textContent='叫 '+draft.count+' 个 '+draft.face;$('bid-button').hidden=false;
  $('open-button').className=legal.length?'secondary-button':'primary-button';
  const last=bluff.state.bid;
  $('bid-guidance').textContent=!mine?'':!legal.length?'已到上限，请开盅。':!last?'首叫至少4个。':draft.count===last.count?'同数只能加点数。':'加数量可换点数。';
}
function changeDraft(count,face){
  if(!isMyTurn())return;
  const legal=E.legalBids(bluff.state),safe=Math.max(legal[0]?.count||20,Math.min(20,Math.trunc(Number(count))||4));
  const choices=legal.filter(b=>b.count===safe);if(!choices.length)return;
  bluff.draft={count:safe,face:choices.some(b=>b.face===Number(face))?Number(face):choices[0].face};syncComposer();playTap();
}
function updateHistoryButton(){$('history-button').textContent='叫点记录'+(bluff.state.history.length?' · '+bluff.state.history.length:'')}
function renderPracticeTurn(){
  const state=bluff.state,bid=state.bid;
  $('game-table').dataset.phase='bidding';$('game-table').classList.remove('settled');$('reveal-groups').hidden=true;$('reveal-banner').hidden=true;
  $('bluff-actions').hidden=false;$('settlement-actions').hidden=true;$('bid-composer').hidden=false;$('bluff-status').classList.remove('settled');
  $('hand-toggle').disabled=false;$('my-seat').hidden=false;
  for(const p of roster.filter(p=>p.name!=='我')){
    $(p.seat).hidden=false;const latest=[...state.history].reverse().find(b=>b.caller===p.name);
    $(p.seat).querySelector('.seat-status').textContent=state.currentPlayer===p.name?'思考中…':latest?latest.count+' 个 '+latest.face:'';
  }
  $('bid-bubble').hidden=false;$('bid-bubble').dataset.caller=bid?.caller||state.currentPlayer;
  $('bid-speaker').textContent=bid?bid.caller+' · 全桌至少':state.currentPlayer+'先叫';
  $('bid-content').textContent=bid?bid.count+' 个 '+bid.face+' 点':'全桌 20 颗';
  $('my-seat-status').textContent=state.currentPlayer==='我'?'轮到你':'等待'+state.currentPlayer;
  updateCharacters({thinking:state.currentPlayer,calling:bid?.caller});showOwnHand();updatePrivateSummary();syncComposer(true);updateHistoryButton();
}
function practicePaused(){return document.hidden||$('game-dialog').open}
function scheduleBot(){
  clearTimeout(bluff.timer);if(mode!=='bluff'||bluff.phase!=='bidding'||bluff.state.currentPlayer==='我'||practicePaused())return;
  bluff.timer=setTimeout(()=>{
    if(mode!=='bluff'||bluff.phase!=='bidding'||practicePaused())return;
    const actor=bluff.state.currentPlayer,action=E.chooseBotAction(bluff.state,actor);
    if(action.type==='challenge')beginReveal(actor);else acceptBid(actor,action.count,action.face);
  },1100);
}
function acceptBid(actor,count,face){
  try{bluff.state=E.placeBid(bluff.state,actor,count,face)}catch(error){$('bid-guidance').textContent=error.message;return}
  renderPracticeTurn();playTap();scheduleBot();
}
function startPractice(resetScores=false){
  clearTimeout(bluff.timer);clearTimeout(bluff.actionTimer);bluff.actionsReady=true;clearRoundFeedback();
  if(resetScores){bluff.roundNo=0;bluff.scores={}}
  bluff.roundNo++;bluff.privateCovered=false;bluff.phase='bidding';bluff.revealed=0;bluff.total=0;
  const starting=turnOrder[(bluff.roundNo+2)%turnOrder.length];
  bluff.state=E.createRound(turnOrder,randomDie,starting);
  // A gentle first call lets the first practice immediately teach "at least".
  if(bluff.roundNo===1)bluff.state=E.placeBid(bluff.state,'桃桃',4,3);
  $('heading-kicker').textContent=pageCopy.singleLabel+' · 第 '+bluff.roundNo+' 局';$('bluff-controls').classList.remove('counting');
  renderPracticeTurn();scheduleBot();
}
function revealGroup(player){
  const group=document.createElement('div');group.className='reveal-group';group.dataset.player=player.name;
  const label=document.createElement('div');label.className='reveal-player';
  const img=document.createElement('img');img.className='reveal-cat';img.src=characterImage(player);img.alt=player.catName;img.width=48;img.height=48;
  const name=document.createElement('span');name.className='reveal-name';name.textContent=player.name;const count=document.createElement('b');count.textContent='—';label.append(img,name,count);
  const cover=document.createElement('div');cover.className='reveal-covered';cover.textContent='还没开';group.append(label,cover);return group;
}
function beginReveal(actor){
  if(bluff.phase!=='bidding')return;
  try{bluff.state=E.challenge(bluff.state,actor)}catch(error){$('bid-guidance').textContent=error.message;return}
  clearTimeout(bluff.timer);bluff.phase='revealing';bluff.revealed=0;bluff.total=0;
  const result=bluff.state.result;
  $('game-table').dataset.phase='revealing';$('game-table').classList.add('settled');$('dice-stage').hidden=true;$('private-peek').hidden=true;
  roster.forEach(p=>$(p.seat).hidden=true);$('bid-bubble').hidden=true;$('bid-composer').hidden=true;$('bluff-actions').hidden=true;$('hand-toggle').disabled=true;
  $('reveal-groups').hidden=false;$('reveal-groups').replaceChildren(...roster.map(revealGroup));$('reveal-banner').hidden=false;
  $('reveal-target').textContent=result.bid.caller+'叫 '+result.bid.count+' 个 '+result.bid.face;
  $('reveal-progress').textContent='已找到 0 / 需要 '+result.bid.count;
  $('skip-reveal').disabled=false;$('skip-reveal').hidden=false;
  setBluffStatus(actor+'开盅');
  updateCharacters({challenged:result.bid.caller,calling:actor});
  if(reducedMotion.matches){skipReveal();return}
  bluff.timer=setTimeout(revealNext,320);
}
function revealNext(schedule=true){
  if(bluff.phase!=='revealing'||bluff.revealed>=roster.length||(schedule&&practicePaused()))return;
  const player=roster[bluff.revealed],hand=bluff.state.players.find(p=>p.name===player.name),face=bluff.state.result.bid.face;
  const group=$('reveal-groups').children[bluff.revealed],count=hand.values.filter(v=>v===1||v===face).length;
  const dice=document.createElement('div');dice.className='reveal-dice';hand.values.forEach((v,i)=>dice.append(die(v,i,v===1||v===face)));
  group.querySelector('.reveal-covered').replaceWith(dice);group.classList.add('revealed','counted');group.querySelector('b').textContent=count+' 个';
  bluff.revealed++;bluff.total+=count;$('reveal-progress').textContent='已找到 '+bluff.total+' / 需要 '+bluff.state.result.bid.count;
  setBluffStatus(player.name+'已开盅 · '+bluff.revealed+'/4');tone(380+bluff.revealed*80,.08,.018);
  if(schedule)bluff.timer=setTimeout(bluff.revealed===4?settle:revealNext,bluff.revealed===4?230:350);
}
function skipReveal(){if(bluff.phase!=='revealing')return;clearTimeout(bluff.timer);while(bluff.revealed<4)revealNext(false);settle()}
function settle(){
  if(bluff.phase!=='revealing')return;clearTimeout(bluff.timer);bluff.phase='settled';
  const r=bluff.state.result;bluff.scores[r.winner]=(bluff.scores[r.winner]||0)+1;
  $('game-table').dataset.phase='settled';$('game-table').classList.add(r.winner==='我'?'won':'lost');
  $('reveal-banner').hidden=true;$('skip-reveal').hidden=true;$('bluff-status').classList.add('settled');
  const natural=bluff.state.players.reduce((n,p)=>n+p.values.filter(v=>v===r.bid.face).length,0),ones=r.total-natural;
  const title=r.winner==='我'?'你赢了':r.winner+'赢了';
  setBluffStatus(title,'叫 '+r.bid.count+' 个 '+r.bid.face+' · 实际 '+r.total+'（'+natural+' 个'+r.bid.face+' + '+ones+' 个百搭1）');
  const award=document.createElement('span');award.className='score-award';award.textContent=r.winner+' +1 · 累计 '+bluff.scores[r.winner]+' 分';$('bluff-status').append(award);
  $('settlement-actions').hidden=false;
  updateCharacters({winner:r.winner,loser:r.loser});tone(r.winner==='我'?760:310,.16,.02);$('rematch-button').focus({preventScroll:true});
}
function toggleHand(){if(mode!=='bluff'||bluff.phase!=='bidding')return;bluff.privateCovered=!bluff.privateCovered;showOwnHand();updatePrivateSummary();playTap()}
function rematch(event){
  if(mode!=='bluff'||bluff.phase!=='settled'||event.detail>1)return;
  startPractice();
  // The old rematch and new call buttons share a position on small screens.
  // Let a double tap finish before the new round accepts a committed action.
  bluff.actionsReady=false;syncComposer();
  const round=bluff.roundNo;
  bluff.actionTimer=setTimeout(()=>{
    if(mode!=='bluff'||bluff.phase!=='bidding'||bluff.roundNo!==round)return;
    bluff.actionsReady=true;syncComposer();
  },400);
  (isMyTurn()?$('bid-count'):$('history-button')).focus({preventScroll:true});playTap();
}
function history(){
  const rows=[...bluff.state.history].slice(-8).reverse();
  const body=rows.length?'<ol class="bid-history">'+rows.map(b=>'<li><strong>'+b.caller+'</strong><span>全桌至少 '+b.count+' 个 '+b.face+'</span></li>').join('')+'</ol><p class="rules-aside">最近 '+rows.length+' 手 · 本局共 '+bluff.state.history.length+' 次叫点</p>':'<p>还没有人叫点，等第一声。</p>';
  showDialog('叫点记录',body,[{label:'关闭',primary:true}]);
}
function cancelFreeMotion(){clearTimeout(rollTimer);clearTimeout(faceTimer);clearTimeout(coverTimer);stopSounds();window.DiceSprites?.finishAll();$('game-table').classList.remove('rolling','covering','uncovering');setBusy(false)}
function updateModeNotice(){
  const label=pageCopy.previewLabel;
  const note=document.querySelector('.preview-note');note.querySelector('p').textContent=label;note.hidden=!label;
}
function setMode(next,force=false){
  if(free.busy||(next===mode&&!force))return;clearTimeout(bluff.timer);clearTimeout(bluff.actionTimer);stopSounds();clearRoundFeedback();mode=next;updateCharacters();
  motionRoller.reset();
  const practice=mode==='bluff';document.querySelectorAll('.mode').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode))});
  $('free-controls').hidden=practice;$('bluff-controls').hidden=!practice;$('cup-zone').hidden=practice;$('table-sticker').hidden=practice;$('my-seat').hidden=!practice;
  $('game-table').classList.toggle('bluff',practice);$('game-table').classList.remove('settled','covered','covering','uncovering');$('reveal-groups').hidden=true;$('reveal-banner').hidden=true;
  $('dice-stage').hidden=false;$('private-peek').hidden=true;$('hidden-note').hidden=true;$('dice-stage').setAttribute('aria-hidden','false');
  $('game-title').textContent=practice?'吹牛':'摇骰子';
  roster.filter(p=>p.name!=='我').forEach(p=>$(p.seat).hidden=!practice);$('bid-bubble').hidden=!practice;
  if(practice)startPractice(true);else{bluff.phase='idle';$('game-table').dataset.phase='free';$('dice-stage').setAttribute('aria-label','当前骰子');showFreeDice();positionGather();updateCover()}
  playTap();
}
function showDialog(title,body,actions){
  motionRoller.reset();
  $('game-dialog').lang='zh-CN';
  if(mode==='bluff')clearTimeout(bluff.timer);
  $('game-dialog').lang='zh-CN';dialogTrigger=document.activeElement;$('dialog-title').textContent=title;$('dialog-body').innerHTML=body;$('dialog-actions').replaceChildren();
  for(const a of actions){const b=document.createElement('button');b.textContent=a.label;b.className=a.primary?'primary-button':'secondary-button';b.addEventListener('click',()=>{$('game-dialog').close();a.action?.()});$('dialog-actions').append(b)}
  $('game-dialog').showModal();$('dialog-close').focus();
}
function rules(){
  if(mode==='free')showDialog('摇骰规则','<ul><li>选择1–6颗，点击骰盅或「摇一摇」。</li><li>盖盅后摇骰仍隐藏，揭盅才显示。盖盅、揭盅不改变点数。</li><li>快摇将动画缩短一半。</li></ul>',[{label:'知道了',primary:true}]);
  else showDialog('吹牛规则','<ol><li><strong>叫点</strong>每人5颗，共20颗。「4个3」代表全桌至少有4颗3。1是百搭，可代2–6；不能叫1。首叫至少4个。</li><li><strong>加叫</strong>同数量加点数，增加数量可换点数。例如：5个3 → 5个4 → 6个2。</li><li><strong>开盅</strong>实际数量达到叫数，叫点者赢；否则开盅者赢。胜方+1。</li></ol><p class="rules-aside">退出练习后积分清空。</p>',[{label:'知道了',primary:true}]);
}
function resetTable(){clearTimeout(bluff.timer);cancelFreeMotion();free.count=5;free.values=[];free.hasResult=false;free.covered=false;free.rolls=0;bluff.scores={};bluff.roundNo=0;bluff.state=null;$('roll-button').querySelector('span').textContent='摇一摇';renderCount();setMode('free',true)}
function leaveTable(){clearTimeout(bluff.timer);clearTimeout(bluff.actionTimer);bluff.phase='idle';cancelFreeMotion();clearRoundFeedback();window.location.assign(pageCopy.hubHref)}
function exit(){if(mode==='free'){leaveTable();return}showDialog(pageCopy.exitTitle,'<p>'+pageCopy.exitDescription+'</p>',[{label:pageCopy.stayLabel,primary:false},{label:pageCopy.leaveLabel,primary:true,action:leaveTable}]);$('game-dialog').lang=document.querySelector('.preview-note p').lang}
function resumePractice(){
  if(mode!=='bluff'||practicePaused())return;
  if(bluff.phase==='bidding')scheduleBot();
  else if(bluff.phase==='revealing'){
    clearTimeout(bluff.timer);
    if(reducedMotion.matches)skipReveal();else bluff.timer=setTimeout(bluff.revealed===4?settle:revealNext,250);
  }
}

$('roll-button').addEventListener('click',roll);
$('cup-zone').addEventListener('click',()=>{if(mode==='free')free.covered?toggleCover():roll()});
$('cover-button').addEventListener('click',toggleCover);
$('quick-roll-button').addEventListener('click',()=>{free.quick=!free.quick;$('quick-roll-button').setAttribute('aria-pressed',String(free.quick));playTap()});
for(const b of document.querySelectorAll('.mode'))b.addEventListener('click',()=>setMode(b.dataset.mode));
$('bid-minus').addEventListener('click',()=>changeDraft(bluff.draft.count-1,bluff.draft.face));
$('bid-plus').addEventListener('click',()=>changeDraft(bluff.draft.count+1,bluff.draft.face));
$('bid-count').addEventListener('change',()=>changeDraft($('bid-count').value,$('bid-face').value));
$('bid-count').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();if(event.repeat)return;changeDraft($('bid-count').value,$('bid-face').value);if(!$('bid-button').disabled)$('bid-button').focus()}});
$('bid-face').addEventListener('change',()=>changeDraft($('bid-count').value,$('bid-face').value));
$('bid-button').addEventListener('click',event=>{if(isMyTurn()&&bluff.actionsReady&&event.detail<=1){changeDraft($('bid-count').value,$('bid-face').value);acceptBid('我',bluff.draft.count,bluff.draft.face)}});
$('open-button').addEventListener('click',event=>{if(isMyTurn()&&bluff.actionsReady&&event.detail<=1)beginReveal('我')});
$('skip-reveal').addEventListener('click',skipReveal);$('hand-toggle').addEventListener('click',toggleHand);$('private-peek').addEventListener('click',toggleHand);
$('history-button').addEventListener('click',history);$('rematch-button').addEventListener('click',rematch);$('back-free-button').addEventListener('click',()=>setMode('free'));
$('rematch-button').addEventListener('keydown',event=>{if(event.repeat&&(event.key==='Enter'||event.key===' '))event.preventDefault()});
$('rules-button').addEventListener('click',rules);$('exit-button').addEventListener('click',exit);$('brand-link').addEventListener('click',event=>{event.preventDefault();exit()});
$('dialog-close').addEventListener('click',()=>$('game-dialog').close());
$('game-dialog').addEventListener('close',()=>{if(dialogTrigger&&document.contains(dialogTrigger)&&!dialogTrigger.disabled)dialogTrigger.focus({preventScroll:true});resumePractice()});
$('game-dialog').addEventListener('click',event=>{if(event.target===$('game-dialog')){const r=$('game-dialog').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('game-dialog').close()}});
function updateSound(){
  $('sound-button').setAttribute('aria-pressed',String(soundOn));$('sound-button').setAttribute('aria-label',soundOn?pageCopy.soundOff:pageCopy.soundOn);
  $('sound-icon').innerHTML=soundOn?'<path d="M11 4 5 9H2v6h3l6 5V4ZM16 8c3 2 3 6 0 8M19 4c5 4 5 12 0 16"/>':'<path d="M11 4 5 9H2v6h3l6 5V4ZM16 9l6 6M22 9l-6 6"/>';
}
function updateDeviceNote(state=motionRoller.state){
  const message=state==='requesting'?pageCopy.motionRequesting:['denied','unsupported','unavailable'].includes(state)?pageCopy['motion'+state[0].toUpperCase()+state.slice(1)]:soundFailure?pageCopy.soundError:'';
  $('motion-note').textContent=message||'';$('motion-note').hidden=!message;
}
$('hand-shake-button').addEventListener('click',async()=>{
  const current=++motionGeneration,audioOperation=soundGeneration;
  if(['on','waiting'].includes(motionRoller.state)){motionRoller.disable();if(!soundChosen&&!soundOn)diceAudio.disable();return}
  const permission=motionRoller.enable();
  // Unlock both APIs in this gesture. Turning sound off later stays respected.
  const sound=!soundChosen?diceAudio.enable():null;
  const enabled=await permission;
  if(sound){const audible=await sound;if(current!==motionGeneration||audioOperation!==soundGeneration||soundChosen)return;soundOn=enabled&&audible;soundFailure=enabled&&!audible;audioContext=diceAudio.context;if(!enabled)diceAudio.disable();updateSound();updateDeviceNote()}
});
$('sound-button').addEventListener('click',async()=>{
  const current=++soundGeneration;soundChosen=true;soundFailure=false;soundOn=!soundOn;updateSound();updateDeviceNote();
  if(!soundOn){stopSounds();diceAudio.disable()}else{const audible=await diceAudio.enable();if(current!==soundGeneration)return;soundOn=audible;soundFailure=!audible;audioContext=diceAudio.context}
  updateSound();updateDeviceNote();playTap();
});
window.addEventListener('pagehide',()=>{++motionGeneration;++soundGeneration;motionRoller.disable();stopSounds();diceAudio.disable();soundOn=false;updateSound()});
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden){resumePractice();return}stopSounds();clearRoundFeedback();
  if(mode==='free'){
    if(free.busy){cancelFreeMotion();if(free.values.length){free.hasResult=true;showFreeDice();$('roll-button').querySelector('span').textContent='再摇一次'}}
    if(free.hasResult)free.covered=true;
    positionGather();updateCover();
  }else{
    clearTimeout(bluff.timer);
    if(bluff.phase==='bidding'){bluff.privateCovered=true;showOwnHand();updatePrivateSummary()}
  }
});
reducedMotion.addEventListener('change',()=>{
  if(!reducedMotion.matches)return;
  clearRoundFeedback();
  if(mode==='free'){
    if($('game-table').classList.contains('rolling')){stopSounds();finishRoll()}
    else finishCover();
  }else if(bluff.phase==='revealing'&&!practicePaused())skipReveal();
});
window.addEventListener('resize',()=>{
  if(mode!=='free')return;
  if(free.busy)finishCover();
  if(free.covered)positionGather();
});
updateModeNotice();
renderCount();showFreeDice();updateCover();
