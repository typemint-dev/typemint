# @typemint/data

## 0.6.0

### Minor Changes

- Add Scalar.ofUnsafe method

### Patch Changes

- Fix type inference for Dictionary descriptor methods

## 0.5.2

### Patch Changes

- Describe built-in invariants for String and Number based scalar types.

## 0.5.1

### Patch Changes

- expose Invariant module

## 0.5.0

### Minor Changes

- Add Scalar.of method
- Add Scalar.parse method
- Add Scalar.validate method
- Add concept of Scalar methods
- Add concept of Scalar constants
- Add concept of Scalar is type guard
- Add Scalar.extend method
- Add StringMinLengthInvariant
- Add StringMaxLengthInvariant
- Add NonEmptyStringInvariant
- Add StringPatternInvariant
- Add IsIntegerInvariant
- Add IsLowerThanNumberInvariant
- Add IsGreaterThanNumberInvariant
- Add IsLowerThenOrEqualNumberInvariant
- Add IsGreaterThenOrEqualNumberInvariant

## 0.4.0

### Minor Changes

- Add concept of Invariant
- Add Invariant.and combinator factory
- Add Invariant.or combinator

## 0.3.1

### Patch Changes

- Updated dependencies
  - @typemint/result@0.3.0

## 0.4.0

### Minor Changes

- Add unknownToStringDecoder
- Add isString type guard
- Add StringDescriptor
- Add UnknownDescriptor
- Add NumberDescriptor
- Add isNumber type guard
- Add unknownToNumberDecoder
- Add BigIntDescriptor
- Add isBigInt type guard
- Add unknownToBigIntDecoder
- Add BooleanDescriptor
- Add isBoolean type guard
- Add unknownToBooleanDecoder
- Add Decoder type
- Add InferDecoderOutput type
- Add InferDecoderError type
- Add InferDecoderInput type

## 0.3.0

### Minor Changes

- Add TypeMismatchError

### Patch Changes

- Updated dependencies
  - @typemint/result@0.2.0

## 0.2.3

### Patch Changes

- Fix WIP code type errors

## 0.2.2

### Patch Changes

- Updated dependencies
  - @typemint/core@0.16.0
  - @typemint/result@0.1.13

## 0.2.1

### Patch Changes

- Updated dependencies
  - @typemint/core@0.15.0
  - @typemint/result@0.1.12

## 0.2.0

### Minor Changes

- Add Dictionary.fromLiteralUnion factory

## 0.1.0

### Minor Changes

- Add Dictionary data type
- Add LiteralUnion data type
