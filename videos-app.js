const own = window.PORTAL_VIDEOS;
const maestros = window.MAESTROS_VIDEOS;
const firebaseSettings = window.ESTUDOS_IA_FIREBASE || {};

if (!own) {
  throw new Error('A biblioteca base de vídeos não foi carregada.');
}

const staticChannels = [
  { key: 'mickael', ...own.channel },
  ...(maestros ? [{ key: 'maestros', ...maestros.channel }] : [])
];

const staticVideos = [
  ...own.videos.map(video => ({ ...video, channel: video.channel || 'mickael' })),
  ...(maestros ? maestros.videos : [])
].map(video => ({
  favorite: false,
  watched: false,
  category: '',
  playlist: '',
  tags: [],
  notes: '',
  ...video
}));

const staticVideoIds = new Set(staticVideos.map(video => video.id));
const staticChannelIds = new Set(staticChannels.map(channel => channel.key));

const elements = {
  search: document.querySelector('#videoSearch'),
  channel: document.querySelector('#videoChannel'),
  category: document.querySelector('#videoCategory'),
  playlist: document.querySelector('#videoPlaylist'),
  channelList: document.querySelector('#channelList'),
  summary: document.querySelector('#videoSummary'),
  grid: document.querySelector('#videoGrid'),
  login: document.querySelector('#videoLoginButton'),
  authBadge: document.querySelector('#videoAuthBadge'),
  status: document.querySelector('#firebaseStatus'),
  adminBar: document.querySelector('#videoAdminBar'),
  addVideo: document.querySelector('#addVideoButton'),
  addChannel: document.querySelector('#addChannelButton'),
  manageCategories: document.querySelector('#manageCategoriesButton'),
  managePlaylists: document.querySelector('#managePlaylistsButton'),
  migrate: document.querySelector('#migrateVideosButton'),
  modal: document.querySelector('#modal'),
  modalBackdrop: document.querySelector('#modalBackdrop')
};

if (Object.values(elements).some(value => !value)) {
  throw new Error('A interface da biblioteca de vídeos está incompleta.');
}

const state = {
  activeType: 'all',
  remoteChannels: [],
  remoteVideos: [],
  categories: [],
  playlists: [],
  firestoreOnly: false,
  user: null,
  isAdmin: false,
  firebaseConfigured: hasFirebaseConfig(),
  firebaseConnected: false,
  auth: null,
  db: null,
  provider: null,
  sdk: null
};

function hasFirebaseConfig() {
  const config = firebaseSettings.firebaseConfig || {};
  return ['apiKey', 'authDomain', 'projectId', 'appId'].every(key => Boolean(config[key]));
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);
}

function slugify(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function formatNumber(value = 0) {
  return new Intl.NumberFormat('pt-BR').format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return 'Data não informada';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return 'Data não informada';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getVideoUrl(video) {
  if (video.url) return video.url;
  return video.type === 'short'
    ? `https://www.youtube.com/shorts/${video.id}`
    : `https://www.youtube.com/watch?v=${video.id}`;
}

function parseYoutubeVideoId(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || null;
    if (!host.endsWith('youtube.com')) return null;

    if (url.searchParams.get('v')) return url.searchParams.get('v');

    const parts = url.pathname.split('/').filter(Boolean);
    if (['shorts', 'embed', 'live'].includes(parts[0])) return parts[1] || null;
  } catch {
    return null;
  }

  return null;
}

function mergeCollections(baseItems, remoteItems, keyField) {
  const map = new Map();

  if (!state.firestoreOnly) {
    baseItems.forEach(item => map.set(item[keyField], { ...item }));
  }

  remoteItems.forEach(item => {
    const key = item[keyField];
    if (!key) return;
    if (item.deleted) {
      map.delete(key);
      return;
    }
    map.set(key, { ...(map.get(key) || {}), ...item });
  });

  return [...map.values()];
}

function getChannels() {
  return mergeCollections(staticChannels, state.remoteChannels, 'key');
}

function getVideos() {
  return mergeCollections(staticVideos, state.remoteVideos, 'id');
}

function getTaxonomyValues(kind) {
  const remoteValues = state[kind].filter(item => !item.deleted).map(item => item.name).filter(Boolean);
  const field = kind === 'categories' ? 'category' : 'playlist';
  const videoValues = getVideos().map(video => video[field]).filter(Boolean);
  return [...new Set([...remoteValues, ...videoValues])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function setStatus(message = '', type = 'info') {
  elements.status.hidden = !message;
  elements.status.className = `firebase-status ${type}`;
  elements.status.textContent = message;
}

function openModal(content) {
  elements.modal.innerHTML = `<button class="modal-close" data-video-modal-close type="button">✕</button>${content}`;
  elements.modalBackdrop.classList.add('open');
  elements.modal.querySelector('[data-video-modal-close]')?.addEventListener('click', closeModal);
}

function closeModal() {
  elements.modalBackdrop.classList.remove('open');
}

function updateAuthInterface() {
  if (!state.firebaseConfigured) {
    elements.login.textContent = 'Configurar Firebase';
    elements.authBadge.textContent = 'Modo leitura';
    elements.authBadge.className = 'video-auth-badge warning';
    elements.adminBar.hidden = true;
    setStatus('A interface do CRUD já está instalada. Falta conectar o projeto Firebase para liberar login e gravações.', 'warning');
    return;
  }

  if (!state.user) {
    elements.login.textContent = 'Entrar com Google';
    elements.authBadge.textContent = 'Modo visitante';
    elements.authBadge.className = 'video-auth-badge';
    elements.adminBar.hidden = true;
    if (state.firebaseConnected) setStatus('');
    return;
  }

  elements.login.textContent = 'Sair';
  elements.authBadge.textContent = state.isAdmin
    ? `Administrador · ${state.user.displayName || state.user.email}`
    : `Visitante conectado · ${state.user.displayName || state.user.email}`;
  elements.authBadge.className = `video-auth-badge ${state.isAdmin ? 'admin' : 'warning'}`;
  elements.adminBar.hidden = !state.isAdmin;

  if (state.isAdmin) {
    setStatus('Firebase conectado. As alterações são salvas no Firestore.', 'success');
  } else {
    setStatus('Esta conta Google não está autorizada a alterar a biblioteca.', 'warning');
  }

  elements.migrate.disabled = state.firestoreOnly;
  elements.migrate.textContent = state.firestoreOnly ? 'Dados já migrados' : 'Migrar dados atuais';
}

function updateFilterOptions(select, values, allLabel, currentValue) {
  select.innerHTML = `<option value="all">${escapeHtml(allLabel)}</option>${values.map(value => (
    `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`
  )).join('')}`;
  select.value = values.includes(currentValue) ? currentValue : 'all';
}

function renderChannels() {
  const channels = getChannels();
  const videos = getVideos();
  const selected = elements.channel.value;

  elements.channel.innerHTML = '<option value="all">Todos os canais</option>' + channels.map(channel => (
    `<option value="${escapeHtml(channel.key)}">${escapeHtml(channel.title)}</option>`
  )).join('');
  elements.channel.value = channels.some(channel => channel.key === selected) ? selected : 'all';

  elements.channelList.innerHTML = channels.map(channel => {
    const channelVideos = videos.filter(video => video.channel === channel.key);
    const longCount = channelVideos.filter(video => video.type === 'long').length;
    const shortCount = channelVideos.filter(video => video.type === 'short').length;

    return `
      <article class="channel-card">
        <img src="${escapeHtml(channel.thumbnail || 'https://www.gstatic.com/youtube/img/branding/youtubelogo/svg/youtubelogo.svg')}" alt="Canal ${escapeHtml(channel.title)}" loading="lazy">
        <div>
          <h3>${escapeHtml(channel.title)}</h3>
          <p>${escapeHtml(channel.handle || '')}</p>
          <div class="channel-stats">
            <span>${channelVideos.length} vídeos</span>
            <span>${longCount} completos</span>
            <span>${shortCount} Shorts</span>
          </div>
        </div>
        <div class="channel-card-actions">
          <a href="${escapeHtml(channel.url || '#')}" target="_blank" rel="noopener">Abrir canal ↗</a>
          ${state.isAdmin ? `
            <button class="mini-action" type="button" data-edit-channel="${escapeHtml(channel.key)}">Editar</button>
            <button class="mini-action danger" type="button" data-delete-channel="${escapeHtml(channel.key)}">Excluir</button>
          ` : ''}
        </div>
      </article>
    `;
  }).join('');

  elements.channelList.querySelectorAll('[data-edit-channel]').forEach(button => {
    button.addEventListener('click', () => openChannelForm(channels.find(channel => channel.key === button.dataset.editChannel)));
  });

  elements.channelList.querySelectorAll('[data-delete-channel]').forEach(button => {
    button.addEventListener('click', () => deleteChannel(button.dataset.deleteChannel));
  });
}

function renderVideos() {
  const channels = getChannels();
  const videos = getVideos();
  const channelMap = Object.fromEntries(channels.map(channel => [channel.key, channel]));
  const queryText = elements.search.value.trim().toLowerCase();
  const selectedChannel = elements.channel.value;
  const selectedCategory = elements.category.value;
  const selectedPlaylist = elements.playlist.value;

  updateFilterOptions(elements.category, getTaxonomyValues('categories'), 'Todas as categorias', selectedCategory);
  updateFilterOptions(elements.playlist, getTaxonomyValues('playlists'), 'Todas as playlists', selectedPlaylist);

  const list = videos
    .filter(video => {
      const channel = channelMap[video.channel];
      const searchable = [
        video.title,
        channel?.title,
        channel?.handle,
        video.category,
        video.playlist,
        ...(Array.isArray(video.tags) ? video.tags : [])
      ].filter(Boolean).join(' ').toLowerCase();

      return (state.activeType === 'all' || video.type === state.activeType)
        && (selectedChannel === 'all' || video.channel === selectedChannel)
        && (selectedCategory === 'all' || video.category === selectedCategory)
        && (selectedPlaylist === 'all' || video.playlist === selectedPlaylist)
        && (!queryText || searchable.includes(queryText));
    })
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || Number(b.views || 0) - Number(a.views || 0));

  const totalLong = videos.filter(video => video.type === 'long').length;
  const totalShort = videos.filter(video => video.type === 'short').length;
  const totalWatched = videos.filter(video => video.watched).length;
  const totalFavorites = videos.filter(video => video.favorite).length;

  elements.summary.innerHTML = `
    <span>${videos.length} vídeos cadastrados</span>
    <span>${channels.length} canais</span>
    <span>${totalLong} completos</span>
    <span>${totalShort} Shorts</span>
    <span>${totalWatched} assistidos</span>
    <span>${totalFavorites} favoritos</span>
    <span>${list.length} exibidos</span>
  `;

  elements.grid.innerHTML = list.length ? list.map(video => {
    const channel = channelMap[video.channel];
    const badges = [
      video.category ? `<span>${escapeHtml(video.category)}</span>` : '',
      video.playlist ? `<span>${escapeHtml(video.playlist)}</span>` : '',
      video.watched ? '<span>Assistido</span>' : '',
      video.favorite ? '<span>Favorito</span>' : ''
    ].filter(Boolean).join('');

    return `
      <article class="video-card ${video.watched ? 'watched' : ''}">
        <a class="video-card-link" href="${escapeHtml(getVideoUrl(video))}" target="_blank" rel="noopener">
          <div class="video-thumb">
            <img src="${escapeHtml(video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`)}" alt="${escapeHtml(video.title)}" loading="lazy">
            <span class="video-type">${video.type === 'short' ? 'Short' : 'Vídeo completo'}</span>
            <span class="video-play">▶</span>
            <span class="video-duration">${escapeHtml(video.duration || '—')}</span>
          </div>
          <div class="video-body">
            <div class="video-channel-name">${escapeHtml(channel?.title || 'Canal')}</div>
            <h3>${escapeHtml(video.title || 'Vídeo sem título')}</h3>
            <div class="video-meta">
              <span>${formatDate(video.date)}</span>
              <span>•</span>
              <span>${formatNumber(video.views)} visualizações</span>
            </div>
            ${badges ? `<div class="video-record-badges">${badges}</div>` : ''}
          </div>
        </a>
        ${state.isAdmin ? `
          <div class="video-card-admin">
            <button type="button" data-toggle-favorite="${video.id}" title="Favoritar">${video.favorite ? '★' : '☆'}</button>
            <button type="button" data-toggle-watched="${video.id}" title="Marcar como assistido">${video.watched ? '✓' : '○'}</button>
            <button type="button" data-edit-video="${video.id}">Editar</button>
            <button class="danger" type="button" data-delete-video="${video.id}">Excluir</button>
          </div>
        ` : ''}
      </article>
    `;
  }).join('') : '<div class="video-empty">Nenhum vídeo encontrado com esses filtros.</div>';

  elements.grid.querySelectorAll('[data-edit-video]').forEach(button => {
    button.addEventListener('click', () => openVideoForm(videos.find(video => video.id === button.dataset.editVideo)));
  });
  elements.grid.querySelectorAll('[data-delete-video]').forEach(button => {
    button.addEventListener('click', () => deleteVideo(button.dataset.deleteVideo));
  });
  elements.grid.querySelectorAll('[data-toggle-favorite]').forEach(button => {
    button.addEventListener('click', () => toggleVideoField(button.dataset.toggleFavorite, 'favorite'));
  });
  elements.grid.querySelectorAll('[data-toggle-watched]').forEach(button => {
    button.addEventListener('click', () => toggleVideoField(button.dataset.toggleWatched, 'watched'));
  });
}

function renderAll() {
  renderChannels();
  renderVideos();
  updateAuthInterface();
}

function requireAdmin() {
  if (!state.isAdmin || !state.db || !state.sdk) {
    throw new Error('Entre com a conta Google administradora antes de alterar os dados.');
  }
}

async function enrichYoutubeForm(form) {
  const urlInput = form.elements.url;
  const id = parseYoutubeVideoId(urlInput.value);
  if (!id) return;

  const typeInput = form.elements.type;
  if (urlInput.value.includes('/shorts/')) typeInput.value = 'short';

  const feedback = form.querySelector('[data-youtube-feedback]');
  feedback.textContent = 'Buscando informações no YouTube...';

  try {
    const canonicalUrl = `https://www.youtube.com/watch?v=${id}`;
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`);
    if (!response.ok) throw new Error('Metadados indisponíveis');
    const metadata = await response.json();

    if (!form.elements.title.value.trim()) form.elements.title.value = metadata.title || '';
    form.elements.thumbnail.value = metadata.thumbnail_url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

    const matchingChannel = getChannels().find(channel => (
      channel.title?.toLowerCase() === metadata.author_name?.toLowerCase()
    ));
    if (matchingChannel) form.elements.channel.value = matchingChannel.key;

    feedback.textContent = `Vídeo identificado: ${metadata.title || id}`;
  } catch {
    feedback.textContent = 'O link foi identificado, mas título, duração e data precisam ser conferidos manualmente.';
  }
}

function openVideoForm(video = null) {
  const channels = getChannels();
  const categories = getTaxonomyValues('categories');
  const playlists = getTaxonomyValues('playlists');
  const today = new Date().toISOString().slice(0, 10);
  const data = video || {
    type: 'long',
    channel: channels[0]?.key || '',
    date: today,
    duration: '',
    views: 0,
    category: '',
    playlist: '',
    tags: [],
    notes: '',
    favorite: false,
    watched: false
  };

  openModal(`
    <span class="eyebrow">Administração</span>
    <h2>${video ? 'Editar vídeo' : 'Adicionar vídeo'}</h2>
    <form id="videoCrudForm" class="crud-form">
      <label class="crud-field full">Link do YouTube
        <input name="url" type="url" required placeholder="https://youtu.be/..." value="${escapeHtml(video ? getVideoUrl(data) : '')}">
      </label>
      <div class="crud-feedback" data-youtube-feedback>Ao colar o link, o portal tenta preencher o título e a miniatura automaticamente.</div>
      <label class="crud-field full">Título
        <input name="title" required value="${escapeHtml(data.title || '')}">
      </label>
      <label class="crud-field">Canal
        <select name="channel" required>${channels.map(channel => (
          `<option value="${escapeHtml(channel.key)}" ${channel.key === data.channel ? 'selected' : ''}>${escapeHtml(channel.title)}</option>`
        )).join('')}</select>
      </label>
      <label class="crud-field">Tipo
        <select name="type"><option value="long" ${data.type === 'long' ? 'selected' : ''}>Vídeo completo</option><option value="short" ${data.type === 'short' ? 'selected' : ''}>Short</option></select>
      </label>
      <label class="crud-field">Data de publicação
        <input name="date" type="date" value="${escapeHtml(data.date || today)}">
      </label>
      <label class="crud-field">Duração
        <input name="duration" placeholder="12:34" value="${escapeHtml(data.duration || '')}">
      </label>
      <label class="crud-field">Visualizações
        <input name="views" type="number" min="0" value="${Number(data.views || 0)}">
      </label>
      <label class="crud-field">Categoria
        <input name="category" list="videoCategoryOptions" value="${escapeHtml(data.category || '')}">
        <datalist id="videoCategoryOptions">${categories.map(name => `<option value="${escapeHtml(name)}">`).join('')}</datalist>
      </label>
      <label class="crud-field">Playlist
        <input name="playlist" list="videoPlaylistOptions" value="${escapeHtml(data.playlist || '')}">
        <datalist id="videoPlaylistOptions">${playlists.map(name => `<option value="${escapeHtml(name)}">`).join('')}</datalist>
      </label>
      <label class="crud-field full">Tags separadas por vírgula
        <input name="tags" value="${escapeHtml((data.tags || []).join(', '))}">
      </label>
      <label class="crud-field full">Observações
        <textarea name="notes" rows="4">${escapeHtml(data.notes || '')}</textarea>
      </label>
      <input name="thumbnail" type="hidden" value="${escapeHtml(data.thumbnail || '')}">
      <label class="crud-check"><input name="favorite" type="checkbox" ${data.favorite ? 'checked' : ''}> Favorito</label>
      <label class="crud-check"><input name="watched" type="checkbox" ${data.watched ? 'checked' : ''}> Assistido</label>
      <div class="crud-actions full">
        <button class="ghost" type="button" data-video-modal-close-alt>Cancelar</button>
        <button class="primary" type="submit">Salvar vídeo</button>
      </div>
    </form>
  `);

  const form = document.querySelector('#videoCrudForm');
  form.elements.url.addEventListener('change', () => enrichYoutubeForm(form));
  form.elements.url.addEventListener('paste', () => setTimeout(() => enrichYoutubeForm(form), 0));
  form.querySelector('[data-video-modal-close-alt]').addEventListener('click', closeModal);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;

    try {
      requireAdmin();
      const values = new FormData(form);
      const id = parseYoutubeVideoId(values.get('url'));
      if (!id) throw new Error('O link informado não contém um ID válido do YouTube.');

      const payload = {
        id,
        url: getVideoUrl({ id, type: values.get('type'), url: values.get('url') }),
        title: String(values.get('title') || '').trim(),
        channel: String(values.get('channel') || ''),
        type: values.get('type') === 'short' ? 'short' : 'long',
        date: String(values.get('date') || ''),
        duration: String(values.get('duration') || '').trim() || '—',
        views: Number(values.get('views') || 0),
        category: String(values.get('category') || '').trim(),
        playlist: String(values.get('playlist') || '').trim(),
        tags: String(values.get('tags') || '').split(',').map(tag => tag.trim()).filter(Boolean),
        notes: String(values.get('notes') || '').trim(),
        thumbnail: String(values.get('thumbnail') || '').trim() || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        favorite: form.elements.favorite.checked,
        watched: form.elements.watched.checked,
        deleted: false,
        updatedAt: state.sdk.serverTimestamp()
      };

      if (!video) payload.createdAt = state.sdk.serverTimestamp();
      await state.sdk.setDoc(state.sdk.doc(state.db, 'videos', id), payload, { merge: true });

      if (video && video.id !== id) {
        await state.sdk.setDoc(state.sdk.doc(state.db, 'videos', video.id), {
          id: video.id,
          deleted: true,
          updatedAt: state.sdk.serverTimestamp()
        }, { merge: true });
      }

      closeModal();
    } catch (error) {
      alert(error.message || 'Não foi possível salvar o vídeo.');
    } finally {
      submit.disabled = false;
    }
  });
}

function openChannelForm(channel = null) {
  const data = channel || { key: '', title: '', handle: '', url: '', thumbnail: '' };

  openModal(`
    <span class="eyebrow">Administração</span>
    <h2>${channel ? 'Editar canal' : 'Adicionar canal'}</h2>
    <form id="channelCrudForm" class="crud-form">
      <label class="crud-field full">Nome do canal
        <input name="title" required value="${escapeHtml(data.title)}">
      </label>
      <label class="crud-field">Identificador interno
        <input name="key" required ${channel ? 'readonly' : ''} placeholder="maestros-da-ia" value="${escapeHtml(data.key)}">
      </label>
      <label class="crud-field">Handle
        <input name="handle" placeholder="@canal" value="${escapeHtml(data.handle || '')}">
      </label>
      <label class="crud-field full">Link do canal
        <input name="url" type="url" required value="${escapeHtml(data.url || '')}">
      </label>
      <label class="crud-field full">URL da imagem do canal
        <input name="thumbnail" type="url" value="${escapeHtml(data.thumbnail || '')}">
      </label>
      <div class="crud-actions full">
        <button class="ghost" type="button" data-video-modal-close-alt>Cancelar</button>
        <button class="primary" type="submit">Salvar canal</button>
      </div>
    </form>
  `);

  const form = document.querySelector('#channelCrudForm');
  const titleInput = form.elements.title;
  const keyInput = form.elements.key;

  if (!channel) {
    titleInput.addEventListener('input', () => {
      if (!keyInput.dataset.manual) keyInput.value = slugify(titleInput.value);
    });
    keyInput.addEventListener('input', () => { keyInput.dataset.manual = 'true'; });
  }

  form.querySelector('[data-video-modal-close-alt]').addEventListener('click', closeModal);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;

    try {
      requireAdmin();
      const values = new FormData(form);
      const key = slugify(values.get('key'));
      if (!key) throw new Error('Informe um identificador válido para o canal.');

      await state.sdk.setDoc(state.sdk.doc(state.db, 'channels', key), {
        key,
        title: String(values.get('title') || '').trim(),
        handle: String(values.get('handle') || '').trim(),
        url: String(values.get('url') || '').trim(),
        thumbnail: String(values.get('thumbnail') || '').trim(),
        deleted: false,
        updatedAt: state.sdk.serverTimestamp()
      }, { merge: true });
      closeModal();
    } catch (error) {
      alert(error.message || 'Não foi possível salvar o canal.');
    } finally {
      submit.disabled = false;
    }
  });
}

async function deleteVideo(id) {
  const video = getVideos().find(item => item.id === id);
  if (!video || !confirm(`Excluir o vídeo “${video.title}”?`)) return;

  try {
    requireAdmin();
    if (state.firestoreOnly || !staticVideoIds.has(id)) {
      await state.sdk.deleteDoc(state.sdk.doc(state.db, 'videos', id));
    } else {
      await state.sdk.setDoc(state.sdk.doc(state.db, 'videos', id), {
        id,
        deleted: true,
        updatedAt: state.sdk.serverTimestamp()
      }, { merge: true });
    }
  } catch (error) {
    alert(error.message || 'Não foi possível excluir o vídeo.');
  }
}

async function deleteChannel(key) {
  const channel = getChannels().find(item => item.key === key);
  if (!channel) return;
  const usedBy = getVideos().filter(video => video.channel === key).length;
  if (usedBy) {
    alert(`Esse canal ainda está associado a ${usedBy} vídeo(s). Mova ou exclua esses vídeos primeiro.`);
    return;
  }
  if (!confirm(`Excluir o canal “${channel.title}”?`)) return;

  try {
    requireAdmin();
    if (state.firestoreOnly || !staticChannelIds.has(key)) {
      await state.sdk.deleteDoc(state.sdk.doc(state.db, 'channels', key));
    } else {
      await state.sdk.setDoc(state.sdk.doc(state.db, 'channels', key), {
        key,
        deleted: true,
        updatedAt: state.sdk.serverTimestamp()
      }, { merge: true });
    }
  } catch (error) {
    alert(error.message || 'Não foi possível excluir o canal.');
  }
}

async function toggleVideoField(id, field) {
  const video = getVideos().find(item => item.id === id);
  if (!video) return;

  try {
    requireAdmin();
    await state.sdk.setDoc(state.sdk.doc(state.db, 'videos', id), {
      id,
      [field]: !video[field],
      updatedAt: state.sdk.serverTimestamp()
    }, { merge: true });
  } catch (error) {
    alert(error.message || 'Não foi possível atualizar o vídeo.');
  }
}

function openTaxonomyManager(kind) {
  const collectionName = kind === 'categories' ? 'categories' : 'playlists';
  const singular = kind === 'categories' ? 'categoria' : 'playlist';
  const title = kind === 'categories' ? 'Categorias' : 'Playlists';
  const items = state[kind].filter(item => !item.deleted).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  openModal(`
    <span class="eyebrow">Administração</span>
    <h2>${title}</h2>
    <form id="taxonomyCreateForm" class="taxonomy-create">
      <input name="name" required placeholder="Nova ${singular}">
      <button class="primary" type="submit">Adicionar</button>
    </form>
    <div class="taxonomy-list">
      ${items.length ? items.map(item => `
        <div class="taxonomy-item">
          <span>${escapeHtml(item.name)}</span>
          <div>
            <button class="mini-action" type="button" data-taxonomy-edit="${escapeHtml(item.id)}">Editar</button>
            <button class="mini-action danger" type="button" data-taxonomy-delete="${escapeHtml(item.id)}">Excluir</button>
          </div>
        </div>
      `).join('') : `<p class="crud-empty">Nenhuma ${singular} cadastrada.</p>`}
    </div>
  `);

  document.querySelector('#taxonomyCreateForm').addEventListener('submit', async event => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get('name') || '').trim();
    if (!name) return;
    try {
      requireAdmin();
      const id = slugify(name);
      await state.sdk.setDoc(state.sdk.doc(state.db, collectionName, id), {
        id,
        name,
        deleted: false,
        updatedAt: state.sdk.serverTimestamp()
      }, { merge: true });
      closeModal();
    } catch (error) {
      alert(error.message || `Não foi possível adicionar a ${singular}.`);
    }
  });

  elements.modal.querySelectorAll('[data-taxonomy-edit]').forEach(button => {
    button.addEventListener('click', async () => {
      const item = items.find(candidate => candidate.id === button.dataset.taxonomyEdit);
      const newName = prompt(`Novo nome da ${singular}:`, item?.name || '');
      if (!newName?.trim()) return;
      try {
        requireAdmin();
        await state.sdk.setDoc(state.sdk.doc(state.db, collectionName, item.id), {
          name: newName.trim(),
          updatedAt: state.sdk.serverTimestamp()
        }, { merge: true });
        closeModal();
      } catch (error) {
        alert(error.message || `Não foi possível editar a ${singular}.`);
      }
    });
  });

  elements.modal.querySelectorAll('[data-taxonomy-delete]').forEach(button => {
    button.addEventListener('click', async () => {
      const item = items.find(candidate => candidate.id === button.dataset.taxonomyDelete);
      if (!item || !confirm(`Excluir “${item.name}”? Os vídeos existentes não serão alterados.`)) return;
      try {
        requireAdmin();
        await state.sdk.deleteDoc(state.sdk.doc(state.db, collectionName, item.id));
        closeModal();
      } catch (error) {
        alert(error.message || `Não foi possível excluir a ${singular}.`);
      }
    });
  });
}

async function migrateStaticData() {
  if (!confirm(`Migrar ${staticVideos.length} vídeos e ${staticChannels.length} canais para o Firestore?`)) return;

  try {
    requireAdmin();
    elements.migrate.disabled = true;
    elements.migrate.textContent = 'Migrando...';

    const operations = [
      ...staticChannels.map(channel => ({ collection: 'channels', id: channel.key, data: { ...channel, deleted: false } })),
      ...staticVideos.map(video => ({ collection: 'videos', id: video.id, data: { ...video, deleted: false } }))
    ];

    for (let index = 0; index < operations.length; index += 400) {
      const batch = state.sdk.writeBatch(state.db);
      operations.slice(index, index + 400).forEach(operation => {
        batch.set(state.sdk.doc(state.db, operation.collection, operation.id), {
          ...operation.data,
          updatedAt: state.sdk.serverTimestamp()
        }, { merge: true });
      });
      await batch.commit();
    }

    await state.sdk.setDoc(state.sdk.doc(state.db, 'settings', 'library'), {
      useFirestoreOnly: true,
      migratedAt: state.sdk.serverTimestamp(),
      migratedVideos: staticVideos.length,
      migratedChannels: staticChannels.length
    }, { merge: true });

    alert('Migração concluída. O Firestore agora é a fonte principal da biblioteca.');
  } catch (error) {
    alert(error.message || 'Não foi possível concluir a migração.');
    elements.migrate.disabled = false;
    elements.migrate.textContent = 'Migrar dados atuais';
  }
}

function openFirebaseSetup() {
  openModal(`
    <span class="eyebrow">Configuração necessária</span>
    <h2>Conectar o Firebase</h2>
    <div class="firebase-setup-copy">
      <p>O CRUD já está instalado no site, mas o projeto Firebase precisa ser criado na sua conta Google.</p>
      <ol>
        <li>Crie um projeto no Firebase Console e registre um aplicativo Web.</li>
        <li>Ative Authentication com o provedor Google.</li>
        <li>Crie o Firestore em modo de produção.</li>
        <li>Cole o objeto de configuração em <code>firebase-config.js</code>.</li>
        <li>Adicione seu UID em <code>adminUids</code> e em <code>firestore.rules</code>.</li>
      </ol>
      <p>As instruções completas estão no arquivo <code>SETUP_FIREBASE.md</code> do repositório.</p>
    </div>
  `);
}

async function handleLogin() {
  if (!state.firebaseConfigured) {
    openFirebaseSetup();
    return;
  }

  try {
    if (state.user) {
      await state.sdk.signOut(state.auth);
    } else {
      await state.sdk.signInWithPopup(state.auth, state.provider);
    }
  } catch (error) {
    alert(error.message || 'Não foi possível autenticar com o Google.');
  }
}

function listenToCollection(collectionName, stateKey, mapDocument) {
  return state.sdk.onSnapshot(
    state.sdk.collection(state.db, collectionName),
    snapshot => {
      state[stateKey] = snapshot.docs.map(document => mapDocument(document.id, document.data()));
      renderAll();
    },
    error => setStatus(`Falha ao ler ${collectionName}: ${error.message}`, 'error')
  );
}

async function connectFirebase() {
  if (!state.firebaseConfigured) {
    renderAll();
    return;
  }

  try {
    const version = '12.16.0';
    const [appModule, authModule, firestoreModule] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore.js`)
    ]);

    const app = appModule.initializeApp(firebaseSettings.firebaseConfig);
    state.auth = authModule.getAuth(app);
    state.db = firestoreModule.getFirestore(app);
    state.provider = new authModule.GoogleAuthProvider();
    state.provider.setCustomParameters({ prompt: 'select_account' });
    state.sdk = { ...authModule, ...firestoreModule };
    state.firebaseConnected = true;

    authModule.onAuthStateChanged(state.auth, user => {
      state.user = user;
      state.isAdmin = Boolean(user && (
        (firebaseSettings.adminUids || []).includes(user.uid)
        || (firebaseSettings.adminEmails || []).map(email => email.toLowerCase()).includes(String(user.email || '').toLowerCase())
      ));
      renderAll();
    });

    listenToCollection('channels', 'remoteChannels', (id, data) => ({ key: data.key || id, ...data }));
    listenToCollection('videos', 'remoteVideos', (id, data) => ({ id, ...data }));
    listenToCollection('categories', 'categories', (id, data) => ({ id, ...data }));
    listenToCollection('playlists', 'playlists', (id, data) => ({ id, ...data }));

    firestoreModule.onSnapshot(
      firestoreModule.doc(state.db, 'settings', 'library'),
      snapshot => {
        state.firestoreOnly = Boolean(snapshot.exists() && snapshot.data().useFirestoreOnly);
        renderAll();
      },
      error => setStatus(`Falha ao ler as configurações da biblioteca: ${error.message}`, 'error')
    );
  } catch (error) {
    state.firebaseConnected = false;
    setStatus(`Não foi possível conectar ao Firebase: ${error.message}`, 'error');
    renderAll();
  }
}

elements.search.addEventListener('input', renderVideos);
elements.channel.addEventListener('change', renderVideos);
elements.category.addEventListener('change', renderVideos);
elements.playlist.addEventListener('change', renderVideos);
elements.login.addEventListener('click', handleLogin);
elements.addVideo.addEventListener('click', () => openVideoForm());
elements.addChannel.addEventListener('click', () => openChannelForm());
elements.manageCategories.addEventListener('click', () => openTaxonomyManager('categories'));
elements.managePlaylists.addEventListener('click', () => openTaxonomyManager('playlists'));
elements.migrate.addEventListener('click', migrateStaticData);

document.querySelectorAll('[data-video-filter]').forEach(button => {
  button.addEventListener('click', () => {
    state.activeType = button.dataset.videoFilter;
    document.querySelectorAll('[data-video-filter]').forEach(item => item.classList.toggle('active', item === button));
    renderVideos();
  });
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeModal();
});

renderAll();
connectFirebase();
