// STORAGE
const STORAGE_KEY = "escala_funcionarios";

function loadFuncionarios() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function saveFuncionarios(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

let funcionarios = loadFuncionarios();

// ELEMENTOS
const listaFuncionariosEl = document.getElementById("lista-funcionarios");
const totalFuncionariosEl = document.getElementById("total-funcionarios");
const formAddFuncionario = document.getElementById("form-add-funcionario");
const inputNomeFuncionario = document.getElementById("nome-funcionario");

// ADICIONAR
formAddFuncionario.addEventListener("submit", (e) => {
  e.preventDefault();

  const nome = inputNomeFuncionario.value.trim();
  if (!nome) return;

  funcionarios.push({ id: Date.now(), nome, quantidade: 1 });

  saveFuncionarios(funcionarios);
  inputNomeFuncionario.value = "";
  renderFuncionarios();
});

// REMOVER
function removerFuncionario(id) {
  funcionarios = funcionarios.filter(f => f.id !== id);
  saveFuncionarios(funcionarios);
  renderFuncionarios();
}

// EDITAR
function toggleEdit(id) {
  const box = document.getElementById(`edit-${id}`);
  box.style.display = box.style.display === "block" ? "none" : "block";
}

function salvarEdicao(id) {
  const novoNome = document.getElementById(`edit-nome-${id}`).value.trim();
  const novaQtd = document.getElementById(`edit-qtd-${id}`).value;

  const funcionario = funcionarios.find(f => f.id === id);
  funcionario.nome = novoNome;
  funcionario.quantidade = Number(novaQtd);

  saveFuncionarios(funcionarios);
  renderFuncionarios();
}

// LISTAR
function renderFuncionarios() {
  listaFuncionariosEl.innerHTML = "";

  funcionarios.forEach(f => {
    const li = document.createElement("li");
    li.className = "list-item-row";

    li.innerHTML = `
      <div class="list-item-main">
        <span class="nome">${f.nome}</span>
        <small>Qtd: ${f.quantidade}</small>
      </div>

      <div class="list-item-actions">
        <button class="small secondary" onclick="toggleEdit(${f.id})">Editar</button>
        <button class="small danger" onclick="removerFuncionario(${f.id})">Remover</button>
      </div>

      <div class="edit-container" id="edit-${f.id}">
        <input id="edit-nome-${f.id}" type="text" value="${f.nome}">
        <input id="edit-qtd-${f.id}" type="number" value="${f.quantidade}" min="1" max="20">
        <button class="primary" onclick="salvarEdicao(${f.id})">Salvar</button>
      </div>
    `;

    listaFuncionariosEl.appendChild(li);
  });

  totalFuncionariosEl.textContent = funcionarios.length;
}

document.addEventListener("DOMContentLoaded", renderFuncionarios);
