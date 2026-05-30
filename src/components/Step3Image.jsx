import { useState, useRef } from 'react'
import { generateImage } from '../services/hfService'

export default function Step3Image({ token, prompts, material, onBack, onNext }) {
  const [imageUrl, setImageUrl] = useState('')
  const [imageBlob, setImageBlob] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imagePrompt, setImagePrompt] = useState(prompts.image)

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      const url = await generateImage(imagePrompt, token)
      setImageUrl(url)
      const res = await fetch(url)
      setImageBlob(await res.blob())
    } catch (e) {
      setError(`이미지 생성 오류: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const download = () => {
    const a = document.createElement('a')
    a.href = imageUrl
    a.download = `ai-image-${Date.now()}.png`
    a.click()
  }

  return (
    <div className="step-panel">
      <h2>이미지 생성</h2>
      <p className="step-desc">FLUX.1-schnell 모델로 고품질 이미지를 생성합니다</p>

      <div className="section-label">이미지 프롬프트 (편집 가능)</div>
      <textarea
        rows={4}
        value={imagePrompt}
        onChange={(e) => setImagePrompt(e.target.value)}
        style={{ marginBottom: '1rem' }}
      />

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={generate} disabled={loading} style={{ minWidth: '140px' }}>
          {loading ? <><span className="spinner" />생성 중...</> : '🎨 이미지 생성'}
        </button>
        {imageUrl && (
          <button className="btn-secondary" onClick={generate} disabled={loading}>
            🔄 다시 생성
          </button>
        )}
        {imageUrl && (
          <button className="btn-secondary" onClick={download}>
            ⬇ 다운로드
          </button>
        )}
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="image-wrap" style={{ marginTop: '1.25rem' }}>
        {loading && (
          <div className="loading-overlay">
            <div className="big-spinner" />
            <p>이미지 생성 중... (약 10-20초)</p>
          </div>
        )}
        {imageUrl ? (
          <img src={imageUrl} alt="Generated" />
        ) : (
          !loading && (
            <div className="image-placeholder">
              <span className="icon">🖼</span>
              이미지 생성 버튼을 눌러주세요
            </div>
          )
        )}
      </div>

      {imageUrl && !loading && (
        <div className="success-box">
          <span>✓</span>
          이미지 생성 완료! 마음에 드시면 영상으로 제작하세요.
        </div>
      )}

      <div className="row-btns">
        <button className="btn-secondary" onClick={onBack}>← 뒤로</button>
        {imageUrl && (
          <button className="btn-success" onClick={() => onNext(imageUrl, imageBlob)}>
            영상 제작하기 →
          </button>
        )}
      </div>
    </div>
  )
}
