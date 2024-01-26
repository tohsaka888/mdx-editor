import React from 'react'
import * as runtime from 'react/jsx-runtime'
import { compile, nodeTypes, run } from '@mdx-js/mdx'
import { VFile } from 'vfile'
import { VFileMessage } from 'vfile-message'
import remarkGfm from 'remark-gfm'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import rehypePrismPlus from 'rehype-prism-plus'
import rehypeMermaid from 'rehype-mermaid'
import remarkToc from 'remark-toc'
import ReactDOMServer from 'react-dom/server'
import { MDXComponents } from '../components/MDX/MDXComponents'
import rehypeDivToSection, {
  rehypeAddLineNumbers,
} from '../components/utils/rehype-div'
import { rehypeCodeTitle } from '../components/utils/rehype-code-title'
import reHypeLinkFoot from '../components/utils/rehype-link-foot'
import { PluggableList } from '@mdx-js/mdx/lib/core'

export const Context = React.createContext({ isMac: true, codeTheme: '' })

type CompileMdxProps = {
  mdx: string
  isMac: boolean
  codeTheme: string
  formatMarkdown: boolean
}

export const compileMdx = async ({
  mdx,
  isMac,
  codeTheme = '',
  formatMarkdown = false,
}: CompileMdxProps) => {
  let err: { message: string; file: string } | null = null
  let html = null
  const remarkPlugins: PluggableList = []

  remarkPlugins.push(remarkGfm)
  remarkPlugins.push(remarkFrontmatter)
  remarkPlugins.push(remarkMath)
  // remarkPlugins.push(remarkCodeTitle)
  remarkPlugins.push(() =>
    remarkToc({
      heading: '目录|toc|table[ -]of[ -]contents?',
      maxDepth: 2,
    })
  )

  //remarkPlugins.push(capture('mdast'))

  const file = new VFile({
    basename: formatMarkdown ? 'example.md' : 'example.mdx',
    value: mdx,
  })
  try {
    await compile(file, {
      development: false,
      outputFormat: 'function-body',
      remarkPlugins,
      rehypePlugins: [
        [rehypeRaw, { passThrough: nodeTypes }],
        rehypeAddLineNumbers,
        rehypeDivToSection,
        reHypeLinkFoot,
        // @ts-ignore
        rehypeKatex,
        [rehypeMermaid, { strategy: 'img-svg' }],
        [rehypePrismPlus, { ignoreMissing: true, defaultLanguage: 'js' }],
        [rehypeCodeTitle, { isMac }],
      ],
    })
    // @ts-ignore
    const { default: Content } = await run(String(file), {
      ...runtime,
      baseUrl: window.location.href,
    })
    html = ReactDOMServer.renderToString(
      <Context.Provider value={{ isMac, codeTheme }}>
        <section className={codeTheme}>
          <Content components={{ ...MDXComponents }} />
        </section>
      </Context.Provider>
    )
  } catch (error) {
    const message =
      error instanceof VFileMessage ? error : new VFileMessage(error)
    message.fatal = true
    if (!file.messages.includes(message)) {
      file.message(message)
    }

    let errorMessage = file.messages[0].message
    err = {
      message: errorMessage,
      file: 'MDX',
    }
  }

  return {
    err,
    html,
  }
}
