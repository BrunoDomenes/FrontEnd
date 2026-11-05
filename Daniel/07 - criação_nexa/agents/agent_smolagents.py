"""
Exemplo mínimo de agent com smolagents + Ollama.

Instalação:
    pip install "smolagents[litellm]"
    ollama pull qwen3:8b      # (ou qwen2.5-coder:7b, que escreve código muito bem)

Rodar:
    python agent_smolagents.py
"""

import os
from smolagents import CodeAgent, LiteLLMModel, tool


# 1) MODELO LOCAL ----------------------------------------------------------
# O smolagents usa o LiteLLM por baixo. O prefixo "ollama_chat/" é o recomendado.
model = LiteLLMModel(
    model_id="ollama_chat/qwen3.8",
    api_base="http://localhost:11434",
    num_ctx=8192,  # contexto padrão do Ollama é pequeno; aumente!
)


# 2) FERRAMENTAS -----------------------------------------------------------
# O decorator @tool lê a docstring e as type hints para descrever a
# ferramenta ao modelo. A seção "Args:" é obrigatória.

@tool
def listar_arquivos(pasta: str) -> str:
    """Lista os arquivos e subpastas de um diretório.

    Args:
        pasta: caminho do diretório (use "." para a pasta atual)
    """
    try:
        return "\n".join(sorted(os.listdir(pasta)))
    except Exception as e:
        return f"erro: {e}"


@tool
def ler_arquivo(caminho: str) -> str:
    """Lê o conteúdo de um arquivo de texto (máximo 5000 caracteres).

    Args:
        caminho: caminho do arquivo
    """
    try:
        with open(caminho, encoding="utf-8") as f:
            return f.read(5000)
    except Exception as e:
        return f"erro: {e}"


# 3) AGENT -----------------------------------------------------------------
# CodeAgent: em vez de só chamar ferramentas, o modelo ESCREVE código Python
# que usa as ferramentas, faz contas, loops, etc.
agent = CodeAgent(
    tools=[listar_arquivos, ler_arquivo],
    model=model,
    additional_authorized_imports=["math", "statistics", "collections"],
    max_steps=8,      # limite de iterações (evita loop infinito)
    verbosity_level=1,  # 0 = silencioso, 2 = mostra tudo
)


# 4) EXECUÇÃO --------------------------------------------------------------
if __name__ == "__main__":
    tarefa = (
        "Liste os arquivos da pasta atual, conte quantos são arquivos .py "
        "e me diga o nome do maior deles em número de caracteres."
    )
    resposta = agent.run(tarefa)
    print("\n=== RESPOSTA FINAL ===")
    print(resposta)