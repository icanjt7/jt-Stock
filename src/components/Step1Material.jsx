import { useState } from 'react'
import { generateMaterials } from '../services/hfService'

const CATEGORIES = ['음식', '여행', '패션', 'K-뷰티', '자연', '라이프스타일']

export default function Step1Material({ token, onSelect }) {
  const [category, setCategory] = useState('음식')
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [customInput, setCustomInput] = useState('')

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

  const handleCustomSubmit = () => {
    const text = customInput.trim()
    if (text) onSelect(text)
  }

  return (
    <div className="step-panel">
      <h2>소재 선택</h2>
      <p className="step-desc">AI가 소재를 추천하거나, 직접 원하는 소재를 입력하세요</p>

      {/* 직접 입력 */}
      <div className="section-label">직접 입력</div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="예: 한강공원에서 피크닉 즐기는 여성, 강남 카페 디저트 먹방..."
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
          style={{ flex: 1 }}
        />
        <button
          className="btn-success"
          onClick={handleCustomSubmit}
          disabled={!customInput.trim()}
          style={{ flexShrink: 0, minWidth: '80px' }}
        >
          사용 →
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
        <span style={{ fontSize: '0.8rem', color: 'var(--text2)', flexShrink: 0 }}>또는 AI 자동 생성</span>
        <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
      </div>

      {/* AI 자동 생성 */}
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

      {error && (
        <div className="error-msg" style={{ marginTop: '0.75rem' }}>
          {error}
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.8 }}>
            위의 직접 입력으로 원하는 소재를 바로 입력하실 수 있습니다.
          </div>
        </div>
      )}

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
