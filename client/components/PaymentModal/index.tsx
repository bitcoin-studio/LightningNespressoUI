import React from 'react'
import { Button, Col, Container, Modal, ModalBody, Progress, Row } from 'reactstrap';
import DefaultQRCode, { QRCodeProps } from 'qrcode.react';
// @ts-ignore
import logo from '../../assets/cropped-tbc.png';
// @ts-ignore
import copy from '../../assets/copy.svg';

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

  private setClipboard(text) {
    navigator.clipboard.writeText(text)
      .then(function() {
        console.log('Invoice copied to clipboard')
      }, function(err) {
        console.log('Invoice not copied to clipboard')
        console.log('err', err)
      })
  }

  render() {
    let modalBody;

    if (this.state.nodeInfoTab) {
      modalBody = (
        <ModalBody>
          <Container>
            <Row noGutters={true}>
              <Col xs={{size: 6, offset: 3}}>
                <div className={'qrcodeWrapper'}>
                  <QRCode
                    value={`${this.props.nodeInfo ? this.props.nodeInfo.uris[0] : ''}`}
                    style={{display: 'block', width: '100%', height: 'auto'}}
                  />
                </div>
              </Col>
            </Row>
            <Row noGutters={true}>
              <Col xs={{size: 12}}>
                <h6>{'Node ID'}</h6>
                <p className={'monospace'}>
                  {`${this.props.nodeInfo ? this.props.nodeInfo.uris[0] : ''}`}</p>
              </Col>
            </Row>
            <Row noGutters={true}>
              <Col xs={{size: 12}}>
                <Button className={'nodeInfo btn'} outline color="info"
                        onClick={() => this.setState({nodeInfoTab: false})}>
                  {'Go Back'}
                </Button>
              </Col>
            </Row>
          </Container>
        </ModalBody>
      )
    } else {
      modalBody = (
        <ModalBody>
          <Container>
            <Row noGutters={true}>
              <Col xs={{size: 12}} className={'progressBar monospace'}>
                <Progress value={this.props.progress}>Awaiting Payment...</Progress>
              </Col>
            </Row>
            <Row noGutters={true} className={'invoiceInfo'}>
              <Col xs={{size: 6}} className={'invoiceInfo-col1'}>
                <p>{this.props.chosenCoffee.name}</p>
              </Col>
              <Col xs={{size: 6}} className={'invoiceInfo-col2'}>
                <p>{`${this.props.invoiceValue} Sats (${process.env.PRICE} EUR)`}</p>
                <p>{`1 BTC = ${this.props.BTCEUR} € (EUR)`}</p>
              </Col>
            </Row>
            <Row noGutters={true}>
              <Col xs={{size: 6, offset: 3}}>
                <div className={'qrcodeWrapper'}>
                  <QRCode
                    value={this.props.paymentRequest.toUpperCase()}
                    style={{display: 'block', width: '100%', height: 'auto'}}
                  />
                </div>
              </Col>
            </Row>
            <Row noGutters={true}>
              <Col xs={{size: 12}}>
                <h6>{'BOLT 11 INVOICE'}</h6>
                <p className={'monospace'}>
                  {this.props.paymentRequest}
                </p>
              </Col>
            </Row>

            <Row noGutters={true}>
              <a
                className={'link monospace'}
                href={`lightning:${this.props.paymentRequest}`}
                id={"openWithWallet"}>
                {'OPEN WITH YOUR WALLET'}
              </a>
              <a
                className={'link monospace'}
                id="copyIcon"
                onClick={() => this.setClipboard(this.props.paymentRequest)}
              >
                <img src={copy} alt="copy icon"/>
                <span>COPY</span>
              </a>
            </Row>

            <Row noGutters={true}>
              <Col xs={{size: 12}}>
                <Button className={'cancelPayment btn acme'} outline color="warning" onClick={() => this.props.closeModal()}>
                  {'Cancel Payment'}
                </Button>
              </Col>
            </Row>
            <Row noGutters={true}>
              <Col xs={{size: 12}}>
                <Button className={'nodeInfo btn acme'} outline color="info"
                        onClick={() => this.setState({nodeInfoTab: true})}>
                  {'Node Info'}
                </Button>
              </Col>
            </Row>
          </Container>
        </ModalBody>
      )
    }

    return (
      <div>
        <Modal
          className={'paymentModal'}
          isOpen={this.props.isPaymentModalOpen}
          returnFocusAfterClose={false}
          toggle={() => this.props.closeModal()}
        >
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