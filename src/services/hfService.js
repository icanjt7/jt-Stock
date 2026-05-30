const HF_API = 'https://api-inference.huggingface.co/models'

// 레거시 inference API - 브라우저 CORS 지원, 완전 무료
async function callTextModel(prompt, token) {
  // Zephyr-7b: non-gated, 브라우저에서 안정적으로 동작
  const res = await fetch(`${HF_API}/HuggingFaceH4/zephyr-7b-beta`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 600,
        return_full_text: false,
        temperature: 0.75,
        do_sample: true,
      },
      options: { wait_for_model: true },
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    if (body.error?.includes('loading')) throw new Error('모델 로딩 중... 30초 후 다시 시도해주세요')
    throw new Error(body.error || `서버 오류 (${res.status})`)
  }

  const data = await res.json()
  if (Array.isArray(data)) return data[0].generated_text
  throw new Error('예상치 못한 응답 형식')
}

// Zephyr chat template
function zephyrPrompt(system, user) {
  return `<|system|>\n${system}\n<|user|>\n${user}\n<|assistant|>\n`
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
  const categoryDesc = CATEGORIES[category] || category

  const system = 'You are a creative AI video content planner. You ALWAYS respond with valid JSON only.'
  const user = `Generate exactly 5 unique short video ideas about "${category}" (${categoryDesc}).
Each idea: visually compelling, 1-2 sentences, specific, good for social media.
Return ONLY a JSON array of 5 strings, no markdown, no explanation:
["idea 1", "idea 2", "idea 3", "idea 4", "idea 5"]`

  const raw = await callTextModel(zephyrPrompt(system, user), token)
  const match = raw.match(/\[[\s\S]*?\]/)
  if (!match) throw new Error('응답 파싱 실패 — 다시 시도해주세요')
  return JSON.parse(match[0])
}

export async function generatePrompts(material, style, token) {
  const system = 'You are an expert AI image prompt engineer. You ALWAYS respond with valid JSON only.'
  const user = `Create prompts for this video concept:
Topic: "${material}"
Style: ${style}

Return ONLY valid JSON (no markdown):
{"image": "detailed English prompt for FLUX.1 image generation, 50-80 words, include subject/setting/lighting/mood/camera angle/quality", "video": "English prompt for AI video generation, 40-60 words, describe motion/camera movement/atmosphere"}`

  const raw = await callTextModel(zephyrPrompt(system, user), token)
  const match = raw.match(/\{[\s\S]*?\}/)
  if (!match) throw new Error('프롬프트 파싱 실패 — 다시 시도해주세요')
  return JSON.parse(match[0])
}

export async function generateImage(imagePrompt, token) {
  const res = await fetch(`${HF_API}/black-forest-labs/FLUX.1-schnell`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: imagePrompt,
      parameters: { num_inference_steps: 4 },
      options: { wait_for_model: true },
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    if (body.error?.includes('loading')) throw new Error('이미지 모델 로딩 중... 30초 후 다시 시도해주세요')
    throw new Error(body.error || `이미지 생성 실패 (${res.status})`)
  }

  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
