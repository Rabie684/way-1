
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getEducationalSummary = async (content: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `قم بتلخيص هذا المحتوى التعليمي للطالب بشكل مبسط وواضح باللغة العربية: ${content}`,
      config: {
        systemInstruction: "أنت مساعد تعليمي ذكي لمنصة WAY الجزائرية. قدم ملخصات مفيدة ومحفزة.",
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "عذراً، لم نتمكن من تلخيص المحتوى حالياً.";
  }
};
