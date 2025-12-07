// =========================================
// UTILITÁRIOS
// =========================================
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function salvarLocal(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function carregarLocal(key, fallback) {
  const d = localStorage.getItem(key);
  return d ? JSON.parse(d) : fallback;
}

function hojeISO() {
  return new Date().toISOString().split("T")[0];
}

// =========================================
// BASE DE DADOS LOCAL
// =========================================
let equipe = carregarLocal("equipe", []);
let rodizio = carregarLocal("rodizio", {});
let logoBase64 = localStorage.getItem("logoBase64") || null;
let historico = carregarLocal("historico", []);

// =========================================
// TROCA DE ABAS
// =========================================
$$(".tab-button").forEach(btn => {
  btn.addEventListener("click", () => {
    $$(".tab-button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    $$(".tab-section").forEach(sec => sec.classList.remove("active"));
    $("#" + btn.dataset.target).classList.add("active");

    if (btn.dataset.target === "section-equipe")
      atualizarListaEquipe();

    if (btn.dataset.target === "section-dia")
      montarListaPresenca();
  });
});

// =========================================
// EQUIPE — ADICIONAR
// =========================================
$("#form-add-funcionario").addEventListener("submit", e => {
  e.preventDefault();
  const nome = $("#nome-funcionario").value.trim();
  if (!nome) return;

  equipe.push(nome);
  equipe = [...new Set(equipe)];  // evita duplicados

  salvarLocal("equipe", equipe);
  $("#nome-funcionario").value = "";
  atualizarListaEquipe();
  montarListaPresenca();
});

// =========================================
// LISTA DA EQUIPE
// =========================================
function atualizarListaEquipe() {
  const ul = $("#lista-funcionarios");
  ul.innerHTML = "";

  equipe.forEach(nome => {
    const li = document.createElement("li");
    li.textContent = nome;
    ul.appendChild(li);
  });

  $("#total-funcionarios").textContent = equipe.length;
}

// =========================================
// LISTA DE PRESENÇA
// =========================================
function montarListaPresenca() {
  const ul = $("#lista-presenca");
  ul.innerHTML = "";

  equipe.forEach(nome => {
    const li = document.createElement("li");

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.dataset.nome = nome;

    li.appendChild(chk);
    li.appendChild(document.createTextNode(nome));
    ul.appendChild(li);
  });

  $("#total-presentes").textContent = 0;

  $$("#lista-presenca input[type=checkbox]").forEach(chk => {
    chk.addEventListener("change", () => {
      const tot = $$("#lista-presenca input:checked").length;
      $("#total-presentes").textContent = tot;
    });
  });
}

// =========================================
// MARCAR / DESMARCAR TODOS
// =========================================
function marcarTodos(valor) {
  $$("#lista-presenca input[type=checkbox]").forEach(chk => chk.checked = valor);
  $("#total-presentes").textContent = valor ? equipe.length : 0;
}

document.addEventListener("DOMContentLoaded", () => {
  // cria botões se não existirem ainda
  if (!$("#btn-marcar-todos")) {
    const div = document.createElement("div");
    div.className = "actions-row";

    div.innerHTML = `
      <button id="btn-marcar-todos" class="secondary">Marcar todos</button>
      <button id="btn-desmarcar-todos" class="secondary">Desmarcar todos</button>
    `;

    $("#section-dia .card").after(div);

    $("#btn-marcar-todos").onclick = () => marcarTodos(true);
    $("#btn-desmarcar-todos").onclick = () => marcarTodos(false);
  }
});

// =========================================
// GERAR ESCALA DO DIA (EDIÇÃO MANUAL MANTIDA)
// =========================================
$("#btn-gerar-dia").addEventListener("click", () => {
  const data = $("#data-dia").value || hojeISO();
  const presentes = $$("#lista-presenca input:checked").map(c => c.dataset.nome);

  if (presentes.length === 0) {
    alert("Selecione quem está presente.");
    return;
  }

  const div = $("#preview-dia");
  div.classList.remove("empty");
  div.innerHTML = `
    <h2>Escala — ${data}</h2>
    <p><strong>Presentes:</strong> ${presentes.join(", ")}</p>

    <h3>Defina quantidade e selecione (EDIÇÃO 100% MANUAL preservada)</h3>

    <div class="setor">
      <strong>Almoço</strong>
      <select class="qtd" data-setor="almoco">
        ${[0,1,2,3,4,5,6].map(n=>`<option>${n}</option>`).join("")}
      </select>
      <div class="slots" id="slots-almoco"></div>
    </div>

    <div class="setor">
      <strong>Lanche</strong>
      <select class="qtd" data-setor="lanche">
        ${[0,1,2,3,4,5,6].map(n=>`<option>${n}</option>`).join("")}
      </select>
      <div class="slots" id="slots-lanche"></div>
    </div>

    <div class="setor">
      <strong>Bar (2 ajudantes)</strong>
      <select class="qtd" data-setor="bar">
        ${[0,1,2].map(n=>`<option ${n===2?"selected":""}>${n}</option>`).join("")}
      </select>
      <div class="slots" id="slots-bar"></div>
    </div>
  `;

  // criação dinâmica dos selects
  $$(".qtd").forEach(sel => {
    sel.addEventListener("change", () => {
      const setor = sel.dataset.setor;
      const qtd = Number(sel.value);
      const container = $("#slots-" + setor);

      container.innerHTML = "";
      for (let i = 0; i < qtd; i++) {
        const s = document.createElement("select");
        presentes.forEach(p => {
          const op = document.createElement("option");
          op.textContent = p;
          s.appendChild(op);
        });
        container.appendChild(s);
      }
    });

    sel.dispatchEvent(new Event("change"));
  });

  $("#btn-imprimir-dia").disabled = false;
  $("#btn-salvar-dia").disabled = false;
});

// =========================================
// SALVAR HISTÓRICO
// =========================================
$("#btn-salvar-dia").addEventListener("click", () => {
  const html = $("#preview-dia").innerHTML;
  historico.push({
    data: hojeISO(),
    conteudo: html
  });

  salvarLocal("historico", historico);
  alert("Escala salva no histórico!");
});

// =========================================
// IMPRESSÃO COM LOGO (CORREÇÃO FEITA AQUI!)
// =========================================
$("#btn-imprimir-dia").addEventListener("click", () => {
  const area = $("#preview-dia").innerHTML;

  const print = $("#print-area");
  print.innerHTML = `
    <div style="text-align:center; margin-bottom:20px;">
      ${logoBase64 ? `<img src="${logoBase64}" style="max-height:120px;" />` : ""}
    </div>
    ${area}
  `;

  window.print();
});

// =========================================
// EXPORTAR EXCEL
// =========================================
$("#btn-exportar-excel")?.addEventListener("click", () => {
  const tabela = $("#preview-dia").innerText;
  const blob = new Blob([tabela], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "escala.xls";
  a.click();

  URL.revokeObjectURL(url);
});

// =========================================
// LOGO — UPLOAD E SALVAR
// =========================================
$("#input-logo").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    logoBase64 = reader.result;
    localStorage.setItem("logoBase64", logoBase64);
    atualizarPreviewLogo();
  };
  reader.readAsDataURL(file);
});

$("#btn-remover-logo").addEventListener("click", () => {
  logoBase64 = null;
  localStorage.removeItem("logoBase64");
  atualizarPreviewLogo();
});

function atualizarPreviewLogo() {
  const div = $("#logo-preview-container");
  if (!logoBase64) {
    div.innerHTML = "<p>Nenhuma logo selecionada.</p>";
  } else {
    div.innerHTML = `<img src="${logoBase64}" style="max-height:120px;">`;
  }
}

atualizarPreviewLogo();
atualizarListaEquipe();
montarListaPresenca();
