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
let setorAtivoAntesDaBusca = 'painel-central';

const dataAtualReal = new Date();
const dataHojeStr = formatarDataChave(dataAtualReal);
let dataSelecionadaStr = dataHojeStr;
let mesExibido = dataAtualReal.getMonth();
let anoExibido = dataAtualReal.getFullYear();

const historicoOcupacaoDiaria = Array(31).fill(0);

document.addEventListener("DOMContentLoaded", async () => {
    const mainContent = document.querySelector(".content");

    mainContent.addEventListener("input", tratarMudancaVitais);
    mainContent.addEventListener("change", tratarMudancaVitais);

    await carregarContadoresMensais(dataSelecionadaStr);
    await carregarHistoricoMesGrafico(dataSelecionadaStr.substring(0, 7)); 

    inicializarGraficoOcupacao();
    renderizarCalendario();
    await carregarDadosDoDia(dataSelecionadaStr);
    await atualizarPainelCentral();
});

function formatarDataChave(dateObj) {
    const ano = dateObj.getFullYear();
    const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dia = String(dateObj.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function verificarBloqueioPlantao() {
    const agora = new Date();
    const horaAtual = agora.getHours();
    const dataHojeRealStr = formatarDataChave(agora);

    if (dataSelecionadaStr < dataHojeRealStr) {
        const modal = document.getElementById('modal-bloqueio-plantao');
        const textoBox = document.getElementById('mensagem-bloqueio-texto');
        const tituloBox = document.getElementById('titulo-modal-aviso');
        
        if (modal && textoBox) {
            if (tituloBox) tituloBox.textContent = "MODO SOMENTE LEITURA";
            textoBox.innerHTML = `
                Você está visualizando uma data anterior (<strong>${dataSelecionadaStr.split('-').reverse().join('/')}</strong>).<br><br>` +
                `Por motivos de segurança e integridade dos dados, <strong>não é permitida a edição</strong> de plantões passados.
            `;
            modal.style.display = 'flex';
        }
        return true;
    }

    if (dataSelecionadaStr === dataHojeRealStr && horaAtual < 7) {
        const modal = document.getElementById('modal-bloqueio-plantao');
        const textoBox = document.getElementById('mensagem-bloqueio-texto');
        const tituloBox = document.getElementById('titulo-modal-aviso');
        
        if (modal && textoBox) {
            if (tituloBox) tituloBox.textContent = "BLOQUEIO DE SEGURANÇA DO PLANTÃO";
            const minutosStr = String(agora.getMinutes()).padStart(2, '0');
            const horaStr = String(horaAtual).padStart(2, '0');
            
            textoBox.innerHTML = `
                Ainda são <strong>${horaStr}:${minutosStr}h</strong>.<br>` +
                `Este horário ainda pertence ao plantão do dia anterior até as 07:00h.<br><br>`;
            modal.style.display = 'flex';
        }
        return true;
    }

    return false;
}

function fecharModalBloqueio() {
    const modal = document.getElementById('modal-bloqueio-plantao');
    if (modal) modal.style.display = 'none';
}

function mostrarConfirmacaoCustomizada(mensagem, titulo = "CONFIRMAÇÃO") {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-confirmacao-sistema');
        const txtMsg = document.getElementById('mensagem-confirmacao');
        const txtTitulo = document.getElementById('titulo-confirmacao');
        const btnSim = document.getElementById('btn-aceitar-confirmacao');
        const btnNao = document.getElementById('btn-cancelar-confirmacao');

        if (!modal) {
            resolve(confirm(mensagem)); 
            return;
        }

        txtMsg.textContent = mensagem;
        txtTitulo.textContent = titulo;
        modal.style.display = 'flex';

        const novoBtnSim = btnSim.cloneNode(true);
        const novoBtnNao = btnNao.cloneNode(true);
        btnSim.parentNode.replaceChild(novoBtnSim, btnSim);
        btnNao.parentNode.replaceChild(novoBtnNao, btnNao);

        novoBtnSim.onclick = () => {
            modal.style.display = 'none';
            resolve(true);
        };

        novoBtnNao.onclick = () => {
            modal.style.display = 'none';
            resolve(false);
        };
    });
}

// --- PERSISTÊNCIA E LEITURA SEGURA DOS CONTADORES MENSAIS ---
async function salvarContadoresMensais() {
    const mesAnoChave = dataSelecionadaStr.substring(0, 7); 
    
    localStorage.setItem(`saidas_${mesAnoChave}`, JSON.stringify(contadoresSaidas));
    localStorage.setItem(`indicadores_${mesAnoChave}`, JSON.stringify(indicadoresMensais));

    const chaveEstatistica = `STATS-${mesAnoChave}`;
    const objEstatisticas = {
        saidas: contadoresSaidas,
        indicadores: indicadoresMensais
    };

    const { error } = await _supabase
        .from('plantoes')
        .upsert({ 
            data_chave: chaveEstatistica, 
            dados_json: objEstatisticas, 
            mes_ano: mesAnoChave,
            updated_at: new Date()
        }, { onConflict: 'data_chave' });

    if (error) console.error("Erro ao salvar estatísticas:", error.message);
}

async function carregarContadoresMensais(dataChave) {
    const mesAnoChave = dataChave.substring(0, 7);
    const chaveEstatistica = `STATS-${mesAnoChave}`;
    
    Object.keys(contadoresSaidas).forEach(k => { contadoresSaidas[k] = 0; });
    Object.keys(indicadoresMensais).forEach(k => { indicadoresMensais[k] = 0; });

    const { data, error } = await _supabase
        .from('plantoes')
        .select('dados_json')
        .eq('data_chave', chaveEstatistica)
        .maybeSingle();

    if (data && data.dados_json) {
        const salvosSaidas = data.dados_json.saidas;
        const salvosInd = data.dados_json.indicadores;
        
        if (salvosSaidas) Object.keys(salvosSaidas).forEach(k => { contadoresSaidas[k] = salvosSaidas[k] || 0; });
        if (salvosInd) Object.keys(salvosInd).forEach(k => { indicadoresMensais[k] = salvosInd[k] || 0; });
    } else {
        const rawSaidas = localStorage.getItem(`saidas_${mesAnoChave}`);
        if (rawSaidas) {
            const salvos = JSON.parse(rawSaidas);
            Object.keys(salvos).forEach(k => { contadoresSaidas[k] = salvos[k] || 0; });
        }

        const rawInd = localStorage.getItem(`indicadores_${mesAnoChave}`);
        if (rawInd) {
            const salvosInd = JSON.parse(rawInd);
            Object.keys(salvosInd).forEach(k => { indicadoresMensais[k] = salvosInd[k] || 0; });
        }
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
            
            const mesAnterior = dataSelecionadaStr.substring(0, 7);
            dataSelecionadaStr = dataIso;
            const mesNovo = dataSelecionadaStr.substring(0, 7);
            
            await carregarContadoresMensais(dataSelecionadaStr);
            
            if (mesAnterior !== mesNovo) {
                await carregarHistoricoMesGrafico(mesNovo);
            }

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

    if (dias < 0) meses--;
    if (meses < 0) {
        anos--;
        meses += 12;
    }

    let totalMeses = (hoje.getFullYear() - nasc.getFullYear()) * 12 + (hoje.getMonth() - nasc.getMonth());

    if (totalMeses < 1) badge.textContent = "< 1m";
    else if (totalMeses < 12) badge.textContent = `${totalMeses}m`;
    else badge.textContent = meses > 0 ? `${anos}a ${meses}m` : `${anos}a`;
}

function obterMinutosPlantao(horaStr) {
    const [h, m] = horaStr.split(':').map(Number);
    let minutosTotais = h * 60 + m;
    if (h < 7) minutosTotais += 24 * 60;
    return minutosTotais;
}

function adicionarHorarioExtraOrdenado(btn) {
    if (verificarBloqueioPlantao()) return;

    const tableContainer = btn.closest('.table-responsive');
    const tbody = tableContainer.querySelector('.vitals-table tbody');
    const abaPai = btn.closest('.tab-pane');
    const isPediatria = abaPai && abaPai.id === 'enf-pediatria';

    const agora = new Date();
    const horaPadrao = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
    const novoHorario = prompt("Digite o horário extra (ex: 09:30, 23:45):", horaPadrao);

    if (!novoHorario || novoHorario.trim() === "") return;
    const horaFormatada = novoHorario.trim();

    const novaLinha = document.createElement('tr');
    novaLinha.classList.add('linha-horario-extra');
    novaLinha.setAttribute('data-hora', horaFormatada);

    if (isPediatria) {
        novaLinha.innerHTML = `
            <td class="time-col" style="text-align: center; vertical-align: middle;">
                <div style="display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                    <span>${horaFormatada}</span>
                    <button type="button" class="btn-del-linha" onclick="removerLinhaExtraDireta(this)" title="Remover horário" style="background: #ff4d4d; color: #000; border: none; border-radius: 50%; width: 16px; height: 16px; font-size: 9px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0;">✖</button>
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
            <td class="time-col" style="text-align: center; vertical-align: middle;">
                <div style="display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                    <span>${horaFormatada}</span>
                    <button type="button" class="btn-del-linha" onclick="removerLinhaExtraDireta(this)" title="Remover horário" style="background: #ff4d4d; color: #000; border: none; border-radius: 50%; width: 16px; height: 16px; font-size: 9px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0;">✖</button>
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

    const minutosNovos = obterMinutosPlantao(horaFormatada);
    const linhasExistentes = Array.from(tbody.querySelectorAll('tr'));
    let inserido = false;

    for (let tr of linhasExistentes) {
        const spanHora = tr.querySelector('.time-col span') || tr.querySelector('.time-col');
        const textoHora = spanHora ? spanHora.textContent.trim() : "";

        if (textoHora && textoHora.includes(':')) {
            const minutosTr = obterMinutosPlantao(textoHora);
            if (minutosNovos < minutosTr) {
                tbody.insertBefore(novaLinha, tr);
                inserido = true;
                break;
            }
        }
    }

    if (!inserido) tbody.appendChild(novaLinha);
    salvarDadosDoDia(dataSelecionadaStr);
}

async function removerLinhaExtraDireta(btnX) {
    if (verificarBloqueioPlantao()) return;

    const confirmado = await mostrarConfirmacaoCustomizada("Deseja remover esta aferição de horário extra?", "REMOVER HORÁRIO");
    if (confirmado) {
        const linha = btnX.closest('tr');
        linha.remove();
        atualizarPainelCentral();
        await salvarDadosDoDia(dataSelecionadaStr);
    }
}

async function salvarDadosDoDia(dataChave) {
    if (dataChave.startsWith('STATS-')) return;

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
                dadosGerais.push({ setor: idSetor, nome, dtNasc, prontuario, tec, isento, vitais });
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

    if (error) console.error("Erro ao salvar no Supabase:", error.message);
}

async function carregarDadosDoDia(dataChave) {
    const { data, error } = await _supabase
        .from('plantoes')
        .select('dados_json')
        .eq('data_chave', dataChave)
        .maybeSingle();

    document.querySelectorAll('.tab-pane:not(#painel-central)').forEach(aba => {
        const container = aba.querySelector('.patients-container');
        if (!container) return;

        const cards = container.querySelectorAll('.patient-card');
        for (let i = 1; i < cards.length; i++) cards[i].remove();
        if (cards[0]) limparCardPaciente(cards[0]);
    });

    if (!data || !data.dados_json || error) {
        await atualizarPainelCentral();
        return;
    }

    const dadosGerais = data.dados_json;

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
                            <td class="time-col" style="text-align: center; vertical-align: middle;">
                                <div style="display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                                    <span>${hora}</span>
                                    <button type="button" class="btn-del-linha" onclick="removerLinhaExtraDireta(this)" title="Remover horário" style="background: #ff4d4d; color: #000; border: none; border-radius: 50%; width: 16px; height: 16px; font-size: 9px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0;">✖</button>
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
                            <td class="time-col" style="text-align: center; vertical-align: middle;">
                                <div style="display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                                    <span>${hora}</span>
                                    <button type="button" class="btn-del-linha" onclick="removerLinhaExtraDireta(this)" title="Remover horário" style="background: #ff4d4d; color: #000; border: none; border-radius: 50%; width: 16px; height: 16px; font-size: 9px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0;">✖</button>
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

                    const minutosNovosC = obterMinutosPlantao(hora);
                    const linhasExistentes = Array.from(tbody.querySelectorAll('tr'));
                    let inserido = false;

                    for (let tr of linhasExistentes) {
                        const spanHora = tr.querySelector('.time-col span') || tr.querySelector('.time-col');
                        const textoHora = spanHora ? spanHora.textContent.trim() : "";

                        if (textoHora && textoHora.includes(':')) {
                            const minutosTrC = obterMinutosPlantao(textoHora);
                            if (minutosNovosC < minutosTrC) {
                                tbody.insertBefore(novaLinha, tr);
                                inserido = true;
                                break;
                            }
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

    await atualizarPainelCentral();
}

async function iniciarNovoPlantao() {
    const agora = new Date();
    const horaAtual = agora.getHours();
    const minutoAtual = agora.getMinutes();

    if (horaAtual < 7 || horaAtual >= 12) {
        const modal = document.getElementById('modal-bloqueio-plantao');
        const textoBox = document.getElementById('mensagem-bloqueio-texto');
        const tituloBox = document.getElementById('titulo-modal-aviso');
        
        if (modal && textoBox) {
            if (tituloBox) tituloBox.textContent = "AÇÃO NÃO PERMITIDA";
            textoBox.innerHTML = `
                Horário atual: <strong>${String(horaAtual).padStart(2, '0')}:${String(minutoAtual).padStart(2, '0')}h</strong>.<br><br>` +
                `O novo plantão só pode ser iniciado entre as <strong>07:00h</strong> e as <strong>11:59h</strong> da manhã.
            `;
            modal.style.display = 'flex';
        }
        return;
    }

    const confirmado = await mostrarConfirmacaoCustomizada("ATENÇÃO: Deseja iniciar o novo plantão das 07h? Isso manterá os pacientes internados nos leitos e limpará as tabelas para a nova jornada.", "INICIAR NOVO PLANTÃO");
    if (!confirmado) return;

    await salvarDadosDoDia(dataSelecionadaStr);

    const { data: dataAnterior } = await _supabase
        .from('plantoes')
        .select('dados_json')
        .eq('data_chave', dataSelecionadaStr)
        .maybeSingle();

    const pacientesParaMigrar = dataAnterior ? dataAnterior.dados_json : [];

    const mesAnteriorInic = dataSelecionadaStr.substring(0, 7);
    
    dataSelecionadaStr = formatarDataChave(agora);
    mesExibido = agora.getMonth();
    anoExibido = agora.getFullYear();
    const mesNovoInic = dataSelecionadaStr.substring(0, 7);
    
    await carregarContadoresMensais(dataSelecionadaStr);
    
    if (mesAnteriorInic !== mesNovoInic) {
        await carregarHistoricoMesGrafico(mesNovoInic);
    }
    
    renderizarCalendario();

    if (pacientesParaMigrar.length > 0) {
        const novosDados = pacientesParaMigrar.map(p => ({
            setor: p.setor,
            nome: p.nome || "",
            dtNasc: p.dtNasc || "",
            prontuario: p.prontuario || "",
            tec: p.tec || "",
            isento: p.isento || false,
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
    
    const modal = document.getElementById('modal-bloqueio-plantao');
    const textoBox = document.getElementById('mensagem-bloqueio-texto');
    const tituloBox = document.getElementById('titulo-modal-aviso');
    if (modal && textoBox) {
        if (tituloBox) tituloBox.textContent = "PLANTÃO INICIADO";
        textoBox.innerHTML = `Novo Plantão das 07h iniciado com sucesso para o dia <strong>${agora.toLocaleDateString('pt-BR')}</strong>! Os pacientes internados foram mantidos nos leitos.`;
        modal.style.display = 'flex';
    }
}

async function tratarMudancaVitais(event) {
    if (verificarBloqueioPlantao()) {
        const el = event.target;
        if (el.type === 'checkbox') el.checked = false;
        else el.value = '';
        return;
    }

    const elemento = event.target;

    if (elemento.classList.contains('dtnasc-input')) {
        atualizarBadgeIdade(elemento);
    }

    if (elemento.classList.contains('nome-input') || elemento.classList.contains('isento-relatorio') || elemento.classList.contains('dtnasc-input')) {
        const card = elemento.closest('.patient-card');
        if (card && card.closest('.tab-pane')?.id === 'enf-pediatria') {
            card.querySelectorAll('.vitals-table tbody tr').forEach(tr => atualizarLinhaPews(tr));
        }
        await atualizarPainelCentral();
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

    await atualizarPainelCentral();
    await salvarDadosDoDia(dataSelecionadaStr);
}

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

    let pFC = 0, pFR = 0, pTemp = 0;

    if (fc > 0) {
        if (faixaEtaria === "< 3 meses") {
            if (fc <= 89 || fc >= 220) pFC = 3;
            else if (fc >= 180 && fc <= 219) pFC = 2;
            else if (fc >= 160 && fc <= 179) pFC = 1;
        } else if (faixaEtaria === "3 meses a 11m29d") {
            if (fc <= 89 || fc >= 210) pFC = 3;
            else if (fc >= 170 && fc <= 209) pFC = 2;
            else if (fc >= 160 && fc <= 169) pFC = 1;
        } else if (faixaEtaria === "1-3 anos") {
            if (fc <= 89 || fc >= 200) pFC = 3;
            else if (fc >= 160 && fc <= 199) pFC = 2;
            else if (fc >= 140 && fc <= 159) pFC = 1;
        } else if (faixaEtaria === "4-7 anos") {
            if (fc <= 60 || fc >= 190) pFC = 3;
            else if (fc >= 150 && fc <= 189) pFC = 2;
            else if (fc >= 111 && fc <= 149 || (fc >= 61 && fc <= 69)) pFC = 1;
        } else {
            if (fc <= 60 || fc >= 170) pFC = 3;
            else if (fc >= 130 && fc <= 169) pFC = 2;
            else if (fc >= 101 && fc <= 129 || (fc >= 60 && fc <= 65)) pFC = 1;
        }
    }

    if (fr > 0) {
        if (faixaEtaria === "< 3 meses") {
            if (fr <= 25 || fr >= 90) pFR = 3;
            else if (fr >= 79 && fr <= 89) pFR = 2;
            else if (fr >= 60 && fr <= 78 || (fr >= 26 && fr <= 29)) pFR = 1;
        } else if (faixaEtaria === "3 meses a 11m29d") {
            if (fr <= 20 || fr >= 80) pFR = 3;
            else if (fr >= 69 && fr <= 79) pFR = 2;
            else if (fr >= 54 && fr <= 68 || (fr >= 21 && fr <= 29)) pFR = 1;
        } else if (faixaEtaria === "1-3 anos") {
            if (fr <= 15 || fr >= 70) pFR = 3;
            else if (fr >= 59 && fr <= 69) pFR = 2;
            else if (fr >= 40 && fr <= 58 || (fr >= 16 && fr <= 19)) pFR = 1;
        } else if (faixaEtaria === "4-7 anos") {
            if (fr <= 15 || fr >= 60) pFR = 3;
            else if (fr >= 49 && fr <= 59) pFR = 2;
            else if (fr >= 30 && fr <= 48 || (fr >= 16 && fr <= 19)) pFR = 1;
        } else {
            if (fr <= 10 || fr >= 50) pFR = 3;
            else if (fr >= 39 && fr <= 49) pFR = 2;
            else if (fr >= 26 && fr <= 38 || (fr >= 11 && fr <= 17)) pFR = 1;
        }
    }

    if (linha.querySelector('.pews-temp')?.value !== "") {
        if (temp < 35 || temp >= 40) pTemp = 3;
        else if (temp >= 39.1 && temp <= 39.9) pTemp = 2;
        else if ((temp >= 38.1 && temp <= 39.0) || (temp >= 35.1 && temp <= 36.0)) pTemp = 1;
    }

    const pNews = linha.querySelector('.news-input');
    const tdStatus = linha.querySelector('.status-cell');

    const totalPews = pFC + pFR + comp + vomitos + nebulizador + pTemp;
    pNews.value = totalPews;

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

    if (isentoEscore) {
        pNews.value = ""; 
        pNews.style.backgroundColor = "transparent";
        pNews.style.color = "";

        if (abertoProtocoloManual === "Sim") {
            tdStatus.innerHTML = `<span class="status-badge" style="background:#ffe6e6; color:#dc3545; border:1px solid #dc3545;">🚨 ALERTA SEPSE (MANUAL)</span>`;
        } else {
            tdStatus.innerHTML = `<span class="status-badge" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1;">⚡ ISENTO DE ESCORE</span>`;
        }
        return;
    }

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

async function adicionarPaciente(botaoAdicionar) {
    if (verificarBloqueioPlantao()) return;

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
    await atualizarPainelCentral();
    await salvarDadosDoDia(dataSelecionadaStr);
}

async function removerCardPaciente(botaoExcluir) {
    if (verificarBloqueioPlantao()) return;

    const card = botaoExcluir.closest('.patient-card');
    if (!card) return;

    const container = card.parentElement;
    
    if (container.querySelectorAll('.patient-card').length > 1) {
        const confirmado = await mostrarConfirmacaoCustomizada('Deseja excluir este leito?', 'EXCLUIR LEITO');
        if (confirmado) {
            card.remove();
            await atualizarPainelCentral();
            await salvarDadosDoDia(dataSelecionadaStr);
        }
    } else {
        const confirmado = await mostrarConfirmacaoCustomizada('Este é o único leito do setor. Deseja apenas limpar os dados dele?', 'LIMPAR LEITO');
        if (confirmado) {
            limparCardPaciente(card);
            await atualizarPainelCentral();
            await salvarDadosDoDia(dataSelecionadaStr);
        }
    }
}

function abrirModalTransfInterna(botao) {
    if (verificarBloqueioPlantao()) return;

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
        await atualizarPainelCentral();
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
        if (tdStatusElement) {
            const htmlStatus = tdStatusElement.innerHTML;
            if (htmlStatus.includes('ALTO RISCO') || htmlStatus.includes('Time de Resposta Rápida') || htmlStatus.includes('ALERTA SEPSE')) {
                indicadoresMensais.sepse++;
            }
        }
    });
    salvarContadoresMensais();
}

async function darAltaPaciente(botaoAlta) {
    if (verificarBloqueioPlantao()) return;

    const confirmado = await mostrarConfirmacaoCustomizada('ATENÇÃO: Realmente dar alta para o paciente e limpar leito?', 'ALTA HOSPITALAR');
    if (!confirmado) return;

    const card = botaoAlta.closest('.patient-card');
    const container = card.parentElement;

    acumularIndicadoresDoCard(card);
    contadoresSaidas.alta++;
    await salvarContadoresMensais();

    if (container.querySelectorAll('.patient-card').length > 1) {
        card.remove();
    } else {
        limparCardPaciente(card);
    }

    await atualizarPainelCentral();
    await salvarDadosDoDia(dataSelecionadaStr);
}

async function registrarObitoPaciente(botaoObito) {
    if (verificarBloqueioPlantao()) return;

    const confirmado = await mostrarConfirmacaoCustomizada('ATENÇÃO: Confirmar registro de ÓBITO do paciente e liberação do leito?', 'REGISTRO DE ÓBITO');
    if (!confirmado) return;

    const card = botaoObito.closest('.patient-card');
    const container = card.parentElement;

    acumularIndicadoresDoCard(card);
    contadoresSaidas.obito++;
    await salvarContadoresMensais();

    if (container.querySelectorAll('.patient-card').length > 1) {
        card.remove();
    } else {
        limparCardPaciente(card);
    }

    await atualizarPainelCentral();
    await salvarDadosDoDia(dataSelecionadaStr);
}

function abrirModalTransfExterna(botao) {
    if (verificarBloqueioPlantao()) return;

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
            await salvarContadoresMensais();
        }

        if (container.querySelectorAll('.patient-card').length > 1) {
            cardAtualTransf.remove();
        } else {
            limparCardPaciente(cardAtualTransf);
        }
    }
    fecharModalTransf();
    await atualizarPainelCentral();
    await salvarDadosDoDia(dataSelecionadaStr);
}

// FUNÇÃO ÚTIL PARA ZERAR/RESETAR AS SAÍDAS E INDICADORES DO MÊS ATUAL SE NECESSÁRIO
async function zerarEstatisticasMesAtual() {
    const confirmado = await mostrarConfirmacaoCustomizada("Deseja zerar os contadores de saídas e indicadores acumulados deste mês?", "ZERAR ESTATÍSTICAS");
    if (!confirmado) return;

    Object.keys(contadoresSaidas).forEach(k => { contadoresSaidas[k] = 0; });
    Object.keys(indicadoresMensais).forEach(k => { indicadoresMensais[k] = 0; });

    await salvarContadoresMensais();
    await atualizarPainelCentral();
    alert("Estatísticas do mês zeradas com sucesso!");
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

// --- BUSCA HISTÓRICO MENSAL DO GRÁFICO ---
async function carregarHistoricoMesGrafico(mesAnoStr) {
    historicoOcupacaoDiaria.fill(0);

    const { data, error } = await _supabase
        .from('plantoes')
        .select('data_chave, dados_json')
        .eq('mes_ano', mesAnoStr);

    if (!error && data) {
        data.forEach(plantao => {
            if (!plantao.data_chave.startsWith('STATS-')) {
                const dia = parseInt(plantao.data_chave.split('-')[2], 10);
                if (dia >= 1 && dia <= 31) {
                    let contagem = 0;
                    if (plantao.dados_json && Array.isArray(plantao.dados_json)) {
                        contagem = plantao.dados_json.length;
                    }
                    historicoOcupacaoDiaria[dia - 1] = contagem;
                }
            }
        });
    }
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

    const diaAtual = parseInt(dataSelecionadaStr.split('-')[2], 10);
    if (diaAtual >= 1 && diaAtual <= 31) {
        historicoOcupacaoDiaria[diaAtual - 1] = totalInternadosHoje;
    }

    meuGraficoOcupacao.data.datasets[0].data = historicoOcupacaoDiaria;
    meuGraficoOcupacao.update();

    const totalMes = historicoOcupacaoDiaria.reduce((acc, curr) => acc + curr, 0);
    const elTotalMes = document.getElementById('total-acumulado-mes');
    if (elTotalMes) elTotalMes.textContent = totalMes;
}

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
async function atualizarPainelCentral() {
    let totalPacientes = 0;
    let totalSepseAtivaNoDia = 0;

    let cntEstavelAtivo = 0;
    let cntBaixoAtivo = 0;
    let cntMedioAtivo = 0;
    let cntAltoAtivo = 0;

    const listaProtocolosAtivosMap = new Map();
    const agoraRelogio = new Date();

    // 1. Processa os dados visíveis do dia selecionado
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
            let dataHoraAberturaStr = null;

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
                        if (!dataHoraAberturaStr) {
                            dataHoraAberturaStr = `${dataSelecionadaStr}T${horaTabela}:00`;
                        }
                    }
                }

                if (!isento && !isNaN(newsVal) && inputNews.value.trim() !== "") {
                    if (newsVal <= 1) cntEstavelAtivo++;
                    else if (newsVal === 2) cntBaixoAtivo++;
                    else if (newsVal >= 3 && newsVal <= 4) cntMedioAtivo++;
                    else if (newsVal >= 5) cntAltoAtivo++;
                }
            });

            if (cardTemSepse) {
                totalSepseAtivaNoDia++; 

                if (cardTemProtocoloAberto && dataHoraAberturaStr) {
                    const dataAberturaObj = new Date(dataHoraAberturaStr);
                    const vencimentoObj = new Date(dataAberturaObj.getTime() + (24 * 60 * 60 * 1000));
                    const diffMs = vencimentoObj - agoraRelogio;
                    
                    if (diffMs > 0) {
                        const horasRestantes = Math.floor(diffMs / (1000 * 60 * 60));
                        const minutosRestantes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                        let tempoRestanteFormatado = `${horasRestantes}h ${minutosRestantes}m restantes`;
                        let corVigencia = horasRestantes <= 6 ? "#d97706" : "#dc3545";

                        listaProtocolosAtivosMap.set(nome.toUpperCase(), {
                            nome: nome,
                            setor: idSetor,
                            dataHora: `${dataHoraAberturaStr.split('T')[0].split('-').reverse().join('/')} às ${dataHoraAberturaStr.split('T')[1].substring(0, 5)}`,
                            vigenciaTexto: tempoRestanteFormatado,
                            corBgVigencia: corVigencia
                        });
                    }
                }
            }
        }
    });

    // 2. Varredura automática no Supabase restrita à janela de vigência de 24 horas
    const mesAnoChave = dataSelecionadaStr.substring(0, 7);
    const { data: todosPlantoesMes } = await _supabase
        .from('plantoes')
        .select('data_chave, dados_json')
        .eq('mes_ano', mesAnoChave);

    if (todosPlantoesMes) {
        todosPlantoesMes.forEach(plantao => {
            if (!plantao.data_chave.startsWith('STATS-') && Array.isArray(plantao.dados_json)) {
                const dataPlantaoStr = plantao.data_chave;
                
                plantao.dados_json.forEach(p => {
                    const nome = p.nome || "";
                    if (nome.trim() !== "") {
                        if (p.vitais && Array.isArray(p.vitais)) {
                            p.vitais.forEach(v => {
                                const horaV = v.hora || "08:00";
                                const inputs = v.inputs || [];
                                const isSimProtocolo = inputs.includes("Sim");

                                if (isSimProtocolo) {
                                    const dataHoraAberturaStr = `${dataPlantaoStr}T${horaV}:00`;
                                    const dataAberturaObj = new Date(dataHoraAberturaStr);
                                    const vencimentoObj = new Date(dataAberturaObj.getTime() + (24 * 60 * 60 * 1000));
                                    const diffMs = vencimentoObj - agoraRelogio;

                                    if (diffMs > 0) {
                                        const horasRestantes = Math.floor(diffMs / (1000 * 60 * 60));
                                        const minutosRestantes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                        let tempoRestanteFormatado = `${horasRestantes}h ${minutosRestantes}m restantes`;
                                        let corVigencia = horasRestantes <= 6 ? "#d97706" : "#dc3545";

                                        if (!listaProtocolosAtivosMap.has(nome.toUpperCase())) {
                                            listaProtocolosAtivosMap.set(nome.toUpperCase(), {
                                                nome: nome,
                                                setor: p.setor ? p.setor.toUpperCase() : "LEITO",
                                                dataHora: `${dataPlantaoStr.split('-').reverse().join('/')} às ${horaV}`,
                                                vigenciaTexto: tempoRestanteFormatado,
                                                corBgVigencia: corVigencia
                                            });
                                        }
                                    }
                                }
                            });
                        }
                    }
                });
            }
        });
    }

    const listaProtocolosAtivos = Array.from(listaProtocolosAtivosMap.values());

    const containerProtocolos = document.getElementById('container-protocolos-ativos');
    if (containerProtocolos) {
        const headerBoxProtocolos = containerProtocolos.previousElementSibling;
        if (headerBoxProtocolos && headerBoxProtocolos.tagName === 'H3') {
            headerBoxProtocolos.textContent = "PROTOCOLOS ATIVOS DE SEPSE (VIGÊNCIA 24H)";
        }

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
                        <span style="background: ${p.corBgVigencia}; color: #fff; padding: 4px 10px; border-radius: 12px; font-size: 0.72rem; font-weight: bold; display: inline-block; text-align: center;">
                            ${p.vigenciaTexto}
                        </span>
                    </div>
                </div>
            `).join('');
        }
    }

    const elDashPacientes = document.getElementById('dash-pacientes');
    if (elDashPacientes) elDashPacientes.textContent = totalPacientes;
    
    const elDashSepse = document.getElementById('dash-sepse');
    if (elDashSepse) elDashSepse.textContent = indicadoresMensais.sepse + totalSepseAtivaNoDia;
    
    const elDashEstavel = document.getElementById('dash-estavel');
    if (elDashEstavel) elDashEstavel.textContent = indicadoresMensais.estavel + cntEstavelAtivo;
    
    const elDashBaixo = document.getElementById('dash-baixo');
    if (elDashBaixo) elDashBaixo.textContent = indicadoresMensais.baixo + cntBaixoAtivo;
    
    const elDashMedio = document.getElementById('dash-medio');
    if (elDashMedio) elDashMedio.textContent = indicadoresMensais.medio + cntMedioAtivo;
    
    const elDashAlto = document.getElementById('dash-alto');
    if (elDashAlto) elDashAlto.textContent = indicadoresMensais.alto + cntAltoAtivo;

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

function abrirModalRelatorioGerencial() {
    const modal = document.getElementById('modal-relatorio-gerencial');
    const conteudoBox = document.getElementById('conteudo-relatorio-gerencial');
    if (!modal || !conteudoBox) return;

    let totalAtivos = 0;
    document.querySelectorAll('.patient-card').forEach(card => {
        const nome = card.querySelector('.nome-input')?.value.trim();
        if (nome) totalAtivos++;
    });

    const partesData = dataSelecionadaStr.split('-');
    const ano = partesData[0];
    const mesNum = partesData[1];
    
    const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const nomeMes = nomesMeses[parseInt(mesNum, 10) - 1] || mesNum;
    
    let textoRelatorio = `Relatório Mensal (${nomeMes}/${ano})\n`;
    textoRelatorio += `--------------------------------------------------\n`;
    textoRelatorio += `• Pacientes com protocolos ativos no Plantão: ${totalAtivos}\n`;
    textoRelatorio += `• Total de Alertas de Sepse: ${indicadoresMensais.sepse}\n`;
    textoRelatorio += `--------------------------------------------------\n`;
    textoRelatorio += `Total de escores News:\n`;
    textoRelatorio += `- Estável: ${indicadoresMensais.estavel}\n`;
    textoResidual = `- Baixo Risco: ${indicadoresMensais.baixo}\n`;
    textoRelatorio += `- Médio Risco: ${indicadoresMensais.medio}\n`;
    textoRelatorio += `- Alto Risco: ${indicadoresMensais.alto}\n`;
    textoRelatorio += `--------------------------------------------------\n`;
    textoRelatorio += `Transferencias, altas e obítos:\n`;
    textoRelatorio += `- Alta Hospitalار: ${contadoresSaidas.alta}\n`;
    textoRelatorio += `- HC UFU: ${contadoresSaidas["HC UFU"]}\n`;
    textoRelatorio += `- Hospital Municipal: ${contadoresSaidas["Hospital Municipal"]}\n`;
    textoRelatorio += `- CIP: ${contadoresSaidas["CIP"]}\n`;
    textoRelatorio += `- CAPS: ${contadoresSaidas["CAPS"]}\n`;
    textoRelatorio += `- UCCI: ${contadoresSaidas["UCCI"]}\n`;
    textoRelatorio += `- Óbito: ${contadoresSaidas.obito}\n`;

    conteudoBox.textContent = textoRelatorio;
    modal.style.display = 'flex';
}

function fecharModalRelatorioGerencial() {
    const modal = document.getElementById('modal-relatorio-gerencial');
    if (modal) modal.style.display = 'none';
}

function imprimirRelatorioGerencial() {
    const conteudo = document.getElementById('conteudo-relatorio-gerencial').textContent;
    const janelaImpressao = window.open('', '_blank');
    if (janelaImpressao) {
        janelaImpressao.document.write(`<html><head><title>Relatório Mensal</title></head><body style="font-family: monospace; white-space: pre-line; padding: 20px;">${conteudo}</body></html>`);
        janelaImpressao.document.close();
        janelaImpressao.focus();
        setTimeout(() => {
            janelaImpressao.print();
            janelaImpressao.close();
        }, 250);
    }
}

function copiarResumoGerencial() {
    const conteudo = document.getElementById('conteudo-relatorio-gerencial').textContent;
    navigator.clipboard.writeText(conteudo).then(() => {
        alert("Resumo copiado com sucesso para a área de transferência!");
    }).catch(err => {
        console.error("Erro ao copiar:", err);
        alert("Não foi possível copiar automaticamente.");
    });
}
