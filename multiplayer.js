// multiplayer.js - Sincronização do jogo multiplayer

// Socket será definido no script.js
let modoMultiplayer = false;
let codigoSala = null;
let meuSocketId = null;
let jogoInicializado = false; // Flag para prevenir inicialização dupla

// Inicializar multiplayer se vier do lobby
function inicializarMultiplayer() {
    modoMultiplayer = sessionStorage.getItem('modoMultiplayer') === 'true';
    
    if (modoMultiplayer) {
        codigoSala = sessionStorage.getItem('codigoSala');
        const jogadoresData = JSON.parse(sessionStorage.getItem('jogadoresMultiplayer'));
        
        // Usar socket criado no script.js
        if (typeof window.socket === 'undefined' || !window.socket) {
            console.error('Socket não encontrado!');
            return;
        }
        
        // Criar referência global ao socket
        if (typeof socket === 'undefined') {
            window.socket = window.socket; // Garantir que está acessível
        }
        
        // Socket já está conectado (chamado do evento 'connect')
        if (!jogoInicializado) {
            inicializarJogoMultiplayer(jogadoresData);
        }
        
        console.log('🎮 Modo Multiplayer ativo');
    } else {
        console.log('🎮 Modo Local ativo');
    }
}

function inicializarJogoMultiplayer(jogadoresData) {
    if (jogoInicializado) {
        return;
    }
    jogoInicializado = true;
    
    const socket = window.socket;
    meuSocketId = socket.id;
    console.log('Inicializando multiplayer - Sala:', codigoSala);
    
    // 🔥 Limpar estado local antigo ao entrar do lobby (não é um reload)
    const foiReload = performance.navigation && performance.navigation.type === 1;
    if (!foiReload) {
        console.log('🗑️ Limpando estado local (vindo do lobby)...');
        localStorage.removeItem('labirinto-hidra-estado');
    } else {
        console.log('🔄 RELOAD DETECTADO - Solicitando estado atual do servidor...');
    }
    
    // Primeiro configurar eventos para receber respostas
    configurarEventosSocket();
    
    // Depois reentrar na sala
    socket.emit('reconectar-sala', { 
        codigoSala: codigoSala,
        socketId: meuSocketId
    });
    
    // 🔥 Se foi reload, solicitar estado atual explicitamente
    if (foiReload) {
        socket.emit('solicitar-tabuleiro', { codigoSala: codigoSala });
    }
        
    // Configurar jogadores baseado nos dados do lobby
    configurarJogadoresMultiplayer(jogadoresData);
    
    // Verificar se sou o host pela ordem salva
    const minhaOrdem = parseInt(sessionStorage.getItem('minhaOrdem')) || 1;
    
    // Flag para controlar se já recebeu tabuleiro do servidor
    let tabuleiroRecebido = false;
    let estadoSalaRecebido = null;
    
    // Função global para atualizar estado da sala recebido
    window.atualizarEstadoSalaRecebido = (estado) => {
        estadoSalaRecebido = estado;
        console.log('📥 Estado da sala atualizado:', estadoSalaRecebido);
    };
    
    // Timeout: se servidor não responder E não houver jogo em andamento, aguardar
    const timeoutEsperaServidor = setTimeout(() => {
        // Aguardar eventos do servidor
    }, 5000); // Aumentado de 1000ms para 5000ms para ambientes remotos
    
    // Função global para cancelar timeout
    window.marcarTabuleiroRecebido = () => {
        tabuleiroRecebido = true;
        clearTimeout(timeoutEsperaServidor);
    };
}

function gerarTabuleiroHost() {
    console.log('🏗️ [HOST] Gerando tabuleiro...');
    
    gerarMatriz();
    criarTabuleiro();
    
    const tilesEstadoCompleto = [];
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach(tile => {
        if (tile.dataset.id) {
            tilesEstadoCompleto.push({
                id: tile.dataset.id,
                tipo: tile.tipo,
                rotacao: tile.rotacao || 0
            });
        }
    });
    console.log('📍 Tiles capturados:', tilesEstadoCompleto.length);
    
    // Inicializar jogadores na entrada usando a posição
    let tileEntrada = null;
    if (entradaPosicao) {
        const entradaId = `${entradaPosicao.linha}-${entradaPosicao.coluna}`;
        tileEntrada = document.querySelector(`.tile[data-id="${entradaId}"]`);
    }
    
    if (!tileEntrada) {
        tileEntrada = Array.from(tiles).find(t => t.tipo === 'entrada');
    }
    
    if (tileEntrada) {
        jogadores.forEach(j => {
            j.tile = tileEntrada;
            j.tileId = tileEntrada.dataset.id;
        });
        desenharJogadores();
    }
    
    // Inicializar e distribuir cartas
    inicializarCartas();
    renderizarCartas();
    distribuirCartasNasCamaras(3, 5);
    
    // Capturar estado das cartas após distribuição
    const cartasEstado = Array.from(cartas.values()).map(c => ({
        id: c.id,
        tipo: c.tipo,
        nome: c.nome,
        zona: c.zona,
        faceUp: c.faceUp,
        dono: c.dono,
        efeito: c.efeito,
        imagem: c.imagem,
        imagemMiniatura: c.imagemMiniatura
    }));
    
    // Determinar jogador inicial baseado na ordemJogada atribuída pelo servidor
    // O jogador com ordemJogada === 1 começa
    console.log('🔍 DEBUG gerarTabuleiroHost - Jogadores antes de buscar ordemJogada=1:', 
        jogadores.map(j => `${j.nome} ID:${j.id} ordemJogada:${j.ordemJogada}`));
    
    jogadorAtualIndex = jogadores.findIndex(j => j.ordemJogada === 1);
    if (jogadorAtualIndex === -1) {
        console.warn('⚠️ Nenhum jogador com ordemJogada=1 encontrado! Usando índice 0 como fallback');
        jogadorAtualIndex = 0;
    }
    console.log(`🎲 Jogador inicial determinado: índice ${jogadorAtualIndex} - ${jogadores[jogadorAtualIndex]?.nome} (ordemJogada: ${jogadores[jogadorAtualIndex]?.ordemJogada})`);
    
    // ordemJogada já foi definida pelo servidor, não recalcular
    console.log('📋 Ordem de jogo:', jogadores.map(j => `${j.nome}:${j.ordemJogada}`).join(', '));
    
    // Atualizar UI do turno
    if (typeof atualizarInfoTurno === 'function') {
        atualizarInfoTurno();
    }
    if (typeof renderizarCartasPersonagens === 'function') {
        renderizarCartasPersonagens(jogadorAtual().id);
    }
    if (typeof atualizarDestaqueInventario === 'function') {
        atualizarDestaqueInventario();
    }
    
    // Enviar tabuleiro para outros jogadores
    const socket = window.socket;
    
    // Capturar posições dos jogadores
    const jogadoresEstado = jogadores.map(j => ({
        id: j.id,
        ordem: j.ordem,
        tileId: j.tileId,
        nome: j.nome,
        personagem: j.personagem
    }));
    
    console.log('📤 [HOST] Enviando tabuleiro para outros jogadores...');
    console.log('📊 Dados a enviar:', {
        codigoSala,
        tabuleiroLinhas: tabuleiroMatriz?.length,
        tilesEstadoLength: tilesEstadoCompleto.length,
        cartasEstadoLength: cartasEstado.length,
        jogadoresEstadoLength: jogadoresEstado.length,
        jogadorAtualIndex
    });
    console.log('👥 Jogadores estado:', jogadoresEstado.map(j => `${j.nome}(ID:${j.id},tileId:${j.tileId})`));
    
    socket.emit('enviar-tabuleiro', {
        codigoSala: codigoSala,
        tabuleiro: tabuleiroMatriz,
        tilesEstado: tilesEstadoCompleto,
        cartasEstado: cartasEstado,
        entradaPosicao: entradaPosicao,
        jogadorAtualIndex: jogadorAtualIndex,
        jogadoresEstado: jogadoresEstado
    });
    
    console.log('✅ [HOST] Evento enviar-tabuleiro emitido');
    
    // Marcar que o jogo foi iniciado (para distinguir recarregamentos)
    sessionStorage.setItem('jogoJaIniciado', 'true');
    console.log('✅ Host marcou jogo como iniciado');
}

// 🔥 Sincronizar estado completo do tabuleiro com o servidor (após Grito da Hidra, trocas, etc)
function sincronizarTabuleiroServidor() {
    if (!ehHost) {
        console.log('⚠️ Apenas o host pode sincronizar tabuleiro');
        return;
    }

    const tiles = document.querySelectorAll('.tile');
    if (tiles.length === 0) {
        console.log('⚠️ Nenhum tile encontrado para sincronizar');
        return;
    }

    // 🔥 Capturar estado ATUAL de todos os tiles PELA POSIÇÃO DA MATRIZ
    const tilesEstadoAtualizado = [];
    for (let linha = 0; linha < TAMANHO; linha++) {
        for (let coluna = 0; coluna < TAMANHO; coluna++) {
            const id = `${linha}-${coluna}`;
            const tile = document.querySelector(`.tile[data-id="${id}"]`);
            
            if (tile) {
                // Priorizar tile.tipo, senão buscar na classe ou dataset
                const tipo = tile.tipo || 
                            tile.dataset.tipo || 
                            Array.from(tile.classList).find(c => 
                                ['curva', 'corredor', 'bifurcacao', 'camara', 'encruzilhada', 'entrada', 'saida', 'hidra'].includes(c)
                            );
                const rotacao = parseInt(tile.dataset.rotacao) || 0;
                
                // Garantir que o tipo está na matriz também
                if (tipo && tabuleiroMatriz[linha][coluna] !== tipo) {
                    console.log(`🔄 Atualizando matriz[${linha}][${coluna}]: ${tabuleiroMatriz[linha][coluna]} -> ${tipo}`);
                    tabuleiroMatriz[linha][coluna] = tipo;
                }
                
                tilesEstadoAtualizado.push({ id, tipo, rotacao });
            } else {
                console.warn(`⚠️ Tile ${id} não encontrado no DOM`);
            }
        }
    }

    // Capturar estado das cartas
    const cartasAtualizadas = Array.from(cartas.entries()).map(([id, carta]) => ({
        id: carta.id,
        tipo: carta.tipo,
        tileId: carta.tile ? carta.tile.dataset.id : null
    }));

    // Capturar estado dos jogadores
    const jogadoresAtualizados = jogadores.map(j => ({
        id: j.id,
        socketId: j.socketId,
        nome: j.nome,
        personagem: j.personagem,
        ordem: j.ordem,
        ordemJogada: j.ordemJogada,
        tileId: j.tile ? j.tile.dataset.id : j.tileId
    }));

    console.log('📤 Sincronizando estado completo do tabuleiro:', {
        tiles: tilesEstadoAtualizado.length,
        cartas: cartasAtualizadas.length,
        jogadores: jogadoresAtualizados.length,
        jogadorAtualIndex
    });
    console.log('  📋 Primeiros 5 tiles:', tilesEstadoAtualizado.slice(0, 5).map(t => `${t.id}:${t.tipo}:${t.rotacao}°`));
    console.log('  📋 Últimos 5 tiles:', tilesEstadoAtualizado.slice(-5).map(t => `${t.id}:${t.tipo}:${t.rotacao}°`));

    socket.emit('atualizar-tabuleiro', {
        codigoSala: codigoSala,
        tabuleiro: tabuleiroMatriz,
        tilesEstado: tilesEstadoAtualizado,
        cartasEstado: cartasAtualizadas,
        entradaPosicao: entradaPosicao,
        jogadorAtualIndex: jogadorAtualIndex,
        jogadoresEstado: jogadoresAtualizados
    });

    console.log('✅ Estado do tabuleiro sincronizado com servidor');
}


function configurarJogadoresMultiplayer(jogadoresData) {
    // Atualizar array de jogadores com dados do lobby
    // IDs numéricos serão atribuídos pelo servidor quando todos ficarem prontos
    jogadores = jogadoresData.map(j => ({
        id: null,  // Será atribuído pelo servidor no evento 'jogo-iniciado'
        ordem: j.ordem, // Ordem de entrada no lobby
        ordemJogada: null, // Ordem de jogar (será atribuída pelo servidor)
        nome: j.nome,
        personagem: j.personagem,
        socketId: j.id,
        tileId: null
    }));
    
    console.log('👥 Jogadores configurados:', jogadores.map(j => `${j.nome} (Ordem entrada: ${j.ordem}, Personagem: ${j.personagem}, ID: pendente)`));
    
    // Não definir jogadorAtualIndex aqui - será recebido do host via 'receber-tabuleiro'
    // O host já sorteou e enviou o jogador inicial correto
    
    // Atualizar labels dos jogadores na UI
    atualizarLabelsJogadores();
    
    // Exibir informações do multiplayer
    exibirInfoMultiplayer(jogadoresData);
}

function exibirInfoMultiplayer(jogadoresData) {
    const minhaOrdem = parseInt(sessionStorage.getItem('minhaOrdem')) || 1;
    const meuJogadorId = parseInt(sessionStorage.getItem('meuJogadorId'));
    console.log('🔍 [exibirInfoMultiplayer] minhaOrdem:', minhaOrdem, 'meuJogadorId:', meuJogadorId);
    console.log('👥 [exibirInfoMultiplayer] jogadoresData:', jogadoresData);
    
    const meuJogador = jogadoresData.find(j => j.ordem === minhaOrdem);
    console.log('✅ [exibirInfoMultiplayer] meuJogador encontrado:', meuJogador);
    
    const multiplayerInfo = document.getElementById('multiplayer-info');
    const infoJogador = document.getElementById('info-jogador');
    const infoSala = document.getElementById('info-sala');
    
    if (multiplayerInfo && infoJogador && infoSala && meuJogador) {
        const nomesPersonagens = {
            'torvin': 'Torvin',
            'elara': 'Elara',
            'zephyr': 'Zephyr',
            'kaelen': 'Kaelen'
        };
        
        infoJogador.textContent = `Você: ${nomesPersonagens[meuJogador.personagem] || meuJogador.personagem}`;
        infoSala.textContent = `Sala: ${codigoSala}`;
        multiplayerInfo.style.display = 'flex';
    }
}

function atualizarLabelsJogadores() {
    console.log('🏷️ Atualizando labels dos inventários...');
    
    // Mapeamento fixo: personagem -> slot de inventário
    // Os slots são fixos no HTML: jogador-1=Torvin, jogador-2=Elara, jogador-3=Zephyr, jogador-4=Kaelen
    const personagemParaSlot = {
        'torvin': 1,
        'elara': 2,
        'zephyr': 3,
        'kaelen': 4
    };
    
    // Os nomes são FIXOS no HTML, não precisam ser alterados
    // Apenas deixar como estão para evitar problemas
    console.log('📌 Labels dos inventários são fixos por personagem (não por ordem de jogada)');
    
    /* Código removido: não alterar labels dinamicamente
    jogadores.forEach((jogador) => {
        const slotId = personagemParaSlot[jogador.personagem?.toLowerCase()];
        if (slotId) {
            const label = document.querySelector(`#jogador-${slotId} .zona-label`);
            if (label) {
                // Manter o nome fixo do personagem
                console.log(`  Slot ${slotId} (${label.textContent}) mantido`);
            }
        }
    });
    */
}

function configurarEventosSocket() {
    const socket = window.socket;

    
    // Receber estado da sala (enviado antes do tabuleiro)
    socket.on('estado-sala', (dados) => {
        // Atualizar variável no escopo da reconexão
        if (typeof window.atualizarEstadoSalaRecebido === 'function') {
            window.atualizarEstadoSalaRecebido(dados.estado);
        }
    });
    
    // Receber tabuleiro do host
    socket.on('receber-tabuleiro', (dados) => {
        
        // Cancelar timeout se existir
        if (typeof window.marcarTabuleiroRecebido === 'function') {
            window.marcarTabuleiroRecebido();
        }
        
        console.log('📥 Recebendo tabuleiro do host...');
        console.log('📊 Dados recebidos:', {
            temTabuleiro: !!dados.tabuleiro,
            temTilesEstado: !!dados.tilesEstado,
            temJogadoresEstado: !!dados.jogadoresEstado,
            jogadoresEstadoLength: dados.jogadoresEstado?.length,
            jogadorAtualIndex: dados.jogadorAtualIndex
        });
        
        // 🔥 IMPORTANTE: Em MULTIPLAYER, SEMPRE usar o estado do servidor
        // O servidor é a ÚNICA fonte da verdade - localStorage pode estar desatualizado
        console.log('🌐 MULTIPLAYER: Sincronizando com estado do servidor (ignorando localStorage local)');
        
        // Marcar que o jogo foi iniciado (para próximos recarregamentos)
        sessionStorage.setItem('jogoJaIniciado', 'true');
        
        tabuleiroMatriz = dados.tabuleiro;
        entradaPosicao = dados.entradaPosicao;
        jogadorAtualIndex = dados.jogadorAtualIndex || 0;
        
        // 🔥 Restaurar contador de rodadas do servidor
        if (dados.rodadasContador !== undefined) {
            rodadaAtual = dados.rodadasContador;
            // Atualizar UI do contador de rodadas
            const rodadasValor = document.querySelector('#rodadas-valor');
            if (rodadasValor) {
                rodadasValor.textContent = rodadaAtual;
            }
            console.log(`📊 Contador de rodadas restaurado: ${rodadaAtual}`);
        }
        
        // NÃO recalcular ordemJogada - ela já foi definida pelo servidor
        // A ordemJogada é fixa e embaralhada pelo servidor no início do jogo
        
        criarTabuleiro();
        
        // Aplicar estado completo dos tiles (tipos E rotações)
        if (dados.tilesEstado) {
            dados.tilesEstado.forEach(tileInfo => {
                const tileAntigo = document.querySelector(`.tile[data-id="${tileInfo.id}"]`);
                if (tileAntigo) {
                    const [linha, coluna] = tileInfo.id.split('-').map(Number);
                    const tipoMatriz = tabuleiroMatriz[linha][coluna];
                    const tipoEstado = tileInfo.tipo;
                    
                    // Se o tipo mudou, precisamos recriar o tile completamente
                    if (tipoMatriz !== tipoEstado) {
                        // Atualizar matriz
                        tabuleiroMatriz[linha][coluna] = tileInfo.tipo;
                        
                        // Criar novo tile com o tipo correto
                        const novoTile = criarTile(tileInfo.tipo);
                        novoTile.dataset.id = tileInfo.id;
                        novoTile.dataset.tipo = tileInfo.tipo;
                        
                        // Aplicar rotação
                        novoTile.rotacao = tileInfo.rotacao;
                        novoTile.dataset.rotacao = String(tileInfo.rotacao);
                        novoTile.style.transform = `rotate(${tileInfo.rotacao}deg)`;
                        
                        // Contra-rotação para overlays
                        const contraRot = -tileInfo.rotacao;
                        const cartasContainer = novoTile.querySelector('.cartas-no-tile');
                        const overlay = novoTile.querySelector('.overlay-no-rotacao');
                        if (cartasContainer) {
                            cartasContainer.style.transform = `rotate(${contraRot}deg)`;
                        }
                        if (overlay) {
                            overlay.style.transform = `rotate(${contraRot}deg)`;
                        }
                        
                        // Tornar dropável
                        tornarTileDropavel(novoTile);
                        
                        // Substituir no DOM
                        tileAntigo.replaceWith(novoTile);
                    } else {
                        // Apenas aplicar rotação se o tipo não mudou
                        tileAntigo.rotacao = tileInfo.rotacao;
                        tileAntigo.dataset.rotacao = String(tileInfo.rotacao);
                        tileAntigo.style.transform = `rotate(${tileInfo.rotacao}deg)`;
                        
                        const contraRot = -tileInfo.rotacao;
                        const cartasContainer = tileAntigo.querySelector('.cartas-no-tile');
                        const overlay = tileAntigo.querySelector('.overlay-no-rotacao');
                        if (cartasContainer) {
                            cartasContainer.style.transform = `rotate(${contraRot}deg)`;
                        }
                        if (overlay) {
                            overlay.style.transform = `rotate(${contraRot}deg)`;
                        }
                    }
                }
            });
        }
        
        // Inicializar jogadores
        const tiles = document.querySelectorAll('.tile');
        
        console.log('👥 Inicializando jogadores...');
        console.log('  - Tiles encontrados:', tiles.length);
        console.log('  - Jogadores locais:', jogadores.map(j => `${j.nome}(ID:${j.id})`));
        
        // Se recebeu estado dos jogadores, PRIMEIRO atualizar IDs e então aplicar posições
        if (dados.jogadoresEstado && dados.jogadoresEstado.length > 0) {
            console.log('✅ Estado dos jogadores recebido:', dados.jogadoresEstado.map(j => `${j.nome}(ID:${j.id},tileId:${j.tileId})`));
            
            // PRIMEIRO: Atualizar IDs e ordemJogada dos jogadores locais baseado no servidor
            jogadores.forEach(j => {
                const estadoServidor = dados.jogadoresEstado.find(ej => 
                    ej.nome === j.nome || ej.ordem === j.ordem
                );
                if (estadoServidor) {
                    j.id = estadoServidor.id;
                    j.ordemJogada = estadoServidor.ordemJogada; // 🔥 RESTAURAR ORDEMJOGADA
                    console.log(`📋 Restaurando jogador ${j.nome}: ID=${j.id} ordemJogada=${j.ordemJogada}`);
                }
            });
            
            // DEPOIS: Aplicar posições salvas
            jogadores.forEach(j => {
                const estadoSalvo = dados.jogadoresEstado.find(ej => ej.id === j.id || ej.ordem === j.ordem);
                if (estadoSalvo && estadoSalvo.tileId) {
                    const tile = document.querySelector(`.tile[data-id="${estadoSalvo.tileId}"]`);
                    if (tile) {
                        j.tile = tile;
                        j.tileId = estadoSalvo.tileId;
                        console.log(`  ✅ Jogador ${j.nome} posicionado em ${j.tileId}`);
                    } else {
                        console.warn(`  ⚠️ Tile ${estadoSalvo.tileId} não encontrado para ${j.nome}`);
                    }
                } else {
                    // Fallback: posicionar na entrada se não tiver tileId
                    let tileEntrada = null;
                    if (entradaPosicao) {
                        const entradaId = `${entradaPosicao.linha}-${entradaPosicao.coluna}`;
                        tileEntrada = document.querySelector(`.tile[data-id="${entradaId}"]`);
                    }
                    if (!tileEntrada) {
                        tileEntrada = Array.from(tiles).find(t => t.tipo === 'entrada');
                    }
                    if (tileEntrada) {
                        j.tile = tileEntrada;
                        j.tileId = tileEntrada.dataset.id;
                        console.log(`  ⚠️ Jogador ${j.nome} posicionado na entrada (fallback)`);
                    }
                }
            });
            
            console.log('🎨 Chamando desenharJogadores()...');
            desenharJogadores();
            console.log('✅ Jogadores desenhados');
        } else {
            console.log('⚠️ Nenhum estado de jogadores recebido, usando entrada como padrão');
            
            let tileEntrada = null;
            if (entradaPosicao) {
                const entradaId = `${entradaPosicao.linha}-${entradaPosicao.coluna}`;
                tileEntrada = document.querySelector(`.tile[data-id="${entradaId}"]`);
            }
            
            if (!tileEntrada) {
                tileEntrada = Array.from(tiles).find(t => t.tipo === 'entrada');
            }
            
            if (tileEntrada) {
                jogadores.forEach(j => {
                    j.tile = tileEntrada;
                    j.tileId = tileEntrada.dataset.id;
                    console.log(`  ✅ Jogador ${j.nome} posicionado na entrada`);
                });
                console.log('🎨 Chamando desenharJogadores()...');
                desenharJogadores();
                console.log('✅ Jogadores desenhados');
            } else {
                console.error('❌ Tile de entrada não encontrado!');
            }
        }
        
        // Receber e aplicar estado das cartas
        if (dados.cartasEstado) {
            cartas.clear();
            dados.cartasEstado.forEach(c => {
                cartas.set(c.id, c);
            });
            renderizarCartas();
        } else {
            inicializarCartas();
            renderizarCartas();
            distribuirCartasNasCamaras(3, 5);
        }
        
        // Atualizar UI do turno após receber o estado inicial
        console.log('🎮 Atualizando UI do turno inicial');
        if (typeof atualizarInfoTurno === 'function') {
            atualizarInfoTurno(true); // Mostrar notificação ao iniciar jogo
        }
        if (typeof renderizarCartasPersonagens === 'function') {
            renderizarCartasPersonagens(jogadorAtual().id);
        }
        if (typeof atualizarDestaqueInventario === 'function') {
            atualizarDestaqueInventario();
        }
        
        // Atualizar botões conforme estado da sala
        if (dados.estadoSala) {
            atualizarBotoesControle(dados.estadoSala);
        }
    });
    
    // Receber estado da sala (ao reconectar)
    socket.on('estado-sala', (dados) => {
        console.log('📥 Estado da sala recebido:', dados.estado);
        atualizarBotoesControle(dados.estado);
    });
    
    // Receber ações de outros jogadores
    socket.on('acao-jogo', (dados) => {
        // Se recebeu jogadores atualizados do servidor, aplicar
        if (dados.jogadoresAtualizados && dados.jogadoresAtualizados.length > 0) {
            dados.jogadoresAtualizados.forEach(jogadorServidor => {
                const jogadorLocal = jogadores.find(j => j.id === jogadorServidor.id);
                if (jogadorLocal) {
                    jogadorLocal.tileId = jogadorServidor.tileId;
                }
            });
            
            // Re-renderizar jogadores
            desenharJogadores();
        }
        
        processarAcaoRemota(dados);
    });
    
    // Evento de reconexão de jogador
    socket.on('jogador-reconectou', (dados) => {
        // O jogador foi reconectado, pode atualizar UI se necessário
    });
    
    // Eventos de controle de jogo
    socket.on('tabuleiro-reiniciado', (dados) => {
        console.log('🔄 Tabuleiro reiniciado! Tocando som...');
        tocarSom('reiniciarTabuleiro');
        
        // Aplicar nova ordem dos jogadores recebida do servidor
        if (dados.jogadores && dados.jogadores.length > 0) {
            jogadores = dados.jogadores.map(jogadorServidor => ({
                id: jogadorServidor.id,
                ordem: jogadorServidor.ordem,
                ordemJogada: jogadorServidor.ordemJogada,
                nome: jogadorServidor.nome,
                personagem: jogadorServidor.personagem,
                socketId: jogadorServidor.socketId,
                tileId: null,
                tile: null
            }));
            
            console.log('📋 Nova ordem dos jogadores:', jogadores.map(j => `${j.nome} ID:${j.id} OrdemJogo:${j.ordemJogada}`));
        } else {
            jogadores.forEach(j => {
                j.tileId = null;
                j.tile = null;
            });
        }
        
        // Aplicar jogadorAtualIndex recebido do servidor
        if (typeof dados.jogadorAtualIndex !== 'undefined') {
            jogadorAtualIndex = dados.jogadorAtualIndex;
            console.log('🎮 Novo jogador inicial:', jogadorAtualIndex, '(ID:', jogadores[jogadorAtualIndex]?.id, ')');
        }
        
        // Aplicar contador de rodadas recebido do servidor
        if (typeof dados.rodadasContador !== 'undefined') {
            rodadaAtual = dados.rodadasContador;
            atualizarRodadaUI();
            console.log('📊 Contador de rodadas resetado para:', rodadaAtual);
        }
        
        const minhaOrdem = parseInt(sessionStorage.getItem('minhaOrdem')) || 1;
        
        if (minhaOrdem === 1) {
            gerarTabuleiroHost();
        }
        
        mostrarMensagemJogo('Tabuleiro reiniciado!');
    });
    
    // Handler para receber jogadores com IDs do servidor (após todos prontos)
    socket.on('jogo-iniciado', (dados) => {
        console.log('🎮 Evento jogo-iniciado recebido com jogadores:', dados.jogadores);
        // Substituir completamente o array de jogadores com os dados do servidor
        // Isso garante que a ordem e IDs estejam corretos mesmo após reconexão
        if (dados.jogadores && dados.jogadores.length > 0) {
            jogadores = dados.jogadores.map(jogadorServidor => ({
                id: jogadorServidor.id,
                ordem: jogadorServidor.ordem,
                ordemJogada: jogadorServidor.ordemJogada,
                nome: jogadorServidor.nome,
                personagem: jogadorServidor.personagem,
                socketId: jogadorServidor.socketId,
                tileId: null // Será atualizado quando receber o tabuleiro
            }));
            
            console.log('📋 Array jogadores substituído:', jogadores.map(j => `${j.nome} ID:${j.id} OrdemEntrada:${j.ordem} OrdemJogo:${j.ordemJogada}`));
            
            // Atualizar labels dos inventários agora que os IDs foram atribuídos
            atualizarLabelsJogadores();
            
            const minhaOrdem = parseInt(sessionStorage.getItem('minhaOrdem')) || 1;
            if (minhaOrdem === 1) {
                setTimeout(() => {
                    gerarTabuleiroHost();
                }, 500);
            }
        }
    });
    
    socket.on('jogo-iniciado-partida', () => {
        console.log('🎮 Jogo iniciado! Tocando som...');
        tocarSom('iniciarJogo');
        atualizarBotoesControle('jogando');
    });
    
    socket.on('jogo-encerrado', () => {
        console.log('🏁 Jogo encerrado! Tocando som...');
        tocarSom('encerrarJogo');
        atualizarBotoesControle('aguardando');
    });
}

// Enviar ação para outros jogadores
function enviarAcao(tipo, dados) {
    if (!modoMultiplayer || !window.socket) return;
    
    const socket = window.socket;
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
        case 'trocar-tiles':
            processarTrocarTilesRemoto(acao.dados);
            break;
        case 'grito-hidra':
            processarGritoHidraRemoto(acao.dados);
            break;
        case 'grito-hidra-combate':
            processarGritoHidraCombateRemoto(acao.dados);
            break;
        case 'virar-carta':
            processarVirarCartaRemoto(acao.dados);
            break;
        case 'virar-carta-personagem':
            processarVirarCartaPersonagemRemoto(acao.dados);
            break;
        case 'mover-jogador':
            processarMoverJogadorRemoto(acao.dados);
            break;
        case 'girar-tile':
            processarGirarTileRemoto(acao.dados);
            break;
        case 'mover-carta':
            processarMoverCartaRemoto(acao.dados);
            break;
        case 'atualizar-rodada':
            processarAtualizarRodadaRemoto(acao.dados);
            break;
        case 'atualizar-contador':
            processarAtualizarContadorRemoto(acao.dados);
            break;
        case 'rolar-dado':
            processarRolarDadoRemoto(acao.dados);
            break;
        case 'passar-turno':
            processarPassarTurnoRemoto(acao.dados);
            break;
        case 'comprar-carta':
            processarComprarCartaRemoto(acao.dados);
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

function processarTrocarTilesRemoto(dados) {
    const { tile1Id, tile2Id } = dados;
    
    const tile1 = document.querySelector(`.tile[data-id="${tile1Id}"]`);
    const tile2 = document.querySelector(`.tile[data-id="${tile2Id}"]`);
    
    if (tile1 && tile2) {
        // Trocar elementos no DOM
        const temp = document.createElement("div");
        tile1.before(temp);
        tile2.before(tile1);
        temp.replaceWith(tile2);
        
        // 🔥 TROCAR OS IDs para refletir a nova posição física
        tile1.dataset.id = tile2Id;
        tile2.dataset.id = tile1Id;
        
        // 🔥 Atualizar cartas (servidor não envia estado de cartas, então fazemos local)
        cartas.forEach(carta => {
            if (carta.zona === `tile-${tile1Id}`) {
                carta.zona = `tile-${tile2Id}`;
            } else if (carta.zona === `tile-${tile2Id}`) {
                carta.zona = `tile-${tile1Id}`;
            }
        });
        
        // Re-buscar tiles após troca de IDs para atualizar referências de jogadores
        jogadores.forEach(jogador => {
            if (jogador.tileId) {
                const tileAtualizado = document.querySelector(`.tile[data-id="${jogador.tileId}"]`);
                if (tileAtualizado) {
                    jogador.tile = tileAtualizado;
                }
            }
        });
        
        desenharJogadores();
    }
}

function processarGritoHidraRemoto(dados) {
    const { linha, coluna, direcaoLinha, direcaoColuna, rotacoesLinha, rotacoesColuna } = dados;
    
    console.log('🐉 [REMOTO] Processando grito-hidra recebido do servidor');
    console.log(`  🎯 Linha: ${linha}, Coluna: ${coluna}`);
    console.log(`  ➡️ Direções: linha=${direcaoLinha}, coluna=${direcaoColuna}`);
    
    // Tocar som da hidra para todos os jogadores
    if (typeof tocarSom === 'function') {
        tocarSom('hidra');
    }
    
    if (typeof executarGritoHidra === 'function') {
        executarGritoHidra(linha, coluna, direcaoLinha, direcaoColuna, rotacoesLinha, rotacoesColuna);
        
        // Salvar estado local IMEDIATAMENTE após executar
        console.log('💾 [REMOTO] Salvando estado local após grito da hidra...');
        if (typeof salvarEstadoLocal === 'function') {
            salvarEstadoLocal();
        }
    }
}

function processarGritoHidraCombateRemoto(dados) {
    const { dificuldade, estadosTiles } = dados;
    
    // Tocar som da hidra para todos os jogadores
    if (typeof tocarSom === 'function') {
        tocarSom('hidra');
    }
    
    // Se recebemos os estados dos tiles, aplicamos diretamente
    if (estadosTiles && Array.isArray(estadosTiles)) {
        console.log('🐉 [MULTIPLAYER REMOTO] Aplicando estados dos tiles recebidos:', estadosTiles);
        aplicarEstadosTiles(estadosTiles);
    } else if (typeof executarGritoHidraCombate === 'function') {
        // Fallback: executar localmente (pode causar dessincronização)
        console.log('🐉 [MULTIPLAYER REMOTO] Executando grito-hidra-combate localmente (fallback)');
        executarGritoHidraCombate(dificuldade);
    }
}

function aplicarEstadosTiles(estadosTiles) {
    const tabuleiro = document.getElementById('tabuleiro');
    if (!tabuleiro) {
        console.error('❌ Tabuleiro não encontrado');
        return;
    }
    
    const tiposEspeciais = ['entrada', 'saida', 'hidra'];
    
    // Adicionar animação de terremoto
    tabuleiro.classList.add("terremoto");
    
    // Aplicar cada estado
    estadosTiles.forEach(estado => {
        const tile = tabuleiro.querySelector(`[data-id="${estado.id}"]`);
        if (!tile) {
            console.warn(`⚠️ Tile ${estado.id} não encontrado`);
            return;
        }
        
        // Adicionar classe de destaque
        tile.classList.add("tile-grito-hidra");
        
        // Atualizar tipo se for modo difícil
        if (estado.tipo && tile.tipo !== estado.tipo) {
            tile.tipo = estado.tipo;
            tile.dataset.tipo = estado.tipo;
            tile.className = `tile ${estado.tipo}`;
            tile.classList.add("tile-grito-hidra");
            
            // Atualizar matriz
            const [lin, col] = estado.id.split('-').map(Number);
            if (typeof tabuleiroMatriz !== 'undefined' && tabuleiroMatriz[lin] && tabuleiroMatriz[lin][col] !== undefined) {
                tabuleiroMatriz[lin][col] = estado.tipo;
            }
        }
        
        // Garantir que tiles especiais SEMPRE tenham rotação 0
        const rotacaoFinal = tiposEspeciais.includes(estado.tipo) ? 0 : estado.rotacao;
        
        // Atualizar rotação
        tile.dataset.rotacao = rotacaoFinal;
        tile.style.transform = `rotate(${rotacaoFinal}deg)`;
        tile.rotacao = rotacaoFinal;
        
        // Aplicar contra-rotação aos overlays
        const contraRot = -estado.rotacao;
        const cartasOverlay = tile.querySelector('.cartas-no-tile');
        const overlay = tile.querySelector('.overlay-no-rotacao');
        if (cartasOverlay) {
            cartasOverlay.style.transform = `rotate(${contraRot}deg)`;
            cartasOverlay.style.transformOrigin = '50% 50%';
        }
        if (overlay) {
            overlay.style.transform = `rotate(${contraRot}deg)`;
            overlay.style.transformOrigin = '50% 50%';
        }
    });
    
    // Re-renderizar cartas e jogadores
    if (typeof renderizarCartas === 'function') {
        renderizarCartas();
    }
    if (typeof desenharJogadores === 'function') {
        desenharJogadores();
    }
    
    // Remover animação após 2 segundos
    setTimeout(() => {
        const tiles = tabuleiro.querySelectorAll('.tile');
        tiles.forEach(tile => {
            tile.classList.remove("tile-grito-hidra");
        });
        tabuleiro.classList.remove("terremoto");
    }, 2000);
    
    // Salvar estado local após aplicar mudanças
    if (typeof salvarEstadoLocal === 'function') {
        salvarEstadoLocal();
    }
    
    console.log('✅ Estados dos tiles aplicados com sucesso');
}

function processarVirarCartaRemoto(dados) {
    const { cartaId, faceUp } = dados;
    
    if (typeof cartas !== 'undefined' && cartas instanceof Map) {
        const carta = cartas.get(cartaId);
        if (carta) {
            carta.faceUp = faceUp;
            if (typeof renderizarCartas === 'function') {
                renderizarCartas();
            }
        }
    }
}

function processarVirarCartaPersonagemRemoto(dados) {
    const { personagemId, virada } = dados;
    
    const cartaEl = document.querySelector(`.carta-personagem[data-personagem-id="${personagemId}"]`);
    if (cartaEl) {
        if (virada) {
            cartaEl.classList.add('virada');
            const personagem = personagens.find(p => p.id === personagemId);
            if (personagem) {
                cartaEl.title = personagem.nome;
            }
        } else {
            cartaEl.classList.remove('virada');
            cartaEl.removeAttribute('title');
        }
    }
}

function processarMoverJogadorRemoto(dados) {
    const { jogadorId, tileId } = dados;
    
    const jogador = jogadores.find(j => j.id === jogadorId);
    if (jogador) {
        jogador.tileId = tileId;
        
        // Encontrar o tile correspondente
        const tile = document.querySelector(`.tile[data-id="${tileId}"]`);
        if (tile) {
            jogador.tile = tile;
        }
        
        // Tocar som de passos
        if (typeof tocarSom === 'function') {
            tocarSom('passos');
        }
        
        // Atualizar posição visual
        desenharJogadores();
    }
}

function processarPassarTurnoRemoto(dados) {
    console.log('🔄 [REMOTO] Processando passar-turno:', dados);
    
    if (dados && typeof dados.jogadorAtualIndex !== 'undefined') {
        jogadorAtualIndex = dados.jogadorAtualIndex;
        
        // Atualizar rodada se foi enviada
        if (typeof dados.rodadaAtual !== 'undefined') {
            rodadaAtual = dados.rodadaAtual;
            if (typeof atualizarRodadaUI === 'function') {
                atualizarRodadaUI();
            }
        }
        
        desenharJogadores();
        if (typeof renderizarCartasPersonagens === 'function') {
            renderizarCartasPersonagens(jogadorAtual().id);
        }
        if (typeof atualizarDestaqueInventario === 'function') {
            atualizarDestaqueInventario();
        }
        if (typeof atualizarInfoTurno === 'function') {
            atualizarInfoTurno(true); // Mostrar notificação ao passar turno
        }
        // Tocar som de mudança de turno
        if (typeof tocarSom === 'function') {
            tocarSom('encerrarTurno');
        }
        
        // Se era último a jogar, executar ações de fim de rodada
        if (dados.eraUltimoAJogar) {
            console.log('🔄 [REMOTO] Último jogador da rodada - executando ações...');
            
            // Adicionar artefato ao tabuleiro
            if (typeof adicionarArtefatoAoTabuleiro === 'function') {
                adicionarArtefatoAoTabuleiro();
            }
            
            // 🔥 APENAS O HOST envia o grito da hidra para o servidor
            // Todos os clientes (incluindo host) executarão quando receberem via socket
            const souHost = sessionStorage.getItem('ehHost') === 'true';
            if (souHost) {
                // Executar Grito da Hidra após um pequeno delay
                setTimeout(() => {
                    console.log('🐉 [HOST] Enviando Grito da Hidra para servidor');
                    if (typeof tocarSom === 'function') {
                        tocarSom('hidra');
                    }
                    if (typeof gritoHidra === 'function') {
                        gritoHidra(); // Isso vai enviar para o servidor
                    }
                }, 800);
            } else {
                console.log('⏳ [CLIENTE] Aguardando Grito da Hidra do host via servidor...');
            }
        }
        
        // Salvar estado
        if (typeof salvarEstadoLocal === 'function') {
            salvarEstadoLocal();
        }
    }
}

function processarComprarCartaRemoto(dados) {
    // Atualizar UI de cartas se necessário
}

function processarAtualizarContadorRemoto(dados) {
    const { jogadorId, tipo, valor } = dados;
    
    if (tipo === 'pa') {
        paValores[jogadorId] = valor;
        atualizarPAUI(jogadorId);
    } else if (tipo === 'fa') {
        faValores[jogadorId] = valor;
        atualizarFAUI(jogadorId);
    }
}

function processarGirarTileRemoto(dados) {
    const { tileId, rotacao } = dados;
    
    const tile = document.querySelector(`.tile[data-id="${tileId}"]`);
    if (tile) {
        tile.dataset.rotacao = rotacao;
        tile.style.transform = `rotate(${rotacao}deg)`;
        
        // Aplicar contra-rotação aos overlays
        const contraRot = -rotacao;
        const cartas = tile.querySelector('.cartas-no-tile');
        const overlay = tile.querySelector('.overlay-no-rotacao');
        if (cartas) {
            cartas.style.transform = `rotate(${contraRot}deg)`;
            cartas.style.transformOrigin = '50% 50%';
        }
        if (overlay) {
            overlay.style.transform = `rotate(${contraRot}deg)`;
            overlay.style.transformOrigin = '50% 50%';
        }
    }
}

function processarMoverCartaRemoto(dados) {
    const { idCarta, destino } = dados;
    
    const carta = cartas.get(idCarta);
    if (!carta) return;
    
    carta.zona = destino;
    
    if (destino.startsWith("jogador-")) {
        carta.dono = Number(destino.split("-")[1]);
        carta.faceUp = true;
    } else {
        carta.dono = null;
        carta.faceUp = false;
    }
    
    renderizarCartas();
}

function processarAtualizarRodadaRemoto(dados) {
    const { valor } = dados;
    
    rodadaAtual = valor;
    atualizarRodadaUI();
}

function processarRolarDadoRemoto(dados) {
    const { tipo, resultado } = dados;
    
    // Tocar som de dado para todos os jogadores
    if (typeof tocarSom === 'function') {
        tocarSom('dado');
    }
    
    const resultadoDado = document.getElementById("resultado-dado");
    
    if (tipo === 'd6') {
        document.getElementById("dado1").textContent = resultado;
        document.getElementById("dado2").textContent = "–";
        if (resultadoDado) {
            resultadoDado.textContent = `D6: ${resultado}`;
        }
    } else if (tipo === '2d6') {
        const { d1, d2, total } = resultado;
        document.getElementById("dado1").textContent = d1;
        document.getElementById("dado2").textContent = d2;
        if (resultadoDado) {
            resultadoDado.textContent = `2D6: ${d1} + ${d2} = ${total}`;
        }
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

// Configurar botões de controle de jogo
function configurarBotoesControle() {
    // Verificar se está em modo multiplayer pelo sessionStorage ou pela presença do socket
    const emMultiplayer = sessionStorage.getItem('modoMultiplayer') === 'true' || 
                          (typeof window.socket !== 'undefined' && window.socket && window.socket.connected);
    
    if (!emMultiplayer) return;
    
    const socket = window.socket;
    const controlesJogo = document.getElementById('controles-jogo');
    const btnIniciar = document.getElementById('btn-iniciar-jogo');
    const btnEncerrar = document.getElementById('btn-encerrar-jogo');
    const btnReiniciar = document.getElementById('btn-reiniciar-tabuleiro');
    
    if (!controlesJogo) return;
    
    console.log('🎮 Configurando botões de controle em modo multiplayer');
    
    // Mostrar controles apenas em multiplayer
    controlesJogo.style.display = 'flex';
    
    // Configurar eventos
    if (btnIniciar) {
        btnIniciar.addEventListener('click', () => {
            socket.emit('iniciar-jogo', { codigoSala });
        });
    }
    
    if (btnEncerrar) {
        btnEncerrar.addEventListener('click', () => {
            // Som será tocado quando o servidor emitir 'jogo-encerrado'
            socket.emit('encerrar-jogo', { codigoSala });
        });
    }
    
    if (btnReiniciar) {
        btnReiniciar.addEventListener('click', () => {
            socket.emit('reiniciar-tabuleiro', { codigoSala });
        });
    }
}

// Atualizar estado dos botões de controle
function atualizarBotoesControle(estado) {
    const btnIniciar = document.getElementById('btn-iniciar-jogo');
    const btnEncerrar = document.getElementById('btn-encerrar-jogo');
    const btnReiniciar = document.getElementById('btn-reiniciar-tabuleiro');
    
    if (estado === 'jogando') {
        if (btnIniciar) btnIniciar.style.display = 'none';
        if (btnEncerrar) btnEncerrar.style.display = 'block';
        if (btnReiniciar) btnReiniciar.disabled = true;
        mostrarMensagemJogo('Jogo iniciado! Boa sorte!');
    } else {
        // Jogo não iniciado ou encerrado
        if (btnIniciar) {
            btnIniciar.style.display = 'block';
        }
        if (btnEncerrar) {
            btnEncerrar.style.display = 'none';
        }
        if (btnReiniciar) {
            btnReiniciar.disabled = false;
        }
        if (estado === 'aguardando') {
            mostrarMensagemJogo('Jogo encerrado!');
        }
    }
}

// Configurar botões quando DOM estiver pronto (apenas se necessário)
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        // Não chamar inicializarMultiplayer aqui - será chamado do script.js após conectar
        setTimeout(() => {
            configurarBotoesControle();
        }, 100);
    });
}

