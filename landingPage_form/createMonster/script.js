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

// Tabelas do sistema (dados, não código espalhado)
const RARIDADES = {
    comum: { label: "Comum", mult: 1 },
    raro: { label: "Raro", mult: 1.3 },
    epico: { label: "Épico", mult: 1.6 },
    lendario: { label: "Lendário", mult: 2 }
};

const ELEMENTOS = {
    fogo: "Fogo",
    agua: "Água",
    sombra: "Sombra",
    codigo: "Código",
    rede: "Rede"
};

// Cada elemento é forte contra um outro (dano dobrado)
const FORTE_CONTRA = {
    fogo: "rede",
    rede: "sombra",
    sombra: "codigo",
    codigo: "agua",
    agua: "fogo"
};

const TIPOS = {
    besta: "Besta",
    "morto-vivo": "Morto-vivo",
    constructo: "Constructo",
    demonio: "Demônio",
    humanoide: "Humanoide",
    entidade: "Entidade digital"
};

const TAMANHOS = {
    minusculo: "Minúsculo",
    pequeno: "Pequeno",
    medio: "Médio",
    grande: "Grande",
    enorme: "Enorme",
    colossal: "Colossal"
};

const TIPOS_CHAVES = Object.keys(TIPOS);
const TAMANHOS_CHAVES = Object.keys(TAMANHOS);

const EFEITOS = {
    nenhum: "Nenhum",
    veneno: "Veneno",
    atordoar: "Atordoar",
    queimar: "Queimar"
};

const SAVE_VERSION = 1;

// Geração combinatória de monstros (milhares de combinações únicas)
const NOME_PREFIXOS = ["Bug", "Verme", "Goblin", "Troll", "Espectro", "Dragão", "Mímico", "Aranha", "Enxame", "Horror", "Sentinela", "Parasita", "Flagelo", "Pesadelo"];

const NOME_NUCLEOS = ["Cego", "Corrompido", "Infinito", "Oculto", "Quebrado", "Anômalo", "Glitchado", "Sombrio", "Faminto", "Silencioso", "Replicante", "Enferrujado", "Vazado", "Travado", "Criptografado", "Sobrecarregado", "Fraturado", "Infectado", "Defeituoso", "Overclockado"];

const NOME_SUFIXOS = ["do Servidor", "do Cache", "do Kernel", "da Rede", "do Deploy", "do Banco de Dados", "do Firewall", "da Lixeira", "do Log", "da Nuvem", "do Terminal", "da Porta 666", "do Lixão Digital", "da Dark Web"];

const NOME_EPITETOS = ["o Devorador", "o Invisível", "o Eterno", "o Esquecido", "o Vigilante", "o Paciente", "o Voraz", "o Eco", "o Zero", "o Sussurro", "o Fragmento", "o Enigma"];

const DESC_CRIATURAS = ["inseto", "goblin", "verme", "espectro", "enxame", "constructo", "parasita", "sentinela"];

const DESC_MATERIAIS = ["código corrompido", "cabos expostos", "placas enferrujadas", "logs de erro", "memória vazada", "fragmentos de kernel", "metal retorcido", "dados criptografados"];

const DESC_COMPORTAMENTOS = ["se esconde nos logs", "devora memória livre", "repete o mesmo ataque até travar", "imita processos legítimos", "suga largura de banda", "corrompe arquivos ao redor", "se multiplica a cada turno", "apaga as luzes antes de atacar"];

const DESC_LUGARES = ["nas profundezas da rede", "nos corredores do servidor", "no porão do datacenter", "entre os backups esquecidos", "na lixeira do sistema", "sob o piso falso da sala de máquinas"];

const DESC_MOLDES = [
    "Um {criatura} feito de {material} que {comportamento} {lugar}.",
    "Nascido de {material}, este {criatura} {comportamento} {lugar}.",
    "Dizem que {lugar}, um {criatura} feito de {material} {comportamento}.",
    "Metade {criatura}, metade {material}. Ele {comportamento} {lugar}.",
    "Um {criatura} costurado com {material} que {comportamento} {lugar}.",
    "Veio de {lugar}: um {criatura} de {material} que {comportamento}."
];

const ATAQUE_A = ["Loop", "Null", "Stack", "Kernel", "Memory", "Packet", "Crypto", "Daemon", "Overflow", "Sombra"];

const ATAQUE_B = ["Infinito", "Pointer", "Profundo", "Panic", "Leak", "Storm", "Miner", "Surge", "Crash", "Sniffer"];

const APAR_MOLDES = [
    "Corpo de {mat} com {parte} à mostra.",
    "Silhueta de {mat} envolta em {detalhe}.",
    "{parte} de {mat} com {detalhe} por toda parte.",
    "Carapaça de {mat}; {parte} emitem {detalhe}."
];

const APAR_MAT = ["cabos", "placas enferrujadas", "LEDs vermelhos", "ventoinhas quebradas", "fios de fibra ótica", "teclas de teclado"];

const APAR_PARTES = ["nervos", "juntas", "olhos", "mandíbulas", "espinhas", "antenas"];

const APAR_DETALHES = ["fumaça digital", "faíscas constantes", "glitches de vídeo", "cheiro de queimado", "pulsos de luz azul", "óleo escuro"];

// Faixas de atributos por arquétipo (coerência em vez de tudo plano)
const ARQUETIPOS = [
    { for: [6, 12], agi: [4, 10], int: [4, 10], vit: [14, 22] },   // tanque
    { for: [6, 12], agi: [14, 22], int: [6, 12], vit: [6, 12] },   // veloz
    { for: [14, 22], agi: [6, 12], int: [4, 10], vit: [10, 16] },  // brutamontes
    { for: [4, 10], agi: [6, 12], int: [14, 22], vit: [6, 12] }    // anômalo
];

const TATICAS = [
    "Ataca primeiro os alvos mais fracos e recua quando cercado.",
    "Finge estar inativo até um herói se aproximar.",
    "Concentra ataques em quem usa magia ou tecnologia.",
    "Divide-se em cópias menores ao perder metade da vida.",
    "Protege o terminal central e só sai de perto dele se provocado.",
    "Alterna entre ataques rápidos e uma sobrecarga devastadora."
];

const HABILIDADES_BANCO = [
    "Ocultação de Processo: se esconde no sistema; o próximo ataque contra ela falha.",
    "Privilege Escalation: força um herói a atacar um aliado no próximo turno.",
    "Modo Kernel: sacrifica defesa para dobrar o dano por 2 turnos.",
    "Dreno de Mana: rouba energia de quem o atacar corpo a corpo.",
    "Replicar: cria uma cópia fraca de si mesmo uma vez por batalha.",
    "Tela Azul: atordoa os inimigos próximos por 1 turno (1 vez por batalha).",
    "Backup Sombrio: ao ser derrotado, volta com 25% da vida uma vez.",
    "Pacote Perdido: projéteis têm 20% de chance de atravessar armaduras."
];

function preencherMolde(molde, mapa) {
    return molde.replace(/\{(\w+)\}/g, (m, chave) => sortear(mapa[chave]));
}

function maiuscula(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function montarNome() {
    let nome = sortear(NOME_PREFIXOS) + " " + sortear(NOME_NUCLEOS) + " " + sortear(NOME_SUFIXOS);
    if (Math.random() < 0.6) {
        nome += ", " + sortear(NOME_EPITETOS);
    }
    return nome;
}

function montarDescricao() {
    return maiuscula(preencherMolde(sortear(DESC_MOLDES), {
        criatura: DESC_CRIATURAS, material: DESC_MATERIAIS,
        comportamento: DESC_COMPORTAMENTOS, lugar: DESC_LUGARES
    }));
}

function montarAtaque() {
    return sortear(ATAQUE_A) + " " + sortear(ATAQUE_B);
}

function montarAparencia() {
    return maiuscula(preencherMolde(sortear(APAR_MOLDES), {
        mat: APAR_MAT, parte: APAR_PARTES, detalhe: APAR_DETALHES
    }));
}

function sortearHabilidades() {
    const copia = HABILIDADES_BANCO.slice();
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = copia[i];
        copia[i] = copia[j];
        copia[j] = tmp;
    }
    return copia.slice(0, numeroAleatorio(1, 2));
}

const ELEMENTOS_CHAVES = Object.keys(ELEMENTOS);
const RARIDADE_PESOS = ["comum", "comum", "comum", "raro", "raro", "epico", "lendario"];
const EFEITOS_CHAVES = Object.keys(EFEITOS);
const DADOS = ["D6", "D12", "D20"];

function sortear(lista) {
    return lista[Math.floor(Math.random() * lista.length)];
}

function numeroAleatorio(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function lerNumero(id, padrao, min, max) {
    const valor = parseInt(document.getElementById(id).value, 10);
    if (isNaN(valor)) return padrao;
    return Math.min(Math.max(valor, min), max);
}

// Evita que texto digitado quebre o HTML da ficha
function esc(texto) {
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// Stats derivados: recalculados sempre a partir da base (nunca salvos como verdade)
function derive(base, nivel, multRaridade) {
    const multNivel = 1 + (nivel - 1) * 0.15;
    return {
        maxHp: Math.round((20 + base.vit * 8) * multNivel * multRaridade),
        ataque: Math.round(base.for * 2 * multNivel * multRaridade),
        defesa: Math.round((base.vit + base.agi * 0.5) * multNivel * multRaridade),
        crit: Math.min(0.05 + base.agi * 0.005, 0.5),
        velocidade: base.agi
    };
}

function coletarDados() {
    const nivel = lerNumero("nivel-monstro", 1, 1, 20);
    const raridade = document.getElementById("raridade-monstro").value;
    return {
        nome: document.getElementById("nome-monstro").value.trim(),
        descricao: document.getElementById("descricao-monstro").value.trim(),
        aparencia: document.getElementById("aparencia-monstro").value.trim(),
        tatica: document.getElementById("tatica-monstro").value.trim(),
        nivel: nivel,
        raridade: raridade,
        elemento: document.getElementById("elemento-monstro").value,
        tipo: document.getElementById("tipo-monstro").value,
        tamanho: document.getElementById("tamanho-monstro").value,
        base: {
            for: lerNumero("for-monstro", 10, 1, 30),
            agi: lerNumero("agi-monstro", 10, 1, 30),
            int: lerNumero("int-monstro", 10, 1, 30),
            vit: lerNumero("vit-monstro", 10, 1, 30)
        },
        ataques: [1, 2, 3].map((i) => ({
            nome: document.getElementById("nome-ataque" + i).value.trim() || "Ataque " + i,
            dano: lerNumero("dano-ataque" + i, 10, 0, 999),
            efeito: document.getElementById("efeito-ataque" + i).value
        })),
        habilidades: document.getElementById("habilidades-monstro").value.split("\n").map((h) => h.trim()).filter((h) => h.length > 0),
        combate: {
            dado: document.getElementById("dado-usado").value,
            minimo: lerNumero("minimo-acerto", 12, 1, 20)
        },
        espolio: {
            xp: lerNumero("xp-monstro", 100, 0, 9999),
            ouro: lerNumero("ouro-monstro", 50, 0, 9999)
        }
    };
}

function renderFicha(dados) {
    const derivados = derive(dados.base, dados.nivel, RARIDADES[dados.raridade].mult);
    const forteContra = ELEMENTOS[FORTE_CONTRA[dados.elemento]];
    const critPct = Math.round(derivados.crit * 100);

    const ataquesHtml = dados.ataques.map((a) => {
        const poder = a.dano + derivados.ataque;
        const efeito = a.efeito === "nenhum" ? "" : " · " + EFEITOS[a.efeito];
        return "<li><strong>" + esc(a.nome) + "</strong> — dano " + a.dano + " + " + derivados.ataque + " de ataque = " + poder + efeito + "</li>";
    }).join("");

    document.getElementById("ficha-conteudo").innerHTML =
        "<h3>" + esc(dados.nome || "Monstro sem nome") + "</h3>" +
        "<p class=\"ficha-linha\">Nv " + dados.nivel + " · " + RARIDADES[dados.raridade].label + " · " + ELEMENTOS[dados.elemento] + " · " + (TIPOS[dados.tipo] || "Desconhecido") + " " + (TAMANHOS[dados.tamanho] || "Médio") + " (forte contra " + forteContra + ")</p>" +
        (dados.descricao ? "<p class=\"ficha-descricao\">" + esc(dados.descricao) + "</p>" : "") +
        (dados.aparencia ? "<h4>Aparência física</h4><p class=\"ficha-descricao\">" + esc(dados.aparencia) + "</p>" : "") +
        "<div class=\"stats\">" +
        "<div class=\"stat\"><strong>" + derivados.maxHp + "</strong><span>HP máx</span></div>" +
        "<div class=\"stat\"><strong>" + derivados.ataque + "</strong><span>Ataque</span></div>" +
        "<div class=\"stat\"><strong>" + derivados.defesa + "</strong><span>Defesa</span></div>" +
        "<div class=\"stat\"><strong>" + critPct + "%</strong><span>Crítico</span></div>" +
        "<div class=\"stat\"><strong>" + derivados.velocidade + "</strong><span>Velocidade</span></div>" +
        "</div>" +
        "<ul class=\"ficha-ataques\">" + ataquesHtml + "</ul>" +
        "<p class=\"ficha-regra\">Dado " + esc(dados.combate.dado) + " · acerta com " + dados.combate.minimo + " ou mais.</p>" +
        "<p class=\"ficha-regra\">Fórmula: dano = dano do ataque + ataque − defesa do alvo (mínimo 1), crítico 1,5×, variação ±10%, vantagem elemental 2× / 1× / 0,5×.</p>";

    document.getElementById("ficha-resultado").hidden = false;
    return derivados;
}

// Preenchimento automático de um monstro aleatório
function preencherAleatorio() {
    const campoNome = document.getElementById("nome-monstro");
    let nome = montarNome();
    for (let t = 0; t < 10 && nome === campoNome.value; t++) {
        nome = montarNome();
    }
    campoNome.value = nome;
    document.getElementById("descricao-monstro").value = montarDescricao();
    document.getElementById("aparencia-monstro").value = montarAparencia();
    document.getElementById("tatica-monstro").value = sortear(TATICAS);
    document.getElementById("habilidades-monstro").value = sortearHabilidades().join("\n");
    document.getElementById("nivel-monstro").value = numeroAleatorio(1, 10);
    document.getElementById("raridade-monstro").value = sortear(RARIDADE_PESOS);
    document.getElementById("elemento-monstro").value = sortear(ELEMENTOS_CHAVES);
    document.getElementById("tipo-monstro").value = sortear(TIPOS_CHAVES);
    document.getElementById("tamanho-monstro").value = sortear(TAMANHOS_CHAVES);

    const arquetipo = sortear(ARQUETIPOS);
    document.getElementById("for-monstro").value = numeroAleatorio(arquetipo.for[0], arquetipo.for[1]);
    document.getElementById("agi-monstro").value = numeroAleatorio(arquetipo.agi[0], arquetipo.agi[1]);
    document.getElementById("int-monstro").value = numeroAleatorio(arquetipo.int[0], arquetipo.int[1]);
    document.getElementById("vit-monstro").value = numeroAleatorio(arquetipo.vit[0], arquetipo.vit[1]);

    document.getElementById("nome-ataque1").value = montarAtaque();
    document.getElementById("dano-ataque1").value = numeroAleatorio(10, 40);
    document.getElementById("efeito-ataque1").value = sortear(EFEITOS_CHAVES);
    document.getElementById("nome-ataque2").value = montarAtaque();
    document.getElementById("dano-ataque2").value = numeroAleatorio(15, 60);
    document.getElementById("efeito-ataque2").value = sortear(EFEITOS_CHAVES);
    document.getElementById("nome-ataque3").value = montarAtaque();
    document.getElementById("dano-ataque3").value = numeroAleatorio(10, 50);
    document.getElementById("efeito-ataque3").value = sortear(EFEITOS_CHAVES);

    document.getElementById("dado-usado").value = sortear(DADOS);
    document.getElementById("minimo-acerto").value = numeroAleatorio(8, 16);

    const nivelSorteado = parseInt(document.getElementById("nivel-monstro").value, 10) || 1;
    const multSorteada = RARIDADES[document.getElementById("raridade-monstro").value].mult;
    document.getElementById("xp-monstro").value = Math.round(50 * nivelSorteado * multSorteada);
    document.getElementById("ouro-monstro").value = Math.round(10 * nivelSorteado * multSorteada);
}

document.getElementById("btn-aleatorio").addEventListener("click", preencherAleatorio);

// Gerar a ficha visível (sem recarregar a página)
let ultimaFicha = null;

document.getElementById("form-monstro").addEventListener("submit", (event) => {
    event.preventDefault();
    const dados = coletarDados();
    const derivados = renderFicha(dados);
    ultimaFicha = { version: SAVE_VERSION, id: Date.now(), dados: dados, derivados: derivados };
    document.getElementById("ficha-resultado").scrollIntoView();
});

// Exportação da ficha em Markdown
const DADO_LABEL = {
    D6: "Dado de 6 faces (D6)",
    D12: "Dado de 12 faces (D12)",
    D20: "Dado de 20 faces (D20)"
};

function rotularDefesa(defesa) {
    if (defesa < 15) return "Baixa";
    if (defesa < 30) return "Média";
    return "Alta";
}

function textoEfeito(efeito, poder, elemento) {
    const base = "Causa " + poder + " de dano de " + elemento.toLowerCase();
    if (efeito === "veneno") return base + " e envenena o alvo, que perde vida por 3 turnos.";
    if (efeito === "atordoar") return base + " e atordoa o alvo, que perde o próximo turno.";
    if (efeito === "queimar") return base + " e queima o alvo, que sofre dano contínuo por 2 turnos.";
    return base + ".";
}

function nivelDesafio(der) {
    const pontos = der.maxHp + der.ataque * 8 + der.defesa * 4;
    if (pontos < 200) return "Trivial";
    if (pontos < 450) return "Comum";
    if (pontos < 900) return "Ameaçador";
    if (pontos < 1600) return "Perigoso";
    if (pontos < 3000) return "Mortal";
    return "Lendário";
}

function chanceAcerto(combate) {
    const faces = { D6: 6, D12: 12, D20: 20 }[combate.dado];
    return Math.min(100, Math.max(0, Math.round((faces - combate.minimo + 1) / faces * 100)));
}

function gerarMarkdown(ficha) {
    const dados = ficha.dados;
    const rar = RARIDADES[dados.raridade];
    const der = derive(dados.base, dados.nivel, rar.mult);
    const elemento = ELEMENTOS[dados.elemento];
    const fracoContra = ELEMENTOS[Object.keys(FORTE_CONTRA).find((k) => FORTE_CONTRA[k] === dados.elemento)];
    const esp = dados.espolio || { xp: 100, ouro: 50 };
    const critPct = Math.round(der.crit * 100);
    const tipo = TIPOS[dados.tipo] || "Desconhecido";
    const tamanho = TAMANHOS[dados.tamanho] || "Médio";
    const tatica = dados.tatica || "";
    const habilidades = dados.habilidades || [];

    const linhas = ["# " + (dados.nome || "Monstro sem nome"), ""];
    linhas.push("> Nv " + dados.nivel + " · " + rar.label + " (×" + String(rar.mult).replace(".", ",") + ") · " + elemento + " · " + tipo + " " + tamanho + " · Desafio: " + nivelDesafio(der) + " · forte contra " + ELEMENTOS[FORTE_CONTRA[dados.elemento]] + ", fraco contra " + fracoContra, "");
    if (dados.descricao) linhas.push(dados.descricao, "");
    if (dados.aparencia) linhas.push("### Aparência Física", "", dados.aparencia, "");
    linhas.push(
        "### Status", "",
        "| Status | Valor |",
        "| --- | --- |",
        "| 💖 Vida (HP) | " + der.maxHp + " |",
        "| 🛡️ Defesa | " + der.defesa + " (" + rotularDefesa(der.defesa) + ") |",
        "| Ataque | " + der.ataque + " |",
        "| Crítico | " + critPct + "% (dano 1,5×) |",
        "| Velocidade | " + der.velocidade + " |",
        "", "### Atributos Base", "",
        "| FOR | AGI | INT | VIT |",
        "| --- | --- | --- | --- |",
        "| " + dados.base.for + " | " + dados.base.agi + " | " + dados.base.int + " | " + dados.base.vit + " |",
        "", "### Ataques e Habilidades", ""
    );
    dados.ataques.forEach((a) => {
        const poder = a.dano + der.ataque;
        const medio = Math.round(poder * (1 + der.crit * 0.5));
        linhas.push("* **" + a.nome + ":** " + textoEfeito(a.efeito, poder, elemento) + " (média ~" + medio + " com crítico)");
    });
    if (habilidades.length > 0) {
        linhas.push("", "### Habilidades Especiais", "");
        habilidades.forEach((h) => linhas.push("* " + h));
    }
    if (tatica) linhas.push("", "### Tática", "", tatica);
    linhas.push("", "### Resistências", "", "| Elemento | Dano recebido |", "| --- | --- |");
    ELEMENTOS_CHAVES.forEach((el) => {
        let mult = "1×";
        if (el === dados.elemento) mult = "0,5×";
        else if (FORTE_CONTRA[el] === dados.elemento) mult = "2×";
        linhas.push("| " + ELEMENTOS[el] + " | " + mult + " |");
    });
    linhas.push(
        "", "### Espólio", "",
        "* XP: " + esp.xp + " · Ouro: " + esp.ouro,
        "", "---", "", "# Como Funciona a Batalha", "",
        "1. O combate é em turnos.",
        "2. Para atacar, jogue um " + DADO_LABEL[dados.combate.dado] + ".",
        "3. Se tirar " + dados.combate.minimo + " ou mais, o ataque acerta! (chance de " + chanceAcerto(dados.combate) + "%)"
    );
    return linhas.join("\n");
}

function baixarArquivo(nome, conteudo, tipo) {
    const blob = new Blob([conteudo], { type: tipo });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    a.click();
    URL.revokeObjectURL(a.href);
}

function exportarMarkdown(ficha) {
    baixarArquivo((ficha.dados.nome || "monstro") + ".md", gerarMarkdown(ficha), "text/markdown");
}

// Salvar / carregar / excluir / exportar fichas
function carregarFichas() {
    try {
        const lista = JSON.parse(localStorage.getItem("fichas"));
        return Array.isArray(lista) ? lista.filter((f) => f && f.version === SAVE_VERSION && f.dados) : [];
    } catch (e) {
        return [];
    }
}

function guardarFichas(lista) {
    localStorage.setItem("fichas", JSON.stringify(lista));
}

function preencherFormulario(dados) {
    document.getElementById("nome-monstro").value = dados.nome;
    document.getElementById("descricao-monstro").value = dados.descricao;
    document.getElementById("aparencia-monstro").value = dados.aparencia || "";
    document.getElementById("tatica-monstro").value = dados.tatica || "";
    document.getElementById("habilidades-monstro").value = (dados.habilidades || []).join("\n");
    document.getElementById("nivel-monstro").value = dados.nivel;
    document.getElementById("raridade-monstro").value = dados.raridade;
    document.getElementById("elemento-monstro").value = dados.elemento;
    document.getElementById("tipo-monstro").value = dados.tipo || "entidade";
    document.getElementById("tamanho-monstro").value = dados.tamanho || "medio";
    document.getElementById("for-monstro").value = dados.base.for;
    document.getElementById("agi-monstro").value = dados.base.agi;
    document.getElementById("int-monstro").value = dados.base.int;
    document.getElementById("vit-monstro").value = dados.base.vit;
    dados.ataques.forEach((a, i) => {
        const n = i + 1;
        document.getElementById("nome-ataque" + n).value = a.nome;
        document.getElementById("dano-ataque" + n).value = a.dano;
        document.getElementById("efeito-ataque" + n).value = a.efeito;
    });
    document.getElementById("dado-usado").value = dados.combate.dado;
    document.getElementById("minimo-acerto").value = dados.combate.minimo;
    document.getElementById("xp-monstro").value = dados.espolio ? dados.espolio.xp : 100;
    document.getElementById("ouro-monstro").value = dados.espolio ? dados.espolio.ouro : 50;
}

function renderLista() {
    const lista = carregarFichas();
    const ul = document.getElementById("lista-fichas");
    if (lista.length === 0) {
        ul.innerHTML = "<li class=\"vazio\">Nenhuma ficha salva ainda.</li>";
        return;
    }
    ul.innerHTML = "";
    lista.forEach((ficha) => {
        const li = document.createElement("li");
        li.className = "ficha-item";
        li.innerHTML =
            "<div class=\"info\"><strong>" + esc(ficha.dados.nome || "Monstro sem nome") + "</strong>" +
            "<span>Nv " + ficha.dados.nivel + " · " + RARIDADES[ficha.dados.raridade].label + " · " + ELEMENTOS[ficha.dados.elemento] + "</span></div>" +
            "<div class=\"acoes\"></div>";
        const acoes = li.querySelector(".acoes");

        const btnCarregar = document.createElement("button");
        btnCarregar.type = "button";
        btnCarregar.className = "mini-btn";
        btnCarregar.textContent = "Carregar";
        btnCarregar.addEventListener("click", () => {
            preencherFormulario(ficha.dados);
            ultimaFicha = ficha;
            renderFicha(ficha.dados);
            document.getElementById("ficha-resultado").scrollIntoView();
        });

        const btnExportar = document.createElement("button");
        btnExportar.type = "button";
        btnExportar.className = "mini-btn";
        btnExportar.textContent = "Exportar";
        btnExportar.addEventListener("click", () => {
            const blob = new Blob([JSON.stringify(ficha, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = (ficha.dados.nome || "monstro") + ".json";
            a.click();
            URL.revokeObjectURL(a.href);
        });

        const btnMarkdown = document.createElement("button");
        btnMarkdown.type = "button";
        btnMarkdown.className = "mini-btn";
        btnMarkdown.textContent = "MD";
        btnMarkdown.addEventListener("click", () => {
            exportarMarkdown(ficha);
        });

        const btnExcluir = document.createElement("button");
        btnExcluir.type = "button";
        btnExcluir.className = "mini-btn";
        btnExcluir.textContent = "Excluir";
        btnExcluir.addEventListener("click", () => {
            if (confirm("Excluir esta ficha?")) {
                guardarFichas(carregarFichas().filter((f) => f.id !== ficha.id));
                renderLista();
            }
        });

        acoes.append(btnCarregar, btnExportar, btnMarkdown, btnExcluir);
        ul.appendChild(li);
    });
}

document.getElementById("btn-salvar").addEventListener("click", (event) => {
    if (!ultimaFicha) return;
    const lista = carregarFichas();
    lista.push(ultimaFicha);
    guardarFichas(lista);
    renderLista();
    const btn = event.currentTarget;
    btn.textContent = "Ficha salva!";
    setTimeout(() => { btn.textContent = "Salvar ficha"; }, 2000);
});

document.getElementById("btn-exportar-md").addEventListener("click", () => {
    if (!ultimaFicha) return;
    exportarMarkdown(ultimaFicha);
});

renderLista();
