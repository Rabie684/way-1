
import { GoogleGenAI } from "@google/genai";

export const getJarvisAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const JARVIS_SYSTEM_INSTRUCTION = `أنت "جارفيس" (Jarvis)، المساعد الأكاديمي الأكثر تطوراً لمنصة WAY التعليمية الجزائرية. 
صفتك: ناضج، رصين، منهجي، وودود بشكل احترافي.
مهمتك:
1. تقديم إجابات مرتبة ومنظمة (استخدم العناوين، النقاط، والقوائم المرقمة).
2. الاعتماد على مصادر أكاديمية موثوقة: المجلة العلمية الجزائرية (ASJP)، الأرشيف الرقمي للجامعات، و Google Scholar.
3. المساعدة في (تخطيط الدراسة، حل المشكلات المعقدة، شرح المفاهيم، توجيه البحث العلمي).
4. لغتك: عربية فصيحة مدعمة بمصطلحات أكاديمية، مع الحفاظ على الروح والخصوصية الجزائرية (العملة، الجامعات، المنهج الدراسي).
5. كن دقيقاً جداً ولا تقدم معلومات غير مؤكدة.`;

export const summarizeContent = async (title: string, type: string) => {
  try {
    const ai = getJarvisAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `بصفتك المساعد الأكاديمي "جارفيس"، قدم تحليلاً عميقاً ومنظماً لـ ${type === 'pdf' ? 'ملف الدرس' : 'فيديو تعليمي'} بعنوان "${title}".

يرجى هيكلة الملخص كالتالي:
1. **نظرة عامة**: سياق الموضوع وأهميته في المنهج الجزائري.
2. **المحاور الأساسية**: شرح مرتب لأهم النقاط.
3. **التطبيقات العملية**: كيف يستفيد الطالب من هذا في الامتحانات أو المسار المهني.
4. **نصيحة جارفيس الأكاديمية**: توجيه منهجي للدراسة العميقة.`,
      config: {
        systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Jarvis Error:", error);
    return "عذراً أيها الطالب، أنظمة جارفيس تواجه ضغطاً تقنياً. يرجى المحاولة بعد قليل.";
  }
};

export const jarvisAsk = async (question: string) => {
  try {
    const ai = getJarvisAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `السؤال الأكاديمي: ${question}

المطلوب منك كخبير أكاديمي:
1. ابحث في جميع المصادر الأكاديمية المتاحة (ASJP، المجلات العلمية العالمية، قواعد البيانات الجامعية).
2. قدم إجابة مفصلة، مرتبة، ومدعمة بالأدلة.
3. إذا كان هناك خطوات أو منهجية، اشرحها بالتفصيل.
4. اذكر المصادر التي اعتمدت عليها بوضوح لتعزيز ثقة الطالب بالمعلومة.`,
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
    return { text: "تعذر على جارفيس الوصول إلى قواعد البيانات حالياً. يرجى التحقق من اتصالك.", sources: [] };
  }
};
