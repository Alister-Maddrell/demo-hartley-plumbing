const fs = require('fs');
const https = require('https');
const path = require('path');
const os = require('os');

const iteration = process.argv[2] || '1';
const imgPath = path.join(os.tmpdir(), `hartley-iter${iteration}-small.jpg`);

if (!fs.existsSync(imgPath)) {
  // Try the png version
  const pngPath = path.join(os.tmpdir(), `hartley-iter${iteration}.png`);
  if (fs.existsSync(pngPath)) {
    console.log('Using PNG directly:', pngPath);
    sendToGemini(pngPath, 'image/png');
  } else {
    console.error('No screenshot found at', imgPath, 'or', pngPath);
    process.exit(1);
  }
} else {
  sendToGemini(imgPath, 'image/jpeg');
}

function sendToGemini(filePath, mimeType) {
  const imgData = fs.readFileSync(filePath).toString('base64');
  console.log('Base64 length:', imgData.length, 'File:', filePath);

  const body = JSON.stringify({
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType, data: imgData } },
        { text: 'You are an expert web designer reviewing a plumbing services website. Analyze this design critically. Rate it 1-10. List the top 3 most impactful CSS-only improvements that would make this look more polished, professional, and visually striking. Be specific about what CSS properties to change and where. Focus on: typography sizing/spacing, color contrast, section padding, visual hierarchy, alignment issues, and overall cohesion. Do NOT suggest content changes — CSS only.' }
      ]
    }]
  });

  const model = process.argv[3] || 'gemini-2.0-flash';
  const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=AIzaSyCCd0eClHZWkvG4Vmjdxj1H7WpPozT5Vto`);
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.candidates && parsed.candidates[0]) {
          console.log(parsed.candidates[0].content.parts[0].text);
        } else {
          console.log(JSON.stringify(parsed, null, 2));
        }
      } catch(e) {
        console.log('Raw response:', data.slice(0, 500));
      }
    });
  });
  req.on('error', (e) => console.error('Error:', e));
  req.write(body);
  req.end();
}
