import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFirestore, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const config = window.ESTUDOS_IA_FIREBASE?.firebaseConfig;
const adminUids = window.ESTUDOS_IA_FIREBASE?.adminUids || [];
const button = document.querySelector('#addChannelButton');
const modal = document.querySelector('#modal');
const backdrop = document.querySelector('#modalBackdrop');

if (config && button && modal && backdrop) {
  const app = getApps()[0] || initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const slugify = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

  const escapeHtml = value => String(value || '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);

  function parseChannelUrl(rawUrl) {
    const url = new URL(String(rawUrl || '').trim());
    const host = url.hostname.replace(/^www\./, '');
    if (!host.endsWith('youtube.com')) throw new Error('Informe um link válido de canal do YouTube.');

    const parts = url.pathname.split('/').filter(Boolean);
    if (!parts.length) throw new Error('Não foi possível identificar o canal nesse link.');

    let handle = '';
    let identifier = '';

    if (parts[0].startsWith('@')) {
      handle = parts[0];
      identifier = parts[0].slice(1);
    } else if (['channel', 'c', 'user'].includes(parts[0]) && parts[1]) {
      identifier = parts[1];
      handle = parts[0] === 'channel' ? '' : `@${parts[1]}`;
    } else {
      identifier = parts[0];
      handle = parts[0].startsWith('@') ? parts[0] : `@${parts[0]}`;
    }

    const title = identifier.replace(/[-_]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
    return {
      key: slugify(identifier || handle),
      title: title || handle || 'Canal do YouTube',
      handle,
      url: url.origin + url.pathname,
      thumbnail: 'https://www.gstatic.com/youtube/img/branding/youtubelogo/svg/youtubelogo.svg'
    };
  }

  function closeModal() {
    backdrop.classList.remove('open');
  }

  function openSimpleChannelForm() {
    if (!auth.currentUser || !adminUids.includes(auth.currentUser.uid)) {
      alert('Entre com a conta administradora antes de cadastrar um canal.');
      return;
    }

    modal.innerHTML = `
      <button class="modal-close" type="button" data-close-channel>✕</button>
      <span class="eyebrow">Administração</span>
      <h2>Adicionar canal</h2>
      <form id="simpleChannelForm" class="crud-form">
        <label class="crud-field full">Link do canal no YouTube
          <input name="url" type="url" required placeholder="https://www.youtube.com/@canal">
        </label>
        <div class="crud-feedback">O portal identifica o handle e cria o cadastro automaticamente. Nenhum outro campo é obrigatório.</div>
        <div class="crud-actions full">
          <button class="ghost" type="button" data-close-channel>Cancelar</button>
          <button class="primary" type="submit">Adicionar canal</button>
        </div>
      </form>`;
    backdrop.classList.add('open');

    modal.querySelectorAll('[data-close-channel]').forEach(element => element.addEventListener('click', closeModal));
    modal.querySelector('#simpleChannelForm').addEventListener('submit', async event => {
      event.preventDefault();
      const submit = event.currentTarget.querySelector('[type="submit"]');
      submit.disabled = true;
      try {
        const channel = parseChannelUrl(new FormData(event.currentTarget).get('url'));
        await setDoc(doc(db, 'channels', channel.key), {
          ...channel,
          deleted: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
        closeModal();
      } catch (error) {
        alert(error.message || 'Não foi possível cadastrar o canal.');
      } finally {
        submit.disabled = false;
      }
    });
  }

  const replacement = button.cloneNode(true);
  button.replaceWith(replacement);
  replacement.addEventListener('click', openSimpleChannelForm);
}
