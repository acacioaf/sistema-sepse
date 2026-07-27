// --- CONFIGURAÇÃO DO SUPABASE ---
const SUPABASE_URL = 'https://fwaheunpekyvwyysqncz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_er3si1epfRHUz8SQP26B1A__aFx0cTy';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- CONTADORES GLOBAIS DE SAÍDA E INDICADORES DO MÊS ---
const contadoresSaidas = {
    alta: 0,
    "HC UFU": 0,
    "Hospital Municipal": 0,
    "CIP": 0,
    "CAPS": 0,
    "UCCI": 0,
    obito: 0
};

// Acumuladores mensais de indicadores do setor
let indicadoresMensais = {
    sepse: 0,
    estavel: 0,
    baixo: 0,
    medio: 0,
    alto: 0
};

let cardAtualTransf = null;
let cardAtualTransfInterna = null;
let meuGraficoOcupacao = null;

// Variável para memorizar a enfermaria ativa antes de iniciar uma busca
let setorAtivoAntesDaBusca = 'painel-central';

// Gestão de Datas e Calendário
const dataAtualReal = new Date();
const dataHojeStr = formatarDataChave(dataAtualReal); // Data real do dia de hoje (fixa)
let dataSelecionadaStr = dataHojeStr;               // Data sendo visualizada/editada
let mesExibido = dataAtualReal.getMonth();
let anoExibido = dataAtualReal.getFullYear();

// Histórico de ocupação diária do mês (dias 1 a 31)
const historicoOcupacaoDiaria = Array(31).fill(0);

document.addEventListener("DOMContentLoaded", async () => {
    const mainContent = document.querySelector(".content");

    // Delegação de eventos para capturar alterações em tempo real
    mainContent.addEventListener("input", tratarMudancaVitais);
    mainContent.addEventListener("change", tratarMudancaVitais);

    // Carrega os contadores salvos do mês atual antes de renderizar
    await carregarContadoresMensais(dataSelecionadaStr);

    // Inicialização do gráfico, calendário e carregamento do plantão do dia
    inicializarGraficoOcupacao();
    renderizarCalendario();
    await carregarDadosDoDia(dataSelecionadaStr);
});

// Helper para formatar data em AAAA-MM-DD
function formatarDataChave(dateObj) {
    const ano = dateObj.getFullYear();
    const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dia = String(dateObj.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

// --- PERSISTÊNCIA DOS CONTADORES E INDICADORES MENSAIS ---
async function salvarContadoresMensais() {
    const mesAnoChave = dataSelecionadaStr.substring(0, 7); // Ex: "2026-07"
    localStorage.setItem(`saidas_${mesAnoChave}`, JSON.stringify(contadoresSaidas));
    localStorage.setItem(`indicadores_${mesAnoChave}`, JSON.stringify(indicadoresMensais));
}

async function carregarContadoresMensais(dataChave) {
    const mesAnoChave = dataChave.substring(0, 7);
    
    const rawSaidas = localStorage.getItem(`saidas_${mesAnoChave}`);
    if (rawSaidas) {
        const salvos = JSON.parse(rawSaidas);
        Object.keys(salvos).forEach(k => { contadoresSaidas[k] = salvos[k]; });
    } else {
        Object.keys(contadoresSaidas).forEach(k => { contadoresSaidas[k] = 0; });
    }

    const rawInd = localStorage.getItem(`indicadores_${mesAnoChave}`);
    if (rawInd) {
        const salvosInd = JSON.parse(rawInd);
        Object.keys(salvosInd).forEach(k => { indicadoresMensais[k] = salvosInd[k]; });
    } else {
        Object.keys(indicadoresMensais).forEach(k => { indicadoresMensais[k] = 0; });
    }
}

// --- RENDERIZAÇÃO DO MINI CALENDÁRIO ---
function renderizarCalendario() {
    const grid = document.getElementById('cal-grid-dias');
    const labelMesAno = document.getElementById('mes-ano');
    if (!grid || !labelMesAno) return;

    const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    labelMesAno.textContent = `${nomesMeses[mesExibido]} / ${anoExibido}`;

    grid.innerHTML = '';

    const diasSemana = ["D", "S", "T", "Q", "Q", "S", "S"];
    diasSemana.forEach(d => {
        const span = document.createElement('span');
        span.textContent = d;
        grid.appendChild(span);
    });

    const primeiroDiaMes = new Date(anoExibido, mesExibido, 1).getDay();
    const totalDiasMes = new Date(anoExibido, mesExibido + 1, 0).getDate();

    for (let i = 0; i < primeiroDiaMes; i++) {
        const empty = document.createElement('a');
        empty.classList.add('other-month');
        grid.appendChild(empty);
    }

    for (let dia = 1; dia <= totalDiasMes; dia++) {
        const a = document.createElement('a');
        a.textContent = dia;

        const dataIso = `${anoExibido}-${String(mesExibido + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        
        if (dataIso === dataHojeStr) {
            a.classList.add('today');
        }

        if (dataIso === dataSelecionadaStr && dataIso !== dataHojeStr) {
            a.classList.add('selected-day');
        }

        a.onclick = async (e) => {
            e.preventDefault();
            await salvarDadosDoDia(dataSelecionadaStr);
            dataSelecionadaStr = dataIso;
            
            await carregarContadoresMensais(dataSelecionadaStr);

            renderizarCalendario();
            await carregarDadosDoDia(dataIso);
        };

        grid.appendChild(a);
    }
}

function mudarMes(delta) {
    mesExibido += delta;
    if (mesExibido < 0) {
        mesExibido = 11;
        anoExibido--;
    } else if (mesExibido > 11) {
        mesExibido = 0;
        anoExibido++;
    }
    renderizarCalendario();
}

// --- CÁLCULO E EXIBIÇÃO DA IDADE DA CRIANÇA ---
function atualizarBadgeIdade(inputData) {
    const card = inputData.closest('.patient-card');
    if (!card) return;

    const badge = card.querySelector('.badge-idade');
    if (!badge) return;

    const valData = inputData.value;
    if (!valData) {
        badge.textContent = "--";
        return;
    }

    const nasc = new Date(valData);
    const hoje = new Date();

    let anos = hoje.getFullYear() - nasc.getFullYear();
    let meses = hoje.getMonth() - nasc.getMonth();
    let dias = hoje.getDate() - nasc.getDate();

    if (dias < 0) {
        meses--;
    }
    if (meses < 0) {
        anos--;
        meses += 12;
    }

    let totalMeses = (hoje.getFullYear() - nasc.getFullYear()) * 12 + (hoje.getMonth() - nasc.getMonth());

    if (totalMeses < 1) {
        badge.textContent = "< 1m";
    } else if (totalMeses < 12) {
        badge.textContent = `${totalMeses}m`;
    } else {
        if (meses > 0) {
            badge.textContent = `${anos}a ${meses}m`;
        } else {
            badge.textContent = `${anos}a`;
        }
    }
}

// --- ADICIONAR E REMOVER HORÁRIOS EXTRAS ORDENADOS CRONOLOGICAMENTE ---
function adicionarHorarioExtraOrdenado(btn) {
    const tableContainer = btn.closest('.table-responsive');
    const tbody = tableContainer.querySelector('.vitals-table tbody');
    const abaPai = btn.closest('.tab-pane');
    const isPediatria = abaPai && abaPai.id === 'enf-pediatria';

    const agora = new Date();
    const horaPadrao = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
    const novoHorario = prompt("Digite o horário extra (ex: 09:30, 14:15):", horaPadrao);

    if (!novoHorario || novoHorario.trim() === "") return;
    const horaFormatada = novoHorario.trim();

    const novaLinha = document.createElement('tr');
    novaLinha.classList.add('linha-horario-extra');
    novaLinha.setAttribute('data-hora', horaFormatada);

    if (isPediatria) {
        novaLinha.innerHTML = `
            <td class="time-col">
                <div class="cell-hora-extra">
                    <span>${horaFormatada}</span>
                    <button type="button" class="btn-del-linha" onclick="removerLinhaExtraDireta(this)" title="Remover horário extra">✖</button>
                </div>
            </td>
            <td><input type="number" class="pews-fc"></td>
            <td><input type="number" class="pews-fr"></td>
            <td>
                <select class="pews-comp">
                    <option value="" selected></option>
                    <option value="0">0 - Normal / Brincando</option>
                    <option value="1">1 - Sonolento</option>
                    <option value="2">2 - Irritado</option>
                    <option value="3">3 - Confuso / Letárgico / Resposta red. a dor</option>
                </select>
            </td>
            <td>
                <select class="pews-vomitos">
                    <option value="" selected></option>
                    <option value="0">0 - Ausentes</option>
                    <option value="2">2 - Vômitos Persistentes</option>
                </select>
            </td>
            <td>
                <select class="pews-nebulizador">
                    <option value="" selected></option>
                    <option value="0">0 - Não</option>
                    <option value="1">1 - A cada 20 min / Frequência > que a cada 20 min</option>
                </select>
            </td>
            <td><input type="number" step="0.1" class="pews-temp"></td>
            <td><input type="number" class="news-input" readonly></td>
            <td class="status-cell"></td>
            <td>
                <select class="protocolo-select">
                    <option value="" selected></option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                </select>
            </td>
        `;
    } else {
        novaLinha.innerHTML = `
            <td class="time-col">
                <div class="cell-hora-extra">
                    <span>${horaFormatada}</span>
                    <button type="button" class="btn-del-linha" onclick="removerLinhaExtraDireta(this)" title="Remover horário extra">✖</button>
                </div>
            </td>
            <td><input type="number"></td>
            <td><input type="number" step="0.1"></td>
            <td><input type="number"></td>
            <td><input type="number"></td>
            <td><select><option selected></option><option>Sim</option><option>Não</option></select></td>
            <td><input type="number"></td>
            <td><select><option selected></option><option>Alerta</option><option>AGITADO/CONFUSO</option><option>VOZ, DOR OU NÃO REAGE</option></select></td>
            <td><input type="number"></td>
            <td><input type="number" class="news-input" readonly></td>
            <td class="status-cell"></td>
            <td>
                <select class="protocolo-select">
                    <option value="" selected></option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                </select>
            </td>
        `;
    }

    const linhasExistentes = Array.from(tbody.querySelectorAll('tr'));
    let inserido = false;

    for (let tr of linhasExistentes) {
        const horaTr = tr.getAttribute('data-hora') || tr.querySelector('.time-col')?.textContent.trim();
        if (horaTr && horaFormatada < horaTr) {
            tbody.insertBefore(novaLinha, tr);
            inserido = true;
            break;
        }
    }

    if (!inserido) {
        tbody.appendChild(novaLinha);
    }

    salvarDadosDoDia(dataSelecionadaStr);
}

async function removerLinhaExtraDireta(btnX) {
    if (confirm("Deseja remover esta aferição de horário extra?")) {
        const linha = btnX.closest('tr');
        linha.remove();
        atualizarPainelCentral();
        await salvarDadosDoDia(dataSelecionadaStr);
    }
}

// --- PERSISTÊNCIA NA NUVEM (SUPABASE) ---
async function salvarDadosDoDia(dataChave) {
    const dadosGerais = [];

    document.querySelectorAll('.tab-pane:not(#painel-central)').forEach(aba => {
        const idSetor = aba.id;
        aba.querySelectorAll('.patient-card').forEach(card => {
            const nome = card.querySelector('.nome-input')?.value || "";
            const dtNasc = card.querySelector('.dtnasc-input')?.value || "";
            const prontuario = card.querySelector('.prontuario-input')?.value || "";
            const tec = card.querySelector('.tec-input')?.value || "";
            const isento = card.querySelector('.isento-relatorio')?.checked || false;

            const vitais = [];
            card.querySelectorAll('.vitals-table tbody tr').forEach(tr => {
                const hora = tr.getAttribute('data-hora') || tr.querySelector('.time-col')?.textContent.trim() || "";
                const inputs = Array.from(tr.querySelectorAll('input, select')).map(i => i.value);
                const isExtra = tr.classList.contains('linha-horario-extra');
                vitais.push({ hora, inputs, isExtra });
            });

            if (nome.trim() !== "") {
                dadosGerais.push({
                    setor: idSetor,
                    nome, dtNasc, prontuario, tec, isento, vitais
                });
            }
        });
    });

    const mesAno = dataChave.substring(0, 7);

    const { error } = await _supabase
        .from('plantoes')
        .upsert({ 
            data_chave: dataChave, 
            dados_json: dadosGerais, 
            mes_ano: mesAno,
            updated_at: new Date()
        }, { onConflict: 'data_chave' });

    if (error) {
        console.error("Erro ao salvar no Supabase:", error.message);
    }
}

async function carregarDadosDoDia(dataChave) {
    const { data, error } = await _supabase
        .from('plantoes')
        .select('dados_json')
        .eq('data_chave', dataChave)
        .maybeSingle();

    if (!data || !data.dados_json || error) {
        document.querySelectorAll('.tab-pane:not(#painel-central)').forEach(aba => {
            const container = aba.querySelector('.patients-container');
            if (!container) return;

            const cards = container.querySelectorAll('.patient-card');
            for (let i = 1; i < cards.length; i++) {
                cards[i].remove();
            }
            if (cards[0]) limparCardPaciente(cards[0]);
        });
        atualizarPainelCentral();
        return;
    }

    const dadosGerais = data.dados_json;

    document.querySelectorAll('.tab-pane:not(#painel-central)').forEach(aba => {
        const container = aba.querySelector('.patients-container');
        if (!container) return;

        const cards = container.querySelectorAll('.patient-card');
        for (let i = 1; i < cards.length; i++) {
            cards[i].remove();
        }
        if (cards[0]) limparCardPaciente(cards[0]);
    });

    dadosGerais.forEach(p => {
        const aba = document.getElementById(p.setor);
        if (!aba) return;

        const container = aba.querySelector('.patients-container');
        let card = container.querySelector('.patient-card');

        if (card.querySelector('.nome-input').value !== "") {
            const novo = card.cloneNode(true);
            limparCardPaciente(novo);
            container.appendChild(novo);
            card = novo;
        }

        card.querySelector('.nome-input').value = p.nome;
        if (card.querySelector('.dtnasc-input')) {
            card.querySelector('.dtnasc-input').value = p.dtNasc;
            atualizarBadgeIdade(card.querySelector('.dtnasc-input'));
        }
        if (card.querySelector('.prontuario-input')) card.querySelector('.prontuario-input').value = p.prontuario;
        if (card.querySelector('.tec-input')) card.querySelector('.tec-input').value = p.tec;
        if (card.querySelector('.isento-relatorio')) card.querySelector('.isento-relatorio').checked = p.isento;

        const tbody = card.querySelector('.vitals-table tbody');

        p.vitais.forEach((objVital) => {
            const valores = Array.isArray(objVital) ? objVital : objVital.inputs;
            const hora = objVital.hora || "";
            const isExtra = objVital.isExtra || false;

            let linha = null;

            if (isExtra) {
                const btnAdd = card.querySelector('.btn-add-horario-clean');
                if (btnAdd) {
                    const novaLinha = document.createElement('tr');
                    novaLinha.classList.add('linha-horario-extra');
                    novaLinha.setAttribute('data-hora', hora);

                    if (p.setor === 'enf-pediatria') {
                        novaLinha.innerHTML = `
                            <td class="time-col"><div class="cell-hora-extra"><span>${hora}</span><button type="button" class="btn-del-linha" onclick="removerLinhaExtraDireta(this)">✖</button></div></td>
                            <td><input type="number" class="pews-fc"></td>
                            <td><input type="number" class="pews-fr"></td>
                            <td>
                                <select class="pews-comp">
                                    <option value="" selected></option>
                                    <option value="0">0 - Normal / Brincando</option>
                                    <option value="1">1 - Sonolento</option>
                                    <option value="2">2 - Irritado</option>
                                    <option value="3">3 - Confuso / Letárgico / Resposta red. a dor</option>
                                </select>
                            </td>
                            <td>
                                <select class="pews-vomitos">
                                    <option value="" selected></option>
                                    <option value="0">0 - Ausentes</option>
                                    <option value="2">2 - Vômitos Persistentes</option>
                                </select>
                            </td>
                            <td>
                                <select class="pews-nebulizador">
                                    <option value="" selected></option>
                                    <option value="0">0 - Não</option>
                                    <option value="1">1 - A cada 20 min / Frequência > que a cada 20 min</option>
                                </select>
                            </td>
                            <td><input type="number" step="0.1" class="pews-temp"></td>
                            <td><input type="number" class="news-input" readonly></td>
                            <td class="status-cell"></td>
                            <td>
                                <select class="protocolo-select">
                                    <option value="" selected></option>
                                    <option value="Sim">Sim</option>
                                    <option value="Não">Não</option>
                                </select>
                            </td>
                        `;
                    } else {
                        novaLinha.innerHTML = `
                            <td class="time-col"><div class="cell-hora-extra"><span>${hora}</span><button type="button" class="btn-del-linha" onclick="removerLinhaExtraDireta(this)">✖</button></div></td>
                            <td><input type="number"></td>
                            <td><input type="number" step="0.1"></td>
                            <td><input type="number"></td>
                            <td><input type="number"></td>
                            <td><select><option selected></option><option>Sim</option><option>Não</option></select></td>
                            <td><input type="number"></td>
                            <td><select><option selected></option><option>Alerta</option><option>AGITADO/CONFUSO</option><option>VOZ, DOR OU NÃO REAGE</option></select></td>
                            <td><input type="number"></td>
                            <td><input type="number" class="news-input" readonly></td>
                            <td class="status-cell"></td>
                            <td>
                                <select class="protocolo-select">
                                    <option value="" selected></option>
                                    <option value="Sim">Sim</option>
                                    <option value="Não">Não</option>
                                </select>
                            </td>
                        `;
                    }

                    const linhasExistentes = Array.from(tbody.querySelectorAll('tr'));
                    let inserido = false;
                    for (let tr of linhasExistentes) {
                        const horaTr = tr.getAttribute('data-hora') || tr.querySelector('.time-col')?.textContent.trim();
                        if (horaTr && hora < horaTr) {
                            tbody.insertBefore(novaLinha, tr);
                            inserido = true;
                            break;
                        }
                    }
                    if (!inserido) tbody.appendChild(novaLinha);
                    linha = novaLinha;
                }
            } else {
                linha = Array.from(tbody.querySelectorAll('tr:not(.linha-horario-extra)')).find(tr => {
                    const horaTr = tr.getAttribute('data-hora') || tr.querySelector('.time-col')?.textContent.trim();
                    return horaTr === hora;
                });
            }

            if (linha) {
                const elementos = linha.querySelectorAll('input, select');
                valores.forEach((val, i) => {
                    if (elementos[i]) elementos[i].value = val;
                });

                if (p.setor === 'enf-pediatria') {
                    atualizarLinhaPews(linha);
                } else {
                    atualizarLinhaClinica(linha);
                }
            }
        });
    });

    atualizarPainelCentral();
}

// --- INICIAR NOVO PLANTÃO ---
async function iniciarNovoPlantao() {
    const agora = new Date();
    const horaAtual = agora.getHours();
    const minutoAtual = agora.getMinutes();

    if (horaAtual < 7 || horaAtual >= 12) {
        alert(
            `🚫 AÇÃO NÃO PERMITIDA!\n\n` +
            `Horário atual: ${String(horaAtual).padStart(2, '0')}:${String(minutoAtual).padStart(2, '0')}h.\n` +
            `O novo plantão só pode ser iniciado entre as 07:00h e as 11:59h da manhã.`
        );
        return;
    }

    if (!confirm("ATENÇÃO: Deseja iniciar o novo plantão das 07h? Isso manterá os pacientes internados nos leitos e limpará as tabelas para a nova jornada.")) {
        return;
    }

    await salvarDadosDoDia(dataSelecionadaStr);

    const { data: dataAnterior } = await _supabase
        .from('plantoes')
        .select('dados_json')
        .eq('data_chave', dataSelecionadaStr)
        .maybeSingle();

    const pacientesParaMigrar = dataAnterior ? dataAnterior.dados_json : [];

    dataSelecionadaStr = formatarDataChave(agora);
    mesExibido = agora.getMonth();
    anoExibido = agora.getFullYear();
    
    await carregarContadoresMensais(dataSelecionadaStr);
    renderizarCalendario();

    if (pacientesParaMigrar.length > 0) {
        const novosDados = pacientesParaMigrar.map(p => ({
            ...p,
            vitais: p.vitais.map(v => {
                const inputs = Array.isArray(v) ? v : v.inputs;
                return {
                    hora: v.hora || "",
                    isExtra: v.isExtra || false,
                    inputs: inputs.map(() => "")
                };
            })
        }));

        await _supabase
            .from('plantoes')
            .upsert({ 
                data_chave: dataSelecionadaStr, 
                dados_json: novosDados, 
                mes_ano: dataSelecionadaStr.substring(0, 7),
                updated_at: new Date()
            }, { onConflict: 'data_chave' });
    }

    await carregarDadosDoDia(dataSelecionadaStr);
    alert(`Novo Plantão das 07h iniciado com sucesso para o dia ${agora.toLocaleDateString('pt-BR')}!`);
}

// --- ESCALA E CÁLCULO DE SINAIS VITAIS ---
async function tratarMudancaVitais(event) {
    const elemento = event.target;

    if (elemento.classList.contains('dtnasc-input')) {
        atualizarBadgeIdade(elemento);
    }

    if (elemento.classList.contains('nome-input') || elemento.classList.contains('isento-relatorio') || elemento.classList.contains('dtnasc-input')) {
        const card = elemento.closest('.patient-card');
        if (card && card.closest('.tab-pane')?.id === 'enf-pediatria') {
            card.querySelectorAll('.vitals-table tbody tr').forEach(tr => atualizarLinhaPews(tr));
        }
        atualizarPainelCentral();
        await salvarDadosDoDia(dataSelecionadaStr);
        return;
    }

    const linha = elemento.closest("tr");
    if (!linha || !linha.closest(".vitals-table")) return;

    const abaPai = linha.closest('.tab-pane');
    if (abaPai && abaPai.id === 'enf-pediatria') {
        atualizarLinhaPews(linha);
    } else {
        atualizarLinhaClinica(linha);
    }

    atualizarPainelCentral();
    await salvarDadosDoDia(dataSelecionadaStr);
}

// --- HELPER PARA IDENTIFICAR FAIXA ETÁRIA EXATA CONFORME FOTO DO POP ---
function obterFaixaEtariaPews(dataNascStr) {
    if (!dataNascStr) return "1-3 anos";

    const nasc = new Date(dataNascStr);
    const hoje = new Date();
    
    let anos = hoje.getFullYear() - nasc.getFullYear();
    let meses = (hoje.getFullYear() - nasc.getFullYear()) * 12 + (hoje.getMonth() - nasc.getMonth());
    let dias = hoje.getDate() - nasc.getDate();
    if (dias < 0) meses--;

    if (meses < 3) return "< 3 meses";
    if (meses < 12 || (meses === 12 && dias === 0)) return "3 meses a 11m29d";
    if (anos >= 1 && anos <= 3) return "1-3 anos";
    if (anos >= 4 && anos <= 7) return "4-7 anos";
    if (anos >= 8 && anos <= 12) return "8-12 anos";
    return "> 12 anos";
}

// --- CÁLCULO DE PEWS (ATUALIZADO CONFORME TABELA OFICIAL) ---
function atualizarLinhaPews(linha) {
    const card = linha.closest('.patient-card');
    const dtNasc = card ? card.querySelector('.dtnasc-input')?.value : "";
    const faixaEtaria = obterFaixaEtariaPews(dtNasc);

    const fc = parseFloat(linha.querySelector('.pews-fc')?.value) || 0;
    const fr = parseFloat(linha.querySelector('.pews-fr')?.value) || 0;
    const comp = parseInt(linha.querySelector('.pews-comp')?.value || 0);
    const vomitos = parseInt(linha.querySelector('.pews-vomitos')?.value || 0);
    const nebulizador = parseInt(linha.querySelector('.pews-nebulizador')?.value || 0);
    const temp = parseFloat(String(linha.querySelector('.pews-temp')?.value || '').replace(',', '.')) || 0;

    let pFC = 0;
    let pFR = 0;
    let pTemp = 0;

    // --- FREQUÊNCIA CARDÍACA ---
    if (fc > 0) {
        if (faixaEtaria === "< 3 meses") {
            if (fc <= 89) pFC = 3;
            else if (fc >= 220) pFC = 3;
            else if (fc >= 180 && fc <= 219) pFC = 2;
            else if (fc >= 160 && fc <= 179) pFC = 1;
            else if (fc >= 90 && fc <= 159) pFC = 0;
        } else if (faixaEtaria === "3 meses a 11m29d") {
            if (fc <= 89) pFC = 3;
            else if (fc >= 210) pFC = 3;
            else if (fc >= 170 && fc <= 209) pFC = 2;
            else if (fc >= 160 && fc <= 169) pFC = 1;
            else if (fc >= 90 && fc <= 159) pFC = 0;
        } else if (faixaEtaria === "1-3 anos") {
            if (fc <= 89) pFC = 3;
            else if (fc >= 200) pFC = 3;
            else if (fc >= 160 && fc <= 199) pFC = 2;
            else if (fc >= 140 && fc <= 159) pFC = 1;
            else if (fc >= 90 && fc <= 139) pFC = 0;
        } else if (faixaEtaria === "4-7 anos") {
            if (fc <= 60) pFC = 3;
            else if (fc >= 190) pFC = 3;
            else if (fc >= 150 && fc <= 189) pFC = 2;
            else if (fc >= 111 && fc <= 149) pFC = 1;
            else if (fc >= 70 && fc <= 110) pFC = 0;
            else if (fc >= 61 && fc <= 69) pFC = 1; // faixa amarela baixa
        } else { // 8-12 anos ou mais
            if (fc <= 60) pFC = 3;
            else if (fc >= 170) pFC = 3;
            else if (fc >= 130 && fc <= 169) pFC = 2;
            else if (fc >= 101 && fc <= 129) pFC = 1;
            else if (fc >= 66 && fc <= 100) pFC = 0;
            else if (fc >= 60 && fc <= 65) pFC = 1;
        }
    }

    // --- FREQUÊNCIA RESPIRATÓRIA ---
    if (fr > 0) {
        if (faixaEtaria === "< 3 meses") {
            if (fr <= 25) pFR = 3;
            else if (fr >= 90) pFR = 3;
            else if (fr >= 79 && fr <= 89) pFR = 2;
            else if (fr >= 60 && fr <= 78) pFR = 1;
            else if (fr >= 30 && fr <= 59) pFR = 0;
            else if (fr >= 26 && fr <= 29) pFR = 1;
        } else if (faixaEtaria === "3 meses a 11m29d") {
            if (fr <= 20) pFR = 3;
            else if (fr >= 80) pFR = 3;
            else if (fr >= 69 && fr <= 79) pFR = 2;
            else if (fr >= 54 && fr <= 68) pFR = 1;
            else if (fr >= 30 && fr <= 53) pFR = 0;
            else if (fr >= 21 && fr <= 29) pFR = 1;
        } else if (faixaEtaria === "1-3 anos") {
            if (fr <= 15) pFR = 3;
            else if (fr >= 70) pFR = 3;
            else if (fr >= 59 && fr <= 69) pFR = 2;
            else if (fr >= 40 && fr <= 58) pFR = 1;
            else if (fr >= 20 && fr <= 39) pFR = 0;
            else if (fr >= 16 && fr <= 19) pFR = 1;
        } else if (faixaEtaria === "4-7 anos") {
            if (fr <= 15) pFR = 3;
            else if (fr >= 60) pFR = 3;
            else if (fr >= 49 && fr <= 59) pFR = 2;
            else if (fr >= 30 && fr <= 48) pFR = 1;
            else if (fr >= 20 && fr <= 29) pFR = 0;
            else if (fr >= 16 && fr <= 19) pFR = 1;
        } else { // 8-12 anos ou mais
            if (fr <= 10) pFR = 3;
            else if (fr >= 50) pFR = 3;
            else if (fr >= 39 && fr <= 49) pFR = 2;
            else if (fr >= 26 && fr <= 38) pFR = 1;
            else if (fr >= 18 && fr <= 25) pFR = 0;
            else if (fr >= 11 && fr <= 17) pFR = 1;
        }
    }

    // --- TEMPERATURA ---
    if (linha.querySelector('.pews-temp')?.value !== "") {
        if (temp < 35) pTemp = 3;
        else if (temp >= 40) pTemp = 3;
        else if (temp >= 39.1 && temp <= 39.9) pTemp = 2;
        else if (temp >= 38.1 && temp <= 39.0) pTemp = 1;
        else if (temp >= 36.1 && temp <= 38.0) pTemp = 0;
        else if (temp >= 35.1 && temp <= 36.0) pTemp = 1;
    }

    const pNews = linha.querySelector('.news-input');
    const tdStatus = linha.querySelector('.status-cell');

    const totalPews = pFC + pFR + comp + vomitos + nebulizador + pTemp;
    pNews.value = totalPews;

    // --- FLUXOGRAMA DE CONDUTAS OFICIAL PEWS ---
    if (totalPews <= 1) {
        pNews.style.backgroundColor = "#e6ffe6"; pNews.style.color = "#28a745";
        tdStatus.innerHTML = `<span class="status-badge status-estavel">🟢 ESCORE ${totalPews} (SEM RISCO): Reavaliar a cada 4h / Seguir Plano Terapêutico</span>`;
    } else if (totalPews === 2) {
        pNews.style.backgroundColor = "#fff3cd"; pNews.style.color = "#856404";
        tdStatus.innerHTML = `<span class="status-badge" style="background:#fff3cd; color:#856404; border:1px solid #ffeeba;">🟡 ESCORE 2 (BAIXO RISCO): Solicitar avaliação do Enfermeiro (Reavaliar em 3h)</span>`;
    } else if (totalPews >= 3 && totalPews <= 4) {
        pNews.style.backgroundColor = "#ffe8cc"; pNews.style.color = "#d97706";
        tdStatus.innerHTML = `<span class="status-badge" style="background:#ffe8cc; color:#d97706; border:1px solid #fbd38d;">🟠 ESCORE ${totalPews} (MÉDIO RISCO): Avaliação do pediatra em 30 min (Reavaliar em 1h)</span>`;
    } else {
        pNews.style.backgroundColor = "#ffe6e6"; pNews.style.color = "#dc3545";
        tdStatus.innerHTML = `<span class="status-badge" style="background:#ffe6e6; color:#dc3545; border:1px solid #dc3545;">🚨 ESCORE ${totalPews} (ALTO RISCO): Acionar Enfermeiro/Médico imediato (Time de Resposta Rápida)</span>`;
    }
}

// --- CÁLCULO DO NEWS2 / SEPSE COM ISENÇÃO TOTAL DE ALERTAS AUTOMÁTICOS ---
function atualizarLinhaClinica(linha) {
    const card = linha.closest('.patient-card');
    const isentoEscore = card ? card.querySelector('.isento-relatorio')?.checked : false;

    const pPas = linha.querySelector('td:nth-child(2) input');
    const pTemp = linha.querySelector('td:nth-child(3) input');
    const pFr = linha.querySelector('td:nth-child(4) input');
    const pFc = linha.querySelector('td:nth-child(5) input');
    const pO2 = linha.querySelector('td:nth-child(6) select');
    const pSat = linha.querySelector('td:nth-child(7) input');
    const pConsc = linha.querySelector('td:nth-child(8) select');
    const pNews = linha.querySelector('.news-input');
    const tdStatus = linha.querySelector('.status-cell');
    const protocoloSelect = linha.querySelector('.protocolo-select');

    removerDestaquesLaranja(linha);

    const pas = parseFloat(pPas?.value) || 0;
    const temp = parseFloat(String(pTemp?.value || '').replace(',', '.')) || 0;
    const fr = parseFloat(pFr?.value) || 0;
    const fc = parseFloat(pFc?.value) || 0;
    const o2SimNao = pO2?.value ? pO2.value.toUpperCase() : "";
    const sat = parseFloat(pSat?.value) || 0;
    const consc = pConsc?.value ? pConsc.value.toUpperCase() : "";
    const abertoProtocoloManual = protocoloSelect ? protocoloSelect.value : "";

    const qtdPreenchida = [pPas?.value, pTemp?.value, pFr?.value, pFc?.value, pSat?.value, pO2?.value, pConsc?.value].filter(v => v !== "" && v !== undefined).length;

    if (qtdPreenchida === 0 && abertoProtocoloManual !== "Sim") {
        pNews.value = "";
        pNews.style.backgroundColor = "transparent";
        pNews.style.borderColor = "var(--borda)";
        pNews.style.color = "";
        tdStatus.innerHTML = "";
        return;
    }

    // SE ESTIVER ISENTO DE ESCORE
    if (isentoEscore) {
        pNews.value = ""; 
        pNews.style.backgroundColor = "transparent";
        pNews.style.color = "";

        // Só assume sepse/alerta se o profissional marcar manualmente "Sim" no select de protocolo
        if (abertoProtocoloManual === "Sim") {
            tdStatus.innerHTML = `<span class="status-badge" style="background:#ffe6e6; color:#dc3545; border:1px solid #dc3545;">🚨 ALERTA SEPSE (MANUAL)</span>`;
        } else {
            tdStatus.innerHTML = `<span class="status-badge" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1;">⚡ ISENTO DE ESCORE</span>`;
        }
        return;
    }

    // --- CÁLCULO NORMAL (CASO NÃO ESTEJA ISENTO) ---
    let score = 0;
    if (pFr.value !== "") {
        if (fr <= 8 || fr >= 25) score += 3;
        else if (fr >= 21) score += 2;
        else if (fr >= 9 && fr <= 11) score += 1;
    }

    if (o2SimNao === "SIM") score += 2;

    if (pSat.value !== "") {
        if (sat <= 91) score += 3;
        else if (sat <= 93) score += 2;
        else if (sat <= 95) score += 1;
    }

    if (pPas.value !== "") {
        if (pas < 90) { score += 3; destacarLaranja(pPas); }
        else if (pas >= 220) score += 3;
        else if ((pas >= 90 && pas <= 100) || (pas >= 200 && pas <= 219)) score += 2;
        else if (pas <= 110) score += 1;
    }

    if (pFc.value !== "") {
        if (fc <= 40 || fc >= 131) score += 3;
        else if (fc >= 111) score += 2;
        else if ((fc >= 41 && fc <= 50) || (fc >= 91 && fc <= 130)) score += 1;
    }

    if (pTemp.value !== "") {
        if (temp < 35) score += 3;
        else if (temp >= 39.1) score += 2;
        else if ((temp >= 35 && temp <= 36) || (temp >= 38.1 && temp <= 39)) score += 1;
    }

    let pConscVal = 0;
    if (consc === "VOZ, DOR OU NÃO REAGE") {
        pConscVal = 3;
        destacarLaranja(pConsc);
    } else if (consc === "AGITADO/CONFUSO") {
        pConscVal = 2;
    }
    score += pConscVal;

    let sirsCount = 0;
    if (pFc.value && fc > 90) { sirsCount++; destacarLaranja(pFc); }
    if (pFr.value && fr > 20) { sirsCount++; destacarLaranja(pFr); }
    if (pTemp.value && (temp > 38.3 || (temp > 0 && temp < 35))) { sirsCount++; destacarLaranja(pTemp); }

    let sepseSat = (sat > 0 && ((sat < 90 && o2SimNao !== "SIM") || (sat < 94 && o2SimNao === "SIM")));
    if (sepseSat) destacarLaranja(pSat);

    const isAlertaSepseAutomatico = (sirsCount >= 2 || pConscVal >= 3 || (pas > 0 && pas < 90) || sepseSat);
    const isAlertaSepse = (isAlertaSepseAutomatico || abertoProtocoloManual === "Sim");

    pNews.value = score;

    if (score === 0 || score <= 3) {
        pNews.style.backgroundColor = "#e6ffe6"; pNews.style.color = "#28a745";
    } else if (score <= 5) {
        pNews.style.backgroundColor = "#fff3cd"; pNews.style.color = "#856404";
    } else {
        pNews.style.backgroundColor = "#ffe6e6"; pNews.style.color = "#dc3545";
    }

    if (isAlertaSepse) {
        tdStatus.innerHTML = `<span class="status-badge" style="background:#ffe6e6; color:#dc3545; border:1px solid #dc3545;">🚨 ALERTA SEPSE</span>`;
    } else if (score >= 6) {
        tdStatus.innerHTML = `<span class="status-badge" style="background:#ffe6e6; color:#dc3545; border:1px solid #dc3545;">🚨 ALTO RISCO</span>`;
    } else if (score >= 4) {
        tdStatus.innerHTML = `<span class="status-badge" style="background:#fff3cd; color:#856404; border:1px solid #ffeeba;">🟡 MÉDIO RISCO</span>`;
    } else if (score >= 1) {
        tdStatus.innerHTML = `<span class="status-badge" style="background:#d1ecf1; color:#0c5460; border:1px solid #bee5eb;">🟢 BAIXO RISCO</span>`;
    } else {
        tdStatus.innerHTML = `<span class="status-badge status-estavel">✔️ ESTÁVEL</span>`;
    }
}

function destacarLaranja(el) {
    if (!el) return;
    el.style.border = "2px solid #ff9933";
    el.style.backgroundColor = "rgba(255, 153, 51, 0.08)";
}

function removerDestaquesLaranja(linha) {
    linha.querySelectorAll('input, select').forEach(input => {
        if (!input.classList.contains('news-input')) {
            input.style.border = "";
            input.style.backgroundColor = "";
        }
    });
}

// --- NAVEGAÇÃO DE SETORES & BUSCA ---
function mudarSetor(idSetor) {
    const campoBusca = document.getElementById('filtro-global');
    if (!campoBusca || campoBusca.value.trim() === "") {
        setorAtivoAntesDaBusca = idSetor;
    }

    if (campoBusca) campoBusca.value = "";

    const barraFiltro = document.getElementById('barra-filtro-global');
    if (barraFiltro) {
        barraFiltro.style.display = (idSetor === 'painel-central') ? 'none' : 'flex';
    }

    document.querySelectorAll('.btn-add-wrapper').forEach(btn => btn.style.display = 'flex');

    document.querySelectorAll('.tab-pane').forEach(aba => {
        aba.classList.remove('active');
        aba.style.display = '';
    });

    document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));

    const abaAlvo = document.getElementById(idSetor);
    if (abaAlvo) {
        abaAlvo.classList.add('active');
        abaAlvo.style.display = 'block';
    }

    document.querySelectorAll('.sidebar li').forEach(li => {
        if (li.getAttribute('onclick') && li.getAttribute('onclick').includes(idSetor)) {
            li.classList.add('active');
        }
    });
}

function executarBuscaGlobal() {
    const tipoFiltro = document.getElementById('tipo-busca').value;
    const termoFiltro = document.getElementById('filtro-global').value.toLowerCase().trim();

    const painelCentral = document.getElementById('painel-central');
    const todosOsCards = document.querySelectorAll('.patient-card');
    const todosBotoesAdd = document.querySelectorAll('.btn-add-wrapper');
    const todasAbasEnfermaria = document.querySelectorAll('.tab-pane:not(#painel-central)');

    if (termoFiltro === "") {
        todosBotoesAdd.forEach(btn => btn.style.display = 'flex');
        todosOsCards.forEach(card => card.style.display = 'block');
        mudarSetor(setorAtivoAntesDaBusca);
        return;
    }

    todosBotoesAdd.forEach(btn => btn.style.display = 'none');

    if (painelCentral) {
        painelCentral.classList.remove('active');
        painelCentral.style.display = 'none';
    }

    todasAbasEnfermaria.forEach(aba => {
        let encontrouNaAba = false;
        const cardsDaAba = aba.querySelectorAll('.patient-card');

        cardsDaAba.forEach(card => {
            const inputNome = card.querySelector('.nome-input');
            const inputTec = card.querySelector('.tec-input');

            const valorNome = inputNome ? inputNome.value.toLowerCase().trim() : "";
            const valorTec = inputTec ? inputTec.value.toLowerCase().trim() : "";

            let exibir = false;
            if (tipoFiltro === "paciente" && valorNome.includes(termoFiltro)) exibir = true;
            if (tipoFiltro === "tecnico" && valorTec.includes(termoFiltro)) exibir = true;

            if (exibir) {
                card.style.display = 'block';
                encontrouNaAba = true;
            } else {
                card.style.display = 'none';
            }
        });

        if (encontrouNaAba) {
            aba.classList.add('active');
            aba.style.display = 'block';
        } else {
            aba.classList.remove('active');
            aba.style.display = 'none';
        }
    });
}

// --- GESTÃO DE LEITOS, ALTAS E ÓBITOS ---
async function adicionarPaciente(botaoAdicionar) {
    const abaAtual = botaoAdicionar.closest('.tab-pane');
    if (!abaAtual) return;

    const container = abaAtual.querySelector('.patients-container');
    if (!container) return;

    const cardGabarito = container.querySelector('.patient-card');
    if (!cardGabarito) return;

    const novoCard = cardGabarito.cloneNode(true);
    limparCardPaciente(novoCard);
    novoCard.style.display = 'block';

    container.appendChild(novoCard);
    atualizarPainelCentral();
    await salvarDadosDoDia(dataSelecionadaStr);
}

async function removerCardPaciente(botaoExcluir) {
    const card = botaoExcluir.closest('.patient-card');
    if (!card) return;

    const container = card.parentElement;
    
    if (container.querySelectorAll('.patient-card').length > 1) {
        if (confirm("Deseja realmente remover este card de paciente criado por engano?")) {
            card.remove();
            atualizarPainelCentral();
            await salvarDadosDoDia(dataSelecionadaStr);
        }
    } else {
        if (confirm("Este é o único leito do setor. Deseja apenas limpar os dados dele?")) {
            limparCardPaciente(card);
            atualizarPainelCentral();
            await salvarDadosDoDia(dataSelecionadaStr);
        }
    }
}

// --- FUNÇÕES DE TRANSFERÊNCIA INTERNA ---
function abrirModalTransfInterna(botao) {
    cardAtualTransfInterna = botao.closest('.patient-card');
    document.getElementById('modal-transf-interna').style.display = 'flex';
}

function fecharModalTransfInterna() {
    document.getElementById('modal-transf-interna').style.display = 'none';
    cardAtualTransfInterna = null;
}

async function confirmarTransfInterna() {
    const selectDestino = document.getElementById('select-setor-destino');
    const idSetorDestino = selectDestino ? selectDestino.value : "";

    if (cardAtualTransfInterna && idSetorDestino) {
        const abaDestino = document.getElementById(idSetorDestino);
        if (!abaDestino) return;

        const containerDestino = abaDestino.querySelector('.patients-container');
        if (!containerDestino) return;

        const cardClonado = cardAtualTransfInterna.cloneNode(true);
        const primeiroCardDestino = containerDestino.querySelector('.patient-card');

        if (primeiroCardDestino && primeiroCardDestino.querySelector('.nome-input').value.trim() === "") {
            containerDestino.replaceChild(cardClonado, primeiroCardDestino);
        } else {
            containerDestino.appendChild(cardClonado);
        }

        const containerOrigem = cardAtualTransfInterna.parentElement;
        if (containerOrigem.querySelectorAll('.patient-card').length > 1) {
            cardAtualTransfInterna.remove();
        } else {
            limparCardPaciente(cardAtualTransfInterna);
        }

        fecharModalTransfInterna();
        atualizarPainelCentral();
        await salvarDadosDoDia(dataSelecionadaStr);
    }
}

function exportarRelatorioMensal() {
    let csv = "Setor;Nome Paciente;Prontuario;Tecnico Responsavel;Status\n";
    document.querySelectorAll('.patient-card').forEach(card => {
        const nome = card.querySelector('.nome-input')?.value.trim() || "";
        const prontuario = card.querySelector('.prontuario-input')?.value.trim() || "";
        const tec = card.querySelector('.tec-input')?.value.trim() || "";
        const setor = card.closest('.tab-pane')?.id.toUpperCase() || "";

        if (nome !== "") {
            csv += `${setor};${nome};${prontuario};${tec};Ativo\n`;
        }
    });

    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_sinais_vitais_${dataSelecionadaStr}.csv`;
    link.click();
}

function acumularIndicadoresDoCard(card) {
    card.querySelectorAll('.vitals-table tbody tr').forEach(tr => {
        const inputNews = tr.querySelector('.news-input');
        const newsVal = inputNews ? parseInt(inputNews.value) : NaN;
        const isento = card.querySelector('.isento-relatorio')?.checked;

        if (!isento && !isNaN(newsVal) && inputNews.value.trim() !== "") {
            if (newsVal <= 1) indicadoresMensais.estavel++;
            else if (newsVal === 2) indicadoresMensais.baixo++;
            else if (newsVal >= 3 && newsVal <= 4) indicadoresMensais.medio++;
            else if (newsVal >= 5) indicadoresMensais.alto++;
        }

        const tdStatusElement = tr.querySelector('.status-cell');
        if (tdStatusElement && (tdStatusElement.innerHTML.includes('ALTO RISCO') || tdStatusElement.innerHTML.includes('Time de Resposta Rápida'))) {
            indicadoresMensais.sepse++;
        }
    });
    salvarContadoresMensais();
}

async function darAltaPaciente(botaoAlta) {
    if (confirm('ATENÇÃO: Realmente dar alta para o paciente e limpar leito?')) {
        const card = botaoAlta.closest('.patient-card');
        const container = card.parentElement;

        acumularIndicadoresDoCard(card);
        contadoresSaidas.alta++;
        salvarContadoresMensais();

        if (container.querySelectorAll('.patient-card').length > 1) {
            card.remove();
        } else {
            limparCardPaciente(card);
        }

        atualizarPainelCentral();
        await salvarDadosDoDia(dataSelecionadaStr);
    }
}

async function registrarObitoPaciente(botaoObito) {
    if (confirm('ATENÇÃO: Confirmar registro de ÓBITO do paciente e liberação do leito?')) {
        const card = botaoObito.closest('.patient-card');
        const container = card.parentElement;

        acumularIndicadoresDoCard(card);
        contadoresSaidas.obito++;
        salvarContadoresMensais();

        if (container.querySelectorAll('.patient-card').length > 1) {
            card.remove();
        } else {
            limparCardPaciente(card);
        }

        atualizarPainelCentral();
        await salvarDadosDoDia(dataSelecionadaStr);
    }
}

function abrirModalTransfExterna(botao) {
    cardAtualTransf = botao.closest('.patient-card');
    document.getElementById('modal-transf-externa').style.display = 'flex';
}

function fecharModalTransf() {
    document.getElementById('modal-transf-externa').style.display = 'none';
    cardAtualTransf = null;
}

async function confirmarTransfExterna() {
    const select = document.getElementById('select-local-destino');
    const destinoFinal = select ? select.value : "";

    if (cardAtualTransf) {
        const container = cardAtualTransf.parentElement;

        acumularIndicadoresDoCard(cardAtualTransf);
        if (destinoFinal && contadoresSaidas.hasOwnProperty(destinoFinal)) {
            contadoresSaidas[destinoFinal]++;
            salvarContadoresMensais();
        }

        if (container.querySelectorAll('.patient-card').length > 1) {
            cardAtualTransf.remove();
        } else {
            limparCardPaciente(cardAtualTransf);
        }
    }
    fecharModalTransf();
    atualizarPainelCentral();
    await salvarDadosDoDia(dataSelecionadaStr);
}

function limparCardPaciente(card) {
    card.querySelectorAll('input').forEach(input => {
        if (input.type === 'checkbox') input.checked = false;
        else input.value = '';
        input.style.border = '';
        input.style.backgroundColor = '';
    });

    card.querySelectorAll('select').forEach(select => select.selectedIndex = 0);

    card.querySelectorAll('.news-input').forEach(news => {
        news.value = '';
        news.style.backgroundColor = 'transparent';
        news.style.borderColor = '';
        news.style.color = '';
    });

    card.querySelectorAll('.badge-idade').forEach(badge => {
        badge.textContent = '--';
    });

    card.querySelectorAll('tr.linha-horario-extra').forEach(trExtra => trExtra.remove());

    card.querySelectorAll('.vitals-table tbody tr').forEach(linha => {
        const tdStatus = linha.querySelector('.status-cell');
        if (tdStatus) tdStatus.innerHTML = '';
        removerDestaquesLaranja(linha);
    });
}

// --- GRÁFICO DE OCUPAÇÃO DIÁRIA ---
function inicializarGraficoOcupacao() {
    const ctx = document.getElementById('graficoOcupacao');
    if (!ctx) return;

    meuGraficoOcupacao = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: 31}, (_, i) => `Dia ${i + 1}`),
            datasets: [{
                label: 'Pacientes Internados',
                data: historicoOcupacaoDiaria,
                borderColor: '#0056b3',
                backgroundColor: 'rgba(0, 86, 179, 0.08)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointBackgroundColor: '#003366'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function atualizarDadosGrafico(totalInternadosHoje) {
    if (!meuGraficoOcupacao) return;

    const partesData = dataSelecionadaStr.split('-');
    const ano = partesData[0];
    const mes = partesData[1];
    const totalDiasNoMes = new Date(ano, mes, 0).getDate();

    for (let dia = 1; dia <= 31; dia++) {
        if (dia <= totalDiasNoMes) {
            const diaStr = String(dia).padStart(2, '0');
            const chaveData = `${ano}-${mes}-${diaStr}`;

            if (chaveData === dataSelecionadaStr) {
                historicoOcupacaoDiaria[dia - 1] = totalInternadosHoje;
            } else {
                historicoOcupacaoDiaria[dia - 1] = 0;
            }
        } else {
            historicoOcupacaoDiaria[dia - 1] = 0;
        }
    }

    meuGraficoOcupacao.data.datasets[0].data = historicoOcupacaoDiaria;
    meuGraficoOcupacao.update();

    const totalMes = historicoOcupacaoDiaria.reduce((acc, curr) => acc + curr, 0);
    const elTotalMes = document.getElementById('total-acumulado-mes');
    if (elTotalMes) elTotalMes.textContent = totalMes;
}

// --- ATUALIZAR CONTADORES NO MENU LATERAL ---
function atualizarContadoresMenuLateral() {
    const setoresIds = ['enf1', 'enf2', 'enf3', 'enf4', 'enf5', 'corredor', 'enf-pediatria', 'sala-emergencia'];

    setoresIds.forEach(idSetor => {
        const aba = document.getElementById(idSetor);
        const badgeSpan = document.querySelector(`.badge-contador[data-setor="${idSetor}"]`);
        
        if (!aba || !badgeSpan) return;

        let pacientesNoSetor = 0;
        aba.querySelectorAll('.patient-card').forEach(card => {
            const nomeInput = card.querySelector('.nome-input');
            if (nomeInput && nomeInput.value.trim() !== "") {
                pacientesNoSetor++;
            }
        });

        badgeSpan.textContent = pacientesNoSetor;
    });
}

// --- PAINEL CENTRAL / DASHBOARD METRICS ---
function atualizarPainelCentral() {
    let totalPacientes = 0;
    let totalSepseAtiva = 0;

    let cntEstavelAtivo = 0;
    let cntBaixoAtivo = 0;
    let cntMedioAtivo = 0;
    let cntAltoAtivo = 0;

    const listaProtocolosAtivos = [];
    const agora = new Date();

    document.querySelectorAll('.patient-card').forEach(card => {
        const inputNome = card.querySelector('.nome-input');
        const isento = card.querySelector('.isento-relatorio')?.checked;
        const nome = inputNome ? inputNome.value.trim() : "";

        const abaPai = card.closest('.tab-pane');
        const idSetor = abaPai ? abaPai.id.toUpperCase() : "LEITO";

        if (nome !== "") {
            totalPacientes++;

            let cardTemSepse = false;
            let cardTemProtocoloAberto = false;
            let horaAberturaSepse = null;

            card.querySelectorAll('.vitals-table tbody tr').forEach(tr => {
                const tdStatusElement = tr.querySelector('.status-cell');
                const htmlStatus = tdStatusElement ? tdStatusElement.innerHTML : '';
                
                const inputNews = tr.querySelector('.news-input');
                const newsVal = inputNews ? parseInt(inputNews.value) : NaN;
                
                const horaTabela = tr.getAttribute('data-hora') || (tr.querySelector('.time-col') ? tr.querySelector('.time-col')?.textContent.trim() : "08:00");
                
                const protocoloSelect = tr.querySelector('.protocolo-select');
                const abertoProtocolo = protocoloSelect ? protocoloSelect.value : "";

                if (htmlStatus.includes('ALTO RISCO') || htmlStatus.includes('Time de Resposta Rápida') || htmlStatus.includes('ALERTA SEPSE')) {
                    cardTemSepse = true; 
                    
                    if (abertoProtocolo === "Sim") {
                        cardTemProtocoloAberto = true;
                        if (!horaAberturaSepse) horaAberturaSepse = horaTabela;
                    }
                }

                if (!isento && !isNaN(newsVal) && inputNews.value.trim() !== "") {
                    if (newsVal <= 1) {
                        cntEstavelAtivo++;
                    } else if (newsVal === 2) {
                        cntBaixoAtivo++;
                    } else if (newsVal >= 3 && newsVal <= 4) {
                        cntMedioAtivo++;
                    } else if (newsVal >= 5) {
                        cntAltoAtivo++;
                    }
                }
            });

            if (cardTemSepse) {
                totalSepseAtiva++; 

                if (cardTemProtocoloAberto) {
                    const dataFormatada = agora.toLocaleDateString('pt-BR');
                    listaProtocolosAtivos.push({
                        nome: nome,
                        setor: idSetor,
                        dataHora: `${dataFormatada} às ${horaAberturaSepse || '08:00'}`,
                        vigencia: "72h"
                    });
                }
            }
        }
    });

    const containerProtocolos = document.getElementById('container-protocolos-ativos');
    if (containerProtocolos) {
        if (listaProtocolosAtivos.length === 0) {
            containerProtocolos.innerHTML = `
                <div style="height: 100%; min-height: 120px; display: flex; align-items: center; justify-content: center; border: 1px dashed #cbd5e1; border-radius: 6px; background: #ffffff;">
                    <span style="color: #64748b; font-size: 0.85rem; font-style: italic;">Nenhum protocolo ativo no momento</span>
                </div>`;
        } else {
            containerProtocolos.innerHTML = listaProtocolosAtivos.map(p => `
                <div style="background: #fff5f5; border: 1px solid #fecaca; border-left: 4px solid #dc3545; border-radius: 6px; padding: 10px 14px; font-size: 0.82rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div>
                        <strong style="color: #991b1b; font-size: 0.9rem; text-transform: uppercase;">${p.nome}</strong> 
                        <span style="color: #64748b; font-size: 0.75rem; font-weight: 600;">(${p.setor})</span><br>
                        <span style="color: #475569; font-size: 0.78rem;">Abertura: <strong>${p.dataHora}</strong></span>
                    </div>
                    <div>
                        <span style="background: #dc3545; color: #fff; padding: 4px 10px; border-radius: 12px; font-size: 0.72rem; font-weight: bold; display: inline-block;">
                            Vigência: ${p.vigencia}
                        </span>
                    </div>
                </div>
            `).join('');
        }
    }

    document.getElementById('dash-pacientes').textContent = totalPacientes;
    document.getElementById('dash-sepse').textContent = indicadoresMensais.sepse + totalSepseAtiva;

    document.getElementById('dash-estavel').textContent = indicadoresMensais.estavel + cntEstavelAtivo;
    document.getElementById('dash-baixo').textContent = indicadoresMensais.baixo + cntBaixoAtivo;
    document.getElementById('dash-medio').textContent = indicadoresMensais.medio + cntMedioAtivo;
    document.getElementById('dash-alto').textContent = indicadoresMensais.alto + cntAltoAtivo;

    const elAlta = document.getElementById('saida-alta');
    const elHcUfu = document.getElementById('saida-hc-ufu');
    const elHospMunic = document.getElementById('saida-hospital-municipal');
    const elCip = document.getElementById('saida-cip');
    const elCaps = document.getElementById('saida-caps');
    const elUcci = document.getElementById('saida-ucci');
    const elObito = document.getElementById('saida-obito');

    if (elAlta) elAlta.textContent = contadoresSaidas.alta;
    if (elHcUfu) elHcUfu.textContent = contadoresSaidas["HC UFU"];
    if (elHospMunic) elHospMunic.textContent = contadoresSaidas["Hospital Municipal"];
    if (elCip) elCip.textContent = contadoresSaidas["CIP"];
    if (elCaps) elCaps.textContent = contadoresSaidas["CAPS"];
    if (elUcci) elUcci.textContent = contadoresSaidas["UCCI"];
    if (elObito) elObito.textContent = contadoresSaidas.obito;

    atualizarDadosGrafico(totalPacientes);
    atualizarContadoresMenuLateral();
}