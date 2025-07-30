// api/analyze.js

export const config = {
  api: {
    bodyParser: false,
  },
};

import formidable from 'formidable';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all domains (or specify one)

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'fail', message: 'Only POST allowed' });
  }

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ status: 'fail', message: 'Failed to parse form' });
    }

    const file = files.image;

    if (!file) {
      return res.status(400).json({ status: 'fail', message: 'No image uploaded' });
    }

    const imageBuffer = fs.readFileSync(file[0].filepath);
    const imageBase64 = imageBuffer.toString('base64');

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

      const result = await model.generateContent({
        contents: [{
          parts: [
            {
              inlineData: {
                data: imageBase64,
                mimeType: 'image/jpeg',
              },
            },
            {
              text: 'List all food items in the image with estimated nutrition in this JSON format: [{food_item, quantity, weight, calories, proteins, carbohydrates, fats}]',
            },
          ],
          role: 'user',
        }],
      });

      const response = await result.response;
      const text = await response.text();

      // Try to extract JSON from Gemini response
      const jsonMatch = text.match(/\[.*\]/s);
      if (!jsonMatch) throw new Error("Gemini didn't return JSON");

      const parsed = JSON.parse(jsonMatch[0]);

      res.status(200).json({ status: 'success', result: parsed });
    } catch (error) {
      res.status(500).json({ status: 'fail', message: error.message });
    }
  });
}
