const txt_resultado = document.getElementById("resultado");
txt_resultado.style.color = "green"

function calcular() {
  const num1 = Number(document.getElementById("num1").value);
  const num2 = Number(document.getElementById("num2").value);
  const operador = Number(document.getElementById("operador").value);
  let msg = "";

  if (num1 == 0 || num2 == 0) {
    msg = "Error: Os valores são 0";
    txt_resultado.style.color = "red"
  }else{
    total = celebro(num1, num2, operador)
    msg = `O resultado: ${total}`
  }

  txt_resultado.textContent = msg;
}

function celebro(num1, num2, operador){
    if(operador == 0){
        return num1 + num2
    } else if(operador == 1){
        return num1 - num2
    } else if(operador == 2){
        return num1 / num2
    } else if (operador == 3){
        return num1 * num2
    }
}
