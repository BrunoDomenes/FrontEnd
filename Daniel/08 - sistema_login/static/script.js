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
