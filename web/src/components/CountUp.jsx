import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'framer-motion'

/** Animates a number from its previous value to the new one when the selection changes. */
export default function CountUp({ value, format, duration = 0.6 }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(value)
  const prev = useRef(value)

  useEffect(() => {
    if (value == null || prev.current == null || reduce) {
      setShown(value)
      prev.current = value
      return
    }
    const controls = animate(prev.current, value, {
      duration,
      ease: [0.2, 0.7, 0.2, 1],
      onUpdate: setShown,
    })
    prev.current = value
    return () => controls.stop()
  }, [value, duration, reduce])

  return <>{format(value == null ? null : shown)}</>
}
