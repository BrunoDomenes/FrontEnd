const formLogin = document.getElementById("form-login");
const msgLogin = document.getElementById("msg_login");
const emailLogin = document.getElementById("email_login");
const senhaLogin = document.getElementById("senha_login");

formLogin?.addEventListener("submit", entrar);

function mensagemDeErro(dados, padrao) {
  if (!dados) return padrao;
  if (typeof dados.detail === "string") return dados.detail;
  if (Array.isArray(dados.detail) && dados.detail[0]?.msg) {
    return dados.detail[0].msg;
  }
  return padrao;
}

async function entrar(evento) {
  evento.preventDefault();
  msgLogin.textContent = "Verificando...";
  msgLogin.style.color = "";

  try {
    const resposta = await fetch("/login", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: emailLogin.value,
        senha: senhaLogin.value,
      }),
    });

    let dados = {};
    try {
      dados = await resposta.json();
    } catch {
      // Resposta sem corpo JSON.
    }

    if (!resposta.ok) {
      msgLogin.textContent = mensagemDeErro(dados, "Confira os dados enviados.");
      msgLogin.style.color = "red";
      return;
    }

    msgLogin.textContent = "Verificação concluída.";
    msgLogin.style.color = "green";
    window.location.href = "/painel";
  } catch (erro) {
    console.error("Falha no login:", erro);
    msgLogin.textContent = "Não foi possível conectar. Tente novamente.";
    msgLogin.style.color = "red";
  }
}
