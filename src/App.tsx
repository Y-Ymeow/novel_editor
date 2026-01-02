import { Routes, Route } from 'react-router-dom'
import NovelSelect from './pages/NovelSelect'
import Editor from './pages/Editor'
import Resources from './pages/Resources'
import Settings from './pages/Settings'

function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <Routes>
        <Route path="/" element={<NovelSelect />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </div>
  )
}

export default App