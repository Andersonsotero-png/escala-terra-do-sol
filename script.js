// STORAGE
const KEY = "tds_funcionarios";
let funcionarios = JSON.parse(localStorage.getItem(KEY) || "[]");

// ELEMENTOS
const inputNome = document.getElementById("nome-funcionario");
const listaFuncionarios = document.getElementById("lista-funcionarios");
const totalFuncionarios = document.getElementById("total-funcionarios");

const listaPresenca = document.getElementById("lista-presenca");
const totalPresentes = document.getElementById("total-presentes");

const previewDia = document.getElementById("preview-dia");
const btnGerar = document.getElementById("btn-gerar-dia");
const btnImprimir = document.getElementById("btn-imprimir-dia");

// ---------- FUNÇÕES ----------
function salvar() {
  localStorage.setItem(KEY, JSON.stringify(funcionarios));
}

function renderFuncionarios() {
  listaFuncionarios.innerHTML = "";
  funcionarios.forEach((f, i) => {
    listaFuncionarios.innerHTML += `
      <li class="list-item-row">
        <span>${f}</span>
        <button class="small secondary" onclick="editar(${i})">Editar</button>
        <button class="small danger" onclick="remover(${i})">Excluir</button>
      </li>`;
  });

  totalFuncionarios.textContent = funcionarios.length;
  renderPresenca();
}

function renderPresenca() {
  listaPresenca.innerHTML = "";
  funcionarios.forEach((f, i) => {
    listaPresenca.innerHTML += `
    <li class="list-item-row">
      <label><input type="checkbox" data-index="${i}"> ${f}</label>
    </li>`;
  });
}

function remover(i) {
  funcionarios.splice(i, 1);
  salvar();
  renderFuncionarios();
}

function editar(i) {
  const novoNome = prompt("Editar nome:", funcionarios[i]);
  if (novoNome && novoNome.trim() !== "") {
    funcionarios[i] = novoNome.trim();
    salvar();
    renderFuncionarios();
  }
}

// ---------- ADICIONAR ----------
document.getElementById("form-add-funcionario").addEventListener("submit", e => {
  e.preventDefault();
  if (inputNome.value.trim() !== "") {
    funcionarios.push(inputNome.value.trim());
    inputNome.value = "";
    salvar();
    renderFuncionarios();
  }
});

// ---------- GERAR ESCALA ----------
btnGerar.addEventListener("click", () => {
  const presentes = [...document.querySelectorAll("#lista-presenca input:checked")]
    .map(i => funcionarios[i.dataset.index]);

  if (presentes.length === 0) {
    alert("Selecione pelo menos 1 colaborador");
    return;
  }

  previewDia.innerHTML = `
    <h3>🍽 Almoço</h3>
    <p>${presentes.join(", ")}</p>

    <h3>☕ Lanche</h3>
    <p>${presentes.join(", ")}</p>

    <h3>🧺 Aparadores</h3>
    <p>${presentes.slice(0,3).join(", ")}</p>

    <h3>🍹 Bar</h3>
    <p>${presentes.slice(0,2).join(", ")}</p>
  `;

  btnImprimir.disabled = false;
});

// ---------- IMPRESSÃO ----------
btnImprimir.addEventListener("click", () => {
  window.print();
});

// ---------- INICIALIZAÇÃO ----------
renderFuncionarios();
