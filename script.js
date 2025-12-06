//--------------------------------------------------
// Base de dados em memória
//--------------------------------------------------
let funcionarios = []; // {id, nome}

// Gera ID único
const uid = () => Math.random().toString(36).substr(2, 9);

//--------------------------------------------------
// Salvar / Carregar via localStorage
//--------------------------------------------------
function salvar() {
    localStorage.setItem("funcionarios", JSON.stringify(funcionarios));
}

function carregar() {
    const data = localStorage.getItem("funcionarios");
    if (data) funcionarios = JSON.parse(data);
}

//--------------------------------------------------
// Renderizar lista de colaboradores
//--------------------------------------------------
function renderFuncionarios() {
    const div = document.getElementById("listaColaboradores");
    div.innerHTML = "";

    if (funcionarios.length === 0) {
        div.innerHTML = "<p>Nenhum colaborador cadastrado.</p>";
        return;
    }

    funcionarios.forEach((f) => {
        const linha = document.createElement("div");
        linha.className = "colab-item";

        linha.innerHTML = `
            <span>${f.nome}</span>
            <button class="delete-btn">Excluir</button>
        `;

        linha.querySelector(".delete-btn").onclick = () => {
            funcionarios = funcionarios.filter((x) => x.id !== f.id);
            salvar();
            renderFuncionarios();
            populateAllFuncLists();
        };

        div.appendChild(linha);
    });
}

//--------------------------------------------------
// Tabs
//--------------------------------------------------
function setupTabs() {
    document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));

            btn.classList.add("active");
            document.getElementById(btn.dataset.tab).classList.add("active");
        });
    });
}

//--------------------------------------------------
// Funções (HTML estático)
//--------------------------------------------------

function populateFuncList(ul) {
    if (!ul) return;
    ul.innerHTML = "";

    if (funcionarios.length === 0) {
        ul.innerHTML = "<li><em>Nenhum colaborador cadastrado</em></li>";
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
            chk.className = "funcao-checkbox";
            chk.dataset.id = f.id;

            const span = document.createElement("span");
            span.className = "nome";
            span.textContent = f.nome;

            main.appendChild(chk);
            main.appendChild(span);
            li.appendChild(main);
            ul.appendChild(li);

            // Limite
            chk.addEventListener("change", () => {
                const card = ul.closest(".card");
                const inp = card.querySelector(".quantidade-funcao");
                const limite = Number(inp.value) || Infinity;

                const marcados = ul.querySelectorAll("input:checked").length;

                if (marcados > limite) {
                    chk.checked = false;
                    alert(`Limite máximo: ${limite}`);
                }
            });
        });
}

function populateAllFuncLists() {
    document
        .querySelectorAll("ul.colaboradores-lista-selecao[data-funcao]")
        .forEach((ul) => populateFuncList(ul));
}

function setupMarkButtons() {
    document.querySelectorAll(".mark-all-btn").forEach((btn) => {
        btn.onclick = () => {
            const card = btn.closest(".card");
            card.querySelectorAll("input[type=checkbox]").forEach((c) => (c.checked = true));
        };
    });

    document.querySelectorAll(".unmark-all-btn").forEach((btn) => {
        btn.onclick = () => {
            const card = btn.closest(".card");
            card.querySelectorAll("input[type=checkbox]").forEach((c) => (c.checked = false));
        };
    });
}

function setupQuantidadeInputs() {
    document.querySelectorAll(".quantidade-funcao").forEach((inp) => {
        inp.oninput = () => {
            if (Number(inp.value) < 1) inp.value = 1;

            const card = inp.closest(".card");
            const ul = card.querySelector("ul.colaboradores-lista-selecao");
            const limite = Number(inp.value);
            const checks = [...ul.querySelectorAll("input:checked")];

            if (checks.length > limite) {
                const extras = checks.slice(limite);
                extras.forEach((c) => (c.checked = false));
                alert("Excedeu o limite, removido automaticamente.");
            }
        };
    });
}

//--------------------------------------------------
// Escala / Impressão
//--------------------------------------------------
function gerarEscala() {
    const preview = document.getElementById("previewEscala");
    preview.innerHTML = "";

    const funcoes = {
        almoco1: [],
        almoco2: [],
        lanche: []
    };

    document.querySelectorAll("ul.colaboradores-lista-selecao").forEach((ul) => {
        const key = ul.dataset.funcao;
        const selecionados = [...ul.querySelectorAll("input:checked")].map((chk) => {
            const f = funcionarios.find((x) => x.id === chk.dataset.id);
            return f ? f.nome : "";
        });
        funcoes[key] = selecionados;
    });

    let html = `<div class="card">
        <h2>Escala Gerada</h2>
        <pre>${JSON.stringify(funcoes, null, 2)}</pre>
    </div>`;

    preview.innerHTML = html;
}

//--------------------------------------------------
// Inicialização
//--------------------------------------------------
function init() {
    carregar();
    renderFuncionarios();
    setupTabs();
    setupMarkButtons();
    setupQuantidadeInputs();
    populateAllFuncLists();

    document.getElementById("btnAddColaborador").onclick = () => {
        const nome = document.getElementById("nomeColaborador").value.trim();
        if (!nome) return alert("Digite um nome!");

        funcionarios.push({ id: uid(), nome });
        salvar();
        renderFuncionarios();
        populateAllFuncLists();

        document.getElementById("nomeColaborador").value = "";
    };

    document.getElementById("btnGerarEscala").onclick = gerarEscala;
}

document.addEventListener("DOMContentLoaded", init);
