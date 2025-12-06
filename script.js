// carregar
function loadFuncionarios(){return JSON.parse(localStorage.getItem("funcs")||"[]")}
function saveFuncionarios(l){localStorage.setItem("funcs",JSON.stringify(l))}

let funcionarios = loadFuncionarios();

// renderizar lista
function renderFuncionarios(){
  const lista = document.getElementById("lista-funcionarios");
  const total = document.getElementById("total-funcionarios");

  lista.innerHTML = "";

  funcionarios.forEach((f, index) => {
    const li = document.createElement("li");
    li.className = "list-item-row";
    li.innerHTML = `
      <span class="nome">${f}</span>
      <div class="list-item-actions">
        <button class="secondary small" onclick="editarFuncionario(${index})">Editar</button>
        <button class="danger small" onclick="removerFuncionario(${index})">Remover</button>
      </div>
    `;
    lista.appendChild(li);
  });

  total.textContent = funcionarios.length;
}

// adicionar
document.getElementById("form-add-funcionario").addEventListener("submit", e=>{
  e.preventDefault();
  let nome = document.getElementById("nome-funcionario").value.trim();
  if(nome){
    funcionarios.push(nome);
    saveFuncionarios(funcionarios);
    renderFuncionarios();
    document.getElementById("nome-funcionario").value="";
  }
});

// remover
function removerFuncionario(i){
  if(confirm("Deseja remover?")){
    funcionarios.splice(i,1);
    saveFuncionarios(funcionarios);
    renderFuncionarios();
  }
}

// editar
function editarFuncionario(i){
  let novoNome = prompt("Alterar nome:", funcionarios[i]);
  if(novoNome && novoNome.trim() !== ""){
    funcionarios[i] = novoNome.trim();
    saveFuncionarios(funcionarios);
    renderFuncionarios();
  }
}

// tabs funcionando
document.querySelectorAll(".tab-button").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".tab-button").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");

    document.querySelectorAll(".tab-section").forEach(s=>s.classList.remove("active"));
    document.getElementById(btn.dataset.target).classList.add("active");
  });
});

// iniciar
renderFuncionarios();
