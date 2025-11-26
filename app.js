
function openTab(id){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function salvar(){
  const data = new Date().toISOString().split('T')[0];
  const obj = {
    nome: nome.value,
    responsavel: responsavel.value,
    telefone: telefone.value,
    data
  };
  const lista = JSON.parse(localStorage.getItem('cadastros')||'[]');
  lista.push(obj);
  localStorage.setItem('cadastros', JSON.stringify(lista));
  alert('Salvo!');
}

function carregarLista(){
  const d = filtroData.value;
  const lista = JSON.parse(localStorage.getItem('cadastros')||'[]')
    .filter(x=>x.data===d);
  document.getElementById('lista').innerHTML = lista
    .map(x=>`<li class='card'>${x.nome} - ${x.responsavel}</li>`).join('');
}

function imprimir(){
  window.print();
}
