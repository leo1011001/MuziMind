async function test() {
  console.log('🚀 Starting MuziMind setup test...\n');
  
  // Test 1: Check .env file
  console.log('1. Checking environment variables...');
  try {
    require('dotenv').config();
    const required = ['VITE_MONGODB_URI', 'VITE_LASTFM_API_KEY'];
    let allPresent = true;
    
    for (const varName of required) {
      if (!process.env[varName]) {
        console.log(`   ❌ Missing: ${varName}`);
        allPresent = false;
      } else {
        console.log(`   ✅ Found: ${varName}`);
      }
    }
    
    if (!allPresent) {
      console.log('\n⚠️  Please check your .env file!');
      return;
    }
  } catch (error) {
    console.log('   ❌ Error reading .env:', error.message);
    return;
  }
  
  // Test 2: Check MongoDB connection
  console.log('\n2. Testing MongoDB connection...');
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.VITE_MONGODB_URI);
    await client.connect();
    console.log('   ✅ MongoDB connection successful');
    await client.close();
  } catch (error) {
    console.log(`   ❌ MongoDB error: ${error.message}`);
    console.log('   💡 Check if your IP is whitelisted in MongoDB Atlas');
    return;
  }
  
  // Test 3: Check dependencies
  console.log('\n3. Checking dependencies...');
  const dependencies = ['react', 'mongodb', 'bcryptjs', 'express'];
  
  for (const dep of dependencies) {
    try {
      require(dep);
      console.log(`   ✅ ${dep} installed`);
    } catch {
      console.log(`   ❌ ${dep} not installed`);
    }
  }
  
  console.log('\n🎉 Setup test completed!');
  console.log('\n📝 To start the app:');
  console.log('   npm run dev:full');
  console.log('\n🌐 Then open: http://localhost:5173');
}

test().catch(console.error);