# react-hex-viewer

A React component to display and edit hex data.

## Install

```sh
npm install react-hex-viewer
```

or

```sh
yarn add react-hex-viewer
```

or

```sh
pnpm add react-hex-viewer
```

## Setup

In order to apply the default styling, you must import the CSS file provided by the library.

```jsx
import 'react-hex-viewer/dist/style.css'
```

## Use

```jsx
import React from 'react'
import { HexViewer } from 'react-hex-viewer'
import 'react-hex-viewer/dist/style.css'

export default () => {
  return (
    <HexViewer
      hexString="48656c6c6f2c20576f726c642120f09f918b"
      fontFamily='"JetBrains Mono", monospace'
      editable={true}
      showDebugPanel={true}
    />
  )
}
```

## Props

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `hexString` | `string` | `'00000000000000000000000000000000'` | The hex string to display (2 characters = 1 byte). |
| `fontFamily` | `string` | `undefined` | The font family to use for the hex viewer. |
| `showDebugPanel` | `boolean` | `true` | Whether to show the debug panel on the right side. |
| `editable` | `boolean` | `true` | Whether the hex values can be edited. |
| `className` | `string` | `''` | Additional CSS class for the root container. |
