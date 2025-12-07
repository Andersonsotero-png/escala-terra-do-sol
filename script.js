// script.js — versão final unificada (substitua todo o seu script.js por este)

// -------------------- utilitários --------------------
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const todayISO = d => (d || new Date()).toISOString().slice(0,10);
function formatDateBR(iso){ if(!iso) return ""; const [y,m,d]=iso.split("-"); return `${d.padStart(2,"0")}/${m.padStart(2,"0")}/${y}`; }
function weekdayName(iso){ if(!iso) return ""; const [y,m,d]=iso.split("-").map(Number); return ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"][new Date(y,m-1,d).getDay()]; }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

// -------------------- storage keys --------------------
const SK = {
  FUNC: "tds_escala_funcionarios",
  LOGO: "tds_escala_logo",
  ROD: "tds_escala_rodizio_offset",
  HIST: "tds_escala_historico",
  ASSIGN: "tds_escala_assignments"
};

function loadJSON(k, fallback){ try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : fallback; } catch(e){ return fallback; } }
function saveJSON(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){ console.error(e); } }
function loadRaw(k){ return localStorage.getItem(k); }
function saveRaw(k,v){ try { if(v===null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch(e){} }

// -------------------- estado --------------------
let funcionarios = loadJSON(SK.FUNC, []);
// normalize older array-of-strings -> object form
if (Array.isArray(funcionarios) && funcionarios.length && typeof funcionarios[0] === "string"){
  funcionarios = funcionarios.map(name => ({ id: uid(), nome: name }));
  saveJSON(SK.FUNC, funcionarios);
}
let rodizioOffset = Number(loadRaw(SK.ROD) || 0);
let historico = loadJSON(SK.HIST, {});
let assignments = loadJSON(SK.ASSIGN, {}); // custom manual assignments
let ultimoResultadoDia = null;
let ultimoResultadoSemana = null;

// -------------------- tabs (fix) --------------------
$$(".tab-button").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    $$(".tab-button").forEach(b=>b.classList.remove("active"));
    $$(".tab-section").forEach(s=>s.classList.remove("active"));
    btn.classList.add("active");
    const tgt = btn.getAttribute("data-target");
    const sec = document.getElementById(tgt);
    if(sec) sec.classList.add("active");
  });
});

// -------------------- elementos uteis --------------------
const els = {
  // equipe
  formAdd: $("#form-add-funcionario"),
  inputNome: $("#nome-funcionario"),
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
  // semana
  dataSemana: $("#data-semana"),
  btnGerarSemana: $("#btn-gerar-semana"),
  previewSemana: $("#preview-semana"),
  btnImprimirSemana: $("#btn-imprimir-semana"),
  // historico
  listaHistorico: $("#lista-historico"),
  btnApagarHistorico: $("#btn-apagar-historico"),
  // config
  inputLogo: $("#input-logo"),
  logoPreviewContainer: $("#logo-preview-container"),
  btnRemoverLogo: $("#btn-remover-logo"),
  btnResetRodizio: $("#btn-reset-rodizio")
};

// -------------------- funções de storage --------------------
function saveFuncionarios(){ saveJSON(SK.FUNC, funcionarios); }
function saveRodizio(){ saveRaw(SK.ROD, String(rodizioOffset)); }
function saveHistorico(){ saveJSON(SK.HIST, historico); }
function saveAssignments(){ saveJSON(SK.ASSIGN, assignments); }
function loadLogo(){ return loadRaw(SK.LOGO); }
function saveLogo(dataUrl){ saveRaw(SK.LOGO, dataUrl); }

// -------------------- render funcionários --------------------
function renderFuncionarios(){
  const ul = els.listaFuncionarios;
  if(!ul) return;
  ul.innerHTML = "";
  if(!funcionarios.length){
    ul.innerHTML = "<li>Nenhum colaborador cadastrado ainda.</li>";
  } else {
    funcionarios.slice().sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR")).forEach(f=>{
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
      li.querySelector(".btn-remove").addEventListener("click", ()=>{
        if(confirm(`Remover ${f.nome} da equipe?`)){
          funcionarios = funcionarios.filter(x => x.id !== f.id);
          saveFuncionarios(); renderFuncionarios(); renderListaPresenca(); renderFuncoesUI(); renderHistorico();
        }
      });
    });
  }
  if(els.totalFuncionarios) els.totalFuncionarios.textContent = String(funcionarios.length);
}

// -------------------- presença (com toolbar marcar/desmarcar) --------------------
function renderListaPresenca(){
  const ul = els.listaPresenca;
  if(!ul) return;
  ul.innerHTML = "";

  // toolbar
  const toolbarLi = document.createElement("li");
  toolbarLi.style.listStyle = "none";
  const toolbar = document.createElement("div");
  toolbar.className = "presence-toolbar";
  toolbar.style.display = "flex";
  toolbar.style.gap = "8px";
  toolbar.style.marginBottom = "6px";

  const btnMarkAll = document.createElement("button");
  btnMarkAll.className = "small secondary";
  btnMarkAll.textContent = "Marcar todos";
  btnMarkAll.onclick = ()=>{ ul.querySelectorAll("input[type='checkbox']").forEach(c=>c.checked=true); atualizarTotalPresentes(); };

  const btnUnmarkAll = document.createElement("button");
  btnUnmarkAll.className = "small secondary";
  btnUnmarkAll.textContent = "Desmarcar todos";
  btnUnmarkAll.onclick = ()=>{ ul.querySelectorAll("input[type='checkbox']").forEach(c=>c.checked=false); atualizarTotalPresentes(); };

  toolbar.appendChild(btnMarkAll); toolbar.appendChild(btnUnmarkAll);
  toolbarLi.appendChild(toolbar);
  ul.appendChild(toolbarLi);

  if(!funcionarios.length){
    const li = document.createElement("li");
    li.innerHTML = "<em>Cadastre colaboradores na aba <strong>Equipe</strong>.</em>";
    ul.appendChild(li);
    if(els.totalPresentes) els.totalPresentes.textContent = "0";
    return;
  }

  funcionarios.slice().sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR")).forEach(f=>{
    const li = document.createElement("li");
    li.className = "list-item-row";
    const main = document.createElement("div");
    main.className = "list-item-main";
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.dataset.id = f.id;
    chk.id = `presenca_${f.id}`;
    const span = document.createElement("span");
    span.className = "nome";
    span.textContent = f.nome;
    main.appendChild(chk); main.appendChild(span);
    li.appendChild(main);
    ul.appendChild(li);
  });

  atualizarTotalPresentes();
}

function atualizarTotalPresentes(){
  if(!els.totalPresentes) return;
  const checks = (els.listaPresenca ? els.listaPresenca.querySelectorAll("input[type='checkbox']") : []);
  let n=0; checks.forEach(c=>{ if(c.checked) n++ });
  els.totalPresentes.textContent = String(n);
}

if(els.listaPresenca) els.listaPresenca.addEventListener("change", atualizarTotalPresentes);

function getPresentesDoDia(){
  if(!els.listaPresenca) return [];
  const checks = els.listaPresenca.querySelectorAll("input[type='checkbox']");
  const presentes = [];
  checks.forEach(chk=>{
    if(chk.checked){
      const id = String(chk.dataset.id);
      const f = funcionarios.find(x => String(x.id) === id);
      if(f) presentes.push(f);
    }
  });
  return presentes;
}

// -------------------- funções UI (seleção por role) --------------------
function ensureFuncoesContainer(){
  const sectionDia = document.getElementById("section-dia");
  if(!sectionDia) return;
  let card = sectionDia.querySelector("#card-funcoes");
  if(!card){
    card = document.createElement("section");
    card.id = "card-funcoes";
    card.className = "card";
    const previewCard = sectionDia.querySelector(".preview-card");
    if(previewCard && previewCard.parentNode) previewCard.parentNode.insertBefore(card, previewCard);
    else sectionDia.appendChild(card);
  }
  card.innerHTML = "<h3>Funções & Atribuições (defina quantidade e selecione)</h3><div id='funcoes-list'></div>";
  renderFuncoesUI();
}

function renderFuncoesUI(){
  const container = document.getElementById("funcoes-list");
  if(!container) return;
  container.innerHTML = "";

  // BAR (2)
  const barRow = document.createElement("div");
  barRow.className = "func-row";
  barRow.style.display="flex"; barRow.style.justifyContent="space-between"; barRow.style.marginBottom="8px";
  barRow.innerHTML = `<div><strong>Bar</strong> <small>(2 posições)</small></div>`;
  const barActions = document.createElement("div");
  const btnSelBar = document.createElement("button"); btnSelBar.className="small secondary"; btnSelBar.textContent="Selecionar";
  btnSelBar.onclick = ()=> openSelectionModal("bar",2,"Selecione até 2 pessoas para o Bar");
  barActions.appendChild(btnSelBar);
  const spanBar = document.createElement("div"); spanBar.id="sel-bar"; spanBar.style.marginLeft="8px";
  barActions.appendChild(spanBar);
  barRow.appendChild(barActions);
  container.appendChild(barRow);

  // APARADORES (3)
  const apaRow = document.createElement("div");
  apaRow.className="func-row"; apaRow.style.display="flex"; apaRow.style.justifyContent="space-between"; apaRow.style.marginBottom="8px";
  apaRow.innerHTML = `<div><strong>Aparadores</strong> <small>(3 posições)</small></div>`;
  const apaActions = document.createElement("div");
  const btnSelApa = document.createElement("button"); btnSelApa.className="small secondary"; btnSelApa.textContent="Selecionar";
  btnSelApa.onclick = ()=> openSelectionModal("aparadores",3,"Selecione até 3 aparadores");
  apaActions.appendChild(btnSelApa);
  const spanApa = document.createElement("div"); spanApa.id="sel-aparadores"; spanApa.style.marginLeft="8px";
  apaActions.appendChild(spanApa);
  apaRow.appendChild(apaActions);
  container.appendChild(apaRow);

  // ALMOÇO (2 turmas)
  const almRow = document.createElement("div"); almRow.className="func-row"; almRow.style.display="block"; almRow.style.marginBottom="8px";
  almRow.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between"><div><strong>Almoço</strong> <small>(defina manualmente por turma)</small></div><div><button class="small secondary" id="btn-sel-almoco">Selecionar turmas</button></div></div><div style="margin-top:6px"><small id="sel-almoco" style="color:#374151"></small></div>`;
  container.appendChild(almRow);
  document.getElementById("btn-sel-almoco").addEventListener("click", ()=> openMultiGroupModal("almoco",2,["turma1","turma2"],"Selecione pessoas para cada turma de Almoço"));

  // LANCHE (3 turmas)
  const lanRow = document.createElement("div"); lanRow.className="func-row"; lanRow.style.display="block"; lanRow.style.marginBottom="8px";
  lanRow.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between"><div><strong>Lanche</strong> <small>(3 turmas)</small></div><div><button class="small secondary" id="btn-sel-lanche">Selecionar turmas</button></div></div><div style="margin-top:6px"><small id="sel-lanche" style="color:#374151"></small></div>`;
  container.appendChild(lanRow);
  document.getElementById("btn-sel-lanche").addEventListener("click", ()=> openMultiGroupModal("lanche",3,["t1","t2","t3"],"Selecione pessoas para cada turma de Lanche"));

  updateSelectedSummaries();
}

function barToNames(listIds){
  if(!listIds || !listIds.length) return "Nenhum";
  return listIds.map(id => (funcionarios.find(f=>String(f.id)===String(id))||{nome:"—"}).nome).join(", ");
}
function idListToNames(listIds){
  if(!listIds || !listIds.length) return "Nenhum";
  return listIds.map(id => (funcionarios.find(f=>String(f.id)===String(id))||{nome:"—"}).nome).join(", ");
}

function updateSelectedSummaries(){
  const bar = assignments.bar || [];
  const apa = assignments.aparadores || [];
  const alm = assignments.almoco || {};
  const lan = assignments.lanche || {};
  const elBar = document.getElementById("sel-bar");
  const elApa = document.getElementById("sel-aparadores");
  const elAlm = document.getElementById("sel-almoco");
  const elLan = document.getElementById("sel-lanche");
  if(elBar) elBar.textContent = bar.length ? barToNames(bar) : "Nenhum";
  if(elApa) elApa.textContent = apa.length ? idListToNames(apa) : "Nenhum";
  if(elAlm) elAlm.textContent = `Turma1: ${alm.turma1? idListToNames(alm.turma1):"—"} — Turma2: ${alm.turma2? idListToNames(alm.turma2):"—"}`;
  if(elLan) elLan.textContent = `T1: ${lan.t1? idListToNames(lan.t1):"—"} — T2: ${lan.t2? idListToNames(lan.t2):"—"} — T3: ${lan.t3? idListToNames(lan.t3):"—"}`;
}

// -------------------- modais de seleção --------------------
function openSelectionModal(roleKey, limit, title){
  const presentes = getPresentesDoDia();
  const pool = (presentes.length ? presentes : funcionarios).slice().sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR"));

  const overlay = document.createElement("div"); overlay.className="sel-overlay";
  Object.assign(overlay.style,{position:"fixed",left:0,top:0,right:0,bottom:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999});
  const box = document.createElement("div"); box.className="sel-box"; Object.assign(box.style,{background:"#fff",padding:"12px",borderRadius:"8px",width:"92%",maxWidth:"480px",maxHeight:"86%",overflow:"auto"});

  box.innerHTML = `<h3 style="margin:0 0 8px 0">${title}</h3><div style="margin-bottom:8px"><small>Limite: ${limit} pessoa(s)</small></div>`;
  const list = document.createElement("div"); list.style.display="grid"; list.style.gap="6px";

  const current = assignments[roleKey] ? assignments[roleKey].slice() : [];

  pool.forEach(p=>{
    const row = document.createElement("label"); row.style.display="flex"; row.style.alignItems="center"; row.style.gap="8px"; row.style.cursor="pointer";
    const chk = document.createElement("input"); chk.type="checkbox"; chk.dataset.id = p.id;
    if(current.includes(p.id)) chk.checked = true;
    row.appendChild(chk); row.appendChild(document.createTextNode(p.nome));
    list.appendChild(row);
  });

  box.appendChild(list);
  const actions = document.createElement("div"); actions.style.display="flex"; actions.style.gap="8px"; actions.style.marginTop="10px"; actions.style.justifyContent="flex-end";
  const btnCancel = document.createElement("button"); btnCancel.className="secondary small"; btnCancel.textContent="Cancelar"; btnCancel.onclick = ()=>document.body.removeChild(overlay);
  const btnSave = document.createElement("button"); btnSave.className="primary small"; btnSave.textContent="Salvar seleção";
  btnSave.onclick = ()=>{
    const checks = list.querySelectorAll("input[type='checkbox']");
    const chosen = [];
    checks.forEach(c=>{ if(c.checked) chosen.push(String(c.dataset.id)); });
    if(chosen.length>limit){ alert(`Você selecionou ${chosen.length} pessoas. O limite é ${limit}.`); return; }
    if(roleKey==="bar") assignments.bar = chosen.slice(0,2);
    else if(roleKey==="aparadores") assignments.aparadores = chosen.slice(0,3);
    else assignments[roleKey] = chosen;
    saveAssignments();
    updateSelectedSummaries();
    document.body.removeChild(overlay);
  };
  actions.appendChild(btnCancel); actions.appendChild(btnSave); box.appendChild(actions);
  overlay.appendChild(box); document.body.appendChild(overlay);
}

function openMultiGroupModal(roleKey, groupsCount, groupKeys, title){
  const presentes = getPresentesDoDia();
  const pool = (presentes.length ? presentes : funcionarios).slice().sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR"));
  const overlay = document.createElement("div"); overlay.className="sel-overlay";
  Object.assign(overlay.style,{position:"fixed",left:0,top:0,right:0,bottom:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999});
  const box = document.createElement("div"); box.className="sel-box"; Object.assign(box.style,{background:"#fff",padding:"12px",borderRadius:"8px",width:"96%",maxWidth:"900px",maxHeight:"86%",overflow:"auto"});
  box.innerHTML = `<h3 style="margin:0 0 8px 0">${title}</h3><div style="margin-bottom:8px"><small>Selecione manualmente os colaboradores para cada turma.</small></div>`;

  const existing = assignments[roleKey] || {};
  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = `repeat(${groupsCount}, 1fr)`;
  grid.style.gap = "12px";

  for(let g=0; g<groupsCount; g++){
    const key = groupKeys[g];
    const col = document.createElement("div"); Object.assign(col.style,{border:"1px solid #eee",padding:"8px",borderRadius:"6px"});
    const titleEl = document.createElement("div"); titleEl.innerHTML = `<strong>${roleKey==="almoco"?`Turma ${g+1}`:`T${g+1}`}</strong>`; titleEl.style.marginBottom="6px";
    col.appendChild(titleEl);
    const list = document.createElement("div"); list.style.display="grid"; list.style.gap="6px";
    pool.forEach(p=>{
      const lbl = document.createElement("label"); lbl.style.display="flex"; lbl.style.gap="8px"; lbl.style.alignItems="center";
      const chk = document.createElement("input"); chk.type="checkbox"; chk.dataset.id = p.id;
      const arr = existing[key] || [];
      if(arr.includes(p.id)) chk.checked = true;
      lbl.appendChild(chk); lbl.appendChild(document.createTextNode(p.nome));
      list.appendChild(lbl);
    });
    col.appendChild(list); grid.appendChild(col);
  }

  box.appendChild(grid);
  const actions = document.createElement("div"); Object.assign(actions.style,{display:"flex",gap:"8px",marginTop:"10px",justifyContent:"flex-end"});
  const btnCancel = document.createElement("button"); btnCancel.className="secondary small"; btnCancel.textContent="Cancelar"; btnCancel.onclick = ()=>document.body.removeChild(overlay);
  const btnSave = document.createElement("button"); btnSave.className="primary small"; btnSave.textContent="Salvar turmas";
  btnSave.onclick = ()=>{
    const newObj = {};
    for(let i=0;i<grid.children.length;i++){
      const checks = grid.children[i].querySelectorAll("input[type='checkbox']");
      const chosen = [];
      checks.forEach(c=>{ if(c.checked) chosen.push(String(c.dataset.id)); });
      newObj[groupKeys[i]] = chosen;
    }
    assignments[roleKey] = newObj;
    saveAssignments();
    updateSelectedSummaries();
    document.body.removeChild(overlay);
  };
  actions.appendChild(btnCancel); actions.appendChild(btnSave); box.appendChild(actions);
  overlay.appendChild(box); document.body.appendChild(overlay);
}

// -------------------- lógica de geração de escala (usa assignments quando presentes) --------------------
function rotateArray(arr, offset){
  const n = arr.length; if(n===0) return []; const o = ((offset % n)+n)%n; return arr.slice(o).concat(arr.slice(0,o));
}

function gerarEscalaParaData(dataISO, presentes, offsetBase){
  const presentesOrdenados = (presentes||[]).slice();
  // não ordenar alfabeticamente por padrão: usar ordem dos presentes (o usuário controla)
  const listaRodizio = rotateArray(presentesOrdenados, offsetBase);

  const roles = {
    bar1:null, bar2:null,
    aparadores:[null,null,null],
    almocoTurma1:[], almocoTurma2:[],
    lancheTurma1:[], lancheTurma2:[], lancheTurma3:[]
  };

  if(!listaRodizio.length) return { dataISO, weekday: weekdayName(dataISO), roles, presentes: [] };

  // map presentes por id para assignment lookup
  const presentesById = {};
  presentesOrdenados.forEach(p => { presentesById[String(p.id)] = p; });

  // APLICAR ASSIGNMENTS SE EXISTIREM
  if(assignments.bar && Array.isArray(assignments.bar)){
    roles.bar1 = presentesById[String(assignments.bar[0])] || null;
    roles.bar2 = presentesById[String(assignments.bar[1])] || null;
  }
  if(assignments.aparadores && Array.isArray(assignments.aparadores)){
    for(let i=0;i<3;i++) roles.aparadores[i] = presentesById[String(assignments.aparadores[i])] || null;
  }
  if(assignments.almoco){
    roles.almocoTurma1 = (assignments.almoco.turma1||[]).map(id=>presentesById[String(id)]).filter(Boolean);
    roles.almocoTurma2 = (assignments.almoco.turma2||[]).map(id=>presentesById[String(id)]).filter(Boolean);
  }
  if(assignments.lanche){
    roles.lancheTurma1 = (assignments.lanche.t1||[]).map(id=>presentesById[String(id)]).filter(Boolean);
    roles.lancheTurma2 = (assignments.lanche.t2||[]).map(id=>presentesById[String(id)]).filter(Boolean);
    roles.lancheTurma3 = (assignments.lanche.t3||[]).map(id=>presentesById[String(id)]).filter(Boolean);
  }

  // REMOVER USADOS DO POOL E COMPLETAR COM RODÍZIO
  const used = new Set();
  ["bar1","bar2"].forEach(k=>{ if(roles[k]) used.add(String(roles[k].id)); });
  roles.aparadores.forEach(p=>{ if(p) used.add(String(p.id)); });
  roles.almocoTurma1.forEach(p=>{ if(p) used.add(String(p.id)); });
  roles.almocoTurma2.forEach(p=>{ if(p) used.add(String(p.id)); });
  roles.lancheTurma1.forEach(p=>{ if(p) used.add(String(p.id)); });
  roles.lancheTurma2.forEach(p=>{ if(p) used.add(String(p.id)); });
  roles.lancheTurma3.forEach(p=>{ if(p) used.add(String(p.id)); });

  const pool = listaRodizio.filter(p => !used.has(String(p.id)));

  if(!roles.bar1 && pool.length>0) roles.bar1 = pool.shift();
  if(!roles.bar2 && pool.length>0) roles.bar2 = pool.shift();

  for(let i=0;i<3;i++){
    if(!roles.aparadores[i] && pool.length>0) roles.aparadores[i] = pool.shift();
  }

  const restantes = pool.slice();

  // Almoço (se não predefinido)
  if((!roles.almocoTurma1 || roles.almocoTurma1.length===0) && (!roles.almocoTurma2 || roles.almocoTurma2.length===0)){
    if(restantes.length>0){
      const metade = Math.ceil(restantes.length/2);
      roles.almocoTurma1 = restantes.slice(0,metade);
      roles.almocoTurma2 = restantes.slice(metade);
    }
  }

  // Lanche (se não predefinido)
  if((!roles.lancheTurma1||roles.lancheTurma1.length===0) && (!roles.lancheTurma2||roles.lancheTurma2.length===0) && (!roles.lancheTurma3||roles.lancheTurma3.length===0)){
    if(restantes.length>0){
      const t1 = Math.ceil(restantes.length/3);
      const t2 = Math.ceil((restantes.length - t1)/2);
      roles.lancheTurma1 = restantes.slice(0,t1);
      roles.lancheTurma2 = restantes.slice(t1, t1+t2);
      roles.lancheTurma3 = restantes.slice(t1+t2);
    }
  }

  return { dataISO, weekday: weekdayName(dataISO), roles, presentes: presentesOrdenados };
}

// -------------------- render escala (HTML) --------------------
function renderEscalaDocumento(escala){
  const logo = loadLogo();
  const dataBR = formatDateBR(escala.dataISO);
  const nome = f => (f ? f.nome : "—");
  const mapNomes = list => list && list.length ? list.map(p => p? p.nome : "—").join(", ") : "—";
  const aparadores = (escala.roles.aparadores || []).map(a => nome(a));

  const html = `
    <article class="escala-documento">
      <header class="escala-header">
        ${logo ? `<img src="${logo}" alt="Logo Terra do Sol" />` : ""}
        <h1>BARRACA TERRA DO SOL</h1>
        <h2>Escala Operacional do Dia</h2>
        <p>${escala.weekday} — ${dataBR}</p>
      </header>

      <section class="escala-section">
        <h3>🍽 Almoço</h3>
        <small>Tempo: 40 minutos cada turma</small>
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
        <small>Tempo: 20 minutos cada turma</small>
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
          <thead><tr><th>Setor</th><th>Responsável</th></tr></thead>
          <tbody>
            <tr><td>Salão + Coqueiro direito</td><td class="editable" data-role="aparadores" data-index="0">${aparadores[0]||'—'}</td></tr>
            <tr><td>Praia direita + Parquinho</td><td class="editable" data-role="aparadores" data-index="1">${aparadores[1]||'—'}</td></tr>
            <tr><td>Coqueiro esquerdo + Praia esquerda</td><td class="editable" data-role="aparadores" data-index="2">${aparadores[2]||'—'}</td></tr>
          </tbody>
        </table>
      </section>

      <section class="escala-section">
        <h3>🍹 Bar</h3>
        <table class="escala-table">
          <thead><tr><th>Posição</th><th>Responsável</th></tr></thead>
          <tbody>
            <tr><td>Bar 1 (preferência 1ª turma)</td><td class="editable" data-role="bar1">${nome(escala.roles.bar1)}</td></tr>
            <tr><td>Bar 2 (preferência 2ª turma)</td><td class="editable" data-role="bar2">${nome(escala.roles.bar2)}</td></tr>
          </tbody>
        </table>
      </section>

      <section class="escala-section">
        <h3>👥 Total de colaboradores na escala</h3>
        <p><small>Presentes considerados: ${escala.presentes ? escala.presentes.length : 0} pessoas</small></p>
      </section>
    </article>
  `;
  const container = document.createElement("div"); container.innerHTML = html.trim();
  return container.firstElementChild;
}

// -------------------- edição manual via clique (prompt simples) --------------------
function enablePreviewEditing(previewEl, escalaObj){
  if(!previewEl) return;
  // style hint
  previewEl.querySelectorAll(".editable").forEach(td=>{
    td.style.cursor = "pointer";
    td.title = "Clique para editar (substituir por um presente ou limpar)";
  });

  // remove previous handler to avoid duplicates
  previewEl._editHandler && previewEl.removeEventListener("click", previewEl._editHandler);

  const handler = (e)=>{
    const td = e.target.closest(".editable");
    if(!td) return;
    const role = td.dataset.role;
    const idx = td.dataset.index !== undefined ? Number(td.dataset.index) : null;

    const presentes = escalaObj.presentes || [];
    // options: limpar + presentes
    const options = [{ label: "— (limpar)", value: "" }].concat(presentes.map(p=>({ label: p.nome, value: String(p.id) })));
    let promptText = `Escolha opção:\n`;
    options.forEach((o,i)=> promptText += `${i}: ${o.label}\n`);
    const choice = prompt(promptText + "\nDigite o número da opção desejada:", "0");
    if(choice === null) return;
    const c = parseInt(choice,10);
    if(isNaN(c) || c<0 || c>=options.length){ alert("Escolha inválida"); return; }
    const sel = options[c];

    // aplicar mudança no objeto escalaObj.roles
    const apply = (roleKey, index, selectedValue)=>{
      if(roleKey==="aparadores" && index !== null){
        escalaObj.roles.aparadores[index] = selectedValue ? funcionarios.find(f=>String(f.id)===selectedValue) : null;
      } else if(roleKey==="bar1" || roleKey==="bar2"){
        escalaObj.roles[roleKey] = selectedValue ? funcionarios.find(f=>String(f.id)===selectedValue) : null;
      } else if(roleKey.startsWith("almoco") || roleKey.startsWith("lanche")){
        if(selectedValue){
          escalaObj.roles[roleKey] = [ funcionarios.find(f=>String(f.id)===selectedValue) ];
        } else {
          escalaObj.roles[roleKey] = [];
        }
      }
    };

    apply(role, idx, sel.value || "");
    // re-render preview (keep ultimoResultadoDia reference updated)
    previewEl.innerHTML = "";
    previewEl.appendChild(renderEscalaDocumento(escalaObj));
    enablePreviewEditing(previewEl, escalaObj);
  };

  previewEl.addEventListener("click", handler);
  previewEl._editHandler = handler;
}

// -------------------- ações Escala do Dia --------------------
if(els.btnGerarDia){
  els.btnGerarDia.addEventListener("click", ()=>{
    const presentes = getPresentesDoDia();
    const dataISO = (els.dataDia && els.dataDia.value) || todayISO();
    if(presentes.length < 1){
      if(!confirm("Você selecionou menos de 1 pessoa. Continuar?")) return;
    }
    const escala = gerarEscalaParaData(dataISO, presentes, rodizioOffset);
    ultimoResultadoDia = escala;
    if(els.previewDia){ els.previewDia.innerHTML=""; els.previewDia.classList.remove("empty"); els.previewDia.appendChild(renderEscalaDocumento(escala)); enablePreviewEditing(els.previewDia, escala); }
    if(els.btnSalvarDia) els.btnSalvarDia.disabled = false;
    if(els.btnImprimirDia) els.btnImprimirDia.disabled = false;
    // export Excel button (preview)
    ensureExportButtons();
    // atualizar rodizio
    rodizioOffset = Number(rodizioOffset) + 1; saveRodizio();
  });
}

if(els.btnSalvarDia){
  els.btnSalvarDia.addEventListener("click", ()=>{
    if(!ultimoResultadoDia) return;
    const hist = loadJSON(SK.HIST, {});
    hist[ultimoResultadoDia.dataISO] = ultimoResultadoDia;
    historico = hist; saveHistorico();
    alert("Escala do dia salva no histórico.");
    renderHistorico();
  });
}

if(els.btnImprimirDia){
  els.btnImprimirDia.addEventListener("click", ()=>{
    if(!ultimoResultadoDia) return;
    els.printArea.innerHTML = "";
    // header with logo + date
    const header = document.createElement("div"); header.style.textAlign="center";
    const logo = loadLogo();
    if(logo){ const img = document.createElement("img"); img.src = logo; img.style.maxWidth="220px"; img.style.maxHeight="110px"; img.style.objectFit="contain"; header.appendChild(img); }
    const info = document.createElement("div"); info.innerHTML = `<h1 style="margin:6px 0">BARRACA TERRA DO SOL</h1><div style="font-size:13px">${weekdayName(ultimoResultadoDia.dataISO)} — ${formatDateBR(ultimoResultadoDia.dataISO)}</div>`; header.appendChild(info);
    els.printArea.appendChild(header);
    els.printArea.appendChild(renderEscalaDocumento(ultimoResultadoDia));
    window.print();
  });
}

// -------------------- semana (gerar e export) --------------------
if(els.btnGerarSemana){
  els.btnGerarSemana.addEventListener("click", ()=>{
    const presentes = getPresentesDoDia();
    const dataInicialISO = (els.dataSemana && els.dataSemana.value) || todayISO();
    const dataInicial = new Date(parseDateInputToDateString(dataInicialISO));
    const resultados = []; let offsetLocal = rodizioOffset;
    for(let i=0;i<7;i++){
      const d = new Date(dataInicial); d.setDate(d.getDate()+i); const iso = todayISO(d);
      const escala = gerarEscalaParaData(iso, presentes, offsetLocal);
      resultados.push(escala); offsetLocal++;
    }
    ultimoResultadoSemana = resultados;
    if(els.previewSemana){ els.previewSemana.innerHTML=""; els.previewSemana.classList.remove("empty"); resultados.forEach(sc=> els.previewSemana.appendChild(renderEscalaDocumento(sc))); }
    if(els.btnImprimirSemana) els.btnImprimirSemana.disabled = false;
    rodizioOffset = offsetLocal; saveRodizio();
    // ensure export week button
    ensureExportButtons();
  });
}

if(els.btnImprimirSemana){
  els.btnImprimirSemana.addEventListener("click", ()=>{
    if(!ultimoResultadoSemana || !ultimoResultadoSemana.length) return;
    els.printArea.innerHTML = "";
    const logo = loadLogo();
    if(logo){
      const img = document.createElement("img"); img.src = logo; img.style.maxWidth="220px"; img.style.maxHeight="110px"; img.style.objectFit="contain"; els.printArea.appendChild(img);
    }
    ultimoResultadoSemana.forEach(sc=> els.printArea.appendChild(renderEscalaDocumento(sc)));
    window.print();
  });
}

// helper to parse ISO date input safely
function parseDateInputToDateString(value){
  if(!value) return new Date();
  const [y,m,d] = value.split("-").map(Number);
  return new Date(y,m-1,d);
}

// -------------------- histórico --------------------
function renderHistorico(){
  const hist = loadJSON(SK.HIST, {});
  const keys = Object.keys(hist).sort();
  if(!els.listaHistorico) return;
  els.listaHistorico.innerHTML = "";
  if(!keys.length){ els.listaHistorico.innerHTML = "<li>Nenhuma escala salva ainda.</li>"; return; }
  keys.forEach(k=>{
    const escala = hist[k];
    const li = document.createElement("li"); li.className="list-item-row";
    const main = document.createElement("div"); main.className="list-item-main"; main.innerHTML = `<span class="nome">${formatDateBR(k)} — ${weekdayName(k)}</span><small class="historico-meta">Presentes: ${escala.presentes?escala.presentes.length:0}</small>`;
    const actions = document.createElement("div"); actions.className="list-item-actions";
    const btnVer = document.createElement("button"); btnVer.className="secondary small"; btnVer.textContent="Ver / Imprimir";
    btnVer.onclick = ()=>{ ultimoResultadoDia = escala; if(els.previewDia){ els.previewDia.innerHTML=""; els.previewDia.appendChild(renderEscalaDocumento(escala)); enablePreviewEditing(els.previewDia, escala); } if(els.btnImprimirDia) els.btnImprimirDia.disabled = false; document.querySelector('.tab-button[data-target="section-dia"]').click(); };
    const btnDel = document.createElement("button"); btnDel.className="danger small"; btnDel.textContent="Apagar";
    btnDel.onclick = ()=>{ if(confirm(`Apagar escala de ${formatDateBR(k)} do histórico?`)){ const h = loadJSON(SK.HIST,{}); delete h[k]; saveJSON(SK.HIST,h); renderHistorico(); } };
    actions.appendChild(btnVer); actions.appendChild(btnDel); li.appendChild(main); li.appendChild(actions); els.listaHistorico.appendChild(li);
  });
}

if(els.btnApagarHistorico){
  els.btnApagarHistorico.addEventListener("click", ()=>{
    if(confirm("Tem certeza que deseja apagar TODO o histórico de escalas? Essa ação não pode ser desfeita.")){ saveJSON(SK.HIST,{}); renderHistorico(); }
  });
}

// -------------------- logo preview --------------------
function renderLogoPreview(){
  if(!els.logoPreviewContainer) return;
  const logo = loadLogo();
  els.logoPreviewContainer.innerHTML = "";
  if(logo){ const img = document.createElement("img"); img.src = logo; img.alt = "Logo"; img.style.maxWidth="160px"; img.style.objectFit="contain"; els.logoPreviewContainer.appendChild(img); } else { els.logoPreviewContainer.innerHTML = "<p>Nenhuma logo selecionada.</p>"; }
}
if(els.inputLogo){
  els.inputLogo.addEventListener("change", ()=>{
    const file = els.inputLogo.files[0]; if(!file) return;
    const reader = new FileReader(); reader.onload = (e)=>{ saveLogo(e.target.result); renderLogoPreview(); }; reader.readAsDataURL(file);
  });
}
if(els.btnRemoverLogo){
  els.btnRemoverLogo.addEventListener("click", ()=>{ if(confirm("Remover logo atual?")){ saveLogo(null); renderLogoPreview(); } });
}
if(els.btnResetRodizio){
  els.btnResetRodizio.addEventListener("click", ()=>{ if(confirm("Resetar rodízio? Isso faz a contagem voltar ao início.")){ rodizioOffset = 0; saveRodizio(); alert("Rodízio resetado."); } });
}

// -------------------- export CSV / Excel --------------------
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

  const csv = rows.map(r=> r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(";")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `escala-${escala.dataISO}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function exportWeekToCSV(semanaArray){
  if(!semanaArray || !semanaArray.length){ alert("Gere a semana primeiro."); return; }
  let all = [];
  semanaArray.forEach(sc=>{
    all.push([`${weekdayName(sc.dataISO)} — ${formatDateBR(sc.dataISO)}`]);
    all.push(["Almoço 1", (sc.roles.almocoTurma1||[]).map(p=>p.nome).join(", ")]);
    all.push(["Almoço 2", (sc.roles.almocoTurma2||[]).map(p=>p.nome).join(", ")]);
    all.push([]);
  });
  const csv = all.map(r=> r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(";")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `escala-semana.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// ensure buttons for export are available
function ensureExportButtons(){
  // add Export CSV to actions-row near generate buttons if not exists
  const dayActions = document.querySelector("#section-dia .actions-row");
  if(dayActions && !document.getElementById("btn-export-csv-day")){
    const btn = document.createElement("button");
    btn.id = "btn-export-csv-day"; btn.className = "primary"; btn.textContent = "Exportar Excel (CSV)";
    btn.style.marginLeft = "8px";
    btn.onclick = ()=>{ if(ultimoResultadoDia) exportScaleToCSV(ultimoResultadoDia); else alert("Gere a escala do dia primeiro."); };
    dayActions.appendChild(btn);
  }

  // also on preview card
  const previewCard = document.querySelector("#section-dia .preview-card");
  if(previewCard && !document.getElementById("btn-export-csv-preview")){
    const btn2 = document.createElement("button");
    btn2.id = "btn-export-csv-preview"; btn2.className = "primary"; btn2.textContent = "Exportar Excel (CSV)";
    btn2.onclick = ()=>{ if(ultimoResultadoDia) exportScaleToCSV(ultimoResultadoDia); else alert("Gere a escala do dia primeiro."); };
    previewCard.appendChild(btn2);
  }

  // export week button near week actions
  const weekActions = document.querySelector("#section-semana .actions-row");
  if(weekActions && !document.getElementById("btn-export-csv-week")){
    const btnw = document.createElement("button");
    btnw.id = "btn-export-csv-week"; btnw.className = "primary"; btnw.textContent = "Exportar Semana (CSV)";
    btnw.onclick = ()=>{ if(ultimoResultadoSemana) exportWeekToCSV(ultimoResultadoSemana); else alert("Gere a semana primeiro."); };
    weekActions.appendChild(btnw);
  }
}

// -------------------- init --------------------
function init(){
  // set default dates
  if(els.dataDia && !els.dataDia.value) els.dataDia.value = todayISO();
  if(els.dataSemana && !els.dataSemana.value) els.dataSemana.value = todayISO();

  renderFuncionarios();
  renderListaPresenca();
  renderLogoPreview();
  renderHistorico();
  ensureFuncoesContainer();
  ensureExportButtons();
}

document.addEventListener("DOMContentLoaded", init);
