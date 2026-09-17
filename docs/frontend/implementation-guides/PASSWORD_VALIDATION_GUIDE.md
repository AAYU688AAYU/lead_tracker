# Password Validation Enhancement Guide

**Phase 10 MEDIUM #13**: Enhanced password complexity validation with pattern detection, entropy analysis, and common weakness prevention.

## Overview

The password validation system now provides comprehensive security checks following NIST 800-63B guidelines with additional pattern detection and entropy analysis to prevent weak passwords that technically meet base requirements but are still vulnerable.

## Features

### 1. Hard Requirements (Must-Pass)
- **Minimum length**: 12 characters (NIST 800-63B compliant)
- **Maximum length**: 128 characters (prevent DoS on hashing)
- **Character diversity**: At least one of each:
  - Uppercase letter (A-Z)
  - Lowercase letter (a-z)
  - Digit (0-9)
  - Special character (!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]
- **No whitespace**: Spaces or tabs not allowed

### 2. Soft Requirements (Generate Warnings)
- **Pattern detection**: Detects weak patterns like:
  - Repeated characters (aaa, 111, etc.)
  - Sequential characters (abc, 123, xyz)
  - Common keystroke patterns (qwerty)
- **Dictionary detection**: Warns if password contains common words (password, admin, letmein, etc.)
- **User info exclusion**: Warns if email/name appears in password
- **Entropy scoring**: Calculates password entropy (0-100 scale)
  - <50 = low entropy (warning)
  - 50-75 = medium entropy (acceptable)
  - 75+ = high entropy (strong)

## Implementation

### Core Validation Function

```typescript
import { validatePasswordComplexity } from '@/lib/auth/password-reset'

const validation = validatePasswordComplexity(password, userInfo)

// Returns:
// {
//   isValid: boolean           // Hard requirements passed
//   errors: string[]           // Hard requirement failures (must fix)
//   warnings: string[]         // Soft requirement warnings (nice to have)
//   entropy: number            // Entropy score (0-100)
// }
```

### Server-Side Usage (Password Reset)

```typescript
import { completePasswordReset } from '@/lib/auth/password-reset'

const result = await completePasswordReset(token, email, newPassword)

// Returns success with optional warnings
if (result.success) {
  console.log('Password updated')
  if (result.warnings) {
    // Show warnings to user (e.g., weak patterns detected)
    console.log('Warnings:', result.warnings)
  }
}
```

### Server Action with User Info

```typescript
'use server'

import { validatePasswordComplexity } from '@/lib/auth/password-reset'

export async function resetPasswordAction(formData: FormData) {
  const password = formData.get('password') as string
  const email = formData.get('email') as string

  // Validation with user information
  const validation = validatePasswordComplexity(password, [email])

  if (!validation.isValid) {
    return {
      success: false,
      errors: validation.errors
    }
  }

  // Proceed with password reset...
}
```

### Client-Side Form Integration

```typescript
import { useState } from 'react'
import { validatePasswordComplexity } from '@/lib/auth/password-reset'

export function PasswordResetForm() {
  const [password, setPassword] = useState('')
  const [validation, setValidation] = useState(null)

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    // Real-time validation feedback
    const result = validatePasswordComplexity(value, [userEmail])
    setValidation(result)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        value={password}
        onChange={(e) => handlePasswordChange(e.target.value)}
        placeholder="New password"
      />

      {/* Hard errors - block submission */}
      {validation?.errors.length > 0 && (
        <div className="error">
          <p>Password must meet all requirements:</p>
          <ul>
            {validation.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Soft warnings - inform but allow */}
      {validation?.warnings.length > 0 && (
        <div className="warning">
          <p>Password suggestions:</p>
          <ul>
            {validation.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Entropy meter */}
      {validation && (
        <div className="entropy-meter">
          <label>Strength: {validation.entropy}/100</label>
          <progress value={validation.entropy} max="100" />
        </div>
      )}

      <button type="submit" disabled={!validation?.isValid}>
        Reset Password
      </button>
    </form>
  )
}
```

### Zod Schema Integration

All password schemas now use centralized `passwordComplexityRefinement`:

```typescript
import { changePasswordSchema } from '@/lib/schemas/auth'

// Automatic validation on form submit
const result = changePasswordSchema.safeParse(formData)
if (!result.success) {
  // Show field errors
  console.error(result.error.flatten())
}
```

## Validation Flow

### Password Reset Flow
1. User enters new password
2. Client: Real-time validation feedback (errors + warnings + entropy)
3. User submits form
4. Server: Zod schema validation
5. Server: `validatePasswordComplexity()` with user email
6. DB: Update password (hardened with bcrypt)
7. Response: Success with warnings (if any)

### Password Change Flow (Authenticated User)
1. User enters current + new password
2. Client: Schema validation on submit
3. Server: Verify current password
4. Server: Validate new password complexity
5. DB: Update password
6. Response: Success with warnings (if any)

## Pattern Detection Examples

### Detected as Weak:
- `Password123!` → Low entropy, predictable structure
- `Admin@Pass123` → Contains common word + predictable pattern
- `AAA123456!!!` → Repeated characters detected
- `abc123DEF!!` → Sequential patterns detected
- `my.email@example.com123!` → Contains email address

### Accepted (Strong):
- `Kx9$mL2@qRvJ` → High entropy, no patterns
- `B7#tN4&sH8!pQ` → Good character mix, no patterns
- `NebulaX$2024Prime` → Mixed case, special char, good length

## Entropy Calculation

Entropy = length × log₂(charset size)

Where charset size is:
- Lowercase letters: 26
- Uppercase letters: 26
- Digits: 10
- Special characters: 32

Examples:
- `password` (8 chars, lowercase only) = ~37 bits (very weak)
- `Password123!` (12 chars, mixed) = ~85 bits (moderate)
- `Kx9$mL2@qRvJ` (12 chars, all types) = ~88 bits (strong)
- 128-bit target = industry standard strong password

## Best Practices

### For UI/UX
- Show real-time validation as user types (errors red, warnings yellow)
- Display entropy/strength meter visually
- Explain WHY validation failed (be specific)
- Allow warnings but block hard errors
- Use password strength meter to encourage strong passwords

### For Backend
- Always validate server-side (never trust client validation)
- Include user info (email, name) in validation
- Log password validation events (not password values)
- Consider breach database checks for high-security systems
- Return clear error messages without security details

### For Security
- Hard requirements must always pass (no exceptions)
- Soft warnings are informational (user can accept)
- Never store validation rules in client-only code
- Regenerate tokens after password changes
- Invalidate all other sessions after password change

## Future Enhancements

1. **Breach Database API**: Integrate Have I Been Pwned API for client-side warnings
2. **ML-Based Detection**: Train model on weak passwords to detect similar patterns
3. **Configurable Rules**: Allow admins to configure complexity rules per organization
4. **Password History**: Prevent reuse of recent passwords
5. **MFA Requirement**: Require MFA after password change
6. **Device Fingerprinting**: Track password changes from unusual locations

## Testing

```typescript
import { validatePasswordComplexity } from '@/lib/auth/password-reset'

// Test hard requirements
expect(validatePasswordComplexity('short').isValid).toBe(false)
expect(validatePasswordComplexity('NoDigits!Abcd').isValid).toBe(false)

// Test soft warnings
const result = validatePasswordComplexity('Password123!', ['user@example.com'])
expect(result.isValid).toBe(true)
expect(result.warnings.length).toBeGreaterThan(0) // Contains common word

// Test entropy
const strong = validatePasswordComplexity('Kx9$mL2@qRvJ')
expect(strong.entropy).toBeGreaterThan(75)
```

## Files Modified

- `apex_fe/lib/auth/password-reset.ts` - Enhanced validation with pattern detection
- `apex_fe/lib/schemas/auth.ts` - Updated all password schemas with unified validation
- `PASSWORD_VALIDATION_GUIDE.md` - This documentation

## Backwards Compatibility

✓ All existing password validation still passes hard requirements
✓ New warnings are informational, not blocking
✓ API responses include optional `warnings` field
✓ No breaking changes to existing code
