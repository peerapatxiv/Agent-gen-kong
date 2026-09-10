import { describe, expect, it } from 'vitest'
import { generateFormatAName, generateFormatBName, pascalSegment } from './nameGenerator'

describe('generateFormatAName', () => {
  it('uppercases only the version segment and preserves casing elsewhere', () => {
    expect(generateFormatAName('/v2/profiles/personalized-settings/ext')).toBe('V2-profiles-personalized-settings-ext-routes')
  })

  it('preserves businessAndMarital casing', () => {
    expect(generateFormatAName('/v1/lending/request-info/commercial/businessAndMarital/inquiry/ext')).toBe(
      'V1-lending-request-info-commercial-businessAndMarital-inquiry-ext-routes',
    )
  })

  it('handles a missing version segment by leaving casing untouched', () => {
    expect(generateFormatAName('/fasteasy-login')).toBe('fasteasy-login-routes')
  })
})

describe('pascalSegment', () => {
  it('uppercases the first character and lowercases the rest', () => {
    expect(pascalSegment('mailingAddress')).toBe('Mailingaddress')
    expect(pascalSegment('v1')).toBe('V1')
    expect(pascalSegment('ext')).toBe('Ext')
  })
})

describe('generateFormatBName', () => {
  it('PascalCases every segment and appends the DECK_ENV suffix', () => {
    expect(generateFormatBName('/v1/addresses/mailingAddress/confirmation/inquiry/ext')).toBe(
      'V1AddressesMailingaddressConfirmationInquiryExt-${{ env "DECK_ENV" }}',
    )
  })

  it('lowercases the remainder of hyphenated segments', () => {
    expect(generateFormatBName('/v2/profiles/personalized-settings/ext')).toBe('V2ProfilesPersonalized-settingsExt-${{ env "DECK_ENV" }}')
  })

  it('matches the lending worked example', () => {
    expect(generateFormatBName('/v1/lending/referral/verification/ext')).toBe('V1LendingReferralVerificationExt-${{ env "DECK_ENV" }}')
  })
})
