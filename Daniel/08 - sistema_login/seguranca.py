"""Utilitários de segurança: rate limiting e cabeçalhos HTTP."""

from __future__ import annotations

import threading
import time
from collections import deque

from fastapi import HTTPException, Request, status
from starlette.responses import Response

# (limite de tentativas, janela em segundos)
LOGIN_POR_IP = (10, 60)      # 10 tentativas por minuto por IP
LOGIN_POR_EMAIL = (5, 60)    # 5 tentativas por minuto por conta
CADASTRO_POR_IP = (5, 300)   # 5 cadastros a cada 5 minutos por IP


class Limitador:
    """Rate limiter em memória com janela deslizante e thread-safe.

    Adequado para um único processo. Em cenário com múltiplos workers ou
    instâncias, troque o armazenamento em memória por Redis.
    """

    def __init__(self, max_chaves: int = 10_000) -> None:
        self._eventos: dict[str, deque[float]] = {}
        self._lock = threading.Lock()
        self._max_chaves = max_chaves

    def verificar(self, chave: str, limite: int, janela_segundos: int) -> None:
        agora = time.monotonic()
        limite_tempo = agora - janela_segundos

        with self._lock:
            fila = self._eventos.get(chave)
            if fila is None:
                fila = deque()
                self._eventos[chave] = fila

            while fila and fila[0] <= limite_tempo:
                fila.popleft()

            if len(fila) >= limite:
                espera = max(1, int(fila[0] + janela_segundos - agora) + 1)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Muitas tentativas. Aguarde e tente novamente.",
                    headers={"Retry-After": str(espera)},
                )

            fila.append(agora)

            if len(self._eventos) > self._max_chaves:
                self._limpar(limite_tempo)
                # Se ainda houver excesso (muitas chaves ativas), descarta as mais antigas
                # para impedir crescimento ilimitado de memória sob ataque.
                excedente = len(self._eventos) - self._max_chaves
                if excedente > 0:
                    for chave_antiga in list(self._eventos)[:excedente]:
                        del self._eventos[chave_antiga]

    def _limpar(self, limite_tempo: float) -> None:
        """Remove chaves sem eventos recentes para conter o uso de memória."""
        vazias = [
            chave
            for chave, fila in self._eventos.items()
            if not fila or fila[-1] <= limite_tempo
        ]
        for chave in vazias:
            del self._eventos[chave]

    def resetar(self) -> None:
        with self._lock:
            self._eventos.clear()


limitador = Limitador()


def obter_ip(request: Request) -> str:
    """IP da conexão TCP.

    Não confie em X-Forwarded-For sem um proxy reverso confiável na frente,
    pois o cabeçalho é controlado pelo cliente e permitiria burlar o limite.
    """
    if request.client is None:
        return "desconhecido"
    return request.client.host


async def cabecalhos_de_seguranca(request: Request, call_next):
    """Adiciona cabeçalhos de defesa em profundidade a todas as respostas."""
    resposta: Response = await call_next(request)

    resposta.headers.setdefault("X-Content-Type-Options", "nosniff")
    resposta.headers.setdefault("X-Frame-Options", "DENY")
    resposta.headers.setdefault("Referrer-Policy", "no-referrer")
    resposta.headers.setdefault(
        "Permissions-Policy", "geolocation=(), microphone=(), camera=()"
    )
    resposta.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    resposta.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' https://cdnjs.cloudflare.com; "
        "font-src 'self' https://cdnjs.cloudflare.com; "
        "img-src 'self' data:; "
        "connect-src 'self'; "
        "object-src 'none'; "
        "base-uri 'self'; "
        "form-action 'self'; "
        "frame-ancestors 'none'",
    )
    # Só tem efeito sobre HTTPS; enviar sempre é seguro.
    resposta.headers.setdefault(
        "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
    )

    # Estáticos sempre revalidam (ETag), evitando que o navegador use JS antigo.
    if request.url.path.startswith("/static/"):
        resposta.headers.setdefault("Cache-Control", "no-cache")

    return resposta
