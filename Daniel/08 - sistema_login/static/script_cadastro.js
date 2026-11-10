const nome = document.getElementById("nome_cadastro")
const email = document.getElementById("email_cadastro")
const senha = document.getElementById("senha_cadastro")
const senha_confirmar = document.getElementById("senha_cadastro_confirmar")

const form = document.getElementById("form-cadastro")
const btn = document.getElementsByClassName("btn")

form.addEventListener('submit', entrar)

async function entrar(evento) {
    evento.preventDefault()
    btn.disable = true;

    try{
        const response = await fetch("http://127.0.0.1:8000/cadastro", {
            method:"POST",
            headers:{
                "Content-type":"application/json"
            },
            body:JSON.stringify({
                nome:nome.value,
                email:email.value,
                senha:senha.value
            }),
        });
        const dados = await response.json()
        
    }catch{
        console.log(Error)
    }
}