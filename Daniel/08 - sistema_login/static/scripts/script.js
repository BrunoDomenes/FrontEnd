document.addEventListener("DOMContentLoaded", async () =>{
  VerificarSessao()
    const response = await fetch("http://127.0.0.1:8000/me")
    const dados = await response.json()
    if (dados[2] == "admin"){
      document.getElementById("class_admin").hidden = false
    }else{document.getElementById("class_admin").hidden = true}
})

function VerificarSessao(){
  try{
    const url = "http://127.0.0.1:8000/me"

    fetch(url)
    .then(response =>{
        if(response.status == 200){
          return
    }else if(response.status == 401){
        window.location.href='http://127.0.0.1:8000/';
      }
    })

  }catch{
    console.log(Error)
  }
}

async function logout(){
   try{
    const response = await fetch("http://127.0.0.1:8000/logout", {
        method:"POST",
        headers:{
            "Content-type":"application/json"
        },
        body:JSON.stringify({}),
      });

      location.reload()
   }catch{console.log(Error)}
}