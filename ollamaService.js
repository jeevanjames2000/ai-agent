// ollamaService.js (optimized with timeout and leaner prompt)
import axios from "axios";

export async function askOllama(question, context = "") {
  try {
    const response = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model: "gemma:2b", // Switch to 'phi3:mini' for 20-30% faster if accuracy OK
        prompt: `
You are a concise AI Property Assistant for MeetOwner.

DB Context:
${context}

Question: ${question}

Reply briefly (100 words max):
- Bullet list 3-5 properties (name, BHK, price, address).
- If no matches, suggest: "Try 2BHK in Gachibowli or under 1Cr."
- Friendly, helpful.
        `,
        stream: false,
      },
      { timeout: 5000 } // 5s timeout to prevent hangs
    );

    return response.data.response || "No response from AI. Try again.";
  } catch (error) {
    console.error("Ollama API Error:", error.message);
    return "Sorry, I'm having trouble processing that right now. Try again soon!";
  }
}
