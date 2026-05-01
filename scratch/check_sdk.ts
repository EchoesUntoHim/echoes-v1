import { GoogleGenAI } from "@google/genai";
console.log("GoogleGenAI prototype methods:", Object.getOwnPropertyNames(GoogleGenAI.prototype));
const genAI = new GoogleGenAI({ apiKey: "test" });
console.log("genAI instance methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(genAI)));
