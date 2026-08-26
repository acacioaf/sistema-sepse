// --- CONFIGURAÇÃO DO SUPABASE ---
const SUPABASE_URL = 'https://fwaheunpekyvwyysqncz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_er3si1epfRHUz8SQP26B1A__aFx0cTy';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- VARIÁVEIS DE CONTROLE DE RELATÓRIO ---
let linhaAtualParaRelatorio = null;

// --- FUNÇÕES DE GERAÇÃO DE HTML DOS LEITOS ---
function gerarTabelaAdulto() {
    return `
    <div class="patients-container">
        <div class="patient-card">
            <div class="patient-header">
                <div class="patient-col-left">
                    <div class="input-group name-group"><label>NOME:</label><input type="text" class="nome-input" placeholder="Nome do Paciente"></div>
                    <div class="input-group" style="margin-top: 4px; padding-left: 45px;">
                        <label style="font-size: 0.72rem; cursor: pointer; display: flex; align-items: center; gap: 4px; color: var(--azul-escuro); font-weight: 600;">
                            <input type="checkbox" class="isento-relatorio" style="cursor: pointer;"> Isento de Escore
                        </label>
                    </div>
                </div>
                <div class="input-group"><label>DATA NASC:</label><input type="date" class="dtnasc-input"></div>
                <div class="input-group"><label>Prontuário:</label><input type="text" class="prontuario-input"></div>
                <div class="input-group"><label>TEC RESP:</label><input type="text" class="tec-input" placeholder="Nome"></div>
                <div class="action-buttons">
                    <button class="btn-transf-interna" onclick="abrirModalTransfInterna(this)">Transf. Interna</button>
                    <button class="btn-transf-externa" onclick="abrirModalTransfExterna(this)">Transf. Externa</button>
                    <button class="btn-alta" onclick="darAltaPaciente(this)">Alta Hospitalar</button>
                    <button class="btn-obito" onclick="registrarObitoPaciente(this)">Óbito</button>
                    <button class="btn-excluir-card" onclick="removerCardPaciente(this)" title="Excluir leito criado por engano">✖</button>
                </div>
            </div>
            <div class="table-responsive">
                <table class="vitals-table">
                    <thead>
                        <tr>
                            <th>Hora</th><th>PAS (mmHg)</th><th>TEMP (°C)</th><th>FR (irpm)</th><th>FC (bpm)</th><th>O₂ Supl</th><th>Sat %</th><th>NÍVEL CONSC.</th><th>GLICEMIA</th><th>DOR</th><th class="bg-red">NEWS TOTAL</th><th class="bg-red">STATUS</th><th class="bg-red">ABERTO PROTOCOLO?</th><th>AÇÃO</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${['08:00','12:00','16:00','20:00','00:00','04:00'].map(h => `
                            <tr data-hora="${h}">
                                <td class="time-col"><span class="lbl-hora">${h}</span></td>
                                <td><input type="number"></td>
                                <td><input type="number" step="0.1"></td>
                                <td><input type="number"></td>
                                <td><input type="number"></td>
                                <td><select><option selected></option><option>Sim</option><option>Não</option></select></td>
                                <td><input type="number"></td>
                                <td><select><option selected></option><option>Alerta</option><option>AGITADO/CONFUSO</option><option>VOZ, DOR OU NÃO REAGE</option></select></td>
                                <td><input type="number"></td>
                                <td>
                                    <select style="width: 100px;">
                                        <option value="" selected>-</option>
                                        <option value="0">0 - Ausente</option>
                                        <option value="1">1 a 4 - Leve</option>
                                        <option value="4">5 a 7 - Moderada</option>
                                        <option value="7">8 a 10 - Intensa</option>
                                    </select>
                                </td>
                                <td><input type="number" class="news-input" readonly></td>
                                <td class="status-cell"></td>
                                <td>
                                    <select class="protocolo-select">
                                        <option value="" selected></option>
                                        <option value="Sim">Sim</option>
                                        <option value="Não">Não</option>
                                    </select>
                                </td>
                                <td>
                                    <button type="button" onclick="gerarRelatorioLinha(this)" style="background: #17a2b8; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; cursor: pointer;" title="Gerar relatório deste horário">📋 Relatório</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="padding: 6px 4px; text-align: left;">
                    <button type="button" class="btn-add-horario-clean" onclick="adicionarHorarioExtraOrdenado(this)">➕ Adicionar Horário Extra</button>
                </div>
            </div>
        </div>
    </div>
    <div class="btn-add-wrapper">
        <button class="btn-add-global" onclick="adicionarPaciente(this)">Adicionar novo paciente <span class="btn-add-icon">⬇️</span></button>
    </div>`;
}

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
let meuGraficoOcupacaoAuditoria = null;
let setorAtivoAntesDaBusca = 'painel-central';

const dataAtualReal = new Date();
const dataHojeStr = formatarDataChave(dataAtualReal);
let dataSelecionadaStr = dataHojeStr;
let mesExibido = dataAtualReal.getMonth();
let anoExibido = dataAtualReal.getFullYear();

const historicoOcupacaoDiaria = Array(31).fill(0);

document.addEventListener("DOMContentLoaded", async () => {
    ['enf1', 'enf2', 'enf3', 'enf4', 'enf5', 'corredor', 'sala-emergencia'].forEach(id => {
        const setor = document.getElementById(id);
        if (setor && setor.innerHTML.trim() === "") {
            setor.innerHTML = gerarTabelaAdulto();
        }
    });

    const mainContent = document.querySelector(".content");

    mainContent.addEventListener("input", tratarMudancaVitais);
    mainContent.addEventListener("change", tratarMudancaVitais);

    injetarSeletorTipoRelatorio();
    criarModaisRelatorioDinamicos();

    await carregarContadoresMensais(dataSelecionadaStr);
    await carregarHistoricoMesGrafico(dataSelecionadaStr.substring(0, 7)); 

    inicializarGraficoOcupacaoAuditoria();
    renderizarCalendario();
    await carregarDadosDoDia(dataSelecionadaStr);

    if (typeof carregarDadosAuditoria === 'function') {
        carregarDadosAuditoria();
    }
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

    const ontemObj = new Date(agora);
    ontemObj.setDate(agora.getDate() - 1);
    const dataOntemRealStr = formatarDataChave(ontemObj);

    if (dataSelecionadaStr < dataOntemRealStr) {
        mostrarModalBloqueio("MODO SOMENTE LEITURA", `Você está visualizando uma data anterior (<strong>${dataSelecionadaStr.split('-').reverse().join('/')}</strong>).<br><br>Por motivos de segurança, não é permitida a edição de plantões passados.`);
        return true;
    }

    if (dataSelecionadaStr === dataOntemRealStr && horaAtual >= 7) {
        mostrarModalBloqueio("PLANTÃO JÁ ENCERRADO", `O novo plantão do dia atual já foi iniciado.<br><br>O dia anterior (<strong>${dataSelecionadaStr.split('-').reverse().join('/')}</strong>) agora está bloqueado para edições.`);
        return true;
    }

    return false;
}

function mostrarModalBloqueio(titulo, mensagem) {
    const modal = document.getElementById('modal-bloqueio-plantao');
    const textoBox = document.getElementById('mensagem-bloqueio-texto');
    const tituloBox = document.getElementById('titulo-modal-aviso');
    
    if (modal && textoBox) {
        if (tituloBox) tituloBox.textContent = titulo;
        textoBox.innerHTML = mensagem;
        modal.style.display = 'flex';
    }
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
        
        if (salvosSaidas) {
            Object.keys(contadoresSaidas).forEach(k => { 
                contadoresSaidas[k] = typeof salvosSaidas[k] === 'number' ? salvosSaidas[k] : 0; 
            });
        }
        if (salvosInd) {
            Object.keys(indicadoresMensais).forEach(k => { 
                indicadoresMensais[k] = typeof salvosInd[k] === 'number' ? salvosInd[k] : 0; 
            });
        }
    } else {
        const rawSaidas = localStorage.getItem(`saidas_${mesAnoChave}`);
        if (rawSaidas) {
            try {
                const salvos = JSON.parse(rawSaidas);
                Object.keys(contadoresSaidas).forEach(k => { 
                    contadoresSaidas[k] = typeof salvos[k] === 'number' ? salvos[k] : 0; 
                });
            } catch (e) {
                localStorage.removeItem(`saidas_${mesAnoChave}`);
            }
        }

        const rawInd = localStorage.getItem(`indicadores_${mesAnoChave}`);
        if (rawInd) {
            try {
                const salvosInd = JSON.parse(rawInd);
                Object.keys(indicadoresMensais).forEach(k => { 
                    indicadoresMensais[k] = typeof salvosInd[k] === 'number' ? salvosInd[k] : 0; 
                });
            } catch (e) {
                localStorage.removeItem(`indicadores_${mesAnoChave}`);
            }
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
            carregarDadosAuditoria();
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
            <td>
                <select style="width: 100px;">
                    <option value="" selected>-</option>
                    <option value="0">0 - Ausente</option>
                    <option value="1">1 a 4 - Leve</option>
                    <option value="4">5 a 7 - Moderada</option>
                    <option value="7">8 a 10 - Intensa</option>
                </select>
            </td>
            <td><input type="number" class="news-input" readonly></td>
            <td class="status-cell"></td>
            <td>
                <select class="protocolo-select">
                    <option value="" selected></option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                </select>
            </td>
            <td>
                <button type="button" onclick="gerarRelatorioLinha(this)" style="background: #17a2b8; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; cursor: pointer;" title="Gerar relatório deste horário">📋 Relatório</button>
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

    document.querySelectorAll('.tab-pane:not(#painel-central):not(#aba-auditoria-sepse)').forEach(aba => {
        const idSetor = aba.id;
        aba.querySelectorAll('.patient-card').forEach(card => {
            const nome = card.querySelector('.nome-input')?.value || "";
            const dtNasc = card.querySelector('.dtnasc-input')?.value || "";
            const prontuario = card.querySelector('.prontuario-input')?.value || "";
            const tec = card.querySelector('.tec-input')?.value || "";
            const isento = card.querySelector('.isento-relatorio')?.checked || false;
            const desfecho = card.getAttribute('data-desfecho') || "Internado";

            const vitais = [];
            card.querySelectorAll('.vitals-table tbody tr').forEach(tr => {
                const hora = tr.getAttribute('data-hora') || tr.querySelector('.time-col')?.textContent.trim() || "";
                const inputs = Array.from(tr.querySelectorAll('input, select')).map(i => i.value);
                const isExtra = tr.classList.contains('linha-horario-extra');
                vitais.push({ hora, inputs, isExtra });
            });

            if (nome.trim() !== "") {
                dadosGerais.push({ setor: idSetor, nome, dtNasc, prontuario, tec, isento, desfecho, vitais });
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

    document.querySelectorAll('.tab-pane:not(#painel-central):not(#aba-auditoria-sepse)').forEach(aba => {
        const container = aba.querySelector('.patients-container');
        if (!container) return;

        const cards = container.querySelectorAll('.patient-card');
        for (let i = 1; i < cards.length; i++) cards[i].remove();
        if (cards[0]) limparCardPaciente(cards[0]);
    });

    if (!data || !data.dados_json || error) {
        atualizarPainelCentral();
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
        if (p.desfecho) card.setAttribute('data-desfecho', p.desfecho);
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
                            <td>
                                <select style="width: 100px;">
                                    <option value="" selected>-</option>
                                    <option value="0">0 - Ausente</option>
                                    <option value="1">1 a 4 - Leve</option>
                                    <option value="4">5 a 7 - Moderada</option>
                                    <option value="7">8 a 10 - Intensa</option>
                                </select>
                            </td>
                            <td><input type="number" class="news-input" readonly></td>
                            <td class="status-cell"></td>
                            <td>
                                <select class="protocolo-select">
                                    <option value="" selected></option>
                                    <option value="Sim">Sim</option>
                                    <option value="Não">Não</option>
                                </select>
                            </td>
                            <td>
                                <button type="button" onclick="gerarRelatorioLinha(this)" style="background: #17a2b8; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; cursor: pointer;" title="Gerar relatório deste horário">📋 Relatório</button>
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

    atualizarPainelCentral();
}

async function iniciarNovoPlantao() {
    const agora = new Date();
    const horaAtual = agora.getHours();
    const minutoAtual = agora.getMinutes();

    if (horaAtual < 7 || horaAtual >= 12) {
        mostrarModalBloqueio("AÇÃO NÃO PERMITIDA", `Horário atual: <strong>${String(horaAtual).padStart(2, '0')}:${String(minutoAtual).padStart(2, '0')}h</strong>.<br><br>O novo plantão só pode ser iniciado entre as <strong>07:00h</strong> e as <strong>11:59h</strong> da manhã.`);
        return;
    }

    const confirmado = await mostrarConfirmacaoCustomizada("ATENÇÃO: Deseja iniciar o novo plantão das 07h? Isso manterá os pacientes internados nos leitos e migrará os dados cadastrais para o dia atual.", "INICIAR NOVO PLANTÃO");
    if (!confirmado) return;

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
            setor: p.setor,
            nome: p.nome || "",
            dtNasc: p.dtNasc || "",
            prontuario: p.prontuario || "",
            tec: p.tec || "",
            isento: p.isento || false,
            desfecho: p.desfecho || "Internado",
            vitais: p.vitais.map(v => ({
                hora: v.hora || "",
                isExtra: v.isExtra || false,
                inputs: v.inputs.map(() => "") 
            }))
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
    mostrarModalBloqueio("PLANTÃO INICIADO", `Novo Plantão das 07h iniciado com sucesso para o dia <strong>${agora.toLocaleDateString('pt-BR')}</strong>!<br><br>Os pacientes internados foram trazidos para os leitos da data atual.`);
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

// --- MODAIS DE RELATÓRIO PROFISSIONAL COM CLASSIFICAÇÃO DE RISCO ---
function criarModaisRelatorioDinamicos() {
    const modalAntigo = document.getElementById('modal-resultado-texto-gerado');
    if (modalAntigo) modalAntigo.remove();

    const modalResultado = document.createElement('div');
    modalResultado.id = 'modal-resultado-texto-gerado';
    modalResultado.style.cssText = "display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:10000; justify-content:center; align-items:center;";
    modalResultado.innerHTML = `
        <div style="background:#fff; padding:25px; border-radius:8px; width:540px; max-width:90%; box-shadow:0 4px 20px rgba(0,0,0,0.3); text-align:left;" onclick="event.stopPropagation()">
            <h3 style="margin-top:0; color:#003366; font-size:1.1rem;">📋 Texto do Relatório Gerado (Editável)</h3>
            <textarea id="textarea-texto-gerado" style="width:100%; height:150px; padding:10px; font-size:0.88rem; border:1px solid #ccc; border-radius:4px; resize:vertical; box-sizing:border-box; background:#fff; font-family: inherit; line-height: 1.4; outline: none;"></textarea>
            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:15px;">
                <button type="button" id="btn-copiar-rel-gerado" style="background:#28a745; color:#fff; border:none; padding:8px 14px; border-radius:4px; font-weight:bold; cursor:pointer;">📋 Copiar Texto</button>
                <button type="button" onclick="document.getElementById('modal-resultado-texto-gerado').style.display='none'" style="background:#64748b; color:#fff; border:none; padding:8px 14px; border-radius:4px; font-weight:bold; cursor:pointer;">Fechar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalResultado);

    document.getElementById('btn-copiar-rel-gerado').onclick = () => {
        const ta = document.getElementById('textarea-texto-gerado');
        if (ta) {
            navigator.clipboard.writeText(ta.value).then(() => {
                alert("✅ Texto copiado para a área de transferência!");
            });
        }
    };

    if (!document.getElementById('modal-escolha-relatorio')) {
        const modalEscolha = document.createElement('div');
        modalEscolha.id = 'modal-escolha-relatorio';
        modalEscolha.style.cssText = "display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:10000; justify-content:center; align-items:center;";
        modalEscolha.innerHTML = `
            <div style="background:#fff; padding:25px; border-radius:8px; width:400px; max-width:90%; box-shadow:0 4px 20px rgba(0,0,0,0.3); text-align:center;">
                <h3 style="margin-top:0; color:#003366; font-size:1.1rem;">📋 Escolha o Tipo de Relatório</h3>
                <p style="font-size:0.85rem; color:#64748b; margin-bottom:20px;">Selecione qual profissional está realizando o registro:</p>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <button type="button" onclick="gerarRelatorioProfissional('enfermeiro')" style="background:#0056b3; color:#fff; border:none; padding:10px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:0.9rem;">Relatório do Enfermeiro</button>
                    <button type="button" onclick="gerarRelatorioProfissional('medico')" style="background:#0f766e; color:#fff; border:none; padding:10px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:0.9rem;">Relatório do Médico</button>
                    <button type="button" onclick="fecharSeletorRelatorio()" style="background:#64748b; color:#fff; border:none; padding:8px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:0.85rem; margin-top:5px;">Cancelar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalEscolha);
    }
}

function gerarRelatorioLinha(botao) {
    linhaAtualParaRelatorio = botao.closest('tr');
    const modal = document.getElementById('modal-escolha-relatorio');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        criarModaisRelatorioDinamicos();
        document.getElementById('modal-escolha-relatorio').style.display = 'flex';
    }
}

function fecharSeletorRelatorio() {
    const modal = document.getElementById('modal-escolha-relatorio');
    if (modal) modal.style.display = 'none';
    linhaAtualParaRelatorio = null;
}

function gerarRelatorioProfissional(tipo) {
    if (!linhaAtualParaRelatorio) return;

    const linha = linhaAtualParaRelatorio;
    const card = linha.closest('.patient-card');
    
    const hora = linha.getAttribute('data-hora') || linha.querySelector('.time-col')?.textContent.trim() || "08:00";
    const nomeTecnico = card?.querySelector('.tec-input')?.value.trim() || "Técnico Responsável";

    const inputs = linha.querySelectorAll('input, select');
    const pas = inputs[0]?.value || "-";
    const temp = inputs[1]?.value || "-";
    const fr = inputs[2]?.value || "-";
    const fc = inputs[3]?.value || "-";
    const sat = inputs[5]?.value || "-";
    
    const selectDor = linha.querySelector('td:nth-child(10) select');
    const dor = selectDor && selectDor.selectedOptions[0] ? selectDor.selectedOptions[0].text : "Não avaliado";
    
    const newsVal = parseInt(linha.querySelector('.news-input')?.value) || 0;

    let classificacaoRisco = "Estável";
    if (newsVal === 0) {
        classificacaoRisco = "Estável";
    } else if (newsVal >= 1 && newsVal <= 2) {
        classificacaoRisco = "Baixo Risco";
    } else if (newsVal >= 3 && newsVal <= 4) {
        classificacaoRisco = "Médio Risco";
    } else if (newsVal >= 5) {
        classificacaoRisco = "Alto Risco";
    }

    let textoRelatorio = "";

    if (tipo === 'enfermeiro') {
        const sinaisVitais = `PA: ${pas} mmHg, Temp: ${temp} °C, FC: ${fc} bpm, FR: ${fr} irpm, SatO₂: ${sat}%`;
        textoRelatorio = `Em tempo, às ${hora} horas, sou comunicado pelo(a) técnico(a) ${nomeTecnico} apresentando os seguintes sinais vitais: ${sinaisVitais}; NEWS: ${newsVal} (${classificacaoRisco}); Escala de dor: ${dor}. Orientada a equipe a manter vigilância conforme protocolo da unidade e comunicado valor ao médico Dr. [Digite o Nome do Médico].`;
    } else if (tipo === 'medico') {
        const sinaisVitais = `PA: ${pas} mmHg, Temp: ${temp} °C, FC: ${fc} bpm, FR: ${fr} irpm, SatO₂: ${sat}%, NEWS: ${newsVal} (${classificacaoRisco}), Dor: ${dor}`;
        textoRelatorio = `Em tempo, às ${hora} horas, sou comunicado(a) pela equipe de enfermagem acerca dos valores de sinais vitais (${sinaisVitais}). Orientada a equipe a manter as condutas conforme protocolo da unidade.`;
    }

    fecharSeletorRelatorio();
    
    const modalTexto = document.getElementById('modal-resultado-texto-gerado');
    const textarea = document.getElementById('textarea-texto-gerado');
    if (textarea) textarea.value = textoRelatorio;
    if (modalTexto) modalTexto.style.display = 'flex';
}
function mudarSetor(idSetor) {
    const campoBusca = document.getElementById('filtro-global');
    if (!campoBusca || campoBusca.value.trim() === "") {
        setorAtivoAntesDaBusca = idSetor;
    }

    if (campoBusca) campoBusca.value = "";

    document.querySelectorAll('.tab-pane').forEach(aba => {
        aba.classList.remove('active');
        aba.style.setProperty('display', 'none', 'important');
    });

    document.querySelectorAll('.btn-topo-aba').forEach(btn => btn.classList.remove('btn-topo-ativo'));
    document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));

    const abaAlvo = document.getElementById(idSetor);
    if (abaAlvo) {
        abaAlvo.classList.add('active');
        abaAlvo.style.setProperty('display', 'block', 'important');
    }

    if (idSetor === 'aba-auditoria-sepse' || idSetor === 'aba-dimensionamento') {
        document.querySelectorAll('.btn-topo-aba').forEach(btn => {
            const onclickAttr = btn.getAttribute('onclick');
            if (onclickAttr && onclickAttr.includes(idSetor)) {
                btn.classList.add('btn-topo-ativo');
            }
        });
    }

    if (idSetor !== 'painel-central' && idSetor !== 'aba-auditoria-sepse' && idSetor !== 'aba-dimensionamento') {
        let barraGlobal = document.querySelector('.barra-filtro-global');
        if (!barraGlobal) {
            barraGlobal = document.querySelector('#painel-central .barra-filtro-global');
        }
        if (barraGlobal && abaAlvo) {
            abaAlvo.insertBefore(barraGlobal, abaAlvo.firstChild);
        }
    } else if (idSetor === 'painel-central') {
        const painelCentral = document.getElementById('painel-central');
        const barraGlobal = document.querySelector('.barra-filtro-global');
        if (painelCentral && barraGlobal) {
            painelCentral.appendChild(barraGlobal);
        }
    }

    document.querySelectorAll('.sidebar li').forEach(li => {
        const onclickAttr = li.getAttribute('onclick');
        if (onclickAttr && onclickAttr.includes(idSetor)) {
            li.classList.add('active');
        }
    });

    if (idSetor === 'aba-auditoria-sepse') {
        if (typeof carregarDadosAuditoria === 'function') {
            carregarDadosAuditoria();
        }
    }
}

function executarBuscaGlobal() {
    const tipoFiltro = document.getElementById('tipo-busca').value;
    const termoFiltro = document.getElementById('filtro-global').value.toLowerCase().trim();

    const todasAsAbasEnfermaria = document.querySelectorAll('.tab-pane:not(#painel-central):not(#aba-auditoria-sepse)');
    const todosOsCards = document.querySelectorAll('.patient-card');

    if (termoFiltro === "") {
        todosOsCards.forEach(card => card.style.display = 'block');
        mudarSetor(setorAtivoAntesDaBusca);
        return;
    }

    todasAsAbasEnfermaria.forEach(aba => {
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
    atualizarPainelCentral();
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
            atualizarPainelCentral();
            await salvarDadosDoDia(dataSelecionadaStr);
        }
    } else {
        const confirmado = await mostrarConfirmacaoCustomizada('Este é o único leito do setor. Deseja apenas limpar os dados dele?', 'LIMPAR LEITO');
        if (confirmado) {
            limparCardPaciente(card);
            atualizarPainelCentral();
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
    card.setAttribute('data-desfecho', 'Alta');
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

async function registrarObitoPaciente(botaoObito) {
    if (verificarBloqueioPlantao()) return;

    const confirmado = await mostrarConfirmacaoCustomizada('ATENÇÃO: Confirmar registro de ÓBITO do paciente e liberação do leito?', 'REGISTRO DE ÓBITO');
    if (!confirmado) return;

    const card = botaoObito.closest('.patient-card');
    card.setAttribute('data-desfecho', 'Óbito');
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
        cardAtualTransf.setAttribute('data-desfecho', destinoFinal || 'Transferido');
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
    card.removeAttribute('data-desfecho');
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

// --- GRÁFICO DE OCUPAÇÃO DIÁRIA (APENAS NA AUDITORIA) ---
function inicializarGraficoOcupacaoAuditoria() {
    const ctx = document.getElementById('graficoOcupacaoAuditoria');
    if (!ctx) return;

    meuGraficoOcupacaoAuditoria = new Chart(ctx, {
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
    const diaAtual = parseInt(dataSelecionadaStr.split('-')[2], 10);
    if (diaAtual >= 1 && diaAtual <= 31) {
        historicoOcupacaoDiaria[diaAtual - 1] = totalInternadosHoje;
    }

    if (meuGraficoOcupacaoAuditoria) {
        meuGraficoOcupacaoAuditoria.data.datasets[0].data = historicoOcupacaoDiaria;
        meuGraficoOcupacaoAuditoria.update();
    }

    const totalMes = historicoOcupacaoDiaria.reduce((acc, curr) => acc + curr, 0);

    const elTotalMesAudit = document.getElementById('total-acumulado-mes-auditoria');
    if (elTotalMesAudit) elTotalMesAudit.textContent = totalMes;
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

    document.querySelectorAll('.tab-pane:not(#aba-auditoria-sepse) .patient-card').forEach(card => {
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

    document.getElementById('dash-pacientes').textContent = totalPacientes;
    document.getElementById('dash-sepse').textContent = totalSepseAtivaNoDia;
    document.getElementById('dash-estavel').textContent = cntEstavelAtivo;
    document.getElementById('dash-baixo').textContent = cntBaixoAtivo;
    document.getElementById('dash-medio').textContent = cntMedioAtivo;
    document.getElementById('dash-alto').textContent = cntAltoAtivo;

    atualizarDadosGrafico(totalPacientes);
    atualizarContadoresMenuLateral();
}

// --- RELATÓRIO DIÁRIO E MENSAL ---
function injetarSeletorTipoRelatorio() {
    const modalBox = document.querySelector('#modal-relatorio-gerencial > div');
    if (!modalBox || document.getElementById('select-tipo-relatorio')) return;

    const headerBox = modalBox.querySelector('div');
    if (headerBox) {
        const wrapperSelect = document.createElement('div');
        wrapperSelect.style.cssText = "margin: 10px 0; display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.85rem; color: #003366;";
        wrapperSelect.innerHTML = `
            <label for="select-tipo-relatorio">Tipo de Relatório:</label>
            <select id="select-tipo-relatorio" onchange="atualizarTextoRelatorioGerencial()" style="padding: 4px 8px; border-radius: 4px; border: 1px solid #ccc; font-weight: normal;">
                <option value="diario" selected>Diário (Data Selecionada)</option>
                <option value="mensal">Mensal (Consolidado do Mês)</option>
            </select>
        `;
        headerBox.insertAdjacentElement('afterend', wrapperSelect);
    }
}

async function abrirModalRelatorioGerencial() {
    const modal = document.getElementById('modal-relatorio-gerencial');
    if (!modal) return;
    
    const selectTipo = document.getElementById('select-tipo-relatorio');
    if (selectTipo) {
        selectTipo.value = "diario";
    }

    modal.style.display = 'flex';
    atualizarTextoRelatorioGerencial();
}

async function atualizarTextoRelatorioGerencial() {
    const conteudoBox = document.getElementById('conteudo-relatorio-gerencial');
    const selectTipo = document.getElementById('select-tipo-relatorio');
    if (!conteudoBox) return;

    const tipo = selectTipo ? selectTipo.value : "diario";
    const partesData = dataSelecionadaStr.split('-');
    const ano = partesData[0];
    const mesNum = partesData[1];
    const diaNum = partesData[2];
    
    const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const nomeMes = nomesMeses[parseInt(mesNum, 10) - 1] || mesNum;

    if (tipo === 'diario') {
        let totalAtivosDia = 0;
        let alertasSepseDia = 0;
        let estavelDia = 0, baixoDia = 0, medioDia = 0, altoDia = 0;
        
        let saidasDiarias = {
            alta: 0,
            "HC UFU": 0,
            "Hospital Municipal": 0,
            "CIP": 0,
            "CAPS": 0,
            "UCCI": 0,
            obito: 0,
            outros: 0
        };

        document.querySelectorAll('.patient-card').forEach(card => {
            const nome = card.querySelector('.nome-input')?.value.trim();
            const isento = card.querySelector('.isento-relatorio')?.checked;
            if (nome) {
                totalAtivosDia++;
                card.querySelectorAll('.vitals-table tbody tr').forEach(tr => {
                    const inputNews = tr.querySelector('.news-input');
                    const newsVal = inputNews ? parseInt(inputNews.value) : NaN;
                    const htmlStatus = tr.querySelector('.status-cell')?.innerHTML || "";

                    if (!isento && !isNaN(newsVal) && inputNews.value.trim() !== "") {
                        if (newsVal <= 1) estavelDia++;
                        else if (newsVal === 2) baixoDia++;
                        else if (newsVal >= 3 && newsVal <= 4) medioDia++;
                        else if (newsVal >= 5) altoDia++;
                    }

                    if (htmlStatus.includes('ALTO RISCO') || htmlStatus.includes('Time de Resposta Rápida') || htmlStatus.includes('ALERTA SEPSE')) {
                        alertasSepseDia++;
                    }
                });
            }
        });

        const { data: plantaoDia } = await _supabase
            .from('plantoes')
            .select('dados_json')
            .eq('data_chave', dataSelecionadaStr)
            .maybeSingle();

        if (plantaoDia && Array.isArray(plantaoDia.dados_json)) {
            plantaoDia.dados_json.forEach(p => {
                const desfecho = p.desfecho || "Internado";
                if (desfecho !== "Internado") {
                    if (desfecho === "Alta") saidasDiarias.alta++;
                    else if (desfecho === "Óbito") saidasDiarias.obito++;
                    else if (saidasDiarias.hasOwnProperty(desfecho)) saidasDiarias[desfecho]++;
                    else saidasDiarias.outros++;
                }
            });
        }

        let texto = `Relatório Diário (${diaNum}/${mesNum}/${ano})\n`;
        texto += `--------------------------------------------------\n`;
        texto += `• Pacientes Ativos no Plantão: ${totalAtivosDia}\n`;
        texto += `• Alertas de Sepse no Dia: ${alertasSepseDia}\n`;
        texto += `--------------------------------------------------\n`;
        texto += `Escores NEWS / PEWS do Dia:\n`;
        texto += `- Estável: ${estavelDia}\n`;
        texto += `- Baixo Risco: ${baixoDia}\n`;
        texto += `- Médio Risco: ${medioDia}\n`;
        texto += `- Alto Risco: ${altoDia}\n`;
        texto += `--------------------------------------------------\n`;
        texto += `Saídas e Transferências do Dia:\n`;
        texto += `- Alta Hospitalar: ${saidasDiarias.alta}\n`;
        texto += `- HC UFU: ${saidasDiarias["HC UFU"]}\n`;
        texto += `- Hospital Municipal: ${saidasDiarias["Hospital Municipal"]}\n`;
        texto += `- CIP: ${saidasDiarias["CIP"]}\n`;
        texto += `- CAPS: ${saidasDiarias["CAPS"]}\n`;
        texto += `- UCCI: ${saidasDiarias["UCCI"]}\n`;
        texto += `- Óbito: ${saidasDiarias.obito}\n`;
        if (saidasDiarias.outros > 0) texto += `- Outros/Transferidos: ${saidasDiarias.outros}\n`;

        conteudoBox.textContent = texto;

    } else {
        let textoRelatorio = `Relatório Mensal (${nomeMes}/${ano})\n`;
        textoRelatorio += `--------------------------------------------------\n`;
        textoRelatorio += `• Total de Alertas de Sepse acumulados: ${indicadoresMensais.sepse}\n`;
        textoRelatorio += `--------------------------------------------------\n`;
        textoRelatorio += `Total de escores acumulados no mês:\n`;
        textoRelatorio += `- Estável: ${indicadoresMensais.estavel}\n`;
        textoRelatorio += `- Baixo Risco: ${indicadoresMensais.baixo}\n`;
        textoRelatorio += `- Médio Risco: ${indicadoresMensais.medio}\n`;
        textoRelatorio += `- Alto Risco: ${indicadoresMensais.alto}\n`;
        textoRelatorio += `--------------------------------------------------\n`;
        textoRelatorio += `Saídas e Destinos no Mês:\n`;
        textoRelatorio += `- Alta Hospitalar: ${contadoresSaidas.alta}\n`;
        textoRelatorio += `- HC UFU: ${contadoresSaidas["HC UFU"]}\n`;
        textoRelatorio += `- Hospital Municipal: ${contadoresSaidas["Hospital Municipal"]}\n`;
        textoRelatorio += `- CIP: ${contadoresSaidas["CIP"]}\n`;
        textoRelatorio += `- CAPS: ${contadoresSaidas["CAPS"]}\n`;
        textoRelatorio += `- UCCI: ${contadoresSaidas["UCCI"]}\n`;
        textoRelatorio += `- Óbito: ${contadoresSaidas.obito}\n`;

        conteudoBox.textContent = textoRelatorio;
    }
}

function fecharModalRelatorioGerencial() {
    const modal = document.getElementById('modal-relatorio-gerencial');
    if (modal) modal.style.display = 'none';
}

function copiarResumoGerencial() {
    const conteudoBox = document.getElementById('conteudo-relatorio-gerencial');
    if (!conteudoBox) return;
    
    navigator.clipboard.writeText(conteudoBox.textContent).then(() => {
        alert("Resumo copiado para a área de transferência!");
    }).catch(err => {
        console.error("Erro ao copiar: ", err);
    });
}

function imprimirRelatorioGerencial() {
    const conteudoBox = document.getElementById('conteudo-relatorio-gerencial');
    if (!conteudoBox) return;

    const janelaImpressao = window.open('', '', 'height=600,width=800');
    janelaImpressao.document.write('<html><head><title>Relatório</title></head><body style="font-family: monospace; white-space: pre-wrap; padding: 20px;">');
    janelaImpressao.document.write(conteudoBox.textContent);
    janelaImpressao.document.write('</body></html>');
    janelaImpressao.document.close();
    janelaImpressao.focus();
    janelaImpressao.print();
}

// --- FUNÇÕES AUTOMATIZADAS DA ABA DE AUDITORIA E CONSOLIDADOS MENSAIS ---

async function carregarDadosAuditoria() {
    const tbody = document.getElementById('corpo-tabela-auditoria');
    if (!tbody) return;

    const elMesEstavel = document.getElementById('mes-estavel');
    const elMesBaixo = document.getElementById('mes-baixo');
    const elMesMedio = document.getElementById('mes-medio');
    const elMesAlto = document.getElementById('mes-alto');

    if (elMesEstavel) elMesEstavel.textContent = indicadoresMensais.estavel;
    if (elMesBaixo) elMesBaixo.textContent = indicadoresMensais.baixo;
    if (elMesMedio) elMesMedio.textContent = indicadoresMensais.medio;
    if (elMesAlto) elMesAlto.textContent = indicadoresMensais.alto;

    const elMesAlta = document.getElementById('mes-saida-alta');
    const elMesHcUfu = document.getElementById('mes-saida-hc-ufu');
    const elMesHospMunic = document.getElementById('mes-saida-hospital-municipal');
    const elMesCip = document.getElementById('mes-saida-cip');
    const elMesCaps = document.getElementById('mes-saida-caps');
    const elMesUcci = document.getElementById('mes-saida-ucci');
    const elMesObito = document.getElementById('mes-saida-obito');

    if (elMesAlta) elMesAlta.textContent = contadoresSaidas.alta;
    if (elMesHcUfu) elMesHcUfu.textContent = contadoresSaidas["HC UFU"];
    if (elMesHospMunic) elMesHospMunic.textContent = contadoresSaidas["Hospital Municipal"];
    if (elMesCip) elMesCip.textContent = contadoresSaidas["CIP"];
    if (elMesCaps) elMesCaps.textContent = contadoresSaidas["CAPS"];
    if (elMesUcci) elMesUcci.textContent = contadoresSaidas["UCCI"];
    if (elMesObito) elMesObito.textContent = contadoresSaidas.obito;

    const mesAnoChave = dataSelecionadaStr.substring(0, 7);
    const { data: plantoesMes, error } = await _supabase
        .from('plantoes')
        .select('data_chave, dados_json')
        .eq('mes_ano', mesAnoChave);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #dc3545;">Erro ao carregar dados do servidor.</td></tr>`;
        return;
    }

    window.dadosAuditoriaGlobal = [];

    if (plantoesMes) {
        plantoesMes.forEach(plantao => {
            if (plantao.data_chave.startsWith('STATS-')) return;
            const dataPlantao = plantao.data_chave.split('-').reverse().join('/');
            const pacientes = plantao.dados_json;

            if (Array.isArray(pacientes)) {
                pacientes.forEach(p => {
                    const nome = p.nome ? p.nome.trim() : "";
                    if (nome === "") return;

                    let temAlertaSepse = "Não";
                    let maiorNews = 0;

                    if (Array.isArray(p.vitais)) {
                        p.vitais.forEach(v => {
                            const inputs = v.inputs || [];
                            const pas = parseFloat(inputs[1]) || 0;
                            const temp = parseFloat(String(inputs[2] || '').replace(',', '.')) || 0;
                            const fr = parseFloat(inputs[3]) || 0;
                            const fc = parseFloat(inputs[4]) || 0;
                            const o2 = (inputs[5] || "").toUpperCase();
                            const sat = parseFloat(inputs[6]) || 0;
                            const consc = (inputs[7] || "").toUpperCase();
                            const protocoloManual = (inputs[10] || "").toUpperCase();

                            let sirsCount = 0;
                            if (fc > 90) sirsCount++;
                            if (fr > 20) sirsCount++;
                            if (temp > 38.3 || (temp > 0 && temp < 35)) sirsCount++;

                            const conscGrave = (consc === "VOZ, DOR OU NÃO REAGE");
                            const pasGrave = (pas > 0 && pas < 90);
                            const satGrave = (sat > 0 && ((sat < 90 && o2 !== "SIM") || (sat < 94 && o2 === "SIM")));

                            if (sirsCount >= 2 || conscGrave || pasGrave || satGrave || protocoloManual === "SIM") {
                                temAlertaSepse = "Sim";
                            }

                            const valNews = parseInt(inputs[inputs.length - 3]);
                            if (!isNaN(valNews) && valNews > maiorNews) {
                                maiorNews = valNews;
                            }
                        });
                    }

                    let desfecho = p.desfecho || "Internado";

                    window.dadosAuditoriaGlobal.push({
                        data: dataPlantao,
                        setor: p.setor ? p.setor.toUpperCase() : "GERAL",
                        nome: nome,
                        prontuario: p.prontuario || "---",
                        protocolo: temAlertaSepse,
                        desfecho: desfecho,
                        score: maiorNews,
                        detalhes: p
                    });
                });
            }
        });
    }

    const badgeTopo = document.querySelector('.badge-contador[data-setor="auditoria"]');
    if (badgeTopo) badgeTopo.textContent = window.dadosAuditoriaGlobal.length;

    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 25px; color: #64748b; font-style: italic;">Selecione uma opção no filtro acima ou digite um termo para exibir os registros.</td></tr>`;
}

function filtrarTabelaAuditoria() {
    const selectStatus = document.getElementById('filtro-auditoria-status');
    const inputTexto = document.getElementById('filtro-auditoria-texto');
    
    const statusFiltro = selectStatus ? selectStatus.value : '';
    const textoFiltro = inputTexto ? inputTexto.value.toLowerCase().trim() : '';

    const tbody = document.getElementById('corpo-tabela-auditoria');
    if (!tbody) return;

    if (!statusFiltro && textoFiltro === "") {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 25px; color: #64748b; font-style: italic;">Selecione uma opção no filtro acima ou digite um termo para exibir os registros.</td></tr>`;
        return;
    }

    if (!window.dadosAuditoriaGlobal) return;

    const filtrados = window.dadosAuditoriaGlobal.filter(item => {
        const matchTexto = item.nome.toLowerCase().includes(textoFiltro) || item.prontuario.toLowerCase().includes(textoFiltro);
        
        if (textoFiltro !== "" && !matchTexto) return false;

        if (statusFiltro === 'todos') return true;
        if (statusFiltro === 'sepse') return item.protocolo === 'Sim';
        if (statusFiltro === 'estavel') return item.score <= 1;
        if (statusFiltro === 'baixo') return item.score === 2;
        if (statusFiltro === 'medio') return item.score >= 3 && item.score <= 4;
        if (statusFiltro === 'alto') return item.score >= 5;
        
        if (statusFiltro === 'alta') return item.desfecho === 'Alta';
        if (statusFiltro === 'obito') return item.desfecho === 'Óbito';
        if (statusFiltro === 'transferido') return item.desfecho !== 'Internado' && item.desfecho !== 'Alta' && item.desfecho !== 'Óbito';

        return true;
    });

    renderizarTabelaAuditoria(filtrados);
}

function renderizarTabelaAuditoria(lista) {
    const tbody = document.getElementById('corpo-tabela-auditoria');
    if (!tbody) return;

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 25px; color: #64748b; font-style: italic;">Nenhum registro encontrado com esses critérios.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map((item, index) => {
        let badgeStyle = "background:#e2e8f0; color:#475569; border:1px solid #cbd5e1;";
        let textoDesfecho = item.desfecho;

        if (textoDesfecho === "Internado") {
            badgeStyle = "background:#d1ecf1; color:#0c5460; border:1px solid #bee5eb;";
        } else if (textoDesfecho === "Alta") {
            badgeStyle = "background:#e6ffe6; color:#28a745; border:1px solid #28a745;";
        } else if (textoDesfecho === "Óbito") {
            badgeStyle = "background:#ffe6e6; color:#dc3545; border:1px solid #dc3545;";
        } else {
            badgeStyle = "background:#fff3cd; color:#856404; border:1px solid #ffeeba;";
            textoDesfecho = `Transferido: ${textoDesfecho}`;
        }

        return `
            <tr>
                <td>${item.data}</td>
                <td>${item.setor}</td>
                <td>
                    <a href="#" style="color: #003366; font-weight: bold; text-decoration: underline;" onclick="event.preventDefault(); abrirDetalhesAuditoriaPaciente(window.dadosAuditoriaGlobal[${index}]);">
                        ${item.nome}
                    </a>
                </td>
                <td>${item.prontuario}</td>
                <td>${item.protocolo}</td>
                <td><span class="status-badge" style="${badgeStyle} padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; display: inline-block;">${textoDesfecho}</span></td>
            </tr>
        `;
    }).join('');
}

function abrirDetalhesAuditoriaPaciente(dadosPaciente) {
    let modalId = "modal-detalhes-paciente-audit";
    let modal = document.getElementById(modalId);

    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.style.cssText = "display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:10000; justify-content:center; align-items:center;";
        
        modal.innerHTML = `
            <div style="background:#fff; padding:25px; border-radius:8px; width:750px; max-width:95%; max-height:85vh; overflow-y:auto; box-shadow:0 4px 20px rgba(0,0,0,0.3); text-align:left;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:2px solid #e6f0fa; padding-bottom:10px;">
                    <h3 id="detalhe-titulo-paciente" style="margin:0; color:#003366; font-size:1.1rem;">📋 Histórico de Alterações do Paciente</h3>
                    <button onclick="document.getElementById('${modalId}').style.display='none'" style="background:none; border:none; font-size:1.2rem; font-weight:bold; cursor:pointer; color:#64748b;">✕</button>
                </div>
                <div id="detalhe-conteudo-paciente" style="font-size:0.9rem; color:#334155; line-height:1.5;">
                    <!-- Conteúdo injetado dinamicamente -->
                </div>
                <div style="text-align:right; margin-top:20px;">
                    <button onclick="document.getElementById('${modalId}').style.display='none'" style="background-color:#003366; color:#fff; padding:8px 16px; border-radius:4px; font-weight:600; cursor:pointer; border:none;">Fechar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const p = dadosPaciente.detalhes || dadosPaciente;
    let linhasTabelaHtml = "";

    if (p.vitais && Array.isArray(p.vitais)) {
        linhasTabelaHtml = p.vitais.map(v => {
            const h = v.hora || "";
            const ins = v.inputs || [];
            return `
                <tr>
                    <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${h}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${ins[0] || ""}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${ins[1] || ""}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${ins[2] || ""}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${ins[3] || ""}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${ins[4] || ""}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${ins[5] || ""}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${ins[6] || ""}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${ins[7] || ""}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${ins[8] || ""}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: bold;">${ins[9] || ""}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${ins[10] || ""}</td>
                </tr>
            `;
        }).join('');
    }

    let conteudoDiv = document.getElementById('detalhe-conteudo-paciente');
    conteudoDiv.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <p style="margin:0;"><strong>Paciente:</strong> ${p.nome || 'N/A'}</p>
            <p style="margin:0;"><strong>Prontuário:</strong> ${p.prontuario || 'N/A'}</p>
            <p style="margin:0;"><strong>Setor / Leito:</strong> ${(p.setor || '').toUpperCase()}</p>
            <p style="margin:0;"><strong>Data do Plantão:</strong> ${dadosPaciente.data || 'N/A'}</p>
            <p style="margin:0;"><strong>Técnico Resp.:</strong> ${p.tec || 'Não informado'}</p>
            <p style="margin:0;"><strong>Status / Desfecho:</strong> ${dadosPaciente.desfecho || 'Internado'}</p>
        </div>

        <h4 style="color:#003366; margin-bottom:8px;">Evolução de Sinais Vitais e Parâmetros:</h4>
        <div style="overflow-x-auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem;">
                <thead>
                    <tr style="background: #003366; color: #fff;">
                        <th style="border: 1px solid #002244; padding: 6px;">Hora</th>
                        <th style="border: 1px solid #002244; padding: 6px;">PAS</th>
                        <th style="border: 1px solid #002244; padding: 6px;">Temp</th>
                        <th style="border: 1px solid #002244; padding: 6px;">FR</th>
                        <th style="border: 1px solid #002244; padding: 6px;">FC</th>
                        <th style="border: 1px solid #002244; padding: 6px;">O₂</th>
                        <th style="border: 1px solid #002244; padding: 6px;">Sat</th>
                        <th style="border: 1px solid #002244; padding: 6px;">Consc.</th>
                        <th style="border: 1px solid #002244; padding: 6px;">Glic.</th>
                        <th style="border: 1px solid #002244; padding: 6px;">Dor</th>
                        <th style="border: 1px solid #002244; padding: 6px;">NEWS</th>
                        <th style="border: 1px solid #002244; padding: 6px;">Prot.</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasTabelaHtml || '<tr><td colspan="12" style="text-align:center; padding:10px;">Nenhum registro encontrado</td></tr>'}
                </tbody>
            </table>
        </div>
    `;

    modal.style.display = 'flex';
}
// --- LÓGICA DO QUADRO 1 E QUADRO 2 DE DIMENSIONAMENTO (COFEN 743/2024) ---

function carregarPacientesGeralEnfermarias() {
    const tbodyQ1 = document.getElementById('corpo-tabela-quadro1-geral');
    if (!tbodyQ1) return;

    tbodyQ1.innerHTML = "";
    const idsEnfermarias = ['enf1', 'enf2', 'enf3', 'enf4', 'enf5', 'corredor', 'enf-pediatria', 'sala-emergencia'];
    let totalPacientes = 0;

    idsEnfermarias.forEach(idSetor => {
        const abaSetor = document.getElementById(idSetor);
        if (!abaSetor) return;

        abaSetor.querySelectorAll('.patient-card').forEach((card) => {
            const nomeInput = card.querySelector('.nome-input');
            if (nomeInput && nomeInput.value.trim() !== "") {
                totalPacientes++;
                const nomePac = nomeInput.value.trim();
                const setorFormatado = idSetor.replace('enf', 'Enfermaria ').replace('corredor', 'Corredor').replace('sala-emergencia', 'Emergência').toUpperCase();

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="border: 1px solid #cbd5e1; font-weight: bold; color: #003366; padding: 6px;">${setorFormatado}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px;">${nomePac}</td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px;">
                        <select class="q1-banho" style="width: 100%; border: none; background: transparent; font-size: 0.75rem;">
                            <option value="-">-</option>
                            <option value="Aspersão">Aspersão</option>
                            <option value="Leito Diá">Leito Dia</option>
                            <option value="Leito Noite">Leito Noite</option>
                            <option value="Auxílio Dia">Auxílio Dia</option>
                            <option value="Auxílio Noite">Auxílio Noite</option>
                        </select>
                    </td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px;">
                        <select class="q1-lesao" style="width: 100%; border: none; background: transparent; font-size: 0.75rem;">
                            <option value="NÃO">NÃO</option>
                            <option value="SIM">SIM</option>
                        </select>
                    </td>
                    <td style="border: 1px solid #cbd5e1; padding: 6px;">
                        <select class="q1-scp" onchange="recalcularLinhaQuadro1(this)" style="width: 100%; border: none; background: #e2e8f0; font-weight: bold; font-size: 0.72rem;">
                            <option value="intensivo">INTENSIVOS (18h)</option>
                            <option value="semi">SEMI-INTENSIVO (10h)</option>
                            <option value="alta">ALTA DEP. (10h)</option>
                            <option value="intermediario">INTERMEDIÁRIOS (6h)</option>
                            <option value="minimo" selected>MÍNIMOS (4h)</option>
                        </select>
                    </td>
                    <td style="border: 1px solid #cbd5e1; text-align: center; padding: 6px;" class="q1-hora-ref">1,34</td>
                    <td style="border: 1px solid #cbd5e1; text-align: center; font-weight: 500; padding: 6px;" class="q1-total-horas">01:20:24</td>
                    <td style="border: 1px solid #cbd5e1; text-align: center; padding: 6px;">
                        <button type="button" onclick="this.closest('tr').remove()" style="background: #ef4444; color: #fff; border: none; border-radius: 50%; width: 20px; height: 20px; font-weight: bold; cursor: pointer;" title="Remover paciente">✕</button>
                    </td>
                `;
                tbodyQ1.appendChild(tr);
            }
        });
    });
}

function recalcularLinhaQuadro1(selectScp) {
    const tr = selectScp.closest('tr');
    const tipo = selectScp.value;
    const tdRef = tr.querySelector('.q1-hora-ref');
    const tdTot = tr.querySelector('.q1-total-horas');

    let fator = 1.34;
    if (tipo === 'intensivo') fator = 4.3;
    else if (tipo === 'semi' || tipo === 'alta') fator = 2.9;
    else if (tipo === 'intermediario') fator = 2.01;
    else if (tipo === 'minimo') fator = 1.34;

    tdRef.textContent = fator.toFixed(2).replace('.', ',');
    const segundos = Math.round(fator * 3600);
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    tdTot.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function abrirModalGerarEscalaTecnica() {
    document.getElementById('modal-gerar-escala-tec').style.display = 'flex';
}

function fecharModalGerarEscalaTecnica() {
    document.getElementById('modal-gerar-escala-tec').style.display = 'none';
}

function executarGeracaoEscalaTecnica() {
    const textoTecnicos = document.getElementById('textarea-nomes-tecnicos').value;
    const tecnicos = textoTecnicos.split(/[\n,]+/).map(t => t.trim()).filter(t => t.length > 0);

    if (tecnicos.length === 0) {
        alert("Por favor, informe pelo menos um técnico de enfermagem.");
        return;
    }

    const linhasQ1 = document.querySelectorAll('#corpo-tabela-quadro1-geral tr');
    const pacientesParaDistribuir = [];

    linhasQ1.forEach(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length >= 7) {
            const setor = tds[0].textContent;
            const nomePac = tds[1].textContent;
            const banho = tr.querySelector('.q1-banho').value;
            const lesao = tr.querySelector('.q1-lesao').value;
            const scpSelect = tr.querySelector('.q1-scp');
            const scpTexto = scpSelect.options[scpSelect.selectedIndex].text;
            const scpVal = scpSelect.value;
            const horaRef = tr.querySelector('.q1-hora-ref').textContent;
            const totalHoras = tr.querySelector('.q1-total-horas').textContent;

            // Calcula os segundos exatos para facilitar o balanceamento
            let segundos = 0;
            if (totalHoras) {
                const partes = totalHoras.split(':').map(Number);
                if (partes.length === 3) {
                    segundos = (partes[0] * 3600) + (partes[1] * 60) + partes[2];
                }
            }

            pacientesParaDistribuir.push({ setor, nomePac, banho, lesao, scpTexto, scpVal, horaRef, totalHoras, segundos });
        }
    });

    if (pacientesParaDistribuir.length === 0) {
        alert("Não há pacientes no Quadro 1 para distribuir.");
        return;
    }

    fecharModalGerarEscalaTecnica();

    const tbodyQ2 = document.getElementById('corpo-tabela-quadro2-escala');
    tbodyQ2.innerHTML = "";
    document.getElementById('lbl-qtd-tecnicos-escala').textContent = tecnicos.length;

    // Inicializa o objeto de cada técnico
    const distribuicao = tecnicos.map((nome, idx) => ({
        id: idx + 1,
        nome: nome,
        pacientes: [],
        segundosTotais: 0
    }));

    // Ordena os pacientes do mais pesado (maior carga horária) para o mais leve
    pacientesParaDistribuir.sort((a, b) => b.segundosTotais - a.segundosTotais);

    // Algoritmo de Balanceamento (Greedy): Atribui cada paciente sempre ao técnico com menos carga horária acumulada
    pacientesParaDistribuir.forEach(pac => {
        // Encontra o técnico com menor carga horária no momento
        let tecnicoMenorCarga = distribuicao[0];
        for (let i = 1; i < distribuicao.length; i++) {
            if (distribuicao[i].segundosTotais < tecnicoMenorCarga.segundosTotais) {
                tecnicoMenorCarga = distribuicao[i];
            }
        }
        // Aloca o paciente para ele e atualiza a carga horária
        tecnicoMenorCarga.pacientes.push(pac);
        tecnicoMenorCarga.segundosTotais += pac.segundos;
    });

    // Renderiza a tabela do Quadro 2 de forma equilibrada
    distribuicao.forEach(tec => {
        const totalLinhas = Math.max(tec.pacientes.length, 1);

        const th = Math.floor(tec.segundosTotais / 3600);
        const tm = Math.floor((tec.segundosTotais % 3600) / 60);
        const ts = tec.segundosTotais % 60;
        const textoJornadaTotal = `${String(th).padStart(2, '0')}:${String(tm).padStart(2, '0')}:${String(ts).padStart(2, '0')}`;

        for (let i = 0; i < totalLinhas; i++) {
            const pac = tec.pacientes[i] || null;
            const isFirst = (i === 0);

            let corScp = 'transparent';
            if (pac) {
                if (pac.scpVal === 'intensivo') corScp = '#fed7aa';
                else if (pac.scpVal === 'semi' || pac.scpVal === 'alta') corScp = '#fef08a';
                else if (pac.scpVal === 'intermediario') corScp = '#bbf7d0';
                else corScp = '#e2e8f0';
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                ${isFirst ? `<td style="border: 1px solid #cbd5e1; text-align: center; font-weight: bold; vertical-align: middle;" rowspan="${totalLinhas}">${tec.id}</td>` : ''}
                ${isFirst ? `<td style="border: 1px solid #cbd5e1; font-weight: bold; text-align: center; vertical-align: middle;" rowspan="${totalLinhas}">${tec.nome}</td>` : ''}
                <td style="border: 1px solid #cbd5e1; font-size: 0.78rem; padding: 6px;">${pac ? `${pac.nomePac} (${pac.setor})` : '<span style="color:#94a3b8;">- Vago -</span>'}</td>
                <td style="border: 1px solid #cbd5e1; font-size: 0.75rem; padding: 6px;">${pac && pac.banho !== '-' ? pac.banho : '-'}</td>
                <td style="border: 1px solid #cbd5e1; font-size: 0.75rem; padding: 6px;">${pac ? pac.lesao : 'NÃO'}</td>
                <td style="border: 1px solid #cbd5e1; font-size: 0.72rem; font-weight: bold; background: ${corScp}; padding: 6px;">${pac ? pac.scpTexto : '-'}</td>
                <td style="border: 1px solid #cbd5e1; text-align: center; padding: 6px;">${pac ? pac.horaRef : '-'}</td>
                <td style="border: 1px solid #cbd5e1; text-align: center; font-weight: 500; padding: 6px;">${pac ? pac.totalHoras : '00:00:00'}</td>
                ${isFirst ? `
                    <td style="border: 1px solid #cbd5e1; text-align: center; font-weight: bold; background: #e0f2fe; color: #0369a1; vertical-align: middle;" rowspan="${totalLinhas}">
                        ${textoJornadaTotal}
                    </td>
                ` : ''}
            `;
            tbodyQ2.appendChild(tr);
        }
    });
}
