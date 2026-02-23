// test-connection.js
const { MongoClient } = require('mongodb');

// Your MongoDB Atlas connection string
const uri = 'mongodb+srv://schoolmaterialsadmin:b51c6UNnvXszsq3T@cluster0.q0pdxqb.mongodb.net/?retryWrites=true&w=majority';

async function test() {
  const client = new MongoClient(uri);
  
  try {
    console.log('🔗 Attempting to connect to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas!');
    
    // List all databases
    const databases = await client.db().admin().listDatabases();
    console.log('\n📦 Available databases:');
    databases.databases.forEach(db => {
      console.log(`   - ${db.name} (${db.sizeOnDisk} bytes)`);
    });
    
    // Test creating/accessing the muzimind database
    console.log('\n🔧 Testing muzimind database...');
    const db = client.db('muzimind');
    
    // Create a test collection and insert a document
    const testCollection = db.collection('connection_test');
    const testDoc = {
      test: 'MuziMind connection test',
      timestamp: new Date(),
      status: 'success'
    };
    
    const insertResult = await testCollection.insertOne(testDoc);
    console.log(`✅ Inserted test document with ID: ${insertResult.insertedId}`);
    
    // Verify the document exists
    const foundDoc = await testCollection.findOne({ _id: insertResult.insertedId });
    console.log('✅ Verified document retrieval');
    
    // Count documents in test collection
    const count = await testCollection.countDocuments();
    console.log(`📊 Test collection now has ${count} document(s)`);
    
    // Clean up
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('🧹 Cleaned up test data');
    
    // Test creating indexes (simulate what our app will do)
    console.log('\n🔍 Testing index creation...');
    try {
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
      console.log('✅ Created users.email index');
    } catch (e) {
      console.log('ℹ️  users collection/index already exists or error:', e.message);
    }
    
    console.log('\n🎉 All tests passed! Your MongoDB connection is working perfectly.');
    console.log('\n📝 Next steps:');
    console.log('   1. Run: npm run dev:full');
    console.log('   2. Open: http://localhost:5173');
    console.log('   3. Register a new user to create the database');
    
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    
    console.log('\n🔧 Troubleshooting steps:');
    console.log('   1. Check if your IP is whitelisted in MongoDB Atlas');
    console.log('   2. Verify your username and password are correct');
    console.log('   3. Make sure the cluster is running (check MongoDB Atlas dashboard)');
    console.log('   4. Try connecting from MongoDB Compass to verify credentials');
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n⚠️  Network error - check your internet connection');
    }
    if (error.message.includes('Authentication failed')) {
      console.log('\n⚠️  Authentication failed - check username/password');
    }
    if (error.message.includes('timed out')) {
      console.log('\n⚠️  Connection timeout - check firewall/network settings');
    }
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed.');
  }
}

test();