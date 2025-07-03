// seed/seedMissiles.js
import mongoose from "mongoose";
import XLSX from "xlsx";
import dotenv from "dotenv";
import { Missile } from "../models/Missile.js";

dotenv.config();
const uri = process.env.MONGO_URI;

async function seedMissiles() {
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const workbook = XLSX.readFile("./missile_data.xlsx");
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  await Missile.deleteMany(); 
  await Missile.insertMany(data);

  console.log("Seeded missiles:", data.length);
  process.exit();
}

seedMissiles().catch(err => {
  console.error(err);
  process.exit(1);
});
