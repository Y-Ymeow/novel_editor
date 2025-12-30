import { Routes, Route } from 'react-router-dom'
import NovelSelect from './pages/NovelSelect'
import Editor from './pages/Editor'
import Characters from './pages/Characters'
import Settings from './pages/Settings'

function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <Routes>
        <Route path="/" element={<NovelSelect />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/characters" element={<Characters />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </div>
  )
}

export default App