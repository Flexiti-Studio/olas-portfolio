const mongoose = require('mongoose');
const uri = 'mongodb+srv://flexitiStudio:SecurePass*1@cluster0.osqyqdt.mongodb.net/?retryWrites=true&w=majority';

async function run() {
  try {
    await mongoose.connect(uri, { family: 4, serverSelectionTimeoutMS: 5000 });
    console.log("Connected successfully to MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("Connection failed:", error);
    process.exit(1);
  }
}

run();
