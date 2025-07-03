
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config(); 

const uri = process.env.URI;

if (!uri) {
  throw new Error(" No Mongo URI found. Did you set MONGO_URI in your .env?");
}

const client = new MongoClient(uri);

let db;

export async function connectToMongo() {
  await client.connect();
  console.log(" Connected to MongoDB Atlas");
  db = client.db("defenseDB");
}

export function getDb() {
  if (!db) throw new Error(" DB not connected yet!");
  return db;
}
