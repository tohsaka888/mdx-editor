import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  startTransition,
} from 'react'
import { useIsomorphicLayoutEffect } from '../hooks/useIsomorphicLayoutEffect'
import SplitPane, { Size } from 'react-split-pane'
import Count from 'word-count'
import useMedia from 'react-use/lib/useMedia'
import useLocalStorage from 'react-use/lib/useLocalStorage'
import { useDebouncedState } from '../hooks/useDebouncedState'
import { Preview } from './Preview'
import { ErrorOverlay } from './ErrorOverlay'
import Router from 'next/router'
import { Header } from './Header'
import { Button } from '@/components/ui/button'
import { Share } from './Share'
import { CopyBtn } from './Copy'
import ThemeDropdown from './ThemeDropdown'
import { themes } from '../css/markdown-body'
import { compileMdx } from '../hooks/compileMdx'
import { baseCss, codeThemes } from '../css/mdx'
import { PenSquare, Columns, MonitorSmartphone, Square } from 'lucide-react'
import { Editor as MonacoEditor } from '@monaco-editor/react'

import clsx from 'clsx'

const HEADER_HEIGHT = 60 - 1
const TAB_BAR_HEIGHT = 40
const RESIZER_SIZE = 1
const DEFAULT_RESPONSIVE_SIZE = { width: 360, height: 720 }

if (typeof window !== 'undefined') {
  require('../workers/subworkers')
}

const defaultTheme = {
  markdownTheme: 'default',
  codeTheme: 'default',
  isMac: true,
  formatMarkdown: false,
}

function handleUnload(e) {
  e.preventDefault()
  e.returnValue = ''
}

type Props = {
  initialContent: string
  initialPath?: string
  initialLayout: string
  initialResponsiveSize?: {
    width: string | number
    height: string | number
  }
  initialActiveTab?: string
}

export default function Pen({
  initialContent,
  initialPath,
  initialLayout,
  initialResponsiveSize,
  initialActiveTab,
}: Props) {
  const htmlRef = useRef()
  const previewRef = useRef<any>(null!)
  const [size, setSize] = useState<{
    percentage: number
    layout: string
    current?: any
    min?: Size
    max?: Size
  }>({ percentage: 0.5, layout: initialLayout })
  const [resizing, setResizing] = useState(false)
  const [activeTab, setActiveTab] = useState(initialActiveTab)
  const [activePane, setActivePane] = useState(
    initialLayout === 'preview' ? 'preview' : 'editor'
  )
  const isLg = useMedia('(min-width: 1024px)')
  const [dirty, setDirty] = useState(false)
  const [renderEditor, setRenderEditor] = useState(false)
  const [error, setError, setErrorImmediate, cancelSetError] =
    useDebouncedState(undefined, 1000)
  const editorRef = useRef<any>(null!)
  const [responsiveDesignMode, setResponsiveDesignMode] = useState(
    initialResponsiveSize ? true : false
  )
  const [shouldClearOnUpdate, setShouldClearOnUpdate] = useState(true)
  const [theme, setTheme] = useLocalStorage('editor-theme', defaultTheme)
  const [responsiveSize, setResponsiveSize] = useState(
    initialResponsiveSize || DEFAULT_RESPONSIVE_SIZE
  )

  useEffect(() => {
    setDirty(true)
  }, [
    activeTab,
    size.layout,
    responsiveSize?.width,
    responsiveSize?.height,
    responsiveDesignMode,
  ])

  useEffect(() => {
    if (dirty) {
      window.addEventListener('beforeunload', handleUnload)
      return () => {
        window.removeEventListener('beforeunload', handleUnload)
      }
    }
  }, [dirty])

  useEffect(() => {
    setDirty(false)
    if (
      shouldClearOnUpdate &&
      previewRef.current &&
      previewRef.current.contentWindow
    ) {
      previewRef.current.contentWindow.postMessage(
        {
          clear: true,
        },
        '*'
      )
      inject({ html: initialContent })
      compileNow(initialContent)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent])

  const inject = useCallback(async (content) => {
    previewRef.current.contentWindow.postMessage(content, '*')
  }, [])

  const compileNow = useCallback(
    async function (content: string) {
      cancelSetError()
      localStorage.setItem('content', JSON.stringify(content))
      compileMdx(
        theme
          ? {
              mdx: content,
              ...theme,
            }
          : {
              mdx: content,
              ...defaultTheme,
            }
      ).then((res) => {
        if (res.err) {
          setError(res.err)
        } else {
          setErrorImmediate()
        }
        if (res.html) {
          const { html } = res
          if (html) {
            //编译后的html保存到ref 中
            htmlRef.current = html
            inject({
              css:
                baseCss +
                themes[theme?.markdownTheme].css +
                codeThemes[theme?.codeTheme].css,
              html,
              codeTheme: theme?.codeTheme,
            })
          }
        }
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps 123
    [theme]
  )

  useIsomorphicLayoutEffect(() => {
    function updateSize() {
      setSize((size) => {
        const windowSize =
          size.layout === 'horizontal'
            ? document.documentElement.clientHeight - HEADER_HEIGHT
            : document.documentElement.clientWidth

        if (isLg && size.layout !== 'preview') {
          const min = size.layout === 'vertical' ? 320 : 320 + TAB_BAR_HEIGHT
          const max =
            size.layout === 'vertical'
              ? windowSize - min - RESIZER_SIZE
              : windowSize - 320 - RESIZER_SIZE

          return {
            ...size,
            min,
            max,
            current:
              size.layout === 'editor'
                ? document.documentElement.clientWidth
                : Math.max(
                    Math.min(Math.round(windowSize * size.percentage), max),
                    min
                  ),
          }
        }

        const newSize =
          (isLg && size.layout !== 'preview') ||
          (!isLg && activePane === 'editor')
            ? windowSize
            : 0

        return {
          ...size,
          current: newSize,
          min: newSize,
          max: newSize,
        }
      })
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => {
      window.removeEventListener('resize', updateSize)
    }
  }, [isLg, size.layout, activePane])

  useEffect(() => {
    if (isLg) {
      if (size.layout !== 'preview') {
        setRenderEditor(true)
      }
    } else if (activePane === 'editor') {
      setRenderEditor(true)
    }
  }, [activePane, isLg, size.layout])

  useEffect(() => {
    if (resizing) {
      document.body.classList.add(
        size.layout === 'vertical' ? 'cursor-ew-resize' : 'cursor-ns-resize'
      )
    } else {
      document.body.classList.remove(
        size.layout === 'vertical' ? 'cursor-ew-resize' : 'cursor-ns-resize'
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resizing])

  const updateCurrentSize = useCallback((newSize) => {
    setSize((size) => {
      const windowSize =
        size.layout === 'vertical'
          ? document.documentElement.clientWidth
          : document.documentElement.clientHeight - HEADER_HEIGHT
      const percentage = newSize / windowSize
      return {
        ...size,
        current: newSize,
        percentage:
          percentage === 1 || percentage === 0 ? size.percentage : percentage,
      }
    })
  }, [])

  const onShareStart = useCallback(() => {
    setDirty(false)
  }, [])

  const onShareComplete = useCallback(
    (path) => {
      setShouldClearOnUpdate(false)
      Router.push(path).then(() => {
        setShouldClearOnUpdate(true)
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [size.layout, responsiveDesignMode, responsiveSize]
  )

  useEffect(() => {
    if (editorRef.current) {
      compileNow(editorRef.current.getValue('html'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme])

  // initial state resets
  useEffect(() => {
    setSize((size) => ({ ...size, layout: initialLayout }))
  }, [initialLayout])
  useEffect(() => {
    setResponsiveDesignMode(Boolean(initialResponsiveSize))
    setResponsiveSize(initialResponsiveSize || DEFAULT_RESPONSIVE_SIZE)
  }, [initialResponsiveSize])
  useEffect(() => {
    setActiveTab(initialActiveTab)
  }, [initialActiveTab])

  return (
    <>
      <Header
        rightbtn={
          <>
            <ThemeDropdown
              value={theme}
              onChange={setTheme}
              themes={themes}
              codeThemes={codeThemes}
            />

            <div className="hidden lg:flex items-center ml-2 rounded-md bg-secondary border">
              <Button
                className="border-0 rounded-none"
                size="icon"
                variant="secondary"
                onClick={() =>
                  setSize((size) => ({ ...size, layout: 'vertical' }))
                }
              >
                <Columns
                  className={clsx('w-5 h-5', {
                    'stroke-primary fill-sky-100 dark:fill-sky-400/50':
                      size.layout === 'vertical',
                  })}
                />
              </Button>
              <Button
                className="border-0 rounded-none"
                size="icon"
                variant="secondary"
                onClick={() =>
                  setSize((size) => ({
                    ...size,
                    layout: 'editor',
                  }))
                }
              >
                <PenSquare
                  className={clsx('w-5 h-5', {
                    'stroke-primary fill-sky-100 dark:fill-sky-400/50':
                      size.layout === 'editor',
                  })}
                />
              </Button>
              <Button
                className="border-0 rounded-none"
                size="icon"
                variant="secondary"
                onClick={() =>
                  setSize((size) => ({ ...size, layout: 'preview' }))
                }
              >
                <Square
                  className={clsx('w-5 h-5', {
                    'stroke-primary fill-sky-100 dark:fill-sky-400/50':
                      size.layout === 'preview',
                  })}
                />
              </Button>
              <Button
                className="border-0 rounded-none"
                size="icon"
                variant="secondary"
                onClick={() => setResponsiveDesignMode(!responsiveDesignMode)}
              >
                <MonitorSmartphone
                  className={clsx('w-5 h-5', {
                    'stroke-primary fill-sky-100 dark:fill-sky-400/50':
                      responsiveDesignMode,
                  })}
                />
              </Button>
            </div>
          </>
        }
      >
        <div className="hidden sm:flex space-x-2">
          <Share
            editorRef={editorRef}
            onShareStart={onShareStart}
            onShareComplete={onShareComplete}
            dirty={dirty}
            initialPath={initialPath}
            layout={size.layout}
            responsiveSize={responsiveDesignMode ? responsiveSize : undefined}
            activeTab={activeTab}
          />
          <CopyBtn
            htmlRef={htmlRef}
            baseCss={
              baseCss +
              themes[theme?.markdownTheme].css +
              codeThemes[theme?.codeTheme].css
            }
            editorRef={editorRef}
            previewRef={previewRef}
          />
        </div>
      </Header>
      <main className="flex-auto relative border-t border-gray-200 dark:border-gray-800">
        {initialContent && typeof size.current !== 'undefined' ? (
          <>
            {/* @ts-ignore */}
            <SplitPane
              split={size.layout === 'horizontal' ? 'horizontal' : 'vertical'}
              minSize={size.min}
              maxSize={size.max}
              size={size.current}
              onChange={updateCurrentSize}
              paneStyle={{ marginTop: -1 }}
              pane1Style={{ display: 'flex', flexDirection: 'column' }}
              onDragStarted={() => setResizing(true)}
              onDragFinished={() => setResizing(false)}
              allowResize={isLg && size.layout !== 'preview'}
              style={{ height: 'calc(100vh - 68px)' }}
              resizerClassName={
                isLg && size.layout !== 'preview'
                  ? 'Resizer'
                  : 'Resizer-collapsed'
              }
            >
              {renderEditor && (
                // @ts-ignore
                // <Editor
                //   editorRef={(ref) => (editorRef.current = ref)}
                //   initialContent={initialContent}
                //   onChange={onChange}
                //   onScroll={(line) => {
                //     inject({ line })
                //   }}
                //   activeTab={activeTab}
                // />
                <MonacoEditor
                  height={'100vh'}
                  defaultValue={initialContent}
                  language="mdx"
                  onMount={(editor) => {
                    editorRef.current = editor
                    editor.onDidScrollChange((e) => {
                      console.log(e)
                    })
                  }}
                  onChange={(md) => {
                    setDirty(true)
                    startTransition(() => {
                      compileNow(md!)
                    })
                  }}
                />
              )}

              <Preview
                ref={previewRef}
                // @ts-ignore
                responsiveDesignMode={
                  size.layout !== 'editor' && isLg && responsiveDesignMode
                }
                responsiveSize={responsiveSize}
                onChangeResponsiveSize={setResponsiveSize}
                iframeClassName={resizing ? 'pointer-events-none' : ''}
                onLoad={() => {
                  inject({
                    html: initialContent,
                  })
                  compileNow(initialContent)
                }}
              />
              <ErrorOverlay value={theme} onChange={setTheme} error={error} />
            </SplitPane>
          </>
        ) : null}
      </main>
    </>
  )
}
