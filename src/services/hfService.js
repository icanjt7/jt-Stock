// featherless-ai: CORS 허용 확인, Qwen2.5-7B-Instruct 지원 확인
const CHAT_URL = 'https://router.huggingface.co/featherless-ai/v1/chat/completions'
const IMAGE_URL = 'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell'

async function callChat(messages, token) {
  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'Qwen/Qwen2.5-7B-Instruct',
      messages,
      max_tokens: 600,
      temperature: 0.75,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = body.error?.message || body.error || `서버 오류 (${res.status})`
    if (res.status === 401) throw new Error('토큰 인증 실패 — HuggingFace 토큰을 확인해주세요')
    if (res.status === 503) throw new Error('모델 로딩 중... 잠시 후 다시 시도해주세요')
    throw new Error(msg)
  }

  const data = await res.json()
  return data.choices[0].message.content
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
  const text = await callChat([
    {
      role: 'system',
      content: 'You are a creative AI video content planner. Respond ONLY with a valid JSON array, nothing else.',
    },
    {
      role: 'user',
      content: `Generate exactly 5 unique short video ideas about "${category}" (${categoryDesc}).
Each idea: visually compelling, 1-2 sentences, specific, great for social media.
Return ONLY: ["idea 1", "idea 2", "idea 3", "idea 4", "idea 5"]`,
    },
  ], token)

  const match = text.match(/\[[\s\S]*?\]/)
  if (!match) throw new Error('응답 파싱 실패 — 다시 시도해주세요')
  return JSON.parse(match[0])
}

export async function generatePrompts(material, style, token) {
  const text = await callChat([
    {
      role: 'system',
      content: 'You are an expert AI image prompt engineer. Respond ONLY with valid JSON, nothing else.',
    },
    {
      role: 'user',
      content: `Create prompts for: "${material}" in style: ${style}
Return ONLY: {"image": "detailed English FLUX.1 prompt 50-80 words with subject/setting/lighting/mood/camera", "video": "English video generation prompt 40-60 words with motion/camera/atmosphere"}`,
    },
  ], token)

  const match = text.match(/\{[\s\S]*?\}/)
  if (!match) throw new Error('프롬프트 파싱 실패 — 다시 시도해주세요')
  return JSON.parse(match[0])
}

export async function generateImage(imagePrompt, token) {
  const res = await fetch(IMAGE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: imagePrompt,
      parameters: { num_inference_steps: 4 },
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = body.error?.message || body.error || `이미지 생성 실패 (${res.status})`
    if (res.status === 401) throw new Error('토큰 인증 실패 — HuggingFace 토큰을 확인해주세요')
    if (res.status === 503) throw new Error('이미지 모델 로딩 중... 잠시 후 다시 시도해주세요')
    throw new Error(msg)
  }

  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
