import React, {Dispatch, SetStateAction, useContext, useEffect, useRef, useState} from 'react'
import data from '../data.json'
import {ModalContainer} from './ModalContainer'
import api from '../lib/api'
import {debounce} from 'lodash'
import {ModalContext} from '../App'
import ethiopia from '../assets/coffees/ethiopia.png'
import volluto from '../assets/coffees/volluto.png'
import arpeggio from '../assets/coffees/arpeggio.png'
import capriccio from '../assets/coffees/capriccio.png'
import vivalto from '../assets/coffees/vivalto.png'
import {log} from '../helpers'

const images = [
  ethiopia,
  vivalto,
  capriccio,
  arpeggio,
  volluto,
]

const initialPaymentState = {
  btcEurPriceInit: 0,
  chosenCoffeeInit: {id: 0, name: ''},
  invoiceValueInit: 0,
  paymentRequestInit: '',
  errorInit: '',
}

type Props = {
  error: App['error']
  isWsConnected: App['isWsConnected']
  nodeInfo: App['nodeInfo']
  setError: Dispatch<SetStateAction<string>>
  wsClientId: App['wsClientId']
  wsConnect: () => Promise<void>
}

/**
 * Home Screen - Choose Your Coffee
 */
export const Home: React.FC<Props> = (
  {
    error,
    isWsConnected,
    nodeInfo,
    setError,
    wsClientId,
    wsConnect,
  }) => {

  const [modalState, modalDispatch] = useContext(ModalContext)


  /**
   * Payment logic
   */
  const [btcEurPrice, setBtcEurPrice] = useState<Payment['btcEurPrice']>(0)
  const [invoiceValue, setInvoiceValue] = useState<Payment['invoiceValue']>(0)
  const [chosenCoffee, setChosenCoffee] = useState<Payment['chosenCoffee']>(null)
  const [paymentRequest, setPaymentRequest] = useState<Payment['paymentRequest']>(null)

  // Handle payment
  // ref has been necessary to force focus, because Firefox and Safari on Mac don't give focus to btn on click...
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#Clicking_and_focus#Clicking_and_focus
  const _nodes: Map<number, any> = new Map()
  const forceFocus = (index: number) => {
    const node = _nodes.get(index)
    node.focus()
  }
  const debouncedGeneratePaymentRequest = useRef(debounce((chosenCoffee: Payment['chosenCoffee'], wsClientId: string) => {
    (async () => {
      log('GENERATE PAYMENT REQUEST')
      log('chosenCoffee', chosenCoffee)
      setChosenCoffee(chosenCoffee)

      try {
        log(`Generate an invoice for ${chosenCoffee?.name}, row ${chosenCoffee?.id}`)
        let invoiceAmount: number
        if (process.env.REACT_APP_CURRENCY === '€') {
          let prices = await api.getPrice()
          let btcEurPrice = Number((prices.EUR).toFixed(0))
          setBtcEurPrice(Number((prices.EUR).toFixed(0)))
          log('Price BTCEUR ', btcEurPrice)
          if (process.env.REACT_APP_TESTING) {
            invoiceAmount = 1
          } else {
            invoiceAmount = Number(((Number(process.env.REACT_APP_PRICE) / btcEurPrice) * 10 ** 8).toFixed(0))
          }
          log('Invoice amount (sats) ', invoiceAmount)

          // If invoiceAmount > 20 000 sats, return
          if (invoiceAmount > 20000) {
            log('invoiceAmount greater than 20 000 sats!!', invoiceAmount)
            return
          }
        } else {
          // Fiat amount
          invoiceAmount = Number(process.env.REACT_APP_PRICE)
        }
        setInvoiceValue(invoiceAmount)

        let memo = `#${chosenCoffee?.id} ${chosenCoffee?.name} - The Block / @${wsClientId}`
        const res = await api.generatePaymentRequest(memo, invoiceAmount)
        setPaymentRequest(res.paymentRequest)
        modalDispatch('OPEN_PAYMENT_MODAL')
      } catch (err) {
        log(err.message)
        setError('Sorry, the application failed to generate your invoice.')
      }
    })()
  }, 3000, {leading: true, trailing: false})).current

  // Clear all payment state when modal is close
  useEffect(() => {
    if (!modalState.isModalOpen) {
      log('EFFECT CLEAR STATE WHEN MODAL IS CLOSE')
      // Payment
      setBtcEurPrice(initialPaymentState.btcEurPriceInit)
      setChosenCoffee(initialPaymentState.chosenCoffeeInit)
      setInvoiceValue(initialPaymentState.invoiceValueInit)
      setPaymentRequest(initialPaymentState.paymentRequestInit)
      // Global
      setError(initialPaymentState.errorInit)
    }
  }, [modalState.isModalOpen, setError])


  /**
   * Prepare UI components with data
   */
  const currency = process.env.REACT_APP_CURRENCY === 'sats' ? ' sats' : process.env.REACT_APP_CURRENCY

  let coffees = Object.keys(data)
    .map(key => data[Number(key)])
    .map((item, index) => (
      <div className={'coffee'} key={item.name}>
        <img src={images[index]} alt="Nespresso capsule"/>
        <h2>{item.name}</h2>
        <p>{item.description}</p>
        <div className={'intensity'}>
          <p className={'intensity__title'}>{'Intensity'}</p>
          <div className={'intensity__squares'}>
            {Array.from(Array(12)).map((_, i) =>
              <div className={`intensity__square ${i + 1 <= item.intensity ? 'intensity__square-active' : ''}`}
                   key={`${i}_intensity`}>
              </div>)
            }
          </div>
        </div>

        <button
          className={'buttonBuy'}
          tabIndex={index + 1}
          key={`button_${index}`}
          ref={c => _nodes.set(index, c)}
          type="button"
          onClick={() => {
            forceFocus(index)
            debouncedGeneratePaymentRequest({id: index + 1, name: item.name}, wsClientId)
          }}
        >
          {`Buy for ${process.env.REACT_APP_PRICE}${currency}`}
        </button>
      </div>),
    )

  return (
    <>

      {coffees}

      <ModalContainer
        btcEurPrice={btcEurPrice}
        chosenCoffee={chosenCoffee}
        error={error}
        isWsConnected={isWsConnected}
        invoiceValue={invoiceValue}
        nodeInfo={nodeInfo}
        paymentRequest={paymentRequest}
        wsConnect={wsConnect}
      />
    </>
  )
}