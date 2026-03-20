# MEGALIST

Lista pessoal de filmes, séries e animes com sistema de capas, descrições, recomendações por afinidade e sincronização entre dispositivos.

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
├── index.html          # Página principal — lista de mídias, filtros, modal de detalhes
├── profile.html        # Perfil — stats, coleção, ranking, favoritos, sorteio, sync
├── directors.html      # Página de diretores — catálogo por cineasta com filmografia
├── README.md
│
├── movie-list.md       # Fonte de dados: tabela markdown com todos os títulos
├── media-data.json     # Capas + descrições unificadas (gerado pelo app via "Exportar")
│
├── megalist.css        # CSS unificado (variáveis, layout, cards, modal, responsivo, perfil)
├── megalist.js         # JS unificado da página principal (parser, API, render, modal, sync…)
└── profile.js          # JS da página de perfil
```

Todos os arquivos ficam na raiz do projeto — não há subpastas `src/` ou `assets/`.

---

## Estrutura do `movie-list.md`

O arquivo é a fonte de verdade de todos os títulos. O parser (`parseMarkdown()` em `megalist.js`) lê cada linha e constrói o array `MEDIA_DATA[]` em memória.

### Formato das tabelas

```
| # | Titulo | Ano | Midia | Tipo | EROT | EXPL | PROF | PERT | TABU | RARI | CULT | REC | Notas |
```

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `#` | inteiro | ID único da mídia |
| `Titulo` | texto | Nome do título |
| `Ano` | inteiro | Ano de lançamento |
| `Midia` | texto | `Filme`, `Anime`, `Serie` ou `Playlist` |
| `Tipo` | lista CSV | Tags de identidade, gênero, tema e origem (ver legenda) |
| `EROT`–`CULT` | 0–5 | Métricas de classificação |
| `REC` | lista CSV | Códigos de afinidade (BTS, LIS, VD, etc.) |
| `Notas` | texto | Palavras-chave e observações |

### Seções (navegação por abas)

O arquivo está dividido em 13 seções. Os headings usam o formato `## NÍVEL X — NOME` para que o parser defina simultaneamente o nível de intensidade (badge colorido nos cards, N1–N5) e o nome da aba:

| Seção | Nível | Conteúdo |
|-------|-------|----------|
| `NÍVEL 1 — SUTIL & QUEER` | N1 🟢 | Dramas queer, romances, coming-of-age, comédias |
| `NÍVEL 2 — ERÓTICO` | N2 🟡 | Cinema erótico com valor artístico, thrillers de desejo |
| `NÍVEL 2 — CINEMA INTERNACIONAL` | N2 🟡 | Cinema de autor — Europa, LatAm, Ásia, África, Oriente Médio |
| `NÍVEL 3 — MUITO ERÓTICO` | N3 🟠 | Cenas explícitas mantendo qualidade narrativa |
| `NÍVEL 1 — ANIME — DRAMA & AVENTURA` | N1 🟢 | Anime narrativo, sci-fi, romance, psicológico, slice of life |
| `NÍVEL 1 — SÉRIES — DRAMA & THRILLER` | N1 🟢 | Séries de qualidade — drama, horror, crime, sci-fi |
| `NÍVEL 1 — MELANCOLIA & DESTRUIÇÃO` | N1 🟢 | Filmes/séries/animes que destroem emocionalmente |
| `NÍVEL 1 — FUNDO & CONFORTO` | N1 🟢 | Slice of life, iyashikei, procedurais, playlists |
| `NÍVEL 4 — EXPLÍCITO` | N4 🔴 | Sexo gráfico — pink films japoneses, erótico europeu intenso |
| `NÍVEL 4 — EXPLOITATION & CULT` | N4 🔴 | Exploitation, Category III, nunsploitation, cult extremos |
| `NÍVEL 5 — EXTREMO & PERTURBADOR` | N5 🟣 | Conteúdo-limite, pornô clássico, extremamente perturbadores |
| `NÍVEL 2 — SÉRIES — ERÓTICO & DRAMA` | N2 🟡 | Séries adultas com conteúdo erótico explícito |
| `NÍVEL 4 — HENTAI & ECCHI` | N4 🔴 | Anime adulto — ecchi, hentai, OVAs adultas |

> O "NÍVEL X —" no heading é lido pelo parser para definir o badge. O site exibe apenas o nome depois do traço nas abas de navegação.

### Legenda de tipos (`Tipo`)

**Identidade:**
`L` Lésbico · `G` Gay · `T` Trans · `B` Bi/Pan · `H` Hétero

**Gênero & Tema:**
`SF` Sci-Fi · `PH` Psicológico · `BH` Body Horror · `HR` Horror · `TH` Thriller · `CR` Crime · `MU` Musical · `DO` Documentário · `RO` Romance · `DR` Drama · `X` Tabu · `V` Voyeurismo · `R` Religião · `Z` Vampiro · `C` Comédia · `EC` Ecchi · `HN` Hentai

**Origem:**
`BR` Brasil · `JP` Japão · `KR` Coreia · `HK` Hong Kong · `TW` Taiwan · `FR` França · `IT` Itália · `MX` México · `AR` Argentina

**Especiais (não aparecem como filtro):**
`AN` Anime · `SE` Série · `OV` OVA

### Legenda de afinidade (`REC`)

Cada título recebe até 3 códigos que ligam seu tom/tema a obras de referência. O sistema de recomendação usa esses códigos para sugerir títulos com base no histórico do usuário.

| Código | Referência | Tom compartilhado |
|--------|------------|-------------------|
| `BTS` | Beyond Two Souls | Sobrenatural, vínculo emocional, escolhas morais |
| `LIS` | Life is Strange | Coming-of-age, queer, nostalgia, tempo |
| `RH` | Rocky Horror | Camp, gênero fluido, liberação sexual, cult |
| `LB` | Look Back | Arte, amizade intensa, perda, criatividade |
| `VD` | Videodrome | Body horror, distorção da realidade, Cronenberg |
| `CE` | Celeste | Saúde mental, identidade trans, superação |
| `BR` | Blade Runner | Sci-fi existencial, identidade, humanidade artificial |
| `DD` | Donnie Darko | Adolescência sombria, existencialismo, realidade alternativa |

---

## Fluxo de dados

```
movie-list.md
     │
     ▼
parseMarkdown() ──► MEDIA_DATA[]     (array em memória, fonte de verdade)
     │
     ├── renderGrid() / renderCard() ──► DOM
     │
     ├── tryTMDB / tryJikan / tryOMDB ──► capas e descrições automáticas
     │         ├── posterAuto{}   (cache localStorage)
     │         └── descAuto{}     (cache localStorage)
     │
     └── posterEdits{} ──► edições manuais (localStorage)

media-data.json ──► POSTERS_JSON{} + DESCS_JSON{}   (base permanente em disco)
```

---

## Filtros disponíveis

### Abas de seção (navTabs)
Navegação horizontal por seção do `movie-list.md`. Exibe "Tudo" por padrão.

### Pills de mídia
Filtra por tipo de mídia: **Tudo · 🎬 Filmes · 📺 Séries · 🎌 Animes**

### Chips de tipo (barra horizontal + menu hambúrguer)

| Grupo | Filtros |
|-------|---------|
| **Identidade** | Todos · Lésbico · Gay · Trans · Bi/Pan · Hétero |
| **Gênero & Tema** | Sci-Fi · Psicológico · Body Horror · Horror · Thriller · Crime · Musical · Documentário · Romance · Drama · Tabu · Voyeurismo · Religião · Vampiro · Comédia · Ecchi · Hentai |
| **Origem** | Brasil · Japão · Coreia · Hong Kong · Taiwan · França · Itália · México · Argentina |

### Ordenação
Ordem do MD · A→Z · Z→A · Mais Novo · Mais Antigo · Profundidade · Valor Cultural · Erotismo · Perturbação · Raridade · Recomendado

### Status
Todos · ✓ Assistido · ▶ Assistindo · ★ Quero Ver · Sem Status

---

## Páginas

### `index.html` — Lista principal
- Grid de cards com pôster, badge de nível, tags e ribbon de status
- Modal de detalhes: pôster navegável (TMDB + Jikan + OMDB), descrição, métricas, afinidade, similares
- Sistema de status (assistido/assistindo/quero ver), nota por estrelas e review
- Recomendações personalizadas no topo (baseadas no histórico)
- Botão `↕ SYNC` flutuante para exportar/importar dados

### `profile.html` — Perfil
- Card de perfil (avatar, nome, data de entrada)
- Stats globais (total visto, assistindo, quero ver, notas)
- Gráfico de distribuição de notas
- Coleção por mídia (filmes / séries / animes) com abas
- Sorteador aleatório (+18 toggle)
- Exportar/importar `userdata.json` e `media-data.json`
- Abas Favoritos e Ranking

### `directors.html` — Diretores
- Catálogo de 78 cineastas com bio, especialidade e país
- Filtro por país e busca por nome ou especialidade
- Modal do diretor: bio completa + grade de todos os seus filmes na lista com pôsteres
- Clicar num filme abre o modal desse título diretamente na lista principal

---

## Sincronização entre dispositivos

1. **Dispositivo A:** `↕ SYNC → Exportar userdata.json` — salva status, notas, reviews, ratings
2. Transfira o arquivo (Drive, WhatsApp, e-mail)
3. **Dispositivo B:** `↕ SYNC → Importar userdata.json`
4. **Para capas e descrições:** `↕ SYNC → Exportar media-data.json` → substitua o arquivo na pasta do projeto

O `media-data.json` é o arquivo permanente de capas e descrições. O `userdata.json` é o backup do perfil pessoal (status, notas, rankings).

---

## APIs usadas

| API | Uso | Chave |
|-----|-----|-------|
| TMDB | Capas + descrições de filmes e séries | `8265bd1679663a7ea12ac168da84d2e8` |
| Jikan (MAL) | Capas + descrições de animes | pública, sem chave |
| OMDB | Capa + descrição como fallback | `trilogy` (gratuita) |

---

## localStorage

| Chave | Conteúdo |
|-------|----------|
| `megalist_v1` | Status, notas, ratings, reviews, episódios por ID |
| `megalist_poster_edits_v1` | Capas editadas manualmente |
| `megalist_poster_auto_v1` | Capas buscadas automaticamente (cache) |
| `megalist_desc_auto_v1` | Descrições buscadas automaticamente (cache) |
| `megalist_desc_user_v1` | Descrições editadas manualmente |
| `megalist_profile_v1` | Favoritos, rankings, avatar, nome, data de entrada |
| `megalist_sync_meta_v1` | Timestamp do último export/import |
| `megalist_open_id` | ID temporário para deep-link da página de diretores → lista |
