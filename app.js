const API_URL = "https://api-cronograma.vercel.app/";

const DIAS_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

async function fetchDisciplinas() {
  const res = await fetch(`${API_URL}/disciplinas`);
  if (!res.ok) throw new Error("Erro ao carregar disciplinas");
  return res.json();
}

async function fetchTarefas() {
  const res = await fetch(`${API_URL}/tarefas`);
  if (!res.ok) throw new Error("Erro ao carregar tarefas");
  return res.json();
}

async function criarDisciplina(nome) {
  const res = await fetch(`${API_URL}/disciplinas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
  });
  if (!res.ok) throw new Error("Erro ao criar disciplina");
  return res.json();
}

async function criarTarefa(dados) {
  const res = await fetch(`${API_URL}/tarefas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome: dados.nome,
      disciplinaId: Number(dados.disciplinaId),
      dataEntrega: dados.dataEntrega,
      concluida: false,
    }),
  });
  if (!res.ok) throw new Error("Erro ao criar tarefa");
  return res.json();
}

async function excluirDisciplina(id) {
  const res = await fetch(`${API_URL}/disciplinas/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Erro ao remover disciplina");
}

async function excluirTarefa(id) {
  const res = await fetch(`${API_URL}/tarefas/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Erro ao remover tarefa");
}

async function excluirTarefasDaDisciplina(disciplinaId) {
  const tarefas = await fetchTarefas();
  const relacionadas = tarefas.filter(
    (t) => Number(t.disciplinaId) === Number(disciplinaId)
  );
  await Promise.all(relacionadas.map((t) => excluirTarefa(t.id)));
}

async function fetchSessoesEstudo() {
  const res = await fetch(`${API_URL}/sessoesEstudo`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error("Erro ao carregar cronograma");
  return res.json();
}

function normalizarDia(dia) {
  if (!dia) return "";
  const encontrado = DIAS_SEMANA.find(
    (d) => d.toLowerCase() === String(dia).toLowerCase()
  );
  return encontrado || dia;
}

async function excluirSessaoEstudo(id) {
  const res = await fetch(`${API_URL}/sessoesEstudo/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Erro ao remover sessão de estudo");
}

async function criarSessaoEstudo(dados) {
  const res = await fetch(`${API_URL}/sessoesEstudo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dia: dados.dia,
      disciplinaId: Number(dados.disciplinaId),
      conteudo: dados.conteudo,
      minutos: Number(dados.minutos),
    }),
  });
  if (!res.ok) throw new Error("Erro ao salvar sessão de estudo");
  return res.json();
}

async function salvarCronogramaCompleto(sessoes) {
  const existentes = await fetchSessoesEstudo();
  await Promise.all(existentes.map((s) => excluirSessaoEstudo(s.id)));
  const salvas = [];
  for (const sessao of sessoes) {
    const criada = await criarSessaoEstudo(sessao);
    salvas.push(criada);
  }
  return salvas;
}

function confirmarExclusao(mensagem) {
  return window.confirm(mensagem);
}

function escapeHtml(texto) {
  const el = document.createElement("div");
  el.textContent = texto;
  return el.innerHTML;
}

function attrEscape(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;");
}

function corDisciplina(nome) {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) {
    hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 58%)`;
}

function iniciais(nome) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function abreviarDia(diaCompleto) {
  const mapa = {
    Domingo: "Dom",
    "Segunda-feira": "Seg",
    "Terça-feira": "Ter",
    "Quarta-feira": "Qua",
    "Quinta-feira": "Qui",
    "Sexta-feira": "Sex",
    "Sábado": "Sáb",
  };
  return mapa[diaCompleto] || diaCompleto.slice(0, 3);
}

function formatarData(dataISO) {
  if (!dataISO) return "";
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

function contarPendentesPorDisciplina(tarefas, disciplinaId) {
  return tarefas.filter(
    (t) => Number(t.disciplinaId) === Number(disciplinaId) && !t.concluida
  ).length;
}

function nomeDisciplina(disciplinas, disciplinaId) {
  const d = disciplinas.find(
    (disc) => Number(disc.id) === Number(disciplinaId)
  );
  return d ? d.nome : "Disciplina desconhecida";
}

function gerarCronograma(tarefas, disciplinas) {
  const pendentes = tarefas.filter((t) => !t.concluida);
  const cronograma = {};
  DIAS_SEMANA.forEach((dia) => {
    cronograma[dia] = [];
  });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  pendentes.forEach((tarefa) => {
    const entrega = new Date(tarefa.dataEntrega + "T12:00:00");
    let diasRestantes = Math.ceil((entrega - hoje) / (1000 * 60 * 60 * 24));

    if (diasRestantes < 1) diasRestantes = 1;
    if (diasRestantes > 7) diasRestantes = 7;

    const minutosTotal = Math.min(180, 30 + diasRestantes * 15);
    const minutosPorSessao = Math.ceil(minutosTotal / diasRestantes);

    for (let i = 0; i < diasRestantes; i++) {
      const data = new Date(hoje);
      data.setDate(data.getDate() + i);
      const diaNome = DIAS_SEMANA[data.getDay()];

      cronograma[diaNome].push({
        disciplina: nomeDisciplina(disciplinas, tarefa.disciplinaId),
        tarefa: tarefa.nome,
        minutos: minutosPorSessao,
      });
    }
  });

  return cronograma;
}

function ordemDiasSemana() {
  const hoje = new Date().getDay();
  return [
    ...DIAS_SEMANA.slice(hoje),
    ...DIAS_SEMANA.slice(0, hoje),
  ];
}

function gerarSessoesSugeridas(tarefas, disciplinas) {
  const cronograma = gerarCronograma(tarefas, disciplinas);
  const sessoes = [];

  Object.entries(cronograma).forEach(([dia, itens]) => {
    itens.forEach((item) => {
      const disc = disciplinas.find((d) => d.nome === item.disciplina);
      sessoes.push({
        dia,
        disciplinaId: disc ? disc.id : disciplinas[0]?.id,
        conteudo: item.tarefa,
        minutos: item.minutos,
      });
    });
  });

  return sessoes;
}

function sessoesPorDia(sessoes) {
  const mapa = {};
  DIAS_SEMANA.forEach((dia) => {
    mapa[dia] = [];
  });
  sessoes.forEach((s) => {
    const dia = normalizarDia(s.dia);
    if (mapa[dia]) mapa[dia].push({ ...s, dia });
  });
  return mapa;
}

function totalMinutosDia(sessoes, dia) {
  return sessoes
    .filter((s) => s.dia === dia)
    .reduce((acc, s) => acc + Number(s.minutos || 0), 0);
}

function marcarNavAtivo(pagina) {
  document.querySelectorAll(".nav-inferior a").forEach((link) => {
    link.classList.toggle("ativo", link.dataset.pagina === pagina);
  });
}

function exibirErro(elemento, mensagem) {
  elemento.textContent = mensagem;
  elemento.hidden = false;
}

async function initIndex() {
  marcarNavAtivo("disciplinas");
  const lista = document.getElementById("lista-disciplinas");
  const erro = document.getElementById("erro-index");
  const modal = document.getElementById("modal-disciplina");
  const form = document.getElementById("form-disciplina");
  const btnNova = document.getElementById("btn-nova-disciplina");
  const btnCancelar = document.getElementById("btn-cancelar-disciplina");

  async function carregar() {
    try {
      erro.hidden = true;
      const [disciplinas, tarefas] = await Promise.all([
        fetchDisciplinas(),
        fetchTarefas(),
      ]);

      if (disciplinas.length === 0) {
        lista.className = "";
        lista.innerHTML =
          '<p class="vazio">Nenhuma disciplina cadastrada.<br>Comece adicionando a primeira.</p>';
        return;
      }

      lista.className = "lista-animada";
      lista.innerHTML = disciplinas
        .map((d) => {
          const pendentes = contarPendentesPorDisciplina(tarefas, d.id);
          const total = tarefas.filter(
            (t) => Number(t.disciplinaId) === Number(d.id)
          ).length;
          const cor = corDisciplina(d.nome);
          const nome = escapeHtml(d.nome);
          return `
            <div class="card card-com-acoes" style="--cor-card: ${cor}">
              <div class="card-esquerda">
                <div class="avatar" style="--cor-card: ${cor}">${iniciais(d.nome)}</div>
                <div class="card-info">
                  <strong>${nome}</strong>
                  <div class="card-meta">
                    <span class="meta-texto">${total} tarefa(s)</span>
                    ${pendentes > 0 ? `<span class="badge badge-pendente">${pendentes} pendente(s)</span>` : `<span class="badge badge-ok">Em dia</span>`}
                  </div>
                </div>
              </div>
              <div class="card-acoes">
                <button
                  type="button"
                  class="btn btn-remover btn-icone"
                  data-excluir-disciplina="${d.id}"
                  data-total-tarefas="${total}"
                  data-nome="${attrEscape(d.nome)}"
                >excluir disciplina</button>
              </div>
            </div>
          `;
        })
        .join("");
    } catch (e) {
      exibirErro(erro, e.message);
    }
  }

  lista.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-excluir-disciplina]");
    if (!btn) return;

    const id = btn.dataset.excluirDisciplina;
    const nome = btn.dataset.nome;
    const total = Number(btn.dataset.totalTarefas);

    const msg =
      total > 0
        ? `Remover a disciplina "${nome}"? As ${total} tarefa(s) vinculada(s) também serão excluídas.`
        : `Remover a disciplina "${nome}"?`;

    if (!confirmarExclusao(msg)) return;

    try {
      erro.hidden = true;
      await excluirTarefasDaDisciplina(id);
      await excluirDisciplina(id);
      await carregar();
    } catch (err) {
      exibirErro(erro, err.message);
    }
  });

  btnNova.addEventListener("click", () => {
    modal.classList.add("ativo");
    form.nome.value = "";
  });

  btnCancelar.addEventListener("click", () => {
    modal.classList.remove("ativo");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await criarDisciplina(form.nome.value.trim());
      modal.classList.remove("ativo");
      await carregar();
    } catch (err) {
      alert(err.message);
    }
  });

  await carregar();
}

async function initNovaTarefa() {
  marcarNavAtivo("tarefas");
  const select = document.getElementById("disciplina");
  const form = document.getElementById("form-tarefa");
  const erro = document.getElementById("erro-tarefa");
  const lista = document.getElementById("lista-tarefas");

  async function carregarDisciplinasNoSelect() {
    const disciplinas = await fetchDisciplinas();
    if (disciplinas.length === 0) {
      select.innerHTML =
        '<option value="">Cadastre uma disciplina primeiro</option>';
      select.disabled = true;
    } else {
      select.disabled = false;
      select.innerHTML = disciplinas
        .map((d) => `<option value="${d.id}">${d.nome}</option>`)
        .join("");
    }
  }

  async function carregarListaTarefas() {
    try {
      const [tarefas, disciplinas] = await Promise.all([
        fetchTarefas(),
        fetchDisciplinas(),
      ]);

      if (tarefas.length === 0) {
        lista.className = "";
        lista.innerHTML =
          '<p class="vazio">Nenhuma tarefa cadastrada.<br>Crie uma nova acima.</p>';
        return;
      }

      lista.className = "lista-animada";
      lista.innerHTML = tarefas
        .map((t) => {
          const disciplina = nomeDisciplina(disciplinas, t.disciplinaId);
          const cor = corDisciplina(disciplina);
          const nome = escapeHtml(t.nome);
          const disc = escapeHtml(disciplina);
          const badge = t.concluida
            ? '<span class="badge badge-ok">Concluída</span>'
            : '<span class="badge badge-pendente">Pendente</span>';
          return `
            <div class="card card-com-acoes" style="--cor-card: ${cor}">
              <div class="card-esquerda">
                <div class="avatar" style="--cor-card: ${cor}">${iniciais(disciplina)}</div>
                <div class="card-info">
                  <strong>${nome}</strong>
                  <div class="card-meta">
                    <span class="badge badge-disciplina">${disc}</span>
                    <span class="meta-texto">Entrega ${formatarData(t.dataEntrega)}</span>
                    ${badge}
                  </div>
                </div>
              </div>
              <div class="card-acoes">
                <button
                  type="button"
                  class="btn btn-remover btn-icone"
                  data-excluir-tarefa="${t.id}"
                  data-nome="${attrEscape(t.nome)}"
                >excluir tarefa</button>
              </div>
            </div>
          `;
        })
        .join("");
    } catch (e) {
      lista.innerHTML = `<p class="erro">${e.message}</p>`;
    }
  }

  try {
    await carregarDisciplinasNoSelect();
    await carregarListaTarefas();
  } catch (e) {
    exibirErro(erro, e.message);
  }

  lista.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-excluir-tarefa]");
    if (!btn) return;

    const id = btn.dataset.excluirTarefa;
    const nome = btn.dataset.nome;

    if (!confirmarExclusao(`Remover a tarefa "${nome}"?`)) return;

    try {
      erro.hidden = true;
      await excluirTarefa(id);
      await carregarListaTarefas();
    } catch (err) {
      exibirErro(erro, err.message);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    erro.hidden = true;

    const dados = {
      nome: form.nome.value.trim(),
      disciplinaId: form.disciplina.value,
      dataEntrega: form.dataEntrega.value,
    };

    if (!dados.nome || !dados.disciplinaId || !dados.dataEntrega) {
      exibirErro(erro, "Preencha todos os campos.");
      return;
    }

    try {
      await criarTarefa(dados);
      form.reset();
      await carregarListaTarefas();
    } catch (err) {
      exibirErro(erro, err.message);
    }
  });
}

async function initCronograma() {
  marcarNavAtivo("cronograma");

  const container = document.getElementById("cronograma");
  const erro = document.getElementById("erro-cronograma");
  const sucesso = document.getElementById("sucesso-cronograma");
  const toolbarView = document.querySelector(
    ".cronograma-toolbar:not(.cronograma-toolbar-edicao)"
  );
  const toolbarEdicao = document.getElementById("toolbar-edicao");
  const btnEditar = document.getElementById("btn-editar-cronograma");
  const btnGerar = document.getElementById("btn-gerar-sugestao");
  const btnSalvar = document.getElementById("btn-salvar-cronograma");
  const btnCancelar = document.getElementById("btn-cancelar-edicao");

  let disciplinas = [];
  let tarefas = [];
  let sessoesSalvas = [];
  let sessoesEdicao = [];
  let modoEdicao = false;
  let proximoIdLocal = 1;

  function limparMensagens() {
    erro.hidden = true;
    sucesso.hidden = true;
  }

  function exibirSucesso(mensagem) {
    sucesso.textContent = mensagem;
    sucesso.hidden = false;
    erro.hidden = true;
  }

  function opcoesDisciplinas(selecionada) {
    if (disciplinas.length === 0) {
      return '<option value="">Sem disciplinas</option>';
    }
    return disciplinas
      .map(
        (d) =>
          `<option value="${d.id}" ${Number(selecionada) === Number(d.id) ? "selected" : ""}>${escapeHtml(d.nome)}</option>`
      )
      .join("");
  }

  function renderVisualizacao() {
    const porDia = sessoesPorDia(sessoesSalvas);
    const ordemDias = ordemDiasSemana();
    let html = "";
    let temConteudo = false;
    let delay = 0;

    ordemDias.forEach((dia) => {
      const itens = porDia[dia];
      if (!itens.length) return;

      temConteudo = true;
      delay += 0.08;
      const totalMin = totalMinutosDia(sessoesSalvas, dia);

      html += `<section class="dia-cronograma" style="animation-delay: ${delay}s">
        <div class="dia-header">
          <span class="dia-badge">${abreviarDia(dia)}</span>
          <div>
            <h3>${escapeHtml(dia)}</h3>
            <span class="dia-total">${totalMin} min no dia</span>
          </div>
        </div>
        <div class="timeline">`;

      itens.forEach((item) => {
        const disciplina = nomeDisciplina(disciplinas, item.disciplinaId);
        const cor = corDisciplina(disciplina);
        html += `<div class="item-estudo" style="--cor-item: ${cor}">
          <strong>${escapeHtml(disciplina)}</strong>
          <p class="item-titulo">${escapeHtml(item.conteudo)}</p>
          <span class="item-tempo">${item.minutos} min de estudo</span>
        </div>`;
      });

      html += "</div></section>";
    });

    container.innerHTML = temConteudo
      ? html
      : `<p class="vazio">Nenhum bloco de estudo definido.<br>Use <strong>Editar cronograma</strong> ou <strong>Gerar sugestão</strong>.</p>`;
  }

  function criarSessaoVazia(dia) {
    return {
      localId: `local-${proximoIdLocal++}`,
      id: null,
      dia,
      disciplinaId: disciplinas[0]?.id || "",
      conteudo: "",
      minutos: 30,
    };
  }

  function htmlSessaoEditor(sessao) {
    return `
      <div class="sessao-editor" data-local-id="${sessao.localId}">
        <div class="form-group">
          <label>Disciplina</label>
          <select class="input-disciplina" required>${opcoesDisciplinas(sessao.disciplinaId)}</select>
        </div>
        <div class="form-group">
          <label>O que estudar</label>
          <input type="text" class="input-conteudo" value="${attrEscape(sessao.conteudo)}" placeholder="Ex: Revisar capítulo 3" required>
        </div>
        <div class="form-group form-group-minutos">
          <label>Minutos</label>
          <input type="number" class="input-minutos" value="${sessao.minutos}" min="5" max="480" step="5" required>
        </div>
        <button type="button" class="btn btn-remover btn-remover-sessao" title="Remover bloco">Remover bloco</button>
      </div>
    `;
  }

  function sincronizarEdicaoDoFormulario() {
    document.querySelectorAll(".sessao-editor").forEach((el) => {
      const sessao = sessoesEdicao.find((s) => s.localId === el.dataset.localId);
      if (!sessao) return;
      sessao.disciplinaId = el.querySelector(".input-disciplina")?.value;
      sessao.conteudo = el.querySelector(".input-conteudo")?.value.trim() || "";
      sessao.minutos = Number(el.querySelector(".input-minutos")?.value) || 30;
    });
  }

  function renderEdicao() {
    const ordemDias = ordemDiasSemana();
    let html = "";

    ordemDias.forEach((dia) => {
      const itens = sessoesEdicao.filter((s) => s.dia === dia);
      const totalMin = itens.reduce((acc, s) => acc + Number(s.minutos || 0), 0);

      html += `<section class="dia-editor" data-dia="${attrEscape(dia)}">
        <div class="dia-header">
          <span class="dia-badge">${abreviarDia(dia)}</span>
          <div>
            <h3>${escapeHtml(dia)}</h3>
            <span class="dia-total">${totalMin} min planejados</span>
          </div>
        </div>
        <div class="sessoes-dia">`;

      if (itens.length === 0) {
        html += `<p class="dia-vazio">Nenhum estudo neste dia.</p>`;
      } else {
        itens.forEach((s) => {
          html += htmlSessaoEditor(s);
        });
      }

      html += `</div>
        <button type="button" class="btn btn-secondary btn-adicionar-sessao" data-dia="${attrEscape(dia)}">
          + Adicionar bloco de estudo
        </button>
      </section>`;
    });

    container.innerHTML = html;
  }

  function alternarModo(edicao) {
    modoEdicao = edicao;
    toolbarView.hidden = edicao;
    toolbarEdicao.hidden = !edicao;
    limparMensagens();
  }

  function entrarEdicao() {
    sessoesEdicao = sessoesSalvas.map((s) => ({
      localId: `saved-${s.id}`,
      id: s.id,
      dia: s.dia,
      disciplinaId: s.disciplinaId,
      conteudo: s.conteudo,
      minutos: s.minutos,
    }));
    if (sessoesEdicao.length === 0) {
      sessoesEdicao.push(criarSessaoVazia(ordemDiasSemana()[0]));
    }
    alternarModo(true);
    renderEdicao();
  }

  function lerSessoesDoFormulario() {
    const sessoes = [];
    document.querySelectorAll(".sessao-editor").forEach((el) => {
      const diaEl = el.closest(".dia-editor");
      const dia = diaEl?.dataset.dia;
      const disciplinaId = el.querySelector(".input-disciplina")?.value;
      const conteudo = el.querySelector(".input-conteudo")?.value.trim();
      const minutos = el.querySelector(".input-minutos")?.value;

      if (!dia || !disciplinaId || !conteudo) return;

      sessoes.push({
        dia,
        disciplinaId,
        conteudo,
        minutos: Math.max(5, Number(minutos) || 30),
      });
    });
    return sessoes;
  }

  async function carregarDados() {
    limparMensagens();
    [tarefas, disciplinas, sessoesSalvas] = await Promise.all([
      fetchTarefas(),
      fetchDisciplinas(),
      fetchSessoesEstudo(),
    ]);
    sessoesSalvas = sessoesSalvas.map((s) => ({
      ...s,
      dia: normalizarDia(s.dia),
    }));
  }

  if (!btnEditar || !btnGerar || !btnSalvar || !btnCancelar) {
    exibirErro(erro, "Erro ao carregar a página do cronograma. Recarregue o arquivo.");
    return;
  }

  btnEditar.addEventListener("click", () => {
    if (disciplinas.length === 0) {
      exibirErro(erro, "Cadastre pelo menos uma disciplina antes de editar.");
      return;
    }
    entrarEdicao();
  });

  btnCancelar.addEventListener("click", () => {
    alternarModo(false);
    renderVisualizacao();
  });

  btnSalvar.addEventListener("click", async () => {
    const sessoes = lerSessoesDoFormulario();
    if (sessoes.length === 0) {
      exibirErro(erro, "Adicione pelo menos um bloco de estudo.");
      return;
    }

    try {
      limparMensagens();
      btnSalvar.disabled = true;
      sessoesSalvas = await salvarCronogramaCompleto(sessoes);
      alternarModo(false);
      renderVisualizacao();
      exibirSucesso("Cronograma salvo com sucesso!");
    } catch (err) {
      exibirErro(erro, err.message);
    } finally {
      btnSalvar.disabled = false;
    }
  });

  btnGerar.addEventListener("click", async () => {
    const pendentes = tarefas.filter((t) => !t.concluida);
    if (pendentes.length === 0) {
      exibirErro(erro, "Não há tarefas pendentes para gerar sugestão.");
      return;
    }

    if (
      sessoesSalvas.length > 0 &&
      !confirmarExclusao(
        "Gerar uma nova sugestão substituirá o cronograma atual. Continuar?"
      )
    ) {
      return;
    }

    const sugeridas = gerarSessoesSugeridas(tarefas, disciplinas);

    if (modoEdicao) {
      sessoesEdicao = sugeridas.map((s, i) => ({
        localId: `sug-${i}`,
        id: null,
        ...s,
      }));
      renderEdicao();
      exibirSucesso("Sugestão aplicada. Revise e clique em Salvar.");
      return;
    }

    try {
      limparMensagens();
      btnGerar.disabled = true;
      sessoesSalvas = await salvarCronogramaCompleto(sugeridas);
      renderVisualizacao();
      exibirSucesso("Sugestão gerada e salva com base nas tarefas pendentes.");
    } catch (err) {
      exibirErro(erro, err.message);
    } finally {
      btnGerar.disabled = false;
    }
  });

  container.addEventListener("click", (e) => {
    if (!modoEdicao) return;

    const btnAdd = e.target.closest(".btn-adicionar-sessao");
    if (btnAdd) {
      sincronizarEdicaoDoFormulario();
      sessoesEdicao.push(criarSessaoVazia(btnAdd.dataset.dia));
      renderEdicao();
      return;
    }

    const btnRem = e.target.closest(".btn-remover-sessao");
    if (btnRem) {
      sincronizarEdicaoDoFormulario();
      const el = btnRem.closest(".sessao-editor");
      sessoesEdicao = sessoesEdicao.filter(
        (s) => s.localId !== el.dataset.localId
      );
      if (sessoesEdicao.length === 0) {
        sessoesEdicao.push(criarSessaoVazia(ordemDiasSemana()[0]));
      }
      renderEdicao();
    }
  });

  try {
    await carregarDados();
    renderVisualizacao();
  } catch (e) {
    exibirErro(erro, e.message);
  }
}

