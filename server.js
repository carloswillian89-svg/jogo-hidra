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
            socket.emit('receber-tabuleiro', {
                tabuleiro: sala.tabuleiro,
                tilesEstado: sala.tilesEstado,
                cartasEstado: sala.cartasEstado,
                entradaPosicao: sala.entradaPosicao,
                jogadorAtualIndex: sala.jogadorAtualIndex,
                jogadoresEstado: sala.jogadoresEstado || [],
                estadoSala: sala.estado
            });
            console.log(`📤 Tabuleiro existente enviado para ${socket.id} (reconexão)`);
            console.log(`  👥 Jogadores: ${sala.jogadoresEstado?.length || 0}, Índice atual: ${sala.jogadorAtualIndex}`);
            console.log(`  🎮 Estado da sala: ${sala.estado}`);
        }
    });

    // Sincronizar tabuleiro
    socket.on('enviar-tabuleiro', (dados) => {
        const sala = salas.get(dados.codigoSala);
        if (!sala) return;

        // Salvar o tabuleiro na sala
        sala.tabuleiro = dados.tabuleiro;
        sala.tilesEstado = dados.tilesEstado;
        sala.cartasEstado = dados.cartasEstado;
        sala.entradaPosicao = dados.entradaPosicao;
        sala.jogadorAtualIndex = dados.jogadorAtualIndex || 0;
        sala.jogadoresEstado = dados.jogadoresEstado || [];
        
        console.log(`🗺️ Tabuleiro recebido do host na sala ${dados.codigoSala}`);
        console.log(`  📍 jogadorAtualIndex recebido:`, dados.jogadorAtualIndex);
        console.log(`  ✅ jogadorAtualIndex salvo na sala:`, sala.jogadorAtualIndex);
        console.log(`  👥 Estado dos jogadores:`, sala.jogadoresEstado.length);
        
        // Enviar para todos os outros jogadores
        socket.to(dados.codigoSala).emit('receber-tabuleiro', {
            tabuleiro: dados.tabuleiro,
            tilesEstado: dados.tilesEstado,
            cartasEstado: dados.cartasEstado,
            entradaPosicao: dados.entradaPosicao,
            jogadorAtualIndex: sala.jogadorAtualIndex,
            jogadoresEstado: sala.jogadoresEstado
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
        
        // Embaralhar ordem dos jogadores
        const jogadoresEmbaralhados = [...sala.jogadores].sort(() => Math.random() - 0.5);
        jogadoresEmbaralhados.forEach((j, idx) => {
            j.ordem = idx + 1;
        });
        
        sala.estado = 'jogando';
        console.log(`✅ Sala ${dados.codigoSala} mudou para estado: jogando`);
        
        // Emitir evento jogo-iniciado com dados dos jogadores embaralhados
        io.to(dados.codigoSala).emit('jogo-iniciado', {
            jogadores: jogadoresEmbaralhados.map((j, idx) => ({
                id: j.socketId,
                nome: j.nome,
                personagem: j.personagem,
                ordem: idx + 1
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
            if (!sala.jogadoresEstado) {
                sala.jogadoresEstado = [];
            }
            
            // Encontrar e atualizar o jogador no estado salvo
            const jogadorEstado = sala.jogadoresEstado.find(j => j.id === dados.dados.jogadorId);
            if (jogadorEstado) {
                jogadorEstado.tileId = dados.dados.tileId;
                console.log(`📍 Posição atualizada: Jogador ${dados.dados.jogadorId} → Tile ${dados.dados.tileId}`);
            } else {
                // Se não existe, adicionar (não deveria acontecer, mas é um fallback)
                sala.jogadoresEstado.push({
                    id: dados.dados.jogadorId,
                    tileId: dados.dados.tileId
                });
                console.log(`📍 Posição adicionada: Jogador ${dados.dados.jogadorId} → Tile ${dados.dados.tileId}`);
            }
        }
        
        // Se for troca de tiles, atualizar estado dos tiles
        if (dados.tipo === 'trocar-tiles' && dados.dados) {
            if (!sala.tilesEstado) {
                sala.tilesEstado = [];
            }
            
            const { tile1Id, tile2Id } = dados.dados;
            
            // Encontrar os tiles e trocar seus tipos/rotações
            const tile1Estado = sala.tilesEstado.find(t => t.id === tile1Id);
            const tile2Estado = sala.tilesEstado.find(t => t.id === tile2Id);
            
            if (tile1Estado && tile2Estado) {
                // Trocar tipos e rotações
                const tempTipo = tile1Estado.tipo;
                const tempRotacao = tile1Estado.rotacao;
                
                tile1Estado.tipo = tile2Estado.tipo;
                tile1Estado.rotacao = tile2Estado.rotacao;
                
                tile2Estado.tipo = tempTipo;
                tile2Estado.rotacao = tempRotacao;
                
                // TAMBÉM trocar na matriz do tabuleiro
                if (sala.tabuleiro) {
                    const [linha1, coluna1] = tile1Id.split('-').map(Number);
                    const [linha2, coluna2] = tile2Id.split('-').map(Number);
                    
                    const tempMatriz = sala.tabuleiro[linha1][coluna1];
                    sala.tabuleiro[linha1][coluna1] = sala.tabuleiro[linha2][coluna2];
                    sala.tabuleiro[linha2][coluna2] = tempMatriz;
                    
                    console.log(`🔄 Tiles trocados no estado E na matriz: ${tile1Id} ↔ ${tile2Id}`);
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
        
        // Se for passar turno, atualizar jogadorAtualIndex
        if (dados.tipo === 'passar-turno' && dados.dados && typeof dados.dados.jogadorAtualIndex !== 'undefined') {
            sala.jogadorAtualIndex = dados.dados.jogadorAtualIndex;
            console.log(`🎮 Jogador atual atualizado: índice ${dados.dados.jogadorAtualIndex}`);
        }

        // Broadcast para outros jogadores
        socket.to(dados.codigoSala).emit('acao-jogo', dados);
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
