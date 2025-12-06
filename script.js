// --------- UTILITÁRIOS DE DATA ---------
function formatDateISO(date) {
  return date.toISOString().slice(0, 10);
}

function parseDateInput(value) {
  if (!value) return new Date();
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateBR(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dia = String(d).padStart(2, "0");
  const mes = String(m).padStart(2, "0");
  return `${dia}/${mes}/${y}`;
}

function weekdayName(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dias = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
  return dias[date.getDay()];
}

// --------- STORAGE ---------
const STORAGE_KEYS = {
  FUNCIONARIOS: "tds_escala_funcionarios",
  LOGO: "tds_escala_logo",
  RODIZIO_OFFSET: "tds_escala_rodizio_offset",
  HISTORICO: "tds_escala_historico",
  ASSIGNMENTS: "tds_escala_assignments" // novo: atribuições manuais
};

function loadFuncionarios() {
  const raw = localStorage.getItem(STORAGE_KEYS.FUNCIONARIOS);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveFuncionarios(list) {
  localStorage.setItem(STORAGE_KEYS.FUNCIONARIOS, JSON.stringify(list));
}

function loadLogo() {
  return localStorage.getItem(STORAGE_KEYS.LOGO);
}

function saveLogo(dataUrl) {
  if (dataUrl) {
    localStorage.setItem(STORAGE_KEYS.LOGO, dataUrl);
  } else {
    localStorage.removeItem(STORAGE_KEYS.LOGO);
  }
}

function loadRodizioOffset() {
  const raw = localStorage.getItem(STORAGE_KEYS.RODIZIO_OFFSET);
  return raw ? parseInt(raw, 10) || 0 : 0;
}

function saveRodizioOffset(offset) {
  localStorage.setItem(STORAGE_KEYS.RODIZIO_OFFSET, String(offset));
}

function loadHistorico() {
  const raw = localStorage.getItem(STORAGE_KEYS.HISTORICO);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveHistorico(hist) {
  localStorage.setItem(STORAGE_KEYS.HISTORICO, JSON.stringify(hist));
}

function loadAssignments() {
  const raw = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveAssignments(obj) {
  localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(obj));
}

// --------- ESTADO EM MEMÓRIA ---------
let funcionarios = loadFuncionarios();
let rodizioOffset = loadRodizioOffset();
let ultimoResultadoDia = null; // para salvar no histórico
let ultimoResultadoSemana = null; // array de dias
let assignments = loadAssignments(); // estrutura { roleKey: [ids] or single id / aparadores: [id,id,id] }

// definição das funções/roles que aparecerão no UI
const ROLE_DEFS = [
  { key: "bar", label: "Bar", defaultQty: 2, type: "single-several" }, // será mapeado para bar1/bar2
  { key: "aparadores", label: "Aparadores (3 posições)", defaultQty: 3, type: "multi" },
  { key: "almoco", label: "Almoço (turmas divididas)", defaultQty: 0, type: "group-2" },
  { key: "lanche", label: "Lanche (3 turmas)", defaultQty: 0, type: "group-3" }
];

// --------- TABS ---------
document.querySelectorAll(".tab-button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".tab-button")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const alvo = btn.getAttribute("data-target");
    document
      .querySelectorAll(".tab-section")
      .forEach((sec) => sec.classList.remove("active"));
    const target = document.getElementById(alvo);
    if (target) target.classList.add("active");
  });
});

// --------- EQUIPE ---------
const formAddFuncionario = document.getElementById("form-add-funcionario");
const inputNomeFuncionario = document.getElementById("nome-funcionario");
const listaFuncionariosEl = document.getElementById("lista-funcionarios");
const totalFuncionariosEl = document.getElementById("total-funcionarios");

formAddFuncionario.addEventListener("submit", (e) => {
  e.preventDefault();
  const nome = inputNomeFuncionario.value.trim();
  if (!nome) return;

  const novo = {
    id: Date.now(),
    nome
  };
  funcionarios.push(novo);
  saveFuncionarios(funcionarios);
  inputNomeFuncionario.value = "";
  renderFuncionarios();
  renderListaPresenca();
  renderFuncoesUI(); // atualiza selects se houver
});

function removerFuncionario(id) {
  funcionarios = funcionarios.filter((f) => f.id !== id);
  saveFuncionarios(funcionarios);
  renderFuncionarios();
  renderListaPresenca();
  renderFuncoesUI();
}

function renderFuncionarios() {
  listaFuncionariosEl.innerHTML = "";
  if (!funcionarios || funcionarios.length === 0) {
    listaFuncionariosEl.innerHTML = "<li>Nenhum colaborador cadastrado ainda.</li>";
  } else {
    funcionarios
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .forEach((f) => {
        const li = document.createElement("li");
        li.className = "list-item-row";

        const main = document.createElement("div");
        main.className = "list-item-main";
        const spanNome = document.createElement("span");
        spanNome.className = "nome";
        spanNome.textContent = f.nome;

        const small = document.createElement("small");
        small.textContent = "ID: " + f.id;

        main.appendChild(spanNome);
        main.appendChild(small);

        const actions = document.createElement("div");
        actions.className = "list-item-actions";
        const btnDel = document.createElement("button");
        btnDel.className = "danger small";
        btnDel.textContent = "Remover";
        btnDel.addEventListener("click", () => {
          if (confirm(`Remover ${f.nome} da equipe?`)) {
            removerFuncionario(f.id);
          }
        });

        actions.appendChild(btnDel);
        li.appendChild(main);
        li.appendChild(actions);
        listaFuncionariosEl.appendChild(li);
      });
  }
  totalFuncionariosEl.textContent = (funcionarios ? funcionarios.length : 0).toString();
}

// --------- PRESENÇA DO DIA (com Marcar/Desmarcar) ---------
const dataDiaInput = document.getElementById("data-dia");
const listaPresencaEl = document.getElementById("lista-presenca");
const totalPresentesEl = document.getElementById("total-presentes");

function initDataInputs() {
  const hoje = new Date();
  const iso = formatDateISO(hoje);
  if (dataDiaInput && !dataDiaInput.value) dataDiaInput.value = iso;
  const dataSemanaInput = document.getElementById("data-semana");
  if (dataSemanaInput && !dataSemanaInput.value) dataSemanaInput.value = iso;
}

function renderListaPresenca() {
  if (!listaPresencaEl) return;
  listaPresencaEl.innerHTML = "";

  // adiciona toolbar Marcar / Desmarcar
  let toolbar = listaPresencaEl.querySelector(".presence-toolbar");
  if (!toolbar) {
    toolbar = document.createElement("div");
    toolbar.className = "presence-toolbar";
    toolbar.style.display = "flex";
    toolbar.style.gap = "8px";
    toolbar.style.marginBottom = "8px";

    const btnMarkAll = document.createElement("button");
    btnMarkAll.className = "small secondary";
    btnMarkAll.textContent = "Marcar todos";
    btnMarkAll.addEventListener("click", () => {
      listaPresencaEl.querySelectorAll("input[type='checkbox']").forEach((c) => (c.checked = true));
      atualizarTotalPresentes();
    });

    const btnUnmarkAll = document.createElement("button");
    btnUnmarkAll.className = "small secondary";
    btnUnmarkAll.textContent = "Desmarcar todos";
    btnUnmarkAll.addEventListener("click", () => {
      listaPresencaEl.querySelectorAll("input[type='checkbox']").forEach((c) => (c.checked = false));
      atualizarTotalPresentes();
    });

    toolbar.appendChild(btnMarkAll);
    toolbar.appendChild(btnUnmarkAll);
    const wrapperLi = document.createElement("li");
    wrapperLi.appendChild(toolbar);
    listaPresencaEl.appendChild(wrapperLi);
  }

  if (!funcionarios || funcionarios.length === 0) {
    const li = document.createElement("li");
    li.innerHTML = "<em>Cadastre colaboradores na aba <strong>Equipe</strong>.</em>";
    listaPresencaEl.appendChild(li);
    if (totalPresentesEl) totalPresentesEl.textContent = "0";
    return;
  }

  funcionarios
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .forEach((f) => {
      const li = document.createElement("li");
      li.className = "list-item-row";

      const main = document.createElement("div");
      main.className = "list-item-main";

      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.dataset.id = f.id;
      chk.id = `presenca_${f.id}`;

      const spanNome = document.createElement("span");
      spanNome.className = "nome";
      spanNome.textContent = f.nome;

      main.appendChild(chk);
      main.appendChild(spanNome);
      li.appendChild(main);

      listaPresencaEl.appendChild(li);
    });

  atualizarTotalPresentes();
}

function getPresentesDoDia() {
  if (!listaPresencaEl) return [];
  const checks = listaPresencaEl.querySelectorAll("input[type='checkbox']");
  const presentes = [];
  checks.forEach((chk) => {
    if (chk.checked) {
      const id = Number(chk.dataset.id);
      const f = funcionarios.find((x) => x.id === id);
      if (f) presentes.push(f);
    }
  });
  return presentes;
}

function atualizarTotalPresentes() {
  if (!totalPresentesEl) return;
  const presentes = getPresentesDoDia();
  totalPresentesEl.textContent = (presentes ? presentes.length : 0).toString();
}

if (listaPresencaEl) {
  listaPresencaEl.addEventListener("change", atualizarTotalPresentes);
}

// --------- LÓGICA DA ESCALA (com suporte a assignments manuais) ---------
function rotateArray(arr, offset) {
  const n = arr.length;
  if (n === 0) return [];
  const o = ((offset % n) + n) % n;
  return arr.slice(o).concat(arr.slice(0, o));
}

/**
 * Usa assignments manuais se existirem; caso contrário faz rodízio automático.
 * assignments estrutura esperada:
 * {
 *   bar: [id,id],          // usada para bar1/bar2 (ordem)
 *   aparadores: [id,id,id],
 *   almoco: { turma1:[ids], turma2:[ids] }   // opcional
 *   lanche: { t1:[], t2:[], t3:[] }          // opcional
 * }
 */
function gerarEscalaParaData(dataISO, presentes, offsetBase) {
  const presentesOrdenados = (presentes || [])
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const listaRodizio = rotateArray(presentesOrdenados, offsetBase);

  const roles = {
    bar1: null,
    bar2: null,
    aparadores: [null, null, null],
    almocoTurma1: [],
    almocoTurma2: [],
    lancheTurma1: [],
    lancheTurma2: [],
    lancheTurma3: []
  };

  if (!listaRodizio || listaRodizio.length === 0) {
    return {
      dataISO,
      weekday: weekdayName(dataISO),
      roles,
      presentes: []
    };
  }

  const presentesById = {};
  presentesOrdenados.forEach((p) => (presentesById[p.id] = p));

  // 1) preenche com assignments manuais (quando existir e os IDs estiverem presentes)
  // BAR
  if (assignments.bar && Array.isArray(assignments.bar) && assignments.bar.length > 0) {
    roles.bar1 = presentesById[assignments.bar[0]] || null;
    roles.bar2 = presentesById[assignments.bar[1]] || null;
  }

  // APARADORES (até 3)
  if (assignments.aparadores && Array.isArray(assignments.aparadores)) {
    for (let i = 0; i < 3; i++) {
      roles.aparadores[i] = presentesById[assignments.aparadores[i]] || null;
    }
  }

  // ALMOÇO - grupos
  if (assignments.almoco && (assignments.almoco.turma1 || assignments.almoco.turma2)) {
    roles.almocoTurma1 = (assignments.almoco.turma1 || []).map((id) => presentesById[id]).filter(Boolean);
    roles.almocoTurma2 = (assignments.almoco.turma2 || []).map((id) => presentesById[id]).filter(Boolean);
  }

  // LANCHE - 3 turmas
  if (assignments.lanche && (assignments.lanche.t1 || assignments.lanche.t2 || assignments.lanche.t3)) {
    roles.lancheTurma1 = (assignments.lanche.t1 || []).map((id) => presentesById[id]).filter(Boolean);
    roles.lancheTurma2 = (assignments.lanche.t2 || []).map((id) => presentesById[id]).filter(Boolean);
    roles.lancheTurma3 = (assignments.lanche.t3 || []).map((id) => presentesById[id]).filter(Boolean);
  }

  // 2) remove já usados (manuais) do pool e continuar preenchendo com rodízio
  const usedIds = new Set();
  ["bar1", "bar2"].forEach((k) => { if (roles[k]) usedIds.add(roles[k].id); });
  roles.aparadores.forEach((p) => { if (p) usedIds.add(p.id); });
  roles.almocoTurma1.forEach((p) => { if (p) usedIds.add(p.id); });
  roles.almocoTurma2.forEach((p) => { if (p) usedIds.add(p.id); });
  roles.lancheTurma1.forEach((p) => { if (p) usedIds.add(p.id); });
  roles.lancheTurma2.forEach((p) => { if (p) usedIds.add(p.id); });
  roles.lancheTurma3.forEach((p) => { if (p) usedIds.add(p.id); });

  const pool = listaRodizio.filter((p) => !usedIds.has(p.id));

  // preencher bar se ainda vazio
  if (!roles.bar1 && pool.length > 0) roles.bar1 = pool.shift();
  if (!roles.bar2 && pool.length > 0) roles.bar2 = pool.shift();

  // preencher aparadores (até 3)
  for (let i = 0; i < 3; i++) {
    if (!roles.aparadores[i] && pool.length > 0) {
      roles.aparadores[i] = pool.shift();
    }
  }

  // Agora restantes para almoço e lanche
  const restantes = pool.slice();

  // Almoço: 2 turmas (divide o restante)
  if ((!roles.almocoTurma1 || roles.almocoTurma1.length === 0) && (!roles.almocoTurma2 || roles.almocoTurma2.length === 0)) {
    if (restantes.length > 0) {
      const metade = Math.ceil(restantes.length / 2);
      roles.almocoTurma1 = restantes.slice(0, metade);
      roles.almocoTurma2 = restantes.slice(metade);
    }
  } else {
    // se já tinha algum manual, complementa com pool
    const needed1 = Math.max(0, 0 - (roles.almocoTurma1 ? roles.almocoTurma1.length : 0));
    const needed2 = Math.max(0, 0 - (roles.almocoTurma2 ? roles.almocoTurma2.length : 0));
    // (aqui não há quantidade fixa para almoço no modelo; manual tem prioridade)
  }

  // Lanche: se vazio, divide em 3 turmas
  if ((!roles.lancheTurma1 || roles.lancheTurma1.length === 0) 
    && (!roles.lancheTurma2 || roles.lancheTurma2.length === 0) 
    && (!roles.lancheTurma3 || roles.lancheTurma3.length === 0)) {
    if (restantes.length > 0) {
      const t1Size = Math.ceil(restantes.length / 3);
      const t2Size = Math.ceil((restantes.length - t1Size) / 2);
      roles.lancheTurma1 = restantes.slice(0, t1Size);
      roles.lancheTurma2 = restantes.slice(t1Size, t1Size + t2Size);
      roles.lancheTurma3 = restantes.slice(t1Size + t2Size);
    }
  }

  return {
    dataISO,
    weekday: weekdayName(dataISO),
    roles,
    presentes: presentesOrdenados
  };
}

// --------- RENDER DA ESCALA (HTML) ---------
function renderEscalaDocumento(escala) {
  const logoData = loadLogo();
  const dataISO = escala && escala.dataISO ? escala.dataISO : "";
  const weekday = escala && escala.weekday ? escala.weekday : weekdayName(dataISO);
  const roles = escala && escala.roles ? escala.roles : {};
  const dataBR = formatDateBR(dataISO);

  const nome = (f) => (f ? f.nome : "—");

  const mapNomes = (list) =>
    list && list.length
      ? list.map((p) => (p ? p.nome : "—")).join(", ")
      : "—";

  const aparadoresNomes = (roles.aparadores || []).map((a) => nome(a));

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
        <small>Tempo: 40 minutos cada turma</small>
        <table class="escala-table">
          <thead>
            <tr>
              <th>Turma</th>
              <th>Horário</th>
              <th>Colaboradores</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1ª Turma</td>
              <td>10:00 → 10:40</td>
              <td>${mapNomes(roles.almocoTurma1 || [])}</td>
            </tr>
            <tr>
              <td>2ª Turma</td>
              <td>10:40 → 11:20</td>
              <td>${mapNomes(roles.almocoTurma2 || [])}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="escala-section">
        <h3>☕ Lanche</h3>
        <small>Tempo: 20 minutos cada turma</small>
        <table class="escala-table">
          <thead>
            <tr>
              <th>Turma</th>
              <th>Horário</th>
              <th>Colaboradores</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1ª Turma</td>
              <td>15:00 → 15:20</td>
              <td>${mapNomes(roles.lancheTurma1 || [])}</td>
            </tr>
            <tr>
              <td>2ª Turma</td>
              <td>15:20 → 15:40</td>
              <td>${mapNomes(roles.lancheTurma2 || [])}</td>
            </tr>
            <tr>
              <td>3ª Turma</td>
              <td>15:40 → 16:00</td>
              <td>${mapNomes(roles.lancheTurma3 || [])}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="escala-section">
        <h3>🧺 Aparadores & Setores</h3>
        <table class="escala-table">
          <thead>
            <tr>
              <th>Setor</th>
              <th>Responsável</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Salão + Coqueiro direito</td>
              <td>${aparadoresNomes[0] || "—"}</td>
            </tr>
            <tr>
              <td>Praia direita + Parquinho</td>
              <td>${aparadoresNomes[1] || "—"}</td>
            </tr>
            <tr>
              <td>Coqueiro esquerdo + Praia esquerda</td>
              <td>${aparadoresNomes[2] || "—"}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="escala-section">
        <h3>🍹 Bar</h3>
        <table class="escala-table">
          <thead>
            <tr>
              <th>Posição</th>
              <th>Responsável</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Bar 1 (preferência 1ª turma)</td>
              <td>${nome(roles.bar1)}</td>
            </tr>
            <tr>
              <td>Bar 2 (preferência 2ª turma)</td>
              <td>${nome(roles.bar2)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="escala-section">
        <h3>👥 Total de colaboradores na escala</h3>
        <p><small>Presentes considerados: ${
          escala.presentes ? escala.presentes.length : 0
        } pessoas</small></p>
      </section>
    </article>
  `;

  const container = document.createElement("div");
  container.innerHTML = html.trim();
  return container.firstElementChild;
}

// --------- ESCALA DO DIA (UI) ---------
const btnGerarDia = document.getElementById("btn-gerar-dia");
const btnSalvarDia = document.getElementById("btn-salvar-dia");
const btnImprimirDia = document.getElementById("btn-imprimir-dia");
const previewDiaEl = document.getElementById("preview-dia");
const printAreaEl = document.getElementById("print-area");
const sectionDia = document.getElementById("section-dia");

function ensureFuncoesContainer() {
  // cria ou atualiza o card de Funções na aba Escala do Dia, antes do preview
  if (!sectionDia) return;
  let card = sectionDia.querySelector("#card-funcoes");
  if (!card) {
    card = document.createElement("section");
    card.id = "card-funcoes";
    card.className = "card";
    // insere antes do preview-card
    const previewCard = sectionDia.querySelector(".preview-card");
    if (previewCard && previewCard.parentNode) {
      previewCard.parentNode.insertBefore(card, previewCard);
    } else {
      sectionDia.appendChild(card);
    }
  }
  // monta conteúdo
  card.innerHTML = "<h3>Funções & Atribuições (defina quantidade e selecione)</h3><div id='funcoes-list'></div>";
  renderFuncoesUI();
}

function renderFuncoesUI() {
  const container = document.getElementById("funcoes-list");
  if (!container) return;
  container.innerHTML = "";

  // Função Bar (2)
  // Aparadores (3)
  // Almoço (grupos)
  // Lanche (3 grupos)
  // Para cada role definimos uma linha com input quantidade (quando aplicável) e botão selecionar
  // Observação: quantidade para almoco/lanche é mais conceitual — a seleção é por pessoa por turma.

  // BAR (mapeado para assignments.bar = [id,id])
  const barRow = document.createElement("div");
  barRow.className = "func-row";
  barRow.style.display = "flex";
  barRow.style.alignItems = "center";
  barRow.style.justifyContent = "space-between";
  barRow.style.marginBottom = "8px";
  barRow.innerHTML = `<div><strong>Bar</strong> <small>(2 posições)</small></div>`;
  const barActions = document.createElement("div");
  const btnSelBar = document.createElement("button");
  btnSelBar.className = "small secondary";
  btnSelBar.textContent = "Selecionar";
  btnSelBar.addEventListener("click", () => openSelectionModal("bar", 2, "Selecione até 2 pessoas para o Bar"));
  barActions.appendChild(btnSelBar);
  const spanBarSelected = document.createElement("div");
  spanBarSelected.id = "sel-bar";
  spanBarSelected.style.marginLeft = "8px";
  barActions.appendChild(spanBarSelected);
  barRow.appendChild(barActions);
  container.appendChild(barRow);

  // APARADORES (3 posições separadas)
  const apaRow = document.createElement("div");
  apaRow.className = "func-row";
  apaRow.style.display = "flex";
  apaRow.style.alignItems = "center";
  apaRow.style.justifyContent = "space-between";
  apaRow.style.marginBottom = "8px";
  apaRow.innerHTML = `<div><strong>Aparadores</strong> <small>(3 posições)</small></div>`;
  const apaActions = document.createElement("div");
  const btnSelApa = document.createElement("button");
  btnSelApa.className = "small secondary";
  btnSelApa.textContent = "Selecionar";
  btnSelApa.addEventListener("click", () => openSelectionModal("aparadores", 3, "Selecione até 3 aparadores"));
  apaActions.appendChild(btnSelApa);
  const spanApaSelected = document.createElement("div");
  spanApaSelected.id = "sel-aparadores";
  spanApaSelected.style.marginLeft = "8px";
  apaActions.appendChild(spanApaSelected);
  apaRow.appendChild(apaActions);
  container.appendChild(apaRow);

  // ALMOÇO turmas (2)
  const almRow = document.createElement("div");
  almRow.className = "func-row";
  almRow.style.display = "block";
  almRow.style.marginBottom = "8px";
  almRow.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between"><div><strong>Almoço</strong> <small>(defina manualmente por turma)</small></div><div><button class="small secondary" id="btn-sel-almoco">Selecionar turmas</button></div></div>
    <div style="margin-top:6px"><small id="sel-almoco" style="color:#374151"></small></div>`;
  container.appendChild(almRow);
  document.getElementById("btn-sel-almoco").addEventListener("click", () => openMultiGroupModal("almoco", 2, ["turma1", "turma2"], "Selecione pessoas para cada turma de Almoço"));

  // LANCHE turmas (3)
  const lanRow = document.createElement("div");
  lanRow.className = "func-row";
  lanRow.style.display = "block";
  lanRow.style.marginBottom = "8px";
  lanRow.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between"><div><strong>Lanche</strong> <small>(3 turmas)</small></div><div><button class="small secondary" id="btn-sel-lanche">Selecionar turmas</button></div></div>
    <div style="margin-top:6px"><small id="sel-lanche" style="color:#374151"></small></div>`;
  container.appendChild(lanRow);
  document.getElementById("btn-sel-lanche").addEventListener("click", () => openMultiGroupModal("lanche", 3, ["t1", "t2", "t3"], "Selecione pessoas para cada turma de Lanche"));

  // preenche os textos com os já selecionados (se houver)
  updateSelectedSummaries();
}

function updateSelectedSummaries() {
  // Bar
  const bar = assignments.bar || [];
  document.getElementById("sel-bar").textContent = bar.length ? barToNames(bar) : "Nenhum";
  // Aparadores
  document.getElementById("sel-aparadores").textContent = (assignments.aparadores && assignments.aparadores.length) ? idListToNames(assignments.aparadores) : "Nenhum";
  // Almoco
  const alm = assignments.almoco || {};
  const aText = (alm.turma1 && alm.turma1.length ? idListToNames(alm.turma1) : "—") + "  |  " + (alm.turma2 && alm.turma2.length ? idListToNames(alm.turma2) : "—");
  document.getElementById("sel-almoco").textContent = `Turma1: ${alm.turma1 ? idListToNames(alm.turma1) : "—"} — Turma2: ${alm.turma2 ? idListToNames(alm.turma2) : "—"}`;
  // Lanche
  const lan = assignments.lanche || {};
  document.getElementById("sel-lanche").textContent = `T1: ${lan.t1 ? idListToNames(lan.t1) : "—"} — T2: ${lan.t2 ? idListToNames(lan.t2) : "—"} — T3: ${lan.t3 ? idListToNames(lan.t3) : "—"}`;
}

function barToNames(listIds) {
  if (!listIds || listIds.length === 0) return "Nenhum";
  return listIds.map((id) => {
    const f = funcionarios.find((x) => x.id === id);
    return f ? f.nome : "—";
  }).join(", ");
}
function idListToNames(listIds) {
  if (!listIds || listIds.length === 0) return "Nenhum";
  return listIds.map((id) => {
    const f = funcionarios.find((x) => x.id === id);
    return f ? f.nome : "—";
  }).join(", ");
}

// --------- MODALS DE SELEÇÃO ---------
function openSelectionModal(roleKey, limit, title) {
  // Seleciona entre os presentes do dia (se nenhum presente, usar todos)
  const presentes = getPresentesDoDia();
  const pool = (presentes.length ? presentes : funcionarios).slice().sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR"));

  // cria overlay
  const overlay = document.createElement("div");
  overlay.className = "sel-overlay";
  Object.assign(overlay.style, {
    position: "fixed", left: 0, top: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
  });

  const box = document.createElement("div");
  box.className = "sel-box";
  Object.assign(box.style, { background: "#fff", padding: "12px", borderRadius: "8px", width: "90%", maxWidth: "420px", maxHeight: "80%", overflow: "auto" });

  box.innerHTML = `<h3 style="margin:0 0 8px 0">${title}</h3><div style="margin-bottom:8px"><small>Limite: ${limit} pessoa(s)</small></div>`;
  const list = document.createElement("div");
  list.style.display = "grid";
  list.style.gap = "6px";

  const current = assignments[roleKey] ? assignments[roleKey].slice() : [];

  pool.forEach((p) => {
    const row = document.createElement("label");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "8px";
    row.style.cursor = "pointer";
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.dataset.id = p.id;
    if (current.includes(p.id)) chk.checked = true;
    row.appendChild(chk);
    row.appendChild(document.createTextNode(p.nome));
    list.appendChild(row);
  });

  box.appendChild(list);

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "8px";
  actions.style.marginTop = "10px";
  actions.style.justifyContent = "flex-end";

  const btnCancel = document.createElement("button");
  btnCancel.className = "secondary small";
  btnCancel.textContent = "Cancelar";
  btnCancel.addEventListener("click", () => document.body.removeChild(overlay));

  const btnSave = document.createElement("button");
  btnSave.className = "primary small";
  btnSave.textContent = "Salvar seleção";
  btnSave.addEventListener("click", () => {
    // coleta selecionados
    const checks = list.querySelectorAll("input[type='checkbox']");
    const chosen = [];
    checks.forEach((c) => {
      if (c.checked) chosen.push(Number(c.dataset.id));
    });
    if (chosen.length > limit) {
      alert(`Você selecionou ${chosen.length} pessoas. O limite para essa função é ${limit}.`);
      return;
    }
    // salva em assignments
    if (roleKey === "bar") {
      assignments.bar = chosen.slice(0, 2); // ordem mantida
    } else if (roleKey === "aparadores") {
      // garantimos array de 3 posições (pode ter menos)
      assignments.aparadores = chosen.slice(0,3);
    } else {
      assignments[roleKey] = chosen;
    }
    saveAssignments(assignments);
    updateSelectedSummaries();
    document.body.removeChild(overlay);
  });

  actions.appendChild(btnCancel);
  actions.appendChild(btnSave);
  box.appendChild(actions);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function openMultiGroupModal(roleKey, groupsCount, groupKeys, title) {
  // groupsCount 2 -> almoco (turma1/turma2)
  const presentes = getPresentesDoDia();
  const pool = (presentes.length ? presentes : funcionarios).slice().sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR"));

  const overlay = document.createElement("div");
  overlay.className = "sel-overlay";
  Object.assign(overlay.style, {
    position: "fixed", left: 0, top: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
  });

  const box = document.createElement("div");
  box.className = "sel-box";
  Object.assign(box.style, { background: "#fff", padding: "12px", borderRadius: "8px", width: "92%", maxWidth: "680px", maxHeight: "86%", overflow: "auto" });

  box.innerHTML = `<h3 style="margin:0 0 8px 0">${title}</h3><div style="margin-bottom:8px"><small>Selecione manualmente os colaboradores para cada turma.</small></div>`;

  // para cada turma cria uma coluna com checkboxes
  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = `repeat(${groupsCount}, 1fr)`;
  grid.style.gap = "12px";

  const existing = assignments[roleKey] || {};

  for (let g = 0; g < groupsCount; g++) {
    const key = groupKeys[g];
    const col = document.createElement("div");
    col.style.border = "1px solid #eee";
    col.style.padding = "8px";
    col.style.borderRadius = "6px";

    const titleEl = document.createElement("div");
    titleEl.innerHTML = `<strong>${roleKey === "almoco" ? `Turma ${g+1}` : `T${g+1}`}</strong>`;
    titleEl.style.marginBottom = "6px";
    col.appendChild(titleEl);

    const list = document.createElement("div");
    list.style.display = "grid";
    list.style.gap = "6px";

    pool.forEach((p) => {
      const lbl = document.createElement("label");
      lbl.style.display = "flex";
      lbl.style.gap = "8px";
      lbl.style.alignItems = "center";
      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.dataset.id = p.id;
      const groupArr = existing[key] || [];
      if (groupArr.includes(p.id)) chk.checked = true;
      lbl.appendChild(chk);
      lbl.appendChild(document.createTextNode(p.nome));
      list.appendChild(lbl);
    });

    col.appendChild(list);
    grid.appendChild(col);
  }

  box.appendChild(grid);

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "8px";
  actions.style.marginTop = "10px";
  actions.style.justifyContent = "flex-end";

  const btnCancel = document.createElement("button");
  btnCancel.className = "secondary small";
  btnCancel.textContent = "Cancelar";
  btnCancel.addEventListener("click", () => document.body.removeChild(overlay));

  const btnSave = document.createElement("button");
  btnSave.className = "primary small";
  btnSave.textContent = "Salvar turmas";
  btnSave.addEventListener("click", () => {
    // coleta por coluna
    const newObj = {};
    const cols = grid.children;
    for (let i = 0; i < cols.length; i++) {
      const checks = cols[i].querySelectorAll("input[type='checkbox']");
      const chosen = [];
      checks.forEach((c) => { if (c.checked) chosen.push(Number(c.dataset.id)); });
      newObj[groupKeys[i]] = chosen;
    }
    assignments[roleKey] = newObj;
    saveAssignments(assignments);
    updateSelectedSummaries();
    document.body.removeChild(overlay);
  });

  actions.appendChild(btnCancel);
  actions.appendChild(btnSave);
  box.appendChild(actions);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// --------- ESCALA DO DIA (botões principais) ---------
const btnGerar = document.getElementById("btn-gerar-dia");
const btnSalvar = document.getElementById("btn-salvar-dia");
const btnImprimir = document.getElementById("btn-imprimir-dia");

if (btnGerar) {
  btnGerar.addEventListener("click", () => {
    const presentes = getPresentesDoDia();
    const dataISO = (dataDiaInput && dataDiaInput.value) || formatDateISO(new Date());

    if (presentes.length < 3) {
      if (!confirm("Você selecionou menos de 3 pessoas. A escala pode ficar incompleta. Deseja continuar mesmo assim?")) return;
    }

    const escala = gerarEscalaParaData(dataISO, presentes, rodizioOffset);

    ultimoResultadoDia = escala;
    if (previewDiaEl) {
      previewDiaEl.innerHTML = "";
      previewDiaEl.classList.remove("empty");
      previewDiaEl.appendChild(renderEscalaDocumento(escala));
    }

    if (btnSalvar) btnSalvar.disabled = false;
    if (btnImprimir) btnImprimir.disabled = false;

    // incrementa rodízio (se quiser manter automático)
    rodizioOffset = rodizioOffset + 1;
    saveRodizioOffset(rodizioOffset);
  });
}

if (btnSalvar) {
  btnSalvar.addEventListener("click", () => {
    if (!ultimoResultadoDia) return;
    const hist = loadHistorico();
    const key = ultimoResultadoDia.dataISO;
    hist[key] = ultimoResultadoDia;
    saveHistorico(hist);
    alert("Escala do dia salva no histórico.");
    renderHistorico();
  });
}

if (btnImprimir) {
  btnImprimir.addEventListener("click", () => {
    if (!ultimoResultadoDia) return;
    if (!printAreaEl) return;
    printAreaEl.innerHTML = "";
    const doc = renderEscalaDocumento(ultimoResultadoDia);
    printAreaEl.appendChild(doc);
    window.print();
  });
}

// --------- ESCALA DA SEMANA (UI) ---------
const dataSemanaInput = document.getElementById("data-semana");
const btnGerarSemana = document.getElementById("btn-gerar-semana");
const btnImprimirSemana = document.getElementById("btn-imprimir-semana");
const previewSemanaEl = document.getElementById("preview-semana");

if (btnGerarSemana) {
  btnGerarSemana.addEventListener("click", () => {
    const presentes = getPresentesDoDia();
    if (presentes.length < 3) {
      if (!confirm("Você selecionou menos de 3 pessoas presentes. A semana pode ficar incompleta. Deseja continuar mesmo assim?")) return;
    }

    const dataInicialISO = (dataSemanaInput && dataSemanaInput.value) || formatDateISO(new Date());
    const dataInicial = parseDateInput(dataInicialISO);

    const resultados = [];
    let offsetLocal = rodizioOffset;

    for (let i = 0; i < 7; i++) {
      const d = new Date(dataInicial);
      d.setDate(d.getDate() + i);
      const iso = formatDateISO(d);
      const escalaDia = gerarEscalaParaData(iso, presentes, offsetLocal);
      resultados.push(escalaDia);
      offsetLocal++;
    }

    ultimoResultadoSemana = resultados;

    if (previewSemanaEl) {
      previewSemanaEl.innerHTML = "";
      previewSemanaEl.classList.remove("empty");
      resultados.forEach((escala) => {
        const doc = renderEscalaDocumento(escala);
        previewSemanaEl.appendChild(doc);
      });
    }

    if (btnImprimirSemana) btnImprimirSemana.disabled = false;

    rodizioOffset = offsetLocal;
    saveRodizioOffset(rodizioOffset);
  });
}

if (btnImprimirSemana) {
  btnImprimirSemana.addEventListener("click", () => {
    if (!ultimoResultadoSemana || ultimoResultadoSemana.length === 0) return;
    if (!printAreaEl) return;
    printAreaEl.innerHTML = "";

    ultimoResultadoSemana.forEach((escala) => {
      const doc = renderEscalaDocumento(escala);
      printAreaEl.appendChild(doc);
    });

    window.print();
  });
}

// --------- HISTÓRICO (UI) ---------
const listaHistoricoEl = document.getElementById("lista-historico");
const btnApagarHistorico = document.getElementById("btn-apagar-historico");

function renderHistorico() {
  const hist = loadHistorico();
  const datas = Object.keys(hist).sort();

  if (!listaHistoricoEl) return;
  listaHistoricoEl.innerHTML = "";
  if (datas.length === 0) {
    listaHistoricoEl.innerHTML = "<li>Nenhuma escala salva ainda.</li>";
    return;
  }

  datas.forEach((dataISO) => {
    const escala = hist[dataISO];
    const li = document.createElement("li");
    li.className = "list-item-row";

    const main = document.createElement("div");
    main.className = "list-item-main";
    const spanNome = document.createElement("span");
    spanNome.className = "nome";
    spanNome.textContent = `${formatDateBR(dataISO)} — ${weekdayName(dataISO)}`;

    const small = document.createElement("small");
    small.className = "historico-meta";
    small.textContent = `Presentes: ${escala.presentes ? escala.presentes.length : 0}`;

    main.appendChild(spanNome);
    main.appendChild(small);

    const actions = document.createElement("div");
    actions.className = "list-item-actions";

    const btnVer = document.createElement("button");
    btnVer.className = "secondary small";
    btnVer.textContent = "Ver / Imprimir";
    btnVer.addEventListener("click", () => {
      ultimoResultadoDia = escala;
      if (previewDiaEl) {
        previewDiaEl.innerHTML = "";
        previewDiaEl.classList.remove("empty");
        previewDiaEl.appendChild(renderEscalaDocumento(escala));
      }
      if (btnImprimir) btnImprimir.disabled = false;
      // troca para aba Escala do Dia
      document.querySelectorAll(".tab-button").forEach((b) => b.classList.remove("active"));
      const tabBtn = document.querySelector('.tab-button[data-target="section-dia"]');
      if (tabBtn) tabBtn.classList.add("active");
      document.querySelectorAll(".tab-section").forEach((s) => s.classList.remove("active"));
      const sec = document.getElementById("section-dia");
      if (sec) sec.classList.add("active");
    });

    const btnDel = document.createElement("button");
    btnDel.className = "danger small";
    btnDel.textContent = "Apagar";
    btnDel.addEventListener("click", () => {
      if (confirm(`Apagar escala de ${formatDateBR(dataISO)} do histórico?`)) {
        const h = loadHistorico();
        delete h[dataISO];
        saveHistorico(h);
        renderHistorico();
      }
    });

    actions.appendChild(btnVer);
    actions.appendChild(btnDel);

    li.appendChild(main);
    li.appendChild(actions);
    listaHistoricoEl.appendChild(li);
  });
}

if (btnApagarHistorico) {
  btnApagarHistorico.addEventListener("click", () => {
    if (confirm("Tem certeza que deseja apagar TODO o histórico de escalas? Essa ação não pode ser desfeita.")) {
      saveHistorico({});
      renderHistorico();
    }
  });
}

// --------- CONFIG (LOGO & RODÍZIO) ---------
const inputLogo = document.getElementById("input-logo");
const logoPreviewContainer = document.getElementById("logo-preview-container");
const btnRemoverLogo = document.getElementById("btn-remover-logo");
const btnResetRodizio = document.getElementById("btn-reset-rodizio");

function renderLogoPreview() {
  if (!logoPreviewContainer) return;
  const logoData = loadLogo();
  logoPreviewContainer.innerHTML = "";
  if (logoData) {
    const img = document.createElement("img");
    img.src = logoData;
    img.alt = "Logo da barraca";
    logoPreviewContainer.appendChild(img);
  } else {
    logoPreviewContainer.innerHTML = "<p>Nenhuma logo selecionada.</p>";
  }
}

if (inputLogo) {
  inputLogo.addEventListener("change", () => {
    const file = inputLogo.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      saveLogo(dataUrl);
      renderLogoPreview();
    };
    reader.readAsDataURL(file);
  });
}

if (btnRemoverLogo) {
  btnRemoverLogo.addEventListener("click", () => {
    if (confirm("Remover logo atual?")) {
      saveLogo(null);
      renderLogoPreview();
    }
  });
}

if (btnResetRodizio) {
  btnResetRodizio.addEventListener("click", () => {
    if (confirm("Resetar rodízio? Isso faz a contagem voltar ao início, como se fosse o primeiro dia.")) {
      rodizioOffset = 0;
      saveRodizioOffset(rodizioOffset);
      alert("Rodízio resetado com sucesso.");
    }
  });
}

// --------- INICIALIZAÇÃO ---------
function init() {
  initDataInputs();
  renderFuncionarios();
  renderListaPresenca();
  renderLogoPreview();
  renderHistorico();
  ensureFuncoesContainer(); // monta UI de funções
}

document.addEventListener("DOMContentLoaded", init);
