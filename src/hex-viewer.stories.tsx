import type { Meta, StoryObj } from '@storybook/react'

import { HexViewer } from './hex-viewer'

const meta = {
  title: 'UI/HexViewer',
  component: HexViewer,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    hexString: {
      control: 'text',
      description: '16進数文字列(2文字=1バイト)',
    },
    showDebugPanel: {
      control: 'boolean',
      description: 'デバッグパネルを表示するかどうか',
    },
    editable: {
      control: 'boolean',
      description: '編集可能かどうか',
    },
    className: {
      control: 'text',
      description: '追加のCSSクラス',
    },
    fontFamily: {
      control: 'text',
      description: 'フォントファミリー (例: "JetBrains Mono", monospace)',
    },
  },
} satisfies Meta<typeof HexViewer>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    showDebugPanel: true,
    editable: true,
  },
}

export const ReadOnly: Story = {
  args: {
    hexString: '48656c6c6f2c20576f726c642120f09f918b',
    editable: false,
    showDebugPanel: false,
  },
}

export const CustomStyle: Story = {
  args: {
    hexString: 'cafebabedeadbeef',
    className: 'custom-hex-viewer-style',
    showDebugPanel: false,
  },
  decorators: [
    (Story) => (
      <div style={{ height: '400px', border: '4px solid red', margin: '2rem' }}>
        <Story />
      </div>
    ),
  ],
}

export const AsciiText: Story = {
  args: {
    hexString: '48656c6c6f2c20576f726c642120f09f918b',
  },
}

export const TlsClientHello: Story = {
  args: {
    hexString:
      '160301002a010000260303000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f00000200ff0100',
  },
}

export const Sequential: Story = {
  args: {
    hexString: Array.from({ length: 64 }, (_, i) =>
      i.toString(16).padStart(2, '0'),
    ).join(''),
  },
}
