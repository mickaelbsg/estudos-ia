(()=>{
  const DATA=window.PORTAL_VIDEOS;
  if(!DATA||document.querySelector('#page-videos'))return;

  const nav=document.createElement('button');
  nav.className='nav';
  nav.dataset.page='videos';
  nav.innerHTML='<span>▶</span>Vídeos';
  const toolsNav=document.querySelector('.nav[data-page="ferramentas"]');
  toolsNav.insertAdjacentElement('afterend',nav);

  const page=document.createElement('section');
  page.id='page-videos';
  page.className='page';
  page.innerHTML=`
    <div class="section-title">
      <div>
        <span class="eyebrow">Aprendizado em vídeo</span>
        <h2>Vídeos sobre Inteligência Artificial</h2>
        <p>Conteúdo do canal organizado entre vídeos completos e Shorts.</p>
      </div>
    </div>

    <section class="channel-banner">
      <img class="channel-avatar" src="${DATA.channel.thumbnail}" alt="Canal ${DATA.channel.title}">
      <div class="channel-copy">
        <h2>${DATA.channel.title}</h2>
        <p>${DATA.channel.handle} · IA, AIOps, Vibecoding, agentes e infraestrutura.</p>
      </div>
      <a class="channel-link" href="${DATA.channel.url}" target="_blank" rel="noopener">Abrir canal no YouTube ↗</a>
    </section>

    <div class="video-toolbar">
      <label class="video-search">⌕ <input id="videoSearch" type="search" placeholder="Pesquisar por título ou assunto..."></label>
      <div class="video-filters" role="group" aria-label="Filtrar vídeos">
        <button class="video-filter active" data-video-filter="all">Todos</button>
        <button class="video-filter" data-video-filter="long">Completos</button>
        <button class="video-filter" data-video-filter="short">Shorts</button>
      </div>
    </div>

    <div id="videoSummary" class="video-summary"></div>
    <div id="videoGrid" class="video-grid"></div>
  `;
  document.querySelector('footer').insertAdjacentElement('beforebegin',page);

  let activeFilter='all';
  const formatNumber=n=>new Intl.NumberFormat('pt-BR').format(n);
  const formatDate=d=>new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});
  const getUrl=v=>v.type==='short'?`https://www.youtube.com/shorts/${v.id}`:`https://www.youtube.com/watch?v=${v.id}`;

  function openVideos(){
    document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x===page));
    document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x===nav));
    document.querySelector('#eyebrow').textContent='Aprendizado em vídeo';
    document.querySelector('#pageTitle').textContent='Vídeos';
    document.querySelector('#sidebar').classList.remove('open');
    history.replaceState(null,'','#videos');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function renderVideos(){
    const q=document.querySelector('#videoSearch').value.trim().toLowerCase();
    const list=DATA.videos
      .filter(v=>(activeFilter==='all'||v.type===activeFilter)&&(!q||v.title.toLowerCase().includes(q)))
      .sort((a,b)=>b.date.localeCompare(a.date));

    const totalLong=DATA.videos.filter(v=>v.type==='long').length;
    const totalShort=DATA.videos.filter(v=>v.type==='short').length;
    document.querySelector('#videoSummary').innerHTML=`
      <span>${DATA.videos.length} vídeos cadastrados</span>
      <span>${totalLong} completos</span>
      <span>${totalShort} Shorts</span>
      <span>${list.length} exibidos</span>
    `;

    document.querySelector('#videoGrid').innerHTML=list.length?list.map(v=>`
      <a class="video-card" href="${getUrl(v)}" target="_blank" rel="noopener">
        <div class="video-thumb">
          <img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="${v.title.replace(/"/g,'&quot;')}" loading="lazy">
          <span class="video-type">${v.type==='short'?'Short':'Vídeo completo'}</span>
          <span class="video-play">▶</span>
          <span class="video-duration">${v.duration}</span>
        </div>
        <div class="video-body">
          <h3>${v.title}</h3>
          <div class="video-meta">
            <span>${formatDate(v.date)}</span>
            <span>•</span>
            <span>${formatNumber(v.views)} visualizações</span>
          </div>
        </div>
      </a>
    `).join(''):'<div class="video-empty">Nenhum vídeo encontrado com esse filtro.</div>';
  }

  nav.addEventListener('click',openVideos);
  document.querySelector('#videoSearch').addEventListener('input',renderVideos);
  document.querySelectorAll('[data-video-filter]').forEach(button=>button.addEventListener('click',()=>{
    activeFilter=button.dataset.videoFilter;
    document.querySelectorAll('[data-video-filter]').forEach(x=>x.classList.toggle('active',x===button));
    renderVideos();
  }));

  document.querySelectorAll('.nav:not([data-page="videos"])').forEach(button=>button.addEventListener('click',()=>{
    if(location.hash==='#videos')history.replaceState(null,'',location.pathname+location.search);
  }));

  renderVideos();
  if(location.hash==='#videos')openVideos();
})();