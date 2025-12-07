/* script.js — versão corrigida (mantém app e adiciona correções solicitadas)
 - Mantém todas as features existentes (rodízio, histórico, print, excel)
 - Corrige Mark All / Unmark All
 - Reintroduz edição manual na pré-visualização (clique em nome para trocar)
 - Só altera JS
*/

// ---------- Storage helpers ----------
const STORAGE = {
  FUNCIONARIOS: "tds_escala_funcionarios",
  LOGO: "tds_escala_logo",
  RODIZIO_OFFSET: "tds_escala_rodizio_offset",
  HISTORICO: "tds_escala_historico"
};

function loadRaw(key){ try { return localStorage.getItem(key); } catch(e){ return null } }
function loadJSON(key){ try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null } catch(e){ return null } }
function saveJSON(key, value){ try { localStorage.setItem(key, JSON.stringify(value)); } catch(e){ console.error(e) } }

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6) }
function todayISO(d=new Date()){ return d.toISOString().slice(0,10) }
function formatDateBR(iso){ if(!iso) return ""; const [y,m,d]=iso.split("-"); return `${d.padStart(2,"0")}/${m.padStart(2,"0")}/${y}` }
function nowBR(){ return new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) }
function weekdayName(dateStr){ if(!dateStr) return ""; const [y,m,d]=dateStr.split("-").map(Number); const dt=new Date(y,m-1,d); const dias=["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"]; return dias[dt.getDay()]; }

// ---------- App state ----------
let funcionarios = loadJSON(STORAGE.FUNCIONARIOS) || [];
// normalize: allow older storage formats (array of strings)
if(Array.isArray(funcionarios) && funcionarios.length && typeof funcionarios[0] === "string"){
  funcionarios = funcionarios.map(name => ({ id: uid(), nome: name }));
  saveJSON(STORAGE.FUNCIONARIOS, funcionarios);
}
let rodizioOffset = Number(loadRaw(STORAGE.RODIZIO_OFFSET) || 0);
let ultimoResultadoDia = null;
let ultimoResultadoSemana = null;

// ---------- DOM shortcuts ----------
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const els = {
  tabsButtons: $$(".tab-button"),
  tabSections: $$(".tab-section"),

  // equipe
  formAddFuncionario: $("#form-add-funcionario"),
  inputNomeFuncionario: $("#nome-funcionario"),
  listaFuncionarios: $("#lista-funcionarios"),
  totalFuncionarios: $("#total-funcionarios"),

  // dia
  dataDia: $("#data-dia"),
  listaPresenca: $("#lista-presenca"),
  totalPresentes: $("#total-presentes"),
  btnGerarDia: $("#btn-gerar-dia"),
  btnSalvarDia: $("#btn-salvar-dia"),
  btnImprimirDia: $("#btn-imprimir-dia"),
  previewDia: $("#preview-dia"),
  printArea: $("#print-area"),
  btnMarcarTodos_html: $("#btn-marcar-todos"), // may be present in html
  btnExportExcelTop: $("#btn-excel-dia"),
  btnExportExcelPreview: $("#btn-excel-preview"),

  // semana / historico
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

// ---------- Tabs ----------
function setupTabs(){
  if(!els.tabsButtons || !els.tabsButtons.length) return;
  els.tabsButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const alvo = btn.getAttribute("data-target");
      els.tabsButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      $$(".tab-section").forEach(sec => sec.classList.remove("active"));
      const target = document.getElementById(alvo);
      if(target) target.classList.add("active");
    });
  });
}

// ---------- Funcionários ----------
function saveFuncionarios(){ saveJSON(STORAGE.FUNCIONARIOS, funcionarios) }
function renderFuncionarios(){
  const ul = els.listaFuncionarios;
  if(!ul) return;
  ul.innerHTML = "";
  if(!funcionarios.length){
    ul.innerHTML = "<li>Nenhum colaborador cadastrado ainda.</li>";
    if(els.totalFuncionarios) els.totalFuncionarios.textContent = "0";
    return;
  }
  funcionarios.forEach(f => {
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
    ul.appendChild(li);
    li.querySelector(".btn-remove").addEventListener("click", () => {
      if(confirm(`Remover ${f.nome} da equipe?`)){
        funcionarios = funcionarios.filter(x => x.id !== f.id);
        saveFuncionarios();
        renderFuncionarios();
        renderListaPresenca();
        renderHistorico();
      }
    });
  });
  if(els.totalFuncionarios) els.totalFuncionarios.textContent = String(funcionarios.length);
}

// ---------- Lista presença ----------
function renderListaPresenca(){
  const ul = els.listaPresenca;
  if(!ul) return;
  ul.innerHTML = "";
  if(!funcionarios.length){
    ul.innerHTML = "<li>Cadastre colaboradores na aba <strong>Equipe</strong>.</li>";
    if(els.totalPresentes) els.totalPresentes.textContent = "0";
    return;
  }
  funcionarios.forEach(f => {
    const li = document.createElement("li");
    li.className = "list-item-row";
    li.innerHTML = `<div class="list-item-main"><input type="checkbox" data-id="${f.id}"><span class="nome">${f.nome}</span></div>`;
    ul.appendChild(li);
  });
  atualizarTotalPresentes();
}

function atualizarTotalPresentes(){
  if(!els.listaPresenca) return;
  const checks = els.listaPresenca.querySelectorAll("input[type='checkbox']");
  let n = 0; checks.forEach(c => { if(c.checked) n++ });
  if(els.totalPresentes) els.totalPresentes.textContent = String(n);
}

// add Mark / Unmark buttons (Opção 1: above list)
function ensureMarkButtonsAboveList(){
  // if HTML already has #btn-marcar-todos, use it and add unmark next to it.
  const container = els.listaPresenca ? els.listaPresenca.parentElement : null;
  if(!container) return;

  // If HTML provided a button #btn-marcar-todos (we referenced earlier), wire it and create unmark if absent
  const btnHtml = $("#btn-marcar-todos");
  if(btnHtml){
    // create unmark if not exists
    if(!$("#btn-desmarcar-todos")){
      const btnUn = document.createElement("button");
      btnUn.id = "btn-desmarcar-todos";
      btnUn.className = "secondary";
      btnUn.textContent = "Desmarcar todos";
      btnHtml.insertAdjacentElement("afterend", btnUn);
      btnUn.addEventListener("click", () => {
        if(!els.listaPresenca) return;
        els.listaPresenca.querySelectorAll("input[type='checkbox']").forEach(c => c.checked = false);
        atualizarTotalPresentes();
      });
    }
    // wire mark button
    btnHtml.addEventListener("click", () => {
      if(!els.listaPresenca) return;
      const checks = Array.from(els.listaPresenca.querySelectorAll("input[type='checkbox']"));
      const anyUnchecked = checks.some(c => !c.checked);
      checks.forEach(c => c.checked = anyUnchecked);
      atualizarTotalPresentes();
    });
    return;
  }

  // otherwise inject both buttons above the list (non-intrusive)
  if(!$("#btn-marcar-todos-inject")){
    const wrap = document.createElement("div");
    wrap.className = "actions-row";
    wrap.style.marginBottom = "8px";
    const b1 = document.createElement("button");
    b1.id = "btn-marcar-todos-inject";
    b1.className = "secondary";
    b1.textContent = "Marcar todos";
    const b2 = document.createElement("button");
    b2.id = "btn-desmarcar-todos-inject";
    b2.className = "secondary";
    b2.textContent = "Desmarcar todos";
    wrap.appendChild(b1); wrap.appendChild(b2);
    container.insertBefore(wrap, els.listaPresenca);
    b1.addEventListener("click", ()=>{ if(!els.listaPresenca) return; els.listaPresenca.querySelectorAll("input[type='checkbox']").forEach(c=>c.checked=true); atualizarTotalPresentes() });
    b2.addEventListener("click", ()=>{ if(!els.listaPresenca) return; els.listaPresenca.querySelectorAll("input[type='checkbox']").forEach(c=>c.checked=false); atualizarTotalPresentes() });
  }
}

// ---------- Escala generation logic (keeps user order of presentes) ----------
function rotateArray(arr, offset){
  const n = arr.length; if(n===0) return [];
  const o = ((offset % n) + n) % n;
  return arr.slice(o).concat(arr.slice(0,o));
}

function getPresentesDoDia(){
  if(!els.listaPresenca) return [];
  const checks = Array.from(els.listaPresenca.querySelectorAll("input[type='checkbox']"));
  const presentes = [];
  checks.forEach(chk => {
    if(chk.checked){
      const id = chk.dataset.id;
      const f = funcionarios.find(x => String(x.id) === String(id));
      if(f) presentes.push(f);
    }
  });
  return presentes;
}

function gerarEscalaParaData(dataISO, presentes, offsetBase){
  const presentesOrdenados = presentes.slice(); // preserve ordering as user checked
  const listaRodizio = rotateArray(presentesOrdenados, offsetBase);
  const roles = {
    bar1: null, bar2: null,
    aparadores: [null,null,null],
    almocoTurma1: [], almocoTurma2: [],
    lancheTurma1: [], lancheTurma2: [], lancheTurma3: []
  };

  if(listaRodizio.length === 0){
    return { dataISO, weekday: weekdayName(dataISO), roles, presentes: [] };
  }

  const pool = listaRodizio.slice();

  if(pool.length>0) roles.bar1 = pool.shift();
  if(pool.length>0) roles.bar2 = pool.shift();

  for(let i=0;i<3;i++){
    if(pool.length>0) roles.aparadores[i] = pool.shift();
  }

  const restantes = pool.slice();
  if(restantes.length>0){
    const metade = Math.ceil(restantes.length/2);
    roles.almocoTurma1 = restantes.slice(0, metade);
    roles.almocoTurma2 = restantes.slice(metade);
    const t1Size = Math.ceil(restantes.length/3);
    const t2Size = Math.ceil((restantes.length - t1Size)/2);
    roles.lancheTurma1 = restantes.slice(0, t1Size);
    roles.lancheTurma2 = restantes.slice(t1Size, t1Size + t2Size);
    roles.lancheTurma3 = restantes.slice(t1Size + t2Size);
  }

  return { dataISO, weekday: weekdayName(dataISO), roles, presentes: presentesOrdenados };
}

// ---------- Render escala document ----------
function renderEscalaDocumento(escala){
  const logoData = loadRaw(STORAGE.LOGO);
  const dataBR = formatDateBR(escala.dataISO);
  const nome = f => (f ? f.nome : "—");
  const mapNomes = list => list && list.length ? list.map(p => p.nome).join(", ") : "—";
  const aparadoresNames = (escala.roles.aparadores || []).map(a => nome(a));

  const html = `
    <article class="escala-documento">
      <header class="escala-header">
        ${logoData ? `<img src="${logoData}" alt="Logo Terra do Sol" />` : ""}
        <h1>BARRACA TERRA DO SOL</h1>
        <h2>Escala Operacional do Dia</h2>
        <p>${escala.weekday} — ${dataBR}</p>
      </header>

      <section class="escala-section">
        <h3>🍽 Almoço</h3>
        <table class="escala-table">
          <thead><tr><th>Turma</th><th>Horário</th><th>Colaboradores</th></tr></thead>
          <tbody>
            <tr><td>1ª Turma</td><td>10:00 → 10:40</td><td class="editable" data-role="almocoTurma1">${mapNomes(escala.roles.almocoTurma1)}</td></tr>
            <tr><td>2ª Turma</td><td>10:40 → 11:20</td><td class="editable" data-role="almocoTurma2">${mapNomes(escala.roles.almocoTurma2)}</td></tr>
          </tbody>
        </table>
      </section>

      <section class="escala-section">
        <h3>☕ Lanche</h3>
        <table class="escala-table">
          <thead><tr><th>Turma</th><th>Horário</th><th>Colaboradores</th></tr></thead>
          <tbody>
            <tr><td>1ª Turma</td><td>15:00 → 15:20</td><td class="editable" data-role="lancheTurma1">${mapNomes(escala.roles.lancheTurma1)}</td></tr>
            <tr><td>2ª Turma</td><td>15:20 → 15:40</td><td class="editable" data-role="lancheTurma2">${mapNomes(escala.roles.lancheTurma2)}</td></tr>
            <tr><td>3ª Turma</td><td>15:40 → 16:00</td><td class="editable" data-role="lancheTurma3">${mapNomes(escala.roles.lancheTurma3)}</td></tr>
          </tbody>
        </table>
      </section>

      <section class="escala-section">
        <h3>🧺 Aparadores & Setores</h3>
        <table class="escala-table">
          <tbody>
            <tr><td>Salão + Coqueiro direito</td><td class="editable" data-role="aparadores" data-index="0">${aparadoresNames[0]||'—'}</td></tr>
            <tr><td>Praia direita + Parquinho</td><td class="editable" data-role="aparadores" data-index="1">${aparadoresNames[1]||'—'}</td></tr>
            <tr><td>Coqueiro esquerdo + Praia esquerda</td><td class="editable" data-role="aparadores" data-index="2">${aparadoresNames[2]||'—'}</td></tr>
          </tbody>
        </table>
      </section>

      <section class="escala-section">
        <h3>🍹 Bar</h3>
        <table class="escala-table">
          <tbody>
            <tr><td>Bar 1</td><td class="editable" data-role="bar1">${nome(escala.roles.bar1)}</td></tr>
            <tr><td>Bar 2</td><td class="editable" data-role="bar2">${nome(escala.roles.bar2)}</td></tr>
          </tbody>
        </table>
      </section>

      <section class="escala-section">
        <h3>👥 Total de colaboradores na escala</h3>
        <p><small>Presentes considerados: ${escala.presentes ? escala.presentes.length : 0} pessoas</small></p>
      </section>
    </article>
  `;
  const container = document.createElement("div");
  container.innerHTML = html.trim();
  return container.firstElementChild;
}

// ---------- Click-to-edit on preview (manual edit) ----------
function enablePreviewEditing(previewContainer, escalaObj){
  if(!previewContainer) return;
  // delegate clicks on elements with class editable
  previewContainer.querySelectorAll(".editable").forEach(td => {
    td.style.cursor = "pointer";
    td.title = "Clique para editar esta função";
  });

  previewContainer.addEventListener("click", function onClick(e){
    const td = e.target.closest(".editable");
    if(!td) return;
    // determine role and index if present
    const role = td.dataset.role;
    const idx = td.dataset.index !== undefined ? Number(td.dataset.index) : null;

    // build list of presentes to choose from
    const presentes = escalaObj.presentes || [];
    // also allow '—' (empty) option
    const options = [{label: "— (limpar)", value: ""}].concat(presentes.map(p => ({ label: p.nome, value: p.id })));

    // create a small modal-like prompt using prompt/select flow
    let promptText = `Escolha substituto para ${td.textContent}\n\n`;
    options.forEach((o, i) => { promptText += `${i}: ${o.label}\n` });
    const choice = prompt(promptText + "\nDigite o número da opção desejada (ex: 0, 1, 2):", "0");
    if(choice === null) return; // cancel
    const c = parseInt(choice, 10);
    if(isNaN(c) || c < 0 || c >= options.length) { alert("Escolha inválida"); return; }
    const selected = options[c];

    // apply change: if role is array (almocoTurma1 etc) we allow replacing whole cell with single selected or empty
    const applyChange = (roleKey, index, selectedValue) => {
      if(roleKey === "aparadores" && index !== null){
        // aparadores is array of 3 single persons
        escalaObj.roles.aparadores[index] = selectedValue ? funcionarios.find(f => f.id === selectedValue) : null;
      } else if(roleKey === "bar1" || roleKey === "bar2"){
        escalaObj.roles[roleKey] = selectedValue ? funcionarios.find(f => f.id === selectedValue) : null;
      } else if(roleKey.startsWith("almoco") || roleKey.startsWith("lanche")){
        // store single selection as array with one or empty
        if(selectedValue){
          escalaObj.roles[roleKey] = [ funcionarios.find(f => f.id === selectedValue) ];
        } else {
          escalaObj.roles[roleKey] = [];
        }
      } else {
        // fallback: set to empty
      }
    };

    applyChange(role, idx, selected.value || "");
    // re-render preview container with edited escalaObj
    previewContainer.innerHTML = "";
    previewContainer.appendChild(renderEscalaDocumento(escalaObj));
    // re-enable editing on new DOM
    enablePreviewEditing(previewContainer, escalaObj);
  });
}

// ---------- Generate / save / print actions ----------
function actionGerarDia(){
  const dataISO = (els.dataDia && els.dataDia.value) || todayISO();
  const presentes = getPresentesDoDia();
  if(presentes.length < 1){
    if(!confirm("Você não selecionou ninguém. Continuar mesmo assim?")) return;
  }
  const escala = gerarEscalaParaData(dataISO, presentes, rodizioOffset);
  ultimoResultadoDia = escala;
  if(els.previewDia){
    els.previewDia.innerHTML = "";
    els.previewDia.classList.remove("empty");
    els.previewDia.appendChild(renderEscalaDocumento(escala));
    // enable manual edit on preview
    enablePreviewEditing(els.previewDia, escala);
  }
  if(els.btnSalvarDia) els.btnSalvarDia.disabled = false;
  if(els.btnImprimirDia) els.btnImprimirDia.disabled = false;
  if(els.btnExportExcelPreview) els.btnExportExcelPreview.disabled = false;
  rodizioOffset = Number(rodizioOffset) + 1;
  try { localStorage.setItem(STORAGE.RODIZIO_OFFSET, String(rodizioOffset)); } catch(e){}
}

function actionSalvarDia(){
  if(!ultimoResultadoDia) return;
  const hist = loadJSON(STORAGE.HISTORICO) || {};
  hist[ultimoResultadoDia.dataISO] = ultimoResultadoDia;
  saveJSON(STORAGE.HISTORICO, hist);
  alert("Escala do dia salva no histórico.");
  renderHistorico();
}

function actionImprimirDia(){
  if(!ultimoResultadoDia) return;
  // build print area: header with logo + generation time
  els.printArea.innerHTML = "";
  const header = document.createElement("div");
  header.style.textAlign = "center";
  const logoData = loadRaw(STORAGE.LOGO);
  if(logoData){
    const img = document.createElement("img");
    img.src = logoData;
    img.style.maxWidth = "220px";
    img.style.maxHeight = "110px";
    img.style.objectFit = "contain";
    header.appendChild(img);
  }
  const info = document.createElement("div");
  info.innerHTML = `<h1 style="margin:6px 0">BARRACA TERRA DO SOL</h1>
    <div style="font-size:13px">${weekdayName(ultimoResultadoDia.dataISO)} — ${formatDateBR(ultimoResultadoDia.dataISO)}</div>
    <div style="font-size:11px;color:#444;margin-top:4px">${nowBR()}</div>`;
  header.appendChild(info);
  els.printArea.appendChild(header);
  els.printArea.appendChild(renderEscalaDocumento(ultimoResultadoDia));
  window.print();
}

// ---------- Historico ----------
function renderHistorico(){
  const ul = els.listaHistorico;
  if(!ul) return;
  const hist = loadJSON(STORAGE.HISTORICO) || {};
  const keys = Object.keys(hist).sort().reverse();
  ul.innerHTML = "";
  if(!keys.length){ ul.innerHTML = "<li>Nenhuma escala salva ainda.</li>"; return; }
  keys.forEach(k => {
    const escala = hist[k];
    const li = document.createElement("li");
    li.className = "list-item-row";
    const main = document.createElement("div");
    main.className = "list-item-main";
    main.innerHTML = `<span class="nome">${formatDateBR(k)} — ${weekdayName(k)}</span><small class="historico-meta">Presentes: ${escala.presentes ? escala.presentes.length : 0}</small>`;
    const actions = document.createElement("div"); actions.className = "list-item-actions";
    const btnVer = document.createElement("button"); btnVer.className = "secondary small"; btnVer.textContent = "Ver / Imprimir";
    btnVer.addEventListener("click", () => {
      ultimoResultadoDia = escala;
      if(els.previewDia){ els.previewDia.innerHTML = ""; els.previewDia.appendChild(renderEscalaDocumento(escala)); enablePreviewEditing(els.previewDia, escala); }
      // switch to day tab programmatically
      const btn = document.querySelector('.tab-button[data-target="section-dia"]');
      if(btn) btn.click();
    });
    const btnDel = document.createElement("button"); btnDel.className = "danger small"; btnDel.textContent = "Apagar";
    btnDel.addEventListener("click", () => {
      if(confirm(`Apagar escala de ${formatDateBR(k)} do histórico?`)){
        const h = loadJSON(STORAGE.HISTORICO) || {};
        delete h[k];
        saveJSON(STORAGE.HISTORICO, h);
        renderHistorico();
      }
    });
    actions.appendChild(btnVer); actions.appendChild(btnDel);
    li.appendChild(main); li.appendChild(actions);
    ul.appendChild(li);
  });
}

// ---------- Export CSV/Excel (single sheet) ----------
function exportScaleToCSV(escala){
  if(!escala){ alert("Gere a escala antes."); return; }
  const rows = [];
  rows.push(["Escala Terra do Sol"]);
  rows.push([`${weekdayName(escala.dataISO)} — ${formatDateBR(escala.dataISO)}`]);
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

// ---------- Setup event listeners ----------
function setupListeners(){
  // Tabs
  setupTabs();

  // Logo handlers
  if(els.inputLogo) els.inputLogo.addEventListener("change", e => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => { try { localStorage.setItem(STORAGE.LOGO, ev.target.result); } catch(e){}; renderLogoPreview(); };
    reader.readAsDataURL(file);
  });
  if(els.btnRemoverLogo) els.btnRemoverLogo.addEventListener("click", () => { if(confirm("Remover logo atual?")){ localStorage.removeItem(STORAGE.LOGO); renderLogoPreview(); } });

  // Rodizio reset
  if(els.btnResetRodizio) els.btnResetRodizio.addEventListener("click", () => {
    if(confirm("Resetar rodízio? Isso faz a contagem voltar ao início.")){
      rodizioOffset = 0; localStorage.setItem(STORAGE.RODIZIO_OFFSET, "0"); alert("Rodízio resetado.");
    }
  });

  // Add funcionario
  if(els.formAddFuncionario){
    els.formAddFuncionario.addEventListener("submit", (e) => {
      e.preventDefault();
      const nome = (els.inputNomeFuncionario && els.inputNomeFuncionario.value || "").trim();
      if(!nome) return;
      const novo = { id: uid(), nome };
      funcionarios.push(novo);
      saveFuncionarios();
      if(els.inputNomeFuncionario) els.inputNomeFuncionario.value = "";
      renderFuncionarios();
      renderListaPresenca();
    });
  }

  // presence change
  if(els.listaPresenca) els.listaPresenca.addEventListener("change", atualizarTotalPresentes);

  // ensure mark/unmark
  ensureMarkButtonsAboveList();

  // gerar / salvar / imprimir
  if(els.btnGerarDia) els.btnGerarDia.addEventListener("click", actionGerarDia);
  if(els.btnSalvarDia) els.btnSalvarDia.addEventListener("click", actionSalvarDia);
  if(els.btnImprimirDia) els.btnImprimirDia.addEventListener("click", actionImprimirDia);

  // export excel (two buttons possible)
  const btnTop = $("#btn-excel-dia");
  const btnPrev = $("#btn-excel-preview");
  if(btnTop) btnTop.addEventListener("click", () => { if(!ultimoResultadoDia){ alert("Gere a escala primeiro."); return } exportScaleToCSV(ultimoResultadoDia) });
  if(btnPrev) btnPrev.addEventListener("click", () => { if(!ultimoResultadoDia){ alert("Gere a escala primeiro."); return } exportScaleToCSV(ultimoResultadoDia) });

  // histórico delete all
  if(els.btnApagarHistorico) els.btnApagarHistorico.addEventListener("click", () => {
    if(confirm("Tem certeza que deseja apagar TODO o histórico de escalas? Essa ação não pode ser desfeita.")){
      saveJSON(STORAGE.HISTORICO, {}); renderHistorico();
    }
  });
}

// ---------- Init ----------
function init(){
  // default dates
  if(els.dataDia && !els.dataDia.value) els.dataDia.value = todayISO();
  if(els.dataSemana && !els.dataSemana.value) els.dataSemana.value = todayISO();

  renderLogoPreview();
  renderFuncionarios();
  renderListaPresenca();
  renderHistorico();
  setupListeners();
}

document.addEventListener("DOMContentLoaded", init);
