document.getElementById('cep_usuario').addEventListener('blur',function (){

    let cep = this.value.replace();

    if (cep.length === 8){

        let url = `https://viacep.com.br/ws/${cep}/json/`;

        fetch(url)
            .then(resposta => resposta.json())
            .then(dados => {

                console.log(dados);

                if (!dados.erro){
                    document.getElementById('endereco_usuario').value = dados.logradouro;
                    document.getElementById('complemento').value = dados.complemento;
                    document.getElementById('bairro').value = dados.bairro;
                }

                else{
                    alert("CEP não encontrado!");
                }

            });

    }

});