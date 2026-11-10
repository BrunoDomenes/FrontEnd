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

document.addEventListener("DOMContentLoaded", () =>{
    VerificarSessao()
})