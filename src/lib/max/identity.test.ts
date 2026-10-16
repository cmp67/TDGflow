import { describe, it, expect } from 'vitest'
import { brPhoneVariants } from './identity'

describe('brPhoneVariants', () => {
  it('celular BR sem o 9 ganha a variante com 9, e vice-versa; fixo e estrangeiro não mudam', () => {
    expect(brPhoneVariants('555181477111')).toEqual(['555181477111', '5551981477111'])
    expect(brPhoneVariants('5551981477111')).toEqual(['5551981477111', '555181477111'])
    expect(brPhoneVariants('551133334444')).toEqual(['551133334444', '551133334444'])
    expect(brPhoneVariants('351912345678')).toEqual(['351912345678', '351912345678'])
  })
})
