import { dbStore } from "../db/store";

dbStore.seedDefaultData();
const all = dbStore.getAllEpisodes();
console.log("Store reseeded successfully with", all.length, "episodes.");
console.log("EP 1:", all[0].episode.title, "| Code:", all[0].episode.codeSerie);
console.log("EP 45:", all[44].episode.title, "| Code:", all[44].episode.codeSerie);
