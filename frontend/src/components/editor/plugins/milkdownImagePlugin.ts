import type { MilkdownPlugin } from '@milkdown/ctx'
import { $prose, $node } from '@milkdown/utils'
import { Plugin, PluginKey } from '@milkdown/prose/state'
import { NodeSelection } from '@milkdown/prose/state'
import type { EditorView } from '@milkdown/prose/view'
import type { Node as ProseMirrorNode } from '@milkdown/prose/model'

// Image resize handle positions
type ResizeHandlePosition = 'nw' | 'ne' | 'sw' | 'se'

interface ResizeState {
  isResizing: boolean
  handle: ResizeHandlePosition | null
  startX: number
  startY: number
  startWidth: number
  startHeight: number
  imageNode: ProseMirrorNode | null
  imagePos: number
}

let resizeState: ResizeState = {
  isResizing: false,
  handle: null,
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0,
  imageNode: null,
  imagePos: -1,
}

// Create resize handle element
const createResizeHandle = (position: ResizeHandlePosition): HTMLElement => {
  const handle = document.createElement('div')
  handle.className = `image-resize-handle image-resize-handle-${position}`
  handle.setAttribute('data-position', position)
  handle.style.cssText = `
    position: absolute;
    width: 8px;
    height: 8px;
    background-color: #007acc;
    border: 2px solid white;
    border-radius: 50%;
    cursor: ${position}-resize;
    z-index: 1000;
    pointer-events: auto;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  `
  return handle
}

// Create image wrapper with resize handles
const createImageWrapper = (view: EditorView, node: ProseMirrorNode, pos: number): HTMLElement => {
  const wrapper = document.createElement('div')
  wrapper.className = 'image-wrapper'
  wrapper.style.cssText = `
    position: relative;
    display: inline-block;
    margin: 8px 0;
  `

  // Create the image element
  const img = document.createElement('img')
  img.src = node.attrs.src || ''
  img.alt = node.attrs.alt || ''
  img.style.cssText = `
    display: block;
    max-width: 100%;
    height: auto;
  `

  // Parse width/height from title attribute if present (format: {width=100 height=50})
  let width = node.attrs.width
  let height = node.attrs.height
  
  if (!width || !height) {
    const title = node.attrs.title || ''
    const sizeMatch = title.match(/\{width=(\d+)(?:\s+height=(\d+))?\}/)
    if (sizeMatch) {
      width = width || parseInt(sizeMatch[1])
      if (sizeMatch[2]) {
        height = height || parseInt(sizeMatch[2])
      }
    }
  }

  // Apply width/height if specified
  if (width) {
    img.style.width = `${width}px`
  }
  if (height) {
    img.style.height = `${height}px`
  }

  wrapper.appendChild(img)

  // Add resize handles when image is selected
  const updateHandles = () => {
    // Remove existing handles
    wrapper.querySelectorAll('.image-resize-handle').forEach(h => h.remove())

    const selection = view.state.selection
    if (selection instanceof NodeSelection && selection.from === pos) {
      const rect = img.getBoundingClientRect()
      const wrapperRect = wrapper.getBoundingClientRect()

      // Create handles at corners
      const positions: ResizeHandlePosition[] = ['nw', 'ne', 'sw', 'se']
      positions.forEach(position => {
        const handle = createResizeHandle(position)
        
        // Position handle at corner
        if (position.includes('n')) {
          handle.style.top = '0px'
        } else {
          handle.style.bottom = '0px'
        }
        if (position.includes('w')) {
          handle.style.left = '0px'
        } else {
          handle.style.right = '0px'
        }

        // Add drag handlers
        handle.addEventListener('mousedown', (e) => {
          e.preventDefault()
          e.stopPropagation()
          
          const imgRect = img.getBoundingClientRect()
          resizeState = {
            isResizing: true,
            handle: position,
            startX: e.clientX,
            startY: e.clientY,
            startWidth: imgRect.width,
            startHeight: imgRect.height,
            imageNode: node,
            imagePos: pos,
          }

          // Prevent text selection during resize
          document.body.style.userSelect = 'none'
          document.body.style.cursor = `${position}-resize`
        })

        wrapper.appendChild(handle)
      })
    }
  }

  // Update handles when selection changes
  const checkSelection = () => {
    updateHandles()
  }

  // Listen for selection changes
  view.dom.addEventListener('selectionchange', checkSelection)
  
  // Also check on click
  wrapper.addEventListener('click', (e) => {
    if (e.target === img || e.target === wrapper) {
      const tr = view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos))
      view.dispatch(tr)
      setTimeout(updateHandles, 0)
    }
  })

  // Cleanup listener on destroy
  const originalDestroy = wrapper.remove
  wrapper.remove = function() {
    view.dom.removeEventListener('selectionchange', checkSelection)
    originalDestroy.call(this)
  }

  return wrapper
}

// Handle mouse move for resizing
const handleMouseMove = (view: EditorView, event: MouseEvent) => {
  if (!resizeState.isResizing || !resizeState.imageNode || resizeState.imagePos === -1) {
    return false
  }

  const deltaX = event.clientX - resizeState.startX
  const deltaY = event.clientY - resizeState.startY

  let newWidth = resizeState.startWidth
  let newHeight = resizeState.startHeight

  // Calculate new dimensions based on handle position
  switch (resizeState.handle) {
    case 'nw':
      newWidth = Math.max(50, resizeState.startWidth - deltaX)
      newHeight = Math.max(50, resizeState.startHeight - deltaY)
      break
    case 'ne':
      newWidth = Math.max(50, resizeState.startWidth + deltaX)
      newHeight = Math.max(50, resizeState.startHeight - deltaY)
      break
    case 'sw':
      newWidth = Math.max(50, resizeState.startWidth - deltaX)
      newHeight = Math.max(50, resizeState.startHeight + deltaY)
      break
    case 'se':
      newWidth = Math.max(50, resizeState.startWidth + deltaX)
      newHeight = Math.max(50, resizeState.startHeight + deltaY)
      break
  }

  // Maintain aspect ratio if Shift is held
  if (event.shiftKey) {
    const aspectRatio = resizeState.startWidth / resizeState.startHeight
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      newHeight = newWidth / aspectRatio
    } else {
      newWidth = newHeight * aspectRatio
    }
  }

  // Update the image node with new dimensions
  // Store dimensions in title attribute as {width=100 height=50} for markdown serialization
  const currentAttrs = resizeState.imageNode.attrs
  const baseTitle = currentAttrs.title || ''
  // Remove existing size info from title
  const cleanTitle = baseTitle.replace(/\{width=\d+(?:\s+height=\d+)?\}/g, '').trim()
  const sizeStr = `{width=${Math.round(newWidth)} height=${Math.round(newHeight)}}`
  const newTitle = cleanTitle ? `${cleanTitle} ${sizeStr}` : sizeStr

  const tr = view.state.tr.setNodeMarkup(resizeState.imagePos, undefined, {
    ...currentAttrs,
    width: Math.round(newWidth),
    height: Math.round(newHeight),
    title: newTitle,
  })

  view.dispatch(tr)
  return true
}

// Handle mouse up to end resizing
const handleMouseUp = () => {
  if (resizeState.isResizing) {
    resizeState.isResizing = false
    resizeState.handle = null
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
  }
  return false
}

// Create the ProseMirror plugin
const createImageResizePlugin = () =>
  new Plugin({
    key: new PluginKey('milkdown-image-resize'),
    props: {
      nodeViews: {
        image: (node: ProseMirrorNode, view: EditorView, getPos: () => number | undefined) => {
          const pos = getPos()
          if (pos === undefined) {
            // Fallback to default image rendering
            const img = document.createElement('img')
            img.src = node.attrs.src || ''
            img.alt = node.attrs.alt || ''
            return {
              dom: img,
              update: (updatedNode: ProseMirrorNode) => {
                if (updatedNode.type.name !== 'image') return false
                img.src = updatedNode.attrs.src || ''
                img.alt = updatedNode.attrs.alt || ''
                if (updatedNode.attrs.width) {
                  img.style.width = `${updatedNode.attrs.width}px`
                }
                if (updatedNode.attrs.height) {
                  img.style.height = `${updatedNode.attrs.height}px`
                }
                return true
              },
            }
          }

          const wrapper = createImageWrapper(view, node, pos)

          return {
            dom: wrapper,
            update: (updatedNode: ProseMirrorNode) => {
              if (updatedNode.type.name !== 'image') return false
              
              const img = wrapper.querySelector('img')
              if (img) {
                img.src = updatedNode.attrs.src || ''
                img.alt = updatedNode.attrs.alt || ''
                
                // Parse width/height from title if not in attrs
                let width = updatedNode.attrs.width
                let height = updatedNode.attrs.height
                
                if (!width || !height) {
                  const title = updatedNode.attrs.title || ''
                  const sizeMatch = title.match(/\{width=(\d+)(?:\s+height=(\d+))?\}/)
                  if (sizeMatch) {
                    width = width || parseInt(sizeMatch[1])
                    if (sizeMatch[2]) {
                      height = height || parseInt(sizeMatch[2])
                    }
                  }
                }
                
                // Update dimensions
                img.style.width = width ? `${width}px` : ''
                img.style.height = height ? `${height}px` : ''
              }
              
              // Update handles if selected
              setTimeout(() => {
                const selection = view.state.selection
                if (selection instanceof NodeSelection && selection.from === pos) {
                  wrapper.querySelectorAll('.image-resize-handle').forEach(h => h.remove())
                  const img = wrapper.querySelector('img')
                  if (img) {
                    const positions: ResizeHandlePosition[] = ['nw', 'ne', 'sw', 'se']
                    positions.forEach(position => {
                      const handle = createResizeHandle(position)
                      if (position.includes('n')) {
                        handle.style.top = '0px'
                      } else {
                        handle.style.bottom = '0px'
                      }
                      if (position.includes('w')) {
                        handle.style.left = '0px'
                      } else {
                        handle.style.right = '0px'
                      }
                      handle.addEventListener('mousedown', (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const imgRect = img.getBoundingClientRect()
                        resizeState = {
                          isResizing: true,
                          handle: position,
                          startX: e.clientX,
                          startY: e.clientY,
                          startWidth: imgRect.width,
                          startHeight: imgRect.height,
                          imageNode: updatedNode,
                          imagePos: pos,
                        }
                        document.body.style.userSelect = 'none'
                        document.body.style.cursor = `${position}-resize`
                      })
                      wrapper.appendChild(handle)
                    })
                  }
                }
              }, 0)
              
              return true
            },
            selectNode: () => {
              wrapper.classList.add('ProseMirror-selectednode')
              // Trigger handle update
              setTimeout(() => {
                const img = wrapper.querySelector('img')
                if (img) {
                  wrapper.querySelectorAll('.image-resize-handle').forEach(h => h.remove())
                  const positions: ResizeHandlePosition[] = ['nw', 'ne', 'sw', 'se']
                  positions.forEach(position => {
                    const handle = createResizeHandle(position)
                    if (position.includes('n')) {
                      handle.style.top = '0px'
                    } else {
                      handle.style.bottom = '0px'
                    }
                    if (position.includes('w')) {
                      handle.style.left = '0px'
                    } else {
                      handle.style.right = '0px'
                    }
                    handle.addEventListener('mousedown', (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const imgRect = img.getBoundingClientRect()
                      resizeState = {
                        isResizing: true,
                        handle: position,
                        startX: e.clientX,
                        startY: e.clientY,
                        startWidth: imgRect.width,
                        startHeight: imgRect.height,
                        imageNode: node,
                        imagePos: pos,
                      }
                      document.body.style.userSelect = 'none'
                      document.body.style.cursor = `${position}-resize`
                    })
                    wrapper.appendChild(handle)
                  })
                }
              }, 0)
            },
            deselectNode: () => {
              wrapper.classList.remove('ProseMirror-selectednode')
              wrapper.querySelectorAll('.image-resize-handle').forEach(h => h.remove())
            },
          }
        },
      },
      handleDOMEvents: {
        mousemove: (view: EditorView, event: MouseEvent) => {
          if (handleMouseMove(view, event)) {
            return true
          }
          return false
        },
        mouseup: () => {
          return handleMouseUp()
        },
      },
    },
  })

export const milkdownImagePlugin: MilkdownPlugin = $prose(() => createImageResizePlugin())