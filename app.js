const DATA = window.__DATA;
const KEY="jt-hikidashi:v1";
const isStandalone=()=>{try{return matchMedia("(display-mode: standalone)").matches||navigator.standalone===true}catch(e){return false}};
let S={fav:[],favT:[],tried:{},memos:[],views:{}};
try{const r=localStorage.getItem(KEY); if(r) S=Object.assign(S,JSON.parse(r));}catch(e){}
S.views=S.views||{};S.favT=S.favT||[];
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const P=Object.fromEntries(DATA.problems.map(p=>[p.id,p]));
DATA.terms=DATA.terms||[];DATA.fields=DATA.fields||[];
const TM=Object.fromEntries(DATA.terms.map(t=>[t.id,t]));
const TBYP={};DATA.terms.forEach(t=>t.relProbs.forEach(pid=>{(TBYP[pid]=TBYP[pid]||[]).push(t.id)}));
let fld="すべて", tq="";
const STAGES=["養成","初任","中堅"], LEVELS=["入門","初級","中級","上級"];
const SKILLS=["話す","聞く","読む","書く","文字","語彙","文法","発音"];
const SCENES=["授業準備","導入・説明","練習・活動","問題の解説","まとめ・振り返り","評価","クラス運営","授業外"];
const LV={"入門":[0],"初級":[1],"初中級":[1,2],"中級":[2],"中上級":[2,3],"上級":[3]};
function levelsOf(p){
  const s=p.level||""; if(!s||s.includes("全レベル")) return {all:true,set:[0,1,2,3]};
  const parts=s.split(/[〜～~]/).map(x=>x.trim());
  let idx=[]; parts.forEach(x=>{(LV[x]||[]).forEach(i=>idx.push(i))});
  if(!idx.length) return {all:true,set:[0,1,2,3]};
  const lo=Math.min(...idx), hi=Math.max(...idx); const set=[]; for(let i=lo;i<=hi;i++) set.push(i);
  return {all:false,set};
}
S.prefs=S.prefs||{stage:"",level:""};
let F={stage:S.prefs.stage||"",level:S.prefs.level||"",skill:"",scene:""};
function matchF(p,f){ f=f||F;
  if(f.stage && !(p.stages||[]).includes(f.stage)) return false;
  if(f.level && !levelsOf(p).set.includes(LEVELS.indexOf(f.level))) return false;
  if(f.skill && !(p.skills||[]).includes(f.skill)) return false;
  if(f.scene && !(p.scenes||[]).includes(f.scene)) return false;
  return true;}
function sel(id,label,opts,val){return `<label class="fsel"><span>${label}</span><select id="${id}"><option value="">すべて</option>${opts.map(o=>`<option ${o===val?"selected":""}>${o}</option>`).join("")}</select></label>`}
function filterBar(){
  const on=F.stage||F.level||F.skill||F.scene;
  return `<div class="fbar">${sel("f-stage","教師の段階",STAGES,F.stage)}${sel("f-level","学習者のレベル",LEVELS,F.level)}${sel("f-skill","技能",SKILLS,F.skill)}${sel("f-scene","授業の場面",SCENES,F.scene)}</div>${on?`<button class="fclear" id="fclear">絞り込みをすべて解除</button>`:""}`}
function bindFilter(redraw){
  [["f-stage","stage"],["f-level","level"],["f-skill","skill"],["f-scene","scene"]].forEach(([id,k])=>{const e=document.getElementById(id); if(e) e.onchange=()=>{F[k]=e.value;redraw()}});
  const c=document.getElementById("fclear"); if(c) c.onclick=()=>{F={stage:"",level:"",skill:"",scene:""};redraw()};
}
function goFilter(k,v){F={stage:S.prefs.stage||"",level:S.prefs.level||"",skill:"",scene:""};F[k]=v;location.hash="#/c/"+encodeURIComponent("すべて");}

const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=d=>{const t=new Date(d);return `${t.getFullYear()}年${t.getMonth()+1}月${t.getDate()}日`};
const app=document.getElementById("app");
const side=document.getElementById("side");
const mq=matchMedia("(min-width: 1024px)");
const isDesk=()=>mq.matches;
function listRoot(){return isDesk()&&side?side:app}
let cat="すべて", q="";
function toast(m){const t=document.getElementById("toast");t.textContent=m;t.classList.add("on");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("on"),1600)}
function item(p){
  const f=S.fav.includes(p.id), tr=S.tried[p.id];
  return `<li><a href="#/p/${p.id}"><span class="ttl">${esc(p.title)}<span class="meta">${esc(p.cat)}／${esc(p.level)}</span></span>
  <span class="marks">${!seen(p.id)?'<span class="m-new" aria-label="未読">未読</span>':''}${f?'<span class="m-star" aria-label="お気に入り">★</span>':''}${tr?'<span class="m-tried" aria-label="試した">✓</span>':''}</span></a></li>`}
function seen(id){const v=S.views[id];return !!v}
function markView(id){const v=S.views[id]||{n:0,last:0};v.n++;v.last=Date.now();S.views[id]=v;save();}
function dayIndex(n,salt){const d=new Date();const k=d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()+salt;let h=k;h=(h^(h>>>7))*2654435761>>>0;return h%n}
function home(){
  const k=q.trim();
  const readN=DATA.problems.filter(p=>seen(p.id)).length, totalN=DATA.problems.length;
  app.innerHTML=`<p class="brand">授業の引き出し</p>
  <h1 class="lead">いま、授業で<br>困っていることは？</h1>
  <input class="search" id="q" type="search" placeholder="悩みや用語をキーワードで探す" value="${esc(q)}" aria-label="悩みや用語を探す">
  ${!isStandalone()&&!S.hideInstall?`<div class="itip" id="itip"><b>ホーム画面やパソコンに追加すると、アプリのように使えます</b>
   <span>iPhone：Safariの共有ボタン → 「ホーム画面に追加」<br>Android：Chromeのメニュー → 「アプリをインストール」または「ホーム画面に追加」<br>パソコン：Chrome・Edgeのアドレスバーにあるインストールのアイコン</span>
   <button id="itipx" aria-label="この案内を閉じる">閉じる</button></div>`:""}
  <div id="homebody"></div>`;
  const body=document.getElementById("homebody");
  const drawSearch=()=>{
    const k=q.trim();
    if(!k){drawTop();return}
    const r=DATA.problems.filter(p=>[p.title,p.cat,...p.keywords,...p.signs].join(" ").includes(k));
    const tr=DATA.terms.filter(t=>[t.term,t.yomi,t.short,t.desc].join(" ").includes(k));
    body.innerHTML=`<h2 class="sec">悩み <span class="cnt">${r.length}件</span></h2>
    <ul class="list">${r.length?r.map(item).join(""):`<li class="empty">当てはまる悩みはありません。</li>`}</ul>
    <h2 class="sec">用語 <span class="cnt">${tr.length}語</span></h2>
    <ul class="list tlist">${tr.length?tr.map(titem).join(""):`<li class="empty">当てはまる用語はありません。</li>`}</ul>`;
  };
  const drawTop=()=>{
    const _pool=DATA.problems.filter(p=>matchF(p,{stage:S.prefs.stage,level:S.prefs.level})); const _tp=_pool.length?_pool:DATA.problems; const tp=_tp[dayIndex(_tp.length,0)];
    const tt=DATA.terms.length?DATA.terms[dayIndex(DATA.terms.length,7)]:null;
    const recent=Object.entries(S.views).filter(([id])=>P[id]).sort((a,b)=>b[1].last-a[1].last).slice(0,4).map(([id])=>P[id]);
    const pct=Math.round(readN/totalN*100);
    body.innerHTML=`<a class="today" href="#/p/${tp.id}">
      <span class="tlab">今日の一つ</span>
      <span class="ttl2">${esc(tp.title)}</span>
      <span class="tpt">${esc(tp.points[0]||"")}</span>
      <span class="tmeta">${esc(tp.cat)}　読む ›</span></a>
    ${tt?`<a class="todayt" href="#/t/${tt.id}"><span class="tlab">今日の用語</span><b>${esc(tt.term)}</b><span>${esc(tt.short)}</span></a>`:""}
    <div class="prog" aria-label="読んだ悩みの数"><div class="pl"><span>読んだ悩み</span><b>${readN}</b><span>／ ${totalN}</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>
    ${recent.length?`<h2 class="sec">最近見た悩み</h2><ul class="list">${recent.map(item).join("")}</ul>`:""}
    <h2 class="sec">カテゴリーから探す</h2>
    <div class="grid">${DATA.categories.map(c=>{const ps=DATA.problems.filter(p=>p.cat===c.name);const rd=ps.filter(p=>seen(p.id)).length;
      return `<a class="tile" href="#/c/${encodeURIComponent(c.name)}"><b>${esc(c.name)}</b><span>${ps.length}件${rd?`・読んだ ${rd}`:""}</span></a>`}).join("")}</div>
    <h2 class="sec">技能から探す</h2>
    <div class="qchips">${SKILLS.map(s=>`<button class="qc" data-k="skill" data-v="${s}">${s}<small>${DATA.problems.filter(p=>(p.skills||[]).includes(s)).length}</small></button>`).join("")}</div>
    <h2 class="sec">授業の場面から探す</h2>
    <div class="qchips">${SCENES.map(s=>`<button class="qc" data-k="scene" data-v="${s}">${s}<small>${DATA.problems.filter(p=>(p.scenes||[]).includes(s)).length}</small></button>`).join("")}</div>
    <a class="allbtn" href="#/c/${encodeURIComponent("すべて")}">条件で絞り込んで探す（全${totalN}件）</a>`;
    body.querySelectorAll(".qc").forEach(b=>b.onclick=()=>goFilter(b.dataset.k,b.dataset.v));
  };
  drawSearch();
  const ix=document.getElementById("itipx"); if(ix) ix.onclick=()=>{S.hideInstall=true;save();document.getElementById("itip").remove()};
  document.getElementById("q").addEventListener("input",e=>{q=e.target.value;drawSearch()});
}

let sortMode="num";
function catView(name){
  const all=name==="すべて";
  const c=DATA.categories.find(x=>x.name===name);
  if(!all&&!c){home();return}
  let r=DATA.problems.filter(p=>(all||p.cat===name)&&matchF(p));
  const sorts={num:"番号順",unread:"未読を先に",often:"よく見る順",recent:"最近見た順"};
  const v=id=>S.views[id]||{n:0,last:0};
  if(sortMode==="unread") r=[...r].sort((a,b)=>(seen(a.id)?1:0)-(seen(b.id)?1:0));
  if(sortMode==="often") r=[...r].sort((a,b)=>v(b.id).n-v(a.id).n);
  if(sortMode==="recent") r=[...r].sort((a,b)=>v(b.id).last-v(a.id).last);
  const rd=r.filter(p=>seen(p.id)).length;
  const R=listRoot(); R.innerHTML=`<button class="back" onclick="location.hash='#/'">‹ さがす</button>
  <h1 class="lead" style="margin-top:10px">${esc(all?"すべての悩み":name)}</h1>
  ${c?`<p class="catdesc">${esc(c.desc)}</p>`:""}
  <p class="catdesc">${r.length}件・読んだ ${rd}件</p>
  ${filterBar()}
  <div class="chips" role="group" aria-label="並び替え">${Object.entries(sorts).map(([k,l])=>`<button class="chip" aria-pressed="${k===sortMode}" data-s="${k}">${l}</button>`).join("")}</div>
  <ul class="list">${r.length?r.map(item).join(""):`<li class="empty">この条件に当てはまる悩みはありません。絞り込みの条件を変えてみてください。</li>`}</ul>`;
  bindFilter(()=>catView(name));
  R.querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>{sortMode=b.dataset.s;catView(name)});
}
const arrow=`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 2v11M3.5 8.5L8 13l4.5-4.5"/></svg>`;
function detail(id){
  const p=P[id]; if(!p){app.innerHTML=`<p class="empty">この悩みは見つかりません。<a href="#/">一覧にもどる</a></p>`;return}
  if(!detail._same||detail._same!==id){markView(id)} detail._same=id;
  const f=S.fav.includes(id), tr=S.tried[id];
  const sib=DATA.problems.filter(x=>x.cat===p.cat), si=sib.findIndex(x=>x.id===id);
  const prevP=sib[si-1], nextP=sib[si+1];
  const memos=S.memos.filter(m=>m.pid===id).sort((a,b)=>b.date-a.date);
  const ul=(a,c="b")=>`<ul class="${c}">${a.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`;
  app.innerHTML=`<button class="back" onclick="history.length>1?history.back():location.hash='#/'">‹ もどる</button>
  <div class="tags"><span class="tag">${esc(p.cat)}</span><span class="tag">${esc(p.level)}</span>${(p.stages||[]).map(x=>`<span class="tag st">${esc(x)}</span>`).join("")}${(p.skills||[]).map(x=>`<button class="tag tb" data-k="skill" data-v="${esc(x)}">${esc(x)}</button>`).join("")}${(p.scenes||[]).map(x=>`<button class="tag tb" data-k="scene" data-v="${esc(x)}">${esc(x)}</button>`).join("")}</div>
  <h1 class="dtitle">${esc(p.title)}</h1>
  <div class="actions">
   <button class="act fav" aria-pressed="${f}" id="bf">${f?"★ お気に入り済み":"☆ お気に入り"}</button>
   <button class="act tried" aria-pressed="${!!tr}" id="bt">${tr?"✓ 授業で試した":"授業で試した"}</button>
  </div>
  <section><h2>こんなことはありませんか</h2>${ul(p.signs,"b signs")}</section>
  <section><h2>原因</h2>${ul(p.causes)}</section>
  <section><h2>解決のポイント</h2><ol class="points">${p.points.map(x=>`<li>${esc(x)}</li>`).join("")}</ol></section>
  <section><h2>具体例</h2>${p.examples.map(e=>`<div class="ex">
    ${e.scene?`<p class="scene">${esc(e.scene)}</p>`:""}
    <div class="say before"><span class="lab">よくある例</span>${esc(e.before)}</div>
    <div class="turn">${arrow}こう変える</div>
    <div class="say after"><span class="lab">改善例</span>${esc(e.after)}</div>
    ${e.note?`<p class="note"><b>ここが変わった：</b>${esc(e.note)}</p>`:""}</div>`).join("")}</section>
  <section><h2>一人でできる練習方法</h2>${ul(p.practice,"b practice")}</section>
  <section class="memo"><h2>ふりかえりメモ</h2>
   <label class="hint" for="mt">試してみてどうだったか、次に変えたいことを書き留めておきましょう。</label>
   <textarea id="mt" placeholder="例：指示を2つに分けたら、ペア活動にすぐ移れた。"></textarea>
   <div class="row"><span class="hint">この端末にだけ保存されます</span><button class="save" id="ms" disabled>メモを保存</button></div>
   <ul class="memos">${memos.map(m=>`<li><time>${fmt(m.date)}</time>${esc(m.text)}<br><button class="del" data-m="${m.id}">削除</button></li>`).join("")}</ul>
  </section>
  ${p.related.filter(r=>P[r]).length?`<section class="rel"><h2>関連する悩み</h2>${p.related.filter(r=>P[r]).map(r=>`<a href="#/p/${r}">${esc(P[r].title)}</a>`).join("")}</section>`:""}
  ${(TBYP[id]||[]).length?`<section class="rel"><h2>関連する用語</h2>${TBYP[id].map(t=>`<a class="t" href="#/t/${t}">${esc(TM[t].term)}<small>${esc(TM[t].short)}</small></a>`).join("")}</section>`:""}
  ${p.ref?`<p class="ref">参考：${esc(p.ref)}</p>`:""}
  <div class="pn">${prevP?`<a href="#/p/${prevP.id}"><small>‹ 前の悩み</small>${esc(prevP.title)}</a>`:"<span></span>"}${nextP?`<a class="nx" href="#/p/${nextP.id}"><small>次の悩み ›</small>${esc(nextP.title)}</a>`:"<span></span>"}</div>
  <p class="ref" style="text-align:center">${esc(p.cat)}の悩み　${si+1} / ${sib.length}</p>`;
  app.querySelectorAll(".tb").forEach(b=>b.onclick=()=>goFilter(b.dataset.k,b.dataset.v));
  document.getElementById("bf").onclick=()=>{S.fav=f?S.fav.filter(x=>x!==id):[...S.fav,id];save();toast(f?"お気に入りから外しました":"お気に入りに追加しました");detail(id)};
  document.getElementById("bt").onclick=()=>{if(tr)delete S.tried[id];else S.tried[id]=Date.now();save();toast(tr?"記録を取り消しました":"試した記録をつけました");detail(id)};
  const mt=document.getElementById("mt"),ms=document.getElementById("ms");
  mt.oninput=()=>ms.disabled=!mt.value.trim();
  ms.onclick=()=>{S.memos.push({id:Date.now()+""+Math.random().toString(36).slice(2,6),pid:id,date:Date.now(),text:mt.value.trim()});save();toast("メモを保存しました");detail(id)};
  app.querySelectorAll(".del").forEach(b=>b.onclick=()=>{if(confirm("このメモを削除しますか？")){S.memos=S.memos.filter(m=>m.id!==b.dataset.m);save();detail(id)}});
}
function titem(t){
  return `<li><a href="#/t/${t.id}"><span class="ttl">${esc(t.term)}<span class="meta">${esc(t.field)}</span><span class="short">${esc(t.short)}</span></span>
  <span class="marks">${S.favT.includes(t.id)?'<span class="m-star" aria-label="お気に入り">★</span>':''}</span></a></li>`}
let tkb="", tkana="", tshow=30;
const KANA_ROWS=[["あ","あいうえおぁぃぅぇぉ"],["か","かきくけこがぎぐげご"],["さ","さしすせそざじずぜぞ"],["た","たちつてとだぢづでどっ"],["な","なにぬねの"],["は","はひふへほばびぶべぼぱぴぷぺぽ"],["ま","まみむめも"],["や","やゆよゃゅょ"],["ら","らりるれろ"],["わ","わをんゎゔ"]];
const KUBUN=["社会・文化・地域","言語と社会","言語と心理","言語と教育","言語"];
function kanaRow(y){const c=(y||"").charAt(0);for(const [r,s] of KANA_ROWS){if(s.includes(c))return r}return "他"}
function dict(){
  const fs=["すべて",...DATA.fields.map(f=>f.name)];
  const desc=(DATA.fields.find(f=>f.name===fld)||{}).desc||"";
  const R=listRoot(); R.innerHTML=`<p class="brand">授業の引き出し</p>
  <h1 class="lead">用語辞典</h1>
  <input class="search" id="tq" type="search" placeholder="例：中間言語、Can-do、敬語" value="${esc(tq)}" aria-label="用語を探す">
  <div class="chips" role="group" aria-label="分野">${fs.map(c=>`<button class="chip" aria-pressed="${c===fld}" data-c="${esc(c)}">${esc(c)}</button>`).join("")}</div>
  ${desc?`<p class="catdesc">${esc(desc)}</p>`:""}
  <div class="fbar one">${sel("t-kubun","試験の区分（目安）",KUBUN,tkb)}</div>
  <div class="kana" role="group" aria-label="五十音">${["すべて",...KANA_ROWS.map(r=>r[0])].map(k=>`<button class="kn" aria-pressed="${(k==="すべて"?"":k)===tkana}" data-k="${k==="すべて"?"":k}">${k}</button>`).join("")}</div>
  <p class="catdesc" id="tcount"></p>
  <ul class="list tlist" id="tl"></ul><div id="tmore"></div>`;
  const draw=()=>{
    const k=tq.trim();
    let r=DATA.terms.filter(t=>(fld==="すべて"||t.field===fld)&&(!tkb||t.kubun===tkb)&&(!tkana||kanaRow(t.yomi)===tkana)&&(!k||[t.term,t.yomi,t.short,t.desc,(t.ex||[]).join(" "),t.bg||""].join(" ").includes(k)));
    r=[...r].sort((a,b)=>a.yomi.localeCompare(b.yomi,"ja"));
    document.getElementById("tcount").textContent=`${r.length}語${r.length>tshow?`（${tshow}語まで表示中）`:""}`;
    let html="",last="";
    r.slice(0,tshow).forEach(t=>{const kr=kanaRow(t.yomi); if(kr!==last){html+=`<li class="khead">${kr}</li>`;last=kr} html+=titem(t)});
    document.getElementById("tl").innerHTML=r.length?html:`<li class="empty">当てはまる用語はありません。条件を変えてみてください。</li>`;
    document.getElementById("tmore").innerHTML=r.length>tshow?`<button class="allbtn more" id="tm">もっと見る（残り${r.length-tshow}語）</button>`:"";
    const m=document.getElementById("tm"); if(m) m.onclick=()=>{tshow+=30;draw()};
  };
  draw();
  document.getElementById("tq").addEventListener("input",e=>{tq=e.target.value;tshow=30;draw()});
  R.querySelectorAll(".chip").forEach(b=>b.onclick=()=>{fld=b.dataset.c;tshow=30;dict()});
  R.querySelectorAll(".kn").forEach(b=>b.onclick=()=>{tkana=b.dataset.k;tshow=30;dict()});
  const kb=document.getElementById("t-kubun"); kb.onchange=()=>{tkb=kb.value;tshow=30;dict()};
}
function term(id){
  const t=TM[id]; if(!t){app.innerHTML=`<p class="empty">この用語は見つかりません。<a href="#/dict">用語辞典にもどる</a></p>`;return}
  if(!term._same||term._same!==id){markView(id)} term._same=id;
  const f=S.favT.includes(id);
  const rt=t.relTerms.filter(x=>TM[x]), rp=t.relProbs.filter(x=>P[x]);
  app.innerHTML=`<button class="back" onclick="history.length>1?history.back():location.hash='#/dict'">‹ もどる</button>
  <div class="tags"><span class="tag">${esc(t.field)}</span>${t.kubun?`<span class="tag st">${esc(t.kubun)}</span>`:""}${t.asof?`<span class="tag asof">情報の時点：${esc(t.asof)}</span>`:""}</div>
  <h1 class="dtitle">${esc(t.term)}</h1>${t.yomi?`<p class="yomi">${esc(t.yomi)}</p>`:""}
  <p class="tshort">${esc(t.short)}</p>
  <div class="actions"><button class="act fav" aria-pressed="${f}" id="tf">${f?"★ お気に入り済み":"☆ お気に入り"}</button></div>
  <section><h2>解説</h2><p class="desc">${esc(t.desc)}</p></section>
  ${(t.ex||[]).length?`<section><h2>具体例</h2><ul class="exl">${t.ex.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section>`:""}
  ${t.bg?`<section><h2>背景・経緯</h2><p class="desc">${esc(t.bg)}</p></section>`:""}
  ${(t.pit||[]).length?`<section><h2>よくある誤解・注意点</h2><ul class="pit">${t.pit.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section>`:""}
  ${t.use.length?`<section><h2>現場での活かし方</h2><ul class="b practice">${t.use.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section>`:""}
  ${rp.length?`<section class="rel"><h2>関連する悩み</h2>${rp.map(r=>`<a href="#/p/${r}">${esc(P[r].title)}</a>`).join("")}</section>`:""}
  ${rt.length?`<section class="rel"><h2>関連する用語</h2>${rt.map(r=>`<a class="t" href="#/t/${r}">${esc(TM[r].term)}<small>${esc(TM[r].short)}</small></a>`).join("")}</section>`:""}
  ${t.ref?`<p class="ref">参考：${esc(t.ref)}</p>`:""}
  ${t.asof?`<p class="ref">制度・動向に関する内容は変わることがあります。最新の情報は公的機関の発表で確認してください。</p>`:""}`;
  document.getElementById("tf").onclick=()=>{S.favT=f?S.favT.filter(x=>x!==id):[...S.favT,id];save();toast(f?"お気に入りから外しました":"お気に入りに追加しました");term(id)};
}
function fav(){
  const r=S.fav.map(i=>P[i]).filter(Boolean);
  app.innerHTML=`<p class="brand">授業の引き出し</p><h1 class="lead">お気に入り</h1>
  <h2>悩み</h2><ul class="list">${r.length?r.map(item).join(""):`<li class="empty">まだありません。悩みのページで「☆ お気に入り」を押すと、ここに集まります。</li>`}</ul>
  <h2 style="margin-top:28px">用語</h2><ul class="list tlist">${S.favT.filter(i=>TM[i]).length?S.favT.filter(i=>TM[i]).map(i=>titem(TM[i])).join(""):`<li class="empty">まだありません。用語のページで「☆ お気に入り」を押すと、ここに集まります。</li>`}</ul>`;
}
function log(){
  const tried=Object.keys(S.tried).filter(i=>P[i]);
  const ms=[...S.memos].filter(m=>P[m.pid]).sort((a,b)=>b.date-a.date);
  app.innerHTML=`<p class="brand">授業の引き出し</p><h1 class="lead">ふりかえり</h1>
  <div class="stat"><div><b>${tried.length}</b>授業で試した</div><div><b>${ms.length}</b>メモ</div><div><b>${DATA.problems.length}</b>登録された悩み</div></div>
  <section class="prefs"><h2>わたしの設定</h2>
  <p class="hint">設定すると、「今日の一つ」が自分に合った悩みから選ばれ、一覧の絞り込みの初期値にもなります。</p>
  <div class="fbar">${sel("p-stage","教師の段階",STAGES,S.prefs.stage)}${sel("p-level","担当する学習者のレベル",LEVELS,S.prefs.level)}</div></section>
  <h2>試した悩み</h2><ul class="list">${tried.length?tried.sort((a,b)=>S.tried[b]-S.tried[a]).map(i=>item(P[i])).join(""):`<li class="empty">授業で試した悩みに「授業で試した」をつけると、ここに記録されます。</li>`}</ul>
  <h2 style="margin-top:28px">メモ</h2><ul class="memos">${ms.length?ms.map(m=>`<li><a class="from" href="#/p/${m.pid}">${esc(P[m.pid].title)}</a><time>${fmt(m.date)}</time>${esc(m.text)}</li>`).join(""):`<li class="empty" style="border:0">各悩みのページの「ふりかえりメモ」に書いたことが、ここにまとまります。</li>`}</ul>
  <section class="bk"><h2 style="margin-top:28px">記録のバックアップ</h2>
  <p class="hint">お気に入り・メモ・閲覧の記録は、この端末にだけ保存されています。機種変更の前などに、ファイルに書き出しておくと、新しい端末で読み込めます。</p>
  <div class="bkrow"><button class="act" id="exp">記録を書き出す</button><label class="act" for="imp">記録を読み込む</label><input type="file" id="imp" accept="application/json" hidden></div></section>
  <p class="ref" style="margin-top:22px">データ：悩み${DATA.problems.length}件・用語${DATA.terms.length}語${DATA.builtAt?`（${esc(DATA.builtAt)} 更新）`:""}</p>`;
  bindPrefs();
  document.getElementById("exp").onclick=()=>{
    const blob=new Blob([JSON.stringify({app:"jugyo-hikidashi",version:1,savedAt:new Date().toISOString(),data:S},null,1)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);
    const d=new Date();a.download=`jugyo-hikidashi-backup-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}.json`;
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast("書き出しました");
  };
  document.getElementById("imp").onchange=e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=()=>{
      try{const o=JSON.parse(r.result); if(o.app!=="jugyo-hikidashi"||!o.data) throw 0;
        if(!confirm("今の記録を、読み込んだ記録で置き換えます。よろしいですか？")) return;
        S=Object.assign({fav:[],favT:[],tried:{},memos:[],views:{}},o.data); save(); toast("読み込みました"); log();
      }catch(err){ alert("このファイルは読み込めませんでした。書き出したバックアップファイルを選んでください。"); }
    }; r.readAsText(f);
  };
}
function bindPrefs(){
  const a=document.getElementById("p-stage"),b=document.getElementById("p-level");
  if(a) a.onchange=()=>{S.prefs.stage=a.value;F.stage=a.value;save();toast("設定を保存しました")};
  if(b) b.onchange=()=>{S.prefs.level=b.value;F.level=b.value;save();toast("設定を保存しました")};
}
let sideCtx="";
function renderSideFor(ctx){
  const t=side.scrollTop;
  if(ctx.startsWith("/c/")) catView(decodeURIComponent(ctx.slice(3)));
  else if(ctx==="/dict") dict();
  side.scrollTop=t;
}
function markCurrent(h){
  if(!side) return;
  side.querySelectorAll("a[aria-current]").forEach(a=>a.removeAttribute("aria-current"));
  const a=side.querySelector(`a[href="#${h}"]`); if(a) a.setAttribute("aria-current","true");
}
function route(){
  detail._same=null; term._same=null;
  const h=location.hash.replace(/^#/,"")||"/";
  const desk=isDesk()&&!!side;
  const isList=h.startsWith("/c/")||h==="/dict";
  const isDetail=h.startsWith("/p/")||h.startsWith("/t/");
  document.body.classList.toggle("two",desk&&(isList||isDetail));
  let n="home";
  if(isList){
    if(h.startsWith("/c/")){catView(decodeURIComponent(h.slice(3)));n="home";} else {dict();n="dict";}
    if(desk){ if(sideCtx!==h){side.scrollTop=0} sideCtx=h;
      app.innerHTML=`<div class="deskph"><p>${h==="/dict"?"左の一覧から用語を選ぶと、ここに説明が表示されます。":"左の一覧から悩みを選ぶと、ここに内容が表示されます。"}</p></div>`; }
  } else if(isDetail){
    const id=decodeURIComponent(h.slice(3));
    if(h.startsWith("/p/")){detail(id);n="";} else {term(id);n="dict";}
    if(desk){
      let ctx=sideCtx;
      if(h.startsWith("/t/")&&!(ctx==="/dict")) ctx="/dict";
      if(h.startsWith("/p/")&&!(ctx&&ctx.startsWith("/c/"))){const p=P[id]; ctx="/c/"+encodeURIComponent(p?p.cat:"すべて");}
      if(ctx!==sideCtx){side.scrollTop=0; sideCtx=ctx;}
      renderSideFor(sideCtx); markCurrent(h);
    }
  }
  else if(h==="/fav"){fav();n="fav"} else if(h==="/log"){log();n="log"} else home();
  document.querySelectorAll("nav a").forEach(a=>a.removeAttribute("aria-current"));
  document.querySelectorAll("nav a").forEach(a=>{if(a.dataset.nav===n)a.setAttribute("aria-current","page")});
  window.scrollTo(0,0);
}
mq.addEventListener?mq.addEventListener("change",route):mq.addListener(route);
addEventListener("hashchange",route); route();
