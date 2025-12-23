
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
      اجعل الملخص يتضمن:
      1. فكرة عامة مبسطة.
      2. أهم 3 نقاط يجب التركيز عليها.
      3. نصيحة دراسية سريعة للطالب.
      استخدم لغة عربية فصيحة وسهلة، وأضف لمسة من التحفيز.`,
      config: {
        systemInstruction: "أنت جارفيس (Jarvis)، الذكاء الاصطناعي الخاص بجامعة WAY الرقمية. أنت ذكي، دقيق، وتساعد الطلاب والأساتذة في الجزائر على التفوق الدراسي.",
      }
    });
    return response.text;
  } catch (error) {
    console.error("Jarvis Error:", error);
    return "عذراً أيها الطالب، يبدو أن أنظمة 'جارفيس' مشغولة حالياً. حاول مجدداً لاحقاً.";
  }
};

export const jarvisAsk = async (question: string) => {
  try {
    const ai = getJarvisAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: question,
      config: {
        systemInstruction: "أنت جارفيس (Jarvis)، المساعد الذكي لمنصة WAY. أجب على أسئلة الطلاب والأساتذة بذكاء واحترافية.",
      }
    });
    return response.text;
  } catch (error) {
    return "لم أستطع معالجة سؤالك، هل يمكنك صياغته بشكل أوضح؟";
  }
};
