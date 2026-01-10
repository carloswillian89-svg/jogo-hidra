# 📋 Instruções de Instalação e Uso

## 🚀 Parte 1: Subir para GitHub Pages (Versão Local/Hot-Seat)

### Passo 1: Fazer Commit e Push
```bash
git add .
git commit -m "Adiciona suporte multiplayer e GitHub Pages"
git push origin main
```

### Passo 2: Ativar GitHub Pages
1. Vá ao seu repositório no GitHub
2. Clique em **Settings** > **Pages**
3. Em "Build and deployment":
   - Source: **Deploy from a branch**
   - Branch: **gh-pages** (será criada automaticamente)
4. Aguarde alguns minutos

### Passo 3: Acessar
Seu jogo estará disponível em:
```
https://[seu-usuario].github.io/jogo-hidra
```

⚠️ **Nota:** A versão do GitHub Pages só funciona em modo local (hot-seat). Para multiplayer online, siga a Parte 2.

---

## 🎮 Parte 2: Servidor Multiplayer Local

### Passo 1: Instalar Node.js
Se ainda não tem, baixe em: https://nodejs.org/

### Passo 2: Instalar Dependências
Abra o terminal na pasta do projeto e execute:
```bash
npm install
```

### Passo 3: Iniciar Servidor
```bash
npm start
```

Você verá:
```
🚀 Servidor rodando em http://localhost:3000
```

### Passo 4: Acessar o Jogo
1. Abra o navegador e vá para: `http://localhost:3000/lobby.html`
2. Digite seu nome
3. Clique em **"Criar Sala"** ou **"Entrar na Sala"**

---

## 👥 Como Jogar Multiplayer

### Criar uma Partida
1. Jogador 1 cria uma sala
2. Copia o código da sala (ex: `ABC123`)
3. Compartilha o código com os amigos

### Entrar na Partida
1. Outros jogadores acessam: `http://localhost:3000/lobby.html`
2. Digitam o código da sala
3. Escolhem seus personagens
4. Clicam em "Estou Pronto!"

### Iniciar Jogo
- Quando todos estiverem prontos (mínimo 2 jogadores), o jogo inicia automaticamente
- A ordem dos turnos é embaralhada

---

## 🌐 Parte 3: Multiplayer Online (Opcional)

Para permitir que amigos em outras redes joguem:

### Opção A: Usar Ngrok (Mais Fácil)
```bash
# Instalar ngrok
npm install -g ngrok

# Com o servidor rodando, em outro terminal:
ngrok http 3000
```
Compartilhe a URL fornecida (ex: `https://abc123.ngrok.io/lobby.html`)

### Opção B: Deploy em Servidor
Você pode fazer deploy em:
- **Heroku** (gratuito com limitações)
- **Railway.app** (gratuito)
- **Render.com** (gratuito)
- **Glitch.com** (gratuito)

#### Exemplo - Railway:
1. Crie conta em https://railway.app
2. Clique em "New Project" > "Deploy from GitHub"
3. Conecte seu repositório
4. Adicione variável de ambiente: `PORT` = `3000`
5. Deploy automático!

---

## 🎯 Fluxo do Jogo Multiplayer

1. **Lobby** (`lobby.html`)
   - Criar/Entrar em sala
   - Escolher personagem
   - Marcar como pronto

2. **Jogo** (`index.html`)
   - Turnos sincronizados
   - Ações enviadas em tempo real
   - Todos veem as mesmas mudanças

3. **Sincronização**
   - Colocar tiles
   - Mover personagens
   - Passar turno
   - Comprar cartas
   - Atualizar contadores (PA/FA)

---

## 🔧 Comandos Úteis

```bash
# Iniciar servidor
npm start

# Iniciar com auto-reload (desenvolvimento)
npm run dev

# Ver logs do servidor
# (já mostra automaticamente)

# Parar servidor
# Pressione Ctrl+C no terminal
```

---

## ❓ Solução de Problemas

### "npm não é reconhecido"
➡️ Instale o Node.js primeiro

### "Porta 3000 já em uso"
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID [numero] /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Jogadores não conseguem conectar
- Certifique-se que todos estão na mesma rede (WiFi)
- Desative firewall temporariamente
- Use Ngrok para redes diferentes

### Jogo não sincroniza
- Verifique o console do navegador (F12)
- Recarregue a página
- Reinicie o servidor

---

## 📝 Estrutura de Arquivos

```
jogo-hidra/
├── index.html              # Jogo principal
├── lobby.html              # Tela de lobby/login
├── script.js               # Lógica do jogo
├── multiplayer.js          # Sincronização multiplayer
├── lobby.js                # Lógica do lobby
├── style.css               # Estilos do jogo
├── style-lobby.css         # Estilos do lobby
├── server.js               # Servidor Node.js
├── package.json            # Dependências
└── README.md               # Documentação

cartas/
├── Artefatos/
├── perigo/
└── Personagens/
```

---

## 🎨 Próximas Melhorias Sugeridas

- [ ] Chat entre jogadores
- [ ] Histórico de ações
- [ ] Replay de partidas
- [ ] Ranking/Estatísticas
- [ ] Sons e efeitos visuais
- [ ] Modo espectador
- [ ] Salas privadas com senha

---

## 📞 Suporte

Se tiver problemas, verifique:
1. Console do navegador (F12)
2. Terminal do servidor
3. Logs de erro específicos

Boa sorte e divirta-se! 🎮🐉
