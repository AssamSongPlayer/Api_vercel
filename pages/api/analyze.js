import Cors from 'cors';
import initMiddleware from '../../lib/init-middleware';
import formidable from 'formidable';
import fs from 'fs/promises';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Run CORS middleware
const cors = initMiddleware(
  Cors({
    origin: '*',
    methods: ['POST', 'OPTIONS'],
  })
);

export const config = {
  api: {
    bodyParser: false,
  },
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  await cors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // Preflight
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'fail', message: 'Method Not Allowed' });
  }

  const form = new formidable.IncomingForm({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err || !files.image) {
      return res.status(400).json({ status: 'fail', message: 'Image upload failed' });
    }

    try {
      const imageData = await fs.readFile(files.image.filepath);
      const imageBase64 = imageData.toString('base64');

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
              text: 'List food items in the image with estimated nutritional values in JSON format.',
            },
          ],
          role: 'user',
        }],
      });

      const text = await result.response.text();
      const jsonMatch = text.match(/\[.*\]/s);
      const json = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      return res.status(200).json({ status: 'success', result: json });
    } catch (e) {
      return res.status(500).json({ status: 'fail', message: e.message });
    }
  });
}
