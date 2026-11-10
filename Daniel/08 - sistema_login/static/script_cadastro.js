const nome = document.getElementById("nome_cadastro")
const email = document.getElementById("email_cadastro")
const senha = document.getElementById("senha_cadastro")
const senha_confirmar = document.getElementById("senha_cadastro_confirmar")

const form = document.getElementById("form-cadastro")
const msg_cadastro = document.getElementById("msg_cadastro")

form.addEventListener('submit', entrar)

async function entrar(evento) {
    evento.preventDefault()

    try{

        if(senha.value != senha_confirmar.value){
            msg_cadastro.textContent = "Senhas não são compativeis"
            msg_cadastro.style.color = "red"
            throw new Error("Senhas não são iguais")
        }

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
        msg_cadastro.textContent = "Cadastro feito!!, faça seu login"
        msg_cadastro.style.color = "green"
    }catch{
        console.log(Error)
    }
}