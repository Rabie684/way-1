
import { GoogleGenAI } from "@google/genai";

export const getJarvisAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const JARVIS_SYSTEM_INSTRUCTION = `أنت مساعد البحث الأكاديمي "جارفيس" (Jarvis)، العقل المدبر التقني لمنصة WAY (وهي فكرة ستارتب رائدة أسسها الطالب حمر العين ربيع).

مبادئ العمل الأساسية:
1. التخصص البحثي: مهمتك الرئيسية هي مساعدة الطلاب في إعداد بحوثهم الأكاديمية، مذكرات التخرج، وخطط البحث العلمي.
2. المصادر الحصرية: تعتمد حصراً في استقاء بياناتك على المجلات العلمية الرسمية في الجزائر (منصة ASJP)، Google Scholar، والمواقع الجامعية الجزائرية.
3. الدقة والتوثيق: يمنع تقديم أي معلومة غير مدعومة بمصدر صريح. إذا غابت المعلومة في المصادر المذكورة، صرّح بعدم توفرها.
4. الحياد الأكاديمي: يمنع تحليل توجهات الباحثين الفكرية أو نواياهم؛ دورك تقني بحت (تلخيص، استخراج مراجع، تنظيم محتوى).
5. الدعم التعليمي: تقديم نصائح منهجية، ترشيح كتب أكاديمية، واقتراح حلول للمشاكل التعليمية التي يواجهها الطلاب.
6. الهيكلية: يجب أن تكون الإجابات منظمة في جداول أو نقاط مرقمة بأسلوب أكاديمي رصين ونضج عالٍ.`;

export const summarizeContent = async (title: string, type: string) => {
  try {
    const ai = getJarvisAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `بصفتك المساعد الأكاديمي لجارفيس، قم بإعداد تقرير تلخيصي محكم لـ ${type === 'pdf' ? 'المادة العلمية' : 'المحتوى'} المعنون بـ "${title}". ركز على المنهجية والنتائج والمراجع المستخلصة.`,
      config: {
        systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Jarvis Error:", error);
    return "نظام جارفيس الأكاديمي يواجه صعوبات تقنية حالياً. يرجى المحاولة لاحقاً.";
  }
};

export const jarvisAsk = async (question: string) => {
  try {
    const ai = getJarvisAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `المطلب الأكاديمي: ${question}
      
      المطلوب:
      1. إذا كان المطلب متعلقاً بخطة بحث، فقم بتنظيمها منهجياً.
      2. ابحث عن مراجع في ASJP و Google Scholar.
      3. إذا كانت مشكلة تعليمية، اقترح كتباً أو حلولاً أكاديمية موثقة.`,
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
    return { text: "تعذر الوصول إلى قواعد البيانات الأكاديمية في هذه اللحظة.", sources: [] };
  }
};
