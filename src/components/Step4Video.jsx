import { useState } from 'react'
import { generateVideo } from '../services/hfService'

export default function Step4Video({ imageUrl, imageBlob, prompts, material, token, onBack, onRestart }) {
  const [videoPrompt, setVideoPrompt] = useState(prompts.video)
  const [videoUrl, setVideoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    setLoading(true)
    setError('')
    setVideoUrl('')
    try {
      const url = await generateVideo(imageBlob, videoPrompt, token, setProgress)
      setVideoUrl(url)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(videoPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadVideo = () => {
    const a = document.createElement('a')
    a.href = videoUrl
    a.download = `ai-video-${Date.now()}.mp4`
    a.click()
  }

  const downloadImage = () => {
    const a = document.createElement('a')
    a.href = imageUrl
    a.download = `ai-image-${Date.now()}.png`
    a.click()
  }

  return (
    <div className="step-panel">
      <h2>영상 제작</h2>
      <p className="step-desc">생성된 이미지 기반으로 AI 영상을 제작합니다</p>

      <div className="section-label">생성된 이미지</div>
      <div className="image-wrap" style={{ marginBottom: '1.25rem', maxHeight: '300px' }}>
        {imageUrl && <img src={imageUrl} alt="Generated" style={{ maxHeight: '300px' }} />}
      </div>

      <hr className="divider" />

      <div className="section-label">영상 프롬프트 (편집 가능)</div>
      <textarea rows={3} value={videoPrompt}
        onChange={(e) => setVideoPrompt(e.target.value)}
        style={{ marginBottom: '0.5rem' }} />
      {prompts.video_kr && (
        <div className="prompt-kr" style={{ marginBottom: '1rem' }}>
          <span className="prompt-kr-label">한국어 설명</span>
          {prompts.video_kr}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <button className="btn-primary" onClick={generate} disabled={loading} style={{ minWidth: '140px' }}>
          {loading ? <><span className="spinner" />{progress || '생성 중...'}</> : '🎬 영상 생성'}
        </button>
        {videoUrl && <button className="btn-secondary" onClick={generate} disabled={loading}>🔄 다시 생성</button>}
        <button className="btn-secondary" onClick={copyPrompt}>{copied ? '✓ 복사됨' : '📋 프롬프트 복사'}</button>
        <button className="btn-secondary" onClick={downloadImage}>⬇ 이미지 저장</button>
      </div>

      {error && (
        <div className="error-msg" style={{ marginBottom: '1rem' }}>
          {error}
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,92,124,0.2)', fontSize: '0.82rem' }}>
            직접 생성하려면 아래 Space를 이용하세요:
          </div>
        </div>
      )}

      {/* 생성된 영상 플레이어 */}
      {videoUrl && (
        <div style={{ marginBottom: '1rem' }}>
          <div className="success-box"><span>✓</span> 영상 생성 완료!</div>
          <div className="video-wrap">
            <video controls autoPlay loop src={videoUrl}
              style={{ width: '100%', maxHeight: '400px', background: '#000' }} />
          </div>
          <button className="btn-success" onClick={downloadVideo} style={{ marginTop: '0.75rem' }}>
            ⬇ 영상 다운로드
          </button>
        </div>
      )}

      {/* 로딩 중 진행 상태 */}
      {loading && (
        <div style={{
          background: 'rgba(124,92,252,0.08)', border: '1px solid rgba(124,92,252,0.25)',
          borderRadius: 'var(--radius)', padding: '1rem 1.25rem', marginBottom: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent)' }}>
            <div className="spinner" style={{ borderTopColor: 'var(--accent)', borderColor: 'rgba(124,92,252,0.3)' }} />
            <span style={{ fontSize: '0.9rem' }}>{progress || 'Space 연결 중...'}</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text2)', marginTop: '0.5rem' }}>
            HuggingFace Space에서 영상을 생성합니다. 대기열 상황에 따라 1-5분 소요될 수 있습니다.
          </p>
        </div>
      )}

      <hr className="divider" />

      {/* 직접 생성 대안 */}
      <div className="hf-space-box">
        <h4>직접 HuggingFace Space에서 생성하기 (대안)</h4>
        <p>아래 Space를 열고 이미지를 업로드한 뒤 프롬프트를 붙여넣어 무료로 영상을 만드세요.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.75rem' }}>
          {[
            { name: 'LTX-Video', url: 'https://huggingface.co/spaces/Lightricks/LTX-Video', badge: '추천' },
            { name: 'Wan2.1 T2V', url: 'https://huggingface.co/spaces/Wan-AI/Wan2.1-T2V-14B-Gradio', badge: '고품질' },
            { name: 'Wan2.1 I2V', url: 'https://huggingface.co/spaces/Wan-AI/Wan2.1-I2V-14B-720P-Gradio', badge: '이미지→영상' },
          ].map((s) => (
            <div key={s.name} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '0.75rem 1rem',
            }}>
              <span style={{ flex: 1, fontSize: '0.9rem' }}>{s.name} <span className="tag">{s.badge}</span></span>
              <button className="btn-secondary" style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
                onClick={() => window.open(s.url, '_blank')}>열기 →</button>
            </div>
          ))}
        </div>
      </div>

      <div className="row-btns" style={{ marginTop: '1rem' }}>
        <button className="btn-secondary" onClick={onBack}>← 뒤로</button>
        <button className="btn-secondary" onClick={onRestart}
          style={{ marginLeft: 'auto', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
          🔄 처음부터 다시
        </button>
      </div>
    </div>
  )
}
