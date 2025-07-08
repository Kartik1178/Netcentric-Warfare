import mongoose from "mongoose";
import XLSX from "xlsx";
import dotenv from "dotenv";
import { Jammer } from "../model/Jammer.js";

dotenv.config();
const uri = process.env.URI;

async function seedJammers() {
  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");

  const workbook = XLSX.readFile("./jammers_data.xlsx");
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  await Jammer.deleteMany();
  await Jammer.insertMany(data);

  console.log(`✅ Seeded ${data.length} jammers`);
  process.exit();
}

seedJammers().catch(err => {
  console.error(err);
  process.exit(1);
});
