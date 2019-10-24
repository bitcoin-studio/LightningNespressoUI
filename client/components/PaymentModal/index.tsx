import React from 'react'
import { Button, Col, Container, Modal, ModalBody, Progress, Row } from 'reactstrap';
import DefaultQRCode, { QRCodeProps } from 'qrcode.react';
// @ts-ignore
import logo from '../../assets/cropped-tbc.png';
// @ts-ignore
import copy from '../../assets/copy.svg';

interface State {
  error: string;
  errorTab: boolean;
  isCopyLinkActive: boolean;
  isOpenWalletLinkActive: boolean;
  nodeInfoTab: boolean;
  paymentTab: boolean;
}

interface Props {
  BTCEUR: number;
  chosenCoffee: {id: number, name: string};
  closeModal: Function;
  errorPayment: string;
  isPaymentModalOpen: boolean;
  nodeInfo: any;
  paymentRequest: string;
  paymentStateCleanup: Function;
  progress: number;
  invoiceValue: number;
}

const INITIAL_STATE: State = {
  error: null,
  errorTab: false,
  isCopyLinkActive: false,
  isOpenWalletLinkActive: false,
  nodeInfoTab: false,
  paymentTab: true,
}

const QRCode = DefaultQRCode as React.ComponentClass<QRCodeProps & React.HTMLProps<SVGElement>>;

/**
 * PaymentModal
 */
export default class PaymentModal extends React.Component<Props, State> {
  state = {...INITIAL_STATE}

  componentDidUpdate(prevProps) {
    if (prevProps.errorPayment === null && prevProps.errorPayment !== this.props.errorPayment) {
      this.setState({errorTab: true})
      this.setState({paymentTab: false})
      this.setState({nodeInfoTab: false})
      this.setState({error: this.props.errorPayment})
      this.props.paymentStateCleanup()
    }
  }

  private setClipboard(text) {
    navigator.clipboard.writeText(text)
      .then(function() {
        console.log('Invoice copied to clipboard')
      }, function(err) {
        console.log('Invoice not copied to clipboard')
        console.log('err', err)
      })
  }

  private activateActionLink(actionLink: string) {
    // @ts-ignore
    this.setState({[actionLink]: true})
    setTimeout(() => {
      // @ts-ignore
      this.setState({[actionLink]: false})
    }, 1000)
  }

  private resetAll() {
    this.props.paymentStateCleanup()
    this.props.closeModal()
    // Set paymentTab back to true after a delay to avoid glitch
    setTimeout(() => {
      this.setState({paymentTab: true})
      this.setState({errorTab: false})
    }, 500)
  }

  render() {
    let modalBody
    const { isCopyLinkActive, isOpenWalletLinkActive } = this.state

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
    } else if (this.state.errorTab) {
      modalBody = (
        <ModalBody>
          <Container>
            <Row noGutters={true}>
              <Col xs={{size: 12}} className={''}>
                <p>
                  {this.state.error}
                </p>
              </Col>
            </Row>
            <Row noGutters={true}>
              <Col xs={{size: 12}}>
                <Button className={'cancelPayment btn acme'}
                        outline
                        color="warning"
                        onClick={() => this.resetAll()}
                >
                  {'Close'}
                </Button>
              </Col>
            </Row>

          </Container>
        </ModalBody>
      )
    } else if (this.state.paymentTab){
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
                className={`link monospace ${isOpenWalletLinkActive ? 'actionLinksClicked' : ''}`}
                href={`lightning:${this.props.paymentRequest}`}
                id={"openWithWallet"}
                onClick={() => this.activateActionLink('isOpenWalletLinkActive')}
              >
                {'OPEN WITH YOUR WALLET'}
              </a>
              <a
                className={`link monospace ${isCopyLinkActive ? 'actionLinksClicked' : ''}`}
                id="copyIcon"
                onClick={() => {
                  this.setClipboard(this.props.paymentRequest)
                  this.activateActionLink('isCopyLinkActive')
                }}
              >
                <img src={copy} alt="copy icon"/>
                {'COPY'}
              </a>
            </Row>

            <Row noGutters={true}>
              <Col xs={{size: 12}}>
                <Button className={'cancelPayment btn acme'}
                        outline
                        color="warning"
                        onClick={() => this.resetAll()}
                >
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
          toggle={() => this.resetAll()}
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