import React from 'react'

import { sizeToObject } from '@/utils/size'
import dynamic from 'next/dynamic'
import Callout from '@/components/MDX/Callout'

const Pen = dynamic(() => import('@/components/Pen'), { ssr: false })

function index() {
  const layoutProps = {
    initialLayout: 'vertical',
    initialResponsiveSize: false,
    initialActiveTab: 'html',
  }
  return (
    <Pen
      initialContent={{
        html: '# Hello,world',
        css: '',
        config: '',
      }}
      initialPath={''}
      {...layoutProps}
    />
  )
}

export default index
