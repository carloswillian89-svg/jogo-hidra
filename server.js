const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Servir arquivos estáticos
app.use(express.static(__dirname));

// Rota raiz redireciona para lobby
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'lobby.html'));
});

// Estrutura de salas
const salas = new Map();

// Mapeamento de jogadores para reconexão (nome -> { sala, socketIdAntigo, timeoutId })
const jogadoresDesconectados = new Map();

// Classes para organizar dados
class Sala {
    constructor(codigo) {
        this.codigo = codigo;
        this.jogadores = [];
        this.estado = 'aguardando'; // aguardando, jogando, finalizado
        this.estadoJogo = null;
        this.tabuleiro = null; // Tabuleiro compartilhado
        this.tilesEstado = null; // Estado dos tiles (rotações)
        this.cartasEstado = null; // Estado das cartas
        this.entradaPosicao = null; // Posição da entrada
        this.jogadorAtualIndex = 0; // Índice do jogador atual
        this.maxJogadores = 4;
    }

    adicionarJogador(jogador) {
        if (this.jogadores.length >= this.maxJogadores) {
            return false;
        }
        this.jogadores.push(jogador);
        return true;
    }

    removerJogador(socketId) {
        this.jogadores = this.jogadores.filter(j => j.socketId !== socketId);
        if (this.jogadores.length === 0) {
            return true; // sala vazia, pode deletar
        }
        return false;
    }

    getJogador(socketId) {
        return this.jogadores.find(j => j.socketId === socketId);
    }

    todosPersonagensEscolhidos() {
        return this.jogadores.every(j => j.personagem !== null);
    }
}

class Jogador {
    constructor(socketId, nome) {
        this.socketId = socketId;
        this.nome = nome;
        this.personagem = null; // será escolhido depois
        this.pronto = false;
        this.id = null; // ID numérico será atribuído quando o jogo iniciar
        this.ordem = null; // Ordem de jogo
        this.tileId = null; // Posição atual no tabuleiro
    }
}

// Gerar código de sala único
function gerarCodigoSala() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
    console.log(`✅ Jogador conectado: ${socket.id}`);

    // Criar nova sala
    socket.on('criar-sala', (dados) => {
        const codigo = gerarCodigoSala();
        const sala = new Sala(codigo);
        const jogador = new Jogador(socket.id, dados.nome);
        
        sala.adicionarJogador(jogador);
        salas.set(codigo, sala);
        
        socket.join(codigo);
        socket.emit('sala-criada', {
            codigo,
            jogador: {
                id: socket.id,
                nome: dados.nome,
                ordem: 1
            }
        });
        
        console.log(`🎮 Sala criada: ${codigo} por ${dados.nome}`);
    });

    // Entrar em sala existente
    socket.on('entrar-sala', (dados) => {
        const sala = salas.get(dados.codigo);
        
        if (!sala) {
            socket.emit('erro', { mensagem: 'Sala não encontrada' });
            return;
        }

        if (sala.jogadores.length >= sala.maxJogadores) {
            socket.emit('erro', { mensagem: 'Sala cheia' });
            return;
        }

        if (sala.estado !== 'aguardando') {
            socket.emit('erro', { mensagem: 'Partida já iniciada' });
            return;
        }

        const jogador = new Jogador(socket.id, dados.nome);
        sala.adicionarJogador(jogador);
        socket.join(dados.codigo);

        const jogadoresInfo = sala.jogadores.map((j, idx) => ({
            id: j.socketId,
            nome: j.nome,
            personagem: j.personagem,
            ordem: idx + 1,
            pronto: j.pronto
        }));

        // Notificar o jogador que entrou
        socket.emit('entrou-na-sala', {
            codigo: dados.codigo,
            jogadores: jogadoresInfo,
            jogador: {
                id: socket.id,
                nome: dados.nome,
                ordem: sala.jogadores.length
            }
        });

        // Notificar outros jogadores
        socket.to(dados.codigo).emit('jogador-entrou', {
            jogador: {
                id: socket.id,
                nome: dados.nome,
                ordem: sala.jogadores.length
            },
            jogadores: jogadoresInfo
        });

        console.log(`👋 ${dados.nome} entrou na sala ${dados.codigo}`);
    });

    // Escolher personagem
    socket.on('escolher-personagem', (dados) => {
        const sala = salas.get(dados.codigoSala);
        if (!sala) return;

        const jogador = sala.getJogador(socket.id);
        if (!jogador) return;

        // Verificar se personagem já está em uso
        const personagemEmUso = sala.jogadores.some(
            j => j.socketId !== socket.id && j.personagem === dados.personagem
        );

        if (personagemEmUso) {
            socket.emit('erro', { mensagem: 'Personagem já escolhido por outro jogador' });
            return;
        }

        jogador.personagem = dados.personagem;

        // Notificar todos
        io.to(dados.codigoSala).emit('personagem-escolhido', {
            jogadorId: socket.id,
            personagem: dados.personagem
        });

        console.log(`🎭 ${jogador.nome} escolheu ${dados.personagem}`);
    });

    // Marcar como pronto
    socket.on('marcar-pronto', (dados) => {
        const sala = salas.get(dados.codigoSala);
        if (!sala) {
            socket.emit('erro', { mensagem: 'Sala não encontrada' });
            return;
        }

        const jogador = sala.getJogador(socket.id);
        if (!jogador) {
            socket.emit('erro', { mensagem: 'Jogador não encontrado na sala' });
            return;
        }
        
        if (!jogador.personagem) {
            socket.emit('erro', { mensagem: 'Escolha um personagem primeiro' });
            return;
        }

        jogador.pronto = !jogador.pronto;

        // Notificar todos sobre a mudança de status
        io.to(dados.codigoSala).emit('jogador-pronto', {
            jogadorId: socket.id,
            pronto: jogador.pronto
        });

        console.log(`${jogador.pronto ? '✅' : '⏳'} ${jogador.nome} ${jogador.pronto ? 'está pronto' : 'cancelou'}`);

        // Verificar se todos estão prontos (mínimo 2 jogadores)
        const todosComPersonagem = sala.jogadores.every(j => j.personagem !== null);
        const todosProntos = sala.jogadores.every(j => j.pronto);
        
        if (sala.jogadores.length >= 2 && todosComPersonagem && todosProntos) {
            // Aguardar um pouco para garantir que todos receberam o status de pronto
            setTimeout(() => {
                // NÃO mudar estado para 'jogando' - isso será feito pelo botão Iniciar Jogo
                // Apenas redirecionar jogadores para a tela do jogo
                
                // Embaralhar ordem dos jogadores
                const jogadoresEmbaralhados = [...sala.jogadores].sort(() => Math.random() - 0.5);
                jogadoresEmbaralhados.forEach((j, idx) => {
                    j.ordem = idx + 1;
                });

                io.to(dados.codigoSala).emit('jogo-iniciado', {
                    jogadores: jogadoresEmbaralhados.map((j, idx) => ({
                        id: j.socketId,
                        nome: j.nome,
                        personagem: j.personagem,
                        ordem: idx + 1
                    }))
                });

                console.log(`🎮 Jogadores redirecionados para o jogo na sala ${dados.codigoSala} (aguardando início)`);
            }, 500);
        }
    });

    // Reconectar jogador na sala após carregar o jogo
    socket.on('reconectar-sala', (dados) => {
        console.log(`🔄 Evento reconectar-sala recebido de ${socket.id}:`, dados);
        const sala = salas.get(dados.codigoSala);
        if (!sala) {
            console.log(`❌ Tentativa de reconectar em sala inexistente: ${dados.codigoSala}`);
            return;
        }

        // Procurar jogador pelo socketId antigo ou pelo nome nos desconectados
        let jogadorReconectado = null;
        for (const [nome, info] of jogadoresDesconectados.entries()) {
            if (info.sala === dados.codigoSala) {
                // Atualizar socketId do jogador
                const jogador = sala.getJogador(info.socketIdAntigo);
                if (jogador) {
                    const socketIdAntigo = jogador.socketId;
                    jogador.socketId = socket.id;
                    jogadorReconectado = jogador;
                    
                    // Cancelar timeout de remoção
                    clearTimeout(info.timeoutId);
                    jogadoresDesconectados.delete(nome);
                    
                    console.log(`✅ ${nome} reconectado: ${socketIdAntigo} → ${socket.id}`);
                    
                    // Notificar outros jogadores sobre a reconexão
                    socket.to(dados.codigoSala).emit('jogador-reconectou', {
                        jogadorId: socket.id,
                        jogadorIdAntigo: socketIdAntigo,
                        nome: nome
                    });
                    
                    break;
                }
            }
        }

        // Fazer socket entrar na room
        socket.join(dados.codigoSala);
        console.log(`🔄 Socket ${socket.id} reconectado à sala ${dados.codigoSala}`);

        // Enviar estado da sala para o jogador reconectado
        socket.emit('estado-sala', {
            estado: sala.estado
        });
        console.log(`📤 Estado da sala enviado: ${sala.estado}`);
        
        // Se já tiver tabuleiro, enviar para este jogador
        if (sala.tabuleiro) {
            console.log(`📤 [RECONEXÃO] Enviando tabuleiro salvo para ${socket.id}`);
            console.log(`  📊 Matriz linha 0:`, sala.tabuleiro[0]);
            console.log(`  📊 Matriz linha 1:`, sala.tabuleiro[1]);
            console.log(`  📊 Matriz linha 2:`, sala.tabuleiro[2]);
            console.log(`  📦 tilesEstado (primeiros 5):`, sala.tilesEstado.slice(0, 5).map(t => `${t.id}:${t.tipo}`));
            console.log(`  🎯 ORIGEM: Estado salvo no servidor (não vem do host)`);
            
            socket.emit('receber-tabuleiro', {
                tabuleiro: sala.tabuleiro,
                tilesEstado: sala.tilesEstado,
                cartasEstado: sala.cartasEstado,
                entradaPosicao: sala.entradaPosicao,
                jogadorAtualIndex: sala.jogadorAtualIndex,
                jogadoresEstado: sala.jogadores,  // 🔥 CORRIGIDO: usar sala.jogadores ao invés de jogadoresEstado
                estadoSala: sala.estado
            });
            console.log(`  👥 Jogadores: ${sala.jogadores?.length || 0}, Índice atual: ${sala.jogadorAtualIndex}`);
            console.log(`  🎮 Estado da sala: ${sala.estado}`);
        }
    });

    // Sincronizar tabuleiro
    socket.on('enviar-tabuleiro', (dados) => {
        const sala = salas.get(dados.codigoSala);
        if (!sala) return;

        // 🔒 PROTEÇÃO: Só aceitar envio de tabuleiro se estiver em 'aguardando' (primeiro início)
        // Se já estiver em 'jogando', ignorar para não sobrescrever estado salvo
        if (sala.estado === 'jogando') {
            console.log(`⛔ [BLOQUEADO] Host tentou enviar tabuleiro mas sala já está em 'jogando'`);
            console.log(`  ➡️ Ignorando para preservar estado salvo (Grito da Hidra, trocas, etc.)`);
            console.log(`  📊 Matriz salva - linha 1:`, sala.tabuleiro ? sala.tabuleiro[1] : 'null');
            return;
        }

        // Salvar o tabuleiro na sala
        console.log(`🗺️ [HOST ENVIOU] Tabuleiro recebido do host na sala ${dados.codigoSala}`);
        console.log(`  ⚠️ ANTES: Matriz linha 1 na sala:`, sala.tabuleiro ? sala.tabuleiro[1] : 'null');
        
        sala.tabuleiro = dados.tabuleiro;
        sala.tilesEstado = dados.tilesEstado;
        sala.cartasEstado = dados.cartasEstado;
        sala.entradaPosicao = dados.entradaPosicao;
        sala.jogadorAtualIndex = dados.jogadorAtualIndex || 0;
        
        // 🔥 Atualizar jogadores com tileId inicial (posição de entrada)
        if (dados.jogadoresEstado && dados.jogadoresEstado.length > 0) {
            dados.jogadoresEstado.forEach(jogadorEstado => {
                const jogador = sala.jogadores.find(j => j.id === jogadorEstado.id);
                if (jogador) {
                    jogador.tileId = jogadorEstado.tileId;
                    console.log(`  👤 Jogador ${jogador.id} (${jogador.nome}): tileId inicial = ${jogador.tileId}`);
                }
            });
        }
        
        console.log(`  ⚠️ DEPOIS: Matriz linha 1 sobrescrita:`, sala.tabuleiro[1]);
        console.log(`  📍 jogadorAtualIndex recebido:`, dados.jogadorAtualIndex);
        console.log(`  ✅ jogadorAtualIndex salvo na sala:`, sala.jogadorAtualIndex);
        console.log(`  👥 Jogadores na sala:`, sala.jogadores.length);
        console.log(`  📊 Matriz do host - linha 0:`, dados.tabuleiro[0]);
        console.log(`  📊 Matriz do host - linha 1:`, dados.tabuleiro[1]);
        console.log(`  🎯 ORIGEM: Tabuleiro enviado pelo HOST (socket ${socket.id})`);
        console.log(`  ⚠️ Isso VAI SOBRESCREVER o estado salvo na reconexão!`);
        
        // Enviar para todos os outros jogadores
        socket.to(dados.codigoSala).emit('receber-tabuleiro', {
            tabuleiro: dados.tabuleiro,
            tilesEstado: dados.tilesEstado,
            cartasEstado: dados.cartasEstado,
            entradaPosicao: dados.entradaPosicao,
            jogadorAtualIndex: sala.jogadorAtualIndex,
            jogadoresEstado: sala.jogadores  // 🔥 Enviar sala.jogadores completo
        });

        console.log(`📤 Tabuleiro compartilhado com outros jogadores da sala ${dados.codigoSala}`);
    });

    // Reiniciar tabuleiro
    socket.on('reiniciar-tabuleiro', (dados) => {
        const sala = salas.get(dados.codigoSala);
        if (!sala) return;
        
        // Limpar estado do tabuleiro (não resetar jogadorAtualIndex aqui - será definido pelo host)
        sala.tabuleiro = null;
        sala.tilesEstado = null;
        sala.cartasEstado = null;
        sala.entradaPosicao = null;
        // Não resetar sala.jogadorAtualIndex - o host enviará um novo valor aleatório
        
        // Enviar lista atualizada de jogadores para todos (para garantir sincronização)
        const jogadoresAtualizados = sala.jogadores.map((j, idx) => ({
            id: j.socketId,
            nome: j.nome,
            personagem: j.personagem,
            ordem: j.ordem
        }));
        
        // Notificar todos os jogadores para reiniciar
        io.to(dados.codigoSala).emit('tabuleiro-reiniciado', {
            jogadores: jogadoresAtualizados
        });
        
        console.log(`🔄 Tabuleiro reiniciado na sala ${dados.codigoSala}`);
        console.log(`👥 Jogadores atualizados enviados:`, jogadoresAtualizados);
    });
    
    // Iniciar jogo
    socket.on('iniciar-jogo', (dados) => {
        console.log(`📥 Evento iniciar-jogo recebido de ${socket.id}:`, dados);
        const sala = salas.get(dados.codigoSala);
        if (!sala) {
            console.error(`❌ Sala ${dados.codigoSala} não encontrada!`);
            return;
        }
        
        console.log(`📊 Estado atual da sala ${dados.codigoSala}:`, sala.estado);
        
        if (sala.estado === 'jogando') {
            console.log(`⚠️ Jogo já está em andamento na sala ${dados.codigoSala}, reenviando evento`);
            // Reenviar o evento para garantir que o cliente receba
            io.to(dados.codigoSala).emit('jogo-iniciado-partida');
            return;
        }
        
        // Embaralhar ordem dos jogadores e atribuir IDs numéricos
        const jogadoresEmbaralhados = [...sala.jogadores].sort(() => Math.random() - 0.5);
        jogadoresEmbaralhados.forEach((j, idx) => {
            j.id = idx + 1;  // ID numérico (1, 2, 3, 4)
            j.ordem = idx + 1;  // Ordem de jogo
        });
        
        sala.estado = 'jogando';
        console.log(`✅ Sala ${dados.codigoSala} mudou para estado: jogando`);
        
        // Emitir evento jogo-iniciado com dados dos jogadores embaralhados
        io.to(dados.codigoSala).emit('jogo-iniciado', {
            jogadores: jogadoresEmbaralhados.map(j => ({
                id: j.id,  // ID numérico (1, 2, 3, 4)
                socketId: j.socketId,  // Manter socketId também para referência
                nome: j.nome,
                personagem: j.personagem,
                ordem: j.ordem
            }))
        });
        
        // Notificar todos os jogadores para atualizar botões de controle
        console.log(`📤 Emitindo jogo-iniciado-partida para sala ${dados.codigoSala}`);
        io.to(dados.codigoSala).emit('jogo-iniciado-partida');
        
        console.log(`🎮 Jogo iniciado na sala ${dados.codigoSala}`);
    });
    
    // Encerrar jogo
    socket.on('encerrar-jogo', (dados) => {
        const sala = salas.get(dados.codigoSala);
        if (!sala) return;
        
        sala.estado = 'aguardando';
        
        // Notificar todos os jogadores
        io.to(dados.codigoSala).emit('jogo-encerrado');
        
        console.log(`🏁 Jogo encerrado na sala ${dados.codigoSala}`);
    });

    // Sincronizar ações do jogo
    socket.on('acao-jogo', (dados) => {
        const sala = salas.get(dados.codigoSala);
        if (!sala || sala.estado !== 'jogando') return;

        // Atualizar estado da sala
        if (dados.estado) {
            sala.estadoJogo = dados.estado;
        }
        
        // Se for movimento de jogador, atualizar posição salva
        if (dados.tipo === 'mover-jogador' && dados.dados) {
            // Atualizar tileId diretamente no jogador
            const jogador = sala.jogadores.find(j => j.id === dados.dados.jogadorId);
            if (jogador) {
                jogador.tileId = dados.dados.tileId;
                console.log(`📍 Posição atualizada: Jogador ${jogador.id} (${jogador.nome}) → Tile ${jogador.tileId}`);
            } else {
                console.warn(`⚠️ Jogador ${dados.dados.jogadorId} não encontrado para atualizar posição`);
            }
        }
        
        // Se for troca de tiles, atualizar estado dos tiles
        if (dados.tipo === 'trocar-tiles' && dados.dados) {
            if (!sala.tilesEstado) {
                sala.tilesEstado = [];
            }
            
            const { tile1Id, tile2Id } = dados.dados;
            
            console.log(`🔄 Iniciando troca de tiles: ${tile1Id} ↔ ${tile2Id}`);
            
            // Encontrar os tiles e trocar seus tipos/rotações
            const tile1Estado = sala.tilesEstado.find(t => t.id === tile1Id);
            const tile2Estado = sala.tilesEstado.find(t => t.id === tile2Id);
            
            if (tile1Estado && tile2Estado) {
                console.log(`  📍 Antes da troca:`);
                console.log(`    ${tile1Id}: tipo="${tile1Estado.tipo}" rot=${tile1Estado.rotacao}°`);
                console.log(`    ${tile2Id}: tipo="${tile2Estado.tipo}" rot=${tile2Estado.rotacao}°`);
                
                // Trocar tipos e rotações
                const tempTipo = tile1Estado.tipo;
                const tempRotacao = tile1Estado.rotacao;
                
                tile1Estado.tipo = tile2Estado.tipo;
                tile1Estado.rotacao = tile2Estado.rotacao;
                
                tile2Estado.tipo = tempTipo;
                tile2Estado.rotacao = tempRotacao;
                
                console.log(`  📍 Depois da troca no estado:`);
                console.log(`    ${tile1Id}: tipo="${tile1Estado.tipo}" rot=${tile1Estado.rotacao}°`);
                console.log(`    ${tile2Id}: tipo="${tile2Estado.tipo}" rot=${tile2Estado.rotacao}°`);
                
                // TAMBÉM trocar na matriz do tabuleiro
                if (sala.tabuleiro) {
                    const [linha1, coluna1] = tile1Id.split('-').map(Number);
                    const [linha2, coluna2] = tile2Id.split('-').map(Number);
                    
                    console.log(`  📊 Antes da troca na matriz:`);
                    console.log(`    [${linha1}][${coluna1}] = "${sala.tabuleiro[linha1][coluna1]}"`);
                    console.log(`    [${linha2}][${coluna2}] = "${sala.tabuleiro[linha2][coluna2]}"`);
                    
                    const tempMatriz = sala.tabuleiro[linha1][coluna1];
                    sala.tabuleiro[linha1][coluna1] = sala.tabuleiro[linha2][coluna2];
                    sala.tabuleiro[linha2][coluna2] = tempMatriz;
                    
                    console.log(`  📊 Depois da troca na matriz:`);
                    console.log(`    [${linha1}][${coluna1}] = "${sala.tabuleiro[linha1][coluna1]}"`);
                    console.log(`    [${linha2}][${coluna2}] = "${sala.tabuleiro[linha2][coluna2]}"`);
                    console.log(`✅ Tiles trocados no estado E na matriz: ${tile1Id} ↔ ${tile2Id}`);
                    
                    // 🔥 ATUALIZAR CARTAS E JOGADORES que estão nos tiles trocados
                    console.log(`  🔄 Atualizando cartas e jogadores nos tiles trocados...`);
                    
                    // Atualizar cartas
                    if (sala.cartasEstado) {
                        const cartasNoTile1 = sala.cartasEstado.filter(c => c.zona === `tile-${tile1Id}`);
                        const cartasNoTile2 = sala.cartasEstado.filter(c => c.zona === `tile-${tile2Id}`);
                        
                        cartasNoTile1.forEach(c => {
                            c.zona = `tile-${tile2Id}`;
                            console.log(`    🃏 Carta ${c.id}: tile-${tile1Id} → tile-${tile2Id}`);
                        });
                        
                        cartasNoTile2.forEach(c => {
                            c.zona = `tile-${tile1Id}`;
                            console.log(`    🃏 Carta ${c.id}: tile-${tile2Id} → tile-${tile1Id}`);
                        });
                    }
                    
                    // Atualizar jogadores
                    const jogadoresNoTile1 = sala.jogadores.filter(j => j.tileId === tile1Id);
                    const jogadoresNoTile2 = sala.jogadores.filter(j => j.tileId === tile2Id);
                    
                    jogadoresNoTile1.forEach(j => {
                        j.tileId = tile2Id;
                        console.log(`    👤 Jogador ${j.id}: ${tile1Id} → ${tile2Id}`);
                    });
                    
                    jogadoresNoTile2.forEach(j => {
                        j.tileId = tile1Id;
                        console.log(`    👤 Jogador ${j.id}: ${tile2Id} → ${tile1Id}`);
                    });
                    
                    console.log(`  ✅ Cartas e jogadores atualizados após troca`);
                } else {
                    console.log(`🔄 Tiles trocados apenas no estado: ${tile1Id} ↔ ${tile2Id}`);
                }
            }
        }
        
        // Se for virar carta, atualizar estado da carta
        if ((dados.tipo === 'virar-carta' || dados.tipo === 'virar-carta-personagem') && dados.dados) {
            if (!sala.cartasEstado) {
                sala.cartasEstado = [];
            }
            
            const cartaEstado = sala.cartasEstado.find(c => c.id === dados.dados.cartaId);
            if (cartaEstado) {
                cartaEstado.faceUp = dados.dados.faceUp;
                console.log(`🃏 Carta ${dados.dados.cartaId} virada: ${dados.dados.faceUp ? 'face up' : 'face down'}`);
            }
        }
        
        // Se for mover carta para zona (inventário, descarte, etc)
        if (dados.tipo === 'mover-carta' && dados.dados) {
            if (!sala.cartasEstado) {
                sala.cartasEstado = [];
            }
            
            const cartaEstado = sala.cartasEstado.find(c => c.id === dados.dados.idCarta);
            if (cartaEstado) {
                cartaEstado.zona = dados.dados.destino;
                
                // Se moveu para inventário de jogador, atualizar dono
                if (dados.dados.destino.startsWith('jogador-')) {
                    cartaEstado.dono = Number(dados.dados.destino.split('-')[1]);
                    cartaEstado.faceUp = true;
                } else {
                    cartaEstado.dono = null;
                    cartaEstado.faceUp = false;
                }
                
                console.log(`🃏 Carta ${dados.dados.idCarta} movida para: ${dados.dados.destino}`);
            }
        }
        
        // Se for girar tile, atualizar rotação
        if (dados.tipo === 'girar-tile' && dados.dados) {
            if (!sala.tilesEstado) {
                sala.tilesEstado = [];
            }
            
            const tileEstado = sala.tilesEstado.find(t => t.id === dados.dados.tileId);
            if (tileEstado) {
                tileEstado.rotacao = dados.dados.rotacao;
                console.log(`🔄 Tile ${dados.dados.tileId} girado: ${dados.dados.rotacao}°`);
            }
        }
        
        // Se for Grito da Hidra, rotacionar linha ou coluna inteira
        if (dados.tipo === 'grito-hidra' && dados.dados) {
            const { ehLinha, indice } = dados.dados;
            const TAMANHO = 5;
            
            console.log(`🐉 Grito da Hidra! ${ehLinha ? 'Linha' : 'Coluna'} ${indice}`);
            
            if (!sala.tilesEstado || !sala.tabuleiro) {
                console.log(`⚠️ Não é possível aplicar Grito da Hidra: estado não inicializado`);
            } else {
                // Coletar IDs dos tiles afetados
                const tileIds = [];
                if (ehLinha) {
                    for (let col = 0; col < TAMANHO; col++) {
                        tileIds.push(`${indice}-${col}`);
                    }
                } else {
                    for (let lin = 0; lin < TAMANHO; lin++) {
                        tileIds.push(`${lin}-${indice}`);
                    }
                }
                
                console.log(`  📍 Tiles afetados:`, tileIds);
                
                // Coletar estados e tipos dos tiles ANTES da rotação
                const tilesInfo = tileIds.map(id => {
                    const estado = sala.tilesEstado.find(t => t.id === id);
                    const [lin, col] = id.split('-').map(Number);
                    const tipo = estado?.tipo || sala.tabuleiro[lin][col];
                    const rotacao = estado?.rotacao || 0;
                    console.log(`    ${id}: tipo="${tipo}" rot=${rotacao}°`);
                    return { id, tipo, rotacao };
                });
                
                console.log(`  🔄 Iniciando rotação circular...`);
                
                // Rotação circular para DIREITA: [0,1,2,3,4] → [4,0,1,2,3]
                // Posição 0 recebe o último, posição 1 recebe 0, posição 2 recebe 1, etc
                const ultimo = tilesInfo[tilesInfo.length - 1];
                
                // Atualizar do final para o início (evita sobrescrever valores)
                for (let i = tilesInfo.length - 1; i > 0; i--) {
                    const atual = tileIds[i];
                    const anterior = tilesInfo[i - 1];
                    
                    console.log(`    ${atual} ← ${anterior.id}: tipo="${anterior.tipo}" rot=${anterior.rotacao}°`);
                    
                    // Atualizar tilesEstado
                    const estadoAtual = sala.tilesEstado.find(t => t.id === atual);
                    if (estadoAtual) {
                        estadoAtual.tipo = anterior.tipo;
                        estadoAtual.rotacao = anterior.rotacao;
                    }
                    
                    // Atualizar matriz
                    const [lin, col] = atual.split('-').map(Number);
                    sala.tabuleiro[lin][col] = anterior.tipo;
                }
                
                // Primeiro tile recebe o último
                const primeiroId = tileIds[0];
                console.log(`    ${primeiroId} ← ${ultimo.id}: tipo="${ultimo.tipo}" rot=${ultimo.rotacao}°`);
                
                const estadoPrimeiro = sala.tilesEstado.find(t => t.id === primeiroId);
                if (estadoPrimeiro) {
                    estadoPrimeiro.tipo = ultimo.tipo;
                    estadoPrimeiro.rotacao = ultimo.rotacao;
                }
                const [linPri, colPri] = primeiroId.split('-').map(Number);
                sala.tabuleiro[linPri][colPri] = ultimo.tipo;
                
                console.log(`  ✅ Grito da Hidra aplicado: ${tileIds.length} tiles rotacionados`);
                
                // 🔥 ATUALIZAR CARTAS E JOGADORES APÓS ROTAÇÃO
                console.log(`  🔄 Atualizando cartas e jogadores...`);
                
                // PASSO 1: Salvar quais cartas e jogadores estavam em cada posição ANTES da rotação
                const cartasPorPosicao = new Map(); // posição (0-4) → [cartaIds]
                const jogadoresPorPosicao = new Map(); // posição (0-4) → [jogadorIds]
                
                tileIds.forEach((tileId, posicao) => {
                    // Salvar cartas desta posição
                    if (sala.cartasEstado) {
                        const cartasNesteTile = sala.cartasEstado
                            .filter(c => c.zona === `tile-${tileId}`)
                            .map(c => c.id);
                        if (cartasNesteTile.length > 0) {
                            cartasPorPosicao.set(posicao, cartasNesteTile);
                            console.log(`    📋 Posição ${posicao} (tile ${tileId}): ${cartasNesteTile.length} carta(s)`);
                        }
                    }
                    
                    // Salvar jogadores desta posição
                    const jogadoresNesteTile = sala.jogadores
                        .filter(j => j.tileId === tileId)
                        .map(j => j.id);
                    if (jogadoresNesteTile.length > 0) {
                        jogadoresPorPosicao.set(posicao, jogadoresNesteTile);
                        console.log(`    👤 Posição ${posicao} (tile ${tileId}): ${jogadoresNesteTile.length} jogador(es)`);
                    }
                });
                
                // PASSO 2: Atualizar cartas e jogadores baseado na nova posição dos tiles
                let cartasAtualizadas = 0;
                let jogadoresAtualizados = 0;
                
                tileIds.forEach((tileId, posicaoAtual) => {
                    // Rotação para DIREITA: posição N recebe tile que estava em posição (N-1)
                    const posicaoOriginal = (posicaoAtual - 1 + TAMANHO) % TAMANHO;
                    
                    // Atualizar cartas que estavam na posição original
                    if (cartasPorPosicao.has(posicaoOriginal)) {
                        const cartasIds = cartasPorPosicao.get(posicaoOriginal);
                        cartasIds.forEach(cartaId => {
                            const carta = sala.cartasEstado.find(c => c.id === cartaId);
                            if (carta) {
                                const zonaAntiga = carta.zona;
                                carta.zona = `tile-${tileId}`;
                                console.log(`      📋 Carta ${cartaId}: ${zonaAntiga} → tile-${tileId}`);
                                cartasAtualizadas++;
                            }
                        });
                    }
                    
                    // Atualizar jogadores que estavam na posição original
                    if (jogadoresPorPosicao.has(posicaoOriginal)) {
                        const jogadoresIds = jogadoresPorPosicao.get(posicaoOriginal);
                        jogadoresIds.forEach(jogadorId => {
                            const jogador = sala.jogadores.find(j => j.id === jogadorId);
                            if (jogador) {
                                const tileIdAntigo = jogador.tileId;
                                jogador.tileId = tileId;
                                console.log(`      👤 Jogador ${jogadorId}: ${tileIdAntigo} → ${tileId}`);
                                jogadoresAtualizados++;
                            }
                        });
                    }
                });
                
                console.log(`  ✅ ${cartasAtualizadas} cartas e ${jogadoresAtualizados} jogadores atualizados`);
                
                // Log do estado final dos jogadores
                console.log(`  👥 Estado final dos jogadores após Grito da Hidra:`);
                sala.jogadores.forEach(j => {
                    console.log(`    Jogador ${j.id} (${j.nome}): tileId="${j.tileId}"`);
                });
                
                // Verificar resultado
                console.log(`  📊 Estado após rotação:`);
                tileIds.forEach(id => {
                    const estado = sala.tilesEstado.find(t => t.id === id);
                    const [lin, col] = id.split('-').map(Number);
                    console.log(`    ${id}: tipo="${estado?.tipo || sala.tabuleiro[lin][col]}" rot=${estado?.rotacao || 0}°`);
                });
            }
        }
        
        // Se for passar turno, atualizar jogadorAtualIndex
        if (dados.tipo === 'passar-turno' && dados.dados && typeof dados.dados.jogadorAtualIndex !== 'undefined') {
            sala.jogadorAtualIndex = dados.dados.jogadorAtualIndex;
            console.log(`🎮 Jogador atual atualizado: índice ${dados.dados.jogadorAtualIndex}`);
        }

        // Broadcast para outros jogadores com jogadores atualizados
        const dadosParaEnviar = {
            ...dados,
            jogadoresAtualizados: sala.jogadores  // 🔥 Incluir jogadores atualizados
        };
        socket.to(dados.codigoSala).emit('acao-jogo', dadosParaEnviar);
    });

    // Desconexão
    socket.on('disconnect', () => {
        console.log(`❌ Jogador desconectou: ${socket.id}`);

        // Aguardar reconexão em qualquer estado (pode estar navegando entre páginas)
        for (const [codigo, sala] of salas.entries()) {
            const jogador = sala.getJogador(socket.id);
            
            if (jogador) {
                console.log(`⏳ Aguardando reconexão de ${jogador.nome}...`);
                
                const timeoutId = setTimeout(() => {
                    // Após 10 segundos, remover de verdade
                    const jogadorAinda = sala.getJogador(socket.id);
                    if (jogadorAinda) {
                        const salaVazia = sala.removerJogador(socket.id);
                        
                        if (salaVazia) {
                            salas.delete(codigo);
                            console.log(`🗑️ Sala ${codigo} removida (vazia após timeout)`);
                        } else {
                            io.to(codigo).emit('jogador-saiu', {
                                jogadorId: socket.id,
                                nome: jogadorAinda.nome
                            });
                            console.log(`👋 ${jogadorAinda.nome} saiu da sala ${codigo} (timeout)`);
                        }
                    }
                    jogadoresDesconectados.delete(jogador.nome);
                }, 10000);
                
                jogadoresDesconectados.set(jogador.nome, {
                    sala: codigo,
                    socketIdAntigo: socket.id,
                    jogador: jogador,
                    timeoutId: timeoutId
                });
                
                break;
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
