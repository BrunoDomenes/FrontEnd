const jogador_01 = document.getElementById("jogador_01")
const jogador_02 = document.getElementById("jogador_02")

const btn_01 = document.getElementById("btn-01")
const btn_02 = document.getElementById("btn-02")

const msg = document.getElementById("msg")
const msg2 = document.getElementById("msg2")

const carta_01 = document.getElementById("carta-01")
const carta_02 = document.getElementById("carta-02")

if (jogador_01.value != "" && jogador_02.value != ""){
    btn_01.addEventListener("click", function(){consultar_api(1)})
    btn_02.addEventListener("click", function(){consultar_api(2)})
}


async function consultar_api(value_btn) {
    try{
        const resultado = await fetch("https://deckofcardsapi.com/api/deck/new/draw/?count=2")
        const dados = await resultado.json()
        const carta_01_api = dados.cards[0]
        const carta_02_api = dados.cards[1]

        if(value_btn==1){
            carta_01.src = carta_01_api.image
            carta_01.hidden = false
            carta_01.alt = alterar_valor(carta_01_api.value)

            msg.textContent = `${jogador_01.value} Jogou!!`
        }else if(value_btn==2){
            carta_02.src = carta_02_api.image
            carta_02.hidden = false
            carta_02.alt = alterar_valor(carta_02_api.value)

            msg.textContent = `${jogador_02.value} Jogou!!`
        }
        msg.style.color = "green"

        if(carta_01.hidden == false && carta_02.hidden == false){
            combate(carta_01.alt, carta_02.alt)
        }
    }catch (erro){
        msg.textContent = "Não foi possível identificar o error"
        msg.style.color = "red"
    }
}

function alterar_valor(carta_value){
    let valor;
    if(carta_value === "JACK"){
        valor=11;
    }else if(carta_value === "QUEEN"){
        valor=12;  
    }else if(carta_value === "KING"){
        valor=13;  
    }else if(carta_value === "ACE"){
        valor=1;  
    }else{
        valor = carta_value
    }
    return valor;
}


function combate(val_carta_01, val_carta_02){
    if ( val_carta_01 > val_carta_02){
        msg2.textContent = `${jogador_01.value} ganhou!!`
    }else if (val_carta_01 < val_carta_02){
        msg2.textContent = `${jogador_02.value} ganhou!!`
    }else if (val_carta_01 == val_carta_02){
        msg2.textContent = "Empate!!"
    }
    else{
        console.log("!!Error no calculo do combate!!")
    }
}