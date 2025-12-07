// ==============================
// UTILITÁRIOS
// ==============================
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const nowISO = () => new Date().toISOString().split("T")[0];

// ==============================
// SISTEMA DE ABAS
// ==============================
$$(".tab-button").forEach(btn => {
  btn.onclick = () => {
    $$(".tab-button").forEach(b => b.classList.remove("active"));
    $$(".tab-section").forEach(sec => sec.classList.remove("active"));

    btn.classList.add("active");
    $("#" + btn.dataset.target).classList.add("active");
  };
});

// ==============================
// BANCO DE DADOS LOCAL
// ==============================
let funcionarios = JSON.parse(localStorage.getItem("funcionarios") || "[]");
let rodizio = JSON.parse(localStorage.getItem("rodizio") || "[]");
let historico = JSON.parse(localStorage.getItem("historico") || "[]");
let logoBase64 = localStorage.getItem("logoBase64") || null;

// ==============================
// SALVAR
// ==============================
function salvarTudo() {
  localStorage.setItem("funcionarios", JSON.stringify(funcionarios));
  localStorage.setItem("rodizio", JSON.stringify(rodizio));
  localStorage.setItem("historico", JSON.stringify(historico));
  if (logoBase64) localStorage.setItem("logoBase64", logoBase64);
}

// ==============================
// LOGO PREVIEW + UPLOAD
// ==============================
function atualizarPreviewLogo() {
  const box = $("#logo-preview-container");
  box.innerHTML = logoBase64
    ? `<img src="${logoBase64}" class="logo-preview-img">`
    : `<p>Nenhuma logo selecionada.</p>`;
}

$("#input-logo").onchange = e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    logoBase64 = reader.result;
    salvarTudo();
    atualizarPreviewLogo();
  };

  reader.readAsDataURL(file);
};

$("#btn-remover-logo").onclick = () => {
  logoBase64 = null;
  salvarTudo();
  atualizarPreviewLogo();
};

// ==============================
// LISTA DE FUNCIONÁRIOS
// ==============================
function atualizarFuncionarios() {
  const lista = $("#lista-funcionarios");
  lista.innerHTML = "";

  funcionarios.forEach((nome, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${nome}</span>
      <button class="delete-btn" data-index="${i}">🗑</button>
    `;
    lista.appendChild(li);
  });

  $("#total-funcionarios").innerText = funcionarios.length;

  $$("#lista-funcionarios .delete-btn").forEach(btn => {
    btn.onclick = () => {
      funcionarios.splice(btn.dataset.index, 1);
      salvarTudo();
      atualizarFuncionarios();
      atualizarPresenca();
    };
  });
}

// ==============================
// ADICIONAR FUNCIONÁRIO
// ==============================
$("#form-add-funcionario").onsubmit = e => {
  e.preventDefault();

  const nome = $("#nome-funcionario").value.trim();
  if (!nome) return;

  funcionarios.push(nome);
  salvarTudo();

  $("#nome-funcionario").value = "";
  atualizarFuncionarios();
  atualizarPresenca();
};

// ==============================
// PRESENÇA DO DIA + MARCAR TODOS
// ==============================
function atualizarPresenca() {
  const lista = $("#lista-presenca");
  lista.innerHTML = "";

  funcionarios.forEach(nome => {
    const li = document.createElement("li");
    li.innerHTML = `
      <label class="checkbox-item">
        <input type="checkbox" class="presenca-check" data-nome="${nome}">
        <span>${nome}</span>
      </label>
    `;
    lista.appendChild(li);
  });

  atualizarTotalPresentes();
}

function atualizarTotalPresentes() {
  $("#total-presentes").innerText =
    $$(".presenca-check:checked").length;
}

document.addEventListener("change", e => {
  if (e.target.classList.contains("presenca-check"))
    atualizarTotalPresentes();
});

// BOTÃO MARCAR / DESMARCAR TODOS — (FUNCIONANDO)
const btnMD = document.createElement("button");
btnMD.innerText = "Marcar / Desmarcar Todos";
btnMD.className = "secondary";
btnMD.style.marginTop = "10px";
$("#section-dia .card").appendChild(btnMD);

btnMD.onclick = () => {
  const checks = $$(".presenca-check");
  const marcar = checks.some(c => !c.checked);

  checks.forEach(c => (c.checked = marcar));
  atualizarTotalPresentes();
};

// ==============================
// GERAR ESCALA DO DIA
// ==============================
function gerarLayoutDia(presentes, data) {
  return `
    ${logoBase64 ? `<img src="${logoBase64}" class="print-logo">` : ""}
    <h2>Escala - ${data}</h2>
    <ul>${presentes.map(p => `<li>${p}</li>`).join("")}</ul>
  `;
}

$("#btn-gerar-dia").onclick = () => {
  const data = $("#data-dia").value || nowISO();
  const presentes = $$(".presenca-check:checked").map(c => c.dataset.nome);

  const html = gerarLayoutDia(presentes, data);
  $("#preview-dia").innerHTML = html;
  $("#preview-dia").classList.remove("empty");

  $("#btn-salvar-dia").disabled = false;
  $("#btn-imprimir-dia").disabled = false;
};

// ==============================
// SALVAR HISTÓRICO
// ==============================
$("#btn-salvar-dia").onclick = () => {
  const data = $("#data-dia").value || nowISO();

  historico.push({
    id: Date.now(),
    data,
    presentes: $$(".presenca-check:checked").map(c => c.dataset.nome)
  });

  salvarTudo();
  carregarHistorico();
  alert("Escala salva!");
};

// ==============================
// HISTÓRICO
// ==============================
function carregarHistorico() {
  const lista = $("#lista-historico");
  lista.innerHTML = "";

  historico.forEach(item => {
    const li = document.createElement("li");

    li.innerHTML = `
      <strong>${item.data}</strong>
      <button data-id="${item.id}" class="abrir">Abrir</button>
    `;

    lista.appendChild(li);
  });

  $$("#lista-historico .abrir").forEach(btn => {
    btn.onclick = () => {
      const item = historico.find(x => x.id == btn.dataset.id);

      $("#preview-dia").innerHTML =
        gerarLayoutDia(item.presentes, item.data);

      $("#btn-imprimir-dia").disabled = false;

      document.querySelector(`[data-target="section-dia"]`).click();
    };
  });
}

$("#btn-apagar-historico").onclick = () => {
  if (!confirm("Deseja apagar tudo?")) return;

  historico = [];
  salvarTudo();
  carregarHistorico();
};

// ==============================
// IMPRESSÃO — COM LOGO CORRIGIDA
// ==============================
$("#btn-imprimir-dia").onclick = () => {
  let html = $("#preview-dia").innerHTML;

  if (logoBase64) {
    html = `
      <div style="text-align:center; margin-bottom:10px;">
        <img src="${logoBase64}" style="max-width:160px;">
      </div>
    ` + html;
  }

  $("#print-area").innerHTML = html;
  window.print();
};

// ==============================
// EXPORTAR PARA EXCEL
// ==============================
function exportarExcelDia() {
  const presentes = $$(".presenca-check:checked").map(c => c.dataset.nome);

  let csv = "Colaborador\n" + presentes.join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "escala-dia.csv";
  a.click();
}

const btnExcel = document.createElement("button");
btnExcel.innerText = "Exportar Excel";
btnExcel.className = "primary";
btnExcel.style.marginTop = "10px";
$("#section-dia .actions-row").appendChild(btnExcel);

btnExcel.onclick = exportarExcelDia;

// ==============================
// INICIAR
// ==============================
atualizarFuncionarios();
atualizarPresenca();
carregarHistorico();
atualizarPreviewLogo();
