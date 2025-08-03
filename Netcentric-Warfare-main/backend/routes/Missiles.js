import express from "express";
import { Missile } from "../model/Missile.js";

const router = express.Router();

router.get("/api/missiles", async (req, res) => {
  try {
    const missiles = await Missile.find();
    res.json(missiles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
