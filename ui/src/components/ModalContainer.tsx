import React, {useContext} from 'react'
import {Col, Container, Modal, ModalBody, Row} from 'reactstrap'
import logo from '../assets/cropped-tbc.png'
import {PaymentModal} from './PaymentModal'
import {ErrorModal} from './ErrorModal'
import {NodeInfoModal} from './NodeInfoModal'
import {InvoiceSettledModal} from './InvoiceSettledModal'
import {ModalContext} from '../App'
import {ProgressBar} from './ProgressBar'

type Props = Payment & {
  nodeInfo: App['nodeInfo']
  error: App['error']
  isWsConnected: App['isWsConnected']
  wsConnect: () => void
}

/**
 * Display the right modal screen based on state
 */
export const ModalContainer: React.FC<Props> = (
  {
    btcEurPrice,
    chosenCoffee,
    error,
    invoiceValue,
    isWsConnected,
    nodeInfo,
    paymentRequest,
    wsConnect,
  },
) => {
  let modalBody
  const [modalState, modalDispatch] = useContext(ModalContext)

  // Display Modals
  switch (true) {
    case modalState.paymentModal:
      modalBody = (
        <PaymentModal
          btcEurPrice={btcEurPrice}
          chosenCoffee={chosenCoffee}
          invoiceValue={invoiceValue}
          paymentRequest={paymentRequest}
        />
      )
      break
    case modalState.nodeInfoModal:
      modalBody = (
        <NodeInfoModal
          nodeInfo={nodeInfo}
        />
      )
      break
    case modalState.invoiceSettled:
      modalBody = <InvoiceSettledModal/>
      break
    case modalState.errorModal:
      modalBody = (
        <ErrorModal
          error={error}
          isWsConnected={isWsConnected}
          wsConnect={wsConnect}
        />
      )
      break
    default:
      modalBody = (
        <PaymentModal
          btcEurPrice={btcEurPrice}
          chosenCoffee={chosenCoffee}
          invoiceValue={invoiceValue}
          paymentRequest={paymentRequest}
        />
      )
  }

  // Check if at least one modal screen should be open
  const {isModalOpen, ...modals} = modalState
  const isOpen = Object.values(modals)
    .some((v) => v === true)

  return (
    <>
      <Modal
        className="app-modal"
        isOpen={isOpen}
        returnFocusAfterClose={false}
        toggle={() => {
          modalDispatch('CLOSE_MODAL')
        }}
      >
        <Row data-testid="app-modal__header" noGutters={true}>
          <Col xs={{size: 2}}>
            <img src={logo} alt="logo"/>
          </Col>
          <Col xs={{size: 10}} className="titleModal">
            <p id="dialogTitle">Lightning Nespresso</p>
          </Col>
        </Row>

        <ModalBody>
          <Container>
            {
              (modalState.paymentModal || modalState.nodeInfoModal)
              && (
                <Row noGutters={true}>
                  <ProgressBar/>
                </Row>
              )
            }
            {modalBody}
          </Container>
        </ModalBody>
      </Modal>
    </>
  )
}
