import React, {useContext} from 'react'
import {Button, Col, Row} from 'reactstrap'
import QRCode from 'qrcode.react'
import {ModalContext} from '../App'

type Props = {
  nodeInfo: App['nodeInfo']
}

export const NodeInfoModal: React.FC<Props> = ({nodeInfo}) => {

  const [, modalDispatch] = useContext(ModalContext)

  return (
    <>
      <Row noGutters={true}>
        <Col xs={{size: 6, offset: 3}}>
          <div className={'qrcodeWrapper'}>
            <QRCode
              name={'payment request'}
              value={`${nodeInfo?.uris[0]}`}
              style={{display: 'block', width: '100%', height: 'auto'}}
            />
          </div>
        </Col>
      </Row>
      <Row noGutters={true}>
        <Col xs={{size: 12}}>
          <h6>{'Node ID'}</h6>
          <p className={'monospace'}>
            {`${nodeInfo?.uris[0]}`}
          </p>
        </Col>
      </Row>
      <Row noGutters={true}>
        <Col xs={{size: 12}}>
          <Button className={'nodeInfo btn'} outline color="info"
                  onClick={() => modalDispatch('OPEN_PAYMENT_MODAL')}>
            {'Go Back'}
          </Button>
        </Col>
      </Row>
    </>
  )
}