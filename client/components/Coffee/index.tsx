import React from 'react'
import api from 'lib/api'
import data from '../../data.json'
import PaymentModal from '../PaymentModal'
import { ICoffee } from '../../types'

interface Props {}

interface State {
  BTCEUR: number;
  chosenCoffee: {id: number, name: string};
  data: ICoffee | null;
  error: Error | null;
  invoiceValue: number;
  nodeInfo: any;
  modal: boolean;
  modalTimer: any;
  paymentRequest: string;
  progress: number;
}

const INITIAL_STATE: State = {
  BTCEUR: null,
  chosenCoffee: {id: null, name: null},
  data: null,
  error: null,
  invoiceValue: null,
  modal: false,
  modalTimer: null,
  nodeInfo: null,
  paymentRequest: '',
  progress: 0
}

export default class Coffee extends React.Component<Props, State> {
  state = {...INITIAL_STATE}

  componentDidMount(): void {
    this.setState({nodeInfo: this.getNodeInfo()})

    // Listen for paid invoice, close modal
    const socket = api.getCoffeesWebSocket();
    socket.addEventListener('message', ev => {
      try {
        const msg = JSON.parse(ev.data.toString());
        if (msg && msg.type === 'invoice-settlement') {
          console.log('Invoice settled!', msg.data)
          this.closeModal()
        }
      } catch(err) {
        console.error(err);
      }
    })
  }

  componentWillUnmount() {
    clearInterval(this.state.modalTimer)
  }

  render() {
    let coffees = Object.keys(data)
      .map(key => data[Number(key)])
      .map((item, index) =>
        <div className={'coffee col-2'} key={item.name}>
          <img src={item.image} alt="image"/>
          <h2>{item.name}</h2>
          <p>{item.description}</p>
          <button onClick={() => this.paymentModal({id: index + 1, name: item.name})}>
            Buy for O.50€
          </button>
        </div>
      )

    return (
      <>
        {coffees}
        <PaymentModal
          BTCEUR={this.state.BTCEUR}
          chosenCoffee={this.state.chosenCoffee}
          closeModal={this.closeModal}
          isPaymentModalOpen={this.state.modal}
          nodeInfo={this.state.nodeInfo}
          paymentRequest={this.state.paymentRequest}
          progress={this.state.progress}
          invoiceValue={this.state.invoiceValue}
        />
      </>
    )
  }

  private generatePaymentRequest = async (chosenCoffee: {id: number, name: string}) => {
    try {
      console.log(`Generate invoice for ${chosenCoffee.name}, row ${chosenCoffee.id}`)
      let value;
      let prices = await api.getPrice();
      let BTCEUR = Number((prices.EUR).toFixed(0))
      this.setState({'BTCEUR': BTCEUR})
      console.log('prices EUR ', BTCEUR)
      value = Number(((1 * 0.50 / BTCEUR) * 10**8).toFixed(0))
      console.log('Invoice amount (sats) ', value)

      // If value > 20 000 sats, return
      if (value > 20000) {
        console.log('value greater than 20 000 sats!!', value)
        return
      }

      this.setState({invoiceValue: value})

      let memo = `#${chosenCoffee.id} ${chosenCoffee.name} - The Block`
      const res = await api.generatePaymentRequest(memo, value)
      this.setState({
        paymentRequest: res.paymentRequest
      })
    } catch (err) {
      this.setState({
        error: err.message,
      })
    }
  }

  private paymentModal = async (chosenCoffee: {id: number, name: string}) => {
    await this.setState({chosenCoffee: chosenCoffee})
    await this.generatePaymentRequest(this.state.chosenCoffee)
    await this.setState({modal: true})
    await this.runProgressBar()
  }

  private closeModal = async () => {
    // Clear timer waiting bar
    clearInterval(this.state.modalTimer)
    console.log('Reset state')
    console.log('Close modal')
    this.setState({...INITIAL_STATE})
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

  private getNodeInfo = async () => {
    const info = await api.getNodeInfo()
    console.log(info)
    this.setState({nodeInfo: info})
  }
}