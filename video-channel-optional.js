(() => {
  function makeChannelOptional() {
    const form = document.querySelector('#videoCrudForm');
    if (!form || form.dataset.channelOptionalApplied === 'true') return;

    const channelSelect = form.elements.channel;
    if (!(channelSelect instanceof HTMLSelectElement)) return;

    form.dataset.channelOptionalApplied = 'true';
    channelSelect.required = false;

    if (![...channelSelect.options].some(option => option.value === '')) {
      channelSelect.insertAdjacentHTML('afterbegin', '<option value="">Sem canal cadastrado</option>');
    }

    const title = document.querySelector('#modal h2')?.textContent?.trim();
    if (title === 'Adicionar vídeo') channelSelect.value = '';

    const label = channelSelect.closest('label');
    if (label && !label.querySelector('.crud-field-hint')) {
      label.insertAdjacentHTML('beforeend', '<small class="crud-field-hint">Opcional. Use “Sem canal cadastrado” quando o canal ainda não estiver na biblioteca.</small>');
    }
  }

  const observer = new MutationObserver(makeChannelOptional);
  observer.observe(document.body, { childList: true, subtree: true });
  makeChannelOptional();
})();
