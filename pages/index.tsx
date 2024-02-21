import React from 'react'
import dynamic from 'next/dynamic'

const Pen = dynamic(() => import('@/components/Pen'), { ssr: false })

function index() {
  const layoutProps = {
    initialLayout: 'vertical',
    initialActiveTab: 'html',
  }
  return <Pen initialContent="# Hello,World" {...layoutProps} />
}

export default index
