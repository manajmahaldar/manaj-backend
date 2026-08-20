const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Listing = require('./src/models/Listing');
  const User = require('./src/models/User');

  // Find a seller to assign the listing to
  const seller = await User.findOne({ role: 'seller' });
  if (!seller) {
    console.error('No seller found in the database to assign listing to.');
    process.exit(1);
  }

  // Create an approved fish listing
  const testListing = new Listing({
    sellerId: seller._id,
    productName: 'Fresh Rohu Fish 3kg',
    category: 'Fish',
    price: '280',
    district: 'Malda',
    localDistrict: 'English Bazar',
    policeStation: 'English Bazar',
    description: 'Fresh pond-grown Rohu fish, size 2.5 - 3 kg per piece.',
    phoneNumber: seller.phone || '9999999999',
    quantity: '100',
    unit: 'kg',
    status: 'approved',
    photos: ['https://images.unsplash.com/photo-1534482421-64566f976cfa?w=500']
  });

  await testListing.save();
  console.log('Successfully created test listing under Fish category:', testListing._id);
  
  // Clear redis cache for listings so the API doesn't return cached empty list
  const { isConnected, client } = require('./src/config/redisClient');
  if (isConnected && isConnected()) {
    const keys = await client.keys('cache:/api/listings*');
    if (keys.length > 0) {
      await client.del(keys);
      console.log('Cleared Redis Cache for listings:', keys);
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
