// --- CONFIGURAÇÃO DO SUPABASE ---
const SUPABASE_URL = 'https://fwaheunpekyvwyysqncz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_er3si1epfRHUz8SQP26B1A__aFx0cTy';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- VARIÁVEIS DE CONTROLE DE RELATÓRIO ---
let linhaAtualParaRelatorio = null;
let nomesUnicosMes = new Set();

// --- FUNÇÃO AUXILIAR PARA COR DINÂMICA DO SCP ---
function atualizarCorSelectScp(selectEl) {
    const val = selectEl.value;
    if (val === 'intensivo') {
        selectEl.style.backgroundColor = '#fed7aa'; // Laranja claro
        selectEl.style.color = '#7c2d12';
    } else if (val === 'semi' || val === 'alta') {
        selectEl.style.backgroundColor = '#fef08a'; // Amarelo claro
        selectEl.style.color = '#713f12';
    } else if (val === 'intermediario') {
        selectEl.style.backgroundColor = '#bbf7d0'; // Verde claro
        selectEl.style.color = '#166534';
    } else {
        selectEl.style.backgroundColor = '#e2e8f0'; // Cinza claro (mínimos)
        selectEl.style.color = '#1e293b';
    }
}

function inicializarCoresScpGlobal() {
    document.querySelectorAll('.input-scp-paciente').forEach(selectEl => {
        atualizarCorSelectScp(selectEl);
    });
}

function gerarTabelaAdulto() {
    return `
    <div class="patients-container">
        <div class="patient-card">
            <div class="patient-header">
                <div class="input-group name-group"><label>NOME:</label><input type="text" class="nome-input" placeholder="Nome do Paciente"></div>
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

                <!-- LINHA INFERIOR: LEITO + ISENTO DE ESCORE + BANHO + DIETA ASSISTIDA + RISCO DE LESÃO + SCP -->
                <div class="linha-inferior-dim">
                    <div class="input-group" style="display: flex; align-items: center; gap: 5px; margin-right: 10px;">
                        <label style="font-size: 0.78rem; color: var(--azul-escuro); font-weight: 600;">LEITO:</label>
                        <select class="leito-input" onchange="ordenarCardsPorLeito(this)" style="width: 75px; padding: 3px; font-size: 0.75rem; border: 1px solid #cbd5e1; border-radius: 4px; text-align: center; background: #fff; font-weight: bold; color: #003366; cursor: pointer;">
                            <option value="01">01</option><option value="02">02</option>
                            <option value="03">03</option><option value="04">04</option>
                            <option value="05">05</option><option value="06">06</option>
                            <option value="07">07</option><option value="08">08</option>
                            <option value="09">09</option><option value="10">10</option>
                            <option value="11">11</option><option value="12">12</option>
                        </select>
                    </div>

                    <div class="input-group">
                        <label style="font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; gap: 4px; color: var(--azul-escuro); font-weight: 600;">
                            <input type="checkbox" class="isento-relatorio" style="cursor: pointer;"> Isento de Escore
                        </label>
                    </div>
                    <div class="input-group">
                        <label>BANHO:</label>
                        <select class="input-banho-paciente" style="padding: 3px; font-size: 0.75rem; border: 1px solid var(--borda); border-radius: 4px;">
                            <option value="-">-</option>
                            <option value="Aspersão">Aspersão</option>
                            <option value="Leito Diá">Leito Dia</option>
                            <option value="Leito Noite">Leito Noite</option>
                            <option value="Auxílio Dia">Auxílio Dia</option>
                            <option value="Auxílio Noite">Auxílio Noite</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label>DIETA ASSISTIDA:</label>
                        <select class="input-dieta-paciente" style="padding: 3px; font-size: 0.75rem; border: 1px solid var(--borda); border-radius: 4px;">
                            <option value="NÃO">NÃO</option>
                            <option value="SIM">SIM</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label>RISCO LESÃO:</label>
                        <select class="input-lesao-paciente" style="padding: 3px; font-size: 0.75rem; border: 1px solid var(--borda); border-radius: 4px;">
                            <option value="NÃO">NÃO</option>
                            <option value="SIM">SIM</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label>SCP:</label>
                        <select class="input-scp-paciente" onchange="atualizarCorSelectScp(this); tratarMudancaVitais(event);" style="padding: 3px; font-size: 0.75rem; border: 1px solid var(--borda); border-radius: 4px; background-color: #e2e8f0; font-weight: bold;">
                            <option value="intensivo">INTENSIVOS</option>
                            <option value="semi">SEMI-INTENSIVO</option>
                            <option value="alta">ALTA DEP.</option>
                            <option value="intermediario">INTERMEDIÁRIOS</option>
                            <option value="minimo" selected>MÍNIMOS</option>
                        </select>
                    </div>
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
    // Garante que todas as enfermarias e a sala de emergência carreguem o layout padrão corretamente
    ['enf1', 'enf2', 'enf3', 'enf4', 'enf5', 'corredor', 'sala-emergencia'].forEach(id => {
        const setor = document.getElementById(id);
        // Adicionada a checagem setor.children.length === 0
        if (setor && (setor.innerHTML.trim() === "" || setor.children.length === 0)) {
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

    inicializarCoresScpGlobal();

    if (typeof carregarDadosAuditoria === 'function') {
        carregarDadosAuditoria();
    }
    
    if (typeof carregarListaHistoricoEscalas === 'function') {
        carregarListaHistoricoEscalas();
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
            carregarListaHistoricoEscalas();
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
            
            // CAPTURA CORRETA USANDO AS CLASSES DOS INPUTS DA TELA
            const prontuario = card.querySelector('.prontuario-input')?.value || "";
            const tec = card.querySelector('.tec-input')?.value || "";
            
            const isento = card.querySelector('.isento-relatorio')?.checked || false;
            const desfecho = card.getAttribute('data-desfecho') || "Internado";
            
            const leito = card.querySelector('.leito-input')?.value || "";
            const banho = card.querySelector('.input-banho-paciente')?.value || "-";
            const dieta = card.querySelector('.input-dieta-paciente')?.value || "NÃO";
            const lesao = card.querySelector('.input-lesao-paciente')?.value || "NÃO";
            const scp = card.querySelector('.input-scp-paciente')?.value || "minimo";

            const vitais = [];
            card.querySelectorAll('.vitals-table tbody tr').forEach(tr => {
                const hora = tr.getAttribute('data-hora') || tr.querySelector('.time-col')?.textContent.trim() || "";
                const inputs = Array.from(tr.querySelectorAll('input, select')).map(i => i.value);
                const isExtra = tr.classList.contains('linha-horario-extra');
                vitais.push({ hora, inputs, isExtra });
            });

            if (nome.trim() !== "") {
                dadosGerais.push({ setor: idSetor, leito, nome, dtNasc, prontuario, tec, isento, desfecho, banho, dieta, lesao, scp, vitais });
            }
        });
    }); 

    const { data: existingData } = await _supabase.from('plantoes').select('dados_json').eq('data_chave', dataChave).maybeSingle();
    
    if (existingData && Array.isArray(existingData.dados_json)) {
        existingData.dados_json.forEach(pacienteSalvo => {
            if (pacienteSalvo.desfecho && pacienteSalvo.desfecho !== "Internado") {
                const jaExiste = dadosGerais.find(p => p.nome === pacienteSalvo.nome && p.setor === pacienteSalvo.setor);
                if (!jaExiste) dadosGerais.push(pacienteSalvo);
            }
        });
    }

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
        inicializarCoresScpGlobal();
        return;
    }

    const dadosGerais = data.dados_json;

    dadosGerais.forEach(p => {
        if (p.desfecho && p.desfecho !== "Internado") return;

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
        
        if (card.querySelector('.leito-input')) card.querySelector('.leito-input').value = p.leito || "";

        if (card.querySelector('.dtnasc-input')) {
            card.querySelector('.dtnasc-input').value = p.dtNasc;
            atualizarBadgeIdade(card.querySelector('.dtnasc-input'));
        }
        if (card.querySelector('.prontuario-input')) card.querySelector('.prontuario-input').value = p.prontuario;
        if (card.querySelector('.tec-input')) card.querySelector('.tec-input').value = p.tec;
        if (card.querySelector('.isento-relatorio')) card.querySelector('.isento-relatorio').checked = p.isento;

        if (card.querySelector('.input-banho-paciente')) card.querySelector('.input-banho-paciente').value = p.banho || "-";
        if (card.querySelector('.input-dieta-paciente')) card.querySelector('.input-dieta-paciente').value = p.dieta || "NÃO";
        if (card.querySelector('.input-lesao-paciente')) card.querySelector('.input-lesao-paciente').value = p.lesao || "NÃO";
        
        if (card.querySelector('.input-scp-paciente')) {
            const selectScp = card.querySelector('.input-scp-paciente');
            selectScp.value = p.scp || "minimo";
            atualizarCorSelectScp(selectScp);
        }

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
    inicializarCoresScpGlobal();
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

    const dataOntem = new Date(agora);
    dataOntem.setDate(agora.getDate() - 1);
    const dataOntemStr = formatarDataChave(dataOntem);

    const { data: dataAnterior } = await _supabase
        .from('plantoes')
        .select('dados_json')
        .eq('data_chave', dataOntemStr)
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
            leito: p.leito || "",
            nome: p.nome || "",
            dtNasc: p.dtNasc || "",
            prontuario: p.prontuario || "",
            tec: p.tec || "",
            isento: p.isento || false,
            desfecho: p.desfecho || "Internado",
            banho: p.banho || "-",
            dieta: p.dieta || "NÃO",
            lesao: p.lesao || "NÃO",
            scp: p.scp || "minimo",
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
    inicializarCoresScpGlobal();
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

    if (elemento.classList.contains('input-scp-paciente')) {
        atualizarCorSelectScp(elemento);
    }

    if (elemento.classList.contains('nome-input') || 
        elemento.classList.contains('prontuario-input') || 
        elemento.classList.contains('tec-input') || 
        elemento.classList.contains('leito-input') || 
        elemento.classList.contains('isento-relatorio') || 
        elemento.classList.contains('dtnasc-input') || 
        elemento.classList.contains('input-banho-paciente') || 
        elemento.classList.contains('input-dieta-paciente') || 
        elemento.classList.contains('input-lesao-paciente') || 
        elemento.classList.contains('input-scp-paciente')) {
        
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
    let temParametroIsoladoTres = false;

    // 1. FR (Frequência Respiratória)
    if (pFr.value !== "") {
        let ptsFr = 0;
        if (fr <= 8) { ptsFr = 3; temParametroIsoladoTres = true; }
        else if (fr >= 25) { ptsFr = 3; temParametroIsoladoTres = true; }
        else if (fr >= 21 && fr <= 24) ptsFr = 2;
        else if (fr >= 9 && fr <= 11) ptsFr = 1;
        score += ptsFr;
    }

    // 2. O2 Suplementar
    if (o2SimNao === "SIM") score += 2;

    // 3. Saturação (SPO2) conforme tabela oficial
    if (pSat.value !== "") {
        let ptsSat = 0;
        if (sat <= 91) { ptsSat = 3; temParametroIsoladoTres = true; }
        else if (sat >= 92 && sat <= 93) ptsSat = 2;
        else if (sat >= 94 && sat <= 95) ptsSat = 1;
        score += ptsSat;
    }

    // 4. PAS (Pressão Arterial Sistólica)
    if (pPas.value !== "") {
        let ptsPas = 0;
        if (pas <= 90) { ptsPas = 3; temParametroIsoladoTres = true; destacarLaranja(pPas); }
        else if (pas >= 220) { ptsPas = 3; temParametroIsoladoTres = true; }
        else if ((pas >= 91 && pas <= 100)) ptsPas = 2;
        else if ((pas >= 200 && pas <= 219)) ptsPas = 2;
        else if ((pas >= 101 && pas <= 110)) ptsPas = 1;
        else if ((pas >= 131 && pas <= 199)) ptsPas = 1;
        score += ptsPas;
    }

    // 5. FC (Frequência Cardíaca) conforme tabela oficial
    if (pFc.value !== "") {
        let ptsFc = 0;
        if (fc <= 40) { ptsFc = 3; temParametroIsoladoTres = true; }
        else if (fc >= 131) { ptsFc = 3; temParametroIsoladoTres = true; }
        else if (fc >= 111 && fc <= 130) ptsFc = 2;
        else if (fc >= 41 && fc <= 50) ptsFc = 1;
        else if (fc >= 91 && fc <= 110) ptsFc = 1;
        score += ptsFc;
    }

    // 6. Temperatura (TC) conforme tabela oficial
    if (pTemp.value !== "") {
        let ptsTemp = 0;
        if (temp <= 35.0) { ptsTemp = 3; temParametroIsoladoTres = true; }
        else if (temp >= 39.1) ptsTemp = 2;
        else if (temp >= 38.1 && temp <= 39.0) ptsTemp = 1;
        else if (temp >= 35.1 && temp <= 36.0) ptsTemp = 1;
        score += ptsTemp;
    }

    // 7. SNC (Nível de Consciência)
    let pConscVal = 0;
    if (consc === "VOZ, DOR OU NÃO REAGE") {
        pConscVal = 3;
        temParametroIsoladoTres = true;
        destacarLaranja(pConsc);
    } else if (consc === "AGITADO/CONFUSO") {
        pConscVal = 2;
    }
    score += pConscVal;

    // Critérios de Alerta de Sepse / SIRS
    let sirsCount = 0;
    if (pFc.value && fc > 90) { sirsCount++; destacarLaranja(pFc); }
    if (pFr.value && fr > 20) { sirsCount++; destacarLaranja(pFr); }
    if (pTemp.value && (temp > 38.3 || (temp > 0 && temp < 35))) { sirsCount++; destacarLaranja(pTemp); }

    let sepseSat = (sat > 0 && ((sat < 90 && o2SimNao !== "SIM") || (sat < 94 && o2SimNao === "SIM")));
    if (sepseSat) destacarLaranja(pSat);

    const isAlertaSepseAutomatico = (sirsCount >= 2 || pConscVal >= 3 || (pas > 0 && pas < 90) || sepseSat);
    const isAlertaSepse = (isAlertaSepseAutomatico || abertoProtocoloManual === "Sim");

    pNews.value = score;

    // Cores e Classificação baseadas rigorosamente no fluxograma oficial (Escore 0, 1-3, 4-5 ou parâmetro isolado 3, e >= 6)
    if (score === 0) {
        pNews.style.backgroundColor = "#e6ffe6"; pNews.style.color = "#28a745";
    } else if (score >= 1 && score <= 3 && !temParametroIsoladoTres) {
        pNews.style.backgroundColor = "#d1ecf1"; pNews.style.color = "#0c5460";
    } else if ((score >= 4 && score <= 5) || temParametroIsoladoTres) {
        pNews.style.backgroundColor = "#fff3cd"; pNews.style.color = "#856404";
    } else {
        pNews.style.backgroundColor = "#ffe6e6"; pNews.style.color = "#dc3545";
    }

    if (isAlertaSepse) {
        tdStatus.innerHTML = `<span class="status-badge" style="background:#ffe6e6; color:#dc3545; border:1px solid #dc3545;">🚨 ALERTA SEPSE</span>`;
    } else if (score >= 6) {
        tdStatus.innerHTML = `<span class="status-badge" style="background:#ffe6e6; color:#dc3545; border:1px solid #dc3545;">🚨 ALTO RISCO </span>`;
    } else if ((score >= 4 && score <= 5) || temParametroIsoladoTres) {
        tdStatus.innerHTML = `<span class="status-badge" style="background:#fff3cd; color:#856404; border:1px solid #ffeeba;">🟡 MÉDIO RISCO </span>`;
    } else if (score >= 1 && score <= 3) {
        tdStatus.innerHTML = `<span class="status-badge" style="background:#d1ecf1; color:#0c5460; border:1px solid #bee5eb;">🟢 BAIXO RISCO </span>`;
    } else {
        tdStatus.innerHTML = `<span class="status-badge status-estavel">✔️ ESTÁVEL </span>`;
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
    const nomeEnfermeiroLogado = localStorage.getItem('enfermeiro_logado_nome') || "Enfermeiro(a)";
    const isentoEscore = card?.querySelector('.isento-relatorio')?.checked || false;

    const inputs = linha.querySelectorAll('input, select');
    const pas = inputs[0]?.value || "-";
    const temp = inputs[1]?.value || "-";
    const fr = inputs[2]?.value || "-";
    const fc = inputs[3]?.value || "-";
    const o2SimNao = inputs[4]?.value || "Não";
    const sat = inputs[5]?.value || "-";
    const consc = inputs[6]?.value || "Alerta";
    
    const selectDor = linha.querySelector('td:nth-child(10) select');
    const dor = selectDor && selectDor.selectedOptions[0] ? selectDor.selectedOptions[0].text : "Não avaliado";
    
    const newsVal = parseInt(linha.querySelector('.news-input')?.value) || 0;

    let temIsoladoTres = false;
    let paramIsoladoDescricao = "";
    
    const fVal = parseFloat(fr) || 0;
    const sVal = parseFloat(sat) || 0;
    const pVal = parseFloat(pas) || 0;
    const cVal = parseFloat(fc) || 0;
    const tVal = parseFloat(String(temp).replace(',', '.')) || 0;
    const conscUpper = consc.toUpperCase();

    if (fVal > 0 && (fVal <= 8 || fVal >= 25)) { temIsoladoTres = true; paramIsoladoDescricao = `FR alterada (${fVal} irpm)`; }
    else if (sVal > 0 && sVal <= 91) { temIsoladoTres = true; paramIsoladoDescricao = `Saturação crítica (${sVal}%)`; }
    else if (pVal > 0 && (pVal <= 90 || pVal >= 220)) { temIsoladoTres = true; paramIsoladoDescricao = `PAS crítica (${pVal} mmHg)`; }
    else if (cVal > 0 && (cVal <= 40 || cVal >= 131)) { temIsoladoTres = true; paramIsoladoDescricao = `FC crítica (${cVal} bpm)`; }
    else if (tVal > 0 && tVal <= 35.0) { temIsoladoTres = true; paramIsoladoDescricao = `Temperatura crítica (${tVal} °C)`; }
    else if (conscUpper === "VOZ, DOR OU NÃO REAGE") { temIsoladoTres = true; paramIsoladoDescricao = `Nível de consciência alterado (${consc})`; }

    let sirsCount = 0;
    if (cVal > 90) sirsCount++;
    if (fVal > 20) sirsCount++;
    if (tVal > 38.3 || (tVal > 0 && tVal < 35)) sirsCount++;

    const pConscVal = (conscUpper === "VOZ, DOR OU NÃO REAGE") ? 3 : (conscUpper === "AGITADO/CONFUSO" ? 2 : 0);
    const sepseSat = (sVal > 0 && ((sVal < 90 && o2SimNao.toUpperCase() !== "SIM") || (sVal < 94 && o2SimNao.toUpperCase() === "SIM")));
    const isAlertaSepse = (sirsCount >= 2 || pConscVal >= 3 || (pVal > 0 && pVal < 90) || sepseSat);

    const usoO2Texto = o2SimNao.toUpperCase() === "SIM" ? "Sim" : "Não";
    const sinaisVitaisStr = `PA: ${pas} mmHg, FC: ${fc} bpm, FR: ${fr} irpm, Temp: ${temp} °C, Sat(%): ${sat}, O2 Supl: ${usoO2Texto}, Nív Consc: ${consc}, Dor: ${dor}`;

    let textoRelatorio = "";

    if (tipo === 'enfermeiro') {
        if (isentoEscore) {
            textoRelatorio = `Em tempo, às ${hora} horas, realizo avaliação de SSVV aferidos pelo(a) técnico(a) ${nomeTecnico}: ${sinaisVitaisStr}. Paciente não avaliado seguindo escore de alerta NEWS, condição clínica de isenção conforme protocolo. Realizo visita no leito, paciente estável, sem queixas no momento e sem desconforto respiratório, comunico ao Médico Plantonista que avalia e orienta verificar SSVV a cada 4 horas, manter vigilância dos sintomas e comunicar intercorrências.`;
        } else if (isAlertaSepse) {
            textoRelatorio = `Às ${hora} horas, sou comunicada pelo(a) técnico(a) ${nomeTecnico} sobre paciente apresentando sinais de alerta de sepse. Sinais vitais e parâmetros: ${sinaisVitaisStr}, NEWS: ${newsVal}${temIsoladoTres ? ' (com parâmetro isolado crítico: ' + paramIsoladoDescricao + ')' : ''}. Realizo visita no leito, comunico à equipe médica e aciono protocolo institucional de sepse.`;
        } else if (newsVal === 0) {
            textoRelatorio = `Às ${hora} horas, sou comunicada pelo(a) técnico(a) ${nomeTecnico} que paciente apresenta News com Escore 0 (Estável). Sinais vitais: ${sinaisVitaisStr}, paciente estável hemodinamicamente. Oriento verificar SSVV de 4/4 horas conforme rotina da unidade, comunicar intercorrências.`;
        } else if (newsVal >= 1 && newsVal <= 3 && !temIsoladoTres) {
            textoRelatorio = `Às ${hora} horas, sou comunicada pelo(a) técnico(a) ${nomeTecnico}, paciente avaliado seguindo escore de alerta NEWS e classificado como Baixo Risco (${newsVal}). Sinais vitais: ${sinaisVitaisStr}. Realizo visita no leito, paciente estável e sem queixas. Oriento verificar SSVV em 4h, conforme rotina da unidade, manter vigilância dos sintomas ou comunicar se intercorrências.`;
        } else if ((newsVal >= 4 && newsVal <= 5) || temIsoladoTres) {
            textoRelatorio = `Em tempo, às ${hora} horas, sou comunicado(a) pelo(a) técnico(a) ${nomeTecnico} que paciente apresenta News Médio Risco (${newsVal})${temIsoladoTres ? ' devido a parâmetro isolado crítico (' + paramIsoladoDescricao + ')' : ''}. Sinais vitais: ${sinaisVitaisStr}. Realizo visita no leito, paciente estável, sem queixas, sem desconforto respiratório no momento. Comunico ao médico plantonista, que avalia e orienta aferir SSVV em 4h, manter vigilância dos sinais e sintomas, comunicar intercorrências.`;
        } else {
            textoRelatorio = `Às ${hora} horas, sou comunicada pelo(a) técnico(a) ${nomeTecnico} que o paciente apresenta News Alto Risco (${newsVal}). Sinais vitais: ${sinaisVitaisStr}. Realizo visita no leito, comunico ao médico plantonista, que avalia e orienta reavaliar SSVV, manter vigilância de sinais e sintomas, comunicar intercorrências.`;
        }
    } else if (tipo === 'medico') {
        if (isentoEscore) {
            textoRelatorio = `Em tempo, às ${hora} horas, ciente da avaliação de SSVV repassada pela enfermagem (${sinaisVitaisStr}). Paciente isento de escore NEWS conforme patologia de base. Realizada visita ao leito, paciente estável, orientada a manutenção da verificação de SSVV a cada 4 horas e comunicação imediata de intercorrências.`;
        } else if (isAlertaSepse) {
            textoRelatorio = `Em tempo, às ${hora} horas, sou comunicado(a) pela enfermagem (${nomeEnfermeiroLogado}) acerca de paciente com critérios de alerta de sepse. Sinais vitais e parâmetros: ${sinaisVitaisStr}, NEWS: ${newsVal}${temIsoladoTres ? ' (com parâmetro isolado crítico: ' + paramIsoladoDescricao + ')' : ''}. Realizo avaliação clínica no leito, conduta instituída conforme protocolo de sepse.`;
        } else if (newsVal === 0) {
            textoRelatorio = `Em tempo, às ${hora} horas, ciente dos sinais vitais aferidos pela enfermagem (${sinaisVitaisStr}, NEWS ${newsVal} - Estável). Paciente sem agudos intercorrentes no momento, mantida monitorização padrão conforme rotina.`;
        } else if (newsVal >= 1 && newsVal <= 3 && !temIsoladoTres) {
            textoRelatorio = `Em tempo, às ${hora} horas, avalio dados de sinais vitais repassados pela enfermagem (${sinaisVitaisStr}, NEWS ${newsVal} - Baixo Risco). Paciente estável, orientado manter vigilância e reavaliar conforme evolução.`;
        } else if ((newsVal >= 4 && newsVal <= 5) || temIsoladoTres) {
            textoRelatorio = `Em tempo, às ${hora} horas, chamado(a) pela enfermagem para avaliação de paciente com NEWS ${newsVal} (Médio Risco)${temIsoladoTres ? ' com presença de parâmetro isolado crítico (' + paramIsoladoDescricao + ')' : ''}. Sinais vitais: ${sinaisVitaisStr}. Realizada visita ao leito, paciente estável no momento, orientada a manutenção de SSVV em 4h e comunicação imediata de intercorrências.`;
        } else {
            textoRelatorio = `Em tempo, às ${hora} horas, acionado(a) com urgência pela enfermagem para avaliação de paciente em Alto Risco (NEWS ${newsVal}). Sinais vitais: ${sinaisVitaisStr}. Realizada avaliação imediata no leito, ajustadas condutas terapêuticas e mantida monitorização contínua.`;
        }
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

    if (idSetor === 'aba-dimensionamento') {
        if (typeof carregarListaHistoricoEscalas === 'function') {
            carregarListaHistoricoEscalas();
        }
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

    const todasAsAbasEnfermaria = document.querySelectorAll('.tab-pane:not(#painel-central):not(#aba-auditoria-sepse):not(#aba-dimensionamento)');
    const todosOsCards = document.querySelectorAll('.patient-card');

    if (termoFiltro === "") {
        todosOsCards.forEach(card => card.style.display = 'block');
        mudarSetor(setorAtivoAntesDaBusca);
        return;
    }

    let primeiraAbaComResultado = null;

    todasAsAbasEnfermaria.forEach(aba => {
        let encontrouNaAba = false;
        const cardsDaAba = aba.querySelectorAll('.patient-card');

        cardsDaAba.forEach(card => {
            const inputNome = card.querySelector('.nome-input');
            const inputTec = card.querySelector('.tec-input');
            const inputProntuario = card.querySelector('.prontuario-input');

            const valorNome = inputNome ? inputNome.value.toLowerCase().trim() : "";
            const valorTec = inputTec ? inputTec.value.toLowerCase().trim() : "";
            const valorProntuario = inputProntuario ? inputProntuario.value.toLowerCase().trim() : "";

            let exibir = false;
            if (tipoFiltro === "paciente" && (valorNome.includes(termoFiltro) || valorProntuario.includes(termoFiltro))) {
                exibir = true;
            }
            if (tipoFiltro === "tecnico" && valorTec.includes(termoFiltro)) {
                exibir = true;
            }

            if (exibir) {
                card.style.display = 'block';
                encontrouNaAba = true;
            } else {
                card.style.display = 'none';
            }
        });

        if (encontrouNaAba) {
            aba.style.setProperty('display', 'block', 'important');
            aba.classList.add('active');
            if (!primeiraAbaComResultado) {
                primeiraAbaComResultado = aba.id;
            }
        } else {
            aba.style.setProperty('display', 'none', 'important');
            aba.classList.remove('active');
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
    let csv = "Setor;Nome Paciente;Prontuario;Tecnico Responsavel;Banho;Dieta Assistida;Risco Lesao;SCP;Status\n";
    document.querySelectorAll('.patient-card').forEach(card => {
        const nome = card.querySelector('.nome-input')?.value.trim() || "";
        const prontuario = card.querySelector('.prontuario-input')?.value.trim() || "";
        const tec = card.querySelector('.tec-input')?.value.trim() || "";
        const setor = card.closest('.tab-pane')?.id.toUpperCase() || "";
        const banho = card.querySelector('.input-banho-paciente')?.value || "-";
        const dieta = card.querySelector('.input-dieta-paciente')?.value || "NÃO";
        const lesao = card.querySelector('.input-lesao-paciente')?.value || "NÃO";
        const scp = card.querySelector('.input-scp-paciente')?.value || "minimo";

        if (nome !== "") {
            csv += `${setor};${nome};${prontuario};${tec};${banho};${dieta};${lesao};${scp};Ativo\n`;
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

    await salvarDadosDoDia(dataSelecionadaStr);

    if (container.querySelectorAll('.patient-card').length > 1) {
        card.remove();
    } else {
        limparCardPaciente(card);
    }

    atualizarPainelCentral();
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

    await salvarDadosDoDia(dataSelecionadaStr);

    if (container.querySelectorAll('.patient-card').length > 1) {
        card.remove();
    } else {
        limparCardPaciente(card);
    }

    atualizarPainelCentral();
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

        await salvarDadosDoDia(dataSelecionadaStr);

        if (container.querySelectorAll('.patient-card').length > 1) {
            cardAtualTransf.remove();
        } else {
            limparCardPaciente(cardAtualTransf);
        }
    }
    fecharModalTransf();
    atualizarPainelCentral();
}

function limparCardPaciente(card) {
    card.removeAttribute('data-desfecho');
    card.querySelectorAll('input').forEach(input => {
        if (input.type === 'checkbox') input.checked = false;
        else if (!input.classList.contains('leito-input')) input.value = ''; // Preserva o leito
        input.style.border = '';
        input.style.backgroundColor = '';
    });

    card.querySelectorAll('select').forEach(select => {
        select.selectedIndex = 0;
        if (select.classList.contains('input-scp-paciente')) {
            atualizarCorSelectScp(select);
        }
    });

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
    nomesUnicosMes.clear();

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
                        plantao.dados_json.forEach(p => {
                            const nome = p.nome ? p.nome.trim().toUpperCase() : "";
                            if (nome !== "") nomesUnicosMes.add(nome);
                        });
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

    document.querySelectorAll('.patient-card .nome-input').forEach(input => {
        const nome = input.value.trim().toUpperCase();
        if (nome !== "") nomesUnicosMes.add(nome);
    });

    const elTotalMesAudit = document.getElementById('total-acumulado-mes-auditoria');
    if (elTotalMesAudit) {
        elTotalMesAudit.textContent = nomesUnicosMes.size;
        
        const pai = elTotalMesAudit.parentElement;
        if (pai && pai.innerHTML.includes('PAC-DIA')) {
            pai.innerHTML = pai.innerHTML.replace('PAC-DIA', 'PACIENTE(S)');
        }
    }
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
        const nome = inputNome ? inputNome.value.trim() : "";

        const abaPai = card.closest('.tab-pane');
        const idSetor = abaPai ? abaPai.id.toUpperCase() : "LEITO";

        if (nome !== "") {
            totalPacientes++;

            let cardTemSepseAlerta = false;      // Para o card da esquerda
            let cardTemProtocoloSim = false;     // Para a lista da direita
            let dataHoraAberturaStr = null;

            card.querySelectorAll('.vitals-table tbody tr').forEach(tr => {
                const inputNews = tr.querySelector('.news-input');
                const newsVal = inputNews ? parseInt(inputNews.value) : NaN;
                const isento = card.querySelector('.isento-relatorio')?.checked;
                
                const horaTabela = tr.getAttribute('data-hora') || (tr.querySelector('.time-col') ? tr.querySelector('.time-col')?.textContent.trim() : "08:00");
                const tdStatusElement = tr.querySelector('.status-cell');
                const htmlStatus = tdStatusElement ? tdStatusElement.innerHTML : '';
                
                const protocoloSelect = tr.querySelector('.protocolo-select');
                const abertoProtocolo = protocoloSelect ? protocoloSelect.value : "";

                // 1. Regra da Esquerda: Detecta se gerou alerta automático de sepse
                if (htmlStatus.includes('ALTO RISCO') || htmlStatus.includes('Time de Resposta Rápida') || htmlStatus.includes('ALERTA SEPSE')) {
                    cardTemSepseAlerta = true;
                }

                // 2. Regra da Direita: Detecta estritamente se o select manual está como "Sim"
                if (abertoProtocolo === "Sim") {
                    cardTemProtocoloSim = true;
                    if (!dataHoraAberturaStr) {
                        dataHoraAberturaStr = `${dataSelecionadaStr}T${horaTabela}:00`;
                    }
                }

                if (!isento && !isNaN(newsVal) && inputNews.value.trim() !== "") {
                    if (newsVal <= 1) cntEstavelAtivo++;
                    else if (newsVal === 2) cntBaixoAtivo++;
                    else if (newsVal >= 3 && newsVal <= 4) cntMedioAtivo++;
                    else if (newsVal >= 5) cntAltoAtivo++;
                }
            });

            // Soma no contador da esquerda (SEPSE ALTA) se teve alerta automático
            if (cardTemSepseAlerta) {
                totalSepseAtivaNoDia++;
            }

            // Adiciona na lista da direita APENAS se o protocolo foi aberto como "Sim"
            if (cardTemProtocoloSim && dataHoraAberturaStr) {
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
                                // O select "ABERTO PROTOCOLO?" fica na última posição do array de inputs da linha
                                const protocoloManualInput = (inputs[inputs.length - 1] || "").toUpperCase();

                                if (protocoloManualInput === "SIM") {
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

    let saidasDia = { alta: 0, "HC UFU": 0, "Hospital Municipal": 0, "CIP": 0, "CAPS": 0, "UCCI": 0, obito: 0 };
    
    const { data: plantaoHoje } = await _supabase.from('plantoes').select('dados_json').eq('data_chave', dataSelecionadaStr).maybeSingle();
    
    if (plantaoHoje && Array.isArray(plantaoHoje.dados_json)) {
        plantaoHoje.dados_json.forEach(p => {
            const des = p.desfecho || "Internado";
            if (des !== "Internado") {
                if (des === "Alta") saidasDia.alta++;
                else if (des === "Óbito") saidasDia.obito++;
                else if (saidasDia.hasOwnProperty(des)) saidasDia[des]++;
            }
        });
    }

    const elAlta = document.getElementById('saida-alta'); if (elAlta) elAlta.textContent = saidasDia.alta;
    const elHcUfu = document.getElementById('saida-hc-ufu'); if (elHcUfu) elHcUfu.textContent = saidasDia["HC UFU"];
    const elHosp = document.getElementById('saida-hospital-municipal'); if (elHosp) elHosp.textContent = saidasDia["Hospital Municipal"];
    const elCip = document.getElementById('saida-cip'); if (elCip) elCip.textContent = saidasDia["CIP"];
    const elCaps = document.getElementById('saida-caps'); if (elCaps) elCaps.textContent = saidasDia["CAPS"];
    const elUcci = document.getElementById('saida-ucci'); if (elUcci) elUcci.textContent = saidasDia["UCCI"];
    const elObito = document.getElementById('saida-obito'); if (elObito) elObito.textContent = saidasDia.obito;

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

    if (typeof salvarDadosDoDia === 'function' && typeof dataSelecionadaStr !== 'undefined') {
        await salvarDadosDoDia(dataSelecionadaStr);
    }

    const mesAnoChave = dataSelecionadaStr ? dataSelecionadaStr.substring(0, 7) : "2026-09";
    
    const { data: plantoesMes, error } = await _supabase
        .from('plantoes')
        .select('data_chave, dados_json')
        .eq('mes_ano', mesAnoChave);

    if (error) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #dc3545;">Erro ao carregar dados do servidor.</td></tr>`;
        return;
    }

    let auditMesEstavel = 0;
    let auditMesBaixo = 0;
    let auditMesMedio = 0;
    let auditMesAlto = 0;
    
    let auditSaidasMes = {
        alta: 0,
        "HC UFU": 0,
        "Hospital Municipal": 0,
        "CIP": 0,
        "CAPS": 0,
        "UCCI": 0,
        obito: 0
    };

    window.dadosAuditoriaGlobal = [];

    if (plantoesMes) {
        plantoesMes.forEach(plantao => {
            if (plantao.data_chave && plantao.data_chave.startsWith('STATS-')) return;
            const dataPlantao = plantao.data_chave ? plantao.data_chave.split('-').reverse().join('/') : "";
            const pacientes = plantao.dados_json;

            if (Array.isArray(pacientes)) {
                pacientes.forEach(p => {
                    const nome = p.nome ? p.nome.trim() : "";
                    if (nome === "") return;

                    let desfecho = p.desfecho || "Internado";
                    if (desfecho !== "Internado") {
                        if (desfecho === "Alta") auditSaidasMes.alta++;
                        else if (desfecho === "Óbito") auditSaidasMes.obito++;
                        else if (auditSaidasMes.hasOwnProperty(desfecho)) auditSaidasMes[desfecho]++;
                    }

                    let maiorNews = -1; 
                    let temAlertaSepse = "Não";
                    const isento = p.isento || false;

                    if (Array.isArray(p.vitais)) {
                        p.vitais.forEach(v => {
                            const inputs = v.inputs || [];
                            if (inputs.length < 2) return;

                            const valNewsStr = inputs[inputs.length - 2];
                            const valNews = parseInt(valNewsStr);

                            if (valNewsStr !== "" && valNewsStr !== null && !isNaN(valNews)) {
                                if (valNews > maiorNews) {
                                    maiorNews = valNews;
                                }

                                if (!isento && desfecho === "Internado") {
                                    if (valNews <= 1) auditMesEstavel++;
                                    else if (valNews === 2) auditMesBaixo++;
                                    else if (valNews >= 3 && valNews <= 4) auditMesMedio++;
                                    else if (valNews >= 5) auditMesAlto++;
                                }
                            }

                            const protocoloManual = (inputs[inputs.length - 1] || "").toUpperCase();

                            if (inputs.length >= 10) { 
                                const pas = parseFloat(inputs[0]) || 0;
                                const temp = parseFloat(String(inputs[1] || '').replace(',', '.')) || 0;
                                const fr = parseFloat(inputs[2]) || 0;
                                const fc = parseFloat(inputs[3]) || 0;
                                const consc = (inputs[6] || "").toUpperCase();

                                let sirsCount = 0;
                                if (fc > 90) sirsCount++;
                                if (fr > 20) sirsCount++;
                                if (temp > 38.3 || (temp > 0 && temp < 35)) sirsCount++;

                                if (sirsCount >= 2 || consc === "VOZ, DOR OU NÃO REAGE" || (pas > 0 && pas < 90) || protocoloManual === "SIM") {
                                    temAlertaSepse = "Sim";
                                }
                            } else { 
                                if (protocoloManual === "SIM") {
                                    temAlertaSepse = "Sim";
                                }
                            }
                        });
                    }

                    window.dadosAuditoriaGlobal.push({
                        data: dataPlantao,
                        setor: p.setor ? p.setor.toUpperCase() : "GERAL",
                        nome: nome,
                        prontuario: p.prontuario || "---",
                        protocolo: temAlertaSepse,
                        desfecho: desfecho,
                        score: maiorNews === -1 ? "-" : maiorNews,
                        detalhes: p
                    });
                });
            }
        });
    }

    const eEstavel = document.getElementById('mes-estavel');
    const eBaixo = document.getElementById('mes-baixo');
    const eMedio = document.getElementById('mes-medio');
    const eAlto = document.getElementById('mes-alto');

    if (eEstavel) eEstavel.textContent = auditMesEstavel;
    if (eBaixo) eBaixo.textContent = auditMesBaixo;
    if (eMedio) eMedio.textContent = auditMesMedio;
    if (eAlto) eAlto.textContent = auditMesAlto;

    const eAlta = document.getElementById('mes-saida-alta');
    const eHcUfu = document.getElementById('mes-saida-hc-ufu');
    const eHospMunic = document.getElementById('mes-saida-hospital-municipal');
    const eCip = document.getElementById('mes-saida-cip');
    const eCaps = document.getElementById('mes-saida-caps');
    const eUcci = document.getElementById('mes-saida-ucci');
    const eObito = document.getElementById('mes-saida-obito');

    if (eAlta) eAlta.textContent = auditSaidasMes.alta;
    if (eHcUfu) eHcUfu.textContent = auditSaidasMes["HC UFU"];
    if (eHospMunic) eHospMunic.textContent = auditSaidasMes["Hospital Municipal"];
    if (eCip) eCip.textContent = auditSaidasMes["CIP"];
    if (eCaps) eCaps.textContent = auditSaidasMes["CAPS"];
    if (eUcci) eUcci.textContent = auditSaidasMes["UCCI"];
    if (eObito) eObito.textContent = auditSaidasMes.obito;

    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 25px; color: #64748b; font-style: italic;">Dados sincronizados com sucesso! Utilize os filtros acima para exibir os registros.</td></tr>`;
    filtrarTabelaAuditoria();
}

// --- NOVAS FUNÇÕES: SALVAR, PESQUISAR E IMPRIMIR ESCALA ---

async function salvarEscalaAtualSupabase() {
    const tbodyQ2 = document.getElementById('corpo-tabela-quadro2-escala');
    if (!tbodyQ2 || tbodyQ2.querySelector('td[colspan]')) {
        alert("Gere uma escala válida antes de salvar.");
        return;
    }

    const htmlTabela = tbodyQ2.innerHTML;
    const qtdTecnicos = document.getElementById('lbl-qtd-tecnicos-escala').textContent;
    const dataHoraRegistro = new Date().toLocaleString('pt-BR');
    const chaveEscala = `ESCALA-${dataSelecionadaStr}-${Date.now()}`;

    const dadosEscala = {
        data_chave: chaveEscala,
        mes_ano: dataSelecionadaStr.substring(0, 7),
        dados_json: {
            dataPlantao: dataSelecionadaStr,
            criadoEm: dataHoraRegistro,
            qtdTecnicos: qtdTecnicos,
            html: htmlTabela
        },
        updated_at: new Date()
    };

    const { error } = await _supabase.from('plantoes').upsert(dadosEscala, { onConflict: 'data_chave' });

    if (error) {
        console.error("Erro ao salvar escala:", error.message);
        alert("Erro ao salvar a escala no Supabase.");
    } else {
        alert("✅ Escala salva com sucesso!");
        carregarListaHistoricoEscalas();
    }
}

async function carregarListaHistoricoEscalas() {
    const select = document.getElementById('select-historico-escala');
    if (!select) return;

    const mesAnoChave = dataSelecionadaStr.substring(0, 7);
    const { data, error } = await _supabase
        .from('plantoes')
        .select('data_chave, dados_json')
        .like('data_chave', 'ESCALA-%')
        .eq('mes_ano', mesAnoChave);

    select.innerHTML = `<option value="" selected disabled>Pesquisar escalas salvas neste mês...</option>`;

    if (!error && data) {
        data.forEach(item => {
            if (item.dados_json && item.dados_json.criadoEm) {
                const opt = document.createElement('option');
                opt.value = item.data_chave;
                opt.textContent = `Escala de ${item.dados_json.criadoEm} (${item.dados_json.qtdTecnicos} Técnicos)`;
                select.appendChild(opt);
            }
        });
    }
}

async function carregarEscalaSalvaSupabase(chaveEscala) {
    if (!chaveEscala) return;

    const { data, error } = await _supabase
        .from('plantoes')
        .select('dados_json')
        .eq('data_chave', chaveEscala)
        .maybeSingle();

    if (!error && data && data.dados_json) {
        const tbodyQ2 = document.getElementById('corpo-tabela-quadro2-escala');
        const lblQtd = document.getElementById('lbl-qtd-tecnicos-escala');
        
        if (tbodyQ2 && data.dados_json.html) {
            tbodyQ2.innerHTML = data.dados_json.html;
            if (lblQtd) lblQtd.textContent = data.dados_json.qtdTecnicos || "0";
            alert("📂 Escala carregada com sucesso!");
        }
    }
}

function imprimirEscalaDimensionamento() {
    const conteudo = document.getElementById('area-impressao-escala');
    if (!conteudo) return;

    const janelaImpressao = window.open('', '', 'height=700,width=1000');
    janelaImpressao.document.write('<html><head><title>Escala de Dimensionamento - Cofen 743/2024</title>');
    janelaImpressao.document.write('<style>');
    
    janelaImpressao.document.write('@page { size: A4 landscape; margin: 10mm; }');
    janelaImpressao.document.write('body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #333; -webkit-print-color-adjust: exact; print-color-adjust: exact; }');
    
    janelaImpressao.document.write('* { box-sizing: border-box; }');
    janelaImpressao.document.write('div { overflow: visible !important; width: 100% !important; max-width: 100% !important; }');
    
    janelaImpressao.document.write('table { width: 100% !important; border-collapse: collapse; margin-top: 10px; font-size: 11px; }');
    
    janelaImpressao.document.write('th, td { border: 1px solid #cbd5e1; padding: 6px 4px; text-align: center !important; vertical-align: middle; }');
    janelaImpressao.document.write('th { background-color: #0f766e !important; color: white !important; font-size: 10px; }');
    
    janelaImpressao.document.write('th:nth-child(1), td:nth-child(1), th:nth-child(7), td:nth-child(7), th:nth-child(8), td:nth-child(8), th:nth-child(9), td:nth-child(9) { white-space: nowrap; }');
    
    janelaImpressao.document.write('th:nth-child(1) { width: 3%; }');
    janelaImpressao.document.write('th:nth-child(2) { width: 15%; }');
    janelaImpressao.document.write('th:nth-child(3) { width: 32%; }');
    janelaImpressao.document.write('th:nth-child(4) { width: 10%; }');
    janelaImpressao.document.write('th:nth-child(5) { width: 8%; }');
    janelaImpressao.document.write('th:nth-child(6) { width: 14%; }');
    janelaImpressao.document.write('th:nth-child(7) { width: 6%; }');
    janelaImpressao.document.write('th:nth-child(8) { width: 6%; }');
    janelaImpressao.document.write('th:nth-child(9) { width: 6%; }');

    janelaImpressao.document.write('h2 { color: #003366; margin: 0 0 4px 0; font-size: 16px; }');
    janelaImpressao.document.write('p { font-size: 11px; margin: 0 0 10px 0; color: #475569; }');
    
    janelaImpressao.document.write('</style></head><body>');
    janelaImpressao.document.write('<h2>Escala de Dimensionamento de Pessoal de Enfermagem</h2>');
    janelaImpressao.document.write(`<p>Referência: Resolução Cofen nº 743/2024 | Data do Plantão: ${dataSelecionadaStr.split('-').reverse().join('/')}</p>`);
    
    janelaImpressao.document.write(conteudo.innerHTML);
    
    janelaImpressao.document.write('</body></html>');
    janelaImpressao.document.close();
    janelaImpressao.focus();
    setTimeout(() => {
        janelaImpressao.print();
    }, 500);
}

function atualizarListaPacientesDimensionamento() {
    const tbody = document.getElementById('corpo-tabela-quadro1-geral');
    if (!tbody) return;

    const tabelaQuadro1 = document.getElementById('area-impressao-escala')?.querySelector('table') || tbody.closest('table');
    if (tabelaQuadro1) {
        const thead = tabelaQuadro1.querySelector('thead tr');
        if (thead) {
            thead.innerHTML = `
                <th style="width: 140px; padding: 10px; text-align: center; background: #003366; color: #fff;">ENFERMARIA / SETOR</th>
                <th style="padding: 10px; text-align: center; background: #003366; color: #fff;">NOME DO PACIENTE</th>
                <th style="width: 130px; padding: 10px; text-align: center; background: #003366; color: #fff;">BANHO / CUIDADO</th>
                <th style="width: 100px; padding: 10px; text-align: center; background: #003366; color: #fff;">DIETA ASSIST.</th>
                <th style="width: 100px; padding: 10px; text-align: center; background: #003366; color: #fff;">RISCO LESÃO</th>
                <th style="width: 130px; padding: 10px; text-align: center; background: #003366; color: #fff;">SCP (GRAU)</th>
                <th style="width: 80px; padding: 10px; text-align: center; background: #003366; color: #fff;">HORAS REF.</th>
                <th style="width: 90px; padding: 10px; text-align: center; background: #003366; color: #fff;">HORAS PACIENTE</th>
                <th style="width: 70px; padding: 10px; text-align: center; background: #003366; color: #fff;">AÇÃO</th>
            `;
        }
    }

    tbody.innerHTML = '';
    let totalPacientesEncontrados = 0;
    const setoresIds = ['enf1', 'enf2', 'enf3', 'enf4', 'enf5', 'corredor', 'enf-pediatria', 'sala-emergencia'];

    function converterDecimalParaSegundos(strHoras) {
        if (!strHoras) return 4824; 
        let num = parseFloat(String(strHoras).replace(':', '').replace('h', '').replace(',', '.'));
        if (isNaN(num)) num = 1.34;
        return Math.round(num * 3600);
    }

    function formatarSegundosParaHHMMSS(totalSegundos) {
        const horas = Math.floor(totalSegundos / 3600);
        const minutos = Math.floor((totalSegundos % 3600) / 60);
        const segundos = totalSegundos % 60;
        return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
    }

    setoresIds.forEach(idSetor => {
        const aba = document.getElementById(idSetor);
        if (!aba) return;

        let nomeSetorFormatado = idSetor.toUpperCase();
        if (idSetor.startsWith('enf') && idSetor !== 'enf-pediatria') {
            nomeSetorFormatado = idSetor.replace('enf', 'ENFERMARIA ');
        } else if (idSetor === 'corredor') {
            nomeSetorFormatado = 'CORREDOR / ISOLAMENTO';
        } else if (idSetor === 'enf-pediatria') {
            nomeSetorFormatado = 'ENFERMARIA PEDIÁTRICA';
        } else if (idSetor === 'sala-emergencia') {
            nomeSetorFormatado = 'SALA DE EMERGÊNCIA';
        }

        aba.querySelectorAll('.patient-card').forEach((card, index) => {
            const nomeInput = card.querySelector('.nome-input');
            const nomePaciente = nomeInput ? nomeInput.value.trim() : "";

            if (nomePaciente !== "") {
                totalPacientesEncontrados++;

                const banho = card.querySelector('.input-banho-paciente')?.value || "-";
                const dieta = card.querySelector('.input-dieta-paciente')?.value || "NÃO";
                const lesao = card.querySelector('.input-lesao-paciente')?.value || "NÃO";
                const scpSelect = card.querySelector('.input-scp-paciente');
                
                let horasBaseNum = 1.34; 
                const valScp = scpSelect ? scpSelect.value : "minimo";
                
                if (valScp === 'intensivo') horasBaseNum = 4.3;
                else if (valScp === 'semi') horasBaseNum = 2.9;
                else if (valScp === 'alta') horasBaseNum = 3.2;
                else if (valScp === 'intermediario') horasBaseNum = 2.01;
                else if (valScp === 'minimo') horasBaseNum = 1.34;

                const horasRefStr = horasBaseNum.toFixed(2).replace('.', ',');
                const segundosTotais = converterDecimalParaSegundos(horasBaseNum);
                const horasPacienteStr = formatarSegundosParaHHMMSS(segundosTotais);

                const optsBanho = ['-', 'Aspersão', 'Leito Diá', 'Leito Noite', 'Auxílio Dia', 'Auxílio Noite']
                    .map(o => `<option value="${o}" ${banho === o ? 'selected' : ''}>${o}</option>`).join('');
                
                const optsDieta = ['NÃO', 'SIM']
                    .map(o => `<option value="${o}" ${dieta === o ? 'selected' : ''}>${o}</option>`).join('');
                
                const optsLesao = ['NÃO', 'SIM']
                    .map(o => `<option value="${o}" ${lesao === o ? 'selected' : ''}>${o}</option>`).join('');
                
                const scpArr = [
                    { v: 'intensivo', t: 'INTENSIVOS (4,3h)' },
                    { v: 'semi', t: 'SEMI-INTENSIVO (2,9h)' },
                    { v: 'alta', t: 'ALTA DEP. (3,2h)' },
                    { v: 'intermediario', t: 'INTERMEDIÁRIOS (2,01h)' },
                    { v: 'minimo', t: 'MÍNIMOS (1,34h)' }
                ];
                const optsScp = scpArr.map(o => `<option value="${o.v}" ${valScp === o.v ? 'selected' : ''}>${o.t}</option>`).join('');

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${nomeSetorFormatado}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold;">${nomePaciente.toUpperCase()}</td>
                    <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; text-align: center;">
                        <select onchange="sincronizarAlteracaoDimensionamento('${idSetor}', ${index}, 'banho', this.value)" style="padding:4px; font-size:0.75rem; border:1px solid #cbd5e1; border-radius:4px; width:100%; text-align:center; cursor:pointer;">${optsBanho}</select>
                    </td>
                    <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; text-align: center;">
                        <select onchange="sincronizarAlteracaoDimensionamento('${idSetor}', ${index}, 'dieta', this.value)" style="padding:4px; font-size:0.75rem; border:1px solid #cbd5e1; border-radius:4px; width:100%; text-align:center; cursor:pointer; color: ${dieta === 'SIM' ? '#b45309' : 'inherit'};">${optsDieta}</select>
                    </td>
                    <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; text-align: center;">
                        <select onchange="sincronizarAlteracaoDimensionamento('${idSetor}', ${index}, 'lesao', this.value)" style="padding:4px; font-size:0.75rem; border:1px solid #cbd5e1; border-radius:4px; width:100%; text-align:center; cursor:pointer;">${optsLesao}</select>
                    </td>
                    <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; text-align: center;">
                        <select onchange="sincronizarAlteracaoDimensionamento('${idSetor}', ${index}, 'scp', this.value)" style="padding:4px; font-size:0.75rem; border:1px solid #cbd5e1; border-radius:4px; width:100%; text-align:center; cursor:pointer; background-color: #f8fafc;">${optsScp}</select>
                    </td>
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${horasRefStr}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #003366; background-color: #f1f5f9;">${horasPacienteStr}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">
                        <button type="button" onclick="this.closest('tr').remove()" style="background:#ff4d4d; color:#000; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-weight: bold;">✖</button>
                    </td>
                `;
                tbody.appendChild(tr);
            }
        });
    });
}

// --- FUNÇÕES DO MODAL E GERAÇÃO DA ESCALA TÉCNICA ---

function abrirModalGerarEscalaTecnica() {
    const modal = document.getElementById('modal-gerar-escala-tec');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function fecharModalGerarEscalaTecnica() {
    const modal = document.getElementById('modal-gerar-escala-tec');
    if (modal) {
        modal.style.display = 'none';
    }
}

function executarGeracaoEscalaTecnica() {
    const textarea = document.getElementById('textarea-nomes-tecnicos');
    if (!textarea) return;

    const textoNomes = textarea.value.trim();
    if (textoNomes === "") {
        alert("Por favor, informe ao menos um técnico de enfermagem.");
        return;
    }

    const tecnicos = textoNomes
        .split(/,|\n/)
        .map(t => t.trim().toUpperCase())
        .filter(t => t !== "");

    if (tecnicos.length === 0) {
        alert("Nenhum técnico válido encontrado.");
        return;
    }

    const tbodyQuadro1 = document.getElementById('corpo-tabela-quadro1-geral');
    if (!tbodyQuadro1) return;

    const linhasPacientes = tbodyQuadro1.querySelectorAll('tr');
    let listaPacientes = [];

    linhasPacientes.forEach(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length >= 8) {
            const obterValor = (td) => {
                const select = td.querySelector('select');
                if (select) {
                    return select.options[select.selectedIndex].text;
                }
                return td.textContent.trim();
            };

            const scpStr = obterValor(tds[5]);
            const banhoStr = obterValor(tds[2]);
            const lesaoStr = obterValor(tds[4]);
            const horasPac = obterValor(tds[7]);

            let segundos = 4824;
            if (horasPac.includes(':')) {
                const partes = horasPac.split(':').map(Number);
                segundos = (partes[0] * 3600) + (partes[1] * 60) + (partes[2] || 0);
            }

            const isComplexo = scpStr.includes('INTENSIVO') || 
                               scpStr.includes('ALTA DEP') || 
                               banhoStr.includes('Leito') || 
                               lesaoStr === 'SIM';

            listaPacientes.push({
                setor: obterValor(tds[0]),
                nome: obterValor(tds[1]),
                banho: banhoStr,
                dieta: obterValor(tds[3]),
                lesao: lesaoStr,
                scp: scpStr,
                horasRef: obterValor(tds[6]),
                horasPaciente: horasPac,
                segundosTotais: segundos,
                isComplexo: isComplexo
            });
        }
    });

    if (listaPacientes.length === 0) {
        alert("Nenhum paciente carregado na Relação Geral. Clique primeiro em 'Atualizar Lista de Pacientes'.");
        fecharModalGerarEscalaTecnica();
        return;
    }

    let pacientesComplexos = listaPacientes.filter(p => p.isComplexo).sort((a, b) => b.segundosTotais - a.segundosTotais);
    let pacientesGerais = listaPacientes.filter(p => !p.isComplexo).sort((a, b) => b.segundosTotais - a.segundosTotais);

    const tabelaQuadro2Div = document.getElementById('area-impressao-escala');
    if (tabelaQuadro2Div) {
        const theadQ2 = tabelaQuadro2Div.querySelector('thead tr');
        if (theadQ2) {
            theadQ2.innerHTML = `
                <th style="width: 45px; padding: 10px; text-align: center;">Nº</th>
                <th style="width: 160px; padding: 10px; text-align: center;">TÉCNICO RESPONSÁVEL</th>
                <th style="padding: 10px; text-align: center;">PACIENTE ALOCADO</th>
                <th style="width: 130px; padding: 10px; text-align: center;">BANHO / CUIDADO</th>
                <th style="width: 100px; padding: 10px; text-align: center;">DIETA ASSIST.</th>
                <th style="width: 90px; padding: 10px; text-align: center;">RISCO LESÃO</th>
                <th style="width: 130px; padding: 10px; text-align: center;">SCP (GRAU)</th>
                <th style="width: 90px; padding: 10px; text-align: center;">HORAS REF.</th>
                <th style="width: 90px; padding: 10px; text-align: center;">HORAS PACIENTE</th>
                <th style="width: 100px; background: #0d5e56; color: #fff; padding: 10px; text-align: center;">TOTAL JORNADA</th>
            `;
        }
    }

    const tbodyQuadro2 = document.getElementById('corpo-tabela-quadro2-escala');
    const lblQtdTecnicos = document.getElementById('lbl-qtd-tecnicos-escala');
    if (!tbodyQuadro2) return;

    tbodyQuadro2.innerHTML = '';
    
    let distribuicao = {};
    tecnicos.forEach(tec => {
        distribuicao[tec] = { pacientes: [], somaSegundos: 0, qtdComplexos: 0 };
    });

    pacientesComplexos.forEach(pac => {
        let tecEscolhido = tecnicos[0];
        let menorComplexos = distribuicao[tecEscolhido].qtdComplexos;
        let menorCarga = distribuicao[tecEscolhido].somaSegundos;

        tecnicos.forEach(tec => {
            if (distribuicao[tec].qtdComplexos < menorComplexos || 
               (distribuicao[tec].qtdComplexos === menorComplexos && distribuicao[tec].somaSegundos < menorCarga)) {
                menorComplexos = distribuicao[tec].qtdComplexos;
                menorCarga = distribuicao[tec].somaSegundos;
                tecEscolhido = tec;
            }
        });

        distribuicao[tecEscolhido].pacientes.push(pac);
        distribuicao[tecEscolhido].somaSegundos += pac.segundosTotais;
        distribuicao[tecEscolhido].qtdComplexos++;
    });

    pacientesGerais.forEach(pac => {
        let tecMaisLivre = tecnicos[0];
        let menorCarga = distribuicao[tecMaisLivre].somaSegundos;

        tecnicos.forEach(tec => {
            if (distribuicao[tec].somaSegundos < menorCarga) {
                menorCarga = distribuicao[tec].somaSegundos;
                tecMaisLivre = tec;
            }
        });

        distribuicao[tecMaisLivre].pacientes.push(pac);
        distribuicao[tecMaisLivre].somaSegundos += pac.segundosTotais;
    });

    function formatarSegundosParaHHMMSS(totalSegundos) {
        const horas = Math.floor(totalSegundos / 3600);
        const minutos = Math.floor((totalSegundos % 3600) / 60);
        const segundos = totalSegundos % 60;
        return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
    }

    let contadorN = 1;
    let htmlQuadro2 = '';

    Object.keys(distribuicao).forEach(tec => {
        const dadosTec = distribuicao[tec];
        const qtdPacs = dadosTec.pacientes.length;
        const jornadaFormatada = formatarSegundosParaHHMMSS(dadosTec.somaSegundos);

        if (qtdPacs === 0) {
            htmlQuadro2 += `
                <tr>
                    <td style="text-align: center; padding: 8px; border-bottom: 1px solid #cbd5e1;">${contadorN++}</td>
                    <td style="text-align: center; padding: 8px; border-bottom: 1px solid #cbd5e1; font-weight: bold;">${tec}</td>
                    <td colspan="7" style="text-align: center; padding: 8px; border-bottom: 1px solid #cbd5e1; color: #64748b; font-style: italic;">Nenhum paciente alocado</td>
                    <td style="text-align: center; padding: 8px; border-bottom: 1px solid #cbd5e1; font-weight: bold; background: #f8fafc;">00:00:00</td>
                </tr>
            `;
        } else {
            dadosTec.pacientes.forEach((pac, index) => {
                let primeiraLinhaHtml = '';
                if (index === 0) {
                    primeiraLinhaHtml = `
                        <td rowspan="${qtdPacs}" style="text-align: center; padding: 8px; border-bottom: 2px solid #94a3b8; vertical-align: middle;">${contadorN++}</td>
                        <td rowspan="${qtdPacs}" style="text-align: center; padding: 8px; border-bottom: 2px solid #94a3b8; vertical-align: middle; font-weight: bold;">${tec}</td>
                    `;
                }

                const bordaExtra = (index === qtdPacs - 1) ? 'border-bottom: 2px solid #94a3b8;' : 'border-bottom: 1px solid #e2e8f0;';
                
                let numRef = parseFloat(String(pac.horasRef || "1,34").replace(',', '.'));
                if (isNaN(numRef)) numRef = 1.34;
                const horasRefFormatada = numRef.toFixed(2).replace('.', ',');

                htmlQuadro2 += `
                    <tr>
                        ${primeiraLinhaHtml}
                        <td style="text-align: center; padding: 6px 8px; ${bordaExtra}"><strong>${pac.nome}</strong> <span style="font-size:0.75rem; color:#64748b;">(${pac.setor})</span></td>
                        <td style="text-align: center; padding: 6px 8px; ${bordaExtra}">${pac.banho}</td>
                        <td style="text-align: center; padding: 6px 8px; ${bordaExtra}; font-weight: 600; color: ${pac.dieta === 'SIM' ? '#b45309' : 'inherit'};">${pac.dieta}</td>
                        <td style="text-align: center; padding: 6px 8px; ${bordaExtra}">${pac.lesao}</td>
                        <td style="text-align: center; padding: 6px 8px; ${bordaExtra}">${pac.scp}</td>
                        <td style="text-align: center; padding: 6px 8px; ${bordaExtra}">${horasRefFormatada}</td>
                        <td style="text-align: center; padding: 6px 8px; ${bordaExtra}; font-weight: bold;">${pac.horasPaciente}</td>
                `;

                if (index === 0) {
                    htmlQuadro2 += `
                        <td rowspan="${qtdPacs}" style="text-align: center; padding: 8px; border-bottom: 2px solid #94a3b8; vertical-align: middle; font-weight: bold; background: #f0fdf4; color: #166534; font-size: 0.9rem;">
                            ${jornadaFormatada}
                        </td>
                    `;
                }

                htmlQuadro2 += `</tr>`;
            });
        }
    });

    tbodyQuadro2.innerHTML = htmlQuadro2;
    if (lblQtdTecnicos) lblQtdTecnicos.textContent = tecnicos.length;

    fecharModalGerarEscalaTecnica();
    alert("✅ Escala gerada com sucesso!");
}

window.sincronizarAlteracaoDimensionamento = function(idSetor, indexCard, tipo, valor) {
    const aba = document.getElementById(idSetor);
    if (!aba) return;
    
    const cards = aba.querySelectorAll('.patient-card');
    if (!cards[indexCard]) return;
    
    const card = cards[indexCard];
    
    if (tipo === 'banho') {
        const el = card.querySelector('.input-banho-paciente');
        if (el) el.value = valor;
    } else if (tipo === 'dieta') {
        const el = card.querySelector('.input-dieta-paciente');
        if (el) el.value = valor;
    } else if (tipo === 'lesao') {
        const el = card.querySelector('.input-lesao-paciente');
        if (el) el.value = valor;
    } else if (tipo === 'scp') {
        const el = card.querySelector('.input-scp-paciente');
        if (el) {
            el.value = valor;
            if (typeof atualizarCorSelectScp === 'function') {
                atualizarCorSelectScp(el);
            }
        }
    }
    
    if (typeof salvarDadosDoDia === 'function') {
        salvarDadosDoDia(dataSelecionadaStr);
    }
    
    atualizarListaPacientesDimensionamento();
};

function filtrarTabelaAuditoria() {
    const tbody = document.getElementById('corpo-tabela-auditoria');
    if (!tbody) return;

    const selectStatus = document.getElementById('filtro-auditoria-status') || document.querySelector('#aba-auditoria-sepse select');
    const inputBusca = document.getElementById('filtro-auditoria-texto') || document.querySelector('#aba-auditoria-sepse input[type="text"]');

    const criterioStatus = selectStatus ? selectStatus.value.trim().toLowerCase() : "";
    const termoBusca = inputBusca ? inputBusca.value.trim().toLowerCase() : "";

    if ((!criterioStatus || criterioStatus === "" || criterioStatus.includes("selecione") || criterioStatus.includes("todos") || criterioStatus.includes("filtrar")) && termoBusca === "") {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 25px; color: #64748b; font-style: italic;">Selecione um status no filtro acima ou digite para buscar registros.</td></tr>`;
        return;
    }

    if (!window.dadosAuditoriaGlobal || window.dadosAuditoriaGlobal.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #64748b; font-style: italic;">Nenhum registro encontrado para este mês. Clique em "Atualizar Dados".</td></tr>`;
        return;
    }

    const filtrados = window.dadosAuditoriaGlobal.filter(item => {
        const nomeMatch = item.nome.toLowerCase().includes(termoBusca) || item.prontuario.toLowerCase().includes(termoBusca);
        
        if (!nomeMatch && termoBusca !== "") return false;

        if (!criterioStatus || criterioStatus === "" || criterioStatus.includes("selecione") || criterioStatus.includes("todos") || criterioStatus.includes("filtrar")) {
            return true;
        }

        const scoreNum = parseInt(item.score);
        const hasScore = !isNaN(scoreNum) && item.score !== "-";

        if (criterioStatus.includes("sepse") && item.protocolo.toLowerCase() === "sim") return true;
        if (criterioStatus.includes("alta") && item.desfecho.toLowerCase().includes("alta")) return true;
        if (criterioStatus.includes("transferido") && item.desfecho.toLowerCase() !== "internado" && !item.desfecho.toLowerCase().includes("alta") && !item.desfecho.toLowerCase().includes("óbito")) return true;
        if (criterioStatus.includes("obito") && item.desfecho.toLowerCase().includes("óbito")) return true;
        
        if (criterioStatus.includes("alto") && hasScore && scoreNum >= 5) return true;
        if (criterioStatus.includes("medio") && hasScore && scoreNum >= 3 && scoreNum <= 4) return true;
        if (criterioStatus.includes("baixo") && hasScore && scoreNum === 2) return true;
        if (criterioStatus.includes("estavel") && hasScore && scoreNum <= 1) return true;

        return false;
    });

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #dc3545; font-style: italic;">Nenhum registro corresponde ao filtro selecionado.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtrados.map(item => `
        <tr>
            <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">${item.data}</td>
            <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">${item.setor}</td>
            <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${item.nome}</td>
            <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">${item.prontuario}</td>
            <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0; color: ${item.protocolo === 'Sim' ? '#dc3545' : 'inherit'}; font-weight: ${item.protocolo === 'Sim' ? 'bold' : 'normal'};">${item.protocolo}</td>
            <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">${item.desfecho}</td>
        </tr>
    `).join('');
}

document.addEventListener("DOMContentLoaded", () => {
    const inputBuscaAuditoria = document.getElementById('filtro-auditoria-texto') || document.querySelector('#aba-auditoria-sepse input[type="text"]');
    const selectStatusAuditoria = document.getElementById('filtro-auditoria-status') || document.querySelector('#aba-auditoria-sepse select');

    if (inputBuscaAuditoria) {
        inputBuscaAuditoria.addEventListener('input', filtrarTabelaAuditoria);
    }
    if (selectStatusAuditoria) {
        selectStatusAuditoria.addEventListener('change', filtrarTabelaAuditoria);
    }
});
