const forms = document.getElementById("form-login")
const msg_login = document.getElementById("msg_login")

const email = document.getElementById("email_login")
const senha = document.getElementById("senha_login")

forms.addEventListener("submit", entrar)

async function entrar(evento) {
  evento.preventDefault();
  msg_login.textContent = "Verificando....";

  try {
    const response = await fetch("http://127.0.0.1:8000/login", {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify({
        email: email.value,
        senha: senha.value,
      }),
    });
    const dados = await response.json();
    console.log(response)
    if (!response.ok) {
      if ((response.status = 401)) {
        msg_login.textContent = dados.detail;
      } else {
        msg_login.textContent = "Confira os dados enviados.";
      }
      return;
    }
    msg_login.textContent = "Verificação concluida.";
    window.location.href='/static/pages/index.html';
  } catch {
    console.log(Error);
  }
}


