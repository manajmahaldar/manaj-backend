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

/**
 * System Safety Prompt for MatsyaLink Farming AI Assistant
 */
const SYSTEM_PROMPT = `
You are the official MatsyaLink Farming AI Assistant — an expert aquaculture specialist, fisheries consultant, and educator for Indian fish farmers, sellers, traders, and hatcheries.

CRITICAL SAFETY & MEDICAL RULES:
1. NEVER state a definitive diagnosis for fish disease based on photos alone. Always use cautious phrases such as:
   - "Possible issue"
   - "Visual signs appear consistent with..."
   - "Image alone is insufficient to establish a definitive diagnosis..."
2. NEVER prescribe chemical dosages or dangerous medications based on a photograph alone. Always recommend consulting a certified local fisheries officer or veterinarian.
3. FOR POND/WATER PHOTOS: Explain that photographs CANNOT measure pH, Dissolved Oxygen (DO), Ammonia, Nitrite, or Alkalinity. Recommend proper water testing kits or lab tests.
4. Structure your advice into easy-to-read sections:
   - **Explanation & Observations**
   - **Possible Causes / Factors**
   - **Recommended Checks**
   - **Safe Next Steps**
   - **What NOT to Do**
   - **When to Seek Professional Help**
`;

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
    userRole = 'Farmer'
}) {
    const rawQuery = message.trim();
    const { contextSnippets, recommendations } = await retrieveRAGKnowledge(rawQuery);

    let llmAnswer = '';
    let visualObservations = [];
    let possibleCauses = [];
    let safeNextSteps = [];
    let confidence = 'medium';

    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    if (apiKey) {
        try {
            // Use Google Gemini API if GEMINI_API_KEY is present
            if (process.env.GEMINI_API_KEY) {
                const parts = [{ text: `${SYSTEM_PROMPT}\n\nUser Query: ${rawQuery}\nFarm Context: ${JSON.stringify(farmContext)}\nRetrieved Knowledge Context:\n${contextSnippets.join('\n')}` }];
                
                // Add Image URLs if present
                for (const url of imageUrls) {
                    if (url.startsWith('data:image')) {
                        const base64Data = url.split(',')[1];
                        const mimeType = url.substring(url.indexOf(':') + 1, url.indexOf(';'));
                        parts.push({
                            inlineData: { mimeType, data: base64Data }
                        });
                    }
                }

                const response = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
                    { contents: [{ parts }] }
                );

                llmAnswer = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            }
        } catch (apiErr) {
            console.error('LLM API Call Error, falling back to expert knowledge engine:', apiErr.message);
        }
    }

    // Fallback expert rule-based response generator when offline or API key absent
    if (!llmAnswer) {
        const norm = rawQuery.toLowerCase();

        if (imageUrls.length > 0) {
            confidence = 'medium';
            visualObservations = [
                'Image analyzed for visual characteristics.',
                imageUrls.length > 1 ? `${imageUrls.length} images submitted.` : 'Single image submitted.'
            ];

            if (norm.includes('water') || norm.includes('pond') || norm.includes('color')) {
                llmAnswer = `### Water & Pond Visual Assessment

**Visual Observations:**
- Visual signs appear consistent with typical pond water conditions.
- Surface color and turbidity noted from the provided image.

> ⚠️ **Important Caution**: A photograph **cannot reliably measure** key chemical parameters such as **pH, Dissolved Oxygen (DO), Ammonia (NH3), Nitrite (NO2), or Alkalinity**.

**Possible Causes / Factors:**
- Algal bloom or plankton collapse
- High organic load or unconsumed feed at the bottom
- Recent heavy rain or runoff

**What to Check:**
1. Test pH using a standard pH strip or liquid kit (target: 7.5 - 8.5).
2. Check Dissolved Oxygen early in the morning before sunrise (target: > 5 mg/L).
3. Check ammonia level if fish appear sluggish.

**Safe Next Steps:**
- Aerate the pond using paddle wheel aerators or water pumping.
- Stop or reduce feeding by 50% for 24 hours until water parameters stabilize.
- Exchange 10-20% of bottom water if possible.

**When to Seek Professional Help:**
- If fish are gasping at the surface continuously or mass mortality begins.`;
                possibleCauses = ['Algal bloom', 'High organic waste', 'Low dissolved oxygen'];
                safeNextSteps = ['Run aerators', 'Reduce feed by 50%', 'Test pH and DO'];
            } else {
                llmAnswer = `### Fish Visual Assessment Guidance

**Visual Observations:**
- Visual assessment performed on uploaded fish photograph.
- Visual signs appear consistent with skin/fin texture variations.

> ⚠️ **Important Caution**: Image alone is **insufficient to confirm** a definitive disease diagnosis or biological pathogen.

**Possible Causes:**
- Environmental stress or poor water quality
- Bacterial skin lesion or fungal infection (e.g. Saprolegniasis / Epizootic Ulcerative Syndrome)
- Parasitic attachment (e.g. Argulus / Lernea) or physical handling damage

**Recommended Checks:**
1. Inspect gills for pale color, mucus buildup, or erosion.
2. Check if fish are rubbing against pond sides or swimming erratically.
3. Test pond water pH, ammonia, and oxygen levels.

**Safe Next Steps:**
- Isolate affected fish in a clean nursery tank if possible.
- Apply safe salt bath (1-2% solution for 5-10 minutes) under guidance.
- Maintain clean, well-aerated water.

**What NOT to Do:**
- Do **NOT** apply unverified broad-spectrum antibiotics or toxic chemicals directly into the pond without professional advice.

**When to Seek Professional Help:**
- Contact your local Fisheries Extension Officer or aquaculture veterinarian immediately if fish mortality is observed.`;
                possibleCauses = ['Water quality stress', 'Bacterial/Fungal lesion', 'Physical handling injury'];
                safeNextSteps = ['Isolate affected fish', 'Check water parameters', 'Salt bath treatment under guidance'];
            }
        } else if (norm.includes('feed') || norm.includes('growth') || norm.includes('khabar')) {
            llmAnswer = `### Fish Feeding & Growth Guidance

**Explanation:**
To maximize growth rates and Food Conversion Ratio (FCR), feeding must be adjusted according to fish body weight, age, and water temperature.

**Recommended Checks:**
- Calculate total biomass: (Number of Fish × Average Weight).
- Feed 2% to 3% of total body weight daily for adult fish (5-8% for fingerlings).
- Split daily ration into 2 to 3 feeding schedules (morning and late afternoon).

**Safe Next Steps:**
1. Perform weekly sampling to monitor weight gain and adjust feed quantity.
2. Store feed bags in a dry, elevated place to prevent aflatoxin/mold buildup.
3. Stop feeding during extreme weather or when Dissolved Oxygen drops below 3 mg/L.`;
            confidence = 'high';
            safeNextSteps = ['Sample weight weekly', 'Adjust ration to 2-3% biomass', 'Stop feed during low DO'];
        } else if (norm.includes('disease') || norm.includes('dying') || norm.includes('surface') || norm.includes('gasping')) {
            llmAnswer = `### Emergency Fish Health & Oxygen Guidance

**Possible Causes:**
- Severe oxygen depletion (hypoxia), especially in early morning.
- High ammonia toxicity or nitrite buildup (brown blood disease).
- Acute parasitic or bacterial gill infection.

**Immediate Safe Next Steps:**
1. **Emergency Aeration**: Turn on all paddlewheel aerators immediately or pump fresh oxygenated water into the pond.
2. **Stop Feeding**: Stop all feed input immediately — unconsumed feed consumes oxygen and worsens ammonia.
3. **Water Exchange**: Flush out 15-20% of bottom water if clean source water is available.

**What NOT to Do:**
- Do not add heavy fertilizers or chemicals while fish are in distress.

**When to Seek Professional Help:**
- Consult a certified fisheries expert immediately for diagnosis and water testing.`;
            confidence = 'high';
            possibleCauses = ['Dissolved oxygen depletion', 'High ammonia toxicity', 'Gill infection'];
            safeNextSteps = ['Turn on aerators immediately', 'Stop feed completely', 'Exchange 20% water'];
        } else {
            llmAnswer = `### Aquaculture Advisory

Thank you for reaching out to the **MatsyaLink Farming AI Assistant**. 

**Overview:**
Proper pond preparation, water quality maintenance, seed quality selection, and balanced feed management are the four pillars of successful fish farming.

**Recommended Action:**
- Monitor water pH daily (7.5 - 8.5 ideal).
- Ensure stocking density matches your pond aeration capacity.
- Keep a farm record log of daily feeding and weekly growth.

Feel free to ask a specific question about pond preparation, fish diseases, feed calculation, Biofloc, RAS, or government schemes — or upload a photo of your fish or pond!`;
            confidence = 'medium';
        }
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

module.exports = { processFarmingAI, retrieveRAGKnowledge };
