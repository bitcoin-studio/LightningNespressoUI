import React from 'react'
import api from 'lib/api'
import data from '../../data.json'
import PaymentModal from '../PaymentModal'
import { ICoffee } from '../../types'

interface Props {}

interface State {
  chosenCoffee: string;
  data: ICoffee | null;
  error: Error | null;
  nodeInfo: any;
  modal: boolean;
  modalTimer: any;
  paymentRequest: string;
  progress: number;
}

const INITIAL_STATE: State = {
  chosenCoffee: '',
  data: null,
  error: null,
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
    });
  }

  componentWillUnmount() {
    clearInterval(this.state.modalTimer)
  }

  render() {
    let coffees = Object.keys(data)
      .map(key => data[Number(key)])
      .map(item =>
        <div className={'coffee col-2'} key={item.name}>
          <img src={item.image} alt="image"/>
          <h2>{item.name}</h2>
          <p>{item.description}</p>
          <button onClick={() => this.paymentModal(item.name)}>
            Buy for O.O5€
          </button>
        </div>
      )

    return (
      <>
        {coffees}
        <PaymentModal
          chosenCoffee={this.state.chosenCoffee}
          closeModal={this.closeModal}
          isPaymentModalOpen={this.state.modal}
          paymentRequest={this.state.paymentRequest}
          progress={this.state.progress}
          nodeInfo={this.state.nodeInfo}
        />
      </>
    )
  }

  private generatePaymentRequest = async (chosenCoffee: string) => {
    try {
      // API request to setup post for payment
      const res = await api.generatePaymentRequest(chosenCoffee)
      this.setState({
        paymentRequest: res.paymentRequest
      })
    } catch (err) {
      this.setState({
        error: err.message,
      })
    }
  }

  private paymentModal = async (chosenCoffee: string) => {
    await this.setState({chosenCoffee: chosenCoffee})
    await this.generatePaymentRequest(this.state.chosenCoffee)
    await this.setState({modal: true})
    await this.runProgressBar()
  }

  private closeModal = async () => {
    console.log('Close modal')
    this.setState({modal: false})
    clearInterval(this.state.modalTimer)
  }

  private runProgressBar = async () => {
    // Increase by 5 every 5 seconds
    // 5 minutes = 300 seconds
    let seconds = 0
    let percentage = 0
    this.setState({modalTimer: setInterval(() => {
        seconds = seconds + 5
        percentage = Number((seconds / 3).toFixed(0))
        console.log('percentage', percentage)
        this.setState({progress: percentage})
        console.log('this.state.progress', this.state.progress)

        if (this.state.progress >= 100) {
          clearInterval(this.state.modalTimer)
          this.setState({modal: false})
          console.log('close modal')
        }
      }, 5000)})
  }

  private getNodeInfo = async () => {
    const info = await api.getNodeInfo()
    console.log('info----------------------', info)
    this.setState({nodeInfo: info})
  }

  private getPrice = async () => {
    //const data = await api.getPrice()
    //console.log('data', data)
  }
}