import mongoose from "mongoose";
import XLSX from "xlsx";
import dotenv from "dotenv";
import { Missile } from "../model/Missile.js";

dotenv.config();

const uri = process.env.URI; // Make sure your .env has MONGO_URI

async function seedMissiles() {
  try {
    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    // 📄 Read Excel file
    const workbook = XLSX.readFile("./seed_missiles_15.xlsx");
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`📊 Loaded ${data.length} missile records from Excel`);

    // 🗑️ Clear collection before seeding
    await Missile.deleteMany();
    console.log("🗑️ Cleared existing missile data");

    // 🚀 Insert new missiles
    await Missile.insertMany(data);
    console.log(`✅ Inserted ${data.length} missiles successfully`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding missiles:", err);
    process.exit(1);
  }
}

seedMissiles();
