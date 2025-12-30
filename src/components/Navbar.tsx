interface NavbarProps {
  currentPath: string
  onNavigate: (path: string) => void
}

export default function Navbar({ currentPath, onNavigate }: NavbarProps) {
  const navItems = [
    { path: '/novels', label: '小说管理', icon: '📚' },
    { path: '/', label: '编辑器', icon: '✍️' },
    { path: '/characters', label: '人物卡片', icon: '👤' },
    { path: '/chapters', label: '章节管理', icon: '📝' },
    { path: '/settings', label: '设置', icon: '⚙️' },
  ]

  return (
    <nav className="bg-slate-800 shadow-md">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <a 
            className="text-xl font-bold text-white hover:text-slate-200 cursor-pointer" 
            onClick={() => onNavigate('/')}
          >
            📖 AI 小说生成器
          </a>
          
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPath === item.path
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                onClick={() => onNavigate(item.path)}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}