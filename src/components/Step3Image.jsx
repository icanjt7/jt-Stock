import { useState } from 'react'
import { generateImage, generateImageWithRef } from '../services/hfService'

export default function Step3Image({ token, prompts, material, onBack, onNext }) {
  const [imageUrl, setImageUrl] = useState('')
  const [imageBlob, setImageBlob] = useState(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [imagePrompt, setImagePrompt] = useState(prompts.image)
  const [refUrl, setRefUrl] = useState('')
  const [refPreview, setRefPreview] = useState('')

  const handleRefUrl = (url) => {
    setRefUrl(url)
    setRefPreview(url.trim())
  }

  const generate = async () => {
    setLoading(true)
    setError('')
    setProgress('')
    try {
      let result
      if (refUrl.trim()) {
        result = await generateImageWithRef(imagePrompt, refUrl.trim(), token, setProgress)
      } else {
        result = await generateImage(imagePrompt, token)
      }
      setImageUrl(result.url)
      setImageBlob(result.blob)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setProgress('')
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
      <p className="step-desc">K-연예인 스타일로 이미지를 생성합니다. 레퍼런스 이미지를 지정하면 그 스타일을 유지합니다.</p>

      {/* 레퍼런스 이미지 */}
      <div className="ref-section">
        <div className="section-label" style={{ marginBottom: '0.5rem' }}>
          레퍼런스 이미지 (선택) — 한국 연예인 이미지 URL 붙여넣기
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            type="url"
            placeholder="https://... (구글 이미지에서 복사한 URL)"
            value={refUrl}
            onChange={(e) => handleRefUrl(e.target.value)}
          />
          <button
            className="btn-secondary"
            style={{ flexShrink: 0, fontSize: '0.82rem', padding: '0.5rem 0.9rem' }}
            onClick={() => window.open('https://www.google.com/search?q=Korean+actress+beauty+face+reference&tbm=isch', '_blank')}
          >
            🔍 구글 검색
          </button>
          {refUrl && (
            <button className="btn-secondary" style={{ flexShrink: 0, fontSize: '0.82rem' }}
              onClick={() => { setRefUrl(''); setRefPreview('') }}>✕</button>
          )}
        </div>

        {refPreview && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <img
              src={refPreview}
              alt="reference"
              style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8,
                border: '2px solid var(--accent)', flexShrink: 0 }}
              onError={() => setRefPreview('')}
            />
            <div style={{ fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.6 }}>
              이 이미지의 <strong style={{ color: 'var(--accent2)' }}>한국 연예인 스타일</strong>을 참고해 생성합니다.<br />
              (FLUX Redux 모델 사용 — 레퍼런스 없을 때보다 생성이 느릴 수 있습니다)
            </div>
          </div>
        )}

        {!refUrl && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text2)', marginBottom: '0.75rem', lineHeight: 1.7 }}>
            💡 <strong style={{ color: 'var(--text)' }}>URL 입력 방법:</strong> 구글 이미지 검색 →
            원하는 한국 연예인 이미지 위 우클릭 → <em>이미지 주소 복사</em> → 위 칸에 붙여넣기
          </div>
        )}
      </div>

      <hr className="divider" />

      <div className="section-label">이미지 프롬프트 (편집 가능)</div>
      <textarea rows={4} value={imagePrompt}
        onChange={(e) => setImagePrompt(e.target.value)}
        style={{ marginBottom: '0.5rem' }} />
      {prompts.image_kr && (
        <div className="prompt-kr" style={{ marginBottom: '1rem' }}>
          <span className="prompt-kr-label">한국어 설명</span>
          {prompts.image_kr}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button className="btn-primary" onClick={generate} disabled={loading} style={{ minWidth: '140px' }}>
          {loading
            ? <><span className="spinner" />{progress || '생성 중...'}</>
            : refUrl ? '🎨 레퍼런스로 생성' : '🎨 이미지 생성'}
        </button>
        {imageUrl && <button className="btn-secondary" onClick={generate} disabled={loading}>🔄 다시 생성</button>}
        {imageUrl && <button className="btn-secondary" onClick={download}>⬇ 다운로드</button>}
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="image-wrap" style={{ marginTop: '1.25rem' }}>
        {loading && (
          <div className="loading-overlay">
            <div className="big-spinner" />
            <p>{progress || '이미지 생성 중...'}</p>
          </div>
        )}
        {imageUrl
          ? <img src={imageUrl} alt="Generated" />
          : !loading && (
            <div className="image-placeholder">
              <span className="icon">🖼</span>
              이미지 생성 버튼을 눌러주세요
            </div>
          )}
      </div>

      {imageUrl && !loading && (
        <div className="success-box"><span>✓</span> 이미지 생성 완료!</div>
      )}

      <div className="row-btns">
        <button className="btn-secondary" onClick={onBack}>← 뒤로</button>
        {imageUrl && (
          <button className="btn-success" onClick={() => onNext(imageUrl, imageBlob)}>영상 제작하기 →</button>
        )}
      </div>
    </div>
  )
}
