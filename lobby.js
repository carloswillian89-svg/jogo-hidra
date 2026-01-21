const socket = io();

// Sistema de Áudio do Lobby
const musicaLobby = new Audio('som/lobby.mp3');
musicaLobby.loop = true;

// Aplicar volume salvo ou usar 30% como padrão para música de fundo
const volumeSalvo = parseFloat(localStorage.getItem('volumeJogo'));
musicaLobby.volume = (!isNaN(volumeSalvo) && volumeSalvo >= 0 && volumeSalvo <= 1) ? volumeSalvo * 0.6 : 0.3; // Música de fundo um pouco mais baixa

// Iniciar música do lobby quando a página carregar
window.addEventListener('load', () => {
    musicaLobby.play().catch(err => {
        console.log('Música do lobby será reproduzida após interação do usuário');
    });
});

// Garantir que a música toque após qualquer clique do usuário
document.addEventListener('click', () => {
    if (musicaLobby.paused) {
        musicaLobby.play().catch(err => console.log('Erro ao tocar música:', err));
    }
}, { once: false });

// Controle de Volume
const btnVolume = document.getElementById('btn-volume');
const sliderVolume = document.getElementById('slider-volume');
const iconeVolume = document.getElementById('icone-volume');

// Aplicar volume inicial ao slider
sliderVolume.value = musicaLobby.volume * 100;

// Alternar mudo
btnVolume.addEventListener('click', () => {
    if (musicaLobby.volume > 0) {
        musicaLobby.dataset.volumeAnterior = musicaLobby.volume;
        musicaLobby.volume = 0;
        sliderVolume.value = 0;
        iconeVolume.textContent = '🔇';
    } else {
        const volumeAnterior = parseFloat(musicaLobby.dataset.volumeAnterior) || 0.3;
        musicaLobby.volume = volumeAnterior;
        sliderVolume.value = volumeAnterior * 100;
        atualizarIconeVolume(volumeAnterior);
    }
});

// Slider de volume
sliderVolume.addEventListener('input', (e) => {
    const volume = e.target.value / 100;
    musicaLobby.volume = volume;
    atualizarIconeVolume(volume);
    localStorage.setItem('volumeJogo', volume.toString());
});

function atualizarIconeVolume(volume) {
    if (volume === 0) {
        iconeVolume.textContent = '🔇';
    } else if (volume < 0.33) {
        iconeVolume.textContent = '🔈';
    } else if (volume < 0.66) {
        iconeVolume.textContent = '🔉';
    } else {
        iconeVolume.textContent = '🔊';
    }
}

let estadoLocal = {
    nome: '',
    codigoSala: '',
    meuId: '',
    personagemEscolhido: null,
    pronto: false,
    jogadores: [],
    ehHost: false
};

// Estado do carrossel
let carrosselIndex = 0;
const personagensCards = [];

// Elementos DOM
const telaInicial = document.getElementById('tela-inicial');
const telaLobby = document.getElementById('tela-lobby');
const nomeJogadorInput = document.getElementById('nome-jogador');
const codigoSalaInput = document.getElementById('codigo-sala');
const btnCriarSala = document.getElementById('btn-criar-sala');
const btnEntrarSala = document.getElementById('btn-entrar-sala');
const btnJogarLocal = document.getElementById('btn-jogar-local');
const codigoSalaDisplay = document.getElementById('codigo-sala-display');
const btnCopiarCodigo = document.getElementById('btn-copiar-codigo');
const btnPronto = document.getElementById('btn-pronto');
const btnSairLobby = document.getElementById('btn-sair-lobby');
const listaJogadores = document.getElementById('lista-jogadores');
const qtdJogadores = document.getElementById('qtd-jogadores');
const btnIniciarJogoLobby = document.getElementById('btn-iniciar-jogo-lobby');

// Inicializar carrossel
function inicializarCarrossel() {
    const cards = document.querySelectorAll('.card-personagem');
    personagensCards.length = 0;
    personagensCards.push(...cards);
    
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const indicadores = document.querySelectorAll('.indicador');
    
    btnPrev.addEventListener('click', () => navegarCarrossel(-1));
    btnNext.addEventListener('click', () => navegarCarrossel(1));
    
    indicadores.forEach((indicador, index) => {
        indicador.addEventListener('click', () => irParaSlide(index));
    });
    
    mostrarSlide(0);
}

function navegarCarrossel(direcao) {
    carrosselIndex += direcao;
    
    if (carrosselIndex < 0) {
        carrosselIndex = personagensCards.length - 1;
    } else if (carrosselIndex >= personagensCards.length) {
        carrosselIndex = 0;
    }
    
    mostrarSlide(carrosselIndex);
}

function irParaSlide(index) {
    carrosselIndex = index;
    mostrarSlide(carrosselIndex);
}

function mostrarSlide(index) {
    personagensCards.forEach((card, i) => {
        card.classList.toggle('active', i === index);
    });
    
    document.querySelectorAll('.indicador').forEach((ind, i) => {
        ind.classList.toggle('active', i === index);
    });
}

// Funções de navegação
function mostrarTela(tela) {
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    tela.classList.add('ativa');
}

function mostrarNotificacao(mensagem, tipo = 'info') {
    const notif = document.getElementById('notificacao');
    notif.textContent = mensagem;
    notif.className = `notificacao ${tipo} ativa`;
    setTimeout(() => notif.classList.remove('ativa'), 3000);
}

// Criar sala
btnCriarSala.addEventListener('click', () => {
    const nome = nomeJogadorInput.value.trim();
    if (!nome) {
        mostrarNotificacao('Digite seu nome', 'erro');
        return;
    }
    estadoLocal.nome = nome;
    socket.emit('criar-sala', { nome });
});

// Entrar em sala
btnEntrarSala.addEventListener('click', () => {
    const nome = nomeJogadorInput.value.trim();
    const codigo = codigoSalaInput.value.trim().toUpperCase();
    
    if (!nome) {
        mostrarNotificacao('Digite seu nome', 'erro');
        return;
    }
    if (!codigo) {
        mostrarNotificacao('Digite o código da sala', 'erro');
        return;
    }
    
    estadoLocal.nome = nome;
    socket.emit('entrar-sala', { nome, codigo });
});

// Jogar local
btnJogarLocal.addEventListener('click', () => {
    musicaLobby.pause();
    window.location.href = 'index.html';
});

// Copiar código da sala
btnCopiarCodigo.addEventListener('click', () => {
    navigator.clipboard.writeText(estadoLocal.codigoSala);
    mostrarNotificacao('Código copiado!', 'sucesso');
});

// Escolher personagem
document.querySelectorAll('.card-personagem').forEach(card => {
    const btnEscolher = card.querySelector('.btn-escolher');
    btnEscolher.addEventListener('click', () => {
        const personagem = card.dataset.personagem;
        
        if (card.classList.contains('ocupado')) {
            mostrarNotificacao('Personagem já escolhido', 'erro');
            return;
        }
        
        socket.emit('escolher-personagem', {
            codigoSala: estadoLocal.codigoSala,
            personagem
        });
    });
});

// Marcar como pronto
btnPronto.addEventListener('click', () => {
    socket.emit('marcar-pronto', {
        codigoSala: estadoLocal.codigoSala
    });
});

// Sair do lobby
btnSairLobby.addEventListener('click', () => {
    musicaLobby.pause();
    window.location.reload();
});

// Atualizar UI de personagens
function atualizarPersonagens() {
    document.querySelectorAll('.card-personagem').forEach(card => {
        const personagem = card.dataset.personagem;
        const ocupado = estadoLocal.jogadores.some(
            j => j.personagem === personagem && j.id !== estadoLocal.meuId
        );
        const meuPersonagem = estadoLocal.personagemEscolhido === personagem;
        
        card.classList.toggle('ocupado', ocupado);
        card.classList.toggle('selecionado', meuPersonagem);
        
        if (ocupado) {
            const jogador = estadoLocal.jogadores.find(j => j.personagem === personagem);
            card.querySelector('.status-escolhido').textContent = `✓ ${jogador.nome}`;
        } else if (meuPersonagem) {
            card.querySelector('.status-escolhido').textContent = '✓ Você';
        }
    });
    
    // Habilitar botão pronto se escolheu personagem
    btnPronto.disabled = !estadoLocal.personagemEscolhido;
}

// Verificar se é o host e mostrar configurações
function verificarSeEhHost() {
    const configHost = document.getElementById('config-host');
    
    if (configHost) {
        configHost.style.display = estadoLocal.ehHost ? 'block' : 'none';
    }
}

// Atualizar lista de jogadores
function atualizarListaJogadores() {
    listaJogadores.innerHTML = '';
    qtdJogadores.textContent = estadoLocal.jogadores.length;
    
    estadoLocal.jogadores.forEach(jogador => {
        const li = document.createElement('li');
        li.className = 'item-jogador';
        
        const personagensIcones = {
            'torvin': '⚔️',
            'elara': '🏹',
            'zephyr': '🔮',
            'kaelen': '🗡️'
        };
        
        const personagensNomes = {
            'torvin': 'Torvin',
            'elara': 'Elara',
            'zephyr': 'Zephyr',
            'kaelen': 'Kaelen'
        };
        
        const icone = jogador.personagem ? 
            (personagensIcones[jogador.personagem.toLowerCase()] || '👤') : 
            '👤';
        
        const nomePersonagem = jogador.personagem ? 
            personagensNomes[jogador.personagem.toLowerCase()] || jogador.personagem :
            '';
        
        const status = jogador.pronto ? '✅' : '⏳';
        const voce = jogador.id === estadoLocal.meuId ? ' (Você)' : '';
        const personagemTexto = nomePersonagem ? ` - ${nomePersonagem}` : '';
        const hostIndicador = (jogador.id === estadoLocal.jogadores[0]?.id) ? '👑 ' : '';
        
        li.innerHTML = `
            <span class="jogador-nome">${hostIndicador}${jogador.nome}${personagemTexto}${voce}</span>
            <span class="jogador-status">${status}</span>
        `;
        
        listaJogadores.appendChild(li);
    });
}

// ===== EVENTOS DO SOCKET =====

socket.on('sala-criada', (dados) => {
    estadoLocal.codigoSala = dados.codigo;
    estadoLocal.meuId = dados.jogador.id;
    estadoLocal.jogadores = [dados.jogador];
    estadoLocal.ehHost = true; // Quem cria a sala é sempre o host
    
    codigoSalaDisplay.textContent = dados.codigo;
    mostrarTela(telaLobby);
    inicializarCarrossel();
    mostrarNotificacao('Sala criada! Compartilhe o código com seus amigos', 'sucesso');
    atualizarListaJogadores();
    verificarSeEhHost();
});

socket.on('entrou-na-sala', (dados) => {
    estadoLocal.codigoSala = dados.codigo;
    estadoLocal.meuId = dados.jogador.id;
    estadoLocal.jogadores = dados.jogadores;
    estadoLocal.ehHost = false; // Quem entra na sala não é host
    
    codigoSalaDisplay.textContent = dados.codigo;
    mostrarTela(telaLobby);
    inicializarCarrossel();
    mostrarNotificacao('Você entrou na sala!', 'sucesso');
    atualizarListaJogadores();
    atualizarPersonagens();
    verificarSeEhHost();
});

socket.on('jogador-entrou', (dados) => {
    estadoLocal.jogadores = dados.jogadores;
    mostrarNotificacao(`${dados.jogador.nome} entrou na sala`, 'info');
    atualizarListaJogadores();
    verificarSeEhHost();
});

socket.on('jogador-saiu', (dados) => {
    estadoLocal.jogadores = estadoLocal.jogadores.filter(j => j.id !== dados.jogadorId);
    mostrarNotificacao(`${dados.nome} saiu da sala`, 'info');
    atualizarListaJogadores();
    atualizarPersonagens();
    verificarSeEhHost();
});

socket.on('personagem-escolhido', (dados) => {
    const jogador = estadoLocal.jogadores.find(j => j.id === dados.jogadorId);
    if (jogador) {
        jogador.personagem = dados.personagem;
    }
    
    if (dados.jogadorId === estadoLocal.meuId) {
        estadoLocal.personagemEscolhido = dados.personagem;
        mostrarNotificacao(`Você escolheu ${dados.personagem}!`, 'sucesso');
    }
    
    atualizarPersonagens();
    atualizarListaJogadores();
});

socket.on('jogador-pronto', (dados) => {
    console.log('👥 Jogador pronto:', dados);
    const jogador = estadoLocal.jogadores.find(j => j.id === dados.jogadorId);
    if (jogador) {
        jogador.pronto = dados.pronto;
        console.log(`${jogador.nome} agora está ${dados.pronto ? 'pronto' : 'não pronto'}`);
    }
    
    if (dados.jogadorId === estadoLocal.meuId) {
        estadoLocal.pronto = dados.pronto;
        btnPronto.textContent = dados.pronto ? 'Cancelar' : 'Estou Pronto!';
        btnPronto.classList.toggle('pronto', dados.pronto);
    }
    
    const todosProntos = estadoLocal.jogadores.every(j => j.pronto);
    console.log(`Total de jogadores: ${estadoLocal.jogadores.length}, Todos prontos: ${todosProntos}`);
    
    atualizarListaJogadores();
});

socket.on('jogo-iniciado', (dados) => {
    console.log('🎮 Recebido evento jogo-iniciado:', dados);
    mostrarNotificacao('Jogo iniciando em 2 segundos...', 'sucesso');
    
    // Desabilitar todos os botões para evitar cliques duplicados
    btnPronto.disabled = true;
    btnSairLobby.disabled = true;
    
    // Salvar configurações do servidor
    if (dados.configuracoes) {
        sessionStorage.setItem('dificuldadeJogo', dados.configuracoes.dificuldade);
        sessionStorage.setItem('tamanhoTabuleiro', dados.configuracoes.tamanho);
        console.log(`⚙️ Configurações recebidas do servidor: ${dados.configuracoes.dificuldade}, ${dados.configuracoes.tamanho}`);
    }
    
    // Encontrar minha ordem no jogo (match por socketId ATUAL)
    const meuJogador = dados.jogadores.find(j => j.socketId === socket.id);
    console.log('🔍 Procurando meu jogador:', { meuSocketId: socket.id, jogadores: dados.jogadores });
    console.log('✅ Meu jogador encontrado:', meuJogador);
    
    if (!meuJogador) {
        console.error('❌ Erro crítico: Jogador não encontrado na lista!');
        console.log('📋 Jogadores recebidos:', dados.jogadores);
        console.log('🔑 Meu socket.id:', socket.id);
        mostrarNotificacao('Erro ao identificar jogador. Recarregue a página.', 'erro');
        return;
    }
    
    // Salvar dados do jogo no sessionStorage
    sessionStorage.setItem('modoMultiplayer', 'true');
    sessionStorage.setItem('codigoSala', estadoLocal.codigoSala);
    sessionStorage.setItem('jogadoresMultiplayer', JSON.stringify(dados.jogadores));
    sessionStorage.setItem('minhaOrdem', meuJogador.ordem);
    sessionStorage.setItem('meuJogadorId', meuJogador.id);
    sessionStorage.setItem('socketId', socket.id);
    
    // Redirecionar para o jogo após um delay
    setTimeout(() => {
        console.log('🎮 Redirecionando para o jogo...');
        musicaLobby.pause();
        window.location.href = 'index.html';
    }, 2000);
});

socket.on('erro', (dados) => {
    mostrarNotificacao(dados.mensagem, 'erro');
});
socket.on('todos-prontos', (dados) => {
    console.log(`✅ Todos os ${dados.quantidadeJogadores} jogadores estão prontos!`);
    
    // Mostrar botão de iniciar apenas para o host (criador da sala)
    if (estadoLocal.ehHost && btnIniciarJogoLobby) {
        btnIniciarJogoLobby.style.display = 'block';
        mostrarNotificacao('Todos prontos! Você pode iniciar o jogo.', 'sucesso');
    } else {
        mostrarNotificacao('Todos prontos! Aguardando host iniciar o jogo...', 'info');
    }
});

// Handler para botão Iniciar Jogo
if (btnIniciarJogoLobby) {
    btnIniciarJogoLobby.addEventListener('click', () => {
        console.log('🎮 Host clicou em Iniciar Jogo');
        btnIniciarJogoLobby.disabled = true;
        btnIniciarJogoLobby.textContent = 'Iniciando...';
        
        // Salvar configurações do host no sessionStorage
        const dificuldade = document.getElementById('seletor-dificuldade')?.value || 'normal';
        const tamanho = document.getElementById('seletor-tamanho')?.value || 'medio';
        
        sessionStorage.setItem('dificuldadeJogo', dificuldade);
        sessionStorage.setItem('tamanhoTabuleiro', tamanho);
        
        console.log(`⚙️ Configurações salvas: Dificuldade=${dificuldade}, Tamanho=${tamanho}`);
        
        socket.emit('iniciar-jogo-lobby', {
            codigoSala: estadoLocal.codigoSala,
            configuracoes: {
                dificuldade: dificuldade,
                tamanho: tamanho
            }
        });
    });
}