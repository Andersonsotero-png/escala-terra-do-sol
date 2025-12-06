let funcionarios = JSON.parse(localStorage.getItem("funcionarios")) || [];
let maxColaboradores = localStorage.getItem("maxColaboradores") || 10;

document.getElementById("max-colaboradores").value = maxColaboradores;

function salvarFuncionarios() {
  localStorage.setItem("funcionarios", JSON.stringify(funcionarios));
}

function renderFuncionarios() {
  const lista = document.getElementById("lista-funcionarios");
  lista.innerHTML = "";
  funcionarios.forEach(f => {
    const li = document.createElement("li");
    li.className = "list-item-row";
    li.innerHTML = `
      <span>${f.nome}</span>
      <div class="list-item-actions">
        <button class="secondary small" onclick="editarFuncionario(${f.id})">Editar</button>
        <button class="danger small" onclick="removerFuncionario(${f.id})">Excluir</button>
      </div>
    `;
    lista.appendChild(li);
  });

  document.getElementById("total-funcionarios").innerText = funcionarios.length;
}

function removerFuncionario(id) {
  funcionarios = funcionarios.filter(f => f.id !== id);
  salvarFuncionarios();
  renderFuncionarios();
}

function editarFuncionario(id) {
  const novoNome = prompt("Novo nome:");
  if (!novoNome) return;
  const index = funcionarios.findIndex(f => f.id === id);
  funcionarios[index].nome = novoNome;
  salvarFuncionarios();
  renderFuncionarios();
}

document.getElementById("form-add-funcionario").addEventListener("submit", (e) => {
  e.preventDefault();
  const nome = document.getElementById("nome-funcionario").value.trim();
  if (!nome) return;

  funcionarios.push({ id: Date.now(), nome });
  salvarFuncionarios();
  document.getElementById("nome-funcionario").value = "";
  renderFuncionarios();
});

// Salva quantidade
document.getElementById("max-colaboradores").addEventListener("change", (e) => {
  maxColaboradores = e.target.value;
  localStorage.setItem("maxColaboradores", maxColaboradores);
});

// Inicializa
renderFuncionarios();
