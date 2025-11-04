import axios from "axios";
export async function askOllama(question, context = "") {
  try {
    const response = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model: "gemma:2b",
        prompt: `
You are an AI Property Assistant for MeetOwner.
Context from DB:
${context}
Question: ${question}
Respond:
- List 3-5 matching properties in bullet points (name, BHK, price, location).
- If no exact matches, suggest alternatives (e.g., "Try 2BHK in nearby areas").
- Keep under 200 words, friendly and concise.
        `,
        stream: false,
        options: {
          timeout: 5000,
        },
      },
      { timeout: 10000 }
    );
    return response.data.response;
  } catch (error) {
    console.error("Ollama API Error:", error);
    return "Sorry, I'm having trouble processing that right now. Try again soon!";
  }
}
