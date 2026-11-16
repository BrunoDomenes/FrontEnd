from banco import conectar
from fastapi import FastAPI, HTTPException, Request, Response
from pydantic import BaseModel, Field
from pathlib import Path
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from sessao import (
    criar_sessao,
    obter_usuario_da_sessao,
    encerrar_sessao,
    TEMPO_SESSAO_SEGUNDOS
)

banco = conectar()
app = FastAPI()

pasta = Path(__file__).resolve().parent

app.mount(
    "/static",
    StaticFiles(directory=pasta / "static"),
    name="static"
)

@app.get("/")
def init():
    return FileResponse(pasta / "static" / "index.html")

class DadosLogin(BaseModel):
    email: str = Field(min_length=3, max_length=150)
    senha: str = Field(min_length=1, max_length=128)
class DadosCadastro(BaseModel):
    nome: str = Field(min_length=3, max_length=50)
    email: str = Field(min_length=3, max_length=150)
    senha: str = Field(min_length=1, max_length=128)

@app.post("/login")
def login(  dados: DadosLogin,
            request: Request,
            response: Response
        ):
    email = dados.email.strip().lower()
    user = banco.verificar_user(email, dados.senha)
    
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Email é Senha Inválida"
        )
        
        # Encerra a sessão anterior deste navegador.
    token_anterior = request.cookies.get("sessao")
    encerrar_sessao(token_anterior)
    # Cria uma nova sessão após autenticar o usuário.
    token = criar_sessao(user["id"])
    response.set_cookie(
        key="sessao",
        value=token,
        httponly=True,
        samesite="strict",
        secure=False,  # Apenas no laboratório HTTP local.
        max_age=TEMPO_SESSAO_SEGUNDOS,
        path="/"
    )
    response.headers["Cache-Control"] = "no-store"
    return {
        "mensagem": "Login efetuado",
        "user": {
            "id": user["id"],
            "nome": user["nome"],
            "perfil": user["perfil"]
        }
    }

@app.post("/cadastro")
def cadastro(dados: DadosCadastro):
    email = dados.email.strip().lower()
    user = banco.criar_user(dados.nome, email, dados.senha)
    return {
        "mesagem":"Criado com sucesso",
        "user":user
}
    
@app.get("/me")
def me(request:Request, response:Response):
    token = request.cookies.get("sessao")
    user = obter_usuario_da_sessao(token)
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Sessão inválida ou expirada."
        )
    response.headers["Cache-Control"] = "no-store"
    return {"user": user}

@app.post("/logout")
def logout(request:Request, response:Response):
    token = request.cookies.get("sessao")
    encerrar_sessao(token)
    response.delete_cookie(key="sessao", path="/")
    response.headers["Cache-Control"] = "no-store"
    return {"mensagem": "Sessão encerrada"}