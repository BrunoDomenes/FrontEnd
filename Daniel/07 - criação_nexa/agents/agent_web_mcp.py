"""
Agent smolagents com pesquisa na WEB + ferramentas de servidores MCP (Ollama local).

Instalação:
    pip install "smolagents[litellm,toolkit,mcp]"
    ollama pull qwen2.5-coder:7b      # ou qwen3:8b

    # Para o exemplo de MCP (filesystem) é preciso ter Node.js (npx).
    # Para servidores MCP em Python, instale o uv (https://docs.astral.sh/uv/).

Rodar:
    python agent_web_mcp.py
"""

from pathlib import Path

from mcp import StdioServerParameters
from smolagents import (
    CodeAgent,
    DuckDuckGoSearchTool,
    LiteLLMModel,
    MCPClient,
    VisitWebpageTool,
)

# 1) MODELO LOCAL ----------------------------------------------------------
model = LiteLLMModel(
    model_id="ollama_chat/qwen3:8b",
    api_base="http://localhost:11434",
    num_ctx=16384,  # pesquisa web + MCP gastam bastante contexto
)

# 2) FERRAMENTAS DE WEB ----------------------------------------------------
# DuckDuckGoSearchTool: busca (sem chave de API)
# VisitWebpageTool: abre uma URL e devolve o texto em markdown
web_tools = [
    DuckDuckGoSearchTool(max_results=5),
    VisitWebpageTool(max_output_length=8000),
]

# 3) SERVIDORES MCP --------------------------------------------------------
# Cada servidor MCP é descrito por parâmetros. Dois tipos comuns:
#
#  a) stdio  -> o smolagents INICIA o servidor como subprocesso local
#  b) http   -> o servidor já está rodando e você passa a URL
#
# Pasta que o servidor "filesystem" poderá acessar (limite de segurança!)
PASTA_TRABALHO = Path("./workspace").resolve()
PASTA_TRABALHO.mkdir(exist_ok=True)

mcp_servers = [
    # (a) stdio: servidor oficial de arquivos, via npx
    StdioServerParameters(
        command="npx",
        args=["-y", "@modelcontextprotocol/server-filesystem", str(PASTA_TRABALHO)],
    ),
    # (a) stdio: exemplo com servidor Python via uvx (descomente para usar)
    # StdioServerParameters(command="uvx", args=["mcp-server-fetch"]),
    #
    # (b) http: servidor MCP remoto ou já rodando (descomente e ajuste a URL)
    # {"url": "http://localhost:8000/mcp", "transport": "streamable-http"},
]


# 4) EXECUÇÃO --------------------------------------------------------------
if __name__ == "__main__":
    # MCPClient abre as conexões, descobre as ferramentas de cada servidor
    # e FECHA tudo ao sair do bloco "with".
    with MCPClient(mcp_servers) as mcp_tools:
        print("Ferramentas MCP encontradas:")
        for t in mcp_tools:
            print(f"  - {t.name}")

        agent = CodeAgent(
            tools=[*web_tools, *mcp_tools],
            model=model,
            max_steps=10,
            verbosity_level=1,
        )

        tarefa = (
            "Pesquise na web as principais novidades do Python 3.13 e "
            "salve um resumo curto em tópicos no arquivo 'python313.md'."
        )
        resposta = agent.run(tarefa)

        print("\n=== RESPOSTA FINAL ===")
        print(resposta)