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

// Classes para organizar dados
class Sala {
    constructor(codigo) {
        this.codigo = codigo;
        this.jogadores = [];
        this.estado = 'aguardando'; // aguardando, jogando, finalizado
        this.estadoJogo = null;
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
        if (!sala) return;

        const jogador = sala.getJogador(socket.id);
        if (!jogador || !jogador.personagem) {
            socket.emit('erro', { mensagem: 'Escolha um personagem primeiro' });
            return;
        }

        jogador.pronto = !jogador.pronto;

        io.to(dados.codigoSala).emit('jogador-pronto', {
            jogadorId: socket.id,
            pronto: jogador.pronto
        });

        // Verificar se todos estão prontos
        if (sala.jogadores.length >= 2 && sala.jogadores.every(j => j.pronto)) {
            sala.estado = 'jogando';
            
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

            console.log(`🎮 Jogo iniciado na sala ${dados.codigoSala}`);
        }
    });

    // Sincronizar ações do jogo
    socket.on('acao-jogo', (dados) => {
        const sala = salas.get(dados.codigoSala);
        if (!sala || sala.estado !== 'jogando') return;

        // Atualizar estado da sala
        if (dados.estado) {
            sala.estadoJogo = dados.estado;
        }

        // Broadcast para outros jogadores
        socket.to(dados.codigoSala).emit('acao-jogo', dados);
    });

    // Desconexão
    socket.on('disconnect', () => {
        console.log(`❌ Jogador desconectou: ${socket.id}`);

        // Remover jogador de todas as salas
        for (const [codigo, sala] of salas.entries()) {
            const jogador = sala.getJogador(socket.id);
            
            if (jogador) {
                const salaVazia = sala.removerJogador(socket.id);
                
                if (salaVazia) {
                    salas.delete(codigo);
                    console.log(`🗑️ Sala ${codigo} removida (vazia)`);
                } else {
                    io.to(codigo).emit('jogador-saiu', {
                        jogadorId: socket.id,
                        nome: jogador.nome
                    });
                    console.log(`👋 ${jogador.nome} saiu da sala ${codigo}`);
                }
                break;
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
