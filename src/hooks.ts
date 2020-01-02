//@ts-nocheck
// Credits: Dan Abramov
// https://overreacted.io/making-setinterval-declarative-with-react-hooks/
// useInterval Hook sets up an interval and clears it after unmounting.
// It’s a combo of setInterval and clearInterval tied to the component lifecycle.

import {useEffect, useRef} from 'react'

export function useInterval(callback, delay) {
  const savedCallback = useRef(null)

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // Set up the interval.
  useEffect(() => {
    function tick() {
      savedCallback.current()
    }

    if (delay !== null) {
      let id = setInterval(tick, delay)
      return () => clearInterval(id)
    }
  }, [delay])
}


export function useTimeout(callback, delay) {
  const savedCallback = useRef(null)

  // Remember the latest callback.
  useEffect(
    () => {
      savedCallback.current = callback
    },
    [callback],
  )

  // Set up the timeout.
  useEffect(() => {
    function tick() {
      savedCallback.current()
    }

    if (delay !== null) {
      let id = setTimeout(tick, delay)
      return () => clearTimeout(id)
    }
  }, [delay])
}