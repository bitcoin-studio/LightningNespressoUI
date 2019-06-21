import React from 'react'
import { Button, Col, Container, Modal, ModalBody, Progress, Row } from 'reactstrap';
import DefaultQRCode, { QRCodeProps } from 'qrcode.react';
// @ts-ignore
import logo from '../../assets/cropped-tbc.png';

interface State {
  nodeInfoTab: boolean;
}

const INITIAL_STATE: State = {
  nodeInfoTab: false
}

interface Props {
  BTCEUR: number;
  chosenCoffee: {id: number, name: string};
  closeModal: Function;
  isPaymentModalOpen: boolean;
  nodeInfo: any;
  paymentRequest: string;
  progress: number;
  invoiceValue: number;
}

const QRCode = DefaultQRCode as React.ComponentClass<QRCodeProps & React.HTMLProps<SVGElement>>;

/**
 * PaymentModal
 */
export default class PaymentModal extends React.Component<Props, State> {
  state = {...INITIAL_STATE}

  render() {
    let modalBody;

    // Invoice Tab
    if (!this.state.nodeInfoTab) {
      modalBody = (
        <ModalBody>
          <Container>
            <Row noGutters={true}>
              <Col xs={{ size: 12 }} className={'progressBar'}>
                <Progress value={this.props.progress}>Awaiting Payment...</Progress>
              </Col>
            </Row>
            <Row noGutters={true} className={'invoiceInfo'}>
              <Col xs={{ size: 6 }} className={'invoiceInfo-col1'}>
                <p>{this.props.chosenCoffee.name}</p>
              </Col>
              <Col xs={{ size: 6 }} className={'invoiceInfo-col2'}>
                <p>{`${this.props.invoiceValue} Sats (0,50 EUR)`}</p>
                <p>{`1 BTC = ${this.props.BTCEUR} € (EUR)`}</p>
              </Col>
            </Row>
            <Row noGutters={true}>
              <Col xs={{ size: 6, offset: 3 }}>
                <div className={'qrcodeWrapper'}>
                  <QRCode
                    value={this.props.paymentRequest.toUpperCase()}
                    style={{ display: 'block', width: '100%', height: 'auto' }}
                  />
                </div>
              </Col>
            </Row>
            <Row noGutters={true}>
              <Col xs={{ size: 12 }}>
                <p className={'paymentRequestString'}>
                  <span>{'BOLT 11 Invoice: '}</span>{this.props.paymentRequest}
                </p>
              </Col>
            </Row>
            <Row noGutters={true}>
              <Col xs={{ size: 12 }}>
                <Button className={'cancelPayment btn'} outline color="warning" onClick={() => this.props.closeModal()}>Cancel Payment</Button>
              </Col>
            </Row>
            <Row noGutters={true}>
              <Col xs={{ size: 12 }}>
                <Button className={'nodeInfo btn'} outline color="info" onClick={() => this.setState({nodeInfoTab: true})}>The Block Node Info</Button>
              </Col>
            </Row>
          </Container>
        </ModalBody>
      )
    }
    // Node Info Tab
    else {
      modalBody = (
        <ModalBody>
          <Container>
            <Row noGutters={true}>
              <Col xs={{ size: 6, offset: 3 }}>
                <div>Node Info</div>
                <div className={'qrcodeWrapper'}>
                  <QRCode
                    value={`${this.props.nodeInfo ? this.props.nodeInfo.info.identityPubkey : ''}@85.246.228.114:10001`}
                    style={{ display: 'block', width: '100%', height: 'auto' }}
                  />
                </div>
              </Col>
            </Row >
            <Row noGutters={true}>
              <Col xs={{ size: 12 }}>
                <p className={'nodeID'}><span>{'Node ID: '}</span>{`${this.props.nodeInfo ? this.props.nodeInfo.info.identityPubkey : ''}@85.246.228.114:10001`}</p>
              </Col>
            </Row>
            <Row noGutters={true}>
              <Col xs={{ size: 12 }}>
                <Button className={'nodeInfo btn'} outline color="info" onClick={() => this.setState({nodeInfoTab: false})}>Go Back to Invoice</Button>
              </Col>
            </Row>
          </Container>
        </ModalBody>
      )
    }

    return (
      <div>
        <Modal isOpen={this.props.isPaymentModalOpen} className={'paymentModal'}>
          <Row noGutters={true}>
            <Col xs={{ size: 2 }}>
              <img src={logo} alt="logo"/>
            </Col>
            <Col xs={{ size: 10 }} className={'titleModal'}>
              <p>Lightning Nespresso</p>
            </Col>
          </Row>
          {modalBody}
        </Modal>
      </div>
    )
  }
}