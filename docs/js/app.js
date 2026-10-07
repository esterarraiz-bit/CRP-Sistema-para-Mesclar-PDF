import { MAX_FILES, MAX_BYTES, formatSize, outputName, moveItem } from './state.js';
const $ = id => document.getElementById(id);
const files = [];
let busy = false, worker, sequence = 0, resultUrl, dragId;
const pending = new Map();
function createWorker() {
  worker = new Worker(new URL('./pdf-worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
    const task = pending.get(data.id);
    if (!task) return;
    if (data.progress !== undefined) { task.progress?.(data.progress); return; }
    pending.delete(data.id);
    if (data.error) task.reject(new Error(data.error)); else task.resolve(data.result);
  };
  worker.onerror = () => {
    for (const task of pending.values()) task.reject(new Error('O processamento foi interrompido. Tente usar menos arquivos ou PDFs menores.'));
    pending.clear(); worker.terminate(); worker = undefined;
  };
}
function run(operation, selected, progress) {
  return new Promise((resolve, reject) => {
    if (!worker) createWorker();
    const id = ++sequence;
    pending.set(id, { resolve, reject, progress });
    worker.postMessage({ id, operation, files: selected });
  });
}
function message(text = '') { $('messages').textContent = text; $('messages').hidden = !text; }
function resetResult() {
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  resultUrl = undefined; $('success').hidden = true;
  $('download').removeAttribute('href'); $('progress').hidden = true; $('progress').value = 0;
}
function setBusy(value) { busy = value; document.body.classList.toggle('busy', value); render(); }
function button(text, title, action, disabled = false) {
  const el = document.createElement('button'); el.type = 'button'; el.className = 'icon-button';
  el.textContent = text; el.title = title; el.setAttribute('aria-label', title); el.disabled = busy || disabled; el.onclick = action;
  return el;
}
function reorder(from, to) {
  if (busy) throw new Error('Aguarde o processamento.');
  moveItem(files, from, to); resetResult(); render();
  $('status').textContent = 'Ordem atualizada. Pronto para mesclar.';
}
function render() {
  const totalPages = files.reduce((n, item) => n + item.pages, 0);
  $('count').textContent = files.length; $('total-files').textContent = files.length;
  $('total-pages').textContent = totalPages.toLocaleString('pt-BR');
  $('total-size').textContent = formatSize(files.reduce((n, item) => n + item.file.size, 0));
  $('empty').hidden = files.length > 0; $('drop-hint').hidden = !files.length;
  $('merge').disabled = busy || files.length < 2; $('clear').disabled = busy || !files.length;
  $('add').disabled = $('select').disabled = $('output-name').disabled = busy;
  $('order-help').textContent = files.length ? 'Arraste os cartões ou use os botões para ordenar.' : 'Você pode reorganizar os arquivos após adicionar.';
  if (!busy && !resultUrl) $('status').textContent = files.length < 2 ? 'Adicione pelo menos 2 PDFs.' : 'Tudo certo. Você já pode mesclar.';
  $('file-list').replaceChildren();
  files.forEach((item, index) => {
    const card = document.createElement('li'); card.className = 'file-card'; card.draggable = !busy; card.dataset.id = item.id;
    const number = document.createElement('span'); number.className = 'file-number'; number.textContent = String(index + 1).padStart(2, '0');
    const icon = document.createElement('span'); icon.className = 'pdf-icon'; icon.textContent = 'PDF'; icon.setAttribute('aria-hidden', 'true');
    const info = document.createElement('div'); info.className = 'file-info';
    const name = document.createElement('span'); name.className = 'file-title'; name.textContent = item.file.name;
    const meta = document.createElement('span'); meta.className = 'file-meta'; meta.textContent = `${item.pages} ${item.pages === 1 ? 'página' : 'páginas'} · ${formatSize(item.file.size)}`;
    info.append(name, meta);
    const actions = document.createElement('div'); actions.className = 'card-actions';
    const move = delta => { reorder(index, index + delta); const row = $('file-list').children[index + delta]; row.querySelector('.icon-button:not(:disabled)')?.focus(); };
    const remove = button('×', `Remover ${item.file.name}`, () => {
      if (busy) return;
      files.splice(index, 1); resetResult(); render();
      ($('file-list').children[Math.min(index, files.length - 1)]?.querySelector('.remove') || $('add')).focus();
    }); remove.classList.add('remove');
    actions.append(button('↑', `Mover ${item.file.name} para cima`, () => move(-1), index === 0), button('↓', `Mover ${item.file.name} para baixo`, () => move(1), index === files.length - 1), remove);
    card.append(number, icon, info, actions);
    card.addEventListener('dragstart', e => { if (busy) { e.preventDefault(); return; } dragId = item.id; e.dataTransfer.setData('text/plain', item.id); e.dataTransfer.effectAllowed = 'move'; card.classList.add('dragging'); });
    card.addEventListener('dragend', () => { dragId = undefined; card.classList.remove('dragging'); document.querySelectorAll('.drop-target').forEach(x => x.classList.remove('drop-target')); });
    card.addEventListener('dragover', e => { if (dragId && !busy) { e.preventDefault(); card.classList.add('drop-target'); } });
    card.addEventListener('dragleave', () => card.classList.remove('drop-target'));
    card.addEventListener('drop', e => { if (!dragId || busy) return; e.preventDefault(); e.stopPropagation(); const from = files.findIndex(f => f.id === dragId); dragId = undefined; if (from >= 0) reorder(from, index); });
    $('file-list').append(card);
  });
}
async function addFiles(selection) {
  if (busy) return;
  const incoming = Array.from(selection); if (!incoming.length) return;
  resetResult(); message(); setBusy(true);
  const errors = [];
  try {
    for (const file of incoming) {
      if (!/\.pdf$/i.test(file.name)) { errors.push(`${file.name}: selecione somente arquivos PDF.`); continue; }
      if (files.some(i => i.file.name === file.name && i.file.size === file.size && i.file.lastModified === file.lastModified)) { errors.push(`${file.name}: este arquivo já está na lista.`); continue; }
      if (files.length >= MAX_FILES) { errors.push('Limite de 50 arquivos atingido.'); break; }
      if (files.reduce((n, item) => n + item.file.size, 0) + file.size > MAX_BYTES) { errors.push(`${file.name}: o total ultrapassa 100 MB.`); continue; }
      $('status').textContent = `Conferindo ${file.name}…`;
      try { const { pages } = await run('inspect', [file]); files.push({ id: crypto.randomUUID(), file, pages }); render(); }
      catch (error) { errors.push(error.message); }
    }
  } finally { setBusy(false); message(errors.join('\n')); }
}
async function merge() {
  if (busy || files.length < 2) return;
  message(); resetResult(); setBusy(true); $('progress').hidden = false; $('status').textContent = 'Mesclando seus documentos…';
  try {
    const { bytes, pages } = await run('merge', files.map(i => i.file), value => { $('progress').value = value; });
    const blob = new Blob([bytes], { type: 'application/pdf' }); resultUrl = URL.createObjectURL(blob);
    $('download').href = resultUrl; $('download').download = outputName($('output-name').value);
    $('result-info').textContent = `${pages} páginas · ${formatSize(blob.size)}`;
    $('success').hidden = false; $('progress').value = 100; $('status').textContent = 'Mesclagem concluída.';
    $('download').focus();
  } catch (error) { message(error.message); $('progress').hidden = true; }
  finally { setBusy(false); }
}
$('add').onclick = $('select').onclick = () => { if (!busy) $('file-input').click(); };
$('file-input').onchange = e => { const selected = Array.from(e.target.files); e.target.value = ''; void addFiles(selected); };
$('clear').onclick = () => { if (busy) return; files.length = 0; resetResult(); message(); render(); $('select').focus(); };
$('merge').onclick = merge;
$('output-name').addEventListener('input', () => { if (resultUrl) $('download').download = outputName($('output-name').value); });
let enterDepth = 0;
const zone = $('dropzone');
zone.addEventListener('dragenter', e => { if (busy || dragId) return; e.preventDefault(); enterDepth++; zone.classList.add('drag-over'); });
zone.addEventListener('dragover', e => { e.preventDefault(); if (busy) e.dataTransfer.dropEffect = 'none'; });
zone.addEventListener('dragleave', () => { if (--enterDepth <= 0) { enterDepth = 0; zone.classList.remove('drag-over'); } });
zone.addEventListener('drop', e => { e.preventDefault(); enterDepth = 0; zone.classList.remove('drag-over'); if (!dragId && !busy) void addFiles(e.dataTransfer.files); });
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => e.preventDefault());
window.addEventListener('beforeunload', e => { if (busy) { e.preventDefault(); e.returnValue = ''; } });
render();

// Ferramentas opcionais para navegadores com WebMCP. Não acessam arquivos sem seleção do usuário.
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  const registrations = [{
    name: 'list_selected_pdfs', title: 'Consultar PDFs selecionados',
    description: 'Retorna nomes, identificadores, ordem e páginas dos PDFs já selecionados pelo usuário.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: () => ({ busy, files: files.map((i, index) => ({ id: i.id, name: i.file.name, pages: i.pages, position: index + 1 })) })
  }, {
    name: 'reorder_selected_pdfs', title: 'Organizar PDFs selecionados',
    description: 'Define a ordem dos PDFs já selecionados; não gera nem baixa o arquivo final.',
    inputSchema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } }, required: ['ids'], additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: input => {
      if (busy) throw new Error('Aguarde o processamento.');
      const ids = input?.ids;
      if (!Array.isArray(ids) || ids.length !== files.length || new Set(ids).size !== files.length || !ids.every(id => files.some(f => f.id === id))) throw new Error('Informe todos os IDs selecionados uma única vez.');
      const ordered = ids.map(id => files.find(f => f.id === id)); files.splice(0, files.length, ...ordered); resetResult(); render(); return { ids };
    }
  }];
  for (const tool of registrations) {
    try { Promise.resolve(document.modelContext.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Navegador sem suporte completo. */ }
  }
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
}
