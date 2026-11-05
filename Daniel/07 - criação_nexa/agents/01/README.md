# Document Agent API

API que lê e analisa documentos usando **Claude (Anthropic)** ou **IA local via Ollama**.

## 1. Preparar o Ollama (local)
    # instale em https://ollama.com e baixe um modelo
    ollama pull llama3.1          # texto
    ollama pull llama3.2-vision   # texto + imagens
    ollama serve                  # se ainda não estiver rodando

## 2. Rodar a API
    pip install -r requirements.txt
    cp .env.example .env          # edite os valores
    export $(grep -v '^#' .env | xargs)
    uvicorn main:app --reload
Docs interativas: http://localhost:8000/docs

## 3. Usar
    # provedor padrão (variável PROVIDER)
    curl -X POST http://localhost:8000/analyze \
      -H "X-API-Key: SUA_CHAVE" \
      -F "files=@contrato.pdf" \
      -F "instruction=Liste as cláusulas de rescisão e multas"

    # escolhendo provedor/modelo por requisição
    curl -X POST http://localhost:8000/analyze -H "X-API-Key: SUA_CHAVE" \
      -F "files=@relatorio.docx" -F "provider=ollama" -F "model=qwen2.5:14b"

    # modelos disponíveis no Ollama
    curl -H "X-API-Key: SUA_CHAVE" http://localhost:8000/models

## Docker (API + Ollama juntos)
    docker compose up -d
    docker compose exec ollama ollama pull llama3.1

## Diferenças entre os provedores
| | anthropic | ollama |
|---|---|---|
| PDF | nativo (layout, tabelas, scans) | só texto extraído (pypdf) |
| Imagens | sim | só com modelo de visão |
| Contexto | grande | limitado por OLLAMA_NUM_CTX (e pela sua RAM/VRAM) |
| Privacidade | dados vão à API | 100% local |

## Atenção
O Ollama usa contexto pequeno por padrão e trunca em silêncio. Por isso a API
define `num_ctx` (OLLAMA_NUM_CTX) e recusa documentos que claramente não cabem.