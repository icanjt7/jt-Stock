import { useState } from 'react'
import '../App.css'

export default function TokenSetup({ onSave }) {
  const [token, setToken] = useState('')
  const [show, setShow] = useState(false)

  const handleSave = () => {
    if (token.trim().startsWith('hf_')) {
      onSave(token.trim())
    }
  }

  return (
    <div className="token-page">
      <div className="token-card">
        <div style={{ fontSize: '3rem' }}>🤗</div>
        <h2>HuggingFace 토큰 설정</h2>
        <p>
          AI 모델을 사용하려면 HuggingFace 무료 계정의 API 토큰이 필요합니다.
          토큰은 브라우저에만 저장되며 외부로 전송되지 않습니다.
        </p>

        <div className="token-input-wrap">
          <input
            type={show ? 'text' : 'password'}
            placeholder="hf_xxxxxxxxxxxxxxxx"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button className="btn-secondary" onClick={() => setShow(!show)}>
            {show ? '숨김' : '보기'}
          </button>
        </div>

        {token && !token.startsWith('hf_') && (
          <p style={{ color: 'var(--danger)', fontSize: '0.83rem', marginBottom: '0.75rem' }}>
            토큰은 hf_ 로 시작해야 합니다
          </p>
        )}

        <button
          className="btn-primary"
          style={{ width: '100%', padding: '0.75rem' }}
          onClick={handleSave}
          disabled={!token.startsWith('hf_')}
        >
          시작하기
        </button>

        <p className="token-link" style={{ marginTop: '1.25rem' }}>
          토큰이 없으신가요?{' '}
          <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer">
            HuggingFace → Settings → Tokens
          </a>
          에서 무료로 발급받으세요.
          <br />
          <span style={{ marginTop: '0.3rem', display: 'block' }}>
            발급 시 <strong style={{ color: 'var(--text)' }}>Read</strong> 권한이면 충분합니다.
          </span>
        </p>
      </div>
    </div>
  )
}
