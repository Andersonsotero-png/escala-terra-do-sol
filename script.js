// Mesma lógica original + função EDITAR

function editarFuncionario(id) {
  const funcionario = funcionarios.find(f => f.id === id);
  const novoNome = prompt("Editar nome:", funcionario.nome);

  if (novoNome && novoNome.trim() !== "") {
    funcionario.nome = novoNome.trim();
    saveFuncionarios(funcionarios);
    renderFuncionarios();
    renderListaPresenca();
  }
}

function renderFuncionarios() {
  listaFuncionariosEl.innerHTML = "";
  funcionarios
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .forEach(f => {
      const li = document.createElement("li");
      li.className = "list-item-row";

      li.innerHTML = `
        <div class="list-item-main">
          <span class="nome">${f.nome}</span>
        </div>
        <div class="list-item-actions">
          <button class="secondary small" onclick="editarFuncionario(${f.id})">Editar</button>
          <button class="danger small" onclick="removerFuncionario(${f.id})">Remover</button>
        </div>
      `;
      listaFuncionariosEl.appendChild(li);
    });

  totalFuncionariosEl.textContent = funcionarios.length;
}
