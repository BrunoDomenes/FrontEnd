document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("btn-logout")?.addEventListener("click", sair);

  try {
    const resposta = await fetch("/me", { credentials: "same-origin" });

    if (resposta.status === 401) {
      window.location.href = "/";
      return;
    }

    if (!resposta.ok) {
      return;
    }

    const dados = await resposta.json();
    const linkAdmin = document.getElementById("class_admin");
    if (linkAdmin) {
      linkAdmin.hidden = dados?.user?.perfil !== "admin";
    }
  } catch (erro) {
    console.error("Falha ao verificar a sessão:", erro);
  }
});

async function sair(evento) {
  evento.preventDefault();

  try {
    await fetch("/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{}",
    });
  } catch (erro) {
    console.error("Falha ao encerrar a sessão:", erro);
  } finally {
    window.location.href = "/";
  }
}
