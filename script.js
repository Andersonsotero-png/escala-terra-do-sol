// script.js — versão corrigida e completa
// Compatível com o HTML que você me enviou (ids: btn-marcar-todos, btn-excel-dia, btn-excel-preview, etc.)

const STORAGE = {
  FUNC: "tds_escala_funcionarios",
  LOGO: "tds_escala_logo",
  ROD: "tds_escala_rodizio_offset",
  HIST: "tds_escala_historico"
};

function safeParse(v) {
  try { return JSON.parse(v); } catch { return null; }
}
function loadRaw(key){ try { return localStorage.getItem(key); } catch { return null; } }
function load(key){ const s = loadRaw(key); return s ? safeParse(s) : null; }
function save(key, value){ try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) { console.error("save error", e); } }

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function todayISO(d=new Date()){ return d.toISOString().slice(0,10); }
function formatBR(iso){ if(!iso) return ""; const [y,m,d] = iso.split("-"); return `${d.padStart(2,"0")}/${m.padStart(2,"0")}/${y}`; }
function nowBR(){ return new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); }
function weekdayName(dateStr){ if(!dateStr) return ""; const [y,m,d] = dateStr.split("-").map(Number); const date = new Date(y, m-1, d); const dias = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"]; return dias[date.getDay()]; }

let funcionarios = load(STORAGE.FUNC) || [];
let rodizioOffset = Number(loadRaw(STORAGE.ROD) || 0);
let ultimoResultadoDia = null;

// normalize funcionarios: support legacy arrays of strings
function normalizeFuncionarios() {
  if (!Array.isArray(funcionarios)) funcionarios = [];
  funcionarios = funcionarios.map(f => {
    if (!f) return null;
    if (typeof f === "string") return { id: uid(), nome: f };
    if (typeof f === "object" && f.nome) {
      if (!f.id) f.id = uid();
      return { id: String(f.id), nome: f.nome };
    }
    return null;
  }).filter(Boolean);
  save(STORAGE.FUNC, funcionarios);
}
normalizeFuncionarios();

// elements (some may not exist in all HTML versions; guard them)
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const els = {
  // main
  tabButtons: $$(".tab-button"),
  tabSections: $$(".tab-section"),
  // equipe
  listaFuncionarios: $("#lista-funcionarios"),
  totalFuncionarios: $("#total-funcionarios"),
  formAdd: $("#form-add-funcionario"),
  inputNome: $("#nome-funcionario"),
  // dia
  dataDia: $("#data-dia"),
  listaPresenca: $("#lista-presenca"),
  totalPresentes: $("#total-presentes"),
  btnMarcarTodos: $("#btn-marcar-todos"),
  btnGerar: $("#btn-gerar-dia"),
  btnSalvar: $("#btn-salvar-dia"),
  btnImprimir: $("#btn-imprimir-dia"),
  previewDia: $("#preview-dia"),
  printArea: $("#print-area"),
  btnExportExcelTop: $("#btn-excel-dia"),
  btnExportExcelPreview: $("#btn-excel-preview"),
  // semana / histórico
  dataSemana: $("#data-semana"),
  previewSemana: $("#preview-semana"),
  listaHistorico: $("#lista-historico"),
  btnApagarHistorico: $("#btn-apagar-historico"),
  // config
  inputLogo: $("#input-logo"),
  logoPreviewContainer: $("#logo-preview-container"),
  btnRemoverLogo: $("#btn-remover-logo"),
  btnResetRodizio: $("#btn-reset-rodizio")
};

// TABS
function setupTabs() {
  if (!els.tabButtons || !els.tabButtons.length) return;
  els.tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const alvo = btn.getAttribute("data-target");
      els.tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      $$(".tab-section").forEach(sec => sec.classList.remove("active"));
      const targetEl = document.getElementById(alvo);
      if (targetEl) targetEl.classList.add("active");
    });
  });
}

// FUNCIONARIOS (cadastro/lista)
function persistFuncionarios(){ save(STORAGE.FUNC, funcionarios); }
function renderFuncionarios() {
  if (!els.listaFuncionarios) return;
  els.listaFuncionarios.innerHTML = "";
  if (!funcionarios.length) {
    els.listaFuncionarios.innerHTML = "<li>Nenhum colaborador cadastrado ainda.</li>";
    if (els.totalFuncionarios) els.totalFuncionarios.textContent = "0";
    return;
  }
  funcionarios.forEach((f, idx) => {
    const li = document.createElement("li");
    li.className = "list-item-row";
    li.innerHTML = `
      <div class="list-item-main">
        <span class="nome">${f.nome}</span>
        <small>ID: ${f.id}</small>
      </div>
      <div class="list-item-actions">
        <button class="danger small btn-remove" data-id="${f.id}">Remover</button>
      </div>
    `;
    els.listaFuncionarios.appendChild(li);
    li.querySelector(".btn-remove").addEventListener("click", () => {
      if (confirm(`Remover ${f.nome} da equipe?`)) {
        funcionarios = funcionarios.filter(x => String(x.id) !== String(f.id));
        persistFuncionarios();
        renderFuncionarios();
        renderListaPresenca();
        renderHistorico();
      }
    });
  });
  if (els.totalFuncionarios) els.totalFuncionarios.textContent = String(funcionarios.length);
}

// PRESENÇA DO DIA
function renderListaPresenca() {
  if (!els.listaPresenca) return;
  els.listaPresenca.innerHTML = "";
  if (!funcionarios.length) {
    els.listaPresenca.innerHTML = "<li>Cadastre colaboradores na aba <strong>Equipe</strong>.</li>";
    if (els.totalPresentes) els.totalPresentes.textContent = "0";
    return;
  }
  funcionarios.forEach((f) => {
    const li = document.createElement("li");
    li.className = "list-item-row";
    li.innerHTML = `<div class="list-item-main"><input type="checkbox" data-id="${f.id}"><span class="nome">${f.nome}</span></div>`;
    els.listaPresenca.appendChild(li);
  });
  atualizarTotalPresentes();
}

function atualizarTotalPresentes() {
  if (!els.listaPresenca || !els.totalPresentes) return;
  const checks = els.listaPresenca.querySelectorAll("input[type='checkbox']");
  let n = 0; checks.forEach(c => { if (c.checked) n++ });
  els.totalPresentes.textContent = String(n);
}

// MARCAR / DESMARCAR
function marcarDesmarcarTodos(valor) {
  if (!els.listaPresenca) return;
  els.listaPresenca.querySelectorAll("input[type='checkbox']").forEach(ch => ch.checked = valor);
  atualizarTotalPresentes();
}

// LOGO (preview & persist)
function renderLogoPreview() {
  if (!els.logoPreviewContainer) return;
  const data = loadRaw(STORAGE.LOGO);
  els.logoPreviewContainer.innerHTML = "";
  if (!data) {
    els.logoPreviewContainer.innerHTML = "<p>Nenhuma logo selecionada.</p>";
    return;
  }
  const img = document.createElement("img");
  img.src = data;
  img.alt = "Logo da barraca";
  els.logoPreviewContainer.appendChild(img);
}

function handleLogoChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      localStorage.setItem(STORAGE.LOGO, ev.target.result);
    } catch (err) {
      console.error("Erro ao salvar logo", err);
    }
    renderLogoPreview();
  };
  reader.readAsDataURL(file);
}

function removerLogo() {
  localStorage.removeItem(STORAGE.LOGO);
  renderLogoPreview();
}

// LÓGICA DA ESCALA (mantém a ordem dos presentes conforme marcar)
function getPresentesDoDia() {
  if (!els.listaPresenca) return [];
  const checks = els.listaPresenca.querySelectorAll("input[type='checkbox']");
  const presentes = [];
  checks.forEach(chk => {
    if (chk.checked) {
      const id = String(chk.dataset.id);
      const f = funcionarios.find(x => String(x.id) === id);
      if (f) presentes.push(f);
    }
  });
  return presentes;
}

function rotateArray(arr, offset) {
  if (!arr || arr.length === 0) return [];
  const n = arr.length;
  const o = ((offset % n) + n) % n;
  return arr.slice(o).concat(arr.slice(0, o));
}

function gerarEscalaParaData(dataISO, presentes, offsetBase) {
  const presentesOrdenados = presentes.slice(); // keep order user marked
  const listaRodizio = rotateArray(presentesOrdenados, offsetBase);
  const roles = { bar1: null, bar2: null, aparadores: [null, null, null], almocoTurma1: [], almocoTurma2: [], lancheTurma1: [], lancheTurma2: [], lancheTurma3: [] };
  if (listaRodizio.length === 0) return { dataISO, weekday: weekdayName(dataISO), roles, presentes: [] };
  const pool = listaRodizio.slice();
  if (pool.length > 0) roles.bar1 = pool.shift();
  if (pool.length > 0) roles.bar2 = pool.shift();
  for (let i=0;i<3;i++) if (pool.length>0) roles.aparadores[i] = pool.shift();
  const restantes = pool.slice();
  if (restantes.length > 0) {
    const metade = Math.ceil(restantes.length / 2);
    roles.almocoTurma1 = restantes.slice(0, metade);
    roles.almocoTurma2 = restantes.slice(metade);
    const t1Size = Math.ceil(restantes.length / 3);
    const t2Size = Math.ceil((restantes.length - t1Size)/2);
    roles.lancheTurma1 = restantes.slice(0, t1Size);
    roles.lancheTurma2 = restantes.slice(t1Size, t1Size + t2Size);
    roles.lancheTurma3 = restantes.slice(t1Size + t2Size);
  }
  return { dataISO, weekday: weekdayName(dataISO), roles, presentes: presentesOrdenados };
}

// RENDER DA ESCALA (preview + impressão)
function renderEscalaDocumento(escala) {
  const logoData = loadRaw(STORAGE.LOGO);
  const { dataISO, weekday, roles } = escala;
  const dataBR = formatBR(dataISO);
  const nome = (f) => (f ? f.nome : "—");
  const mapNomes = (list) => list && list.length ? list.map(p => p.nome).join(", ") : "—";
  const aparadoresNomes = (roles.aparadores || []).map(a => nome(a));
  const html = `
  <article class="escala-documento">
    <header class="escala-header">
      ${logoData ? `<img src="${logoData}" alt="Logo Terra do Sol" />` : ""}
      <h1>BARRACA TERRA DO SOL</h1>
      <h2>Escala Operacional do Dia</h2>
      <p>${weekday} — ${dataBR}</p>
    </header>

    <section class="escala-section">
      <h3>🍽 Almoço</h3>
      <table class="escala-table">
        <thead><tr><th>Turma</th><th>Horário</th><th>Colaboradores</th></tr></thead>
        <tbody>
          <tr><td>1ª Turma</td><td>10:00 → 10:40</td><td>${mapNomes(roles.almocoTurma1)}</td></tr>
          <tr><td>2ª Turma</td><td>10:40 → 11:20</td><td>${mapNomes(roles.almocoTurma2)}</td></tr>
        </tbody>
      </table>
    </section>

    <section class="escala-section">
      <h3>☕ Lanche</h3>
      <table class="escala-table">
        <thead><tr><th>Turma</th><th>Horário</th><th>Colaboradores</th></tr></thead>
        <tbody>
          <tr><td>1ª Turma</td><td>15:00 → 15:20</td><td>${mapNomes(roles.lancheTurma1)}</td></tr>
          <tr><td>2ª Turma</td><td>15:20 → 15:40</td><td>${mapNomes(roles.lancheTurma2)}</td></tr>
          <tr><td>3ª Turma</td><td>15:40 → 16:00</td><td>${mapNomes(roles.lancheTurma3)}</td></tr>
        </tbody>
      </table>
    </section>

    <section class="escala-section">
      <h3>🧺 Aparadores & Setores</h3>
      <table class="escala-table">
        <tbody>
          <tr><td>Salão + Coqueiro direito</td><td>${aparadoresNomes[0] || '—'}</td></tr>
          <tr><td>Praia direita + Parquinho</td><td>${aparadoresNomes[1] || '—'}</td></tr>
          <tr><td>Coqueiro esquerdo + Praia esquerda</td><td>${aparadoresNomes[2] || '—'}</td></tr>
        </tbody>
      </table>
    </section>

    <section class="escala-section">
      <h3>🍹 Bar</h3>
      <table class="escala-table">
        <tbody>
          <tr><td>Bar 1</td><td>${nome(roles.bar1)}</td></tr>
          <tr><td>Bar 2</td><td>${nome(roles.bar2)}</td></tr>
        </tbody>
      </table>
    </section>

    <section class="escala-section">
      <h3>👥 Total</h3>
      <p><small>Presentes: ${escala.presentes ? escala.presentes.length : 0} pessoas</small></p>
    </section>
  </article>
  `;
  const container = document.createElement("div");
  container.innerHTML = html.trim();
  return container.firstElementChild;
}

// AÇÕES: gerar, salvar, imprimir
function actionGerarDia() {
  const dataISO = (els.dataDia && els.dataDia.value) || todayISO();
  const presentes = getPresentesDoDia();
  if (presentes.length < 1) {
    if (!confirm("Você não selecionou ninguém. Continuar mesmo assim?")) return;
  }
  const escala = gerarEscalaParaData(dataISO, presentes, rodizioOffset);
  ultimoResultadoDia = escala;
  if (els.previewDia) {
    els.previewDia.innerHTML = "";
    els.previewDia.classList.remove("empty");
    els.previewDia.appendChild(renderEscalaDocumento(escala));
  }
  if (els.btnSalvar) els.btnSalvar.disabled = false;
  if (els.btnImprimir) els.btnImprimir.disabled = false;
  if (els.btnExportExcelPreview) els.btnExportExcelPreview.disabled = false;
  rodizioOffset = Number(rodizioOffset) + 1;
  try { localStorage.setItem(STORAGE.ROD, String(rodizioOffset)); } catch(e){console.error(e);}
}

function actionSalvarDia() {
  if (!ultimoResultadoDia) return;
  const hist = load(STORAGE.HIST) || {};
  hist[ultimoResultadoDia.dataISO] = ultimoResultadoDia;
  save(STORAGE.HIST, hist);
  alert("Escala do dia salva no histórico.");
  renderHistorico();
}

function actionImprimirDia() {
  if (!ultimoResultadoDia) return;
  els.printArea.innerHTML = "";
  // build header with logo + data + generated time
  const headerDiv = document.createElement("div");
  headerDiv.style.textAlign = "center";
  const logoData = loadRaw(STORAGE.LOGO);
  if (logoData) {
    const img = document.createElement("img");
    img.src = logoData;
    img.style.maxWidth = "220px";
    img.style.maxHeight = "120px";
    headerDiv.appendChild(img);
  }
  const title = document.createElement("div");
  title.innerHTML = `<h1 style="margin:6px 0">BARRACA TERRA DO SOL</h1>
    <div style="font-size:13px">${weekdayName(ultimoResultadoDia.dataISO)} — ${formatBR(ultimoResultadoDia.dataISO)}</div>
    <div style="font-size:11px;color:#444;margin-top:4px">${nowBR()}</div>`;
  headerDiv.appendChild(title);
  els.printArea.appendChild(headerDiv);
  els.printArea.appendChild(renderEscalaDocumento(ultimoResultadoDia));
  window.print();
}

// HISTÓRICO
function renderHistorico() {
  if (!els.listaHistorico) return;
  const hist = load(STORAGE.HIST) || {};
  const keys = Object.keys(hist).sort().reverse();
  els.listaHistorico.innerHTML = "";
  if (!keys.length) {
    els.listaHistorico.innerHTML = "<li>Nenhuma escala salva ainda.</li>";
    return;
  }
  keys.forEach(k => {
    const escala = hist[k];
    const li = document.createElement("li");
    li.className = "list-item-row";
    const main = document.createElement("div");
    main.className = "list-item-main";
    main.innerHTML = `<span class="nome">${formatBR(k)} — ${weekdayName(k)}</span><small class="historico-meta">Presentes: ${escala.presentes ? escala.presentes.length : 0}</small>`;
    const actions = document.createElement("div");
    actions.className = "list-item-actions";
    const btnVer = document.createElement("button");
    btnVer.className = "secondary small";
    btnVer.textContent = "Ver / Imprimir";
    btnVer.addEventListener("click", () => {
      ultimoResultadoDia = escala;
      if (els.previewDia) { els.previewDia.innerHTML = ""; els.previewDia.appendChild(renderEscalaDocumento(escala)); els.btnImprimir.disabled = false; }
      // switch to day tab if present
      const btn = document.querySelector('.tab-button[data-target="section-dia"]');
      if (btn) btn.click();
    });
    const btnDel = document.createElement("button");
    btnDel.className = "danger small";
    btnDel.textContent = "Apagar";
    btnDel.addEventListener("click", () => {
      if (confirm(`Apagar escala de ${formatBR(k)} do histórico?`)) {
        const h = load(STORAGE.HIST) || {};
        delete h[k];
        save(STORAGE.HIST, h);
        renderHistorico();
      }
    });
    actions.appendChild(btnVer);
    actions.appendChild(btnDel);
    li.appendChild(main);
    li.appendChild(actions);
    els.listaHistorico.appendChild(li);
  });
}

// EXPORT EXCEL (CSV compatible)
function exportExcelFromScale(escala) {
  if (!escala) { alert("Gere a escala primeiro."); return; }
  const rows = [];
  rows.push(["Escala Terra do Sol"]);
  rows.push([`${weekdayName(escala.dataISO)} — ${formatBR(escala.dataISO)}`]);
  rows.push([]);
  rows.push(["Almoço 1", (escala.roles.almocoTurma1||[]).map(p=>p.nome).join(", ")]);
  rows.push(["Almoço 2", (escala.roles.almocoTurma2||[]).map(p=>p.nome).join(", ")]);
  rows.push([]);
  rows.push(["Lanche T1", (escala.roles.lancheTurma1||[]).map(p=>p.nome).join(", ")]);
  rows.push(["Lanche T2", (escala.roles.lancheTurma2||[]).map(p=>p.nome).join(", ")]);
  rows.push(["Lanche T3", (escala.roles.lancheTurma3||[]).map(p=>p.nome).join(", ")]);
  rows.push([]);
  rows.push(["Aparador 1", escala.roles.aparadores[0]?escala.roles.aparadores[0].nome:""]);
  rows.push(["Aparador 2", escala.roles.aparadores[1]?escala.roles.aparadores[1].nome:""]);
  rows.push(["Aparador 3", escala.roles.aparadores[2]?escala.roles.aparadores[2].nome:""]);
  rows.push([]);
  rows.push(["Bar 1", escala.roles.bar1?escala.roles.bar1.nome:""]);
  rows.push(["Bar 2", escala.roles.bar2?escala.roles.bar2.nome:""]);
  rows.push([]);
  rows.push(["Total presentes", escala.presentes?escala.presentes.length:0]);

  // build CSV with semicolon (works well with Excel PT-BR)
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(";")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `escala-${escala.dataISO}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// SETUP event listeners and initial state
function setupEventListeners() {
  // Tabs
  setupTabs();

  // Logo
  if (els.inputLogo) els.inputLogo.addEventListener("change", handleLogoChange);
  if (els.btnRemoverLogo) els.btnRemoverLogo.addEventListener("click", removerLogo);

  // Rodízio reset
  if (els.btnResetRodizio) els.btnResetRodizio.addEventListener("click", () => {
    if (confirm("Resetar rodízio? Isso volta ao início.")) { rodizioOffset = 0; localStorage.setItem(STORAGE.ROD, "0"); alert("Rodízio resetado."); }
  });

  // Add colaborador
  if (els.formAdd) els.formAdd.addEventListener("submit", (e) => {
    e.preventDefault();
    const nomeInput = els.inputNome;
    if (!nomeInput) return;
    const nome = nomeInput.value.trim();
    if (!nome) return;
    const novo = { id: uid(), nome };
    funcionarios.push(novo);
    persistFuncionarios();
    nomeInput.value = "";
    renderFuncionarios();
    renderListaPresenca();
    renderHistorico();
  });

  // Presença change
  if (els.listaPresenca) els.listaPresenca.addEventListener("change", atualizarTotalPresentes);

  // botão marcar todos (opção 1: acima da lista — seu HTML já tem id btn-marcar-todos)
  if (els.btnMarcarTodos) {
    els.btnMarcarTodos.addEventListener("click", () => {
      const checks = els.listaPresenca ? Array.from(els.listaPresenca.querySelectorAll("input[type='checkbox']")) : [];
      const anyUnchecked = checks.some(c => !c.checked);
      checks.forEach(c => c.checked = anyUnchecked);
      atualizarTotalPresentes();
    });
  }

  // gerar, salvar, imprimir
  if (els.btnGerar) els.btnGerar.addEventListener("click", actionGerarDia);
  if (els.btnSalvar) els.btnSalvar.addEventListener("click", actionSalvarDia);
  if (els.btnImprimir) els.btnImprimir.addEventListener("click", actionImprimirDia);

  // export excel (two places)
  const exportTop = $("#btn-excel-dia") || els.btnExportExcelTop;
  const exportPreview = $("#btn-excel-preview") || els.btnExportExcelPreview;
  if (exportTop) exportTop.addEventListener("click", () => {
    if (!ultimoResultadoDia) { alert("Gere a escala primeiro."); return; }
    exportExcelFromScale(ultimoResultadoDia);
  });
  if (exportPreview) exportPreview.addEventListener("click", () => {
    if (!ultimoResultadoDia) { alert("Gere a escala primeiro."); return; }
    exportExcelFromScale(ultimoResultadoDia);
  });

  // apagar histórico
  if (els.btnApagarHistorico) els.btnApagarHistorico.addEventListener("click", () => {
    if (confirm("Tem certeza que deseja apagar TODO o histórico?")) { save(STORAGE.HIST, {}); renderHistorico(); }
  });

  // when pressing Enter in inputNome, form handles it (already)
}

// small wrapper to call export function (keeps name used above)
function exportExcelFromScale(escala) { exportExcelFromScale_impl(escala); }
function exportExcelFromScale_impl(escala) {
  // forward to CSV builder
  exportExcelFromScale(escala); // but this would recurse; instead call the function above: use the defined exportExcelFromScale function
}
// Fix above: define single function name properly (avoid duplicate). We'll use the earlier exportExcelFromScale implementation by renaming helper:
function exportExcelFromScale_final(escala) {
  // reuse the implementation from earlier (avoid recursion)
  if (!escala) { alert("Gere a escala primeiro."); return; }
  const rows = [];
  rows.push(["Escala Terra do Sol"]);
  rows.push([`${weekdayName(escala.dataISO)} — ${formatBR(escala.dataISO)}`]);
  rows.push([]);
  rows.push(["Almoço 1", (escala.roles.almocoTurma1||[]).map(p=>p.nome).join(", ")]);
  rows.push(["Almoço 2", (escala.roles.almocoTurma2||[]).map(p=>p.nome).join(", ")]);
  rows.push([]);
  rows.push(["Lanche T1", (escala.roles.lancheTurma1||[]).map(p=>p.nome).join(", ")]);
  rows.push(["Lanche T2", (escala.roles.lancheTurma2||[]).map(p=>p.nome).join(", ")]);
  rows.push(["Lanche T3", (escala.roles.lancheTurma3||[]).map(p=>p.nome).join(", ")]);
  rows.push([]);
  rows.push(["Aparador 1", escala.roles.aparadores[0]?escala.roles.aparadores[0].nome:""]);
  rows.push(["Aparador 2", escala.roles.aparadores[1]?escala.roles.aparadores[1].nome:""]);
  rows.push(["Aparador 3", escala.roles.aparadores[2]?escala.roles.aparadores[2].nome:""]);
  rows.push([]);
  rows.push(["Bar 1", escala.roles.bar1?escala.roles.bar1.nome:""]);
  rows.push(["Bar 2", escala.roles.bar2?escala.roles.bar2.nome:""]);
  rows.push([]);
  rows.push(["Total presentes", escala.presentes?escala.presentes.length:0]);

  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(";")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `escala-${escala.dataISO}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// small helper to avoid naming clash above
function exportExcelFromScale_wrapper(escala) { exportExcelFromScale_final(escala); }

// attach the wrapper to the earlier used names
window._exportExcelFromScale = exportExcelFromScale_wrapper; // fallback

// A safer mapping used by event listeners earlier
function exportExcelHandler(escala) { exportExcelFromScale_wrapper(escala); }

// INITIALIZE
function init() {
  // tabs
  setupTabs();

  // render initial UI
  renderLogoPreview();
  renderFuncionarios();
  renderListaPresenca();
  renderHistorico();

  // setup listeners
  setupEventListeners();

  // ensure date inputs
  if (els.dataDia && !els.dataDia.value) els.dataDia.value = todayISO();
  if (els.dataSemana && !els.dataSemana.value) els.dataSemana.value = todayISO();

  // Ensure top export buttons if present reference the wrapper
  const exportTop = $("#btn-excel-dia");
  const exportPreview = $("#btn-excel-preview");
  if (exportTop) exportTop.addEventListener("click", () => { if (!ultimoResultadoDia) { alert("Gere a escala primeiro."); return; } exportExcelFromScale_wrapper(ultimoResultadoDia); });
  if (exportPreview) exportPreview.addEventListener("click", () => { if (!ultimoResultadoDia) { alert("Gere a escala primeiro."); return; } exportExcelFromScale_wrapper(ultimoResultadoDia); });

  // ensure marcar todos button (if HTML has it)
  const btnMarcar = $("#btn-marcar-todos");
  if (btnMarcar) btnMarcar.addEventListener("click", () => {
    const checks = els.listaPresenca ? Array.from(els.listaPresenca.querySelectorAll("input[type='checkbox']")) : [];
    const anyUnchecked = checks.some(c => !c.checked);
    checks.forEach(c => c.checked = anyUnchecked);
    atualizarTotalPresentes();
  });

  // Also add a simple mark/unmark button under the list if the HTML didn't have it (non-intrusive)
  if (!btnMarcar && els.listaPresenca && els.listaPresenca.parentElement) {
    if (!$("#btn-marcar-todos-inject")) {
      const b = document.createElement("button");
      b.id = "btn-marcar-todos-inject";
      b.className = "secondary";
      b.textContent = "Marcar / Desmarcar todos";
      b.style.marginTop = "8px";
      b.addEventListener("click", () => {
        const checks = Array.from(els.listaPresenca.querySelectorAll("input[type='checkbox']"));
        const anyUnchecked = checks.some(c => !c.checked);
        checks.forEach(c => c.checked = anyUnchecked);
        atualizarTotalPresentes();
      });
      els.listaPresenca.parentElement.insertBefore(b, els.listaPresenca);
    }
  }
}

document.addEventListener("DOMContentLoaded", init);
