import express from "express";
import { Jammer } from "../model/Jammer.js";

const router = express.Router();

router.get("/api/jammers", async (req, res) => {
  try {
    const jammers = await Jammer.find();
    res.json(jammers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
