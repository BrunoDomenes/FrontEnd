import asyncio
import logging
import os
from contextlib import asynccontextmanager, suppress
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field, field_validator
from pymysql import Error as ErroMySQL

from banco import Banco, ErroBanco
from seguranca import (
    CADASTRO_POR_IP,
    LOGIN_POR_EMAIL,
    LOGIN_POR_IP,
    cabecalhos_de_seguranca,
    limitador,
    obter_ip,
)
from sessao import (
    TEMPO_SESSAO_SEGUNDOS,
    criar_sessao,
    encerrar_sessao,
    limpar_sessoes_expiradas,
    obter_usuario_da_sessao,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("sistema_login")

PASTA = Path(__file__).resolve().parent
COOKIE_SEGURO = os.getenv("COOKIE_SEGURO", "true").strip().lower() in {
    "1",
    "true",
    "yes",
    "sim",
}
HABILITAR_DOCS = os.getenv("HABILITAR_DOCS", "false").strip().lower() in {
    "1",
    "true",
    "yes",
    "sim",
}


def _limpar_sessoes_agora() -> int:
    with Banco.abrir() as banco:
        return limpar_sessoes_expiradas(banco)


async def _limpeza_periodica(intervalo_segundos: int = 3600) -> None:
    """Remove sessões expiradas periodicamente (roda em thread separada)."""
    while True:
        await asyncio.sleep(intervalo_segundos)
        try:
            removidas = await asyncio.to_thread(_limpar_sessoes_agora)
            if removidas:
                logger.info("Sessões expiradas removidas: %s", removidas)
        except (ErroBanco, ErroMySQL) as exc:
            logger.warning("Falha na limpeza periódica de sessões: %s", exc)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Limpa sessões expiradas no startup, sem impedir a subida se o banco cair."""
    try:
        removidas = await asyncio.to_thread(_limpar_sessoes_agora)
        if removidas:
            logger.info("Sessões expiradas removidas no startup: %s", removidas)
    except (ErroBanco, ErroMySQL) as exc:
        logger.error("Banco de dados indisponível no startup: %s", exc)

    tarefa = asyncio.create_task(_limpeza_periodica())
    try:
        yield
    finally:
        tarefa.cancel()
        with suppress(asyncio.CancelledError):
            await tarefa


app = FastAPI(
    title="Sistema de Login",
    docs_url="/docs" if HABILITAR_DOCS else None,
    redoc_url="/redoc" if HABILITAR_DOCS else None,
    openapi_url="/openapi.json" if HABILITAR_DOCS else None,
    lifespan=lifespan,
)

app.middleware("http")(cabecalhos_de_seguranca)


# Compatibilidade: o front-end antigo redirecionava para este caminho.
# Precisa ser declarado antes do mount /static para ter precedência.
@app.get("/static/pages/index.html", include_in_schema=False)
def pagina_antiga():
    return RedirectResponse(url="/painel", status_code=status.HTTP_301_MOVED_PERMANENTLY)


app.mount(
    "/static",
    StaticFiles(directory=PASTA / "static"),
    name="static",
)


# --------------------------------------------------------------------- handlers
@app.exception_handler(ErroBanco)
async def tratar_erro_banco(_request: Request, exc: ErroBanco):
    logger.error("Falha de banco: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": "Serviço temporariamente indisponível."},
    )


@app.exception_handler(ErroMySQL)
async def tratar_erro_mysql(_request: Request, exc: ErroMySQL):
    logger.error("Erro do MySQL: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": "Serviço temporariamente indisponível."},
    )


@app.exception_handler(Exception)
async def tratar_erro_generico(_request: Request, _exc: Exception):
    # Loga o detalhe no servidor, mas nunca devolve stack trace ao cliente.
    logger.exception("Erro inesperado")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Erro interno do servidor."},
    )


# ---------------------------------------------------------------------- modelos
class DadosLogin(BaseModel):
    email: str = Field(min_length=3, max_length=150)
    senha: str = Field(min_length=1, max_length=128)


class DadosCadastro(BaseModel):
    nome: str = Field(min_length=3, max_length=50)
    email: EmailStr
    senha: str = Field(min_length=8, max_length=128)

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, valor: str) -> str:
        valor = valor.strip()
        if len(valor) < 3:
            raise ValueError("O nome deve ter ao menos 3 caracteres.")
        return valor

    @field_validator("email")
    @classmethod
    def validar_email(cls, valor: str) -> str:
        valor = valor.strip().lower()
        if len(valor) > 150:
            raise ValueError("O e-mail deve ter no máximo 150 caracteres.")
        return valor

    @field_validator("senha")
    @classmethod
    def validar_senha(cls, valor: str) -> str:
        if not any(c.isalpha() for c in valor) or not any(c.isdigit() for c in valor):
            raise ValueError("A senha deve conter letras e números.")
        return valor


# ------------------------------------------------------------------------ rotas
@app.get("/")
def init():
    return FileResponse(
        PASTA / "static" / "index.html",
        headers={"Cache-Control": "no-store"},
    )


@app.post("/login")
def login(dados: DadosLogin, request: Request, response: Response):
    email = dados.email.strip().lower()
    ip = obter_ip(request)

    # Rate limit antes de qualquer acesso ao banco.
    limitador.verificar(f"login:ip:{ip}", *LOGIN_POR_IP)
    limitador.verificar(f"login:email:{email}", *LOGIN_POR_EMAIL)

    with Banco.abrir() as banco:
        user = banco.verificar_user(email, dados.senha)

        if user is None:
            # Mensagem idêntica para e-mail inexistente e senha errada.
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="E-mail ou senha inválidos.",
            )

        # Encerra a sessão anterior deste navegador e emite uma nova (anti-fixação).
        encerrar_sessao(banco, request.cookies.get("sessao"))
        token = criar_sessao(banco, user["id"])

    response.set_cookie(
        key="sessao",
        value=token,
        httponly=True,
        samesite="strict",
        secure=COOKIE_SEGURO,
        max_age=TEMPO_SESSAO_SEGUNDOS,
        path="/",
    )
    response.headers["Cache-Control"] = "no-store"
    return {
        "mensagem": "Login efetuado",
        "user": {
            "id": user["id"],
            "nome": user["nome"],
            "perfil": user["perfil"],
        },
    }


@app.post("/cadastro", status_code=status.HTTP_201_CREATED)
def cadastro(dados: DadosCadastro, request: Request, response: Response):
    ip = obter_ip(request)
    limitador.verificar(f"cadastro:ip:{ip}", *CADASTRO_POR_IP)

    email = str(dados.email).strip().lower()

    with Banco.abrir() as banco:
        criado = banco.criar_user(dados.nome, email, dados.senha)

    if not criado:
        # Registrado apenas no servidor; a resposta ao cliente é a mesma.
        logger.info("Cadastro recusado: e-mail já existente (%s).", email)

    response.headers["Cache-Control"] = "no-store"
    # Resposta uniforme: não permite descobrir se o e-mail já está cadastrado.
    return {"mensagem": "Se os dados forem válidos, a conta foi criada."}


@app.get("/me")
def me(request: Request, response: Response):
    token = request.cookies.get("sessao")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão inválida ou expirada.",
        )

    with Banco.abrir() as banco:
        user = obter_usuario_da_sessao(banco, token)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão inválida ou expirada.",
        )

    response.headers["Cache-Control"] = "no-store"
    return {"user": user}


@app.get("/painel")
def painel(request: Request):
    """Serve a página protegida apenas para quem tem sessão válida."""
    token = request.cookies.get("sessao")
    if not token:
        return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)

    with Banco.abrir() as banco:
        user = obter_usuario_da_sessao(banco, token)

    if user is None:
        return RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)

    return FileResponse(
        PASTA / "paginas" / "index.html",
        headers={"Cache-Control": "no-store"},
    )


@app.post("/logout")
def logout(request: Request, response: Response):
    token = request.cookies.get("sessao")
    if token:
        with Banco.abrir() as banco:
            encerrar_sessao(banco, token)

    response.delete_cookie(
        key="sessao",
        path="/",
        httponly=True,
        samesite="strict",
        secure=COOKIE_SEGURO,
    )
    response.headers["Cache-Control"] = "no-store"
    return {"mensagem": "Sessão encerrada"}
