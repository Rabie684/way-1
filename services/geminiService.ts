
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
      contents: `أجب على السؤال التالي بصفتك خبيراً في التعليم العالي بالجزائر: ${question}
      
      تنبيه: اعتمد فقط على البيانات، القوانين، والأمثلة الجزائرية. إذا كان السؤال عاماً، أسقطه على الواقع الجزائري.`,
      config: {
        systemInstruction: "أنت جارفيس، الذكاء الاصطناعي لمنصة WAY. إجاباتك يجب أن تكون دقيقة ومبنية على السياق الجزائري فقط. تحدث بلهجة مثقفة تجمع بين الفصحى وبعض المصطلحات الجزائرية المفهومة تعليمياً.",
      }
    });
    return response.text;
  } catch (error) {
    return "لم أستطع معالجة طلبك، هل يمكنك المحاولة مجدداً؟";
  }
};
