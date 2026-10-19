const resultado = document.getElementById("resultado");

function calcularMediana() {
  const num1 = Number(document.getElementById("num1").value);
  const num2 = Number(document.getElementById("num2").value);
  const num3 = Number(document.getElementById("num3").value);

  let mediana = 0;
  if (num1 > num2 && num1 < num3) {
    mediana = num1;
  } else if (num2 > num1 && num2 < num3) {
    mediana = num2;
  } else {
    mediana = num3;
  }

  resultado.innerText = `A mediana é: ${mediana}`;
}
