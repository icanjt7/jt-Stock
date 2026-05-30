import { useState } from 'react'
import '../App.css'

export default function TokenSetup({ onSave }) {
  const [token, setToken] = useState('')
  const [show, setShow] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const handleSave = () => {
    if (token.trim().startsWith('hf_')) {
      onSave(token.trim())
    }
  }

  const testToken = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(
        'https://router.huggingface.co/featherless-ai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'Qwen/Qwen2.5-7B-Instruct',
            messages: [{ role: 'user', content: 'Reply with just: OK' }],
            max_tokens: 5,
          }),
        }
      )
      if (res.ok) {
        setTestResult({ ok: true, msg: '연결 성공! 토큰이 정상 작동합니다.' })
      } else {
        const body = await res.json().catch(() => ({}))
        const err = body.error?.message || body.error || `HTTP ${res.status}`
        if (res.status === 401) {
          setTestResult({ ok: false, msg: `인증 실패 (401): 토큰이 올바른지 확인해주세요. HF 계정의 Settings → Tokens에서 새 토큰을 발급받으세요.` })
        } else if (res.status === 402) {
          setTestResult({ ok: false, msg: `크레딧 부족 (402): HuggingFace 계정에 무료 크레딧이 필요합니다.` })
        } else {
          setTestResult({ ok: false, msg: `오류 (${res.status}): ${err}` })
        }
      }
    } catch (e) {
      setTestResult({ ok: false, msg: `네트워크 오류: ${e.message}` })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="token-page">
      <div className="token-card">
        <div style={{ fontSize: '3rem' }}>🤗</div>
        <h2>HuggingFace 토큰 설정</h2>
        <p>AI 모델 사용을 위해 HuggingFace 무료 계정의 토큰이 필요합니다.</p>

        <div className="token-input-wrap">
          <input
            type={show ? 'text' : 'password'}
            placeholder="hf_xxxxxxxxxxxxxxxx"
            value={token}
            onChange={(e) => { setToken(e.target.value); setTestResult(null) }}
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

        {testResult && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius)',
            fontSize: '0.85rem',
            marginBottom: '0.75rem',
            background: testResult.ok ? 'rgba(76,223,138,0.1)' : 'rgba(255,92,124,0.1)',
            border: `1px solid ${testResult.ok ? 'rgba(76,223,138,0.3)' : 'rgba(255,92,124,0.3)'}`,
            color: testResult.ok ? 'var(--success)' : 'var(--danger)',
            textAlign: 'left',
          }}>
            {testResult.msg}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {token.startsWith('hf_') && (
            <button
              className="btn-secondary"
              style={{ flex: 1 }}
              onClick={testToken}
              disabled={testing}
            >
              {testing ? <><span className="spinner" />테스트 중...</> : '연결 테스트'}
            </button>
          )}
          <button
            className="btn-primary"
            style={{ flex: 2, padding: '0.75rem' }}
            onClick={handleSave}
            disabled={!token.startsWith('hf_')}
          >
            시작하기
          </button>
        </div>

        <div style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '1rem',
          textAlign: 'left',
          fontSize: '0.82rem',
          color: 'var(--text2)',
          lineHeight: 2,
        }}>
          <strong style={{ color: 'var(--accent2)' }}>토큰 발급 방법</strong><br />
          1. <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>huggingface.co/settings/tokens</a> 접속<br />
          2. <strong style={{ color: 'var(--text)' }}>Create new token</strong> 클릭<br />
          3. Token type: <strong style={{ color: 'var(--text)' }}>Read</strong> 선택<br />
          4. 발급된 <strong style={{ color: 'var(--text)' }}>hf_xxx...</strong> 토큰 복사 후 붙여넣기
        </div>
      </div>
    </div>
  )
}
