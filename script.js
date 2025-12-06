// script.js — versão organizada com filtro de impressão/relatório
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const nowISO = () => new Date().toISOString();
const uid = () => Date.now().toString();

let cadastros = JSON.parse(localStorage.getItem('cadastros') || '[]');
let cameraStream = null;
let currentOperator = '';

/* UI refs */
const tabs = $$('nav button');
const sections = $$('.tab');
const form = $('#formCadastro');
const dataNascimentoInput = form ? form.elements['dataNascimento'] : null;
const idadeInput = form ? form.elements['idade'] : null;
const temAlergiaSelect = $('#temAlergia');
const alergiaLabel = $('#alergiaLabel');
const alturaSelect = $('#alturaSelect');
const saiSozinhoSelect = $('#saiSozinhoSelect');
const liveBadge = $('#liveBadge');
const qrDiv = $('#qrCodeCadastro');
const inputBusca = $('#inputBusca');
const listaBusca = $('#listaBusca');
const listaHistoricoContainer = $('#listaHistoricoContainer');
const btnStartCamera = $('#btnStartCamera');
const btnStopCamera = $('#btnStopCamera');
const btnScanNow = $('#btnScanNow');
const video = $('#video');
const canvas = $('#scanCanvas');
const scanMessage = $('#scanMessage');
const btnRegistrarManual = $('#btnRegistrarManual');
const btnGerarTodosQR = $('#btnGerarTodosQR');
const btnDownloadQR = $('#btnDownloadQR');
const btnPrintLabel = $('#btnPrintLabel');
const btnPrintLabelSmall = $('#btnPrintLabelSmall');
const btnImprimir = $('#btnImprimir');
const marketingList = $('#marketingList');
const btnSelectAll = $('#btnSelectAll');
const btnClearAll = $('#btnClearAll');
const btnSendToSelected = $('#btnSendToSelected');
const marketingMessage = $('#marketingMessage');
const marketingImage = $('#marketingImage');
const btnExportJSON = $('#btnExportJSON');
const btnLimparTudo = $('#btnLimparTudo');

/* Impressão refs */
const quickFilter = $('#quickFilter');
const filterFrom = $('#filterFrom');
const filterTo = $('#filterTo');
const btnFiltrar = $('#btnFiltrar');
const btnImprimirFiltro = $('#btnImprimirFiltro');
const relatorioPreview = $('#relatorioPreview');

/* Tabs */
tabs.forEach(t => t.addEventListener('click', () => {
  tabs.forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  sections.forEach(s => s.classList.remove('active'));
  const target = document.getElementById(t.dataset.tab);
  if (target) target.classList.add('active');
}));

/* Age calculation */
if (dataNascimentoInput && idadeInput) {
  dataNascimentoInput.addEventListener('change', () => {
    const v = dataNascimentoInput.value;
    if (!v) { idadeInput.value = ''; return; }
    const d = new Date(v);
    if (isNaN(d.getTime())) { idadeInput.value = ''; return; }
    idadeInput.value = calcularIdade(d);
  });
}
function calcularIdade(dob){
  const hoje = new Date();
  let idade = hoje.getFullYear() - dob.getFullYear();
  const m = hoje.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < dob.getDate())) idade--;
  return idade;
}

/* alergia toggle */
if (temAlergiaSelect) {
  temAlergiaSelect.addEventListener('change', () => {
    alergiaLabel.style.display = (temAlergiaSelect.value === 'sim') ? 'block' : 'none';
  });
}

/* live badge — atualiza no formulário quando altera altura/sai sozinho */
function updateLiveBadge(){
  const altura = (alturaSelect && alturaSelect.value) || 'menor';
  const saiSozinho = (saiSozinhoSelect && saiSozinhoSelect.value) || 'nao';
  if (saiSozinho === 'sim') {
    liveBadge.className = 'badge green';
    liveBadge.textContent = 'SAI SOZINHO';
  } else {
    if (altura === 'maior') {
      liveBadge.className = 'badge yellow';
      liveBadge.textContent = 'MAIOR > 1m (NÃO SAI)';
    } else {
      liveBadge.className = 'badge red';
      liveBadge.textContent = 'NÃO SAI SOZINHO';
    }
  }
}
if (alturaSelect) alturaSelect.addEventListener('change', updateLiveBadge);
if (saiSozinhoSelect) saiSozinhoSelect.addEventListener('change', updateLiveBadge);
updateLiveBadge();

/* persistence */
function saveCadastros(){ localStorage.setItem('cadastros', JSON.stringify(cadastros)); }

/* form submit */
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const nome = (form.elements['nome'].value || '').trim();
    const dataNascimento = form.elements['dataNascimento'].value;
    const idade = form.elements['idade'].value || calcularIdade(new Date(dataNascimento));
    const responsavel = (form.elements['responsavel'].value || '').trim();
    const telefone = (form.elements['telefone'].value || '').trim();
    const email = (form.elements['email'].value || '').trim();
    const setor = (form.elements['setor'].value || '').trim();
    const mesa = (form.elements['mesa'].value || '').trim();
    const temAlergia = (form.elements['temAlergia'].value || 'nao');
    const qualAlergia = (form.elements['qualAlergia'].value || '').trim();
    const altura = (form.elements['altura'].value || 'menor');
    const saiSozinho = (form.elements['saiSozinho'].value || 'nao');
    const observacoes = (form.elements['observacoes'].value || '').trim();

    if (!nome || !dataNascimento) { alert('Preencha nome e data de nascimento'); return; }

    // existência (nome + nascimento) ou telefone
    const exists = cadastros.find(c =>
      (c.nome.toLowerCase() === nome.toLowerCase() && c.dataNascimento === dataNascimento) ||
      (c.telefone && telefone && c.telefone === telefone)
    );
    if (exists) {
      if (!confirm('Já existe um cadastro semelhante. Deseja criar mesmo assim?')) return;
    }

    const novo = {
      id: uid(),
      nome,
      dataNascimento,
      idade,
      responsavel,
      telefone,
      email,
      setor,
      mesa,
      temAlergia,
      qualAlergia,
      altura,
      saiSozinho,
      observacoes,
      entradas: [],
      saidas: [],
      status: 'fora',
      createdAt: nowISO()
    };
    cadastros.unshift(novo);
    saveCadastros();
    generateQRCodeCanvas(novo.id);
    alert('Cadastro salvo!');
    form.reset();
    if (idadeInput) idadeInput.value = '';
    alergiaLabel.style.display = 'none';
    updateLiveBadge();
    renderHistorico();
    renderMarketingList();
  });
}

/* QR gen */
function generateQRCodeCanvas(id){
  if(!qrDiv) return;
  qrDiv.innerHTML = '';
  QRCode.toCanvas(String(id), { width: 160 }, (err, canvasEl) => {
    if (err) { qrDiv.textContent = 'Erro ao gerar QR'; console.error(err); return; }
    qrDiv.appendChild(canvasEl);
  });
}

/* download QR */
if ($('#btnDownloadQR')) $('#btnDownloadQR').addEventListener('click', () => {
  const c = qrDiv.querySelector('canvas');
  if (!c) return alert('Nenhum QR disponível. Gere um cadastro primeiro.');
  const url = c.toDataURL('image/png');
  const a = document.createElement('a'); a.href = url; a.download = 'qr-cadastro.png'; a.click();
});

/* print label wrappers (as before) */
function escapeHtml(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function getBadgeClass(c){
  if (c.saiSozinho === 'sim') return 'green';
  if (c.altura === 'maior' && c.saiSozinho === 'nao') return 'yellow';
  return 'red';
}
function getBadgeText(c){
  if (c.saiSozinho === 'sim') return 'SAI SOZINHO';
  if (c.altura === 'maior' && c.saiSozinho === 'nao') return 'MAIOR > 1m';
  return 'NÃO SAI SOZINHO';
}
function buildLabelHTML(cadastro, size='large'){
  return `
  <html><head><meta charset="utf-8"><title>Etiqueta</title>
  <style>body{font-family:Arial;margin:6px}.label{width:${size==='large'?'4cm':'2.5cm'};height:${size==='large'?'4cm':'2.5cm'};display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px dashed #333;padding:6px}.name{font-weight:700;margin-top:6px;font-size:${size==='large'?'12px':'10px'}}.meta{font-size:${size==='large'?'10px':'8px'};margin-top:4px}.badge{display:inline-block;padding:4px 8px;border-radius:6px;color:#fff;font-weight:700;margin-top:6px}</style>
  </head><body>
    <div class="label">
      <div id="qrImgWrap"></div>
      <div class="name">${escapeHtml(cadastro.nome)}</div>
      <div class="meta">ID: ${cadastro.id} • Tel: ${escapeHtml(cadastro.telefone||'-')}</div>
      <div class="meta">Setor: ${escapeHtml(cadastro.setor||'-')} • ${escapeHtml(cadastro.mesa||'-')}</div>
      <div class="meta">${(cadastro.altura==='maior')? 'Maior que 1m' : 'Menor que 1m'}</div>
      <div class="meta">${(cadastro.saiSozinho==='sim')? 'Sai sozinho' : 'Não sai sozinho'}</div>
      <div style="margin-top:6px"><span class="badge ${getBadgeClass(cadastro)}">${getBadgeText(cadastro)}</span></div>
    </div>
    <script>
      window.addEventListener('message', e => {
        try {
          if (e.data && e.data.qrDataURL) {
            var img = new Image(); img.src = e.data.qrDataURL; img.style.width='70%'; img.style.height='auto';
            document.getElementById('qrImgWrap').appendChild(img);
          }
        } catch(err){ console.error(err); }
      }, false);
      window.onload = () => { setTimeout(()=>{ window.print(); }, 300); };
    </script>
  </body></html>
  `;
}
function printLabelForCadastro(cadastro, qrDataURL, size='large'){
  const w = window.open('', '_blank');
  const html = buildLabelHTML(cadastro, size);
  w.document.open();
  w.document.write(html);
  w.document.close();
  setTimeout(() => { try { w.postMessage({ qrDataURL }, '*'); } catch(e){} }, 500);
}
if (btnPrintLabel) btnPrintLabel.addEventListener('click', () => {
  const c = cadastros[0];
  if (!c) return alert('Nenhum cadastro disponível para imprimir etiqueta.');
  QRCode.toDataURL(String(c.id), { width:400 }).then(url => printLabelForCadastro(c, url, 'large'));
});
if (btnPrintLabelSmall) btnPrintLabelSmall.addEventListener('click', () => {
  const c = cadastros[0];
  if (!c) return alert('Nenhum cadastro disponível para imprimir etiqueta.');
  QRCode.toDataURL(String(c.id), { width:200 }).then(url => printLabelForCadastro(c, url, 'small'));
});

/* gerar todos QRs */
if (btnGerarTodosQR) btnGerarTodosQR.addEventListener('click', () => {
  if(!cadastros.length){ alert('Sem cadastros.'); return; }
  qrDiv.innerHTML = '';
  cadastros.forEach(c => {
    const wrap = document.createElement('div'); wrap.className = 'card';
    const name = document.createElement('div'); name.textContent = c.nome + ' — ' + (c.mesa || '-');
    const holder = document.createElement('div');
    QRCode.toCanvas(c.id, { width: 110 }, (err, cv) => { if(!err) holder.appendChild(cv); });
    wrap.appendChild(name); wrap.appendChild(holder);
    qrDiv.appendChild(wrap);
  });
});

/* busca */
if (inputBusca) inputBusca.addEventListener('input', () => {
  const termo = inputBusca.value.toLowerCase().trim();
  if (!listaBusca) return;
  listaBusca.innerHTML = '';
  if (!termo) return;
  const results = cadastros.filter(c =>
    (c.nome||'').toLowerCase().includes(termo) ||
    (c.telefone||'').toLowerCase().includes(termo) ||
    (c.mesa||'').toLowerCase().includes(termo) ||
    (c.id||'').includes(termo)
  );
  results.forEach(c => {
    const li = document.createElement('li'); li.className = 'card';
    const badgeHTML = `<span class="badge ${getBadgeClass(c)}">${getBadgeText(c)}</span>`;
    li.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
      <div><strong>${c.nome}</strong> <small>(${c.idade} anos)</small><br>
        <small>Setor: ${c.setor||'-'} • Mesa: ${c.mesa||'-'}</small><br>
        <small>Alergia: ${(c.temAlergia==='sim')? (c.qualAlergia || 'Sim') : 'Não'}</small>
        <div>Tel: ${c.telefone||'-'} • Status: ${(c.status==='dentro')? 'No parque' : 'Fora do parque'}</div>
      </div>
      <div style="text-align:right">${badgeHTML}<br><button data-id="${c.id}" class="btnRegistrar">Registrar Entrada/Saída</button><br><button data-id="${c.id}" class="btnPrintSmall">Imprimir etiqueta</button></div>
    </div>`;
    listaBusca.appendChild(li);
  });
  $$('.btnRegistrar').forEach(b => b.addEventListener('click', ev => registrarEntradaSaida(ev.target.dataset.id)));
  $$('.btnPrintSmall').forEach(b => b.addEventListener('click', ev => {
    const id = ev.target.dataset.id;
    const c = cadastros.find(x=>x.id===id);
    if (!c) return;
    QRCode.toDataURL(String(c.id), { width:200 }).then(url => printLabelForCadastro(c, url, 'small'));
  }));
});

/* histórico */
function renderHistorico(){
  if(!listaHistoricoContainer) return;
  listaHistoricoContainer.innerHTML = '';
  if (!cadastros.length){ listaHistoricoContainer.textContent = 'Nenhum cadastro ainda.'; return; }
  cadastros.forEach(c => {
    const div = document.createElement('div'); div.className='card';
    const entradasList = (c.entradas||[]).map(t => `${new Date(t.ts).toLocaleString()} — ${escapeHtml(t.operator||'')}`).join('<br>') || '-';
    const saidasList = (c.saidas||[]).map(t => `${new Date(t.ts).toLocaleString()} — ${escapeHtml(t.operator||'')}`).join('<br>') || '-';
    const badgeHTML = `<span class="badge ${getBadgeClass(c)}">${getBadgeText(c)}</span>`;
    div.innerHTML = `<strong>${c.nome}</strong> <small>${c.idade} anos</small>
      <div>Responsável: ${escapeHtml(c.responsavel||'-')} | Tel: ${escapeHtml(c.telefone||'-')}</div>
      <div>Setor: ${c.setor || '-'} | Mesa: ${c.mesa || '-'}</div>
      <div>Alergia: ${(c.temAlergia === 'sim') ? (c.qualAlergia || 'Sim') : 'Não'}</div>
      <div>Status atual: <strong>${c.status === 'dentro' ? '🟢 No parque' : '🔴 Fora do parque'}</strong> ${badgeHTML}</div>
      <div style="margin-top:8px"><strong>Entradas:</strong><br>${entradasList}</div>
      <div style="margin-top:8px"><strong>Saídas:</strong><br>${saidasList}</div>
      <div style="margin-top:8px">
        <button data-id="${c.id}" class="btnRegistrar">Registrar Entrada/Saída</button>
        <button data-id="${c.id}" class="btnExcluir">Excluir</button>
        <button data-id="${c.id}" class="btnImprimirFicha">Imprimir ficha</button>
        <button data-id="${c.id}" class="btnPrintSmall">Imprimir etiqueta</button>
      </div>`;
    listaHistoricoContainer.appendChild(div);
  });
  $$('.btnRegistrar').forEach(b => b.addEventListener('click', ev => registrarEntradaSaida(ev.target.dataset.id)));
  $$('.btnExcluir').forEach(b => b.addEventListener('click', ev => excluirCadastro(ev.target.dataset.id)));
  $$('.btnImprimirFicha').forEach(b => b.addEventListener('click', ev => imprimirFicha(ev.target.dataset.id)));
  $$('.btnPrintSmall').forEach(b => b.addEventListener('click', ev => {
    const id = ev.target.dataset.id;
    const c = cadastros.find(x=>x.id===id);
    if (!c) return;
    QRCode.toDataURL(String(c.id), { width:200 }).then(url => printLabelForCadastro(c, url, 'small'));
  }));
}
renderHistorico();

/* excluir */
function excluirCadastro(id){
  if(!confirm('Excluir cadastro permanentemente?')) return;
  cadastros = cadastros.filter(c => c.id !== id);
  saveCadastros();
  renderHistorico();
  renderMarketingList();
}

/* imprimir ficha */
function imprimirFicha(id){
  const c = cadastros.find(x => x.id === id);
  if(!c){ alert('Cadastro não encontrado'); return; }
  const w = window.open('', '_blank');
  const html = `<html><head><meta charset="utf-8"><title>Ficha - ${c.nome}</title>
      <style>body{font-family:Arial;padding:16px}</style></head><body>
      <h2>${c.nome}</h2>
      <div>Idade: ${c.idade}</div>
      <div>Nascido em: ${c.dataNascimento}</div>
      <div>Setor: ${c.setor||'-'} | Mesa: ${c.mesa||'-'}</div>
      <div>Alergia: ${(c.temAlergia === 'sim') ? (c.qualAlergia || 'Sim') : 'Não'}</div>
      <div>Responsável: ${c.responsavel || '-' } | Tel: ${c.telefone || '-'}</div>
      <hr>
      <div><strong>Entradas:</strong><br>${(c.entradas||[]).map(t => new Date(t.ts).toLocaleString()+" — "+escapeHtml(t.operator||'')).join('<br>') || '-'}</div>
      <div><strong>Saídas:</strong><br>${(c.saidas||[]).map(t => new Date(t.ts).toLocaleString()+" — "+escapeHtml(t.operator||'')).join('<br>') || '-'}</div>
      </body></html>`;
  w.document.write(html);
  w.document.close();
  setTimeout(()=> w.print(), 500);
}

/* registrar entrada/saída with operator and exit protection */
function registrarEntradaSaida(id, operatorNameOverride=null){
  const c = cadastros.find(x => x.id === id);
  if(!c){ alert('Cadastro não encontrado'); return; }
  const operator = operatorNameOverride || currentOperator || prompt('Nome do operador (funcionário) que está registrando:', '') || 'Operador';
  if (c.status === 'fora' || !c.status) {
    c.entradas = c.entradas || [];
    c.entradas.push({ ts: nowISO(), operator });
    c.status = 'dentro';
    alert(`Entrada registrada para ${c.nome} — Operador: ${operator}`);
  } else {
    // tentativa de saída
    if (c.saiSozinho !== 'sim') {
      const opt = confirm(`${c.nome} NÃO está autorizado a sair sozinho. Deseja contatar o responsável agora?`);
      if (opt) {
        contactResponsibleOptions(c);
      }
      c.saidas = c.saidas || [];
      c.saidas.push({ ts: nowISO(), operator, blocked: true });
      alert('Saída BLOQUEADA — contato acionado (se confirmado).');
    } else {
      c.saidas = c.saidas || [];
      c.saidas.push({ ts: nowISO(), operator });
      c.status = 'fora';
      alert(`Saída registrada para ${c.nome} — Operador: ${operator}`);
    }
  }
  saveCadastros(); renderHistorico(); renderMarketingList();
}

/* contact options for responsible */
function contactResponsibleOptions(c) {
  const phone = c.telefone || '';
  const email = c.email || '';
  const choice = prompt(`Contato para ${c.nome} — escolha:
1 - Ligar
2 - WhatsApp
3 - SMS
4 - E-mail
Digite 1-4`, '1');
  if (!choice) return;
  if (choice === '1') {
    if (!phone) return alert('Telefone não disponível.');
    window.open(`tel:${phone}`, '_self');
  } else if (choice === '2') {
    if (!phone) return alert('Telefone não disponível.');
    openWhatsApp(phone, `Atenção: Tentativa de saída de ${c.nome}. Favor confirmar.`);
  } else if (choice === '3') {
    if (!phone) return alert('Telefone não disponível.');
    openSMS(phone, `Atenção: Tentativa de saída de ${c.nome}. Favor confirmar.`);
  } else if (choice === '4') {
    if (!email) return alert('Email não disponível.');
    openMail(email, 'Tentativa de saída', `Tentativa de saída para ${c.nome}. Favor verificar.`);
  } else {
    alert('Opção inválida.');
  }
}

/* Camera & QR scan (modo B: escanear por botão) */
const ctx = canvas ? canvas.getContext('2d') : null;
btnStartCamera && btnStartCamera.addEventListener('click', async () => {
  if (cameraStream) return;
  currentOperator = prompt('Digite seu nome (operador):', '') || 'Operador';
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio:false });
    video.srcObject = cameraStream; video.play();
    btnStartCamera.disabled = true; btnStopCamera.disabled = false; btnScanNow.disabled = false;
    scanMessage.textContent = `Câmera aberta — Operador: ${currentOperator}. Clique em "Escanear QR" para ler.`;
  } catch(err) {
    console.error(err); alert('Erro ao acessar câmera: ' + (err.message || err));
  }
});
btnStopCamera && btnStopCamera.addEventListener('click', () => {
  if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
  if (video) { video.pause(); video.srcObject = null; }
  btnStartCamera.disabled = false; btnStopCamera.disabled = true; btnScanNow.disabled = true;
  scanMessage.textContent = 'Câmera fechada';
});

// scan once when user clicks btnScanNow
btnScanNow && btnScanNow.addEventListener('click', () => {
  if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) { alert('Câmera ainda não pronta.'); return; }
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
  if (code) {
    scanMessage.textContent = `QR detectado: ${code.data}`;
    // handle payload
    handleScannedPayload(code.data);
  } else {
    alert('Nenhum QR detectado nesta captura. Ajuste a posição e tente novamente.');
  }
});

function handleScannedPayload(payload){
  const c = cadastros.find(x => x.id === String(payload));
  if (!c) { alert('QR não corresponde a nenhum cadastro.'); return; }
  // If currently outside => register entry
  if (c.status === 'fora' || !c.status) {
    // entry
    c.entradas = c.entradas || [];
    c.entradas.push({ ts: nowISO(), operator: currentOperator || 'Operador' });
    c.status = 'dentro';
    saveCadastros(); renderHistorico(); renderMarketingList();
    alert(`Entrada registrada para ${c.nome} — Operador: ${currentOperator}`);
    return;
  }
  // currently inside => attempt exit
  if (c.saiSozinho !== 'sim') {
    // pulseira vermelha or yellow (if not allowed) => block and show contact options
    alert(`${c.nome} NÃO está autorizado a sair sozinho. A saída foi bloqueada.`);
    // show contact options immediately
    contactResponsibleOptions(c);
    // record blocked attempt
    c.saidas = c.saidas || [];
    c.saidas.push({ ts: nowISO(), operator: currentOperator || 'Operador', blocked: true });
    saveCadastros(); renderHistorico(); renderMarketingList();
  } else {
    // allowed to exit
    c.saidas = c.saidas || [];
    c.saidas.push({ ts: nowISO(), operator: currentOperator || 'Operador' });
    c.status = 'fora';
    saveCadastros(); renderHistorico(); renderMarketingList();
    alert(`Saída registrada para ${c.nome} — Operador: ${currentOperator}`);
  }
}

/* manual register */
if (btnRegistrarManual) btnRegistrarManual.addEventListener('click', () => {
  const termo = inputBusca ? inputBusca.value.trim() : '';
  if (!termo) { alert('Digite nome/telefone/pulseira no campo de busca para registrar manualmente.'); return; }
  const found = cadastros.find(c => (c.nome||'').toLowerCase().includes(termo.toLowerCase()) || (c.telefone||'').includes(termo) || (c.id||'').includes(termo));
  if (!found) { alert('Nenhum cadastro encontrado para: ' + termo); return; }
  registrarEntradaSaida(found.id);
});

/* imprimir lista */
if (btnImprimir) btnImprimir.addEventListener('click', () => {
  if (!cadastros.length){ alert('Nenhum cadastro para imprimir'); return; }
  const w = window.open('', '_blank');
  let html = `<html><head><meta charset="utf-8"><title>Cadastros</title>
    <style>body{font-family:Arial;padding:16px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:8px}</style></head><body>
    <h2>Lista de Cadastros</h2><table><thead><tr><th>Nome</th><th>Idade</th><th>Tel</th><th>Email</th><th>Setor/Mesa</th><th>Status</th></tr></thead><tbody>`;
  cadastros.forEach(c => {
    html += `<tr><td>${c.nome}</td><td>${c.idade}</td><td>${c.telefone||'-'}</td><td>${c.email||'-'}</td>
      <td>${c.setor||'-'} / ${c.mesa||'-'}</td><td>${c.status==='dentro' ? 'No parque' : 'Fora do parque'}</td></tr>`;
  });
  html += '</tbody></table></body></html>';
  w.document.write(html); w.document.close();
  setTimeout(()=> w.print(), 500);
});

/* MARKETING: render list (Opção A = todos) */
function renderMarketingList(){
  if (!marketingList) return;
  marketingList.innerHTML = '';
  if (!cadastros.length) { marketingList.textContent = 'Nenhum contato cadastrado.'; return; }
  cadastros.forEach(c => {
    const row = document.createElement('div'); row.className = 'contact-row';
    const chk = document.createElement('input'); chk.type = 'checkbox'; chk.dataset.id = c.id;
    const meta = document.createElement('div'); meta.className = 'contact-meta';
    meta.innerHTML = `<strong>${c.nome}</strong><br><small>Tel: ${c.telefone||'-'} • Email: ${c.email||'-'} • Mesa: ${c.mesa||'-'}</small>`;
    const actions = document.createElement('div'); actions.className = 'contact-actions';
    const telBtn = document.createElement('button'); telBtn.textContent='Ligar'; telBtn.addEventListener('click', ()=> window.open(`tel:${c.telefone||''}`));
    const waBtn = document.createElement('button'); waBtn.textContent='WhatsApp'; waBtn.addEventListener('click', ()=> openWhatsApp(c.telefone));
    const smsBtn = document.createElement('button'); smsBtn.textContent='SMS'; smsBtn.addEventListener('click', ()=> openSMS(c.telefone, ''));
    const mailBtn = document.createElement('button'); mailBtn.textContent='E-mail'; mailBtn.addEventListener('click', ()=> openMail(c.email, 'Promoção', ''));
    actions.appendChild(telBtn); actions.appendChild(waBtn); actions.appendChild(smsBtn); actions.appendChild(mailBtn);
    row.appendChild(chk); row.appendChild(meta); row.appendChild(actions);
    marketingList.appendChild(row);
  });
}
renderMarketingList();

if (btnSelectAll) btnSelectAll.addEventListener('click', () => { $$('#marketingList input[type="checkbox"]').forEach(i => i.checked = true); });
if (btnClearAll) btnClearAll.addEventListener('click', () => { $$('#marketingList input[type="checkbox"]').forEach(i => i.checked = false); });

function openWhatsApp(number, text=''){
  if (!number) return alert('Número ausente.');
  const digits = number.replace(/\D/g,'');
  const encoded = encodeURIComponent(text);
  window.open(`https://wa.me/${digits}?text=${encoded}`, '_blank');
}
function openSMS(number, body=''){
  if (!number) return alert('Número ausente.');
  const encoded = encodeURIComponent(body);
  window.open(`sms:${number}?body=${encoded}`, '_blank');
}
function openMail(email, subject='', body=''){
  if (!email) return alert('Email ausente.');
  const s = encodeURIComponent(subject); const b = encodeURIComponent(body);
  window.open(`mailto:${email}?subject=${s}&body=${b}`, '_blank');
}

/* Send to selected (fallback behavior) */
if (btnSendToSelected) btnSendToSelected.addEventListener('click', async () => {
  const message = (marketingMessage.value || '').trim();
  const selected = $$('#marketingList input[type="checkbox"]:checked').map(i => i.dataset.id);
  if (!selected.length) { alert('Selecione ao menos um contato.'); return; }
  const file = marketingImage.files[0] || null;
  const canShareFiles = navigator.canShare && file && navigator.canShare({ files: [file] });
  if (canShareFiles) {
    try {
      await navigator.share({ files: [file], text: message });
      alert('Compartilhamento aberto — finalize no app.');
      return;
    } catch(e){
      console.warn('Share error', e);
    }
  }
  for (const id of selected) {
    const c = cadastros.find(x => x.id === id);
    if (!c) continue;
    if (c.telefone) {
      const text = `${message}\n\n— ${c.nome}`;
      openWhatsApp(c.telefone, text);
      await new Promise(r => setTimeout(r, 600));
    } else if (c.email) {
      openMail(c.email, 'Promoção', message);
      await new Promise(r => setTimeout(r, 600));
    }
  }
  alert('Links abertos para envio. Finalize no app correspondente.');
});

/* Export / clear */
if (btnExportJSON) btnExportJSON.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(cadastros, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'cadastros-parquinho.json'; a.click();
  URL.revokeObjectURL(url);
});
if (btnLimparTudo) btnLimparTudo.addEventListener('click', () => {
  if (!confirm('Apagar todos os dados locais?')) return;
  localStorage.clear(); cadastros = []; renderHistorico(); renderMarketingList(); alert('Dados apagados.');
});

/* Service worker */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').then(()=> console.log('SW registrado')).catch(e=>console.warn('SW erro', e));
}

/* init */
(function init(){
  cadastros = cadastros.map(c => ({ entradas: [], saidas: [], status: 'fora', ...c }));
  renderHistorico();
  renderMarketingList();
  attachPrintFilterEvents();
})();

/* --------- Impressão / Relatórios --------- */

function toDateOnly(iso){
  if(!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0,10); // yyyy-mm-dd
}

function agruparPorDia(list){
  const map = {};
  list.forEach(c => {
    const dia = toDateOnly(c.createdAt) || toDateOnly(c.entradas && c.entradas[0] && c.entradas[0].ts) || 'unknown';
    map[dia] = map[dia] || [];
    map[dia].push(c);
  });
  return map;
}

function filtrarPorPeriodo(from, to){
  // from,to are yyyy-mm-dd strings inclusive
  const start = from ? new Date(from + "T00:00:00") : null;
  const end = to ? new Date(to + "T23:59:59") : null;
  return cadastros.filter(c => {
    const d = new Date(c.createdAt);
    if (isNaN(d.getTime())) return false;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}

function formatDateBr(iso){
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

function buildReportHTML(list, periodLabel){
  const total = list.length;
  // group counts by day
  const byDay = {};
  list.forEach(c => {
    const day = toDateOnly(c.createdAt) || 'unknown';
    byDay[day] = (byDay[day] || 0) + 1;
  });
  let perDayHtml = '';
  Object.keys(byDay).sort().forEach(day => {
    perDayHtml += `<div><strong>${day}</strong> — ${byDay[day]} crianças</div>`;
  });

  let html = `<div id="relatorioPrint" class="report-wrapper">
    <img class="report-watermark" src="assets/img/logo-terra-do-sol.png" alt="marca" />
    <div class="report-header">
      <img src="assets/img/logo-terra-do-sol.png" alt="logo" />
      <div>
        <div class="report-title">Relatório – Terra do Sol – Parquinho Infantil</div>
        <div class="report-meta">Período selecionado: ${periodLabel}</div>
        <div class="report-meta">Crianças registradas: <strong>${total}</strong></div>
      </div>
    </div>

    <div style="margin-top:12px">${perDayHtml}</div>

    <table class="report-table" style="margin-top:12px">
      <thead><tr><th>Nome</th><th>Idade</th><th>Setor</th><th>Pulseira</th></tr></thead>
      <tbody>`;

  list.forEach(c => {
    const pulseira = (c.saiSozinho === 'sim') ? 'VERDE' : (c.altura === 'maior' ? 'AMARELA' : 'VERMELHA');
    html += `<tr>
      <td>${escapeHtml(c.nome)}</td>
      <td>${escapeHtml(c.idade)}</td>
      <td>${escapeHtml(c.setor||'-')}</td>
      <td>${pulseira}</td>
    </tr>`;
  });

  html += `</tbody></table></div>`;
  return html;
}

function attachPrintFilterEvents(){
  if (!quickFilter) return;
  quickFilter.addEventListener('change', () => {
    const v = quickFilter.value;
    const today = new Date();
    if (v === 'hoje') {
      const d = today.toISOString().slice(0,10);
      filterFrom.value = d; filterTo.value = d;
    } else if (v === 'ontem') {
      const t = new Date(today); t.setDate(today.getDate()-1);
      const d = t.toISOString().slice(0,10);
      filterFrom.value = d; filterTo.value = d;
    } else if (v === 'ult7') {
      const t = new Date(today); t.setDate(today.getDate()-6);
      filterFrom.value = t.toISOString().slice(0,10); filterTo.value = today.toISOString().slice(0,10);
    } else if (v === 'mesAtual') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      filterFrom.value = start.toISOString().slice(0,10); filterTo.value = today.toISOString().slice(0,10);
    } else if (v === 'intervalo') {
      filterFrom.value = ''; filterTo.value = '';
    }
  });

  btnFiltrar.addEventListener('click', () => {
    const from = filterFrom.value;
    const to = filterTo.value || from;
    if (!from) return alert('Escolha a data inicial.');
    const list = filtrarPorPeriodo(from, to);
    const periodLabel = (from === to) ? formatDateBr(from) : `${formatDateBr(from)} → ${formatDateBr(to)}`;
    relatorioPreview.innerHTML = buildReportHTML(list, periodLabel);
  });

  btnImprimirFiltro.addEventListener('click', () => {
    const from = filterFrom.value;
    const to = filterTo.value || from;
    if (!from) return alert('Escolha a data inicial para imprimir.');
    const list = filtrarPorPeriodo(from, to);
    const periodLabel = (from === to) ? formatDateBr(from) : `${formatDateBr(from)} → ${formatDateBr(to)}`;
    const reportHtml = buildReportHTML(list, periodLabel);
    const w = window.open('','_blank');
    w.document.write(`<html><head><meta charset="utf-8"><title>Relatório</title>
      <style>body{font-family:Arial;padding:18px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:8px}</style>
      </head><body>${reportHtml}</body></html>`);
    w.document.close();
    setTimeout(()=> w.print(), 500);
  });
}

/* end of file */
