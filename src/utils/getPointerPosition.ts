/**
 * The function `getPointerPosition` returns the x and y coordinates of a touch or mouse event.
 * @param {TouchEvent | MouseEvent} event - The `event` parameter can be either a `TouchEvent` or a
 * `MouseEvent`.
 * @returns an object with properties `x` and `y`, representing the coordinates of the pointer
 * position.
 */
export function getPointerPosition(event: TouchEvent | MouseEvent) {
  const { targetTouches } = event as TouchEvent
  const { clientX, clientY } = event as MouseEvent

  if (targetTouches?.length === 1) {
    const { clientX: touchX, clientY: touchY } = targetTouches[0]
    return { x: touchX, y: touchY }
  }

  return { x: clientX, y: clientY }
}
