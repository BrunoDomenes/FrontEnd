const forms = document.getElementById("form-login");
const msg = document.getElementById("msg");
const btn = document.getElementsByClassName("btn");

const email = document.getElementById("email_login");
const senha = document.getElementById("senha_login");

forms.addEventListener("submit", entrar);

async function entrar(evento) {
  evento.preventDefault();
  btn.disable = true
  msg.textContent = "Verificando....";

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

    if (!response.ok) {
      if ((response.status = 401)) {
        msg.textContent = dados.detail;
      } else {
        msg.textContent = "Confira os dados enviados.";
      }
      return;
    }
    msg.textContent = "Verificação concluida.";
  } catch {
    console.log(Error);
  }
}
