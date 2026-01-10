<<<<<<< HEAD
# 🐉 Labirinto da Hidra

Jogo de tabuleiro multiplayer online baseado em turnos.

## 🎮 Como Jogar

### Versão Online (GitHub Pages)
Acesse: `https://[seu-usuario].github.io/jogo-hidra`

### Versão Multiplayer Local

1. **Instalar dependências:**
```bash
npm install
```

2. **Iniciar servidor:**
```bash
npm start
```

3. **Abrir no navegador:**
```
http://localhost:3000
```

## 🚀 Deployment

### GitHub Pages
1. Faça push para o repositório
2. Vá em Settings > Pages
3. Selecione "Deploy from a branch"
4. Escolha branch `gh-pages`

### Multiplayer
O servidor WebSocket permite que até 4 jogadores conectem simultaneamente e joguem em tempo real.

## 📦 Tecnologias
- HTML5 / CSS3 / JavaScript
- Node.js + Express
- Socket.io (WebSocket)

## 🎯 Funcionalidades
- ✅ Jogo local single-player/hot-seat
- ✅ Sistema de turnos
- ✅ Arrastar e soltar tiles
- 🎮 Multiplayer online
- 👥 Lobby de jogadores
- 🎭 Seleção de personagens
=======

Manual de Regras 
Labirinto da Hidra
Um Jogo Tático de Exploração e Transformação para 2-4 Aventureiros

I. Visão Geral do Jogo

1. Tema
Os jogadores são aventureiros que se aventuram em um antigo covil subterrâneo dominado por uma Hidra mística. A caverna é uma entidade viva, e a Hidra tem o poder de reorganizar suas passagens (suas "cabeças" se regeneram), alterando o labirinto constantemente.

2. Objetivo
Ser o primeiro Aventureiro a coletar 3 Artefatos Únicos e, em seguida, alcançar o Portal de Fuga.

II. Componentes 
 
* Peças do Labirinto (Tiles): 25 peças quadradas (70mm x 70mm) com caminhos e paredes em relevo.
 * Miniaturas de Aventureiros: 4 Miniaturas (Escavador, Mago, Ladrão, Guardiã).
 * Miniatura da Hidra: 1 Miniatura de Hidra (colocada no Tile Central).
 * Artefatos: 10 Miniaturas Únicas de Artefatos.
 * Perigos: 5 Miniaturas Únicas de Perigo.
 * Outros: 2 Dados de 6 Lados (D6).


III. Configuração Padrão do Jogo (5 x 5 Tiles)
  Montagem do Labirinto: Monte o tabuleiro com 25 Peças do Labirinto em um grid 5 x 5 aleatório.
  Locais Chave Fixos:
Posicione o Ponto de Entrada e o Portal de Fuga em Tiles de borda (de preferência em bordas opostas).
Coloque a Hidra no Tile central.
  Posicionamento dos Perigos: Das 5 peças de Perigo, escolha e posicione 3 delas nos Tile do tipo “câmara” (com apenas uma entrada/saída e 3 paredes bloqueadas), escolhidos aleatoriamente (as 3 peças podem ser escolhidas propositalmente ou aleatoriamente).  
  Posicionamento dos Artefatos: Dos 10 Artefatos, 5 Artefatos são colocados nos 5 Tiles restantes do tipo “câmara” (com apenas uma entrada/saída e 3 paredes bloqueadas) que não estejam sendo ocupados pelas peças de Perigo. Os 5 Artefatos restantes formam o Banco de Artefatos.
 Aventureiros: Cada jogador escolhe um Aventureiro e o coloca no Ponto de Entrada.
 Ordem dos Jogadores: Todos os jogadores rolam 1D6. O resultado mais alto joga primeiro. A ordem segue no sentido horário.


IV. Regras de Turno e Ações
Em seu turno, o Aventureiro começa com 4 Pontos de Ação (PA).
A. Custos das Ações

Ação
Custo de PA
Notas
Movimento Simples 
1 PA
Mover para Tile adjacente sem parede bloqueadora. 
Explorar (Tile Adjacente)
1 PA
Olhar secretamente o Artefato em um Tile vizinho. Não pode ser usado no próprio Tile. 
Tentativa de Esquiva (Tile da Hidra) 
1 PA
Usado para evitar combate com a Hidra (além do PA de movimento).
Tentativa de Furto
 2 PA
Tentar roubar um Artefato de um oponente no mesmo Tile. 


Movimento Fantasma (Mapa do Espectro) 
2 PA
Usar o Artefato para ignorar uma parede 3D (não consome o Artefato). 


B. Regras de Coleta de Artefatos
 Coleta Automática: Ao se mover para um Tile que contém um Artefato , o Artefato é coletado automaticamente e a ação de movimento se encerra.
A partir do segundo artefato coletado, ao iniciar o próximo turno, um artefato do Banco de Artefatos é adicionado no Tile vazio (primeiro artefato coletado) e assim por diante, até finalizar todos os 5 artefatos do Banco de Artefatos. 
Se o Tile vazio (onde o novo Artefato será adicionado) estiver ocupado por um Aventureiro, ao chegar sua vez de jogar, esse aventureiro automaticamente coleta o artefato, porém, perderá 1 PA para o próximo turno (restando 3 PA).
 Regra da Informação: A ação "Explorar" é essencial para identificar Artefatos antes de arriscar a coleta.

V. Mecânicas do Labirinto
1. A Transformação (O Grito da Hidra)
A transformação reorganiza o labirinto e é ativada quando: 
(1) um jogador entra em um Tile de Perigo, 
(2) um jogador coleta um Artefato,
(3) um jogador perde um combate para a Hidra, ou
(4) ao final de cada rodada, depois que todos os jogadores efetuarem seus movimentos.

Se ativado por um jogador (1, 2 ou 3):
  Passo 1: Remoção da Cabeça: O jogador remove uma Peça do Labirinto a sua escolha de uma borda externa.
  Passo 2: Deslizamento do Corpo: O jogador desliza a linha ou coluna para preencher o espaço vazio, movendo todos os Aventureiros e Artefatos.
  Passo 3: Regeneração: O jogador insere a peça removida no novo espaço vazio criado na borda oposta. Ele pode girar a peça antes de inseri-la.

Se ativado nos turnos múltiplo de 5:
  Passo 1: Remoção da Cabeça: É removido uma Peça do Labirinto da borda externa, de uma linha ou coluna onde se encontra o Portal de Saída, preferência o Tile mais  distante do Portal de Saída.
  Passo 2: Deslizamento do Corpo: É deslizado a linha ou coluna para preencher o espaço vazio, movendo todos os Aventureiros e Artefatos.
  Passo 3: Regeneração: É inserida a peça removida no novo espaço vazio criado na borda oposta, mas dessa vez, a peça é inserida na orientação original, sem girar.
2. Tiles de Perigo
Quando um Tile de Perigo é ativado, ele permanece com a face da descrição voltada para cima, para ser ativado novamente quando outro jogador entrar no Tile.

Os Tiles de Perigo ativam dois tipos de consequências: uma imediata (o efeito da armadilha) e uma global (o Grito da Hidra).
A. Consequência Imediata: O Efeito da Armadilha
Quando um Aventureiro entra em um Tile de Perigo, ele ativa imediatamente o efeito da armadilha e perde o restante de seus Pontos de Ação (PA) para o turno. 

1. Poço de Lodo 
  
2. Ninho de Morcegos 
 
3. Corrente de Ar Tóxico
 
4. Pilares em Colapso
 
5. Estalactites Sonoras
 
B. Consequência Global: O Grito da Hidra
O Perigo é tão caótico que o tremor e o barulho alertam a Hidra e a fazem reagir violentamente.
 Condição: Sempre que um Tile de Perigo é ativado, o Grito da Hidra (Transformação do Labirinto) é acionado imediatamente.
 Procedimento:
   - O jogador ativo (aquele que ativou o Perigo) deve escolher e retirar um Tile da Borda Externa.
   - O deslizamento ocorre.
   - A Peça é reinserida (e potencialmente girada).
 Implicação Tática:
   - O Perigo não pune apenas o jogador que pisou nele; ele pune todos na mesa ao reorganizar o tabuleiro, no entanto, o jogador que ativa o Perigo tem a vantagem de controlar a nova Transformação (ele escolhe qual peça remover e onde inseri-la/como girá-la), podendo transformar a armadilha em uma vantagem tática para si mesmo, apesar das consequências imediatas.

3. Combate com a Hidra
1. Iniciando o Combate
O combate é obrigatório (ou uma esquiva falha) e é acionado imediatamente quando um Aventureiro se move para o Tile onde a miniatura da Hidra está localizada.
Fase 1: Tentativa de Esquiva (Opcional)
O Aventureiro pode tentar evitar o confronto:
 Custo: O jogador gasta 1 Ponto de Ação (PA) adicional (totalizando 2 PA para entrar no tile).
 Teste: O jogador rola um dado de 6 lados (D6).
   - Sucesso (Resultado 5 ou 6): O Aventureiro consegue se esgueirar e passar o turno sem lutar, mas deve parar imediatamente no Tile da Hidra. O Grito da Hidra (Transformação) não é ativado.
   - Falha (Resultado 1 a 4): A Hidra percebe o Aventureiro. O Aventureiro perde o restante dos seus Pontos de Ação e o combate começa imediatamente.
2. O Confronto (Combate)
O combate é resolvido com um único teste de Força de Ataque (FA) contra a Defesa (D) da Hidra.
A. O Ataque do Aventureiro
 Rolagem de Base: O jogador rola dois dados de 6 lados (2D6).
 Modificador de Classe: Adiciona o seu bônus de combate base (+2 para todos os Aventureiros).
 
B. A Defesa da Hidra
A Hidra é poderosa, mas lenta. Sua defesa é fixa ou varia ligeiramente.
  Defesa Padrão (D): O valor alvo a ser superado é 10.
 * Dificuldade Escalável: Para aumentar a dificuldade do jogo, a Defesa da Hidra pode ser igual a 10 + (número de Artefatos já coletados pelo Aventureiro). (Combinado previamente entre os jogadores).

3. Resolução e Consequências
O jogador compara sua Força de Ataque (FA) com a Defesa (D=10).
Vitória do Aventureiro (FA > 10)
 Efeito: O Aventureiro inflige um dano que temporariamente atordoa a Hidra.
 Bônus: O jogador cancela o próximo Grito da Hidra (transformação) agendado (seja por contagem de rodadas ou por um evento iminente).
 Saída: O Aventureiro pode gastar 1 PA extra para se mover imediatamente para um Tile adjacente (se for seguro). Se não o fizer, ele permanece no Tile e termina seu turno.
Derrota do Aventureiro (FA ≤ 10)
 Efeito: A Hidra repele o Aventureiro com um rugido ou um ataque de cauda.
 Punição: O Aventureiro é imediatamente empurrado para um Tile adjacente e desocupado (escolhido pela Hidra, priorizando um Tile de Perigo ou um Tile longe do Portal de Fuga).
 Custo: O Aventureiro perde um artefato de seu inventário (se não possuir nenhum artefato, é forçado a descartar 1 PA no próximo turno).
 Grito da Hidra: O combate perdido é tão caótico que força uma transformação imediata do labirinto (O Grito da Hidra é acionado, mesmo que não fosse a hora).

VI. Detalhe: Artefatos e Aventureiros
A. Perda de Artefatos
1. Perda em Combate com a Hidra (Obrigatório)

 Condição: O Aventureiro é derrotado no Combate contra a Hidra (Força de Ataque ≤ 10).
 Consequência: Além de ser empurrado para um Tile adjacente e forçar uma transformação do labirinto, o Aventureiro deve perder imediatamente um Artefato aleatório de sua posse (se não possuir nenhum artefato, é forçado a descartar 1 PA no próximo turno), além disso, no próximo turno, o jogador não pode entrar em combate com a Hidra.
 Regras de Descarte:
   - O jogador derrotado escolhe qual Artefato descartar.
   - O Artefato descartado é colocado no Tile que o Aventureiro ocupava antes de ser empurrado (ou seja, no Tile da Hidra).
 Risco: O Artefato descartado fica agora no local mais perigoso do labirinto (com a Hidra), acessível a outros jogadores dispostos a correr o risco de lutar por ele.
2. Furto por Outro Aventureiro (Interação Jogador vs. Jogador)

 Condição: Um Aventureiro move-se para o mesmo Tile ocupado por um oponente.
 Ação: O Aventureiro que entrou no Tile pode gastar 2 PA para tentar um teste de Furto.
 Teste: Ambos os jogadores rolam um D6.
   - Ladrão (Ataque): Rola 1D6.
   - Vítima (Defesa): Rola 1D6.
 Resolução:
   - Sucesso no Furto (Ladrão > Vítima): O Ladrão consegue roubar 1 Artefato aleatório do oponente e pode usá-lo ou mantê-lo. 
   - Falha no Furto (Ladrão ≤ Vítima): A Vítima se defende. O Ladrão perde o restante de seus Pontos de Ação e perde 1 Ponto de Ação no seu próximo turno (totalizando 3 PA para uso). 
Observação: Se após a ação, o ladrão permanecer no Tile ocupado, corre o risco de ser atacado no próximo turno, sem que a vítima gaste PA para movimento inicial, podendo sofrer 2 ataques no mesmo turno.
3. Uso do Efeito Ativo (Consumo Estratégico)
Alguns Artefatos possuem efeitos de uso único tão poderosos que, ao serem ativados, o Artefato é consumido.
 Condição: O jogador decide usar o Efeito Ativo (Uso Único) de um Artefato específico (como a Gema da Visão, a Lâmina do Limiar, o Sino da Calma, a Máscara do Caos ou o Anel da Gravidade).
 Consequência: Depois que o efeito é resolvido, o Artefato é descartado do jogo permanentemente.
 Implicação: O jogador perde a contagem para a vitória (que exige 3 Artefatos na posse). Ele deve voltar a procurar outro Artefato.
 Exceção: Os Artefatos com efeitos Passivos ou Contínuos (como o Cálice do Tempo) permanecem com o jogador e não são consumidos.


B. Personagens (Habilidades)
1. O Escavador (Drill Master)

2. O Mago Cartógrafo (Map Weaver)

3. O Ladrão do Crepúsculo (Shadow Rogue)

4. A Guardiã da Luz (Warden)

C. Lista dos 10 Artefatos
1. A Gema da Visão (O Olho de Ciclope)

 2. A Lâmina do Limiar (A Espada Quebra-Feitiços)

 3. O Amuleto do Eco (A Concha da Memória)

 4. O Cálice do Tempo (O Recipiente Gotejante)

 5. A Coroa da Fuga (O Diadema do Vencedor)

 6. O Sino da Calma (A Campainha Silenciosa)

 7. A Lamparina da Sombra (A Lanterna Desorientadora)

 8. O Anel da Gravidade (O Peso de Pedra)

 9. O Mapa do Espectro (A Tábua Riscada)

 10. A Máscara do Caos (A Face da Mentira)



VI. Detalhe tile
1. Elementos Funcionais do Tile
Variações de Tiles para Imprimir
Para a jogabilidade, você precisaria de um conjunto de 4 a 5 designs base, impressos em quantidades variadas:
 1. Tile de Corredor (4 unidades): Paredes bloqueando 2 lados opostos (cria um corredor reto).
 2. Tile em L (4 unidades): Paredes bloqueando 2 lados adjacentes (cria um canto).
 3. Tile de Encruzilhada (3 unidades): Paredes bloqueando 1 lado, permitindo movimento em 3 direções.
 4. Tile de Câmara (8 unidades): Paredes bloqueando 3 lados, permitindo entrada e saída por apenas 1 lado. (Ideal para esconder artefatos).
 5. Tile sem Parede (3 unidades): Pode se movimentar em qualquer direção.
 6. Tile Central da Hidra (1 unidade): Um Tile especial, mais robusto, feito para acomodar a base da miniatura da Hidra, com talvez uma textura diferente.
7. Tile de Ponto de Entrada (1 unidade): Um Tile Especial, que indica o ponto inicial da aventura, (no andamento do  jogo, se comporta como um Tile sem Paredes, podendo se movimentar em qualquer direção) .
8. Tile de Ponto de Fuga (1 unidade): Um Tile Especial, que indica a saída e em consequência o final do jogo (Esse Tile só pode ser acessado para o encerramento do jogo. Não pode ser usado como caminho).

>>>>>>> 1f4f762607b0856a4e84ca5355759adf42bec00e
