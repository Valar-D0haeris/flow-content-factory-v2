import fs from "fs";
import path from "path";
import { parsePlanningCsv } from "@/lib/csv/parser";
import { CsvRow } from "@/lib/validation/schemas";

export function generateFull45Episodes(): CsvRow[] {
  try {
    const csvPath = path.resolve(process.cwd(), "data/planning_source.csv");
    if (fs.existsSync(csvPath)) {
      const raw = fs.readFileSync(csvPath, "utf-8");
      const parsed = parsePlanningCsv(raw);
      if (parsed.rows.length >= 45) {
        return parsed.rows;
      }
    }
  } catch (err) {
    console.warn("Could not read planning_source.csv, falling back to embedded dataset:", err);
  }

  // Fallback if file read fails
  return EMBEDDED_REAL_EPISODES;
}

export const EMBEDDED_REAL_EPISODES: CsvRow[] = [
  {
    "ID Global": "EP#01",
    "Code Série": "B1-B2_01",
    "Titre de la Vidéo": "Why Your Brain Goes Blank in English (And How to Fix It!)",
    "Concept / Playlist": "B1-B2 Series",
    "Texte Miniature": "Stop Awkward Silences | Small Talk | EP 1 | LEVEL: B1-B2",
    "Visuel Miniature": "Maya en stress avec une tasse de café et Leo qui la pointe du doigt",
    "Hook (0-15s)": "Do you ever start speaking English and your brain just completely freezes? Let's fix that today.",
    "Mots-Clés (15 tags)": "#speakenglishwithflow, #brainblank, #englishpodcast, #learnenglishfast, #b1english, #b2english, #englishspeakingpractice, #englishlisteningpractice, #speakenglishfluently, #englishconversation, #englishforbeginners, #dailyenglish, #englishmindset, #englishlearningtips",
    "Description Complète": "In this English podcast for learning English conversation, enjoy real English listening practice with Maya and Leo. Today we discuss why your brain goes blank and how to fix it. Perfect for B1-B2 learners. Subscribe to Speak English With Flow for daily English conversation practice!"
  },
  {
    "ID Global": "EP#02",
    "Code Série": "B1-B2_02",
    "Titre de la Vidéo": "English Podcast For Daily Life | Talk About Dreams and Goals | B1-B2 English",
    "Concept / Playlist": "B1-B2 Series",
    "Texte Miniature": "STOP DREAMING! Do this instead | EP2 | B1-B2",
    "Visuel Miniature": "Maya exclamative et Leo avec prise de conscience dans un studio cosy",
    "Hook (0-15s)": "Why do we all have big dreams but struggle to achieve them? Today, we reveal the harsh truth about goals.",
    "Mots-Clés (15 tags)": "#speakenglishwithflow, #dreamsandgoals, #englishpodcast, #learnenglishfast, #b1english, #b2english, #englishspeakingpractice, #englishlisteningpractice, #speakenglishfluently, #englishconversation, #englishforbeginners, #dailyenglish, #englishmindset, #englishlearningtips",
    "Description Complète": "In this English podcast for learning English conversation, enjoy real English listening practice with Maya and Leo. We talk about dreams, goals, and the Shiny Object Syndrome. Perfect for B1-B2 learners. Subscribe to Speak English With Flow for daily English conversation practice!"
  },
  {
    "ID Global": "EP#03",
    "Code Série": "MIND-01",
    "Titre de la Vidéo": "How to Stop Translating in Your Head | English Podcast B1-B2",
    "Concept / Playlist": "Mindset & Confidence",
    "Texte Miniature": "STOP TRANSLATING!",
    "Visuel Miniature": "Maya et Leo, bulle barrée French->English",
    "Hook (0-15s)": "Do you freeze when someone speaks to you in English? Let's fix that.",
    "Mots-Clés (15 tags)": "#speakenglishwithflow, #thinkinenglish, #stoptranslating, #englishpodcast, #learnenglishfast, #b1english, #b2english, #englishspeakingpractice, #englishlisteningpractice, #speakenglishfluently, #englishconversation, #englishforbeginners, #dailyenglish, #englishmindset, #englishlearningtips",
    "Description Complète": "In this English podcast for learning English conversation, spend 25 minutes enjoying real English listening practice with Maya and Leo. Today we discuss how to stop translating in your head and think directly in English. Perfect for B1-B2 learners. Subscribe to Speak English With Flow for daily English conversation practice!"
  },
  {
    "ID Global": "EP#04",
    "Code Série": "MIND-02",
    "Titre de la Vidéo": "Speak English Without Fear of Making Mistakes | Daily Conversation",
    "Concept / Playlist": "Mindset & Confidence",
    "Texte Miniature": "DON'T BE AFRAID!",
    "Visuel Miniature": "Maya rassurant Leo qui tient une liste de fautes barrées",
    "Hook (0-15s)": "What if making mistakes is actually the fastest way to speak English fluently?",
    "Mots-Clés (15 tags)": "#speakenglishwithflow, #englishconfidence, #fearofspeaking, #englishpodcast, #learnenglishfast, #b1english, #b2english, #englishspeakingpractice, #englishlisteningpractice, #speakenglishfluently, #englishconversation, #englishforbeginners, #dailyenglish, #englishmindset, #englishlearningtips",
    "Description Complète": "In this English podcast for learning English conversation, spend 25 minutes enjoying real English listening practice with Maya and Leo. We discuss why making mistakes is the secret to fluency and how to overcome the fear of speaking. Perfect for B1-B2 learners. Subscribe to Speak English With Flow for daily English conversation practice!"
  },
  {
    "ID Global": "EP#05",
    "Code Série": "CAR-01",
    "Titre de la Vidéo": "How to Talk to Anyone at Work with Confidence | Professional English",
    "Concept / Playlist": "Career & Professional",
    "Texte Miniature": "SPEAK AT WORK!",
    "Visuel Miniature": "Leo confiant à la pause café avec Maya, décor pro",
    "Hook (0-15s)": "What do you say when your boss or an international colleague walks up to you at the coffee machine?",
    "Mots-Clés (15 tags)": "#speakenglishwithflow, #businessenglish, #englishatwork, #englishpodcast, #learnenglishfast, #b1english, #b2english, #englishspeakingpractice, #englishlisteningpractice, #speakenglishfluently, #englishconversation, #englishforbeginners, #dailyenglish, #englishmindset, #englishlearningtips",
    "Description Complète": "In this English podcast for learning English conversation, spend 25 minutes enjoying real English listening practice with Maya and Leo. We master workplace small talk and how to talk to colleagues with confidence. Perfect for B1-B2 learners. Subscribe to Speak English With Flow for daily English conversation practice!"
  }
];
