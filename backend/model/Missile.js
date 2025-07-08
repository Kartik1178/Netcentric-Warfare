import mongoose from "mongoose";

const missileSchema = new mongoose.Schema({
  Name: String,           // e.g., Astra
  Category: String,       // Air, Land, Sea, Submarine
  Type: String,           // Air-to-Air, Cruise, Ballistic, etc.
  Range_km: Number,       // Range in km
  Speed_Mach: Number,     // Speed in Mach
  Altitude_m: Number,     // Max altitude in meters
  Country: String,        // India, USA, France, etc.
  Threat_Level: String,   // Low, Medium, High
  Guidance_System: String,// Active Radar, Inertial, etc.
  Year_Introduced: Number,// e.g., 2019
  Warhead_Type: String,   // Conventional, Nuclear, etc.
  Notes: String           // Additional notes
});

export const Missile = mongoose.model("Missile", missileSchema);

