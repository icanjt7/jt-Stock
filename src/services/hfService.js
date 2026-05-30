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

export async function generateMaterials(category, token) {
  const categoryDesc = CATEGORIES[category] || category
  const text = await callChat([
    {
      role: 'system',
      content: 'You are a creative Korean AI video content planner. Output ONLY a raw JSON array. No markdown, no explanation.',
    },
    {
      role: 'user',
      content: `5 unique Korean-style short video ideas about "${category}" (${categoryDesc}).
- Must feature Korean elements (Korean woman, Korean setting, Korean culture/aesthetics)
- Visually compelling, 1-2 sentences each, great for Instagram/TikTok/YouTube Shorts
Output format — exactly this, no other text:
["Korean idea one", "Korean idea two", "Korean idea three", "Korean idea four", "Korean idea five"]`,
    },
  ], token, 400)
  return extractJSON(text, 'array')
}

export async function generatePrompts(material, style, token) {
  const styleMap = {
    '사실적 (Photorealistic)': 'ultra-realistic photography, Canon 5D, 85mm, natural lighting, photorealistic',
    '영화적 (Cinematic)': 'cinematic film still, anamorphic lens, dramatic lighting, movie color grading',
    '미니멀 (Minimal)': 'minimalist composition, clean background, soft diffused light, simple elegant',
    '감성적 (Aesthetic)': 'dreamy aesthetic, soft pastel tones, golden hour, emotional artistic',
  }
  const styleKw = styleMap[style] || 'high quality, detailed'

  const text = await callChat([
    {
      role: 'system',
      content: 'You are an expert AI image prompt engineer specializing in Korean content. Output ONLY a raw JSON object with exactly 4 keys. No markdown, no line breaks inside string values.',
    },
    {
      role: 'user',
      content: `Topic: "${material}", Style: ${style}

Create 4 fields (all single-line strings, no newlines inside):
- "image": 60-80 word English FLUX.1 prompt — Korean elements required (Korean woman/setting/culture), include: ${styleKw}
- "video": 40-55 word English video generation prompt — Korean atmosphere, motion, camera movement
- "image_kr": 2-3 sentence Korean description of what the image will look like (한국어로)
- "video_kr": 2-3 sentence Korean description of the video content and feel (한국어로)

Output ONLY the JSON object, nothing else:
{"image":"...","video":"...","image_kr":"...","video_kr":"..."}`,
    },
  ], token, 800)
  return extractJSON(text, 'object')
}

export async function generateImage(imagePrompt, token) {
  const finalPrompt = imagePrompt.toLowerCase().includes('korean')
    ? imagePrompt
    : 'Korean aesthetic, ' + imagePrompt

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

// @gradio/client로 LTX-Video Space 호출
export async function generateVideo(imageBlob, videoPrompt, token, onProgress) {
  const { Client } = await import('@gradio/client')

  const SPACES = [
    'Lightricks/LTX-Video',
    'Wan-AI/Wan2.1-T2V-14B-Gradio',
  ]

  let lastError = ''
  for (const spaceId of SPACES) {
    try {
      onProgress(`${spaceId.split('/')[1]} 연결 중...`)

      const client = await Client.connect(spaceId, { hf_token: token })

      onProgress('API 확인 중...')
      const apiInfo = await client.view_api()
      const named = apiInfo.named_endpoints || {}
      const endpointNames = Object.keys(named)

      // 프롬프트 파라미터가 있는 첫 번째 엔드포인트 선택
      let endpoint = endpointNames.find(ep =>
        named[ep]?.parameters?.some(p =>
          (p.label || p.parameter_name || '').toLowerCase().includes('prompt')
        )
      ) || endpointNames[0]

      if (!endpoint) throw new Error('엔드포인트 없음')

      onProgress(`영상 생성 중... (최대 2-3분 소요)`)

      // 파라미터 자동 매핑
      const params = named[endpoint]?.parameters || []
      const kwargs = {}
      for (const p of params) {
        const label = (p.label || p.parameter_name || '').toLowerCase()
        const name = p.parameter_name
        if (!name) continue
        if (label.includes('prompt') && !label.includes('negative')) {
          kwargs[name] = videoPrompt
        } else if (label.includes('negative')) {
          kwargs[name] = 'worst quality, blurry, jittery, distorted, watermark'
        } else if (label.includes('seed')) {
          kwargs[name] = Math.floor(Math.random() * 9999)
        } else if ((label.includes('image') || label.includes('frame')) && imageBlob) {
          kwargs[name] = new File([imageBlob], 'input.png', { type: 'image/png' })
        }
        // 나머지는 기본값 사용
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
