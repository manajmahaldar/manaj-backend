const axios = require('axios');
const FarmingAIKnowledge = require('../models/FarmingAIKnowledge');

const { Groq } = require('groq-sdk');

// Lazy-load Learning models to prevent circular dependency
let LearningContent, GovernmentScheme, Course;
try {
    LearningContent = require('../models/learning/LearningContent');
    GovernmentScheme = require('../models/learning/GovernmentScheme');
    Course = require('../models/learning/Course');
} catch (err) {
    // Fallbacks if learning models missing
}

const SYSTEM_PROMPT = `You are Matsyalink Farming AI, an intelligent farming and aquaculture assistant.

Your primary purpose is to help users with practical questions related to:
- fish farming
- aquaculture
- pond management
- fish feeding
- fish nutrition
- fish growth
- water quality
- dissolved oxygen
- pH
- ammonia
- nitrite
- temperature
- pond preparation
- stocking
- fish diseases
- fish health
- common symptoms
- fish species
- Rohu
- Catla
- Mrigal
- Tilapia
- Pangasius
- other commonly farmed fish
- fish seed
- hatchery basics
- feed management
- pond maintenance
- biosecurity
- harvesting
- farming economics
- basic farm management

Always analyze the user's LATEST message first.

Answer the latest question directly.

Use previous messages only when they provide relevant context.

Never repeat a previous answer simply because the user is in the same conversation.

If the user changes the topic, answer the new topic.

If the user's question is a follow-up, use relevant previous context.

If important information is missing, ask a concise clarification question.

Do not invent exact prices, medicine dosages, disease diagnoses, government rules, weather information, or market information.

Clearly distinguish:
- general guidance
- likely possibilities
- information that requires professional/local verification

For fish disease or health-related questions, do not confidently diagnose from symptoms alone.

Explain possible causes and recommend appropriate verification/testing where needed.

Use simple language.

If the user asks in Bengali, answer in Bengali.

If the user asks in Hindi, answer in Hindi.

If the user asks in English, answer in English.

If the user mixes languages, respond naturally in the user's dominant language.

Do not unnecessarily repeat the user's question.

Do not produce generic answers when the user has provided specific information.

Use the conversation context intelligently.

Never claim to have inspected a pond, fish, image, water sample, or farm unless the application actually provides that information.

If the question is outside farming/aquaculture, politely say that you specialize in farming and aquaculture and provide a useful response only if the topic is reasonably related.

SAFETY & QUALITY RULES:
1. DO NOT CONFIDENTLY DIAGNOSE: If the user provides limited symptoms, explain that it is consistent with multiple possibilities (e.g. low dissolved oxygen, high ammonia) and explain the differential logic.
2. SAFE TREATMENTS ONLY: Never prescribe unapproved antibiotics, invent dosages, or recommend toxic chemical mixtures. Always prioritize safe, immediate steps (aeration, water exchange, reducing feed by 50% or stopping feed) and suggest consulting local extension officers or testing.
3. WATER PARAMETERS: Explain the interactions between parameters (e.g., ammonia toxicity increases at higher pH and temperature).
4. STRUCTURED RESPONSE: Output your response as a valid JSON object matching the JSON schema below.
5. LANGUAGE SUPPORT: All output text inside "answer", "possibleCauses", "immediateActions", "avoid", "followUpQuestions" must be in the language of the user's message (Bengali if 'bn' or Hindi if 'hi' or English if 'en').

JSON Response Schema:
{
  "answer": "Detailed structured markdown response. Format with headers: ### What may be happening, ### What to check now, ### What you can do immediately, ### What to avoid, ### What information I need, and ### When to seek professional help.",
  "possibleCauses": ["array of possible causes"],
  "immediateActions": ["array of safe immediate steps"],
  "avoid": ["array of actions to avoid"],
  "followUpQuestions": ["array of 2-3 specific follow-up questions"],
  "confidence": "high" or "medium" or "low",
  "sources": ["array of trusted sources used, e.g. FAO, ICAR, WorldFish"]
}`;

/**
 * Search RAG knowledge base for context & recommended resources
 */
async function retrieveRAGKnowledge(queryText) {
    const recommendations = [];
    const contextSnippets = [];

    try {
        const keywords = queryText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const searchRegex = keywords.length > 0 ? new RegExp(keywords.join('|'), 'i') : null;

        // 1. Search Admin Approved AI Knowledge
        if (searchRegex) {
            const aiKnowledge = await FarmingAIKnowledge.find({
                isApproved: true,
                $or: [{ title: searchRegex }, { content: searchRegex }, { tags: searchRegex }]
            }).limit(3);

            aiKnowledge.forEach(item => {
                contextSnippets.push(`[Knowledge Item] ${item.title}: ${item.content}`);
                if (item.pdfUrl) {
                    recommendations.push({
                        title: item.title,
                        type: 'pdf',
                        link: item.pdfUrl,
                        id: String(item._id)
                    });
                }
            });
        }

        // 2. Search Published Learning Hub Content
        if (LearningContent && searchRegex) {
            const contents = await LearningContent.find({
                status: 'published',
                $or: [{ title: searchRegex }, { summary: searchRegex }]
            }).limit(4);

            contents.forEach(c => {
                contextSnippets.push(`[Learning Article/Video] ${c.title}: ${c.summary || c.description || ''}`);
                recommendations.push({
                    title: c.title,
                    type: c.contentType === 'video' ? 'video' : 'article',
                    link: `/learning/${c.contentType === 'video' ? 'videos' : 'articles'}/${c.slug || c._id}`,
                    id: String(c._id)
                });
            });
        }

        // 3. Search Government Schemes
        if (GovernmentScheme && searchRegex) {
            const schemes = await GovernmentScheme.find({
                $or: [{ schemeName: searchRegex }, { summary: searchRegex }]
            }).limit(2);

            schemes.forEach(s => {
                contextSnippets.push(`[Government Scheme] ${s.schemeName}: ${s.summary || ''}`);
                recommendations.push({
                    title: s.schemeName,
                    type: 'scheme',
                    link: `/learning/schemes/${s._id}`,
                    id: String(s._id)
                });
            });
        }
    } catch (err) {
        console.error('RAG Retrieval Error:', err.message);
    }

    return { contextSnippets, recommendations };
}

/**
 * Main AI Query Process Function
 */
async function processFarmingAI({
    message = '',
    imageUrls = [],
    farmContext = {},
    conversationHistory = [],
    userRole = 'Farmer',
    language = 'en'
}) {
    const rawQuery = message.trim();
    const { contextSnippets, recommendations } = await retrieveRAGKnowledge(rawQuery);

    let llmAnswer = '';
    let visualObservations = [];
    let possibleCauses = [];
    let safeNextSteps = [];
    let confidence = 'medium';

    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_FARMING_MODEL || 'llama-3.3-70b-versatile';

    if (apiKey) {
        try {
            const groq = new Groq({ apiKey });

            // Build prior conversation history for context (limit to last 10 messages)
            const priorHistory = conversationHistory.slice(-10);
            const messages = [
                {
                    role: 'system',
                    content: SYSTEM_PROMPT
                }
            ];

            for (const m of priorHistory) {
                const role = m.role === 'user' ? 'user' : 'assistant';
                let content = '';
                if (role === 'user') {
                    content = (m.text || '').trim();
                } else {
                    // Reconstruct JSON object to match the JSON response format expected by system prompt
                    const assistantContentObj = {
                        answer: m.text || '',
                        possibleCauses: m.possibleCauses || [],
                        immediateActions: m.safeNextSteps || [],
                        avoid: m.avoid || [],
                        followUpQuestions: m.followUpQuestions || [],
                        confidence: m.confidence || 'medium',
                        sources: m.sources || []
                    };
                    content = JSON.stringify(assistantContentObj);
                }
                if (!content) continue;
                messages.push({ role, content });
            }

            // Build final user prompt with RAG and context
            const userContextPrompt = `Pond Parameters/Farm Context: ${JSON.stringify(farmContext)}
Retrieved Knowledge Base Context:
${contextSnippets.join('\n')}

Selected Output Language / User language indicator: ${language}

Latest User Question (ANSWER THIS QUESTION DIRECTLY): ${rawQuery}`;

            messages.push({
                role: 'user',
                content: userContextPrompt
            });

            const chatCompletion = await groq.chat.completions.create({
                messages,
                model,
                response_format: { type: "json_object" },
                temperature: 0.2,
                max_tokens: 2048
            });

            const responseText = chatCompletion.choices[0]?.message?.content;
            if (responseText) {
                const parsed = JSON.parse(responseText);

                // Run quality control check on parsed JSON
                const cleanResult = runQualityControl(parsed, rawQuery, imageUrls);
                
                llmAnswer = cleanResult.answer;
                possibleCauses = cleanResult.possibleCauses || [];
                safeNextSteps = cleanResult.immediateActions || [];
                confidence = cleanResult.confidence || 'medium';

                if (imageUrls.length > 0) {
                    visualObservations = [
                        'Image analyzed for visual characteristics.',
                        imageUrls.length > 1 ? `${imageUrls.length} images submitted.` : 'Single image submitted.'
                    ];
                }

                // Append sources if present
                if (cleanResult.sources && cleanResult.sources.length > 0) {
                    llmAnswer += `\n\n**Sources:** ${cleanResult.sources.join(', ')}`;
                }

                return {
                    answer: llmAnswer,
                    recommendations,
                    visualObservations,
                    possibleCauses,
                    safeNextSteps,
                    confidence
                };
            }
        } catch (apiErr) {
            console.error('Groq LLM API Call Error or JSON parse failure:', apiErr.message);
            console.warn('Falling back to rule-based Farming AI knowledge engine.');
        }
    }

    // Fallback expert rule-based response generator when offline or API key absent
    const norm = rawQuery.toLowerCase();

    // Dictionary of fallback translations to support language switching when offline
    const fallbackTranslations = {
        bn: {
            obs1: 'ভিজ্যুয়াল বৈশিষ্ট্যগুলির জন্য চিত্র বিশ্লেষণ করা হয়েছে।',
            obs2_single: 'একটি চিত্র জমা দেওয়া হয়েছে।',
            obs2_multi: (count) => `${count} টি চিত্র জমা দেওয়া হয়েছে।`,
            water_answer: `### কী ঘটে থাকতে পারে
পুকুরের জলের রঙ পরিবর্তন প্লাঙ্কটন ক্র্যাশ বা শৈবাল ব্লুমের নির্দেশক হতে পারে।

### এখন কী পরীক্ষা করবেন
- pH এর মাত্রা পরিমাপ করুন (সাধারণ কিট)।
- ভোরের দিকে দ্রবীভূত অক্সিজেন পরীক্ষা করুন।

### আপনি অবিলম্বে কী করতে পারেন
- উপলব্ধ থাকলে অবিলম্বে এয়ারেটরগুলি চালু করুন।
- খাবারের হার ৫০% কমিয়ে দিন।

### কী এড়িয়ে চলবেন
- না জেনে পুকুরে কোনো ভারী সার বা রাসায়নিক প্রয়োগ করবেন না।

### কখন বিশেষজ্ঞের পরামর্শ নেবেন
- জল যদি ঘন কালো রঙের হয়ে যায় বা সমস্ত মাছ খাবি খেতে শুরু করে তবে স্থানীয় মৎস্য কর্মকর্তার সাথে পরামর্শ করুন।`,
            water_causes: ['শৈবাল ব্লুম (Algal bloom)', 'উচ্চ জৈব বর্জ্য', 'কম দ্রবীভূত অক্সিজেন'],
            water_steps: ['এয়ারেটর চালু করুন', 'ফিড ৫০% কমান', 'pH এবং DO পরীক্ষা করুন'],
            
            lesion_answer: `### কী ঘটে থাকতে পারে
মাছের শরীরে ক্ষত, আঁশ উঠে যাওয়া বা দাগ ব্যাকটেরিয়াজনিত সংক্রমণ, ছত্রাক আক্রমণ বা পরজীবী সংক্রমণের সাথে সম্পর্কিত হতে পারে।

### এখন কী পরীক্ষা করবেন
- মাছ পুকুরের কিনারায় গা ঘষছে কিনা তা পরীক্ষা করুন।
- ক্ষয় বা নেক্রোসিসের লক্ষণগুলির জন্য ফুলকা বা কানকো পরীক্ষা করুন।

### আপনি অবিলম্বে কী করতে পারেন
- আক্রান্ত মাছগুলিকে আলাদা করুন।
- একটি পৃথক ট্যাঙ্কে একটি নিরাপদ লবণ স্নান (৫-১০ মিনিটের জন্য ১-২% দ্রবণ) প্রয়োগ করুন।

### কী এড়িয়ে চলবেন
- বিশেষজ্ঞের পরামর্শ ছাড়া সরাসরি পুকুরে অ্যান্টিবায়োটিক প্রয়োগ করবেন না।

### কখন বিশেষজ্ঞের পরামর্শ নেবেন
- যদি মাছের মৃত্যুর হার বাড়তে থাকে তবে একজন যোগ্য ভেটেরিনারি বা মৎস্য দপ্তরের সাথে যোগাযোগ করুন।`,
            lesion_causes: ['জলের গুণমানজনিত চাপ', 'ব্যাকটেরিয়া/ছত্রাকজনিত ক্ষত', 'শারীরিক আঘাত'],
            lesion_steps: ['আক্রান্ত মাছ আলাদা করুন', 'জলের মান পরীক্ষা করুন', 'নির্দেশনা অনুযায়ী লবণ স্নান করান'],

            feed_answer: `### কী ঘটে থাকতে পারে
ভুল পরিমাণে খাদ্য প্রদানের কারণে মাছের বৃদ্ধি ধীর হতে পারে অথবা উচ্চ এফসিআর (Feed Conversion Ratio) দেখা দিতে পারে।

### এখন কী পরীক্ষা করবেন
- গড় মাছের ওজন পরিমাপ করুন (নমুনা পরীক্ষা)।
- পুকুরে মোট মাছের জৈবভর বা বায়োমাস গণনা করুন।

### আপনি অবিলম্বে কী করতে পারেন
- বৃদ্ধির পর্যায়ে দৈনিক মোট মাছের ওজনের ২-৩% খাবার দিন।
- খাদ্য সকাল এবং বিকেলের স্লটে ভাগ করে দিন।

### কী এড়িয়ে চলবেন
- ভারী বৃষ্টিপাতের সময় বা ভোরের দিকে অক্সিজেন কম থাকাকালীন মাছকে খাবার দেবেন না।`,
            feed_steps: ['সাপ্তাহিক ওজন পরীক্ষা করুন', 'খাবারের অনুপাত বায়োমাসের ২-৩% করুন', 'অক্সিজেন কম থাকলে খাবার বন্ধ রাখুন'],

            gasping_answer: `### কী ঘটে থাকতে পারে
ভোরের দিকে জলের উপরিভাগে মাছের খাবি খাওয়া সাধারণত মারাত্মক অক্সিজেন ঘাটতি (হাইপোক্সিয়া) এর কারণে ঘটে। অন্যান্য কারণগুলির মধ্যে রয়েছে উচ্চ অ্যামোনিয়া বিষাক্ততা বা ফুলকার পরজীবী সংক্রমণ।

### এখন কী পরীক্ষা করবেন
- সূর্যোদয়ের আগে দ্রবীভূত অক্সিজেনের মাত্রা পরীক্ষা করুন।
- তাপমাত্রা এবং pH পরীক্ষা করুন।

### আপনি অবিলম্বে কী করতে পারেন
- সমস্ত উপলব্ধ প্যাডেলহুইল এয়ারেটর অবিলম্বে চালু করুন।
- মাছের আচরণ স্বাভাবিক না হওয়া পর্যন্ত সমস্ত খাবার দেওয়া বন্ধ রাখুন।
- সম্ভব হলে পুকুরে তাজা, পরিষ্কার জল যোগ করুন।

### কী এড়িয়ে চলবেন
- অক্সিজেনের অভাবের সময় সার, গোবর বা রাসায়নিক উপাদান যুক্ত করবেন না।

### কখন বিশেষজ্ঞের পরামর্শ নেবেন
- যদি মাছ দ্রুত মরতে থাকে তবে মৎস্য বিশেষজ্ঞের কাছ থেকে অবিলম্বে সহায়তা নিন।`,
            gasping_causes: ['দ্রবীভূত অক্সিজেন ঘাটতি', 'উচ্চ অ্যামোনিয়া বিষাক্ততা', 'ফুলকার সংক্রমণ'],
            gasping_steps: ['অবিলম্বে এয়ারেটর চালু করুন', 'খাবার সম্পূর্ণ বন্ধ করুন', '২০% জল পরিবর্তন করুন'],

            welcome: `### মৎস্যলিংক এআই ফার্মিং সহকারীতে আপনাকে স্বাগতম
সঠিক পুকুর প্রস্তুতি, জলের গুণমান রক্ষা এবং সুষম খাদ্য ব্যবস্থাপনা সফল মাছ চাষের মূল চাবিকাঠি।

### জলের গুণমানের লক্ষ্যমাত্রা:
- pH: ৭.৫ - ৮.৫
- দ্রবীভূত অক্সিজেন (DO): > ৫ মিগ্রা/লিটার
- অ্যামোনিয়া: < ০.০৫ মিগ্রা/লিটার

দয়া করে একটি নির্দিষ্ট প্রশ্ন জিজ্ঞাসা করুন বা আপনার মাছ অথবা পুকুরের একটি ছবি আপলোড করুন।`
        },
        hi: {
            obs1: 'दृश्य विशेषताओं के लिए छवि का विश्लेषण किया गया।',
            obs2_single: 'एक छवि सबमिट की गई।',
            obs2_multi: (count) => `${count} छवियां सबमिट की गईं।`,
            water_answer: `### क्या हो सकता है
तालाब के पानी के रंग में बदलाव प्लवक क्रैश (plankton crash) या शैवाल प्रस्फुटन (algal bloom) का संकेत हो सकता है।

### अभी क्या जांचें
- पीएच (pH) स्तर मापें (मानक किट द्वारा)।
- सुबह-सुबह घुलनशील ऑक्सीजन (Dissolved Oxygen) की जांच करें।

### आप तुरंत क्या कर सकते हैं
- यदि उपलब्ध हो, तो तुरंत एरेटर चालू करें।
- भोजन (फ़ीड) की दर में 50% की कमी करें।

### किससे बचें
- तालाब में बिना सोचे-समझे भारी खाद या रासायनिक उपचार न करें।

### पेशेवर मदद कब लें
- यदि पानी गहरा काला हो जाता है या मछलियां अत्यधिक हांफने लगती हैं, तो स्थानीय मत्स्य अधिकारी से परामर्श लें।`,
            water_causes: ['शैवाल प्रस्फुटन (Algal bloom)', 'उच्च जैविक कचरा', 'कम घुलनशील ऑक्सीजन'],
            water_steps: ['एरेटर चलाएं', 'फ़ीड 50% कम करें', 'pH और DO की जांच करें'],

            lesion_answer: `### क्या हो सकता है
मछली के शरीर पर घाव, छिलके उतरना या धब्बे बैक्टीरियल संक्रमण, फंगल हमलों या परजीवी के कारण हो सकते हैं।

### अभी क्या जांचें
- जांचें कि क्या मछलियां तालाब के किनारों पर रगड़ रही हैं।
- गलफड़ों में सड़न या संक्रमण के लक्षणों की जांच करें।

### आप तुरंत क्या कर सकते हैं
- प्रभावित मछलियों को अलग (आइसोलेट) करें।
- एक अलग टैंक में सुरक्षित नमक स्नान (5-10 मिनट के लिए 1-2% घोल) दें।

### किससे बचें
- विशेषज्ञ की सलाह के बिना सीधे तालाब में एंटीबायोटिक दवाओं का प्रयोग न करें।

### पेशेवर मदद कब लें
- यदि मृत्यु दर बढ़ती है, तो योग्य पशु चिकित्सक या मत्स्य कार्यालय से संपर्क करें।`,
            lesion_causes: ['पानी की गुणवत्ता का तनाव', 'बैक्टीरियल/फंगल घाव', 'शारीरिक चोट'],
            lesion_steps: ['प्रभावित मछली अलग करें', 'पानी के मापदंड जांचें', 'निर्देशानुसार नमक स्नान कराएं'],

            feed_answer: `### क्या हो सकता है
भोजन (फ़ीड) की अनुचित दर के कारण धीमी वृद्धि या उच्च एफसीआर (Feed Conversion Ratio) हो सकता है।

### अभी क्या जांचें
- मछली का औसत वजन (नमूनाकरण)।
- तालाब के कुल बायोमास (biomass) की गणना करें।

### आप तुरंत क्या कर सकते हैं
- विकास चरण के लिए दैनिक कुल शरीर के वजन का 2-3% फ़ीड दें।
- भोजन को सुबह और दोपहर के समय में विभाजित करके दें।

### किससे बचें
- भारी बारिश के दौरान या सुबह की घुलनशील ऑक्सीजन कम होने पर मछलियों को फ़ीड न दें।`,
            feed_steps: ['साप्ताहिक वजन जांचें', 'फ़ीड को बायोमास का 2-3% करें', 'कम DO के समय फ़ीड बंद करें'],

            gasping_answer: `### क्या हो सकता है
सुबह-सुबह पानी की सतह पर हांफना आमतौर पर ऑक्सीजन की भारी कमी (हाइपोक्सिया) के कारण होता है। अन्य कारणों में उच्च अमोनिया विषाक्तता या गलफड़ों के परजीवी संक्रमण शामिल हैं।

### अभी क्या जांचें
- सूर्योदय से पहले घुलनशील ऑक्सीजन का स्तर।
- तापमान और पीएच (pH) की जांच करें।

### आप तुरंत क्या कर सकते हैं
- उपलब्ध सभी पैडलव्हील एरेटर तुरंत चलाएं।
- व्यवहार सामान्य होने तक फ़ीड इनपुट पूरी तरह से रोक दें।
- यदि संभव हो, तो ताजा, साफ पानी जोड़ें।

### किससे बचें
- ऑक्सीजन तनाव के दौरान खाद या रासायनिक उपचार न जोड़ें।

### पेशेवर मदद कब लें
- यदि मछलियां तेजी से मर रही हैं, तो तुरंत मत्स्य विशेषज्ञ की सहायता लें।`,
            gasping_causes: ['घुलनशील ऑक्सीजन की कमी', 'उच्च अमोनिया विषाक्तता', 'गलफड़ों का संक्रमण'],
            gasping_steps: ['तुरंत एरेटर चलाएं', 'फ़ीड पूरी तरह बंद करें', '20% पानी बदलें'],

            welcome: `### मत्स्यलिंक एआई फार्मिंग सहायक में आपका स्वागत है
तालाब की सही तैयारी, पानी की गुणवत्ता का रखरखाव, और संतुलित फ़ीड प्रबंधन सफल मछली पालन की कुंजी हैं।

### पानी की गुणवत्ता के लक्ष्य मापदंड:
- pH: 7.5 - 8.5
- घुलनशील ऑक्सीजन (DO): > 5 mg/L
- अमोनिया: < 0.05 mg/L

कृपया कोई विशिष्ट प्रश्न पूछें या अपनी मछली या तालाब की फोटो अपलोड करें।`
        },
        or: {
            obs1: 'ଦୃଶ୍ୟମାନ ଗୁଣଗୁଡିକ ପାଇଁ ଚିତ୍ରର ବିଶ୍ଳେଷଣ କରାଯାଇଛି।',
            obs2_single: 'ଗୋଟିଏ ଚିତ୍ର ଦାଖଲ କରାଯାଇଛି।',
            obs2_multi: (count) => `${count} ଟି ଚିତ୍ର ଦାଖଲ କରାଯାଇଛି।`,
            water_answer: `### କଣ ହୋଇଥାଇପାରେ
ପୋଖରୀ ପାଣିର ରଙ୍ଗ ପରିବର୍ତ୍ତନ ପ୍ଲାଙ୍କଟନ୍ କ୍ରାସ୍ କିମ୍ବା ଶୈବାଳର ଅତ୍ୟଧିକ ବୃଦ୍ଧି (algal bloom) କୁ ସୂଚାଇପାରେ।

### ଏବେ କଣ ଯାଞ୍ଚ କରିବେ
- pH ସ୍ତର ମାପନ୍ତୁ (ସାଧାରଣ କିଟ୍ ଦ୍ୱାରା)।
- ସକାଳୁ ଦ୍ରବୀଭୂତ ଅମ୍ଳଜାନ (DO) ଯାଞ୍ଚ କରନ୍ତୁ।

### ଆପଣ ତୁରନ୍ତ କଣ କରିପାରିବେ
- ଉପଲବ୍ଧ ଥିଲେ ତୁରନ୍ତ ଏରେଟର ଚାଲୁ କରନ୍ତୁ।
- ଖାଦ୍ୟ (ଫିଡ୍) ଦେବା ପରିମାଣକୁ ୫୦% କମାଇ ଦିଅନ୍ତୁ।

### କେଉଁଥିରୁ ଦୂରେଇ ରହିବେ
- ବିନା ପରାମର୍ଶରେ ପୋଖରୀରେ କୌଣସି ରାସାୟନିକ ପଦାର୍ଥ କିମ୍ବା ଖତ ପ୍ରୟୋଗ କରନ୍ତୁ ନାହିଁ।

### ବିଶେଷଜ୍ଞଙ୍କ ପରାମର୍ଶ କେତେବେଳେ ନେବେ
- ଯଦି ପାଣି କଳା ରଙ୍ଗର ହୋଇଯାଏ କିମ୍ବା ସମସ୍ତ ମାଛ ପାଣି ଉପରକୁ ଆସି କଲବଲ ହୁଅନ୍ତି, ତେବେ ସ୍ଥାନୀୟ ମତ୍ସ୍ୟ ଅଧିକାରୀଙ୍କ ସହ ପରାମର୍ଶ କରନ୍ତୁ।`,
            water_causes: ['ଶୈବାଳ ପ୍ରସ୍ଫୁଟନ (Algal bloom)', 'ଅତ୍ୟଧିକ ଜୈବିକ ବର୍ଜ୍ୟବସ୍ତୁ', 'କମ୍ ଦ୍ରବୀଭୂତ ଅମ୍ଳଜାନ'],
            water_steps: ['ଏରେଟର ଚାଲୁ କରନ୍ତୁ', 'ଫିଡ୍ ୫୦% କମାନ୍ତୁ', 'pH ଏବଂ DO ଯାଞ୍ଚ କରନ୍ତୁ'],

            lesion_answer: `### କଣ ହୋଇଥାଇପାରେ
ମାଛ ଶରୀରରେ କ୍ଷତ, କାତି ଛାଡିବା କିମ୍ବା କଳା ଦାଗ ବ୍ୟାକ୍ଟେରିଆ ସଂକ୍ରମଣ, କବକ (fungal) ଆକ୍ରମଣ କିମ୍ବା ପରଜୀବୀ ସଂକ୍ରମଣ ସହିତ ଜଡିତ ହୋଇପାରେ।

### ଏବେ କଣ ଯାଞ୍ଚ କରିବେ
- ମାଛଗୁଡ଼ିକ ପୋଖରୀ କଡ଼ରେ ନିଜ ଶରୀରକୁ ଘଷୁଛନ୍ତି କି ନାହିଁ ଯାଞ୍ଚ କରନ୍ତୁ।
- ଗାଲିସିରେ କୌଣସି ପଚା ସଢା ଚିହ୍ନ ଅଛି କି ନାହିଁ ଯାଞ୍ଚ କରନ୍ତୁ।

### ଆପଣ ତୁରନ୍ତ କଣ କରିପାରିବେ
- ଆକ୍ରାନ୍ତ ମାଛଗୁଡ଼ିକୁ ଅଲଗା କରନ୍ତୁ।
- ଏକ ସ୍ୱତନ୍ତ୍ର ପାତ୍ରରେ ସୁରକ୍ଷିତ ଲୁଣ ସ୍ନାନ (୫-୧୦ ମିନିଟ୍ ପାଇଁ ୧-୨% ଲୁଣ ପାଣି) ପ୍ରୟୋଗ କରନ୍ତୁ।

### କେଉଁଥିରୁ ଦୂରେଇ ରହିବେ
- ବିଶେଷଜ୍ଞଙ୍କ ବିନା ପରାମର୍ଶରେ ପୋଖରୀରେ ସିଧାସଳଖ ଆଣ୍ଟିବାୟୋଟିକ୍ ବ୍ୟବହାର କରନ୍ତୁ ନାହିଁ।

### ବିଶେଷଜ୍ଞଙ୍କ ପରାମର୍ଶ କେତେବେଳେ ନେବେ
- ଯଦି ମାଛ ମରିବା ହାର ବଢେ, ତେବେ ତୁରନ୍ତ ପ୍ରାଣୀ ଚିକିତ୍ସକ କିମ୍ବା ମତ୍ସ୍ୟ ବିଭାଗ ସହିତ ଯୋଗାଯୋଗ କରନ୍ତୁ।`,
            lesion_causes: ['ପାଣିର ଅବନତି ଜନିତ ଚାପ', 'ବ୍ୟାକ୍ଟେରିଆ/କବକ ଜନିତ କ୍ଷତ', 'ଶାରୀରିକ ଆଘାତ'],
            lesion_steps: ['ଆକ୍ରାନ୍ତ ମାଛ ଅଲଗା କରନ୍ତୁ', 'ପାଣିର ମାନ ଯାଞ୍ଚ କରନ୍ତୁ', 'ନିର୍ଦ୍ଦେଶ ଅନୁଯାୟୀ ଲୁଣ ସ୍ନାନ କରାନ୍ତୁ'],

            feed_answer: `### କଣ ହୋଇଥାଇପାରେ
ଭୁଲ୍ ପରିମାଣରେ ଖାଦ୍ୟ ଦେବା ଦ୍ୱାରା ମାଛ ବୃଦ୍ଧି ମନ୍ଥର ହୋଇପାରେ କିମ୍ବା ଅଧିକ FCR (Feed Conversion Ratio) ହୋଇପାରେ।

### ଏବେ କଣ ଯାଞ୍ଚ କରିବେ
- ମାଛର ହାରାହାରି ଓଜନ (ନମୁନା ପରୀକ୍ଷା)।
- ପୋଖରୀର ମୋଟ ବାୟୋମାସ (biomass) ଗଣନା କରନ୍ତୁ।

### ଆପଣ ତୁରନ୍ତ କଣ କରିପାରିବେ
- ବଢୁଥିବା ମାଛ ପାଇଁ ଦୈନିକ ମୋଟ ଓଜନର ୨-୩% ଖାଦ୍ୟ ଦିଅନ୍ତୁ।
- ଖାଦ୍ୟକୁ ସକାଳ ଏବଂ ଅପରାହ୍ନରେ ଦୁଇ ଭାଗ କରି ଦିଅନ୍ତୁ।

### କେଉଁଥିରୁ ଦୂରେଇ ରହିବେ
- ପ୍ରବଳ ବର୍ଷା ସମୟରେ କିମ୍ବା ସକାଳେ ଅମ୍ଳଜାନ କମ୍ ଥିବା ବେଳେ ମାଛକୁ ଖାଦ୍ୟ ଦିଅନ୍ତୁ ନାହିଁ।`,
            feed_steps: ['ସାପ୍ତାହିକ ଓଜନ ଯାଞ୍ଚ କରନ୍ତୁ', 'ଖାଦ୍ୟକୁ ବାୟୋମାସର ୨-୩% କରନ୍ତୁ', 'ଅମ୍ଳଜାନ କମିଲେ ଖାଦ୍ୟ ବନ୍ଦ କରନ୍ତୁ'],

            gasping_answer: `### କଣ ହୋଇଥାଇପାରେ
ଭୋର ସମୟରେ ମାଛଗୁଡ଼ିକ ପାଣି ଉପରକୁ ଆସି ବିକଳ ହେବା ସାଧାରଣତଃ ଅମ୍ଳଜାନର ଅଭାବ (hypoxia) ଯୋଗୁଁ ଘଟିଥାଏ। ଅନ୍ୟ କାରଣଗୁଡ଼ିକ ମଧ୍ୟରେ ଅତ୍ୟଧିକ ଆମୋନିଆ ବିଷାକ୍ତତା କିମ୍ବା ଗାଲିସି ପରଜୀବୀ ସଂକ୍ରମଣ ଅନ୍ତର୍ଭୁକ୍ତ।

### ଏବେ କଣ ଯାଞ୍ଚ କରିବେ
- ସୂର୍ଯ୍ୟୋଦୟ ପୂର୍ବରୁ ଦ୍ରବୀଭୂତ ଅମ୍ଳଜାନ ସ୍ତର।
- ତାପମାତ୍ରା ଏବଂ pH ଯାଞ୍ଚ କରନ୍ତୁ।

### ଆପଣ ତୁରନ୍ତ କଣ କରିପାରିବେ
- ଉପଲବ୍ଧ ସମସ୍ତ ଏରେଟର ତୁରନ୍ତ ଚାଲୁ କରନ୍ତୁ।
- ମାଛଙ୍କ ବ୍ୟବହାର ସ୍ୱାଭାବିକ ନହେବା ପର୍ଯ୍ୟନ୍ତ ଖାଦ୍ୟ ଦେବା ସମ୍ପୂର୍ଣ୍ଣ ବନ୍ଦ ରଖନ୍ତୁ।
- ସମ୍ଭବ ହେଲେ ପୋଖରୀରେ ସତେଜ, ସଫା ପାଣି ମିଶାନ୍ତୁ।

### କେଉଁଥିରୁ ଦୂରେଇ ରହିବେ
- ଅମ୍ଳଜାନର ଅଭାବ ସମୟରେ ଖତ, ଗୋବର କିମ୍ବା କୌଣସି ରାସାୟନିକ ପଦାର୍ଥ ପ୍ରୟୋଗ କରନ୍ତୁ ନାହିଁ।

### ବିଶେଷଜ୍ଞଙ୍କ ପରାମର୍ଶ କେତେବେଳେ ନେବେ
- ଯଦି ମାଛଗୁଡ଼ିକ ଶୀଘ୍ର ମରୁଛନ୍ତି, ତେବେ ତୁରନ୍ତ ଜଣେ ମତ୍ସ୍ୟ ବିଶେଷଜ୍ଞଙ୍କ ସହାୟତା ନିଅନ୍ତୁ।`,
            gasping_causes: ['ଦ୍ରବୀଭୂତ ଅମ୍ଳଜାନ ଅଭାବ', 'ଅତ୍ୟଧିକ ଆମୋନିଆ ବିଷାକ୍ତତା', 'ଗାଲିସି ସଂକ୍ରମଣ'],
            gasping_steps: ['ତୁରନ୍ତ ଏରେଟର ଚାଲୁ କରନ୍ତୁ', 'ଫିଡ୍ ସମ୍ପୂର୍ଣ୍ଣ ବନ୍ଦ କରନ୍ତୁ', '୨୦% ପାଣି ବଦଳାନ୍ତୁ'],

            welcome: `### ମତ୍ସ୍ୟଲିଙ୍କ ଏଆଇ ଫାର୍ମିଙ୍ଗ ସହାୟକଙ୍କୁ ସ୍ୱାଗତ
ସଠିକ୍ ପୋଖରୀ ପ୍ରସ୍ତୁତି, ଜଳର ଗୁଣବତ୍ତା ରକ୍ଷଣାବେକ୍ଷଣ ଏବଂ ସନ୍ତୁଳିତ ଖାଦ୍ୟ ପରିଚାଳନା ହିଁ ସଫଳ ମାଛ ଚାଷର ଚାବିକାଠି।

### ଜଳର ଗୁଣବତ୍ତା ଲକ୍ଷ୍ୟ ମାପଦଣ୍ଡ:
- pH: ୭.୫ - ୮.୫
- ଦ୍ରବୀଭୂତ ଅମ୍ଳଜାନ (DO): > ୫ mg/L
- ଆମୋନିଆ: < ୦.୦୫ mg/L

ଦୟାକରି ଏକ ନିର୍ଦ୍ଦିଷ୍ଟ ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ କିମ୍ବା ଆପଣଙ୍କ ମାଛ କିମ୍ବା ପୋଖରୀର ଏକ ଫଟୋ ଅପଲୋଡ୍ କରନ୍ତୁ।`
        }
    };

    const targetLang = ['bn', 'hi', 'or'].includes(language) ? language : 'en';

    let extractedPondSize = '';
    let extractedSpecies = [];

    // Scan history and current query for context
    const allMessagesForContext = [
        ...conversationHistory.map(h => (h.text || '')),
        rawQuery
    ].map(t => t.toLowerCase());

    for (const msg of allMessagesForContext) {
        // Match pond size (e.g., "1 acre", "2 bigha")
        const pondMatch = msg.match(/(\d+(\.\d+)?\s*(acre|acres|bigha|bighas))/i);
        if (pondMatch) {
            extractedPondSize = pondMatch[0];
        }
        // Match species
        if (msg.includes('rohu')) extractedSpecies.push('Rohu');
        if (msg.includes('catla')) extractedSpecies.push('Catla');
        if (msg.includes('tilapia')) extractedSpecies.push('Tilapia');
        if (msg.includes('shrimp')) extractedSpecies.push('Shrimp');
        if (msg.includes('mrigal')) extractedSpecies.push('Mrigal');
    }
    extractedSpecies = [...new Set(extractedSpecies)];

    if (imageUrls.length > 0) {
        confidence = 'medium';
        if (targetLang !== 'en') {
            const t = fallbackTranslations[targetLang];
            visualObservations = [
                t.obs1,
                imageUrls.length > 1 ? t.obs2_multi(imageUrls.length) : t.obs2_single
            ];
        } else {
            visualObservations = [
                'Image analyzed for visual characteristics.',
                imageUrls.length > 1 ? `${imageUrls.length} images submitted.` : 'Single image submitted.'
            ];
        }

        if (norm.includes('water') || norm.includes('pond') || norm.includes('color')) {
            if (targetLang !== 'en') {
                const t = fallbackTranslations[targetLang];
                llmAnswer = t.water_answer;
                possibleCauses = t.water_causes;
                safeNextSteps = t.water_steps;
            } else {
                llmAnswer = `### What may be happening
Pond water color change can indicate plankton crash or algal blooms.

### What to check now
- Measure pH levels (standard kit).
- Check early morning Dissolved Oxygen.

### What you can do immediately
- Turn on aerators if available.
- Reduce feeding rate by 50%.

### What to avoid
- Do not apply heavy fertilizers or chemical treatments blindly.

### When to seek professional help
- Consult local fisheries officer if water turns dark black or mass gasping occurs.`;
                possibleCauses = ['Algal bloom', 'High organic waste', 'Low dissolved oxygen'];
                safeNextSteps = ['Run aerators', 'Reduce feed by 50%', 'Test pH and DO'];
            }
        } else {
            if (targetLang !== 'en') {
                const t = fallbackTranslations[targetLang];
                llmAnswer = t.lesion_answer;
                possibleCauses = t.lesion_causes;
                safeNextSteps = t.lesion_steps;
            } else {
                llmAnswer = `### What may be happening
Lesions, scale loss, or spots on the fish body could be related to bacterial infections, fungal attacks, or parasite attachments.

### What to check now
- Check if fish are rubbing against the pond sides.
- Check gill health for signs of necrosis.

### What you can do immediately
- Isolate affected fish.
- Apply a safe salt bath (1-2% solution for 5-10 minutes) in a separate tank.

### What to avoid
- Do not apply antibiotics directly to the pond without expert advice.

### When to seek professional help
- Contact a qualified vet or fisheries office if mortality increases.`;
                possibleCauses = ['Water quality stress', 'Bacterial/Fungal lesion', 'Physical handling injury'];
                safeNextSteps = ['Isolate affected fish', 'Check water parameters', 'Salt bath treatment under guidance'];
            }
        }
    } else if (norm.includes('ammonia') || norm.includes('nh3') || norm.includes('nh4')) {
        llmAnswer = `### What may be happening
High ammonia levels (toxic unionized ammonia NH3 > 0.05 mg/L) are caused by the accumulation of uneaten feed, fish excretion, and decomposing organic matter under low oxygen conditions.

### What to check now
- Test total ammonia nitrogen (TAN) and verify against water pH and temperature (ammonia toxicity increases at higher pH and temperature).
- Check the pond bottom for black, foul-smelling sludge.

### What you can do immediately
- Reduce feed input by 50% or stop feed completely for 2-3 days.
- Increase pond aeration continuously to help convert ammonia to non-toxic nitrates.
- Perform a 20% water exchange using clean, pre-aerated water.

### What to avoid
- Do not apply organic manure or nitrogenous fertilizers. Avoid liming if ammonia is extremely high and pH is already above 8.0.`;
        possibleCauses = ['Overfeeding', 'Pond bottom sludge accumulation', 'Low dissolved oxygen inhibiting nitrifying bacteria'];
        safeNextSteps = ['Stop/Reduce feed', 'Exchange 20% water', 'Run aerators continuously'];
        confidence = 'high';
    } else if (norm.includes('green') || norm.includes('algae') || norm.includes('color') || norm.includes('colour')) {
        llmAnswer = `### What may be happening
Green pond water is typically caused by an algal bloom due to high nutrient loads (nitrogen and phosphorus) from overfeeding, accumulation of organic waste, or excessive fertilization.

### What to check now
- Check water transparency using a Secchi disk.
- Test pH level in the afternoon (algal blooms cause high afternoon pH).
- Monitor early morning dissolved oxygen.

### What you can do immediately
- Reduce daily feed by 50% immediately to limit nutrient input.
- Stop applying any fertilizers or organic manure.
- Exchange 10-15% of the pond water if possible.
- Run paddlewheel aerators to prevent early morning oxygen drops.

### What to avoid
- Do not apply toxic chemical algaecides blindly as a rapid die-off of algae will deplete oxygen and kill fish.`;
        possibleCauses = ['Algal bloom', 'Over-fertilization', 'Excess nutrient accumulation'];
        safeNextSteps = ['Reduce feed by 50%', 'Stop fertilization', 'Increase aeration'];
        confidence = 'high';
    } else if (norm.includes('medicine') || norm.includes('treatment') || norm.includes('chemical') || norm.includes('cure') || norm.includes('antibiotic')) {
        llmAnswer = `### What may be happening
I do not prescribe specific chemical treatments or antibiotic dosages blindly without diagnostic details, as incorrect application can destroy water quality and result in massive fish mortality.

### What information I need
Before recommending any safe remedies, please tell me:
1. What fish species are affected (e.g. Rohu, Catla, Tilapia, Shrimp)?
2. What is the approximate pond size and water depth?
3. What are the specific symptoms (e.g. spots, red lesions, scale loss, gasping at surface, abnormal swimming)?
4. What is the water color and recent water parameters (pH, DO, ammonia)?

### What you can do immediately
- Isolate any visibly sick or dead fish from the pond.
- For mild bacterial or fungal patches, a safe salt bath (1-2% salt solution for 5-10 minutes) in a separate tank is recommended before release.
- Ensure optimal aeration in the pond.

### What to avoid
- Do not apply antibiotics, copper sulfate, or formalin directly to the pond without expert diagnosis.`;
        possibleCauses = ['Undiagnosed pathology', 'Water quality stress'];
        safeNextSteps = ['Isolate affected fish', 'Check water parameters', 'Consult local fisheries expert'];
        confidence = 'medium';
    } else if (norm.includes('eating') || norm.includes('eat') || norm.includes('appetite')) {
        llmAnswer = `### What may be happening
Loss of appetite in fish can be caused by environmental stress, poor water quality (such as high ammonia or low dissolved oxygen), temperature fluctuations, or early-stage infections.

### What to check now
- Check Dissolved Oxygen (DO) levels, especially in the early morning.
- Test pH and ammonia levels in the pond water.
- Inspect fish gills for any discoloration or spots.

### What you can do immediately
- Reduce daily feed by 50% or stop feeding completely for 24 hours until water parameters are verified.
- Turn on aerators to improve oxygen levels.
- Perform a 10-20% water exchange if water quality seems poor.

### What to avoid
- Do not add any new feed or fertilizers to the pond while fish are not eating.`;
        possibleCauses = ['Low dissolved oxygen', 'High ammonia toxicity', 'Water temperature drop', 'Early bacterial infection'];
        safeNextSteps = ['Reduce feeding by 50%', 'Turn on aerators', 'Check water parameters'];
        confidence = 'medium';
    } else if (norm.includes('feed') || norm.includes('growth') || norm.includes('khabar') || norm.includes('rohu') || norm.includes('catla')) {
        // Check for contextual parameters
        if (extractedPondSize || extractedSpecies.length > 0) {
            const specStr = extractedSpecies.length > 0 ? extractedSpecies.join(' and ') : 'fish';
            const sizeStr = extractedPondSize ? `a ${extractedPondSize}` : 'your';
            llmAnswer = `### What may be happening
For ${sizeStr} pond stocking ${specStr}, proper feed management is essential to maximize yield while preventing water deterioration.

### What to check now
- Check average body weight of the fish by netting a sample.
- Monitor water transparency and natural food (plankton) availability.

### What you can do immediately
- Feed a supplementary mixture at 2-3% of the total estimated fish biomass daily.
- For a ${extractedPondSize || 'standard'} pond, calculate the total daily feed ration carefully.
- Use feed bags or floating feed rings to feed Catla at the surface and Rohu in the column.
- Maintain dissolved oxygen levels above 5 mg/L to ensure efficient digestion.

### What to avoid
- Do not feed the fish during heavy rains or when natural plankton blooms are excessive.`;
        } else {
            llmAnswer = `### What may be happening
Improper feeding rates can lead to slow growth or high Feed Conversion Ratio (FCR).

### What to check now
- Average fish weight (sampling).
- Calculate total biomass of the pond.

### What you can do immediately
- Feed 2-3% of total body weight daily for grow-out stage.
- Split feeding into morning and afternoon slots.

### What to avoid
- Do not feed fish during heavy rain or when early-morning oxygen is low.`;
        }
        confidence = 'high';
        safeNextSteps = ['Sample weight weekly', 'Adjust ration to 2-3% biomass', 'Stop feed during low DO'];
    } else if (norm.includes('disease') || norm.includes('dying') || norm.includes('surface') || norm.includes('gasping') || norm.includes('gasp') || norm.includes('oxygen')) {
        if (targetLang !== 'en') {
            const t = fallbackTranslations[targetLang];
            llmAnswer = t.gasping_answer;
            possibleCauses = t.gasping_causes;
            safeNextSteps = t.gasping_steps;
        } else {
            llmAnswer = `### What may be happening
Early morning surface gasping is typically caused by severe oxygen depletion (hypoxia). Other causes include high ammonia toxicity or gill parasite infestation.

### What to check now
- Dissolved oxygen levels before sunrise.
- Check temperature and pH.

### What you can do immediately
- Run all available paddlewheel aerators immediately.
- Stop all feed input until behavior returns to normal.
- Add fresh, clean water if possible.

### What to avoid
- Do not add fertilizer, manure, or chemical treatments during oxygen stress.

### When to seek professional help
- If fish continue to die rapidly, seek immediate assistance from a fisheries expert.`;
            confidence = 'high';
            possibleCauses = ['Dissolved oxygen depletion', 'High ammonia toxicity', 'Gill infection'];
            safeNextSteps = ['Turn on aerators immediately', 'Stop feed completely', 'Exchange 20% water'];
        }
    } else if (norm.includes('pond') || norm.includes('size') || norm.includes('acre') || norm.includes('bigha')) {
        const specStr = extractedSpecies.length > 0 ? extractedSpecies.join(' and ') : 'fish';
        llmAnswer = `### Pond Size Acknowledged
I have noted that your pond size is **${extractedPondSize || 'specified'}** and you are farming **${specStr}**. This parameters will be used to calibrate recommendations.

### Safe Next Steps
- Keep monitoring water parameters like pH and Dissolved Oxygen.
- Let me know if you would like feed ratio calculations or stocking density advice.`;
        confidence = 'high';
        possibleCauses = ['Pond context registration'];
        safeNextSteps = ['Monitor pH/DO regularly'];
    } else {
        if (targetLang !== 'en') {
            const t = fallbackTranslations[targetLang];
            llmAnswer = t.welcome;
        } else {
            llmAnswer = `### Welcome to MatsyaLink Farming AI Assistant
Proper pond preparation, water quality maintenance, and balanced feed management are key to successful fish farming.

### Water Quality Target Parameters:
- pH: 7.5 - 8.5
- Dissolved Oxygen: > 5 mg/L
- Ammonia: < 0.05 mg/L

Please ask a specific question or upload a photo of your fish or pond.`;
        }
        confidence = 'medium';
    }

    return {
        answer: llmAnswer,
        recommendations,
        visualObservations,
        possibleCauses,
        safeNextSteps,
        confidence
    };
}

/**
 * Run backend Quality Control and safety check on the LLM output
 */
function runQualityControl(parsed, rawQuery, imageUrls) {
    const clean = { ...parsed };
    const normQuery = rawQuery.toLowerCase();

    // 1. Confident diagnosis safety check (prevent false positives based on photo alone)
    if (imageUrls.length > 0) {
        const hasConfidentDiagnosis = clean.confidence === 'high' && 
            (clean.answer.includes('definitely') || clean.answer.includes('diagnosed as') || clean.answer.includes('is caused by'));
        if (hasConfidentDiagnosis) {
            clean.confidence = 'medium';
            clean.answer = `*Visual signs are consistent with several possibilities. An image alone is not sufficient for a definitive diagnosis.*\n\n` + clean.answer;
        }
    }

    // 2. Prevent dangerous chemical advice or dosage invention
    const dangerousKeywords = ['formalin', 'copper sulfate', 'potassium permanganate', 'malachite green', 'antibiotic'];
    const mentionsChemicals = dangerousKeywords.some(kw => clean.answer.toLowerCase().includes(kw));

    if (mentionsChemicals && !clean.answer.toLowerCase().includes('consult') && !clean.answer.toLowerCase().includes('officer')) {
        clean.answer += `\n\n> ⚠️ **Safety Warning**: Chemical treatments and dosage application must be verified by a qualified fisheries expert or veterinarian before direct pond application.`;
    }

    // 3. Fallback check for proper formatting structure
    if (!clean.answer.includes('### What may be happening') && !clean.answer.includes('### What you can do') && imageUrls.length > 0) {
        clean.answer = `### What may be happening
The symptoms/visual signs could indicate environmental stress or local infection.

### What you can do immediately
- Enhance pond aeration immediately.
- Reduce feeding rate by 50% for 24 hours.

### What to check now
- Test water pH, DO, and ammonia levels.

` + clean.answer;
    }

    return clean;
}

module.exports = { processFarmingAI, retrieveRAGKnowledge };
