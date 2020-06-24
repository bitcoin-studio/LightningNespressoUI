declare module 'ln-service'

type App = {
  wsClientId: string
  error: string
  isWsConnected: boolean
  nodeInfo: {sockets: [{socket: string}], alias: string, public_key: string} | null
  isModalOpen: boolean
  errorModal: boolean
  nodeInfoModal: boolean
  paymentModal: boolean
}

type Payment = {
  btcEurPrice: number
  chosenCoffee: { id: number, name: string } | null
  invoiceValue: number
  paymentRequest: string | null
}

type ModalState = {
  isModalOpen: boolean
  errorModal: boolean
  invoiceSettled: boolean
  nodeInfoModal: boolean
  paymentModal: boolean
}

type Invoice = {
  chain_address?: string
  created_at: Date
  description: string
  id: string
  request: string
  secret: string
  tokens: number
}

type InvoiceEvent = {
  is_confirmed?: any
  description: string
  chain_address?: string | undefined
  created_at?: Date
  id?: string
  request?: string
  secret?: string
  tokens?: number
}
