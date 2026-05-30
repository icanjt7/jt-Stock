import { useState } from 'react'
import TokenSetup from './components/TokenSetup'
import StepIndicator from './components/StepIndicator'
import Step1Material from './components/Step1Material'
import Step2Prompt from './components/Step2Prompt'
import Step3Image from './components/Step3Image'
import Step4Video from './components/Step4Video'
import './App.css'

const STEPS = ['소재 생성', '프롬프트 작성', '이미지 생성', '영상 제작']

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('hf_token') || '')
  const [step, setStep] = useState(0)
  const [material, setMaterial] = useState('')
  const [prompts, setPrompts] = useState({ image: '', video: '' })
  const [imageUrl, setImageUrl] = useState('')
  const [imageBlob, setImageBlob] = useState(null)

  const handleToken = (t) => {
    setToken(t)
    localStorage.setItem('hf_token', t)
  }

  if (!token) {
    return <TokenSetup onSave={handleToken} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <span className="logo">🎬</span>
          <div>
            <h1>AI 영상 제작 스튜디오</h1>
            <p className="subtitle">HuggingFace AI로 소재 → 이미지 → 영상 자동 제작</p>
          </div>
          <button
            className="btn-secondary token-btn"
            onClick={() => { localStorage.removeItem('hf_token'); setToken('') }}
            title="토큰 변경"
          >
            ⚙ 설정
          </button>
        </div>
      </header>

      <main className="app-main">
        <StepIndicator steps={STEPS} current={step} />

        <div className="step-content">
          {step === 0 && (
            <Step1Material
              token={token}
              onSelect={(m) => { setMaterial(m); setStep(1) }}
            />
          )}
          {step === 1 && (
            <Step2Prompt
              token={token}
              material={material}
              onBack={() => setStep(0)}
              onNext={(p) => { setPrompts(p); setStep(2) }}
            />
          )}
          {step === 2 && (
            <Step3Image
              token={token}
              prompts={prompts}
              material={material}
              onBack={() => setStep(1)}
              onNext={(url, blob) => { setImageUrl(url); setImageBlob(blob); setStep(3) }}
            />
          )}
          {step === 3 && (
            <Step4Video
              imageUrl={imageUrl}
              imageBlob={imageBlob}
              prompts={prompts}
              material={material}
              token={token}
              onBack={() => setStep(2)}
              onRestart={() => {
                setStep(0)
                setMaterial('')
                setPrompts({ image: '', video: '' })
                setImageUrl('')
                setImageBlob(null)
              }}
            />
          )}
        </div>
      </main>
    </div>
  )
}
