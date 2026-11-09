from banco import conectar
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from pathlib import Path
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

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
def login(dados: DadosLogin):
    email = dados.email.strip().lower()
    user = banco.verificar_user(email, dados.senha)
    
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Email é Senha Inválida"
        )
    return {
        "mensagem":"login efetuado",
        "user":user
    }

@app.post("/cadastro")
def cadastro(dados: DadosCadastro):
    email = dados.email.strip().lower()
    user = banco.criar_user(dados.nome, email, dados.senha)
    return {
        "mesagem":"Criado com sucesso",
        "user":user
}