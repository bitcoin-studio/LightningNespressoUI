import React from 'react'
import {Alert, Button, Spinner} from 'reactstrap'
import Coffees from 'components/Coffee'
import './style.scss'
import api from 'lib/api'
import debounce from 'lodash.debounce'
// @ts-ignore
//import LiveStreamYouTube from './assets/LiveStreamYouTube.png';
import BitcoinStudioLogo from './assets/bitcoin-studio-black-border.svg';

interface State {
  BTCEUR: number;
  chosenCoffee: {id: number, name: string};
  clientId: string;
  errorPayment: string;
  errorServer: Error | null;
  invoiceValue: number;
  isConnecting: boolean;
  nodeInfo: any;
  modal: boolean;
  modalTimer: any;
  paymentRequest: string;
  progress: number;
}

const PAYMENT_STATE = {
  BTCEUR: null, // price at invoice creation
  chosenCoffee: {id: null, name: null},
  errorPayment: null,
  invoiceValue: null,
  modalTimer: null,
  paymentRequest: '',
  progress: 0
}

const APP_STATE = {
  clientId: null,
  errorServer: null,
  isConnecting: true,
  modal: false,
  nodeInfo: null,
}

const INITIAL_STATE: State = {
  ...PAYMENT_STATE,
  ...APP_STATE,
}


export default class App extends React.Component<{}, State> {
  state: State = { ...INITIAL_STATE }

  componentDidMount () {
    // Establish websocket connection
    this.connect()
      .then(async () => {
        console.log('Ask server LND node info...')
        const info = await api.getNodeInfo()
        console.log('LND node info ', info)
        this.setState({nodeInfo: info})
      })
      .catch(err => {
        console.log(err)
      })
  }

  componentWillUnmount() {
    clearInterval(this.state.modalTimer)
  }

  render() {
    const { errorServer, isConnecting } = this.state;

    let content;

    if (isConnecting) {
      content = (
        <div className="d-flex justify-content-center p-5">
          <Spinner color="warning" style={{ width: '3rem', height: '3rem' }} />
        </div>
      )
    } else if (errorServer) {
      content = (
        <Alert color="danger">
          <h4 className="alert-heading">Something went wrong!</h4>
          <p>{errorServer.message}</p>
          <Button block outline color="danger" onClick={this.connect}>
            Try to reconnect
          </Button>
        </Alert>
      )
    } else {
      content = (
         <Coffees
           BTCEUR={this.state.BTCEUR}
           chosenCoffee={this.state.chosenCoffee}
           closeModal={this.closeModal}
           errorPayment={this.state.errorPayment}
           invoiceValue={this.state.invoiceValue}
           modal={this.state.modal}
           nodeInfo={this.state.nodeInfo}
           paymentModal={debounce(this.paymentModal, 1500, {leading: true, trailing:false})}
           paymentRequest={this.state.paymentRequest}
           paymentStateCleanup={this.paymentStateCleanup}
           progress={this.state.progress}
         />
      );
    }

    return (
      <div className="App">
        <div id="header">
          <a href={'https://www.bitcoin-studio.com'} target={'_blank'}>
            <img id={'BitcoinStudioLogo'} src={BitcoinStudioLogo} alt="Bitcoin Studio Logo"/>
          </a>
          <h1 className="App-title">CHOOSE YOUR COFFEE</h1>
          {/*
          <a href={'https://www.youtube.com/channel/UCvFqGJdZWhi3frJeygy4GMw/live'} target={'_blank'}>
            <img id={'LiveStreamYouTube'} src={LiveStreamYouTube} alt="LiveStream YouTube image"/>
          </a>
          */}
        </div>

        <div id="cardContainer">
            {content}
        </div>

        <div id="footer">
          <p>Made By <a href="https://www.bitcoin-studio.com" target={"_blank"}>Bitcoin Studio</a> With Love ❤️</p>
        </div>
      </div>
    )
  }

  private paymentStateCleanup = () => {
    console.log('Payment state cleanup')
    clearInterval(this.state.modalTimer)
    this.setState({...PAYMENT_STATE})
  }

  private closeModal = () => {
    console.log('Close modal')
    this.setState({modal: false})
  }

  // Reset our state, connect websocket, and update state on new data or error
  private connect = async () => {
    console.log('Reset state')
    this.setState({ ...INITIAL_STATE })

    console.log('Establish websocket connection with server...')
    const socket = await api.getWebSocket()

    socket.addEventListener('open', (ev) => {
      this.setState({ isConnecting: false });
      // @ts-ignore
      const {readyState} = ev.currentTarget
      console.log('Websocket connected to server successfully')
      console.log('readyState: ', readyState)
    })

    socket.addEventListener('message', ev => {
      try {
        // @ts-ignore
        const {readyState} = ev.currentTarget
        if (readyState !== 1) {
          console.log('Websocket not ready. readyState', readyState)
          return
        }
        const msg = JSON.parse(ev.data.toString())

        // Get client id
        if (msg && msg.type === 'client-id') {
          console.log('Client ID is', msg.data)
          this.setState({clientId: msg.data})
        }
        // Invoice settlement
        if (msg && msg.type === 'invoice-settlement') {
          console.log('Invoice settled!', msg.data)
          this.paymentStateCleanup()
          this.closeModal()
        }
        // Delivery failure
        if (msg && msg.type === 'delivery-failure') {
          console.log('delivery failuree', msg.data)
          this.setState({errorPayment: msg.data})
        }
      } catch(err) {
        console.error('Websocket onmessage catch', err)
      }
    })

    socket.addEventListener('close', (ev) => {
      console.log('Websocket close event ', ev)
      this.setState({ errorServer: new Error('Connection to server closed unexpectedly.') })
      // @ts-ignore
      const {readyState} = ev.currentTarget
      readyState ? console.log("readyState: ", readyState) : null
    })

    socket.addEventListener('error', (ev) => {
      this.setState({ errorServer: new Error('There was an error, see your console for more information.') });
      console.log('Websocket connection error')
      console.error('websocket onerror', ev)
    })
  }

  private generatePaymentRequest = async (chosenCoffee: {id: number, name: string}) => {
    try {
      console.log(`Generate invoice for ${chosenCoffee.name}, row ${chosenCoffee.id}`)
      let value;
      if (process.env.CURRENCY === '€') {
        let prices = await api.getPrice();
        let BTCEUR = Number((prices.EUR).toFixed(0))
        this.setState({'BTCEUR': BTCEUR})
        console.log('price BTCEUR ', BTCEUR)
        value = Number(((Number(process.env.PRICE) / BTCEUR) * 10 ** 8).toFixed(0))
        console.log('Invoice amount (sats) ', value)

        // If value > 20 000 sats, return
        if (value > 20000) {
          console.log('value greater than 20 000 sats!!', value)
          return
        }
      } else {
        value = process.env.PRICE
      }

      this.setState({invoiceValue: value})

      let memo = `#${chosenCoffee.id} ${chosenCoffee.name} - The Block / @${this.state.clientId}`
      const res = await api.generatePaymentRequest(memo, value)
      this.setState({
        paymentRequest: res.paymentRequest
      })
    } catch (err) {
      this.setState({
        errorServer: err.message,
      })
    }
  }

  private paymentModal = async (chosenCoffee: {id: number, name: string}) => {
    await this.setState({chosenCoffee: chosenCoffee})
    await this.generatePaymentRequest(this.state.chosenCoffee)
    await this.setState({modal: true})
    await this.runProgressBar()
  }

  private runProgressBar = async () => {
    // Increase by 5 every 5 seconds
    // 5 minutes = 300 seconds
    let seconds = 0
    let percentage = 0
    this.setState({modalTimer: setInterval(() => {
      seconds = seconds + 5
      percentage = Number((seconds / 3).toFixed(0))
      this.setState({progress: percentage})
      console.log(`Waiting bar ${this.state.progress} %`)

      if (this.state.progress >= 100) {
        clearInterval(this.state.modalTimer)
        this.setState({modal: false})
        console.log('close modal')
      }
    }, 5000)})
  }
}