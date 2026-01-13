
const tabuleiro = document.getElementById("tabuleiro")

const DIRECOES = ["N", "L", "S", "O"]

const CONEXOES_BASE = {
    corredor: ["N", "S"],
    curva: ["N", "L"],
    bifurcacao: ["N", "S", "L"],
    encruzilhada: ["N", "S", "L", "O"],
    camara: ["N"],

    entrada: ["N", "S", "L", "O"],
    saida: ["N", "S", "L", "O"],
    hidra: ["N", "S", "L", "O"]
}

let tileArrastado = null
const TAMANHO = 5
let tabuleiroMatriz = []

let jogadores = [
    { id: 1, ordem: 1, tileId: null },
    { id: 2, ordem: 2, tileId: null },
    { id: 3, ordem: 3, tileId: null },
    { id: 4, ordem: 4, tileId: null }
]


jogadores.sort(() => Math.random() - 0.5)

jogadores.forEach((jogador, index) => {
    jogador.ordem = index + 1
})

// Define o jogador inicial (será sobrescrito em multiplayer pelo servidor)
let jogadorAtualIndex = 0;

function jogadorAtual() {
    return jogadores[jogadorAtualIndex]
}

// Funções auxiliares para validação de permissões
function obterMeuJogadorId() {
    const modoMultiplayer = sessionStorage.getItem('modoMultiplayer') === 'true';
    if (modoMultiplayer) {
        // Tentar usar o ID numérico salvo diretamente
        const meuJogadorId = parseInt(sessionStorage.getItem('meuJogadorId'));
        if (meuJogadorId) {
            return meuJogadorId;
        }
        // Fallback: buscar por ordem
        const minhaOrdem = parseInt(sessionStorage.getItem('minhaOrdem')) || 1;
        const meuJogador = jogadores.find(j => j.ordem === minhaOrdem);
        return meuJogador ? meuJogador.id : null;
    }
    // Em modo local, sempre retorna o jogador atual
    return jogadorAtual().id;
}

function ehMinhaVez() {
    const meuId = obterMeuJogadorId();
    const jogadorAtualId = jogadorAtual().id;
    const resultado = meuId === jogadorAtualId;
    
    console.log('🎯 ehMinhaVez:');
    console.log('  👤 meuId:', meuId);
    console.log('  📍 jogadorAtualIndex:', jogadorAtualIndex);
    console.log('  👤 jogadorAtual():', jogadorAtual());
    console.log('  🆔 jogadorAtual().id:', jogadorAtualId);
    console.log('  ✅ Resultado:', resultado);
    
    return resultado;
}

function meuJogadorEstaNoTile(tileId) {
    const meuId = obterMeuJogadorId();
    const meuJogador = jogadores.find(j => j.id === meuId);
    
    console.log('🔍 meuJogadorEstaNoTile:');
    console.log('  📌 tileId procurado:', tileId, typeof tileId);
    console.log('  👤 meuId:', meuId);
    console.log('  👤 meuJogador:', meuJogador);
    console.log('  📍 meuJogador.tileId:', meuJogador?.tileId, typeof meuJogador?.tileId);
    console.log('  ✅ Resultado:', meuJogador && meuJogador.tileId === tileId);
    
    return meuJogador && meuJogador.tileId === tileId;
}

function obterNomePersonagemJogador(jogadorId) {
    // Encontrar o jogador pelo ID
    const jogador = jogadores.find(j => j.id === jogadorId);
    if (!jogador || !jogador.personagem) {
        return `Jogador ${jogadorId}`;
    }
    
    // Mapear personagem escolhido para nome completo
    const nomesPersonagens = {
        'torvin': 'Torvin Mão de Ferro',
        'elara': 'Elara dos Símbolos',
        'zephyr': 'Zephyr',
        'kaelen': 'Kaelen'
    };
    
    return nomesPersonagens[jogador.personagem.toLowerCase()] || jogador.personagem;
}

// Verifica se o jogador possui o Amuleto do Eco ou a Gema da Visão no inventário
function jogadorPossuiAmuletoDoEco(jogadorId) {
    return [...cartas.values()].some(c => 
        (c.id === "a3" || c.id === "a1") && c.dono === jogadorId
    );
}

let entradaPosicao = null
//gerarMatriz() 
function gerarMatriz() {
    // cria matriz vazia
    tabuleiroMatriz = Array.from({ length: TAMANHO }, () =>
        Array(TAMANHO).fill(null)
    )

    /* ===============================
       TILES FIXOS (REGRAS DO JOGO)
       =============================== */

    // entrada (linha 4, coluna aleatória)
    const colunaEntrada = Math.floor(Math.random() * TAMANHO)
    tabuleiroMatriz[4][colunaEntrada] = "entrada"
    entradaPosicao = { linha: 4, coluna: colunaEntrada }

    // saída (linha 0, coluna diferente da entrada)
    let colunaSaida
    do {
        colunaSaida = Math.floor(Math.random() * TAMANHO)
    } while (colunaSaida === colunaEntrada)

    tabuleiroMatriz[0][colunaSaida] = "saida"

    // hidra (centro fixo)
    tabuleiroMatriz[2][2] = "hidra"

    /* ===============================
       POOL CONTROLADO DE TILES
       =============================== */

    // contamos quantos espaços sobraram
    const totalTiles = TAMANHO * TAMANHO
    const tilesFixos = 3 // entrada + saída + hidra
    const tilesRestantes = totalTiles - tilesFixos // 22

    // queremos exatamente 8 câmaras
    const pool = []

    // 8 câmaras
    for (let i = 0; i < 8; i++) {
        pool.push("camara")
    }

    // outros tipos (completam o restante)
    const outrosTipos = [
        "corredor",
        "curva",
        "bifurcacao",
        "encruzilhada"
    ]

    while (pool.length < tilesRestantes) {
        const tipo =
            outrosTipos[Math.floor(Math.random() * outrosTipos.length)]
        pool.push(tipo)
    }

    // embaralha o pool (Fisher–Yates)
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }

    /* ===============================
       PREENCHER OS TILES NULOS
       =============================== */

    for (let linha = 0; linha < TAMANHO; linha++) {
        for (let coluna = 0; coluna < TAMANHO; coluna++) {
            if (tabuleiroMatriz[linha][coluna] === null) {
                tabuleiroMatriz[linha][coluna] = pool.pop()
            }
        }
    }
}


function moverJogador(tileDestino) {
    const jogador = jogadorAtual()

    if (!podeMover(jogador, tileDestino)) return

    jogador.tile = tileDestino
    jogador.tileId = tileDestino.dataset.id

    desenharJogadores()
    
    // Enviar movimento para outros jogadores no modo multiplayer
    if (typeof enviarAcao === 'function') {
        enviarAcao('mover-jogador', {
            jogadorId: jogador.id,
            tileId: tileDestino.dataset.id
        });
    }
    
    // Salvar estado após mover jogador
    salvarEstadoLocal();
}

const tilesEstado = new Map()
// chave: id do tile ("linha-coluna")
// valor: { tipo, rotacao }

//Cria Tile

const imagem_tile =  [
        { id: "camara", tipo: "camara", imagem: "cartas/caminho_camara.png" },
        { id: "encruzilhada", tipo: "encruzilhada", imagem: "cartas/caminho_encruzilhada.png" },
        { id: "bifurcacao", tipo: "bifurcacao", imagem: "cartas/caminho_bifurcacao.png" },
        { id: "curva", tipo: "curva", imagem: "cartas/caminho_curva.png" },
        { id: "corredor", tipo: "corredor", imagem: "cartas/caminho_corredor.png" },
        { id: "saida", tipo: "saida", imagem: "cartas/caminho_saida.png" },
        { id: "entrada", tipo: "entrada", imagem: "cartas/caminho_entrada.png" },
        { id: "hidra", tipo: "hidra", imagem: "cartas/caminho_hidra.png" },
]  

function criarTile(tipo) {
    const tile = document.createElement("div")
    tile.classList.add("tile")

    const conteudo = document.createElement("div")
    conteudo.classList.add("conteudo-tile")
    tile.appendChild(conteudo)

    
    const cartasContainer = document.createElement("div")
    cartasContainer.classList.add("cartas-no-tile")
    cartasContainer.dataset.zona = "cartas"

    tornarZonaDropavel(cartasContainer)

    tile.appendChild(cartasContainer)

    // container para elementos que NÃO devem girar com o tile
    const overlay = document.createElement("div")
    overlay.classList.add("overlay-no-rotacao")
    overlay.style.position = 'absolute'
    overlay.style.inset = '0'
    overlay.style.zIndex = '30'
    // não bloquear cliques nas cartas abaixo; jogadores individuais terão pointerEvents ativado
    overlay.style.pointerEvents = 'none'
    tile.appendChild(overlay)

    // adiciona elemento de fundo para a imagem do tile (fica atrás de cartas e jogadores)
    const tileBg = document.createElement("div")
    tileBg.classList.add("tile-bg")
    // garante que o tile seja um contexto posicionado
    tile.style.position = tile.style.position || "relative"
    tileBg.style.position = "absolute"
    tileBg.style.inset = "0"
    tileBg.style.zIndex = "0"
    tileBg.style.pointerEvents = "none"

    // assegura que conteudo e container de cartas fiquem acima do fundo
    conteudo.style.position = conteudo.style.position || "relative"
    conteudo.style.zIndex = conteudo.style.zIndex || 1
    // garantir que o container de cartas ocupe todo o tile (permite centralizar)
    cartasContainer.style.position = 'absolute'
    cartasContainer.style.inset = '0'
    cartasContainer.style.zIndex = '20'

    // tenta encontrar a imagem correspondente
    const imgEntry = imagem_tile.find(it => it.tipo === tipo || it.id === tipo)
    if (imgEntry && imgEntry.imagem) {
        tileBg.style.backgroundImage = `url("${imgEntry.imagem}")`
        tileBg.style.backgroundSize = "cover"
        tileBg.style.backgroundPosition = "center"
        tileBg.style.backgroundRepeat = "no-repeat"
    }

    // coloca o fundo como primeiro filho (atrás dos demais)
    tile.insertBefore(tileBg, tile.firstChild)

    const tiposSemRotacao = ["hidra", "entrada", "saida"]

    if (tiposSemRotacao.includes(tipo)) {
        tile.rotacao = 0
    } else {
        const rotacoes = [0, 90, 180, 270]
        tile.rotacao = rotacoes[Math.floor(Math.random() * rotacoes.length)]
    }

    // aplica a rotação inicial no elemento tile (consistente com girarTile)
    tile.dataset.rotacao = String(tile.rotacao)
    tile.style.transform = `rotate(${tile.rotacao}deg)`
    // garante que o conteudo não aplique rotação adicional
    conteudo.style.transform = ''

    // garante que os overlays (cartas / jogadores) fiquem sempre 'em pé'
    // aplicando uma contra-rotação igual e oposta à rotação do tile
    const contraRot = -Number(tile.rotacao || 0)
    cartasContainer.style.transform = `rotate(${contraRot}deg)`
    cartasContainer.style.transformOrigin = '50% 50%'
    overlay.style.transform = `rotate(${contraRot}deg)`
    overlay.style.transformOrigin = '50% 50%'

    tile.draggable = true
 
    
    if (tipo === "encruzilhada") {
        conteudo.appendChild(criarVertical())
        conteudo.appendChild(criarHorizontal())
    }

    if (tipo === "corredor") {
        conteudo.appendChild(criarVertical())
    }

    if (tipo === "curva") {
        const vertical = criarVertical()
        vertical.style.height = "50%"
        vertical.style.top = "0"
        conteudo.appendChild(vertical)

        const horizontal = criarHorizontal()
        horizontal.style.width = "50%"
        horizontal.style.left = "50%"
        conteudo.appendChild(horizontal)
    }

    if (tipo === "bifurcacao") {
        conteudo.appendChild(criarVertical())

        const horizontal = criarHorizontal()
        horizontal.style.width = "50%"
        horizontal.style.left = "50%"
        conteudo.appendChild(horizontal)
    }

    if (tipo === "camara") {
    const camara = document.createElement("div")
    camara.classList.add("camara")

    const entrada = document.createElement("div")
    entrada.classList.add("camara-entrada")

    conteudo.appendChild(camara)
    conteudo.appendChild(entrada)
    }


    if (tipo === "entrada") {
    tile.style.backgroundColor = "#b3e5fc"
    tile.style.position = "relative"
    const labelEntrada = document.createElement("div")
    labelEntrada.classList.add("tile-label")
    //labelEntrada.innerText = "ENTRADA"
    labelEntrada.style.position = "absolute"
    labelEntrada.style.inset = "0"
    labelEntrada.style.display = "flex"
    labelEntrada.style.alignItems = "center"
    labelEntrada.style.justifyContent = "center"
    labelEntrada.style.fontWeight = "bold"
    //labelEntrada.style.fontSize = "35px"
    conteudo.appendChild(labelEntrada)
    }

    if (tipo === "saida") {
    tile.style.backgroundColor = "#c8e6c9"
    tile.style.position = "relative"
    const labelSaida = document.createElement("div")
    labelSaida.classList.add("tile-label")
    //labelSaida.innerText = "SAÍDA"
    labelSaida.style.position = "absolute"
    labelSaida.style.inset = "0"
    labelSaida.style.display = "flex"
    labelSaida.style.alignItems = "center"
    labelSaida.style.justifyContent = "center"
    labelSaida.style.fontWeight = "bold"
   // labelSaida.style.fontSize = "35px"
    conteudo.appendChild(labelSaida)
    }

    if (tipo === "hidra") {
    tile.style.backgroundColor = "#ffcdd2"
    tile.style.position = "relative"
    const labelHidra = document.createElement("div")
    labelHidra.classList.add("tile-label")
    //labelHidra.innerText = "HIDRA"
    labelHidra.style.position = "absolute"
    labelHidra.style.inset = "0"
    labelHidra.style.display = "flex"
    labelHidra.style.alignItems = "center"
    labelHidra.style.justifyContent = "center"
    labelHidra.style.fontWeight = "bold"
    //labelHidra.style.fontSize = "35px"
    conteudo.appendChild(labelHidra)
    }
  
    tile.addEventListener("click", (event) => {
        // só gira quando a tecla Ctrl estiver pressionada
        if (!event.ctrlKey) return
        event.stopPropagation()
        
        // Validar se é a vez do jogador (apenas em multiplayer)
        const modoMultiplayer = sessionStorage.getItem('modoMultiplayer') === 'true';
        if (modoMultiplayer && !ehMinhaVez()) {
            // Permitir se o jogador possui o Amuleto do Eco
            const meuJogadorId = obterMeuJogadorId();
            const possuiAmuleto = jogadorPossuiAmuletoDoEco(meuJogadorId);
            
            if (!possuiAmuleto) {
                const nomePersonagem = obterNomePersonagemJogador(jogadorAtual().id);
                alert(`Não é a sua vez! É a vez de ${nomePersonagem}.`);
                return;
            }
            console.log('🎭 Usando Amuleto do Eco para girar tile fora do turno');
        }
        
        girarTile(tile)
    })
       
   
    tile.addEventListener("dragstart", () => {
        tileArrastado = tile
    })

    tile.addEventListener("dragstart", (e) => {
        // Validar se é a vez do jogador (apenas em multiplayer)
        const modoMultiplayer = sessionStorage.getItem('modoMultiplayer') === 'true';
        if (modoMultiplayer && !ehMinhaVez()) {
            // Permitir se o jogador possui o Amuleto do Eco
            const meuJogadorId = obterMeuJogadorId();
            const possuiAmuleto = jogadorPossuiAmuletoDoEco(meuJogadorId);
            
            if (!possuiAmuleto) {
                e.preventDefault();
                const nomePersonagem = obterNomePersonagemJogador(jogadorAtual().id);
                alert(`Não é a sua vez! É a vez de ${nomePersonagem}.`);
                return;
            }
            console.log('🎭 Usando Amuleto do Eco para mover tile fora do turno');
        }
        
        tileArrastado = tile
        try {
            e.dataTransfer.setData("text/tile", tile.dataset.id || "")
        } catch (err) {
            // alguns navegadores podem restringir tipos não-padrão, fallback para plain
            try { e.dataTransfer.setData("text/plain", `tile:${tile.dataset.id || ""}`) } catch (e) {}
        }
    })

    tile.addEventListener("dragend", () => {
        // limpa referência para evitar comportamento residual
        tileArrastado = null
    })

    tile.addEventListener("dragover", (event) => {
        event.preventDefault()
    })

    tile.addEventListener("drop", (event) => {
        event.preventDefault()

        // Se o drop veio de outro tile (troca de tiles), aceitamos
        const tileTransfer = event.dataTransfer.getData("text/tile") || ""
        const plain = event.dataTransfer.getData("text/plain") || ""

        const isTileDrag = Boolean(tileTransfer) || plain.startsWith("tile:")

        if (isTileDrag) {
            if (tileArrastado && tileArrastado !== tile) {
                trocarTiles(tileArrastado, tile)
            }
        }

        // Caso contrário, é possivelmente um drop de carta — a lógica de cartas
        // é tratada por tornarTileDropavel (no container .cartas-no-tile)
    })

    
    tile.tipo = tipo

    tile.addEventListener("click", (event) => {
        if (!event.shiftKey) return
        event.stopPropagation()
        
        // Validar se é a vez do jogador (apenas em multiplayer)
        const modoMultiplayer = sessionStorage.getItem('modoMultiplayer') === 'true';
        if (modoMultiplayer && !ehMinhaVez()) {
            const nomePersonagem = obterNomePersonagemJogador(jogadorAtual().id);
            alert(`Não é a sua vez! É a vez de ${nomePersonagem}.`);
            return;
        }
        
        moverJogador(tile)
    })

       return tile   

    }
    

    
function tornarTileDropavel(tile) {
    tile.addEventListener("dragover", e => {
        e.preventDefault() // OBRIGATÓRIO
        tile.classList.add("drop-ativo")
    })

    tile.addEventListener("dragleave", () => {
        tile.classList.remove("drop-ativo")
    })

    tile.addEventListener("drop", e => {
        e.preventDefault()
        tile.classList.remove("drop-ativo")

        const idCarta = e.dataTransfer.getData("text/plain")
        if (!idCarta) {
            console.warn("Nenhuma carta no drop")
            return
        }

        // 🔥 garante pegar o TILE correto
        const tileEl = e.target.closest(".tile")
        if (!tileEl) {
            console.warn("Drop não ocorreu em um tile")
            return
        }

        const tileId = tileEl.dataset.id
        if (!tileId) {
            console.warn("Tile sem dataset.id")
            return
        }

        moverCartaParaTile(idCarta, tileId)
    })
}



function trocarTiles(tile1, tile2, sincronizar = true) {
    // Salvar IDs originais ANTES de trocar
    const tile1Id = tile1.dataset.id;
    const tile2Id = tile2.dataset.id;
    
    console.log(`🔄 Trocando tiles fisicamente: ${tile1Id} ↔ ${tile2Id}`);
    
    // Trocar elementos no DOM
    const temp = document.createElement("div")
    tile1.before(temp)
    tile2.before(tile1)
    temp.replaceWith(tile2)
    
    // 🔥 TROCAR OS IDs para refletir a nova posição física
    tile1.dataset.id = tile2Id;
    tile2.dataset.id = tile1Id;
    
    console.log(`  🏷️ IDs atualizados: tile1 agora é ${tile1.dataset.id}, tile2 agora é ${tile2.dataset.id}`);
    
    // 🔥 Atualizar cartas - agora seguem os tiles FISICAMENTE (não os IDs)
    // Cartas que estavam no tile1 (fisicamente) mantêm-se nele, mas o ID mudou
    cartas.forEach(carta => {
        if (carta.zona === `tile-${tile1Id}`) {
            // Estava no tile que tinha ID tile1Id, agora esse tile tem ID tile2Id
            carta.zona = `tile-${tile2Id}`;
            console.log(`  🃏 Carta ${carta.id}: tile-${tile1Id} → tile-${tile2Id}`);
        } else if (carta.zona === `tile-${tile2Id}`) {
            // Estava no tile que tinha ID tile2Id, agora esse tile tem ID tile1Id
            carta.zona = `tile-${tile1Id}`;
            console.log(`  🃏 Carta ${carta.id}: tile-${tile2Id} → tile-${tile1Id}`);
        }
    });
    
    // 🔥 Atualizar jogadores - buscar tiles novamente após troca
    jogadores.forEach(jogador => {
        if (jogador.tileId === tile1Id) {
            jogador.tileId = tile2Id;
            jogador.tile = document.querySelector(`.tile[data-id="${tile2Id}"]`);
            console.log(`  👤 Jogador ${jogador.id}: ${tile1Id} → ${tile2Id}`);
        } else if (jogador.tileId === tile2Id) {
            jogador.tileId = tile1Id;
            jogador.tile = document.querySelector(`.tile[data-id="${tile1Id}"]`);
            console.log(`  👤 Jogador ${jogador.id}: ${tile2Id} → ${tile1Id}`);
        }
    });

    desenharJogadores()
    
    // Sincronizar troca de tiles no multiplayer (usar IDs ORIGINAIS)
    if (sincronizar && typeof enviarAcao === 'function') {
        enviarAcao('trocar-tiles', {
            tile1Id: tile1Id,  // ID original do tile1
            tile2Id: tile2Id   // ID original do tile2
        });
    }
    
    // Salvar estado após trocar tiles
    if (sincronizar) {
        salvarEstadoLocal();
    }
}


function criarVertical() {
    const v = document.createElement("div")
    v.classList.add("caminho", "vertical")
    return v
}

function criarHorizontal() {
    const h = document.createElement("div")
    h.classList.add("caminho", "horizontal")
    return h
}

const tipos = [
    // corredores
    "corredor","corredor","corredor","corredor",

    // curvas
    "curva","curva","curva","curva",

    // câmaras
    "camara","camara","camara","camara",
    "camara","camara","camara","camara",

    // bifurcações
    "bifurcacao","bifurcacao","bifurcacao",

    // encruzilhadas
    "encruzilhada","encruzilhada","encruzilhada",

    // especiais
    "entrada",
    "saida",
    "hidra"
]
tipos.sort(() => Math.random() - 0.5)
/*
function girarDirecao(direcao, rotacao) {
    const index = DIRECOES.indexOf(direcao)
    const passos = rotacao / 90
    return DIRECOES[(index + passos) % 4]
}

function obterConexoes(tile) {
    const tipo = tile.tipo
    const base = CONEXOES_BASE[tipo]
    const rotacao = tile.rotacao

    return base.map(d => girarDirecao(d, rotacao))
}
*/

//criarTabuleiro()


function criarTabuleiro() {
    tabuleiro.innerHTML = "" 

    for (let linha = 0; linha < TAMANHO; linha++) {
        for (let coluna = 0; coluna < TAMANHO; coluna++) {
            const tipo = tabuleiroMatriz[linha][coluna]
            const tile = criarTile(tipo)

            // 🔥 TODO TILE TEM ID
            tile.dataset.id = `${linha}-${coluna}`

            tornarTileDropavel(tile)
            
            tabuleiro.appendChild(tile)
        }
    }
}


function obterTileEntrada() {
    const tile = document.querySelector('.tile[data-tipo="entrada"]')
    return tile || null
}


/*
function inicializarJogadores() {
    const tileEntrada = obterTileEntrada()

    console.log("Tile de entrada encontrado:", tileEntrada)

    if (!tileEntrada) {
        console.error("Tile de entrada não encontrado!")
        return
    }

    jogadores.forEach(j => {
        j.tile = tileEntrada                  // ELEMENTO
        j.tileId = tileEntrada.dataset.id     // STRING
    })
}
*/
jogadorAtualIndex = 0

//Jogadores

function desenharJogadores() {
    document.querySelectorAll(".jogador").forEach(j => j.remove())

    const jogadoresOrdenados = [...jogadores].sort(
        (a, b) => a.ordem - b.ordem
    )

    jogadoresOrdenados.forEach(jogador => {
        if (!jogador.tile || !(jogador.tile instanceof HTMLElement)) {
            console.error("Jogador com tile inválido:", jogador)
            return
        }

        // O tile já é o elemento HTML
        const tileEl = jogador.tile;

        if (!tileEl) {
            console.error("Tile não encontrado para jogador:", jogador);
            return;
        }

        // Mapear personagem para classe de cor
        const personagemParaClasse = {
            'torvin': 'jogador-1',   // azul
            'elara': 'jogador-2',    // vermelho
            'zephyr': 'jogador-3',   // verde
            'kaelen': 'jogador-4'    // roxo
        };
        const classePersonagem = personagemParaClasse[jogador.personagem?.toLowerCase()] || `jogador-${jogador.id}`;

        const jogadorEl = document.createElement("div")
        jogadorEl.classList.add("jogador", classePersonagem)
        
        // Encontrar a posição atual deste jogador na ordem de jogo
        const ordemAtual = jogadoresOrdenados.findIndex(j => j.id === jogador.id) + 1;
        
        jogadorEl.textContent = ordemAtual

        tileEl.appendChild(jogadorEl)

        const numero = document.createElement("div")
        numero.innerText = ordemAtual
        numero.style.position = "absolute"
        numero.style.top = "-6px"
        numero.style.right = "-6px"
        numero.style.background = "white"
        numero.style.border = "1px solid black"
        numero.style.borderRadius = "50%"
        numero.style.width = "26px"
        numero.style.height = "26px"
        numero.style.fontSize = "10px"
        numero.style.display = "flex"
        numero.style.alignItems = "center"
        numero.style.justifyContent = "center"
        
        jogadorEl.appendChild(numero)

        jogadorEl.style.zIndex = 100 - jogador.ordem
        jogadorEl.style.pointerEvents = 'auto'
    
        if (jogadorAtual() === jogador) {
            jogadorEl.style.outline = "3px solid gold"
        }

        // insere o jogador no overlay que não é rotacionado pelo tile
        const overlay = jogador.tile.querySelector('.overlay-no-rotacao')
        if (overlay) overlay.appendChild(jogadorEl)
        else jogador.tile.appendChild(jogadorEl)
    })
}

console.log(jogadores.map(j => ({
    id: j.id,
    tile: j.tile instanceof HTMLElement,
    tileId: j.tileId
})))


document.getElementById("fimTurno").addEventListener("click", () => {
    console.log("BOTÃO ENCERRAR TURNO CLICADO")
    proximoJogador()
    atualizarInfoTurno()
    
    // Sincronizar mudança de turno no multiplayer
    if (typeof enviarAcao === 'function') {
        enviarAcao('passar-turno', {
            jogadorAtualIndex: jogadorAtualIndex
        });
    }
    
    // Salvar estado após passar turno
    salvarEstadoLocal();
})

document.getElementById("btn-reiniciar-tabuleiro").addEventListener("click", () => {
    console.log("BOTÃO REINICIAR TABULEIRO CLICADO")
    
    // Verificar se está em modo multiplayer
    const modoMultiplayer = sessionStorage.getItem('modoMultiplayer') === 'true';
    
    if (modoMultiplayer && window.socket) {
        // Em modo multiplayer, enviar evento para servidor
        const codigoSala = sessionStorage.getItem('codigoSala');
        console.log("🔄 Enviando reiniciar-tabuleiro para servidor");
        window.socket.emit('reiniciar-tabuleiro', { codigoSala });
        // O servidor irá notificar todos os jogadores e recarregar a página
    } else {
        // Modo local: confirmar antes de reiniciar
        if (confirm('Deseja realmente reiniciar o jogo? Todo o progresso será perdido.')) {
            limparEstadoLocal();
            location.reload();
        }
    }
})

function proximoJogador() {
    jogadorAtualIndex =
        (jogadorAtualIndex + 1) % jogadores.length
        
         desenharJogadores()
   // atualizar destaque das cartas-personagem
   if (typeof renderizarCartasPersonagens === 'function') {
       renderizarCartasPersonagens(jogadorAtual().id)
   }
   // atualizar destaque do inventario
   atualizarDestaqueInventario()
   }


// Direção dos Tiles

function direcaoEntre(origem, destino) {
    // calcula adjacência considerando wrap-around nas bordas
    const up = (origem.linha - 1 + TAMANHO) % TAMANHO
    const down = (origem.linha + 1) % TAMANHO
    const left = (origem.coluna - 1 + TAMANHO) % TAMANHO
    const right = (origem.coluna + 1) % TAMANHO

    if (destino.linha === up && destino.coluna === origem.coluna) return "N"
    if (destino.linha === down && destino.coluna === origem.coluna) return "S"
    if (destino.coluna === left && destino.linha === origem.linha) return "O"
    if (destino.coluna === right && destino.linha === origem.linha) return "L"
    return null
}

function direcaoOposta(dir) {
    return { N: "S", S: "N", L: "O", O: "L" }[dir]
}

function posicaoDoTile(tile) {
    const index = [...tabuleiro.children].indexOf(tile)

    return {
        linha: Math.floor(index / TAMANHO),
        coluna: index % TAMANHO
    }
}

function saoAdjacentes(tileA, tileB) {
    const a = posicaoDoTile(tileA)
    const b = posicaoDoTile(tileB)

    const dLinha = Math.abs(a.linha - b.linha)
    const dColuna = Math.abs(a.coluna - b.coluna)

    // adjacência direta (N/S/L/O)
    if (dLinha + dColuna === 1) return true

    // considerar bordas opostas como adjacentes (wrap-around)
    // mesmas coluna, cima/baixo nas extremidades
    if (a.coluna === b.coluna) {
        if ((a.linha === 0 && b.linha === TAMANHO - 1) || (a.linha === TAMANHO - 1 && b.linha === 0)) return true
    }

    // mesma linha, esquerda/direita nas extremidades
    if (a.linha === b.linha) {
        if ((a.coluna === 0 && b.coluna === TAMANHO - 1) || (a.coluna === TAMANHO - 1 && b.coluna === 0)) return true
    }

    return false
}



function conexoesBase(tipo) {
    switch (tipo) {
        case "corredor": return ["N","S"]
        case "curva": return ["N","O"]
        case "bifurcacao": return ["N","L","O"]
        case "encruzilhada": return ["N","S","L","O"]
        case "camara": return ["N"]
        case "entrada": return ["N","S","L","O"]
        case "saida": return ["N","S","L","O"]
        case "hidra": return ["N","S","L","O"]
        default: return []
    }
}

function rotacionarDirecao(dir, rot) {
    const dirs = ["N","L","S","O"]
    const idx = dirs.indexOf(dir)
    const passos = rot / 90
    return dirs[(idx + passos) % 4]
}


function conexoesDoTile(tile) {
    const tipo = tile.tipo
    const rot = Number(tile.dataset.rotacao || 0)

    return conexoesBase(tipo).map(dir =>
        rotacionarDirecao(dir, rot)
    )
}


function girarTile(tile) {
    const rotAtual = Number(tile.dataset.rotacao) || 0
    const novaRot = (rotAtual + 90) % 360
    
    tile.dataset.rotacao = novaRot

    //const OFFSET_VISUAL  = -90
    tile.style.transform = `rotate(${novaRot }deg)`

    // aplica contra-rotação em overlays (cartas e jogadores) para que
    // permaneçam na orientação correta independente da rotação do tile
    const contraRot = -novaRot
    const cartas = tile.querySelector('.cartas-no-tile')
    const overlay = tile.querySelector('.overlay-no-rotacao')
    if (cartas) {
        cartas.style.transform = `rotate(${contraRot}deg)`
        cartas.style.transformOrigin = '50% 50%'
    }
    if (overlay) {
        overlay.style.transform = `rotate(${contraRot}deg)`
        overlay.style.transformOrigin = '50% 50%'
    }
    
    // Sincronizar rotação no multiplayer
    if (typeof enviarAcao === 'function') {
        enviarAcao('girar-tile', {
            tileId: tile.dataset.id,
            rotacao: novaRot
        });
    }
    
    // Salvar estado após girar tile
    salvarEstadoLocal();

    console.log(
        "rotAtual:", rotAtual,
        "Girou tile", tile.dataset.id,
        "→", novaRot
    )
}


function podeMover(jogador, tileDestino) {
    if (!saoAdjacentes(jogador.tile, tileDestino)) {
        return false
    }

    // Verificar se o jogador possui os artefatos a2 ou a9
    const temA2 = [...cartas.values()].some(c => c.id === "a2" && c.dono === jogador.id)
    const temA9 = [...cartas.values()].some(c => c.id === "a9" && c.dono === jogador.id)

    // Se tem pelo menos um dos artefatos, pode se mover para qualquer tile adjacente (ignora paredes)
    if (temA2 || temA9) {
        return true
    }

    const origemPos = posicaoDoTile(jogador.tile)
    const destinoPos = posicaoDoTile(tileDestino)

    const dir = direcaoEntre(origemPos, destinoPos)
    if (!dir) return false

    const oposta = { N:"S", S:"N", L:"O", O:"L" }[dir]

    const conexOrigem = conexoesDoTile(jogador.tile)
    const conexDestino = conexoesDoTile(tileDestino)

    return (
        conexOrigem.includes(dir) &&
        conexDestino.includes(oposta)
    )
}




function gritoHidra() {
    console.log('🐉 [INICIO] gritoHidra() chamado');
    console.trace('Stack trace de gritoHidra()');
    
    // 1. Escolhe aleatoriamente se rotaciona linha ou coluna
    const ehLinha = Math.random() < 0.5
    const indiceAleatorio = Math.floor(Math.random() * TAMANHO)

    // Executar o grito da hidra localmente
    executarGritoHidra(ehLinha, indiceAleatorio)
    
    // Sincronizar com multiplayer
    if (typeof enviarAcao === 'function') {
        console.log('🐉 Enviando grito-hidra para servidor');
        enviarAcao('grito-hidra', {
            ehLinha: ehLinha,
            indice: indiceAleatorio
        });
    }
}

function executarGritoHidra(ehLinha, indiceAleatorio) {
    console.log(`🐉 [EXEC] executarGritoHidra(${ehLinha ? 'Linha' : 'Coluna'}, ${indiceAleatorio})`);
    console.trace('Stack trace de executarGritoHidra()');
    
    // 2 & 3 & 4. Coleta tiles da linha/coluna e realiza rotação circular
    const tiles = []
    const indices = []

    if (ehLinha) {
        // Coleta todos os tiles da linha
        for (let col = 0; col < TAMANHO; col++) {
            const index = indiceAleatorio * TAMANHO + col
            indices.push(index)
            tiles.push(tabuleiro.children[index])
        }
    } else {
        // Coleta todos os tiles da coluna
        for (let lin = 0; lin < TAMANHO; lin++) {
            const index = lin * TAMANHO + indiceAleatorio
            indices.push(index)
            tiles.push(tabuleiro.children[index])
        }
    }

    if (tiles.length === 0) return

    console.log(`Grito da Hidra! ${ehLinha ? "Linha" : "Coluna"} ${indiceAleatorio}:`, indices)

    // 🔥 PASSO 1: SALVAR O ESTADO DAS CARTAS E JOGADORES ANTES DE MOVER OS TILES
    console.log(`📋 Salvando estado das cartas e jogadores ANTES da rotação...`);
    const cartasPorTile = new Map(); // índice → [cartaIds]
    const jogadoresPorTile = new Map(); // índice → [jogadorIds]
    
    tiles.forEach((tile, idx) => {
        const tileId = tile.dataset.id;
        
        // Salvar cartas
        const cartasNoTile = [];
        cartas.forEach((carta, cartaId) => {
            if (carta.zona === `tile-${tileId}`) {
                cartasNoTile.push(cartaId);
            }
        });
        
        if (cartasNoTile.length > 0) {
            cartasPorTile.set(idx, cartasNoTile);
            console.log(`  Posição ${idx} (tile ${tileId}): ${cartasNoTile.length} carta(s) - ${cartasNoTile.join(', ')}`);
        }
        
        // Salvar jogadores
        const jogadoresNoTile = jogadores.filter(j => j.tileId === tileId).map(j => j.id);
        if (jogadoresNoTile.length > 0) {
            jogadoresPorTile.set(idx, jogadoresNoTile);
            console.log(`  Posição ${idx} (tile ${tileId}): ${jogadoresNoTile.length} jogador(es) - ${jogadoresNoTile.join(', ')}`);
        }
    });

    // Inicia animação de terremoto
    tabuleiro.classList.add("terremoto")

    // Aplica destaque visual aos tiles afetados
    tiles.forEach(tile => {
        tile.classList.add("tile-grito-hidra")
    })

    // Faz rotação circular usando trocarTiles
    // Rotate: [t0, t1, t2, t3, t4] → [t1, t2, t3, t4, t0]
    const primeiroTile = tiles[0]
    
    // Guardar tipos e rotações ANTES da troca
    const tiposAntes = tiles.map(t => t.tipo);
    const rotacoesAntes = tiles.map(t => t.rotacao || 0);
    
    console.log(`📝 ANTES das trocas - tipos:`, tiposAntes);
    console.log(`📝 ANTES das trocas - IDs:`, tiles.map(t => t.dataset.id));
    
    for (let i = 0; i < tiles.length - 1; i++) {
        trocarTiles(tiles[i], tiles[i + 1], false) // false = não sincronizar individualmente
    }
    
    // Verificar ordem DEPOIS das trocas
    console.log(`📝 DEPOIS das trocas - ordem visual no DOM:`);
    const tilesDepois = [];
    if (ehLinha) {
        for (let col = 0; col < TAMANHO; col++) {
            const index = indiceAleatorio * TAMANHO + col;
            tilesDepois.push(tabuleiro.children[index]);
        }
    } else {
        for (let lin = 0; lin < TAMANHO; lin++) {
            const index = lin * TAMANHO + indiceAleatorio;
            tilesDepois.push(tabuleiro.children[index]);
        }
    }
    console.log(`  Tipos:`, tilesDepois.map(t => t.tipo));
    console.log(`  IDs:`, tilesDepois.map(t => t.dataset.id));

    // Atualizar tabuleiroMatriz com base na ordem REAL após as trocas
    if (ehLinha) {
        for (let col = 0; col < TAMANHO; col++) {
            tabuleiroMatriz[indiceAleatorio][col] = tilesDepois[col].tipo;
        }
    } else {
        for (let lin = 0; lin < TAMANHO; lin++) {
            tabuleiroMatriz[lin][indiceAleatorio] = tilesDepois[lin].tipo;
        }
    }
    
    console.log(`📊 Matriz atualizada após Grito da Hidra`);
    if (ehLinha) {
        console.log(`  Linha ${indiceAleatorio}:`, tabuleiroMatriz[indiceAleatorio]);
    } else {
        console.log(`  Coluna ${indiceAleatorio}:`, tabuleiroMatriz.map(linha => linha[indiceAleatorio]));
    }

    // 🔥 ATUALIZAR IDs DOS TILES E CARTAS APÓS A ROTAÇÃO
    console.log(`🔄 Atualizando dataset.id dos tiles e cartas...`);
    
    // PASSO 1: Criar mapeamento completo ANTES de modificar qualquer coisa
    const mapeamentoTiles = []; // [{tile: elemento, antigoId: string, novoId: string, indiceOriginal: number}]
    
    if (ehLinha) {
        for (let col = 0; col < TAMANHO; col++) {
            const tile = tilesDepois[col];
            const antigoId = tile.dataset.id;
            const novoId = `${indiceAleatorio}-${col}`;
            
            // Descobrir qual era o índice original deste tile ANTES da rotação
            // Rotação para DIREITA: posição N recebe tile de posição (N-1)
            // posição 0 recebe de posição 4, posição 1 recebe de 0, etc
            const indiceOriginal = (col - 1 + TAMANHO) % TAMANHO;
            
            mapeamentoTiles.push({ tile, antigoId, novoId, indiceOriginal });
            console.log(`  📍 Posição ${col}: tile ${antigoId} → ${novoId} (veio da posição ${indiceOriginal})`);
        }
    } else {
        for (let lin = 0; lin < TAMANHO; lin++) {
            const tile = tilesDepois[lin];
            const antigoId = tile.dataset.id;
            const novoId = `${lin}-${indiceAleatorio}`;
            
            // Rotação para DIREITA: posição N recebe tile de posição (N-1)
            const indiceOriginal = (lin - 1 + TAMANHO) % TAMANHO;
            
            mapeamentoTiles.push({ tile, antigoId, novoId, indiceOriginal });
            console.log(`  📍 Posição ${lin}: tile ${antigoId} → ${novoId} (veio da posição ${indiceOriginal})`);
        }
    }
    
    // PASSO 2: Atualizar os dataset.id dos tiles
    mapeamentoTiles.forEach(({tile, antigoId, novoId}) => {
        tile.dataset.id = novoId;
        console.log(`  🏷️ Tile atualizado: ${antigoId} → ${novoId}`);
    });
    
    // PASSO 3: Atualizar as cartas e jogadores baseado em qual posição eles vieram
    let cartasAtualizadas = 0;
    let jogadoresAtualizados = 0;
    
    mapeamentoTiles.forEach(({novoId, indiceOriginal}, posicaoAtual) => {
        // As cartas que estavam no tile da posição original agora devem estar no tile da posição atual
        if (cartasPorTile.has(indiceOriginal)) {
            const cartasIds = cartasPorTile.get(indiceOriginal);
            cartasIds.forEach(cartaId => {
                const carta = cartas.get(cartaId);
                if (carta) {
                    const zonaAntiga = carta.zona;
                    carta.zona = `tile-${novoId}`;
                    console.log(`    📋 Carta ${cartaId}: ${zonaAntiga} → tile-${novoId}`);
                    cartasAtualizadas++;
                }
            });
        }
        
        // Os jogadores que estavam no tile da posição original agora devem estar no tile da posição atual
        if (jogadoresPorTile.has(indiceOriginal)) {
            const jogadoresIds = jogadoresPorTile.get(indiceOriginal);
            jogadoresIds.forEach(jogadorId => {
                const jogador = jogadores.find(j => j.id === jogadorId);
                if (jogador) {
                    const tileIdAntigo = jogador.tileId;
                    jogador.tileId = novoId;
                    console.log(`    👤 Jogador ${jogadorId}: ${tileIdAntigo} → ${novoId}`);
                    jogadoresAtualizados++;
                }
            });
        }
    });
    
    console.log(`  ✅ ${cartasAtualizadas} cartas e ${jogadoresAtualizados} jogadores atualizados`);
    console.log(`✅ IDs dos tiles, cartas e jogadores atualizados`);
    
    // Log do estado final dos jogadores
    console.log(`👥 Estado final dos jogadores após Grito da Hidra:`);
    jogadores.forEach(j => {
        console.log(`  Jogador ${j.id}: tileId="${j.tileId}"`);
    });
    
    // Re-renderizar cartas para refletir as mudanças
    renderizarCartas();

    // Redesenha jogadores após a rotação
    desenharJogadores()
    
    // Salvar estado após Grito da Hidra
    salvarEstadoLocal();

    // Remove o destaque após 2 segundos
    setTimeout(() => {
        tiles.forEach(tile => {
            tile.classList.remove("tile-grito-hidra")
        })
        // Remove animação de terremoto
        tabuleiro.classList.remove("terremoto")
    }, 2000)

    console.log(`Grito da Hidra! Rotacionou ${ehLinha ? "linha" : "coluna"} ${indiceAleatorio}`)
}

function limparFeedbackMovimento() {
    document
        .querySelectorAll(".tile-movimento-valido, .tile-movimento-wrap")
        .forEach(tile => {
            tile.classList.remove("tile-movimento-valido")
            tile.classList.remove("tile-movimento-wrap")
        })
}

function mostrarMovimentosValidos() {
    limparFeedbackMovimento()

    const atual = jogadorAtual()
    // obtém posição atual do tile do jogador
    const origem = posicaoDoTile(atual.tile)

    // calcula vizinhos com wrap-around nas bordas
    const up = (origem.linha - 1 + TAMANHO) % TAMANHO
    const down = (origem.linha + 1) % TAMANHO
    const left = (origem.coluna - 1 + TAMANHO) % TAMANHO
    const right = (origem.coluna + 1) % TAMANHO

    const vizinhos = [
        { linha: up, coluna: origem.coluna },    // N
        { linha: down, coluna: origem.coluna },  // S
        { linha: origem.linha, coluna: left },   // O
        { linha: origem.linha, coluna: right }   // L
    ]

    vizinhos.forEach(destino => {
        const index = destino.linha * TAMANHO + destino.coluna
        const tile = tabuleiro.children[index]
        if (!tile) return

        if (podeMover(atual, tile)) {
            // detectar se o movimento é wrap-around (vinha da borda oposta)
            const origem = posicaoDoTile(atual.tile)
            const isWrap = (
                Math.abs(destino.linha - origem.linha) === TAMANHO - 1 ||
                Math.abs(destino.coluna - origem.coluna) === TAMANHO - 1
            )

            if (isWrap) tile.classList.add("tile-movimento-wrap")
            else tile.classList.add("tile-movimento-valido")
        }
    })
}



document.addEventListener("keydown", (event) => {
    if (event.key === "Shift") {
        mostrarMovimentosValidos()
    }
})

document.addEventListener("keyup", (event) => {
    if (event.key === "Shift") {
        limparFeedbackMovimento()
    }
})

function atualizarInfoTurno() {
    const atual = jogadorAtual()
    console.log('🔄 atualizarInfoTurno chamado');
    console.log('  📍 jogadorAtualIndex:', jogadorAtualIndex);
    console.log('  👤 Jogador atual:', atual);
    console.log('  📋 Array jogadores:', jogadores.map((j, idx) => `[${idx}] ID:${j.id} Ordem:${j.ordem}`));
    
    let nomeExibicao = `Jogador ${atual.ordem}`

    // tenta usar o nome do personagem correspondente, se disponível
    try {
        if (atual.personagem && typeof personagens !== "undefined" && Array.isArray(personagens)) {
            // Mapear nome do personagem para ID
            const personagemMap = {
                'torvin': 1,
                'elara': 2,
                'zephyr': 3,
                'kaelen': 4
            };
            const personagemId = personagemMap[atual.personagem.toLowerCase()];
            const p = personagens.find(pp => pp.id === personagemId);
            if (p && p.nome) nomeExibicao = p.nome
            console.log('  🎭 Personagem encontrado:', p ? p.nome : 'não encontrado');
        }
    } catch (e) {
        // se algo falhar, mantém o fallback para jogador
        console.error('  ❌ Erro ao buscar personagem:', e);
    }

    console.log('  📝 Nome exibido:', nomeExibicao);
    document.getElementById("infoTurno").innerText = `Vez de ${nomeExibicao}`
}

// ==================== PERSISTÊNCIA LOCAL ====================

function salvarEstadoLocal() {
    // Só salvar em modo local
    const emModoMultiplayer = sessionStorage.getItem('modoMultiplayer') === 'true';
    if (emModoMultiplayer) return;
    
    // Coletar informações atuais dos tiles
    const tilesInfo = [];
    const tiles = tabuleiro.querySelectorAll('.tile');
    tiles.forEach(tile => {
        tilesInfo.push({
            id: tile.dataset.id,
            tipo: tile.tipo,
            rotacao: tile.rotacao || 0
        });
    });
    
    const estado = {
        tabuleiroMatriz: tabuleiroMatriz,
        entradaPosicao: entradaPosicao,
        jogadorAtualIndex: jogadorAtualIndex,
        jogadores: jogadores.map(j => ({
            id: j.id,
            ordem: j.ordem,
            tileId: j.tileId
        })),
        cartas: Array.from(cartas.values()).map(c => ({
            id: c.id,
            tipo: c.tipo,
            nome: c.nome,
            efeito: c.efeito,
            imagem: c.imagem,
            imagemMiniatura: c.imagemMiniatura,
            faceUp: c.faceUp,
            zona: c.zona,
            dono: c.dono
        })),
        tilesInfo: tilesInfo // Salvar informação completa de cada tile
    };
    
    localStorage.setItem('labirinto-hidra-estado', JSON.stringify(estado));
    console.log('💾 Estado salvo no localStorage');
    console.log('📊 Matriz salva:', tabuleiroMatriz);
    console.log('🎲 Tiles salvos:', tilesInfo);
}

function carregarEstadoLocal() {
    const estadoSalvo = localStorage.getItem('labirinto-hidra-estado');
    if (!estadoSalvo) return false;
    
    try {
        const estado = JSON.parse(estadoSalvo);
        console.log('📂 Carregando estado salvo:', estado);
        
        // Restaurar matriz
        tabuleiroMatriz = estado.tabuleiroMatriz;
        entradaPosicao = estado.entradaPosicao;
        
        console.log('📊 Matriz carregada:', tabuleiroMatriz);
        
        // Restaurar jogadores
        jogadorAtualIndex = estado.jogadorAtualIndex;
        jogadores.forEach((j, idx) => {
            const salvo = estado.jogadores[idx];
            if (salvo) {
                j.id = salvo.id;
                j.ordem = salvo.ordem;
                j.tileId = salvo.tileId;
            }
        });
        
        // Restaurar cartas
        cartas.clear();
        estado.cartas.forEach(c => {
            cartas.set(c.id, {
                id: c.id,
                tipo: c.tipo,
                nome: c.nome,
                efeito: c.efeito,
                imagem: c.imagem,
                imagemMiniatura: c.imagemMiniatura,
                faceUp: c.faceUp,
                zona: c.zona,
                dono: c.dono
            });
        });
        
        // Criar tabuleiro com o estado salvo
        criarTabuleiro();
        
        console.log('🎲 Tabuleiro criado, verificando tiles...');
        const tilesCarregados = tabuleiro.querySelectorAll('.tile');
        const tiposCarregados = Array.from(tilesCarregados).map(t => ({id: t.dataset.id, tipo: t.tipo}));
        console.log('  Tiles após criar:', tiposCarregados);
        
        // Restaurar rotações dos tiles se houver
        if (estado.tilesInfo && estado.tilesInfo.length > 0) {
            console.log('🔄 Restaurando rotações dos tiles...');
            estado.tilesInfo.forEach(({id, rotacao}) => {
                if (rotacao && rotacao !== 0) {
                    const tile = document.querySelector(`.tile[data-id="${CSS.escape(id)}"]`);
                    if (tile) {
                        tile.rotacao = rotacao;
                        tile.style.transform = `rotate(${rotacao}deg)`;
                        console.log(`  Tile ${id}: rotação ${rotacao}°`);
                    }
                }
            });
        } else if (estado.tilesRotacoes && estado.tilesRotacoes.length > 0) {
            // Suporte para formato antigo
            console.log('🔄 Restaurando rotações dos tiles (formato antigo)...');
            estado.tilesRotacoes.forEach(({id, rotacao}) => {
                const tile = document.querySelector(`.tile[data-id="${CSS.escape(id)}"]`);
                if (tile) {
                    tile.rotacao = rotacao;
                    tile.style.transform = `rotate(${rotacao}deg)`;
                    console.log(`  Tile ${id}: rotação ${rotacao}°`);
                }
            });
        }
        
        // Renderizar cartas e jogadores
        renderizarCartas();
        desenharJogadores();
        atualizarInfoTurno();
        atualizarDestaqueInventario();
        
        console.log('✅ Estado restaurado com sucesso');
        return true;
    } catch (erro) {
        console.error('❌ Erro ao carregar estado:', erro);
        return false;
    }
}

function limparEstadoLocal() {
    localStorage.removeItem('labirinto-hidra-estado');
    console.log('🗑️ Estado local removido');
}

// atualiza destaque do slot de inventário do jogador ativo
function atualizarDestaqueInventario() {
    // limpa todos
    for (let i = 1; i <= 4; i++) {
        const el = document.getElementById(`jogador-${i}`)
        if (el) el.classList.remove("ativo")
    }

    const atual = jogadorAtual()
    
    // Mapear personagem para slot de inventário no HTML
    // Torvin=azul(1), Elara=vermelho(2), Zephyr=verde(3), Kaelen=roxo(4)
    const personagemParaSlot = {
        'torvin': 1,
        'elara': 2,
        'zephyr': 3,
        'kaelen': 4
    };
    
    const slotId = personagemParaSlot[atual.personagem?.toLowerCase()];
    if (slotId) {
        const ativoEl = document.getElementById(`jogador-${slotId}`);
        if (ativoEl) ativoEl.classList.add("ativo");
    }
}

function tornarZonaDropavel(zona) {
    zona.addEventListener("dragover", e => {
        e.preventDefault()
        zona.classList.add("drop-ativo")
    })

    zona.addEventListener("dragleave", () => {
        zona.classList.remove("drop-ativo")
    })

    zona.addEventListener("drop", e => {
        e.preventDefault()
        zona.classList.remove("drop-ativo")

        const idCarta = e.dataTransfer.getData("text/plain")
        if (!idCarta) return

        const tile = zona.closest(".tile")
        if (!tile) return

        const tileId = tile.dataset.id
        moverCartaParaTile(idCarta, tileId)
    })
}


//Cartas

const cartas = new Map()
// id → estado da carta

function inicializarCartas() {
    cartas.clear()

    /* =========================
       PERIGOS
       ========================= */
    const perigos = [
        { id: "p1", tipo: "perigo", nome: "Poço de Lodo", efeito: "Fica atolado e perde Pontos de Ação", imagem: "cartas/perigo/1-poco_lodo_carta.png", imagemMiniatura: "cartas/perigo/1-poco_lodo.png" },
        { id: "p2", tipo: "perigo", nome: "Ninho de Morcegos", efeito: "Temporiariamente desorientado", imagem: "cartas/perigo/2-Ninho_de_morcego_carta.png", imagemMiniatura: "cartas/perigo/2-Ninho_de_morcego.png" },
        { id: "p3", tipo: "perigo", nome: "Corrente de Ar Tóxico", efeito: "Forçado a retroceder", imagem: "cartas/perigo/3-Corrente_de_ar_toxico_carta.png", imagemMiniatura: "cartas/perigo/3-Corrente_de_ar_toxico.png" },
        { id: "p4", tipo: "perigo", nome: "Pilares em Colapso", efeito: "Forçado a se concentrar na defesa", imagem: "cartas/perigo/4-Pilares_em_Colapso_carta.png", imagemMiniatura: "cartas/perigo/4-Pilares_em_Colapso.png" },
        { id: "p5", tipo: "perigo", nome: "Estalactites Sonoras", efeito: "Estalactites vibram e ameaçam cair", imagem: "cartas/perigo/5-Estalactites_Sonoras_carta.png", imagemMiniatura: "cartas/perigo/5-Estalactites_Sonoras.png" }
    ]

    /* =========================
       ARTEFATOS
       ========================= */
    const artefatos = [
        { id: "a1", tipo: "artefatos", nome: "A Gema da Visão (O Olho de Ciclope)", efeito: "+3 PA para o turno", imagem: "cartas/Artefatos/1-Gema_da_visao_carta.png", imagemMiniatura: "cartas/Artefatos/1-Gema_da_visao.png" },
        { id: "a2", tipo: "artefatos", nome: "A Lâmina do Limiar (A Espada Quebra-Feitiços)", efeito: "Imune aos efeitos de Tiles de Perigo", imagem: "cartas/Artefatos/2-A_Lamina_do_Limiar_carta.png", imagemMiniatura: "cartas/Artefatos/2-A_Lamina_do_Limiar.png" },
        { id: "a3", tipo: "artefatos", nome: "O Amuleto do Eco (A Concha da Memória)", efeito: "Recupera 1 item perdido", imagem: "cartas/Artefatos/3-O_Amuleto_do_Eco_carta.png", imagemMiniatura: "cartas/Artefatos/3-O_Amuleto_do_Eco.png" },
        { id: "a4", tipo: "artefatos", nome: "O Cálice do Tempo (O Recipiente Gotejante)", efeito: "Força de Ataque em combate aumentado", imagem: "cartas/Artefatos/4-O_Calice_do_Tempo_carta.png", imagemMiniatura: "cartas/Artefatos/4-O_Calice_do_Tempo.png" },
        { id: "a5", tipo: "artefatos", nome: "A Coroa da Fuga (O Diadema do Vencedor)", efeito: "+1 em todos os testes", imagem: "cartas/Artefatos/5-A_Coroa_da_Fuga_carta.png", imagemMiniatura: "cartas/Artefatos/5-A_Coroa_da_Fuga.png" },
        { id: "a6", tipo: "artefatos", nome: "O Sino da Calma (A Campainha Silenciosa)", efeito: "Recupera PA perdidos", imagem: "cartas/Artefatos/6-O_Sino_da_Calma_carta.png", imagemMiniatura: "cartas/Artefatos/6-O_Sino_da_Calma.png" },
        { id: "a7", tipo: "artefatos", nome: "A Lamparina da Sombra (A Lanterna Desorientadora)", efeito: "Mover 1 Tile de perigo para borda", imagem: "cartas/Artefatos/7-A_Lamparina_da_Sombra_carta.png", imagemMiniatura: "cartas/Artefatos/7-A_Lamparina_da_Sombra.png" },
        { id: "a8", tipo: "artefatos", nome: "O Anel da Gravidade (O Peso de Pedra)", efeito: "Move 1 Tile para longe da Hidra", imagem: "cartas/Artefatos/8-O_Anel_da_Gravidade_carta.png", imagemMiniatura: "cartas/Artefatos/8-O_Anel_da_Gravidade.png" },
        { id: "a9", tipo: "artefatos", nome: "O Mapa do Espectro (A Tábua Riscada)", efeito: "Pode olhar o próximo Artefato da Pilha", imagem: "cartas/Artefatos/9-O_Mapa_do_Espectro_carta.png", imagemMiniatura: "cartas/Artefatos/9-O_Mapa_do_Espectro.png" },
        { id: "a10", tipo: "artefatos", nome: "A Máscara do Caos (A Face da Mentira)", efeito: "Escolhe onde o próximo artefato é descartado", imagem: "cartas/Artefatos/10-A_Mascara_do_Caos_carta.png", imagemMiniatura: "cartas/Artefatos/10-A_Mascara_do_Caos.png" }
    ]

    
    /* =========================
       EMBARALHAR
       ========================= */
    embaralharArray(perigos)
    embaralharArray(artefatos)

    /* =========================
       INSERIR NO MAP (ORDEM IMPORTA!)
       ========================= */
    perigos.forEach(carta => {
        cartas.set(carta.id, {
            ...carta,
            tipo: "perigo",
            faceUp: false,
            zona: "pilha-perigo",
            dono: null
        })
    })

    artefatos.forEach(carta => {
        cartas.set(carta.id, {
            ...carta,
            tipo: "artefato",
            faceUp: false,
            zona: "pilha-artefato",
            dono: null
        })
    })
}



function embaralharArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
}



inicializarCartas()

function obterTopoDaPilha(zonaId) {
    const cartasDaPilha = [...cartas.values()]
        .filter(c => c.zona === zonaId)

    return cartasDaPilha.length
        ? cartasDaPilha[cartasDaPilha.length - 1]
        : null
}


// Distribui cartas iniciais nas câmaras: 3 perigos e 5 artefatos
function distribuirCartasNasCamaras(qtdPerigo = 3, qtdArtefato = 5) {
    // coleta todos os tiles do tipo camara no DOM (já criados por criarTabuleiro)
    const camaras = [...tabuleiro.children].filter(tile => tile && tile.tipo === 'camara')
    if (camaras.length === 0) return

    // embaralha as câmaras para seleção aleatória
    const camarasAleatorias = [...camaras]
    embaralharArray(camarasAleatorias)

    // seleciona tiles para perigo e artefato sem repetir
    const perigoTiles = camarasAleatorias.slice(0, Math.min(qtdPerigo, camarasAleatorias.length))
    const artefatoTiles = camarasAleatorias.slice(perigoTiles.length, Math.min(perigoTiles.length + qtdArtefato, camarasAleatorias.length))

    // coloca perigos
    for (const tile of perigoTiles) {
        const topoPerigo = obterTopoDaPilha('pilha-perigo')
        if (!topoPerigo) break
        moverCartaParaTile(topoPerigo.id, tile.dataset.id)
    }

    // coloca artefatos
    for (const tile of artefatoTiles) {
        const topoArtefato = obterTopoDaPilha('pilha-artefato')
        if (!topoArtefato) break
        moverCartaParaTile(topoArtefato.id, tile.dataset.id)
    }
}

function renderizarCartas() {
    console.log("renderizarCartas chamada")

    // remove cartas visuais
    document.querySelectorAll(".carta").forEach(el => el.remove())

    // pilha artefato
    const pilhaArtefato = document.getElementById("pilha-artefato")
    const topoArtefato = obterTopoDaPilha("pilha-artefato")

    if (pilhaArtefato && topoArtefato) {
        const el = criarCartaVisual(topoArtefato)
        el.draggable = true
        pilhaArtefato.appendChild(el)
    }

    // pilha perigo
    const pilhaPerigo = document.getElementById("pilha-perigo")
    const topoPerigo = obterTopoDaPilha("pilha-perigo")

    if (pilhaPerigo && topoPerigo) {
        const el = criarCartaVisual(topoPerigo)
        el.draggable = true
        pilhaPerigo.appendChild(el)
    }

    // OUTRAS ZONAS (tiles, inventários, descarte)
    cartas.forEach(carta => {
        if (carta.zona === "pilha-perigo" || carta.zona === "pilha-artefato") {
            return
        }

        let zonaEl = null

       if (carta.zona.startsWith("tile-")) {
    const tileId = carta.zona.replace("tile-", "")
    const tile = document.querySelector(`.tile[data-id="${CSS.escape(tileId)}"]`)

    if (!tile) return

    const cartasContainer = tile.querySelector(".cartas-no-tile")
    if (!cartasContainer) return

    zonaEl = cartasContainer

        } else {
            zonaEl = document.getElementById(carta.zona)
        }

        if (!zonaEl) return

        const el = criarCartaVisual(carta)
        zonaEl.appendChild(el)
    })
}

renderizarCartas()

// Após primeira renderização, distribui cartas iniciais nas câmaras
try {
    distribuirCartasNasCamaras(3, 5)
} catch (e) {
    console.warn('Falha ao distribuir cartas iniciais nas câmaras:', e)
}

function criarCartaVisual(carta) {
    const cartaEl = document.createElement("div")
    cartaEl.classList.add("carta")
    cartaEl.dataset.id = carta.id
    cartaEl.draggable = true

    // mostra nome ao passar o mouse (tooltip nativo) apenas se a carta estiver virada
    if (carta.nome && carta.faceUp) cartaEl.title = carta.nome

    if (carta.faceUp) {
        cartaEl.classList.add("virada")
    }

    const inner = document.createElement("div")
    inner.classList.add("carta-inner")
    
     // 🔥 DIFERENCIAÇÃO POR TIPO
    cartaEl.classList.add(carta.tipo) 
    
    if (carta.faceUp) {
        cartaEl.classList.add("virada")
    }
    const verso = document.createElement("div")
    verso.classList.add("carta-face", "carta-verso")
    verso.innerText = carta.tipo === "perigo" ? "PERIGO" : "ARTEFATO"
    verso.style.fontSize = "8px"

    const frente = document.createElement("div")
    frente.classList.add("carta-face", "carta-frente")
    // em visualização minimizada, usar a miniatura se disponível;
    // o zoom sempre mostrará a imagem completa
    const mini = carta.imagemMiniatura || carta.imagem
    frente.style.backgroundImage = `url("${mini}")`
    frente.style.backgroundSize = "cover"
    //frente.innerText = carta.nome  
    frente.style.backgroundPosition = "center"
    frente.style.backgroundRepeat = "no-repeat"


    inner.appendChild(verso)
    inner.appendChild(frente)
    cartaEl.appendChild(inner)

    // virar carta
    cartaEl.addEventListener("click", (e) => {
        if (e.altKey) return
        e.stopPropagation()
        
        // Verificar se a carta está em um tile (validação apenas em multiplayer)
        const modoMultiplayer = sessionStorage.getItem('modoMultiplayer') === 'true';
        if (modoMultiplayer && carta.zona && carta.zona.startsWith('tile-')) {
            const tileId = carta.zona.replace('tile-', '');
            
            // Validar se o jogador está no tile
            if (!meuJogadorEstaNoTile(tileId)) {
                alert('Você só pode virar cartas no tile onde seu jogador está!');
                return;
            }
        }
        
        carta.faceUp = !carta.faceUp
        renderizarCartas()
        
        console.log('🃏 Virando carta:', carta.id, 'faceUp:', carta.faceUp);
        
        // Sincronizar virada de carta no multiplayer
        if (typeof enviarAcao === 'function') {
            console.log('📤 Enviando evento virar-carta');
            enviarAcao('virar-carta', {
                cartaId: carta.id,
                faceUp: carta.faceUp
            });
        } else {
            console.warn('⚠️ enviarAcao não disponível');
        }
        
        // Salvar estado após virar carta
        salvarEstadoLocal();
    })

    // drag
    cartaEl.addEventListener("dragstart", (e) => {
        // Verificar se a carta está em um tile (validação apenas em multiplayer)
        const modoMultiplayer = sessionStorage.getItem('modoMultiplayer') === 'true';
        if (modoMultiplayer && carta.zona && carta.zona.startsWith('tile-')) {
            const tileId = carta.zona.replace('tile-', '');
            
            // Validar se o jogador está no tile
            if (!meuJogadorEstaNoTile(tileId)) {
                e.preventDefault();
                alert('Você só pode arrastar cartas do tile onde seu jogador está!');
                return;
            }
        }
        
        e.dataTransfer.setData("text/plain", carta.id)
    })

    const zoomBtn = document.createElement("div")
    zoomBtn.classList.add("zoom-btn")
    zoomBtn.innerText = "🔍"

    zoomBtn.addEventListener("click", e => {
        e.stopPropagation()
        abrirZoomCarta(carta)
    })

    cartaEl.appendChild(zoomBtn)



    return cartaEl
}


console.log("Cartas:", cartas)

function atualizarVisualCarta(el) {
    const carta = cartas.get(el.dataset.id)
    el.classList.toggle("virada", carta.faceUp)
    el.innerText = carta.faceUp ? carta.nome : "?"
}

document.querySelectorAll(".zona").forEach(zona => {
    zona.addEventListener("dragover", e => e.preventDefault())

    zona.addEventListener("drop", e => {
        e.preventDefault()
        const idCarta = e.dataTransfer.getData("text/plain")
        //moverCarta(idCarta, zona.id || zona.dataset.jogador)
        moverCartaParaZona(idCarta, zona.id || zona.dataset.jogador)
    })
})

function moverCarta(idCarta, zonaDestino) {
    const carta = cartas.get(idCarta)
    if (!carta) return

    carta.zona = zonaDestino
    carta.faceUp = false // pilha sempre oculta

    renderizarCartas()
}


function moverCartaParaTile(idCarta, tileId) {
    const carta = cartas.get(idCarta)
    if (!carta) return

    carta.zona = `tile-${tileId}`
    carta.faceUp = false
    carta.dono = null

    renderizarCartas()
    
    // Sincronizar movimento de carta no multiplayer
    if (typeof enviarAcao === 'function') {
        enviarAcao('mover-carta', {
            idCarta,
            destino: `tile-${tileId}`
        });
    }
    
    // Salvar estado após mover carta
    salvarEstadoLocal();
}


function moverCartaParaZona(idCarta, zonaId) {
    const carta = cartas.get(idCarta)
    if (!carta) return

    carta.zona = zonaId

    if (zonaId.startsWith("jogador-")) {
        carta.dono = Number(zonaId.split("-")[1])
        carta.faceUp = true
    } else {
        // Se não está em inventário de jogador, limpa o dono
        carta.dono = null
        carta.faceUp = false
    }

    renderizarCartas()
    
    // Sincronizar movimento de carta no multiplayer
    if (typeof enviarAcao === 'function') {
        enviarAcao('mover-carta', {
            idCarta,
            destino: zonaId
        });
    }
    
    // Salvar estado após mover carta
    salvarEstadoLocal();
}

    function serializarCartas() {
    return Array.from(cartas.values()).map(c => ({
        id: c.id,
        tipo: c.tipo,
        faceUp: c.faceUp,
        zona: c.zona,
        nome: c.nome,
        efeito: c.efeito,
        imagem: c.imagem,
        imagemMiniatura: c.imagemMiniatura
    }))
}

// renderizarCartas() é chamado acima quando necessário

function criarCartaVisualZoom(carta) {
    const el = document.createElement("div")
    el.classList.add("carta", carta.tipo, "virada")

    // tooltip no zoom apenas se a carta estiver virada
    if (carta.nome && carta.faceUp) el.title = carta.nome

    el.style.width = "440px"
    el.style.height = "680px"
    el.style.cursor = "default"

    const inner = document.createElement("div")
    inner.classList.add("carta-inner")

    const frente = document.createElement("div")
    frente.classList.add("carta-face", "carta-frente")
    frente.style.backgroundImage = `url("${carta.imagem}")`
    frente.style.backgroundSize = "cover"
    frente.style.backgroundPosition = "center"

    inner.appendChild(frente)
    el.appendChild(inner)

    el.addEventListener("click", e => e.stopPropagation())

    return el
}


let zoomOverlay = null
let zoomContainer = null
let zoomFecharBtn = null


function criarZoomOverlay() {
    // evita duplicar
    if (document.getElementById("zoom-carta-overlay")) return

    const overlay = document.createElement("div")
    overlay.id = "zoom-carta-overlay"

    const fecharBtn = document.createElement("button")
    fecharBtn.id = "zoom-fechar-btn"
    fecharBtn.innerText = "✕"

    const container = document.createElement("div")
    container.id = "zoom-carta-container"

    overlay.appendChild(fecharBtn)
    overlay.appendChild(container)
    document.body.appendChild(overlay)

    // salvar referências globais
    zoomOverlay = overlay
    zoomContainer = container

    zoomFecharBtn = fecharBtn
    fecharBtn.addEventListener("click", fecharZoomCarta)
    // fechar ao clicar fora do container
    overlay.addEventListener("click", fecharZoomCarta)
    // evitar fechar quando clicar dentro do container
    container.addEventListener("click", e => e.stopPropagation())
}

// Se o script foi carregado após o DOM (inclusão no fim do body), cria imediatamente
criarZoomOverlay()

function abrirZoomCarta(carta) {
    if (!zoomOverlay || !zoomContainer) return

    zoomContainer.innerHTML = ""
    zoomContainer.appendChild(criarCartaVisualZoom(carta))
    zoomOverlay.classList.add("ativo")
}


function fecharZoomCarta() {
    if (!zoomOverlay || !zoomContainer) return

    zoomOverlay.classList.remove("ativo")
    zoomContainer.innerHTML = ""
}



// garante que o overlay tenha listener mesmo se o script for carregado antes/do DOM
const _zoomOverlayEl = document.getElementById("zoom-carta-overlay")
if (_zoomOverlayEl) _zoomOverlayEl.addEventListener("click", fecharZoomCarta)


//Dado D6
function rolarD6() {
    return Math.floor(Math.random() * 6) + 1
}


function rolarD6() {
    return Math.floor(Math.random() * 6) + 1
}

function rolar2D6() {
    const d1 = rolarD6()
    const d2 = rolarD6()
    return {
        d1,
        d2,
        total: d1 + d2
    }
}



function animarDados(qtd, callbackFinal) {
    const dado1 = document.getElementById("dado1")
    const dado2 = document.getElementById("dado2")

    let frames = 10
    let intervalo = setInterval(() => {
        dado1.textContent = rolarD6()
        dado1.classList.add("rolando")

        if (qtd === 2) {
            dado2.textContent = rolarD6()
            dado2.classList.add("rolando")
        } else {
            dado2.textContent = "–"
            dado2.classList.remove("rolando")
        }

        frames--
        if (frames <= 0) {
            clearInterval(intervalo)
            dado1.classList.remove("rolando")
            dado2.classList.remove("rolando")
            callbackFinal()
        }
    }, 100)
}

const btnRolarD6 = document.getElementById("btn-rolar-d6")
const btnRolar2D6 = document.getElementById("btn-rolar-2d6")
const resultadoDado = document.getElementById("resultado-dado")

btnRolarD6.addEventListener("click", () => {
    animarDados(1, () => {
        const valor = rolarD6()
        document.getElementById("dado1").textContent = valor
        resultadoDado.textContent = `D6: ${valor}`
        
        if (typeof enviarAcao === 'function') {
            enviarAcao('rolar-dado', {
                tipo: 'd6',
                resultado: valor
            });
        }
    })
})

btnRolar2D6.addEventListener("click", () => {
    animarDados(2, () => {
        const { d1, d2, total } = rolar2D6()
        document.getElementById("dado1").textContent = d1
        document.getElementById("dado2").textContent = d2
        resultadoDado.textContent = `2D6: ${d1} + ${d2} = ${total}`
        
        if (typeof enviarAcao === 'function') {
            enviarAcao('rolar-dado', {
                tipo: '2d6',
                resultado: { d1, d2, total }
            });
        }
    })
})

// Contador de rodadas
let rodadaAtual = 1
const rodadasValorEl = document.getElementById("rodadas-valor")
const rodadasIncrBtn = document.getElementById("rodadas-incr")
const rodadasDecrBtn = document.getElementById("rodadas-decr")

function atualizarRodadaUI() {
    if (rodadasValorEl) rodadasValorEl.textContent = String(rodadaAtual)
}

if (rodadasIncrBtn) {
    rodadasIncrBtn.addEventListener("click", (e) => {
        e.stopPropagation()
        rodadaAtual++
        atualizarRodadaUI()
        
        if (typeof enviarAcao === 'function') {
            enviarAcao('atualizar-rodada', { valor: rodadaAtual });
        }
    })
}

if (rodadasDecrBtn) {
    rodadasDecrBtn.addEventListener("click", (e) => {
        e.stopPropagation()
        if (rodadaAtual > 0) rodadaAtual--
        atualizarRodadaUI()
        
        if (typeof enviarAcao === 'function') {
            enviarAcao('atualizar-rodada', { valor: rodadaAtual });
        }
    })
}

// inicializa UI do contador
atualizarRodadaUI()

// Botão Grito da Hidra
const botaoGritoHidra = document.getElementById("grito-da-hidra")
if (botaoGritoHidra) {
    botaoGritoHidra.addEventListener("click", () => {
        gritoHidra()
    })
}

// Contadores de PA por jogador
const paValores = { 1: 4, 2: 4, 3: 4, 4: 4 }

function atualizarPAUI(idJogador) {
    const el = document.getElementById(`pa-${idJogador}-valor`)
    if (el) el.textContent = String(paValores[idJogador])
}

function configurarPAListeners(idJogador) {
    const incr = document.getElementById(`pa-${idJogador}-incr`)
    const decr = document.getElementById(`pa-${idJogador}-decr`)
    if (incr) {
        incr.addEventListener("click", (e) => {
            e.stopPropagation()
            paValores[idJogador]++
            atualizarPAUI(idJogador)
            
            if (typeof enviarAcao === 'function') {
                enviarAcao('atualizar-contador', {
                    jogadorId: idJogador,
                    tipo: 'pa',
                    valor: paValores[idJogador]
                });
            }
        })
    }
    if (decr) {
        decr.addEventListener("click", (e) => {
            e.stopPropagation()
            if (paValores[idJogador] > 0) paValores[idJogador]--
            atualizarPAUI(idJogador)
            
            if (typeof enviarAcao === 'function') {
                enviarAcao('atualizar-contador', {
                    jogadorId: idJogador,
                    tipo: 'pa',
                    valor: paValores[idJogador]
                });
            }
        })
    }
}

// Contadores de FA por jogador
const faValores = { 1: 2, 2: 2, 3: 2, 4: 2 }

function atualizarFAUI(idJogador) {
    const el = document.getElementById(`fa-${idJogador}-valor`)
    if (el) el.textContent = String(faValores[idJogador])
}

function configurarFAListeners(idJogador) {
    const incr = document.getElementById(`fa-${idJogador}-incr`)
    const decr = document.getElementById(`fa-${idJogador}-decr`)
    if (incr) {
        incr.addEventListener("click", (e) => {
            e.stopPropagation()
            faValores[idJogador]++
            atualizarFAUI(idJogador)
            
            if (typeof enviarAcao === 'function') {
                enviarAcao('atualizar-contador', {
                    jogadorId: idJogador,
                    tipo: 'fa',
                    valor: faValores[idJogador]
                });
            }
        })
    }
    if (decr) {
        decr.addEventListener("click", (e) => {
            e.stopPropagation()
            if (faValores[idJogador] > 0) faValores[idJogador]--
            atualizarFAUI(idJogador)
            
            if (typeof enviarAcao === 'function') {
                enviarAcao('atualizar-contador', {
                    jogadorId: idJogador,
                    tipo: 'fa',
                    valor: faValores[idJogador]
                });
            }
        })
    }
}

// Inicializa UI de PA e FA
[1,2,3,4].forEach(id => {
    configurarPAListeners(id)
    atualizarPAUI(id)
    configurarFAListeners(id)
    atualizarFAUI(id)
})



const personagens = [
    {
        id: 1,
        nome: "Torvin Mão de Ferro",
        imagem: "cartas/Personagens/1-Torvin_carta.png",
        versoImagem: "cartas/Personagens/1-Torvin.png",
        descricao: "O Escavador (Drill Master)."
    },
    {
        id: 2,
        nome: "Elara dos Símbolos",
        imagem: "cartas/Personagens/2-Elara_1_carta.png",
        versoImagem: "cartas/Personagens/2-Elara_1.png",
        descricao: "O Mago Cartógrafo (Map Weaver)."
    },
    {
        id: 3,
        nome: "Zephyr",
        imagem: "cartas/Personagens/3-Zephyr_carta.png",
        versoImagem: "cartas/Personagens/3-Zephyr.png",
        descricao: "O Ladrão do Crepúsculo (Shadow Rogue)."
    },
    {
        id: 4,
        nome: "Kaelen",
        imagem: "cartas/Personagens/4-Kaelen_carta.png",
        versoImagem: "cartas/Personagens/4-Kaelen.png",
        descricao: "A Guardiã da Luz (Warden)."
    }
]

function renderizarCartasPersonagens(jogadorAtivoId = null) {
    const container = document.getElementById("cartas-personagens")
    container.innerHTML = ""
    
    // Encontrar personagem do jogador ativo (se fornecido)
    let personagemAtivo = null;
    if (jogadorAtivoId !== null) {
        const jogadorAtivo = jogadores.find(j => j.id === jogadorAtivoId);
        if (jogadorAtivo && jogadorAtivo.personagem) {
            // Mapear nome do personagem para ID no array personagens
            const personagemMap = {
                'torvin': 1,
                'elara': 2,
                'zephyr': 3,
                'kaelen': 4
            };
            personagemAtivo = personagemMap[jogadorAtivo.personagem.toLowerCase()];
        }
    }

    personagens.forEach(p => {
        const carta = document.createElement("div")
        carta.classList.add("carta-personagem")
        carta.dataset.personagemId = p.id

        // marcar com classe do jogador para colorir borda: jogador-1..4
        carta.classList.add(`jogador-${p.id}`)

        // Destacar se este personagem é o do jogador ativo
        if (p.id === personagemAtivo) {
            carta.classList.add("ativo")
        }

        carta.innerHTML = `
            <div class="carta-inner">
                
                <div class="carta-verso">
                    <img src="${p.versoImagem}" alt="${p.nome}">                    
                </div>
                <div class="carta-frente">
                    <img src="${p.imagem}" alt="${p.nome}">
                </div>
            </div>
        `

        // 🔄 clique para virar (titulo aparece apenas quando virada)
        carta.addEventListener("click", () => {
            carta.classList.toggle("virada")
            const estaVirada = carta.classList.contains("virada")
            
            if (estaVirada) {
                carta.title = p.nome
            } else {
                carta.removeAttribute("title")
            }
            
            // Sincronizar virada de carta de personagem no multiplayer
            if (typeof enviarAcao === 'function') {
                enviarAcao('virar-carta-personagem', {
                    personagemId: p.id,
                    virada: estaVirada
                });
            }
        })
        // tooltip inicial somente se já estiver virada
        if (carta.classList.contains("virada")) carta.title = p.nome

        // botão de zoom (reuso do comportamento das cartas normais)
        const zoomBtn = document.createElement("div")
        zoomBtn.classList.add("zoom-btn")
        zoomBtn.innerText = "🔍"
        zoomBtn.addEventListener("click", e => {
            e.stopPropagation()
            abrirZoomCarta(p)
        })

        carta.appendChild(zoomBtn)

        container.appendChild(carta)
    })
}


renderizarCartasPersonagens()

renderizarCartasPersonagens(jogadorAtual().id)

// garante que o nome do personagem apareça ao iniciar, após a definição de `personagens`
atualizarInfoTurno()
atualizarDestaqueInventario()




// Aguardar DOM estar pronto antes de inicializar
document.addEventListener('DOMContentLoaded', () => {
    // Criar socket global para uso no multiplayer.js
    let socket = null;

    // Verificar se está em modo multiplayer
    const emModoMultiplayer = sessionStorage.getItem('modoMultiplayer') === 'true';

    if (emModoMultiplayer) {
        // Em modo multiplayer, conectar e aguardar conexão
        console.log('🔌 Criando socket em modo multiplayer...');
        socket = io();
        
        // Tornar socket global para multiplayer.js
        window.socket = socket;
        
        socket.on('connect', () => {
            console.log('🎮 Conectado ao servidor multiplayer:', socket.id);
            
            // Inicializar multiplayer SOMENTE após conexão
            if (typeof inicializarMultiplayer === 'function') {
                console.log('🚀 Chamando inicializarMultiplayer()...');
                inicializarMultiplayer();
            } else {
                console.error('❌ Função inicializarMultiplayer não encontrada!');
            }
            
            // Configurar event listener do botão Iniciar Jogo após conexão
            setTimeout(() => {
                const btnIniciarJogo = document.getElementById("btn-iniciar-jogo");
                if (btnIniciarJogo) {
                    console.log('✅ Botão Iniciar Jogo encontrado, registrando event listener');
                    btnIniciarJogo.addEventListener("click", () => {
                        console.log("🎮 BOTÃO INICIAR JOGO CLICADO");
                        const codigoSala = sessionStorage.getItem('codigoSala');
                        console.log("📤 Enviando iniciar-jogo para sala:", codigoSala);
                        socket.emit('iniciar-jogo', { codigoSala });
                    });
                } else {
                    console.error('❌ Botão Iniciar Jogo não encontrado no DOM');
                }
            }, 200);
        });
    } else {
        console.log('🎮 Modo local - Socket desativado');
        
        // Tentar carregar estado salvo
        const estadoCarregado = carregarEstadoLocal();
        
        if (!estadoCarregado) {
            // Se não há estado salvo, inicializar novo jogo
            // Em modo local, randomizar jogador inicial e inicializar
            jogadorAtualIndex = Math.floor(Math.random() * jogadores.length);
            console.log('🎲 Jogador inicial sorteado (modo local):', jogadorAtualIndex, '(ID:', jogadores[jogadorAtualIndex].id, ')');
            
            gerarMatriz();
            criarTabuleiro();
            renderizarCartasPersonagens(jogadorAtual().id);
            
            // Salvar estado inicial
            salvarEstadoLocal();
        } else {
            console.log('✅ Jogo retomado do estado salvo');
            renderizarCartasPersonagens(jogadorAtual().id);
        }
    }
});
