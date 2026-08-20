const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Listing = require('./src/models/Listing');
  const listings = await Listing.find({}, 'productName category status price');
  console.log('=== LISTINGS DUMP ===');
  console.log(listings);
  await mongoose.disconnect();
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
