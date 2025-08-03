// classifyRFSignature.js
import mongoose from "mongoose";
import { Missile } from "./model/Missile.js";
import { connectToMongo } from "./db.js";
await connectToMongo();

const classifyRF = (systemType) => {
  if (/active radar|datalink|command/i.test(systemType)) return "RF";
  if (/gps|tercom/i.test(systemType)) return "GPS";
  return "None"; // inertial, infrared, stellar, etc.
};

const missiles = await Missile.find({});

for (const missile of missiles) {
  missile.rfSignature = classifyRF(missile.systemType);
  await missile.save();
}

console.log("✅ Missiles updated with rfSignature");
process.exit();
