
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
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dia = String(d).padStart(2, "0");
  const mes = String(m).padStart(2, "0");
  return `${dia}/${mes}/${y}`;
}

function weekdayName(dateStr) {
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
  HISTORICO: "tds_escala_historico"
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

// --------- ESTADO EM MEMÓRIA ---------
let funcionarios = loadFuncionarios();
let rodizioOffset = loadRodizioOffset();
let ultimoResultadoDia = null; // para salvar no histórico
let ultimoResultadoSemana = null; // array de dias

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
    document.getElementById(alvo).classList.add("active");
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
});

function removerFuncionario(id) {
  funcionarios = funcionarios.filter((f) => f.id !== id);
  saveFuncionarios(funcionarios);
  renderFuncionarios();
  renderListaPresenca();
}

function renderFuncionarios() {
  listaFuncionariosEl.innerHTML = "";
  if (funcionarios.length === 0) {
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
  totalFuncionariosEl.textContent = funcionarios.length.toString();
}

// --------- PRESENÇA DO DIA ---------
const dataDiaInput = document.getElementById("data-dia");
const listaPresencaEl = document.getElementById("lista-presenca");
const totalPresentesEl = document.getElementById("total-presentes");

function initDataInputs() {
  const hoje = new Date();
  const iso = formatDateISO(hoje);
  if (!dataDiaInput.value) dataDiaInput.value = iso;
  const dataSemanaInput = document.getElementById("data-semana");
  if (dataSemanaInput && !dataSemanaInput.value) dataSemanaInput.value = iso;
}

function renderListaPresenca() {
  listaPresencaEl.innerHTML = "";
  if (funcionarios.length === 0) {
    listaPresencaEl.innerHTML = "<li>Cadastre colaboradores na aba <strong>Equipe</strong>.</li>";
    totalPresentesEl.textContent = "0";
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
  const presentes = getPresentesDoDia();
  totalPresentesEl.textContent = presentes.length.toString();
}

listaPresencaEl.addEventListener("change", atualizarTotalPresentes);

// --------- LÓGICA DA ESCALA ---------
function rotateArray(arr, offset) {
  const n = arr.length;
  if (n === 0) return [];
  const o = ((offset % n) + n) % n;
  return arr.slice(o).concat(arr.slice(0, o));
}

/**
 * Gera a escala para uma data específica.
 * - presentes: lista de colaboradores (objetos) presentes
 * - offsetBase: usado para rodízio (pode somar com o índice do dia)
 */
function gerarEscalaParaData(dataISO, presentes, offsetBase) {
  const presentesOrdenados = presentes
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const listaRodizio = rotateArray(presentesOrdenados, offsetBase);

  // Pelo menos tentar deixar 2 bar + 3 aparadores
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

  if (listaRodizio.length === 0) {
    return {
      dataISO,
      weekday: weekdayName(dataISO),
      roles,
      presentes: []
    };
  }

  const pool = listaRodizio.slice();

  // 2 para o bar
  if (pool.length > 0) roles.bar1 = pool.shift();
  if (pool.length > 0) roles.bar2 = pool.shift();

  // 3 aparadores
  for (let i = 0; i < 3; i++) {
    if (pool.length > 0) {
      roles.aparadores[i] = pool.shift();
    }
  }

  const restantes = pool.slice();

  // Almoço: 2 turmas
  if (restantes.length > 0) {
    const metade = Math.ceil(restantes.length / 2);
    roles.almocoTurma1 = restantes.slice(0, metade);
    roles.almocoTurma2 = restantes.slice(metade);
  }

  // Lanche: dividir os MESMOS restantes em 3 turmas
  if (restantes.length > 0) {
    const t1Size = Math.ceil(restantes.length / 3);
    const t2Size = Math.ceil((restantes.length - t1Size) / 2);
    roles.lancheTurma1 = restantes.slice(0, t1Size);
    roles.lancheTurma2 = restantes.slice(t1Size, t1Size + t2Size);
    roles.lancheTurma3 = restantes.slice(t1Size + t2Size);
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
  const { dataISO, weekday, roles } = escala;
  const dataBR = formatDateBR(dataISO);

  const nome = (f) => (f ? f.nome : "—");

  const mapNomes = (list) =>
    list && list.length
      ? list.map((p) => p.nome).join(", ")
      : "—";

  const aparadoresNomes = roles.aparadores.map((a) => nome(a));

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
              <td>${mapNomes(roles.almocoTurma1)}</td>
            </tr>
            <tr>
              <td>2ª Turma</td>
              <td>10:40 → 11:20</td>
              <td>${mapNomes(roles.almocoTurma2)}</td>
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
              <td>${mapNomes(roles.lancheTurma1)}</td>
            </tr>
            <tr>
              <td>2ª Turma</td>
              <td>15:20 → 15:40</td>
              <td>${mapNomes(roles.lancheTurma2)}</td>
            </tr>
            <tr>
              <td>3ª Turma</td>
              <td>15:40 → 16:00</td>
              <td>${mapNomes(roles.lancheTurma3)}</td>
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
              <td>${aparadoresNomes[0]}</td>
            </tr>
            <tr>
              <td>Praia direita + Parquinho</td>
              <td>${aparadoresNomes[1]}</td>
            </tr>
            <tr>
              <td>Coqueiro esquerdo + Praia esquerda</td>
              <td>${aparadoresNomes[2]}</td>
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

btnGerarDia.addEventListener("click", () => {
  const presentes = getPresentesDoDia();
  const dataISO = dataDiaInput.value || formatDateISO(new Date());

  if (presentes.length < 5) {
    if (
      !confirm(
        "Você selecionou menos de 5 pessoas. A escala pode ficar incompleta. Deseja continuar mesmo assim?"
      )
    ) {
      return;
    }
  }

  const escala = gerarEscalaParaData(dataISO, presentes, rodizioOffset);

  ultimoResultadoDia = escala; // guarda para salvar no histórico
  previewDiaEl.innerHTML = "";
  previewDiaEl.classList.remove("empty");
  previewDiaEl.appendChild(renderEscalaDocumento(escala));

  btnSalvarDia.disabled = false;
  btnImprimirDia.disabled = false;

  // Atualiza rodízio para a próxima geração
  rodizioOffset = rodizioOffset + 1;
  saveRodizioOffset(rodizioOffset);
});

btnSalvarDia.addEventListener("click", () => {
  if (!ultimoResultadoDia) return;
  const hist = loadHistorico();
  const key = ultimoResultadoDia.dataISO;
  hist[key] = ultimoResultadoDia;
  saveHistorico(hist);
  alert("Escala do dia salva no histórico.");
  renderHistorico();
});

btnImprimirDia.addEventListener("click", () => {
  if (!ultimoResultadoDia) return;
  printAreaEl.innerHTML = "";
  const doc = renderEscalaDocumento(ultimoResultadoDia);
  printAreaEl.appendChild(doc);
  window.print();
});

// --------- ESCALA DA SEMANA (UI) ---------
const dataSemanaInput = document.getElementById("data-semana");
const btnGerarSemana = document.getElementById("btn-gerar-semana");
const btnImprimirSemana = document.getElementById("btn-imprimir-semana");
const previewSemanaEl = document.getElementById("preview-semana");

btnGerarSemana.addEventListener("click", () => {
  const presentes = getPresentesDoDia(); // usa mesma lista de presentes
  if (presentes.length < 5) {
    if (
      !confirm(
        "Você selecionou menos de 5 pessoas presentes. A semana pode ficar incompleta. Deseja continuar mesmo assim?"
      )
    ) {
      return;
    }
  }

  const dataInicialISO = dataSemanaInput.value || formatDateISO(new Date());
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

  previewSemanaEl.innerHTML = "";
  previewSemanaEl.classList.remove("empty");

  resultados.forEach((escala) => {
    const doc = renderEscalaDocumento(escala);
    previewSemanaEl.appendChild(doc);
  });

  btnImprimirSemana.disabled = false;

  // Atualiza offset global
  rodizioOffset = offsetLocal;
  saveRodizioOffset(rodizioOffset);
});

btnImprimirSemana.addEventListener("click", () => {
  if (!ultimoResultadoSemana || ultimoResultadoSemana.length === 0) return;
  printAreaEl.innerHTML = "";

  ultimoResultadoSemana.forEach((escala) => {
    const doc = renderEscalaDocumento(escala);
    printAreaEl.appendChild(doc);
  });

  window.print();
});

// --------- HISTÓRICO (UI) ---------
const listaHistoricoEl = document.getElementById("lista-historico");
const btnApagarHistorico = document.getElementById("btn-apagar-historico");

function renderHistorico() {
  const hist = loadHistorico();
  const datas = Object.keys(hist).sort(); // ISO já fica em ordem

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
    small.textContent = `Presentes: ${
      escala.presentes ? escala.presentes.length : 0
    }`;

    main.appendChild(spanNome);
    main.appendChild(small);

    const actions = document.createElement("div");
    actions.className = "list-item-actions";

    const btnVer = document.createElement("button");
    btnVer.className = "secondary small";
    btnVer.textContent = "Ver / Imprimir";
    btnVer.addEventListener("click", () => {
      // Mostra no preview do dia
      ultimoResultadoDia = escala;
      previewDiaEl.innerHTML = "";
      previewDiaEl.classList.remove("empty");
      previewDiaEl.appendChild(renderEscalaDocumento(escala));
      btnImprimirDia.disabled = false;

      // Troca para aba Escala do Dia
      document
        .querySelectorAll(".tab-button")
        .forEach((b) => b.classList.remove("active"));
      document
        .querySelector('.tab-button[data-target="section-dia"]')
        .classList.add("active");

      document
        .querySelectorAll(".tab-section")
        .forEach((s) => s.classList.remove("active"));
      document.getElementById("section-dia").classList.add("active");
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

btnApagarHistorico.addEventListener("click", () => {
  if (
    confirm(
      "Tem certeza que deseja apagar TODO o histórico de escalas? Essa ação não pode ser desfeita."
    )
  ) {
    saveHistorico({});
    renderHistorico();
  }
});

// --------- CONFIG (LOGO & RODÍZIO) ---------
const inputLogo = document.getElementById("input-logo");
const logoPreviewContainer = document.getElementById("logo-preview-container");
const btnRemoverLogo = document.getElementById("btn-remover-logo");
const btnResetRodizio = document.getElementById("btn-reset-rodizio");

function renderLogoPreview() {
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

btnRemoverLogo.addEventListener("click", () => {
  if (confirm("Remover logo atual?")) {
    saveLogo(null);
    renderLogoPreview();
  }
});

btnResetRodizio.addEventListener("click", () => {
  if (
    confirm(
      "Resetar rodízio? Isso faz a contagem voltar ao início, como se fosse o primeiro dia."
    )
  ) {
    rodizioOffset = 0;
    saveRodizioOffset(rodizioOffset);
    alert("Rodízio resetado com sucesso.");
  }
});

// --------- INICIALIZAÇÃO ---------
function init() {
  initDataInputs();
  renderFuncionarios();
  renderListaPresenca();
  renderLogoPreview();
  renderHistorico();
}

document.addEventListener("DOMContentLoaded", init);
