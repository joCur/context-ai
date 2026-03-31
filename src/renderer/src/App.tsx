import { PromptWindow } from './components/PromptWindow'

function App(): React.JSX.Element {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      paddingTop: 80,
      minHeight: '100vh',
    }}>
      <PromptWindow />
    </div>
  )
}

export default App
