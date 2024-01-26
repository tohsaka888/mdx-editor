import React from 'react'

type Props = {
  children: React.ReactNode
}

function Callout({ children }: Props) {
  return <div style={{ color: 'red' }}>{children}</div>
}

export default Callout
