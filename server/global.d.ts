declare module 'ln-service'

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
  description: any
  chain_address?: string | undefined
  created_at?: Date
  id?: string
  request?: string
  secret?: string
  tokens?: number
}
