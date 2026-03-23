# MEGALIST

Lista pessoal de filmes, séries e animes com sistema de capas, descrições, filtros avançados, recomendações por afinidade e sincronização entre dispositivos.

**1.906 títulos** · 1.285 filmes · 209 séries · 412 animes

---

## Como rodar

O site precisa de um servidor local — não funciona direto no navegador via `file://`:

```bash
# Python
python3 -m http.server

# Node
npx serve .

# VS Code: instale a extensão "Live Server" e clique em "Go Live"
```

Acesse `http://localhost:8000` no navegador.

---

## Estrutura de arquivos

```
megalist/
│
├── index.html          # Página principal — lista, filtros, modal, recomendações
├── profile.html        # Perfil — stats, coleção, ranking, favoritos, sorteio, sync
├── directors.html      # Diretores — catálogo por cineasta com filmografia
├── README.md
│
├── movie-list.md       # Fonte de dados: todas as mídias em tabelas markdown
├── media-data.json     # Capas + descrições unificadas (gerado pelo app via Exportar)
│
├── megalist.css        # CSS unificado (nav, cards, modal, filtros, mobile, perfil)
├── megalist.js         # JS unificado da página principal
└── profile.js          # JS da página de perfil
```

Todos os arquivos ficam na raiz — sem subpastas `src/` ou `assets/`. Isso é intencional para compatibilidade com GitHub Pages (que às vezes não resolve caminhos relativos em subpastas).

---

## Estrutura do `movie-list.md`

Fonte de verdade de todos os títulos. O parser (`parseMarkdown()`) lê cada linha e constrói o array `MEDIA_DATA[]` em memória.

### Formato das colunas

```
| # | Titulo | Ano | Midia | Tipo | EROT | EXPL | PROF | PERT | TABU | RARI | CULT | REC | Notas |
```

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `#` | inteiro | ID único e permanente da mídia |
| `Titulo` | texto | Nome do título |
| `Ano` | inteiro | Ano de lançamento |
| `Midia` | texto | `Filme`, `Anime`, `Serie` ou `Playlist` |
| `Tipo` | lista CSV | Tags de identidade, gênero, tema e origem |
| `EROT` | 0–5 | Intensidade erótica |
| `EXPL` | 0–5 | Explícito (nudez/violência visual) |
| `PROF` | 0–5 | Profundidade narrativa |
| `PERT` | 0–5 | Perturbação emocional |
| `TABU` | 0–5 | Grau de tabu do conteúdo |
| `RARI` | 0–5 | Raridade / obscuridade |
| `CULT` | 0–5 | Valor cultural / importância |
| `REC` | lista CSV | Códigos de afinidade para recomendações |
| `Notas` | texto | Palavras-chave, observações, diretor |

### Seções (13 seções atuais)

| Seção | Nível | Qtd | Conteúdo |
|-------|-------|-----|----------|
| `NÍVEL 1 — SUTIL & QUEER` | N1 🟢 | 196 | Dramas queer, romances, coming-of-age |
| `NÍVEL 2 — ERÓTICO` | N2 🟡 | 212 | Cinema erótico com valor artístico |
| `NÍVEL 2 — CINEMA INTERNACIONAL` | N2 🟡 | 300 | Cinema de autor — Europa, LatAm, Ásia, África |
| `NÍVEL 3 — MUITO ERÓTICO` | N3 🟠 | 157 | Cenas explícitas com qualidade narrativa |
| `NÍVEL 1 — ANIME — DRAMA & AVENTURA` | N1 🟢 | 137 | Anime narrativo, sci-fi, psicológico, romance |
| `NÍVEL 1 — SÉRIES — DRAMA & THRILLER` | N1 🟢 | 46 | Séries de qualidade — drama, horror, crime |
| `NÍVEL 1 — MELANCOLIA & DESTRUIÇÃO` | N1 🟢 | 58 | Obras que destroem emocionalmente |
| `NÍVEL 1 — FUNDO & CONFORTO` | N1 🟢 | 190 | Slice of life, iyashikei, procedurais |
| `NÍVEL 4 — EXPLÍCITO` | N4 🔴 | 158 | Sexo gráfico — pink films, erótico europeu |
| `NÍVEL 4 — EXPLOITATION & CULT` | N4 🔴 | 76 | Exploitation, Category III, nunsploitation |
| `NÍVEL 5 — EXTREMO & PERTURBADOR` | N5 🟣 | 145 | Conteúdo-limite, perturbador, extremos |
| `NÍVEL 2 — SÉRIES — ERÓTICO & DRAMA` | N2 🟡 | 83 | Séries adultas com conteúdo erótico |
| `NÍVEL 4 — HENTAI & ECCHI` | N4 🔴 | 148 | Anime adulto — ecchi, hentai, OVAs |

O prefixo `NÍVEL X —` no heading define o badge colorido nos cards (N1–N5). O site exibe apenas o nome após o traço.

### Legenda de tipos (`Tipo`)

**Identidade:**
`L` Lésbico/Sáfico · `G` Gay · `T` Trans/Não-binário · `B` Bi/Pan/Fluido · `H` Hétero

**Gênero:**
`DR` Drama · `RO` Romance · `TH` Thriller · `HR` Horror · `CR` Crime · `MY` Mistério · `SF` Sci-Fi · `PH` Psicológico · `BH` Body Horror · `MU` Musical · `DO` Documentário · `WS` Western

**Tom emocional:**
`ML` Melancólico · `TR` Trágico · `CA` Coming-of-Age · `IT` Impactante

**Tema:**
`X` Tabu extremo · `V` Voyeurismo · `R` Religião · `Z` Vampirismo · `C` Comédia · `EC` Ecchi · `HN` Hentai

**Origem (tags aplicadas automaticamente via notas):**
`BR` Brasil · `JP` Japão · `KR` Coreia · `HK` Hong Kong · `TW` Taiwan · `FR` França · `IA` Itália · `ES` Espanha · `UK` Reino Unido · `DE` Alemanha · `SW` Suécia · `DK` Dinamarca · `RU` Rússia · `PL` Polônia · `MX` México · `AR` Argentina · `IN` Índia · `AU` Austrália · `IR` Irã · `GR` Grécia · `BE` Bélgica · `SN` Senegal/África Ocid. · `PT` Portugal

> `IT` foi renomeado para `IA` (Itália) para evitar conflito com `IT` = Impactante. `SE` (Série) e `SW` (Suécia) também são distintos.

**Especiais (não aparecem nos filtros de gênero):**
`AN` Anime · `SE` Série · `OV` OVA

### Legenda de afinidade (`REC`)

| Código | Referência | Tom compartilhado |
|--------|------------|-------------------|
| `BTS` | Beyond Two Souls | Sobrenatural, vínculo emocional, escolhas morais |
| `LIS` | Life is Strange | Coming-of-age, queer, nostalgia, poderes, escolhas |
| `RH` | Rocky Horror | Camp, gênero fluido, liberação, musical, cult |
| `LB` | Look Back | Arte, amizade intensa, perda, animação |
| `VD` | Videodrome | Body horror, distorção da realidade, Cronenberg |
| `CE` | Celeste | Saúde mental, identidade, autodescoberta |
| `BR` | Blade Runner | Sci-fi existencial, humanidade artificial, noir |
| `DD` | Donnie Darko | Adolescência sombria, existencialismo, tempo |
| `TK` | Tarkovsky / Bergman | Slow cinema, contemplação, espiritualidade, silêncio |
| `HN` | Haneke / Austero | Frieza clínica, crueldade burguesa, sem catarse |
| `QC` | New Queer Cinema | Identidade crua, underground, política queer |
| `KY` | KyoAni / Feel | Animação emocional, amizade, calor e destruição |
| `NK` | NHK / Dark Slice | Pressão psicológica, isolamento, ansiedade cotidiana |
| `CL` | Claire Denis | Cinema sensorial, corpo sobre diálogo, desejo |

---

## Funcionalidades

### Sistema de filtros (painel com abas)

O botão **Filtrar** abre um painel com 6 abas. Múltiplos filtros podem ser selecionados simultaneamente — a lógica é AND (item precisa ter todos os filtros marcados). Os filtros só são aplicados ao clicar em **Aplicar filtros**.

| Aba | Conteúdo |
|-----|----------|
| **Identidade** | Todos · Lésbico · Gay · Trans · Bi/Pan · Hétero |
| **Gênero** | Drama, Romance, Thriller, Horror, Crime, Mistério, Sci-Fi, Psicológico, Body Horror, Musical, Documentário, Western |
| **Emocional** | Melancólico, Trágico, Coming-of-Age, Impactante |
| **Tema** | Comédia, Religião, Vampirismo, Voyeurismo, Tabu, Ecchi, Hentai |
| **Origem** | 23 países com bandeiras |
| **Afinidade** | 14 códigos REC filtráveis |

A barra abaixo da nav mostra os filtros ativos como pills removíveis individualmente.

### Pills de mídia
Filtro rápido por tipo: **Tudo · 🎬 Filmes · 📺 Séries · 🎌 Animes**

### Ordenação
Ordem padrão (do MD) · A→Z · Z→A · Mais Novo · Mais Antigo · Profundidade · Valor Cultural · Erotismo · Perturbação · Raridade · Recomendado (baseado no perfil)

### Status
Todos · ✓ Assistido · ▶ Assistindo · ★ Quero Ver · Sem Status

### Cache de seções (performance)
Após o primeiro render, o JS pré-renderiza cada seção em background. Trocar de aba é instantâneo na segunda visita — o HTML fica em cache em memória e só é reconstruído quando o status/rating muda.

---

## Páginas

### `index.html` — Lista principal
- Grid responsivo de cards com pôster, badge de nível, tags e ribbon de status
- Modal de detalhes: pôster navegável (TMDB → Jikan → OMDB), métricas de barras, notas, afinidade, similares
- Sistema de status, nota por estrelas e review textual
- Carrossel de recomendados no topo (baseado no histórico do perfil)
- Busca com debounce de 280ms

### `profile.html` — Perfil
- Card de perfil (avatar, nome, data de entrada)
- Stats globais e gráfico de distribuição de notas
- Coleção por mídia com abas, sorteador aleatório (+18 toggle)
- Exportar/importar `userdata.json` e `media-data.json`
- Abas Favoritos e Ranking

### `directors.html` — Diretores
- Catálogo de cineastas com bio, especialidade e país
- Filtro por país, busca por nome ou especialidade
- Modal do diretor: bio completa + filmografia com pôsteres
- Clicar num filme abre o modal diretamente na lista principal

---

## Mobile

O site tem um layout específico para telas ≤ 768px, diferente do desktop:

- **Nav compacta** — linha única: logo "M" + campo de busca + ícone sync + ícone filtrar
- **Barra de abas no rodapé** — fixa na base da tela: Tudo · Filmes · Séries · Animes · Filtrar (com badge de filtros ativos)
- **Stats bar** — oculta no mobile (informação secundária)
- **Grid 2 colunas** — cards mais largos, padding inferior de 80px para não ficar atrás da tab bar
- **Modal fullscreen** — slide-up com drag handle; poster full-width no topo, info abaixo; scores em 4 colunas
- **Filtros** — bottom sheet que sobe de baixo com animação spring

---

## Fluxo de dados

```
movie-list.md
     │
     ▼
parseMarkdown() ──► MEDIA_DATA[]     (array em memória)
     │
     ├── renderGrid() ──► sectionCache{} ──► DOM
     │        (seções pré-renderizadas em background após primeiro load)
     │
     ├── tryTMDB / tryJikan / tryOMDB ──► capas e descrições
     │         ├── posterAuto{}   (cache localStorage)
     │         └── descAuto{}     (cache localStorage)
     │
     └── posterEdits{} ──► edições manuais (localStorage)

media-data.json ──► POSTERS_JSON{} + DESCS_JSON{}   (base permanente em disco)
```

---

## Sincronização entre dispositivos

1. **Dispositivo A:** `SYNC → Exportar userdata.json`
2. Transfira o arquivo (Drive, WhatsApp, e-mail)
3. **Dispositivo B:** `SYNC → Importar userdata.json`
4. **Para capas e descrições:** `SYNC → Exportar media-data.json` → substitua o arquivo no projeto

---

## APIs

| API | Uso | Chave |
|-----|-----|-------|
| TMDB | Capas + descrições de filmes e séries | `8265bd1679663a7ea12ac168da84d2e8` |
| Jikan (MAL) | Capas + descrições de animes | pública |
| OMDB | Fallback de capa + descrição | `trilogy` |

---

## localStorage

| Chave | Conteúdo |
|-------|----------|
| `megalist_v1` | Status, notas, ratings, reviews por ID |
| `megalist_poster_edits_v1` | Capas editadas manualmente |
| `megalist_poster_auto_v1` | Cache de capas buscadas automaticamente |
| `megalist_desc_auto_v1` | Cache de descrições automáticas |
| `megalist_desc_user_v1` | Descrições editadas manualmente |
| `megalist_profile_v1` | Favoritos, rankings, avatar, nome |
| `megalist_sync_meta_v1` | Timestamp do último export/import |
| `megalist_open_id` | Deep-link temporário: diretores → lista |

---

## Histórico de desenvolvimento

### Fundação
- Parser de markdown plano (`parseMarkdown()`) carregando `movie-list.md` como fonte de dados
- Sistema de capas com busca automática em TMDB, Jikan e OMDB
- Cache de capas e descrições em localStorage e `media-data.json`
- Modal de detalhes com métricas de barras, status, notas, afinidade e similares
- Sistema de recomendações por código REC baseado no histórico de assistidos

### Dados — `movie-list.md`
- **Limpeza massiva v2→v5:** remoção de 108 duplicatas e entradas editoriais; tags de gênero adicionadas a todos os 1.841 itens (antes muitos sem tag alguma)
- **6 novos códigos REC:** `TK` Tarkovsky/Bergman · `HN` Haneke · `QC` New Queer Cinema · `KY` KyoAni · `NK` NHK/Dark Slice · `CL` Claire Denis
- **4 tags de tom emocional:** `ML` Melancólico · `TR` Trágico · `CA` Coming-of-Age · `IT` Impactante — aplicadas a 554 itens via lógica de PROF/PERT
- **83 títulos queer/lésbicos** adicionados (IDs 2200–2285)
- **Sistema de origem completo:** varredura das notas de todos os itens por palavras-chave de diretores e países; 400+ títulos receberam tags de origem. Total: 23 países mapeados (antes eram 6). Conflitos resolvidos: `IT`→`IA` (Itália), `SE`→`SW` (Suécia) para não colidir com `IT`=Impactante e `SE`=Série
- **65 novos animes ecchi/hentai/drama** (IDs 2286–2350): ecchi clássico e moderno, hentai adulto mainstream, dramas psicológicos (Koi Kaze, White Album 2, Kemonozume, Aoi Bungaku, Mardock Scramble, etc.)

### Interface
- **Nav reformulada:** grid CSS de 5 colunas (logo · pills · busca · tabs · ações). Busca com mínimo de 240px. Altura fixa 60px no desktop
- **Painel de filtros com abas** substituindo o drawer hamburguer — 6 abas (Identidade, Gênero, Emocional, Tema, Origem, Afinidade). Multi-seleção com lógica AND. Filtros só aplicados ao clicar em Aplicar — estado pendente separado do estado ativo
- **Barra de filtros ativos** abaixo da nav com pills removíveis individualmente
- **Filtros de origem expandidos** de 6 para 23 países, com bandeiras emoji
- **Filtro de Afinidade (REC)** — 14 chips filtráveis no painel
- **Aba de seções removida** — a barra horizontal "Tudo / Sutil & Queer / Erótico…" foi removida a pedido
- **Link para Diretores** na nav (desktop) e no rodapé do painel de filtros (mobile)

### Performance
- `IntersectionObserver` para lazy-loading de capas — só busca quando o card entra na viewport (200px de margem)
- Fila de 3 fetches simultâneos de capa (antes: 1 com delay de 100ms)
- `requestAnimationFrame` antes de carregar capas — pinta os cards primeiro
- Busca com debounce de 280ms
- `content-visibility: auto` + `contain-intrinsic-size` nos cards
- **Cache de seções:** HTML de cada seção pré-renderizado em background após o primeiro load. Trocar de aba é O(1) — apenas `innerHTML = cached`. Cache invalidado apenas ao salvar status/rating

### Mobile
- Nav de linha única: logo M + busca + sync + filtrar (52px de altura vs 96px anteriores)
- Stats bar oculta no mobile
- Grid de 2 colunas com padding inferior de 80px
- **Barra de abas no rodapé** (bottom tab bar): Tudo · Filmes · Séries · Animes · Filtrar, com badge de contagem de filtros ativos
- Modal como slide-up fullscreen com drag handle
- Poster full-width no topo do modal, info abaixo
- Ícone de sync na nav no lugar do FAB flutuante
- Todos os touch targets ≥ 44px

---

## Próximas ideias

### Performance arquitetural
- **Virtualização do grid** — renderizar apenas os cards visíveis na viewport (±1 tela), usando um "observador de janela" que destroi e recria cards conforme o scroll. Eliminaria o custo de ter 1.906 nós no DOM ao mesmo tempo. Maior ganho possível de fluidez
- **Web Worker para o parser** — mover `parseMarkdown()` para um worker thread, liberando a thread principal durante o load inicial
- **Pré-geração de `media-data.json`** no build — em vez de buscar capas sob demanda, pré-popular o JSON com todos os títulos via script Node antes de fazer deploy. O site carregaria com todas as capas já prontas, sem nenhuma chamada de API em runtime
- **Service Worker + offline** — cachear `movie-list.md`, `media-data.json` e o CSS/JS para funcionar completamente offline e carregar instantaneamente na segunda visita

### Dados
- Adicionar coluna `Diretor` a todos os títulos no markdown (atualmente só nas notas de texto)
- Tags de origem para os ~200 filmes do Cinema Internacional ainda sem tag de país
- Sistema de coleções/listas dentro do perfil (ex: "assistir em maratona", "indicar para alguém")

### Interface
- Modo "Descubra" — tela dedicada para sorteio + recomendações, separada da lista completa
- Vista de lista compacta (uma linha por título) como alternativa ao grid de cards
- Filtros por faixa de ano e por combinação de métricas (ex: PROF ≥ 4 + EROT ≤ 2)
- Histórico de buscas recentes

### React — vale a pena migrar?

**Curto prazo: não.** React não resolverá os gargalos reais do projeto, que são:

1. **DOM com ~1.900 nós** — React re-renderiza o Virtual DOM mas ainda produz nós reais. Sem virtualização de lista, o problema continua idêntico
2. **Fetch de capas** — rede é gargalo, não o framework
3. **Parse do markdown** — acontece uma vez no load, não é recorrente

O que React daria: componentes reativos mais fáceis de manter, hot reload no desenvolvimento, ecossistema de bibliotecas. O que custaria: build step obrigatório (Vite/CRA), impossibilidade de usar `file://` diretamente, curva de migração de ~3.000 linhas de JS, perda da simplicidade de "abrir o arquivo e funcionar".

**A troca que resolve de verdade é a virtualização** — renderizar apenas os cards visíveis. Isso pode ser feito no JS puro atual com ~80 linhas. O ganho seria de 10–50× em fluidez de scroll para listas grandes. Depois disso, se ainda houver necessidade de refatoração, React ou Preact seriam candidatos razoáveis.
