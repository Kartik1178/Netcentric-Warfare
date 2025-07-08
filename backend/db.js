import mongoose from "mongoose";
import dotenv from"dotenv";
dotenv.config();
export async function connectToMongo() {
  const uri = process.env.URI;
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    throw err;
  }
}
