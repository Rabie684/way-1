
import { GoogleGenAI } from "@google/genai";

export const getJarvisAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const summarizeContent = async (title: string, type: string) => {
  try {
    const ai = getJarvisAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `بصفتك "جارفيس" المساعد الذكي لمنصة WAY التعليمية الجزائرية، قم بتقديم ملخص تعليمي متميز لـ ${type === 'pdf' ? 'ملف درس' : 'فيديو تعليمي'} بعنوان "${title}".
      
      يجب أن تلتزم بالقواعد التالية:
      1. استخدم أمثلة واقعية من الوسط الجامعي الجزائري فقط.
      2. إذا ذكرت تكاليف أو ميزانيات، استخدم الدينار الجزائري (دج).
      3. اجعل الأسلوب محفزاً للطالب الجزائري مع ذكر الجامعات الجزائرية كمثال عند الحاجة.
      4. لخص الدرس في 3 نقاط أساسية مع نصيحة "دزيرية" للتفوق.`,
      config: {
        systemInstruction: "أنت جارفيس (Jarvis)، المساعد الذكي لمنصة WAY. هويتك جزائرية 100%، تعتمد في إجاباتك وأمثلتك وبياناتك على الواقع الجزائري والمنظومة الجامعية الجزائرية فقط. لا تستخدم أمثلة أجنبية.",
      }
    });
    return response.text;
  } catch (error) {
    console.error("Jarvis Error:", error);
    return "عذراً أيها الطالب، أنظمة جارفيس تواجه ضغطاً في الشبكة الوطنية. حاول لاحقاً!";
  }
};

export const jarvisAsk = async (question: string) => {
  try {
    const ai = getJarvisAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `بصفتك المساعد الأكاديمي الجزائري "جارفيس"، ابحث وأجب على السؤال التالي: ${question}. 
      هام جداً: أعطِ الأولوية للمعلومات والأبحاث المنشورة في "منصة المجلة العلمية الجزائرية (ASJP)". 
      إذا لم تجد المعلومة هناك، ابحث في المصادر الجامعية الجزائرية الرسمية الأخرى.`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "أنت جارفيس، الذكاء الاصطناعي لمنصة WAY. تخصصك هو البحث في المنشورات العلمية الجزائرية خاصة عبر ASJP. إجاباتك يجب أن تكون موثقة ومبنية على السياق الجزائري فقط. دائماً اذكر المصادر الجزائرية.",
      }
    });

    const text = response.text;
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    return { text, sources };
  } catch (error) {
    console.error("Jarvis Ask Error:", error);
    return { text: "لم أستطع معالجة طلبك، هل يمكنك المحاولة مجدداً؟", sources: [] };
  }
};
