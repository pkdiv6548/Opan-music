const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const DEFAULT="./assets/images/openbeat-default.svg";
const GENRES=["Chill & Focus","Electronic","Bollywood Hits","Punjabi Songs","Romantic Hindi","Lo-fi","Workout"];
const FALLBACK=[
{id:"f1",title:"Midnight Resonance",artist:"Aura Sound Lab",album:"Atmospheres Vol. 1",genre:"Chill",duration:215,source:"stream",audioUrl:"./assets/audio/openbeat-demo.mp3"},
{id:"f2",title:"Neon Heartbeat",artist:"The Glitch Dreamers",album:"Liquid Audio Sessions",genre:"Electronic",duration:252,source:"stream",audioUrl:"./assets/audio/openbeat-demo.mp3"},
{id:"f3",title:"Ethereal Drift",artist:"Solaris Phase",album:"Atmospheres",genre:"Ambient",duration:225,source:"stream",audioUrl:"./assets/audio/openbeat-demo.mp3"},
{id:"f4",title:"Liquid Motion",artist:"Velvet Echo",album:"Fluidity",genre:"Electronic",duration:252,source:"stream",audioUrl:"./assets/audio/openbeat-demo.mp3"},
{id:"f5",title:"Crystalline",artist:"Prism Theory",album:"Refractions",genre:"Downtempo",duration:178,source:"stream",audioUrl:"./assets/audio/openbeat-demo.mp3"},
{id:"f6",title:"Vocal Void",artist:"Liora Vane",album:"Zero Gravity",genre:"Ambient",duration:320,source:"stream",audioUrl:"./assets/audio/openbeat-demo.mp3"}
];
let tracks=[...FALLBACK], queue=[], queueIndex=-1, current=null, playing=false, repeat="off", shuffle=false, muted=false;
let audio=new Audio(); audio.preload="metadata"; audio.crossOrigin="anonymous";
let yt=null, ytReady=false, ytTrack=null, ytProgressTimer=null, deferredInstall=null, wakeLock=null;
const state={history:JSON.parse(localStorage.getItem("ob_history")||"[]"),liked:JSON.parse(localStorage.getItem("ob_liked")||"[]"),bgPlayback:localStorage.getItem("ob_bg")!=="false",eq:localStorage.getItem("ob_eq")||"electronic",speed:Number(localStorage.getItem("ob_speed")||1)};
function save(){localStorage.setItem("ob_history",JSON.stringify(state.history.slice(0,30)));localStorage.setItem("ob_liked",JSON.stringify(state.liked.slice(0,100)));localStorage.setItem("ob_bg",String(state.bgPlayback));localStorage.setItem("ob_eq",state.eq);localStorage.setItem("ob_speed",String(state.speed))}
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const liked=id=>state.liked.some(x=>x.id===id);
const fmt=s=>{s=Math.max(0,Math.floor(Number(s)||0));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove("show"),2200)}
function normalize(x){return {id:x.id||x.videoId,title:x.title||"Untitled",artist:x.artist||x.channel||"Unknown artist",album:x.album||"YouTube",thumbnail:x.thumbnail||x.artworkUrl||DEFAULT,duration:Number(x.duration)||0,source:x.youtubeId||x.videoId?"youtube":"stream",youtubeId:x.youtubeId||x.videoId||null,artworkUrl:x.thumbnail||x.artworkUrl||DEFAULT,channel:x.channel||x.artist||"Unknown"}}
function card(t){return `<article class="track-card ${current&&current.id===t.id&&playing?"playing":""}" data-id="${esc(t.id)}"><div class="cover"><img src="${esc(t.artworkUrl||DEFAULT)}" alt="${esc(t.title)}" loading="lazy" onerror="this.src='${DEFAULT}'"><button class="like-over ${liked(t.id)?"liked":""}" data-action="like">${liked(t.id)?"♥":"♡"}</button><button class="play-over" data-action="play">${current&&current.id===t.id&&playing?"Ⅱ":"▶"}</button></div><h3>${esc(t.title)}</h3><p>${esc(t.artist)}</p><div class="card-actions"><button data-action="play">Play</button><button data-action="queue">Queue</button></div></article>`}
function renderGrid(id,list){const e=$(id);if(!e)return;e.innerHTML=list.length?list.map(card).join(""):`<div class="empty-state">No tracks found.</div>`}
function renderHome(){const base=tracks.slice(0,6);renderGrid("#quickGrid",state.history.length?state.history.slice(0,6):base);renderGrid("#chillGrid",tracks.filter(t=>/chill|ambient|lofi|downtempo/i.test(t.genre||"")).slice(0,6));renderGrid("#madeGrid",tracks.slice(0,6));}
function renderLibrary(){renderGrid("#likedGrid",state.liked);renderGrid("#localGrid",tracks.filter(t=>t.source==="local"));renderGrid("#libraryGrid",state.liked)}
function renderQueue(){const e=$("#queueList");$("#queueCount").textContent=queue.length;e.innerHTML=queue.length?queue.map((t,i)=>`<div class="queue-item" data-qid="${esc(t.id)}"><img src="${esc(t.artworkUrl||DEFAULT)}"><div><b>${i===queueIndex?"▶ ":""}${esc(t.title)}</b><span>${esc(t.artist)}</span></div></div>`).join(""):`<p class="muted-text">Queue is empty.</p>`}
function renderAll(){renderHome();renderLibrary();renderQueue();updateUI()}
function setCurrent(t){current=t;$("#heroTitle").textContent=t.title;$("#heroArtist").textContent=t.artist;$("#heroAlbum").textContent=t.album||"YouTube";$("#heroThumb").src=t.artworkUrl||DEFAULT;$("#bigThumb").src=t.artworkUrl||DEFAULT;$("#bigTitle").textContent=t.title;$("#bigArtist").textContent=t.artist;$("#miniThumb").src=t.artworkUrl||DEFAULT;$("#miniTitle").textContent=t.title;$("#miniArtist").textContent=t.artist}
function updateUI(){const title=current?current.title:"Choose a song",artist=current?current.artist:"OpenBeat";document.body.classList.toggle("is-playing",playing);$("#expandedArt")?.classList.toggle("playing",playing);["miniTitle"].forEach(id=>$( "#"+id).textContent=title);$("#miniArtist").textContent=artist;$("#playBtn").textContent=playing?"Ⅱ":"▶";$("#bigPlay").textContent=playing?"Ⅱ":"▶";$("#heroState").textContent=playing?"PLAYING":"MASTER";$("#miniLike").textContent=current&&liked(current.id)?"♥":"♡";if(current){$("#seek").value=duration()?currentTime()/duration()*100:0;$("#timeNow").textContent=fmt(currentTime());$("#timeEnd").textContent=fmt(duration());$("#seekFill").style.width=(duration()?currentTime()/duration()*100:0)+"%";$("#bigTime").textContent=fmt(currentTime());$("#bigRemain").textContent="-"+fmt(Math.max(0,duration()-currentTime()))}$$(".track-card").forEach(e=>e.classList.toggle("playing",!!(current&&e.dataset.id===current.id&&playing)));renderQueue()}
function currentTime(){return current?.source==="youtube"&&yt?yt.getCurrentTime()||0:audio.currentTime||0}
function duration(){return current?.source==="youtube"&&yt?(yt.getDuration()||current.duration||0):(audio.duration||current?.duration||0)}
function ensureQueue(t){if(!queue.length){queue=[...tracks.slice(0,10)]}if(!queue.some(x=>x.id===t.id))queue.push(t);queueIndex=queue.findIndex(x=>x.id===t.id)}
function remember(t){state.history=[t,...state.history.filter(x=>x.id!==t.id)].slice(0,30);save()}
function like(t){const i=state.liked.findIndex(x=>x.id===t.id);if(i>=0)state.liked.splice(i,1);else state.liked.unshift(t);save();renderAll()}
async function playTrack(t, q){if(!t)return;ensureQueue(t);if(q&&q.length){queue=[...q];queueIndex=queue.findIndex(x=>x.id===t.id);if(queueIndex<0){queue.unshift(t);queueIndex=0}}current=t;remember(t);stopYT();setCurrent(t);if(t.source==="local"||t.source==="stream"){audio.src=t.audioUrl||t.fileUrl||"";audio.playbackRate=state.speed;audio.volume=muted?0:($("#volume").value/100);try{await audio.play();playing=true}catch(e){playing=false;toast("Tap Play to start audio")}}else{if(!ytReady){toast("YouTube player is loading…");return}loadYT(t)}updateUI()}
function loadYT(t){if(!yt)return;ytTrack=t;yt.loadVideoById({videoId:t.youtubeId,startSeconds:0});yt.setPlaybackRate(state.speed);yt.setVolume(muted?0:Number($("#volume").value));playing=true;startYTProgress();updateUI()}
function pause(){if(current?.source==="youtube"){if(yt)yt.pauseVideo();stopYTProgress()}else audio.pause();playing=false;releaseWake();updateUI()}
function resume(){if(!current)return;if(current.source==="youtube"){if(yt)yt.playVideo();else return}else audio.play().catch(()=>{});playing=true;requestWake();updateUI()}
function toggle(){playing?pause():resume()}
function next(){if(!queue.length)return;if(repeat==="one"&&current){playTrack(current);return}let n=shuffle?Math.floor(Math.random()*queue.length):queueIndex+1;if(n>=queue.length){if(repeat==="all")n=0;else return pause()}playTrack(queue[n])}
function prev(){if(currentTime()>3)return seekTo(0);let n=queueIndex-1;if(n<0)n=repeat==="all"?queue.length-1:0;playTrack(queue[n])}
function seekTo(s){s=Math.max(0,Math.min(Number(s)||0,duration()));if(current?.source==="youtube"&&yt)yt.seekTo(s,true);else audio.currentTime=s;updateUI()}
function toggleLikeCurrent(){if(current)like(current)}
function addQueue(t){if(!queue.some(x=>x.id===t.id)){queue.push(t);toast("Added to queue")}else toast("Already in queue");renderQueue()}
async function search(q,target="#searchGrid"){if(!q)return;$("#searchStatus").textContent="Searching…";try{const r=await fetch("/api/search?q="+encodeURIComponent(q),{headers:{Accept:"application/json"}});const d=await r.json();if(!r.ok)throw Error(d.error||"Search failed");const items=(d.items||[]).map(normalize);if(items.length){tracks=[...items,...tracks.filter(x=>!items.some(y=>y.id===x.id))];renderGrid(target,items);$("#searchStatus").textContent=`${items.length} results for “${q}”`;renderHome()}else{renderGrid(target,[]);$("#searchStatus").textContent="No results"}}catch(e){$("#searchStatus").textContent=e.message||"Search failed";toast("API search failed")}}
function showTab(tab){history.replaceState(null,"","?view="+encodeURIComponent(tab));$$(".view").forEach(v=>v.classList.toggle("active-view",v.id===tab));$$(".nav-item,.mobile-nav button").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));if(tab==="search")$("#searchInput").focus();$("#sidebar").classList.remove("open")}
function setupGenres(){$("#genres").innerHTML=GENRES.map(g=>`<button class="genre" data-genre="${esc(g)}">♪ ${esc(g)}</button>`).join("");$$(".genre").forEach(b=>b.onclick=()=>{showTab("explore");search(b.dataset.genre,"#exploreGrid")})}
function startYTProgress(){stopYTProgress();ytProgressTimer=setInterval(updateUI,500)}
function stopYTProgress(){clearInterval(ytProgressTimer);ytProgressTimer=null}
function stopYT(){stopYTProgress();if(yt&&ytTrack&&ytTrack.id!==current?.id){try{yt.stopVideo()}catch{}}}
function requestWake(){if(!$("#wakeLock")?.checked)return;if("wakeLock"in navigator&&!wakeLock)navigator.wakeLock.request("screen").then(x=>wakeLock=x).catch(()=>{})}
function releaseWake(){if(wakeLock){wakeLock.release().catch(()=>{});wakeLock=null}}
function applyEq(){state.eq=$("#settingsEq").value;$("#eqPreset").value=state.eq;save();toast("Equalizer: "+$("#settingsEq").selectedOptions[0].text)}
function setupMediaSession(){if(!("mediaSession"in navigator))return;const bind=(a,f)=>{try{navigator.mediaSession.setActionHandler(a,f)}catch{}};bind("play",resume);bind("pause",pause);bind("previoustrack",prev);bind("nexttrack",next);bind("seekbackward",()=>seekTo(currentTime()-10));bind("seekforward",()=>seekTo(currentTime()+10))}
function updateMediaSession(){if(!("mediaSession"in navigator)||!current)return;navigator.mediaSession.metadata=new MediaMetadata({title:current.title,artist:current.artist,album:current.album||"OpenBeat",artwork:[{src:current.artworkUrl||DEFAULT,sizes:"512x512",type:"image/jpeg"}]})}
audio.addEventListener("play",()=>{playing=true;updateMediaSession();updateUI()});audio.addEventListener("pause",()=>{playing=false;updateUI()});audio.addEventListener("timeupdate",updateUI);audio.addEventListener("ended",next);audio.addEventListener("error",()=>{playing=false;toast("Audio source could not be played")});
window.onYouTubeIframeAPIReady=()=>{ytReady=true;if(window.YT?.Player){yt=new YT.Player("ytPlayer",{height:"300",width:"100%",videoId:"",playerVars:{autoplay:0,controls:1,playsinline:1,rel:0,modestbranding:1},events:{onReady:()=>updateUI(),onStateChange:e=>{if(e.data===1){playing=true;startYTProgress();updateMediaSession();updateUI()}if(e.data===2){playing=false;stopYTProgress();updateUI()}if(e.data===0)next()}}})}};
$$(".nav-item,.mobile-nav button").forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
$("#menuBtn").onclick=()=>$("#sidebar").classList.add("open");$("#closeSidebar").onclick=()=>$("#sidebar").classList.remove("open");
$("#searchForm").onsubmit=e=>{e.preventDefault();const q=$("#searchInput").value.trim();if(q){showTab("search");search(q)}};

$("#heroPlay").onclick=()=>current&&current.id===tracks[0].id&&playing?pause():playTrack(tracks[0],tracks);
$("#heroQueue").onclick=()=>addQueue(tracks[0]);$("#heroExplore").onclick=()=>showTab("explore");
$$("[data-query]").forEach(b=>b.onclick=()=>search(b.dataset.query,"#exploreGrid"));
$("#quickGrid").onclick=$("#chillGrid").onclick=$("#madeGrid").onclick=$("#exploreGrid").onclick=$("#searchGrid").onclick=$("#libraryGrid").onclick=$("#likedGrid").onclick=$("#localGrid").onclick=e=>{const cardEl=e.target.closest(".track-card");if(!cardEl)return;const t=tracks.find(x=>x.id===cardEl.dataset.id)||state.liked.find(x=>x.id===cardEl.dataset.id);if(!t)return;const a=e.target.closest("[data-action]")?.dataset.action;if(a==="like"){like(t);return}if(a==="queue"){addQueue(t);return}playTrack(t)};
$("#likedGrid").onclick=e=>{const c=e.target.closest(".track-card");if(c){const t=state.liked.find(x=>x.id===c.dataset.id);if(t)playTrack(t)}};
$("#miniOpen").onclick=()=>$("#playerModal").classList.remove("hidden");$("#openPlayerBtn").onclick=()=>$("#playerModal").classList.remove("hidden");$("#closePlayer").onclick=()=>$("#playerModal").classList.add("hidden");
$("#playBtn").onclick=toggle;$("#prevBtn").onclick=prev;$("#nextBtn").onclick=next;$("#bigPlay").onclick=toggle;$("#bigPrev").onclick=prev;$("#bigNext").onclick=next;$("#bigShuffle").onclick=$("#shuffleBtn").onclick=()=>{shuffle=!shuffle;toast(shuffle?"Shuffle on":"Shuffle off")};$("#bigRepeat").onclick=$("#repeatBtn").onclick=()=>{repeat=repeat==="off"?"all":repeat==="all"?"one":"off";toast("Repeat: "+repeat)};
$("#miniLike").onclick=toggleLikeCurrent;$("#seek").oninput=e=>seekTo(duration()*Number(e.target.value)/100);$("#volume").oninput=e=>{audio.volume=Number(e.target.value)/100;muted=Number(e.target.value)===0;if(yt)yt.setVolume(Number(e.target.value));};$("#muteBtn").onclick=()=>{$("#volume").value=muted?85:0;$("#volume").dispatchEvent(new Event("input"));};
$("#queueBtn").onclick=()=>$("#queuePanel").classList.add("open");$("#closeQueue").onclick=()=>$("#queuePanel").classList.remove("open");
$("#queueList").onclick=e=>{const q=e.target.closest(".queue-item");if(q){const t=queue.find(x=>x.id===q.dataset.qid);if(t)playTrack(t)}};
$("#speed").onchange=e=>{state.speed=Number(e.target.value);audio.playbackRate=state.speed;if(yt)yt.setPlaybackRate(state.speed);save()};$("#eqPreset").onchange=applyEq;
$("#settingsBtn").onclick=()=>$("#settingsModal").classList.remove("hidden");$("#closeSettings").onclick=()=>$("#settingsModal").classList.add("hidden");$("#saveSettings").onclick=()=>{state.bgPlayback=$("#bgPlayback").checked;state.eq=$("#settingsEq").value;save();$("#settingsModal").classList.add("hidden");toast("Settings saved")};
$("#bgPlayback").checked=state.bgPlayback;$("#settingsEq").value=state.eq;$("#eqPreset").value=state.eq;
$("#installBtn").onclick=async()=>{if(deferredInstall){deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null}else if(/iphone|ipad|ipod/i.test(navigator.userAgent))toast("On iPhone/iPad: Share → Add to Home Screen");else toast("Use your browser's Install App option")};
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;});
window.addEventListener("appinstalled",()=>{deferredInstall=null;toast("OpenBeat installed")});
window.addEventListener("keydown",e=>{if(["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName))return;if(e.code==="Space"){e.preventDefault();toggle()}if(e.code==="ArrowRight")seekTo(currentTime()+5);if(e.code==="ArrowLeft")seekTo(currentTime()-5);if(e.code==="KeyM")$("#muteBtn").click();if(e.code==="KeyQ")$("#queueBtn").click();if(e.code==="Slash"){e.preventDefault();showTab("search")}});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&state.bgPlayback&&playing&&current?.source!=="youtube")requestWake();});
$("#localFiles").onchange=e=>{[...e.target.files].forEach(file=>{const t={id:"local-"+crypto.randomUUID(),title:file.name.replace(/\.[^.]+$/,""),artist:"Local file",album:"On device",genre:"Local",duration:0,source:"local",fileUrl:URL.createObjectURL(file),artworkUrl:DEFAULT};tracks.unshift(t)});renderAll();toast("Local music added");}
$("#clearHistory").onclick=()=>{state.history=[];save();renderHome();toast("History cleared")};
$("#openLyrics").onclick=()=>{$("#lyricsModal").classList.remove("hidden");$("#lyricsTitle").textContent=current?.title||"Lyrics";$("#lyricsText").textContent=current?.lyrics||"Lyrics are not available for this track."};
$("#closeLyrics").onclick=()=>$("#lyricsModal").classList.add("hidden");
$("#themeBtn").onclick=()=>{document.body.classList.toggle("light");toast("Audiophile theme retained")};
setupGenres();renderAll();setCurrent(tracks[0]);updateMediaSession();setupMediaSession();const initialView=new URLSearchParams(location.search).get("view");if(initialView&&$("#"+initialView))showTab(initialView);

if("serviceWorker"in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));}
