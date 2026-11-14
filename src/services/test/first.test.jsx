import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('My First React Test', () => {
  it('renders a heading correctly', () => {
    render(<h1>Expense Splitter</h1>)

    expect(
      screen.getByRole('heading', { name: 'Expense Splitter' })
    ).toBeInTheDocument()
  })
})