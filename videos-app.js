(()=>{
  const DATA=window.PORTAL_VIDEOS;
  if(!DATA)return;

  const avatar=document.querySelector('#channelAvatar');
  const title=document.querySelector('#channelTitle');
  const description=document.querySelector('#channelDescription');
  const channelLink=document.querySelector('#channelLink');
  const search=document.querySelector('#videoSearch');
  const summary=document.querySelector('#videoSummary');
  const grid=document.querySelector('#videoGrid');

  if(!avatar||!search||!summary||!grid)return;

  avatar.src=DATA.channel.thumbnail;
  avatar.alt=`Canal ${DATA.channel.title}`;
  title.textContent=DATA.channel.title;
  description.textContent=`${DATA.channel.handle} · IA, AIOps, Vibecoding, agentes e infraestrutura.`;
  channelLink.href=DATA.channel.url;

  let activeFilter='all';
  const formatNumber=n=>new Intl.NumberFormat('pt-BR').format(n);
  const formatDate=d=>new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});
  const getUrl=v=>v.type==='short'?`https://www.youtube.com/shorts/${v.id}`:`https://www.youtube.com/watch?v=${v.id}`;

  function renderVideos(){
    const q=search.value.trim().toLowerCase();
    const list=DATA.videos
      .filter(v=>(activeFilter==='all'||v.type===activeFilter)&&(!q||v.title.toLowerCase().includes(q)))
      .sort((a,b)=>b.date.localeCompare(a.date));

    const totalLong=DATA.videos.filter(v=>v.type==='long').length;
    const totalShort=DATA.videos.filter(v=>v.type==='short').length;

    summary.innerHTML=`
      <span>${DATA.videos.length} vídeos cadastrados</span>
      <span>${totalLong} completos</span>
      <span>${totalShort} Shorts</span>
      <span>${list.length} exibidos</span>
    `;

    grid.innerHTML=list.length?list.map(v=>`
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

  search.addEventListener('input',renderVideos);
  document.querySelectorAll('[data-video-filter]').forEach(button=>button.addEventListener('click',()=>{
    activeFilter=button.dataset.videoFilter;
    document.querySelectorAll('[data-video-filter]').forEach(x=>x.classList.toggle('active',x===button));
    renderVideos();
  }));

  renderVideos();
})();