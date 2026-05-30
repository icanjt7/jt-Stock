import { useState } from 'react'

const VIDEO_SPACES = [
  {
    name: 'Wan2.1 (최고 품질)',
    url: 'https://huggingface.co/spaces/Wan-AI/Wan2.1-I2V-14B-720P',
    desc: '이미지 → 720p 고품질 영상 (무료)',
    badge: '추천',
  },
  {
    name: 'LTX-Video',
    url: 'https://huggingface.co/spaces/Lightricks/LTX-Video',
    desc: '빠른 이미지 → 영상 변환 (무료)',
    badge: '빠름',
  },
  {
    name: 'CogVideoX',
    url: 'https://huggingface.co/spaces/THUDM/CogVideoX-5B',
    desc: '텍스트 → 영상 생성 (무료)',
    badge: '텍스트',
  },
]

export default function Step4Video({ imageUrl, imageBlob, prompts, material, token, onBack, onRestart }) {
  const [videoPrompt, setVideoPrompt] = useState(prompts.video)
  const [copied, setCopied] = useState(false)
  const [copiedImg, setCopiedImg] = useState(false)

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(videoPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadImage = () => {
    const a = document.createElement('a')
    a.href = imageUrl
    a.download = `ai-image-for-video-${Date.now()}.png`
    a.click()
  }

  const openSpace = (url) => {
    window.open(url, '_blank')
  }

  return (
    <div className="step-panel">
      <h2>영상 제작</h2>
      <p className="step-desc">생성된 이미지와 프롬프트로 HuggingFace Spaces에서 무료로 영상을 만듭니다</p>

      <div className="section-label">생성된 이미지</div>
      <div className="image-wrap" style={{ marginBottom: '1rem' }}>
        {imageUrl && <img src={imageUrl} alt="Generated" />}
      </div>

      <hr className="divider" />

      <div className="section-label">영상 프롬프트 (편집 가능)</div>
      <textarea
        rows={3}
        value={videoPrompt}
        onChange={(e) => setVideoPrompt(e.target.value)}
        style={{ marginBottom: '0.75rem' }}
      />

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <button className="btn-secondary" onClick={copyPrompt} style={{ fontSize: '0.85rem' }}>
          {copied ? '✓ 복사됨!' : '📋 프롬프트 복사'}
        </button>
        <button className="btn-secondary" onClick={downloadImage} style={{ fontSize: '0.85rem' }}>
          ⬇ 이미지 다운로드
        </button>
      </div>

      <div className="hf-space-box">
        <h4>HuggingFace Spaces에서 영상 생성하기</h4>
        <p>아래 Space를 열고, 이미지를 업로드한 뒤 프롬프트를 붙여넣어 무료로 영상을 생성하세요.</p>
        <ol>
          <li>이미지 다운로드 → Space에 업로드</li>
          <li>프롬프트 복사 → 입력창에 붙여넣기</li>
          <li>Generate 클릭 → 영상 다운로드</li>
        </ol>
      </div>

      <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {VIDEO_SPACES.map((space) => (
          <div
            key={space.name}
            style={{
              background: 'var(--surface2)',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{space.name}</span>
                <span className="tag">{space.badge}</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text2)' }}>{space.desc}</div>
            </div>
            <button
              className="btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', flexShrink: 0 }}
              onClick={() => openSpace(space.url)}
            >
              열기 →
            </button>
          </div>
        ))}
      </div>

      <hr className="divider" />

      <div className="row-btns">
        <button className="btn-secondary" onClick={onBack}>← 뒤로</button>
        <button
          className="btn-secondary"
          onClick={onRestart}
          style={{ marginLeft: 'auto', borderColor: 'var(--accent)', color: 'var(--accent)' }}
        >
          🔄 처음부터 다시
        </button>
      </div>
    </div>
  )
}
