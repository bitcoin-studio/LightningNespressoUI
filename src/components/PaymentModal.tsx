import React, {useCallback, useContext, useState} from 'react'
import {Button, Col, Row} from 'reactstrap'
import copy from '../assets/copy.svg'
import QRCode from 'qrcode.react'
import {log} from '../helpers'
import {ModalContext} from '../App'
import {ProgressBar} from './ProgressBar'

type Props = Payment

export const PaymentModal: React.FC<Props> = (
  {
    btcEurPrice,
    chosenCoffee,
    invoiceValue,
    paymentRequest,
  }) => {

  const [,modalDispatch] = useContext(ModalContext)

  /**
   * Used to toggle CSS class for 1 second
   */
  const [isCopyLinkActive, setIsCopyLinkActive] = useState(false)
  const [isOpenWalletLinkActive, setIsOpenWalletLinkActive] = useState(false)
  //
  const activateOpenWalletLink = useCallback(() => {
    setIsOpenWalletLinkActive(true)
    setTimeout(() => {
      setIsOpenWalletLinkActive(false)
    }, 1000)
  }, [setIsOpenWalletLinkActive])
  const activateCopyLink = useCallback(() => {
    setIsCopyLinkActive(true)
    setTimeout(() => {
      setIsCopyLinkActive(false)
    }, 1000)
  }, [setIsCopyLinkActive])

  /**
   * Copy Invoice To Clipboard
   */
  const setClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text)
      .then(function () {
        log('Invoice copied to clipboard')
      })
      .catch((err) => {
        console.error('Invoice not copied to clipboard', err)
      })
  }, [])


  return (
    <>
      <Row noGutters={true}>
        <ProgressBar/>
      </Row>
      <Row noGutters={true} className={'invoiceInfo'}>
        <Col xs={{size: 6}} className={'invoiceInfo-col1'}>
          <p>{chosenCoffee?.name}</p>
        </Col>
        {
          process.env.REACT_APP_CURRENCY === '€' ? (
            <Col xs={{size: 6}} className={'invoiceInfo-col2'}>
              <p>{`${invoiceValue} Sats (${process.env.REACT_APP_PRICE} EUR)`}</p>
              <p>{`1 BTC = ${btcEurPrice} € (EUR)`}</p>
            </Col>
          ) : (
            <></>
          )
        }

      </Row>
      <Row noGutters={true}>
        <Col xs={{size: 6, offset: 3}}>
          <div className={'qrcodeWrapper'}>
            <QRCode
              name={'payment request'}
              value={paymentRequest ? paymentRequest.toUpperCase() : ''}
              style={{display: 'block', width: '100%', height: 'auto'}}
            />
          </div>
        </Col>
      </Row>
      <Row noGutters={true}>
        <Col xs={{size: 12}}>
          <h6>{'BOLT 11 INVOICE'}</h6>
          <p className={'monospace'}>
            {paymentRequest}
          </p>
        </Col>
      </Row>

      <Row noGutters={true}>
        <a
          className={`link monospace ${isOpenWalletLinkActive ? 'actionLinksClicked' : ''}`}
          href={`lightning:${paymentRequest}`}
          id={'openWithWallet'}
          onClick={() => activateOpenWalletLink()}
        >
          {'OPEN WITH YOUR WALLET'}
        </a>
        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */ /* TODO */}
        <a
          className={`link monospace ${isCopyLinkActive ? 'actionLinksClicked' : ''}`}
          id="copyIcon"
          onClick={() => {
            setClipboard(paymentRequest)
            activateCopyLink()
          }}
        >
          <img src={copy} alt="copy icon"/>
          {'COPY'}
        </a>
      </Row>

      <Row noGutters={true}>
        <Col xs={{size: 12}}>
          <Button
            outline
            color="warning"
            onClick={() => {
              modalDispatch('CLOSE_MODAL')
            }}
          >
            {'Cancel Payment'}
          </Button>
        </Col>
      </Row>
      <Row noGutters={true}>
        <Col xs={{size: 12}}>
          <Button
            outline
            color="info"
            onClick={() => modalDispatch('OPEN_NODE_INFO_MODAL')}
          >
            {'Node Info'}
          </Button>
        </Col>
      </Row>
    </>
  )
}