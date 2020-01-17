import React, {useEffect, useState, useCallback, useReducer, Reducer} from 'react'
import {Invoice} from '@radar/lnrpc'
import {Spinner} from 'reactstrap'
import log from 'loglevel'
import {Home} from './components/Home'
import {Layout} from './components/Layout'
import api from './lib/api'

// TODO: Find proper type for context of reducer
// A known bug on Typescript Partial.
// Values and functions from ModalContext get in addition to their type the type undefined
// https://stackoverflow.com/questions/54489817/typescript-partialt-type-without-undefined
// type ModalContext = Reducer<ModalState, ReducerAction<any>>
// type ModalContext = Partial<Reducer<ModalState, ReducerAction<any>>>
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
    log.debug('prevState: ', state)
    log.debug('action: ', action)
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
  const wsConnect = useCallback(() => {
    log.info('Establish websocket connection with the server...')
    const socket = api.getWebSocket()

    socket.addEventListener('open', (ev: Event) => {
      setIsWsConnected(true)
      const {readyState} = ev.currentTarget as any
      log.info('Websocket connected to server successfully')
      log.debug('readyState: ', readyState)
    })

    socket.addEventListener('message', (ev: MessageEvent) => {
      try {
        const {readyState} = ev.currentTarget as any
        if (readyState !== 1) {
          log.warn('Websocket not ready. readyState', readyState)
          return
        }
        const msg: {type: string; data: any} = JSON.parse(ev.data.toString())

        // Get client id
        if (msg && msg.type === 'client-id') {
          log.info('Websocket client ID is', msg.data)
          setWsClientId(msg.data as string)
        }
        // Invoice settlement
        if (msg && msg.type === 'invoice-settlement') {
          log.info('Invoice settled!', msg.data as Invoice)
          modalDispatch('OPEN_INVOICE_SETTLED_MODAL')
        }
        // Delivery failure
        if (msg && msg.type === 'delivery-failure') {
          log.error('delivery failure', msg.data as string)
          setError('Sorry, we\'re unable to deliver your coffee. Please check that the machine is properly connected')
          modalDispatch('OPEN_ERROR_MODAL')
        }
        // Server/LND error
        if (msg && msg.type === 'error') {
          log.error('server/LND error', msg.data)
          if (msg.data as number === 14) {
            setError('Sorry, the Bitcoin node is unavailable.')
          } else {
            setError('Sorry, the server has an issue.')
          }
          modalDispatch('OPEN_ERROR_MODAL')
        }
      } catch (err) {
        log.error('Websocket onmessage catch', err)
      }
    })

    socket.addEventListener('close', (ev: CloseEvent) => {
      log.warn('Websocket close event ', ev)
      setError('The connection to the server has closed unexpectedly')
      modalDispatch('OPEN_ERROR_MODAL')
      const {readyState} = ev.currentTarget as any
      log.debug('readyState: ', readyState)
    })

    socket.addEventListener('error', (ev: Event) => {
      log.error('Websocket connection error', ev)
      setError('Websocket connection error')
      modalDispatch('OPEN_ERROR_MODAL')
    })
  }, [])

  useEffect(() => {
    log.debug('EFFECT WEBSOCKET CONNECTION')
    wsConnect()
    log.info('Ask server LND node info...')
    api.getNodeInfo()
      .then((info) => {
        log.info('LND node info', info)
        setNodeInfo(info)
      })
      .catch((err: Error) => {
        log.error(err)
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
    <Layout>
      {uiContent}
    </Layout>
  )
}
