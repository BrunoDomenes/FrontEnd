const nomeCadastro = document.getElementById("nome_cadastro");
const emailCadastro = document.getElementById("email_cadastro");
const senhaCadastro = document.getElementById("senha_cadastro");
const senhaConfirmar = document.getElementById("senha_cadastro_confirmar");

const formCadastro = document.getElementById("form-cadastro");
const msgCadastro = document.getElementById("msg_cadastro");

formCadastro?.addEventListener("submit", cadastrar);

function mensagemDeErro(dados, padrao) {
  if (!dados) return padrao;
  if (typeof dados.detail === "string") return dados.detail;
  if (Array.isArray(dados.detail) && dados.detail[0]?.msg) {
    return dados.detail[0].msg;
  }
  return padrao;
}

async function cadastrar(evento) {
  evento.preventDefault();
  msgCadastro.textContent = "";
  msgCadastro.style.color = "";

  if (senhaCadastro.value !== senhaConfirmar.value) {
    msgCadastro.textContent = "As senhas não coincidem.";
    msgCadastro.style.color = "red";
    return;
  }

  if (senhaCadastro.value.length < 8) {
    msgCadastro.textContent = "A senha deve ter ao menos 8 caracteres.";
    msgCadastro.style.color = "red";
    return;
  }

  try {
    const resposta = await fetch("/cadastro", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nome: nomeCadastro.value,
        email: emailCadastro.value,
        senha: senhaCadastro.value,
      }),
    });

    let dados = {};
    try {
      dados = await resposta.json();
    } catch {
      // Resposta sem corpo JSON.
    }

    if (!resposta.ok) {
      msgCadastro.textContent = mensagemDeErro(dados, "Não foi possível concluir o cadastro.");
      msgCadastro.style.color = "red";
      return;
    }

    msgCadastro.textContent = dados?.mensagem || "Cadastro concluído. Faça login.";
    msgCadastro.style.color = "green";
    formCadastro.reset();
  } catch (erro) {
    console.error("Falha no cadastro:", erro);
    msgCadastro.textContent = "Não foi possível conectar. Tente novamente.";
    msgCadastro.style.color = "red";
  }
}
