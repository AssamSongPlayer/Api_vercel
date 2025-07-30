// api/analyze.js

import formidable from 'formidable';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
  api: {
    bodyParser: false,
  },
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper: Send CORS headers
function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Or your frontend URL
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCORSHeaders(res);

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'fail', message: 'Only POST allowed' });
  }

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ status: 'fail', message: 'Error parsing form data' });
    }

    const file = files.image?.[0];

    if (!file) {
      return res.status(400).json({ status: 'fail', message: 'Image file is required' });
    }

    try {
      const imageBuffer = fs.readFileSync(file.filepath);
      const imageBase64 = imageBuffer.toString('base64');

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
              text: 'List food items in the image with estimated nutritional values in this JSON format: [{food_item, quantity, weight, calories, proteins, carbohydrates, fats}]',
            },
          ],
          role: 'user',
        }],
      });

      const response = await result.response;
      const text = await response.text();

      const match = text.match(/\[.*?\]/s);
      const data = match ? JSON.parse(match[0]) : [];

      return res.status(200).json({ status: 'success', result: data });
    } catch (error) {
      return res.status(500).json({ status: 'fail', message: error.message });
    }
  });
}
