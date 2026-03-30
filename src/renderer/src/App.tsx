import { PermissionBanner } from './components/PermissionBanner'

function App(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col">
      <PermissionBanner />
      <div className="flex flex-1 items-center justify-center">
        <h1 className="text-2xl font-bold text-foreground">Context AI</h1>
      </div>
    </div>
  )
}

export default App
