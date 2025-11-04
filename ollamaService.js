import axios from "axios";

export async function askOllama(question, context = "") {
  try {
    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "gemma:2b", // llama3 or mistral also works
      prompt: `
You are an AI Property Assistant for MeetOwner.
Below is the property data from the database.

${context}

User's Question:
${question}

Instructions:
- If properties exist in context, show them in a clear bullet-point format.
- Include property name, price, location, and BHK.
- If no matching properties exist, suggest nearby locations or alternative budget/BHK.
- Keep answers short and helpful.
      `,
      stream: false,
    });

    return response.data.response;
  } catch (error) {
    console.error("Ollama API Error:", error);
    throw new Error("AI service failed");
  }
}
