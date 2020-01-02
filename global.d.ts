type App = {
  wsClientId: string
  error: string
  isWsConnected: boolean
  nodeInfo: {uris: [string]} | null
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