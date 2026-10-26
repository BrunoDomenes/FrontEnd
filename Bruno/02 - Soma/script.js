function somar(){

    let caixa1 = Number(document.getElementById("numero_1").value);

    let caixa2 = Number(document.getElementById("numero_2").value);

    let total = caixa1 + caixa2;

    document.getElementById("resultado").innerText = 
    `O resultado é: ${total}`;
}

function sub(){

    let caixa1 = Number(document.getElementById("numero_1").value);

    let caixa2 = Number(document.getElementById("numero_2").value);

    let total = caixa1 - caixa2;

    document.getElementById("resultado").innerText = 
    `O resultado é: ${total}`;
}

function multi(){

    let caixa1 = Number(document.getElementById("numero_1").value);

    let caixa2 = Number(document.getElementById("numero_2").value);

    let total = caixa1 * caixa2;

    document.getElementById("resultado").innerText = 
    `O resultado é: ${total}`;
}

function div(){

    let caixa1 = Number(document.getElementById("numero_1").value);

    let caixa2 = Number(document.getElementById("numero_2").value);

    let total = caixa1 / caixa2;

    document.getElementById("resultado").innerText = 
    `O resultado é: ${total}`;

    
}