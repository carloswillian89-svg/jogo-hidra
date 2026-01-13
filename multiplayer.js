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
        console.log('⚠️ Jogo já inicializado - ignorando chamada duplicada');
        return;
    }
    jogoInicializado = true;
    
    const socket = window.socket;
    meuSocketId = socket.id;
    console.log('🎮 Inicializando jogo multiplayer com socket:', meuSocketId);
    console.log('📋 Dados dos jogadores:', jogadoresData);
    console.log('📋 Código da sala:', codigoSala);
    
    // Primeiro configurar eventos para receber respostas
    configurarEventosSocket();
    
    // Depois reentrar na sala
    console.log('📤 Emitindo reconectar-sala com:', { codigoSala, socketId: meuSocketId });
    socket.emit('reconectar-sala', { 
        codigoSala: codigoSala,
        socketId: meuSocketId
    });
    console.log('✅ Evento reconectar-sala emitido');
        
    // Configurar jogadores baseado nos dados do lobby
    configurarJogadoresMultiplayer(jogadoresData);
    
    // Verificar se sou o host pela ordem salva
    const minhaOrdem = parseInt(sessionStorage.getItem('minhaOrdem')) || 1;
    console.log('👤 Minha ordem:', minhaOrdem);
    console.log('📊 Estado atual tabuleiroMatriz:', tabuleiroMatriz ? 'existe' : 'null');
    
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
        if (!tabuleiroRecebido) {
            // NÃO gerar tabuleiro aqui - esperar o evento 'jogo-iniciado' após todos prontos
            if (estadoSalaRecebido === 'jogando') {
                console.log('⏰ Timeout (5s) - sala em "jogando", aguardando estado salvo...');
            } else {
                console.log('⏰ Timeout (5s) - aguardando evento "jogo-iniciado" para gerar tabuleiro...');
            }
        }
    }, 5000); // Aumentado de 1000ms para 5000ms para ambientes remotos
    
    // Função global para cancelar timeout
    window.marcarTabuleiroRecebido = () => {
        tabuleiroRecebido = true;
        console.log('⏱️ Timeout cancelado - tabuleiro recebido com sucesso');
        clearTimeout(timeoutEsperaServidor);
    };
}

function gerarTabuleiroHost() {
    console.log('🗺️ Gerando novo tabuleiro como host...');
    
    // Sempre gerar uma nova matriz para garantir aleatoriedade
    gerarMatriz();
    console.log('✅ Matriz gerada:', tabuleiroMatriz);
    
    criarTabuleiro();
    console.log('✅ Tabuleiro criado no DOM');
    
    // Capturar estado completo dos tiles (tipos e rotações)
    const tilesEstadoCompleto = [];
    const tiles = document.querySelectorAll('.tile');
    console.log('📍 Total de tiles encontrados:', tiles.length);
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
        console.log('🚪 Buscando tile de entrada pela posição:', entradaId);
    }
    
    // Fallback: buscar por tipo
    if (!tileEntrada) {
        tileEntrada = Array.from(tiles).find(t => t.tipo === 'entrada');
        console.log('🚪 Fallback - Buscando tile de entrada por tipo');
    }
    
    console.log('🚪 Tile de entrada encontrado?', tileEntrada ? 'SIM - ' + tileEntrada.dataset.id : 'NÃO');
    if (tileEntrada) {
        console.log('✅ Tile de entrada encontrado:', tileEntrada.dataset.id);
        console.log('👥 Jogadores antes de atribuir tile:', jogadores);
        jogadores.forEach(j => {
            j.tile = tileEntrada;
            j.tileId = tileEntrada.dataset.id;
            console.log(`  ➡️ Jogador ${j.id} atribuído ao tile ${j.tileId}`);
        });
        console.log('👥 Jogadores após atribuir tile:', jogadores);
        desenharJogadores();
        console.log('✅ Jogadores desenhados');
    } else {
        console.error('❌ Tile de entrada não encontrado!');
        console.log('🔍 Tipos de tiles disponíveis:', Array.from(tiles).map(t => t.tipo));
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
    
    console.log('📤 Enviando tabuleiro para sala:', codigoSala);
    console.log('📤 Dados enviados:', {
        tabuleiro: tabuleiroMatriz.length + 'x' + tabuleiroMatriz[0].length,
        tiles: tilesEstadoCompleto.length,
        cartas: cartasEstado.length
    });
    
    // Definir jogador inicial aleatório
    jogadorAtualIndex = Math.floor(Math.random() * jogadores.length);
    console.log('🎲 Jogador inicial sorteado:', jogadorAtualIndex);
    console.log('  📍 Índice:', jogadorAtualIndex);
    console.log('  👤 Jogador no índice:', jogadores[jogadorAtualIndex]);
    
    // Log do personagem (mapear nome do personagem para ID)
    if (personagens && jogadores[jogadorAtualIndex].personagem) {
        const personagemMap = { 'torvin': 1, 'elara': 2, 'zephyr': 3, 'kaelen': 4 };
        const personagemId = personagemMap[jogadores[jogadorAtualIndex].personagem.toLowerCase()];
        const p = personagens.find(pp => pp.id === personagemId);
        console.log('  🎭 Personagem:', p || 'não encontrado');
    } else {
        console.log('  🎭 Personagem: não carregado');
    }
    console.log('  📋 Array completo de jogadores:', jogadores.map((j, idx) => `[${idx}] ID:${j.id} Ordem:${j.ordem} Personagem:${j.personagem || 'N/A'}`));
    
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
    
    console.log('🚀 [ENVIANDO TABULEIRO] Host está enviando tabuleiro para o servidor');
    console.log('  📊 Matriz linha 0:', tabuleiroMatriz[0]);
    console.log('  📊 Matriz linha 1:', tabuleiroMatriz[1]);
    console.log('  � Jogadores sendo enviados:', jogadoresEstado.map(j => `ID:${j.id} tileId:${j.tileId}`));
    console.log('  �📍 Chamado de:', new Error().stack.split('\n')[2]); // Ver quem chamou
    
    socket.emit('enviar-tabuleiro', {
        codigoSala: codigoSala,
        tabuleiro: tabuleiroMatriz,
        tilesEstado: tilesEstadoCompleto,
        cartasEstado: cartasEstado,
        entradaPosicao: entradaPosicao,
        jogadorAtualIndex: jogadorAtualIndex,
        jogadoresEstado: jogadoresEstado
    });
    
    console.log('📤 Estado completo enviado:', {
        jogadores: jogadoresEstado.length,
        jogadorAtualIndex: jogadorAtualIndex
    });
}


function configurarJogadoresMultiplayer(jogadoresData) {
    // Atualizar array de jogadores com dados do lobby
    // IDs numéricos serão atribuídos pelo servidor quando todos ficarem prontos
    jogadores = jogadoresData.map(j => ({
        id: null,  // Será atribuído pelo servidor no evento 'jogo-iniciado'
        ordem: j.ordem,
        nome: j.nome,
        personagem: j.personagem,
        socketId: j.id,
        tileId: null
    }));
    
    console.log('👥 Jogadores configurados:', jogadores.map(j => `${j.nome} (Ordem: ${j.ordem}, Personagem: ${j.personagem}, ID: pendente)`));
    
    // Não definir jogadorAtualIndex aqui - será recebido do host via 'receber-tabuleiro'
    // O host já sorteou e enviou o jogador inicial correto
    
    // Atualizar labels dos jogadores na UI
    atualizarLabelsJogadores();
    
    // Exibir informações do multiplayer
    exibirInfoMultiplayer(jogadoresData);
}

function exibirInfoMultiplayer(jogadoresData) {
    const minhaOrdem = parseInt(sessionStorage.getItem('minhaOrdem')) || 1;
    const meuJogador = jogadoresData.find(j => j.ordem === minhaOrdem);
    
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
    jogadores.forEach((jogador) => {
        const label = document.querySelector(`#jogador-${jogador.id} .zona-label`);
        if (label) {
            label.textContent = jogador.personagem || `Jogador ${jogador.id}`;
        }
    });
}

function configurarEventosSocket() {
    const socket = window.socket;
    console.log('⚙️ [INICIO] Configurando eventos do socket...');
    
    // Receber estado da sala (enviado antes do tabuleiro)
    socket.on('estado-sala', (dados) => {
        console.log('📡 Estado da sala recebido:', dados.estado);
        // Atualizar variável no escopo da reconexão
        if (typeof window.atualizarEstadoSalaRecebido === 'function') {
            window.atualizarEstadoSalaRecebido(dados.estado);
        }
    });
    
    // Receber tabuleiro do host
    socket.on('receber-tabuleiro', (dados) => {
        console.log('🎯 [LISTENER ACIONADO] receber-tabuleiro');
        console.log('� Tabuleiro recebido do host');
        console.log('📥 Dados recebidos:', {
            tabuleiro: dados.tabuleiro ? dados.tabuleiro.length + 'x' + dados.tabuleiro[0].length : 'null',
            tiles: dados.tilesEstado ? dados.tilesEstado.length : 0,
            cartas: dados.cartasEstado ? dados.cartasEstado.length : 0
        });
        
        // Cancelar timeout se existir
        if (typeof window.marcarTabuleiroRecebido === 'function') {
            window.marcarTabuleiroRecebido();
        }
        
        tabuleiroMatriz = dados.tabuleiro;
        entradaPosicao = dados.entradaPosicao;
        jogadorAtualIndex = dados.jogadorAtualIndex || 0;
        console.log('✅ Matriz atribuída:', tabuleiroMatriz);
        console.log('✅ Entrada posição:', entradaPosicao);
        console.log('✅ Jogador inicial index recebido:', jogadorAtualIndex);
        console.log('  📍 Índice:', jogadorAtualIndex);
        console.log('  👤 Jogador no índice:', jogadores[jogadorAtualIndex]);
        
        // Log do personagem (mapear nome do personagem para ID)
        if (personagens && jogadores[jogadorAtualIndex] && jogadores[jogadorAtualIndex].personagem) {
            const personagemMap = { 'torvin': 1, 'elara': 2, 'zephyr': 3, 'kaelen': 4 };
            const personagemId = personagemMap[jogadores[jogadorAtualIndex].personagem.toLowerCase()];
            const p = personagens.find(pp => pp.id === personagemId);
            console.log('  🎭 Personagem:', p || 'não encontrado');
        } else {
            console.log('  🎭 Personagem: não carregado');
        }
        console.log('  📋 Array completo de jogadores:', jogadores.map((j, idx) => `[${idx}] ID:${j.id} Ordem:${j.ordem} Personagem:${j.personagem || 'N/A'}`));
        
        // Log da matriz recebida para debug
        console.log('📊 Matriz recebida (primeiros tiles):');
        if (tabuleiroMatriz && tabuleiroMatriz.length > 0) {
            for (let i = 0; i < Math.min(3, tabuleiroMatriz.length); i++) {
                console.log(`  Linha ${i}:`, tabuleiroMatriz[i].slice(0, 5));
            }
        }
        
        // Log do tilesEstado recebido
        console.log('📦 tilesEstado recebido (primeiros 10):');
        if (dados.tilesEstado && dados.tilesEstado.length > 0) {
            dados.tilesEstado.slice(0, 10).forEach(t => {
                console.log(`  ${t.id}: tipo="${t.tipo}" rot=${t.rotacao}°`);
            });
        }
        
        console.log('🏗️ Criando tabuleiro DOM baseado na matriz recebida...');
        console.log('  📊 Matriz ANTES de criar DOM - linha 1:', tabuleiroMatriz[1]);
        criarTabuleiro();
        console.log('✅ Tabuleiro criado no DOM');
        console.log('  📊 Matriz DEPOIS de criar DOM - linha 1:', tabuleiroMatriz[1]);
        
        // Aplicar estado completo dos tiles (tipos E rotações)
        if (dados.tilesEstado) {
            console.log('🔄 Aplicando estado dos tiles (tipos e rotações)...');
            console.log(`  📦 Total de tiles no estado: ${dados.tilesEstado.length}`);
            
            // Log de alguns exemplos
            dados.tilesEstado.slice(0, 5).forEach(t => {
                console.log(`  📍 Exemplo: Tile ${t.id} = tipo:"${t.tipo}" rot:${t.rotacao}°`);
            });
            
            dados.tilesEstado.forEach(tileInfo => {
                const tileAntigo = document.querySelector(`.tile[data-id="${tileInfo.id}"]`);
                if (tileAntigo) {
                    const [linha, coluna] = tileInfo.id.split('-').map(Number);
                    const tipoMatriz = tabuleiroMatriz[linha][coluna];
                    const tipoEstado = tileInfo.tipo;
                    
                    console.log(`  🔍 Tile ${tileInfo.id}: matriz="${tipoMatriz}" estado="${tipoEstado}" DOM="${tileAntigo.tipo}"`);
                    
                    // Se o tipo mudou, precisamos recriar o tile completamente
                    if (tipoMatriz !== tipoEstado) {
                        console.log(`  🔄 RECRIANDO tile ${tileInfo.id}: matriz="${tipoMatriz}" → estado="${tipoEstado}"`);
                        
                        // Atualizar matriz
                        tabuleiroMatriz[linha][coluna] = tileInfo.tipo;
                        
                        // Criar novo tile com o tipo correto
                        const novoTile = criarTile(tileInfo.tipo);
                        novoTile.dataset.id = tileInfo.id;
                        
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
                        console.log(`  ✅ Tile ${tileInfo.id} recriado com tipo "${tipoEstado}"`);
                    } else {
                        // Apenas aplicar rotação se o tipo não mudou
                        console.log(`  🔄 Aplicando rotação no tile ${tileInfo.id}: ${tileAntigo.rotacao}° → ${tileInfo.rotacao}°`);
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
            console.log('✅ Tipos e rotações dos tiles aplicados');
        }
        
        // Inicializar jogadores
        const tiles = document.querySelectorAll('.tile');
        console.log('📍 Total de tiles no DOM:', tiles.length);
        
        // Se recebeu estado dos jogadores, aplicar posições salvas
        if (dados.jogadoresEstado && dados.jogadoresEstado.length > 0) {
            console.log('👥 Aplicando estado dos jogadores recebido:', dados.jogadoresEstado);
            
            jogadores.forEach(j => {
                const estadoSalvo = dados.jogadoresEstado.find(ej => ej.id === j.id || ej.ordem === j.ordem);
                if (estadoSalvo && estadoSalvo.tileId) {
                    const tile = document.querySelector(`.tile[data-id="${estadoSalvo.tileId}"]`);
                    if (tile) {
                        j.tile = tile;
                        j.tileId = estadoSalvo.tileId;
                        console.log(`  ➡️ Jogador ${j.id} posicionado em ${j.tileId} (estado salvo)`);
                    } else {
                        console.warn(`  ⚠️ Tile ${estadoSalvo.tileId} não encontrado para jogador ${j.id}`);
                    }
                } else {
                    console.warn(`  ⚠️ Jogador ${j.id} não tem tileId salvo, tentando fallback para entrada`);
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
                        console.log(`  ➡️ Jogador ${j.id} posicionado na entrada ${j.tileId} (fallback)`);
                    }
                }
            });
            
            desenharJogadores();
            console.log('✅ Jogadores desenhados com posições salvas');
        } else {
            // Fallback: posicionar na entrada
            console.log('👥 Nenhum estado de jogadores recebido, posicionando na entrada');
            
            let tileEntrada = null;
            if (entradaPosicao) {
                const entradaId = `${entradaPosicao.linha}-${entradaPosicao.coluna}`;
                tileEntrada = document.querySelector(`.tile[data-id="${entradaId}"]`);
                console.log('🚪 Buscando tile de entrada pela posição:', entradaId);
            }
            
            // Fallback: buscar por tipo
            if (!tileEntrada) {
                tileEntrada = Array.from(tiles).find(t => t.tipo === 'entrada');
                console.log('🚪 Fallback - Buscando tile de entrada por tipo');
            }
            
            console.log('🚪 Tile de entrada encontrado?', tileEntrada ? 'SIM - ' + tileEntrada.dataset.id : 'NÃO');
            
            if (tileEntrada) {
                console.log('✅ Tile de entrada encontrado:', tileEntrada.dataset.id);
                console.log('👥 Jogadores antes de atribuir tile:', jogadores);
                jogadores.forEach(j => {
                    j.tile = tileEntrada;
                    j.tileId = tileEntrada.dataset.id;
                    console.log(`  ➡️ Jogador ${j.id} atribuído ao tile ${j.tileId}`);
                });
                console.log('👥 Jogadores após atribuir tile:', jogadores);
                desenharJogadores();
                console.log('✅ Jogadores desenhados');
            } else {
                console.error('❌ Tile de entrada não encontrado!');
                console.log('🔍 Tipos de tiles disponíveis:', Array.from(tiles).map(t => ({id: t.dataset.id, tipo: t.tipo})));
            }
        }
        
        // Receber e aplicar estado das cartas
        if (dados.cartasEstado) {
            console.log('🃏 Aplicando estado das cartas recebidas');
            cartas.clear();
            dados.cartasEstado.forEach(c => {
                cartas.set(c.id, c);
            });
            renderizarCartas();
            console.log('✅ Cartas renderizadas');
        } else {
            // Fallback: inicializar cartas localmente (não deveria acontecer)
            console.warn('⚠️ Nenhum estado de cartas recebido - inicializando localmente');
            inicializarCartas();
            renderizarCartas();
            distribuirCartasNasCamaras(3, 5);
        }
        
        // Atualizar UI do turno após receber o estado inicial
        console.log('🎮 Atualizando UI do turno inicial');
        if (typeof atualizarInfoTurno === 'function') {
            atualizarInfoTurno();
        }
        if (typeof renderizarCartasPersonagens === 'function') {
            renderizarCartasPersonagens(jogadorAtual().id);
        }
        if (typeof atualizarDestaqueInventario === 'function') {
            atualizarDestaqueInventario();
        }
        
        // Atualizar botões conforme estado da sala
        if (dados.estadoSala) {
            console.log('🎮 Atualizando botões para estado:', dados.estadoSala);
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
        console.log('📨 Ação recebida:', dados);
        
        // Se recebeu jogadores atualizados do servidor, aplicar
        if (dados.jogadoresAtualizados && dados.jogadoresAtualizados.length > 0) {
            console.log('👥 Aplicando jogadores atualizados do servidor:', dados.jogadoresAtualizados);
            dados.jogadoresAtualizados.forEach(jogadorServidor => {
                const jogadorLocal = jogadores.find(j => j.id === jogadorServidor.id);
                if (jogadorLocal) {
                    jogadorLocal.tileId = jogadorServidor.tileId;
                    console.log(`  ✅ Jogador ${jogadorLocal.id} atualizado: tileId="${jogadorLocal.tileId}"`);
                }
            });
            
            // Re-renderizar jogadores
            desenharJogadores();
        }
        
        processarAcaoRemota(dados);
    });
    
    // Evento de reconexão de jogador
    socket.on('jogador-reconectou', (dados) => {
        console.log(`🔄 Jogador reconectado: ${dados.nome} (${dados.jogadorIdAntigo} → ${dados.jogadorId})`);
        // O jogador foi reconectado, pode atualizar UI se necessário
    });
    
    // Eventos de controle de jogo
    socket.on('tabuleiro-reiniciado', (dados) => {
        console.log('🔄 Tabuleiro reiniciado - regenerando...');
        console.log('  📋 Dados recebidos:', dados);
        
        // Atualizar array de jogadores com dados atualizados do servidor
        if (dados && dados.jogadores) {
            console.log('  👥 Atualizando jogadores com dados do servidor...');
            configurarJogadoresMultiplayer(dados.jogadores);
        }
        
        console.log('  📋 Array jogadores APÓS atualizar:', jogadores.map((j, idx) => `[${idx}] ID:${j.id} Ordem:${j.ordem} Personagem:${j.personagem || 'N/A'}`));
        
        const minhaOrdem = parseInt(sessionStorage.getItem('minhaOrdem')) || 1;
        
        if (minhaOrdem === 1) {
            // Sou o host: gerar novo tabuleiro e compartilhar
            console.log('🗺️ Host gerando novo tabuleiro...');
            gerarTabuleiroHost();
        } else {
            // Aguardar tabuleiro do host
            console.log('⏳ Aguardando novo tabuleiro do host...');
        }
        
        mostrarMensagemJogo('Tabuleiro reiniciado!');
    });
    
    // Handler para receber jogadores com IDs do servidor (após todos prontos)
    socket.on('jogo-iniciado', (dados) => {
        console.log('🎮 Evento jogo-iniciado recebido (jogadores com IDs):', dados);
        console.log('📋 Jogadores ANTES de atualizar:', jogadores.map(j => `${j.nome} ID:${j.id} Socket:${j.socketId} Personagem:${j.personagem}`));
        
        // Atualizar jogadores com IDs recebidos do servidor
        if (dados.jogadores && dados.jogadores.length > 0) {
            dados.jogadores.forEach(jogadorServidor => {
                console.log(`  🔍 Procurando jogador ${jogadorServidor.nome} (socketId ${jogadorServidor.socketId})`);
                // Fazer match por NOME em vez de socketId (socketId muda após reconexão)
                const jogadorLocal = jogadores.find(j => j.nome === jogadorServidor.nome);
                if (jogadorLocal) {
                    jogadorLocal.id = jogadorServidor.id;
                    jogadorLocal.ordem = jogadorServidor.ordem;
                    jogadorLocal.socketId = jogadorServidor.socketId; // Atualizar socketId também
                    console.log(`  ✅ Jogador ${jogadorLocal.nome}: ID=${jogadorLocal.id}, Ordem=${jogadorLocal.ordem}, Personagem=${jogadorLocal.personagem}`);
                } else {
                    console.error(`  ❌ Jogador ${jogadorServidor.nome} não encontrado localmente`);
                }
            });
            
            console.log('📋 Jogadores DEPOIS de atualizar:', jogadores.map(j => `${j.nome} ID:${j.id} Socket:${j.socketId} Personagem:${j.personagem}`));
            
            // 🔥 Agora que os IDs estão corretos, host pode gerar o tabuleiro
            const minhaOrdem = parseInt(sessionStorage.getItem('minhaOrdem')) || 1;
            if (minhaOrdem === 1) {
                console.log('🗺️ Host gerando tabuleiro após receber IDs do servidor...');
                setTimeout(() => {
                    gerarTabuleiroHost();
                }, 500); // Pequeno delay para garantir que todos receberam os IDs
            }
        }
    });
    
    socket.on('jogo-iniciado-partida', () => {
        console.log('✅ Evento jogo-iniciado-partida recebido!');
        console.log('📞 Chamando atualizarBotoesControle("jogando")');
        atualizarBotoesControle('jogando');
        console.log('✅ atualizarBotoesControle executado');
    });
    
    socket.on('jogo-encerrado', () => {
        console.log('🏁 Jogo encerrado!');
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
    
    console.log('🔄 Processando troca de tiles remota:', tile1Id, '↔', tile2Id);
    
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
                console.log(`  🃏 Carta ${carta.id}: tile-${tile1Id} → tile-${tile2Id}`);
            } else if (carta.zona === `tile-${tile2Id}`) {
                carta.zona = `tile-${tile1Id}`;
                console.log(`  🃏 Carta ${carta.id}: tile-${tile2Id} → tile-${tile1Id}`);
            }
        });
        
        // 🔥 NÃO atualizar jogadores aqui - o servidor já enviou as posições corretas
        // Os jogadores foram atualizados via 'jogadoresAtualizados' antes desta função ser chamada
        console.log(`  ℹ️ Jogadores já foram atualizados pelo servidor, pulando atualização local`);
        
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
        console.log('✅ Tiles e cartas trocados remotamente');
    } else {
        console.warn('⚠️ Tiles não encontrados para trocar:', { tile1: !!tile1, tile2: !!tile2 });
    }
}

function processarGritoHidraRemoto(dados) {
    const { ehLinha, indice } = dados;
    
    console.log('🐉 Processando Grito da Hidra remoto:', ehLinha ? 'Linha' : 'Coluna', indice);
    
    // Executar a mesma lógica do grito da hidra
    if (typeof executarGritoHidra === 'function') {
        executarGritoHidra(ehLinha, indice);
        console.log('✅ Grito da Hidra executado remotamente');
    } else {
        console.warn('⚠️ Função executarGritoHidra não encontrada');
    }
}

function processarVirarCartaRemoto(dados) {
    const { cartaId, faceUp } = dados;
    
    console.log('🃏 Processando virada de carta remota:', cartaId, 'faceUp:', faceUp);
    console.log('📊 Tipo de cartas:', typeof cartas);
    console.log('📊 cartas é Map?', cartas instanceof Map);
    
    // Encontrar a carta no Map global
    if (typeof cartas !== 'undefined' && cartas instanceof Map) {
        const carta = cartas.get(cartaId);
        if (carta) {
            carta.faceUp = faceUp;
            console.log('✅ Estado da carta atualizado, renderizando...');
            
            if (typeof renderizarCartas === 'function') {
                renderizarCartas();
                console.log('✅ Carta virada remotamente');
            } else {
                console.error('❌ Função renderizarCartas não encontrada');
            }
        } else {
            console.warn('⚠️ Carta não encontrada no Map:', cartaId);
            console.log('Cartas disponíveis:', Array.from(cartas.keys()));
        }
    } else {
        console.error('❌ cartas não está definido ou não é um Map');
    }
}

function processarVirarCartaPersonagemRemoto(dados) {
    const { personagemId, virada } = dados;
    
    console.log('👤 Processando virada de carta de personagem remota:', personagemId, 'virada:', virada);
    
    // Encontrar o elemento da carta de personagem
    const cartaEl = document.querySelector(`.carta-personagem[data-personagem-id="${personagemId}"]`);
    if (cartaEl) {
        if (virada) {
            cartaEl.classList.add('virada');
            // Buscar nome do personagem
            const personagem = personagens.find(p => p.id === personagemId);
            if (personagem) {
                cartaEl.title = personagem.nome;
            }
        } else {
            cartaEl.classList.remove('virada');
            cartaEl.removeAttribute('title');
        }
        console.log('✅ Carta de personagem virada remotamente');
    } else {
        console.warn('⚠️ Carta de personagem não encontrada:', personagemId);
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
        
        // Atualizar posição visual
        desenharJogadores();
    }
}

function processarPassarTurnoRemoto(dados) {
    if (dados && typeof dados.jogadorAtualIndex !== 'undefined') {
        console.log('🎮 Passar turno remoto recebido - Jogador atual:', dados.jogadorAtualIndex);
        jogadorAtualIndex = dados.jogadorAtualIndex;
        desenharJogadores();
        if (typeof renderizarCartasPersonagens === 'function') {
            renderizarCartasPersonagens(jogadorAtual().id);
        }
        if (typeof atualizarDestaqueInventario === 'function') {
            atualizarDestaqueInventario();
        }
        if (typeof atualizarInfoTurno === 'function') {
            atualizarInfoTurno();
        }
    }
}

function processarComprarCartaRemoto(dados) {
    const { jogadorId, tipoCarta, carta } = dados;
    // Atualizar UI de cartas se necessário
    console.log(`Jogador ${jogadorId} comprou carta:`, carta);
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
    console.log('🔧 atualizarBotoesControle chamado com estado:', estado);
    const btnIniciar = document.getElementById('btn-iniciar-jogo');
    const btnEncerrar = document.getElementById('btn-encerrar-jogo');
    const btnReiniciar = document.getElementById('btn-reiniciar-tabuleiro');
    
    console.log('🔍 Botões encontrados:', { btnIniciar: !!btnIniciar, btnEncerrar: !!btnEncerrar, btnReiniciar: !!btnReiniciar });
    
    if (estado === 'jogando') {
        // Jogo em andamento
        console.log('🎮 Aplicando estado "jogando"');
        if (btnIniciar) {
            btnIniciar.style.display = 'none';
            console.log('✅ Botão Iniciar escondido');
        }
        if (btnEncerrar) {
            btnEncerrar.style.display = 'block';
            console.log('✅ Botão Encerrar mostrado');
        }
        if (btnReiniciar) {
            btnReiniciar.disabled = true;
            console.log('✅ Botão Reiniciar desabilitado');
        }
        console.log('📣 Chamando mostrarMensagemJogo');
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
