export const config = {
  api: {
    bodyParser: false,
  },
};

import formidable from 'formidable';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const form = new formidable.IncomingForm();

  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Form parsing error' });
    }

    if (!files.image) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    return res.status(200).json({
      success: true,
      message: 'Image received!',
      filename: files.image.originalFilename,
    });
  });
}
