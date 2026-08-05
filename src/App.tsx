import { useState, useEffect, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

// Types
interface ServerStatus {
  online: boolean
  players: { online: number; max: number }
  version: string
  motd: string[]
  ping: number | null
}

interface ModInfo {
  id: string
  name: string
  friendly_name: string
  description: string
  version: string
  filename: string
  size: number
  download_url: string
}

interface ShaderInfo {
  id: string
  name: string
  friendly_name: string
  description: string
  version: string
  filename: string
  size: number
  download_url: string
}

interface ModsDirInfo {
  path: string
  created: boolean
  is_standard: boolean
}

interface DownloadProgress {
  modId: string
  progress: number
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2500)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div className="splash-screen">
      <div className="splash-bg-orb splash-orb-1" />
      <div className="splash-bg-orb splash-orb-2" />
      <div className="splash-bg-orb splash-orb-3" />
      <div className="splash-content">
        <div className="splash-logo">⛏</div>
        <h1 className="splash-title">Forge Server</h1>
        <p className="splash-subtitle">Minecraft 1.21.1 (Fabric)</p>
      </div>
    </div>
  )
}

function Navbar({ activeTab, setActiveTab }: { activeTab: number; setActiveTab: (tab: number) => void }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="logo">⛏</span>
        <span className="title">Fabric 1.21.1</span>
      </div>
      <div className="navbar-tabs">
        <button className={`tab-btn ${activeTab === 0 ? 'active' : ''}`} onClick={() => setActiveTab(0)}>
          Início
        </button>
        <button className={`tab-btn ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>
          Mods
        </button>
        <button className={`tab-btn ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}>
          Shaders
        </button>
      </div>
    </nav>
  )
}

function StatusCard({ status, loading }: { status: ServerStatus | null; loading: boolean }) {
  return (
    <div className="glass-card status-card">
      <div className="status-header">
        <div className={`status-dot ${status?.online ? 'status-online' : 'status-offline'}`} />
        <span className="status-label">
          {status?.online ? 'Servidor Online' : 'Servidor Offline'}
        </span>
        {loading && <div style={{ width: 16, height: 16, marginLeft: 'auto' }} className="spinner" />}
      </div>
      <div style={{ borderBottom: '1px solid var(--glass-border)', marginBottom: 16 }} />
      <div className="info-grid">
        <div className="info-tile">
          <div className="info-tile-header"><span className="input-icon">👥</span> JOGADORES</div>
          <div className="info-tile-value">{status?.players.online ?? 0} / {status?.players.max ?? 20}</div>
        </div>
        <div className="info-tile">
          <div className="info-tile-header"><span className="input-icon">🎮</span> VERSÃO</div>
          <div className="info-tile-value">{status?.version ?? '1.21.1 (Fabric)'}</div>
        </div>
        <div className="info-tile">
          <div className="info-tile-header"><span className="input-icon">📡</span> PING</div>
          <div className="info-tile-value">{status?.ping != null ? `${status.ping} ms` : '—'}</div>
        </div>
        <div className="info-tile">
          <div className="info-tile-header"><span className="input-icon">📝</span> MOTD</div>
          <div className="info-tile-value" style={{ fontSize: 11 }}>{status?.motd[0] ?? 'Servidor Fabric 1.21.1 | Antarchy + JEI'}</div>
        </div>
      </div>
      <div className="ip-row">
        <span className="icon input-icon">🌐</span>
        <span className="ip-address">playing-watching.gl.joinmc.link</span>
        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => {
          navigator.clipboard.writeText('playing-watching.gl.joinmc.link')
        }}>
          Copiar
        </button>
      </div>
    </div>
  )
}

function ModsSummary({ mods, installedMods, loading }: { mods: ModInfo[]; installedMods: Set<string>; loading: boolean }) {
  if (loading) {
    return (
      <div className="glass-card mods-summary" style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 24, height: 24 }} />
        <p style={{ color: 'var(--text-secondary)' }}>Carregando mods...</p>
      </div>
    )
  }

  return (
    <div className="glass-card mods-summary">
      <div className="mods-header">
        <h2 className="section-title">Mods</h2>
        <span className="mods-count">{installedMods.size} / {mods.length} instalados</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {mods.slice(0, 4).map(mod => (
          <div key={mod.id} className="mod-row-small">
            <div className="mod-icon" style={{ width: 28, height: 28, fontSize: 14 }}>
              {mod.name.toLowerCase().includes('dynmap') ? '🗺' : '🧱'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mod-row-small name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {mod.name}
              </div>
              <div className="mod-row-small size">{formatBytes(mod.size)}</div>
            </div>
            <span className={`mod-row-small status ${installedMods.has(mod.filename) ? 'installed' : ''}`}>
              {installedMods.has(mod.filename) ? '✓ Instalado' : 'Não instalado'}
            </span>
          </div>
        ))}
        {mods.length > 4 && (
          <div style={{ textAlign: 'center', paddingTop: 8 }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>+{mods.length - 4} mods na aba Mods</span>
          </div>
        )}
      </div>
    </div>
  )
}

function ModsDirInfo({ info, onCreate }: { info: ModsDirInfo | null; onCreate: () => void }) {
  if (!info) return null

  return (
    <div className="mods-dir-info">
      <span className="icon input-icon">📁</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>Pasta de Mods</div>
        <div className="path">{info.path}</div>
      </div>
      {!info.created && (
        <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={onCreate}>
          Criar Pasta
        </button>
      )}
      {info.created && <span style={{ color: 'var(--green)', fontSize: 16 }}>✓</span>}
    </div>
  )
}

function ModCardFull({ 
  mod, 
  installed, 
  downloading, 
  progress, 
  downloadFailed,
  onInstall,
  onRetry
}: { 
  mod: ModInfo
  installed: boolean
  downloading: boolean
  progress: number
  downloadFailed: boolean
  onInstall: () => void
  onRetry: () => void
}) {
  return (
    <div className={`mod-card-full ${installed ? 'installed' : ''}`}>
      <div className="mod-icon" style={{ flexShrink: 0 }}>
        {mod.name.toLowerCase().includes('dynmap') ? '🗺' : '🧱'}
      </div>
      <div className="mod-card-info">
        <div className="mod-card-name-row">
          <span className="mod-card-name">{mod.name}</span>
          <span className="mod-card-version">v{mod.version}</span>
        </div>
        <div className="mod-card-desc">{mod.description}</div>
        <div className="mod-card-size">{formatBytes(mod.size)}</div>
      </div>
      <div className="mod-card-action">
        {installed ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, color: 'var(--green)' }}>✓</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--green)', marginTop: 6 }}>Instalado</div>
          </div>
        ) : downloading ? (
          <div style={{ textAlign: 'center', minWidth: 100 }}>
            <div className="progress-linear">
              <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{Math.round(progress * 100)}%</div>
          </div>
        ) : (
          <button 
            className="btn btn-primary" 
            onClick={onInstall}
            disabled={downloading}
            style={{ padding: '10px 16px', fontSize: 13 }}
          >
            Instalar
          </button>
        )}
        {downloadFailed && (
          <button className="btn btn-secondary" onClick={onRetry} style={{ marginTop: 8, fontSize: 11, padding: '4px 10px' }}>
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  )
}

function ModsView({ 
  mods, 
  installedMods, 
  modsDir, 
  loading, 
  downloadingMods, 
  downloadProgress,
  downloadAllProgress,
  isDownloadingAll,
  onDownloadAll,
  onInstallMod,
  onCheckDir
}: {
  mods: ModInfo[]
  installedMods: Set<string>
  modsDir: ModsDirInfo | null
  loading: boolean
  downloadingMods: Set<string>
  downloadProgress: Record<string, number>
  downloadAllProgress: number
  isDownloadingAll: boolean
  onDownloadAll: () => void
  onInstallMod: (mod: ModInfo) => void
  onCheckDir: () => void
}) {
  if (loading) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: 60 }}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>Carregando mods...</p>
      </div>
    )
  }

  if (mods.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
        <p style={{ color: 'var(--text-secondary)' }}>Nenhum mod disponível</p>
      </div>
    )
  }

  const missingMods = mods.filter((m: ModInfo) => !installedMods.has(m.filename))

  return (
    <div className="mods-view">
      <div className="mods-header-row">
        <div>
          <h2 className="section-title">Mods do Servidor</h2>
          <p className="section-subtitle">Baixe e instale os mods para jogar no servidor</p>
        </div>
        {missingMods.length > 0 && (
          <button className="btn btn-primary" onClick={onDownloadAll} disabled={isDownloadingAll} style={{ fontSize: 13 }}>
            {isDownloadingAll ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16, marginRight: 8, borderWidth: 2, borderTopColor: 'white' }} />
                Baixando...
              </>
            ) : (
              <>
                <span style={{ marginRight: 8 }}>⬇</span>
                Baixar Todos ({missingMods.length})
              </>
            )}
          </button>
        )}
      </div>

      {isDownloadingAll && (
        <div style={{ marginBottom: 16 }}>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${downloadAllProgress * 100}%` }} />
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {Math.round(downloadAllProgress * 100)}%
          </div>
        </div>
      )}

      <ModsDirInfo info={modsDir} onCreate={onCheckDir} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {mods.map(mod => {
          const installed = installedMods.has(mod.filename)
          const downloading = downloadingMods.has(mod.id)
          const progress = downloadProgress[mod.id] || 0
          return (
            <ModCardFull
              key={mod.id}
              mod={mod}
              installed={installed}
              downloading={downloading}
              progress={progress}
              downloadFailed={false}
              onInstall={() => onInstallMod(mod)}
              onRetry={() => onInstallMod(mod)}
            />
          )
        })}
      </div>
    </div>
  )
}

function HomeView({ 
  status, 
  statusLoading, 
  mods, 
  installedMods
}: {
  status: ServerStatus | null
  statusLoading: boolean
  mods: ModInfo[]
  installedMods: Set<string>
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <StatusCard status={status} loading={statusLoading} />
      <ModsSummary mods={mods} installedMods={installedMods} loading={statusLoading} />
    </div>
  )
}

function ShaderCardFull({
  shader,
  installed,
  downloading,
  progress,
  onInstall
}: {
  shader: ShaderInfo
  installed: boolean
  downloading: boolean
  progress: number
  onInstall: () => void
}) {
  const icon = shader.name === 'iris' ? '📷' : shader.name === 'complementary' ? '🌞' : '✨'
  return (
    <div className={`mod-card-full ${installed ? 'installed' : ''}`}>
      <div className="mod-icon" style={{ flexShrink: 0 }}>{icon}</div>
      <div className="mod-card-info">
        <div className="mod-card-name-row">
          <span className="mod-card-name">{shader.name}</span>
        </div>
        <div className="mod-card-desc">{shader.description}</div>
        <div className="mod-card-size">{formatBytes(shader.size)}</div>
      </div>
      <div className="mod-card-action">
        {installed ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, color: 'var(--green)' }}>✓</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--green)', marginTop: 6 }}>Instalado</div>
          </div>
        ) : downloading ? (
          <div style={{ textAlign: 'center', minWidth: 100 }}>
            <div className="progress-linear">
              <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{Math.round(progress * 100)}%</div>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={onInstall} disabled={downloading} style={{ padding: '10px 16px', fontSize: 13 }}>
            Instalar
          </button>
        )}
      </div>
    </div>
  )
}

function ShadersView({
  shaders,
  installedShaders,
  downloadingShaders,
  downloadProgress,
  onInstallShader
}: {
  shaders: ShaderInfo[]
  installedShaders: Set<string>
  downloadingShaders: Set<string>
  downloadProgress: Record<string, number>
  onInstallShader: (shader: ShaderInfo) => void
}) {
  if (shaders.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🎨</div>
        <p style={{ color: 'var(--text-secondary)' }}>Nenhum shader disponível</p>
      </div>
    )
  }

  return (
    <div className="mods-view">
      <div className="mods-header-row">
        <div>
          <h2 className="section-title">Shaders</h2>
          <p className="section-subtitle">Baixe o Iris (mod de shaders) e os shaderpacks para gráficos bonitos</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {shaders.map(shader => {
          const installed = installedShaders.has(shader.filename)
          const downloading = downloadingShaders.has(shader.id)
          const progress = downloadProgress[shader.id] || 0
          return (
            <ShaderCardFull
              key={shader.id}
              shader={shader}
              installed={installed}
              downloading={downloading}
              progress={progress}
              onInstall={() => onInstallShader(shader)}
            />
          )
        })}
      </div>
    </div>
  )
}

function App() {
  const [splashDone, setSplashDone] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [status, setStatus] = useState<ServerStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [mods, setMods] = useState<ModInfo[]>([])
  const [installedMods, setInstalledMods] = useState<Set<string>>(new Set())
  const [modsDir, setModsDir] = useState<ModsDirInfo | null>(null)
  const [downloadingMods, setDownloadingMods] = useState<Set<string>>(new Set())
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({})
  const [downloadAllProgress, setDownloadAllProgress] = useState(0)
  const [isDownloadingAll, setIsDownloadingAll] = useState(false)
  const [shaders, setShaders] = useState<ShaderInfo[]>([])
  const [installedShaders, setInstalledShaders] = useState<Set<string>>(new Set())
  const [downloadingShaders, setDownloadingShaders] = useState<Set<string>>(new Set())
  const [shaderDownloadProgress, setShaderDownloadProgress] = useState<Record<string, number>>({})

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true)
    try {
      const s = await invoke<ServerStatus>('server_status')
      setStatus(s)
    } catch {
      setStatus({ online: false, players: { online: 0, max: 20 }, version: '1.21.1 (Fabric)', motd: ['Servidor Fabric 1.21.1 | Antarchy + JEI'], ping: null })
    } finally {
      setStatusLoading(false)
    }
  }, [])

  const fetchMods = useCallback(async () => {
    try {
      const m = await invoke<ModInfo[]>('server_mods')
      setMods(m)
    } catch {
      setMods([])
    }
  }, [])

  const fetchShaders = useCallback(async () => {
    try {
      const s = await invoke<ShaderInfo[]>('server_shaders')
      setShaders(s)
    } catch {
      setShaders([])
    }
  }, [])

  const checkShaderpacksDir = useCallback(async (): Promise<string | null> => {
    try {
      const dir = await invoke<ModsDirInfo>('detect_shaderpacks_dir')
      return dir.path
    } catch {
      return null
    }
  }, [])

  const checkInstalledShaders = useCallback(async (dir: string) => {
    try {
      const local = await invoke<{ file: string }[]>('list_local_shaders', { dir })
      setInstalledShaders(new Set(local.map(m => m.file)))
    } catch {
      setInstalledShaders(new Set())
    }
  }, [])

  const installShader = useCallback(async (shader: ShaderInfo) => {
    const dir = await checkShaderpacksDir()
    if (!dir) return
    setDownloadingShaders(prev => new Set(prev).add(shader.id))
    setShaderDownloadProgress(prev => ({ ...prev, [shader.id]: 0 }))
    try {
      const bytes = await invoke<Uint8Array>('download_shader', { filename: shader.filename })
      await invoke('save_mod', { dir, filename: shader.filename, contents: Array.from(bytes) })
      setInstalledShaders(prev => new Set(prev).add(shader.filename))
      setShaderDownloadProgress(prev => ({ ...prev, [shader.id]: 1 }))
    } catch (e) {
      console.error('Shader download failed:', e)
    } finally {
      setDownloadingShaders(prev => { const n = new Set(prev); n.delete(shader.id); return n })
    }
  }, [checkShaderpacksDir])

  const checkModsDir = useCallback(async () => {
    try {
      const dir = await invoke<ModsDirInfo>('detect_mods_dir')
      setModsDir(dir)
      return dir
    } catch {
      return null
    }
  }, [])

  const checkInstalledMods = useCallback(async (dir: string) => {
    try {
      const local = await invoke<{ file: string }[]>('list_local_mods', { dir })
      setInstalledMods(new Set(local.map(m => m.file)))
    } catch {
      setInstalledMods(new Set())
    }
  }, [])

  const installMod = useCallback(async (mod: ModInfo) => {
    if (!modsDir) return
    setDownloadingMods(prev => new Set(prev).add(mod.id))
    setDownloadProgress(prev => ({ ...prev, [mod.id]: 0 }))
    try {
      const bytes = await invoke<Uint8Array>('download_mod', { filename: mod.filename })
      await invoke('save_mod', { dir: modsDir.path, filename: mod.filename, contents: Array.from(bytes) })
      setInstalledMods(prev => new Set(prev).add(mod.filename))
      setDownloadProgress(prev => ({ ...prev, [mod.id]: 1 }))
    } catch (e) {
      console.error('Download failed:', e)
    } finally {
      setDownloadingMods(prev => { const n = new Set(prev); n.delete(mod.id); return n })
    }
  }, [modsDir])

  const downloadAll = useCallback(async () => {
    if (!modsDir) return
    const missing = mods.filter(m => !installedMods.has(m.filename))
    if (missing.length === 0) return

    setIsDownloadingAll(true)
    setDownloadAllProgress(0)

    for (let i = 0; i < missing.length; i++) {
      const mod = missing[i]
      await installMod(mod)
      setDownloadAllProgress((i + 1) / missing.length)
    }

    setIsDownloadingAll(false)
    setDownloadAllProgress(1)
    await checkInstalledMods(modsDir.path)
  }, [mods, installedMods, modsDir, installMod, checkInstalledMods])

  const ensureDirAndRefresh = useCallback(async () => {
    const dir = await checkModsDir()
    if (dir) await checkInstalledMods(dir.path)
  }, [checkModsDir, checkInstalledMods])

  // Initial load
  useEffect(() => {
    const init = async () => {
      await checkModsDir()
      await Promise.all([fetchStatus(), fetchMods(), fetchShaders()])
      if (modsDir) await checkInstalledMods(modsDir.path)
      const shaderDir = await checkShaderpacksDir()
      if (shaderDir) await checkInstalledShaders(shaderDir)
      
      // Listen for download progress events
      const unlisten = await listen<DownloadProgress>('download-progress', (e) => {
        setDownloadProgress(prev => ({ ...prev, [e.payload.modId]: e.payload.progress }))
      })

      // Auto-refresh: poll the server every 15s so new mods/shaders added to
      // the server's mods/ folder appear without re-downloading the launcher.
      const poll = setInterval(async () => {
        await Promise.all([fetchStatus(), fetchMods(), fetchShaders()])
        const dirInfo = await checkModsDir()
        if (dirInfo) await checkInstalledMods(dirInfo.path)
        const shaderDir2 = await checkShaderpacksDir()
        if (shaderDir2) await checkInstalledShaders(shaderDir2)
      }, 15000)
      
      return () => {
        clearInterval(poll)
        unlisten()
      }
    }
    init()
  }, [])

  if (!splashDone) {
    return <SplashScreen onDone={() => setSplashDone(true)} />
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content" style={{ flex: 1 }}>
        {activeTab === 0 ? (
          <HomeView
            status={status}
            statusLoading={statusLoading}
            mods={mods}
            installedMods={installedMods}
          />
        ) : activeTab === 2 ? (
          <ShadersView
            shaders={shaders}
            installedShaders={installedShaders}
            downloadingShaders={downloadingShaders}
            downloadProgress={shaderDownloadProgress}
            onInstallShader={installShader}
          />
        ) : (
          <ModsView
            mods={mods}
            installedMods={installedMods}
            modsDir={modsDir}
            loading={statusLoading}
            downloadingMods={downloadingMods}
            downloadProgress={downloadProgress}
            downloadAllProgress={downloadAllProgress}
            isDownloadingAll={isDownloadingAll}
            onDownloadAll={downloadAll}
            onInstallMod={installMod}
            onCheckDir={ensureDirAndRefresh}
          />
        )}
      </main>
    </div>
  )
}

export default App