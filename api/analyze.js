import formidable from 'formidable';
import fs from 'fs';
import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  api: {
    bodyParser: false, // Required for formidable
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Error parsing the file' });

    const imageFile = files.image;
    if (!imageFile) return res.status(400).json({ error: 'No image uploaded' });

    try {
      const base64Image = fs.readFileSync(imageFile[0].filepath, { encoding: 'base64' });

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

      const result = await model.generateContent({
        contents: [{
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Image } },
            { text: "List all food items in the image and estimate for each: food item name, weight in grams, calories, proteins, carbs, fats. Return response in JSON format array." }
          ]
        }]
      });

      const response = await result.response;
      const text = response.text();

      res.status(200).json({ status: 'success', result: JSON.parse(text) });

    } catch (e) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });
}
