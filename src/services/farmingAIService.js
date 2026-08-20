const axios = require('axios');
const FarmingAIKnowledge = require('../models/FarmingAIKnowledge');

// Lazy-load Learning models to prevent circular dependency
let LearningContent, GovernmentScheme, Course;
try {
    LearningContent = require('../models/learning/LearningContent');
    GovernmentScheme = require('../models/learning/GovernmentScheme');
    Course = require('../models/learning/Course');
} catch (err) {
    // Fallbacks if learning models missing
}

const SYSTEM_PROMPT = `You are the official MatsyaLink Farming AI Assistant — an expert-level aquaculture advisory system specialized in freshwater fish farming in the Indian subcontinent (e.g., Rohu, Catla, Mrigal, Tilapia, Carps, Shrimp).

Your goal is to provide high-quality, practical, safe, and context-aware aquaculture advice.

CRITICAL RULES:
1. DO NOT CONFIDENTLY DIAGNOSE: If the user provides limited symptoms (e.g., "fish gasping at the surface" or "fish are dying"), NEVER say "This is definitely X". Explain that it is consistent with multiple possibilities (e.g., low dissolved oxygen, high ammonia, or gill infections) and explain the differential logic.
2. SAFE TREATMENTS ONLY: Never prescribe unapproved antibiotics, invent dosages, or recommend toxic chemical mixtures. Always prioritize safe, immediate steps (e.g., aeration, water exchange, reducing feed by 50% or stopping feed) and suggest consulting local fisheries extension officers or testing water in a laboratory for serious cases.
3. WATER PARAMETER RELATIONS: Explain the interactions between parameters (e.g., ammonia toxicity increases at higher pH and temperature; low oxygen is worst in early morning; do not feed during rain or low DO).
4. STRUCTURED RESPONSE: Output your response as a valid JSON object matching the JSON schema below.
5. LANGUAGE SUPPORT: Detect the user's language (English, Hindi, Bengali, Hinglish, or Banglish) and respond in the same language. For example, if the query is in Bengali, the text inside "answer", "possibleCauses", "immediateActions", "avoid", "followUpQuestions" should be in Bengali.
6. NO HALLUCINATION: Never invent scientific values, approved chemical lists, or research citations. If unsure, say "I don't have enough reliable information to answer that confidently."

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

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
        try {
            // Build conversation history payload for contextual memory (limit to last 6 messages)
            const recentHistory = conversationHistory.slice(-6).map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.text || '' }]
            }));

            // Main system instructions + context
            const userContextPrompt = `Pond Parameters/Farm Context: ${JSON.stringify(farmContext)}
Retrieved Knowledge Base Context:
${contextSnippets.join('\n')}

Selected Output Language: ${language} (Ensure all values inside the JSON output match this language. If 'bn' respond in Bengali, if 'hi' respond in Hindi, if 'or' respond in Odia, if 'en' respond in English)

User Query: ${rawQuery}`;

            // Create contents payload for Gemini API
            const contents = [
                ...recentHistory,
                {
                    role: 'user',
                    parts: [
                        { text: userContextPrompt }
                    ]
                }
            ];

            // Append base64 image data if present
            for (const url of imageUrls) {
                if (url.startsWith('data:image')) {
                    const base64Data = url.split(',')[1];
                    const mimeType = url.substring(url.indexOf(':') + 1, url.indexOf(';'));
                    contents[contents.length - 1].parts.push({
                        inlineData: { mimeType, data: base64Data }
                    });
                }
            }

            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                {
                    systemInstruction: {
                        parts: [{ text: SYSTEM_PROMPT }]
                    },
                    contents,
                    generationConfig: {
                        responseMimeType: 'application/json'
                    }
                }
            );

            const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
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
            console.error('LLM API Call Error or JSON parse failure:', apiErr.message);
        }
    }

    // Fallback expert rule-based response generator when offline or API key absent
    const norm = rawQuery.toLowerCase();

    if (imageUrls.length > 0) {
        confidence = 'medium';
        visualObservations = [
            'Image analyzed for visual characteristics.',
            imageUrls.length > 1 ? `${imageUrls.length} images submitted.` : 'Single image submitted.'
        ];

        if (norm.includes('water') || norm.includes('pond') || norm.includes('color')) {
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
    } else if (norm.includes('feed') || norm.includes('growth') || norm.includes('khabar')) {
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
        confidence = 'high';
        safeNextSteps = ['Sample weight weekly', 'Adjust ration to 2-3% biomass', 'Stop feed during low DO'];
    } else if (norm.includes('disease') || norm.includes('dying') || norm.includes('surface') || norm.includes('gasping')) {
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
    } else {
        llmAnswer = `### Welcome to MatsyaLink Farming AI Assistant
Proper pond preparation, water quality maintenance, and balanced feed management are key to successful fish farming.

### Water Quality Target Parameters:
- pH: 7.5 - 8.5
- Dissolved Oxygen: > 5 mg/L
- Ammonia: < 0.05 mg/L

Please ask a specific question or upload a photo of your fish or pond.`;
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
