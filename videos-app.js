(()=>{
  const own=window.PORTAL_VIDEOS;
  const maestros=window.MAESTROS_VIDEOS;
  if(!own)return;

  const channels=[
    {key:'mickael',...own.channel},
    ...(maestros?[maestros.channel]:[])
  ];

  const videos=[
    ...own.videos.map(v=>({...v,channel:v.channel||'mickael'})),
    ...(maestros?maestros.videos:[])
  ];

  const search=document.querySelector('#videoSearch');
  const channelSelect=document.querySelector('#videoChannel');
  const channelList=document.querySelector('#channelList');
  const summary=document.querySelector('#videoSummary');
  const grid=document.querySelector('#videoGrid');

  if(!search||!channelSelect||!channelList||!summary||!grid)return;

  const channelMap=Object.fromEntries(channels.map(channel=>[channel.key,channel]));
  let activeType='all';

  const formatNumber=n=>new Intl.NumberFormat('pt-BR').format(n);
  const formatDate=d=>new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'});
  const getUrl=v=>v.type==='short'?`https://www.youtube.com/shorts/${v.id}`:`https://www.youtube.com/watch?v=${v.id}`;
  const escapeHtml=value=>String(value).replace(/[&<>"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));

  channels.forEach(channel=>{
    const option=document.createElement('option');
    option.value=channel.key;
    option.textContent=channel.title;
    channelSelect.appendChild(option);
  });

  function renderChannels(){
    channelList.innerHTML=channels.map(channel=>{
      const channelVideos=videos.filter(video=>video.channel===channel.key);
      const longCount=channelVideos.filter(video=>video.type==='long').length;
      const shortCount=channelVideos.filter(video=>video.type==='short').length;
      return `
        <article class="channel-card">
          <img src="${channel.thumbnail}" alt="Canal ${escapeHtml(channel.title)}" loading="lazy">
          <div>
            <h3>${escapeHtml(channel.title)}</h3>
            <p>${escapeHtml(channel.handle)}</p>
            <div class="channel-stats">
              <span>${channelVideos.length} vídeos</span>
              <span>${longCount} completos</span>
              <span>${shortCount} Shorts</span>
            </div>
          </div>
          <a href="${channel.url}" target="_blank" rel="noopener">Abrir canal ↗</a>
        </article>
      `;
    }).join('');
  }

  function renderVideos(){
    const query=search.value.trim().toLowerCase();
    const selectedChannel=channelSelect.value;

    const list=videos
      .filter(video=>{
        const channel=channelMap[video.channel];
        const searchable=`${video.title} ${channel?.title||''} ${channel?.handle||''}`.toLowerCase();
        return (activeType==='all'||video.type===activeType)
          && (selectedChannel==='all'||video.channel===selectedChannel)
          && (!query||searchable.includes(query));
      })
      .sort((a,b)=>b.date.localeCompare(a.date)||b.views-a.views);

    const totalLong=videos.filter(video=>video.type==='long').length;
    const totalShort=videos.filter(video=>video.type==='short').length;

    summary.innerHTML=`
      <span>${videos.length} vídeos cadastrados</span>
      <span>${channels.length} canais</span>
      <span>${totalLong} completos</span>
      <span>${totalShort} Shorts</span>
      <span>${list.length} exibidos</span>
    `;

    grid.innerHTML=list.length?list.map(video=>{
      const channel=channelMap[video.channel];
      return `
        <a class="video-card" href="${getUrl(video)}" target="_blank" rel="noopener">
          <div class="video-thumb">
            <img src="https://i.ytimg.com/vi/${video.id}/hqdefault.jpg" alt="${escapeHtml(video.title)}" loading="lazy">
            <span class="video-type">${video.type==='short'?'Short':'Vídeo completo'}</span>
            <span class="video-play">▶</span>
            <span class="video-duration">${video.duration}</span>
          </div>
          <div class="video-body">
            <div class="video-channel-name">${escapeHtml(channel?.title||'Canal')}</div>
            <h3>${escapeHtml(video.title)}</h3>
            <div class="video-meta">
              <span>${formatDate(video.date)}</span>
              <span>•</span>
              <span>${formatNumber(video.views)} visualizações</span>
            </div>
          </div>
        </a>
      `;
    }).join(''):'<div class="video-empty">Nenhum vídeo encontrado com esses filtros.</div>';
  }

  search.addEventListener('input',renderVideos);
  channelSelect.addEventListener('change',renderVideos);

  document.querySelectorAll('[data-video-filter]').forEach(button=>button.addEventListener('click',()=>{
    activeType=button.dataset.videoFilter;
    document.querySelectorAll('[data-video-filter]').forEach(item=>item.classList.toggle('active',item===button));
    renderVideos();
  }));

  renderChannels();
  renderVideos();
})();