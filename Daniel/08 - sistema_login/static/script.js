function show_password(){
    const icon = document.getElementById("show-password")
    const password = document.getElementById("senha_user")

    if (icon.className == "bi bi-eye"){
        icon.className = "bi bi-eye-slash"
        password.type = "text"       
    }else{
        icon.className = "bi bi-eye" 
        password.type = "password"             
    }
}