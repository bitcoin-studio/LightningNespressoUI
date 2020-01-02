import React, {useContext} from 'react'
import enjoy1 from '../assets/enjoy1.gif'
import enjoy2 from '../assets/enjoy2.gif'
import enjoy3 from '../assets/enjoy3.gif'
import {Button} from 'reactstrap'
import {ModalContext} from '../App'
import {useTimeout} from '../hooks'

const images = [enjoy1, enjoy2, enjoy3]
const randomImage = images[Math.floor(Math.random() * images.length)]

export const InvoiceSettledModal: React.FC = () => {

  const [,modalDispatch] = useContext(ModalContext)

  useTimeout(() => {
    modalDispatch('CLOSE_MODAL')
  }, 8000)

  return (
    <div className={'invoice-settled'}>
      <h2>{'Enjoy Your Coffee!'}</h2>
      <img className={'invoice-settle__image'} src={randomImage} alt="enjoy"/>
      <Button
        outline
        color="success"
        onClick={() => {
          modalDispatch('CLOSE_MODAL')
        }}
      >
        {'Close'}
      </Button>
    </div>
  )

}