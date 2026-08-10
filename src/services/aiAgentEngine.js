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

module.exports = { processAIRequest };

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
            answer = "**बायोफ्लॉक तकनीक (BFT)** एक पर्यावरण-अनुकूल जलीय कृषि तकनीक है जो लाभकारी बैक्टीरिया और उच्च वातन का उपयोग करके हानिकारक नाइट्रोजन युक्त कचरे को सूक्ष्मजीवी प्रोटीन फ़ीड में बदल देती है।";
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

/**
 * Handle Marketplace Form Assistant (Creation & Auto-fill)
 */
function handleMarketplaceFormAssistant(norm, raw, context = {}, user = {}, language = 'en') {
    const normAscii = convertIndicDigitsToAscii(norm);

    const result = {
        actionType: context.actionType || null, // 'selling' | 'buying'
        category: context.category || null,
        productName: context.productName || '',
        quantity: context.quantity || '',
        unit: context.unit || 'kg',
        price: context.price || '',
        district: context.district || user?.district || '',
        localDistrict: context.localDistrict || user?.localDistrict || '',
        policeStation: context.policeStation || user?.policeStation || '',
        phoneNumber: context.phoneNumber || user?.phone || '',
        title: context.title || '',
        description: context.description || '',
        isComplete: false,
        missingFields: [],
        nextQuestion: null
    };

    if (!norm) return formatFormResponse(result, user, language);

    // Contextual direct answer handling if nextField was active
    const activeField = context.nextField;

    // 1. Intent (Selling / Buying)
    if (!result.actionType) {
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
        const isBuying = buyingKw.some(k => norm.includes(k));
        const isSelling = sellingKw.some(k => norm.includes(k));
        if (isBuying && !isSelling) result.actionType = 'buying';
        else if (isSelling && !isBuying) result.actionType = 'selling';
        else if (isBuying && isSelling) {
            const firstBuyIdx = Math.min(...buyingKw.map(k => norm.indexOf(k)).filter(i => i !== -1));
            const firstSellIdx = Math.min(...sellingKw.map(k => norm.indexOf(k)).filter(i => i !== -1));
            result.actionType = firstBuyIdx < firstSellIdx ? 'buying' : 'selling';
        } else if (activeField === 'actionType') {
            result.actionType = 'selling'; // Default fallback
        }
    }

    // 2. Category
    const equipmentKeywords = [
        'equipment', 'aerator', 'pump', 'net', 'feeder', 'generator', 'blower', 'paddle wheel', 'paddlewheel', 'paddle', 'motor', 'tester', 'meter', 'machine', 'tank', 'hatchery equipment',
        'যন্ত্রপাতি', 'যন্ত্রপ্রপাতি', 'যন্ত্র', 'উপকরণ', 'পাম্প', 'এয়ারেটর', 'জাল', 'ফিডার', 'মোটর', 'মেশিন',
        'उपकरण', 'पंप', 'एरेटर', 'जाल', 'फीडर', 'मोटर', 'मशीन',
        'ଉପକରଣ', 'ଯନ୍ତ୍ରପାତି', 'ପମ୍ପ', 'ଏରେଟର', 'ଜାଲ', 'ମୋଟର', 'ମେସିନ୍'
    ];

    if (!result.category) {
        if (equipmentKeywords.some(k => norm.includes(k))) {
            result.category = 'Equipment';
            if (result.unit === 'kg') result.unit = 'piece';
        }
        else if (norm.includes('rohu') || norm.includes('katla') || norm.includes('fish') || norm.includes('mach') || norm.includes('মাছ') || norm.includes('मछली') || norm.includes('ମାଛ')) result.category = 'Fish';
        else if (norm.includes('feed') || norm.includes('khabar') || norm.includes('dana') || norm.includes('খাবার') || norm.includes('चारा') || norm.includes('ଖାଦ୍ୟ')) result.category = 'Feed';
        else if (norm.includes('medicine') || norm.includes('dawa') || norm.includes('probiotic') || norm.includes('ওষুধ') || norm.includes('दवा') || norm.includes('ଔଷଧ')) result.category = 'Medicine';
        else if (norm.includes('seed') || norm.includes('fingerling') || norm.includes('spawn') || norm.includes('pona') || norm.includes('পোনা') || norm.includes('बीज') || norm.includes('ପୋନା')) result.category = norm.includes('spawn') ? 'Spawn' : 'Fingerling';
        else if (activeField === 'category') result.category = 'Fish';
    }

    // 3. Product Name (if specifically answering productName prompt or in text)
    if (!result.productName && activeField === 'productName' && raw.length > 1) {
        result.productName = raw.charAt(0).toUpperCase() + raw.slice(1);
    }

    // 4. Phone
    const phoneMatch = normAscii.match(/(?:\+91[\s-]?)?([6-9]\d{9})/);
    if (phoneMatch) {
        result.phoneNumber = phoneMatch[1];
    } else if (!result.phoneNumber && activeField === 'phoneNumber') {
        const digitsOnly = normAscii.replace(/\D/g, '');
        if (digitsOnly.length >= 10) result.phoneNumber = digitsOnly.slice(-10);
    }

    // 5. Price / Budget (Support Indic digits + contextual answers like "১৮০ টাকা" or "180")
    const priceMatch = normAscii.match(/(?:rs\.?|₹|taka|inr|price|budget|rate|mullo|dam|টাকা|রুপये|ଟଙ୍କା|মূল্য|দাম)\s*[:=]?\s*(\d+(?:\.\d+)?)/) ||
                       normAscii.match(/(\d+(?:\.\d+)?)\s*(?:rs|taka|inr|\/kg|per kg|rupees|টাকা|রুপয়ে|ଟଙ୍କା|প্রতি|কেজি)/) ||
                       normAscii.match(/^(\d+(?:\.\d+)?)$/);
    if (priceMatch) {
        result.price = priceMatch[1];
    } else if (!result.price) {
        const standaloneNum = normAscii.match(/(\d+(?:\.\d+)?)/);
        if (standaloneNum && (activeField === 'price' || norm.includes('টাকা') || norm.includes('मूल्य') || norm.includes('দাম') || norm.includes('মূল্য'))) {
            result.price = standaloneNum[1];
        }
    }

    // 6. Quantity (Support Indic digits)
    const qtyMatch = normAscii.match(/(\d+(?:\.\d+)?)\s*(kg|kilo|kilogram|gm|gram|piece|pcs|pc|mound|ton|tons|bag|bags|quintal|কেজি|গ্রাম|পিস|টন|বস্তা)/);
    if (qtyMatch) {
        result.quantity = qtyMatch[1];
        const u = qtyMatch[2];
        if (['kg', 'kilo', 'kilogram', 'কেজি'].includes(u)) result.unit = 'kg';
        else if (['gm', 'gram', 'গ্রাম'].includes(u)) result.unit = 'gm';
        else if (['piece', 'pcs', 'pc', 'পিস'].includes(u)) result.unit = 'piece';
        else if (['mound'].includes(u)) result.unit = 'mound';
        else if (['ton', 'tons', 'টন'].includes(u)) result.unit = 'ton';
    } else if (!result.quantity) {
        const standaloneNum = normAscii.match(/(\d+(?:\.\d+)?)/);
        if (standaloneNum && activeField === 'quantity') {
            result.quantity = standaloneNum[1];
        }
    }

    // 7. Location (State, District, Police Station)
    for (const state of ALL_STATES) {
        if (norm.includes(normalize(state))) {
            result.district = state;
            break;
        }
    }
    if (norm.includes('west bengal') || norm.includes('পশ্চিমবঙ্গ') || norm.includes('पश्चिम बंगाल')) result.district = 'West Bengal';
    else if (norm.includes('odisha') || norm.includes('ওড়িশা') || norm.includes('ओडिशा')) result.district = 'Odisha';
    else if (norm.includes('assam') || norm.includes('আসাম') || norm.includes('असम')) result.district = 'Assam';
    else if (norm.includes('bihar') || norm.includes('বিহার') || norm.includes('बिहार')) result.district = 'Bihar';
    else if (norm.includes('jharkhand') || norm.includes('ঝাড়খণ্ড') || norm.includes('झारखंड')) result.district = 'Jharkhand';

    if (!result.localDistrict && activeField === 'localDistrict') {
        result.localDistrict = raw;
        if (!result.district) result.district = 'West Bengal';
    } else if (!result.policeStation && activeField === 'policeStation') {
        result.policeStation = raw;
    }

    // 8. Description
    if (!result.description && activeField === 'description' && raw.length > 2) {
        result.description = raw;
    }

    // 9. Product Name Fallback / Clean Extraction
    if (!result.productName || activeField === 'productName') {
        let cleaned = norm
            .replace(/(?:\+91[\s-]?)?[6-9]\d{9}/g, '') // remove phone
            .replace(/\d+(?:\.\d+)?\s*(?:kg|kilo|kilogram|gm|gram|piece|pcs|pc|mound|ton|tons|bag|bags|quintal|কেজি|গ্রাম|পিস|টন|বস্তা)/gi, '') // remove quantity+unit
            .replace(/(?:rs\.?|₹|taka|inr|price|budget|rate|mullo|dam|টাকা|রুপये|ଟଙ୍କା|মূল্য|দাম)\s*[:=]?\s*\d+(?:\.\d+)?/gi, '') // remove price tags
            .replace(/\d+(?:\.\d+)?\s*(?:rs|taka|inr|\/kg|per kg|rupees|টাকা|রুপয়ে|ଟଙ୍କା|প্রতি|কেজি|পার কেজি)/gi, '') // remove rates like 120 taka per kg
            .replace(/\b\d+(?:\.\d+)?\b/g, '') // remove standalone numbers
            .replace(/(?:i want to|want to|need to|please|sell|buying|selling|listing|post|bechbo|bechna|bikri|kinbo|kinte|in|at|for|per|par|dist|আমার|বিক্রি|বেচবো|কিনতে|কিনব|প্রতি|পার|ইউনিটের|মূল্য|টাকা|কেজি|টন)/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (cleaned.length > 1) {
            result.productName = cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        } else if (result.category) {
            result.productName = result.category === 'Equipment' ? 'Aquaculture Equipment' : `${result.category} Fish`;
        }
    }

    // 10. Automatic Professional Description Generator based on Extracted Product Details
    if (!result.description && result.productName) {
        const isSelling = result.actionType !== 'buying';
        const actionLabel = isSelling ? 'Fresh stock available for sale' : 'Urgent requirement / buying request';
        const locationText = [result.localDistrict, result.district].filter(Boolean).join(', ');
        const qtyText = result.quantity ? `${result.quantity} ${result.unit || 'kg'}` : '';
        const priceText = result.price ? `₹${result.price}` : '';

        if (language === 'bn') {
            result.description = `${isSelling ? 'বিক্রয়ের জন্য উপলব্ধ' : 'ক্রয় করতে চাই'}: ${result.productName} (${result.category || 'মৎস্য বিষয়'})${qtyText ? `, পরিমাণ: ${qtyText}` : ''}${priceText ? `, মূল্য/বাজেট: ${priceText}` : ''}${locationText ? `, স্থান: ${locationText}` : ''}। বিবরণ বা অর্ডারের জন্য যোগাযোগ করুন।`;
        } else if (language === 'hi') {
            result.description = `${isSelling ? 'बिक्री के लिए उपलब्ध' : 'खरीदना चाहते हैं'}: ${result.productName} (${result.category || 'मत्स्य पालन'})${qtyText ? `, मात्रा: ${qtyText}` : ''}${priceText ? `, मूल्य/बजट: ${priceText}` : ''}${locationText ? `, स्थान: ${locationText}` : ''}। अधिक विवरण या ऑर्डर के लिए संपर्क करें।`;
        } else if (language === 'or') {
            result.description = `${isSelling ? 'ବିକ୍ରି ପାଇଁ ଉପଲବ୍ଧ' : 'କିଣିବାକୁ ଚାହାଁନ୍ତି'}: ${result.productName} (${result.category || 'ମତ୍ସ୍ୟ ସମ୍ବନ୍ଧୀୟ'})${qtyText ? `, ପରିମାଣ: ${qtyText}` : ''}${priceText ? `, ମୂଲ୍ୟ: ${priceText}` : ''}${locationText ? `, ସ୍ଥାନ: ${locationText}` : ''}। ଅଧିକ ସୂଚନା ପାଇଁ ଯୋଗାଯୋଗ କରନ୍ତୁ।`;
        } else {
            result.description = `${actionLabel}: ${result.productName} (${result.category || 'Aquaculture'}). ${qtyText ? `Quantity: ${qtyText}. ` : ''}${priceText ? `Price/Budget: ${priceText}. ` : ''}${locationText ? `Location: ${locationText}. ` : ''}Directly contact for order confirmation.`;
        }
    }

    return formatFormResponse(result, user, language);
}

const GUIDED_FIELDS = [
    'actionType',
    'category',
    'productName',
    'quantity',
    'price',
    'district',
    'localDistrict',
    'policeStation',
    'phoneNumber',
    'description',
];

function formatFormResponse(result, user, language) {
    const missing = [];
    if (!result.actionType) missing.push('actionType');
    if (!result.category) missing.push('category');
    if (!result.productName) missing.push('productName');
    if (!result.quantity) missing.push('quantity');
    if (!result.price) missing.push(result.actionType === 'buying' ? 'buyingPrice' : 'price');
    if (!result.district) missing.push('district');
    if (!result.localDistrict) missing.push('localDistrict');
    if (!result.policeStation) missing.push('policeStation');
    if (!result.phoneNumber) missing.push('phoneNumber');
    if (!result.description) missing.push('description');

    result.missingFields = missing;
    result.isComplete = missing.length === 0;

    const totalSteps = GUIDED_FIELDS.length;
    const completedSteps = GUIDED_FIELDS.filter(f => {
        if (f === 'actionType') return !!result.actionType;
        if (f === 'category') return !!result.category;
        if (f === 'productName') return !!result.productName;
        if (f === 'quantity') return !!result.quantity;
        if (f === 'price') return !!result.price;
        if (f === 'district') return !!result.district;
        if (f === 'localDistrict') return !!result.localDistrict;
        if (f === 'policeStation') return !!result.policeStation;
        if (f === 'phoneNumber') return !!result.phoneNumber;
        if (f === 'description') return !!result.description;
        return false;
    }).length;

    result.currentStep = completedSteps;
    result.totalSteps = totalSteps;

    let nextQuestion = null;

    if (language === 'bn') {
        nextQuestion = "📋 আমি আপনার লিস্টিংয়ের বিবরণ তৈরি করেছি! অনুগ্রহ করে ডানদিকের প্রিভিউ কার্ডটি পর্যালোচনা করুন। কোনো তথ্য সংশোধন বা যোগ করতে চাইলে মুখে বলুন অথবা **লিস্টিং প্রকাশ করুন** বোতামে চাপুন।";
    } else if (language === 'hi') {
        nextQuestion = "📋 मैंने आपका लिस्टिंग ड्राफ्ट तैयार कर लिया है! कृपया ऑन-स्क्रीन कार्ड की समीक्षा करें। यदि कोई सुधार करना हो तो बोलें या **लिस्टिंग पोस्ट करें** पर क्लिक करें।";
    } else if (language === 'or') {
        nextQuestion = "📋 ମୁଁ ଆପଣଙ୍କର ଲିଷ୍ଟିଂ ଡ୍ରାଫ୍ଟ ପ୍ରସ୍ତୁତ କରିଛି! ଦୟାକରି କାର୍ଡ ସମୀକ୍ଷା କରନ୍ତୁ। ଯଦି କିଛି ପରିବର୍ତ୍ତନ କରିବାକୁ ଚାହାଁନ୍ତି କୁହନ୍ତୁ କିମ୍ବା ପୋଷ୍ଟ କରନ୍ତୁ!";
    } else {
        nextQuestion = "📋 I've drafted your listing preview card! Please review the details on screen. You can speak to correct any field or click **Create Listing Now** to publish!";
    }

    result.nextQuestion = nextQuestion;
    result.nextField = null;

    return {
        type: 'guided_creation',
        intent: 'marketplace_form',
        reply: nextQuestion,
        extractedData: result
    };
}

module.exports = { processAIRequest };
