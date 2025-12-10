/* -----------------------------
   Terra do Sol - script.js (Base44 full app)
   - login: password "supertds"
   - dashboard, equipe, dia, semana, historico, config
   - logo preview + print correction
-----------------------------*/

/* Utilities */
function formatDateISO(d){ return d.toISOString().slice(0,10); }
function parseDateInput(v){ if(!v) return new Date(); const [y,m,d]=v.split("-").map(Number); return new Date(y,m-1,d);}
function formatDateBR(s){ if(!s) return ""; const [y,m,d]=s.split("-").map(Number); return `${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}/${y}`; }
function weekdayName(s){ if(!s) return ""; const [y,m,d]=s.split("-").map(Number); const dt=new Date(y,m-1,d); const dias=["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"]; return dias[dt.getDay()]; }

/* Storage keys */
const STORAGE_KEYS = {
  FUNCIONARIOS: "tds_escala_funcionarios",
  LOGO: "tds_escala_logo",
  RODIZIO_OFFSET: "tds_escala_rodizio_offset",
  HISTORICO: "tds_escala_historico",
  ASSIGNMENTS: "tds_escala_assignments",
  LOGGED: "tds_escala_logged"
};
function loadJSON(k, fallback){ const raw=localStorage.getItem(k); if(!raw) return fallback; try{return JSON.parse(raw)}catch{return fallback} }
function saveJSON(k,v){ localStorage.setItem(k, JSON.stringify(v)); }

/* State */
let funcionarios = loadJSON(STORAGE_KEYS.FUNCIONARIOS, []);
let assignments = loadJSON(STORAGE_KEYS.ASSIGNMENTS, {});
let rodizioOffset = parseInt(localStorage.getItem(STORAGE_KEYS.RODIZIO_OFFSET) || "0", 10);
let ultimoResultadoDia = null;
let ultimoResultadoSemana = null;

/* DOM */
const loginScreen = document.getElementById("login-screen");
const appContainer = document.getElementById("app");
const loginPasswordInput = document.getElementById("login-password");
const btnLogin = document.getElementById("btn-login");

const listaFuncionariosEl = document.getElementById("lista-funcionarios");
const totalFuncionariosEl = document.getElementById("total-funcionarios");
const formAddFuncionario = document.getElementById("form-add-funcionario");
const inputNomeFuncionario = document.getElementById("nome-funcionario");

const dataDiaInput = document.getElementById("data-dia");
const listaPresencaEl = document.getElementById("lista-presenca");
const totalPresentesEl = document.getElementById("total-presentes");

const btnGerarDia = document.getElementById("btn-gerar-dia");
const btnSalvarDia = document.getElementById("btn-salvar-dia");
const btnImprimirDia = document.getElementById("btn-imprimir-dia");
const previewDiaEl = document.getElementById("preview-dia");
const printAreaEl = document.getElementById("print-area");

const dataSemanaInput = document.getElementById("data-semana");
const btnGerarSemana = document.getElementById("btn-gerar-semana");
const btnImprimirSemana = document.getElementById("btn-imprimir-semana");
const previewSemanaEl = document.getElementById("preview-semana");

const listaHistoricoEl = document.getElementById("lista-historico");
const btnApagarHistorico = document.getElementById("btn-apagar-historico");

const inputLogo = document.getElementById("input-logo");
const logoPreviewContainer = document.getElementById("logo-preview-container");
const btnRemoverLogo = document.getElementById("btn-remover-logo");
const btnResetRodizio = document.getElementById("btn-reset-rodizio");
const btnLogout = document.getElementById("btn-logout");

const dbTotalFunc = document.getElementById("db-total-func");
const dbTotalHist = document.getElementById("db-total-hist");
const dbUltimaData = document.getElementById("db-ultima-data");
const headerDate = document.getElementById("header-date");

/* Auth */
const APP_PASSWORD = "supertds";
function isLogged(){ return localStorage.getItem(STORAGE_KEYS.LOGGED) === "1"; }
function doLogin(p){ if(String(p||"").trim() === APP_PASSWORD){ localStorage.setItem(STORAGE_KEYS.LOGGED,"1"); showApp(); return true;} return false; }
function doLogout(){ localStorage.removeItem(STORAGE_KEYS.LOGGED); showLogin(); }

/* Events login */
if(btnLogin){ btnLogin.addEventListener("click", ()=>{ const ok = doLogin(loginPasswordInput.value); if(!ok){ alert("Senha incorreta"); loginPasswordInput.value=""; loginPasswordInput.focus(); } else { loginPasswordInput.value=""; } }); loginPasswordInput.addEventListener("keydown",(e)=>{ if(e.key==="Enter") btnLogin.click(); }); }

/* Show/hide */
function showLogin(){ if(loginScreen) loginScreen.style.display="flex"; if(appContainer) appContainer.style.display="none"; }
function showApp(){ if(loginScreen) loginScreen.style.display="none"; if(appContainer) appContainer.style.display="block"; updateHeaderDate(); }

/* Tabs */
document.querySelectorAll(".tab-button").forEach(btn=>{ btn.addEventListener("click", ()=>{ document.querySelectorAll(".tab-button").forEach(b=>b.classList.remove("active")); document.querySelectorAll(".tab-section").forEach(s=>s.classList.remove("active")); btn.classList.add("active"); const alvo = btn.dataset.target; const sec = document.getElementById(alvo); if(sec) sec.classList.add("active"); }); });

/* Team management */
if(formAddFuncionario){ formAddFuncionario.addEventListener("submit",(e)=>{ e.preventDefault(); const nome = inputNomeFuncionario.value.trim(); if(!nome) return; const novo = { id: Date.now(), nome }; funcionarios.push(novo); saveJSON(STORAGE_KEYS.FUNCIONARIOS, funcionarios); inputNomeFuncionario.value=""; renderFuncionarios(); renderListaPresenca(); renderFuncoesUI(); updateDashboard(); }); }
function removerFuncionario(id){ if(!confirm("Remover este colaborador?")) return; funcionarios = funcionarios.filter(f=>f.id!==id); saveJSON(STORAGE_KEYS.FUNCIONARIOS, funcionarios); renderFuncionarios(); renderListaPresenca(); renderFuncoesUI(); updateDashboard(); }
function renderFuncionarios(){ if(!listaFuncionariosEl) return; listaFuncionariosEl.innerHTML=""; if(!funcionarios||funcionarios.length===0){ listaFuncionariosEl.innerHTML="<li>Nenhum colaborador cadastrado ainda.</li>"; } else { funcionarios.forEach(f=>{ const li=document.createElement("li"); li.className="list-item-row"; const main=document.createElement("div"); main.className="list-item-main"; const span=document.createElement("span"); span.className="nome"; span.textContent=f.nome; const small=document.createElement("small"); small.textContent="ID: "+f.id; main.appendChild(span); main.appendChild(small); const actions=document.createElement("div"); actions.className="list-item-actions"; const btnDel=document.createElement("button"); btnDel.className="danger small"; btnDel.textContent="Remover"; btnDel.addEventListener("click", ()=>removerFuncionario(f.id)); actions.appendChild(btnDel); li.appendChild(main); li.appendChild(actions); listaFuncionariosEl.appendChild(li); }); } if(totalFuncionariosEl) totalFuncionariosEl.textContent=(funcionarios?funcionarios.length:0).toString(); }

/* Presence list */
function initDataInputs(){ const hoje=new Date(); const iso=formatDateISO(hoje); if(dataDiaInput && !dataDiaInput.value) dataDiaInput.value = iso; if(dataSemanaInput && !dataSemanaInput.value) dataSemanaInput.value = iso; }
function ensurePresenceToolbar(){ if(!listaPresencaEl) return; const existing=listaPresencaEl.querySelector(".presence-toolbar"); if(existing) return; const toolbar=document.createElement("div"); toolbar.className="presence-toolbar"; toolbar.style.display="flex"; toolbar.style.gap="8px"; toolbar.style.marginBottom="8px"; const btnMarkAll=document.createElement("button"); btnMarkAll.className="small secondary"; btnMarkAll.textContent="Marcar todos"; btnMarkAll.addEventListener("click", ()=>{ listaPresencaEl.querySelectorAll("input[type='checkbox']").forEach(c=>c.checked=true); atualizarTotalPresentes(); }); const btnUn=document.createElement("button"); btnUn.className="small secondary"; btnUn.textContent="Desmarcar todos"; btnUn.addEventListener("click", ()=>{ listaPresencaEl.querySelectorAll("input[type='checkbox']").forEach(c=>c.checked=false); atualizarTotalPresentes(); }); toolbar.appendChild(btnMarkAll); toolbar.appendChild(btnUn); const wrapper=document.createElement("li"); wrapper.appendChild(toolbar); listaPresencaEl.insertBefore(wrapper, listaPresencaEl.firstChild); }
function renderListaPresenca(){ if(!listaPresencaEl) return; listaPresencaEl.innerHTML=""; ensurePresenceToolbar(); if(!funcionarios||funcionarios.length===0){ const li=document.createElement("li"); li.innerHTML="<em>Cadastre colaboradores na aba <strong>Equipe</strong>.</em>"; listaPresencaEl.appendChild(li); if(totalPresentesEl) totalPresentesEl.textContent="0"; return; } funcionarios.forEach(f=>{ const li=document.createElement("li"); li.className="list-item-row"; const main=document.createElement("div"); main.className="list-item-main"; const chk=document.createElement("input"); chk.type="checkbox"; chk.dataset.id=f.id; chk.id=`presenca_${f.id}`; const span=document.createElement("span"); span.className="nome"; span.textContent=f.nome; main.appendChild(chk); main.appendChild(span); li.appendChild(main); listaPresencaEl.appendChild(li); }); atualizarTotalPresentes(); }
function getPresentesDoDia(){ if(!listaPresencaEl) return []; const checks = listaPresencaEl.querySelectorAll("input[type='checkbox']"); const presentes=[]; checks.forEach(c=>{ if(c.checked){ const id=Number(c.dataset.id); const f = funcionarios.find(x=>x.id===id); if(f) presentes.push(f); } }); return presentes; }
function atualizarTotalPresentes(){ if(!totalPresentesEl) return; const p = getPresentesDoDia(); totalPresentesEl.textContent=(p?p.length:0).toString(); }
if(listaPresencaEl) listaPresencaEl.addEventListener("change", atualizarTotalPresentes);

/* Rodizio & generate */
function rotateArray(arr, offset){ const n=arr.length; if(n===0) return []; const o = ((offset % n)+n)%n; return arr.slice(o).concat(arr.slice(0,o)); }
function gerarEscalaParaData(dataISO, presentes, offsetBase){
  const presentesOrdenados = (presentes||[]).slice();
  const listaRodizio = rotateArray(presentesOrdenados, offsetBase);
  const roles = { bar1:null, bar2:null, aparadores:[null,null,null], almocoTurma1:[], almocoTurma2:[], lancheTurma1:[], lancheTurma2:[], lancheTurma3:[] };
  if(!listaRodizio||listaRodizio.length===0) return { dataISO, weekday: weekdayName(dataISO), roles, presentes: [] };
  const presentesById={}; presentesOrdenados.forEach(p=>presentesById[p.id]=p);
  if(assignments.bar && Array.isArray(assignments.bar) && assignments.bar.length>0){ roles.bar1 = presentesById[assignments.bar[0]]||null; roles.bar2 = presentesById[assignments.bar[1]]||null; }
  if(assignments.aparadores && Array.isArray(assignments.aparadores)){ for(let i=0;i<3;i++) roles.aparadores[i] = presentesById[assignments.aparadores[i]]||null; }
  if(assignments.almoco){ roles.almocoTurma1 = (assignments.almoco.turma1||[]).map(id=>presentesById[id]).filter(Boolean); roles.almocoTurma2 = (assignments.almoco.turma2||[]).map(id=>presentesById[id]).filter(Boolean); }
  if(assignments.lanche){ roles.lancheTurma1 = (assignments.lanche.t1||[]).map(id=>presentesById[id]).filter(Boolean); roles.lancheTurma2 = (assignments.lanche.t2||[]).map(id=>presentesById[id]).filter(Boolean); roles.lancheTurma3 = (assignments.lanche.t3||[]).map(id=>presentesById[id]).filter(Boolean); }
  const usedIds = new Set(); if(roles.bar1) usedIds.add(roles.bar1.id); if(roles.bar2) usedIds.add(roles.bar2.id); roles.aparadores.forEach(p=>{ if(p) usedIds.add(p.id); }); roles.almocoTurma1.forEach(p=>{ if(p) usedIds.add(p.id); }); roles.almocoTurma2.forEach(p=>{ if(p) usedIds.add(p.id); }); roles.lancheTurma1.forEach(p=>{ if(p) usedIds.add(p.id); }); roles.lancheTurma2.forEach(p=>{ if(p) usedIds.add(p.id); }); roles.lancheTurma3.forEach(p=>{ if(p) usedIds.add(p.id); });
  const pool = listaRodizio.filter(p=>!usedIds.has(p.id));
  if(!roles.bar1 && pool.length>0) roles.bar1 = pool.shift();
  if(!roles.bar2 && pool.length>0) roles.bar2 = pool.shift();
  for(let i=0;i<3;i++){ if(!roles.aparadores[i] && pool.length>0) roles.aparadores[i] = pool.shift(); }
  const restantes = pool.slice();
  if((!roles.almocoTurma1||roles.almocoTurma1.length===0) && (!roles.almocoTurma2||roles.almocoTurma2.length===0) ){
    if(restantes.length>0){ const metade = Math.ceil(restantes.length/2); roles.almocoTurma1 = restantes.slice(0,metade); roles.almocoTurma2 = restantes.slice(metade); }
  }
  if((!roles.lancheTurma1||roles.lancheTurma1.length===0) && (!roles.lancheTurma2||roles.lancheTurma2.length===0) && (!roles.lancheTurma3||roles.lancheTurma3.length===0)){
    if(restantes.length>0){ const t1Size = Math.ceil(restantes.length/3); const t2Size = Math.ceil((restantes.length-t1Size)/2); roles.lancheTurma1 = restantes.slice(0,t1Size); roles.lancheTurma2 = restantes.slice(t1Size,t1Size+t2Size); roles.lancheTurma3 = restantes.slice(t1Size+t2Size); }
  }
  return { dataISO, weekday: weekdayName(dataISO), roles, presentes:presentesOrdenados };
}

/* render document */
function renderEscalaDocumento(escala){
  const logoData = localStorage.getItem(STORAGE_KEYS.LOGO);
  const dataISO = escala && escala.dataISO ? escala.dataISO : "";
  const weekday = escala && escala.weekday ? escala.weekday : weekdayName(dataISO);
  const roles = escala && escala.roles ? escala.roles : {};
  const dataBR = formatDateBR(dataISO);
  const nome = f => f?f.nome:"—";
  const mapNomes = list => list&&list.length? list.map(p=>p?p.nome:"—").join(", ") : "—";
  const apar = (roles.aparadores||[]).map(a=>nome(a));
  // build html
  const html = `
    <article class="escala-documento">
      <header class="escala-header">
        ${logoData? `<img src="${logoData}" alt="Logo Terra do Sol" />` : ""}
        <h1>BARRACA TERRA DO SOL</h1>
        <h2>Escala Operacional do Dia</h2>
        <p>${weekday} — ${dataBR}</p>
      </header>

      <section class="escala-section almoço">
        <h3>🍽 ALMOÇO</h3>
        <small>Tempo: 40 minutos cada turma</small>
        <table class="escala-table">
          <thead><tr><th>Turma</th><th>Horário</th><th>Colaboradores</th></tr></thead>
          <tbody>
            <tr><td>1ª Turma</td><td>10:00 → 10:40</td><td>${mapNomes(roles.almocoTurma1||[])}</td></tr>
            <tr><td>2ª Turma</td><td>10:40 → 11:20</td><td>${mapNomes(roles.almocoTurma2||[])}</td></tr>
          </tbody>
        </table>
      </section>

      <section class="escala-section lanche">
        <h3>☕ LANCHE</h3>
        <small>Tempo: 20 minutos cada turma</small>
        <table class="escala-table">
          <thead><tr><th>Turma</th><th>Horário</th><th>Colaboradores</th></tr></thead>
          <tbody>
            <tr><td>1ª Turma</td><td>15:00 → 15:20</td><td>${mapNomes(roles.lancheTurma1||[])}</td></tr>
            <tr><td>2ª Turma</td><td>15:20 → 15:40</td><td>${mapNomes(roles.lancheTurma2||[])}</td></tr>
            <tr><td>3ª Turma</td><td>15:40 → 16:00</td><td>${mapNomes(roles.lancheTurma3||[])}</td></tr>
          </tbody>
        </table>
      </section>

      <section class="escala-section aparadores">
        <h3>🧺 APARADORES & SETORES</h3>
        <table class="escala-table">
          <thead><tr><th>Setor</th><th>Responsável</th></tr></thead>
          <tbody>
            <tr><td>Salão + Coqueiro direito</td><td>${apar[0]||"—"}</td></tr>
            <tr><td>Praia direita + Parquinho</td><td>${apar[1]||"—"}</td></tr>
            <tr><td>Coqueiro esquerdo + Praia esquerda</td><td>${apar[2]||"—"}</td></tr>
          </tbody>
        </table>
      </section>

      <section class="escala-section bar">
        <h3>🍹 BAR</h3>
        <table class="escala-table">
          <thead><tr><th>Posição</th><th>Responsável</th></tr></thead>
          <tbody>
            <tr><td>Bar 1 (preferência 1ª turma)</td><td>${nome(roles.bar1)}</td></tr>
            <tr><td>Bar 2 (preferência 2ª turma)</td><td>${nome(roles.bar2)}</td></tr>
          </tbody>
        </table>
      </section>

      <section class="escala-section">
        <h3>👥 Total de colaboradores na escala</h3>
        <p><small>Presentes considerados: ${escala.presentes?escala.presentes.length:0} pessoas</small></p>
      </section>
    </article>
  `;
  const container = document.createElement("div");
  container.innerHTML = html.trim();
  return container.firstElementChild;
}

/* UI Functions & assignment container */
const sectionDia = document.getElementById("section-dia");
function ensureFuncoesContainer(){
  if(!sectionDia) return;
  let card = sectionDia.querySelector("#card-funcoes");
  if(!card){
    card = document.createElement("section"); card.id="card-funcoes"; card.className="card";
    const previewCard = sectionDia.querySelector(".preview-card");
    if(previewCard && previewCard.parentNode) previewCard.parentNode.insertBefore(card, previewCard);
    else sectionDia.appendChild(card);
  }
  card.innerHTML = "<h3>Funções & Atribuições (defina e selecione)</h3><div id='funcoes-list'></div>";
  renderFuncoesUI();
}
function renderFuncoesUI(){
  const container = document.getElementById("funcoes-list"); if(!container) return; container.innerHTML="";
  // Bar
  const barRow = document.createElement("div"); barRow.className="func-row"; barRow.style.display="flex"; barRow.style.justifyContent="space-between"; barRow.style.marginBottom="8px";
  barRow.innerHTML = `<div><strong>Bar</strong> <small>(2 posições)</small></div>`;
  const barActions = document.createElement("div");
  const btnSelBar = document.createElement("button"); btnSelBar.className="small secondary"; btnSelBar.textContent="Selecionar";
  btnSelBar.addEventListener("click", ()=>openSelectionModal("bar","2 posições (sem limite)","Selecione para o Bar"));
  barActions.appendChild(btnSelBar);
  const spanBarSelected = document.createElement("div"); spanBarSelected.id="sel-bar"; spanBarSelected.style.marginLeft="8px";
  barActions.appendChild(spanBarSelected);
  barRow.appendChild(barActions); container.appendChild(barRow);
  // Aparadores
  const apaRow = document.createElement("div"); apaRow.className="func-row"; apaRow.style.display="flex"; apaRow.style.justifyContent="space-between"; apaRow.style.marginBottom="8px";
  apaRow.innerHTML = `<div><strong>Aparadores</strong> <small>(3 posições)</small></div>`;
  const apaActions = document.createElement("div");
  const btnSelApa = document.createElement("button"); btnSelApa.className="small secondary"; btnSelApa.textContent="Selecionar";
  btnSelApa.addEventListener("click", ()=>openSelectionModal("aparadores","3 posições (sem limite)","Selecione Aparadores"));
  apaActions.appendChild(btnSelApa);
  const spanApaSelected=document.createElement("div"); spanApaSelected.id="sel-aparadores"; spanApaSelected.style.marginLeft="8px";
  apaActions.appendChild(spanApaSelected); apaRow.appendChild(apaActions); container.appendChild(apaRow);
  // Almoco
  const almRow = document.createElement("div"); almRow.className="func-row"; almRow.style.display="block"; almRow.style.marginBottom="8px";
  almRow.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between"><div><strong>Almoço</strong> <small>(2 turmas)</small></div><div><button class="small secondary" id="btn-sel-almoco">Selecionar turmas</button></div></div><div style="margin-top:6px"><small id="sel-almoco" style="color:#374151"></small></div>`;
  container.appendChild(almRow);
  const btnSelAlm = document.getElementById("btn-sel-almoco"); if(btnSelAlm) btnSelAlm.addEventListener("click", ()=>openMultiGroupModal("almoco",2,["turma1","turma2"],"Selecione pessoas para cada turma de Almoço"));
  // Lanche
  const lanRow = document.createElement("div"); lanRow.className="func-row"; lanRow.style.display="block"; lanRow.style.marginBottom="8px";
  lanRow.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between"><div><strong>Lanche</strong> <small>(3 turmas)</small></div><div><button class="small secondary" id="btn-sel-lanche">Selecionar turmas</button></div></div><div style="margin-top:6px"><small id="sel-lanche" style="color:#374151"></small></div>`;
  container.appendChild(lanRow); const btnSelLan = document.getElementById("btn-sel-lanche"); if(btnSelLan) btnSelLan.addEventListener("click", ()=>openMultiGroupModal("lanche",3,["t1","t2","t3"],"Selecione pessoas para cada turma de Lanche"));
  updateSelectedSummaries();
}
function updateSelectedSummaries(){
  const selBar=document.getElementById("sel-bar"), selApa=document.getElementById("sel-aparadores"), selAlm=document.getElementById("sel-almoco"), selLan=document.getElementById("sel-lanche");
  if(selBar) selBar.textContent = assignments.bar ? idsToNames(assignments.bar) : "Nenhum";
  if(selApa) selApa.textContent = assignments.aparadores ? idsToNames(assignments.aparadores) : "Nenhum";
  const alm = assignments.almoco || {}; if(selAlm) selAlm.textContent = `Turma1: ${alm.turma1? idsToNames(alm.turma1):"—"} — Turma2: ${alm.turma2? idsToNames(alm.turma2):"—"}`;
  const lan = assignments.lanche || {}; if(selLan) selLan.textContent = `T1: ${lan.t1?idsToNames(lan.t1):"—"} — T2: ${lan.t2?idsToNames(lan.t2):"—"} — T3: ${lan.t3?idsToNames(lan.t3):"—"}`;
}
function idsToNames(list){ if(!list||list.length===0) return "Nenhum"; return list.map(id=>{ const f = funcionarios.find(x=>x.id===id); return f?f.nome:"—"; }).join(", "); }

/* Selection modals (same as earlier) */
function openSelectionModal(roleKey, hint, title){
  const presentes = getPresentesDoDia(); const pool = (presentes.length?presentes:funcionarios).slice();
  const overlay = document.createElement("div"); overlay.style.position="fixed"; overlay.style.left=0; overlay.style.top=0; overlay.style.right=0; overlay.style.bottom=0; overlay.style.background="rgba(0,0,0,0.45)"; overlay.style.display="flex"; overlay.style.alignItems="center"; overlay.style.justifyContent="center"; overlay.style.zIndex=9999;
  const box = document.createElement("div"); box.style.background="#fff"; box.style.padding="12px"; box.style.borderRadius="8px"; box.style.width="90%"; box.style.maxWidth="520px"; box.style.maxHeight="80%"; box.style.overflow="auto";
  box.innerHTML = `<h3 style="margin:0 0 8px 0">${title}</h3><div style="margin-bottom:8px"><small>${hint}</small></div>`;
  const list = document.createElement("div"); list.style.display="grid"; list.style.gap="6px";
  const current = assignments[roleKey] ? assignments[roleKey].slice() : [];
  pool.forEach(p=>{
    const row=document.createElement("div"); row.style.display="flex"; row.style.alignItems="center"; row.style.gap="8px"; row.style.border="1px solid #f0f0f0"; row.style.padding="6px"; row.style.borderRadius="6px";
    const chk=document.createElement("input"); chk.type="checkbox"; chk.dataset.id=p.id; if(current.includes(p.id)) chk.checked=true;
    const nameSpan=document.createElement("span"); nameSpan.textContent=p.nome; nameSpan.style.flex="1";
    const upBtn=document.createElement("button"); upBtn.className="small secondary"; upBtn.textContent="↑"; upBtn.onclick=()=>{ const prev=row.previousElementSibling; if(prev) list.insertBefore(row, prev); };
    const downBtn=document.createElement("button"); downBtn.className="small secondary"; downBtn.textContent="↓"; downBtn.onclick=()=>{ const next=row.nextElementSibling; if(next) list.insertBefore(next, row); };
    row.appendChild(chk); row.appendChild(nameSpan); row.appendChild(upBtn); row.appendChild(downBtn); list.appendChild(row);
  });
  box.appendChild(list);
  const actions=document.createElement("div"); actions.style.display="flex"; actions.style.justifyContent="flex-end"; actions.style.gap="8px"; actions.style.marginTop="10px";
  const btnCancel=document.createElement("button"); btnCancel.className="secondary small"; btnCancel.textContent="Cancelar"; btnCancel.onclick=()=>document.body.removeChild(overlay);
  const btnSave=document.createElement("button"); btnSave.className="primary small"; btnSave.textContent="Salvar seleção"; btnSave.onclick=()=>{
    const rows=Array.from(list.children); const chosen=[]; rows.forEach(r=>{ const c=r.querySelector("input[type='checkbox']"); if(c && c.checked) chosen.push(Number(c.dataset.id)); });
    if(roleKey==="bar") assignments.bar = chosen.slice(); else if(roleKey==="aparadores") assignments.aparadores = chosen.slice(); else assignments[roleKey] = chosen.slice();
    saveJSON(STORAGE_KEYS.ASSIGNMENTS, assignments); updateSelectedSummaries(); document.body.removeChild(overlay);
  };
  actions.appendChild(btnCancel); actions.appendChild(btnSave); box.appendChild(actions); overlay.appendChild(box); document.body.appendChild(overlay);
}
function openMultiGroupModal(roleKey, groupsCount, groupKeys, title){
  const presentes = getPresentesDoDia(); const pool = (presentes.length?presentes:funcionarios).slice();
  const overlay=document.createElement("div"); overlay.style.position="fixed"; overlay.style.left=0; overlay.style.top=0; overlay.style.right=0; overlay.style.bottom=0; overlay.style.background="rgba(0,0,0,0.45)"; overlay.style.display="flex"; overlay.style.alignItems="center"; overlay.style.justifyContent="center"; overlay.style.zIndex=9999;
  const box=document.createElement("div"); box.style.background="#fff"; box.style.padding="12px"; box.style.borderRadius="8px"; box.style.width="95%"; box.style.maxWidth="900px"; box.style.maxHeight="86%"; box.style.overflow="auto";
  box.innerHTML=`<h3 style="margin:0 0 8px 0">${title}</h3><div style="margin-bottom:8px"><small>Selecione para cada turma. Você pode marcar quantos quiser e usar ↑↓ para ordenar.</small></div>`;
  const grid=document.createElement("div"); grid.style.display="grid"; grid.style.gridTemplateColumns=`repeat(${groupsCount},1fr)`; grid.style.gap="12px";
  const existing = assignments[roleKey] || {};
  for(let g=0; g<groupsCount; g++){
    const key = groupKeys[g]; const col=document.createElement("div"); col.style.border="1px solid #eee"; col.style.padding="8px"; col.style.borderRadius="6px";
    const titleEl=document.createElement("div"); titleEl.innerHTML=`<strong>${roleKey==="almoco" ? `Turma ${g+1}` : `T${g+1}`}</strong>`; titleEl.style.marginBottom="6px"; col.appendChild(titleEl);
    const list=document.createElement("div"); list.style.display="grid"; list.style.gap="6px";
    pool.forEach(p=>{
      const lbl=document.createElement("div"); lbl.style.display="flex"; lbl.style.alignItems="center"; lbl.style.gap="8px"; lbl.style.border="1px solid #f5f5f5"; lbl.style.padding="6px"; lbl.style.borderRadius="4px";
      const chk=document.createElement("input"); chk.type="checkbox"; chk.dataset.id=p.id; const arr = existing[key]||[]; if(arr.includes(p.id)) chk.checked=true;
      const nameSpan=document.createElement("span"); nameSpan.textContent=p.nome; nameSpan.style.flex="1";
      const upBtn=document.createElement("button"); upBtn.className="small secondary"; upBtn.textContent="↑"; upBtn.onclick=()=>{ const prev=lbl.previousElementSibling; if(prev) list.insertBefore(lbl, prev); };
      const downBtn=document.createElement("button"); downBtn.className="small secondary"; downBtn.textContent="↓"; downBtn.onclick=()=>{ const next=lbl.nextElementSibling; if(next) list.insertBefore(next, lbl); };
      lbl.appendChild(chk); lbl.appendChild(nameSpan); lbl.appendChild(upBtn); lbl.appendChild(downBtn); list.appendChild(lbl);
    });
    col.appendChild(list); grid.appendChild(col);
  }
  box.appendChild(grid);
  const actions=document.createElement("div"); actions.style.display="flex"; actions.style.gap="8px"; actions.style.marginTop="10px"; actions.style.justifyContent="flex-end";
  const btnCancel=document.createElement("button"); btnCancel.className="secondary small"; btnCancel.textContent="Cancelar"; btnCancel.onclick=()=>document.body.removeChild(overlay);
  const btnSave=document.createElement("button"); btnSave.className="primary small"; btnSave.textContent="Salvar turmas"; btnSave.onclick=()=>{
    const newObj={}; const cols = grid.children;
    for(let i=0;i<cols.length;i++){ const checks = cols[i].querySelectorAll("input[type='checkbox']"); const chosen=[]; checks.forEach(c=>{ if(c.checked) chosen.push(Number(c.dataset.id)); }); newObj[groupKeys[i]] = chosen; }
    assignments[roleKey] = newObj; saveJSON(STORAGE_KEYS.ASSIGNMENTS, assignments); updateSelectedSummaries(); document.body.removeChild(overlay);
  };
  actions.appendChild(btnCancel); actions.appendChild(btnSave); box.appendChild(actions); overlay.appendChild(box); document.body.appendChild(overlay);
}

/* Main buttons for day */
if(btnGerarDia){ btnGerarDia.addEventListener("click", ()=>{
  const presentes = getPresentesDoDia(); const dataISO = (dataDiaInput && dataDiaInput.value) || formatDateISO(new Date());
  if(presentes.length < 1){ if(!confirm("Você selecionou menos de 1 pessoa. Deseja continuar?")) return; }
  const escala = gerarEscalaParaData(dataISO, presentes, rodizioOffset);
  ultimoResultadoDia = escala;
  if(previewDiaEl){ previewDiaEl.innerHTML=""; previewDiaEl.classList.remove("empty"); previewDiaEl.appendChild(renderEscalaDocumento(escala)); }
  if(btnSalvarDia) btnSalvarDia.disabled=false; if(btnImprimirDia) btnImprimirDia.disabled=false;
  rodizioOffset = rodizioOffset + 1; saveJSON(STORAGE_KEYS.RODIZIO_OFFSET, rodizioOffset); updateDashboard();
}); }

if(btnSalvarDia){ btnSalvarDia.addEventListener("click", ()=>{
  if(!ultimoResultadoDia) return; const hist = loadHistorico(); const key = ultimoResultadoDia.dataISO; hist[key] = ultimoResultadoDia; saveHistorico(hist); alert("Escala do dia salva no histórico."); renderHistorico(); updateDashboard();
}); }

if(btnImprimirDia){ btnImprimirDia.addEventListener("click", ()=>{
  if(!ultimoResultadoDia) return; if(!printAreaEl) return; printAreaEl.innerHTML=""; const doc = renderEscalaDocumento(ultimoResultadoDia); printAreaEl.appendChild(doc); window.print();
}); }

/* Week operations */
if(btnGerarSemana){ btnGerarSemana.addEventListener("click", ()=>{
  const presentes = getPresentesDoDia(); if(presentes.length < 1){ if(!confirm("Você selecionou menos de 1 pessoa. Deseja continuar?")) return; }
  const dataInicialISO = (dataSemanaInput && dataSemanaInput.value) || formatDateISO(new Date()); const dataInicial = parseDateInput(dataInicialISO);
  const resultados=[]; let offsetLocal = rodizioOffset;
  for(let i=0;i<7;i++){ const d=new Date(dataInicial); d.setDate(d.getDate()+i); const iso=formatDateISO(d); const esc = gerarEscalaParaData(iso, presentes, offsetLocal); resultados.push(esc); offsetLocal++; }
  ultimoResultadoSemana = resultados; if(previewSemanaEl){ previewSemanaEl.innerHTML=""; previewSemanaEl.classList.remove("empty"); resultados.forEach(r=> previewSemanaEl.appendChild(renderEscalaDocumento(r)) ); }
  if(btnImprimirSemana) btnImprimirSemana.disabled=false; rodizioOffset = offsetLocal; saveJSON(STORAGE_KEYS.RODIZIO_OFFSET, rodizioOffset); updateDashboard();
}); }
if(btnImprimirSemana){ btnImprimirSemana.addEventListener("click", ()=>{
  if(!ultimoResultadoSemana||ultimoResultadoSemana.length===0) return; if(!printAreaEl) return; printAreaEl.innerHTML=""; ultimoResultadoSemana.forEach(e=> printAreaEl.appendChild(renderEscalaDocumento(e)) ); window.print();
}); }

/* Historico */
function loadHistorico(){ return loadJSON(STORAGE_KEYS.HISTORICO, {}); }
function saveHistorico(obj){ saveJSON(STORAGE_KEYS.HISTORICO, obj); }
function renderHistorico(){
  const hist = loadHistorico(); const datas = Object.keys(hist).sort(); if(!listaHistoricoEl) return; listaHistoricoEl.innerHTML="";
  if(datas.length===0){ listaHistoricoEl.innerHTML="<li>Nenhuma escala salva ainda.</li>"; return; }
  datas.forEach(dataISO=>{
    const escala = hist[dataISO]; const li=document.createElement("li"); li.className="list-item-row";
    const main=document.createElement("div"); main.className="list-item-main";
    const span=document.createElement("span"); span.className="nome"; span.textContent = `${formatDateBR(dataISO)} — ${weekdayName(dataISO)}`;
    const small=document.createElement("small"); small.className="historico-meta"; small.textContent = `Presentes: ${escala.presentes?escala.presentes.length:0}`;
    main.appendChild(span); main.appendChild(small);
    const actions=document.createElement("div"); actions.className="list-item-actions";
    const btnVer=document.createElement("button"); btnVer.className="secondary small"; btnVer.textContent="Ver / Imprimir"; btnVer.addEventListener("click", ()=>{
      ultimoResultadoDia = escala; if(previewDiaEl){ previewDiaEl.innerHTML=""; previewDiaEl.classList.remove("empty"); previewDiaEl.appendChild(renderEscalaDocumento(escala)); }
      if(btnImprimirDia) btnImprimirDia.disabled=false;
      document.querySelectorAll(".tab-button").forEach(b=>b.classList.remove("active"));
      const tabBtn = document.querySelector('.tab-button[data-target="section-dia"]'); if(tabBtn) tabBtn.classList.add("active");
      document.querySelectorAll(".tab-section").forEach(s=>s.classList.remove("active")); const sec = document.getElementById("section-dia"); if(sec) sec.classList.add("active");
    });
    const btnDel=document.createElement("button"); btnDel.className="danger small"; btnDel.textContent="Apagar"; btnDel.addEventListener("click", ()=>{
      if(!confirm(`Apagar escala de ${formatDateBR(dataISO)} do histórico?`)) return; const h=loadHistorico(); delete h[dataISO]; saveHistorico(h); renderHistorico(); updateDashboard();
    });
    actions.appendChild(btnVer); actions.appendChild(btnDel); li.appendChild(main); li.appendChild(actions); listaHistoricoEl.appendChild(li);
  });
}
if(btnApagarHistorico){ btnApagarHistorico.addEventListener("click", ()=>{ if(!confirm("Tem certeza que deseja apagar TODO o histórico de escalas? Essa ação não pode ser desfeita.")) return; saveHistorico({}); renderHistorico(); updateDashboard(); }); }

/* Config - logo + previews + logout + rodizio reset */
function renderLogoPreview(){
  if(!logoPreviewContainer) return; const logoData = localStorage.getItem(STORAGE_KEYS.LOGO); logoPreviewContainer.innerHTML="";
  if(logoData){ const img=document.createElement("img"); img.src=logoData; img.alt="Logo"; img.style.maxWidth="220px"; img.style.maxHeight="110px"; img.style.objectFit="contain"; logoPreviewContainer.appendChild(img); } else { logoPreviewContainer.innerHTML="<p class='muted'>Nenhuma logo selecionada.</p>"; }

  // refresh previews if needed
  if(ultimoResultadoDia && previewDiaEl && !previewDiaEl.classList.contains("empty")){ previewDiaEl.innerHTML=""; previewDiaEl.appendChild(renderEscalaDocumento(ultimoResultadoDia)); }
  if(ultimoResultadoSemana && previewSemanaEl && !previewSemanaEl.classList.contains("empty")){ previewSemanaEl.innerHTML=""; ultimoResultadoSemana.forEach(e=> previewSemanaEl.appendChild(renderEscalaDocumento(e)) ); }
}
if(inputLogo){ inputLogo.addEventListener("change", ()=>{ const file = inputLogo.files[0]; if(!file) return; const reader = new FileReader(); reader.onload = (e)=>{ localStorage.setItem(STORAGE_KEYS.LOGO, e.target.result); renderLogoPreview(); }; reader.readAsDataURL(file); }); }
if(btnRemoverLogo){ btnRemoverLogo.addEventListener("click", ()=>{ if(!confirm("Remover logo atual?")) return; localStorage.removeItem(STORAGE_KEYS.LOGO); renderLogoPreview(); }); }
if(btnResetRodizio){ btnResetRodizio.addEventListener("click", ()=>{ if(!confirm("Resetar rodízio? Isso faz a contagem voltar ao início.")) return; rodizioOffset=0; saveJSON(STORAGE_KEYS.RODIZIO_OFFSET, rodizioOffset); alert("Rodízio resetado."); }); }
if(btnLogout){ btnLogout.addEventListener("click", ()=>{ if(!confirm("Deseja realmente sair do aplicativo?")) return; doLogout(); }); }

/* Export CSV (simple) */
function exportarCSVEscala(escala){
  if(!escala){ alert("Gere a escala primeiro."); return; }
  const roles = escala.roles || {};
  const rows = [
    ["Escala Terra do Sol", formatDateBR(escala.dataISO)],
    [],
    ["Função","Colaboradores"],
    ["Almoço 1", (roles.almocoTurma1||[]).map(p=>p.nome).join(", ")],
    ["Almoço 2", (roles.almocoTurma2||[]).map(p=>p.nome).join(", ")],
    ["Lanche 1", (roles.lancheTurma1||[]).map(p=>p.nome).join(", ")],
    ["Lanche 2", (roles.lancheTurma2||[]).map(p=>p.nome).join(", ")],
    ["Lanche 3", (roles.lancheTurma3||[]).map(p=>p.nome).join(", ")],
    ["Aparadores", (roles.aparadores||[]).map(p=>p? p.nome:"").join(", ")],
    ["Bar 1", roles.bar1? roles.bar1.nome:""],
    ["Bar 2", roles.bar2? roles.bar2.nome:""]
  ];
  let csv="";
  rows.forEach(r=>{ csv += r.map(cell=> `"${String(cell||"").replace(/"/g,'""')}"`).join(";") + "\n"; });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`escala_${(escala.dataISO||"data")}.csv`; a.click(); URL.revokeObjectURL(url);
}

/* small export button additions (if present region) */
(function addExportButtons(){
  const actions = document.querySelector("#section-dia .actions-row"); if(!actions) return;
  if(!actions.querySelector(".btn-export-csv")){ const btnCsv=document.createElement("button"); btnCsv.className="primary btn-export-csv"; btnCsv.textContent="Exportar Excel (CSV)"; btnCsv.style.marginLeft="6px"; btnCsv.addEventListener("click", ()=>exportarCSVEscala(ultimoResultadoDia)); actions.appendChild(btnCsv); }
  const previewCard = document.querySelector("#section-dia .preview-card"); if(previewCard && !previewCard.querySelector(".btn-export-csv-prev")){ const btnCsvPrev=document.createElement("button"); btnCsvPrev.className="primary btn-export-csv-prev"; btnCsvPrev.textContent="Exportar Excel (CSV)"; btnCsvPrev.style.marginTop="8px"; btnCsvPrev.addEventListener("click", ()=>exportarCSVEscala(ultimoResultadoDia)); previewCard.appendChild(btnCsvPrev); }
})();

/* Dashboard */
function updateDashboard(){ const hist = loadHistorico(); const keys = Object.keys(hist||{}); if(dbTotalFunc) dbTotalFunc.textContent = (funcionarios?funcionarios.length:0).toString(); if(dbTotalHist) dbTotalHist.textContent = keys.length.toString(); if(dbUltimaData){ if(keys.length===0) dbUltimaData.textContent="—"; else{ const last = keys.sort().slice(-1)[0]; dbUltimaData.textContent = `${formatDateBR(last)} — ${weekdayName(last)}`; } } updateHeaderDate(); }

/* header date (shows current date default) */
function updateHeaderDate(){
  const d = (dataDiaInput && dataDiaInput.value) ? dataDiaInput.value : formatDateISO(new Date());
  if(headerDate) headerDate.textContent = `${weekdayName(d)}, ${formatDateBR(d)}`;
}

/* Init */
function init(){ initDataInputs(); renderFuncionarios(); renderListaPresenca(); renderLogoPreview(); renderHistorico(); ensureFuncoesContainer(); updateSelectedSummaries(); updateDashboard(); if(isLogged()) showApp(); else showLogin(); }
document.addEventListener("DOMContentLoaded", init);
