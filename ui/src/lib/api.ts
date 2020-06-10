import log from 'loglevel'
import {stringify} from 'query-string'

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

class API {
  url: string

  constructor(url: string) {
    this.url = url
  }

  // Public methods
  generatePaymentRequest(memo: string, value: number) {
    return this.request<{ paymentRequest: string; }>(
      'POST',
      '/generatePaymentRequest',
      {memo, value},
    )
  }

  getNodeInfo() {
    // TODO: Figure out the right type
    return this.request<any>(
      'GET',
      '/getNodeInfo',
      {},
    )
  }

  getPrice() {
    return this.request<{ EUR: number }>(
      'GET',
      '/getPrice',
      {},
    )
  }

  // Establish websocket connection with server
  getWebSocket() {
    const wsUrl = this.url.replace('https', 'wss').replace('http', 'ws')
    return new WebSocket(`${wsUrl}/ws`)
  }

  // Internal fetch function. Makes a request to the server, and either returns
  // JSON parsed data from the request, or throws an error.
  protected request<R extends object>(
    method: ApiMethod,
    path: string,
    args?: object,
  ): Promise<R> {
    let body = null
    let query = ''
    const headers = new Headers()
    headers.append('Accept', 'application/json')

    if (method === 'POST' || method === 'PUT') {
      body = JSON.stringify(args)
      headers.append('Content-Type', 'application/json')
    } else if (args !== undefined) {
      // TS Still thinks it might be undefined(?)
      query = `?${stringify(args as any)}`
    }

    return fetch(this.url + path + query, {
      method,
      headers,
      body,
    })
      .then(async (res) => {
        if (!res.ok) {
          let errMsg
          try {
            const errBody = await res.json()
            if (!errBody.error) throw new Error()
            errMsg = errBody.error
          } catch (err) {
            throw new Error(`${res.status}: ${res.statusText}`)
          }
          throw new Error(errMsg)
        }
        return res.json()
      })
      .then((res) => res.data as R)
      .catch((err) => {
        log.error(`API error calling ${method} ${path}`, err)
        throw err
      })
  }
}

export default new API(process.env.REACT_APP_API_PATH as string)
