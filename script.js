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
  return `${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}/${y}`;
}

function weekdayName(dateStr) {
  const dias = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
  const [y, m, d] = dateStr.split("-").map(Number);
  return dias[new Date(y, m-1, d).getDay()];
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

function loadLogo() {
  return localStorage.getItem(STORAGE_KEYS.LOGO);
}

function saveLogo(data) {
  if (data) localStorage.setItem(STORAGE_KEYS.LOGO, data);
  else localStorage.removeItem(STORAGE_KEYS.LOGO);
}

function loadRodizioOffset() {
  return parseInt(localStorage.getItem(STORAGE_KEYS.RODIZIO_OFFSET) || "0");
}

function saveRodizioOffset(v) {
  localStorage.setItem(STORAGE_KEYS.RODIZIO_OFFSET, String(v));
}

function loadHistorico() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORICO) || "{}");
}

function saveHistorico(v) {
  localStorage.setItem(STORAGE_KEYS.HISTORICO, JSON.stringify(v));
}

// --------- ESTADO ---------
let funcionarios = loadFuncionarios();
let rodizioOffset = loadRodizioOffset();
let ultimoResultadoDia = null;
let ultimoResultadoSemana = null;

// --------- TABS ---------
document.querySelectorAll(".tab-button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".tab-section").forEach(sec => sec.classList.remove("active"));
    document.getElementById(btn.dataset.target).classList.add("active");
  });
});

// --------- EQUIPE ---------
const listaFuncionariosEl = document.getElementById("lista-funcionarios");
const inputNomeFuncionario = document.getElementById("nome-funcionario");
const totalFuncionariosEl = document.getElementById("total-funcionarios");

function renderFuncionarios() {
  listaFuncionariosEl.innerHTML = "";

  if (funcionarios.length === 0) {
    listaFuncionariosEl.innerHTML = "<li>Nenhum colaborador cadastrado ainda.</li>";
  } else {
    funcionarios.sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR")).forEach(f=>{
      const li = document.createElement("li");
      li.className = "list-item-row";

      li.innerHTML = `
        <div class="list-item-main">
          <span class="nome">${f.nome}</span>
          <small>ID: ${f.id}</small>
        </div>
        <div class="list-item-actions">
          <button class="secondary small edit-btn" data-id="${f.id}">Editar</button>
          <button class="danger small remove-btn" data-id="${f.id}">Remover</button>
        </div>
      `;
      listaFuncionariosEl.appendChild(li);
    });
  }

  totalFuncionariosEl.textContent = funcionarios.length;
  renderListaPresenca();
}

// Adicionar
document.getElementById("form-add-funcionario").addEventListener("submit", e => {
  e.preventDefault();
  const nome = inputNomeFuncionario.value.trim();
  if (!nome) return;
  funcionarios.push({ id: Date.now(), nome });
  saveFuncionarios(funcionarios);
  inputNomeFuncionario.value = "";
  renderFuncionarios();
});

// Remover
listaFuncionariosEl.addEventListener("click", e => {
  if (e.target.classList.contains("remove-btn")) {
    const id = Number(e.target.dataset.id);
    if(confirm("Tem certeza que deseja remover?")) {
      funcionarios = funcionarios.filter(f => f.id !== id);
      saveFuncionarios(funcionarios);
      renderFuncionarios();
    }
  }

  // EDITAR  ✔️
  if (e.target.classList.contains("edit-btn")) {
    const id = Number(e.target.dataset.id);
    const pessoa = funcionarios.find(f=>f.id===id);
    const novoNome = prompt("Editar nome:", pessoa.nome);

    if (novoNome && novoNome.trim() !== "") {
      pessoa.nome = novoNome.trim();
      saveFuncionarios(funcionarios);
      renderFuncionarios();
    }
  }
});

// --------- LISTA PRESENTES ---------
const listaPresencaEl = document.getElementById("lista-presenca");
const totalPresentesEl = document.getElementById("total-presentes");

function renderListaPresenca() {
  listaPresencaEl.innerHTML = "";

  funcionarios.forEach(f=>{
    const li = document.createElement("li");
    li.className="list-item-row";

    li.innerHTML = `
      <div class="list-item-main">
        <input type="checkbox" data-id="${f.id}">
        <span class="nome">${f.nome}</span>
      </div>
    `;
    listaPresencaEl.appendChild(li);
  });

  atualizarTotalPresentes();
}

function getPresentesDoDia() {
  return [...listaPresencaEl.querySelectorAll("input:checked")]
    .map(chk => funcionarios.find(f => f.id == chk.dataset.id));
}

function atualizarTotalPresentes() {
  totalPresentesEl.textContent = getPresentesDoDia().length;
}

listaPresencaEl.addEventListener("change", atualizarTotalPresentes);

// --------- GERAR ESCALA (SEM MUDAR SUA LÓGICA — SOMENTE FUNCIONANDO) ---------
function rotateArray(arr, offset) {
  return arr.slice(offset).concat(arr.slice(0, offset));
}

function gerarEscalaParaData(dataISO, presentes, offset) {
  const ordem = rotateArray([...presentes].sort((a,b)=>a.nome.localeCompare(b.nome)),offset);

  return {
    dataISO,
    weekday: weekdayName(dataISO),
    roles:{
      almocoTurma1: ordem.slice(0, Math.ceil(ordem.length/2)),
      almocoTurma2: ordem.slice(Math.ceil(ordem.length/2)),
      lancheTurma1: ordem.slice(0, Math.ceil(ordem.length/3)),
      lancheTurma2: ordem.slice(Math.ceil(ordem.length/3), Math.ceil((ordem.length/3)*2)),
      lancheTurma3: ordem.slice(Math.ceil((ordem.length/3)*2)),
      aparadores: ordem.slice(0,3),
      bar1: ordem[0] || null,
      bar2: ordem[1] || null,
    },
    presentes
  };
}

// RENDER NA TELA
const previewDiaEl = document.getElementById("preview-dia");
const printAreaEl = document.getElementById("print-area");

function renderEscalaDocumento(escala) {
  const logo = loadLogo();

  const html = `
  <div class="escala-documento">
    ${logo ? `<img src="${logo}" style="max-width:200px;display:block;margin:0 auto;">`: ""}
    <h2>${weekdayName(escala.dataISO)} - ${formatDateBR(escala.dataISO)}</h2>
    <hr>
    <p><strong>Almoço:</strong> ${escala.roles.almocoTurma1.map(p=>p.nome).join(", ")} / ${escala.roles.almocoTurma2.map(p=>p.nome).join(", ")}</p>
    <p><strong>Lanche:</strong> ${escala.roles.lancheTurma1.map(p=>p.nome).join(", ")} /
      ${escala.roles.lancheTurma2.map(p=>p.nome).join(", ")} /
      ${escala.roles.lancheTurma3.map(p=>p.nome).join(", ")}</p>
    <p><strong>Aparadores:</strong> ${escala.roles.aparadores.map(p=>p.nome).join(", ")}</p>
    <p><strong>Bar:</strong> ${escala.roles.bar1?.nome || "—"} / ${escala.roles.bar2?.nome || "—"}</p>
  </div>
  `;

  return html;
}

// BOTÕES
document.getElementById("btn-gerar-dia").addEventListener("click",()=>{
  const presentes = getPresentesDoDia();
  if (presentes.length === 0) return alert("Selecione colaboradores.");

  const dataISO = document.getElementById("data-dia").value;
  ultimoResultadoDia = gerarEscalaParaData(dataISO, presentes, rodizioOffset++);
  saveRodizioOffset(rodizioOffset);

  previewDiaEl.innerHTML = renderEscalaDocumento(ultimoResultadoDia);
  document.getElementById("btn-imprimir-dia").disabled = false;
});

document.getElementById("btn-imprimir-dia").addEventListener("click",()=>{
  if(!ultimoResultadoDia) return;
  printAreaEl.innerHTML = renderEscalaDocumento(ultimoResultadoDia);
  window.print();
});

// --------- LOGO ---------
document.getElementById("input-logo").addEventListener("change", e=>{
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{ saveLogo(reader.result); renderLogoPreview(); };
  reader.readAsDataURL(file);
});

document.getElementById("btn-remover-logo").addEventListener("click",()=>{
  saveLogo(null);
  renderLogoPreview();
});

function renderLogoPreview() {
  const logo = loadLogo();
  document.getElementById("logo-preview-container").innerHTML =
    logo ? `<img src="${logo}">` : `<p>Nenhuma logo selecionada.</p>`;
}

// --------- INICIALIZAÇÃO ---------
document.addEventListener("DOMContentLoaded",()=>{
  renderFuncionarios();
  renderListaPresenca();
  renderLogoPreview();
});
