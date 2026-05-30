const CHAT_URL = 'https://router.huggingface.co/featherless-ai/v1/chat/completions'
const IMAGE_URL = 'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell'

// K-연예인 스타일을 FLUX에서 잘 인식하는 핵심 키워드
const K_BEAUTY_BASE = 'Korean actress, K-drama lead, glass skin, luminous flawless complexion, V-line jawline, doe eyes with aegyo-sal, straight natural brows, gradient lip, small face, idol-level beauty, gorgeous Korean celebrity'

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

function extractJSON(text, shape) {
  let s = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
  const pattern = shape === 'array' ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/
  const match = s.match(pattern)
  if (!match) throw new Error(`JSON 구조를 찾지 못했습니다.\n모델 응답: ${s.substring(0, 200)}`)
  let jsonStr = match[0]
  try {
    return JSON.parse(jsonStr)
  } catch (_) {
    jsonStr = jsonStr.replace(/(?<=":[ ]*"[^"]*)\n(?=[^"]*")/g, ' ')
    try {
      return JSON.parse(jsonStr)
    } catch (e2) {
      throw new Error(`JSON 파싱 오류: ${e2.message}\n원문: ${jsonStr.substring(0, 300)}`)
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

// 반환 형태: [{en: "...", kr: "..."}, ...]
export async function generateMaterials(category, token) {
  const categoryDesc = CATEGORIES[category] || category
  const text = await callChat([
    {
      role: 'system',
      content: 'You are a creative Korean AI video content planner. Output ONLY a raw JSON array of objects. No markdown, no explanation.',
    },
    {
      role: 'user',
      content: `5 unique Korean-style short video ideas about "${category}" (${categoryDesc}).
- Must feature beautiful Korean actress-level woman in authentic Korean settings
- Each idea needs both English (for AI generation) and Korean (for display)
- English: 1-2 sentences, visual, specific
- Korean: 같은 내용을 자연스러운 한국어로 1-2문장

Output format — exactly this, no other text:
[{"en":"English idea one","kr":"한국어 설명 1"},{"en":"English idea two","kr":"한국어 설명 2"},{"en":"English idea three","kr":"한국어 설명 3"},{"en":"English idea four","kr":"한국어 설명 4"},{"en":"English idea five","kr":"한국어 설명 5"}]`,
    },
  ], token, 600)

  const parsed = extractJSON(text, 'array')
  // 구형 string 배열도 허용 (하위 호환)
  return parsed.map(item =>
    typeof item === 'string' ? { en: item, kr: item } : item
  )
}

export async function generatePrompts(material, style, token) {
  const styleMap = {
    '사실적 (Photorealistic)': 'ultra-realistic photography, Canon 5D, 85mm, natural lighting, photorealistic, editorial',
    '영화적 (Cinematic)': 'cinematic film still, anamorphic lens, dramatic lighting, movie color grading, Netflix drama',
    '미니멀 (Minimal)': 'minimalist composition, clean background, soft diffused light, simple elegant, fashion magazine',
    '감성적 (Aesthetic)': 'dreamy aesthetic, soft pastel tones, golden hour, emotional, VSCO aesthetic',
  }
  const styleKw = styleMap[style] || 'high quality, detailed'

  const text = await callChat([
    {
      role: 'system',
      content: 'You are an expert AI image prompt engineer specializing in Korean celebrity content. Output ONLY a raw JSON object with exactly 4 keys. No markdown, no line breaks inside string values.',
    },
    {
      role: 'user',
      content: `Topic: "${material}", Style: ${style}

IMPORTANT: The woman must look like a beautiful Korean celebrity/actress. Include these mandatory Korean beauty descriptors: ${K_BEAUTY_BASE}

Create 4 fields (all single-line strings, no newlines):
- "image": 70-90 word English FLUX.1 prompt. MUST include "${K_BEAUTY_BASE}" plus specific scene details (setting, lighting, mood, camera). Style: ${styleKw}
- "video": 40-55 word English video prompt — Korean actress in scene, camera motion, atmosphere
- "image_kr": 2-3 sentence Korean description of the image (한국어로)
- "video_kr": 2-3 sentence Korean description of the video (한국어로)

Output ONLY the JSON, nothing else:
{"image":"...","video":"...","image_kr":"...","video_kr":"..."}`,
    },
  ], token, 900)
  return extractJSON(text, 'object')
}

export async function generateImage(imagePrompt, token) {
  // 항상 K-연예인 키워드 앞에 추가
  const finalPrompt = `${K_BEAUTY_BASE}, ${imagePrompt}`

  const res = await fetch(IMAGE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: finalPrompt,
      parameters: { num_inference_steps: 4 },
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = body.error?.message || body.error || ''
    if (res.status === 401) throw new Error('토큰 인증 실패 (401)')
    if (res.status === 503) throw new Error('이미지 모델 로딩 중 (503)\n30초 후 다시 시도해주세요.')
    throw new Error(`이미지 생성 오류 (${res.status})${msg ? ': ' + msg : ''}`)
  }

  const blob = await res.blob()
  return { url: URL.createObjectURL(blob), blob }
}

// 레퍼런스 이미지 기반 생성 — FLUX Redux via @gradio/client
export async function generateImageWithRef(imagePrompt, referenceUrl, token, onProgress) {
  const { Client } = await import('@gradio/client')

  // 레퍼런스 이미지 fetch (CORS 우회 시도)
  onProgress('레퍼런스 이미지 로딩 중...')
  let refBlob
  try {
    const r = await fetch(referenceUrl)
    refBlob = await r.blob()
  } catch {
    throw new Error('레퍼런스 이미지를 불러올 수 없습니다.\n직접 접근이 막힌 URL입니다. 이미지를 다운로드 후 다른 방법을 사용해주세요.')
  }
  const refFile = new File([refBlob], 'reference.jpg', { type: refBlob.type || 'image/jpeg' })

  // FLUX Redux: 레퍼런스 이미지 스타일을 유지하며 새 이미지 생성
  onProgress('FLUX Redux Space 연결 중...')
  const client = await Client.connect('black-forest-labs/FLUX.1-Redux-dev', { hf_token: token })

  onProgress('레퍼런스 기반 이미지 생성 중... (20-40초)')
  const result = await client.predict('/infer', {
    redux_image: refFile,
    seed: Math.floor(Math.random() * 99999),
    randomize_seed: true,
    width: 1024,
    height: 576,
    guidance_scale: 2.5,
    num_inference_steps: 28,
  })

  const out = result.data?.[0]
  const imgUrl = out?.url || out?.path || (typeof out === 'string' ? out : null)
  if (!imgUrl) throw new Error('이미지 URL을 받지 못했습니다')

  const blob = await (await fetch(imgUrl)).blob()
  return { url: URL.createObjectURL(blob), blob }
}

export async function generateVideo(imageBlob, videoPrompt, token, onProgress) {
  const { Client } = await import('@gradio/client')

  const SPACES = ['Lightricks/LTX-Video', 'Wan-AI/Wan2.1-T2V-14B-Gradio']
  let lastError = ''

  for (const spaceId of SPACES) {
    try {
      onProgress(`${spaceId.split('/')[1]} 연결 중...`)
      const client = await Client.connect(spaceId, { hf_token: token })

      onProgress('API 확인 중...')
      const apiInfo = await client.view_api()
      const named = apiInfo.named_endpoints || {}
      const endpointNames = Object.keys(named)

      let endpoint = endpointNames.find(ep =>
        named[ep]?.parameters?.some(p =>
          (p.label || p.parameter_name || '').toLowerCase().includes('prompt')
        )
      ) || endpointNames[0]

      if (!endpoint) throw new Error('엔드포인트 없음')

      onProgress('영상 생성 중... (최대 2-3분 소요)')
      const params = named[endpoint]?.parameters || []
      const kwargs = {}
      for (const p of params) {
        const label = (p.label || p.parameter_name || '').toLowerCase()
        const name = p.parameter_name
        if (!name) continue
        if (label.includes('prompt') && !label.includes('negative')) kwargs[name] = videoPrompt
        else if (label.includes('negative')) kwargs[name] = 'worst quality, blurry, jittery, distorted, watermark'
        else if (label.includes('seed')) kwargs[name] = Math.floor(Math.random() * 9999)
        else if ((label.includes('image') || label.includes('frame')) && imageBlob)
          kwargs[name] = new File([imageBlob], 'input.png', { type: 'image/png' })
      }

      const result = await client.predict(endpoint, kwargs)
      const out = result.data?.[0]
      if (out?.url) return out.url
      if (typeof out === 'string') return out
      if (out?.path) return out.path
      throw new Error('영상 URL을 받지 못했습니다')

    } catch (e) {
      lastError = e.message
      onProgress(`${spaceId.split('/')[1]} 실패 — 다음 시도 중...`)
    }
  }
  throw new Error(`영상 생성 실패: ${lastError}`)
}
