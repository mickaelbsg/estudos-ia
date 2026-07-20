function simplifyVideoForm() {
  const form = document.querySelector('#videoCrudForm');
  if (!form || form.dataset.simplified === 'true') return;
  form.dataset.simplified = 'true';

  const hiddenFields = ['channel', 'type', 'date', 'views', 'playlist', 'notes'];
  hiddenFields.forEach(name => {
    const field = form.elements[name];
    if (!field) return;
    const wrapper = field.closest('label');
    if (wrapper) {
      wrapper.hidden = true;
      wrapper.style.display = 'none';
    }
  });

  if (form.elements.channel) {
    let genericOption = [...form.elements.channel.options].find(option => option.value === 'externo');
    if (!genericOption) {
      genericOption = new Option('Canal externo', 'externo', true, true);
      form.elements.channel.add(genericOption);
    }
    form.elements.channel.value = 'externo';
  }

  if (form.elements.type) form.elements.type.value = 'long';
  if (form.elements.date) form.elements.date.value = '';
  if (form.elements.views) form.elements.views.value = '0';
  if (form.elements.playlist) form.elements.playlist.value = '';
  if (form.elements.notes) form.elements.notes.value = '';

  const feedback = form.querySelector('[data-youtube-feedback]');
  if (feedback) feedback.textContent = 'Ao colar o link, o portal preenche o título e a miniatura automaticamente.';
}

const observer = new MutationObserver(() => simplifyVideoForm());
observer.observe(document.body, { childList: true, subtree: true });
document.addEventListener('click', event => {
  if (event.target.closest('#addVideoButton') || event.target.closest('[data-edit-video]')) {
    setTimeout(simplifyVideoForm, 0);
  }
});