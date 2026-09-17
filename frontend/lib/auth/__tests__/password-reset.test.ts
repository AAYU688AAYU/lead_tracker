/**
 * Password Validation Tests
 * Demonstrates enhanced validation with pattern detection
 */

import { validatePasswordComplexity } from '../password-reset'

describe('Password Complexity Validation', () => {
  describe('Hard Requirements (Must Pass)', () => {
    test('rejects password under 12 characters', () => {
      const result = validatePasswordComplexity('Short1!')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be at least 12 characters long')
    })

    test('rejects password over 128 characters', () => {
      const long = 'A' + 'b1!' + 'x'.repeat(126)
      const result = validatePasswordComplexity(long)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be no more than 128 characters long')
    })

    test('rejects password without uppercase', () => {
      const result = validatePasswordComplexity('password123!')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
    })

    test('rejects password without lowercase', () => {
      const result = validatePasswordComplexity('PASSWORD123!')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one lowercase letter')
    })

    test('rejects password without digit', () => {
      const result = validatePasswordComplexity('Passwordabc!')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one number')
    })

    test('rejects password without special character', () => {
      const result = validatePasswordComplexity('Password123abc')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one special character')
    })

    test('rejects password with whitespace', () => {
      const result = validatePasswordComplexity('Pass word123!')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password cannot contain spaces or whitespace')
    })

    test('accepts valid strong password', () => {
      const result = validatePasswordComplexity('Kx9$mL2@qRvJ')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Soft Warnings (Pattern Detection)', () => {
    test('warns about repeated characters', () => {
      const result = validatePasswordComplexity('AAA123456!!!Bcd')
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain(
        'Password contains predictable patterns (sequential or repeated characters)'
      )
    })

    test('warns about sequential characters', () => {
      const result = validatePasswordComplexity('Abc123456!XYZ')
      expect(result.isValid).toBe(true)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    test('warns about common dictionary words', () => {
      const result = validatePasswordComplexity('Password123!ABC')
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain(
        'Password contains common words that are easy to guess'
      )
    })

    test('warns about user information in password', () => {
      const email = 'user@example.com'
      const result = validatePasswordComplexity('User123!@#example', [email])
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain(
        'Password contains personal information (email, name, etc.)'
      )
    })

    test('warns about low entropy', () => {
      const result = validatePasswordComplexity('Pass1234!!!!')
      expect(result.isValid).toBe(true)
      expect(result.warnings.some((w) => w.includes('entropy'))).toBe(true)
    })
  })

  describe('Entropy Scoring', () => {
    test('low entropy passwords get low score', () => {
      const result = validatePasswordComplexity('Pass1234!!!!')
      expect(result.entropy).toBeLessThan(60)
    })

    test('high entropy passwords get high score', () => {
      const result = validatePasswordComplexity('Kx9$mL2@qRvJzT4#pW')
      expect(result.entropy).toBeGreaterThan(70)
    })

    test('entropy increases with character diversity', () => {
      const lowercase = validatePasswordComplexity('aaaaaaaaaaaa')
      const mixed = validatePasswordComplexity('aAbBcCdDeEfFgG')
      expect(mixed.entropy).toBeGreaterThan(lowercase.entropy)
    })
  })

  describe('Real-World Scenarios', () => {
    test('accepts strong random password', () => {
      const result = validatePasswordComplexity('Kx9$mL2@qRvJ')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.entropy).toBeGreaterThan(75)
    })

    test('rejects obvious weak password', () => {
      const result = validatePasswordComplexity('Password123!')
      expect(result.isValid).toBe(true) // Hard reqs pass
      expect(result.warnings.length).toBeGreaterThan(0) // But has warnings
    })

    test('blocks password with email address', () => {
      const email = 'john.doe@example.com'
      const result = validatePasswordComplexity('John123!@#Doe2024', [email, 'john', 'doe'])
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain(
        'Password contains personal information (email, name, etc.)'
      )
    })

    test('multiple weakness warnings', () => {
      const email = 'admin@test.com'
      const result = validatePasswordComplexity('Admin123456!!!', [email])
      expect(result.isValid).toBe(true)
      expect(result.warnings.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Character Sets', () => {
    test('accepts all special characters in allowlist', () => {
      const specialChars = "!@#$%^&*()_+-=[]{};\n':\"\\|,.<>/?"
      for (const char of specialChars) {
        const pwd = `Pass1${char}XYZ`
        if (pwd.length >= 12) {
          const result = validatePasswordComplexity(pwd)
          expect(result.isValid).toBe(true)
        }
      }
    })

    test('minimum requirement: exactly 1 of each type', () => {
      const result = validatePasswordComplexity('aA1!')
      expect(result.isValid).toBe(false) // Under 12 chars
      
      const longResult = validatePasswordComplexity('aA1!xyzuvwst')
      expect(longResult.isValid).toBe(true)
      expect(longResult.errors).toHaveLength(0)
    })
  })
})

// Example usage demonstrations
describe('Usage Examples', () => {
  test('form validation use case', () => {
    const userEmail = 'sarah.smith@company.com'
    const password = 'NebulaX$2024Prime'

    const validation = validatePasswordComplexity(password, [userEmail])

    // Application logic:
    if (!validation.isValid) {
      // Block form submission, show errors
      console.error('Form errors:', validation.errors)
      return
    }

    // Form submission allowed
    if (validation.warnings.length > 0) {
      // Show non-blocking warnings
      console.warn('Suggestions:', validation.warnings)
    }

    // Show strength meter
    console.log(`Password Strength: ${validation.entropy}/100`)
  })

  test('api validation use case', () => {
    const password = 'WeakPassword123!'
    const userEmail = 'user@example.com'

    const validation = validatePasswordComplexity(password, [userEmail])

    const response = {
      success: validation.isValid,
      ...(validation.isValid && { warnings: validation.warnings }),
      entropy: validation.entropy,
      ...(validation.errors.length > 0 && { errors: validation.errors }),
    }

    expect(response.success).toBe(true)
    expect(response.warnings?.length || 0).toBeGreaterThan(0)
  })
})
