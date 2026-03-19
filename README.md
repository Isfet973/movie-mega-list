# MEGALIST

Lista pessoal de filmes, séries e animes com sistema de capas, descrições, recomendações e sincronização entre dispositivos.

## Como rodar

Precisa de um servidor local (não abre direto no navegador via `file://`):

```bash
# Python
python3 -m http.server

# Node
npx serve .

# VS Code: instale a extensão "Live Server" e clique em "Go Live"
```

Acesse `http://localhost:8000` no navegador.

---

## Estrutura de pastas

```
megalist/
│
├── index.html              # Página principal (lista de mídias)
├── profile.html            # Página de perfil
├── README.md
│
├── assets/
│   └── data/
│       ├── movie-list.md   # Fonte de dados: tabela com todos os títulos
│       ├── media-data.json # Capas + descrições unificadas (gerado pelo app)
│       ├── posters.json    # Capas (legado, ainda lido como fallback)
│       └── descriptions.json # Descrições (legado)
│
└── src/
    ├── css/
    │   ├── variables.css   # CSS custom properties (:root) + reset global
    │   ├── layout.css      # Nav, toolbar, media pills, hamburger, chips, stats
    │   ├── cards.css       # Grid de cards, poster, tags, badges de mídia/nível
    │   ├── modal.css       # Modal de detalhes, formulário, poster editor, roulette, sync
    │   ├── responsive.css  # Media queries (@media mobile/desktop)
    │   └── profile.css     # Estilos exclusivos da página de perfil
    │
    └── js/
        ├── constants.js        # Chaves de API, localStorage keys, estado global
        ├── parser.js           # parseMarkdown() — lê movie-list.md e retorna array
        ├── api.js              # tryTMDB / tryJikan / tryOMDB + fetchDesc()
        ├── posterEditor.js     # Editor de capa manual (PE overlay) + download merged
        ├── posterNav.js        # Setas ‹ › no modal — busca todas as fontes disponíveis
        ├── render.js           # TAG_LABELS, renderCard(), renderGrid(), buildNavTabs()
        ├── recommendations.js  # buildProfile(), scoreItem(), getRecommendations(), getSimilar()
        ├── modal.js            # openModal(), closeModal(), saveEntry(), setStatus(), stars
        ├── roulette.js         # Roleta de capas (overlay de thumbnails por tipo/status)
        ├── sync.js             # Exportar/importar userdata.json, media-data.json, etc.
        ├── events.js           # Listeners de DOM + openHam/clearFilters + init()
        └── profile.js          # Toda a lógica da página de perfil
```

---

## Fluxo de dados

```
movie-list.md
     │
     ▼
parser.js ──► MEDIA_DATA[]       (array em memória, fonte de verdade)
     │
     ├── render.js ──► cards HTML no DOM
     │
     ├── api.js ──► TMDB / Jikan / OMDB
     │         ├── posterAuto{}   (cache localStorage)
     │         └── descAuto{}     (cache localStorage)
     │
     └── posterEditor.js ──► posterEdits{} (localStorage + download posters.json)

media-data.json  ──► POSTERS_JSON{} + DESCS_JSON{}   (base permanente)
```

---

## Sincronização entre dispositivos

1. No dispositivo A: `↕ SYNC → Exportar userdata.json`
2. Envie o arquivo (WhatsApp, Drive, e-mail)
3. No dispositivo B: `↕ SYNC → Importar userdata.json`
4. Para capas: `↕ SYNC → Exportar media-data.json` → substitua o arquivo na pasta

O `media-data.json` unifica `posters.json` + `descriptions.json` num só arquivo.

---

## APIs usadas

| API | Uso | Chave |
|-----|-----|-------|
| TMDB | Capas + descrições de filmes e séries | `8265bd1679663a7ea12ac168da84d2e8` |
| Jikan (MAL) | Capas + descrições de animes | pública, sem chave |
| OMDB | Capa + descrição como fallback | `trilogy` (gratuita) |

---

## localStorage keys

| Chave | Conteúdo |
|-------|----------|
| `megalist_v1` | Status, notas, ratings, reviews, episódios |
| `megalist_poster_edits_v1` | Capas editadas manualmente pelo usuário |
| `megalist_poster_auto_v1` | Capas buscadas automaticamente (cache) |
| `megalist_desc_auto_v1` | Descrições buscadas automaticamente (cache) |
| `megalist_desc_user_v1` | Descrições editadas manualmente |
| `megalist_profile_v1` | Favoritos, rankings, avatar, nome |
| `megalist_sync_meta_v1` | Timestamp do último export/import |
