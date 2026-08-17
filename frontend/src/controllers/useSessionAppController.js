import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { MessageType, ErrorCode } from '../protocol'
import { createGameSocket, getBackendHttpOrigin } from '../wsClient'
import { getMockStateForView } from '../mockData'
import { loadReconnectState, saveReconnectState, clearReconnectState } from '../reconnectStorage'

const RECONNECT_BASE_DELAY_MS = 500
const RECONNECT_MAX_DELAY_MS = 5000
const CLIENT_HEARTBEAT_INTERVAL_MS = 5000
const STALE_CONNECTION_MS = 12000

function inferRoleFromPath(pathname) {
  if (pathname.startsWith('/join')) {
    return 'controller'
  }
  return 'display'
}

function parseSessionFromQuery() {
  const params = new URLSearchParams(window.location.search)
  return (params.get('session') || '').toUpperCase()
}

function parsePlayerNameFromQuery() {
  const params = new URLSearchParams(window.location.search)
  return params.get('name') || ''
}

export function useSessionAppController() {
  const [mode, setMode] = useState(() => inferRoleFromPath(window.location.pathname))
  const [activeView, setActiveView] = useState('live')
  const [sessionId, setSessionId] = useState(() => parseSessionFromQuery())
  const [playerName, setPlayerName] = useState(() => parsePlayerNameFromQuery())
  const [joinUrl, setJoinUrl] = useState('')
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')
  const [connectionState, setConnectionState] = useState('disconnected')
  const [socketHandle, setSocketHandle] = useState(null)
  const [stateSync, setStateSync] = useState(null)
  const [errorText, setErrorText] = useState('')
  const [isReconnecting, setIsReconnecting] = useState(false)
  const connectionIdRef = useRef(0)
  const retryTimerRef = useRef(null)
  const retryAttemptRef = useRef(0)
  const connectionStateRef = useRef('disconnected')
  const autoResumeAttemptedRef = useRef(false)

  useEffect(() => {
    connectionStateRef.current = connectionState
  }, [connectionState])

  useEffect(() => () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
  }, [])

  const backendOrigin = useMemo(() => getBackendHttpOrigin(), [])

  const closeSocket = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    if (socketHandle) {
      socketHandle.close()
      setSocketHandle(null)
    }
    setIsReconnecting(false)
    setConnectionState('disconnected')
  }, [socketHandle])

  const disconnect = useCallback(() => {
    closeSocket()
    if (sessionId) {
      clearReconnectState(sessionId)
    }
  }, [closeSocket, sessionId])

  const createNewSession = useCallback(async () => {
    setErrorText('')
    try {
      const response = await fetch(`${backendOrigin}/api/session`, { method: 'POST' })
      if (!response.ok) {
        throw new Error(`Session creation failed (${response.status})`)
      }
      const data = await response.json()
      const newId = String(data.sessionId || '').toUpperCase()
      setSessionId(newId)
      setJoinUrl(data.joinUrl || `${window.location.origin}/join?session=${newId}`)
      setQrCodeDataUrl(data.qrCodeDataUrl || '')
      return newId
    } catch (err) {
      setErrorText(err.message || 'Failed to create session')
      return null
    }
  }, [backendOrigin])

  const connectSocket = useCallback(
    ({ targetSessionId, name = '', isTrainer = false, reconnectToken = null }) => {
      const activeSession = targetSessionId || sessionId
      if (!activeSession) {
        setErrorText('Session ID is required.')
        return
      }

      const connectionId = connectionIdRef.current + 1
      connectionIdRef.current = connectionId
      closeSocket()
      setErrorText('')
      setConnectionState('connecting')
      if (reconnectToken) {
        setIsReconnecting(true)
      }

      const playerNameText = (typeof name === 'string' ? name : String(name ?? '')).trim() || 'Player'
      let joinRejected = false
      let lastMessageAt = Date.now()
      let heartbeatTimer = null

      const stopHeartbeat = () => {
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer)
          heartbeatTimer = null
        }
      }

      const handle = createGameSocket({
        onOpen(send) {
          if (connectionIdRef.current !== connectionId) {
            return
          }
          setConnectionState('connected')
          lastMessageAt = Date.now()
          // App-level heartbeat: browsers can't see WS protocol pings, so send
          // our own PING and force-close half-dead sockets to trigger reconnect.
          heartbeatTimer = setInterval(() => {
            if (connectionIdRef.current !== connectionId) {
              stopHeartbeat()
              return
            }
            if (Date.now() - lastMessageAt > STALE_CONNECTION_MS) {
              stopHeartbeat()
              handle.close()
              return
            }
            handle.send({ type: MessageType.PING })
          }, CLIENT_HEARTBEAT_INTERVAL_MS)
          if (mode === 'display') {
            send({ type: MessageType.DISPLAY_REGISTER, sessionId: activeSession })
          } else if (reconnectToken) {
            // Reconnect: the token restores identity server-side. requestedTrainer
            // is ignored when the token is valid, but keeps trainer identity when
            // the token is stale and the server falls back to a fresh join.
            send({
              type: MessageType.CONTROLLER_JOIN,
              sessionId: activeSession,
              name: playerNameText,
              reconnectToken,
              requestedTrainer: Boolean(isTrainer),
            })
          } else {
            send({
              type: MessageType.CONTROLLER_JOIN,
              sessionId: activeSession,
              name: playerNameText,
              requestedTrainer: isTrainer,
              isTrainer,
            })
          }
        },
        onMessage(message) {
          if (connectionIdRef.current !== connectionId) {
            return
          }
          lastMessageAt = Date.now()
          if (message.type === MessageType.CLIENT_REGISTERED) {
            retryAttemptRef.current = 0
            if (message.reconnectToken) {
              saveReconnectState(activeSession, {
                playerId: message.playerId || null,
                reconnectToken: message.reconnectToken,
                name: playerNameText,
                isTrainer: Boolean(message.isTrainer),
              })
            }
            setIsReconnecting(false)
          } else if (message.type === MessageType.STATE_SYNC) {
            setStateSync(message.state || null)
          } else if (message.type === MessageType.JOIN_ERROR) {
            const code = message.code || ''
            const isReconnectError = (
              code === ErrorCode.INVALID_RECONNECT_TOKEN ||
              code === ErrorCode.RECONNECT_REPLACED ||
              code === ErrorCode.RECONNECT_SLOT_UNAVAILABLE
            )
            if (isReconnectError) {
              clearReconnectState(activeSession)
            }
            setErrorText(`${message.message || 'Error joining session.'} (${code})`)
            setConnectionState('disconnected')
            if (code === ErrorCode.SESSION_UNAVAILABLE) {
              // Transient: the display may be reconnecting too. The server leaves
              // the socket open after this error, so force-close it and let the
              // stored-token backoff in onClose keep retrying.
              handle.close()
              return
            }
            // Terminal join errors: don't loop retries.
            joinRejected = true
            setIsReconnecting(false)
          }
        },
        onClose() {
          stopHeartbeat()
          if (connectionIdRef.current !== connectionId) {
            return
          }
          setConnectionState('disconnected')

          if (mode !== 'controller') {
            return
          }
          if (joinRejected) {
            // The server explicitly rejected this join; don't loop retries.
            setIsReconnecting(false)
            return
          }

          // Attempt silent reconnect using stored token, with backoff.
          const stored = loadReconnectState(activeSession)
          if (stored && stored.reconnectToken) {
            const attempt = retryAttemptRef.current
            retryAttemptRef.current = attempt + 1
            const delay = Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_BASE_DELAY_MS * 2 ** attempt)
            setIsReconnecting(true)
            setErrorText('')
            retryTimerRef.current = setTimeout(() => {
              retryTimerRef.current = null
              connectSocket({
                targetSessionId: activeSession,
                name: stored.name || 'Player',
                isTrainer: Boolean(stored.isTrainer),
                reconnectToken: stored.reconnectToken,
              })
            }, delay)
          } else {
            setIsReconnecting(false)
          }
        },
        onError() {
          if (connectionIdRef.current !== connectionId) {
            return
          }
          setConnectionState('disconnected')
          setErrorText('WebSocket connection error.')
        },
      })

      setSocketHandle(handle)
    },
    [sessionId, mode, closeSocket]
  )

  const send = useCallback(
    (payload) => {
      if (socketHandle) {
        socketHandle.send(payload)
      } else {
        setErrorText('Socket not connected.')
      }
    },
    [socketHandle]
  )

  useEffect(() => {
    if (activeView !== 'live') return

    if (mode === 'display' && !sessionId && connectionState === 'disconnected') {
      createNewSession().then((newId) => {
        if (newId) {
          connectSocket({ targetSessionId: newId })
        }
      })
    } else if (mode === 'display' && sessionId && connectionState === 'disconnected') {
      connectSocket({ targetSessionId: sessionId })
    }
  }, [activeView, mode, sessionId, connectionState, createNewSession, connectSocket])

  // Silent auto-resume: same tab, session in URL, stored reconnect token → skip the join form.
  useEffect(() => {
    if (autoResumeAttemptedRef.current) return
    if (mode !== 'controller' || activeView !== 'live' || !sessionId) return
    autoResumeAttemptedRef.current = true
    const stored = loadReconnectState(sessionId)
    if (stored && stored.reconnectToken) {
      setPlayerName(stored.name || '')
      connectSocket({
        targetSessionId: sessionId,
        name: stored.name || 'Player',
        isTrainer: Boolean(stored.isTrainer),
        reconnectToken: stored.reconnectToken,
      })
    }
  }, [mode, activeView, sessionId, connectSocket])

  // Reconnect immediately when the network returns or the tab becomes visible again.
  useEffect(() => {
    if (mode !== 'controller' || !sessionId) return undefined

    const attemptResume = () => {
      if (document.visibilityState === 'hidden') return
      if (connectionStateRef.current !== 'disconnected') return
      const stored = loadReconnectState(sessionId)
      if (stored && stored.reconnectToken) {
        retryAttemptRef.current = 0
        connectSocket({
          targetSessionId: sessionId,
          name: stored.name || 'Player',
          isTrainer: Boolean(stored.isTrainer),
          reconnectToken: stored.reconnectToken,
        })
      }
    }

    window.addEventListener('online', attemptResume)
    document.addEventListener('visibilitychange', attemptResume)
    return () => {
      window.removeEventListener('online', attemptResume)
      document.removeEventListener('visibilitychange', attemptResume)
    }
  }, [mode, sessionId, connectSocket])

  const handleControllerJoin = useCallback(({ sessionId: joinSession, name, requestedTrainer }) => {
    setSessionId(joinSession)
    setPlayerName(name)
    retryAttemptRef.current = 0
    // Reuse a stored identity for this session so a form rejoin never forks a
    // duplicate player. Explicit trainer requests always join fresh, and a
    // stored trainer identity is honored even if the checkbox is left blank.
    const stored = requestedTrainer ? null : loadReconnectState(joinSession)
    connectSocket({
      targetSessionId: joinSession,
      name,
      isTrainer: requestedTrainer || Boolean(stored && stored.isTrainer),
      reconnectToken: stored && stored.reconnectToken ? stored.reconnectToken : null,
    })
  }, [connectSocket])

  const mockViewState = useMemo(() => {
    if (activeView === 'live') {
      return null
    }
    return getMockStateForView(activeView)
  }, [activeView])

  return {
    mode,
    setMode,
    activeView,
    setActiveView,
    sessionId,
    setSessionId,
    playerName,
    setPlayerName,
    joinUrl,
    setJoinUrl,
    qrCodeDataUrl,
    setQrCodeDataUrl,
    connectionState,
    setConnectionState,
    stateSync,
    setStateSync,
    errorText,
    setErrorText,
    backendOrigin,
    createNewSession,
    connectSocket,
    disconnect,
    send,
    handleControllerJoin,
    mockViewState,
    isReconnecting,
  }
}
