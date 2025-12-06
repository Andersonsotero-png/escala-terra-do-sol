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
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

function weekdayName(dateStr) {
  const dias = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
  const [y, m, d] = dateStr.split("-").map(Number);
  return dias[new Date(y, m - 1, d).getDay()];
}

// --------- STORAGE ---------
const STORAGE_KEYS = {
  FUNCIONARIOS: "tds_escala_funcionarios",
  LOGO: "tds_escala_logo",
  RODIZIO_OFFSET: "tds_escala_rodizio_offset",
  HISTORICO: "tds_escala_historico"
};

function loadFuncionarios() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.FUNCIONARIOS) || "[]");
}

function saveFuncionarios(list) {
  localStorage.setItem(STORAGE_KEYS.FUNCIONARIOS, JSON.stringify(list));
}

// --------- ESTADO ---------
let funcionarios = loadFuncionarios();
let rodizioOffset = Number(localStorage.getItem(STORAGE_KEYS.RODIZIO_OFFSET)) || 0;
let ultimoResultadoDia = null;
let ultimoResultadoSemana = null;

// --------- TABS ---------
document.querySelectorAll(".tab-button").forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    document.querySelectorAll(".tab-section").forEach(sec => sec.classList.remove("active"));
    document.getElementById(btn.dataset.target).classList.add("active");
  };
});

// --------- EQUIPE ---------
const formAdd = document.getElementById("form-add-funcionario");
const inputNome = document.getElementById("nome-funcionario");
const listaFuncionariosEl = document.getElementById("lista-funcionarios");
const totalFuncionariosEl = document.getElementById("total-funcionarios");

formAdd.addEventListener("submit", e => {
  e.preventDefault();
  const nome = inputNome.value.trim();
  if (!nome) return;

  funcionarios.push({ id: Date.now(), nome });
  saveFuncionarios(funcionarios);

  inputNome.value = "";
  renderFuncionarios();
  renderListaPresenca();
});

function editarFuncionario(id) {
  const funcionario = funcionarios.find(f => f.id === id);
  const novoNome = prompt("Digite o novo nome:", funcionario.nome);

  if (novoNome && novoNome.trim() !== "") {
    funcionario.nome = novoNome.trim();
    saveFuncionarios(funcionarios);
    renderFuncionarios();
    renderListaPresenca();
  }
}

function removerFuncionario(id) {
  if (!confirm("Deseja remover este colaborador?")) return;
  funcionarios = funcionarios.filter(f => f.id !== id);
  saveFuncionarios(funcionarios);
  renderFuncionarios();
  renderListaPresenca();
}

function renderFuncionarios() {
  listaFuncionariosEl.innerHTML = funcionarios.length === 0
    ? "<li>Nenhum colaborador cadastrado ainda.</li>"
    : funcionarios
        .slice()
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map(f => `
          <li class="list-item-row">
            <div class="list-item-main">
              <span class="nome">${f.nome}</span>
              <small>ID: ${f.id}</small>
            </div>
            <div class="list-item-actions">
              <button class="secondary small" onclick="editarFuncionario(${f.id})">Editar</button>
              <button class="danger small" onclick="removerFuncionario(${f.id})">Remover</button>
            </div>
          </li>
        `)
        .join("");

  totalFuncionariosEl.textContent = funcionarios.length;
}

// --------- PRESENÇA ---------
const listaPresencaEl = document.getElementById("lista-presenca");
const totalPresentesEl = document.getElementById("total-presentes");
const dataDiaInput = document.getElementById("data-dia");

function renderListaPresenca() {
  listaPresencaEl.innerHTML = funcionarios.length === 0
    ? "<li>Cadastre colaboradores na aba <strong>Equipe</strong>.</li>"
    : funcionarios
        .slice()
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map(f => `
          <li class="list-item-row">
            <div class="list-item-main">
              <input type="checkbox" data-id="${f.id}">
              <span class="nome">${f.nome}</span>
            </div>
          </li>
        `)
        .join("");

  listaPresencaEl.querySelectorAll("input").forEach(chk =>
    chk.addEventListener("change", atualizarTotalPresentes)
  );

  atualizarTotalPresentes();
}

function getPresentes() {
  return [...listaPresencaEl.querySelectorAll("input:checked")].map(chk =>
    funcionarios.find(f => f.id === Number(chk.dataset.id))
  );
}

function atualizarTotalPresentes() {
  totalPresentesEl.textContent = getPresentes().length;
}

// --------- ESCALA ---------
function gerarEscalaParaData(dataISO, presentes, offset) {
  const lista = [...presentes].sort((a, b) => a.nome.localeCompare(b.nome));
  const rodizio = [...lista.slice(offset), ...lista.slice(0, offset)];

  return {
    dataISO,
    weekday: weekdayName(dataISO),
    presentes: lista,
    roles: {
      bar1: rodizio[0] || null,
      bar2: rodizio[1] || null,
      aparadores: rodizio.slice(2, 5),
      almocoTurma1: rodizio.slice(5, 5 + Math.ceil((rodizio.length - 5) / 2)),
      almocoTurma2: rodizio.slice(5 + Math.ceil((rodizio.length - 5) / 2)),
      lancheTurma1: rodizio.slice(5, 5 + Math.ceil((rodizio.length - 5) / 3)),
      lancheTurma2: rodizio.slice(5 + Math.ceil((rodizio.length - 5) / 3), 5 + Math.ceil((rodizio.length - 5) * 2 / 3)),
      lancheTurma3: rodizio.slice(5 + Math.ceil((rodizio.length - 5) * 2 / 3))
    }
  };
}

// --------- IMPRESSÃO, HISTÓRICO E INICIALIZAÇÃO ---------

function init() {
  if (!dataDiaInput.value) dataDiaInput.value = formatDateISO(new Date());
  renderFuncionarios();
  renderListaPresenca();
}

document.addEventListener("DOMContentLoaded", init);
