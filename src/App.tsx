import React, {useEffect, useState, useCallback, useReducer, Reducer} from 'react'
import {Spinner} from 'reactstrap'
import {Home} from './components/Home'
import {log} from './helpers'
import api from './lib/api'
import BitcoinStudioLogo from './assets/bitcoin-studio-black-border.svg'

// TODO: Find proper type for context of reducer
// Known bug on Partial. Values and functions from ModalContext get in addition to their type the type undefined
// https://stackoverflow.com/questions/54489817/typescript-partialt-type-without-undefined
//type ModalContext = Reducer<ModalState, ReducerAction<any>>
//type ModalContext = Partial<Reducer<ModalState, ReducerAction<any>>>
type ModalContext = any
export const ModalContext = React.createContext<ModalContext>({})

export const App: React.FC = () => {

  let uiContent
  const [error, setError] = useState<App['error']>('')
  // Server state
  const [isWsConnected, setIsWsConnected] = useState<App['isWsConnected']>(false)
  const [wsClientId, setWsClientId] = useState<App['wsClientId']>('')
  const [nodeInfo, setNodeInfo] = useState<App['nodeInfo']>(null)

  /**
   * Manage Modal Screens
   */
  const modalInitialState = {
    isModalOpen: false,
    errorModal: false,
    invoiceSettled: false,
    nodeInfoModal: false,
    paymentModal: false,
  }

  const modalReducer = useCallback((state: ModalState, action: string) => {
    log("prevState: ", state)
    log("action: ", action)
    switch (action) {
      case 'OPEN_ERROR_MODAL':
        return {
          isModalOpen: true,
          errorModal: true,
          invoiceSettled: false,
          nodeInfoModal: false,
          paymentModal: false,
        }
      case 'OPEN_NODE_INFO_MODAL':
        return {
          isModalOpen: true,
          errorModal: false,
          invoiceSettled: false,
          nodeInfoModal: true,
          paymentModal: false,
        }
      case 'OPEN_PAYMENT_MODAL':
        return {
          isModalOpen: true,
          errorModal: false,
          invoiceSettled: false,
          nodeInfoModal: false,
          paymentModal: true,
        }
      case 'OPEN_INVOICE_SETTLED_MODAL':
        return {
          isModalOpen: true,
          errorModal: false,
          invoiceSettled: true,
          nodeInfoModal: false,
          paymentModal: false,
        }
      case 'CLOSE_MODAL':
        return {
          isModalOpen: false,
          errorModal: false,
          invoiceSettled: false,
          nodeInfoModal: false,
          paymentModal: false,
        }
      default:
        throw new Error(`Unexpected modal reducer action: ${action}`)
    }
  }, [])

  const [modalState, modalDispatch] = useReducer<Reducer<ModalState, string>>(modalReducer, modalInitialState)
  const modalContext = [modalState, modalDispatch]

  /**
   * Connect websocket
   * Update state on new data or error
   */
  const wsConnect = useCallback(async () => {
    log('Establish websocket connection with the server...')
    const socket = await api.getWebSocket()

    socket.addEventListener('open', (ev: Event) => {
      setIsWsConnected(true)
      const {readyState} = ev.currentTarget as any
      log('Websocket connected to server successfully')
      log('readyState: ', readyState)
    })

    socket.addEventListener('message', (ev: MessageEvent) => {
      try {
        const {readyState} = ev.currentTarget as any
        if (readyState !== 1) {
          log('Websocket not ready. readyState', readyState)
          return
        }
        const msg = JSON.parse(ev.data.toString())

        // Get client id
        if (msg && msg.type === 'client-id') {
          log('Client ID is', msg.data)
          setWsClientId(msg.data)
        }
        // Invoice settlement
        if (msg && msg.type === 'invoice-settlement') {
          log('Invoice settled!', msg.data)
          modalDispatch('OPEN_INVOICE_SETTLED_MODAL')
        }
        // Delivery failure
        if (msg && msg.type === 'delivery-failure') {
          log('delivery failure', msg.data)
          setError(msg.data)
          modalDispatch('OPEN_ERROR_MODAL')
        }
      } catch (err) {
        console.error('Websocket onmessage catch', err)
      }
    })

    socket.addEventListener('close', (ev: CloseEvent) => {
      log('Websocket close event ', ev)
      setError('The connection to the server has closed unexpectedly')
      modalDispatch('OPEN_ERROR_MODAL')
      const {readyState} = ev.currentTarget as any
      readyState && log('readyState: ', readyState)
    })

    socket.addEventListener('error', (ev: Event) => {
      console.error('Websocket connection error', ev)
      setError('Websocket connection error')
      modalDispatch('OPEN_ERROR_MODAL')
    })
  }, [])

  useEffect(() => {
    log('EFFECT WEBSOCKET CONNECTION')
    wsConnect()
      .then(async () => {
        log('Ask server LND node info...')
        let info = await api.getNodeInfo()
        log('LND node info', info)
        setNodeInfo(info)
      })
      .catch((err: string) => {
        log(err)
      })
  }, [wsConnect])


  if (isWsConnected) {
    uiContent = (
      <ModalContext.Provider value={modalContext}>
        <Home
          error={error}
          isWsConnected={isWsConnected}
          nodeInfo={nodeInfo}
          setError={setError}
          wsClientId={wsClientId}
          wsConnect={wsConnect}
        />
      </ModalContext.Provider>
    )
  } else {
    uiContent = (
      <div className="d-flex justify-content-center p-5 spinner-container">
        <Spinner color="warning"/>
      </div>
    )
  }

  return (
    <div className="App">
      <div id="header">
        <a href={'https://www.bitcoin-studio.com'} target={'_blank'}>
          <img id={'BitcoinStudioLogo'} src={BitcoinStudioLogo} alt="Bitcoin Studio Logo"/>
        </a>
        <h1 className="App-title">CHOOSE YOUR COFFEE</h1>
      </div>

      <div id="cardContainer">
        {uiContent}
      </div>

      <div id="footer">
        <p>Made By <a href="https://www.bitcoin-studio.com" target={'_blank'}>Bitcoin Studio</a> With Love ❤️</p>
      </div>
    </div>
  )
}