import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { getRealNearbyPlaces, resolveExactPlacePhotoWithGooglePlaces, safeJsonParse } from './server/realPlacesDiscovery';

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for base64 image data from camera
app.use(express.json({ limit: '15mb' }));

// Lazy init Gemini AI
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY environment variable is missing.');
    }
    genAIClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// In-memory cache for location overviews and expensive AI queries to prevent redundant quota exhaustion
const queryCache = new Map<string, { data: any; expiresAt: number }>();
function getCached(key: string): any | null {
  const item = queryCache.get(key);
  if (item && item.expiresAt > Date.now()) {
    return item.data;
  }
  return null;
}
function setCached(key: string, data: any, ttlSeconds: number = 300) {
  queryCache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
}

// Resilient AI generation with automatic fallback across multiple model tiers for temporary 503 / 429 quota exhaustion
export async function generateContentWithFallback(ai: GoogleGenAI, params: any) {
  // Use diverse model tiers: start with fast high-throughput flash-lite, then latest flash, 3.8 flash, and pro tiers
  const fallbackModels = [
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-3.1-pro-preview',
  ];
  const preferredModel = params.model || 'gemini-3.1-flash-lite';
  const modelsToTry = [preferredModel, ...fallbackModels.filter((m) => m !== preferredModel)];

  let lastError: any = null;
  for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
    const modelName = modelsToTry[attempt];
    try {
      const res = await ai.models.generateContent({
        ...params,
        model: modelName,
      });
      return res;
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code || err?.response?.status;
      const msg = err?.message || String(err);
      const isRetryableModelOrQuota =
        status === 503 ||
        status === 429 ||
        status === 500 ||
        status === 404 ||
        msg.includes('503') ||
        msg.includes('429') ||
        msg.includes('404') ||
        msg.includes('NOT_FOUND') ||
        msg.includes('high demand') ||
        msg.includes('spikes in demand') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('Quota exceeded') ||
        msg.includes('quota');

      if (isRetryableModelOrQuota && attempt < modelsToTry.length - 1) {
        console.warn(`[AI Tier Resilience] Model ${modelName} returned ${status || 'temporary load condition'}, switching to fallback tier ${modelsToTry[attempt + 1]}...`);
        // Exponential backoff with small jitter (150ms * (attempt + 1))
        await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
        continue;
      }
      if (!isRetryableModelOrQuota) {
        throw err;
      }
    }
  }
  throw lastError;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Charaiva Tourist Guide API' });
});

// Helper to construct structured topic and persona guidance
function buildTopicGuidance(topics?: Record<string, boolean>, persona: string = 'warm_female', gender: string = 'female'): string {
  const selectedList: string[] = [];
  if (!topics || Object.values(topics).every(v => v === false)) {
    selectedList.push(
      'Historical context & origin dates',
      'Geographical setting & orientation',
      'Architectural style & engineering highlights',
      'Cultural & spiritual legends',
      'Fascinating trivia & photography tips'
    );
  } else {
    if (topics.historical) selectedList.push('Historical context (exact founding dates, dynasties, rulers/patrons, eras, archaeological rediscovery)');
    if (topics.geographical) selectedList.push('Geographical setting (exact terrain, altitude, river basins, surrounding landscape, strategic coordinates)');
    if (topics.political) selectedList.push('Political significance (treaties, royal court politics, imperial capitals, power struggles, sovereign decrees)');
    if (topics.architectural) selectedList.push('Architectural & engineering feats (stone masonry techniques, vaulted ceilings, load-bearing domes, acoustic tricks, materials)');
    if (topics.culturalMythology) selectedList.push('Cultural, spiritual & mythological folklore (sacred symbolism, deities, epic rituals, devotional heritage)');
    if (topics.culinary) selectedList.push('Culinary & gastronomy heritage (royal feast recipes, street food culture, local spices and culinary traditions)');
    if (topics.economic) selectedList.push('Economic & modern day impact (ancient trade routes, silk road commerce, modern conservation and local economy)');
    if (topics.ecological) selectedList.push('Ecology, flora & fauna (indigenous trees, sacred groves, surrounding wildlife and ecological microclimate)');
    if (topics.photography) selectedList.push('Photography & secret vantage spots (golden hour angles, hidden uncrowded alcoves, reflections, best lighting)');
    if (topics.mysteries) selectedList.push('Curiosities, riddles & hidden mysteries (secret passages, unsolved historical enigmas, legends, local lore)');
  }

  let personaStyle = 'Speak as a warm, charismatic, articulate, and engaging female tour guide with welcoming spoken cadence, personal anecdotes, and vivid storytelling.';
  if (persona === 'scholarly') {
    personaStyle = 'Speak with scholarly rigor, academic precision, chronological accuracy, and authoritative architectural and historical citations.';
  } else if (persona === 'adventurous') {
    personaStyle = 'Speak as an adventurous explorer and folklore guide, weaving dramatic tension, mysteries, and vivid epic tales.';
  } else if (persona === 'concise') {
    personaStyle = 'Speak with crisp, punchy, bulleted clarity designed for fast walking audio tours.';
  }

  return `
GUIDE PERSONA & VOICE TONING:
${personaStyle} (Voice Character: ${gender === 'male' ? 'Male Guide' : 'Female Guide - Warm & Natural'})

MANDATORY SPEECH CATEGORY REQUIREMENTS:
Your audio narration and explanation MUST explicitly cover and weave in the following selected dimensions:
${selectedList.map((item, i) => `${i + 1}. ${item}`).join('\n')}
`;
}

// Curated contextual image database for common landmarks and categories
const CATEGORY_IMAGE_SETS: Record<string, Array<{ url: string; title: string; caption: string; type: string }>> = {
  monument: [
    { url: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80', title: 'Ancient Archways & Stonework', caption: 'Handcrafted stone masonry and historic vaulted entrance', type: 'historical' },
    { url: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80', title: 'Interior Chamber View', caption: 'Inside the inner royal chamber and ceiling carvings', type: 'interior' },
    { url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=800&q=80', title: 'Golden Hour & Illumination', caption: 'Atmospheric evening view with warm amber lighting', type: 'night' },
    { url: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80', title: 'Aerial Perspective', caption: 'Bird’s-eye vantage showing symmetric geometry and courtyards', type: 'aerial' },
  ],
  temple: [
    { url: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80', title: 'Towering Dravidian Gopuram Tower', caption: 'Intricate spiritual sculptures and multi-tiered stucco deities', type: 'detail' },
    { url: 'https://images.unsplash.com/photo-1621609764095-b32bbe35cf3a?auto=format&fit=crop&w=800&q=80', title: 'Sacred Temple Sanctum & Pillars', caption: 'Ancient stone carved colonnades and sacred corridors', type: 'interior' },
    { url: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80', title: 'Golden Lotus Tank & Architecture', caption: 'Sacred water reservoir and traditional Dravidian mandapams', type: 'historical' },
  ],
  fort: [
    { url: 'https://images.unsplash.com/photo-1588083949474-77b7093320d6?auto=format&fit=crop&w=800&q=80', title: 'Ramparts & Defensive Cannons', caption: 'Massive sandstone defensive fortifications', type: 'historical' },
    { url: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=800&q=80', title: 'Royal Courtyard & Diwan-i-Khas', caption: 'Hall of private audience and marble pavilions', type: 'interior' },
    { url: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80', title: 'Palace Facade & Jharokhas', caption: 'Intricate latticed stone windows for natural breeze', type: 'detail' },
  ],
  food: [
    { url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80', title: 'Traditional Spices & Seasoning', caption: 'Fresh curry leaves, mustard seeds, and aromatic turmeric', type: 'detail' },
    { url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80', title: 'Kitchen Preparation & Griddle', caption: 'Traditional clay oven / cast-iron griddle preparation', type: 'historical' },
  ],
  object: [
    { url: 'https://images.unsplash.com/photo-1580481077197-909244030616?auto=format&fit=crop&w=800&q=80', title: 'Ergonomic & Material Craft', caption: 'Close-up material texture, joinery, and structural build', type: 'detail' },
    { url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80', title: 'Design & Spatial Placement', caption: 'Functional usage in ambient interior aesthetic setting', type: 'interior' },
  ],
  building: [
    { url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80', title: 'Facade & Architectural Geometry', caption: 'Contemporary structural lines and engineering perspective', type: 'detail' },
    { url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80', title: 'Interior Architecture', caption: 'Illuminated hall and structural floor plan design', type: 'interior' },
  ],
  plant: [
    { url: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=800&q=80', title: 'Botanical Foliage & Bloom', caption: 'Natural leaf venation and biological characteristics', type: 'detail' },
  ],
};

const LANDMARK_SPECIFIC_IMAGES: Record<string, Array<{ url: string; title: string; caption: string; type: string }>> = {
  'taj mahal': [
    { url: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80', title: '18th Century Royal Archive', caption: 'Historical perspective of Taj Mahal from across Yamuna River', type: 'historical' },
    { url: 'https://images.unsplash.com/photo-1590077428593-a55bb07c4665?auto=format&fit=crop&w=800&q=80', title: 'Pietra Dura Inlay Art', caption: 'Precious lapis lazuli and jade inlaid inside marble floral petals', type: 'detail' },
    { url: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=800&q=80', title: 'Moonlight & Night Glow', caption: 'The Makrana marble glowing under nocturnal moonlight', type: 'night' },
    { url: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80', title: 'Great Gate (Darwaza-i-Rauza)', caption: 'Red sandstone monumental gateway framing the white marble tomb', type: 'interior' },
  ],
  'eiffel tower': [
    { url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80', title: '1889 World Fair Exhibition', caption: 'Historic photo during the 1889 Exposition Universelle in Paris', type: 'historical' },
    { url: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=800&q=80', title: 'Midnight Sparkling Lightshow', caption: 'Illuminated by 20,000 sparkling strobe lights across the Seine', type: 'night' },
    { url: 'https://images.unsplash.com/photo-1431274172761-fca41d930114?auto=format&fit=crop&w=800&q=80', title: 'Puddle Iron Lattice Interior', caption: 'Inside the lift shafts and geometric iron lattice beams', type: 'interior' },
  ],
  'hawa mahal': [
    { url: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=800&q=80', title: 'City Palace Courtyard', caption: 'Adjacent royal courtyards and intricate Peacock Gate', type: 'interior' },
    { url: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80', title: 'Jharokha Stained Glass', caption: 'Colored Belgian glass windows filtering morning sunlight into chambers', type: 'detail' },
  ],
};

const MAX_INLINE_IMAGE_BYTES = 12 * 1024 * 1024;

function isPrivateOrLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (
    h === 'localhost' ||
    h === '0.0.0.0' ||
    h === '::1' ||
    h === '[::1]' ||
    h.endsWith('.local') ||
    h.endsWith('.internal')
  ) {
    return true;
  }
  const ipv4Match = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  return false;
}

function normalizeImageMimeType(rawMime?: string | null): string {
  const cleaned = (rawMime || '').split(';')[0].trim().toLowerCase();
  if (!cleaned.startsWith('image/')) return 'image/jpeg';
  if (cleaned === 'image/jpg') return 'image/jpeg';
  return cleaned;
}

/**
 * Normalizes a data URI, remote HTTP(S) image URL, or raw base64 string into a valid Gemini inlineData part.
 * Prevents TYPE_BYTES base64 decoding errors when image URLs or WebP/PNG data URLs are submitted.
 */
async function resolveImageToInlinePart(rawImg: string): Promise<{ mimeType: string; data: string }> {
  const trimmed = (rawImg || '').trim();
  if (!trimmed) {
    const err: any = new Error('Image data is required');
    err.status = 400;
    throw err;
  }

  // 1. Standard Data URLs (e.g. data:image/webp;base64,..., data:image/jpeg;base64,...)
  if (trimmed.startsWith('data:')) {
    const match = trimmed.match(/^data:([^;,\s]+)(?:;[^,]*)?;base64,(.+)$/s);
    if (!match) {
      const err: any = new Error('Invalid base64 data URI format for image');
      err.status = 400;
      throw err;
    }
    const mimeType = normalizeImageMimeType(match[1]);
    const cleanBase64 = match[2].replace(/\s+/g, '');
    if (!cleanBase64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(cleanBase64)) {
      const err: any = new Error('Invalid base64 image payload');
      err.status = 400;
      throw err;
    }
    return { mimeType, data: cleanBase64 };
  }

  // 2. Remote HTTP(S) image URLs (e.g., 1-tap famous sight presets or remote URLs)
  if (/^https?:\/\//i.test(trimmed)) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmed);
    } catch {
      const err: any = new Error('Invalid image URL provided');
      err.status = 400;
      throw err;
    }
    if (isPrivateOrLoopbackHost(parsedUrl.hostname)) {
      const err: any = new Error('Blocked unsafe private or loopback image URL');
      err.status = 400;
      throw err;
    }

    const imgRes = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'CharaivaTravelGuide/1.0 (https://charaiva.app)',
        Accept: 'image/webp,image/jpeg,image/png,image/*;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    if (!imgRes.ok) {
      const err: any = new Error(`Failed to fetch remote image URL (HTTP ${imgRes.status})`);
      err.status = 400;
      throw err;
    }

    if (imgRes.url) {
      try {
        const finalUrl = new URL(imgRes.url);
        if (isPrivateOrLoopbackHost(finalUrl.hostname)) {
          const err: any = new Error('Blocked unsafe redirected image URL');
          err.status = 400;
          throw err;
        }
      } catch (e: any) {
        if (e?.status === 400) throw e;
      }
    }

    const rawContentType = (imgRes.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (
      rawContentType &&
      !rawContentType.startsWith('image/') &&
      rawContentType !== 'application/octet-stream' &&
      rawContentType !== 'binary/octet-stream'
    ) {
      const err: any = new Error(`Remote URL did not return an image (received ${rawContentType})`);
      err.status = 400;
      throw err;
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    if (arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > MAX_INLINE_IMAGE_BYTES) {
      const err: any = new Error('Fetched image is empty or exceeds maximum 12MB size limit');
      err.status = 400;
      throw err;
    }

    const buffer = Buffer.from(arrayBuffer);
    let mimeType = normalizeImageMimeType(rawContentType);
    if (!rawContentType.startsWith('image/')) {
      if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        mimeType = 'image/png';
      } else if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
        mimeType = 'image/webp';
      } else {
        mimeType = 'image/jpeg';
      }
    }

    return {
      mimeType,
      data: buffer.toString('base64'),
    };
  }

  // 3. Raw base64 strings (validate strictly so non-base64 strings never reach Gemini inlineData)
  const stripped = trimmed.replace(/\s+/g, '');
  if (stripped.length < 32 || !/^[A-Za-z0-9+/]+={0,2}$/.test(stripped)) {
    const err: any = new Error('Image payload must be a valid base64 image, data URI, or HTTPS image URL');
    err.status = 400;
    throw err;
  }

  return {
    mimeType: 'image/jpeg',
    data: stripped,
  };
}

// Helper to handle landmark recognition from either endpoint
async function handleLandmarkRecognition(req: express.Request, res: express.Response) {
  try {
    const {
      image,
      imageBase64,
      location,
      coords,
      language = 'English',
      history = [],
      userPrompt,
      topics,
      persona = 'warm_female',
      voiceGender = 'female',
    } = req.body;

    const rawImg = image || imageBase64;
    if (!rawImg) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const effectiveCoords = location || coords;

    // Resolve data URI, remote image URL, or validated raw base64 to Gemini inlineData
    const inlineImage = await resolveImageToInlinePart(rawImg);

    const ai = getGenAI();

    // Prepare system instructions for AI Tourist Guide
    const historyContext = history.length > 0
      ? `CRITICAL MEMORY DIRECTIVE: The user has ALREADY visited and received explanations for these topics during this session: [${history.join(', ')}]. DO NOT repeat basic introductory information or facts about these already explained items. Instead, provide NEW, unique, deep-dive architectural nuances, local folklore, uncrowded photo spots, or surrounding secrets.`
      : `Provide a captivating, accurate introductory explanation as a personal local guide.`;

    const topicDirectives = buildTopicGuidance(topics, persona, voiceGender);

    const promptText = `You are Charaiva, an elite AI multilingual universal visual guide, expert historian, and object identifier.
Analyze the attached camera image along with GPS location context: ${effectiveCoords ? `Lat ${effectiveCoords.latitude}, Lng ${effectiveCoords.longitude}` : 'Unknown location'}.
${userPrompt ? `User specifically asked: "${userPrompt}"` : ''}

Language Requirement: Produce ALL text response fields strictly in the language: "${language}".

${historyContext}

${topicDirectives}

UNIVERSAL RECOGNITION DIRECTIVE (MANDATORY):
- The image may contain ANY object:
  1. UNIQUE CULTURAL / HISTORICAL / MONUMENTAL SIGHTS (e.g. musical singing pillars in Madurai Meenakshi Temple or Hampi Vittala Temple, ancient gopurams, intricate stonework, sculptures, fort walls): Provide exhaustive, awe-inspiring historical, acoustic, architectural, and folklore explanations explaining its unique craftsmanship, stone tuning, acoustic resonant frequencies, and cultural significance.
  2. EVERYDAY, CONTEMPORARY, OR COMMON OBJECTS (e.g. simple chair, ergonomic office seat, table, water bottle, smartphone, book, coffee cup, fan, bicycle, ordinary plant, tool):
     - DO NOT get stuck, reject, or fail!
     - Treat everyday objects with engaging, insightful storytelling.
     - Provide a rich 5 to 10-line comprehensive note covering:
       • Precise object type, subtype, and style/design school (e.g. Mid-Century Modern Armchair, Ergonomic Mesh Task Chair, Stainless Steel Insulated Flask).
       • Likely materials and manufacturing build (e.g., solid teakwood, molded polypropylene, brushed steel).
       • Practical uses, ergonomic purpose, and typical load/size dimensions.
       • Origin history of this object category or notable maker/manufacturer traditions.
       • 4 fascinating trivia points or everyday engineering facts.

Your task:
1. Detect any visible text, brand logos, model markings, inscriptions, or plaques using OCR and transcribe them into "ocrDetectedText".
2. Accurately identify the item shown: whether it is a rare ancient monument, singing pillar, sculpture, food dish, plant, animal, vehicle, electronic gadget, furniture, tool, or everyday common object (like a chair, cup, or shoe).
3. Determine category: monument, temple, fort, museum, landscape, food, plant, object, building, or animal.
4. Calculate a confidence score between 0.80 and 0.99.
5. Provide a lively, spoken-style narration in "${language}" (2-3 paragraphs for grand sights, or 5-10 concise spoken lines for everyday objects covering design, materials, usage, and fun facts).
6. Provide a concise 2-sentence summary.
7. Provide 4 fascinating key facts, dimensions, material details, or historical highlights.
8. Provide 3 visual or design highlights to observe right now (e.g., carving acoustics for temple pillars; joint craft, ergonomics, or material finish for everyday objects).
9. Suggest 3 engaging follow-up questions the user can ask.
10. Identify historical period/era or contemporary design era if applicable.
11. Describe 3 to 4 supplementary/contextual visual scenes in "supplementaryScenes" with a descriptive title, caption, and type ('historical', 'interior', 'aerial', 'night', 'detail', 'art', 'context').
12. Add 4 relevant tags.`;

    const response = await generateContentWithFallback(ai, {
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: inlineImage.mimeType,
              data: inlineImage.data,
            },
          },
          { text: promptText },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Title of the identified subject' },
            nativeTitle: { type: Type.STRING, description: 'Title in local native script if applicable' },
            category: {
              type: Type.STRING,
              description: 'One of: monument, temple, fort, museum, landscape, food, plant, object, building, animal',
            },
            confidence: { type: Type.NUMBER, description: 'Confidence between 0 and 1' },
            locationName: { type: Type.STRING, description: 'Specific location or region name' },
            historicalPeriod: { type: Type.STRING, description: 'Era, century, or origin' },
            ocrDetectedText: { type: Type.STRING, description: 'Any OCR text detected on plaques, signs, or labels' },
            summary: { type: Type.STRING, description: '2 sentence quick summary' },
            narration: { type: Type.STRING, description: 'Audio narration script in target language' },
            keyFacts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '4 distinct bullet point facts',
            },
            architecturalHighlights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 visual or architectural highlights',
            },
            suggestedQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 follow-up questions',
            },
            supplementaryScenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  caption: { type: Type.STRING },
                  type: { type: Type.STRING, description: 'historical, interior, aerial, night, detail, or art' },
                },
                required: ['title', 'caption', 'type'],
              },
              description: '3-4 contextual scenes or complementary images',
            },
            culturalSignificance: { type: Type.STRING, description: 'Cultural importance or UNESCO status' },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '4 keywords or tags',
            },
          },
          required: ['title', 'category', 'confidence', 'summary', 'narration', 'keyFacts', 'suggestedQuestions', 'tags'],
        },
      },
    });

    const jsonText = response.text || '{}';
    const parsedResult = safeJsonParse<any>(jsonText, {});

    // Build supplementary images list
    const titleKey = (parsedResult.title || '').toLowerCase();
    let specificImages = LANDMARK_SPECIFIC_IMAGES[titleKey];
    if (!specificImages) {
      for (const [k, imgs] of Object.entries(LANDMARK_SPECIFIC_IMAGES)) {
        if (titleKey.includes(k) || k.includes(titleKey)) {
          specificImages = imgs;
          break;
        }
      }
    }

    const fallbackCatImages = CATEGORY_IMAGE_SETS[parsedResult.category] || CATEGORY_IMAGE_SETS.monument;
    const baseImageList = specificImages || fallbackCatImages;

    const supplementaryImages = (parsedResult.supplementaryScenes || []).map((scene: any, idx: number) => {
      const matchFallback = baseImageList[idx % baseImageList.length];
      return {
        id: `supp-${idx}-${Date.now()}`,
        url: matchFallback.url,
        title: scene.title || matchFallback.title,
        caption: scene.caption || matchFallback.caption,
        type: scene.type || matchFallback.type || 'historical',
      };
    });

    // If Gemini didn't supply scenes, populate from fallback list
    if (supplementaryImages.length === 0) {
      baseImageList.forEach((item, idx) => {
        supplementaryImages.push({
          id: `supp-fb-${idx}`,
          url: item.url,
          title: item.title,
          caption: item.caption,
          type: item.type as any,
        });
      });
    }

    const result = {
      id: `scan-${Date.now()}`,
      ...parsedResult,
      supplementaryImages,
      timestamp: new Date().toISOString(),
      audioDurationSeconds: Math.max(20, Math.round((parsedResult.narration?.length || 200) / 12)),
      coords: effectiveCoords || undefined,
      batchStatus: {
        batch1Ready: true,
        batch2Ready: true,
        batch3Ready: true,
        stage: 'complete',
        timestamp: Date.now(),
      },
    };

    res.json({ success: true, landmark: result });
  } catch (error: any) {
    console.error('Error in landmark recognition:', error);
    const statusCode = error?.status === 400 ? 400 : 500;
    res.status(statusCode).json({
      error: statusCode === 400 ? error.message : 'Failed to identify landmark from camera image',
      details: error.message || String(error),
    });
  }
}

// Progressive Batch-Streaming Landmark Recognition Endpoint (Server-Sent Events)
async function handleLandmarkRecognitionStream(req: express.Request, res: express.Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (type: string, data: any) => {
    if (res.writableEnded) return;
    try {
      res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
    } catch (e) {
      console.warn('Error writing SSE event:', e);
    }
  };

  try {
    const {
      image,
      imageBase64,
      location,
      coords,
      language = 'English',
      history = [],
      userPrompt,
      topics,
      persona = 'warm_female',
      voiceGender = 'female',
    } = req.body;

    const rawImg = image || imageBase64;
    if (!rawImg) {
      sendEvent('error', { message: 'Image data is required' });
      return;
    }

    const effectiveCoords = location || coords;
    const scanId = `scan-${Date.now()}`;

    // -------------------------------------------------------------
    // BATCH 1 (Immediate / < 100ms): Basic structural state & flags
    // -------------------------------------------------------------
    const initialLocationName = effectiveCoords?.city
      ? `${effectiveCoords.city}, ${effectiveCoords.country || 'India'}`
      : 'Local Heritage Sight';

    const batch1Data = {
      id: scanId,
      title: userPrompt ? `Exploring "${userPrompt}"` : 'Heritage Sight / Subject',
      category: 'monument' as const,
      confidence: 0.95,
      locationName: initialLocationName,
      summary: 'Analyzing captured sight and historical context...',
      narration: '',
      keyFacts: [],
      tags: ['heritage', 'sightseeing'],
      timestamp: new Date().toISOString(),
      coords: effectiveCoords || undefined,
      batchStatus: {
        batch1Ready: true,
        batch2Ready: false,
        batch3Ready: false,
        stage: 'batch1_structural' as const,
        timestamp: Date.now(),
      },
    };

    sendEvent('batch1', batch1Data);

    // -------------------------------------------------------------
    // BATCH 2 (Fast Stream / < 600ms): Resolve image bytes + Core text, narration & OCR
    // -------------------------------------------------------------
    const inlineImage = await resolveImageToInlinePart(rawImg);
    const ai = getGenAI();
    const historyContext = history.length > 0
      ? `CRITICAL MEMORY DIRECTIVE: The user has ALREADY visited and received explanations for these topics: [${history.join(', ')}]. DO NOT repeat basic introductory information. Provide NEW deep-dive folklore, architecture, and photography insights.`
      : `Provide a captivating, accurate introductory explanation as a personal local guide.`;

    const topicDirectives = buildTopicGuidance(topics, persona, voiceGender);
    const promptText = `You are Charaiva, an elite AI multilingual universal visual guide, expert historian, and object identifier.
Analyze the attached camera image along with GPS location context: ${effectiveCoords ? `Lat ${effectiveCoords.latitude}, Lng ${effectiveCoords.longitude}` : 'Unknown location'}.
${userPrompt ? `User specifically asked: "${userPrompt}"` : ''}

Language Requirement: Produce ALL text response fields strictly in the language: "${language}".

${historyContext}

${topicDirectives}

Your task:
1. Detect any visible text, brand logos, markings, or inscriptions using OCR and transcribe them into "ocrDetectedText".
2. Accurately identify the item shown: cultural/historical sights, statues, architecture, food, plant, or everyday common objects.
3. Determine category: monument, temple, fort, museum, landscape, food, plant, object, building, or animal.
4. Calculate confidence between 0.85 and 0.99.
5. Provide a lively, spoken-style narration in "${language}" (2-3 paragraphs for sights, or 5-10 spoken lines for objects).
6. Provide a concise 2-sentence summary.
7. Provide 4 fascinating key facts.
8. Provide 3 visual or design highlights.
9. Suggest 3 engaging follow-up questions.
10. Identify historical period/era if applicable.
11. Describe 3 to 4 supplementary/contextual visual scenes in "supplementaryScenes" (title, caption, type).
12. Add 4 relevant tags.`;

    const response = await generateContentWithFallback(ai, {
      model: 'gemini-3.1-flash-lite',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: inlineImage.mimeType,
              data: inlineImage.data,
            },
          },
          { text: promptText },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Title of the identified subject' },
            nativeTitle: { type: Type.STRING, description: 'Title in local native script' },
            category: {
              type: Type.STRING,
              description: 'One of: monument, temple, fort, museum, landscape, food, plant, object, building, animal',
            },
            confidence: { type: Type.NUMBER, description: 'Confidence between 0 and 1' },
            locationName: { type: Type.STRING, description: 'Specific location or region name' },
            historicalPeriod: { type: Type.STRING, description: 'Era, century, or origin' },
            ocrDetectedText: { type: Type.STRING, description: 'Any OCR text detected' },
            summary: { type: Type.STRING, description: '2 sentence quick summary' },
            narration: { type: Type.STRING, description: 'Audio narration script in target language' },
            keyFacts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '4 distinct bullet point facts',
            },
            architecturalHighlights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 visual highlights',
            },
            suggestedQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 follow-up questions',
            },
            supplementaryScenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  caption: { type: Type.STRING },
                  type: { type: Type.STRING, description: 'historical, interior, aerial, night, detail, or art' },
                },
                required: ['title', 'caption', 'type'],
              },
            },
            culturalSignificance: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['title', 'category', 'confidence', 'summary', 'narration', 'keyFacts', 'suggestedQuestions', 'tags'],
        },
      },
    });

    const jsonText = response.text || '{}';
    const parsedResult = safeJsonParse<any>(jsonText, {});

    const batch2Data = {
      title: parsedResult.title || 'Identified Landmark',
      nativeTitle: parsedResult.nativeTitle,
      category: parsedResult.category || 'monument',
      confidence: parsedResult.confidence || 0.95,
      locationName: parsedResult.locationName || initialLocationName,
      historicalPeriod: parsedResult.historicalPeriod,
      ocrDetectedText: parsedResult.ocrDetectedText,
      summary: parsedResult.summary || 'Heritage landmark discovered.',
      narration: parsedResult.narration || '',
      keyFacts: parsedResult.keyFacts || [],
      architecturalHighlights: parsedResult.architecturalHighlights || [],
      suggestedQuestions: parsedResult.suggestedQuestions || [],
      culturalSignificance: parsedResult.culturalSignificance,
      tags: parsedResult.tags || [],
      batchStatus: {
        batch1Ready: true,
        batch2Ready: true,
        batch3Ready: false,
        stage: 'batch2_core_text' as const,
        timestamp: Date.now(),
      },
    };

    sendEvent('batch2', batch2Data);

    // -------------------------------------------------------------
    // BATCH 3 (Deferred Async): Heavy media, Leaflet coords, Images
    // -------------------------------------------------------------
    const titleKey = (parsedResult.title || '').toLowerCase();
    let specificImages = LANDMARK_SPECIFIC_IMAGES[titleKey];
    if (!specificImages) {
      for (const [k, imgs] of Object.entries(LANDMARK_SPECIFIC_IMAGES)) {
        if (titleKey.includes(k) || k.includes(titleKey)) {
          specificImages = imgs;
          break;
        }
      }
    }

    const fallbackCatImages = CATEGORY_IMAGE_SETS[parsedResult.category] || CATEGORY_IMAGE_SETS.monument;
    const baseImageList = specificImages || fallbackCatImages;

    const supplementaryImages = (parsedResult.supplementaryScenes || []).map((scene: any, idx: number) => {
      const matchFallback = baseImageList[idx % baseImageList.length];
      return {
        id: `supp-${idx}-${Date.now()}`,
        url: matchFallback.url,
        title: scene.title || matchFallback.title,
        caption: scene.caption || matchFallback.caption,
        type: scene.type || matchFallback.type || 'historical',
      };
    });

    if (supplementaryImages.length === 0) {
      baseImageList.forEach((item, idx) => {
        supplementaryImages.push({
          id: `supp-fb-${idx}`,
          url: item.url,
          title: item.title,
          caption: item.caption,
          type: item.type as any,
        });
      });
    }

    const batch3Data = {
      supplementaryImages,
      audioDurationSeconds: Math.max(20, Math.round((parsedResult.narration?.length || 200) / 12)),
      coords: effectiveCoords || undefined,
      batchStatus: {
        batch1Ready: true,
        batch2Ready: true,
        batch3Ready: true,
        stage: 'complete' as const,
        timestamp: Date.now(),
      },
    };

    sendEvent('batch3', batch3Data);
    sendEvent('done', { id: scanId });
  } catch (error: any) {
    console.error('Error in streaming landmark recognition:', error);
    sendEvent('error', { message: error.message || 'Stream processing failed' });
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
}

// Identify Landmark / Sight endpoints (support both routes)
app.post('/api/identify-landmark', handleLandmarkRecognition);
app.post('/api/recognize-landmark', handleLandmarkRecognition);
app.post('/api/recognize-landmark-stream', handleLandmarkRecognitionStream);
app.post('/api/recognize-landmark/stream', handleLandmarkRecognitionStream);
app.post('/api/stream-scan', handleLandmarkRecognitionStream);

// Audio TTS Endpoint using Gemini TTS
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voiceName = 'Kore' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text parameter required' });
    }

    const ai = getGenAI();
    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [{ parts: [{ text: `Say with warm, enthusiastic tour guide tone: ${text.slice(0, 500)}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
          },
        },
      },
    });

    const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (base64Audio) {
      res.json({ success: true, audioBase64: base64Audio, format: 'audio/pcm' });
    } else {
      res.json({ success: false, fallbackToBrowser: true });
    }
  } catch (error: any) {
    console.warn('Gemini TTS failed, signalling fallback to Web Speech Synthesis:', error.message);
    res.json({ success: false, fallbackToBrowser: true });
  }
});

// Interactive AI Tour Guide Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const {
      message,
      landmarkContext,
      language = 'English',
      history = [],
      topics,
      persona = 'warm_female',
      voiceGender = 'female',
    } = req.body;

    const ai = getGenAI();
    const topicDirectives = buildTopicGuidance(topics, persona, voiceGender);

    const systemPrompt = `You are Charaiva, an expert multilingual AI Tourist Guide.
Current Location / Subject Context: ${landmarkContext ? JSON.stringify(landmarkContext) : 'Exploring local heritage'}.
User Language: "${language}".
Memory of Explained Topics in this Session: [${history.join(', ')}].

${topicDirectives}

Directives:
1. Always respond in "${language}".
2. Be warm, knowledgeable, concise, and engaging (like a live personal female guide talking through a headset).
3. Verify historical, geographical, and architectural facts for absolute correctness.
4. If the user interrupts or asks a specific question, answer directly with rich detail without repeating basic info already covered.
5. Keep answers under 150 words for fast reading and listening.`;

    const response = await generateContentWithFallback(ai, {
      model: 'gemini-3.1-flash-lite',
      contents: message,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    res.json({
      success: true,
      reply: response.text || 'I am happy to guide you further. What specific detail would you like to explore next?',
    });
  } catch (error: any) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: 'Chat guide unavailable', details: error.message });
  }
});

// Translate Landmark Explanation into Selected Language
app.post('/api/translate-landmark', async (req, res) => {
  try {
    const { landmark, targetLanguage } = req.body;
    if (!landmark || !targetLanguage) {
      return res.status(400).json({ error: 'landmark and targetLanguage are required' });
    }

    const ai = getGenAI();
    const prompt = `Translate and localize the following tourist guide landmark details strictly into "${targetLanguage}".
Keep historical accuracy, cultural nuance, vivid storytelling style, and clear formatting suitable for audio narration.

Landmark details:
${JSON.stringify(landmark, null, 2)}

Produce valid JSON with translated properties:
- title
- nativeTitle (name in target language native script)
- locationName
- historicalPeriod
- ocrDetectedText (translated or original inscription)
- summary
- narration (spoke narration script in ${targetLanguage})
- keyFacts (array of strings)
- architecturalHighlights (array of strings)
- suggestedQuestions (array of strings in ${targetLanguage})
- culturalSignificance
- tags (array of strings)`;

    const response = await generateContentWithFallback(ai, {
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            nativeTitle: { type: Type.STRING },
            locationName: { type: Type.STRING },
            historicalPeriod: { type: Type.STRING },
            ocrDetectedText: { type: Type.STRING },
            summary: { type: Type.STRING },
            narration: { type: Type.STRING },
            keyFacts: { type: Type.ARRAY, items: { type: Type.STRING } },
            architecturalHighlights: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            culturalSignificance: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['title', 'summary', 'narration', 'keyFacts', 'suggestedQuestions'],
        },
      },
    });

    const parsed = safeJsonParse(response.text, {});
    const updatedLandmark = {
      ...landmark,
      ...parsed,
      language: targetLanguage,
    };

    res.json({ success: true, landmark: updatedLandmark });
  } catch (error: any) {
    console.error('Error translating landmark:', error);
    res.status(500).json({ error: 'Failed to translate landmark', details: error.message });
  }
});

// Nearby Landmarks Discovery
app.post('/api/nearby-landmarks', async (req, res) => {
  try {
    const { lat, lng, language = 'English' } = req.body;
    const ai = getGenAI();

    const prompt = `Generate 4 realistic tourist attractions, historical monuments, local dishes, or nature spots near GPS (${lat || 27.1751}, ${lng || 78.0421}) in "${language}".
Return valid JSON list of objects with: title, category, distanceMeters, teaser, lat, lng, rating.`;

    const response = await generateContentWithFallback(ai, {
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              distanceMeters: { type: Type.NUMBER },
              teaser: { type: Type.STRING },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
              rating: { type: Type.NUMBER },
            },
            required: ['title', 'category', 'distanceMeters', 'teaser', 'lat', 'lng', 'rating'],
          },
        },
      },
    });

    const parsed = safeJsonParse(response.text, []);
    res.json({ success: true, landmarks: parsed });
  } catch (error) {
    // Fallback sample
    res.json({ success: true, landmarks: [] });
  }
});

// Reverse Geocode: Convert Device GPS (lat/lng) into Exact Human-Readable Location (Area, City, State, Country)
app.post('/api/reverse-geocode', async (req, res) => {
  try {
    const { latitude, longitude } = req.body || {};
    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // Try BigDataCloud / OpenStreetMap Reverse Geocoding
    try {
      const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
      const response = await fetch(bdcUrl, {
        headers: { 'User-Agent': 'CharaivaTouristGuide/1.0' },
        signal: AbortSignal.timeout(4000),
      });

      if (response.ok) {
        const data = await response.json();
        const locality = data.locality || data.localityInfo?.administrative?.[3]?.name || data.localityInfo?.administrative?.[2]?.name || '';
        const city = data.city || data.principalSubdivision || data.localityInfo?.administrative?.[1]?.name || 'Madurai';
        const state = data.principalSubdivision || '';
        const country = data.countryName || 'India';

        const parts = [locality, city, state, country].filter((p) => Boolean(p) && p.trim().length > 0);
        // Deduplicate adjacent repeating names
        const cleanParts = parts.filter((p, i, arr) => arr.indexOf(p) === i);
        const formattedLocationName = cleanParts.join(', ');

        return res.json({
          success: true,
          locationName: formattedLocationName || `${city}, ${country}`,
          locality,
          city,
          state,
          country,
          latitude: lat,
          longitude: lng,
        });
      }
    } catch (e) {
      console.warn('BigDataCloud reverse geocode failed, attempting Gemini AI / fallback:', e);
    }

    // AI / Proximity Fallback for exact Indian and global heritage locations
    const ai = getGenAI();
    const prompt = `Identify the exact human-readable geographic area, neighborhood/locality, city/district, state, and country corresponding to latitude ${lat} and longitude ${lng}.
Return a clean JSON object with:
- locationName (e.g. "Simmakkal, Madurai, Tamil Nadu, India" or "Indiranagar, Bengaluru, Karnataka, India" or "Bandra West, Mumbai, Maharashtra, India")
- locality (neighborhood or area name)
- city (city or town name)
- state (state or province)
- country (country name)`;

    const aiRes = await generateContentWithFallback(ai, {
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            locationName: { type: Type.STRING },
            locality: { type: Type.STRING },
            city: { type: Type.STRING },
            state: { type: Type.STRING },
            country: { type: Type.STRING },
          },
          required: ['locationName', 'city', 'country'],
        },
      },
    });

    const parsed = safeJsonParse<{ locationName?: string; locality?: string; city?: string; state?: string; country?: string }>(aiRes.text, {});
    return res.json({
      success: true,
      locationName: parsed.locationName || `${parsed.city || 'Madurai'}, ${parsed.country || 'India'}`,
      locality: parsed.locality || '',
      city: parsed.city || 'Madurai',
      state: parsed.state || 'Tamil Nadu',
      country: parsed.country || 'India',
      latitude: lat,
      longitude: lng,
    });
  } catch (error: any) {
    console.error('Error in reverse geocode:', error);
    res.json({
      success: true,
      locationName: 'Madurai Heritage District, Tamil Nadu, India',
      locality: 'Heritage Center',
      city: 'Madurai',
      state: 'Tamil Nadu',
      country: 'India',
      latitude: 9.9195,
      longitude: 78.1193,
    });
  }
});

// Deep-Dive Topic Endpoint: Expands any recognized sight or topic with in-depth hidden secrets, folklore, architecture, and mysteries
app.post('/api/deep-dive-topic', async (req, res) => {
  try {
    const { title, category, locationName, language = 'English', currentNarration, userQuestion } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required for deep dive' });
    }

    const ai = getGenAI();
    const prompt = `You are Charaiva, the world's most knowledgeable historian and personal AI tourist guide.
The user wants to KNOW MUCH MORE in-depth details about this specific sight/topic:
- Title/Subject: "${title}"
- Category: "${category || 'Landmark'}"
- Location: "${locationName || 'Current Location'}"
- Current known narration summary: "${currentNarration ? currentNarration.substring(0, 300) : 'None'}"
${userQuestion ? `- Specific user curiosity: "${userQuestion}"` : ''}

Language requirement: Produce ALL fields strictly in "${language}".

Provide an immersive, fascinating, and thoroughly researched deep-dive dossier.
Include:
1. "deepDiveNarration": 3-4 vivid paragraphs in spoken tour guide style covering untold legends, historical background, architecture nuances, and spiritual/cultural meaning. (No markdown symbols in this narration string).
2. "secretFacts": 4 extraordinary, lesser-known secret facts or hidden details that most regular tourists miss.
3. "architecturalSecrets": 3 specific architectural or craft details to look closely at.
4. "historicalTimeline": 3-4 chronological milestones.
5. "unsolvedMysteries": 2 intriguing questions or historical debates about this place.
6. "visitorProTips": 3 practical, insider tips for visitors exploring this sight today.`;

    const aiRes = await generateContentWithFallback(ai, {
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            deepDiveNarration: { type: Type.STRING },
            secretFacts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            architecturalSecrets: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            historicalTimeline: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  era: { type: Type.STRING },
                  event: { type: Type.STRING },
                },
                required: ['era', 'event'],
              },
            },
            unsolvedMysteries: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            visitorProTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['title', 'deepDiveNarration', 'secretFacts', 'architecturalSecrets', 'visitorProTips'],
        },
      },
    });

    const parsed = safeJsonParse<any>(aiRes.text, {});
    res.json({
      success: true,
      title: parsed.title || title,
      deepDiveNarration: parsed.deepDiveNarration || '',
      secretFacts: parsed.secretFacts || [],
      architecturalSecrets: parsed.architecturalSecrets || [],
      historicalTimeline: parsed.historicalTimeline || [],
      unsolvedMysteries: parsed.unsolvedMysteries || [],
      visitorProTips: parsed.visitorProTips || [],
    });
  } catch (error: any) {
    console.error('Error in deep-dive-topic:', error);
    res.json({
      success: true,
      title: req.body?.title || 'Historical Landmark',
      deepDiveNarration: `Welcome to this remarkable heritage landmark. Constructed with brilliant craftsmanship, it stands as a celebrated cultural monument with rich regional folklore and stunning architecture. Take your time to observe the intricate stone facades, sculpted arches, and sacred motifs.`,
      secretFacts: [
        'Built using indigenous architectural techniques and traditional mortar formulations that have resisted weathering for centuries.',
        'Features hidden geometric alignments that capture morning sunlight during seasonal equinoxes.',
        'Was a prominent center for local cultural assemblies and royal patrons throughout historical dynasties.',
        'Preserves ancient inscriptions documenting contributions from local craft guilds and merchant guilds.'
      ],
      architecturalSecrets: [
        'Notice the monolithic pillar carvings exhibiting micro-details in high relief.',
        'Examine the vaulted ceilings engineered to provide natural acoustics and cool cross-ventilation.',
        'Look for the distinct decorative brackets and stone cornices typical of the regional classical school.'
      ],
      historicalTimeline: [
        { era: 'Ancient Foundations', event: 'Initial sanctum and boundary walls consecrated' },
        { era: 'Golden Age Expansion', event: 'Monumental towers and pillared mandapams constructed' },
        { era: 'Modern Era', event: 'Preserved and celebrated as a prime national cultural treasure' }
      ],
      unsolvedMysteries: [
        'The exact underground water channels and acoustic stone properties that continue to amaze engineers today.',
        'Undeciphered secondary mason symbols engraved on the upper tower levels.'
      ],
      visitorProTips: [
        'Visit during early morning or late afternoon for the best soft lighting and uncrowded atmosphere.',
        'Walk clockwise around the monument to view the chronological sequence of outer stone carvings.',
        'Hire a verified local guide or use Charaiva audio guide for deep architectural explanations.'
      ],
    });
  }
});

// Proxy endpoint to securely fetch photos from Google Places Photo API (New) without exposing server API key
app.get('/api/places/photo', async (req, res) => {
  try {
    const photoName = (req.query.name as string) || '';
    const maxHeightPx = parseInt(req.query.maxHeightPx as string, 10) || 800;
    const maxWidthPx = parseInt(req.query.maxWidthPx as string, 10) || 800;
    const gmpApiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

    if (!photoName) {
      return res.status(400).send('Photo name parameter required');
    }

    if (!gmpApiKey) {
      return res.status(503).send('Google Maps Platform key not configured');
    }

    // Google Places Photo API (New): https://places.googleapis.com/v1/{name=places/*/photos/*}/media
    const targetUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=${maxHeightPx}&maxWidthPx=${maxWidthPx}&key=${gmpApiKey}`;
    const photoRes = await fetch(targetUrl, {
      redirect: 'follow',
      headers: {
        Accept: 'image/*',
        'User-Agent': 'CharaivaGuide/1.0',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!photoRes.ok) {
      return res.status(photoRes.status).send('Photo fetch failed');
    }

    const contentType = photoRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

    const arrayBuffer = await photoRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return res.send(buffer);
  } catch (error: any) {
    console.error('Error fetching Google Places Photo:', error);
    return res.status(500).send('Internal error fetching photo');
  }
});

const proxyImageCache = new Map<string, { buffer: Buffer; contentType: string; timestamp: number }>();

// Proxy endpoint to securely stream and cache Wikipedia / Wikimedia / heritage photos without referer blocking
app.get('/api/places/proxy-image', async (req, res) => {
  try {
    const targetUrl = (req.query.url as string) || '';
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return res.status(400).send('Valid image URL required');
    }

    // Check in-memory buffer cache first
    const cached = proxyImageCache.get(targetUrl);
    if (cached && Date.now() - cached.timestamp < 24 * 3600 * 1000) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=2592000');
      return res.send(cached.buffer);
    }

    let imgRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'CharaivaTravelGuide/1.0 (https://charaiva.app; contact@charaiva.app)',
        Accept: 'image/webp,image/apng,image/jpeg,image/png,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(9000),
    });

    // If direct thumbnail gave 429 or 404, fallback to Special:FilePath or original image
    if (!imgRes.ok && (targetUrl.includes('wikimedia.org') || targetUrl.includes('wikipedia.org'))) {
      const fileName = targetUrl.split('/').pop()?.replace(/^\d+px-/, '') || '';
      if (fileName) {
        const specialUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=960`;
        try {
          const fallbackRes = await fetch(specialUrl, {
            headers: {
              'User-Agent': 'CharaivaTravelGuide/1.0 (https://charaiva.app; contact@charaiva.app)',
            },
            redirect: 'follow',
            signal: AbortSignal.timeout(9000),
          });
          if (fallbackRes.ok) {
            imgRes = fallbackRes;
          }
        } catch (e) {
          console.warn('Special:FilePath fallback failed:', e);
        }
      }
    }

    if (!imgRes.ok) {
      return res.status(imgRes.status).send('Failed to retrieve image');
    }

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=2592000');

    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to memory cache
    proxyImageCache.set(targetUrl, {
      buffer,
      contentType,
      timestamp: Date.now(),
    });

    return res.send(buffer);
  } catch (error: any) {
    console.error('Error proxying image:', error);
    return res.status(500).send('Image proxy error');
  }
});

// Resolve exact place photo on demand via Google Places API (New)
app.post('/api/places/resolve-photo', async (req, res) => {
  try {
    const { placeName, city, lat, lng, placeId } = req.body || {};
    const gmpApiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

    const photoResult = await resolveExactPlacePhotoWithGooglePlaces(
      placeName || '',
      city || '',
      lat ? parseFloat(lat) : undefined,
      lng ? parseFloat(lng) : undefined,
      placeId,
      gmpApiKey
    );

    return res.json({
      success: true,
      ...photoResult,
    });
  } catch (error: any) {
    console.error('Error resolving place photo:', error);
    return res.json({
      success: false,
      hasRealPhoto: false,
      photoUrl: '',
      authorAttributions: [],
      photos: [],
    });
  }
});

// Discover Real Nearby Spots around the user's exact current GPS location
// Architecture: GPS Coordinates -> Google Places (New) / OpenStreetMap / Ground Truth POI index -> Real Places DB -> Gemini AI Storyteller
app.post('/api/discover-nearby-spots', async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      locationName = 'Current Location',
      city = 'Local Area',
      state = '',
      country = 'India',
      language = 'English',
      category = 'all',
    } = req.body || {};

    const lat = parseFloat(latitude) || 9.9195;
    const lng = parseFloat(longitude) || 78.1193;

    const ai = getGenAI();
    const gmpApiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

    const { areaOverview, spots, groundTruthCount } = await getRealNearbyPlaces({
      latitude: lat,
      longitude: lng,
      locationName,
      city,
      language,
      gmpApiKey,
      aiClient: ai,
    });

    res.json({
      success: true,
      areaOverview,
      spots,
      groundTruthCount,
      locationName,
      city,
    });
  } catch (error: any) {
    console.error('Error in discover-nearby-spots:', error);
    const locName = req.body?.locationName || 'your current location';
    const cName = req.body?.city || 'Local Area';
    res.json({
      success: true,
      areaOverview: `Showing authentic discovered attractions around ${locName}.`,
      spots: [],
      locationName: locName,
      city: cName,
    });
  }
});

// Location Overview endpoint: Provides representative authentic photo & overview of current GPS area
app.post('/api/location-overview', async (req, res) => {
  const { latitude, longitude, locationName = 'Current Location', city = 'Local Area', country = 'India', language = 'English' } = req.body || {};
  const lat = parseFloat(latitude) || 9.9195;
  const lng = parseFloat(longitude) || 78.1193;
  const cacheKey = `loc-overview-${lat.toFixed(2)}-${lng.toFixed(2)}-${encodeURIComponent(city)}-${language}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return res.json({ success: true, ...cached });
  }

  const gmpApiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

  // Resolve authentic photo for this city/location
  let resolvedPhotoUrl = '';
  try {
    const photoResult = await resolveExactPlacePhotoWithGooglePlaces(
      city && city !== 'Local Area' ? city : locationName,
      city,
      lat,
      lng,
      undefined,
      gmpApiKey
    );
    if (photoResult?.hasRealPhoto && photoResult.photoUrl) {
      resolvedPhotoUrl = photoResult.photoUrl;
    }
  } catch (e) {
    console.warn('Could not resolve photo for location overview:', e);
  }

  try {
    const ai = getGenAI();
    const prompt = `Provide a rich tourist overview of the current device location:
Area/Place: "${locationName}"
City: "${city}", Country: "${country}"
Coordinates: Lat ${lat}, Lng ${lng}
Language: "${language}"

Return JSON:
- "headline": Engaging place title (e.g. "Welcome to Nagpur" or "Exploring Madurai Heritage")
- "description": 2-3 sentence overview of this exact geographic zone's character, history, and atmosphere
- "photoKeyword": best keyword for an image of this place
- "localMustDos": 3 bullet points of top things to do right here
- "currentAtmosphere": e.g. "Heritage Central Hub", "Historic Old Town", "Cultural City Center"`;

    const aiRes = await generateContentWithFallback(ai, {
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            description: { type: Type.STRING },
            photoKeyword: { type: Type.STRING },
            localMustDos: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            currentAtmosphere: { type: Type.STRING },
          },
          required: ['headline', 'description', 'localMustDos', 'currentAtmosphere'],
        },
      },
    });

    const parsed = safeJsonParse<any>(aiRes.text, {});

    const resultData = {
      headline: parsed.headline || `Current Location: ${locationName}`,
      description: parsed.description || `Exploring ${locationName}, ${city}. Point your camera at any building, temple, statue, or street food for instant multilingual audio tour narration.`,
      localMustDos: parsed.localMustDos || ['Point camera at nearby sights', 'Explore local heritage streets', 'Taste local culinary delicacies'],
      currentAtmosphere: parsed.currentAtmosphere || 'Historic Local Precinct',
      photoUrl: resolvedPhotoUrl || '',
      latitude: lat,
      longitude: lng,
      locationName,
      city,
    };

    setCached(cacheKey, resultData, 600);
    res.json({ success: true, ...resultData });
  } catch (error: any) {
    console.warn('Location overview fallback used:', error?.message || error);
    const locName = locationName || 'Local Area';
    const fallbackData = {
      headline: `Welcome to ${locName}`,
      description: `Exploring ${locName}, ${city}. Point your camera at any monument, temple, statue, or street food for instant multilingual audio tour narration.`,
      localMustDos: [
        'Point camera at historic facades & temples',
        'Explore authentic local street food & markets',
        'Tap any nearby sight for live audio guide narration'
      ],
      currentAtmosphere: 'Historic Cultural Precinct',
      photoUrl: resolvedPhotoUrl || '',
      latitude: lat,
      longitude: lng,
      locationName: locName,
      city,
    };

    setCached(cacheKey, fallbackData, 300);
    res.json({
      success: true,
      ...fallbackData,
    });
  }
});

// Curated Popular Indian & Global Cities with coordinates and highlights
const POPULAR_CITIES = [
  {
    name: 'Nagpur',
    state: 'Maharashtra',
    country: 'India',
    latitude: 21.1458,
    longitude: 79.0882,
    tagline: 'The Orange City & Zero Mile Center of India',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Deeksha_Bhoomi_Nagpur.JPG/1200px-Deeksha_Bhoomi_Nagpur.JPG',
    topLandmarks: ['Deekshabhoomi', 'Shree Ganesh Mandir Tekdi', 'Futala Lake', 'Sitabuldi Fort', 'Zero Mile Stone'],
    famousFoods: ['Nagpur Tarri Poha', 'Saoji Mutton & Chicken', 'Haldiram\'s Sweets', 'Orange Barfi']
  },
  {
    name: 'Madurai',
    state: 'Tamil Nadu',
    country: 'India',
    latitude: 9.9195,
    longitude: 78.1193,
    tagline: 'The Ancient City of Temples & Jasmine',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Madurai_Meenakshi_Amman_Temple_East_Tower.jpg/1200px-Madurai_Meenakshi_Amman_Temple_East_Tower.jpg',
    topLandmarks: ['Meenakshi Amman Temple', 'Thirumalai Nayakkar Palace', 'Gandhi Memorial Museum', 'Vandiyur Mariamman Teppakulam'],
    famousFoods: ['Jigarthanda', 'Madurai Kari Dosa', 'Bun Parotta', 'Filter Coffee']
  },
  {
    name: 'Varanasi',
    state: 'Uttar Pradesh',
    country: 'India',
    latitude: 25.3176,
    longitude: 82.9739,
    tagline: 'The Spiritual Capital of India & Sacred Ganga Ghats',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Varanasi_Ghats_at_Sunrise.jpg/1200px-Varanasi_Ghats_at_Sunrise.jpg',
    topLandmarks: ['Kashi Vishwanath Temple', 'Dashashwamedh Ghat', 'Assi Ghat', 'Sarnath Buddhist Complex'],
    famousFoods: ['Banarasi Paan', 'Kachori Sabzi', 'Malaiyo', 'Banarasi Lassi']
  },
  {
    name: 'Jaipur',
    state: 'Rajasthan',
    country: 'India',
    latitude: 26.9124,
    longitude: 75.7873,
    tagline: 'The Pink City of Royal Forts & Palaces',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Hawa_Mahal_2011.jpg/1200px-Hawa_Mahal_2011.jpg',
    topLandmarks: ['Hawa Mahal', 'Amer Fort', 'City Palace', 'Jantar Mantar', 'Nahargarh Fort'],
    famousFoods: ['Dal Baati Churma', 'Pyaaz Kachori', 'Ghevar', 'Lassi on MI Road']
  },
  {
    name: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    latitude: 18.9220,
    longitude: 72.8347,
    tagline: 'City of Dreams & Victorian Gothic Heritage',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Gateway_of_India_Mumbai.jpg/1200px-Gateway_of_India_Mumbai.jpg',
    topLandmarks: ['Gateway of India', 'Chhatrapati Shivaji Maharaj Terminus (CSMT)', 'Marine Drive', 'Elephanta Caves', 'Haji Ali Dargah'],
    famousFoods: ['Vada Pav', 'Pav Bhaji', 'Bombay Duck', 'Brun Maska & Irani Chai']
  },
  {
    name: 'Delhi',
    state: 'Delhi NCR',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.2090,
    tagline: 'The Historic Capital of Empires & Grand Monuments',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/India_Gate_in_New_Delhi_03-2016.jpg/1200px-India_Gate_in_New_Delhi_03-2016.jpg',
    topLandmarks: ['India Gate', 'Red Fort (Lal Qila)', 'Qutub Minar', 'Humayun\'s Tomb', 'Lotus Temple'],
    famousFoods: ['Chole Bhature', 'Butter Chicken', 'Chandni Chowk Paranthe', 'Dilli Chaat']
  },
  {
    name: 'Amritsar',
    state: 'Punjab',
    country: 'India',
    latitude: 31.6340,
    longitude: 74.8723,
    tagline: 'The Golden City of Peace & Valour',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/The_Golden_Temple_of_Amritsar_at_night.jpg/1200px-The_Golden_Temple_of_Amritsar_at_night.jpg',
    topLandmarks: ['Golden Temple (Harmandir Sahib)', 'Jallianwala Bagh', 'Wagah Border', 'Gobindgarh Fort'],
    famousFoods: ['Amritsari Kulcha', 'Langar Prashad', 'Lassi', 'Maa ki Dal']
  },
  {
    name: 'Hampi',
    state: 'Karnataka',
    country: 'India',
    latitude: 15.3350,
    longitude: 76.4600,
    tagline: 'UNESCO World Heritage Ruins of Vijayanagara Empire',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Stone_Chariot_in_Vittala_Temple_Complex%2C_Hampi.jpg/1200px-Stone_Chariot_in_Vittala_Temple_Complex%2C_Hampi.jpg',
    topLandmarks: ['Vittala Temple Stone Chariot', 'Virupaksha Temple', 'Lotus Mahal', 'Matanga Hill Viewpoint'],
    famousFoods: ['South Indian Thali', 'Badam Milk', 'Bisi Bele Bath', 'Fresh Coconut Water']
  },
  {
    name: 'Agra',
    state: 'Uttar Pradesh',
    country: 'India',
    latitude: 27.1751,
    longitude: 78.0421,
    tagline: 'Home of the Taj Mahal & Mughal Splendor',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/1200px-Taj_Mahal_%28Edited%29.jpeg',
    topLandmarks: ['Taj Mahal', 'Agra Fort', 'Fatehpur Sikri', 'Itmad-ud-Daulah (Baby Taj)'],
    famousFoods: ['Agra Petha (Angoori & Kesar)', 'Bedmi Puri', 'Mughlai Biryani', 'Dalmoth']
  }
];

// Endpoint: Search Cities
app.post('/api/city/search', async (req, res) => {
  try {
    const { query = '' } = req.body;
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) {
      return res.json({ success: true, cities: POPULAR_CITIES });
    }

    // Match popular list first
    const matchedPopular = POPULAR_CITIES.filter(
      (c) =>
        c.name.toLowerCase().includes(cleanQuery) ||
        c.state.toLowerCase().includes(cleanQuery) ||
        c.tagline.toLowerCase().includes(cleanQuery) ||
        c.country.toLowerCase().includes(cleanQuery)
    );

    if (matchedPopular.length >= 3) {
      return res.json({ success: true, cities: matchedPopular });
    }

    // If query is specific, search via OpenStreetMap Nominatim or AI
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&limit=6&addressdetails=1`;
      const nomRes = await fetch(nominatimUrl, {
        headers: { 'User-Agent': 'CharaivaCitySearch/1.0' },
        signal: AbortSignal.timeout(3500),
      });

      if (nomRes.ok) {
        const nomData = await nomRes.json();
        const customMatches = nomData.map((item: any) => ({
          name: item.address?.city || item.address?.town || item.address?.state_district || item.name,
          state: item.address?.state || item.address?.county || '',
          country: item.address?.country || 'India',
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
          tagline: `Destination in ${item.address?.state || item.address?.country || 'Region'}`,
          photoUrl: `https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=800&q=80`,
          topLandmarks: ['Historic City Center', 'Local Heritage Monuments', 'Cultural Markets'],
          famousFoods: ['Local Culinary Specialties', 'Traditional Street Food']
        }));

        // Combine deduplicated by name
        const combined = [...matchedPopular];
        for (const cm of customMatches) {
          if (!combined.some((x) => x.name.toLowerCase() === cm.name.toLowerCase())) {
            combined.push(cm);
          }
        }
        return res.json({ success: true, cities: combined });
      }
    } catch (e) {
      console.warn('Nominatim city search failed:', e);
    }

    return res.json({ success: true, cities: matchedPopular.length > 0 ? matchedPopular : POPULAR_CITIES.slice(0, 5) });
  } catch (error: any) {
    console.error('Error in city search:', error);
    res.json({ success: true, cities: POPULAR_CITIES });
  }
});

// Endpoint: Rich City Overview & In-Depth Guide (Two-Tier Information)
app.post('/api/city/info', async (req, res) => {
  try {
    const { city, state = '', country = 'India', language = 'English' } = req.body;
    const targetCity = city || 'Nagpur';

    const cacheKey = `city_guide_${targetCity.toLowerCase()}_${language.toLowerCase()}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({ success: true, ...cached });
    }

    // Check if we have verified ground truth / curated preset for this city
    const popularPreset = POPULAR_CITIES.find(
      (c) => c.name.toLowerCase() === targetCity.toLowerCase()
    );

    // Resolve an authentic photo for this city
    let resolvedPhoto = popularPreset?.photoUrl || '';
    if (!resolvedPhoto) {
      try {
        const gmpApiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
        const photoResult = await resolveExactPlacePhotoWithGooglePlaces(
          targetCity,
          state || country,
          undefined,
          undefined,
          undefined,
          gmpApiKey
        );
        if (photoResult.hasRealPhoto && photoResult.photoUrl) {
          resolvedPhoto = photoResult.photoUrl;
        }
      } catch (e) {
        console.warn('City photo resolve failed:', e);
      }
    }

    const ai = getGenAI();
    const prompt = `You are Charaiva, the world-renowned AI heritage historian and tourist guide.
Generate a structured, captivating, and highly accurate TWO-TIER City Tourist Dossier for the city: "${targetCity}", State: "${state}", Country: "${country}".
Language Requirement: Produce ALL text fields strictly in "${language}".

Return JSON strictly matching this schema:
Tier 1 (Brief Overview):
- "cityName": string
- "state": string
- "country": string
- "moniker": string (e.g. "The Orange City & Tiger Capital of India" or "City of Temples")
- "briefOverview": string (2-3 vivid, informative paragraphs summarizing the city's essence, significance, and travel appeal)
- "quickHighlights": string[] (4-5 key highlights/facts)
- "famousFoods": string[] (4-5 iconic dishes and where to eat them)
- "bestTimeToVisit": string (e.g. "October to March (Pleasant winter, 12°C - 28°C)")
- "climateAndGeography": string (1-2 sentences on geographical setting and climate)

Tier 2 (In-Depth Guide - for "Explore More"):
- "foundingAndHistory": string (2-3 detailed paragraphs about the founding rulers/dynasties, historical eras, transformations)
- "architecturalHeritage": string (detailed breakdown of prominent temple, fort, colonial, and modern architectural styles)
- "culinaryTrail": string (insider guide to famous food streets, historic sweet houses, and signature local flavors)
- "topDistricts": array of objects with { "name": string, "character": string, "mustSee": string } (3-4 top neighborhoods)
- "visitorInsiderTips": string[] (4-5 practical tips on local transit, best times, cultural etiquette, shopping)`;

    const aiRes = await generateContentWithFallback(ai, {
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cityName: { type: Type.STRING },
            state: { type: Type.STRING },
            country: { type: Type.STRING },
            moniker: { type: Type.STRING },
            briefOverview: { type: Type.STRING },
            quickHighlights: { type: Type.ARRAY, items: { type: Type.STRING } },
            famousFoods: { type: Type.ARRAY, items: { type: Type.STRING } },
            bestTimeToVisit: { type: Type.STRING },
            climateAndGeography: { type: Type.STRING },
            foundingAndHistory: { type: Type.STRING },
            architecturalHeritage: { type: Type.STRING },
            culinaryTrail: { type: Type.STRING },
            topDistricts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  character: { type: Type.STRING },
                  mustSee: { type: Type.STRING },
                },
                required: ['name', 'character', 'mustSee'],
              },
            },
            visitorInsiderTips: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: [
            'cityName',
            'moniker',
            'briefOverview',
            'quickHighlights',
            'famousFoods',
            'bestTimeToVisit',
            'foundingAndHistory',
            'architecturalHeritage',
            'culinaryTrail',
            'visitorInsiderTips',
          ],
        },
      },
    });

    const parsed = safeJsonParse<any>(aiRes.text, {});
    const resultData = {
      cityName: parsed.cityName || targetCity,
      state: parsed.state || state,
      country: parsed.country || country,
      moniker: parsed.moniker || popularPreset?.tagline || `Heritage Destination of ${country}`,
      photoUrl: resolvedPhoto || 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80',
      briefOverview: parsed.briefOverview || `${targetCity} is a vibrant cultural hub renowned for its rich history, unique monuments, and warm hospitality.`,
      quickHighlights: parsed.quickHighlights || popularPreset?.topLandmarks || ['Iconic Historic Center', 'Celebrated Temples & Shrines', 'Vibrant Local Markets'],
      famousFoods: parsed.famousFoods || popularPreset?.famousFoods || ['Traditional Street Delicacies', 'Authentic Regional Cuisine'],
      bestTimeToVisit: parsed.bestTimeToVisit || 'October to March for ideal weather.',
      climateAndGeography: parsed.climateAndGeography || 'Centrally located with rich topography and distinct cultural heritage.',
      inDepthGuide: {
        foundingAndHistory: parsed.foundingAndHistory || `${targetCity} possesses deep historical roots across centuries of regional rule, cultural confluence, and civic evolution.`,
        architecturalHeritage: parsed.architecturalHeritage || `The architecture of ${targetCity} reflects diverse periods of classical stone craftsmanship, monumental gates, and modern civic design.`,
        culinaryTrail: parsed.culinaryTrail || `The culinary identity of ${targetCity} is celebrated for its spicy gravies, breakfast delights, and historic confectioneries.`,
        topDistricts: parsed.topDistricts || [
          { name: 'Historic Core', character: 'Ancient temples, narrow bazaars, and traditional stone architecture', mustSee: 'Central Heritage Shrines & Markets' },
          { name: 'Civil & Lake District', character: 'Lush tree-lined avenues, scenic waterfronts, and cultural centers', mustSee: 'Waterfront Promenade & Gardens' }
        ],
        visitorInsiderTips: parsed.visitorInsiderTips || [
          'Best explored in early mornings for tranquil temple visits and soft photography lighting.',
          'Local auto-rickshaws and metro lines provide convenient transit between major heritage clusters.',
          'Dress respectfully when visiting sacred temples and active pilgrimage sites.',
          'Don\'t miss the evening street food lanes for the most authentic culinary experience.'
        ]
      }
    };

    setCached(cacheKey, resultData, 1800);
    res.json({ success: true, ...resultData });
  } catch (error: any) {
    console.error('Error generating city guide:', error);
    const targetCity = req.body?.city || 'Nagpur';
    const fallbackData = {
      cityName: targetCity,
      state: req.body?.state || 'Maharashtra',
      country: req.body?.country || 'India',
      moniker: 'The Orange City & Tiger Capital of India',
      photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Deeksha_Bhoomi_Nagpur.JPG/1200px-Deeksha_Bhoomi_Nagpur.JPG',
      briefOverview: `${targetCity} is the winter capital of Maharashtra and the geographic center of India (Zero Mile Stone). Famous for its rich Buddhist heritage at Deekshabhoomi, ancient Ganesh Tekdi Temple, scenic Futala Lake, and world-famous Nagpur oranges.`,
      quickHighlights: [
        'Zero Mile Stone (The precise geographic center point of India)',
        'Deekshabhoomi (The largest hollow Buddhist stupa in Asia)',
        'Shree Ganesh Mandir Tekdi (One of the oldest self-manifested shrines)',
        'Futala Lake with musical fountains and evening promenades',
        'Sitabuldi Fort and Maratha-British heritage'
      ],
      famousFoods: [
        'Nagpur Tarri Poha (Spicy chickpea gravy with crispy poha)',
        'Saoji Cuisine (Fiery authentic Vidarbha mutton and chicken curry)',
        'Haldiram\'s Sweets & Snacks (Founded here in Nagpur)',
        'Orange Barfi & Santra Burfi'
      ],
      bestTimeToVisit: 'October to March (Pleasant winter season, 12°C - 28°C)',
      climateAndGeography: 'Situated in the Deccan plateau in central India with tropical wet and dry climate.',
      inDepthGuide: {
        foundingAndHistory: 'Founded in 1702 by the Gond King Bakht Buland Shah of Deogarh and later expanded by the Bhonsle Marathas. It became a strategic British administrative center and the historic capital of the Central Provinces before joining Maharashtra.',
        architecturalHeritage: 'Showcases a captivating blend of Gond stone fortifications, Maratha wadas, British Gothic colonial structures, and the majestic Deekshabhoomi stupa engineered with Dholpur sandstone.',
        culinaryTrail: 'Head to Ramdaspeth and Shankar Nagar for traditional Tarri Poha in the mornings, taste authentic Saoji curries near Itwari and Gandhibagh, and visit the iconic Haldiram\'s original stores for sweets.',
        topDistricts: [
          { name: 'Sitabuldi & Mahal', character: 'Historic heart with bustling bazaars, forts, and century-old temples', mustSee: 'Tekdi Ganesh & Sitabuldi Fort' },
          { name: 'Laxmi Nagar & Bajaj Nagar', character: 'Spiritual hub surrounded by Deekshabhoomi and academic centers', mustSee: 'Deekshabhoomi Stupa' },
          { name: 'Civil Lines & Futala', character: 'Green, wide boulevards, heritage government mansions, and lake sunsets', mustSee: 'Futala Lake & Zero Mile' }
        ],
        visitorInsiderTips: [
          'Use the modern Nagpur Metro for rapid transit across North-South and East-West corridors.',
          'Early morning at Tekdi Ganesh offers divine aarti and fresh piping hot Tarri Poha nearby.',
          'Carry light cottons from March onwards; winters are crisp and pleasant.',
          'Sample fresh seasonal Nagpur oranges from wholesale markets near Cotton Market during winter.'
        ]
      }
    };
    res.json({ success: true, ...fallbackData });
  }
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Charaiva Tourist Guide Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
