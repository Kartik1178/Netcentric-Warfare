import mongoose from "mongoose";

const jammerSchema = new mongoose.Schema({
  Name: String,
  Type: String,
  Frequency_Band: String,
  Range_km: Number,
  Power_Watts: Number,
  Country: String,
  Platform: String,
  Year_Introduced: Number,
  Status: String,
  Notes: String
});

export const Jammer = mongoose.model("Jammer", jammerSchema);
