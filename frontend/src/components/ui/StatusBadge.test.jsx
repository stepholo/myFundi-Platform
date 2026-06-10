import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusBadge from './StatusBadge'

describe('StatusBadge', () => {
  it.each([
    ['requested',   'Submitted'],
    ['broadcasted', 'Finding Tech'],
    ['assigned',    'Assigned'],
    ['in_progress', 'In Progress'],
    ['completed',   'Completed'],
    ['cancelled',   'Cancelled'],
  ])('renders correct label for status "%s"', (status, expectedLabel) => {
    render(<StatusBadge status={status} />)
    expect(screen.getByText(expectedLabel)).toBeInTheDocument()
  })

  it('falls back to the raw status string for unknown values', () => {
    render(<StatusBadge status="unknown_status" />)
    expect(screen.getByText('unknown_status')).toBeInTheDocument()
  })

  it('applies the correct background color for "completed"', () => {
    render(<StatusBadge status="completed" />)
    const badge = screen.getByText('Completed')
    expect(badge).toHaveStyle({ background: '#F0FDF4' })
  })

  it('applies the correct background color for "cancelled"', () => {
    render(<StatusBadge status="cancelled" />)
    const badge = screen.getByText('Cancelled')
    expect(badge).toHaveStyle({ background: '#FEF2F2' })
  })
})
