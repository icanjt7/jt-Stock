import { useState } from 'react'
import { generateMaterials } from '../services/hfService'

const CATEGORIES = ['음식', '여행', '패션', 'K-뷰티', '자연', '라이프스타일']

export default function Step1Material({ token, onSelect }) {
  const [category, setCategory] = useState('음식')
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generate = async () => {
    setLoading(true)
    setError('')
    setMaterials([])
    try {
      const result = await generateMaterials(category, token)
      setMaterials(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="step-panel">
      <h2>소재 자동 생성</h2>
      <p className="step-desc">카테고리를 선택하고 AI가 추천하는 영상 소재 5개를 생성합니다</p>

      <div className="section-label">카테고리 선택</div>
      <div className="chip-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`chip ${category === c ? 'selected' : ''}`}
            onClick={() => { setCategory(c); setMaterials([]) }}
          >
            {c}
          </button>
        ))}
      </div>

      <button className="btn-primary" onClick={generate} disabled={loading} style={{ minWidth: '140px' }}>
        {loading ? <><span className="spinner" />생성 중...</> : '✨ 소재 자동 생성'}
      </button>

      {error && <div className="error-msg">{error}</div>}

      {materials.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <div className="section-label">소재 선택 — 원하는 소재를 클릭하세요</div>
          <div className="material-grid">
            {materials.map((m, i) => (
              <div key={i} className="material-card" onClick={() => onSelect(m.en)}>
                <div className="material-num">{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div className="material-text">{m.kr}</div>
                  <div className="material-en">{m.en}</div>
                </div>
                <div style={{ marginLeft: '0.5rem', color: 'var(--accent)', fontSize: '1.1rem', flexShrink: 0 }}>›</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
