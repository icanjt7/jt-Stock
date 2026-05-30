import { HfInference } from '@huggingface/inference'

let hf = null

export function initHF(token) {
  hf = new HfInference(token)
}

export function getHF() {
  return hf
}

const CATEGORIES = {
  '음식': 'Korean food, cuisine, restaurant, eating',
  '여행': 'travel, landscape, tourism, adventure',
  '패션': 'fashion, style, clothing, beauty',
  'K-뷰티': 'K-beauty, skincare, makeup, cosmetics',
  '자연': 'nature, mountains, forest, ocean',
  '라이프스타일': 'lifestyle, daily life, home, wellness',
}

export async function generateMaterials(category, token) {
  const hfClient = new HfInference(token)
  const categoryDesc = CATEGORIES[category] || category

  const prompt = `You are a creative AI video content planner. Generate exactly 5 unique and engaging short video ideas related to "${category}" (${categoryDesc}).

Each idea should be:
- Visually compelling and suitable for AI image generation
- 1-2 sentences max
- Specific and vivid
- Good for social media (Instagram, TikTok, YouTube Shorts)

Return ONLY a JSON array of 5 strings. No explanation, no markdown, just the array.
Example format: ["idea1", "idea2", "idea3", "idea4", "idea5"]`

  const response = await hfClient.chatCompletion({
    model: 'mistralai/Mistral-7B-Instruct-v0.3',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 600,
    temperature: 0.8,
  })

  const text = response.choices[0].message.content.trim()
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('응답 파싱 실패')
  return JSON.parse(match[0])
}

export async function generatePrompts(material, style, token) {
  const hfClient = new HfInference(token)

  const prompt = `You are an expert AI image prompt engineer. Create professional prompts for this video concept:

Topic: "${material}"
Visual Style: ${style}

Generate TWO prompts:
1. IMAGE_PROMPT: A detailed English prompt for FLUX.1 image generation (50-80 words). Include: subject, setting, lighting, mood, camera angle, quality descriptors.
2. VIDEO_PROMPT: A detailed English prompt for AI video generation (40-60 words). Describe motion, camera movement, atmosphere.

Return ONLY valid JSON in this exact format:
{"image": "...", "video": "..."}`

  const response = await hfClient.chatCompletion({
    model: 'mistralai/Mistral-7B-Instruct-v0.3',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 500,
    temperature: 0.7,
  })

  const text = response.choices[0].message.content.trim()
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('응답 파싱 실패')
  return JSON.parse(match[0])
}

export async function generateImage(imagePrompt, token) {
  const hfClient = new HfInference(token)

  const blob = await hfClient.textToImage({
    model: 'black-forest-labs/FLUX.1-schnell',
    inputs: imagePrompt,
    parameters: {
      num_inference_steps: 4,
      width: 1024,
      height: 576,
    },
  })

  return URL.createObjectURL(blob)
}

export function getVideoSpaceUrl(videoPrompt) {
  const encoded = encodeURIComponent(videoPrompt)
  return `https://huggingface.co/spaces/Wan-AI/Wan2.1-I2V-14B-720P`
}
