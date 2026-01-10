// multiplayer.js - Sincronização do jogo multiplayer

let socket = null;
let modoMultiplayer = false;
let codigoSala = null;
let meuSocketId = null;

// Inicializar multiplayer se vier do lobby
function inicializarMultiplayer() {
    modoMultiplayer = sessionStorage.getItem('modoMultiplayer') === 'true';
    
    if (modoMultiplayer) {
        codigoSala = sessionStorage.getItem('codigoSala');
        const jogadoresData = JSON.parse(sessionStorage.getItem('jogadoresMultiplayer'));
        
        // Conectar ao socket
        socket = io();
        meuSocketId = jogadoresData.find(j => j.id === socket.id)?.id || socket.id;
        
        // Configurar jogadores baseado nos dados do lobby
        configurarJogadoresMultiplayer(jogadoresData);
        
        // Escutar eventos
        configurarEventosSocket();
        
        console.log('🎮 Modo Multiplayer ativo');
    } else {
        console.log('🎮 Modo Local ativo');
    }
}

function configurarJogadoresMultiplayer(jogadoresData) {
    // Atualizar array de jogadores com dados do lobby
    jogadores = jogadoresData.map(j => ({
        id: j.ordem,
        ordem: j.ordem,
        nome: j.nome,
        personagem: j.personagem,
        socketId: j.id,
        tileId: null
    }));
    
    // Não embaralhar novamente, manter ordem definida pelo servidor
    jogadorAtualIndex = 0;
    
    // Atualizar labels dos jogadores na UI
    atualizarLabelsJogadores();
}

function atualizarLabelsJogadores() {
    jogadores.forEach((jogador) => {
        const label = document.querySelector(`#jogador-${jogador.id} .zona-label`);
        if (label) {
            label.textContent = jogador.personagem || `Jogador ${jogador.id}`;
        }
    });
}

function configurarEventosSocket() {
    // Receber ações de outros jogadores
    socket.on('acao-jogo', (dados) => {
        console.log('📨 Ação recebida:', dados);
        processarAcaoRemota(dados);
    });
    
    socket.on('jogador-saiu', (dados) => {
        mostrarMensagemJogo(`${dados.nome} desconectou`);
    });
}

// Enviar ação para outros jogadores
function enviarAcao(tipo, dados) {
    if (!modoMultiplayer || !socket) return;
    
    socket.emit('acao-jogo', {
        codigoSala,
        tipo,
        dados,
        timestamp: Date.now()
    });
}

// Processar ação recebida de outro jogador
function processarAcaoRemota(acao) {
    switch (acao.tipo) {
        case 'colocar-tile':
            processarColocarTileRemoto(acao.dados);
            break;
        case 'mover-jogador':
            processarMoverJogadorRemoto(acao.dados);
            break;
        case 'passar-turno':
            processarPassarTurnoRemoto();
            break;
        case 'comprar-carta':
            processarComprarCartaRemoto(acao.dados);
            break;
        case 'atualizar-contador':
            processarAtualizarContadorRemoto(acao.dados);
            break;
        default:
            console.warn('Tipo de ação desconhecida:', acao.tipo);
    }
}

// Implementações remotas
function processarColocarTileRemoto(dados) {
    const { linha, coluna, tipo, rotacao } = dados;
    
    // Colocar tile na matriz
    tabuleiroMatriz[linha][coluna] = tipo;
    
    // Renderizar
    const celula = tabuleiro.children[linha * TAMANHO + coluna];
    if (celula) {
        const tile = criarTileElemento(tipo, rotacao);
        celula.innerHTML = '';
        celula.appendChild(tile);
    }
}

function processarMoverJogadorRemoto(dados) {
    const { jogadorId, linha, coluna } = dados;
    
    const jogador = jogadores.find(j => j.id === jogadorId);
    if (jogador) {
        const tileId = `${linha}-${coluna}`;
        jogador.tileId = tileId;
        
        // Atualizar posição visual
        desenharJogadores();
    }
}

function processarPassarTurnoRemoto() {
    proximoTurno();
}

function processarComprarCartaRemoto(dados) {
    const { jogadorId, tipoCarta, carta } = dados;
    // Atualizar UI de cartas se necessário
    console.log(`Jogador ${jogadorId} comprou carta:`, carta);
}

function processarAtualizarContadorRemoto(dados) {
    const { jogadorId, tipo, valor } = dados;
    
    const elementoValor = document.getElementById(`${tipo}-${jogadorId}-valor`);
    if (elementoValor) {
        elementoValor.textContent = valor;
    }
}

// Wrapper para funções existentes
function colocarTileMultiplayer(linha, coluna, tipo, rotacao) {
    // Executar localmente
    // (sua lógica existente)
    
    // Enviar para outros jogadores
    enviarAcao('colocar-tile', { linha, coluna, tipo, rotacao });
}

function moverJogadorMultiplayer(jogadorId, linha, coluna) {
    // Executar localmente
    // (sua lógica existente)
    
    // Enviar para outros jogadores
    enviarAcao('mover-jogador', { jogadorId, linha, coluna });
}

function passarTurnoMultiplayer() {
    // Executar localmente
    proximoTurno();
    
    // Enviar para outros jogadores
    enviarAcao('passar-turno', {});
}

function atualizarContadorMultiplayer(jogadorId, tipo, valor) {
    // Executar localmente
    // (já atualizado na UI)
    
    // Enviar para outros jogadores
    enviarAcao('atualizar-contador', { jogadorId, tipo, valor });
}

// Verificar se é a vez do jogador local
function ehMinhavez() {
    if (!modoMultiplayer) return true; // Modo local, sempre pode jogar
    
    const jogadorAtivo = jogadorAtual();
    return jogadorAtivo.socketId === socket.id;
}

// Mostrar mensagem no jogo
function mostrarMensagemJogo(mensagem) {
    // Criar elemento de notificação se não existir
    let notif = document.getElementById('notif-jogo');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'notif-jogo';
        notif.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            z-index: 10000;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(notif);
    }
    
    notif.textContent = mensagem;
    notif.style.opacity = '1';
    
    setTimeout(() => {
        notif.style.opacity = '0';
    }, 3000);
}

// Inicializar quando o script carregar
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(inicializarMultiplayer, 100);
    });
}
