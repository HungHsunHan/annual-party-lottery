import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { soundManager } from './utils/sound-manager'

// 初始化音效管理器
soundManager.initialize()

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
