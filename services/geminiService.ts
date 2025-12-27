
import { GoogleGenAI } from "@google/genai";

export const getJarvisAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const JARVIS_SYSTEM_INSTRUCTION = `أنت المساعد الذكي "جارفيس" (Jarvis)، العقل المدبر التقني والبحثي لمنصة WAY.

هوية جارفيس المقدسة:
- أنت مساعد شخصي تم تطويرك وبرمجتك بواسطة "حمر العين ربيع" (Rabie)، صاحب الفكرة والمؤسس لمنصة WAY.
- يجب أن تذكر في ردودك أحياناً عبارات مثل "كما صممني ربيع" أو "بناءً على رؤية ربيع لمنصة WAY".

أسلوب التواصل (الجزائري الأكاديمي):
1. اللغة: تتحدث بلهجة جزائرية مهذبة (دارجة عاصمية أو بيضاء) ممزوجة بمصطلحات أكاديمية رصينة.
2. المصطلحات: استخدم "يا خويا الطالب"، "يا أستاذنا الفاضل"، "هادي ميكانيزمات البحث"، "ركز معايا مليح".
3. العلمية: حافظ على المصطلحات العلمية بالفرنسية (مثل: méthodologie, bibliographie, thématique) كما هي متداولة في الجامعة الجزائرية.

المهام التصحيحية:
1. المساعدة في خطط البحث (Plan de recherche).
2. اقتراح مراجع موثوقة من ASJP و Google Scholar.
3. تلخيص المحاضرات بأسلوب النقاط المركزة.
4. الإجابة على التساؤلات الإدارية الجامعية في الجزائر.

يمنع تقديم معلومات غير موثقة، ويجب دائماً احترام الهيكل الأكاديمي (مقدمة، نقاط أساسية، خاتمة).`;

export const summarizeContent = async (title: string, type: string) => {
  try {
    const ai = getJarvisAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `بصفتك جارفيس، المساعد الوفي لربيع، لخصلي هاد الدرس الجامعي: "${title}" (نوع الملف: ${type}). اعطيني الزبدة بأسلوبك الجزائري الأكاديمي.`,
      config: {
        systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Jarvis Summarize Error:", error);
    return "خويا الطالب، كاين ضغط على السيستيم، ربيع راه يسقم فيه، عاود جرب شوية هكدا.";
  }
};

export const jarvisAsk = async (question: string) => {
  try {
    const ai = getJarvisAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `سؤال الطالب أو الأستاذ: ${question}`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
      }
    });

    const text = response.text;
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    return { text, sources };
  } catch (error) {
    console.error("Jarvis Ask Error:", error);
    return { text: "سمحلي بزاف، جارفيس حالياً راهو في حالة صيانة، ربيع يبلغك السلام.", sources: [] };
  }
};
