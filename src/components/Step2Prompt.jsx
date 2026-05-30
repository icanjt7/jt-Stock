import { useState } from 'react'
import { generatePrompts } from '../services/hfService'

const STYLES = ['사실적 (Photorealistic)', '영화적 (Cinematic)', '미니멀 (Minimal)', '감성적 (Aesthetic)']

export default function Step2Prompt({ token, material, onBack, onNext }) {
  const [style, setStyle] = useState(STYLES[0])
  const [prompts, setPrompts] = useState({ image: '', video: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await generatePrompts(material, style, token)
      setPrompts(result)
    } catch (e) {
      setError(`오류: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const canProceed = prompts.image.length > 10 && prompts.video.length > 10

  return (
    <div className="step-panel">
      <h2>프롬프트 생성</h2>
      <p className="step-desc">선택한 소재로 이미지·영상 생성용 프롬프트를 만듭니다</p>

      <div className="section-label">선택된 소재</div>
      <div className="selected-material">{material}</div>

      <div className="section-label">스타일 선택</div>
      <div className="chip-wrap" style={{ marginBottom: '1.25rem' }}>
        {STYLES.map((s) => (
          <button
            key={s}
            className={`chip ${style === s ? 'selected' : ''}`}
            onClick={() => setStyle(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <button
        className="btn-primary"
        onClick={generate}
        disabled={loading}
        style={{ minWidth: '160px' }}
      >
        {loading ? <><span className="spinner" />생성 중...</> : '✨ 프롬프트 생성'}
      </button>

      {error && <div className="error-msg">{error}</div>}

      {(prompts.image || prompts.video) && (
        <div style={{ marginTop: '1.5rem' }}>
          <div className="section-label" style={{ marginBottom: '1rem' }}>생성된 프롬프트 (직접 편집 가능)</div>

          <div className="prompt-box">
            <h4>이미지 프롬프트 (FLUX.1)</h4>
            <textarea
              rows={4}
              value={prompts.image}
              onChange={(e) => setPrompts({ ...prompts, image: e.target.value })}
            />
          </div>

          <div className="prompt-box">
            <h4>영상 프롬프트 (Video)</h4>
            <textarea
              rows={3}
              value={prompts.video}
              onChange={(e) => setPrompts({ ...prompts, video: e.target.value })}
            />
          </div>
        </div>
      )}

      <div className="row-btns" style={{ marginTop: '1.5rem' }}>
        <button className="btn-secondary" onClick={onBack}>← 뒤로</button>
        {canProceed && (
          <button className="btn-success" onClick={() => onNext(prompts)}>
            이미지 생성하기 →
          </button>
        )}
      </div>
    </div>
  )
}
