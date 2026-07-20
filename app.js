const DB=window.PORTAL_DATA;
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const favs=new Set(JSON.parse(localStorage.getItem('ia-favoritos')||'[]'));
let favoriteOnly=false;

const TOOL_LINKS={
  'ChatGPT':'https://chatgpt.com/',
  'Claude':'https://claude.ai/',
  'Gemini':'https://gemini.google.com/',
  'OpenAI API':'https://platform.openai.com/docs/',
  'OpenRouter':'https://openrouter.ai/',
  'Codex':'https://openai.com/codex/',
  'Claude Code':'https://docs.anthropic.com/en/docs/claude-code/overview',
  'GitHub Copilot':'https://github.com/features/copilot',
  'Cursor':'https://www.cursor.com/',
  'Windsurf':'https://windsurf.com/',
  'Lovable':'https://lovable.dev/',
  'v0':'https://v0.dev/',
  'Bolt.new':'https://bolt.new/',
  'Replit Agent':'https://replit.com/ai',
  'n8n':'https://n8n.io/',
  'Make.com':'https://www.make.com/',
  'Z-API':'https://www.z-api.io/',
  'ManyChat':'https://manychat.com/',
  'Dify':'https://dify.ai/',
  'Flowise':'https://flowiseai.com/',
  'Langflow':'https://www.langflow.org/',
  'OpenClaw':'https://github.com/openclaw/openclaw',
  'Hermes Agent':'https://github.com/NousResearch/hermes-agent',
  'ChatGPT Images':'https://chatgpt.com/',
  'Recraft':'https://www.recraft.ai/',
  'Midjourney':'https://www.midjourney.com/',
  'FLUX':'https://blackforestlabs.ai/',
  'Ideogram':'https://ideogram.ai/',
  'HeyGen':'https://www.heygen.com/',
  'Google Veo':'https://deepmind.google/models/veo/',
  'Google Flow':'https://labs.google/fx/tools/flow/',
  'Runway':'https://runwayml.com/',
  'Kling AI':'https://klingai.com/',
  'Higgsfield AI':'https://higgsfield.ai/',
  'ElevenLabs':'https://elevenlabs.io/',
  'Ollama':'https://ollama.com/',
  'Open WebUI':'https://openwebui.com/',
  'LM Studio':'https://lmstudio.ai/',
  'Hindsight':'https://github.com/vectorize-io/hindsight',
  'Qdrant':'https://qdrant.tech/',
  'ChromaDB':'https://www.trychroma.com/',
  'Milvus':'https://milvus.io/',
  'vidIQ':'https://vidiq.com/'
};

const TRACK_GUIDES={
  'Agentes de IA':{
    objective:'Aprender a projetar agentes que usem modelos, memória e ferramentas com supervisão, segurança e critérios claros de conclusão.',
    tools:['ChatGPT','Claude','Gemini','OpenRouter','Dify','Flowise','Langflow','Hermes Agent','OpenClaw'],
    topics:['Arquitetura de agentes','Tool calling','Planejamento e execução','Guardrails','Avaliação','Observabilidade','Supervisão humana'],
    steps:['Entender a diferença entre chatbot, workflow e agente.','Criar um agente simples com apenas uma ferramenta.','Adicionar memória ou RAG somente quando houver necessidade comprovada.','Implementar limites, logs, tratamento de erros e escalonamento humano.','Testar com casos normais, ambíguos e adversariais.']
  },
  'RAG e memória':{
    objective:'Construir bases de conhecimento que recuperem contexto relevante sem inundar o modelo com informações inúteis ou antigas.',
    tools:['Hindsight','Qdrant','ChromaDB','Milvus','Dify','Flowise','Langflow'],
    topics:['Chunking','Embeddings','Metadados','Busca híbrida','Re-ranking','Retenção','Avaliação de recuperação'],
    steps:['Selecionar documentos confiáveis e definir quem pode atualizá-los.','Testar estratégias de divisão e metadados.','Comparar busca vetorial, textual e híbrida.','Medir se o trecho correto foi recuperado antes de avaliar a resposta da IA.','Criar políticas para atualização, exclusão e consolidação de memórias.']
  },
  'Modelos locais':{
    objective:'Executar modelos localmente avaliando privacidade, custo, qualidade, velocidade e capacidade real do hardware.',
    tools:['Ollama','Open WebUI','LM Studio'],
    topics:['Quantização','VRAM e RAM','Contexto','Embeddings locais','Benchmark','API compatível','Segurança'],
    steps:['Mapear CPU, RAM e GPU disponíveis.','Começar com um modelo pequeno e uma tarefa objetiva.','Medir latência, consumo e qualidade com os mesmos testes.','Separar modelos de chat, código e embeddings.','Publicar a API apenas com autenticação e controle de rede.']
  },
  'Automação com IA':{
    objective:'Conectar sistemas, modelos e canais de comunicação por fluxos controlados, observáveis e recuperáveis.',
    tools:['n8n','Make.com','ManyChat','Z-API','OpenRouter','Dify','Flowise','Langflow'],
    topics:['Webhooks','APIs','Credenciais','Filas','Retries','Idempotência','Logs','Custos por execução'],
    steps:['Começar com um fluxo pequeno, como receber um webhook e registrar os dados.','Adicionar autenticação, validação e tratamento de erro.','Integrar uma IA somente onde decisão ou interpretação forem necessárias.','Criar logs, alertas e uma fila para falhas.','Comparar n8n self-hosted com Make.com e ManyChat conforme custo, controle e canal.']
  },
  'IA multimodal':{
    objective:'Combinar texto, imagem, voz e vídeo em uma esteira coerente, mantendo revisão humana e consistência de marca.',
    tools:['ChatGPT Images','Recraft','Midjourney','FLUX','Ideogram','HeyGen','Google Veo','Google Flow','Runway','Kling AI','Higgsfield AI','ElevenLabs'],
    topics:['Roteiro','Direção visual','Consistência','Voz','Direitos de uso','Revisão','Pipeline'],
    steps:['Definir público, objetivo e formato final.','Criar roteiro e identidade visual antes da geração.','Produzir cada mídia separadamente e validar qualidade.','Integrar voz, imagem e vídeo em uma etapa controlada.','Revisar direitos, informações falsas, aparência artificial e consistência.']
  }
};

const labels={
  inicio:['Base de conhecimento','Painel de IA'],
  ferramentas:['Glossário prático','Ferramentas de IA'],
  videos:['Aprendizado em vídeo','Vídeos'],
  ideias:['Produtos e experimentos','Ideias'],
  estudos:['Aprendizado organizado','Estudos'],
  prompts:['Engenharia de contexto','Prompts']
};

function initials(n){return n.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()}
function badgeClass(s){return s==='Utilizamos'?'used':s==='Em teste'?'test':s==='Estudar'?'study':'recommended'}
function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}

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
  $('#tools').innerHTML=list.length?list.map(t=>`<article class="tool-card" data-tool-card="${encodeURIComponent(t.n)}" tabindex="0" role="button" aria-label="Ver detalhes de ${escapeHtml(t.n)}"><div class="tool-head"><div class="tool-icon">${initials(t.n)}</div><button class="favorite ${favs.has(t.n)?'active':''}" data-fav="${encodeURIComponent(t.n)}" aria-label="Favoritar ${escapeHtml(t.n)}">★</button></div><h3>${escapeHtml(t.n)}</h3><div class="category-label">${escapeHtml(t.c)}</div><p>${escapeHtml(t.d)}</p><div class="badges">${t.s.map(s=>`<span class="badge ${badgeClass(s)}">${escapeHtml(s)}</span>`).join('')}</div><button class="details" data-detail="${encodeURIComponent(t.n)}">Ver detalhes →</button></article>`).join(''):'<div class="empty">Nenhuma ferramenta encontrada com esses filtros.</div>';
  $$('[data-fav]').forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    const n=decodeURIComponent(b.dataset.fav);
    favs.has(n)?favs.delete(n):favs.add(n);
    localStorage.setItem('ia-favoritos',JSON.stringify([...favs]));
    renderTools();
  });
  $$('[data-detail]').forEach(b=>b.onclick=e=>{e.stopPropagation();openModal(decodeURIComponent(b.dataset.detail))});
  $$('[data-tool-card]').forEach(card=>{
    const open=()=>openModal(decodeURIComponent(card.dataset.toolCard));
    card.onclick=open;
    card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}};
  });
}

function toolLinkButton(name,label='Acessar ferramenta ↗'){
  const url=TOOL_LINKS[name];
  return url?`<a class="external-link" href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`:'';
}

function openModal(name){
  const t=DB.tools.find(x=>x.n===name);
  if(!t)return;
  $('#modal').innerHTML=`<button id="closeModal" class="modal-close">✕</button><div class="tool-icon">${initials(t.n)}</div><h2>${escapeHtml(t.n)}</h2><div class="category-label">${escapeHtml(t.c)}</div><div class="badges" style="margin:14px 0 18px">${t.s.map(s=>`<span class="badge ${badgeClass(s)}">${escapeHtml(s)}</span>`).join('')}</div>${toolLinkButton(t.n)}${[['O que é',t.d],['Para que serve',t.u],['Quando usar',t.w],['Pontos fortes',t.f],['Limitações',t.l],['Exemplos de uso',t.e]].map(([a,b])=>`<section class="detail"><strong>${a}</strong><p>${escapeHtml(b)}</p></section>`).join('')}`;
  $('#modalBackdrop').classList.add('open');
  $('#closeModal').onclick=closeModal;
}

function openTrackModal(title){
  const track=DB.tracks.find(item=>item.t===title);
  const guide=TRACK_GUIDES[title];
  if(!track||!guide)return;
  const availableTools=guide.tools.map(name=>DB.tools.find(tool=>tool.n===name)).filter(Boolean);
  $('#modal').innerHTML=`<button id="closeModal" class="modal-close">✕</button><span class="eyebrow">Trilha de estudo</span><h2>${escapeHtml(track.t)}</h2><p class="track-intro">${escapeHtml(guide.objective)}</p><section class="detail"><strong>O que estudar</strong><div class="chips spacious">${guide.topics.map(topic=>`<span class="chip">${escapeHtml(topic)}</span>`).join('')}</div></section><section class="detail"><strong>Ferramentas relacionadas</strong><div class="related-tools">${availableTools.map(tool=>`<article class="related-tool"><div><b>${escapeHtml(tool.n)}</b><span>${escapeHtml(tool.d)}</span></div><div class="related-actions"><button data-related-tool="${encodeURIComponent(tool.n)}">Ver ficha</button>${TOOL_LINKS[tool.n]?`<a href="${TOOL_LINKS[tool.n]}" target="_blank" rel="noopener noreferrer">Site ↗</a>`:''}</div></article>`).join('')}</div></section><section class="detail"><strong>Sequência sugerida</strong><ol class="study-steps">${guide.steps.map(step=>`<li>${escapeHtml(step)}</li>`).join('')}</ol></section>`;
  $('#modalBackdrop').classList.add('open');
  $('#closeModal').onclick=closeModal;
  $$('[data-related-tool]').forEach(button=>button.onclick=()=>openModal(decodeURIComponent(button.dataset.relatedTool)));
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
  $('#tracks').innerHTML=DB.tracks.map(i=>{const guide=TRACK_GUIDES[i.t];const count=guide?guide.tools.filter(name=>DB.tools.some(tool=>tool.n===name)).length:0;return `<article class="content-card track-card" data-track="${encodeURIComponent(i.t)}" tabindex="0" role="button"><span class="eyebrow">Trilha</span><h3>${escapeHtml(i.t)}</h3><p>${escapeHtml(i.d)}</p><div class="chips">${i.tags.map(s=>`<span class="chip">${escapeHtml(s)}</span>`).join('')}</div><div class="track-footer"><span>${count} ferramentas relacionadas</span><button data-track-button="${encodeURIComponent(i.t)}">Abrir trilha →</button></div></article>`}).join('');
  $$('[data-track]').forEach(card=>{
    const open=()=>openTrackModal(decodeURIComponent(card.dataset.track));
    card.onclick=open;
    card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}};
  });
  $$('[data-track-button]').forEach(button=>button.onclick=e=>{e.stopPropagation();openTrackModal(decodeURIComponent(button.dataset.trackButton))});
}

function generatePrompt(){
  const role=$('#promptRole')?.value.trim();
  const objective=$('#promptObjective')?.value.trim();
  const audience=$('#promptAudience')?.value.trim();
  const context=$('#promptContext')?.value.trim();
  const tasks=$('#promptTasks')?.value.trim();
  const relations=$('#promptRelations')?.value.trim();
  const limits=$('#promptLimits')?.value.trim();
  const sources=$('#promptSources')?.value.trim();
  const criteria=$('#promptCriteria')?.value.trim();
  const escalation=$('#promptEscalation')?.value.trim();
  const format=$('#promptFormat')?.value.trim();
  const tone=$('#promptTone')?.value.trim();
  const parts=[];

  if(role)parts.push(`Atue como ${role}.`);
  if(objective)parts.push(`\nObjetivo:\n${objective}`);
  if(audience)parts.push(`\nPúblico ou interessado:\n${audience}`);
  if(context)parts.push(`\nContexto:\n${context}`);
  if(tasks)parts.push(`\nTarefas e sequência:\n${tasks}`);
  if(relations)parts.push(`\nRelações e prioridades:\n${relations}`);
  if(limits)parts.push(`\nLimites e restrições:\n${limits}`);
  if(sources)parts.push(`\nFontes e dados permitidos:\n${sources}`);
  if(criteria)parts.push(`\nCritérios de qualidade e conclusão:\n${criteria}`);
  if(escalation)parts.push(`\nCondições de parada ou escalonamento:\n${escalation}`);
  if(format)parts.push(`\nFormato da resposta:\n${format}`);
  if(tone)parts.push(`\nTom e linguagem:\n${tone}`);
  parts.push('\nMantenha todas as decisões alinhadas ao objetivo, ao contexto, às prioridades e aos limites definidos. Não invente informações. Quando houver instruções conflitantes, dados ausentes ou risco relevante, sinalize isso claramente antes de prosseguir.');

  $('#promptOutput').value=parts.join('').trim();
}

$('#promptForm')?.addEventListener('submit',e=>{e.preventDefault();generatePrompt()});
$('#copyPrompt')?.addEventListener('click',async()=>{
  const output=$('#promptOutput');
  if(!output.value)generatePrompt();
  try{
    await navigator.clipboard.writeText(output.value);
    $('#copyPrompt').textContent='✓ Prompt copiado';
    setTimeout(()=>$('#copyPrompt').textContent='Copiar prompt',1800);
  }catch{
    output.select();
    document.execCommand('copy');
  }
});
$('#clearPrompt')?.addEventListener('click',()=>{
  $('#promptForm').reset();
  $('#promptOutput').value='';
});

renderStats();
renderNeeds();
populateCategories();
renderTools();
renderIdeas();
renderTracks();

const initialPage=location.hash.replace('#','');
if(labels[initialPage])setPage(initialPage);