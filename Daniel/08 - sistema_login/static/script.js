function alternarVisibilidadeSenha(icone) {
  const campo = document.getElementById(icone.dataset.toggleSenha);
  if (!campo) return;

  const estaVisivel = campo.type === "text";
  campo.type = estaVisivel ? "password" : "text";

  icone.classList.toggle("fa-lock", !estaVisivel);
  icone.classList.toggle("fa-unlock", estaVisivel);
  icone.setAttribute("aria-pressed", String(!estaVisivel));
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-toggle-senha]").forEach((icone) => {
    icone.addEventListener("click", () => alternarVisibilidadeSenha(icone));
  });

  const signUpButton = document.getElementById("signUp");
  const signInButton = document.getElementById("signIn");
  const container = document.getElementById("container");

  if (signUpButton && signInButton && container) {
    signUpButton.addEventListener("click", () => {
      container.classList.add("right-panel-active");
    });

    signInButton.addEventListener("click", () => {
      container.classList.remove("right-panel-active");
    });
  }

  verificarSessao();
});

function verificarSessao() {
  fetch("/me", { credentials: "same-origin" })
    .then((resposta) => {
      if (resposta.status === 200) {
        window.location.href = "/painel";
      }
    })
    .catch((erro) => console.error("Falha ao verificar a sessão:", erro));
}
