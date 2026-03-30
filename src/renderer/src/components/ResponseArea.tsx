import Markdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface ResponseAreaProps {
  content: string
  isStreaming: boolean
}

const codeBlockStyle: React.CSSProperties = {
  background: '#111118',
  border: '1px solid #27272a',
  borderRadius: 6,
  padding: '10px 12px',
  fontFamily: 'monospace',
  fontSize: 12,
  margin: '8px 0',
  overflowX: 'auto',
}

const customOneDark = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: '#111118',
    margin: 0,
    padding: 0,
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: '#111118',
  },
}

export function ResponseArea({ content, isStreaming }: ResponseAreaProps): React.JSX.Element {
  return (
    <>
      <div style={{ borderTop: '1px solid rgba(39,39,42,0.6)' }} />
      <div style={{
        padding: '14px 18px',
        color: '#e4e4e7',
        fontSize: 14,
        lineHeight: 1.7,
        overflowY: 'auto',
      }}>
        <Markdown
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '')
              const codeString = String(children).replace(/\n$/, '')

              if (match) {
                return (
                  <div style={codeBlockStyle}>
                    <SyntaxHighlighter
                      style={customOneDark}
                      language={match[1]}
                      PreTag="div"
                    >
                      {codeString}
                    </SyntaxHighlighter>
                  </div>
                )
              }

              return (
                <code
                  style={{
                    background: '#111118',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: 'monospace',
                  }}
                  {...props}
                >
                  {children}
                </code>
              )
            },
            p({ children }) {
              return <p style={{ margin: '0 0 10px 0' }}>{children}</p>
            },
          }}
        >
          {content}
        </Markdown>
        {isStreaming && (
          <span style={{
            display: 'inline-block',
            width: 2,
            height: 16,
            background: '#00d4ff',
            marginLeft: 2,
            verticalAlign: 'middle',
            borderRadius: 1,
            animation: 'cursorBlink 1s step-end infinite',
          }} />
        )}
      </div>
    </>
  )
}
