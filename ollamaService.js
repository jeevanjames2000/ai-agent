import axios from "axios";

export async function askOllama(question, context = "") {
  try {
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "gemma:2b",  // or "llama3", "mistral"
      prompt: `
You are a real estate assistant for MeetOwner.
Use the following context to answer accurately.

Context:
${context}

User Question:
${question}

Answer only with relevant property info.
`,
      stream: false,
    });

    return response.data.response;
  } catch (error) {
    console.error("Ollama API Error:", error);
    throw new Error("AI service failed");
  }
}
