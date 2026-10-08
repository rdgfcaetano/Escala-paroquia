const state = {
  page: "dashboard",
  month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  servers: [], masses: [], events: [], generated: {}, user: null, loading: true
};

const app = document.getElementById("app");
const modalRoot = document.getElementById("modalRoot");
const config = window.APP_CONFIG || {};
const cloud = window.supabase && config.url && config.anonKey
  ? window.supabase.createClient(config.url, config.anonKey) : null;

async function loadCloudData(){
  const queries = await Promise.all([
    cloud.from("servers").select("*"), cloud.from("masses").select("*"),
    cloud.from("events").select("*"), cloud.from("generated_scales").select("*")
  ]);
  const failed = queries.find(result => result.error);
  if (failed) throw failed.error;
  [state.servers, state.masses, state.events] = queries.slice(0,3).map(result => result.data || []);
  state.generated = Object.fromEntries(queries[3].data.map(row => [row.month, row.assignments]));
}
async function saveRow(table, row){
  const {error} = await cloud.from(table).upsert(row);
  if (error) { toast(`Não foi possível salvar: ${error.message}`); return false; }
  return true;
}
async function deleteRow(table, id){
  const {error} = await cloud.from(table).delete().eq("id", id);
  if (error) { toast(`Não foi possível excluir: ${error.message}`); return false; }
  return true;
}
async function signIn(){
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const {error} = await cloud.auth.signInWithPassword({email, password});
  if (error) toast(`Não foi possível entrar: ${error.message}`);
}
async function signOut(){await cloud.auth.signOut(); state.user=null; render();}
async function startApp(){
  if(!cloud){state.loading=false;render();return;}
  cloud.auth.onAuthStateChange((_event, session) => {
    state.user = session?.user || null;
    if(state.user) loadCloudData().then(()=>{state.loading=false;render()})
      .catch(error=>{state.loading=false;toast(`Erro ao carregar dados: ${error.message}`);render()});
    else {state.loading=false;render();}
  });
  const {data:{session}} = await cloud.auth.getSession();
  state.user=session?.user||null;
  if(state.user){try{await loadCloudData()}catch(error){toast(`Erro ao carregar dados: ${error.message}`)}}
  state.loading=false;render();
}function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function fmtDate(iso){return new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(iso+"T12:00:00"))}
function localISO(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`}
function uid(){return Date.now()+Math.random().toString(16).slice(2)}
function toast(msg){const t=document.getElementById("toast");t.innerHTML=`<div class="toast">${esc(msg)}</div>`;setTimeout(()=>t.innerHTML="",2500)}
function monthLabel(d){return new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(d)}
function go(page){state.page=page;document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));render()}
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>go(b.dataset.page)));

function header(eyebrow,title,actions=""){
  const logout=state.user?`<button class="btn btn-small" onclick="signOut()">sair (${esc(state.user.email)})</button>`:"";
  return `<header class="page-header"><div>${eyebrow?`<div class="eyebrow">${eyebrow}</div>`:""}<h1>${title}</h1></div><div class="actions">${actions}${logout}</div></header>`;
}
function dashboard(){
  const today=localISO(new Date());
  const monthKey=localISO(state.month).slice(0,7);
  const upcoming=state.events.filter(e=>e.date>=today).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
  return `<div class="page">${header("ORGANIZAÇÃO DA PARÓQUIA","Visão geral",`<button class="btn btn-primary" onclick="openServer()">+ novo coroinha</button><button class="btn btn-gold" onclick="go('scale')">gerar escala</button>`)}
    <div class="grid-4">
      <div class="card stat"><div class="stat-label">Coroinhas cadastrados</div><div class="stat-value">${state.servers.length}</div><div class="stat-note">com disponibilidade registrada</div></div>
      <div class="card stat"><div class="stat-label">Missas cadastradas</div><div class="stat-value">${state.masses.length}</div><div class="stat-note">horários recorrentes</div></div>
      <div class="card stat"><div class="stat-label">Eventos este mês</div><div class="stat-value">${state.events.filter(e=>e.date.startsWith(monthKey)).length || 0}</div><div class="stat-note">inclui feriados</div></div>
      <div class="card stat"><div class="stat-label">Escalas geradas</div><div class="stat-value">${Object.keys(state.generated).length}</div><div class="stat-note">nesta igreja</div></div>
    </div>
    <div class="two-col">
      <section class="card card-pad"><h2>Próximas celebrações</h2><ul class="list">
        ${upcoming.map(e=>`<li class="list-row"><div><div class="list-title">${esc(e.title)}</div><div class="list-date">${fmtDate(e.date)}</div></div><span class="badge">${esc(e.type==="feriado"?"feriado":"evento")}</span></li>`).join("") || `<li class="empty">Nenhum evento cadastrado.</li>`}
      </ul></section>
      <section class="card card-pad"><h2>Como começar</h2><div class="steps">
        <div class="step">1. Cadastre os coroinhas <span class="step-badge">cadastro</span></div>
        <div class="step">2. Informe os horários <span class="step-badge">missas</span></div>
        <div class="step">3. Gere a escala do mês <span class="step-badge">escala</span></div>
        <div class="step">4. Revise antes de publicar <span class="step-badge">revisão</span></div>
      </div></section>
    </div>
  </div>`;
}

function calendar(){
  const y=state.month.getFullYear(), m=state.month.getMonth();
  const first=new Date(y,m,1), start=(first.getDay());
  const days=new Date(y,m+1,0).getDate(), prevDays=new Date(y,m,0).getDate();
  let cells="";
  for(let i=0;i<42;i++){
    const n=i-start+1; let date,muted=false;
    if(n<1){date=new Date(y,m-1,prevDays+n);muted=true}
    else if(n>days){date=new Date(y,m+1,n-days);muted=true}
    else date=new Date(y,m,n);
    const iso=localISO(date);
    const ev=state.events.filter(e=>e.date===iso);
    const isToday=iso===localISO(new Date());
    cells+=`<div class="day ${muted?"muted":""} ${isToday?"today":""}" onclick="${muted?"":"openEvent(null,'"+iso+"')"}"><div class="day-number">${date.getDate()}</div>${ev.map(e=>`<div class="event-dot" title="${esc(e.title)}">${esc(e.title)}</div>`).join("")}</div>`;
  }
  return `<div class="page">${header("AGENDA PAROQUIAL","Calendário",`<button class="btn" onclick="openEvent()">+ evento</button><button class="btn btn-primary" onclick="go('scale')">gerar escala</button>`)}
    <div class="calendar-layout">
      <section class="card calendar-card">
        <div class="calendar-head"><button class="btn btn-small" onclick="changeMonth(-1)">‹</button><div class="calendar-title">${monthLabel(state.month)}</div><button class="btn btn-small" onclick="changeMonth(1)">›</button></div>
        <div class="calendar-grid">${["dom","seg","ter","qua","qui","sex","sáb"].map(x=>`<div class="weekday">${x}</div>`).join("")}${cells}</div>
      </section>
      <aside class="card legend"><h2>Legenda</h2>
        <div class="legend-row"><span>missa</span><span class="legend-pill blue">• azul</span></div>
        <div class="legend-row"><span>evento paroquial</span><span class="legend-pill green">• verde</span></div>
        <div class="legend-row"><span>feriado</span><span class="legend-pill gold">• dourado</span></div>
        <div class="notice">Os feriados exibidos são uma base inicial. Confirme também os feriados municipais da cidade da paróquia.</div>
      </aside>
    </div>
  </div>`;
}
function changeMonth(n){state.month=new Date(state.month.getFullYear(),state.month.getMonth()+n,1);render()}

function servers(){
 return `<div class="page">${header("CADASTROS","Coroinhas",`<button class="btn btn-primary" onclick="openServer()">+ novo coroinha</button>`)}
   <div class="card card-pad">
    <div class="toolbar"><div class="toolbar-left"><input id="serverSearch" placeholder="Pesquisar coroinha..." oninput="filterServers()"></div><div class="toolbar-right"><span class="stat-note">${state.servers.length} cadastrado(s)</span></div></div>
    <div id="serverTable">${serverTable(state.servers)}</div>
   </div></div>`;
}
function serverTable(list){
 if(!list.length)return `<div class="empty">Nenhum coroinha cadastrado. Clique em “+ novo coroinha” para começar.</div>`;
 return `<div class="table-wrap"><table class="table"><thead><tr><th>Nome</th><th>Disponibilidade</th><th>Status</th><th></th></tr></thead><tbody>${list.map(s=>`<tr><td><strong>${esc(s.name)}</strong></td><td>${esc(s.availability||"Não informada")}</td><td><span class="legend-pill green">${s.active?"ativo":"inativo"}</span></td><td><button class="btn btn-small" onclick="openServer('${s.id}')">editar</button> <button class="btn btn-small btn-danger" onclick="deleteServer('${s.id}')">excluir</button></td></tr>`).join("")}</tbody></table></div>`;
}
function filterServers(){const q=document.getElementById("serverSearch").value.toLowerCase();document.getElementById("serverTable").innerHTML=serverTable(state.servers.filter(s=>s.name.toLowerCase().includes(q)))}

function masses(){
 return `<div class="page">${header("CADASTROS","Horários de missa",`<button class="btn btn-primary" onclick="openMass()">+ novo horário</button>`)}
 <div class="card card-pad"><div class="toolbar"><span class="stat-note">${state.masses.length} horário(s) cadastrado(s)</span></div>
 ${state.masses.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Dia</th><th>Horário</th><th>Local</th><th>Coroinhas</th><th></th></tr></thead><tbody>${state.masses.map(m=>`<tr><td>${esc(m.day)}</td><td><strong>${esc(m.time)}</strong></td><td>${esc(m.place||"Igreja")}</td><td>${m.slots||2}</td><td><button class="btn btn-small" onclick="openMass('${m.id}')">editar</button> <button class="btn btn-small btn-danger" onclick="deleteMass('${m.id}')">excluir</button></td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">Nenhum horário de missa cadastrado.</div>`}</div></div>`;
}

function events(){
 return `<div class="page">${header("CADASTROS","Eventos e feriados",`<button class="btn btn-primary" onclick="openEvent()">+ novo evento</button>`)}
 <div class="card card-pad">${state.events.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Evento</th><th>Data</th><th>Tipo</th><th></th></tr></thead><tbody>${state.events.sort((a,b)=>a.date.localeCompare(b.date)).map(e=>`<tr><td><strong>${esc(e.title)}</strong></td><td>${fmtDate(e.date)}</td><td><span class="legend-pill ${e.type==="feriado"?"gold":"green"}">${esc(e.type)}</span></td><td><button class="btn btn-small" onclick="openEvent('${e.id}')">editar</button> <button class="btn btn-small btn-danger" onclick="deleteEvent('${e.id}')">excluir</button></td></tr>`).join("")}</tbody></table></div>`:`<div class="empty">Nenhum evento cadastrado.</div>`}</div></div>`;
}

function scale(){
 const key=`${state.month.getFullYear()}-${String(state.month.getMonth()+1).padStart(2,"0")}`;
 const generated=state.generated[key];
 return `<div class="page">${header("DISTRIBUIÇÃO EQUILIBRADA","Escala de coroinhas",`<select class="select" onchange="setScaleMonth(this.value)"><option value="0">${monthLabel(state.month)}</option></select><button class="btn btn-primary" onclick="generateScale()">gerar escala do mês</button>`)}
 <p class="scale-sub">A geração usa rodízio entre os coroinhas ativos e respeita o dia da semana da missa. Revise conflitos e substituições antes de compartilhar.</p>
 <div class="notice">As escalas e cadastros ficam compartilhados online entre os responsaveis autenticados.</div>
 ${generated?`<div class="scale-list">${generated.map(x=>`<div class="card mass-card"><div class="mass-header"><div><h3>${fmtDate(x.date)} — ${esc(x.day)}</h3><div class="list-date">${esc(x.time)} • ${esc(x.place)}</div></div><button class="btn btn-small" onclick="replaceAssignment('${key}','${x.date}','${x.time}')">sortear novamente</button></div><div class="server-chips">${x.names.map(n=>`<span class="chip">${esc(n)}</span>`).join("")}</div></div>`).join("")}</div>`:`<div class="dashed">Clique em “gerar escala do mês” para distribuir os coroinhas entre as missas.</div>`}
 </div>`;
}
function setScaleMonth(){/* reserved for future month selector */}
 function generateScale(){
 if(!state.servers.some(s=>s.active!==false)){toast("Cadastre ou ative pelo menos um coroinha.");return}
 if(!state.masses.length){toast("Cadastre pelo menos um horário de missa.");return}
 const y=state.month.getFullYear(),m=state.month.getMonth(), days=new Date(y,m+1,0).getDate(), result=[];
 let pool=state.servers.filter(s=>s.active!==false);
 let cursor=0;
 for(let d=1;d<=days;d++){
   const date=new Date(y,m,d), weekday=date.getDay();
   state.masses.filter(ms=>Number(ms.weekday)===weekday).forEach(ms=>{
     const slots=Math.max(1,Number(ms.slots||2)), names=[];
     for(let j=0;j<slots;j++){if(!pool.length)break;names.push(pool[cursor%pool.length].name);cursor++}
     if(names.length)result.push({date:localISO(date),day:date.toLocaleDateString("pt-BR",{weekday:"long"}),time:ms.time,place:ms.place||"Igreja",names});
   });
 }
 const key=`${y}-${String(m+1).padStart(2,"0")}`;state.generated[key]=result;saveRow("generated_scales",{month:key,assignments:result}).then(ok=>{if(ok){toast("Escala gerada com sucesso.");render()}});
}
function replaceAssignment(key,date,time){
 const g=state.generated[key]; if(!g)return; const item=g.find(x=>x.date===date&&x.time===time); if(!item)return;
 if(state.servers.length>1){const names=state.servers.map(s=>s.name);item.names=item.names.map((n,i)=>names[(names.indexOf(n)+1+i)%names.length]);saveRow("generated_scales",{month:key,assignments:g}).then(ok=>{if(ok){render();toast("Substituição realizada.")}});}
}

function openServer(id){
 const s=state.servers.find(x=>x.id===id)||{name:"",availability:"",active:true};
 modalRoot.innerHTML=`<div class="modal-backdrop" onclick="closeModal(event)"><div class="modal" onclick="event.stopPropagation()"><h2>${id?"Editar coroinha":"Novo coroinha"}</h2><div class="modal-sub">Cadastre o nome e uma referência de disponibilidade.</div>
 <div class="form-grid"><div class="field full"><label>Nome</label><input id="fName" value="${esc(s.name)}" placeholder="Nome completo"></div><div class="field full"><label>Disponibilidade</label><input id="fAvail" value="${esc(s.availability)}" placeholder="Ex.: sábados e domingos"></div><div class="field full"><label class="checkbox-row"><input type="checkbox" id="fActive" ${s.active!==false?"checked":""}> coroinha ativo</label></div></div>
 <div class="modal-actions"><button class="btn" onclick="closeModal()">cancelar</button><button class="btn btn-primary" onclick="saveServer('${id||""}')">salvar</button></div></div></div>`;
}
async function saveServer(id){const obj={id:id||uid(),name:document.getElementById("fName").value.trim(),availability:document.getElementById("fAvail").value.trim(),active:document.getElementById("fActive").checked};if(!obj.name){toast("Informe o nome.");return}if(!await saveRow("servers",obj))return;const i=state.servers.findIndex(x=>x.id===id);i>=0?state.servers[i]=obj:state.servers.push(obj);closeModal();render();toast("Cadastro salvo.")}
async function deleteServer(id){if(confirm("Excluir este coroinha?")&&await deleteRow("servers",id)){state.servers=state.servers.filter(x=>x.id!==id);render()}}

function openMass(id){
 const m=state.masses.find(x=>x.id===id)||{day:"Domingo",weekday:0,time:"09:00",place:"Igreja",slots:2};
 const days=["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
 modalRoot.innerHTML=`<div class="modal-backdrop" onclick="closeModal(event)"><div class="modal" onclick="event.stopPropagation()"><h2>${id?"Editar horário":"Novo horário de missa"}</h2><div class="modal-sub">O dia da semana será usado para montar a escala mensal.</div>
 <div class="form-grid"><div class="field"><label>Dia da semana</label><select id="mDay">${days.map((d,i)=>`<option value="${i}" ${i==m.weekday?"selected":""}>${d}</option>`).join("")}</select></div><div class="field"><label>Horário</label><input id="mTime" type="time" value="${esc(m.time)}"></div><div class="field full"><label>Local</label><input id="mPlace" value="${esc(m.place)}" placeholder="Igreja matriz"></div><div class="field"><label>Vagas</label><input id="mSlots" type="number" min="1" max="20" value="${m.slots||2}"></div></div>
 <div class="modal-actions"><button class="btn" onclick="closeModal()">cancelar</button><button class="btn btn-primary" onclick="saveMass('${id||""}')">salvar</button></div></div></div>`;
}
async function saveMass(id){const day=document.getElementById("mDay");const obj={id:id||uid(),day:day.options[day.selectedIndex].text,weekday:Number(day.value),time:document.getElementById("mTime").value,place:document.getElementById("mPlace").value.trim()||"Igreja",slots:Number(document.getElementById("mSlots").value)||2};if(!await saveRow("masses",obj))return;const i=state.masses.findIndex(x=>x.id===id);i>=0?state.masses[i]=obj:state.masses.push(obj);closeModal();render();toast("Horário salvo.")}
async function deleteMass(id){if(confirm("Excluir este horário?")&&await deleteRow("masses",id)){state.masses=state.masses.filter(x=>x.id!==id);render()}}

function openEvent(id,datePreset){
 const e=state.events.find(x=>x.id==id)||{title:"",date:datePreset||localISO(new Date()),type:"evento"};
 modalRoot.innerHTML=`<div class="modal-backdrop" onclick="closeModal(event)"><div class="modal" onclick="event.stopPropagation()"><h2>${id?"Editar evento":"Novo evento"}</h2><div class="modal-sub">Eventos aparecem automaticamente no calendário.</div>
 <div class="form-grid"><div class="field full"><label>Nome</label><input id="eTitle" value="${esc(e.title)}" placeholder="Ex.: Festa da Padroeira"></div><div class="field"><label>Data</label><input id="eDate" type="date" value="${esc(e.date)}"></div><div class="field"><label>Tipo</label><select id="eType"><option value="evento" ${e.type==="evento"?"selected":""}>evento</option><option value="feriado" ${e.type==="feriado"?"selected":""}>feriado</option></select></div></div>
 <div class="modal-actions"><button class="btn" onclick="closeModal()">cancelar</button><button class="btn btn-primary" onclick="saveEvent('${id||""}')">salvar</button></div></div></div>`;
}
async function saveEvent(id){const obj={id:id||uid(),title:document.getElementById("eTitle").value.trim(),date:document.getElementById("eDate").value,type:document.getElementById("eType").value};if(!obj.title||!obj.date){toast("Preencha nome e data.");return}if(!await saveRow("events",obj))return;const i=state.events.findIndex(x=>x.id==id);i>=0?state.events[i]=obj:state.events.push(obj);closeModal();render();toast("Evento salvo.")}
async function deleteEvent(id){if(confirm("Excluir este evento?")&&await deleteRow("events",id)){state.events=state.events.filter(x=>x.id!=id);render()}}

function closeModal(e){if(!e||e.target.classList.contains("modal-backdrop"))modalRoot.innerHTML=""}
function render(){if(state.loading){app.innerHTML=`<div class="page"><div class="card card-pad">Conectando...</div></div>`;return}if(!cloud){app.innerHTML=`<div class="page"><div class="card card-pad"><h2>Configuração pendente</h2><p>Crie o projeto online e preencha a URL e a chave pública no arquivo config.js.</p></div></div>`;return}if(!state.user){app.innerHTML=`<div class="page login-wrap"><form class="card card-pad login-card" onsubmit="event.preventDefault();signIn()"><h1>Escala Paróquia</h1><p>Acesso restrito aos responsáveis.</p><label for="loginEmail">E-mail</label><input id="loginEmail" type="email" autocomplete="username" required><label for="loginPassword">Senha</label><input id="loginPassword" type="password" autocomplete="current-password" required><button class="btn btn-primary" type="submit">Entrar</button></form></div>`;return}if(state.page==="dashboard")app.innerHTML=dashboard();else if(state.page==="calendar")app.innerHTML=calendar();else if(state.page==="servers")app.innerHTML=servers();else if(state.page==="masses")app.innerHTML=masses();else if(state.page==="events")app.innerHTML=events();else app.innerHTML=scale()}
render();
startApp();
