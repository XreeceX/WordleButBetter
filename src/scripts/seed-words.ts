import "dotenv/config";
import { db } from "../db";
import { words } from "../db/schema";
import { getAllWords } from "../data/words";
import { randomUUID } from "crypto";

async function seed() {
  const all = getAllWords();
  const values = all.map(({ word, length }) => ({
    id: randomUUID(),
    word: word.toLowerCase(),
    length,
  }));

  console.log(`Seeding ${values.length} words...`);
  await db.insert(words).values(values).onConflictDoNothing({ target: words.word });
  console.log("Done.");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
