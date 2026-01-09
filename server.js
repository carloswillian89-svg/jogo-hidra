const express = require("express")
const http = require("http")
const { Server } = require("socket.io")

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: "*", // depois vamos restringir
        methods: ["GET", "POST"]
    }
})

// 🔥 ESTADO DO JOGO (GLOBAL)
let estadoJogo = {
    jogadores: [],
    turnoAtual: 0,
    tabuleiro: null,
    cartas: null
}

io.on("connection", socket => {
    console.log("Jogador conectado:", socket.id)

    // jogador entra
    socket.on("entrarJogo", nome => {
        const jogador = {
            id: socket.id,
            nome,
            ordem: estadoJogo.jogadores.length + 1
        }

        estadoJogo.jogadores.push(jogador)

        io.emit("estadoAtualizado", estadoJogo)
    })

    socket.on("disconnect", () => {
        console.log("Jogador saiu:", socket.id)
        estadoJogo.jogadores = estadoJogo.jogadores.filter(j => j.id !== socket.id)
        io.emit("estadoAtualizado", estadoJogo)
    })
})

server.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000")
})
