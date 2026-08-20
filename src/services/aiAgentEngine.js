const Listing = require('../models/Listing');
const BuyingPost = require('../models/BuyingPost');
const User = require('../models/User');
const Order = require('../models/Order');

// Learning Models if available
let Article, Video, Scheme;
try {
    Article = require('../models/Article');
    Video = require('../models/Video');
    Scheme = require('../models/Scheme');
} catch (err) {
    // Graceful fallback if any learning model is defined differently
}

// Districts data map for location extraction
const ALL_STATES = ["West Bengal", "Jharkhand", "Assam", "Odisha", "Bihar"];

const normalize = (text) => (text || '').toLowerCase().trim();

/**
 * Main AI Engine Process Function
 */
async function processAIRequest({ message = '', context = {}, user = null, language = 'en' }) {
    const raw = message.trim();
    const norm = normalize(raw);

    // 1. LEARNING / EDUCATIONAL QUERY
    if (isLearningQuery(norm)) {
        return await handleLearningQA(norm, raw, language);
    }

    // 2. MARKETPLACE FORM ASSISTANT (selling / buying / guided creation)
    return handleMarketplaceFormAssistant(norm, raw, context, user, language);
}

/**
 * Check if input is a learning query
 */
function isLearningQuery(norm) {
    const learnKeywords = ['how to', 'grow', 'feed amount', 'disease', 'treatment', 'biofloc', 'what is', 'recommend', 'video', 'article', 'scheme', 'government', 'blog', 'farming', 'kivabe', 'chash', 'rog', 'chikitsha', 'sarkari', 'kaise', 'kheti', 'palan', 'ilaj', 'upchar', 'yojana', 'kipari', 'chasa', 'roga', 'chikitsa', 'কিভাবে', 'কীভাবে', 'চাষ', 'রোগ', 'চিকিৎসা', 'বায়োফ্লক', 'ভিডিও', 'সরকারি', 'স্কিম', 'कैसे', 'खेती', 'पालन', 'इलाज', 'उपचार', 'योजना', 'କିପରି', 'ଚାଷ', 'ରୋଗ', 'ଚିକିତ୍ସା', 'ଯୋଜନା'];
    return learnKeywords.some(k => norm.includes(k));
}

/**
 * Handle Learning QA & Resource Recommendations
 */
async function handleLearningQA(norm, raw, language) {
    let answer = '';
    if (language === 'bn') {
        answer = "অনুকূল জলজ পালনের বৃদ্ধির জন্য, সঠিক জলের পিএইচ (৭.৫-৮.৫), দ্রবীভূত অক্সিজেনের মাত্রা (>৫ মিলিগ্রাম/লিটার) বজায় রাখুন এবং প্রতিদিন শরীরের ওজনের ২-৩% খাবার দিন।";
    } else if (language === 'hi') {
        answer = "इष्टतम जलीय कृषि विकास के लिए, उचित जल पीएच (7.5-8.5), घुलनशील ऑक्सीजन स्तर (>5 मिलीग्राम/लीटर) बनाए रखें और दैनिक रूप से शरीर के वजन का 2-3% चारा खिलाएं।";
    } else if (language === 'or') {
        answer = "ଉତ୍ତମ ମତ୍ସ୍ୟ ଚାଷ ବୃଦ୍ଧି ପାଇଁ, ଜଳର pH (୭.୫-୮.୫), ଦ୍ରବୀଭୂତ ଅମ୍ଳଜାନ ସ୍ତର (>୫ mg/L) ବଜାୟ ରଖନ୍ତୁ ଏବଂ ଦୈନିକ ଶରୀରର ଓଜନର ୨-୩% ଖାଦ୍ୟ ଦିଅନ୍ତୁ।";
    } else {
        answer = "For optimal aquaculture growth, maintain proper water pH (7.5-8.5), dissolved oxygen levels (>5 mg/L), and feed 2-3% of body weight daily.";
    }

    if (norm.includes('biofloc') || norm.includes('বায়োফ্লক') || norm.includes('बायोफ्लॉक') || norm.includes('ବାୟୋଫ୍ଲକ୍')) {
        if (language === 'bn') {
            answer = "**বায়োফ্লক প্রযুক্তি (BFT)** হল একটি পরিবেশ-বান্ধব মৎস্য চাষ পদ্ধতি যা উপকারী ব্যাকটেরিয়া এবং উচ্চ বায়ুচলাচল ব্যবহার করে ক্ষতিকারক নাইট্রোজেন ঘটিত বর্জ্যকে অণুজীব প্রোটিন খাদ্যে রূপান্তরিত করে।";
        } else if (language === 'hi') {
            answer = "**बायोफ्लॉक तकनीक (BFT)** एक पर्यावरण-अनुकूल जलीय कृषि तकनीक है जो लाभकारी बैक्टीरिया और उच्च वातन का उपयोग करके हानिकारक नाइट्रोजन युक्त कचरे को सूक्ष्मजीवी प्रोटीन फ़ीड में बदल देती।";
        } else if (language === 'or') {
            answer = "**ବାୟୋଫ୍ଲକ୍ ଟେକ୍ନୋଲୋଜି (BFT)** ହେଉଛି ଏକ ପରିବେଶ ଅନୁକୂଳ ମତ୍ସ୍ୟ ଚାଷ ପଦ୍ଧତି ଯାହା ଉପକାରୀ ବ୍ୟାକ୍ଟେରିଆ ଏବଂ ଉଚ୍ଚ ବାୟୁ ଚଳାଚଳ ବ୍ୟବହାର କରି କ୍ଷତିକାରକ ନାଇଟ୍ରୋଜେନ୍ ଆବର୍ଜନାକୁ ମାଇକ୍ରୋବିଆଲ୍ ପ୍ରୋଟିନ୍ ଖାଦ୍ୟରେ ପରିଣତ କରେ।";
        } else {
            answer = "**Biofloc Technology (BFT)** is an eco-friendly aquaculture technique that converts toxic nitrogenous waste into microbial protein feed using beneficial bacteria and high aeration.";
        }
    } else if (norm.includes('disease') || norm.includes('treatment') || norm.includes('রোগ') || norm.includes('চিকিৎসা') || norm.includes('ইলাজ') || norm.includes('उपचार') || norm.includes('ରୋଗ') || norm.includes('ଚିକିତ୍ସା')) {
        if (language === 'bn') {
            answer = "সাধারণ মাছের রোগগুলোর মধ্যে রয়েছে ক্ষত রোগ (EUS) এবং ফুলকা পচা। মৎস্য চাষের নির্দেশিকা অনুযায়ী পটাশিয়াম পারম্যাঙ্গানেট (২-৩ পিপিএম) বা সিফ্যাক্স (CIFAX) দিয়ে জল শোধন করুন।";
        } else if (language === 'hi') {
            answer = "मछली की आम बीमारियों में एपिजूटिक अल्सरेटिव सिंड्रोम (EUS) और गिल रॉट शामिल हैं। जलीय कृषि दिशानिर्देशों के अनुसार पोटेशियम परमैंगनेट (2-3 पीपीएम) या सीफैक्स (CIFAX) से पानी का उपचार करें।";
        } else if (language === 'or') {
            answer = "ସାଧାରଣ ମାଛ ରୋଗଗୁଡିକ ମଧ୍ୟରେ ଏପିଜୁଟିକ୍ ଅଲସରେଟିଭ୍ ସିଣ୍ଡ୍ରୋମ୍ (EUS) ଏବଂ ଗିଲ୍ ରଟ୍ (କାତି ପଚା) ଅନ୍ତର୍ଭୁକ୍ତ। ମତ୍ସ୍ୟ ଚାଷ ନିର୍ଦ୍ଦେଶାବଳୀ ଅନୁଯାୟୀ ପୋଟାସିୟମ୍ ପରମାଙ୍ଗାନେଟ୍ (୨-୩ ppm) କିମ୍ବା ସିଫାକ୍ସ (CIFAX) ସହିତ ଜଳ ଚିକିତ୍ସା କରନ୍ତୁ।";
        } else {
            answer = "Common fish diseases include Epizootic Ulcerative Syndrome (EUS) and Gill Rot. Treat water with Potassium Permanganate (2-3 ppm) or CIFAX as per aquaculture guidelines.";
        }
    }

    return {
        type: 'learning_qa',
        intent: 'learning',
        reply: answer
    };
}

function convertIndicDigitsToAscii(str = '') {
    return (str || '')
        .replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d))
        .replace(/[०-९]/g, d => '०१२३४५६७८९'.indexOf(d))
        .replace(/[୦-୯]/g, d => '୦୧୨୩୪୫୬୭୮୯'.indexOf(d));
}

// ─────────────────────────────────────────────────────────────────────────────
// GUIDED FIELD SEQUENCES — category-aware BUY flow
// ─────────────────────────────────────────────────────────────────────────────

const GUIDED_FIELDS_SELL = [
    'actionType', 'category', 'productName', 'quantity', 'unit', 'price', 'mrp',
    'district', 'localDistrict', 'policeStation', 'phoneNumber'
];

// Equipment has no quantity/unit — sold as a whole item
const GUIDED_FIELDS_SELL_EQUIPMENT = [
    'actionType', 'category', 'productName', 'price', 'mrp',
    'district', 'localDistrict', 'policeStation', 'phoneNumber'
];

const GUIDED_FIELDS_BUY_FISH = [
    'actionType', 'category', 'productName', 'fishSize', 'quantity', 'unit',
    'price', 'district', 'localDistrict', 'policeStation', 'phoneNumber', 'additionalRequirement'
];

const GUIDED_FIELDS_BUY_FEED = [
    'actionType', 'category', 'productName', 'feedType', 'packingSize', 'quantity', 'unit',
    'price', 'district', 'localDistrict', 'policeStation', 'phoneNumber', 'additionalRequirement'
];

const GUIDED_FIELDS_BUY_MEDICINE = [
    'actionType', 'category', 'productName', 'packingSize', 'quantity', 'unit',
    'price', 'district', 'localDistrict', 'policeStation', 'phoneNumber', 'additionalRequirement'
];

function getGuidedFields(actionType, category) {
    if (actionType !== 'buying') {
        if ((category || '').toLowerCase() === 'equipment') return GUIDED_FIELDS_SELL_EQUIPMENT;
        return GUIDED_FIELDS_SELL;
    }
    const cat = (category || '').toLowerCase();
    if (cat === 'fish') return GUIDED_FIELDS_BUY_FISH;
    if (cat === 'feed') return GUIDED_FIELDS_BUY_FEED;
    if (cat === 'medicine') return GUIDED_FIELDS_BUY_MEDICINE;
    // Unknown category or not yet set — use fish as default
    return GUIDED_FIELDS_BUY_FISH;
}

// ─────────────────────────────────────────────────────────────────────────────
// Questions per field, per language
// ─────────────────────────────────────────────────────────────────────────────

function getQuestion(field, language, result) {
    const isSelling = result.actionType !== 'buying';
    const cat = (result.category || '').toLowerCase();
    const unit = result.unit || 'unit';

    const Q = {
        actionType: {
            en: '🛒 Do you want to **sell** or **buy**?',
            bn: '🛒 আপনি কি **বিক্রি** করতে চান নাকি **কিনতে** চান?',
            hi: '🛒 आप **बेचना** चाहते हैं या **खरीदना**?',
            or: '🛒 ଆପଣ **ବିକ୍ରି** କରିବାକୁ ଚାହାଁନ୍ତି କି **କିଣିବାକୁ**?'
        },
        category: {
            en: `🛒 What do you want to ${isSelling ? 'sell' : 'buy'}? (Fish, Spawn, Fingerling, Feed, Medicine, or Equipment)`,
            bn: `🛒 আপনি কী ${isSelling ? 'বিক্রি' : 'কিনতে'} চান? (মাছ, রেণু পোনা, পোনা, খাবার, ওষুধ, বা যন্ত্রপাতি)`,
            hi: `🛒 आप क्या ${isSelling ? 'बेचना' : 'खरीदना'} चाहते हैं? (मछली, रेणु, पोना, चारा, दवा, या उपकरण)`,
            or: `🛒 ଆପଣ କ'ଣ ${isSelling ? 'ବିକ୍ରି' : 'କିଣିବାକୁ'} ଚାହୁଁଛନ୍ତି? (ମାଛ, ରେଣୁ ପୋନା, ପୋନା, ଖାଦ୍ୟ, ଔଷଧ, ବା ଉପକରଣ)`
        },
        productName: {
            en: cat === 'feed'
                ? '✏️ What type of feed do you want to sell? (e.g. Pre-Starter Fish Feed)'
                : cat === 'medicine'
                    ? '✏️ What medicine or product do you want to sell? (e.g. C-Pack)'
                    : cat === 'equipment'
                        ? '✏️ What equipment do you want to sell? (e.g. Aerator, Fish Feed Pump, Net)'
                        : '✏️ What type of fish do you want to sell? (e.g. Rohu, Catla)',
            bn: cat === 'feed'
                ? '✏️ কী ধরনের খাবার বিক্রি করতে চান? (যেমন: প্রি-স্টার্টার মাছের খাবার)'
                : cat === 'medicine'
                    ? '✏️ কোন ওষুধ বিক্রি করতে চান? (যেমন: সি-প্যাক)'
                    : cat === 'equipment'
                        ? '✏️ কী যন্ত্রপাতি বিক্রি করতে চান? (যেমন: এরেটর, পাম্প, জাল)'
                        : '✏️ কোন মাছ বিক্রি করতে চান? (যেমন: রুই, কাতলা)',
            hi: cat === 'feed'
                ? '✏️ किस प्रकार का चारा बेचना है? (जैसे: प्री-स्टार्टर मछली चारा)'
                : cat === 'medicine'
                    ? '✏️ कौन सी दवा बेचनी है? (जैसे: C-Pack)'
                    : cat === 'equipment'
                        ? '✏️ कौन सा उपकरण बेचना है? (जैसे: एरेटर, पंप, जाल)'
                        : '✏️ कौन सी मछली बेचनी है? (जैसे: रोहू, कतला)',
            or: cat === 'feed'
                ? '✏️ ଆପଣ କେଉଁ ଖାଦ୍ୟ ବିକ୍ରି କରିବାକୁ ଚାହୁଁଛନ୍ତି? (ଯଥା: ପ୍ରି-ଷ୍ଟାର୍ଟର ମାଛ ଖାଦ୍ୟ)'
                : cat === 'medicine'
                    ? '✏️ ଆପଣ କେଉଁ ଔଷଧ ବିକ୍ରି କରିବାକୁ ଚାହୁଁଛନ୍ତି? (ଯଥା: C-Pack)'
                    : cat === 'equipment'
                        ? '✏️ ଆପଣ କେଉଁ ଉପକରଣ ବିକ୍ରି କରିବାକୁ ଚାହୁଁଛନ୍ତି? (ଯଥା: ଏରେଟର, ପମ୍ପ, ଜାଲ)'
                        : '✏️ ଆପଣ କେଉଁ ମାଛ ବିକ୍ରି କରିବାକୁ ଚାହୁଁଛନ୍ତି? (ଯଥା: ରୋହୁ, କଟ୍ଲା)'
        },
        fishSize: {
            en: '📏 What size fish do you need? (e.g. 2-3 kg per piece, 500g each)',
            bn: '📏 মাছের আকার কত? (যেমন: প্রতিটি ২-৩ কেজি, ৫০০ গ্রাম করে)',
            hi: '📏 आपको कितने आकार की मछली चाहिए? (जैसे: 2-3 किग्रा प्रति पीस)',
            or: '📏 ଆପଣ କେତେ ଆକାରର ମାଛ ଚାହୁଁଛନ୍ତି? (ଯଥା: 2-3 kg/ଟି)'
        },
        feedType: {
            en: '🌾 What type of feed is it? (e.g. Pre-Starter, Starter, Grower, Finisher)',
            bn: '🌾 খাবারের ধরন কী? (যেমন: প্রি-স্টার্টার, স্টার্টার, গ্রোয়ার, ফিনিশার)',
            hi: '🌾 चारे का प्रकार क्या है? (जैसे: प्री-स्टार्टर, स्टार्टर, ग्रोअर, फिनिशर)',
            or: '🌾 ଖାଦ୍ୟର ପ୍ରକାର କ\'ଣ? (ଯଥା: ପ୍ରି-ଷ୍ଟାର୍ଟର, ଷ୍ଟାର୍ଟର, ଗ୍ରୋୟର, ଫିନିଶର)'
        },
        packingSize: {
            en: cat === 'medicine'
                ? '📦 What packing or size do you need? (e.g. 1 kg pack, 500 ml bottle)'
                : '📦 What packing size do you need? (e.g. 50 kg bag, 25 kg bag)',
            bn: cat === 'medicine'
                ? '📦 কী পরিমাণের প্যাক দরকার? (যেমন: ১ কেজি প্যাক, ৫০০ মিলি বোতল)'
                : '📦 প্যাকিং সাইজ কত? (যেমন: ৫০ কেজি বস্তা, ২৫ কেজি বস্তা)',
            hi: cat === 'medicine'
                ? '📦 आपको कितने पैक की जरूरत है? (जैसे: 1 kg पैक, 500 ml बोतल)'
                : '📦 पैकिंग साइज क्या है? (जैसे: 50 kg बैग, 25 kg बैग)',
            or: cat === 'medicine'
                ? '📦 ଆପଣ କେତେ ପ୍ୟାକ ଚାହୁଁଛନ୍ତି? (ଯଥା: 1 kg ପ୍ୟାକ, 500 ml ବୋତଲ)'
                : '📦 ପ୍ୟାକିଂ ସାଇଜ କ\'ଣ? (ଯଥା: 50 kg ବ୍ୟାଗ, 25 kg ବ୍ୟାଗ)'
        },
        quantity: {
            en: `📦 How much quantity do you want to ${isSelling ? 'sell' : 'buy'}? (e.g. 1000 kg, 50 bags)`,
            bn: `📦 কত পরিমাণ ${isSelling ? 'বিক্রি' : 'কিনতে'} চান? (যেমন: ১০০০ কেজি, ৫০ বস্তা)`,
            hi: `📦 आप कितनी मात्रा ${isSelling ? 'बेचना' : 'खरीदना'} चाहते हैं? (जैसे: 1000 kg, 50 बैग)`,
            or: `📦 ଆପଣ କେତେ ପରିମାଣ ${isSelling ? 'ବିକ୍ରି' : 'କିଣିବାକୁ'} ଚାହୁଁଛନ୍ତି? (ଯଥା: 1000 kg, 50 ବ୍ୟାଗ)`
        },
        unit: {
            en: '⚖️ What unit? (kg, bags, packs, pieces, gm, ton)',
            bn: '⚖️ কোন ইউনিট? (কেজি, বস্তা, প্যাক, পিস, গ্রাম, টন)',
            hi: '⚖️ कौन सी इकाई? (kg, bags, packs, pieces, gm, ton)',
            or: '⚖️ କେଉଁ ୟୁନିଟ? (kg, bags, packs, pieces, gm, ton)'
        },
        price: {
            en: isSelling
                ? cat === 'equipment'
                    ? '💰 What is your selling price? (e.g. ₹5000, ₹12000)'
                    : `💰 What is your price per ${unit}? (e.g. ₹220/kg, ₹5000/ton)`
                : `💰 What is your budget per ${unit}? (e.g. ₹220/kg, ₹2500/bag)`,
            bn: isSelling
                ? cat === 'equipment'
                    ? '💰 বিক্রয় মূল্য কত? (যেমন: ₹৫০০০, ₹১২০০০)'
                    : `💰 প্রতি ${unit} মূল্য কত? (যেমন: ₹২২০/কেজি)`
                : `💰 প্রতি ${unit} বাজেট কত? (যেমন: ₹২২০/কেজি, ₹২৫০০/বস্তা)`,
            hi: isSelling
                ? cat === 'equipment'
                    ? '💰 विक्रय मूल्य क्या है? (जैसे: ₹5000, ₹12000)'
                    : `💰 प्रति ${unit} कीमत कितनी है? (जैसे: ₹220/kg)`
                : `💰 प्रति ${unit} बजट कितना है? (जैसे: ₹220/kg, ₹2500/bag)`,
            or: isSelling
                ? cat === 'equipment'
                    ? '💰 ବିକ୍ରୟ ମୂଲ୍ୟ କେତେ? (ଯଥା: ₹5000, ₹12000)'
                    : `💰 ପ୍ରତି ${unit} ମୂଲ୍ୟ କେତେ? (ଯଥା: ₹220/kg)`
                : `💰 ପ୍ରତି ${unit} ବଜେଟ୍ କେତେ? (ଯଥା: ₹220/kg, ₹2500/bag)`
        },
        mrp: {
            en: '🏷️ What is the MRP / Original Price? (e.g. ₹8000) — buyers will see the discount',
            bn: '🏷️ MRP / আসল মূল্য কত? (যেমন: ₹৮০০০) — ক্রেতারা ছাড় দেখতে পাবেন',
            hi: '🏷️ MRP / मूल मूल्य क्या है? (जैसे: ₹8000) — खरीदारों को छूट दिखेगी',
            or: '🏷️ MRP / ମୂଳ ମୂଲ୍ୟ କେତେ? (ଯଥା: ₹8000) — କ୍ରେତାମାନେ ଛାଡ ଦେଖିବେ'
        },
        district: {
            en: '📍 Which state are you buying in? (e.g. West Bengal, Jharkhand, Odisha, Assam, Bihar)',
            bn: '📍 আপনি কোন রাজ্যে কিনতে চান? (যেমন: পশ্চিমবঙ্গ, ঝাড়খণ্ড, ওড়িশা)',
            hi: '📍 आप किस राज्य में खरीदना चाहते हैं? (जैसे: पश्चिम बंगाल, झारखंड, ओडिशा)',
            or: '📍 ଆପଣ କେଉଁ ରାଜ୍ୟରେ କିଣିବାକୁ ଚାହୁଁଛନ୍ତି? (ଯଥା: ପଶ୍ଚିମ ବଙ୍ଗ, ଝାଡ଼ଖଣ୍ଡ, ଓଡ଼ିଶା)'
        },
        localDistrict: {
            en: '🗺️ Which district? (e.g. Malda, Purba Medinipur, Cuttack)',
            bn: '🗺️ কোন জেলা? (যেমন: মালদা, পূর্ব মেদিনীপুর, কটক)',
            hi: '🗺️ कौन सा जिला? (जैसे: मालदा, पूर्व मेदिनीपुर, कटक)',
            or: '🗺️ କେଉଁ ଜିଲ୍ଲା? (ଯଥା: ମାଲଦା, ପୂର୍ବ ମେଦିନୀପୁର, କଟକ)'
        },
        policeStation: {
            en: '🏛️ Which police station / block? (e.g. Harishchandrapur, Tamluk)',
            bn: '🏛️ কোন থানা / ব্লক? (যেমন: হরিশ্চন্দ্রপুর, তমলুক)',
            hi: '🏛️ कौन सा थाना / ब्लॉक? (जैसे: हरिश्चंद्रपुर, तमलुक)',
            or: '🏛️ କେଉଁ ଥାନା / ବ୍ଲକ? (ଯଥା: ହରିଶ୍ଚନ୍ଦ୍ରପୁର, ତମଲୁକ)'
        },
        phoneNumber: {
            en: '📱 What is your contact number? (10-digit mobile number)',
            bn: '📱 আপনার যোগাযোগের নম্বর কত? (১০ সংখ্যার মোবাইল নম্বর)',
            hi: '📱 आपका संपर्क नंबर क्या है? (10-अंकीय मोबाइल नंबर)',
            or: '📱 ଆପଣଙ୍କ ଯୋଗାଯୋଗ ନମ୍ବର କ\'ଣ? (10 ଅଙ୍କ ବିଶିଷ୍ଟ ମୋବାଇଲ ନମ୍ବର)'
        },
        additionalRequirement: {
            en: '📝 Any additional requirements? (e.g. fresh only, delivery needed, preferred brand) — or say "no" to skip.',
            bn: '📝 অতিরিক্ত কোনো চাহিদা আছে? (যেমন: তাজা মাছ, ডেলিভারি দরকার) — না থাকলে "না" বলুন।',
            hi: '📝 कोई अतिरिक्त आवश्यकता है? (जैसे: ताजा मछली, डिलीवरी चाहिए) — नहीं हो तो "नहीं" कहें।',
            or: '📝 ଅତିରିକ୍ତ କୌଣସି ଆବଶ୍ୟକତା ଅଛି? (ଯଥା: ତାଜା ମାଛ, ଡେଲିଭରି ଦରକାର) — ନ ଥିଲେ "ନା" କୁହନ୍ତୁ।'
        }
    };

    return (Q[field] || {})[language] || (Q[field] || {}).en || '';
}

/**
 * Handle Marketplace Form Assistant (Creation & Auto-fill)
 */
function handleMarketplaceFormAssistant(norm, raw, context = {}, user = {}, language = 'en') {
    const normAscii = convertIndicDigitsToAscii(norm);

    // ── Initial state — preserve all context fields ────────────────────────
    const result = {
        actionType: context.actionType || null,
        category: context.category || null,
        productName: context.productName || '',
        // Category-specific
        fishSize: context.fishSize || '',
        feedType: context.feedType || '',
        packingSize: context.packingSize || '',
        medicineType: context.medicineType || '',
        strength: context.strength || '',
        // Common
        quantity: context.quantity || '',
        unit: context.unit || '',
        price: context.price || '',
        mrp: context.mrp || '',
        district: context.district || user?.district || '',
        localDistrict: context.localDistrict || user?.localDistrict || '',
        policeStation: context.policeStation || user?.policeStation || '',
        phoneNumber: context.phoneNumber || user?.phone || '',
        additionalRequirement: context.additionalRequirement || '',
        title: context.title || '',
        description: context.description || '',
        isComplete: false,
        missingFields: [],
        nextQuestion: null,
        nextField: null
    };

    if (!norm) return formatFormResponse(result, user, language);

    const activeField = context.nextField;

    // ─── 0. CORRECTION HANDLING ───────────────────────────────────────────
    let isCorrection = false;

    // Correcting Quantity
    const qtyChangeMatch = normAscii.match(/(?:change|set|update|actually\b|modify)?\s*(?:qty|quantity|amount)\s*(?:to|is|=)?\s*(\d+(?:\.\d+)?)\s*(kg|kilo|kilogram|kilograms|gm|gram|grams|piece|pieces|pcs|pc|mound|mounds|mon|maund|ton|tons|bag|bags|pack|packs|quintal|কেজি|গ্রাম|পিস|টন|বস্তা|মন)?/i);
    if (qtyChangeMatch) {
        result.quantity = qtyChangeMatch[1];
        if (qtyChangeMatch[2]) result.unit = normalizeUnit(qtyChangeMatch[2]);
        isCorrection = true;
    }

    // Correcting Price / Budget
    const priceChangeMatch = normAscii.match(/(?:change|set|update|actually\b|modify)?\s*(?:price|budget|rate)\s*(?:to|is|=)?\s*(?:rs\.?|₹|taka|inr)?\s*(\d+(?:\.\d+)?)/i) ||
                             normAscii.match(/^(?:price|budget)\s+(?:is\s+)?(\d+(?:\.\d+)?)$/i);
    if (priceChangeMatch) {
        result.price = priceChangeMatch[1];
        isCorrection = true;
    }

    // Direct state correction
    const stateList = ["West Bengal", "Jharkhand", "Assam", "Odisha", "Bihar"];
    for (const st of stateList) {
        if (norm.includes(`state is ${st.toLowerCase()}`) || norm.includes(`state to ${st.toLowerCase()}`)) {
            result.district = st;
            isCorrection = true;
        }
    }

    // ─── 1. ACTION TYPE ───────────────────────────────────────────────────
    const buyingKw = [
        'buy', 'buying', 'need', 'require', 'requirement', 'purchase', 'kinte', 'kinbo', 'lagbe', 'chai', 'dorkar', 'khared', 'khareed',
        'ক্রয়', 'কিনতে', 'কিনব', 'ক্রয় পোস্ট', 'দরকার', 'লাগবে', 'চাই', 'কেনা',
        'खरीदना', 'खरीद', 'चाहिए', 'क्रय', 'खरीदना है',
        'କିଣିବା', 'କ୍ରୟ', 'ଦରକାର'
    ];
    const sellingKw = [
        'sell', 'selling', 'sale', 'sales', 'offer', 'listing', 'list', 'bechna', 'bechbo', 'bikri', 'bikroy', 'bechne', 'bechunga',
        'বিক্রয়', 'বিক্রি', 'বেচবো', 'বিক্রয় তালিকা', 'বেচা', 'বিক্রি করতে', 'তালিকা', 'বেচব', 'তালিকা তৈরি',
        'बेचना', 'बिक्री', 'विक्रय', 'बिक्री सूची', 'बेचना है', 'बेचूंगा',
        'ବିକ୍ରୟ', 'ବିକ୍ରି', 'ବିକ୍ରି ତାଲିକା'
    ];

    if (!result.actionType) {
        const isBuying = buyingKw.some(k => norm.includes(k));
        const isSelling = sellingKw.some(k => norm.includes(k));
        if (isBuying && !isSelling) result.actionType = 'buying';
        else if (isSelling && !isBuying) result.actionType = 'selling';
        else if (isBuying && isSelling) {
            const firstBuyIdx = Math.min(...buyingKw.map(k => norm.indexOf(k)).filter(i => i !== -1));
            const firstSellIdx = Math.min(...sellingKw.map(k => norm.indexOf(k)).filter(i => i !== -1));
            result.actionType = firstBuyIdx < firstSellIdx ? 'buying' : 'selling';
        } else if (activeField === 'actionType') {
            if (norm.includes('sell') || norm.includes('বিক্রি') || norm.includes('बेचना') || norm.includes('ବିକ୍ରି')) {
                result.actionType = 'selling';
            } else if (norm.includes('buy') || norm.includes('কিনতে') || norm.includes('खरीद') || norm.includes('କିଣି')) {
                result.actionType = 'buying';
            } else {
                result.actionType = 'selling';
            }
        }
    }

    // ─── 2. CATEGORY ──────────────────────────────────────────────────────
    const categoryKeywords = {
        Equipment: ['equipment', 'aerator', 'pump', 'net', 'feeder', 'generator', 'blower', 'paddle', 'motor', 'tester', 'meter', 'machine', 'tank', 'যন্ত্রপাতি', 'উপকরণ', 'পাম্প', 'জাল', 'মোটর', 'মেশিন', 'उपकरण', 'पंप', 'जाल', 'मोटर', 'मशीन', 'ଉପକରଣ', 'ଯନ୍ତ୍ରପାତି', 'ପମ୍ପ', 'ଜାଲ', 'ମୋଟର', 'ମେସିନ୍'],
        Feed: ['feed', 'khabar', 'dana', 'pre-starter', 'prestarter', 'starter', 'grower', 'finisher', 'pellet', 'খাবার', 'চারা', 'চারাখাবার', 'खाना', 'चारा', 'ଖାଦ୍ୟ'],
        Medicine: ['medicine', 'dawa', 'probiotic', 'antibiotic', 'c-pack', 'cpack', 'cifax', 'potassium', 'powder', 'liquid', 'tablet', 'capsule', 'ওষুধ', 'দাওয়া', 'দবাই', 'दवा', 'ঔষধ', 'ଔଷଧ'],
        Spawn: ['spawn', 'renu', 'রেণু', 'पिला', 'ରେଣୁ'],
        Fingerling: ['fingerling', 'chara', 'seed', 'পোনা', 'बीज', 'ପୋନା'],
        Fish: ['rohu', 'rui', 'katla', 'catla', 'fish', 'mach', 'মাছ', 'মাচ', 'মাছের', 'मछली', 'ମାଛ', 'mrigal', 'pangas', 'pangash', 'tilapia', 'koi', 'singhi', 'magur', 'silver carp', 'grass carp', 'common carp', 'shrimp', 'prawn']
    };

    if (!result.category) {
        for (const [cat, kws] of Object.entries(categoryKeywords)) {
            if (kws.some(k => norm.includes(k))) {
                // Map to buying-supported categories
                if (cat === 'Equipment' || cat === 'Spawn' || cat === 'Fingerling') {
                    // Route unsupported buying categories to Fish as default
                    result.category = result.actionType === 'buying' ? 'Fish' : cat;
                } else {
                    result.category = cat;
                }
                break;
            }
        }
        if (!result.category && activeField === 'category') {
            const catMap = {
                'fish': 'Fish', 'মাছ': 'Fish', 'मछली': 'Fish',
                'spawn': 'Spawn', 'renu': 'Spawn', 'রেণু': 'Spawn',
                'fingerling': 'Fingerling', 'chara': 'Fingerling', 'পোনা': 'Fingerling',
                'feed': 'Feed', 'খাবার': 'Feed', 'খাদ্য': 'Feed', 'चारा': 'Feed',
                'medicine': 'Medicine', 'ওষুধ': 'Medicine', 'ঔষধ': 'Medicine', 'दवा': 'Medicine',
                'equipment': 'Equipment', 'যন্ত্রপাতি': 'Equipment', 'উপকরণ': 'Equipment', 'उपकरण': 'Equipment'
            };
            for (const [k, v] of Object.entries(catMap)) {
                if (norm.includes(k)) { result.category = v; break; }
            }
            if (!result.category) result.category = 'Fish';
        }
    }

    const catLower = (result.category || '').toLowerCase();

    // ─── 3. PRODUCT NAME ──────────────────────────────────────────────────
    if (!result.productName) {
        if (activeField === 'productName') {
            // Capture the full answer as product name
            result.productName = raw.charAt(0).toUpperCase() + raw.slice(1);
        } else {
            // Try to find known fish names
            const fishNames = ['rohu', 'rui', 'katla', 'catla', 'mrigal', 'pangas', 'pangash', 'tilapia', 'koi', 'singhi', 'magur', 'silver carp', 'grass carp', 'common carp', 'shrimp', 'prawn'];
            for (const f of fishNames) {
                if (norm.includes(f)) {
                    result.productName = f.charAt(0).toUpperCase() + f.slice(1);
                    if (!result.category) result.category = 'Fish';
                    break;
                }
            }
            // Equipment names — don't use generic intent phrases as product names
            if (!result.productName && catLower === 'equipment') {
                const equipNames = ['aerator', 'pump', 'net', 'feeder', 'generator', 'blower', 'paddle wheel', 'motor', 'water tester', 'ph meter', 'do meter', 'machine', 'tank', 'filter'];
                for (const eq of equipNames) {
                    if (norm.includes(eq)) {
                        result.productName = eq.replace(/\b\w/g, c => c.toUpperCase());
                        break;
                    }
                }
            }
            // Feed type names that double as product name
            if (!result.productName && catLower === 'feed') {
                const feedTypeMatch = norm.match(/\b(pre-?starter|starter|grower|finisher)\b/i);
                if (feedTypeMatch) {
                    const ft = feedTypeMatch[1].charAt(0).toUpperCase() + feedTypeMatch[1].slice(1).replace('-', '-');
                    result.feedType = result.feedType || ft;
                    result.productName = result.productName || `${ft} Fish Feed`;
                }
            }
            // Medicine names
            if (!result.productName && catLower === 'medicine') {
                const medMatch = norm.match(/\b(c-?pack|cifax|potassium permanganate|probiotic|antibiotic)\b/i);
                if (medMatch) {
                    result.productName = medMatch[1].toUpperCase().replace(/\b\w/g, c => c.toUpperCase());
                }
            }
        }
    }

    // ─── 4. FISH SIZE (fish category only) ───────────────────────────────
    if (catLower === 'fish' && !result.fishSize) {
        // Patterns: "2-3 kg", "2 to 3 kg per piece", "500g each", "2kg each"
        const fishSizeMatch = normAscii.match(/(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*(kg|gm|g|gram)\s*(?:per\s*)?(?:piece|pcs|pc|each|টি|piece)?/i);
        if (fishSizeMatch) {
            result.fishSize = `${fishSizeMatch[1]}-${fishSizeMatch[2]} ${normalizeUnit(fishSizeMatch[3])}/piece`;
        } else {
            const singleSizeMatch = normAscii.match(/(\d+(?:\.\d+)?)\s*(kg|gm|g|gram)\s*(?:per\s*)?(?:piece|pcs|pc|each|টি)?/i);
            if (singleSizeMatch && !normAscii.match(/\d+\s*(kg|gm)\s*(bags?|packs?|pieces?)/i)) {
                result.fishSize = `${singleSizeMatch[1]} ${normalizeUnit(singleSizeMatch[2])}/piece`;
            }
        }
        if (!result.fishSize && activeField === 'fishSize') {
            result.fishSize = raw.trim();
        }
    }

    // ─── 5. FEED TYPE (feed category only) ───────────────────────────────
    if (catLower === 'feed' && !result.feedType) {
        const feedTypeMatch = norm.match(/\b(pre-?starter|prestarter|starter|grower|finisher)\b/i);
        if (feedTypeMatch) {
            const ft = feedTypeMatch[1].replace('-', '-').replace(/\b\w/g, c => c.toUpperCase());
            result.feedType = ft;
        } else if (activeField === 'feedType') {
            result.feedType = raw.trim();
        }
    }

    // ─── 6. PACKING SIZE (feed & medicine) ───────────────────────────────
    if ((catLower === 'feed' || catLower === 'medicine') && !result.packingSize) {
        // Patterns: "50 kg bag", "1 kg pack", "500 ml bottle", "50kg/bag"
        const packMatch = normAscii.match(/(\d+(?:\.\d+)?)\s*(kg|gm|g|ml|liter|litre|l)\s*(?:per\s*)?(?:bag|bags|pack|packs|bottle|packet|বস্তা|প্যাক)/i);
        if (packMatch) {
            const packUnit = packMatch[3] || packMatch[4] || 'bag';
            result.packingSize = `${packMatch[1]} ${packMatch[2]}/${packUnit.replace(/s$/, '')}`;
        } else if (activeField === 'packingSize') {
            result.packingSize = raw.trim();
        }
    }

    // ─── 7. MEDICINE TYPE (medicine category) ────────────────────────────
    if (catLower === 'medicine' && !result.medicineType) {
        const medTypeMatch = norm.match(/\b(powder|liquid|tablet|tablets|capsule|capsules|gel|suspension)\b/i);
        if (medTypeMatch) {
            result.medicineType = medTypeMatch[1].charAt(0).toUpperCase() + medTypeMatch[1].slice(1);
        } else if (activeField === 'medicineType') {
            result.medicineType = raw.trim();
        }
    }

    // ─── 8. STRENGTH (medicine, optional) ────────────────────────────────
    if (catLower === 'medicine' && !result.strength) {
        const strengthMatch = normAscii.match(/(\d+(?:\.\d+)?)\s*(mg|ml|mcg|iu|%)/i);
        if (strengthMatch) {
            result.strength = `${strengthMatch[1]} ${strengthMatch[2]}`;
        } else if (activeField === 'strength') {
            result.strength = raw.trim();
        }
    }

    // ─── 9. QUANTITY & UNIT ───────────────────────────────────────────────
    // Extended unit list to include bags, packs, pieces
    const unitPattern = '(kg|kilo|kilogram|kilograms|gm|gram|grams|piece|pieces|pcs|pc|mound|mounds|mon|maund|ton|tons|bag|bags|pack|packs|quintal|কেজি|গ্রাম|পিস|টন|বস্তা|মন)';
    const qtyMatchExt = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unitPattern}`, 'i').exec(normAscii);
    if (qtyMatchExt) {
        result.quantity = qtyMatchExt[1];
        result.unit = normalizeUnit(qtyMatchExt[2]);
    } else if (!result.quantity && activeField === 'quantity') {
        const numMatch = normAscii.match(/^(\d+(?:\.\d+)?)$/);
        if (numMatch) {
            result.quantity = numMatch[1];
        } else {
            const textNumMap = { 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'ten': 10, 'hundred': 100, 'thousand': 1000 };
            for (const [k, v] of Object.entries(textNumMap)) {
                if (norm === k) { result.quantity = String(v); break; }
            }
        }
    }

    // Unit if asked explicitly
    if (!result.unit && activeField === 'unit') {
        const u = normalizeUnit(norm);
        if (u) result.unit = u;
    }

    // ─── 10. PRICE / BUDGET ────────────────────────────────────────────────
    const priceMatchExt = normAscii.match(/(?:rs\.?|₹|taka|inr|price|budget|rate|mullo|dam|টাকা|रुपये|ଟଙ୍କା|মূল্য|দাম)\s*[:=]?\s*(\d+(?:\.\d+)?)/) ||
                          normAscii.match(/(\d+(?:\.\d+)?)\s*(?:rs|taka|inr|\/kg|per kg|rupees|per bag|per pack|per piece|টাকা|রুপি|ଟଙ୍କା|প্রতি|কেজি)/) ||
                          (activeField === 'price' && normAscii.match(/^(\d+(?:\.\d+)?)$/));
    if (priceMatchExt) {
        result.price = priceMatchExt[1];
    }

    // ─── 10b. MRP EXTRACTION ──────────────────────────────────────────────
    const mrpMatchExt = normAscii.match(/(?:mrp|original price|market price|list price)\s*[:=]?\s*(\d+(?:\.\d+)?)/i) ||
                        (activeField === 'mrp' && normAscii.match(/^(\d+(?:\.\d+)?)$/));
    if (mrpMatchExt) {
        result.mrp = mrpMatchExt[1];
    }

    // ─── 11. PHONE NUMBER ─────────────────────────────────────────────────
    const phoneMatchExt = normAscii.replace(/\s+/g, '').match(/(?:\+91)?([6-9]\d{9})/);
    if (phoneMatchExt) {
        result.phoneNumber = phoneMatchExt[1];
    } else if (activeField === 'phoneNumber') {
        const digitsOnly = normAscii.replace(/\D/g, '');
        if (digitsOnly.length === 10) result.phoneNumber = digitsOnly;
    }

    // ─── 12. LOCATION ─────────────────────────────────────────────────────
    for (const state of ALL_STATES) {
        if (norm.includes(normalize(state))) { result.district = state; break; }
    }
    if (norm.includes('west bengal') || norm.includes('পশ্চিমবঙ্গ') || norm.includes('पश्चिम बंगाल')) result.district = 'West Bengal';
    else if (norm.includes('odisha') || norm.includes('ଓଡ଼ିଶା') || norm.includes('ओडिशा')) result.district = 'Odisha';
    else if (norm.includes('assam') || norm.includes('আসাম') || norm.includes('असम')) result.district = 'Assam';
    else if (norm.includes('bihar') || norm.includes('বিহার') || norm.includes('बिहार')) result.district = 'Bihar';
    else if (norm.includes('jharkhand') || norm.includes('ঝাড়খণ্ড') || norm.includes('झारखंड')) result.district = 'Jharkhand';

    if (!result.district && activeField === 'district') {
        for (const state of ALL_STATES) {
            if (norm.includes(state.toLowerCase()) || state.toLowerCase().includes(norm)) {
                result.district = state; break;
            }
        }
    }

    if (!result.localDistrict && activeField === 'localDistrict') {
        result.localDistrict = raw.replace(/district/i, '').trim();
    }

    if (!result.policeStation && activeField === 'policeStation') {
        result.policeStation = raw.trim();
    }

    // ─── 13. ADDITIONAL REQUIREMENT ───────────────────────────────────────
    if (activeField === 'additionalRequirement') {
        // "no", "none", "skip", "নেই" etc. → set empty string to mark as answered
        const skipPhrases = ['no', 'none', 'skip', 'nope', 'nothing', 'না', 'নেই', 'নাহ', 'नहीं', 'ନାହିଁ'];
        if (skipPhrases.some(s => norm === s || norm.includes(s))) {
            result.additionalRequirement = '';
        } else {
            result.additionalRequirement = raw.trim();
        }
        // Mark as explicitly answered by setting a sentinel if empty
        result._additionalRequirementAnswered = true;
    }

    // ─── 14. FALLBACK PRODUCT NAME ─────────────────────────────────────────
    if (!result.productName && result.category && activeField !== 'productName') {
        let cleaned = norm
            .replace(/(?:\+91[\s-]?)?[6-9]\d{9}/g, '')
            .replace(new RegExp(`\\d+(?:\\.\\d+)?\\s*${unitPattern}`, 'gi'), '')
            .replace(/(?:rs\.?|₹|taka|inr|price|budget|rate|mullo|dam|টাকা|रुपये|ଟଙ୍କା|মূল্য|দাম)\s*[:=]?\s*\d+(?:\.\d+)?/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (cleaned.length > 2 && !cleaned.match(/^\d/)) {
            result.productName = cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
    }

    // ─── 15. VALIDATION FEEDBACK ──────────────────────────────────────────
    if (activeField === 'quantity' && norm && !result.quantity) {
        const fb = {
            en: 'Please specify a valid quantity. (e.g. 1000 kg, 50 bags, 20 packs)',
            bn: 'দয়া করে সঠিক পরিমাণ বলুন। (যেমন: ১০০০ কেজি, ৫০ বস্তা, ২০ প্যাক)',
            hi: 'कृपया सही मात्रा बताएं। (जैसे: 1000 kg, 50 bags, 20 packs)',
            or: 'ଦୟାକରି ସଠିକ ପରିମାଣ କୁହନ୍ତୁ। (ଯଥା: 1000 kg, 50 bags, 20 packs)'
        }[language];
        return { type: 'guided_creation', intent: 'marketplace_form', reply: fb, extractedData: { ...result, nextField: activeField } };
    }

    if (activeField === 'price' && norm && !result.price) {
        const fb = {
            en: 'Please specify a price/budget amount. (e.g. 220, 2500)',
            bn: 'দয়া করে মূল্য/বাজেট বলুন। (যেমন: ২২০, ২৫০০)',
            hi: 'कृपया मूल्य/बजट बताएं। (जैसे: 220, 2500)',
            or: 'ଦୟାକରି ମୂଲ୍ୟ/ବଜେଟ ଉଲ୍ଲେଖ କରନ୍ତୁ। (ଯଥା: 220, 2500)'
        }[language];
        return { type: 'guided_creation', intent: 'marketplace_form', reply: fb, extractedData: { ...result, nextField: activeField } };
    }

    if (activeField === 'phoneNumber' && norm) {
        const digitsOnly = normAscii.replace(/\D/g, '');
        if (digitsOnly.length > 0 && digitsOnly.length !== 10) {
            const fb = {
                en: 'Please provide a valid 10-digit mobile number.',
                bn: 'দয়া করে সঠিক ১০ সংখ্যার মোবাইল নম্বর দিন।',
                hi: 'कृपया सही 10-अंकीय मोबाइल नंबर दें।',
                or: 'ଦୟାକରି ସଠିକ 10-ଅଙ୍କ ବିଶିଷ୍ଟ ମୋବାଇଲ ନମ୍ବର ଦିଅନ୍ତୁ।'
            }[language];
            return { type: 'guided_creation', intent: 'marketplace_form', reply: fb, extractedData: { ...result, nextField: activeField } };
        }
    }

    return formatFormResponse(result, user, language);
}

function normalizeUnit(unitStr) {
    if (!unitStr) return '';
    const u = unitStr.toLowerCase().trim();
    if (['kg', 'kilo', 'kilogram', 'kilograms', 'কেজি', 'କେଜି'].includes(u)) return 'kg';
    if (['gm', 'gram', 'grams', 'g', 'গ্রাম', 'ଗ୍ରାମ'].includes(u)) return 'gm';
    if (['piece', 'pieces', 'pc', 'pcs', 'টি', 'ପିସ', 'ଟି'].includes(u)) return 'pieces';
    if (['mound', 'mounds', 'mon', 'maund', 'মন', 'ମଣ'].includes(u)) return 'mound';
    if (['ton', 'tons', 't', 'ଟନ', 'ଟନ୍', 'টন'].includes(u)) return 'ton';
    if (['bag', 'bags', 'বস্তা', 'ବସ୍ତା'].includes(u)) return 'bags';
    if (['pack', 'packs', 'packet', 'packets', 'প্যাক', 'ପ୍ୟାକ'].includes(u)) return 'packs';
    if (['quintal'].includes(u)) return 'quintal';
    return u;
}

/**
 * Determine which guided field sequence to use based on action + category
 */
function getNextMissingField(result) {
    const actionType = result.actionType;
    const catLower = (result.category || '').toLowerCase();
    const isEquipmentSelling = actionType === 'selling' && catLower === 'equipment';

    if (!actionType) return 'actionType';
    if (!result.category) return 'category';
    if (!result.productName) return 'productName';

    if (actionType === 'buying') {
        // Fish-specific
        if (catLower === 'fish') {
            if (!result.fishSize) return 'fishSize';
        }
        // Feed-specific
        if (catLower === 'feed') {
            if (!result.feedType) return 'feedType';
            if (!result.packingSize) return 'packingSize';
        }
        // Medicine-specific
        if (catLower === 'medicine') {
            if (!result.packingSize) return 'packingSize';
        }
    }

    // Equipment selling: skip quantity/unit — go straight to price then mrp
    if (!isEquipmentSelling) {
        if (!result.quantity) return 'quantity';
        if (!result.unit) return 'unit';
    }
    if (!result.price) return 'price';
    // MRP required for all selling flows
    if (actionType === 'selling' && !result.mrp) return 'mrp';
    if (!result.district) return 'district';
    if (!result.localDistrict) return 'localDistrict';
    if (!result.policeStation) return 'policeStation';
    if (!result.phoneNumber) return 'phoneNumber';

    // Additional requirement — only for buying flow
    if (actionType === 'buying' && !result._additionalRequirementAnswered) return 'additionalRequirement';

    return null; // All done
}

function formatFormResponse(result, user, language) {
    // Determine missing fields for display
    const missing = [];
    if (!result.actionType) missing.push('actionType');
    if (!result.category) missing.push('category');
    if (!result.productName) missing.push('productName');

    const catLower = (result.category || '').toLowerCase();

    if (result.actionType === 'buying') {
        if (catLower === 'fish' && !result.fishSize) missing.push('fishSize');
        if (catLower === 'feed' && !result.feedType) missing.push('feedType');
        if ((catLower === 'feed' || catLower === 'medicine') && !result.packingSize) missing.push('packingSize');
    }

    if (!result.quantity) missing.push('quantity');
    if (!result.unit) missing.push('unit');
    if (!result.price) missing.push('price');
    if (!result.district) missing.push('district');
    if (!result.localDistrict) missing.push('localDistrict');
    if (!result.policeStation) missing.push('policeStation');
    if (!result.phoneNumber) missing.push('phoneNumber');

    result.missingFields = missing;

    // Required check (additionalRequirement is always optional)
    const requiredMissing = missing;
    result.isComplete = requiredMissing.length === 0;

    // Step tracking (for progress bar)
    const guidedFields = getGuidedFields(result.actionType, result.category);
    const completedSteps = guidedFields.filter(f => {
        if (f === 'additionalRequirement') return !!result._additionalRequirementAnswered;
        return !!result[f];
    }).length;
    result.currentStep = completedSteps;
    result.totalSteps = guidedFields.length;

    // Determine next field
    const nextField = getNextMissingField(result);
    result.nextField = nextField;

    let nextQuestion = null;

    if (nextField) {
        nextQuestion = getQuestion(nextField, language, result);
    } else {
        // All fields collected — generate summary
        result.nextField = result.actionType === 'buying' ? 'review' : 'media';
        result.isComplete = true;

        const isEquipment = catLower === 'equipment';
        const locationText = [result.policeStation, result.localDistrict, result.district].filter(Boolean).join(', ');
        const qtyText = (!isEquipment && result.quantity) ? `${result.quantity} ${result.unit || ''}`.trim() : '';
        const priceText = result.price ? (isEquipment ? `₹${result.price}` : `₹${result.price}/${result.unit || 'unit'}`) : '';
        const mrpText = result.mrp ? `₹${result.mrp}` : '';
        const isBuying = result.actionType === 'buying';

        if (isBuying) {
            // Build a nice buying summary
            let summaryLines = [];
            if (result.category) summaryLines.push(`📦 **Category:** ${result.category}`);
            if (result.productName) summaryLines.push(`🏷️ **Product:** ${result.productName}`);
            if (catLower === 'fish' && result.fishSize) summaryLines.push(`📏 **Fish Size:** ${result.fishSize}`);
            if (catLower === 'feed' && result.feedType) summaryLines.push(`🌾 **Feed Type:** ${result.feedType}`);
            if ((catLower === 'feed' || catLower === 'medicine') && result.packingSize) summaryLines.push(`📦 **Packing:** ${result.packingSize}`);
            if (qtyText) summaryLines.push(`📊 **Quantity:** ${qtyText}`);
            if (priceText) summaryLines.push(`💰 **Budget:** ${priceText}`);
            if (locationText) summaryLines.push(`📍 **Location:** ${locationText}`);
            if (result.phoneNumber) summaryLines.push(`📱 **Contact:** ${result.phoneNumber}`);
            if (result.additionalRequirement) summaryLines.push(`📝 **Additional:** ${result.additionalRequirement}`);

            const summary = summaryLines.join('\n');

            const confirmQuestion = {
                en: `✅ Here is your **Buying Requirement**:\n\n${summary}\n\nWould you like me to create this? Say **"Yes"** to auto-fill the form, or **"Edit"** to change anything.`,
                bn: `✅ আপনার **ক্রয় চাহিদা**:\n\n${summary}\n\nআমি কি এটি তৈরি করব? **"হ্যাঁ"** বললে ফর্ম অটোফিল হবে।`,
                hi: `✅ आपकी **खरीद आवश्यकता**:\n\n${summary}\n\nक्या मैं यह तैयार करूं? **"हां"** कहें तो फॉर्म ऑटोफिल हो जाएगा।`,
                or: `✅ ଆପଣଙ୍କ **କ୍ରୟ ଆବଶ୍ୟକତା**:\n\n${summary}\n\nଏହା ତିଆରି କରିବ? **"ହଁ"** କୁହନ୍ତୁ ଫର୍ମ ଅଟୋଫିଲ ହୋଇଯିବ।`
            }[language] || '';
            nextQuestion = confirmQuestion;
        } else {
            // Sell flow — generate description
            if (isEquipment) {
                if (language === 'bn') {
                    result.description = `বিক্রয়ের জন্য সরঞ্জাম: ${result.productName}${priceText ? `, মূল্য: ${priceText}` : ''}${mrpText ? `, আসল মূল্য: ${mrpText}` : ''}${locationText ? `, স্থান: ${locationText}` : ''}। আগ্রহী ক্রেতারা যোগাযোগ করুন।`;
                } else if (language === 'hi') {
                    result.description = `बिक्री के लिए उपकरण: ${result.productName}${priceText ? `, मूल्य: ${priceText}` : ''}${mrpText ? `, मूल मूल्य: ${mrpText}` : ''}${locationText ? `, स्थान: ${locationText}` : ''}। इच्छुक व्यक्ति संपर्क करें।`;
                } else {
                    result.description = `Equipment for sale: ${result.productName}.${priceText ? ` Price: ${priceText}.` : ''}${mrpText ? ` Original MRP: ${mrpText}.` : ''}${locationText ? ` Location: ${locationText}.` : ''} Contact for details.`;
                }
            } else {
                if (language === 'bn') {
                    result.description = `বিক্রয়ের জন্য উপলব্ধ: ${result.productName} (${result.category || 'মৎস্য বিষয়'})${qtyText ? `, পরিমাণ: ${qtyText}` : ''}${priceText ? `, মূল্য: ${priceText}` : ''}${mrpText ? `, আসল মূল্য: ${mrpText}` : ''}${locationText ? `, স্থান: ${locationText}` : ''}। আগ্রহী ক্রেতারা যোগাযোগ করুন।`;
                } else if (language === 'hi') {
                    result.description = `बिक्री के लिए उपलब्ध: ${result.productName} (${result.category || 'मत्स्य पालन'})${qtyText ? `, मात्रा: ${qtyText}` : ''}${priceText ? `, मूल्य: ${priceText}` : ''}${mrpText ? `, मूल मूल्य: ${mrpText}` : ''}${locationText ? `, स्थान: ${locationText}` : ''}। इच्छुक व्यक्ति संपर्क करें।`;
                } else {
                    result.description = `Fresh stock for sale: ${result.productName} (${result.category || 'Aquaculture'}).${qtyText ? ` Qty: ${qtyText}.` : ''}${priceText ? ` Price: ${priceText}.` : ''}${mrpText ? ` Original MRP: ${mrpText}.` : ''}${locationText ? ` Location: ${locationText}.` : ''} Contact for details.`;
                }
            }
            nextQuestion = {
                en: `✅ I've generated your listing details!\n\n📝 "${result.description}"\n\n📸 Please upload images or a video of the product to complete the listing.`,
                bn: `✅ লিস্টিং বিবরণ তৈরি হয়েছে!\n\n📝 "${result.description}"\n\n📸 এখন ছবি বা ভিডিও আপলোড করুন।`,
                hi: `✅ लिस्टिंग विवरण तैयार!\n\n📝 "${result.description}"\n\n📸 अब फ़ोटो या वीडियो अपलोड करें।`,
                or: `✅ ଲିଷ୍ଟିଂ ବିବରଣୀ ତିଆରି!\n\n📝 "${result.description}"\n\n📸 ଏବେ ଫୋଟୋ ବା ଭିଡିଓ ଅପଲୋଡ କରନ୍ତୁ।`
            }[language] || '';
        }
    }

    result.nextQuestion = nextQuestion;

    return {
        type: 'guided_creation',
        intent: 'marketplace_form',
        reply: nextQuestion,
        extractedData: result
    };
}

module.exports = { processAIRequest };
