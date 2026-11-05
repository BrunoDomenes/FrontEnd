import base64
import hmac
import io
import os
from typing import List, Optional

import anthropic
import httpx
from docx import Document
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from pypdf import PdfReader

# ----------------------------- Configuração -----------------------------
DEFAULT_PROVIDER = os.getenv("PROVIDER", "anthropic").lower()  # anthropic | ollama
SERVICE_API_KEY = os.getenv("SERVICE_API_KEY")
MAX_BYTES = int(os.getenv("MAX_UPLOAD_MB", "20")) * 1024 * 1024

CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-5-5")

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")  # use um modelo com visão p/ imagens
OLLAMA_NUM_CTX = int(os.getenv("OLLAMA_NUM_CTX", "16384"))  # contexto em tokens
OLLAMA_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "600"))

SYSTEM_PROMPT = (
    "Você é um agente especialista em leitura e análise de documentos. "
    "Baseie-se somente no conteúdo fornecido, cite trechos ou páginas quando "
    "possível e diga claramente quando uma informação não estiver no documento. "
    "Responda no idioma do usuário."
)

IMAGE_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
               ".gif": "image/gif", ".webp": "image/webp"}
TEXT_EXTS = {".txt", ".md", ".csv", ".json", ".html", ".xml", ".log"}

app = FastAPI(title="Document Agent API", version="0.2.0")


def auth(x_api_key: Optional[str] = Header(default=None)):
    if SERVICE_API_KEY and not hmac.compare_digest(x_api_key or "", SERVICE_API_KEY):
        raise HTTPException(status_code=401, detail="API key inválida")


# ------------------------- Leitura dos arquivos -------------------------
# Cada arquivo vira um "part" neutro de provedor:
#   {"kind": "pdf"|"image"|"text", "name": str, "data": bytes, "media_type": str, "text": str}
def docx_to_text(data: bytes) -> str:
    doc = Document(io.BytesIO(data))
    parts = [p.text for p in doc.paragraphs if p.text.strip()]
    for table in doc.tables:
        for row in table.rows:
            parts.append(" | ".join(cell.text.strip() for cell in row.cells))
    return "\n".join(parts)


def pdf_to_text(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))
    pages = []
    for i, page in enumerate(reader.pages, start=1):
        pages.append(f"[Página {i}]\n{(page.extract_text() or '').strip()}")
    return "\n\n".join(pages)


def parse_file(filename: str, data: bytes) -> dict:
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf":
        return {"kind": "pdf", "name": filename, "data": data}
    if ext in IMAGE_TYPES:
        return {"kind": "image", "name": filename, "data": data, "media_type": IMAGE_TYPES[ext]}
    if ext == ".docx":
        return {"kind": "text", "name": filename, "text": docx_to_text(data)}
    if ext in TEXT_EXTS:
        return {"kind": "text", "name": filename, "text": data.decode("utf-8", errors="replace")}
    raise HTTPException(status_code=415, detail=f"Formato não suportado: {ext}")


def wrap_text(name: str, text: str) -> str:
    return f"<documento nome='{name}'>\n{text}\n</documento>"


def b64(data: bytes) -> str:
    return base64.standard_b64encode(data).decode()


# ------------------------------ Provedores ------------------------------
async def run_anthropic(parts: List[dict], instruction: str, model: Optional[str]) -> dict:
    client = anthropic.AsyncAnthropic()  # lê ANTHROPIC_API_KEY
    content = []
    for p in parts:
        if p["kind"] == "pdf":  # PDF nativo: o modelo enxerga layout, tabelas e scans
            content.append({"type": "document", "title": p["name"],
                            "source": {"type": "base64", "media_type": "application/pdf",
                                       "data": b64(p["data"])}})
        elif p["kind"] == "image":
            content.append({"type": "image",
                            "source": {"type": "base64", "media_type": p["media_type"],
                                       "data": b64(p["data"])}})
        else:
            content.append({"type": "text", "text": wrap_text(p["name"], p["text"])})
    content.append({"type": "text", "text": instruction})

    try:
        resp = await client.messages.create(
            model=model or CLAUDE_MODEL, max_tokens=4096, system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": content}])
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Erro na API da Anthropic: {e}")

    return {
        "result": "".join(b.text for b in resp.content if b.type == "text"),
        "model": model or CLAUDE_MODEL,
        "usage": {"input_tokens": resp.usage.input_tokens,
                  "output_tokens": resp.usage.output_tokens},
        "warnings": [],
    }


async def run_ollama(parts: List[dict], instruction: str, model: Optional[str]) -> dict:
    warnings: List[str] = []
    texts, images = [], []

    for p in parts:
        if p["kind"] == "pdf":
            text = pdf_to_text(p["data"])
            if len(text.replace("\n", "").strip()) < 50 * max(1, text.count("[Página")):
                warnings.append(f"{p['name']}: pouco texto extraído (PDF escaneado?). "
                                "Ollama não lê PDF como imagem; use OCR ou o provedor anthropic.")
            texts.append(wrap_text(p["name"], text))
        elif p["kind"] == "image":
            images.append(b64(p["data"]))
        else:
            texts.append(wrap_text(p["name"], p["text"]))

    prompt = "\n\n".join(texts + [instruction])

    # Estimativa grosseira (~3.5 caracteres/token). Ollama trunca em silêncio se passar do num_ctx.
    approx_tokens = int(len(prompt) / 3.5)
    if approx_tokens > OLLAMA_NUM_CTX:
        raise HTTPException(
            status_code=413,
            detail=f"Documento (~{approx_tokens} tokens) excede OLLAMA_NUM_CTX={OLLAMA_NUM_CTX}. "
                   "Aumente o contexto, divida o documento ou use um modelo maior.")

    user_msg = {"role": "user", "content": prompt}
    if images:
        user_msg["images"] = images
        warnings.append("Imagens enviadas: o modelo Ollama precisa ter visão "
                        "(ex.: llama3.2-vision, qwen2.5vl, gemma3).")

    payload = {
        "model": model or OLLAMA_MODEL,
        "stream": False,
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}, user_msg],
        "options": {"num_ctx": OLLAMA_NUM_CTX, "temperature": 0.2},
    }

    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as http:
            r = await http.post(f"{OLLAMA_HOST}/api/chat", json=payload)
    except httpx.ConnectError:
        raise HTTPException(status_code=502, detail=f"Não consegui conectar ao Ollama em {OLLAMA_HOST}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout aguardando o Ollama")

    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Erro do Ollama: {r.text}")

    data = r.json()
    return {
        "result": data.get("message", {}).get("content", ""),
        "model": payload["model"],
        "usage": {"input_tokens": data.get("prompt_eval_count"),
                  "output_tokens": data.get("eval_count")},
        "warnings": warnings,
    }


PROVIDERS = {"anthropic": run_anthropic, "ollama": run_ollama}


# -------------------------------- Rotas ---------------------------------
@app.get("/health")
async def health():
    return {"status": "ok", "default_provider": DEFAULT_PROVIDER}


@app.get("/models", dependencies=[Depends(auth)])
async def list_ollama_models():
    """Lista os modelos já baixados no Ollama."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(f"{OLLAMA_HOST}/api/tags")
        return {"ollama": [m["name"] for m in r.json().get("models", [])]}
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail=f"Ollama indisponível em {OLLAMA_HOST}")


@app.post("/analyze", dependencies=[Depends(auth)])
async def analyze(
    files: List[UploadFile] = File(...),
    instruction: str = Form("Faça um resumo executivo, liste os pontos-chave e destaque riscos ou inconsistências."),
    provider: Optional[str] = Form(None, description="anthropic | ollama (padrão: variável PROVIDER)"),
    model: Optional[str] = Form(None, description="Sobrescreve o modelo do provedor"),
):
    provider = (provider or DEFAULT_PROVIDER).lower()
    if provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Provedor inválido. Use: {list(PROVIDERS)}")

    parts = []
    for f in files:
        data = await f.read()
        if len(data) > MAX_BYTES:
            raise HTTPException(status_code=413, detail=f"{f.filename} excede o limite")
        parts.append(parse_file(f.filename or "arquivo", data))

    out = await PROVIDERS[provider](parts, instruction, model)
    return {**out, "provider": provider, "files": [f.filename for f in files]}