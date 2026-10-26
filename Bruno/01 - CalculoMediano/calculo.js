function calcularMediana() {
            
            let n1 = Number(document.getElementById('numero1').value);
            let n2 = Number(document.getElementById('numero2').value);
            let n3 = Number(document.getElementById('numero3').value);
            
            let mediana;

            
            if (n1 >= n2 && n1 <= n3) {
                mediana = n1;
            } 
            
            else if (n2 >= n1 && n2 <= n3) {
                mediana = n2;
            } 
            
            else {
                mediana = n3;
            }

            
            document.getElementById('resultado').innerText = "A mediana é: " + mediana;
        }