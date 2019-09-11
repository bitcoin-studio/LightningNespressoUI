import React from 'react'
import data from '../../data.json'
import PaymentModal from '../PaymentModal'

interface Props {
  BTCEUR: number;
  chosenCoffee: { id: number, name: string };
  closeModal: Function;
  invoiceValue: number;
  nodeInfo: any;
  modal: boolean;
  paymentModal: Function;
  paymentRequest: string;
  progress: number;
}

export default class Coffee extends React.Component<Props, {}> {

  render() {
    let coffees = Object.keys(data)
      .map(key => data[Number(key)])
      .map((item, index) =>
        <div className={'coffee'} key={item.name}>
          <img src={item.image} alt="image"/>
          <h2>{item.name}</h2>
          <p>{item.description}</p>

          <div id={'intensityLevelContainer'}>
            {Array.from(Array(12)).map((_, i) =>
              <div className={`intensitySquare ${i+1 <= item.intensity ? 'intensitySquare-active' : ''}`}
                   key={`${i}_intensity`}>
              </div>)
            }
          </div>

          <button onClick={() => this.props.paymentModal({id: index + 1, name: item.name})}>
            Buy for O.50€
          </button>
        </div>
      )

    return (
      <>
        {coffees}
        <PaymentModal
          BTCEUR={this.props.BTCEUR}
          chosenCoffee={this.props.chosenCoffee}
          closeModal={this.props.closeModal}
          isPaymentModalOpen={this.props.modal}
          nodeInfo={this.props.nodeInfo}
          paymentRequest={this.props.paymentRequest}
          progress={this.props.progress}
          invoiceValue={this.props.invoiceValue}
        />
      </>
    )
  }
}