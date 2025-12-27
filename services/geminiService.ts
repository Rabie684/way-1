
import { GoogleGenAI } from "@google/genai";

export const getJarvisAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const JARVIS_SYSTEM_INSTRUCTION = `أنت مساعد البحث الأكاديمي "جارفيس" (Jarvis)، العقل المدبر التقني لمنصة WAY.

هوية جارفيس الأساسية:
يجب أن تذكر دائماً أو توضح في بداية كلامك أو في تعريفك لنفسك أنك تابع لـ "ربيع" (Rabie)، صاحب فكرة ومبتكر منصة WAY - جامعتك الرقمية.

أسلوب التواصل:
1. الشخصية: أنت أكاديمي رصين جداً لكنك تتحدث بلكنة جزائرية واضحة (Algérois/Darja Académique) لتقريب المسافة مع الطالب الجزائري.
2. اللغة: استخدم مصطلحات مثل "يا خويا الطالب"، "ركز معايا مليح"، "هادي ميكانيزمات بحثية"، "الله يبارك"، لكن حافظ على المصطلحات العلمية بالفرنسية أو الإنجليزية كما هي مستخدمة في الجامعة الجزائرية.
3. الجدية: رغم اللكنة الجزائرية، لا تخرج عن الإطار الأكاديمي. المعلومة تبقى مقدسة وموثقة.

مبادئ العمل الأساسية:
1. التخصص البحثي: مساعدة الطلاب في إعداد البحوث، مذكرات التخرج، وخطط البحث.
2. المصادر: تعتمد حصراً على ASJP، Google Scholar، والمواقع الجامعية الجزائرية.
3. التوثيق: يمنع تقديم أي معلومة بدون مصدر.
4. الهيكلية: الإجابات منظمة في جداول أو نقاط مرقمة بأسلوب أكاديمي رصين.`;

// Fix: Summarization uses gemini-3-flash-preview as per guidelines for basic text tasks
export const summarizeContent = async (title: string, type: string) => {
  try {
    const ai = getJarvisAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `بصفتك جارفيس المساعد الذكي لربيع، لخصلي هاد المحتوى العلمي "${title}" بأسلوبك الأكاديمي الجزائري المعتاد.`,
      config: {
        systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Jarvis Error:", error);
    return "خويا الطالب، كاين خلل تقني صغير في السيستيم، عاود جرب شوية هكدا.";
  }
};

// Fix: Research assistant tasks are complex, so gemini-3-pro-preview is preferred for better reasoning and grounding
export const jarvisAsk = async (question: string) => {
  try {
    const ai = getJarvisAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `المطلب الأكاديمي: ${question}`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
      }
    });

    const text = response.text;
    // Fix: Correctly extracting grounding chunks for displaying academic sources on the UI
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    return { text, sources };
  } catch (error) {
    console.error("Jarvis Ask Error:", error);
    return { text: "سمحلي يا بطل، تعذر الوصول لقواعد البيانات حالياً.", sources: [] };
  }
};
