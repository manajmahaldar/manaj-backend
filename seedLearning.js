const mongoose = require('mongoose');
const LearningCategory = require('./src/models/learning/LearningCategory');
const LearningContent = require('./src/models/learning/LearningContent');
const Quiz = require('./src/models/learning/Quiz');
const GovernmentScheme = require('./src/models/learning/GovernmentScheme');

require('dotenv').config({ path: './src/../.env' });

const categoriesData = [
    { name: 'Fish Farming Basics', slug: 'fish-farming-basics', description: 'Fundamental concepts of aquaculture and fish rearing.', color: '#0066cc', order: 1 },
    { name: 'Fish Species', slug: 'fish-species', description: 'Detailed look at Carp, Tilapia, Catfish, and Shrimps.', color: '#33bbff', order: 2 },
    { name: 'Pond Preparation', slug: 'pond-preparation', description: 'Liming, fertilization, and stocking guides.', color: '#ff9900', order: 3 },
    { name: 'Water Quality', slug: 'water-quality', description: 'Monitoring dissolved oxygen, pH, ammonia levels.', color: '#00cc66', order: 4 },
    { name: 'Feed Management', slug: 'feed-management', description: 'FCR optimizations, feeding schedules, nutritional demands.', color: '#9933ff', order: 5 },
    { name: 'Fish Diseases', slug: 'fish-diseases', description: 'Identify and treat bacterial, viral, and parasitic infections.', color: '#ff3366', order: 6 },
    { name: 'Biofloc Farming', slug: 'biofloc-farming', description: 'Zero-water-change biofloc technology for intensive fish culture.', color: '#00ccaa', order: 7 },
    { name: 'RAS Farming', slug: 'ras-farming', description: 'Recirculating Aquaculture Systems for controlled indoor farming.', color: '#6600ff', order: 8 },
    { name: 'Hatchery Management', slug: 'hatchery-management', description: 'Broodstock selection, spawning, and larval rearing protocols.', color: '#cc6600', order: 9 },
    { name: 'Harvesting', slug: 'harvesting', description: 'Harvest timing, netting techniques, and live transport.', color: '#336600', order: 10 },
    { name: 'Fish Marketing', slug: 'fish-marketing', description: 'Wholesale, retail, and export market strategies.', color: '#006633', order: 11 },
    { name: 'Government Schemes', slug: 'government-schemes-cat', description: 'PMMSY, state subsidies, and government support programs.', color: '#cc0066', order: 12 },
    { name: 'Sustainable Farming', slug: 'sustainable-farming', description: 'Climate-smart and eco-friendly aquaculture practices.', color: '#336633', order: 13 },
    { name: 'Business Management', slug: 'business-management', description: 'Farm economics, profitability analysis, and planning.', color: '#663300', order: 14 },
    { name: 'Technology in Aquaculture', slug: 'technology-aquaculture', description: 'IoT sensors, drones, and AI applications in fish farms.', color: '#003366', order: 15 }
];

const seedData = async () => {
    try {
        console.log('Connecting to database...');
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/matsyalink';
        console.log('Using URI:', mongoUri.substring(0, 30) + '...');
        
        await mongoose.connect(mongoUri);
        console.log('Connected to DB!');

        // Preserve existing data, only add if missing
        const existingCats = await LearningCategory.countDocuments();
        if (existingCats === 0) {
            const seededCats = await LearningCategory.insertMany(categoriesData);
            console.log(`Seeded ${seededCats.length} Categories!`);
        } else {
            console.log(`Categories already exist (${existingCats}), skipping category seed.`);
        }

        const allCats = await LearningCategory.find({});
        const waterQualityCat = allCats.find(c => c.slug === 'water-quality');
        const basicCat = allCats.find(c => c.slug === 'fish-farming-basics');
        const bioflocCat = allCats.find(c => c.slug === 'biofloc-farming');

        const existingContent = await LearningContent.countDocuments();
        if (existingContent === 0 && waterQualityCat && basicCat) {
            const content = [
                {
                    title: 'Introduction to Biofloc System Parameters',
                    slug: 'intro-to-biofloc-parameters',
                    type: 'video',
                    categories: [waterQualityCat._id, ...(bioflocCat ? [bioflocCat._id] : [])],
                    language: 'en',
                    level: 'beginner',
                    status: 'published',
                    videoUrl: 'https://www.youtube.com/watch?v=Ks-_Mh1QhMc',
                    videoSource: 'youtube',
                    duration: 12,
                    featured: true,
                    isTrending: true,
                    viewCount: 154,
                    tags: ['biofloc', 'water quality', 'ammonia'],
                    author: { name: 'Dr. Aqua Expert', bio: 'ICAR Certified Fisheries Scientist' }
                },
                {
                    title: 'How to Construct and Prepare Fish Ponds',
                    slug: 'construct-prepare-fish-ponds',
                    type: 'article',
                    categories: [basicCat._id],
                    language: 'en',
                    level: 'intermediate',
                    status: 'published',
                    content: `<h3>Pond Construction Steps</h3><p>Designing a commercial fish pond requires proper layout planning, soil evaluation, and water drainage considerations.</p><h4>1. Soil Analysis</h4><p>The soil must have at least 20-30% clay content to retain water effectively. Avoid sandy soils which lead to excessive seepage.</p><h4>2. Liming and Fertilization</h4><p>Apply agricultural limestone to stabilize pH levels and stimulate natural plankton growth. Apply at 250kg/hectare 2 weeks before stocking.</p><h4>3. Water Filling</h4><p>Fill pond with clean water to 1.2-1.5m depth. Monitor DO levels for at least 3 days before stocking fingerlings.</p>`,
                    readingTime: 6,
                    viewCount: 92,
                    tags: ['construction', 'pond preparation', 'liming'],
                    author: { name: 'Fisheries Expert Team', bio: 'MatsyaLink In-house Agriculture Specialists' }
                },
                {
                    title: 'Rohu Fish Disease Identification Guide',
                    slug: 'rohu-disease-identification-guide',
                    type: 'pdf',
                    categories: [allCats.find(c => c.slug === 'fish-diseases')?._id].filter(Boolean),
                    language: 'en',
                    level: 'advanced',
                    status: 'published',
                    pdfUrl: '',
                    fileSize: '2.4 MB',
                    downloadCount: 38,
                    viewCount: 210,
                    tags: ['disease', 'rohu', 'diagnosis'],
                    author: { name: 'CIFA Research Wing', bio: 'Central Institute of Freshwater Aquaculture' }
                }
            ];
            await LearningContent.insertMany(content);
            console.log(`Seeded ${content.length} Content items!`);
        } else {
            console.log(`Content already exists (${existingContent}), skipping content seed.`);
        }

        // Seed a sample Quiz
        const existingQuizzes = await Quiz.countDocuments();
        if (existingQuizzes === 0 && waterQualityCat) {
            const sampleQuiz = new Quiz({
                title: 'Water Parameters Assessment',
                description: 'Test your understanding of pH, dissolved oxygen, and ammonia indicators in freshwater fish farming.',
                category: waterQualityCat._id,
                questions: [
                    {
                        questionText: 'What is the optimal pH range for freshwater fish farming?',
                        type: 'mcq',
                        options: ['4.5 - 5.5', '6.5 - 8.5', '9.0 - 10.5', '1.0 - 3.0'],
                        correctAnswers: [1],
                        explanation: 'Most freshwater fish thrive in slightly alkaline to neutral environments (pH 6.5 - 8.5).'
                    },
                    {
                        questionText: 'What is the minimum dissolved oxygen (DO) level required for healthy fish growth?',
                        type: 'mcq',
                        options: ['Below 2 mg/L', '5 mg/L or above', '1 mg/L is sufficient', 'DO level doesn\'t matter'],
                        correctAnswers: [1],
                        explanation: 'Fish require at least 5 mg/L of dissolved oxygen for healthy growth. Below 3 mg/L causes stress and mortality.'
                    },
                    {
                        questionText: 'Ammonia levels above 0.5 mg/L can cause fish stress.',
                        type: 'true_false',
                        options: ['True', 'False'],
                        correctAnswers: [0],
                        explanation: 'True. Toxic ammonia (NH3) above 0.025 mg/L causes stress; total ammonia above 0.5 mg/L is dangerous.'
                    }
                ],
                passingScore: 67,
                timeLimit: 10,
                isActive: true
            });
            await sampleQuiz.save();
            console.log('Seeded Quiz!');
        } else {
            console.log(`Quizzes already exist (${existingQuizzes}), skipping quiz seed.`);
        }

        // Seed Government Schemes
        const existingSchemes = await GovernmentScheme.countDocuments();
        if (existingSchemes === 0) {
            const schemes = [
                {
                    title: 'Pradhan Mantri Matsya Sampada Yojana (PMMSY)',
                    slug: 'pmmsy-scheme-details',
                    schemeName: 'PMMSY',
                    description: 'Central scheme promoting sustainable aquaculture with tech infusion and structural subsidies for fish farmers across India.',
                    category: 'pmmsy',
                    ministry: 'Department of Fisheries, Ministry of Fisheries, Animal Husbandry & Dairying',
                    eligibility: 'All registered fish farmers, FPOs, cooperatives, and hatchery owners.',
                    benefits: 'Up to 40% subsidy for general categories and 60% for SC/ST/Women.',
                    applicationLink: 'https://pmmsy.dof.gov.in/'
                },
                {
                    title: 'Kisan Credit Card for Fisheries (KCC)',
                    slug: 'kcc-fisheries-loan',
                    schemeName: 'Kisan Credit Card - Fisheries',
                    description: 'Subsidized credit facility for fish farmers enabling working capital up to ₹3 lakhs at 4% interest rate.',
                    category: 'loan',
                    ministry: 'Ministry of Agriculture & Farmers Welfare',
                    eligibility: 'Individual fishers, fish farmer groups, or SHGs.',
                    benefits: '2% interest subvention + 3% prompt repayment incentive, effective rate of 4%.',
                    applicationLink: 'https://agricoop.nic.in/'
                },
                {
                    title: 'National Fisheries Development Board (NFDB) Grants',
                    slug: 'nfdb-grants',
                    schemeName: 'NFDB Development Subsidy',
                    description: 'Development grants for ponds, feed mills, processing units, and fish seed production units.',
                    category: 'subsidy',
                    ministry: 'National Fisheries Development Board',
                    eligibility: 'Fish farmers, entrepreneurs, and cooperatives registered with state fisheries departments.',
                    benefits: 'Capital subsidy ranging from 20% to 40% of project cost.',
                    applicationLink: 'https://nfdb.gov.in/'
                }
            ];
            await GovernmentScheme.insertMany(schemes);
            console.log(`Seeded ${schemes.length} Schemes!`);
        } else {
            console.log(`Schemes already exist (${existingSchemes}), skipping scheme seed.`);
        }

        console.log('\n✅ Database seeding completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        process.exit(1);
    }
};

seedData();
