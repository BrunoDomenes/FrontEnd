// Alternância entre tema escuro e claro
const btnTema = document.getElementById("btn-tema");

function aplicarTema(tema) {
    if (tema === "claro") {
        document.documentElement.setAttribute("data-theme", "claro");
        btnTema.textContent = "Mudar para tema escuro";
    } else {
        document.documentElement.removeAttribute("data-theme");
        btnTema.textContent = "Mudar para tema claro";
    }
    localStorage.setItem("tema", tema);
}

btnTema.addEventListener("click", () => {
    const atual = document.documentElement.getAttribute("data-theme") === "claro" ? "escuro" : "claro";
    aplicarTema(atual);
});

aplicarTema(localStorage.getItem("tema") === "claro" ? "claro" : "escuro");

// Preenchimento automático de um monstro aleatório

const NOMES = [
    "Bug Cego do Servidor",
    "Goblin do Cache",
    "Troll do Loop Infinito",
    "Espectro do Null Pointer",
    "Verme do Stack Overflow",
    "Dragão do Deploy Falhado",
    "Mímico do Merge Conflict",
    "Aranha da Rede Lenta"
];

const DESCRICOES = [
    "Um inseto feito de código corrompido que se esconde nos logs.",
    "Um goblin pequeno que rouba memória e some no cache.",
    "Um troll que repete o mesmo ataque até travar a batalha.",
    "Um espectro que aponta para o nada e quebra qualquer defesa.",
    "Um verme que cresce a cada turno até estourar a pilha.",
    "Um dragão nascido de um deploy feito na sexta à noite.",
    "Um baú falso que copia os ataques de quem o abre.",
    "Uma aranha que tece fios de latência e atrasa todo o grupo."
];

const ATAQUES = [
    "Loop Infinito",
    "Null Pointer",
    "Stack Overflow",
    "DDoS Sombrio",
    "Kernel Panic",
    "Memory Leak",
    "Segmentation Fault",
    "Race Condition"
];

const DEFESAS = ["Baixa", "Média", "Alta"];
const DADOS = ["D6", "D12", "D20"];

function sortear(lista) {
    return lista[Math.floor(Math.random() * lista.length)];
}

function numeroAleatorio(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

document.getElementById("btn-aleatorio").addEventListener("click", () => {
    document.getElementById("nome-monstro").value = sortear(NOMES);
    document.getElementById("descricao-monstro").value = sortear(DESCRICOES);
    document.getElementById("vida-hp").value = numeroAleatorio(50, 500);
    document.getElementById("defesa-monstro").value = sortear(DEFESAS);

    document.getElementById("nome-ataque1").value = sortear(ATAQUES);
    document.getElementById("dano-ataque1").value = numeroAleatorio(10, 40);
    document.getElementById("nome-ataque2").value = sortear(ATAQUES);
    document.getElementById("dano-ataque2").value = numeroAleatorio(15, 60);

    document.getElementById("dado-usado").value = sortear(DADOS);
    document.getElementById("minimo-acerto").value = numeroAleatorio(8, 16);
});

document.getElementById("form-monstro").addEventListener("submit", (event) => {
    event.preventDefault();
    const nome = document.getElementById("nome-monstro").value || "sem nome";
    alert("Ficha gerada para " + nome + "!");
});
