
import { GoogleGenAI } from "@google/genai";

export const getJarvisAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const JARVIS_SYSTEM_INSTRUCTION = `أنت مساعد بحث أكاديمي (جارفيس) لمنصة WAY. 
القواعد الصارمة لعملك:
1. يمنع عليك تقديم أي معلومة أو استنتاج غير مدعوم بمصدر صريح من القائمة التالية: [منصة ASJP، Google Scholar، مواقع الجامعات الجزائرية الرسمية].
2. إذا لم تجد معلومة مؤكدة داخل هذه المصادر، يجب أن تصرّح بوضوح بعدم توفرها.
3. يمنع منعاً باتاً تحليل نوايا الباحثين أو وصف توجهاتهم الفكرية أو السياسية.
4. دورك يقتصر حصرياً على: (استخراج المراجع، تلخيص النصوص العلمية، وتنظيم المعلومات الأكاديمية).
5. يجب أن تكون الإجابة منظمة جداً، رصينة، وتستخدم مصطلحات أكاديمية دقيقة.
6. عند ذكر أي معلومة، يجب إرفاق المصدر الجامعي أو الرابط من ASJP/Scholar.`;

export const summarizeContent = async (title: string, type: string) => {
  try {
    const ai = getJarvisAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `بصفتك مساعد البحث الأكاديمي "جارفيس"، قم بتلخيص ${type === 'pdf' ? 'المحتوى النصي' : 'المحتوى المرئي'} المعنون بـ "${title}" وفق القواعد الصارمة الموكلة إليك. اذكر النقاط الجوهرية والمراجع المرتبطة إن وجدت.`,
      config: {
        systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Jarvis Error:", error);
    return "عذراً، أنظمة جارفيس تواجه ضغطاً تقنياً حالياً.";
  }
};

export const jarvisAsk = async (question: string) => {
  try {
    const ai = getJarvisAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `المطلب الأكاديمي: ${question}
      قم بالبحث في ASJP و Google Scholar والمواقع الجامعية الجزائرية فقط. استخرج المعلومات الموثقة ونظمها بأسلوب أكاديمي ناضج.`,
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
    return { text: "تعذر استخراج المعلومات من المصادر الأكاديمية في الوقت الحالي.", sources: [] };
  }
};
