// script.js — versão completa, compacta, funcional

const STORAGE = {
  FUNC: "tds_escala_funcionarios",
  LOGO: "tds_escala_logo",
  ROD: "tds_escala_rodizio_offset",
  HIST: "tds_escala_historico"
};

function load(k){try{const s=localStorage.getItem(k);return s?JSON.parse(s):null}catch(e){return null}}
function save(k,v){localStorage.setItem(k,JSON.stringify(v))}

let funcionarios = load(STORAGE.FUNC) || [];
let rodizioOffset = (localStorage.getItem(STORAGE.ROD)||0)|0;
let ultimoResultadoDia = null;

const els = {
  listaFuncionarios: document.getElementById("lista-funcionarios"),
  totalFuncionarios: document.getElementById("total-funcionarios"),
  formAdd: document.getElementById("form-add-funcionario"),
  inputNome: document.getElementById("nome-funcionario"),
  dataDia: document.getElementById("data-dia"),
  listaPresenca: document.getElementById("lista-presenca"),
  totalPresentes: document.getElementById("total-presentes"),
  btnGerar: document.getElementById("btn-gerar-dia"),
  btnSalvar: document.getElementById("btn-salvar-dia"),
  btnImprimir: document.getElementById("btn-imprimir-dia"),
  previewDia: document.getElementById("preview-dia"),
  printArea: document.getElementById("print-area"),
  inputLogo: document.getElementById("input-logo"),
  logoPreview: document.getElementById("logo-preview-container"),
  btnRemoverLogo: document.getElementById("btn-remover-logo"),
  btnResetRodizio: document.getElementById("btn-reset-rodizio")
};

function renderLogoPreview(){
  const logo = load(STORAGE.LOGO);
  els.logoPreview.innerHTML = "";
  if(!logo){
    els.logoPreview.innerHTML="<p>Nenhuma logo selecionada.</p>";
    return;
  }
  const img=document.createElement("img");
  img.src=logo;
  img.style.maxWidth="150px";
  els.logoPreview.appendChild(img);
}

function handleLogoUpload(e){
  const file=e.target.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    save(STORAGE.LOGO,ev.target.result);
    renderLogoPreview();
  };
  reader.readAsDataURL(file);
}

function removerLogo(){
  localStorage.removeItem(STORAGE.LOGO);
  renderLogoPreview();
}

function renderFuncionarios(){
  els.listaFuncionarios.innerHTML="";
  funcionarios.forEach((n,i)=>{
    const li=document.createElement("li");
    li.innerHTML=`
      <span>${n}</span>
      <button data-i="${i}" class="danger small">X</button>
    `;
    els.listaFuncionarios.appendChild(li);
    li.querySelector("button").onclick=()=>{
      funcionarios.splice(i,1);
      save(STORAGE.FUNC,funcionarios);
      renderFuncionarios();
      renderListaPresenca();
    };
  });
  els.totalFuncionarios.textContent=funcionarios.length;
}

function renderListaPresenca(){
  els.listaPresenca.innerHTML="";
  funcionarios.forEach((n,i)=>{
    const li=document.createElement("li");
    li.innerHTML=`
      <label>
        <input type="checkbox" data-i="${i}">
        ${n}
      </label>
    `;
    els.listaPresenca.appendChild(li);
  });
  updatePresentes();
}

function updatePresentes(){
  const marcados=[...els.listaPresenca.querySelectorAll("input:checked")].length;
  els.totalPresentes.textContent=marcados;
}

function marcarTodos(v){
  [...els.listaPresenca.querySelectorAll("input")].forEach(ch=>ch.checked=v);
  updatePresentes();
}

function gerarEscalaDia(){
  const data=els.dataDia.value;
  if(!data){alert("Escolha a data!");return}
  const presentes=[...els.listaPresenca.querySelectorAll("input:checked")].map(ch=>funcionarios[ch.dataset.i]);
  if(presentes.length===0){alert("Selecione quem está presente.");return}

  let arr=[...presentes];
  let rot=rodizioOffset%arr.length;
  arr=arr.slice(rot).concat(arr.slice(0,rot));

  const grupos={
    almoco: arr[0]||"",
    lanche: arr[1]||"",
    aparadores: arr.slice(2,4),
    bar: arr.slice(4)
  };

  ultimoResultadoDia={data,grupos};

  renderPreviewDia(ultimoResultadoDia);
  els.btnSalvar.disabled=false;
  els.btnImprimir.disabled=false;

  rodizioOffset++;
  localStorage.setItem(STORAGE.ROD,rodizioOffset);
}

function renderPreviewDia(obj){
  const {data,grupos}=obj;
  const logo=load(STORAGE.LOGO);
  els.previewDia.innerHTML="";

  const wrap=document.createElement("div");
  wrap.className="print-wrapper";

  if(logo){
    const img=document.createElement("img");
    img.src=logo;
    img.style.maxWidth="120px";
    wrap.appendChild(img);
  }

  const h=document.createElement("h2");
  h.textContent="Escala do Dia — "+new Date(data).toLocaleDateString("pt-BR");
  wrap.appendChild(h);

  wrap.innerHTML+=`
    <p><strong>Almoço:</strong> ${grupos.almoco||"-"}</p>
    <p><strong>Lanche:</strong> ${grupos.lanche||"-"}</p>
    <p><strong>Aparadores:</strong> ${grupos.aparadores.join(", ")||"-"}</p>
    <p><strong>Bar:</strong> ${grupos.bar.join(", ")||"-"}</p>
  `;

  els.previewDia.classList.remove("empty");
  els.previewDia.appendChild(wrap);
}

function imprimirDia(){
  if(!ultimoResultadoDia)return;
  const {data,grupos}=ultimoResultadoDia;
  const logo=load(STORAGE.LOGO);

  els.printArea.innerHTML="";

  const area=document.createElement("div");
  area.className="print-wrapper";

  if(logo){
    area.innerHTML+=`<img src="${logo}" style="max-width:140px">`;
  }

  area.innerHTML+=`
    <h2>Escala do Dia — ${new Date(data).toLocaleDateString("pt-BR")}</h2>
    <p><strong>Almoço:</strong> ${grupos.almoco||"-"}</p>
    <p><strong>Lanche:</strong> ${grupos.lanche||"-"}</p>
    <p><strong>Aparadores:</strong> ${grupos.aparadores.join(", ")||"-"}</p>
    <p><strong>Bar:</strong> ${grupos.bar.join(", ")||"-"}</p>
  `;

  els.printArea.appendChild(area);
  window.print();
}

function salvarDia(){
  if(!ultimoResultadoDia)return;
  const hist=load(STORAGE.HIST)||[];
  hist.push(ultimoResultadoDia);
  save(STORAGE.HIST,hist);
  alert("Escala salva no histórico.");
}

function exportarExcel(){
  if(!ultimoResultadoDia){alert("Gere a escala primeiro.");return}
  const {data,grupos}=ultimoResultadoDia;

  const rows=[
    ["Escala do Dia",new Date(data).toLocaleDateString("pt-BR")],
    [],
    ["Função","Colaboradores"],
    ["Almoço",grupos.almoco],
    ["Lanche",grupos.lanche],
    ["Aparadores",grupos.aparadores.join(", ")],
    ["Bar",grupos.bar.join(", ")]
  ];

  let csv="";
  rows.forEach(r=>{csv+=r.join(";")+"\n"});

  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="escala.csv";
  a.click();
  URL.revokeObjectURL(url);
}

els.inputLogo.onchange=handleLogoUpload;
els.btnRemoverLogo.onclick=removerLogo;
els.formAdd.onsubmit=e=>{
  e.preventDefault();
  const n=els.inputNome.value.trim();
  if(!n)return;
  funcionarios.push(n);
  save(STORAGE.FUNC,funcionarios);
  els.inputNome.value="";
  renderFuncionarios();
  renderListaPresenca();
};

els.listaPresenca.onchange=updatePresentes;
els.btnGerar.onclick=gerarEscalaDia;
els.btnSalvar.onclick=salvarDia;
els.btnImprimir.onclick=imprimirDia;

// BOTÃO MARCAR/DESMARCAR TODOS (CRIA AUTOMÁTICO)
const btnMD=document.createElement("button");
btnMD.textContent="Marcar / Desmarcar todos";
btnMD.className="secondary";
btnMD.style.marginTop="10px";
btnMD.onclick=()=>{
  const checks=[...els.listaPresenca.querySelectorAll("input")];
  const marcar = checks.some(c=>!c.checked);
  marcarTodos(marcar);
};
els.listaPresenca.parentElement.appendChild(btnMD);

// BOTÃO EXCEL NO TOPO
const btnExcelTopo=document.createElement("button");
btnExcelTopo.textContent="Exportar Excel";
btnExcelTopo.className="primary";
btnExcelTopo.onclick=exportarExcel;
els.btnGerar.parentElement.appendChild(btnExcelTopo);

// BOTÃO EXCEL NO PREVIEW
const btnExcelPreview=document.createElement("button");
btnExcelPreview.textContent="Exportar Excel";
btnExcelPreview.className="primary";
btnExcelPreview.onclick=exportarExcel;
els.previewDia.parentElement.appendChild(btnExcelPreview);

renderLogoPreview();
renderFuncionarios();
renderListaPresenca();
