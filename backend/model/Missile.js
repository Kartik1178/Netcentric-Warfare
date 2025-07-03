
import mongoose from "mongoose";

const missileSchema = new mongoose.Schema({
  name: String,
  type: String,
  range: Number,
  speed: Number,
  warhead: String,
  manufacturer: String,
  country: String
});

export const Missile = mongoose.model("Missile", missileSchema);
