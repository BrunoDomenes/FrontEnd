

function show_password(icon, num) {
  // const password = document.getElementById("senha_user");
  let password;

  if(num == 1){
    password = document.getElementById("senha_cadastro")
  }else if(num == 2){
    password = document.getElementById("senha_cadastro_confirmar")
  }else if(num == 3){
    password = document.getElementById("senha_login")
  }

  if (icon.className == "fa-solid fa-lock input-icon") {
    icon.className = "fa-solid fa-unlock input-icon";
    password.type = "text";
  } else {
    icon.className = "fa-solid fa-lock input-icon";
    password.type = "password";
  }
}

document.addEventListener('DOMContentLoaded', () => {
    VerificarSessao()
    const signUpButton = document.getElementById('signUp');
    const signInButton = document.getElementById('signIn');
    const container = document.getElementById('container');

    if (signUpButton && signInButton && container) {
        signUpButton.addEventListener('click', () => {
            container.classList.add("right-panel-active");
        });

        signInButton.addEventListener('click', () => {
            container.classList.remove("right-panel-active");
        });
    }
});

function VerificarSessao(){
  try{
    const url = "http://127.0.0.1:8000/me"

    fetch(url)
    .then(response =>{
      if(response.status == 200){
        window.location.href='/static/pages/index.html';
      }else if(response.status == 401){
        console.log("Realize login")
      }
    })

  }catch{
    console.log(Error)
  }

}