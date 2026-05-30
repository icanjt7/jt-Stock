export default function StepIndicator({ steps, current }) {
  return (
    <div className="step-indicator">
      {steps.map((label, i) => (
        <div key={i} className={`step-item ${i === current ? 'active' : i < current ? 'done' : ''}`}>
          {i > 0 && <div className={`step-line ${i <= current ? 'done' : ''}`} />}
          <div className="step-node">
            <div className="step-circle">
              {i < current ? '✓' : i + 1}
            </div>
            <div className="step-label">{label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
