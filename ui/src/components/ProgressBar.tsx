import React, {useContext, useState} from 'react'
import log from 'loglevel'
import {Col, Progress} from 'reactstrap'
import {ModalContext} from '../App'
import {useInterval} from '../hooks'

/**
 * Progress Bar
 * Increase by 5 every 5 seconds during 5 minutes (300 seconds)
 */
export const ProgressBar: React.FC = () => {
  const [, modalDispatch] = useContext(ModalContext)
  const [progress, setProgress] = useState(0)

  let seconds: number = 0
  useInterval(() => {
    seconds += 1
    setProgress((prevState) => prevState + Number((seconds / 3).toFixed(0)))
    log.debug(`Waiting bar ${progress} %`)
    if (progress >= 100) {
      modalDispatch('CLOSE_MODAL')
    }
  }, 1000)

  return (
    <Col xs={{size: 12}} className="progressBar monospace">
      <Progress value={progress}>
        <span className="progress-bar__text">Awaiting Payment...</span>
      </Progress>
    </Col>
  )
}
