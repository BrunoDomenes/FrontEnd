/**
 * Configuração única do WebUI.
 * Ajuste aqui a URL do Ollama, o modelo padrão e os limites do histórico.
 */
export const CONFIG = Object.freeze({
  ollamaUrl: "http://localhost:11434",
  defaultModel: "llama3.2",
  storageKey: "nexa.chat.v1",
  maxConversations: 50,
  historyWindow: 40,
  maxTitleLength: 60,
  // Deixe vazio para não enviar mensagem de sistema.
  systemPrompt: "",
});
