const CHAT_URL = 'https://router.huggingface.co/featherless-ai/v1/chat/completions'
const IMAGE_URL = 'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell'

async function callChat(messages, token, maxTokens = 700) {
  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'Qwen/Qwen2.5-7B-Instruct',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = body.error?.message || body.error || ''
    if (res.status === 401) throw new Error('토큰 인증 실패 (401)\nHuggingFace 토큰이 올바른지 확인해주세요.')
    if (res.status === 402) throw new Error('크레딧 부족 (402)\nHuggingFace 계정에 무료 크레딧이 필요합니다.')
    if (res.status === 503) throw new Error('모델 로딩 중 (503)\n30초 후 다시 시도해주세요.')
    if (res.status === 429) throw new Error('요청 한도 초과 (429)\n잠시 후 다시 시도해주세요.')
    throw new Error(`API 오류 (${res.status})${msg ? ': ' + msg : ''}`)
  }

  const data = await res.json()
  return data.choices[0].message.content
}

// LLM 응답에서 JSON을 안전하게 추출
function extractJSON(text, shape) {
  // 1. 마크다운 코드블록 제거
  let s = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()

  // 2. 타입별 greedy 추출 (non-greedy ? 제거 → 전체 블록 포함)
  const pattern = shape === 'array' ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/
  const match = s.match(pattern)
  if (!match) {
    throw new Error(`JSON 구조를 찾지 못했습니다.\n모델 응답(앞 200자): ${s.substring(0, 200)}`)
  }

  // 3. JSON 문자열 값 안의 실제 줄바꿈(\n)을 공백으로 치환 후 파싱
  let jsonStr = match[0]
  try {
    return JSON.parse(jsonStr)
  } catch (_) {
    // 줄바꿈 정리 후 재시도
    jsonStr = jsonStr.replace(/(?<=":[ ]*"[^"]*)\n(?=[^"]*")/g, ' ')
    try {
      return JSON.parse(jsonStr)
    } catch (e2) {
      throw new Error(`JSON 파싱 오류: ${e2.message}\n원문(앞 300자): ${jsonStr.substring(0, 300)}`)
    }
  }
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
      content: 'You are a creative AI video content planner. Output ONLY a raw JSON array. No markdown, no explanation.',
    },
    {
      role: 'user',
      content: `5 unique short video ideas about "${category}" (${categoryDesc}). Visually compelling, 1-2 sentences each, great for social media.
Output format — exactly this, no other text:
["idea one", "idea two", "idea three", "idea four", "idea five"]`,
    },
  ], token, 400)

  return extractJSON(text, 'array')
}

export async function generatePrompts(material, style, token) {
  const text = await callChat([
    {
      role: 'system',
      content: 'You are an expert AI image prompt engineer. Output ONLY a raw JSON object. No markdown, no explanation, no newlines inside string values.',
    },
    {
      role: 'user',
      content: `Topic: "${material}", Style: ${style}
Output format — exactly this, single-line values, no other text:
{"image": "50-80 word English prompt for FLUX.1: subject, setting, lighting, mood, camera angle, quality", "video": "40-60 word English prompt for video AI: motion, camera movement, atmosphere"}`,
    },
  ], token, 600)

  return extractJSON(text, 'object')
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
    const msg = body.error?.message || body.error || ''
    if (res.status === 401) throw new Error('토큰 인증 실패 (401)\n이미지 생성 권한을 확인해주세요.')
    if (res.status === 503) throw new Error('이미지 모델 로딩 중 (503)\n30초 후 다시 시도해주세요.')
    throw new Error(`이미지 생성 오류 (${res.status})${msg ? ': ' + msg : ''}`)
  }

  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
