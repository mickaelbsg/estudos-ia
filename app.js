const DB=window.PORTAL_DATA;
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const favs=new Set(JSON.parse(localStorage.getItem('ia-favoritos')||'[]'));
let favoriteOnly=false;

const labels={
  inicio:['Base de conhecimento','Painel de IA'],
  ferramentas:['Glossário prático','Ferramentas de IA'],
  videos:['Aprendizado em vídeo','Vídeos'],
  ideias:['Produtos e experimentos','Ideias'],
  estudos:['Aprendizado organizado','Estudos']
};

function initials(n){return n.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()}
function badgeClass(s){return s==='Utilizamos'?'used':s==='Em teste'?'test':s==='Estudar'?'study':'recommended'}

function setPage(page){
  if(!labels[page])return;
  $$('.page').forEach(x=>x.classList.toggle('active',x.id===`page-${page}`));
  $$('.nav').forEach(x=>x.classList.toggle('active',x.dataset.page===page));
  $('#eyebrow').textContent=labels[page][0];
  $('#pageTitle').textContent=labels[page][1];
  $('#sidebar').classList.remove('open');
  history.replaceState(null,'',page==='inicio'?location.pathname:`#${page}`);
  window.scrollTo({top:0,behavior:'smooth'});
}

$$('.nav').forEach(x=>x.onclick=()=>setPage(x.dataset.page));
$$('[data-go]').forEach(x=>x.onclick=()=>setPage(x.dataset.go));
$('#menuButton').onclick=()=>$('#sidebar').classList.toggle('open');

function renderStats(){
  const used=DB.tools.filter(t=>t.s.includes('Utilizamos')).length;
  const test=DB.tools.filter(t=>t.s.includes('Em teste')).length;
  const cats=new Set(DB.tools.map(t=>t.c)).size;
  $('#stats').innerHTML=[[DB.tools.length,'ferramentas catalogadas'],[used,'já utilizadas'],[test,'em teste'],[cats,'categorias']]
    .map(([n,l])=>`<article class="stat"><b>${n}</b><span>${l}</span></article>`).join('');
}

function renderNeeds(){
  $('#needs').innerHTML=DB.needs.map(([a,b])=>`<article class="need"><strong>${a}</strong><span>${b}</span></article>`).join('');
}

function populateCategories(){
  [...new Set(DB.tools.map(t=>t.c))].sort().forEach(c=>$('#category').insertAdjacentHTML('beforeend',`<option>${c}</option>`));
}

function renderTools(){
  const q=$('#search').value.trim().toLowerCase();
  const cat=$('#category').value;
  const status=$('#status').value;
  const list=DB.tools.filter(t=>{
    const text=Object.values(t).flat().join(' ').toLowerCase();
    return(!q||text.includes(q))&&(!cat||t.c===cat)&&(!status||t.s.includes(status))&&(!favoriteOnly||favs.has(t.n));
  });
  $('#toolCount').textContent=`${list.length} de ${DB.tools.length} ferramentas`;
  $('#tools').innerHTML=list.length?list.map(t=>`<article class="tool-card"><div class="tool-head"><div class="tool-icon">${initials(t.n)}</div><button class="favorite ${favs.has(t.n)?'active':''}" data-fav="${encodeURIComponent(t.n)}">★</button></div><h3>${t.n}</h3><div class="category-label">${t.c}</div><p>${t.d}</p><div class="badges">${t.s.map(s=>`<span class="badge ${badgeClass(s)}">${s}</span>`).join('')}</div><button class="details" data-detail="${encodeURIComponent(t.n)}">Ver detalhes →</button></article>`).join(''):'<div class="empty">Nenhuma ferramenta encontrada com esses filtros.</div>';
  $$('[data-fav]').forEach(b=>b.onclick=()=>{
    const n=decodeURIComponent(b.dataset.fav);
    favs.has(n)?favs.delete(n):favs.add(n);
    localStorage.setItem('ia-favoritos',JSON.stringify([...favs]));
    renderTools();
  });
  $$('[data-detail]').forEach(b=>b.onclick=()=>openModal(decodeURIComponent(b.dataset.detail)));
}

function openModal(name){
  const t=DB.tools.find(x=>x.n===name);
  $('#modal').innerHTML=`<button id="closeModal" class="modal-close">✕</button><div class="tool-icon">${initials(t.n)}</div><h2>${t.n}</h2><div class="category-label">${t.c}</div><div class="badges" style="margin:14px 0 24px">${t.s.map(s=>`<span class="badge ${badgeClass(s)}">${s}</span>`).join('')}</div>${[['O que é',t.d],['Para que serve',t.u],['Quando usar',t.w],['Pontos fortes',t.f],['Limitações',t.l],['Exemplos de uso',t.e]].map(([a,b])=>`<section class="detail"><strong>${a}</strong><p>${b}</p></section>`).join('')}`;
  $('#modalBackdrop').classList.add('open');
  $('#closeModal').onclick=closeModal;
}

function closeModal(){$('#modalBackdrop').classList.remove('open')}
$('#modalBackdrop').onclick=e=>{if(e.target===$('#modalBackdrop'))closeModal()};
document.onkeydown=e=>{if(e.key==='Escape')closeModal()};
['search','category','status'].forEach(id=>$(`#${id}`).oninput=renderTools);
$('#favoritesButton').onclick=()=>{
  favoriteOnly=!favoriteOnly;
  $('#favoritesButton').textContent=favoriteOnly?'★ Favoritos ativos':'☆ Favoritos';
  setPage('ferramentas');
  renderTools();
};

function renderIdeas(){
  $('#ideas').innerHTML=DB.ideas.map(i=>`<article class="content-card"><span class="eyebrow">Ideia inicial</span><h3>${i.t}</h3><p>${i.d}</p><ol>${i.steps.map(s=>`<li>${s}</li>`).join('')}</ol><div class="chips">${i.tags.map(s=>`<span class="chip">${s}</span>`).join('')}</div></article>`).join('');
}

function renderTracks(){
  $('#tracks').innerHTML=DB.tracks.map(i=>`<article class="content-card"><span class="eyebrow">Trilha</span><h3>${i.t}</h3><p>${i.d}</p><div class="chips">${i.tags.map(s=>`<span class="chip">${s}</span>`).join('')}</div></article>`).join('');
}

renderStats();
renderNeeds();
populateCategories();
renderTools();
renderIdeas();
renderTracks();

const initialPage=location.hash.replace('#','');
if(labels[initialPage])setPage(initialPage);