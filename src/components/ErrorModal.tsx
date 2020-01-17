import React, {useContext} from 'react'
import {Alert, Button} from 'reactstrap'
import {ModalContext} from '../App'

type Props = {
  error: App['error']
  isWsConnected: App['isWsConnected']
  wsConnect: () => void
}

/**
 * Display all errors in a modal
 */
export const ErrorModal: React.FC<Props> = ({error, isWsConnected, wsConnect}) => {
  const [, modalDispatch] = useContext(ModalContext)

  return (
    <Alert className="error-modal" color="danger">
      <h4 className="alert-heading">Something went wrong!</h4>
      <p className="error-modal__message">
        {error}
      </p>

      <Button
        block={true}
        outline={true}
        color="danger"
        onClick={() => {
          wsConnect()
          if (isWsConnected) {
            modalDispatch('CLOSE_MODAL')
          }
        }}
      >
        Try to reconnect
      </Button>

      <Button
        block={true}
        outline={true}
        color="danger"
        onClick={() => modalDispatch('CLOSE_MODAL')}
      >
        Close
      </Button>
    </Alert>
  )
}
