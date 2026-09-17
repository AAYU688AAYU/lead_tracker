# Phone Number Normalization Guide

**Phase 10 MEDIUM #15**: Normalize all phone numbers to E.164 international format for consistency, deduplication, and integration with telecom APIs.

## Overview

E.164 is the international standard for phone numbers defined by ITU-T:
- **Format**: `+[country code][number]`
- **Examples**:
  - `+14155552671` (USA)
  - `+442079460958` (UK)
  - `+33142685300` (France)
  - `+8613912345678` (China)
- **Characteristics**: Starts with `+`, only digits, no spaces/hyphens

### Why Normalize?

1. **Deduplication**: Same number in different formats creates duplicates
   - `(415) 555-2671`, `415-555-2671`, `415.555.2671` are all the same
2. **API Integration**: Twilio, Resend, and other services require E.164
3. **Analytics**: Consistent format enables accurate reporting
4. **Search/Filter**: Easy to find phone records regardless of input format
5. **International Support**: Handles numbers from any country correctly

### Real-World Impact

**Before Normalization**:
```
Profile 1: phone = "415-555-2671"
Profile 2: phone = "(415) 555-2671"
Profile 3: phone = "4155552671"
Profile 4: phone = "+1 415 555 2671"

Result: Same person, 4 database records
```

**After Normalization**:
```
Profile 1-4: phone = "+14155552671"

Result: Single deduplicated record
```

## Implementation

### Core Functions

#### `normalizePhoneNumber(input, defaultCountry?)`

Basic normalization — returns E.164 or null if invalid:

```typescript
import { normalizePhoneNumber } from '@/lib/phone-utils'

// With country code in input
normalizePhoneNumber('(415) 555-2671')        // '+14155552671'
normalizePhoneNumber('+33142685300')          // '+33142685300'
normalizePhoneNumber('+44 207 946 0958')      // '+442079460958'

// Without country code (needs default)
normalizePhoneNumber('02079460958', 'GB')     // '+442079460958'
normalizePhoneNumber('142685300', 'FR')       // '+33142685300'

// Invalid input
normalizePhoneNumber('invalid')               // null
normalizePhoneNumber('123')                   // null
```

#### `validateAndNormalizePhoneNumber(input, defaultCountry?)`

Comprehensive validation with details:

```typescript
import { validateAndNormalizePhoneNumber } from '@/lib/phone-utils'

const result = validateAndNormalizePhoneNumber('(415) 555-2671')
// {
//   isValid: true,
//   normalized: '+14155552671',
//   country: 'US',
//   dialingCode: '+1',
//   nationalNumber: '(415) 555-2671'
// }

const invalid = validateAndNormalizePhoneNumber('123')
// {
//   isValid: false,
//   error: 'Invalid phone number format...'
// }
```

#### `formatPhoneForDisplay(e164)`

Show phone in user-friendly format:

```typescript
import { formatPhoneForDisplay } from '@/lib/phone-utils'

formatPhoneForDisplay('+14155552671')    // '(415) 555-2671' (US format)
formatPhoneForDisplay('+33142685300')    // '01 42 68 53 00' (France format)
formatPhoneForDisplay('+442079460958')   // '020 7946 0958' (UK format)
```

#### `isSamePhoneNumber(phone1, phone2)`

Compare phones regardless of format:

```typescript
import { isSamePhoneNumber } from '@/lib/phone-utils'

isSamePhoneNumber('(415) 555-2671', '+14155552671')     // true
isSamePhoneNumber('+33142685300', '+33 1 42 68 53 00')  // true
isSamePhoneNumber('415-555-2671', '415-555-2672')       // false
```

#### `maskPhoneNumber(e164)`

Hide sensitive digits (for logs, UI):

```typescript
import { maskPhoneNumber } from '@/lib/phone-utils'

maskPhoneNumber('+14155552671')      // '+1415***2671'
maskPhoneNumber('+33142685300')      // '+331426***300'
```

### Usage in Server Actions

Server actions should normalize phone numbers before storing:

```typescript
'use server'

import { normalizePhoneNumber } from '@/lib/phone-utils'

export async function updateProfile(formData: FormData) {
  const rawPhone = formData.get('phone') as string

  // Normalize before validation
  const normalizedPhone = normalizePhoneNumber(rawPhone)

  if (!normalizedPhone) {
    return {
      success: false,
      error: 'Invalid phone number',
    }
  }

  // Store normalized E.164 in database
  await db.profiles.update({
    id: userId,
    phone: normalizedPhone,  // ← Always E.164
  })

  return { success: true }
}
```

### Usage in Forms

Client-side can show formatted display but normalize on submit:

```typescript
import { normalizePhoneNumber, formatPhoneForDisplay } from '@/lib/phone-utils'

export function PhoneInput() {
  const [value, setValue] = useState('')
  const normalized = normalizePhoneNumber(value)

  return (
    <div>
      <input
        type="tel"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="+1 (555) 123-4567 or (555) 123-4567"
      />

      {normalized && (
        <p className="text-sm text-gray-500">
          Saved as: {formatted}
        </p>
      )}

      {value && !normalized && (
        <p className="text-sm text-red-500">
          Invalid phone number
        </p>
      )}
    </div>
  )
}
```

### Database Queries

Always store and query with E.164 format:

```typescript
// ✓ Good: Query by normalized E.164
const profile = await db
  .from('profiles')
  .select('*')
  .eq('phone', '+14155552671')
  .single()

// ✓ Good: Normalize user input before querying
const userPhone = await normalizePhoneNumber(formInput)
const profile = await db
  .from('profiles')
  .select('*')
  .eq('phone', userPhone)
  .single()

// ✗ Bad: Query by raw user input
const profile = await db
  .from('profiles')
  .select('*')
  .eq('phone', '(415) 555-2671')  // Won't match stored E.164!
  .single()
```

## Batch Operations

### Migrate Existing Data

```typescript
import { normalizePhoneNumber } from '@/lib/phone-utils'

export async function migratePhoneNumbers() {
  // 1. Get all profiles with phone numbers
  const profiles = await db
    .from('profiles')
    .select('id, phone')
    .not('phone', 'is', null)

  // 2. Normalize each phone
  const updates = profiles
    .map((profile) => ({
      id: profile.id,
      phone: normalizePhoneNumber(profile.phone),
    }))
    .filter((update) => update.phone !== null)  // Skip invalid

  // 3. Batch update
  for (const update of updates) {
    await db
      .from('profiles')
      .update({ phone: update.phone })
      .eq('id', update.id)
  }

  console.log(`Migrated ${updates.length} phone numbers`)
}
```

### Deduplicate Profiles

```typescript
import { deduplicatePhoneNumbers } from '@/lib/phone-utils'

export async function deduplicateByPhone() {
  // 1. Get all phone numbers
  const profiles = await db
    .from('profiles')
    .select('id, phone, email')
    .not('phone', 'is', null)

  // 2. Group by normalized phone
  const phoneMap = new Map<string, string[]>()

  for (const profile of profiles) {
    const normalized = normalizePhoneNumber(profile.phone)
    if (normalized) {
      if (!phoneMap.has(normalized)) {
        phoneMap.set(normalized, [])
      }
      phoneMap.get(normalized)!.push(profile.id)
    }
  }

  // 3. Find duplicates
  const duplicates = Array.from(phoneMap.values())
    .filter((ids) => ids.length > 1)

  console.log(`Found ${duplicates.length} duplicate phone groups`)

  // 4. Merge duplicates (keep oldest, delete others)
  for (const ids of duplicates) {
    const [keepId, ...deleteIds] = ids
    // Merge data from secondary profiles into primary
    // Then delete secondary profiles
  }
}
```

## Integration with Telecom APIs

### Twilio

Twilio requires E.164 format:

```typescript
import { normalizePhoneNumber, isValidForTwilio } from '@/lib/phone-utils'

const phone = normalizePhoneNumber(userInput)

if (!isValidForTwilio(phone)) {
  throw new Error('Phone not compatible with Twilio')
}

// Send SMS via Twilio
const message = await twilio.messages.create({
  body: 'Hello!',
  from: process.env.TWILIO_PHONE_NUMBER,
  to: phone,  // ← E.164 format required
})
```

### Database Schema

Store as TEXT with constraints:

```sql
-- profiles table
ALTER TABLE profiles ADD CONSTRAINT phone_e164_format
  CHECK (phone IS NULL OR phone ~ '^\+[1-9]\d{1,14}$')

-- Index for fast lookups
CREATE UNIQUE INDEX idx_profiles_phone ON profiles(phone)
  WHERE phone IS NOT NULL
```

## Common Patterns

### Accept Multiple Formats, Normalize Internally

```typescript
function normalizePhoneForInput(input: string): string | null {
  // Accept: +1 (415) 555-2671, (415) 555-2671, 415-555-2671
  // Store: +14155552671
  return normalizePhoneNumber(input, 'US')  // Default to US if ambiguous
}
```

### Store Original + Normalized

```typescript
// If you need to preserve original input for audit:
await db.profiles.update({
  id: userId,
  phone: normalizedPhone,           // E.164 for querying/API
  phone_original: rawInput,         // Original for display/audit
  phone_country: detectedCountry,   // Country for context
})
```

### Validation with User Feedback

```typescript
const result = validateAndNormalizePhoneNumber(input)

if (!result.isValid) {
  // Show detailed error
  return {
    error: result.error,
    example: `Example for ${result.country}: +1 (415) 555-2671`,
  }
}

// Show confirmation
return {
  success: true,
  formatted: formatPhoneForDisplay(result.normalized),
  country: result.country,
}
```

## Testing

```typescript
import { normalizePhoneNumber, isSamePhoneNumber } from '@/lib/phone-utils'

describe('Phone Normalization', () => {
  test('normalizes US numbers', () => {
    expect(normalizePhoneNumber('(415) 555-2671')).toBe('+14155552671')
    expect(normalizePhoneNumber('415-555-2671')).toBe('+14155552671')
    expect(normalizePhoneNumber('4155552671')).toBe('+14155552671')
  })

  test('normalizes international numbers', () => {
    expect(normalizePhoneNumber('+33142685300')).toBe('+33142685300')
    expect(normalizePhoneNumber('+33 1 42 68 53 00')).toBe('+33142685300')
  })

  test('rejects invalid numbers', () => {
    expect(normalizePhoneNumber('123')).toBeNull()
    expect(normalizePhoneNumber('invalid')).toBeNull()
  })

  test('detects same number in different formats', () => {
    expect(
      isSamePhoneNumber('(415) 555-2671', '+14155552671')
    ).toBe(true)
  })
})
```

## Troubleshooting

### Number Not Normalizing

1. Check if country code is included
2. Try with explicit country: `normalizePhoneNumber(number, 'US')`
3. Verify format is valid for that country
4. Check for unsupported characters (letters, etc.)

### "Invalid for [Country]"

The number format doesn't match the country's phone number format:

```typescript
// Wrong: UK number format with US country code
normalizePhoneNumber('020 7946 0958', 'US')  // null

// Correct: UK country code
normalizePhoneNumber('020 7946 0958', 'GB')  // '+442079460958'
```

### Twilio Integration Failing

Ensure phone is E.164 before sending to Twilio:

```typescript
const phone = normalizePhoneNumber(userInput)
if (!phone) throw new Error('Invalid phone')

// Verify E.164 format
if (!/^\+[1-9]\d{1,14}$/.test(phone)) {
  throw new Error('Not valid Twilio format')
}
```

## Best Practices

1. **Always normalize server-side** — Never trust client formatting
2. **Store E.164** — Keep one canonical format in database
3. **Display nationally** — Use formatPhoneForDisplay() for UI
4. **Default country** — Set sensible default (e.g., 'US' for US company)
5. **Validate early** — Check before any processing
6. **Test internationally** — Test with numbers from multiple countries
7. **Audit trail** — Log transformations for debugging
8. **Handle null** — Phone is optional, always check

## Files

- `lib/phone-utils.ts` — All phone normalization utilities
- `app/apply/actions.ts` — Integration in intake form
- `PHONE_NORMALIZATION_GUIDE.md` — This guide

## Related

- Twilio API: https://www.twilio.com/docs/glossary/what-e164
- libphonenumber-js: https://github.com/catamphetamine/libphonenumber-js
- ITU-T E.164: https://www.itu.int/rec/T-REC-E.164/en
