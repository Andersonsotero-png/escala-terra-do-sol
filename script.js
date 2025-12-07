// compact script.js (opção B)

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
  btnResetRodizio: document.getElementById("btn-reset-rodizio"),
  listaHistorico: document.getElementById("lista-historico"),
  btnApagarHistorico: document.getElementById("btn-apagar-historico"),
  btnExportExcelTop: document.getElementById("btn-excel-dia"),
  btnExportExcelPreview: document.getElementById("btn-excel-preview"),
  btnMarcarTodos: document.getElementById("btn-marcar-todos")
};

function uid(){return Date.now()+Math.random().toString(36).slice(2,8)}
function todayISO(d=new Date()){return d.toISOString().slice(0,10)}
function formatBR(iso){if(!iso)return"";const [y,m,d]=iso.split("-");return `${d.padStart(2,"0")}/${m.padStart(2,"0")}/${y}`;}
function nowBR(){return new Date().toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}

function persistFuncs(){save(STORAGE.FUNC,funcionarios)}
function persistRod(){localStorage.setItem(STORAGE.ROD,String(rodizioOffset))}
function loadHistorico(){return load(STORAGE.HIST) || {}}
function saveHistorico(h){save(STORAGE.HIST,h)}
function loadLogo(){return localStorage.getItem(STORAGE.LOGO)}
function saveLogoData(d){ if(d) localStorage.setItem(STORAGE.LOGO,d); else localStorage.removeItem(STORAGE.LOGO) }

function renderFuncionarios(){
  els.listaFuncionarios.innerHTML="";
  if(!funcionarios.length){els.listaFuncionarios.innerHTML="<li>Nenhum colaborador cadastrado ainda.</li>";els.totalFuncionarios.textContent="0";return}
  funcionarios.forEach(f=>{
    const li=document.createElement("li"); li.className="list-item-row";
    li.innerHTML=`<div class="list-item-main"><span class="nome">${f.nome}</span><small>ID: ${f.id}</small></div>
      <div class="list-item-actions"><button class="danger small btn-del">Remover</button></div>`;
    li.querySelector(".btn-del").onclick=()=>{ if(confirm(`Remover ${f.nome}?`)){funcionarios=funcionarios.filter(x=>x.id!==f.id);persistFuncs(); renderFuncionarios(); renderListaPresenca(); renderHistorico()} };
    els.listaFuncionarios.appendChild(li);
  });
  els.totalFuncionarios.textContent=String(funcionarios.length);
}

function renderListaPresenca(){
  els.listaPresenca.innerHTML="";
  if(!funcionarios.length){els.listaPresenca.innerHTML="<li>Cadastre colaboradores na aba Equipe.</li>";els.totalPresentes.textContent="0";return}
  funcionarios.forEach(f=>{
    const li=document.createElement("li"); li.className="list-item-row";
    const main=document.createElement("div"); main.className="list-item-main";
    const chk=document.createElement("input"); chk.type="checkbox"; chk.dataset.id=f.id;
    const span=document.createElement("span"); span.className="nome"; span.textContent=f.nome;
    main.appendChild(chk); main.appendChild(span); li.appendChild(main);
    els.listaPresenca.appendChild(li);
  });
  atualizarTotalPresentes();
}

function atualizarTotalPresentes(){
  const checks=els.listaPresenca.querySelectorAll("input[type='checkbox']");
  let n=0; checks.forEach(c=>{ if(c.checked) n++});
  els.totalPresentes.textContent=String(n);
}

els.listaPresenca.addEventListener("change",atualizarTotalPresentes);
if(els.btnMarcarTodos) els.btnMarcarTodos.addEventListener("click",()=>{ els.listaPresenca.querySelectorAll("input[type='checkbox']").forEach(c=>c.checked=true); atualizarTotalPresentes() })

els.formAdd.addEventListener("submit",e=>{ e.preventDefault(); const nome=els.inputNome.value.trim(); if(!nome) return; const novo={id:uid(),nome}; funcionarios.push(novo); persistFuncs(); els.inputNome.value=""; renderFuncionarios(); renderListaPresenca(); renderHistorico() })

// logo
function renderLogoPreview(){
  const src = loadLogo();
  els.logoPreview.innerHTML = "";
  if(src){ const img=document.createElement("img"); img.src=src; img.alt="Logo"; els.logoPreview.appendChild(img) } else { els.logoPreview.innerHTML="<p>Nenhuma logo selecionada.</p>" }
}
if(els.inputLogo){
  els.inputLogo.addEventListener("change",ev=>{
    const file=ev.target.files[0]; if(!file) return;
    const r=new FileReader(); r.onload=e=>{ saveLogoData(e.target.result); renderLogoPreview(); }; r.readAsDataURL(file);
  })
}
if(els.btnRemoverLogo) els.btnRemoverLogo.addEventListener("click",()=>{ if(confirm("Remover logo?")){ saveLogoData(null); renderLogoPreview() }})

// scale logic (preserves DOM order of presentes)
function getPresentesDoDia(){
  const arr=[]; const checks = els.listaPresenca.querySelectorAll("input[type='checkbox']");
  checks.forEach(chk=>{ if(chk.checked){ const id=chk.dataset.id; const f = funcionarios.find(x=>String(x.id)===String(id)); if(f) arr.push(f) }});
  return arr;
}

function rotateArray(arr,offset){ if(!arr||!arr.length) return []; const n=arr.length; const o=((offset%n)+n)%n; return arr.slice(o).concat(arr.slice(0,o)) }

function gerarEscalaParaData(dataISO,presentes,offsetBase){
  const listaRodizio = rotateArray(presentes, offsetBase);
  const roles = { bar1:null, bar2:null, aparadores:[null,null,null], almocoTurma1:[], almocoTurma2:[], lancheTurma1:[], lancheTurma2:[], lancheTurma3:[] };
  if(!listaRodizio.length) return {dataISO, weekday: weekdayName(dataISO), roles, presentes:[]}
  const pool = listaRodizio.slice();
  if(pool.length>0) roles.bar1 = pool.shift();
  if(pool.length>0) roles.bar2 = pool.shift();
  for(let i=0;i<3;i++) if(pool.length>0) roles.aparadores[i]=pool.shift();
  const restantes = pool.slice();
  if(restantes.length>0){
    const metade = Math.ceil(restantes.length/2);
    roles.almocoTurma1 = restantes.slice(0,metade);
    roles.almocoTurma2 = restantes.slice(metade);
    const t1Size = Math.ceil(restantes.length/3);
    const t2Size = Math.ceil((restantes.length-t1Size)/2);
    roles.lancheTurma1 = restantes.slice(0,t1Size);
    roles.lancheTurma2 = restantes.slice(t1Size,t1Size+t2Size);
    roles.lancheTurma3 = restantes.slice(t1Size+t2Size);
  }
  return { dataISO, weekday: weekdayName(dataISO), roles, presentes: presentes.slice() }
}

function weekdayName(dateStr){ if(!dateStr) return ""; const [y,m,d]=dateStr.split("-").map(Number); const date=new Date(y,m-1,d); const dias=["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"]; return dias[date.getDay()] }

// render document
function renderEscalaDocumento(escala){
  const logo = loadLogo(); const dataBR = formatBR(escala.dataISO); const weekday = escala.weekday || weekdayName(escala.dataISO);
  const nome = f => f?f.nome:"—";
  const map = list => list && list.length? list.map(p=>p.nome).join(", "):"—";
  const apar = (escala.roles.aparadores||[]).map(a=>nome(a));
  const html = `<article class="escala-documento">
    <header class="escala-header">
      ${logo?`<img src="${logo}" alt="Logo" />`:''}
      <h1>BARRACA TERRA DO SOL</h1>
      <h2>Escala Operacional do Dia</h2>
      <p>${weekday} — ${dataBR}</p>
    </header>
    <section class="escala-section"><h3>🍽 Almoço</h3>
      <table class="escala-table"><thead><tr><th>Turma</th><th>Horário</th><th>Colaboradores</th></tr></thead>
      <tbody>
        <tr><td>1ª Turma</td><td>10:00 → 10:40</td><td>${map(escala.roles.almocoTurma1)}</td></tr>
        <tr><td>2ª Turma</td><td>10:40 → 11:20</td><td>${map(escala.roles.almocoTurma2)}</td></tr>
      </tbody></table></section>
    <section class="escala-section"><h3>☕ Lanche</h3>
      <table class="escala-table"><thead><tr><th>Turma</th><th>Horário</th><th>Colaboradores</th></tr></thead>
      <tbody>
        <tr><td>1ª Turma</td><td>15:00 → 15:20</td><td>${map(escala.roles.lancheTurma1)}</td></tr>
        <tr><td>2ª Turma</td><td>15:20 → 15:40</td><td>${map(escala.roles.lancheTurma2)}</td></tr>
        <tr><td>3ª Turma</td><td>15:40 → 16:00</td><td>${map(escala.roles.lancheTurma3)}</td></tr>
      </tbody></table></section>
    <section class="escala-section"><h3>🧺 Aparadores & Setores</h3>
      <table class="escala-table"><tbody>
        <tr><td>Salão + Coqueiro direito</td><td>${apar[0]||'—'}</td></tr>
        <tr><td>Praia direita + Parquinho</td><td>${apar[1]||'—'}</td></tr>
        <tr><td>Coqueiro esquerdo + Praia esquerda</td><td>${apar[2]||'—'}</td></tr>
      </tbody></table></section>
    <section class="escala-section"><h3>🍹 Bar</h3>
      <table class="escala-table"><tbody>
        <tr><td>Bar 1</td><td>${nome(escala.roles.bar1)}</td></tr>
        <tr><td>Bar 2</td><td>${nome(escala.roles.bar2)}</td></tr>
      </tbody></table></section>
    <section class="escala-section"><h3>👥 Total</h3><p><small>Presentes: ${escala.presentes?escala.presentes.length:0}</small></p></section>
  </article>`;
  const container=document.createElement("div"); container.innerHTML=html.trim(); return container.firstElementChild;
}

// gerar dia
if(els.btnGerar) els.btnGerar.addEventListener("click",()=>{
  const presentes = getPresentesDoDia();
  const dataISO = (els.dataDia && els.dataDia.value) || todayISO();
  if(presentes.length<1 && !confirm("Nenhum presente selecionado. Continuar?")) return;
  const escala = gerarEscalaParaData(dataISO,presentes,rodizioOffset);
  ultimoResultadoDia=escala;
  els.previewDia.innerHTML=""; els.previewDia.classList.remove("empty"); els.previewDia.appendChild(renderEscalaDocumento(escala));
  if(els.btnSalvar) els.btnSalvar.disabled=false;
  if(els.btnImprimir) els.btnImprimir.disabled=false;
  if(els.btnExportExcelPreview) els.btnExportExcelPreview.disabled=false;
  rodizioOffset++; persistRod();
})

// salvar histórico
if(els.btnSalvar) els.btnSalvar.addEventListener("click",()=>{
  if(!ultimoResultadoDia) return;
  const h = loadHistorico(); h[ultimoResultadoDia.dataISO]=ultimoResultadoDia; saveHistorico(h); alert("Escala salva."); renderHistorico();
})

// imprimir / pdf
if(els.btnImprimir) els.btnImprimir.addEventListener("click",()=>{
  if(!ultimoResultadoDia) return;
  els.printArea.innerHTML="";
  const header=document.createElement("div"); header.style.textAlign="center";
  const logo=loadLogo(); if(logo){ const img=document.createElement("img"); img.src=logo; img.style.maxWidth="220px"; img.style.maxHeight="110px"; header.appendChild(img) }
  const info=document.createElement("div"); info.style.margin="8px 0"; info.innerHTML=`<strong>BARRACA TERRA DO SOL</strong><div>${weekdayName(ultimoResultadoDia.dataISO)} — ${formatBR(ultimoResultadoDia.dataISO)}</div><div style="font-size:11px;color:#444">${nowBR()}</div>`;
  els.printArea.appendChild(header); els.printArea.appendChild(info);
  els.printArea.appendChild(renderEscalaDocumento(ultimoResultadoDia));
  window.print();
})

// histórico
function renderHistorico(){
  const h=loadHistorico(); const keys=Object.keys(h).sort().reverse();
  els.listaHistorico.innerHTML="";
  if(!keys.length){els.listaHistorico.innerHTML="<li>Nenhuma escala salva ainda.</li>";return}
  keys.forEach(k=>{
    const e=h[k]; const li=document.createElement("li"); li.className="list-item-row";
    const main=document.createElement("div"); main.className="list-item-main";
    main.innerHTML=`<span class="nome">${formatBR(k)} — ${weekdayName(k)}</span><small class="historico-meta">Presentes: ${e.presentes?e.presentes.length:0}</small>`;
    const actions=document.createElement("div"); actions.className="list-item-actions";
    const btnView=document.createElement("button"); btnView.className="secondary small"; btnView.textContent="Ver / Imprimir";
    btnView.onclick=()=>{ ultimoResultadoDia=e; els.previewDia.innerHTML=""; els.previewDia.classList.remove("empty"); els.previewDia.appendChild(renderEscalaDocumento(e)); if(els.btnImprimir) els.btnImprimir.disabled=false; if(els.btnSalvar) els.btnSalvar.disabled=false; window.location.hash="#section-dia" };
    const btnDel=document.createElement("button"); btnDel.className="danger small"; btnDel.textContent="Apagar";
    btnDel.onclick=()=>{ if(confirm("Apagar?")){ const H=loadHistorico(); delete H[k]; saveHistorico(H); renderHistorico() } };
    actions.appendChild(btnView); actions.appendChild(btnDel);
    li.appendChild(main); li.appendChild(actions); els.listaHistorico.appendChild(li);
  })
}
if(els.btnApagarHistorico) els.btnApagarHistorico.addEventListener("click",()=>{ if(confirm("Apagar todo o histórico?")){ saveHistorico({}); renderHistorico() }})

// export excel (HTML table => .xls)
function exportExcelFromScale(escala,fileName="escala.xls"){
  const rows=[];
  rows.push(["Escala Terra do Sol"]);
  rows.push([`${weekdayName(escala.dataISO)} — ${formatBR(escala.dataISO)}`]);
  rows.push([]);
  rows.push(["Almoço 1", (escala.roles.almocoTurma1||[]).map(p=>p.nome).join(", ")]);
  rows.push(["Almoço 2", (escala.roles.almocoTurma2||[]).map(p=>p.nome).join(", ")]);
  rows.push([]);
  rows.push(["Lanche T1", (escala.roles.lancheTurma1||[]).map(p=>p.nome).join(", ")]);
  rows.push(["Lanche T2", (escala.roles.lancheTurma2||[]).map(p=>p.nome).join(", ")]);
  rows.push(["Lanche T3", (escala.roles.lancheTurma3||[]).map(p=>p.nome).join(", ")]);
  rows.push([]);
  rows.push(["Aparador 1", (escala.roles.aparadores[0]?escala.roles.aparadores[0].nome:"")]);
  rows.push(["Aparador 2", (escala.roles.aparadores[1]?escala.roles.aparadores[1].nome:"")]);
  rows.push(["Aparador 3", (escala.roles.aparadores[2]?escala.roles.aparadores[2].nome:"")]);
  rows.push([]);
  rows.push(["Bar 1", escala.roles.bar1?escala.roles.bar1.nome:""]);
  rows.push(["Bar 2", escala.roles.bar2?escala.roles.bar2.nome:""]);
  rows.push([]);
  rows.push(["Total presentes", escala.presentes?escala.presentes.length:0]);

  let table="<table>";
  rows.forEach(r=>{ table+="<tr>"+r.map(c=>`<td>${(c||"")}</td>`).join("")+"</tr>"});
  table+="</table>";
  const blob = new Blob([table],{type:"application/vnd.ms-excel"});
  const url = URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=fileName; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

if(els.btnExportExcelTop) els.btnExportExcelTop.addEventListener("click",()=>{ if(!ultimoResultadoDia){alert("Gere uma escala antes."); return} exportExcelFromScale(ultimoResultadoDia,`escala-${ultimoResultadoDia.dataISO}.xls`) })
if(els.btnExportExcelPreview) els.btnExportExcelPreview.addEventListener("click",()=>{ if(!ultimoResultadoDia){alert("Gere uma escala antes."); return} exportExcelFromScale(ultimoResultadoDia,`escala-${ultimoResultadoDia.dataISO}.xls`) })

// helper init
function init(){
  if(els.dataDia && !els.dataDia.value) els.dataDia.value = todayISO();
  if(els["data-semana"] && !els["data-semana"].value) els["data-semana"].value = todayISO();
  renderLogoPreview();
  renderFuncionarios();
  renderListaPresenca();
  renderHistorico();
}
document.addEventListener("DOMContentLoaded",init);
